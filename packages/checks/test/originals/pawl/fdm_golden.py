"""Golden figures for CHK-PRT-12 from PAWL fdm.py, run as the source of record.

fdm.py is executed unmodified from the originals of record. It imports
numpy-stl, which tools/py does not carry, so a shim module `stl.mesh` reads
the binary STL into float32 vectors the way numpy-stl does. Two figures per
part, both from fdm.py's own analyse():

  fdmPyPct      analyse() as written, OVER 45: what fdm.py prints. Its test
                ang <= 45 runs in float32, so a modelled 45 deg face lands
                either side by rounding.
  pastLimitPct  analyse() with fdm.OVER set 1e-4 deg above 45, so every face
                within 1e-4 deg of the limit is at the limit, not past it.
                No face of these exports sits between 44.9999 and 45 deg
                other than the modelled 45 deg faces (computed).

Run from the repo root:
  uv run --project tools/py python packages/checks/test/originals/pawl/fdm_golden.py
It writes fdm-golden.json beside this file.
"""
import hashlib, importlib.util, json, os, sys, types

import numpy as np

# The originals of record stay untouched: no __pycache__ beside fdm.py.
sys.dont_write_bytecode = True

# The record names fdm.py by archive prefix; the bytes are read from
# HBF_ORIGINALS when set, else from the owner's fab-knowledge/originals,
# as tools/test-support/originals-root.ts reads them.
FDM_RECORD = "fab-knowledge:originals/pawl/files/src/fdm.py"
ORIGINALS = os.environ.get("HBF_ORIGINALS") or os.path.join(os.path.expanduser("~"), "Projects", "hackbuild", "fab-knowledge", "originals")
FDM = os.path.join(ORIGINALS, "pawl", "files", "src", "fdm.py")
if not os.path.exists(FDM):
    sys.exit(f"originals not found: {FDM} does not exist. set HBF_ORIGINALS to a copy of fab-knowledge/originals")
HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = ["foot", "thigh", "ankle_yoke"]


class _Mesh:
    def __init__(self, vectors):
        self.vectors = vectors

    @classmethod
    def from_file(cls, path):
        b = open(path, "rb").read()
        n = int.from_bytes(b[80:84], "little")
        rec = np.frombuffer(b[84:84 + n * 50], dtype=np.dtype([("n", "<f4", 3), ("v", "<f4", 9), ("a", "<u2")]))
        return cls(rec["v"].reshape(-1, 3, 3).astype(np.float32))


stl = types.ModuleType("stl")
stl.mesh = types.ModuleType("stl.mesh")
stl.mesh.Mesh = _Mesh
sys.modules["stl"] = stl
sys.modules["stl.mesh"] = stl.mesh

spec = importlib.util.spec_from_file_location("fdm", FDM)
fdm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fdm)

sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()
out = {"source": FDM_RECORD, "sourceSha256": sha(FDM), "parts": {}}
for name in PARTS:
    path = os.path.join(HERE, f"{name}.stl")
    up = fdm.ORIENT[name][0]
    fdm.OVER = 45.0
    as_run = fdm.analyse(path, up)
    fdm.OVER = 45.0 + 1e-4
    past = fdm.analyse(path, up)
    out["parts"][name] = {
        "stlSha256": sha(path), "up": list(up),
        "fdmPyPct": round(float(as_run["over_pct"]), 4),
        "pastLimitPct": round(float(past["over_pct"]), 4),
        "totalMm2": round(float(as_run["total"]), 2),
    }
fdm.OVER = 45.0
with open(os.path.join(HERE, "fdm-golden.json"), "w") as f:
    json.dump(out, f, indent=2)
    f.write("\n")
print(json.dumps(out, indent=2))
