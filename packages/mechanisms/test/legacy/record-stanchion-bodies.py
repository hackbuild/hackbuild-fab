# Records the four aileron-differential bodies as the original builds them:
# originals/stanchion/files/src/cad.py run through its own build_printed()
# with trimesh and manifold3d (tools/py pins), OUT moved to a temp dir,
# and the shipped exports/*.stl read back for comparison. Writes
# test/legacy/stanchion-bodies.json. Run from the repo root:
#   uv run --project tools/py packages/mechanisms/test/legacy/record-stanchion-bodies.py
import hashlib, json, os, sys, tempfile, types
import numpy as np
import trimesh as tm

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "tools", "py"))
from hbf_archives import local_source  # noqa: E402

ORIG = local_source("fab-knowledge:originals/stanchion/files")
SRC = os.path.join(ORIG, "src", "cad.py")
data = open(SRC, "rb").read()
text = data.decode("utf8").replace('OUT = "/home/claude/out"', f'OUT = {tempfile.mkdtemp()!r}', 1)
mod = types.ModuleType("cad")
exec(compile(text, SRC, "exec"), mod.__dict__)
mod.build_printed()

def summary(m):
    lo, hi = m.bounds
    return {"volume": round(float(m.volume), 6), "bboxMin": [round(float(x), 6) for x in lo], "bboxMax": [round(float(x), 6) for x in hi],
            "faces": int(len(m.faces)), "watertight": bool(m.is_watertight)}

out = {"source": {"file": "files/src/cad.py", "sha256": hashlib.sha256(data).hexdigest(), "lines": "217 to 282",
                  "command": "uv run --project tools/py packages/mechanisms/test/legacy/record-stanchion-bodies.py",
                  "engine": f"trimesh {tm.__version__}, booleans by its default engine"},
       "bodies": {}}
for name in ("yaw_plate", "gimbal_cross", "cam_carrier", "pushrod"):
    stl = os.path.join(ORIG, "exports", f"{name}.stl")
    sb = open(stl, "rb").read()
    out["bodies"][name] = {"built": summary(mod.PARTS[name]),
                           "export": {"file": f"files/exports/{name}.stl", "sha256": hashlib.sha256(sb).hexdigest(), **summary(tm.load(stl))}}
json.dump(out, open(os.path.join(os.path.dirname(__file__), "stanchion-bodies.json"), "w"), indent=1)
print(json.dumps({k: (v["built"]["volume"], v["export"]["volume"]) for k, v in out["bodies"].items()}))
