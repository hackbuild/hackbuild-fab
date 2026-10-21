"""Writes packages/motion/test/goldens/derrick-fk.json for M07-T10.

Run from the repo root:
    uv run --project tools/py python packages/motion/scripts/derrick_fk_golden.py

It runs arm_build.py (DERRICK R3, lineage derrick.build/r3, canonical) from
its own lines: lines 1 to 9 (imports) and 12 to 164 (frames, the part
library, instances, the poses and torque_table), unedited. Lines 10 and 11
make /home/claude/out, a folder of the bench machine, and are skipped; the
rest of the file (collision sweeps, exports, the viewer payload) is not run.

The golden holds two things:
- model: every number the TypeScript port reads, taken from the modules
  (arm_parts, pintle_parts) and from the part meshes arm_build.py builds
  (volume and centre of mass of each library mesh, full precision).
- ref: what arm_build.py computes at its seven POSES, full precision: the
  tool frame, the joint frames, every instance's name, matrix and mass,
  and torque_table rows.
The test compares the port with ref, and ref rounded the way arm_build.py
writes arm_ref.json with the 2026-10-05 regenerated record.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "tools" / "py"))
from hbf_archives import local_source  # noqa: E402

ORIG = local_source("fab-knowledge:originals/").rstrip("/")
DERRICK_SRC = ORIG + "/derrick/files/src"
PINTLE_SRC = ORIG + "/pintle/files/src"
sys.dont_write_bytecode = True
sys.path.insert(0, DERRICK_SRC)
sys.path.insert(0, PINTLE_SRC)

SOURCES = {
    "arm_build.py": (DERRICK_SRC + "/arm_build.py", "204cc173ccaba951a7b690cb029b2ba3a9dcf3600516098bd0e0dee0e623e467"),
    "arm_parts.py": (DERRICK_SRC + "/arm_parts.py", "ab2e4acd8283f43b78d64a9bc653afe4b79fd1de5c993a5cf3ff2a7d30821fc3"),
    "pintle_parts.py": (PINTLE_SRC + "/pintle_parts.py", "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1"),
}
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "packages" / "motion" / "test" / "goldens" / "derrick-fk.json"


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


for name, (path, want) in SOURCES.items():
    got = sha(path)
    if got != want:
        sys.exit(f"{name} at {path} has sha256 {got}, lineage records {want}; refusing to write from a changed source")

lines = Path(SOURCES["arm_build.py"][0]).read_text().split("\n")
if not lines[9].startswith("OUT = ") or not lines[10].startswith("os.makedirs(OUT") or not lines[11].startswith("RHO = "):
    sys.exit("arm_build.py lines 10 to 12 are not OUT, os.makedirs and RHO; the slice no longer fits")
if not lines[164].startswith("print('\\n--- static torque"):
    sys.exit("arm_build.py line 165 is not the static torque print; the slice no longer fits")
ns = {"__name__": "arm_build_slice"}
exec(compile("\n".join(lines[0:9] + [""] * 2 + lines[11:164]), SOURCES["arm_build.py"][0], "exec"), ns)

np = ns["np"]
ap = ns["ap"]
pp = ns["pp"]
D = ns["D"]

# The meshes instances() places, by the key the port uses.
meshes = {k: ns["MOD"][k] for k in ("stator", "rotor", "retainer", "belly")}
meshes["horn"] = ns["HORN"]
meshes.update(ns["BRK"])
meshes.update(ns["HW"])
lib = {k: {"volMm3": float(m.volume), "com": [float(x) for x in m.center_mass]} for k, m in sorted(meshes.items())}

# The masses and the servo centre of mass instances() and torque_table()
# carry as literals, read from the lines that hold them; a line that moved
# or changed stops the script.
src = "\n".join(lines)


def literal(pattern, what):
    hits = re.findall(pattern, src)
    if len(hits) == 0 or len(set(hits)) != 1:
        sys.exit(f"arm_build.py: {what} not found once by {pattern!r} (found {hits})")
    return hits[0]


hw = literal(r"0\.35 if hk\.startswith\('m2'\) else \((0\.45) if hk == 'hornscrew' else (1\.1)\)", "hardware masses")
model_mass = {
    "horn": float(literal(r"\(f'\{tag\} horn', HORN, f @ Rz\(q\[i\]\), ([0-9.]+)\)\)", "horn mass")),
    "m2": float(literal(r"([0-9.]+) if hk\.startswith\('m2'\)", "m2 screw mass")),
    "hornscrew": float(hw[0]),
    "hardware": float(hw[1]),
    "m2x12": float(literal(r"H \+ ap\.PAD_TH\]\), ([0-9.]+)\)\)", "lock screw mass")),
    "m3x12": float(literal(r"T\(\[fx, fy, -ap\.FT\]\), ([0-9.]+)\)\)", "base screw mass")),
}
servo_com = [float(x) for x in literal(r"if 'servo' not in name else np\.array\(\[([0-9., ]+)\]\)", "servo centre of mass").split(",")]

model = {
    "mass": model_mass, "servoCom": servo_com,
    "H": float(ap.H), "IFACE_Y": float(ap.IFACE_Y), "ZI": float(ap.ZI), "PAD_Z": float(ap.PAD_Z), "PAD_TH": float(ap.PAD_TH),
    "FT": float(ap.FT), "L1": float(ap.L1), "L2": float(ap.L2),
    "BASE_X0": float(ap.BASE_X0), "BASE_X1": float(ap.BASE_X1), "BASE_Y": float(ap.BASE_Y),
    "hs_step": float(D["hs_step"]), "cradle_screw": [float(x) for x in D["cradle_screw"]],
    "lock_r": float(D["lock_r"]), "lock_a": float(D["lock_a"]),
    "RHO": float(ns["RHO"]), "SERVO_G": float(ns["SERVO_G"]),
    "BRACKET": list(ns["BRACKET"]), "JOINTS": list(ns["JOINTS"]),
    "lib": lib,
}

flat = lambda m: [float(x) for x in np.asarray(m).reshape(-1)]
ref = {}
for name, q in ns["POSES"].items():
    inst, fs, tool = ns["instances"](q)
    rows = ns["torque_table"](q)
    ref[name] = {
        "q": [float(x) for x in q],
        "tool": flat(tool),
        "frames": [flat(f) for f in fs],
        "instances": [{"name": n, "m": flat(M), "mass": float(mass)} for n, _, M, mass in inst],
        "torque": [{"joint": r[0], "carriedG": float(r[1]), "kgcm": float(r[2]), "gmm": float(r[3])} for r in rows],
    }

out = {
    "source": "arm_build.py (DERRICK R3) lines 1 to 9 and 12 to 164, run unedited by packages/motion/scripts/derrick_fk_golden.py",
    "sha256": {k: v[1] for k, v in SOURCES.items()},
    "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "trimesh": ns["trimesh"].__version__},
    "model": model,
    "ref": ref,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out) + "\n")
print(f"wrote {OUT.relative_to(ROOT)}: {len(ref)} poses, {len(ref['home']['instances'])} instances, {len(lib)} meshes")
