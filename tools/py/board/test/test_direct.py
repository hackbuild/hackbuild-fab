"""The direct-emit route (M08-T06): gates refuse to write, the fab zip is
byte-stable under one epoch, the region writer indexes rings and draws
islands after the clears, and the Excellon header parses without a warning.

Expected numbers come from the M08 card's Records table (computed, scratch
run of 2026-10-04 on pcb.py) and the legacy generators, never from this
port's own output.
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import warnings

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = os.path.abspath(os.path.join(HERE, ".."))
REPO = os.path.abspath(os.path.join(BOARD, "..", "..", ".."))
SPINDLE = os.path.join(REPO, "reference", "boards", "spindle-r1", "gen.py")
SHUNT = os.path.join(REPO, "reference", "boards", "shunt-art")
EPOCH = 315532800

sys.path.insert(0, BOARD)

# The SPINDLE R1 DRC pass line, M08-T06 step 7 and the Records table (computed, scratch run).
LEGACY_PASS = "DRC OK  19 nets | 70 pads | 57 holes | tightest 0.32mm (rule 0.25) | 46x46mm"


def run(gen, out, epoch=EPOCH, env=None):
    e = dict(os.environ)
    e["PYTHONPATH"] = BOARD
    if env:
        e.update(env)
    return subprocess.run([sys.executable, gen, "--out", str(out), "--epoch", str(epoch)],
                          capture_output=True, text=True, env=e, cwd=REPO)


def sha(p):
    with open(p, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


@pytest.fixture(scope="module")
def spindle(tmp_path_factory):
    out = tmp_path_factory.mktemp("spindle") / "out"
    r = run(SPINDLE, out)
    assert r.returncode == 0, r.stdout + r.stderr
    return out, r


def test_spindle_pass_line(spindle):
    _, r = spindle
    assert r.stdout.strip().splitlines()[-1] == LEGACY_PASS


def test_spindle_files(spindle):
    out, _ = spindle
    names = sorted(os.listdir(out))
    for n in ["spindle-F_Cu.gbr", "spindle-B_Cu.gbr", "spindle-F_Mask.gbr", "spindle-B_Mask.gbr", "spindle-F_Paste.gbr",
              "spindle-F_Silkscreen.gbr", "spindle-Edge_Cuts.gbr", "spindle-PTH.drl", "spindle-NPTH.drl",
              "spindle-r1-gerbers.zip", "record.json", "gates.json"]:
        assert n in names
    # The BOM, CPL and netlist come from packages/board's writers on the record (M08-T12), never the generator.
    for n in ["spindle-BOM.csv", "spindle-CPL.csv", "spindle-netlist.txt"]:
        assert n not in names
    text = open(out / "spindle-F_Cu.gbr").read()
    assert "%TF.GenerationSoftware,hack.build,hbf," in text
    assert "%TF.CreationDate,1980-01-01T00:00:00+00:00*%" in text


def test_zip_same_bytes_under_one_epoch(spindle, tmp_path):
    out, _ = spindle
    again = tmp_path / "again"
    assert run(SPINDLE, again).returncode == 0
    assert sha(out / "spindle-r1-gerbers.zip") == sha(again / "spindle-r1-gerbers.zip")
    later = tmp_path / "later"
    assert run(SPINDLE, later, epoch=EPOCH + 86400).returncode == 0
    assert sha(out / "spindle-r1-gerbers.zip") != sha(later / "spindle-r1-gerbers.zip")


def test_zip_members_sorted_no_dirs(spindle):
    import zipfile
    out, _ = spindle
    with zipfile.ZipFile(out / "spindle-r1-gerbers.zip") as z:
        names = [i.filename for i in z.infolist()]
        assert names == sorted(names)
        assert all(not n.endswith("/") for n in names)
        assert {i.date_time for i in z.infolist()} == {(1980, 1, 1, 0, 0, 0)}


def test_clr_040_refuses_and_writes_nothing(tmp_path):
    src = open(SPINDLE).read()
    assert "CLR = 0.25" in src
    gen = tmp_path / "gen.py"
    gen.write_text(src.replace("CLR = 0.25", "CLR = 0.40", 1))
    out = tmp_path / "out"
    r = run(str(gen), out)
    assert r.returncode == 1
    assert "DRC failed:" in r.stdout
    assert re.search(r"DRC failed: \d+ violations\. Nothing written\.", r.stdout)
    assert not out.exists()
    assert not (tmp_path / "out.partial").exists() or not any((tmp_path / "out.partial").iterdir())


# One rule raised past SPINDLE R1's own margin per case, in the RULES line only,
# so the pour and the outline stay as shipped. The thresholds sit just above
# the board's least measured distance (computed from pcb.py's geometry: hole
# wall gap 0.985 mm against HOLE_GAP 0.30, copper to edge 0.50 mm against
# EDGE_CLR 0.40, copper to a mount hole wall 0.58 mm against MOUNT_KEEP 0.5),
# so a check that drifts by a tenth of a millimetre stops refusing.
RULE_CASES = [
    ("hole_gap=HOLE_GAP", "hole_gap=1.00", r"hole-to-hole\s+holes \d+/\d+\s+0\.9\d\dmm"),
    ("edge_clr=EDGE_CLR", "edge_clr=0.60", r"closer than 0\.60 mm to the board edge\s+\S+\s+0\.000mm"),
    ("mount_keep=MOUNT_KEEP", "mount_keep=0.70", r"copper inside a mounting hole keepout\s+\S+\s+0\.000mm"),
]


@pytest.mark.parametrize("old,new,line", RULE_CASES, ids=["hole_gap", "edge_clr", "mount_keep"])
def test_each_ported_rule_refuses_and_writes_nothing(tmp_path, old, new, line):
    src = open(SPINDLE).read()
    assert src.count(old) == 1
    gen = tmp_path / "gen.py"
    gen.write_text(src.replace(old, new, 1))
    out = tmp_path / "out"
    r = run(str(gen), out)
    assert r.returncode == 1, r.stdout + r.stderr
    lines = r.stdout.strip().splitlines()
    head = [i for i, t in enumerate(lines) if re.fullmatch(r"DRC failed: \d+ violations\. Nothing written\.", t)]
    assert len(head) == 1, r.stdout
    listed = [t.strip() for t in lines[head[0] + 1:]]
    assert listed, r.stdout
    # only the raised rule fires; every listed violation is that rule's line
    assert all(re.fullmatch(line, t) for t in listed), listed
    assert not out.exists()
    assert not (tmp_path / "out.partial").exists() or not any((tmp_path / "out.partial").iterdir())


def test_failing_gate_leaves_old_output(spindle, tmp_path):
    out = tmp_path / "out"
    assert run(SPINDLE, out).returncode == 0
    before = sha(out / "spindle-r1-gerbers.zip")
    gen = tmp_path / "gen.py"
    gen.write_text(open(SPINDLE).read().replace("CLR = 0.25", "CLR = 0.40", 1))
    assert run(str(gen), out).returncode == 1
    assert sha(out / "spindle-r1-gerbers.zip") == before


def test_excellon_header_parses_without_warning(spindle):
    from gerbonara import ExcellonFile
    out, _ = spindle
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        e = ExcellonFile.open(str(out / "spindle-PTH.drl"))
    # 57 plated holes: 42 drilled component pads plus 15 vias (Records table, counted from pcb.py).
    assert len([o for o in e.objects if getattr(o, "tool", None) is not None]) == 57


LEGACY_FAB = "/Users/obsidian/Projects/hackbuild/fab-work-directory/benches/spindle/outputs/spindle/fab"


def hits(path):
    from gerbonara import ExcellonFile
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        e = ExcellonFile.open(str(path))
    return sorted((round(float(o.x), 3), round(float(o.y), 3), round(float(o.tool.diameter), 3))
                  for o in e.objects if getattr(o, "tool", None) is not None)


@pytest.mark.skipif(not os.path.isdir(LEGACY_FAB), reason="legacy SPINDLE R1 fab folder not on this machine")
def test_drills_equal_the_shipped_fab_set(spindle):
    """Every hit of the shipped spindle-PTH.drl and spindle-NPTH.drl, at 1 um:
    the module holes sit on the 15.24 mm row through hole_dx (pcb.py line 80)."""
    out, _ = spindle
    for name in ("spindle-PTH.drl", "spindle-NPTH.drl"):
        assert hits(out / name) == hits(os.path.join(LEGACY_FAB, name)), name
    module = [h for h in hits(out / "spindle-PTH.drl") if h[2] == 1.05]
    assert len(module) == 16
    assert sorted({h[0] for h in module}) == [15.38, 30.62]


def test_region_writer_indexes_rings_and_orders_islands(tmp_path):
    """A pour with a hole and an island inside the hole: the hole must be
    written clear and the island drawn after it (board-pcb.md bugs 1 and 2)."""
    from shapely.geometry import Point, box
    from shapely.ops import unary_union
    from gerbonara import GerberFile
    from direct.gerber import write_regions
    pour = box(0, 0, 20, 20).difference(Point(10, 10).buffer(4))
    island = Point(10, 10).buffer(2)
    geom = unary_union([pour, island])
    p = tmp_path / "t.gbr"
    write_regions(str(p), geom, "Copper,L2,Bot", EPOCH, "0")
    text = p.read_text()
    assert text.count("%LPC*%") == 1
    # the large pour (exterior then its clear) comes before the island
    assert text.index("%LPC*%") < text.rindex("G36*")
    g = GerberFile.open(str(p))
    dark = [o for o in g.objects if type(o).__name__ == "Region" and o.polarity_dark]
    clear = [o for o in g.objects if type(o).__name__ == "Region" and not o.polarity_dark]
    assert len(dark) == 2 and len(clear) == 1


def test_no_absolute_font_path():
    legacy = "/home/" + "claude"   # pcb.py line 348 read its font from there
    for root in (os.path.join(REPO, "tools", "py"), os.path.join(REPO, "reference", "boards")):
        for d, _, files in os.walk(root):
            for f in files:
                if f.endswith((".py", ".ts", ".json")):
                    assert legacy not in open(os.path.join(d, f), errors="replace").read(), os.path.join(d, f)


def test_shunt_gates_pass_and_refuse(tmp_path):
    gen = os.path.join(SHUNT, "gen.py")
    out = tmp_path / "out"
    r = run(gen, out)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "geometry gates: PASS (0 warnings)" in r.stdout
    # a copy whose first via sits off the board fails G1 and writes nothing
    import json
    work = tmp_path / "shunt"
    work.mkdir()
    shutil.copy(gen, work / "gen.py")
    d = json.load(open(os.path.join(SHUNT, "board.json")))
    d["vias"][0]["x"] = -1.0
    json.dump(d, open(work / "board.json", "w"))
    out2 = tmp_path / "out2"
    r = run(str(work / "gen.py"), out2)
    assert r.returncode == 1
    assert "gates failed: 1. Nothing written." in r.stderr
    assert "G1 via at (-1.00, 104.80) outside outline" in r.stdout
    assert not out2.exists()
