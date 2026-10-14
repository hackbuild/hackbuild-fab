"""Independent oracle for packages/mesh/test/imported.test.ts (M02-T02).

Reads the 15 DAVIT R3 STLs in designs/davit/legacy/stl/ and the rp2040
standin fixture with trimesh 5.1.1 (tools/py pin), unwelded and unsnapped,
and writes packages/mesh/test/fixtures/imported-oracle.json: per file the
sha256, the triangle count, the signed volume and the surface area in
float64 over the float32 coordinates, and whether trimesh finds the mesh
watertight and winding consistent after its own vertex merge, whether it
stays watertight once rounded to 1/1024 mm, and how
many faces keep three distinct corners on the 1/1024 mm grid. The TS route
must agree with these within the D-054 snap bound the test states.

Run from the repo root:
  uv run --project tools/py python packages/mesh/test/legacy/imported_oracle.py
"""
import hashlib
import json
import pathlib

import numpy as np
import trimesh

ROOT = pathlib.Path(__file__).resolve().parents[4]
SOURCES = sorted((ROOT / "designs/davit/legacy/stl").glob("*.stl")) + [
    ROOT / "packages/mesh/test/fixtures/board-rp2040-pizero-standin.stl"
]
OUT = ROOT / "packages/mesh/test/fixtures/imported-oracle.json"

def distinct_after_snap(mesh):
    """Faces whose corners stay three distinct points after rounding to 1/1024 mm (D-054)."""
    grid = np.round(mesh.vertices[mesh.faces] * 1024).astype(np.int64)
    a, b, c = grid[:, 0], grid[:, 1], grid[:, 2]
    same = (a == b).all(1) | (b == c).all(1) | (a == c).all(1)
    return int((~same).sum())


def watertight_after_snap(mesh):
    """trimesh's watertight test on the mesh rounded to 1/1024 mm with collapsed faces dropped."""
    grid = np.round(mesh.vertices * 1024) / 1024
    snapped = trimesh.Trimesh(grid, mesh.faces, process=True)
    snapped.update_faces(snapped.nondegenerate_faces())
    return bool(snapped.is_watertight)


rows = []
for path in SOURCES:
    data = path.read_bytes()
    soup = trimesh.load_mesh(str(path), process=False)
    merged = trimesh.load_mesh(str(path), process=True)
    rows.append({
        "file": str(path.relative_to(ROOT)),
        "sha256": hashlib.sha256(data).hexdigest(),
        "triangles": int(len(soup.faces)),
        "trianglesAfterSnap": distinct_after_snap(soup),
        "signedVolumeMm3": float(soup.volume),
        "areaMm2": float(soup.area),
        "watertight": bool(merged.is_watertight),
        "watertightAfterSnap": watertight_after_snap(soup),
        "windingConsistent": bool(merged.is_winding_consistent),
    })

OUT.write_text(json.dumps({
    "generator": "packages/mesh/test/legacy/imported_oracle.py",
    "trimesh": trimesh.__version__,
    "qualifier": "computed",
    "rows": rows,
}, indent=2) + "\n")
print(f"{len(rows)} rows written to {OUT.relative_to(ROOT)}")
