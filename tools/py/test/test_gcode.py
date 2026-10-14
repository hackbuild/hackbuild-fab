"""tools/py/gcode/analyze.py without Flash Studio.

The fixture is a cut of the keys flex-pair preset two slice of 2026-10-07:
the header, layers 27 to 30 (the cTPU cap bridge and the PETG internal
bridge the slicer put inside both key tops), the footer and a few config
lines. The parser must read it to the committed counts, and its extruding
moves, summed extrusion, roles and widths per layer and tool, and its footer,
must equal a plain regex read of the text.
The raster and section fills are held to closed forms.
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools/py/gcode"))
import analyze as a  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "gcode"
GCODE = FIXTURES / "flexpair-two-l27-30.gcode"
COUNTS = FIXTURES / "flexpair-two-l27-30.counts.json"


@pytest.fixture(scope="module")
def parsed():
    return a.parse_gcode(GCODE.read_text())


@pytest.fixture(scope="module")
def golden():
    return json.loads(COUNTS.read_text())


def test_layers_match_the_committed_counts(parsed, golden):
    assert a.layer_counts(parsed)["layers"] == golden["layers"]


def test_roles_tool_changes_footer_config_match(parsed, golden):
    assert parsed.roles == golden["roles"]
    assert parsed.tool_commands == golden["tool_commands"]
    assert parsed.tool_changes == golden["tool_changes"]
    assert parsed.footer == golden["footer"]
    assert parsed.header == golden["header"]
    assert parsed.config == golden["config"]
    assert parsed.prelude_segments == golden["prelude_segments"]


def _regex_moves(text):
    """Extruding G1/G2/G3 lines with an X or Y word, by layer and tool, read with plain regexes."""
    out = {}
    layer, tool = -1, None
    for line in text.splitlines():
        if line.startswith(";LAYER_CHANGE"):
            layer += 1
        elif re.match(r"^T\d+\s*$", line):
            tool = line.strip()
        elif re.match(r"^G[123] ", line) and tool is not None and layer >= 0:
            m = re.search(r" E(-?[\d.]+)", line)
            if m and float(m.group(1)) > 0 and re.search(r" [XY]-?[\d.]", line):
                out[(layer, tool)] = out.get((layer, tool), 0) + 1
    return out


def test_moves_equal_an_independent_regex_count(parsed):
    want = _regex_moves(GCODE.read_text())
    got = {(L["index"], t): d["moves"] for L in a.layer_counts(parsed)["layers"] for t, d in L["tools"].items()}
    assert got == want


def _regex_layer_tools(text):
    """Per (layer, tool), read with plain regexes: summed positive E, the ;TYPE: roles
    and the ;WIDTH: values in force at each extruding move with an X or Y word."""
    out = {}
    layer, tool, role, width = -1, None, "none", None
    for line in text.splitlines():
        if line.startswith(";LAYER_CHANGE"):
            layer += 1
        elif line.startswith(";TYPE:"):
            role = line[6:]
        elif line.startswith(";WIDTH:"):
            width = float(line[7:])
        elif re.match(r"^T\d+\s*$", line):
            tool = line.strip()
        elif re.match(r"^G[123] ", line) and tool is not None and layer >= 0:
            m = re.search(r" E(-?[\d.]+)", line)
            if m and float(m.group(1)) > 0 and re.search(r" [XY]-?[\d.]", line):
                d = out.setdefault((layer, tool), {"e": 0.0, "roles": set(), "widths": set()})
                d["e"] += float(m.group(1))
                d["roles"].add(role)
                d["widths"].add(round(width, 4))
    return out


def test_extrusion_roles_and_widths_equal_an_independent_regex_read(parsed):
    want = _regex_layer_tools(GCODE.read_text())
    got = {(L["index"], t): d for L in a.layer_counts(parsed)["layers"] for t, d in L["tools"].items()}
    assert set(got) == set(want)
    for k, d in got.items():
        assert d["e_mm"] == pytest.approx(want[k]["e"], abs=1e-5), k
        assert d["roles"] == sorted(want[k]["roles"]), k
        assert d["widths_mm"] == sorted(want[k]["widths"]), k


def test_footer_equals_an_independent_regex_read(parsed):
    text = GCODE.read_text()
    kv = dict(re.findall(r"^; ([a-z][^=\n]*?) = (.*)$", text, re.M))
    f = parsed.footer
    assert f["filament_changes"] == int(kv["total filament change"])
    assert f["layers"] == int(kv["total layers count"])
    assert f["total_filament_g"] == float(kv["total filament used [g]"])
    for key, name in (("filament_mm", "filament used [mm]"), ("filament_cm3", "filament used [cm3]"), ("filament_g", "filament used [g]")):
        assert f[key] == [float(v) for v in kv[name].split(",")]
    h, m, sec = (int(v) for v in re.fullmatch(r"(?:(\d+)h )?(\d+)m (\d+)s", kv["estimated printing time (normal mode)"]).groups(default="0"))
    assert f["time_normal_s"] == float((h * 60 + m) * 60 + sec)
    for k in ("enable_prime_tower", "prime_tower_width", "prime_volume", "layer_height"):
        assert parsed.config[k] == kv[k]


def test_layer_markers_and_tool_lines_match_the_text(parsed):
    text = GCODE.read_text()
    assert len(parsed.layers) == len(re.findall(r"^;LAYER_CHANGE$", text, re.M))
    assert parsed.tool_commands == len(re.findall(r"^T\d+$", text, re.M))
    zs = [float(z) for z in re.findall(r"^;Z:([\d.]+)$", text, re.M)]
    assert [L.z for L in parsed.layers] == zs


def test_the_petg_internal_bridge_inside_the_key_tops_is_read(parsed):
    # layer 30 of the run (index 3 here): PETG Internal Bridge roads within
    # 1.8 mm of both key centres (x 114 and 142, y 128 on the bed)
    L = parsed.layers[3]
    bridge = parsed.roles.index("Internal Bridge")
    for kx in (114.0, 142.0):
        near = [s for s in L.segs if s[0] == 0 and s[7] == bridge and math.hypot((s[1] + s[3]) / 2 - kx, (s[2] + s[4]) / 2 - 128.0) < 1.8]
        assert len(near) > 0


def test_a_repeated_tool_command_is_not_a_change():
    p = a.parse_gcode(";LAYER_CHANGE\n;Z:0.25\n;HEIGHT:0.25\nT0\nG1 X1 Y0 E1\nT0\nT1\nG1 X2 Y0 E1\nT1\nT0\n")
    assert p.tool_commands == 5
    assert [(c["from"], c["to"]) for c in p.tool_changes] == [(0, 1), (1, 0)]


def test_arc_chords_stay_on_the_circle():
    # quarter turn counter-clockwise about the origin, radius 2
    pts = a._arc_points(2.0, 0.0, 0.0, 2.0, -2.0, 0.0, cw=False)
    assert pts[-1] == (0.0, 2.0)
    for x, y in pts:
        assert math.hypot(x, y) == pytest.approx(2.0, abs=1e-9)
        assert x >= -1e-9 and y >= -1e-9
    # chord sagitta bound: r (1 - cos(step / 2)) <= ARC_SAGITTA
    prev = (2.0, 0.0)
    for p in pts:
        half = math.asin(min(1.0, math.dist(prev, p) / 4.0))
        assert 2.0 * (1 - math.cos(half)) <= a.ARC_SAGITTA + 1e-9
        prev = p
    # the same ends clockwise go the long way round, through y < 0
    cw = a._arc_points(2.0, 0.0, 0.0, 2.0, -2.0, 0.0, cw=True)
    assert min(y for _x, y in cw) == pytest.approx(-2.0, abs=0.01)


def test_road_raster_area_is_a_capsule():
    g = a.Grid(-5.0, -5.0, 200, 200)
    L, w = 6.0, 0.42
    m = a.raster_roads(g, [(-3.0, 0.1, 3.0, 0.1, w)])
    want = L * w + math.pi * (w / 2) ** 2
    assert m.sum() * a.RES**2 == pytest.approx(want, rel=0.08)


def test_section_fill_is_even_odd():
    # a closed 10 x 6 box with a 4 x 2 box inside, both closed meshes
    def box(x0, y0, x1, y1):
        V = np.array([[x, y, z] for z in (0.0, 1.0) for y in (y0, y1) for x in (x0, x1)])
        F = np.array([[0, 2, 1], [1, 2, 3], [4, 5, 6], [5, 7, 6], [0, 1, 4], [1, 5, 4], [2, 6, 3], [3, 6, 7], [0, 4, 2], [2, 4, 6], [1, 3, 5], [3, 7, 5]])
        return V, F
    Vo, Fo = box(-5, -3, 5, 3)
    Vi, Fi = box(-2, -1, 2, 1)
    V = np.vstack([Vo, Vi])
    F = np.vstack([Fo, Fi + len(Vo)])
    g = a.Grid(-6.0, -4.0, 240, 160)
    m = a.fill_even_odd(g, a.section_segments(V, F, 0.5))
    assert m.sum() * a.RES**2 == pytest.approx(60.0 - 8.0, abs=0.05)
    j, i = g.index(0.0, 0.0)
    assert not m[j, i]
    j, i = g.index(3.5, 0.0)
    assert m[j, i]


def test_png_writer_round_trips(tmp_path):
    import struct
    import zlib
    rgb = np.zeros((3, 4, 3), dtype=np.uint8)
    rgb[0, 0] = (255, 0, 0)
    f = tmp_path / "t.png"
    a.write_png(f, rgb)
    b = f.read_bytes()
    assert b[:8] == b"\x89PNG\r\n\x1a\n"
    w, h = struct.unpack(">II", b[16:24])
    assert (w, h) == (4, 3)
    i = b.index(b"IDAT")
    n = struct.unpack(">I", b[i - 4:i])[0]
    raw = zlib.decompress(b[i + 4:i + 4 + n])
    # row 0 of the array is the bottom row of the image
    last = raw[2 * (4 * 3 + 1):]
    assert last[1:4] == bytes((255, 0, 0))
