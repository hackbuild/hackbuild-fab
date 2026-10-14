# CASK CAPS: how they are made

Record written 2026-10-05 from the original files. Slug `cask-caps`. Family cases-joinery: the CASK bayonet cap with the hack.build mark and wordmark as a flush three colour inlay that prints face down, delivered as a Flash Studio 3MF with filaments assigned. The cap geometry itself is CASK's (`fab-knowledge:originals/cask/RECORD.md` sections 5.1 and 5.5).

Number rules for this file. Numbers in tables are copied from the file named in the row (the build reports, READMEs and the rebuild script are the owner's outputs). "Measured" numbers come from the headless drive of the sims on 2026-10-05 (configs `fab-knowledge:originals/cask-caps/shots/_drive.json` and `_drive2.json`, logs beside them) or, where marked, from `fab-knowledge:sources/benches/benches-cases.md` section 2 and `fab-knowledge:sources/downloads/dl-cases.md` section 3. "Inferred" means a reading of the files with no run behind it.

Short paths: `F` is `fab-knowledge:originals/cask-caps/files/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | CASK cap, 5 inch, hack.build flush inlay (two variants) |
| owner's slug | cask-caps |
| canonical files | `F/cap-5in/cask5_cap_hackbuild_large.3mf` (sha256 5899f22c119038b9aa682d54a6f56ceaf8a87b51861b15e6db53d16e13520ecd) and `F/cap-5in/cask5_cap_hackbuild.3mf` (sha256 0d3bbb2296204f611516591cf6aa9796aa8ff9d078045d19657caed3386f8cc9), with their per part STLs, sims and reports |
| date | 2026-09-05; the 3MF zip entries are stamped 19:39 (zip time, inferred UTC, so about 12:39 local); the owner's Flash Studio save of the large variant is 2026-09-05 15:38 |
| source | `F/cap-5in/rebuild_5in_cap.mjs` (sha256 37457754...9d3f) drives CASK's `createCaskLib` in node with the 5in parameters; the inlay generator that placed the art, cut the pocket and split the parts is not in the harvest or in Downloads (dl-cases.md, "not found") |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, three PETG slots; inlay at 0.20 layers |

### 1.1 Every revision found

| date | file | where | role |
|---|---|---|---|
| 2026-09-05 11:49 | `cask_cap_hackbuild.3mf` (af0075ba) | `F/known-bad/cask_cap_hackbuild.empty-plate-p-path.3mf` | first build on the uploaded 4in cap; loads as an empty plate; three defects (section 5.3) |
| 2026-09-05 (harvest) | `cask-cap-hackbuild/cask_cap_hackbuild.3mf` (08e129e3) | `F/cap-4in-first/` | the fixed 4in build on the uploaded `cask_cap__4_.stl` (126 mm cap); its README calls it "The 5in LCD case cap" while also saying 126 mm across |
| 2026-09-05 12:42 | `cask_cap_hackbuild (1).3mf` (fa2251a7) | `F/owner-saves/` | owner Flash Studio save of the fixed 4in cap |
| 2026-09-05 | `cask-cap-5in/` | `F/cap-5in/` | canonical: the 5in cap rebuilt from the CASK library, two art variants |
| 2026-09-05 15:38 | `cask5_cap_hackbuild_large.3mf` (a21572fd) | `F/owner-saves/` | owner Flash Studio save of the 5in large variant |

### 1.2 Why this revision

The 5in build is the newest and the right part: it is the cap for the 5in display, rebuilt from the library rather than taken from an upload of the wrong size, and both variants validate watertight with zero overlap and the three parts summing to the source cap with 0.0 mm3 of error (`-report.json`). The owner saved the large variant through Flash Studio the same afternoon, so it is the one carried forward. The first 4in build is kept because its broken 3MF is the M00 known-bad fixture and its fixed twin documents the p:path rule.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `cap-5in/` | both variants: 3MF, `_1_body`, `_2_inlay_cream`, `_3_inlay_pink` STLs, `_sim.html`, `-report.json`; `cask5_cap_plain.stl` (the cap before the inlay); `rebuild_5in_cap.mjs`; README |
| `cap-4in-first/` | the fixed first build: 3MF, sim, build report, README |
| `owner-saves/` | the two owner Flash Studio saves |
| `known-bad/` | the empty plate 3MF |
| `uploads/` | `cask_cap__4_.stl` (the uploaded 4in cap) and the Flash Studio warning screenshot of 2026-09-05 11:50 |

Hashes: `fab-knowledge:originals/cask-caps/SHA256SUMS`.

---

## 2. What it makes and for whom

The back cap of the CASK display case with the hack.build mark (arc and wrench) over the wordmark ("hack" and ".build"), inlaid flush in the centre of its face: three parts, three extruders, no relief. For the owner's own CASK build, printed on a four head printer so the colours change without purge.

| | vents intact | large |
|---|---|---|
| 3MF | `cask5_cap_hackbuild.3mf` | `cask5_cap_hackbuild_large.3mf` |
| cap vents | all 12 slots (r 30 to 34 and r 44 to 48, six 30 deg arcs each) | outer 6 kept, inner 6 filled |
| clear radius | 30.0 | 44.0 |
| art max radius | 28.50 | 42.50 |
| mark diameter | 29.23 | 43.61 |
| wordmark | 43.97 x 5.46 | 65.55 x 8.08 |
| lockup y offset | 0.329 | 0.491 |
| grams body / cream / pink | 78.32 / 0.47 / 0.29 | 78.98 / 1.04 / 0.64 |
| volumes body + cream + pink | 61668.38 + 368.56 + 227.56 = 62264.5 (equal to the plain cap) | 62192.43 + 817.32 + 501.19 = 63510.9 (the cap with inner vents filled) |
| triangles body / cream / pink | 33716 / 14044 / 15010 | 37774 / 14824 / 15310 |

Cap (from `rebuild_5in_cap.mjs` and the README): 150.0 dia (149.93 measured on the mesh), 15.0 tall, `skirt_od` 143.30, `lug_z0` 5.15, 4638 triangles, 62.26 cm3, watertight; the derived numbers match `cask.scad`.

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860, network on for unpkg). Copies in `fab-knowledge:originals/cask-caps/shots/`.

| file | caption |
|---|---|
| `p01-large-on-bed.png` | Large variant in print pose, face on the bed: the skirt and lugs up, outer vent arcs, the grip scallops round the rim. HUD: inlay 6 layers at 0.20, art z 0 to 1.20, remaining face 1.80. |
| `p02-large-installed.png` | Large variant turned over as it sits on the case: cream arc and pink wrench with the wordmark inside the outer vent ring; BUILD panel (cap 149.9, face 3.0, pocket 1.20, mark 43.6, wordmark 65.6 x 8.1, art radius 42.5, clear radius 44.0, 79.0 g, 1.04 g, 0.64 g); FACE panel "As printed". |
| `p03-large-inlay-lifted.png` | Lift inlay at 10.0 mm, on the bed: the slider moves the two inlay parts to z -10 (`m.position.set(0, 0, -lift)` in the sim), so in the face down pose they drop below the plate and the face hides both them and the pocket. The shot shows the skirt side of the body with the outer vent arcs and no art; it does not show the pocket (looked at 2026-10-05). A view from below, or HIDE BED, would. |
| `p04-large-layer6-slicer-bottom.png` | Layer 6 cut (z 1.20): the three colours in the first six layers, the art mirrored on the bed face; FACE panel switched to "Slicer bottom" with the note "Mirrored in the model so the bed face reads right on the print. Expect this in the slicer bottom view." |
| `p05-vents-intact-installed.png` | The vents intact variant: the smaller lockup inside the inner vent ring, all twelve vent arcs open; 62,770 tris. |

---

## 4. Build pipeline and code map

1. Cap solid: `rebuild_5in_cap.mjs` imports `createCaskLib` from an extracted `casklib.mjs` (the code between CASK's `===CASKGEOM-START===` and `===CASKGEOM-END===` markers), sets the 5in parameter set from `cask.scad`, runs `lib.buildCap(P, d, lib.makeManifoldEvaluator(wasm))` with manifold-3d in node, and writes `cask5_cap.stl` (shipped as `cask5_cap_plain.stl`). Node detail recorded in the script: the STLExporter DataView needs `Buffer.from(data.buffer, data.byteOffset, data.byteLength)`. The README says the library was extracted from `cask4_bench.html` (the 4in bench the owner uploaded), which is valid because the two benches share CASKGEOM verbatim and differ only in defaults; the script overlays the full 5in set (`FIVE`) on `lib.defaults`. The script header also notes that the cap vent radii and the 48 grip scallops are hard coded in the library and match `cask.scad` `arc_cut(32, 30, 4)`, `arc_cut(46, 30, 4)` and `grip_cuts`.
2. Inlay: an art lockup placed at the centre, mirrored in X, clamped inside a clear radius minus 1.5; a pocket 1.2 deep cut from the face; cream and pink solids filling it exactly; parts validated (watertight, winding, volume sum, overlap). The generator is missing; the reports record its outputs (inferred from the reports and README).
3. 3MF: an Orca and Bambu dialect package with one object of three components, filament block from OrcaSlicer 2.3.2 sources (section 5.3).
4. Sim: a single file viewer with the meshes packed as a `CSK1` blob (section 6).

---

## 5. Mechanisms, circuits and constructions

### 5.1 Flush inlay that prints face down

What it does: puts two colours of art level with the black face, in the first six layers on the bed, so the face reads glassy and the art is sealed into the cap.

| item | value (README, reports) |
|---|---|
| pocket depth | 1.2, six layers at 0.20, leaving 1.8 of the 3.0 face |
| clear radius | inside the inner vent ring (r 30) for vents intact, or inside the outer ring (r 44) when the inner vents are filled; the art keeps 1.5 inside it (28.5, 42.5) |
| colours | black `#1A1A1A` body, cream `#F5F0E6` mark arc and "hack", pink `#FE0386` wrench and ".build", all PETG |
| wordmark spacing | "extra space either side of the full stop, otherwise the Permanent Marker k tail runs into the dot" |
| mirror | "The cap prints face down, so the art lives on the bed face. It is mirrored in X in the model, which means it looks backwards in the slicer's bottom view and reads correctly on the finished part." |
| vent rings | r 30 to 34 and r 44 to 48 on both the 4in and 5in caps (CASK `sweepArc(30, 34)` and `sweepArc(44, 48)`), "which is why the vents-intact art is the same size on either one" |
| validation | watertight, consistent winding, zero overlap volume, three volumes summing to the source cap with 0.0 mm3 of error |

Mesh lesson (benches-cases.md, measured): every part is watertight on exact keys; with a 1e-4 mm rounding weld two to four edges per body and pink part become non manifold, because CASK's 0.2 micron duplicate nudge collides with a coarser downstream weld. The large variant parts dip to z -0.05.

### 5.2 Choosing the cap by measurement

"Do not assume which variant an uploaded cap belongs to; check the OD" (benches-cases.md confirmation 1): the first build used the uploaded `cask_cap__4_.stl`, 125.94 across, 12.0 tall, 4504 tris, 41846.7 mm3, which is the 4in cap, while its README called it the 5in cap. The 5in cap was then rebuilt from the library with the 5in parameters instead of taken from a file.

### 5.3 The 3MF that Flash Studio opens, and the three defects of the first one

Shipped structure (`cask5_cap_hackbuild_large.3mf`, listed 2026-10-05): `[Content_Types].xml`, `_rels/.rels`, `3D/3dmodel.model` with objects 1 to 3 as meshes and object 4 holding three `<component>` elements with identity transforms and no `p:path`; `Metadata/model_settings.config` naming parts `body`, `inlay_cream`, `inlay_pink` on extruders 1, 2, 3 with identity `matrix` metadata; `Metadata/project_settings.config` with 121 keys, of which 114 are per filament arrays of length 3, plus `different_settings_to_system` of length 5 (measured 2026-10-05 by parsing the config in both the large 3MF and the known-bad 3MF; the earlier count of 115 in benches-cases.md is one high); `Metadata/slice_info.config` with used grams per filament; `Metadata/filament_sequence.json` `{"filament_sequence": [1, 2, 3]}`; printer `Flashforge Creator 5 Pro 0.4 nozzle`, process `0.24mm Standard @FF C5`.

The first build (`F/known-bad/`) against the fix (dl-cases.md section 3):

| defect | broken | fixed | why |
|---|---|---|---|
| root components | `<component p:path="/3D/3dmodel.model" objectid="1..3">` | no `p:path` | `bbs_3mf.cpp` keys a component as `(m_sub_model_path.empty() ? path : m_sub_model_path, objectid)` and objects as `(m_sub_model_path, id)`; reading the root file leaves `m_sub_model_path` empty, so objects land under `("", 1..3)` and the component looks for `("/3D/3dmodel.model", 1..3)`, misses, and `_generate_current_object_list` skips it silently: an empty plate, no error |
| `overhang_fan_threshold` | `"Overhang_threshold_bridge"` x3 (the C++ enum constant) | `"95%"` x3 | Flash Studio warns "Overhang_threshold_bridge ... was replaced with 95%" (`F/uploads/Screen_Shot_2026-09-05_at_11_50_36_AM.png`) |
| `adaptive_pressure_advance_model` | a literal backslash n in each element | a real newline | found by dl-cases.md; not named in the READMEs |

Also from the README: every filament key carries three entries; nullable retract and ironing overrides are written as `nil`. Fallback: select all three STLs in the open dialog, accept "load as a single object with multiple parts", set the filament per part.

Owner saves (dl-cases.md): Flash Studio filled each save to 127 per filament arrays of 670 keys, kept the filament block as a project preset suffixed with the file name (`Generic PETG @FF C5P(cask_cap_hackbuild (1).3mf)`), and wrote objects into `3D/Objects/*.model` with `p:path` on the components, which is the legitimate use.

---

## 6. UX anatomy (the sim)

`cask5_cap_hackbuild_large_sim.html` and its twins: a single page viewer that loads three.js 0.160 from unpkg and unpacks a gzip plus base64 blob `CSK1`: magic, part count, float32 bounds low and high, per part name length, name, vertex count, triangle count, then uint16 positions quantised over the bounds and uint16 indices; `DecompressionStream('gzip')` unpacks it (the code copies instead of viewing "a view needs 2 byte alignment and the header length moves with the part names").

| element | content |
|---|---|
| header | mark, `CASK CAP`, "5in LCD case / inner vent ring filled", chips parts 3, inlay 1.20 mm, tris |
| ORIENTATION | On the bed, Installed |
| PARTS | per colour toggles: 1 body black, 2 arc + hack cream, 3 wrench + .build pink |
| INSPECT | lift inlay 0 to 16 mm in 0.2 steps (moves parts 2 and 3 down by the value in both orientations, so it reads as an exploded view only from below), cut above (a clip plane from 0.2 to 15.0), layer 0 to 75 at 0.2 (`LAYER_H` 0.2, `CAP_H` 15.0, so the layer slider and the cut slider drive the same plane), wireframe, turntable, hide bed |
| BUILD | cap dia, face thickness, pocket depth, mark diameter, wordmark, art radius, clear radius, grams per colour |
| HUD | orientation, inlay layers "6 at 0.20 mm", art z 0 to 1.20, remaining face 1.80 |
| FACE | a pre-rendered face image toggling "As printed" and "Slicer bottom" (mirrored) with a note for each |

What makes it good: it shows the one thing that goes wrong with face down inlays (the mirror) in both readings, and it lets the person step through the first six layers where the colours change.

---

## 7. Tests and harness

Validation numbers ship in the reports (watertight, winding, volume error 0.0, overlap 0.0, triangles, grams). The generator and its checks are missing. The broken first 3MF is the original of the M00 known-bad fixture `cask-empty-plate` and should fail CHK-3MF-06 (self reference) and CHK-3MF-07 (enum string) (`docs/plan/milestones/M00-foundation.md` lines 976 and 1042); its fixed twin and the two owner saves are corpus inputs.

---

## 8. How to make a new thing this way

1. Build the base part from its parametric library with the real dimensions, not from an upload of unknown size; check the OD.
2. Fit the art inside the clear area that the part's own features leave (vent rings here), with a stated margin.
3. Cut a pocket a whole number of layers deep and fill it with solids that sum exactly to the original volume.
4. Mirror the art for a face down print and show both readings.
5. Write the 3MF with no `p:path` on root components, strings for enum keys, real newlines, a full filament block, and a per part STL fallback.

---

## 9. Port map

| item | value |
|---|---|
| packages | `inlay` (flush pocket plus parts summing to the solid, clear radius against features), `hackbuild-3mf` (p:path, enum strings, nil overrides, filament block), `mesh` (Manifold export path from CASK) |
| feature kinds | pocket (inlay), plus CASK's; kind it needs: `inlay` (sealed flush art) per `fab-knowledge:synthesis/mappings.md` line 88 |
| canon id | MISSING: no canon entry for a flush multi colour inlay on a face down cap (the inlay is a process, not a mechanism; CANONS holds none) |
| reference id | `cases/cask-cap` (proposed in `synthesis/mappings.md` line 88 and benches-cases.md); `cosmetic/coin-inlay` (M03-T08) is the nearest written reference. `cases/cask-cap` does not exist under `reference/` on 2026-10-05 (MISSING) |
| milestone | M00-T09 and M00-T10 (known-bad CASK empty plate fixture, owner saves in the corpus) |
| lineage rows | MISSING: no row in `lineage.json` for `rebuild_5in_cap.mjs` or for the missing inlay generator |
