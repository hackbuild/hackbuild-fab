import base64, json, os, struct
import trimesh
import kin
from kin import P
OUT = os.path.join(os.path.dirname(__file__), "..", "out")
NEED = ["base","wallx","wally","deck","rail","face","latch","rowbar","colbar",
        "rowlug","collug","link","rod","rowdrive","coldrive","rowguide","colguide",
        "svbracket_row","svbracket_col","latchbracket","latchrib",
        "m_crank_row","m_crank_col","m_crank_latch","m_pivot",
        "m_crankpin_row","m_crankpin_col","m_crankpin_latch",
        "m_washer_y","m_washer_x","m_washer_z"]
for sh in ("circle","square","hex","triangle"):
    NEED += [f"cap_{sh}", f"face2_{sh}"]
def binstl(path):
    m = trimesh.load(path, process=False)
    v, n = m.vertices[m.faces], m.face_normals
    buf = bytearray(b"\0"*80) + struct.pack("<I", len(m.faces))
    for f in range(len(m.faces)):
        buf += struct.pack("<3f", *n[f])
        for k in range(3): buf += struct.pack("<3f", *v[f][k])
        buf += b"\0\0"
    return base64.b64encode(bytes(buf)).decode()
geo = {k: binstl(os.path.join(OUT, "stl", k + ".stl")) for k in NEED}
params = {k: v for k, v in P.items() if isinstance(v, (int, float, list))}
tpl = open("viewer_template.html").read()
three = open("three.min.js").read()
tpl = tpl.replace("/*THREE*/", three)
html = (tpl.replace("/*PARAMS*/", json.dumps(params))
           .replace("/*MESHES*/", json.dumps(geo))
           .replace("/*AUDIT*/", json.dumps({"states": 7, "clashes": 0})))
open(os.path.join(OUT, "ogee16.html"), "w").write(html)
print(f"ogee16.html  {len(html)/1024/1024:.2f} MB   {len(geo)} meshes")
print("unsubstituted:", [t for t in ("/*PARAMS*/","/*MESHES*/","/*AUDIT*/") if t in html] or "none")
