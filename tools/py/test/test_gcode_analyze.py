"""tools/py/gcode/analyze.py analyze(): the verdicts of the virtual print.

Two committed cuts of the keys flex-pair preset two slice, each with the
writer 3MF it was sliced from and the model.json the slice run wrote
(fixtures/gcode, cut by fixtures/gcode/cut_gcode.py):

- before D-236 (2026-10-07): layers 17 to 19 (column tops) and 27 to 30
  (caps), where the slicer printed both key tops with a PETG Internal
  Bridge;
- after D-236 (2026-10-08): layers 2 to 5 (trace band), 9 to 11, 17 to 20
  and 26 to 29.

Each verdict is held to a figure read from the fixture text with plain
regexes, or to the defect a test writes into the after cut: a cPLA road
across a split, a PETG road on a cap, a PETG road in the contact gap, a cPLA
road joining the column tops, and a cPLA road that starts off the grid. The
clean cut must report none of them. Every figure is computed; nothing here
is measured.
"""
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ANALYZE = REPO / "tools/py/gcode/analyze.py"
sys.path.insert(0, str(ANALYZE.parent))
import analyze as a  # noqa: E402
FIX = HERE / "fixtures" / "gcode"
KEY_NEAR_MM = 1.5
"""A road within this distance of a key centre lies over that key's columns (column halves reach about 1.4 mm out, computed from the build)."""


def _fixture(stem):
    return FIX / f"{stem}.gcode", FIX / f"{stem}.3mf", FIX / f"{stem}.model.json"


def kept_layers(text):
    """Source layer index of each cut layer, from the cut's own header line."""
    m = re.search(r"^; layers kept: (.+)$", text, re.M)
    out = []
    for part in m.group(1).split(", "):
        a, b = (int(v) for v in part.split(" to "))
        out += list(range(a, b + 1))
    return out


def regex_layers(text):
    """Per ;LAYER_CHANGE: the first ;Z: and ;HEIGHT:, and every extruding move as (tool, x0, y0, x1, y1)."""
    layers, tool, x, y = [], None, 0.0, 0.0
    for line in text.splitlines():
        if line == ";LAYER_CHANGE":
            layers.append({"z": None, "h": None, "moves": []})
            continue
        m = re.match(r"^;Z:([\d.]+)$", line)
        if m and layers and layers[-1]["z"] is None:
            layers[-1]["z"] = float(m.group(1))
        m = re.match(r"^;HEIGHT:([\d.]+)$", line)
        if m and layers and layers[-1]["h"] is None:
            layers[-1]["h"] = float(m.group(1))
        if re.match(r"^T\d+$", line):
            tool = int(line[1:])
        elif re.match(r"^G[0-3] ", line):
            mx, my, me = (re.search(rf" {c}(-?[\d.]+)", line) for c in "XYE")
            nx = float(mx.group(1)) if mx else x
            ny = float(my.group(1)) if my else y
            if me and float(me.group(1)) > 0 and (nx, ny) != (x, y) and layers:
                layers[-1]["moves"].append((tool, x, y, nx, ny))
            x, y = nx, ny
    return layers


def _seg_dist(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / L2))
    return math.hypot(px - (x0 + t * dx), py - (y0 + t * dy))


def key_centres(threemf, model):
    """Bed position of each key: the build item translation plus the key x the model declares."""
    import zipfile
    with zipfile.ZipFile(threemf) as z:
        xml = z.read("3D/3dmodel.model").decode()
    t = [float(v) for v in re.search(r'<item [^>]*transform="([^"]+)"', xml).group(1).split()]
    return {k["key"]: (t[9] + k["x"], t[10]) for k in model["keys"]}


def regex_gap(text, centre, conductor_tool, cap_tool):
    """(column top z, cap underside z, gap) read from the text: the column top is the
    ;Z: of the last layer with a conductor road over the key, the cap underside the
    ;Z: minus ;HEIGHT: of the first layer with a cap road over it."""
    layers = regex_layers(text)
    near = lambda L, t: any(tt == t and _seg_dist(*centre, *m) <= KEY_NEAR_MM for tt, *m in L["moves"])  # noqa: E731
    top = max(i for i, L in enumerate(layers) if near(L, conductor_tool))
    cap = min(i for i, L in enumerate(layers) if near(L, cap_tool))
    under = layers[cap]["z"] - layers[cap]["h"]
    return top, cap, layers[top]["z"], under, under - layers[top]["z"]


def inject(text, layer, block):
    """Insert G-code at the end of cut layer `layer`, then travel back and restore the tool, as audit2 inject.py does."""
    lines = text.splitlines()
    starts = [i for i, s in enumerate(lines) if s == ";LAYER_CHANGE"]
    end = starts[layer + 1]
    x = y = 0.0
    tool = None
    for s in lines[:end]:
        if re.match(r"^T\d+$", s):
            tool = s
        elif re.match(r"^G[0-3] ", s):
            mx, my = re.search(r" X(-?[\d.]+)", s), re.search(r" Y(-?[\d.]+)", s)
            x = float(mx.group(1)) if mx else x
            y = float(my.group(1)) if my else y
    ins = ["; test inject"] + block + [f"G1 X{x:.3f} Y{y:.3f} F6000", tool]
    return "\n".join(lines[:end] + ins + lines[end:]) + "\n"


def _defects(after_text):
    src = kept_layers(after_text)
    cut = src.index
    road = lambda tool, role, w, x0, y0, x1, y1, e: [tool, f";TYPE:{role}", f";WIDTH:{w}", f"G1 X{x0} Y{y0} F6000", f"G1 X{x1} Y{y1} E{e} F1200"]  # noqa: E731
    return {
        # a cPLA road across the key 1 split, source layer 10 (both column halves present)
        "d1-cpla-across-split": (cut(10), road("T1", "Outer wall", 0.42, 112.8, 128, 115.2, 128, 0.08)),
        # a PETG road across cap 1 on a layer the cap is fully printed, source layer 28
        "d2-petg-on-cap": (cut(28), road("T0", "Outer wall", 0.42, 112.0, 128, 116.0, 128, 0.12)),
        # a PETG road on the key 1 column tops, inside the contact gap, source layer 19
        "d3-petg-on-column-top": (cut(19), road("T0", "Internal solid infill", 0.42, 112.8, 128, 115.2, 128, 0.08)),
        # a cPLA road joining the key 1 column tops one layer above them, source layer 19
        "d4-cpla-short-above-columns": (cut(19), road("T1", "Internal solid infill", 0.42, 112.8, 128, 115.2, 128, 0.08)),
        # a cPLA road that starts more than 1 mm off the grid and ends across the key 1 split, source layer 10
        "d6-cpla-from-outside-grid": (cut(10), road("T1", "Outer wall", 0.42, 94.0, 128, 115.2, 128, 0.7)),
    }


@pytest.fixture(scope="module")
def runs(tmp_path_factory):
    """Every case through the analyzer CLI, in parallel; slice.json per case."""
    root = tmp_path_factory.mktemp("analyze")
    after_g, after_3, after_m = _fixture("flexpair-two-after")
    before_g, before_3, before_m = _fixture("flexpair-two-before")
    after_text = after_g.read_text()
    cases = {"before": (before_g, before_3, before_m), "after": (after_g, after_3, after_m)}
    for name, (layer, block) in _defects(after_text).items():
        g = root / f"{name}.gcode"
        g.write_text(inject(after_text, layer, block))
        cases[name] = (g, after_3, after_m)
    procs = {}
    for name, (g, t, m) in cases.items():
        cmd = [sys.executable, str(ANALYZE), "--gcode", str(g), "--3mf", str(t), "--model-json", str(m), "--out", str(root / name), "--no-png"]
        procs[name] = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, "PYTHONHASHSEED": "0"})
    out = {}
    try:
        for name, p in procs.items():
            so, se = p.communicate(timeout=600)
            assert p.returncode == 0, f"{name}: analyze exited {p.returncode}\n{se}"
            out[name] = {"r": json.loads((root / name / "slice.json").read_text()), "text": cases[name][0].read_text(), "model": json.loads(cases[name][2].read_text()), "3mf": cases[name][1], "report": (root / name / "report-slice.md").read_text()}
    finally:
        for p in procs.values():
            if p.poll() is None:
                p.kill()
    return out


def _gap_rows_match_the_text(case):
    r, text, model = case["r"], case["text"], case["model"]
    centres = key_centres(case["3mf"], model)
    assert r["tools"] == {"conductor": "T1", "cap": "T3"}
    for g in r["e_contact_gap"]:
        top, cap, top_z, under, gap = regex_gap(text, centres[g["key"]], 1, 3)
        assert g["column_top_layer"] == top
        assert g["cap_first_layer"] == cap
        assert g["column_top_z"] == pytest.approx(top_z, abs=1e-9)
        assert g["cap_underside_z"] == pytest.approx(under, abs=1e-9)
        assert g["printed_gap_mm"] == pytest.approx(gap, abs=1e-6)


def test_before_d236_the_key_tops_are_printed_by_petg(runs):
    case = runs["before"]
    r = case["r"]
    src = kept_layers(case["text"])
    layers = regex_layers(case["text"])
    top_layer = src.index(30)
    centres = key_centres(case["3mf"], case["model"])
    rows = r["a_missing"]["foreign"]
    assert [x["kind"] for x in rows] == ["replaced", "replaced"]
    # the two areas virtual-exit-b.md records for the before slice (computed 2026-10-07)
    assert sorted(x["area_mm2"] for x in rows) == [8.635, 8.653]
    for x, key in zip(sorted(rows, key=lambda x: x["at"][0]), (1, 2)):
        assert x["layer"] == top_layer
        assert x["body"] == f"cones top{key}"
        assert x["deposited_by"] == ["T0"]
        assert set(x["roles"]) == {"T0 Internal Bridge"}
        assert math.dist(x["at"], centres[key]) < 0.1
        # the text holds T0 roads over that key on that layer
        assert any(t == 0 and _seg_dist(*centres[key], *m) < 1.0 for t, *m in layers[top_layer]["moves"])
    assert r["a_missing"]["air"] == []
    _gap_rows_match_the_text(case)
    assert "regions of a body printed by another tool: 2, 2 replaced" in case["report"]


def test_after_d236_the_cut_is_clean(runs):
    case = runs["after"]
    r = case["r"]
    assert r["a_missing"]["foreign"] == []
    assert r["a_missing"]["air"] == []
    assert r["d_connectivity"]["shorts"] == []
    assert sum(len(x["bridges"]) for x in r["c_nets"]["layers"]) == 0
    assert not any(g["bridged"] for g in r["c_nets"]["column_gaps"])
    for g in r["e_contact_gap"]:
        assert g["obstruction"] is None
        assert g["pass"] is True
    leads = r["d_connectivity"]["leads"]
    assert {ld["net"] for ld in leads} == {"K1", "K2", "GND"}
    assert all(t["reached"] for ld in leads for t in ld["column_tops"])
    _gap_rows_match_the_text(case)
    assert "regions of a body printed by another tool: 0," in case["report"]
    assert "joining two nets, in a layer or across layers: 0 " in case["report"]


def test_a_cpla_road_across_a_split_is_a_bridge_a_short_and_a_zero_gap(runs):
    r = runs["d1-cpla-across-split"]["r"]
    li = kept_layers(runs["after"]["text"]).index(10)
    br = [b for x in r["c_nets"]["layers"] if x["layer"] == li for b in x["bridges"]]
    assert any(b["nets"] == ["GND", "K1"] for b in br)
    row = [g for g in r["c_nets"]["column_gaps"] if g["layer"] == li and g["key"] == 1]
    assert row and row[0]["bridged"] is True and row[0]["deposited_gap_mm"] == 0.0
    assert any({"GND", "K1"} <= set(c["nets"]) for c in r["d_connectivity"]["shorts"])


def test_a_second_tool_on_a_printed_cap_is_flagged(runs):
    r = runs["d2-petg-on-cap"]["r"]
    li = kept_layers(runs["after"]["text"]).index(28)
    rows = [x for x in r["a_missing"]["foreign"] if x["layer"] == li]
    assert any(x["body"] == "caps cap1" and x["kind"] == "two tools in one cell" and x["deposited_by"] == ["T0"] for x in rows)


def test_a_road_in_the_contact_gap_is_air_and_fails_the_gap(runs):
    r = runs["d3-petg-on-column-top"]["r"]
    li = kept_layers(runs["after"]["text"]).index(19)
    assert any(x["layer"] == li and x["deposited_by"] == ["T0"] for x in r["a_missing"]["air"])
    g1 = next(g for g in r["e_contact_gap"] if g["key"] == 1)
    assert g1["obstruction"] is not None and g1["obstruction"]["layer"] == li and g1["obstruction"]["tools"] == ["T0"]
    assert g1["pass"] is False
    assert next(g for g in r["e_contact_gap"] if g["key"] == 2)["pass"] is True


def test_a_short_above_the_column_tops_is_counted(runs):
    r = runs["d4-cpla-short-above-columns"]["r"]
    li = kept_layers(runs["after"]["text"]).index(19)
    # no layer holds a region on two nets; the short joins them across layers
    assert sum(len(x["bridges"]) for x in r["c_nets"]["layers"]) == 0
    shorts = r["d_connectivity"]["shorts"]
    assert any({"GND", "K1"} <= set(c["nets"]) and c["layers"][1] == li for c in shorts)
    assert "joining two nets, in a layer or across layers: 1;" in runs["d4-cpla-short-above-columns"]["report"]


def test_a_road_that_starts_off_the_grid_is_still_rasterised(runs):
    r = runs["d6-cpla-from-outside-grid"]["r"]
    li = kept_layers(runs["after"]["text"]).index(10)
    br = [b for x in r["c_nets"]["layers"] if x["layer"] == li for b in x["bridges"]]
    assert any(set(b["nets"]) >= {"GND", "K1"} for b in br)
    assert r["f_toolchanges"]["segments_outside_grid"]["T1"] >= 1


def test_the_conductor_and_cap_tools_come_from_the_model(tmp_path):
    parts = [{"name": "p", "extruder": 1}, {"name": "c", "extruder": 3}, {"name": "k", "extruder": 2}, {"name": "c2", "extruder": 3}]
    assert a.conductive_tools(parts, {"nets": {"c": "K1", "c2": "GND"}, "keys": [{"cap": "k"}]}) == (2, 1)
    with pytest.raises(ValueError):
        a.conductive_tools(parts, {"nets": {"c": "K1", "p": "GND"}, "keys": []})
    assert a.conductive_tools(parts, {}) == (None, None)


def test_the_3mf_reader_keeps_the_zip_limits(tmp_path):
    import zipfile
    f = tmp_path / "many.3mf"
    with zipfile.ZipFile(f, "w") as z:
        for i in range(a.v3.ZIP_MAX_ENTRIES + 1):
            z.writestr(f"x/{i}", b"")
    with pytest.raises(a.v3.InputError, match="E_SCHEMA"):
        a.load_3mf_parts(f)


def test_parts_are_read_in_bed_coordinates():
    parts = a.load_3mf_parts(FIX / "flexpair-two-after.3mf")
    model = json.loads((FIX / "flexpair-two-after.model.json").read_text())
    names = {p["name"] for p in parts}
    assert set(model["nets"]) <= names
    pad = max(parts, key=lambda p: np.ptp(p["V"][:, 0]) * np.ptp(p["V"][:, 1]))
    # the build item translation is 128 128 0 (the 3MF build element), so the pad is centred there
    assert (pad["V"][:, 0].min() + pad["V"][:, 0].max()) / 2 == pytest.approx(128.0, abs=1e-6)
    assert (pad["V"][:, 1].min() + pad["V"][:, 1].max()) / 2 == pytest.approx(128.0, abs=1e-6)
    assert pad["V"][:, 2].min() == pytest.approx(0.0, abs=1e-6)
