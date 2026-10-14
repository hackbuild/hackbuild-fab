"""Sweep the rotating parts through their whole motion.

Every other check here samples STATES: bars at rest, bars up, plate pulled. That
is fine for the bars, which only translate, so the extremes bound everything in
between. It is wrong for the CRANKS, which rotate. A crank's pin traces an arc,
and an arc is not bounded by its endpoints: the pin can be clear at both ends of
the stroke and foul something in the middle, and its HEAD sweeps a ring that no
endpoint test ever visits.

That is exactly what went wrong. The latch pin's head sat 0.5mm above the servo
case and swept a 6mm ring straight over it. Nothing caught it, because the pin
belongs to the crank, the crank is whitelisted against the parts it drives, and
no check ever rotated it.

So: rotate each crank in small steps, take the union of the swept solid, and
test that against every part and every servo box.
"""
import math, sys
import numpy as np, trimesh
import kin
from kin import P, N, px, py
import audit_print

STEPS = 25

def tr(v): return trimesh.transformations.translation_matrix(v)
def rot(a, ang): return trimesh.transformations.rotation_matrix(ang, a)

def swept(name, place):
    """Union of a rotating part over the whole motion."""
    parts = []
    for k in range(STEPS):
        u = k / (STEPS - 1)
        m = audit_print.mesh(name)
        m.apply_transform(place(u))
        parts.append(m)
    return trimesh.util.concatenate(parts)

def main():
    S, LP = P["STROKE"], P["LP_SLIDE"]
    D = math.radians
    sweeps = []
    # sweep the SERVO-mode cranks against the servo cases: the knob-mode shafts
    # and the servos never coexist, so pairing those two is meaningless
    for i in range(N):
        sweeps.append((f"row crank {i}", swept("crank_row_asm", lambda u, i=i:
            tr([0, py(i)+P["ROW_BAR_Y"], P["RSV_Z"]])
            @ rot([1,0,0], D(kin.crank_phi(S*u))))))
    for j in range(N):
        sweeps.append((f"col crank {j}", swept("crank_col_asm", lambda u, j=j:
            tr([px(j)+P["COL_BAR_X"], 0, P["CSV_Z"]])
            @ rot([0,1,0], -D(kin.crank_phi(S*u))))))
    LR, LSW = P["LCRANK_R"], P["LCRANK_SW"]
    def lphi(u):
        return math.degrees(math.asin(math.sin(D(-LSW)) + LP*u/LR))
    sweeps.append(("latch crank", swept("crank_latch_asm", lambda u:
        tr([P["LSV_X"], P["LSV_Y"], P["LSV_SHAFT_Z"]])
        @ rot([0,0,1], D(lphi(u)))
        @ tr([-P["LSV_X"], -P["LSV_Y"], -P["LSV_SHAFT_Z"]]))))

    # what the sweeps are allowed to touch: the bar they drive and the plate
    OK = ("rowbar", "colbar", "latch", "shaft", "crank", "base", "wall", "rail",
          "latchtower", "svbracket")
    L, W, H = P["SV_L"], P["SV_W"], P["SV_H"]
    TS, so, FT = P["SV_TAB_SPAN"], P["SV_SHAFT_OFF"], P["SV_FLANGE_T"]
    boxes = []
    for i in range(N):
        cy = py(i) + P["ROW_BAR_Y"]
        boxes.append((f"row {i} servo", [P["RSV_CRK"]+P["SV_T_CRK0"]-H/2, cy, P["RSV_Z"]], [H,L,W]))
    for j in range(N):
        cx = px(j) + P["COL_BAR_X"]
        boxes.append((f"col {j} servo", [cx, P["CSV_CRK"]+P["SV_T_CRK0"]-H/2, P["CSV_Z"]], [L,H,W]))
    Z0 = P["LSV_BRK_Z"] - P["SV_T_BRK0"]
    boxes.append(("latch servo", [P["LSV_X"]-so, P["LSV_Y"], Z0+H/2], [L,W,H]))

    parts = audit_print.build([0.0]*N, [0.0]*N, 0.0)
    bad, near = [], {}
    print(f"sweeping {len(sweeps)} cranks through {STEPS} steps each\n")
    for sname, sw in sweeps:
        for bname, c, d in boxes:
            b = trimesh.creation.box(extents=d); b.apply_translation(c)
            try: v = float(sw.intersection(b).volume)
            except Exception: v = 0.0
            dist = float(trimesh.proximity.closest_point(sw, b.vertices)[1].min())
            if v > 1.0: bad.append((sname, bname, v))
            k = sname
            if k not in near or dist < near[k][0]: near[k] = (dist, bname)
        for pname, m in parts:
            if any(pname.startswith(o) for o in OK): continue
            if np.any(sw.bounds[1] < m.bounds[0]) or np.any(m.bounds[1] < sw.bounds[0]):
                continue
            try: v = float(sw.intersection(m).volume)
            except Exception: v = 0.0
            if v > 1.0: bad.append((sname, pname, v))
    for s, o, v in sorted(bad, key=lambda t: -t[2])[:10]:
        print(f"   !! {s} sweeps through {o}: {v:.1f} mm3")
    print("   no swept collisions" if not bad else f"   {len(bad)} swept collisions")
    print("\n   closest approach of each swept crank to a servo case:")
    for k in sorted(near, key=lambda k: near[k][0]):
        d, b = near[k]
        print(f"     {d:6.2f} mm   {k:14s} to {b}" + ("  <-- tight" if d < 1.5 else ""))
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main())
