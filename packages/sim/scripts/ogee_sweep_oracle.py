"""Writes packages/sim/test/goldens/ogee-sweep-oracle.json: the stdout and
exit code of the OGEE16 swept crank oracle (check_sweep.py of
fab-knowledge:originals/ogee16/files/src/source, lineage
ogee16.check-sweep/r16p, read through tools/py/hbf_archives.py), run
unedited twice, each in a temporary copy of source/ beside out/print/ (the
print/ members of the original ogee16-print-stl.zip), since check_sweep.py
reads source/../out/print:

  shipped  on the shipped STLs
  proud    with the three crank assemblies replaced by
           designs/ogee16/extract/fixtures/proud-head

Run from the repo root (about 130 s wall in all, measured on an Apple M1):
  uv run --project tools/py python packages/sim/scripts/ogee_sweep_oracle.py"""
import hashlib, json, shutil, subprocess, sys, tempfile, time, zipfile
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/py"))
from hbf_archives import local_source  # noqa: E402

SOURCE_ID = "fab-knowledge:originals/ogee16/files/src/source"
STL_ZIP_ID = "fab-knowledge:originals/ogee16/files/exports/ogee16-print-stl.zip"
FIXTURE = ROOT / "designs/ogee16/extract/fixtures/proud-head"
CRANKS = ("crank_row_asm", "crank_col_asm", "crank_latch_asm")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def run(cwd: Path) -> dict:
    t0 = time.perf_counter()
    r = subprocess.run([sys.executable, "check_sweep.py"], cwd=cwd, capture_output=True, text=True)
    wall = time.perf_counter() - t0
    return {"exit": r.returncode, "stdout": r.stdout, "wallS": round(wall, 2)}


def tree(t: Path) -> Path:
    """The original source/ and out/print/ side by side under t."""
    shutil.copytree(local_source(SOURCE_ID), t / "source")
    with zipfile.ZipFile(local_source(STL_ZIP_ID)) as z:
        z.extractall(t / "out", [n for n in z.namelist() if n.startswith("print/") and n.endswith(".stl")])
    return t


TREE = tree(Path(tempfile.mkdtemp(prefix="hbf-ogee16-sweep-")))
runs = {"shipped": run(TREE / "source")}
with tempfile.TemporaryDirectory() as tmp:
    t = tree(Path(tmp))
    for c in CRANKS:
        shutil.copyfile(FIXTURE / f"{c}.stl", t / "out/print" / f"{c}.stl")
    runs["proud"] = run(t / "source")

walls = {k: v.pop("wallS") for k, v in runs.items()}

# The placement inputs the port re-derives: every scalar kin.load_params
# reads from params.scad, and the crank angles check_sweep.py rotates by.
sys.dont_write_bytecode = True
sys.path.insert(0, str(TREE / "source"))
import kin  # noqa: E402

S, LP, D = kin.P["STROKE"], kin.P["LP_SLIDE"], __import__("math")
steps = [k / 24 for k in range(25)]
placement = {
    "params": {k: v for k, v in kin.P.items() if isinstance(v, (int, float)) and not isinstance(v, bool)},
    "barPhiDeg": [kin.crank_phi(S * u) for u in steps],
    # kin.py's own crank pin positions, the independent check on each placement
    "rowPin": [[list(kin.crank_pin_row(i, S * u)) for u in steps] for i in range(kin.N)],
    "colPin": [[list(kin.crank_pin_col(j, S * u)) for u in steps] for j in range(kin.N)],
    "latchPhiDeg": [D.degrees(D.asin(D.sin(D.radians(-kin.P["LCRANK_SW"])) + LP * u / kin.P["LCRANK_R"])) for u in steps],
}
rec = {
    "source": f"{SOURCE_ID}/check_sweep.py",
    "checkSweepSha256": sha(TREE / "source/check_sweep.py"),
    "auditPrintSha256": sha(TREE / "source/audit_print.py"),
    "kinSha256": sha(TREE / "source/kin.py"),
    "paramsSha256": sha(TREE / "source/params.scad"),
    "fixtureSha256": {c: sha(FIXTURE / f"{c}.stl") for c in CRANKS},
    "shippedSha256": {c: sha(TREE / "out/print" / f"{c}.stl") for c in CRANKS},
    "python": sys.version.split()[0],
    "versions": {p: version(p) for p in ("trimesh", "numpy", "scipy", "rtree", "manifold3d")},
    "placement": placement,
    "runs": runs,
}
path = ROOT / "packages/sim/test/goldens/ogee-sweep-oracle.json"
path.write_text(json.dumps(rec, indent=1) + "\n")
shutil.rmtree(TREE, ignore_errors=True)
print("wrote", path.relative_to(ROOT), {k: v["exit"] for k, v in runs.items()}, "wall s (measured)", walls)
