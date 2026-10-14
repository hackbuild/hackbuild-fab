"""Interference audit for the PRINTED assembly. Different parts, different
clearances (0.30 printed running fit rather than the laser's 0.40 slip), so the
laser audit does not carry over."""
import itertools, math, os
import numpy as np, trimesh
import kin
from kin import P, N, px, py, C, T, ROD_Z, PIN_PLAY, CROWN_TOP

STL = os.path.join(os.path.dirname(__file__), "..", "out", "print")
_c = {}
def mesh(n):
    if n not in _c: _c[n] = trimesh.load(os.path.join(STL, n + ".stl"), process=True)
    return _c[n].copy()
def tr(v): return trimesh.transformations.translation_matrix(v)
def rot(a, ang): return trimesh.transformations.rotation_matrix(ang, a)

def build(zR, zC, lp):
    out = []
    def add(l, n, M=None):
        m = mesh(n)
        if M is not None: m.apply_transform(M)
        out.append((l, m))
    add("base", "base_asm"); add("deck", "deck"); add("face", "face_asm")
    for w in ("wall_xn_asm","wall_xp_asm","wall_yn_asm","wall_yp_asm"):
        add(w.replace("_asm",""), w)
    add("rail0", "rail_asm")
    add("rail1", "rail_asm", tr([P["RAIL_X1"] - P["RAIL_X0"], 0, 0]))
    add("latch", "latch_asm", tr([0, lp, 0]))
    add("pull", "latchpull_asm", tr([0, lp, 0]))
    for i in range(N):
        add(f"rowbar{i}", "rowbar_asm", tr([0, py(i), zR[i]]))
        phi = math.radians(kin.crank_phi(zR[i]))
        add(f"shaftR{i}", "shaft_row",
            tr([0, py(i) + P["ROW_BAR_Y"], P["RSV_Z"]]) @ rot([1, 0, 0], phi))
    for j in range(N):
        add(f"colbar{j}", "colbar_asm", tr([px(j), 0, zC[j]]))
        phi = math.radians(kin.crank_phi(zC[j]))
        add(f"shaftC{j}", "shaft_col",
            tr([px(j) + P["COL_BAR_X"], 0, P["CSV_Z"]]) @ rot([0, 1, 0], -phi))
    for i in range(N):
        for j in range(N):
            rk = kin.rocker(i, j, zR, zC)
            add(f"link{i}{j}",
                "link", tr([rk["origin"][0], py(i), rk["origin"][1]])
                        @ rot([0, 1, 0], -rk["theta"]))
            st = kin.pin_state(i, j, zR, zC, lp, False)
            add(f"rod{i}{j}", "rod_asm",
                tr([px(j), py(i) + st["y"] - PIN_PLAY, st["z"] - CROWN_TOP]))
            add(f"cap{i}{j}", "cap_asm",
                tr([px(j), py(i) + st["y"] - PIN_PLAY, st["z"] - CROWN_TOP]))
    return out

TOUCH = [("rowbar","base"),("colbar","base"),("wall","base"),("wall","deck"),
         ("wall","face"),("wall","rail"),("rail","latch"),("wall_x","wall_y"),
         ("latch","wall"),("shaftR","wall"),("shaftC","wall"),("rowbar","deck"),("colbar","deck"),
         ("link","rowbar"),("link","colbar"),("rod","link"),("rod","face"),("cap","rod"),("cap","face"),
         ("rod","latch"),("deck","base"),("face","base"),("shaftR","rowbar"),("shaftC","colbar"),
         ("rod","deck"),("pull","latch"),("pull","wall"),("colbar","base"),
         ("rowbar","base")]
def is_touch(a, b):
    return any((a.startswith(u) and b.startswith(v)) or (a.startswith(v) and b.startswith(u))
               for u, v in TOUCH)

def audit(label, zR, zC, lp, tol=0.5):
    parts = build(zR, zC, lp)
    bad = []
    box = [(l, m.bounds) for l, m in parts]
    for (ia, (la, ba)), (ib, (lb, bb)) in itertools.combinations(list(enumerate(box)), 2):
        if np.any(ba[1] < bb[0] + 1e-6) or np.any(bb[1] < ba[0] + 1e-6): continue
        try:
            inter = parts[ia][1].intersection(parts[ib][1])
            v = float(inter.volume) if inter is not None and len(inter.faces) else 0.0
        except Exception:
            v = 0.0
        if v > tol and not is_touch(la, lb): bad.append((la, lb, v))
        elif v > 120.0 and is_touch(la, lb): bad.append((la + "*", lb + "*", v))
    print(f"[{label:20s}] clashes: {len(bad)}")
    for a, b, v in sorted(bad, key=lambda t: -t[2])[:10]:
        print(f"    {a:12s} {b:12s} {v:9.2f} mm3")
    return bad

if __name__ == "__main__":
    S = P["STROKE"]; z0 = [0.0] * N
    states = [("rest", z0, z0, 0.0),
              ("full select 0,0", [S,0,0,0], [S,0,0,0], 0.0),
              ("all bars up", [S]*N, [S]*N, 0.0),
              ("clear pull", z0, z0, P["LP_SLIDE"])]
    print("TOTAL:", sum(len(audit(*s)) for s in states))
