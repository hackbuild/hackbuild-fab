"""Writes packages/sim/test/goldens/ogee-sweep-oracle.json: the stdout and
exit code of the OGEE16 swept crank oracle (designs/ogee16/legacy/source/
check_sweep.py, lineage ogee16.check-sweep/r16p), run unedited twice:

  shipped  in designs/ogee16/legacy/source, on the shipped out/print STLs
  proud    in a temporary copy of source/ and out/print/ whose three crank
           assemblies are replaced by designs/ogee16/extract/fixtures/proud-head

Run from the repo root (about 130 s wall in all, measured on an Apple M1):
  uv run --project tools/py python packages/sim/scripts/ogee_sweep_oracle.py"""
import hashlib, json, shutil, subprocess, sys, tempfile, time
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LEGACY = ROOT / "designs/ogee16/legacy"
FIXTURE = ROOT / "designs/ogee16/extract/fixtures/proud-head"
CRANKS = ("crank_row_asm", "crank_col_asm", "crank_latch_asm")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def run(cwd: Path) -> dict:
    t0 = time.perf_counter()
    r = subprocess.run([sys.executable, "check_sweep.py"], cwd=cwd, capture_output=True, text=True)
    wall = time.perf_counter() - t0
    return {"exit": r.returncode, "stdout": r.stdout, "wallS": round(wall, 2)}


runs = {"shipped": run(LEGACY / "source")}
with tempfile.TemporaryDirectory() as tmp:
    t = Path(tmp)
    shutil.copytree(LEGACY / "source", t / "source")
    shutil.copytree(LEGACY / "out/print", t / "out/print")
    for c in CRANKS:
        shutil.copyfile(FIXTURE / f"{c}.stl", t / "out/print" / f"{c}.stl")
    runs["proud"] = run(t / "source")

walls = {k: v.pop("wallS") for k, v in runs.items()}

# The placement inputs the port re-derives: every scalar kin.load_params
# reads from params.scad, and the crank angles check_sweep.py rotates by.
sys.path.insert(0, str(LEGACY / "source"))
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
    "source": "designs/ogee16/legacy/source/check_sweep.py",
    "checkSweepSha256": sha(LEGACY / "source/check_sweep.py"),
    "auditPrintSha256": sha(LEGACY / "source/audit_print.py"),
    "kinSha256": sha(LEGACY / "source/kin.py"),
    "paramsSha256": sha(LEGACY / "source/params.scad"),
    "fixtureSha256": {c: sha(FIXTURE / f"{c}.stl") for c in CRANKS},
    "shippedSha256": {c: sha(LEGACY / "out/print" / f"{c}.stl") for c in CRANKS},
    "python": sys.version.split()[0],
    "versions": {p: version(p) for p in ("trimesh", "numpy", "scipy", "rtree", "manifold3d")},
    "placement": placement,
    "runs": runs,
}
path = ROOT / "packages/sim/test/goldens/ogee-sweep-oracle.json"
path.write_text(json.dumps(rec, indent=1) + "\n")
print("wrote", path.relative_to(ROOT), {k: v["exit"] for k, v in runs.items()}, "wall s (measured)", walls)
