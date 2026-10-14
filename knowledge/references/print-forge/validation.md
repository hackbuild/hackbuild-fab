# Validation: what green means

Nothing ships on "it looks right". Every bench and generator carries a harness, and
every export is audited by machine before the user sees it. This is the ladder; the
scripts are in `scripts/`.

## 1. Geometry, per part

`validate_3mf.py file.3mf --overlap [--solid solid.stl]`

- degenerate triangles: zero
- every UNDIRECTED edge shared by exactly two faces on the raw indices
- every DIRECTED edge unique (consistent winding)
- signed volume positive
- trimesh `is_watertight` after vertex merge (process=True), because that is what a
  slicer does: coincident rings fused into 4 face edges show up here and nowhere else
- vertex fan check: the faces around every vertex form one edge connected fan. Edge
  checks pass a voxel shape that meets itself corner to corner; lib3mf calls that vertex
  non manifold and so does this
- lib3mf reads the file and `IsManifoldAndOriented()` is true for every mesh. Expected
  notices: "Unknown Model Metadata" (the Bambu tags) and one "Invalid Attribute in
  namespace" per build item (`printable="1"`). Anything else is a finding.
- `--overlap`: pairwise boolean intersection of the parts of each object (manifold3d)
  is under 1e-3 mm3
- `--solid`: the parts sum to the solid within 0.1 percent

## 2. Package and settings

Same script:

- package entries present; Application tag starts with BambuStudio- or OrcaSlicer-
- every component objectid resolves; no `p:path` in a single model file
- model_settings: every part id is a mesh, every part has an extruder, extruders <= N,
  plate has model_instance blocks
- project_settings: every list exactly len(filament_colour) long, filament_diameter and
  filament_settings_id present, no extruder_variant_list, all values strings, preset
  name keys present (a note, not a failure)
- build items exist and reference component objects

## 3. STL bundle

Each per colour STL loads watertight in trimesh; volumes match the 3MF parts; the zip
contains the print card and design JSON.

## 4. Bench harness (scripts/smoke_bench.py)

Headless Chromium drives the shipped single file: boot with fonts, worked example,
clean build with zero warnings at the default grid, every step screenshot, numeric field
edit rebuilds, slider release rebuilds, face canvas drag moves the layer, exports via
`BENCH.exportBytes`, design JSON round trip byte identical, blank start exports, no
horizontal scroll at 390 / 768 / 1280, zero console errors and page errors. Pull the 3MF
out and run step 1 and 2 on it.

## 5. Parametric sweep

Perturb every parameter of the state and assert the mesh triangle set changes; list the
parameters that read dead and justify each one. This catches "custom dims do nothing"
and "the sliders only move hidden internals", both of which shipped once and were called
out.

## 6. Print audit (cases, hinges, anything not flat)

Layer by layer unsupported region classification in print orientation; report the
longest bridge, every ledge, every overhang; the accepted limits are in
print-reality.md.

## 7. Round trip through the real slicer

Only the user can do this: open the 3MF in Flash Studio, confirm the filament list has N
entries with the right names, the printer and process dropdowns show the machine and not
the file name, every part is on its extruder, the bed side art is mirrored. Ask for the
saved back copy: it is the gold reference for `harvest_filament_keys.py`.

## Running the python stack

```
pip install trimesh lib3mf manifold3d shapely numpy --break-system-packages
python3 scripts/validate_3mf.py out.3mf --overlap
```

## Where the numbers come from

Typical green run for a 44 mm coin at 8 px/mm: 120k triangles, three parts, 1 s build,
1 MB 3MF, zero pinch cells on clean art, tens of pinch cells on brush fonts (healed,
invisible). COLLAR at grid 512: 88k triangles, 775 KB. COAMING: every prism 0 open
edges, all seven archetypes, filament arrays all length N.
