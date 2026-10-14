"""
Mesh level interference audit for R13. Places every real part at its solved
position and asks manifold, on the actual triangles, whether any two solids
share volume. Joints meant to touch are whitelisted and only checked for
over-interference.
"""
import itertools, math, os
import numpy as np, trimesh
import math
import kin
from kin import P, N, px, py, C, T, ROD_Z, PIN_PLAY, CROWN_TOP, YOFF
DIAG = math.radians(P["DIAG"])
def cell(i, j):
    return tr([px(j), py(i), 0]) @ rot([0, 0, 1], DIAG)

STL = os.path.join(os.path.dirname(__file__), "..", "out", "stl")
_c = {}
def mesh(n):
    if n not in _c: _c[n] = trimesh.load(os.path.join(STL, n + ".stl"), process=True)
    return _c[n].copy()
def rot(a, ang): return trimesh.transformations.rotation_matrix(ang, a)
def tr(v): return trimesh.transformations.translation_matrix(v)

def build(zR, zC, lp, latched):
    out = []
    def add(label, name, M=None):
        m = mesh(name)
        if M is not None: m.apply_transform(M)
        out.append((label, m))

    add("base", "base")
    add("wallx0", "wallx"); add("wallx1", "wallx", tr([P["XI1"] + T - P["XI0"], 0, 0]))
    add("wally0", "wally"); add("wally1", "wally", tr([0, P["YI1"] + T - P["YI0"], 0]))
    add("deck", "deck")
    add("rail0", "rail");  add("rail1", "rail", tr([P["RAIL_X1"] - P["RAIL_X0"], 0, 0]))
    add("face", "face")
    add("latch", "latch", tr([-lp*math.sin(DIAG), lp*math.cos(DIAG), 0]))
    add("svbrR", "svbracket_row"); add("svbrC", "svbracket_col")
    add("lbracket", "latchbracket")
    add("lrib0", "latchrib"); add("lrib1", "latchrib", tr([P["LRIB_X"][1] - P["LRIB_X"][0], 0, 0]))

    add("face2", "face2_circle")
    for i in range(N):
        add(f"rowbar{i}", "rowbar", tr([0, py(i), zR[i]]))
        add(f"rowdrive{i}", "rowdrive", tr([0, py(i), zR[i]]))
        add(f"rowguide{i}", "rowguide", tr([0, py(i), zR[i]]))
    for j in range(N):
        add(f"colbar{j}", "colbar", tr([px(j), 0, zC[j]]))
        add(f"coldrive{j}", "coldrive", tr([px(j), 0, zC[j]]))
        for g in P["GUIDE_Y"]:
            add(f"colguide{j}_{g}", "colguide",
                tr([px(j), g - P["GUIDE_Y"][0], zC[j]]))

    for i in range(N):
        for j in range(N):
            Kc = cell(i, j)
            add(f"rowlug{i}{j}", "rowlug", tr([0,0,zR[i]]) @ Kc)
            add(f"collug{i}{j}", "collug", tr([0,0,zC[j]]) @ Kc)
            rk = kin.rocker(i, j, zR, zC)
            M = Kc @ tr([rk["origin"][0] - px(j), 0, rk["origin"][1]]) @ \
                rot([0, 1, 0], -rk["theta"])
            add(f"link{i}{j}", "link", M)
            st = kin.pin_state(i, j, zR, zC, lp, latched[i][j])
            dz = st["z"] - CROWN_TOP
            add(f"rod{i}{j}", "rod",
                Kc @ tr([0, st["y"] - PIN_PLAY, dz]))
            add(f"cap{i}{j}", "cap_circle",
                Kc @ tr([0, st["y"] - PIN_PLAY, P["FACE2_Z"] + dz]))

    # ---- hardware. These were excluded from the placement diff, which is
    # exactly why a latch crank sitting at the origin went unnoticed.
    RC, SW = P["CRANK_R"], P["CRANK_SW"]
    for i in range(N):
        phi = math.radians(kin.crank_phi(zR[i]))
        cy = py(i) + P["ROW_BAR_Y"] + RC*math.cos(phi)
        cz = P["RSV_Z"] + RC*math.sin(phi)
        add(f"crankR{i}", "m_crank_row",
            tr([P["RSV_CRK"], py(i)+P["ROW_BAR_Y"], P["RSV_Z"]]) @ rot([1,0,0], phi))
        add(f"ckpR{i}", "m_crankpin_row", tr([P["RSV_CRK"]-9, cy, cz]))
        add(f"kpR{i}",  "m_washer_x",     tr([P["RSV_CRK"]-7.5, cy, cz]))
    for j in range(N):
        phi = math.radians(kin.crank_phi(zC[j]))
        cx = px(j) + P["COL_BAR_X"] + RC*math.cos(phi)
        cz = P["CSV_Z"] + RC*math.sin(phi)
        add(f"crankC{j}", "m_crank_col",
            tr([px(j)+P["COL_BAR_X"], P["CSV_CRK"], P["CSV_Z"]]) @ rot([0,1,0], -phi))
        add(f"ckpC{j}", "m_crankpin_col", tr([cx, P["CSV_CRK"]-9, cz]))
        add(f"kpC{j}",  "m_washer_y",     tr([cx, P["CSV_CRK"]-7.5, cz]))
    LR, LSW = P["LCRANK_R"], P["LCRANK_SW"]
    lphi = math.degrees(math.asin(max(-1, min(1,
        math.sin(math.radians(-LSW)) + lp/LR))))
    lp_x = P["LSV_X"] + LR*math.cos(math.radians(lphi + P["DIAG"]))
    lp_y = P["LSV_Y"] + LR*math.sin(math.radians(lphi + P["DIAG"]))
    add("lcrank", "m_crank_latch",
        tr([P["LSV_X"], P["LSV_Y"], P["LSV_SHAFT_Z"] + T/2])
        @ rot([0,0,1], math.radians(lphi + P["DIAG"])))
    add("lpin",  "m_crankpin_latch", tr([lp_x, lp_y, P["LSV_SHAFT_Z"]-2]))
    add("lkeep", "m_washer_z",       tr([lp_x, lp_y, P["LP_Z"]+T+1.7]))
    for i in range(N):
        for j in range(N):
            add(f"pivR{i}{j}", "m_pivot",
                tr([px(j)+C, py(i)-5.7, ROD_Z+zR[i]]))
            add(f"pivC{i}{j}", "m_pivot",
                tr([px(j)-C, py(i)-5.3, ROD_Z+zC[j]]))
            add(f"wshR{i}{j}", "m_washer_y",
                tr([px(j)+C, py(i)-4.2, ROD_Z+zR[i]]))
            add(f"wshC{i}{j}", "m_washer_y",
                tr([px(j)-C, py(i)+4.2, ROD_Z+zC[j]]))
    return out

TOUCH = [("piv","rowlug"),("piv","collug"),("piv","link"),("wsh","piv"),
         ("wsh","link"),("crank","ckp"),("ckp","rowdrive"),("ckp","coldrive"),
         ("kp","ckp"),("lcrank","lpin"),("lpin","latch"),("lkeep","lpin"),
         ("piv","wsh"),("crankR","ckpR"),("crankC","ckpC"),
("cap","rod"),("cap","face2"),("face2","face"),("rowguide","rowbar"),
         ("colguide","colbar"),("rowguide","deck"),("colguide","deck"),
         ("rowlug","rowbar"),("collug","colbar"),("rowdrive","rowbar"),
         ("coldrive","colbar"),("rowlug","deck"),("collug","deck"),
         ("coldrive","deck"),("wall","base"),("wall","deck"),("wall","face"),
         ("wallx","wally"),("rail","wally"),("rail","latch"),
         ("svbr","base"),("svbr","deck"),("lrib","base"),("lrib","deck"),
         ("lrib","lbracket"),("rowbar","base"),("colguide","base"),("rowguide","base"),("coldrive","base"),("link","rowlug"),("link","collug"),("rod","link")]
def is_touch(a, b):
    for u, v in TOUCH:
        if (a.startswith(u) and b.startswith(v)) or (a.startswith(v) and b.startswith(u)):
            return True
    return False

def audit(label, zR, zC, lp, latched, tol=0.5):
    parts = build(zR, zC, lp, latched)
    bad = []
    boxes = [(l, m.bounds) for l, m in parts]
    for (ia, (la, ba)), (ib, (lb, bb)) in itertools.combinations(list(enumerate(boxes)), 2):
        if np.any(ba[1] < bb[0] + 1e-6) or np.any(bb[1] < ba[0] + 1e-6):
            continue
        try:
            inter = parts[ia][1].intersection(parts[ib][1])
            v = float(inter.volume) if inter is not None and len(inter.faces) else 0.0
        except Exception:
            v = 0.0
        if v > tol and not is_touch(la, lb):
            bad.append((la, lb, v))
        elif v > 60.0 and is_touch(la, lb):
            bad.append((la + "*", lb + "*", v))
    print(f"[{label:22s}] clashes: {len(bad)}")
    for a, b, v in sorted(bad, key=lambda t: -t[2])[:12]:
        print(f"    {a:14s} {b:14s} {v:9.2f} mm3")
    return bad

if __name__ == "__main__":
    S = P["STROKE"]; z0 = [0.0] * N
    L0 = [[0] * N for _ in range(N)]; L1 = [[1] * N for _ in range(N)]
    states = [("rest", z0, z0, 0.0, L0),
              ("half select row0", [S,0,0,0], z0, 0.0, L0),
              ("half select col0", z0, [S,0,0,0], 0.0, L0),
              ("full select 0,0", [S,0,0,0], [S,0,0,0], 0.0, L0),
              ("all bars up", [S]*N, [S]*N, 0.0, L0),
              ("all 16 latched", z0, z0, 0.0, L1),
              ("clear pull", z0, z0, P["LP_SLIDE"], L1)]
    total = sum(len(audit(*s)) for s in states)
    print("TOTAL CLASHES:", total)
