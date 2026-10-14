import subprocess, os, sys
MIN = ["m_base","m_wall_xp","m_wall_xn","m_wall_yp","m_wall_yn","m_deck",
       "m_face","m_latch","m_rail",
       "m_base_asm","m_wall_xp_asm","m_wall_xn_asm","m_wall_yp_asm","m_wall_yn_asm",
       "m_deck_asm","m_face_asm","m_latch_asm","m_rail_asm","m_rail2_asm"]
PARTS = MIN + ["base","wall_xp","wall_xn","wall_yp","wall_yn","rail",
         "base_asm","wall_xn_asm","wall_xp_asm","wall_yn_asm","wall_yp_asm","rail_asm",
         "deck","latch_asm","face_asm","rowbar_asm","colbar_asm","link",
         "rod","rod_asm","cap","cap_asm","shaft_row","shaft_col","shaft_row_asm","shaft_col_asm",
         "knob","knob_asm","drivepin","pivot","link_asm","latchpull","latchpull_asm",
         "svbracket_row","svbracket_col","latchtower","latchtower_asm","crank","crank_latch",
         "svbracket_row_asm","svbracket_col_asm",
         "crank_row_asm","crank_col_asm","crank_latch_asm"]
os.makedirs("../out/print", exist_ok=True)
fail=[]
for p in PARTS:
    r = subprocess.run(["openscad","-o",f"../out/print/{p}.stl","-D",f'part="{p}"',
                        "-D",'shape="circle"',"printed.scad"], capture_output=True, text=True)
    if r.returncode: fail.append((p, r.stderr.strip()[-400:]))
    # OpenSCAD renders an unknown module as NOTHING and still exits 0. Two edits
    # silently no-opped that way and the collar and hub simply were not there.
    if "Ignoring unknown" in r.stderr:
        bad = [l for l in r.stderr.splitlines() if "Ignoring unknown" in l]
        fail.append((p, "openscad ignored: " + "; ".join(sorted(set(bad))[:4])))
for p,e in fail: print("FAIL", p, e[:350])
print("done, failures:", len(fail))

# A print export and its _asm twin are the SAME PART in different poses, so they
# must have the same volume. Redrawing one instead of reorienting it is exactly
# how the latch pull shipped without its mortise.
import trimesh
# the cranks are the legitimate exceptions: the print export drops the drive
# pin because it is a separate pressed part, the assembly export shows it fitted.
# Everything else must match exactly.
SPLIT = {"shaft_row", "shaft_col", "crank_latch"}
pairs = [(p, p + "_asm") for p in PARTS if p + "_asm" in PARTS and p not in SPLIT]
bad = []
for a, b in pairs:
    va = trimesh.load(f"../out/print/{a}.stl").volume
    vb = trimesh.load(f"../out/print/{b}.stl").volume
    if abs(va - vb) > 1e-3 * max(abs(va), abs(vb)):
        bad.append((a, va / 1000, vb / 1000))
for a, va, vb in bad:
    print(f"  !! {a} and {a}_asm are not the same part: "
          f"{va:.3f} vs {vb:.3f} cm3")
print(f"pose pairs checked: {len(pairs)}, mismatched: {len(bad)}")
