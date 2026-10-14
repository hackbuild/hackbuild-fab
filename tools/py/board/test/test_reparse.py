"""reparse.py (M08-T07): the SPINDLE R1 fab set read back by gerbonara and
pygerber against its record and source, the legacy fab set, and the
writer faults the board-pcb record names.

Expected numbers come from the M08 card's Records table (computed, scratch
run of 2026-10-04) and the shipped legacy files, never from this run's
output. The Records row "22 of 22 GND holes on a pour piece" counted a
34.2 mm2 bottom piece that carries the 5V trace and both 5V vias; the
shipped gerbers short 5V to GND there, and the reparse says so (M08-T07
card defect).
"""
import os
import re
import shutil
import subprocess
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = os.path.abspath(os.path.join(HERE, ".."))
REPO = os.path.abspath(os.path.join(BOARD, "..", "..", ".."))
SPINDLE = os.path.join(REPO, "reference", "boards", "spindle-r1", "gen.py")
SHUNT = os.path.join(REPO, "reference", "boards", "shunt-art", "gen.py")
REPARSE = os.path.join(BOARD, "reparse.py")
LEGACY_ZIP = "/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/spindle/outputs/spindle/spindle-r1-gerbers.zip"
R1_DIR = "/Users/obsidian/Projects/hackbuild/fab-knowledge/evidence/x/downloads/dl-boards-tools/spindle/files (33)"
EPOCH = 315532800
sys.path.insert(0, BOARD)


def gen(script, out, lib=BOARD):
    """Run a generator copy against a library folder (PYTHONPATH wins for a copy outside the repo)."""
    e = dict(os.environ, PYTHONPATH=lib, HBF_REPO=REPO)
    r = subprocess.run([sys.executable, script, "--out", str(out), "--epoch", str(EPOCH)], capture_output=True, text=True, env=e, cwd=REPO)
    assert r.returncode == 0, r.stdout + r.stderr
    return out


def reparse(out, *extra):
    r = subprocess.run([sys.executable, REPARSE, str(out), "--record", str(out / "record.json"), *extra],
                       capture_output=True, text=True, cwd=REPO, env=dict(os.environ, PYTHONPATH=BOARD))
    return r.returncode, r.stdout


def line(text, pattern):
    m = re.search(pattern, text)
    assert m, f"no line matching {pattern!r} in:\n{text}"
    return m


def patched(tmp_path, script, lib_edit=None, script_edit=None):
    """A generator copy in tmp_path, with a library copy patched by lib_edit(name, text)."""
    lib = tmp_path / "lib"
    shutil.copytree(BOARD, lib, ignore=shutil.ignore_patterns("test", "__pycache__", ".hbf"))
    if lib_edit is not None:
        for f in (lib / "direct").glob("*.py"):
            t = f.read_text()
            n = lib_edit(f.name, t)
            if n != t:
                f.write_text(n)
    work = tmp_path / "work"
    work.mkdir()
    src = open(script).read()
    (work / "gen.py").write_text(script_edit(src) if script_edit else src)
    if os.path.exists(os.path.join(os.path.dirname(script), "board.json")):
        shutil.copy(os.path.join(os.path.dirname(script), "board.json"), work / "board.json")
    return work / "gen.py", str(lib)


@pytest.fixture(scope="module")
def spindle(tmp_path_factory):
    out = gen(SPINDLE, tmp_path_factory.mktemp("spindle") / "out")
    code, text = reparse(out, "--legacy", LEGACY_ZIP) if os.path.exists(LEGACY_ZIP) else reparse(out)
    return code, text


def test_spindle_pads_rings_drills(spindle):
    _, text = spindle
    # Records table: 55 of 55 pads inside F_Cu, 57 of 57 drilled pads with a bottom ring, 57 of 57 PTH hits within 1 um.
    line(text, r"F_Cu pads 55 of 55 ")
    line(text, r"drilled pads with bottom ring 57 of 57")
    line(text, r"drills 57 of 57 within 1 um, worst 0\.0000")
    line(text, r"npth 4 of 4 at 2\.70 mm")


def test_spindle_vector_compare(spindle):
    _, text = spindle
    # Records table areas (computed, scratch run): F_Cu 369.706, B_Cu 1883.166, F_Mask 259.997, B_Mask 114.681, F_Paste 19.120, silk 51.535 mm2.
    for name, area in (("F_Cu", "369.706"), ("B_Cu", "1883.166"), ("F_Mask", "259.997"), ("B_Mask", "114.681"), ("F_Paste", "19.120"), ("F_Silkscreen", "51.535")):
        m = line(text, rf"{name}\s+parsed\s+{re.escape(area)} mm2, source\s+[\d.]+ mm2, symmetric difference ([\d.]+) mm2")
        assert float(m.group(1)) <= 1e-3


@pytest.mark.skipif(not os.path.exists(LEGACY_ZIP), reason="legacy fab set not on this machine")
def test_spindle_legacy_equal(spindle):
    _, text = spindle
    for name in ("F_Cu", "B_Cu", "F_Mask", "B_Mask", "F_Paste", "F_Silkscreen"):
        assert float(line(text, rf"legacy {name}\s+symmetric difference ([\d.]+) mm2").group(1)) <= 1e-3


def test_spindle_raster(spindle):
    _, text = spindle
    line(text, r"F_Cu raster: 0 px outside edge band")
    line(text, r"B_Cu raster: 0 px outside edge band")


def test_spindle_bottom_short_is_reported(spindle):
    """The 5V bottom trace from (2.40, 20.00) to (43.60, 20.00) runs through the
    GND vias of pcb.py line 198 to 199 at y 20.00, so the shipped B_Cu joins 5V
    and GND; the reparse fails on it and counts the holes as the pour rules see them."""
    code, text = spindle
    assert code == 1
    line(text, r"FAIL B_Cu piece of 34\.\d+ mm2 joins nets 5V, GND")
    line(text, r"non-GND holes isolated 33 of 35")
    line(text, r"GND holes bonded 18 of 22")


def test_identity_ring_test_fills_holes(tmp_path):
    """Writing every interior as dark (the identity-test bug) fills every
    isolation clear, so the non-GND holes lose their isolation."""
    script, lib = patched(tmp_path, SPINDLE, lib_edit=lambda n, t: t.replace('out.append("%LPD*%" if idx == 0 else "%LPC*%")', 'out.append("%LPD*%")'))
    out = gen(str(script), tmp_path / "out", lib)
    code, text = reparse(out, "--no-raster")
    assert code == 1
    assert int(line(text, r"non-GND holes isolated (\d+) of 35").group(1)) == 0


def test_islands_before_pour_lose_their_rings(tmp_path):
    """Smallest polygon first: the isolated rings go out before the pour's
    clears and are wiped, so the through pads lose their bottom land."""
    script, lib = patched(tmp_path, SPINDLE, lib_edit=lambda n, t: t.replace("polys.sort(key=nm_area, reverse=True)", "polys.sort(key=nm_area)"))
    out = gen(str(script), tmp_path / "out", lib)
    code, text = reparse(out, "--no-raster")
    assert code == 1
    n = int(line(text, r"drilled pads with bottom ring (\d+) of 57").group(1))
    assert n < 57
    assert int(line(text, r"B_Cu pads (\d+) of 42").group(1)) < 42


def test_back_silk_mirrored_by_pen_position_runs_off(tmp_path):
    """SHUNT fix 13: negating the pen position in place of mirroring the glyph
    inside its ink box puts the back silk off the board."""
    old = "lx = dx0 + (width - adv if mirror else adv)"
    script, lib = patched(tmp_path, SHUNT, lib_edit=lambda n, t: t.replace(old, "lx = -(dx0 + adv) if mirror else dx0 + adv"))
    assert old in open(os.path.join(BOARD, "direct", "textpoly.py")).read()
    out = gen(str(script), tmp_path / "out", lib)
    code, text = reparse(out, "--no-raster")
    assert code == 1
    line(text, r"FAIL B_Silkscreen ink box -?[\d.]+ to [\d.]+ mm runs off the 154 mm board")


@pytest.mark.skipif(not os.path.isdir(R1_DIR), reason="Downloads R1 fab set not on this machine")
def test_r1_prehybrid_reparses_equal_and_misses_the_row(tmp_path):
    """The R1 generator from before the drill offset (pcb.py sha256 97e05388...)
    rerun with the repo's Plex Mono Bold: its own zip reparses equal to it, and
    its 16 module drills miss the 15.24 mm row by more than 0.05 mm (the
    CHK-BRD-02 pin landing, which M08-T12 registers)."""
    import hashlib
    from gerbonara import ExcellonFile
    from reparse import fold, layer_files, parse_all, legacy_compare, Report
    src = os.path.join(R1_DIR, "pcb.py")
    assert hashlib.sha256(open(src, "rb").read()).hexdigest().startswith("97e05388")
    font = os.path.join(BOARD, "fonts", "ibm-plex-mono-latin-700-normal.woff2")
    text = open(src).read().replace("/home/" + "claude/fonts/IBMPlexMono-Bold.ttf", font)
    (tmp_path / "pcb.py").write_text(text)
    r = subprocess.run([sys.executable, "pcb.py"], cwd=tmp_path, capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
    rep = Report()
    files, _, folded = parse_all(str(tmp_path / "fab"), rep)
    legacy_compare(os.path.join(R1_DIR, "spindle-r1-gerbers.zip"), files, folded, rep)
    assert rep.data["legacy"] and all(v <= 1e-3 for v in rep.data["legacy"].values()), rep.data["legacy"]
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        e = ExcellonFile.open(str(tmp_path / "fab" / "spindle-PTH.drl"))
    module = [float(o.x) for o in e.objects if getattr(o, "tool", None) is not None and abs(float(o.tool.diameter) - 1.05) < 1e-6]
    assert len(module) == 16
    # catalog row positions: 23.0 +/- 7.62 (pcb.py ROW_DX), pin landing tolerance 0.05 mm (M08-T12 step 2)
    assert all(min(abs(x - 15.38), abs(x - 30.62)) > 0.05 for x in module)
    assert sorted({round(x, 3) for x in module}) == [14.25, 31.75]


def test_shunt_fab_parity_numbers(tmp_path):
    """M08-T09 step 1: the check_fab.py numbers of the Records table (computed,
    scratch run under gerbonara 1.6.3 on the shipped SHUNT fab set)."""
    out = gen(SHUNT, tmp_path / "out")
    code, text = reparse(out, "--no-raster")
    assert code == 0, text
    line(text, r"parsed 9 gerber layers and 2 drill files")
    line(text, r"drills 83 of 83 within 1 um, worst 0\.0000")
    line(text, r"F_Cu pads 101 of 101 \(101 own, 0 through\)")
    line(text, r"B_Cu pads 61 of 61 \(2 own, 59 through\)")
    line(text, r"F_Silkscreen 164453 vertices, 0 missing, 0 unexpected; the mirrored variant would share 2030")
    line(text, r"B_Silkscreen 40241 vertices, 0 missing, 0 unexpected; the unmirrored variant would share 978")
    line(text, r"B_Silkscreen ink box 8\.04 to 145\.95 mm")
    line(text, r"slot 104 contour points at \(77, 104\)")
    line(text, r"npth 4 of 4 at 3\.20 mm")
