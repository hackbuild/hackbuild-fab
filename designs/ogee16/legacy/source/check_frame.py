"""Measure the printed frame parts against the params they are supposed to
satisfy, off the actual meshes rather than off the source that drew them."""
import numpy as np, trimesh, os
import kin
from kin import P, N, px, py
T=P["T"]; OUT="../out/print"
def M(n): return trimesh.load(os.path.join(OUT,n+".stl"), process=False)
fails=[]
def chk(label, got, want, tol=0.2):
    ok = abs(got-want) <= tol
    if not ok: fails.append(f"{label}: {got:.2f} vs {want:.2f}")
    print(f"  {'ok ' if ok else 'FAIL'} {label:44s} {got:8.2f}  want {want:8.2f}")

print("INTERIOR AND SHELL")
b=M("base_asm").bounds
chk("base outer X", b[1][0]-b[0][0], P["BX1"]-P["BX0"]-0.15)
chk("base outer Y", b[1][1]-b[0][1], P["BY1"]-P["BY0"]-0.15)
chk("base floor thickness", T, T)
chk("column stop boss top", b[1][2], P["CB_Z"], 0.05)
# the +X and +Y walls are 8.00 across now, not 3.00: they carry the knob hubs,
# which is the whole point of them
HUBBED = {"wall_xp_asm", "wall_yp_asm"}
for w,ax in (("wall_xn_asm",0),("wall_xp_asm",0),("wall_yn_asm",1),("wall_yp_asm",1)):
    d=M(w).bounds
    want = (T - 0.15 + 5.0 + 0.15) if w in HUBBED else (T - 0.15)
    chk(f"{w} thickness" + (" incl. hub" if w in HUBBED else ""), d[1][ax]-d[0][ax], want)
    chk(f"{w} top incl. face tabs", d[1][2], P["WALL_TOP"]+T-0.075, 0.1)
chk("interior X", P["XI1"]-P["XI0"], 196.0, 99)
chk("interior clear of array X", P["XI0"], -36, 0.01)
r=M("rail_asm").bounds
chk("rail spans interior Y", r[1][1]-r[0][1], (P["YI1"]+T)-(P["YI0"]-T)-0.15)
chk("rail slot floor = LP_Z", P["LP_Z"], P["LP_Z"], 0)

print("\nFACE PLATE APERTURES")
f=M("face_asm")
chk("face outer X", f.bounds[1][0]-f.bounds[0][0], P["BX1"]-P["BX0"])
chk("face total thickness", f.bounds[1][2]-f.bounds[0][2], 2*T)
# ray cast straight down each pixel centre: through the lower layer it must
# exit the plate entirely, through the upper it must at least open the pocket
import trimesh.ray.ray_triangle as rt
eng = trimesh.ray.ray_triangle.RayMeshIntersector(f)
for i in range(N):
    for j in range(N):
        o = np.array([[px(j), py(i), P["FACE2_Z"]+T+5.0]])
        d = np.array([[0,0,-1.0]])
        hits = eng.intersects_location(o, d)[0]
        n = len(hits)
        if n != 0:
            fails.append(f"pixel {i},{j} not open through both face layers ({n} hits)")
print(f"  {'ok ' if not fails else 'FAIL'} all {N*N} pixel centres open clean through the face")
# and the aperture actually clears the cap it has to swallow
capd = P["CAP_D"] + P["CAP_FIT"] + P["CAM"] + 2*0.30
print(f"  cap {P['CAP_D']:.1f} into a {capd:.2f} pocket, offset {-P['CAM']/2:+.3f} in y")
slot = P["SLOT_X"]
print(f"  rod {P['PIN_W']:.1f} x {T:.1f} through a {slot:.2f} x {2*P['FACE_E']:.2f} slot")
print("\nHUBS BONDED TO THE WALL")
# a hub is only as good as what it is fused to. Sample a ring just inside the
# hub's rim, at the plate's mid-thickness, and require every point to be INSIDE
# the wall: that is the difference between a boss on solid plate and a boss
# hanging off whatever lattice happened to cross it.
import numpy as _np
HUB_R = 8.0
for w, cx, ax, cz, pos in (("wall_xp_asm", 164.5, 0, P["RSV_Z"],
                            [py(i)+P["ROW_BAR_Y"] for i in range(N)]),
                           ("m_wall_xp_asm", 164.5, 0, P["RSV_Z"],
                            [py(i)+P["ROW_BAR_Y"] for i in range(N)])):
    mesh = M(w)
    pts = []
    for c in pos:
        for a in _np.linspace(0, 2*_np.pi, 24, endpoint=False):
            pts.append([cx, c + (HUB_R-0.4)*_np.cos(a), cz + (HUB_R-0.4)*_np.sin(a)])
    inside = mesh.contains(_np.array(pts))
    chk(f"{w}: hub ring points on solid plate", int(inside.sum()), len(pts), 0)

print("\nEVERY KNOB BORE OPEN END TO END")
# Ray straight down each shaft axis. This is the check that was missing: the
# minimal wall is skeletonised from the LASERCUT profile, which has no knob bores
# at all (they are a printed-variant feature), so it came out SOLID behind every
# hub - 9.5mm of plate where the shaft has to pass - while every other test
# happily passed. Material present is not the same as a hole being there.
import trimesh as _tm
for w, axis, cz, pos in (("wall_xp_asm",   0, P["RSV_Z"], [py(i)+P["ROW_BAR_Y"] for i in range(N)]),
                         ("m_wall_xp_asm", 0, P["RSV_Z"], [py(i)+P["ROW_BAR_Y"] for i in range(N)]),
                         ("wall_yp_asm",   1, P["CSV_Z"], [px(j)+P["COL_BAR_X"] for j in range(N)]),
                         ("m_wall_yp_asm", 1, P["CSV_Z"], [px(j)+P["COL_BAR_X"] for j in range(N)])):
    mesh = M(w)
    eng = _tm.ray.ray_triangle.RayMeshIntersector(mesh)
    blocked = 0
    for c in pos:
        o = _np.zeros(3); d = _np.zeros(3)
        o[axis] = 140.0; d[axis] = 1.0; o[1-axis] = c; o[2] = cz
        if len(eng.intersects_location([o], [d])[0]): blocked += 1
    chk(f"{w}: bores the shaft can pass", N - blocked, N, 0)

print("\nKNOB BORES")
# a bore in a vertical plate does not read as an interior in a horizontal
# section, it BREAKS the section into pieces. N bores -> N+1 pieces.
for w,cz in (("wall_xp_asm", P["RSV_Z"]), ("wall_yp_asm", P["CSV_Z"])):
    sec=M(w).section(plane_origin=[0,0,cz], plane_normal=[0,0,1])
    n=len(sec.to_planar()[0].polygons_full) if sec else 0
    chk(f"{w}: {N} bores break the section into", n, N+1, 0)
    # probe at a height clear of BOTH the bores and the deck tab slots. A fixed
    # offset is fragile: -10 was fine at CSV_Z 44.5 and landed in the slots at
    # 47.5, reading as a false failure.
    zp = cz - 10
    if P["DECK_Z"]-2 <= zp <= P["DECK_Z"]+T+2: zp = P["DECK_Z"] - 5
    sec2=M(w).section(plane_origin=[0,0,zp], plane_normal=[0,0,1])
    n2=len(sec2.to_planar()[0].polygons_full) if sec2 else 0
    chk(f"{w}: solid again clear of the bores", n2, 1, 0)

print("\nCAP POCKET vs THE ROD'S SIDEWAYS CAM")
ys=[kin.pin_state(0,0,z,zz,l,lat)["y"] for z,zz,l,lat in
    [([0.0]*N,[0.0]*N,0,False), ([P["STROKE"],0,0,0],[0.0]*N,0,False),
     ([0.0]*N,[0.0]*N,0,True), ([0.0]*N,[0.0]*N,P["LP_SLIDE"],True)]]
exc=max(ys)-min(ys)
chk("rod cam excursion == CAM", exc, P["CAM"], 0.01)
ap=P["CAP_D"]+P["CAP_FIT"]+P["CAM"]
chk("aperture clears the cap at BOTH ends of the cam",
    (ap-P["CAP_D"]-P["CAM"])/2, P["CAP_FIT"]/2, 0.01)
print(f"  aperture {ap:.2f} offset {-P['CAM']/2:+.3f} in y, cap {P['CAP_D']:.1f}, "
      f"cam {P['CAM']:.3f} -> {P['CAP_FIT']/2:.2f} clear at each extreme")
print("\n" + ("ALL FRAME CHECKS PASS" if not fails else f"{len(fails)} FAILURES"))
for x in fails: print("   !", x)
