"""Independent oracle for packages/mesh/test/imported-glb.test.ts (M04-T14).

Reads the two GLBs in tools/corpus/import/ with trimesh 5.1.1 (tools/py
pin), unwelded and unsnapped, through trimesh's own glTF loader and scene
graph, and writes packages/mesh/test/fixtures/imported-glb-oracle.json:
per file the sha256, the face count of the scene with every node
transform applied, the signed volume, the surface area and the axis
aligned bounds in the file's own frame and units (glTF +Y up), and how
many of its geometries trimesh finds watertight. The TS reader must agree
within the D-054 snap bound the test states, after its +Y up to +Z up map.

Run from the repo root:
  uv run --project tools/py python packages/mesh/test/legacy/imported_glb_oracle.py
"""
import hashlib
import json
import pathlib

import trimesh

ROOT = pathlib.Path(__file__).resolve().parents[4]
SOURCES = [ROOT / "tools/corpus/import/locket-r2.glb", ROOT / "tools/corpus/import/lug.glb"]
OUT = ROOT / "packages/mesh/test/fixtures/imported-glb-oracle.json"

rows = []
for src in SOURCES:
    scene = trimesh.load(src, force="scene", process=False)
    placed = []
    for node in scene.graph.nodes_geometry:
        transform, name = scene.graph[node]
        m = scene.geometry[name].copy()
        m.apply_transform(transform)
        placed.append(m)
    whole = trimesh.util.concatenate(placed)
    lo, hi = whole.bounds
    rows.append({
        "file": str(src.relative_to(ROOT)),
        "sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
        "triangles": int(len(whole.faces)),
        "signedVolume": float(sum(m.volume for m in placed)),
        "area": float(whole.area),
        "boundsLo": [float(v) for v in lo],
        "boundsHi": [float(v) for v in hi],
        "geometries": len(placed),
        "geometriesWatertight": sum(1 for m in placed if m.is_watertight),
    })

OUT.write_text(json.dumps({
    "generator": "packages/mesh/test/legacy/imported_glb_oracle.py",
    "trimesh": trimesh.__version__,
    "qualifier": "computed",
    "units": "file units, +Y up, as the glb stores them",
    "rows": rows,
}, indent=2) + "\n")
print(f"wrote {OUT.relative_to(ROOT)}: {len(rows)} rows")
