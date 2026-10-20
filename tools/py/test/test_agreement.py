"""M00-T08 step 3: the Python and TypeScript writers agree entry by entry.

Every input under tools/corpus/3mf/inputs/ is built by both writers; each
entry's sha256, the artifactHash and the warning codes must be equal
(D-052). flex-pair-two.json is the M-S exit B print (four slots, two TPU),
written by tools/corpus/3mf/dump-input.mjs from export3mf, so the TPU preset
fallback and its PRESET_INFERRED warnings are compared too. Byte identity of
the two zips is outside the requirement. The TypeScript side runs from
packages/3mf/src, the re-export of the vendored hackbuild-3mf build
(R1-engine-03), bundled here with esbuild, so the test reads the writer
npm installed from tools/vendor and never a stale fab build.
"""
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "tools/py"))
import orca3mf  # noqa: E402

INPUTS = sorted((REPO / "tools/corpus/3mf/inputs").glob("*.json"))
EPOCH = int(os.environ.get("SOURCE_DATE_EPOCH") or 1791072000)

# Reads one input, builds it with the TypeScript writer on the machine preset
# it names, and prints {entries: {name: sha256}, artifactHash, warnings}.
JS = r"""
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { build, configOf, DEFAULT_TEMPLATE, DEFAULT_MATERIALS } from "./packages/3mf/src/index.ts";
const [repo, input, epoch] = process.argv.slice(2);
const inp = JSON.parse(readFileSync(input, "utf8"));
const machines = JSON.parse(readFileSync(repo + "/packages/profile/data/machines.json", "utf8")).machines;
const preset = machines.find((m) => m.id === inp.machine).presets.find((p) => p.id === inp.preset);
const out = build(configOf({
  title: inp.title, chase: inp.chase, buildHash: inp.buildHash, sourceDateEpoch: Number(epoch),
  ...(inp.license === undefined ? {} : { license: inp.license }),
  ...(inp.designer === undefined ? {} : { designer: inp.designer }),
  slicer: preset.slicer, nozzleMm: preset.nozzle, template: DEFAULT_TEMPLATE, materials: DEFAULT_MATERIALS,
  filaments: inp.filaments,
  ...(inp.adjacency === undefined ? {} : { adjacency: inp.adjacency }),
  objects: inp.objects.map((o) => ({ name: o.name, position: o.position,
    bodies: o.bodies.map((b) => ({ name: b.name, slot: b.slot, mesh: { positions: b.positions, triangles: b.triangles },
      ...(b.body === undefined ? {} : { body: b.body }), ...(b.role === undefined ? {} : { role: b.role }),
      ...(b.widthMm === undefined ? {} : { widthMm: b.widthMm }) })) })),
}));
if (!out.ok) { console.error(JSON.stringify(out.completeness)); process.exit(1); }
const entries = {};
for (const [k, v] of Object.entries(out.entries)) entries[k] = createHash("sha256").update(Buffer.from(v, "utf8")).digest("hex");
process.stdout.write(JSON.stringify({ entries, artifactHash: out.artifactHash, warnings: out.warnings }));
"""


@pytest.fixture(scope="module")
def ts_driver(tmp_path_factory):
    node = shutil.which("node")
    if node is None:
        pytest.fail("node is not on PATH; the agreement test needs the TypeScript writer")
    out = tmp_path_factory.mktemp("agreement") / "driver.cjs"
    # CommonJS output: jszip requires node builtins, which an ESM bundle cannot.
    r = subprocess.run([str(REPO / "node_modules/.bin/esbuild"), "--bundle", "--platform=node", "--format=cjs",
                        "--loader=ts", "--log-level=warning", "--outfile=%s" % out],
                       input=JS, cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, "esbuild failed on the agreement driver:\n" + r.stderr
    return node, out


def ts_build(driver, path):
    node, script = driver
    r = subprocess.run([node, str(script), str(REPO), str(path), str(EPOCH)],
                       cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def py_build(path):
    with open(path, encoding="utf-8") as fh:
        inp = json.load(fh)
    w = orca3mf.from_input(inp, source_date_epoch=EPOCH)
    entries = w.entries()
    return {"entries": {k: hashlib.sha256(v).hexdigest() for k, v in entries.items()},
            "artifactHash": orca3mf.artifact_hash(entries), "warnings": w.warnings}


def test_inputs_present():
    names = {p.name for p in INPUTS}
    assert {"tetra-2part.json", "collar-coin.json", "flex-pair-two.json"} <= names


def test_inputs_reach_the_tpu_fallback():
    """The warning-code equality below compares something only while an input warns.

    A regenerated or replaced input that drops the four-slot TPU shape would
    leave the PRESET_INFERRED branch of both writers outside the comparison
    with every agreement case still green.
    """
    shapes = {}
    for path in INPUTS:
        with open(path, encoding="utf-8") as fh:
            inp = json.load(fh)
        w = orca3mf.from_input(inp, source_date_epoch=EPOCH)
        w.entries()  # the preset rows, and their warnings, resolve during the build
        codes = [x["code"] for x in w.warnings]
        shapes[path.name] = (len(inp["filaments"]), [f["type"] for f in inp["filaments"]], codes)
    assert any(n == 4 for n, _, _ in shapes.values()), "no four-slot input: %s" % shapes
    assert any("TPU" in types and "PRESET_INFERRED" in codes for _, types, codes in shapes.values()), \
        "no input takes the TPU preset fallback: %s" % shapes
    n, types, codes = shapes["flex-pair-two.json"]
    assert n == 4 and types.count("TPU") == 2 and codes.count("PRESET_INFERRED") == 2, shapes["flex-pair-two.json"]


@pytest.mark.parametrize("path", INPUTS, ids=[p.stem for p in INPUTS])
def test_entries_and_artifact_hash_agree(ts_driver, path):
    js = ts_build(ts_driver, path)
    py = py_build(path)
    assert sorted(py["entries"]) == sorted(js["entries"])
    differ = [k for k in py["entries"] if py["entries"][k] != js["entries"][k]]
    assert differ == [], "entries differ between the writers: %s" % differ
    assert py["artifactHash"] == js["artifactHash"]
    assert [w["code"] for w in py["warnings"]] == [w["code"] for w in js["warnings"]]


def test_license_and_designer_agree(ts_driver, tmp_path):
    """License, Designer and Copyright (LICENSING.md 1.4) agree between the writers on one input."""
    with open(REPO / "tools/corpus/3mf/inputs/tetra-2part.json", encoding="utf-8") as fh:
        inp = json.load(fh)
    inp["license"], inp["designer"] = "CC-BY-SA-4.0", "Moheeb Zara"
    path = tmp_path / "attributed.json"
    path.write_text(json.dumps(inp), encoding="utf-8")
    js, py = ts_build(ts_driver, path), py_build(path)
    assert py["entries"] == js["entries"]
    assert py["artifactHash"] == js["artifactHash"]
    model = orca3mf.from_input(inp, source_date_epoch=EPOCH).entries()["3D/3dmodel.model"].decode("utf-8")
    year = datetime.datetime.fromtimestamp(EPOCH, tz=datetime.timezone.utc).year
    assert '<metadata name="License">CC-BY-SA-4.0</metadata>' in model
    assert '<metadata name="Designer">Moheeb Zara</metadata>' in model
    assert '<metadata name="Copyright">Copyright (c) %d Moheeb Zara</metadata>' % year in model


def test_an_ai_name_as_designer_is_refused():
    with open(REPO / "tools/corpus/3mf/inputs/tetra-2part.json", encoding="utf-8") as fh:
        inp = json.load(fh)
    inp["designer"] = "Claude"
    with pytest.raises(orca3mf.ExportError) as err:
        orca3mf.from_input(inp, source_date_epoch=EPOCH)
    assert err.value.hbf["path"] == "/designer" and err.value.hbf["record"] == "D-001"


def test_bed_type_from_machine_preset():
    with open(INPUTS[0], encoding="utf-8") as fh:
        inp = json.load(fh)
    ps = json.loads(orca3mf.from_input(inp, source_date_epoch=EPOCH).entries()["Metadata/project_settings.config"])
    preset = orca3mf.machine_preset(inp["machine"], inp["preset"])
    assert ps["curr_bed_type"] == preset["slicer"]["bedType"]


# ------------------------------------------------------------------ defaults and refusals
# Builds one input with no printer, no pattern and no nozzle, or sends a
# misspelt type or preset through the writer and prints the refusal.
DEFAULTS_JS = r"""
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { build, didYouMean, DEFAULT_PRESET, printerOf } from "./packages/3mf/src/index.ts";
const [mode, arg, epoch] = process.argv.slice(2);
if (mode === "rank") {
  process.stdout.write(JSON.stringify(JSON.parse(arg).map(([got, ids]) => didYouMean(got, ids))));
  process.exit(0);
}
if (mode === "preset") { process.stdout.write(JSON.stringify(DEFAULT_PRESET)); process.exit(0); }
const inp = JSON.parse(readFileSync(arg, "utf8"));
const cfg = {
  title: inp.title, chase: inp.chase, buildHash: inp.buildHash, sourceDateEpoch: Number(epoch),
  filaments: inp.filaments.map((f) => ({ color: f.colour, type: f.type, material: f.material })),
  objects: inp.objects.map((o) => ({ name: o.name, positions: [o.position],
    parts: o.bodies.map((b) => ({ name: b.name, slot: b.slot, positions: b.positions, indices: b.triangles })) })),
};
if (mode === "type") cfg.filaments[0].type = "PTEG";
if (mode === "pattern") cfg.presetPattern = "Generic PTEG @FF C5P";
if (mode === "variant") cfg.printer = { ...printerOf(DEFAULT_PRESET.slicer), printer_variant: "" };
try {
  const out = build(cfg);
  if (!out.ok) { console.error(JSON.stringify(out.completeness)); process.exit(1); }
  const entries = {};
  for (const [k, v] of Object.entries(out.entries)) entries[k] = createHash("sha256").update(Buffer.from(v, "utf8")).digest("hex");
  process.stdout.write(JSON.stringify({ entries, artifactHash: out.artifactHash,
    settings: JSON.parse(out.entries["Metadata/project_settings.config"]) }));
} catch (e) {
  if (e.hbf === undefined) throw e;
  process.stdout.write(JSON.stringify({ hbf: e.hbf }));
}
"""


@pytest.fixture(scope="module")
def ts_defaults(tmp_path_factory):
    node = shutil.which("node")
    if node is None:
        pytest.fail("node is not on PATH; the agreement test needs the TypeScript writer")
    out = tmp_path_factory.mktemp("defaults") / "defaults.cjs"
    r = subprocess.run([str(REPO / "node_modules/.bin/esbuild"), "--bundle", "--platform=node", "--format=cjs",
                        "--loader=ts", "--log-level=warning", "--outfile=%s" % out],
                       input=DEFAULTS_JS, cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, "esbuild failed on the defaults driver:\n" + r.stderr

    def run(mode, arg=""):
        r = subprocess.run([node, str(out), mode, str(arg), str(EPOCH)], cwd=REPO, capture_output=True, text=True)
        assert r.returncode == 0, r.stderr
        return json.loads(r.stdout)
    return run


def py_bare(inp, mutate=None):
    """A Python writer on one input with no printer, pattern, preset or nozzle; mutate edits it before the build."""
    w = orca3mf.Orca3MF([{"color": f["colour"], "type": f["type"], "material": f.get("material")} for f in inp["filaments"]],
                        title=inp["title"], chase=inp["chase"], build_hash=inp["buildHash"], source_date_epoch=EPOCH)
    for o in inp["objects"]:
        parts = [orca3mf.Part(b["name"], b["positions"], b["triangles"], b["slot"]) for b in o["bodies"]]
        w.add(orca3mf.PrintObject(o["name"], parts), [o["position"]])
    if mutate is not None:
        mutate(w)
    return w


def test_default_preset_is_the_profile_row(ts_defaults):
    """packages/3mf/data/default_preset.json, which both writers read, equals its row of machines.json."""
    d = orca3mf._load(orca3mf.DEFAULT_PRESET_PATH)
    row = orca3mf.machine_preset(d["machine"], d["id"])
    assert (d["nozzle"], d["slicer"]) == (row["nozzle"], row["slicer"])
    assert orca3mf.machine_preset() == row
    assert {k: v for k, v in ts_defaults("preset").items() if k != "note"} == {k: v for k, v in d.items() if k != "note"}


@pytest.mark.parametrize("path", INPUTS, ids=[p.stem for p in INPUTS])
def test_no_printer_builds_agree(ts_defaults, path):
    with open(path, encoding="utf-8") as fh:
        inp = json.load(fh)
    js = ts_defaults("build", path)
    entries = py_bare(inp).entries()
    py = {k: hashlib.sha256(v).hexdigest() for k, v in entries.items()}
    ps = json.loads(entries["Metadata/project_settings.config"])
    assert ps == js["settings"]
    assert ps["curr_bed_type"] == orca3mf.machine_preset()["slicer"]["bedType"]
    assert py == js["entries"]
    assert orca3mf.artifact_hash(entries) == js["artifactHash"]


def test_empty_printer_variant_agrees(ts_defaults):
    """A printer whose printer_variant is empty, with no nozzle: both writers read the variant as absent."""
    with open(INPUTS[0], encoding="utf-8") as fh:
        inp = json.load(fh)

    def mutate(w):
        w.printer = dict(orca3mf.printer_of(orca3mf.machine_preset()["slicer"]), printer_variant="")
        w.nozzle_mm = None
    entries = py_bare(inp, mutate).entries()
    js = ts_defaults("variant", INPUTS[0])
    assert 'key="nozzle_diameters" value="0.4"' in entries["Metadata/slice_info.config"].decode("utf-8")
    assert {k: hashlib.sha256(v).hexdigest() for k, v in entries.items()} == js["entries"]
    assert orca3mf.artifact_hash(entries) == js["artifactHash"]


RANK_CASES = [
    ["PTEG", ["ABS", "ASA", "PLA", "PETG", "TPU"]],
    ["PLA", ["ABS", "PLA", "PETG"]],
    [None, ["PLA", "ABS", "TPU", "PETG"]],
    ["ffc5p_2026081", ["ffc5p_20260819", "ffc5p-n025_20260819"]],
    ["Generic PTEG @FF C5P", list(orca3mf.PRESETS)],
]


def test_did_you_mean_ranks_as_the_typescript_writer(ts_defaults):
    assert [orca3mf.did_you_mean(g, ids) for g, ids in RANK_CASES] == ts_defaults("rank", json.dumps(RANK_CASES))


@pytest.mark.parametrize("mode", ["type", "pattern"])
def test_misspelt_refusals_agree(ts_defaults, mode):
    with open(INPUTS[0], encoding="utf-8") as fh:
        inp = json.load(fh)

    def mutate(w):
        if mode == "type":
            w.filaments[0]["type"] = "PTEG"
        else:
            w.preset_pattern = "Generic PTEG @FF C5P"
    with pytest.raises(orca3mf.ExportError) as err:
        py_bare(inp, mutate).entries()
    js = ts_defaults(mode, INPUTS[0])["hbf"]
    assert err.value.hbf["code"] == js["code"] == "E_REF"
    assert err.value.hbf["didYouMean"] == js["didYouMean"]
    assert js["didYouMean"][0] == ("PETG" if mode == "type" else "Generic PETG @FF C5P")


# ------------------------------------------------------------------ text forms
# The values cross both layout edges of ECMAScript Number::toString: decimals
# from 1e-6 up to 1e21, exponent form outside. 4.958810806274414e-7 is the
# case the fuzz of 2026-10-05 found printed as a decimal by the Python side.
EDGE_VALUES = [4.958810806274414e-7, 4.95881e-7, 9.99999e-7, 9.999995e-7, 1e-7, 1.5e-7, 1e-6, 1.000001e-6,
               -4.95881e-7, 3.2e-12, 0.1, 0.30000000000000004, 123456.7, 1e20, 1e21, 1.5e21, -2.5e22]

FMT_JS = r"""
import { fmt, num } from "./packages/3mf/src/index.ts";
const vals = JSON.parse(process.argv[2]);
const refusal = (v) => { try { fmt(v); return null; } catch (e) { return e.hbf ?? String(e); } };
process.stdout.write(JSON.stringify({ str: vals.map((v) => String(v)), num: vals.map(num),
  fmt: vals.filter((v) => Math.abs(v) < 1e15).map(fmt),
  refusals: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(refusal) }));
"""


@pytest.fixture(scope="module")
def js_text_forms(tmp_path_factory):
    node = shutil.which("node")
    if node is None:
        pytest.fail("node is not on PATH; the agreement test needs the TypeScript writer")
    out = tmp_path_factory.mktemp("fmt") / "fmt.cjs"
    r = subprocess.run([str(REPO / "node_modules/.bin/esbuild"), "--bundle", "--platform=node", "--format=cjs",
                        "--loader=ts", "--log-level=warning", "--outfile=%s" % out],
                       input=FMT_JS, cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, "esbuild failed on the fmt driver:\n" + r.stderr
    r = subprocess.run([node, str(out), json.dumps(EDGE_VALUES)], cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_js_str_matches_number_to_string(js_text_forms):
    assert [orca3mf.js_str(x) for x in EDGE_VALUES] == js_text_forms["str"]


def test_num_matches_the_typescript_writer(js_text_forms):
    assert [orca3mf.num(x) for x in EDGE_VALUES] == js_text_forms["num"]
    assert orca3mf.num(4.958810806274414e-7) == "4.95881e-7"


def test_fmt_matches_the_typescript_writer(js_text_forms):
    assert [orca3mf.fmt(x) for x in EDGE_VALUES if abs(x) < 1e15] == js_text_forms["fmt"]


def test_fmt_refuses_a_non_finite_coordinate_as_the_typescript_writer(js_text_forms):
    """Both writers refuse NaN and the infinities with the same CommandError fields."""
    py = []
    for v in (float("nan"), float("inf"), float("-inf")):
        with pytest.raises(orca3mf.ExportError) as err:
            orca3mf.fmt(v)
        py.append(err.value.hbf)
    assert py == js_text_forms["refusals"]


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf")])
def test_non_finite_vertex_is_a_structured_refusal(bad, tmp_path):
    """A mesh JSON may carry NaN or Infinity (json.loads accepts both); the writer refuses with E_SCHEMA."""
    with open(INPUTS[0], encoding="utf-8") as fh:
        inp = json.load(fh)
    inp["objects"][0]["bodies"][0]["positions"][0] = bad
    with pytest.raises(orca3mf.ExportError) as err:
        orca3mf.from_input(inp, source_date_epoch=EPOCH).write(tmp_path / "bad.3mf")
    assert err.value.hbf["code"] == "E_SCHEMA"
    assert err.value.hbf["path"] == "/objects/mesh/positions"
    assert not (tmp_path / "bad.3mf").exists()
