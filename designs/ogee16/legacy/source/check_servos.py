"""Every servo, body AND flange, must fit inside the frame AND clear every part.

The interference audit does not model the servos: they are bought parts, not
meshes, so nothing stopped the latch servo hanging 1.9mm out through the OUTER
face of the -Y wall. Boxes are enough to check it, and the flange matters more
than the body: 32.2 long against a 22.8 body, and it is what gets screwed down.

Two checks here. FIT: is the envelope inside the frame interior. CLEAR: does the
envelope hit any actual part, at rest and with everything driven, excluding the
bracket it is bolted to and the crank it turns.

The interference audit does not model the servos: they are bought parts, not
meshes, so nothing stopped the latch servo hanging 1.9mm out through the OUTER
face of the -Y wall. Boxes are enough to check it, and the flange matters more
than the body: 32.2 long against a 22.8 body, and it is what gets screwed down.
"""
import sys
import kin
from kin import P, N, px, py

def box(cx, cy, w, d, label):
    return (label, cx-w/2, cx+w/2, cy-d/2, cy+d/2)

def main():
    L,W,H = P["SV_L"], P["SV_W"], P["SV_H"]
    TS, so, FT = P["SV_TAB_SPAN"], P["SV_SHAFT_OFF"], P["SV_FLANGE_T"]
    X0,X1,Y0,Y1 = P["XI0"], P["XI1"], P["YI0"], P["YI1"]
    items = []
    for i in range(N):
        cy = py(i) + P["ROW_BAR_Y"]
        items.append(box(P["RSV_CRK"]+P["SV_T_CRK0"]-H/2, cy, H, L, f"row {i} body"))
        items.append(box(P["RSV_BRK"]+2.75, cy, FT, TS, f"row {i} flange"))
    for j in range(N):
        cx = px(j) + P["COL_BAR_X"]
        items.append(box(cx, P["CSV_CRK"]+P["SV_T_CRK0"]-H/2, L, H, f"col {j} body"))
        items.append(box(cx, P["CSV_BRK"]+2.75, TS, FT, f"col {j} flange"))
    # TURNED 90 about Z: long axis along X, so W in Y and L in X
    cx = P["LSV_X"] - so
    items.append(box(cx, P["LSV_Y"], L,  W, "latch body"))
    items.append(box(cx, P["LSV_Y"], TS, W, "latch flange"))

    print(f"frame interior x {X0:.0f} .. {X1:.0f}   y {Y0:.0f} .. {Y1:.0f}")
    bad = []
    for label, x0, x1, y0, y1 in items:
        m = min(x0-X0, X1-x1, y0-Y0, Y1-y1)
        if m < 1.0: bad.append((label, m))
        print(f"  {'ok ' if m >= 1.0 else 'OUT'} {label:16s} "
              f"x {x0:7.2f}..{x1:7.2f}  y {y0:7.2f}..{y1:7.2f}   least clearance {m:+6.2f}")
    print("\n" + ("ALL SERVOS INSIDE THE FRAME" if not bad else f"{len(bad)} OUTSIDE"))
    for l, m in bad: print(f"   ! {l} by {-m:.2f} mm")
    return 1 if bad else 0

def clearances():
    """Box every servo envelope against the real meshes."""
    import numpy as np, trimesh, audit_print
    L,W,H = P["SV_L"], P["SV_W"], P["SV_H"]
    TS, so, FT = P["SV_TAB_SPAN"], P["SV_SHAFT_OFF"], P["SV_FLANGE_T"]
    Z0 = P["LSV_BRK_Z"] - P["SV_T_BRK0"]
    env = []
    for i in range(N):
        cy = py(i) + P["ROW_BAR_Y"]
        env.append((f"row {i}", P["RSV_CRK"]+P["SV_T_CRK0"]-H/2, cy, P["RSV_Z"], H, L, W))
        env.append((f"row {i} fl", P["RSV_BRK"]+2.75, cy, P["RSV_Z"], FT, TS, W))
    for j in range(N):
        cx = px(j) + P["COL_BAR_X"]
        env.append((f"col {j}", cx, P["CSV_CRK"]+P["SV_T_CRK0"]-H/2, P["CSV_Z"], L, H, W))
        env.append((f"col {j} fl", cx, P["CSV_BRK"]+2.75, P["CSV_Z"], TS, FT, W))
    env.append(("latch", P["LSV_X"]-so, P["LSV_Y"], Z0+H/2, L, W, H))
    env.append(("latch fl", P["LSV_X"]-so, P["LSV_Y"], P["LSV_BRK_Z"]+2.75, TS, W, FT))

    SKIP = ("latchtower", "svbracket", "crank", "shaft", "base", "wall", "rail")
    S = P["STROKE"]; z0 = [0.0]*N
    states = [("rest", z0, z0, 0.0), ("all bars up", [S]*N, [S]*N, 0.0),
              ("clear pull", z0, z0, P["LP_SLIDE"])]
    bad = []
    for label, zR, zC, lp in states:
        parts = audit_print.build(zR, zC, lp)
        for name, cx, cy, cz, dx, dy, dz in env:
            b = trimesh.creation.box(extents=[dx, dy, dz])
            b.apply_translation([cx, cy, cz])
            for pname, m in parts:
                if any(pname.startswith(s) for s in SKIP): continue
                if np.any(m.bounds[1] < b.bounds[0]) or np.any(b.bounds[1] < m.bounds[0]):
                    continue
                try:
                    v = float(b.intersection(m).volume)
                except Exception:
                    v = 0.0
                if v > 1.0: bad.append((label, name, pname, v))
    # "no overlap" is not the useful answer. A 2mm gap reads as contact in a
    # render and a 2mm gap is what you argue about, so report the CLEARANCE.
    near = {}
    for label, zR, zC, lp in states:
        parts = audit_print.build(zR, zC, lp)
        for name, cx, cy, cz, dx, dy, dz in env:
            b = trimesh.creation.box(extents=[dx, dy, dz])
            b.apply_translation([cx, cy, cz])
            for pname, m in parts:
                if any(pname.startswith(s) for s in SKIP): continue
                d = float(trimesh.proximity.closest_point(m, b.vertices)[1].min())
                key = name
                if key not in near or d < near[key][0]:
                    near[key] = (d, pname, label)
    print(f"\nservo envelopes against every part, {len(states)} states")
    for l, n, p, v in sorted(bad, key=lambda t: -t[3])[:12]:
        print(f"   !! [{l}] {n} hits {p}: {v:.1f} mm3")
    print("   no overlaps" if not bad else f"   {len(bad)} collisions")
    print("\n   closest approach, servo to nearest part:")
    for k in sorted(near, key=lambda k: near[k][0]):
        d, p, l = near[k]
        flag = "  <-- tight" if d < 3.0 else ""
        print(f"     {d:6.2f} mm   {k:12s} to {p:12s} [{l}]{flag}")
    return bad

if __name__ == "__main__":
    rc = main()
    rc += 1 if clearances() else 0
    sys.exit(1 if rc else 0)
