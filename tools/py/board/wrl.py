#!/usr/bin/env python3
"""wrl.py, parse KiCad .wrl (VRML2) 3D part models into JSON meshes.

KiCad packages3D models are plain-text VRML2. Two conventions matter:

1. UNITS: authored in units of 0.1 inch. Multiply every coordinate by 2.54
   to get millimetres.
2. AXES: authored Z-up with the board plane at Z=0. Web viewers are Y-up,
   so swap Y and Z per vertex. That swap is a reflection, so you must ALSO
   reverse triangle winding or every face renders inside out.

Lead recovery: through-hole lead tip positions are found by clustering
vertices that sit below the board plane (world y < 0 after conversion).
Use them to prove a placed model's pins land on the intended pads.

Usage:
  python3 wrl.py model.wrl out.json
  python3 wrl.py model.wrl            (prints a summary only)

Output JSON: {"meshes":[{"color":[r,g,b],"positions":[x,y,z,...],
"indices":[...]}], "bbox":..., "leads":[[x,z],...]}  (mm, Y-up)

Fetch models from the reachable GitHub mirror of the official libs:
  https://raw.githubusercontent.com/KiCad/kicad-packages3D/master/<lib>.3dshapes/<name>.wrl
"""
import sys, re, json

SCALE = 2.54  # 0.1 inch units to mm


def parse(path):
    txt = open(path, "r", errors="replace").read()
    meshes = []
    # DEF'd materials can be USE'd later; track them.
    defs = {}
    for m in re.finditer(r"material\s+DEF\s+(\S+)\s+Material\s*\{([^}]*)\}", txt):
        defs[m.group(1)] = m.group(2)

    # Walk Shape blocks in order. A Shape has an appearance (Material or USE)
    # and, when it carries geometry, an IndexedFaceSet with coord + coordIndex.
    pos = 0
    while True:
        s = txt.find("Shape", pos)
        if s < 0:
            break
        e = txt.find("Shape", s + 5)
        block = txt[s : e if e > 0 else len(txt)]
        pos = s + 5

        mat = re.search(r"Material\s*\{([^}]*)\}", block)
        if not mat:
            use = re.search(r"material\s+USE\s+(\S+)", block)
            mat_body = defs.get(use.group(1), "") if use else ""
        else:
            mat_body = mat.group(1)
        dc = re.search(r"diffuseColor\s+([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)", mat_body)
        color = [float(dc.group(i)) for i in (1, 2, 3)] if dc else [0.6, 0.6, 0.6]

        coord = re.search(r"point\s*\[([^\]]*)\]", block)
        idx = re.search(r"coordIndex\s*\[([^\]]*)\]", block)
        if not coord or not idx:
            continue

        nums = [float(x) for x in re.findall(r"[-\d.eE+]+", coord.group(1))]
        verts = []
        for i in range(0, len(nums) - 2, 3):
            x, y, z = (nums[i] * SCALE, nums[i + 1] * SCALE, nums[i + 2] * SCALE)
            # Z-up board frame -> Y-up world frame
            verts.append((x, z, y))

        raw = [int(float(x)) for x in re.findall(r"[-\d]+", idx.group(1))]
        tris = []
        face = []
        for v in raw:
            if v == -1:
                # fan-triangulate the face, REVERSED winding (axis swap reflects)
                for k in range(1, len(face) - 1):
                    tris.extend((face[0], face[k + 1], face[k]))
                face = []
            else:
                face.append(v)
        if face:
            for k in range(1, len(face) - 1):
                tris.extend((face[0], face[k + 1], face[k]))

        flat = [c for v in verts for c in v]
        meshes.append({"color": color, "positions": flat, "indices": tris})
    return meshes


def bbox(meshes):
    lo = [1e9] * 3
    hi = [-1e9] * 3
    for m in meshes:
        p = m["positions"]
        for i in range(0, len(p), 3):
            for a in range(3):
                lo[a] = min(lo[a], p[i + a])
                hi[a] = max(hi[a], p[i + a])
    return lo, hi


def leads(meshes, below=-0.05, cluster=0.8):
    """Cluster XZ positions of vertices below the board plane (y < below).
    Returns one (x, z) centroid per lead, in mm."""
    pts = []
    for m in meshes:
        p = m["positions"]
        for i in range(0, len(p), 3):
            if p[i + 1] < below:
                pts.append((p[i], p[i + 2]))
    groups = []
    for x, z in pts:
        for g in groups:
            if abs(g[0] / g[2] - x) < cluster and abs(g[1] / g[2] - z) < cluster:
                g[0] += x
                g[1] += z
                g[2] += 1
                break
        else:
            groups.append([x, z, 1])
    return [(round(g[0] / g[2], 3), round(g[1] / g[2], 3)) for g in groups]


if __name__ == "__main__":
    src = sys.argv[1]
    ms = parse(src)
    lo, hi = bbox(ms)
    ld = leads(ms)
    print(f"{src}: {len(ms)} meshes, {sum(len(m['indices'])//3 for m in ms)} tris")
    print(f"  bbox mm  x {lo[0]:.2f}..{hi[0]:.2f}  y {lo[1]:.2f}..{hi[1]:.2f}  z {lo[2]:.2f}..{hi[2]:.2f}")
    print(f"  leads below board: {len(ld)} at {ld}")
    if len(sys.argv) > 2:
        json.dump({"meshes": ms, "bbox": [lo, hi], "leads": ld}, open(sys.argv[2], "w"))
        print(f"  wrote {sys.argv[2]}")
