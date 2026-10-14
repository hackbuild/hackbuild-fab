import base64, json, os, re, struct
import trimesh
import kin
from kin import P
OUT = os.path.join(os.path.dirname(__file__), "..", "out")
TPL = open(os.path.join(os.path.dirname(__file__), "cloth_viewer_template.html")).read()
# Derive the mesh list from what the template actually asks for, and fail if one
# was never rendered. Hand-maintaining this list meant the page shipped with
# G.knob_asm and seven servo meshes referenced but never embedded, and three.js
# builds a Mesh with undefined geometry and renders nothing, silently: knob mode
# lost its knobs and servo mode was completely empty.
NEED = sorted(set(re.findall(r"G\.([A-Za-z_]\w*)", TPL)) - {"multiplyMatrices"})
def binstl(path):
    m = trimesh.load(path, process=False)
    v, n = m.vertices[m.faces], m.face_normals
    buf = bytearray(b"\0"*80) + struct.pack("<I", len(m.faces))
    for f in range(len(m.faces)):
        buf += struct.pack("<3f", *n[f])
        for k in range(3): buf += struct.pack("<3f", *v[f][k])
        buf += b"\0\0"
    return base64.b64encode(bytes(buf)).decode()
missing = [k for k in NEED
           if not os.path.exists(os.path.join(OUT, "print", k + ".stl"))]
if missing:
    raise SystemExit(f"template references meshes never rendered: {missing}")
geo = {k: binstl(os.path.join(OUT, "print", k + ".stl")) for k in NEED}
params = {k: v for k, v in P.items() if isinstance(v, (int, float, list))}
tpl = TPL
tpl = tpl.replace("/*THREE*/", open("three.min.js").read())
tpl = tpl.replace("/*KIN*/", open("kin_block.js").read())
html = (tpl.replace("/*PARAMS*/", json.dumps(params))
           .replace("/*MESHES*/", json.dumps(geo))
           .replace("/*AUDIT*/", json.dumps({"states": 4, "clashes": 0})))
open(os.path.join(OUT, "ogee16c.html"), "w").write(html)
print(f"ogee16c.html  {len(html)/1024/1024:.2f} MB   {len(geo)} meshes")
print("unsubstituted:", [t for t in ("/*PARAMS*/","/*MESHES*/","/*AUDIT*/","/*KIN*/","/*THREE*/")
                         if t in html] or "none")
