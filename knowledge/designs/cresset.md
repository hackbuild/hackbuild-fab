# CRESSET: how it is made

Record written 2026-10-05 from the original code. Slug `cresset`. Family cases-joinery: the HeatSync Labs mark turned into a console case for a Pico class board on a Pi Zero footprint, built raster in XY and exact in Z with a signed distance field. Its successor PLINTH has its own record at `fab-knowledge:originals/plinth/RECORD.md`.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drive on 2026-10-05 (config `fab-knowledge:originals/cresset/shots/_drive.json`, log beside it) or, where marked, from the 3MF counts in `fab-knowledge:sources/downloads/dl-cases.md` section 5. "README" means the owner's README states it.

Short paths: `F` is `fab-knowledge:originals/cresset/files/`, `CR` is `F/cresset.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | CRESSET, HeatSync console case maker |
| owner's slug | cresset |
| canonical file | `CR` |
| sha256 | 270e6de44466b9ba7a13972c83c98d3f76bc842f72b9a4988c045e5922a6a321 |
| bytes | 821512 (2977 lines; line 8 is 79,800 bytes of base64 fonts, line 194 is 607,691 bytes of inlined three.js, line 1298 is 22,494 bytes of traced HeatSync paths) |
| date | 2026-08-30 23:23 (mtime of the Downloads copy, byte identical) |
| source | the page itself; kernel script from CR 1299 (`CRESSET kernel`), mesher from about 1800, UI from 2283 |
| runtime | three.js and OrbitControls inlined, fonts inlined (Archivo, IBM Plex Mono); no server, no CDN, no network (README) |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, PLA, 220 plate by default |

### 1.1 Every revision found

| date | file | role |
|---|---|---|
| 2026-08-30 23:23 | `cresset.html` = harvest | canonical |
| 2026-08-30 23:30 | `cresset-132mm.3mf` (e9c3bfe0), kept as `F/cresset-132mm.earlier-export.3mf` | an earlier export than the shipped example; 0.9 thick disc |
| harvest | `cresset-132mm-example.3mf` | the shipped example; 0.8 thick disc |
| 2026-08-31 00:15 onward | PLINTH | the successor that replaced CRESSET; the registry marks CRESSET superseded |

### 1.2 Why this revision

There is one CRESSET. It is kept because it is the only bench in the corpus that turns a traced logo into a printable shell by signed distance offsets, and because its lesson (corner pinch) is what PLINTH's topology passes fixed. Drive on 2026-10-05: 0 errors; 132.0 x 134.4 x 20.8 case, 183,088 tris, 83.2 cm3, 103 g, built in 773 ms (measured). The README's "0 non manifold edges" does not hold for its own example: every bad edge in both CRESSET 3MFs is an edge shared by four faces, 57 across three parts in the shipped example (measured, dl-cases.md).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `cresset.html` | the bench |
| `CRESSET-README.md` | owner README |
| `cresset-132mm-example.3mf` | shipped example (base, lid, sun disc) |
| `cresset-132mm.earlier-export.3mf` | the Downloads export from 23:30 |

Hashes: `fab-knowledge:originals/cresset/SHA256SUMS`.

---

## 2. What it makes and for whom

A case for a friend's Pico based console on a Pi Zero footprint board (Waveshare RP2040-PiZero named in PLINTH), shaped as the HeatSync Labs mark: the flame and sync arrow silhouette is the case outline and the sun disc is a flush second colour in the lid. Two objects (README): the base (the silhouette extruded to full height with a cavity, board standoffs, lid posts, floor vents, foot recesses and an inlaid underside label; prints floor down) and the lid (the silhouette as a plate with a lip into the base and counterbored screw holes; the sun disc a flush inlay; exported show face down).

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/cresset/shots/`.

| file | caption |
|---|---|
| `r01-iso-board-step.png` | The default case in iso: the flame silhouette walls in charcoal, the orange sun disc flush in the lid with the sync arrow through it. Step 1 BOARD with BOARD OUTLINE and MOUNTING. Checks strip: board fits 5.6 mm clear of the wall, 4/4 lid posts placed, dropped 122 mm2 of loose flame specks (3 islands), base and lid will not fit side by side, lip clears the board. Status: 132.0 x 134.4 x 20.8, 7.6 units/mm, 183,088 tris, 83.2 cm3, 103 g, 90 + 27 layers, 773 ms. |
| `r02-exploded-shell-step.png` | EXPLODED at step 2 SHELL: the lid lifted, the board (green ghost) on its standoffs in the cavity, the floor vent slots; SIZE with case width, outline fatten, board clearance and FIT LOGO TO BOARD. |
| `r03-lid-off-board-ghost-ports.png` | Step 3 PORTS: the connector table (HDMI and USB C on the back edge) and APERTURE FIT with port clearance 0.6. Despite the file name the lid is still drawn: the drive pressed HIDE LID, which sets `VIEW.lid = 0`, and three.js skips a mesh only when `visible === false`, so the lid stays (section 6.1). |
| `r04-top-colour-step.png` | TOP VIEW at step 4 COLOUR: the mark seen square, sun disc and flames; FILAMENT SLOTS (shell, sun disc, accent), disc inlay depth 0.8, BOTTOM LABEL. |
| `r05-section-print-step.png` | SECTION at step 5 PRINT: the case cut, walls and lid in section; MESH (grid 640, layer 0.2, plate 220), PLATE (base and lid side by side), EXPORT. |

---

## 4. Build pipeline and code map

| CR lines | contents |
|---|---|
| 1309 to 1312 | `LOGO` constants (`DX -26, DY -4, BOX 1000, CX 402.9, CY 468.3, DISC 621.4, L 8.3, T -0.7, R 992.9, B 1001.0`), `SIL_W` 984.6 units, `PAD` 34 |
| 1315 to 1323 | `makeGrid(N)`: span over the logo box plus padding, `cell = span / N` |
| 1327 to 1372 | `rasterPaths` (the traced paths filled even-odd into an N x N mask, cached per grid), `rasterText` (label text into a mask, mirrored for the underside) |
| 1375 to 1415 | `dt1d`, `edtCells`, `signedField`, `thresh` |
| 1418 to 1446 | `largestComponent` |
| 1449 to 1481 | mask helpers `orDisc`, `orRectU`, `andNot`, `orInto`, `andInto` |
| 1483 to 1541 | `planCase` |
| 1543 to 1575 | `boardMargin`, `autoFit` |
| 1578 to 1725 | `features` |
| 1728 to 1806 | `buildSlabs` |
| 1808 to 1986 | mesher: `greedyRects`, `collectRects`, `cornersOf`, `buildMesh` |
| 1988 to 2068 | zip (CRC table, store and deflate), `stlBinary` |
| 2070 to 2282 | 3MF: `MATERIALS`, `meshXML`, `filamentBlock`, package writer |
| 2296 to 2340 | `PORT_PRESETS`, `DEF` |
| 2355 to 2530 | viewer, `buildNow`, `rebuild` |
| 2530 to 2582 | `report`, `lipClash` |
| 2583 to 2855 | `GUIDE`, control builders, panes Board, Shell, Ports, Colour, Print |
| 2856 to 2946 | `printCard`, `loadDesign` |
| 2947 to 2977 | `boot` |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The traced mark as a case outline by signed distance

What it does: makes a printable wall from a traced logo whose flame tips are thinner than a nozzle and partly detached.

1. Rasterise the traced silhouette once per grid into a unit space mask (`rasterPaths`, CR 1327 to 1348), plus the sun and flame paths separately.
2. Exact Euclidean distance transform (`edtCells`, CR 1394 to 1401): Felzenszwalb and Huttenlocher, a 1D squared distance pass per row then per column with the lower envelope arrays `v` and `z` (`dt1d`, CR 1375 to 1393). `signedField` (1403 to 1409) gives the distance in units, positive inside: `sqrt(din)` or `-sqrt(dout)` times the cell size.
3. Outline (`planCase`, CR 1483 to 1541): `thresh(sd0, -dilate / S)` fattens the outline by `dilate` 1.4 mm, then `largestComponent` keeps the main island and drops loose flame specks. Scale is solved in two passes: pass one measures the real outline width after the specks are dropped, pass two sets `S = caseW / width` "so caseW means that" (comment, 1490 to 1491).
4. Cavity: `thresh(sd, wallT)` and the largest component seeded at the board centre; wall = outline minus cavity. The sun disc is the traced sun inside the outline minus any flame drawn over it ("the disc is what stays orange", 1517 to 1519).
5. Heights: `pcbTop = floorT + standoff + pcbT`, `baseH = pcbTop + above`, lid total `lidT + lipH`, total `baseH + lidT`.

README numbers: "At the default 1.4 mm about 120 mm2 goes away across three islands, which is the outermost tips only. Take it below 1.2 mm and whole flames start falling off" (122 mm2 measured). Grid 640 on a 132 mm case is about 0.21 mm steps (README); grid choices 640, 896, 1152.

### 5.2 Board fit and auto fit

`boardMargin` (CR 1543 to 1561): the smallest signed distance in mm sampled at 241 points along each board edge. `autoFit` (1563 to 1575): bisection on case width over 60 to 420 mm, 22 steps, until the margin reaches `wallT + boardClear`, then rounded up to the half millimetre plus 1. Check: "board fits, X mm clear of the wall" or "board does not fit: needs X, has Y. Widen the case".

### 5.3 Features as masks

`features` (CR 1578 to 1725), every feature a mask on the same grid:

| feature | rule |
|---|---|
| standoffs | four discs `standD` 5.6 on the `hx` x `hy` 58 x 23 pattern, bored `boreD` 2.2 |
| lid posts | candidates inside the cavity where the signed distance is between `wall + 0.55 bossR` and `wall + 1.9 bossR` and outside the board rectangle plus `bossR + 1.2`; pick the farthest from the board centre, then repeatedly the candidate farthest from those chosen (farthest point sampling) up to `posts` 4; boss `bossD` 8.4, bore `bossBore` 2.6 for M3 self tapping, `bossBoreD` 9 deep; lid screw 3.4 with a 6.4 counterbore 2.0 deep |
| ports | a rectangle from 2.5 inside the board edge to 90 outside, `w + 2 portClear` wide (0.6), z from `pcbTop + z - clear` to `pcbTop + z + h + clear`; "Port channels are cut outward from the board edge through whatever is in the way, so a connector still opens cleanly where the outline is a thin flame tip" (README); a port reaching the wall top warns it prints as an open slot |
| floor vents | slots `w` 2.6 at `w + gap` (2.6 + 3.6) pitch, kept inside `wall + 5`, cleared 1.5 around standoffs and posts |
| feet | per quadrant the point farthest from the centre where the distance exceeds `d/2 + 1`, recess `d` 14 by `depth` 0.6 |
| lid lip | the ring between `wall + clear` and `wall + clear + lipW` (0.3, 1.8), largest component, minus clearance round the posts; `lipClash` errors if it overlaps the board footprint plus 0.6 |
| underside label | "HEATSYNC LABS" 7 mm cap height, mirrored, inside `wall + 1`, minus feet, `depth` 0.6, slot 2 |

Port presets (CR 2296 to 2302): USB-C 9.2 x 3.4, micro USB 8.4 x 3.2, mini HDMI 11.6 x 4.8, micro HDMI 7.4 x 3.4, HDMI 15.6 x 7.0, USB-A 14.6 x 7.2, USB-A stacked 14.6 x 16.4, microSD 12.5 x 2.4, RJ45 16.2 x 14.2, 3.5 mm jack 7.6 x 7.6, barrel jack 9.6 x 11.2, JST / header 8.0 x 6.0.

### 5.4 Z slabs and the two colour lid

`buildSlabs` (CR 1736 to 1806): the base z list collects every feature boundary (feet, label, floor, standoff top, pcb top, boss bore start, port bands, base top), merges values closer than 0.02, and each slab gets one Uint8 label grid: floor slabs are the outline minus vents and feet, upper slabs the wall plus standoffs and bosses minus bores and port channels; the label slabs carry slot 2 where the label mask is. The lid is built in the assembled pose: the lip ring below `baseH`, the plate above minus screw holes and counterbores, and the top `inlayD` 0.8 with the sun disc in slot 2. With one filament the disc becomes a recess: "the only correct one colour treatment" (README). The exporter turns the lid show face down so the disc is on the plate. The app errors if slot 1 and slot 2 share a colour: "the disc and the flames are the same colour, that is not the mark".

### 5.5 The mesher and its corner pinch defect

Mesher (CR 1808 to 1986): for each label, greedy rectangles for top and bottom caps and run merged side faces per row and column, all on a doubled integer lattice so rectangle centres stay integers; then T junction repair: each rectangle edge is subdivided by every lattice vertex lying strictly inside it (sorted per line maps `mX`, `mY`, `mZ`, binary search), and a subdivided rectangle is fanned from its centre. "Everything lives on an integer lattice (doubled, so rectangle centroids stay integers), which makes welding exact and T junction repair a lookup rather than a tolerance question" (comment).

Defect: two cells that share only a corner, in one slab or between stacked slabs, give an edge shared by four faces. CRESSET has no pass for it: 35 such edges on the base, 16 on the lid and 1 on the disc in the earlier export (measured, dl-cases.md). PLINTH added `fixDiag` and `fixZDiag` and took it to 0.

### 5.6 Exports

3MF in the COLLAR dialect (CR 2070 to 2282): component objects, BambuStudio metadata, `model_settings.config` per part extruders, `filament_maps`, an optional `project_settings.config` filament block of about 75 per filament keys with `nil` retract overrides (`filamentBlock`), `filament_sequence.json` `{"filament_sequence": [1..N]}`, `slice_info.config`. The plate selector writes base and lid side by side, or base only, or lid only, because at 132 mm the pair does not fit a 220 plate (README; measured warning). STL bundle with a print card; design JSON.

### 5.7 Options and checks the first pass left out (checker, 2026-10-05)

Read from `CR` at the lines named; behaviour inferred from the code unless marked.

| item | CR lines | how it is made |
|---|---|---|
| friction lid | 1611, 2552 to 2554 | `shell.fix` other than `screws` places no posts, bosses, screw holes or counterbores; the check reads "friction lid, N mm lip, no screws" and the lid holds by the lip alone |
| lid vents | 1786 | `vent.lid` (off by default) cuts the same floor vent mask through the lid plate |
| one colour label | 1766 to 1769 | when the label slot is above `slotCount`, the label is cut as a recess `label.depth` deep instead of an inlay, the same rule as the one colour disc |
| z merge | 1728 to 1734 | `pushZ` rounds to 1e-4 and ignores values at or under 0.0005; `zList` keeps a level only when it is more than 0.02 above the previous one, so two features closer than 0.02 in z share a slab boundary |
| port z clamp | 1663 to 1665 | a port band is clamped to `[floorT, baseH]`; `openTop` is set when its top reaches `baseH - 0.01`, which drives the "will print as an open slot" warning |
| post candidate step | 1601 | candidates are sampled every `max(1, round(N/128))` cells (5 at grid 640, computed), so post placement is coarser than the mesh grid |
| feet sampling | 1689 to 1704 | every second cell per quadrant; a foot is placed only where the signed distance exceeds `d/2 + 1.0` |
| plate checks | 2560 to 2563 | "larger than the N mm plate" (error) when either footprint exceeds `plate - 8`; "base and lid will not fit side by side" (warning) when the paired layout does |
| wall check | 2559 | "wall under 1.6 mm, thin for a 0.4 nozzle" |
| status layers | 2543 | layers are `ceil(baseH / layerH) + ceil(lidTotal / layerH)`: 90 + 27 at defaults, from `baseH` 18.0 and `lidTotal` 5.4 (computed, matches the drive) |

---

## 6. UX anatomy

| element | content |
|---|---|
| theme | HeatSync hazard palette: `--char #15120f`, `--hazard #f2ab1e`, `--logo-orange #F99A1C`, `--bone #ece3d3`; Archivo display and IBM Plex Mono |
| header | the mark as SVG, CRESSET, "HEATSYNC CONSOLE CASE", a scale tag (132 MM) |
| steps | 1 BOARD, 2 SHELL, 3 PORTS, 4 COLOUR, 5 PRINT, with a hazard underline and a done marker; one guide sentence per step |
| panes | Board (outline, mounting), Shell (size with FIT LOGO TO BOARD, walls, lid, posts, vents, feet), Ports (connector table, aperture fit), Colour (filament slots, disc inlay depth, bottom label), Print (mesh grid, layer, plate, slicer profile, plate contents, export) |
| stage bar | EXPLODED, BOARD GHOST, HIDE LID, SECTION, TOP VIEW, RESET VIEW |
| checks strip | coloured chips from `report()` (ok, warn, err) |
| status footer | case, scale, tris, volume, solid mass, layers, build ms |

### 6.1 A stage toggle that does nothing

HIDE LID is wired through `tog('#bLid', 'lid')` (CR 2959 to 2964), which flips `VIEW.lid` between 1 and 0, and `refreshView` sets `m.visible = VIEW.lid` on the lid meshes (CR 2406). The inlined three.js skips an object only when `visible === false` (`!1===t.visible` in the minified source on CR 194), so a lid with `visible = 0` still renders. HIDE LID highlights its button and changes nothing in the scene; the drive on 2026-10-05 shows the lid in `r03` after the press (looked at). A port must assign booleans.

What makes it good: the brand mark is the case, sized by the board it must hold; specks are dropped with a stated area; every port opens even through a flame tip; the colour rule of the mark is enforced as a check.

---

## 7. Tests and harness

None shipped. The README's verification line ("four parts, 0 open edges, 0 non manifold edges, all positive volume, 183k triangles, 1.9 s") is contradicted by the 57 four face edges counted in its own example (dl-cases.md). No hook.

---

## 8. How to make a new thing this way

1. Rasterise the logo once; carry every offset as a threshold of one signed distance field.
2. Drop islands below printable size with a stated area, and size the outline by its measured width after the drop.
3. Place posts by farthest point sampling inside a band of the distance field.
4. Cut ports outward from the board edge through whatever outline is there.
5. Build z slabs at every feature boundary, label grids per slab, and mesh with greedy rectangles on an integer lattice with T junction repair.
6. Add corner pinch passes (PLINTH) before meshing.

---

## 9. Port map

| item | value |
|---|---|
| packages | `geom` (EDT, signed field, components), `mesh` (raster route: `seed/mesh/rastermesh.js` names COLLAR, PLINTH, CRESSET), `hackbuild-3mf` (COLLAR dialect) |
| feature kinds | pocket (cavity, feet, label), window (vents, ports), boss (standoffs, posts), per `fab-knowledge:synthesis/mappings.md` line 93 |
| canon id | MISSING: no canon entry for a logo silhouette case by signed distance offsets (a construction, not a mechanism) |
| reference id | MISSING: none named in INDEX or proposed in `synthesis/mappings.md` line 93; nothing under `reference/` on 2026-10-05 |
| milestone | none assigned |
| lineage rows | MISSING: no row in `lineage.json` for the CRESSET kernel (CR 1299 to 1806) |
