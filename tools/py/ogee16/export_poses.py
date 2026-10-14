"""Export the OGEE R16-P printed audit poses and the oracle's measurements (M04-T11 step 2).

Run from the repo root:

    uv run --project tools/py python tools/py/ogee16/export_poses.py

The script imports designs/ogee16/legacy/source/audit_print.py without
editing it (lineage: the R16-P source zip, sha256 in the M04 header) and
calls audit_print.build(zR, zC, lp) for the four states of its __main__
(rest; full select 0,0; all bars up; clear pull) and for the two negative
poses of M04-T11 step 5 (row bar 0 and column bar 1 at STROKE plus 3).

For each pose it writes the label, zR, zC, lp and, per body, the label,
the STL name and the 4x4 transform build() applied. The transforms are
read by handing build() a recorder in place of audit_print.mesh for one
call; a second call with the real loader gives the meshes the oracle
intersects. The thresholds are read from audit_print.py itself: tol from
audit()'s default, the 120 mm3 touch ceiling and the 1e-6 box margin from
its syntax tree, and the touch pairs by calling audit_print.is_touch on
every pair of labels.

Per pose it also records what audit() measures and hides: the box-test
pair count, every non-zero overlap volume, the boolean exceptions that
audit() reads as 0 mm3, and the bodies that are not watertight. The clash
list is computed with audit()'s own rule and compared with audit() run on
the same pose; a difference exits 1.

Outputs: designs/ogee16/legacy/poses/printed-4.json and
printed-negatives.json; stdout is the record kept as
designs/ogee16/legacy/records/export-poses.txt.
"""
import ast
import contextlib
import hashlib
import inspect
import io
import itertools
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
LEGACY = os.path.join(ROOT, "designs", "ogee16", "legacy")
SOURCE = os.path.join(LEGACY, "source")
OUT = os.path.join(LEGACY, "poses")
# The legacy copy is byte identical to the harvest: no __pycache__ beside it.
sys.dont_write_bytecode = True
sys.path.insert(0, SOURCE)

import numpy as np  # noqa: E402
import audit_print  # noqa: E402

# sha256 of the oracle inputs, from the M04 header (computed 2026-10-04).
SOURCES = {
    "audit_print.py": "92c23baae82c80c5eed4741c17c0acd5e204e4c28d91c1d25558fd5259d857ea",
    "kin.py": "d2d5a3250c438666179a511d7e87f0c1da9630c1c672eb570382c22f822c1de2",
    "params.scad": "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d",
}


def sha256_file(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def check_sources():
    for name, want in SOURCES.items():
        got = sha256_file(os.path.join(SOURCE, name))
        if got != want:
            sys.exit(f"{name}: sha256 {got}, want {want}; restore the legacy copy from SHA256SUMS")


def thresholds():
    """tol, the touch ceiling and the box margin, read from audit_print.audit()."""
    tol = inspect.signature(audit_print.audit).parameters["tol"].default
    tree = ast.parse(inspect.getsource(audit_print.audit))
    ceilings, margins = set(), set()
    for node in ast.walk(tree):
        # `v > 120.0 and is_touch(la, lb)`: the squeeze ceiling of a declared touch pair.
        if isinstance(node, ast.Compare) and isinstance(node.left, ast.Name) and node.left.id == "v":
            for c in node.comparators:
                if isinstance(c, ast.Constant) and isinstance(c.value, float):
                    ceilings.add(c.value)
        # `bb[0] + 1e-6`: the margin of the bounding box test.
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add) and isinstance(node.right, ast.Constant) \
                and isinstance(node.right.value, float):
            margins.add(node.right.value)
    if len(ceilings) != 1 or len(margins) != 1:
        sys.exit(f"audit_print.audit: ceilings {sorted(ceilings)}, margins {sorted(margins)}; want one of each")
    return tol, ceilings.pop(), margins.pop()


class Recorder:
    """Stands in for a trimesh while build() runs: keeps the STL name and the transform."""

    def __init__(self, name):
        self.name = name
        self.matrix = np.eye(4)

    def apply_transform(self, m):
        self.matrix = np.asarray(m, dtype=float) @ self.matrix
        return self


def placements(zR, zC, lp):
    real = audit_print.mesh
    audit_print.mesh = Recorder
    try:
        rec = audit_print.build(zR, zC, lp)
    finally:
        audit_print.mesh = real
    return [{"label": l, "stl": r.name, "matrix": [float(v) for v in r.matrix.reshape(-1)]} for l, r in rec]


def measure(zR, zC, lp, tol, ceiling, margin):
    """audit()'s loop, instrumented: every non-zero overlap, exceptions counted, never read as 0."""
    parts = audit_print.build(zR, zC, lp)
    box = [(l, m.bounds) for l, m in parts]
    pairs, exceptions, overlaps, clashes = 0, [], [], []
    for (ia, (la, ba)), (ib, (lb, bb)) in itertools.combinations(list(enumerate(box)), 2):
        if np.any(ba[1] < bb[0] + margin) or np.any(bb[1] < ba[0] + margin):
            continue
        pairs += 1
        try:
            inter = parts[ia][1].intersection(parts[ib][1])
            v = float(inter.volume) if inter is not None and len(inter.faces) else 0.0
        except Exception as e:  # noqa: BLE001 - counted and reported, unlike audit()
            exceptions.append({"a": la, "b": lb, "error": type(e).__name__})
            continue
        touch = audit_print.is_touch(la, lb)
        if v > 0.0:
            overlaps.append({"a": la, "b": lb, "mm3": v, "touch": touch})
        if v > tol and not touch:
            clashes.append({"a": la, "b": lb, "mm3": v, "touch": False})
        elif v > ceiling and touch:
            clashes.append({"a": la, "b": lb, "mm3": v, "touch": True})
    open_bodies = [l for l, m in parts if not m.is_watertight]
    return {"boxPairs": pairs, "overlaps": overlaps, "clashes": clashes, "exceptions": exceptions, "nonWatertight": open_bodies}


def oracle_clashes(label, zR, zC, lp):
    """audit() itself on the pose, its stdout swallowed; the (a, b, v) list it returns."""
    with contextlib.redirect_stdout(io.StringIO()):
        return audit_print.audit(label, zR, zC, lp)


def pose(label, zR, zC, lp, tol, ceiling, margin):
    m = measure(zR, zC, lp, tol, ceiling, margin)
    want = sorted((a.rstrip("*"), b.rstrip("*"), round(v, 6)) for a, b, v in oracle_clashes(label, zR, zC, lp))
    got = sorted((c["a"], c["b"], round(c["mm3"], 6)) for c in m["clashes"])
    if want != got:
        sys.exit(f"[{label}] instrumented clashes {got} differ from audit_print.audit {want}")
    return {"label": label, "zR": list(map(float, zR)), "zC": list(map(float, zC)), "lp": float(lp),
            "bodies": placements(zR, zC, lp), **m}


def report(p):
    touch = [o for o in p["overlaps"] if o["touch"]]
    big = max(touch, key=lambda o: o["mm3"]) if touch else None
    print(f"[{p['label']:20s}] bodies {len(p['bodies'])}  box-test pairs {p['boxPairs']}  "
          f"overlaps above 0 mm3 {len(p['overlaps'])}  above 0.01 mm3 {sum(o['mm3'] > 0.01 for o in p['overlaps'])}  "
          f"boolean exceptions {len(p['exceptions'])}  non-watertight {len(p['nonWatertight'])}  clashes {len(p['clashes'])}")
    if big is not None:
        print(f"    largest touch-pair overlap {big['a']} {big['b']} {big['mm3']:.2f} mm3")
    for c in sorted(p["clashes"], key=lambda c: -c["mm3"]):
        print(f"    clash {c['a']}{'*' if c['touch'] else ''} {c['b']}{'*' if c['touch'] else ''} {c['mm3']:.2f} mm3")


def stl_sums(poses):
    names = sorted({b["stl"] for p in poses for b in p["bodies"]})
    return {n: sha256_file(os.path.join(audit_print.STL, n + ".stl")) for n in names}


def write(name, poses, tol, ceiling, margin):
    labels = [b["label"] for b in poses[0]["bodies"]]
    for p in poses:
        if [b["label"] for b in p["bodies"]] != labels:
            sys.exit(f"[{p['label']}] body labels differ from [{poses[0]['label']}]")
    doc = {
        "format": "hbf-ogee16-poses-1",
        "origin": "designs/ogee16/legacy/source/audit_print.py, build() and audit(), called unedited by tools/py/ogee16/export_poses.py",
        "sources": {n: SOURCES[n] for n in sorted(SOURCES)},
        "stl": stl_sums(poses),
        "tolMm3": tol,
        "touchCeilingMm3": ceiling,
        "boxMarginMm": margin,
        "touchPrefixes": [list(t) for t in audit_print.TOUCH],
        "touch": [[a, b] for a, b in itertools.combinations(labels, 2) if audit_print.is_touch(a, b)],
        "poses": poses,
    }
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(doc, f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"wrote designs/ogee16/legacy/poses/{name}: {len(poses)} poses, {len(labels)} bodies each, {len(doc['touch'])} touch pairs")


def main():
    check_sources()
    tol, ceiling, margin = thresholds()
    P, N = audit_print.P, audit_print.N
    S = P["STROKE"]
    z0 = [0.0] * N
    print(f"audit_print.py thresholds: tol {tol} mm3, touch ceiling {ceiling} mm3, box margin {margin} mm; STROKE {S} mm, LP_SLIDE {P['LP_SLIDE']} mm (computed from params.scad)")
    # audit_print.py __main__, lines 81 to 87.
    states = [("rest", z0, z0, 0.0),
              ("full select 0,0", [S, 0, 0, 0], [S, 0, 0, 0], 0.0),
              ("all bars up", [S] * N, [S] * N, 0.0),
              ("clear pull", z0, z0, P["LP_SLIDE"])]
    # M04-T11 step 5: past the stroke by 3 mm.
    over = S + 3.0
    negatives = [("row bar 0 at stroke plus 3", [over, 0, 0, 0], z0, 0.0),
                 ("column bar 1 at stroke plus 3", z0, [0, over, 0, 0], 0.0)]
    poses = [pose(*s, tol, ceiling, margin) for s in states]
    for p in poses:
        report(p)
    print("TOTAL:", sum(len(p["clashes"]) for p in poses))
    neg = [pose(*s, tol, ceiling, margin) for s in negatives]
    for p in neg:
        report(p)
    write("printed-4.json", poses, tol, ceiling, margin)
    write("printed-negatives.json", neg, tol, ceiling, margin)


if __name__ == "__main__":
    main()
