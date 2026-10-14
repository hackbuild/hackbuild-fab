import subprocess, os
PARTS = ["rowbar","colbar","rowlug","collug","link","rod","rowguide","rowdrive",
         "colguide","coldrive","deck","latch","face","rail","base","wallx","wally",
         "svbracket_row","svbracket_col","latchbracket","latchrib","crank",
         "latchcrank","washer","coupon"]
SHAPED = ["cap","face2"]
SHAPES = ["circle","square","hex","triangle"]
EXTRA = ["m_crank_row","m_crank_col","m_crank_latch","m_washer_y","m_washer_x",
         "m_washer_z","m_pivot","m_crankpin_row","m_crankpin_col","m_crankpin_latch"]
os.makedirs("../out/stl", exist_ok=True); os.makedirs("../out/dxf", exist_ok=True)
def run(p, mode, out, sh="circle"):
    r = subprocess.run(["openscad","-o",out,"-D",f'part="{p}"',"-D",f'mode="{mode}"',
                        "-D",f'shape="{sh}"',"ogee16.scad"], capture_output=True, text=True)
    return r.returncode, r.stderr.strip()
fail=[]
for p in PARTS:
    for m,d in (("2d","dxf"),("3d","stl")):
        rc,e = run(p,m,f"../out/{d}/{p}.{d}")
        if rc: fail.append((p,m,e[-300:]))
for p in SHAPED:
    for sh in SHAPES:
        for m,d in (("2d","dxf"),("3d","stl")):
            rc,e = run(p,m,f"../out/{d}/{p}_{sh}.{d}",sh)
            if rc: fail.append((f"{p}_{sh}",m,e[-300:]))
for p in EXTRA:
    rc,e = run(p,"3d",f"../out/stl/{p}.stl")
    if rc: fail.append((p,"3d",e[-300:]))
for f in fail: print("FAIL",f[0],f[1],f[2][:260])
print("done, failures:", len(fail))

# Guard against the failure that produced this check: an edit that pushed a
# constant behind a // comment, so OpenSCAD silently evaluated undef and parked
# the part at the origin instead of erroring.
import re as _re
_src = _re.sub(r"//.*", "", open("params.scad").read())
_defined = set(_re.findall(r"(?:^|;)\s*([A-Za-z_]\w*)\s*=", _src, _re.M))
_required = ["T","N","PITCH","C","YOFF","STROKE","DIAG","DC","ROD_Z","CROWN_R",
             "CROWN_TOP","ROW_SLOT_E","LUG_W","R_LATCH","LP_Z","FACE_Z","FACE2_Z",
             "DECK_Z","RB_Z","CB_Z","ROW_BAR_Y","COL_BAR_X","GUIDE_X","GUIDE_Y",
             "DRIVE_X","DRIVE_Y","RSV_Z","CSV_Z","RSV_CRK","CSV_CRK","RSV_BRK",
             "CSV_BRK","LSV_X","LSV_Y","LRIB_X","RAIL_X0","RAIL_X1","LP_SLIDE"]
_missing = [k for k in _required if k not in _defined]
if _missing:
    raise SystemExit(f"params.scad is missing: {_missing}")
print("params guard: all", len(_required), "required constants defined")
