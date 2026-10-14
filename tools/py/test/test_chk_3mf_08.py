"""
CHK-3MF-08 in the Python validator against the TypeScript mirror (M05-T20
step 4): on every fixture under packages/checks/test/fixtures/CHK-3MF-08 the
two give the same verdict, message and extra. The fixtures are the flex-pair
export and two slicer edits of it (tools/corpus/3mf/make-chk-3mf-08.mjs).

    uv run --project tools/py pytest tools/py/test/test_chk_3mf_08.py
"""
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE.parent))

import validate_3mf  # noqa: E402
from checks import chk_3mf_08  # noqa: E402

FIXTURES = REPO / "packages/checks/test/fixtures/CHK-3MF-08"
EXPECTED = {"pass": "pass", "fail-project-beam": "fail", "fail-object-beam": "fail"}

JS = r"""
import { readFileSync } from "node:fs";
import { readEntries, validateEntries } from "./packages/3mf/src/index.ts";
const [repo, file, name] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(repo + "/packages/profile/data/constants.json", "utf8")).constants;
const value = (id) => rows.find((r) => r.id === id).value;
const entries = await readEntries(new Uint8Array(readFileSync(file)));
const r = validateEntries(entries, { mode: "export", artifact: name, interlocking: { beamWidthMm: value("3mf.interlockingBeamWidth"), depthCells: value("3mf.interlockingDepth") } });
process.stdout.write(JSON.stringify(r.results.find((x) => x.id === "CHK-3MF-08")));
"""


@pytest.fixture(scope="module")
def ts_driver(tmp_path_factory):
    node = shutil.which("node")
    if node is None:
        pytest.fail("node is not on PATH; the mirror test needs the TypeScript validator")
    out = tmp_path_factory.mktemp("chk08") / "driver.mjs"
    r = subprocess.run([str(REPO / "node_modules/.bin/esbuild"), "--bundle", "--platform=node", "--format=esm",
                        "--loader=ts", "--log-level=warning", "--outfile=%s" % out],
                       input=JS, cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, "esbuild failed on the CHK-3MF-08 driver:\n" + r.stderr
    return node, out


def py_result(path):
    rep = validate_3mf.validate(path, mode="export")
    return next(r for r in rep.results if r["id"] == "CHK-3MF-08")


@pytest.mark.parametrize("name", sorted(EXPECTED))
def test_python_verdict(name):
    assert py_result(FIXTURES / ("%s.3mf" % name))["verdict"] == EXPECTED[name]


@pytest.mark.parametrize("name", sorted(EXPECTED))
def test_python_and_typescript_agree(ts_driver, name):
    node, script = ts_driver
    path = FIXTURES / ("%s.3mf" % name)
    r = subprocess.run([node, str(script), str(REPO), str(path), path.name], cwd=REPO, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    js = json.loads(r.stdout)
    py = py_result(path)
    for key in ("verdict", "constraint", "measured", "legal", "target", "version", "severity"):
        assert py[key] == js[key], (name, key, py[key], js[key])
    assert py.get("extra") == js.get("extra"), (name, py.get("extra"), js.get("extra"))


def test_project_beam_fail_quotes_the_loss_from_profile():
    d = chk_3mf_08.defaults()
    r = py_result(FIXTURES / "fail-project-beam.3mf")
    assert r["extra"]["lossMm"] == round(d["beam_width_mm"] * d["depth_cells"], 6) == 1.6
    assert "from the project" in r["constraint"] and "against conductors 1.2 to 1.4 mm wide" in r["constraint"]


def test_object_beam_fail_names_the_object_and_key_one():
    r = py_result(FIXTURES / "fail-object-beam.3mf")
    assert r["extra"]["first"].startswith("flex-pair (from the object; holding ")
    assert "conductor.key1," in r["extra"]["first"]


def test_no_record_reports_not_run(tmp_path):
    src = REPO / "packages/checks/test/fixtures/CHK-3MF-01/pass.3mf"
    r = py_result(src)
    assert r["verdict"] == "skip" and "carries no conductor record" in r["constraint"]
    stripped = tmp_path / "no-chase.3mf"
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(stripped, "w") as zout:
        for n in zin.namelist():
            if n != chk_3mf_08.CHASE_ENTRY:
                zout.writestr(n, zin.read(n))
    r = py_result(stripped)
    assert r["verdict"] == "skip" and r["constraint"].startswith("not run: no Metadata/hackbuild_chase.json")
