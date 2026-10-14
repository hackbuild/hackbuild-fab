# Records the slew-ring-joint bodies as the original builds them:
# originals/pintle/files/src/pintle_parts.py (lineage pintle.parts/r6) run
# as written with trimesh, shapely and manifold3d (tools/py pins), stator()
# lines 328 to 399 and rotor() lines 402 to 444 at the P defaults, and the
# shipped exports/pintle-stator.stl and pintle-rotor.stl read back beside
# them. It also measures the thrust contact on the built meshes: the
# stator's upward faces and the rotor's downward faces at z_thrust,
# projected and intersected, the bearing annulus the original builds.
# gridSnapVolume is the built mesh's volume with every vertex moved to the
# D-054 grid of 1/1024 mm, the grid every kernel route snaps to.
# Writes test/legacy/slew-ring.json. Run from the repo root:
#   uv run --project tools/py packages/mechanisms/test/legacy/record-slew-ring.py
import hashlib, json, os, sys
sys.dont_write_bytecode = True
SRC_DIR = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals/pintle/files"
SRC = os.path.join(SRC_DIR, "src", "pintle_parts.py")
WANT = "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1"
data = open(SRC, "rb").read()
if hashlib.sha256(data).hexdigest() != WANT:
    sys.exit(f"{SRC}: sha256 differs from lineage pintle.parts/r6")
sys.path.insert(0, os.path.dirname(SRC))
import numpy as np  # noqa: E402
import trimesh as tm  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402
from shapely.ops import unary_union  # noqa: E402
import pintle_parts as pp  # noqa: E402


def summary(m):
    lo, hi = m.bounds
    return {"volume": round(float(m.volume), 6), "bboxMin": [round(float(x), 6) for x in lo], "bboxMax": [round(float(x), 6) for x in hi],
            "faces": int(len(m.faces)), "watertight": bool(m.is_watertight)}


def flat(m, z, up):
    """Union of the faces lying in plane z whose normal points up (or down), projected to xy."""
    keep = []
    for f, n in zip(m.faces, m.face_normals):
        v = m.vertices[f]
        if np.all(np.abs(v[:, 2] - z) < 1e-4) and ((n[2] > 0.999) if up else (n[2] < -0.999)):
            p = Polygon(v[:, :2])
            if p.area > 0:
                keep.append(p.buffer(1e-9))
    return unary_union(keep)


stator, rotor = pp.stator(), pp.rotor()
z = pp.D["z_thrust"]
floor = flat(stator, z, True)
face = flat(rotor, z, False)
contact = floor.intersection(face)

out = {
    "source": {"file": "files/src/pintle_parts.py", "lineage": "pintle.parts/r6", "sha256": WANT,
               "lines": {"stator": "328 to 399", "rotor": "402 to 444", "P": "19 to 69", "SEG": "16", "boreSeg": "356"},
               "command": "uv run --project tools/py packages/mechanisms/test/legacy/record-slew-ring.py",
               "engine": f"trimesh {tm.__version__}, booleans by manifold3d (pintle_parts.py ENG, line 15)"},
    "P": {k: pp.P[k] for k in ("r_j", "flange_t", "r_bore", "r_rboss", "cl_journal", "cl_thrust", "sv_spline_d", "r_head", "r_skirt")},
    "D": {k: float(pp.D[k]) for k in ("z_thrust", "z_flange_top", "z_stop", "r_jbore", "z_top")},
    "SEG": pp.SEG,
    "boreSeg": 96,
    "bodies": {},
    "thrustContact": {"z": z, "statorFloorArea": round(float(floor.area), 6), "rotorFaceArea": round(float(face.area), 6),
                      "area": round(float(contact.area), 6),
                      "rIn": round(float(min(np.hypot(*c) for c in contact.interiors[0].coords)) if contact.geom_type == "Polygon" and len(contact.interiors) == 1 else -1, 6),
                      "rOut": round(float(max(np.hypot(*c) for c in contact.exterior.coords)) if contact.geom_type == "Polygon" else -1, 6)},
}
for name, m in (("stator", stator), ("rotor", rotor)):
    stl = os.path.join(SRC_DIR, "exports", f"pintle-{name}.stl")
    sb = open(stl, "rb").read()
    snapped = tm.Trimesh(np.round(m.vertices * 1024) / 1024, m.faces, process=False)
    out["bodies"][name] = {"built": summary(m), "gridSnapVolume": round(float(snapped.volume), 6), "export": {"file": f"files/exports/pintle-{name}.stl", "sha256": hashlib.sha256(sb).hexdigest(), **summary(tm.load(stl))}}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "slew-ring.json"), "w"), indent=1)
print(json.dumps({"contact": out["thrustContact"], **{k: (v["built"]["volume"], v["export"]["volume"]) for k, v in out["bodies"].items()}}))
