"""Build the plate-layout page. Every part is embedded once as a binary STL and
instanced at export, so 99 pieces do not cost 99 meshes."""
import base64, json, os, struct
import trimesh
COMMON = [("base",1),("face_asm",1),("deck",1),("latch_asm",1),
          ("wall_xp",1),("wall_xn",1),("wall_yp",1),("wall_yn",1),("rail",2),
          ("rowbar_asm",4),("colbar_asm",4),("link",16),("rod",16),("cap",16),
          ("pivot",32),("drivepin",9)]
# The frame is the same either way: the brackets and latch tower tab into slots
# the base and deck already carry, so one tray takes either drive.
KNOB_DRIVE  = [("shaft_row",4),("shaft_col",4),("knob",8),("latchpull",1)]
SERVO_DRIVE = [("svbracket_row",1),("svbracket_col",1),("latchtower",1),("crank",8),("crank_latch",1)]
QTY = COMMON + KNOB_DRIVE + SERVO_DRIVE
# ONE PART TYPE PER PLATE. More plates, but every plate is a single print
# profile: one material, one set of settings, one failure mode, and you can
# reprint a whole family without disturbing anything else.
GROUPS = [(n, [(n, q)]) for n, q in QTY]
DRIVE = {"knobs": [n for n, _ in KNOB_DRIVE], "servos": [n for n, _ in SERVO_DRIVE]}
NAME = {"base":"base plate","face_asm":"face (both layers, stepped)",
        "wall_xp":"+X wall, row knob bores","wall_xn":"-X wall, latch tab slot",
        "wall_yp":"+Y wall, column knob bores","wall_yn":"-Y wall",
        "rail":"latch plate rail","latchpull":"latch pull knob",
        "deck":"guide deck","latch_asm":"latch plate + finger tab",
        "rowbar_asm":"row bar + its 6 lugs","colbar_asm":"column bar + its 6 lugs",
        "link":"link","rod":"rod","cap":"cap, one per rod","shaft_row":"row crank + shaft",
        "shaft_col":"column crank + shaft","knob":"knob","pivot":"pivot pin",
        "svbracket_row":"row servo bracket","svbracket_col":"column servo bracket",
        "latchtower":"latch servo tower, one piece",
        "crank":"crank, on the servo horn","crank_latch":"latch crank",
        "drivepin":"crank drive pin, head recessed"}
OUT = os.path.join(os.path.dirname(__file__), "..", "out")

def binstl(m):
    v, n = m.vertices[m.faces], m.face_normals
    buf = bytearray(b"\0" * 80) + struct.pack("<I", len(m.faces))
    for f in range(len(m.faces)):
        buf += struct.pack("<3f", *n[f])
        for k in range(3): buf += struct.pack("<3f", *v[f][k])
        buf += b"\0\0"
    return bytes(buf)

parts = []
for name, qty in QTY:
    m = trimesh.load(os.path.join(OUT, "print", name + ".stl"), process=False)
    m.apply_translation(-m.bounds[0])          # park every part on z=0 at the origin
    d = m.bounds[1]
    parts.append({"id": name, "label": NAME[name], "qty": qty,
                  "w": round(float(d[0]), 2), "d": round(float(d[1]), 2),
                  "h": round(float(d[2]), 2),
                  "vol": round(float(m.volume) / 1000.0, 2),
                  "faces": len(m.faces),
                  "stl": base64.b64encode(binstl(m)).decode()})
tpl = open("plate_template.html").read()
tpl = tpl.replace("/*THREE*/", open("three.min.js").read())
html = (tpl.replace("/*PARTS*/", json.dumps(parts))
           .replace("/*DRIVE*/", json.dumps(DRIVE))
           .replace("/*GROUPS*/", json.dumps(
               [{"label": g, "items": [{"id": i, "n": n} for i, n in items]}
                for g, items in GROUPS])))
open(os.path.join(OUT, "ogee16-plate.html"), "w").write(html)
print(f"ogee16-plate.html  {len(html)/1024/1024:.2f} MB  "
      f"{len(parts)} distinct, {sum(q for _,q in QTY)} pieces")
print("unsubstituted:", "/*PARTS*/" in html)
