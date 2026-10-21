"""Independent oracle for packages/mesh/test/imported.test.ts (M02-T02).

Reads the 15 DAVIT R3 STLs, the stl/ members of the R3 STL zip
(fab-work-directory:benches/davit/outputs/davit_stl.zip, lineage davit.stl,
through tools/py/hbf_archives.py), and the rp2040 standin fixture with trimesh 5.1.1 (tools/py pin), unwelded and unsnapped,
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
import io
import json
import pathlib
import sys
import zipfile

import numpy as np
import trimesh

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "tools/py"))
from hbf_archives import local_source  # noqa: E402

R3_ZIP = "fab-work-directory:benches/davit/outputs/davit_stl.zip"
with zipfile.ZipFile(local_source(R3_ZIP)) as z:
    SOURCES = [(n, z.read(n)) for n in sorted(z.namelist()) if n.startswith("stl/") and n.endswith(".stl")]
STANDIN = "packages/mesh/test/fixtures/board-rp2040-pizero-standin.stl"
SOURCES.append((STANDIN, (ROOT / STANDIN).read_bytes()))
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
for name, data in SOURCES:
    soup = trimesh.load_mesh(io.BytesIO(data), file_type="stl", process=False)
    merged = trimesh.load_mesh(io.BytesIO(data), file_type="stl", process=True)
    rows.append({
        "file": name,
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
