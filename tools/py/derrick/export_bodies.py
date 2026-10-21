"""Export the bodies and the 37 tests of PINTLE R6 snap_check.py (M04-T06 step 4).

Run from the repo root:

    uv run --project tools/py tools/py/derrick/export_bodies.py [out_dir]

out_dir defaults to designs/derrick/legacy/capture. The script imports the
canonical sources by absolute path (lineage pintle.parts/r6,
pintle.snap-check/r6, derrick.parts/r3) and builds every body snap_check.py
intersects, in the pose snap_check.py reads it before a test moves it, then
writes each body as a binary STL and the tests as tests.json. Each test is
written in one normal form: `move` is applied to `a` and the volume is the
intersection of moved a with b. Where snap_check.py moves its second
argument (lines 39 and 99, 100) the pair is swapped; an intersection
volume does not depend on argument order.

The want and the floor are snap_check.py's own: `ok = (v < 1.0) if
want_clear else (v > 1.0)` at line 25. The oracle volumes are not computed
here; the TypeScript test reads them from the 2026-10-05 rerun record,
which this script does not touch.
"""
import hashlib
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from hbf_archives import local_source  # noqa: E402

ORIG = local_source("fab-knowledge:originals/").rstrip("/")
PINTLE_SRC = ORIG + "/pintle/files/src"
DERRICK_SRC = ORIG + "/derrick/files/src"
# The originals folder is read only: no __pycache__ lands beside the sources.
sys.dont_write_bytecode = True
# pintle_parts.py r6 first: arm_parts.py imports pintle_parts by name, and the
# derrick bundle's copy is byte identical (sha256 5280a223...).
sys.path.insert(0, DERRICK_SRC)
sys.path.insert(0, PINTLE_SRC)

import numpy as np  # noqa: E402
import pintle_parts as pp  # noqa: E402
import arm_parts as ap  # noqa: E402
from pintle_parts import P, D  # noqa: E402

SOURCES = {
    "pintle_parts.py": (PINTLE_SRC + "/pintle_parts.py", "5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1"),
    "snap_check.py": (PINTLE_SRC + "/snap_check.py", "9b7c9c9f0de47b0da552cb924fe59e8c8175b8ed3104e9e251f3acf974f30aa3"),
    "arm_parts.py": (DERRICK_SRC + "/arm_parts.py", "ab2e4acd8283f43b78d64a9bc653afe4b79fd1de5c993a5cf3ff2a7d30821fc3"),
}

# The floor is read from snap_check.py itself (CHK-FIT-04: an exporter that
# keeps its own copy of the number it carries goes stale when the source moves).
FLOOR_RULE = re.compile(r"ok = \(v < ([0-9.]+)\) if want_clear else \(v > ([0-9.]+)\)")


def read_floor():
    """The clear and traps floor of snap_check.py, mm3, and the line it is read from, numbered."""
    with open(SOURCES["snap_check.py"][0]) as f:
        hits = [(i + 1, ln.strip()) for i, ln in enumerate(f.read().split("\n")) if FLOOR_RULE.fullmatch(ln.strip())]
    if len(hits) != 1:
        sys.exit(f"snap_check.py holds {len(hits)} floor rules, want one")
    n, line = hits[0]
    m = FLOOR_RULE.fullmatch(line)
    if m.group(1) != m.group(2):
        sys.exit(f"snap_check.py line {n} reads {line!r}, not one floor for clear and traps")
    return float(m.group(1)), f"line {n}: {line}"


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def check_sources():
    for name, (path, want) in SOURCES.items():
        got = sha256_file(path)
        if got != want:
            sys.exit(f"{name} at {path} has sha256 {got}, lineage records {want}; refusing to export from a changed source")


def bodies():
    """Every body snap_check.py intersects, in its pre-move pose (snap_check.py lines 19 to 100)."""
    b = {}
    b["stator"] = pp.stator()
    b["rotor"] = pp.rotor()
    b["belly"] = pp.belly()
    b["retainer"] = pp.retainer()
    b["retainer_locked"] = pp.retainer_locked()
    b["horn"] = pp.horn()
    b["servo"] = pp.servo(cable=False)
    H = D["z_top"]
    tp = ap.tool_plate()
    tp.apply_translation([0, 0, H])
    b["tool_plate"] = tp
    # lines 60 and 84 build the same lock screw path; one body serves both.
    b["lock_path"] = pp.cyl(P["d_m2_clr"] / 2 - 0.1, H - 2.0, H + 30.0, seg=24,
                            x=D["lock_r"] * np.cos(D["lock_a"]), y=D["lock_r"] * np.sin(D["lock_a"]))
    b["driver_path"] = pp.cyl(D["hs_head_d"] / 2 - 0.30, D["hs_step"] + 0.2, 60.0, seg=24)
    b["shank_path"] = pp.cyl(D["hs_shank_d"] / 2 - 0.20, D["horn_arm_z0"] - 1.0, D["z_top"] + 20.0, seg=24)
    b["screw_head"] = pp.cyl(2.30, D["hs_step"] - 1.2, D["hs_step"] - 0.1, seg=24)
    Mh = np.eye(4)
    Mh[:3, 0], Mh[:3, 1], Mh[:3, 2] = (0, -1, 0), (0, 0, -1), (1, 0, 0)
    Mh[:3, 3] = np.array([0, 0, D["z_top"]]) - Mh[:3, :3] @ np.array([0.0, ap.IFACE_Y, ap.ZI])
    hgw = ap.hinge()
    hgw.apply_transform(Mh)
    b["hinge_on_rotor"] = hgw
    b["cradle"] = ap.hinge()
    return b


def mv(dx=0.0, dy=0.0, dz=0.0, rz=0.0):
    return {"dxMm": float(dx), "dyMm": float(dy), "dzMm": float(dz), "rotZDeg": float(rz)}


def tests():
    """The 37 tests in snap_check.py order; line is the snap_check.py line of the clear() call."""
    t = []

    def add(label, a, b, move, want, line):
        t.append({"label": label, "a": a, "b": b, "move": move, "want": want, "line": line})

    for dz in (0, 1, 3, 8, 16):
        add(f"rotor lifted {dz} mm vs stator", "rotor", "stator", mv(dz=dz), "clear", 32)
    add("retainer at drop angle, seated", "retainer", "stator", mv(), "clear", 35)
    add("retainer at drop angle, lifted 1.2 mm", "retainer", "stator", mv(dz=1.2), "clear", 36)
    add("retainer twisted to locked, seated", "retainer_locked", "stator", mv(), "clear", 37)
    add("retainer locked, lifted 1.2 mm", "retainer_locked", "stator", mv(dz=1.2), "traps", 38)
    add("retainer locked, holds the rotor down", "rotor", "retainer_locked", mv(dz=1.2), "traps", 39)
    add("belly seated in the recess", "belly", "stator", mv(), "clear", 42)
    add("belly pulled down 0.5 mm", "belly", "stator", mv(dz=-0.5), "traps", 43)
    add("horn seated in the rotor cross pocket", "horn", "rotor", mv(), "clear", 48)
    add("horn turned 8 deg against the rotor", "horn", "rotor", mv(rz=8.0), "traps", 49)
    add("horn turned 8 deg against the servo", "horn", "servo", mv(rz=8.0), "clear", 50)
    add("bracket seated on the rail", "tool_plate", "rotor", mv(), "clear", 55)
    for dx in (4, 10, 20, 34):
        add(f"bracket slid {dx} mm along the rail", "tool_plate", "rotor", mv(dx=dx), "clear", 57)
    add("bracket lifted 1.5 mm off the face", "tool_plate", "rotor", mv(dz=1.5), "traps", 58)
    add("bracket pushed 1.0 mm across the rail", "tool_plate", "rotor", mv(dy=1.0), "traps", 59)
    add("lock screw path through the bracket", "lock_path", "tool_plate", mv(), "clear", 62)
    add("retainer over twisted 8 deg past locked", "retainer", "stator", mv(rz=math.degrees(D["ret_twist"]) + 8), "traps", 65)
    add("driver path down to the shoulder, through the rotor", "driver_path", "rotor", mv(), "clear", 76)
    add("screw shank path from the spline up and out", "shank_path", "rotor", mv(), "clear", 78)
    add("same path through the tool plate on top", "shank_path", "tool_plate", mv(), "clear", 79)
    add("head cannot fall past the shoulder", "screw_head", "rotor", mv(), "traps", 81)
    add("lock screw path through the hinge cheek", "lock_path", "hinge_on_rotor", mv(), "clear", 91)
    add("hinge seated on the rotor face", "hinge_on_rotor", "rotor", mv(), "clear", 92)
    add("cradle seated on the module", "cradle", "stator", mv(), "clear", 96)
    for dx in (3, 8, 16, 30):
        add(f"cradle drawn back {dx} mm along +x", "cradle", "stator", mv(dx=dx), "clear", 98)
    add("module lifted 1.0 mm inside the cradle", "stator", "cradle", mv(dz=1.0), "traps", 99)
    add("module pushed 1.0 mm sideways in the cradle", "stator", "cradle", mv(dy=1.0), "traps", 100)
    return t


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "designs/derrick/legacy/capture"
    check_sources()
    floor, floor_line = read_floor()
    os.makedirs(out, exist_ok=True)
    b = bodies()
    t = tests()
    for x in t:
        for k in ("a", "b"):
            if x[k] not in b:
                sys.exit(f"test {x['label']} names body {x[k]}, which bodies() does not build")
    for name, m in sorted(b.items()):
        if not m.is_watertight:
            sys.exit(f"body {name} is not watertight; snap_check.py volumes would not hold")
        m.export(os.path.join(out, f"{name}.stl"), file_type="stl")
    doc = {
        "source": "PINTLE R6 snap_check.py (lineage pintle.snap-check/r6), bodies from pintle_parts.py r6 and DERRICK R3 arm_parts.py",
        "sources": {k: v[1] for k, v in SOURCES.items()},
        "floorMm3": floor,
        "floorSource": f"snap_check.py {floor_line}",
        "moveRule": "move applies to a: rotate about z through the origin by rotZDeg, then translate by dx, dy, dz (mm)",
        "bodies": sorted(b.keys()),
        "tests": t,
    }
    with open(os.path.join(out, "tests.json"), "w") as f:
        json.dump(doc, f, indent=1, sort_keys=False)
        f.write("\n")
    traps = sum(1 for x in t if x["want"] == "traps")
    print(f"{len(b)} bodies, {len(t)} tests ({traps} traps, {len(t) - traps} clear) written to {out}")


if __name__ == "__main__":
    main()
