# PLINTH: how it is made

Record written 2026-10-05 from the original code. Slug `plinth`. Family cases-joinery: the SYNC32 raked console shell for a Pico class board on a Pi Zero footprint, with cantilever snap tongues, a GPIO hatch with detents, the HeatSync mark and wordmark inlaid in the roof, and a board STL clash check. It replaced CRESSET (`fab-knowledge:originals/cresset/RECORD.md`).

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drive on 2026-10-05 (config `fab-knowledge:originals/plinth/shots/_drive.json`, log beside it) or, where marked, from the 3MF counts in `fab-knowledge:sources/downloads/dl-cases.md` section 5. "Computed" means worked by hand from declared values.

Short paths: `F` is `fab-knowledge:originals/plinth/files/`, `PL` is `F/plinth.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | PLINTH, SYNC32 console shell (kernel rev 2) |
| owner's slug | plinth |
| canonical file | `PL` |
| sha256 | e19f9e647763baf7d62c23bba214ea36b21234e3a9a7f6015e12c69117259785 |
| bytes | 931755 (3461 lines; line 8 is 162,373 bytes of base64 fonts, line 196 is 607,691 bytes of inlined three.js, line 1300 is the traced HeatSync paths) |
| date | 2026-08-31 01:57 (`plinth (6).html` in Downloads, byte identical) |
| source | the page itself: kernel from PL 1303, board import from about 1899, mesher from 2034, exports from 2220, state from 2532, UI from 2944, boot 3425 |
| runtime | three.js and OrbitControls inlined, fonts inlined (Orbitron, Chakra Petch, Bungee, Press Start 2P, Michroma, Archivo, IBM Plex Mono); offline |
| print target | 220 plate default, PLA, three slots; working grid 640, idle refine 1024, export grid 1152 |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-cases.md` section 5 (all titled "CRESSET - HeatSync console case maker" in Downloads).

| date | file | sha256 prefix | kernel and features |
|---|---|---|---|
| 2026-08-31 00:15 | `plinth.html`, copied to `F/revisions/plinth-rev1-sdf.html` | 2fd59f57 | rev 1: "The body is an analytic signed distance field of a rounded rectangle, so every lateral offset (chamfer, wall, cavity, lip, groove, snap bump) is a threshold rather than a boolean" |
| 00:58 | `plinth (1).html`, copied to `F/revisions/plinth-rev2-first.html` | 6c2ba5e2 | rev 2: edges move independently with height, rows filled from analytic spans |
| 01:12 | `plinth (2)` | 31dba136 | `SYNC|32` wordmark split |
| 01:32 | `plinth (3)` | 6fc1675c | snap tongues and the strain check |
| 01:45 | `plinth (4)`, copied to `F/revisions/plinth-rev2-board-import.html` | b662635e | board STL import, Orbitron badge face, idle refine |
| 01:57 | `plinth (6)` = harvest | e19f9e64 | canonical: adds `fixDiag` and `fixZDiag` |
| 02:03 | `plinth-sync32.3mf`, copied to `F/plinth-sync32.after-harvest.3mf` | 591e0d09 | export after the harvested html; stacked badge lockup |

### 1.2 Why this revision

It is the newest and it is the first raster case in the family whose exports are clean: the 02:03 export has 0 edges shared by four faces in every part (base 173,284 tris, lid shell 215,616, badge 35,468, disc 12,444, hatch 1,864, measured in dl-cases.md), against 57 for CRESSET; the topology passes that made the difference arrived in this build. The drive on 2026-10-05: 0 errors; 94 x 80 x 30.0 shell, seam 16.0, 399,198 tris at grid 1024 after the idle refine, 50.6 cm3, 63 g, every check green including "6 tongues 14 x 5.6 mm, 0.3 mm engagement, about 2.2 percent surface strain going on" (measured).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `plinth.html` | the bench |
| `PLINTH-README.md` | owner README (it describes a `verify.py` audit that is not in the harvest) |
| `sync32-console.3mf` | the shipped example (base, lid in three slots, hatch; 33.8 MB model uncompressed) |
| `plinth-sync32.after-harvest.3mf` | the 02:03 export |
| `board-rp2040-pizero-standin.stl` | the bring your own board placeholder (84 tris, watertight, signed volume -6506 mm3, so its winding is inverted) |
| `revisions/` | rev 1 (SDF), first rev 2, the board import build |

Hashes: `fab-knowledge:originals/plinth/SHA256SUMS`.

---

## 2. What it makes and for whom

A small two tone console shell for a friend's Pico based console on a Waveshare RP2040-PiZero (Pi Zero footprint, no STEP published): a raked, tapered rounded box whose roof carries the HeatSync mark and a SYNC32 wordmark as flush inlays, a GPIO hatch with a finger notch, roof vent slots, side vents, a front panel recess and feet. Base, lid and hatch; "No screws anywhere" (step 2 guide). Board pushed into a corner against the connector wall so the ports line up.

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/plinth/shots/`.

| file | caption |
|---|---|
| `l01-iso-board-step.png` | The SYNC32 shell assembled in iso: bone lid with the orange and charcoal HeatSync mark and SYNC32 (32 in the disc colour) inlaid in the raked roof, the dark hatch, the roof vent bank, side slots, the dark base below the seam. Step 1 BOARD (width, depth, pcb, connectors face, across the shell, gaps). Checks strip and status: 94 x 80 x 30.0, seam 16.0, 399,198 tris, 50.6 cm3, 63 g, 150 layers, grid 1024. |
| `l02-exploded-body-step.png` | EXPLODED at 2 BODY: the lid lifted showing its lip and the six snap tongues with relief slots, the board (green ghost) on press pegs in the base, the side vent slots; SHELL and FORM (front rake, back rake, side taper). |
| `l03-lid-hidden-ports-step.png` | Lid hidden at 3 PORTS: the board in the left back corner, the hatch plate, the connector table (HDMI, USB C, microSD with a finger scoop notch) and FIT (aperture clearance 0.4, card scoop 6 and 1.6). |
| `l04-top-badge-step.png` | TOP VIEW at 4 TOP: the badge lockup on the top face (mark then wordmark in Orbitron), the hatch, the roof vent slots; BADGE settings (mark height 27, cap height 6, spacing 1.2, gap 3, offset Y -15). |
| `l05-section-mounts-step.png` | 5 MOUNTS: mounting ears (off by default), feet; the assembled shell. SECTION is on, but the clip plane `(0, -1, 0)` keeps the front half and its cut face points away from this iso camera, so the shell reads whole (looked at 2026-10-05). |
| `l06-print-step.png` | 6 PRINT: FILAMENT SLOTS (3, shell, bone, sun disc; light top, dark base) and MESH (working grid 640, export grid 1152, refine when idle 1024, chamfer step 0.2) with the note "Below about 0.25 mm per cell the mark stops being the mark." |

---

## 4. Build pipeline and code map

| PL lines | contents |
|---|---|
| 1312 to 1321 | `LOGO`, `MK` optical constants, `LCX`, `LCY`, `OPTR` |
| 1323 to 1334 | `makeGrid` (span over the case plus ears and ribs, `cell = span / grid`), grid to mm helpers |
| 1336 to 1371 | `spansOf`, `fillSpans`, `inset`, `shellMask`, `ringMask` |
| 1373 to 1410 | `fixZDiag`, `fixDiag` |
| 1412 to 1428 | `sdRRect`, `orRect`, `orDisc` |
| 1430 to 1508 | `rasterDraw`, `markMasks`, `markExtent`, `FACES`, `badgeFont`, `layoutText`, `textMasks` |
| 1510 to 1542 | `planCase` (board placement, seam, top, the `edges(z)` function) |
| 1544 to 1738 | `features` |
| 1740 to 1897 | `zList`, `ramp`, `buildSlabs` (base, lid, door) |
| 1905 to 2032 | board import: `parseSTL`, `boardPlace`, `boardField`, `boardClash`, `boardAtPorts` |
| 2040 to 2218 | mesher: `greedyRects`, `collectRects`, `cornersOf`, `buildMesh` (same lattice and T junction method as CRESSET) |
| 2220 to 2531 | zip with `CompressionStream('deflate-raw')` falling back to store, STL, 3MF (`MATERIALS`, `meshXML`, `filamentBlock`, package), `download` |
| 2533 to 2589 | `PORT_PRESETS`, `DEF` |
| 2601 to 2684 | viewer |
| 2686 to 2828 | `buildNow` (print transforms, plate layout), `rebuild` with idle refine |
| 2830 to 2943 | `overlap`, `report` (the checks) |
| 2945 to 3335 | `GUIDE`, controls, panes Board, Body, Ports, Top, Mounts, Print |
| 3337 to 3424 | `printCard`, `doExport`, `loadDesign` |
| 3426 to 3457 | `boot` (waits for the six badge faces: "canvas fillText falls back silently if the face has not loaded yet") |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The shell from analytic edge spans

What it does: makes a rounded box whose four edges move independently with height (front rake, back rake, side taper, a base reveal, a top chamfer) with no booleans and no distance field.

`planCase` (PL 1510 to 1542):

```
edges(z): a = reveal inset (revealIn below reveal, ramping out over revealIn) + top chamfer (z - (topZ - chamTop) above it)
          t = z / topZ
          L = -W/2 + a + taper t     R = W/2 - a - taper t
          F = -D/2 + a + rake t      B = D/2 - a - rakeB t     r = max(0.6, corner - a)
splitH = round(max(hi, floor + standoff + pcbT + 2.5) x 2) / 2,  hi = max over ports of pcbTop + z + h + 1.4
topZ   = max(splitH + roof + 5, H)
```

`spansOf(G, e)` (PL 1336 to 1349): per grid row, the half width is `w/2` in the straight band, else `(w/2 - r) + sqrt(r^2 - t^2)` in the corner band; the row fills from the left to the right cell index. `inset(e, t)` shifts all four edges and the radius by t, so `shellMask = spans of inset(e, 0)` and `ringMask(t0, t1) = spans of inset(e, t0) minus spans of inset(e, t1)`. Every lateral offset (chamfer, reveal, wall, cavity, lip, snap groove) is an edge inset of that one function (benches-cases.md). Rev 1 did the same with an SDF of a rounded rectangle; rev 2's comment: "Rows are filled from analytic spans rather than a distance field, which keeps a raked face cheap even at one slab per millimetre."

Slabs (`buildSlabs`, PL 1753 to 1897): z lists collect every feature boundary plus `ramp(0, splitH, leanStep)` with `leanStep = max(prof 0.2, 0.10 topZ / max(rake, rakeB, taper))`, so a raked face drifts at most 0.1 mm per slab; values closer than 0.05 merge. Each slab is a Uint8 label grid: 1 shell, 2 bone or plate, 3 disc or accent.

### 5.2 Corner pinch passes (the fix CRESSET lacked)

`fixDiag` (PL 1395 to 1410): two passes over every 2 x 2 window; where `a === d && b === c && a !== b` (a checkerboard: two cells sharing only a corner), fill one cell of the minority pair keeping the lower label connected. `fixZDiag` (PL 1373 to 1394): the same touch between stacked slabs (material in the lower slab on one cell and in the upper slab on its side neighbour in x or y, with the other two cells empty, so the two cubes meet only along one edge at the slab boundary) is broken by copying the lower cell's label up into the upper slab. It tests only side neighbours, not plan diagonals, so a plan diagonal touch across a slab boundary meets at a single vertex and is not repaired (inferred from the loop at PL 1377 to 1391; the 02:03 export still counts 0 bad vertices, measured in dl-cases.md). Comment: "Those edges pair fine but the shared VERTEX is non manifold, which is what lib3mf flags on a voxel mesh." Before the passes: 74 bad vertices and one edge with four faces (benches-cases.md); after: 0 (measured on the 02:03 export).

### 5.3 Cantilever snap tongues with relief slots and a strain check

What it does: holds the lid on with six tongues that flex at their roots, instead of a bead on a closed ring. Comment (PL 1589 to 1591): "Snaps are cantilever tongues, not a bead on a closed ring: a ring that size cannot flex 0.3 mm without hoop compression. Each bump gets a relief slot either side so a short tongue can bend at its root."

Constants (`DEF.snap`, PL 2553 to 2554): `count 6, len 14, h 2.4, d 0.3, z 2.6, lip 7, lipW 1.5, clear 0.25, root 1.4, slotW 1.6`.

Construction:

1. Placement (PL 1592 to 1609): tongues spread evenly round the perimeter by a parameter t over four sides; each a strip `len` long reaching across the wall, with two `slotW` relief slots either side.
2. Lid lip (PL 1828 to 1846): a ring from `wall + clear` to `wall + clear + lipW` hanging `lip` 7 below the seam; within the bump band (`splitH - z - h/2` to `splitH - z + h/2`) the bump grows outward by `d f` where `f` ramps from 0 to 1 over the lower 55 percent of the bump ("lead in: the bump grows to full depth over the lower half, and keeps a flat shelf on top to hold the lid down"); relief slots cut through the lip below `splitH - root`.
3. Base groove (PL 1786 to 1787): the base ring loses `d + 0.12` of wall inside the snap strip over the bump band.
4. Strain (`report`, PL 2928 to 2929): `strain = 3 lipW d / (2 free^2) x 100` with `free = lip - root = 5.6`: 2.2 percent (2.152 computed in CANONS); ok under 2.6, warn under 3.4 ("Fine in PETG, near the limit in PLA"), error above ("Too stiff, it will crack").

This is CANONS `snap-tongue-relief` (section 2.2), the snap family's shared strain verdict; D-073 later sets the profile limit by material and bend direction and keeps 2.6 and 3.4 as a legacy preset.

### 5.4 The GPIO hatch with a ledge, notch and detent bumps

Constants (`DEF.door`): `auto true, w 60, d 16, r 4, margin 5, ledge 2, ledgeT 1.0, clear 0.25, notch 11, notchD 1.2, bump 0.25, bumpZ 0.5, bumpH 1.0`. Auto width covers the header: `doorNeed = 2 (|bx + hdrOx - cxTop| + hdrW/2 + 2)` against `doorAllow = topW - 2 margin`, at least 24 (PL 1673 to 1678); measured 75 x 16 "centred and clear of the whole header".

Construction (PL 1679 to 1690, 1852 to 1861, 1880 to 1893): the roof gets the hatch opening above `roof0 + ledgeT` and a smaller ledge opening below it (the hatch rests on a 2 mm ledge); a finger notch disc 11 dia 1.2 deep at the far edge; two detent pockets in the opening walls; the hatch part is the opening minus `clear` 0.25 with two 0.25 bumps that snap into the pockets. Prints flat.

### 5.5 Press pegs, standoffs, ports and finger scoops

Board (`DEF.board`): 65 x 30 x 1.6 against the `back` wall with `inset` 0.6, `xPlace left`, `side` 2.5, standoff 3.5, holes 58 x 23, `standD` 5.4, `holeD` 2.75, `post peg`, `pegUp` 2.4: peg diameter `holeD - 0.18` (PL 1553), so the board presses on. Ports (PL 1557 to 1586): a channel from inside the board edge to past the wall, `w + 2 portClear` (0.4); a `notch` adds a relief `notchOut` 6 each side and `notchUp` 1.6 above and below (a finger scoop for the microSD card slot). Check per port: "aperture is fully in the base" or "crosses the seam, it is formed by both halves". Port presets as CRESSET.

### 5.6 The badge laid out on the optical centre of the mark

Optical constants measured off the canonical raster (PL 1313 to 1321): `MK = {DCX 402.9, DCY 468.3, DD 621.4, ICX 459.5, ICY 479.0, L 8.3, T -0.7, R 992.9, B 1001.0}`; lockup anchor 70 percent disc and 30 percent ink centre (`LCX`, `LCY`); optical right edge a third into the flames (`OPTR`). "The mark is not centred in its own box ... anything that centres the 1000 unit box places it visibly off." The lockup (mark then wordmark in a row, or stacked) is centred on the TOP FACE, which the rake pulls back from the footprint: "Centring on the footprint is what made it look skewed" (PL 1692 to 1696). Wordmark pipe split `SYNC|32` puts 32 in the disc colour; text sized by cap height per face (`FACES`, `badgeFont`). Default badge: mark 27 tall, cap 6, track 1.2, gap 3, y -15, depth 0.8, Orbitron. Colour logic in the top `badge.depth` (PL 1862 to 1873): plate cells slot 2, flame and ink slot 1 on a plate or 2 without, sun and accent slot 3. Grids: working 640, idle refine 1024 after 1.4 s without input, export 1152 (about 0.08 mm per cell); "Below about 0.25 mm per cell the mark stops being the mark" (print pane note).

### 5.7 Board STL import and clash by column envelope

What it does: checks a bought board's real mesh against the shell with no booleans (PL 1899 to 2032).

1. `parseSTL`: binary or ASCII.
2. `boardPlace`: rotate, flip, and auto place the board's bounding box onto the board seat (`floor + standoff`).
3. `boardField`: rasterise every triangle into the shell grid by barycentric test with -0.02 tolerance, keeping z min and z max per cell (a column envelope).
4. `boardClash`: for each slab, count cells where the slab has material and the board's z column overlaps the slab, times cell area times slab height: interference in mm3 per base, lid and hatch (ok under 1, warn under 30, error above).
5. `boardAtPorts`: count board cells inside each port aperture's z band; ok above 4, else "aperture has nothing behind it in the model".

The shipped stand in STL has negative signed volume (inverted winding), so an import path needs an orientation pass before any volume based test (benches-cases.md new evidence 9; M04 uses it as the refused import fixture).

### 5.8 Print poses, plate and exports

Base prints floor down; the lid show face down (vertices `y -> -y`, `z -> topZ - z`, a 180 deg turn about X) so the badge inlay is on the plate; the hatch flat (`buildNow`). Layout picks side by side or front to back on the plate and centres the set; the check reports "all parts fit one 220 mm plate, laid out side by side" (measured). Exports (PL 2220 to 2531, 3409 onward): 3MF in the COLLAR dialect (component objects, BambuStudio metadata, `model_settings.config` per part extruders, `filament_maps` all 1, optional `project_settings.config` with about 75 per filament keys, `filament_sequence.json`, `slice_info.config` with zero usage); a zip writer with real deflate through `CompressionStream('deflate-raw')` falling back to store; STL bundle with the print card; design JSON. Exports rebuild at the export grid first.

### 5.9 Constructions the first pass left out (checker, 2026-10-05)

Read from `PL` at the lines named; behaviour inferred from the code unless marked.

| item | PL lines | how it is made |
|---|---|---|
| tongue spread | 1596 to 1600 | tongue k sits at `t = (k + 0.5)/n x 4` round the perimeter, one unit of t per side, centred on the straight run between the corner radii; with `count 6` that puts 1, 2, 1, 2 tongues on the back, right, front and left sides (computed), so "evenly" means evenly in t, not one per side |
| lid shoulder | 1806, 1844 to 1845 | above the seam the lid's inner wall starts at `wall + shoulder` (`shoulder = snap.clear + snap.lipW`, 1.75 at defaults) and steps back to `wall` one millimetre per millimetre of height, sliced at `prof` 0.2; this is a 45 deg ledge that carries the lip ring when the lid prints show face down |
| base snap groove depth | 1786 to 1787 | inside the snap strip and the bump band the base ring loses its inner `d + 0.12` (0.42) of wall, so the bump has 0.12 of radial clearance at full engagement |
| port floor | 1584 | a port band starts no lower than `floor + 0.8`, so a connector set below the board (microSD at z -1.8) never cuts the floor through |
| side vents or ribs | 1633 to 1655 | `vent.mode 'slots'` cuts `w` 2.6 slots at 2.6 + 3.2 pitch over `span` 36 through both side walls between z 6 and 21; `'ribs'` instead adds outward ribs `ribD` 1.2 proud; either one is kept `keepout` 3 clear of any left or right port and its card scoop |
| roof slots | 1656 to 1661 | `vent.top` cuts `floor(topSpan / pitch)` slots `w` wide and `topLen` 7 long, rounded, centred at `(topX, topY)` 0, 31 |
| front panel recess | 1663 to 1670 | a rounded panel `depth` 0.9 deep in the front face from z 4.5 to 23, width the top face width minus 2 x 13 when `w` is 0 |
| mounting ears | 1613 to 1623 | off by default; per side `count` flat tabs `len` 15 out, `w` 13 wide, `t` 3.6 thick at the bed, with a `holeD` 4.4 hole 1 mm in from the tip; they print flat with the base |
| feet | 1625 to 1631 | four 11 mm recesses 0.6 deep inset `wall + d/2 + 2 + revealIn` from each side |
| hatch detent geometry | 1680 to 1691, 1855 to 1857, 1880 to 1893 | each hatch bump is a disc of radius `2 bump` (0.5) centred on the hatch part edge at `plus or minus (dw/2 - clear)`, from `bumpZ` 0.5 to `bumpZ + bumpH` 1.5 up the hatch; each pocket is a disc of radius `2 bump + clear` (0.75) on the opening edge over the same band in the roof; the hatch part is `roof - ledgeT` (1.8) thick |
| hide lid | 2645 to 2646 | the lid and hatch objects are skipped when hidden, which is the working form of the CRESSET toggle that sets `visible = 0` and does nothing |
| idle refine | 2811 to 2823 | after a build at the working grid, if `idle` is on and `refine` is above `grid`, a timer rebuilds at the refine grid 1400 ms later |

---

## 6. UX anatomy

| element | content |
|---|---|
| theme | HeatSync hazard palette (`--char #15120f`, `--hazard #f2ab1e`, `--logo-orange #F99A1C`, `--bone #ece3d3`), Archivo and IBM Plex Mono; header mark, PLINTH, "SYNC32 CONSOLE SHELL", size tag |
| steps | 1 BOARD, 2 BODY, 3 PORTS, 4 TOP, 5 MOUNTS, 6 PRINT with a hazard underline and a done marker; one guide sentence per step |
| stage bar | Exploded, Board ghost, Hide lid, Hide hatch, Section, Top view, Reset view |
| checks strip | coloured chips (section 5 checks, board fit with free space beside and in front, corner placement, apertures vs seam, badge on the face, badge vs hatch, roof slots vs hatch and badge, board clash mm3, port coverage, roof slots inside the roof, side band below the roof, lid lip clears the board, snap strain, board held by pegs or screws, plate fit) |
| status footer | shell, seam, tris, volume, solid mass, layers, grid, build ms |
| busy veil and toast | during export |

What makes it excellent: one function of z gives every offset of a raked box; the snap is designed as a spring with its strain shown; the hatch, ports and badge each carry their own check; a real board mesh can be dropped in and clash is reported in mm3; idle refine gives a finer mesh without slowing the sliders.

Flaws a port must not copy: no hook and no tests in the harvest (`verify.py` is described in the README and missing); the registry blurb describes the abandoned rev 1 SDF kernel; build time at grid 1024 under swiftshader was 10.3 s (measured), so the idle refine must stay off the slider path.

---

## 7. Tests and harness

None shipped. `PLINTH-README.md` describes a `verify.py` audit (zip integrity, component references, degenerate triangles, bad edges, non manifold vertices, signed volume, lib3mf manifold and oriented, model_settings to mesh mapping, per filament key lengths, no `extruder_variant_list`, all values strings); it is not in the harvest or in Downloads. The 02:03 export's counts (0 four face edges) are the best evidence of its result.

---

## 8. How to make a new thing this way

1. Describe a boxy shell as one rounded rectangle whose edges are functions of z; make every wall, lip and groove an inset of it.
2. Slab at every feature boundary and on a ramp fine enough that a raked face drifts under 0.1 mm per slab.
3. Break corner pinches in every slab and between slabs before meshing.
4. Make snaps cantilever tongues with relief slots, a ramped lead in and a flat shelf, and show the strain with thresholds.
5. Lay out art on its optical centre and centre it on the face it lands on, not the footprint.
6. Check a bought board by rasterising its mesh into column envelopes on the shell grid.
7. Work at a coarse grid, refine when idle, export at a fine grid.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` raster route (`seed/mesh/rastermesh.js` names PLINTH), `geom` (analytic edge spans beside the EDT), `sim` (board STL clash by column envelope), `catalog` (RP2040-PiZero, port presets), `hackbuild-3mf` (COLLAR dialect) |
| feature kinds | snap (tongue with relief slots), pocket (hatch, feet), port (aperture vs connector), chamfer (top chamfer as an inset), window (vents), boss (standoffs, pegs), per `fab-knowledge:synthesis/mappings.md` line 92 |
| canon id | `snap-tongue-relief` (`docs/plan/CANONS.md` section 2.2, candidate until a snap kind reference; golden 2.152 percent). MISSING: the hatch with ledge and detent bumps (CANONS section 2.2 note: "hatch detents ... wait for a design that needs them"), the press peg `hole - 0.18`, the analytic span shell |
| reference id | `cases/plinth-spans` (renamed from `cases/plinth-sdf`, alias in aliases.json, "not needed for closure", `docs/plan/milestones/M11-reference.md` lines 486 to 495); `reference/kinds/snap` covers snap; neither exists under `reference/` on 2026-10-05 (MISSING) |
| milestone | M06 (snap-tongue-relief golden, `milestones/M06-canons.md` line 563); M04 (stand in STL as the refused import fixture, `milestones/M04-checks-project.md` line 1107) |
| lineage rows | MISSING: no row in `lineage.json` for `spansOf`, `fixDiag`, `fixZDiag`, `buildSlabs` or the board import (PL 1303 to 2032) |
