"""Pick a print orientation for every part instead of guessing at one.

For each part it tries all 24 axis-aligned poses and scores each by what actually
matters on an FDM bed: how much of the part touches it, how much hangs over
steeper than 45 degrees, and how tall the result is. Bed contact first because a
part that lifts is a failed print; overhang second because it is support and a
bad surface; height last because it is only time.

Run it, read the table, and put the answer in printed.scad. It is a tool for
deciding, not a black box in the pipeline: two parts here are one-liners I would
have got wrong by eye, and one (the column bar) I did get wrong by eye.
"""
import itertools, math, os, sys
import numpy as np, trimesh

STL = os.path.join(os.path.dirname(__file__), "..", "out", "print")
FLAT = math.cos(math.radians(45))

def poses():
    """The 24 rotations that keep the part axis aligned."""
    out = []
    for axis, ang in itertools.product("xyz", (0, 90, 180, 270)):
        for spin in (0, 90):
            R = trimesh.transformations.euler_matrix(
                math.radians(ang if axis == "x" else 0),
                math.radians(ang if axis == "y" else 0),
                math.radians(ang if axis == "z" else 0))
            S = trimesh.transformations.euler_matrix(0, 0, math.radians(spin))
            out.append((f"{axis}{ang}" + (f"+z{spin}" if spin else ""), S @ R))
    seen, uniq = set(), []
    for name, M in out:
        key = np.round(M[:3, :3], 6).tobytes()
        if key not in seen:
            seen.add(key); uniq.append((name, M))
    return uniq

def score(m):
    z0 = m.bounds[0][2]
    fn, fa = m.face_normals, m.area_faces
    ctr = m.triangles.mean(axis=1)
    on_bed = (fn[:, 2] < -0.99) & (np.abs(ctr[:, 2] - z0) < 0.05)
    over = (fn[:, 2] < -FLAT) & ~on_bed
    d = m.bounds[1] - m.bounds[0]
    return dict(bed=float(fa[on_bed].sum()), over=float(fa[over].sum()),
                h=float(d[2]), w=float(d[0]), dpt=float(d[1]))

def best(name):
    src = trimesh.load(os.path.join(STL, name + ".stl"), process=False)
    rows = []
    for pose, M in poses():
        m = src.copy(); m.apply_transform(M)
        s = score(m); s["pose"] = pose; rows.append(s)
    # bed contact first, then overhang, then height. Round so near ties fall
    # through to the next criterion instead of being decided by float noise.
    rows.sort(key=lambda s: (-round(s["bed"]), round(s["over"]), round(s["h"], 1)))
    return rows[0], rows

if __name__ == "__main__":
    parts = sys.argv[1:] or [
        "rowbar_asm", "colbar_asm", "rod_asm", "shaft_row_asm", "shaft_col_asm",
        "link_asm", "knob", "pivot", "latchpull_asm", "latch_asm", "face_asm",
        "deck", "base", "wall_xp", "rail"]
    print(f"{'part':15s} {'pose':10s} {'bed mm2':>9s} {'overhang':>9s} {'h':>6s}   "
          f"{'(current pose)':>22s}")
    for p in parts:
        b, rows = best(p)
        cur = next(r for r in rows if r["pose"] == "x0")
        flag = "" if b["pose"] == "x0" else "  <-- ROTATE"
        print(f"{p:15s} {b['pose']:10s} {b['bed']:9.1f} {b['over']:9.1f} {b['h']:6.1f}   "
              f"bed {cur['bed']:8.1f} over {cur['over']:7.1f}{flag}")
