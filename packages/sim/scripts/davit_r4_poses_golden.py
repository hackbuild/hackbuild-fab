"""Writes packages/sim/test/goldens/davit-r4-poses.json: the pose list of
verify_sim.py main (fab-knowledge:originals/davit/files/src/verify_sim.py,
lineage davit.verify/r4, read through tools/py/hbf_archives.py): per pipe the four
presets, then 134, 140 and 134 draws from default_rng(7), all five joints
uniform within the limits of DATA.constm. Run from the repo root:
  uv run --project tools/py python packages/sim/scripts/davit_r4_poses_golden.py"""
import hashlib, json, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "tools/py"))
from hbf_archives import local_source  # noqa: E402

SOURCE = "fab-knowledge:originals/davit/files/src/verify_sim.py"
LIM = {"pitch": (-120, 120), "roll": (-180, 180), "elbow": (-110, 110), "wrist": (-180, 180), "grip": (3, 46)}
PRESETS = [(0, 0, 0, 0, 35), (55, 25, -70, 40, 30), (-35, 0, -95, 0, 6), (100, 0, -105, 90, 3)]
rng = np.random.default_rng(7)
out = {}
for pipe in ("1in", "125in", "15in"):
    poses = [list(p) for p in PRESETS]
    n = 134 if pipe != "125in" else 140
    for _ in range(n):
        poses.append([float(rng.uniform(*LIM[k])) for k in ("pitch", "roll", "elbow", "wrist", "grip")])
    out[pipe] = poses
src = Path(local_source(SOURCE))
rec = dict(source=f"{SOURCE} main loop", verifySimSha256=hashlib.sha256(src.read_bytes()).hexdigest(),
           numpy=np.__version__, order=["pitch", "roll", "elbow", "wrist", "grip"], poses=out)
path = ROOT / "packages/sim/test/goldens/davit-r4-poses.json"
path.write_text(json.dumps(rec) + "\n")
print("wrote", path.relative_to(ROOT), {k: len(v) for k, v in out.items()})
