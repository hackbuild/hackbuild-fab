# COAMING: how it is made

Record written 2026-10-05 from the original code. Slug `coaming`. Family cases-joinery: the cyberdeck case maker that grew out of LOCKET R2. Seven archetypes (folding deck with a print in place hinge, slab, handheld, writerdeck, field box, panel head, pocket host) built from one tray and one bezel vocabulary of constructive prisms with no CSG, with flush raster art zones, an assembled view with a hinge pose, a print bed view whose shelf packer is also the 3MF placement, and undo. LOCKET R2 has its own record at `fab-knowledge:originals/locket/RECORD.md`.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drive on 2026-10-05 (config `fab-knowledge:originals/coaming/shots/_drive.json`, log beside it) or, where marked, from `fab-knowledge:sources/benches/benches-cases.md` section 8 and `fab-knowledge:sources/downloads/dl-cases.md` section 1. "Computed" means worked by hand from declared values.

Short paths: `F` is `fab-knowledge:originals/coaming/files/`, `CM` is `F/coaming.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | COAMING, cyberdeck case maker |
| owner's slug | coaming |
| canonical file | `CM` (Downloads `coaming (3).html`) |
| sha256 | fb8a7fa6047f1107de0ea5a3b4c93eaf58ca7767f4e63ba5ca05c988f5ddac2a |
| bytes | 991566 (4200 lines; lines 7 to 11 are base64 fonts, line 389 is the inlined three.js) |
| date | 2026-08-31 02:50 (Downloads mtime; `coaming (5).html` of 2026-09-14 is byte identical) |
| source | the page itself, in script blocks: OrbitControls (CM 392), earcut (1496), kernel (1502 to 1909), library and state (1811 to 1909), art engine (1910 to 2264), layer model and editor (2265 to 2839), case builders (2840 to 3332), export (3333 to 3696), UI and viewer (3697 to 4200) |
| runtime | three.js, OrbitControls, earcut and four fonts inlined; opens from `file://` offline |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, 256 x 256 bed, two to four slots |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-cases.md` section 1.

| date | file | bytes | what |
|---|---|---|---|
| 2026-08-21 09:36 | `coaming.html` | 728,084 | first build: six archetypes, no FOLDING DECK, a 24 key filament template, no zone canvas |
| 2026-08-31 00:19 | `coaming (1).html` | 769,940 | FOLDING DECK added, `zoneCv` rail canvas, 99 key `FILAMENT_TEMPLATE` |
| 2026-08-31 01:15 | `coaming (2).html` = harvest, kept as `F/revisions/coaming-944kb-harvest.html` | 944,650 | explode by slot, object chips, rail art canvas, side by side 3MF placement |
| 2026-08-31 02:50 | `coaming (3).html` | 991,566 | canonical |

### 1.2 Why this revision

It is the newest and the most complete: the same geometry as the harvest (`buildFold` differs only by group tags and an `asm` record), plus everything the plan describes and the harvest lacked: the assembled view with per object `asm` placement, a hinge open slider that rotates the lid about the real axis, hardware ghosts, a print bed view with a glassy plate, the shelf packer `bedLayout` shared by the bed view and the 3MF, undo and redo (80 deep), and the art editor moved onto the stage with direct manipulation. The drive on 2026-10-05: 0 errors; the hack.build folding deck 121.3 x 162.4 x 45.2 open, closed 121.3 x 84.4 x 45.2, base 15.1 + lid 30.1, 43.4k tris, 117 cm3, 147 ms, fits the bed (measured, drive log status line; the bed shot later shows 128 ms for the same build).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `coaming.html` | canonical bench |
| `README.md` | the owner's README (written for the harvested build) |
| `examples/example-folding-deck.3mf`, `examples/example-writerdeck.3mf` | shipped examples (from earlier builds: 127 and 86 per filament arrays) |
| `revisions/coaming-944kb-harvest.html` | the harvested build |

Hashes: `fab-knowledge:originals/coaming/SHA256SUMS`.

---

## 2. What it makes and for whom

"One HTML file. Open it straight from disk, no server. Pick a form factor, pick the hardware going in it, and it generates a printable multicolor case around your parts, live, with exports ready for the Creator 5 Pro." "The name: a coaming is the raised frame around a deck hatch. This is the frame around your deck." (README). For anyone building a cyberdeck from bought parts who wants a printable case without CAD.

| key | label | objects (builder) | measured at the hack.build preset |
|---|---|---|---|
| fold | FOLDING DECK | `deck` (base tray + lid tray, open and flat, seven knuckle print in place hinge on a bridged rod, 45 deg corner facets 2.5), `face` (faceplate) | 121.3 x 162.4 x 45.2 |
| slab | SLAB | `body` (keyboard well in front, raised screen tower behind with a vented rear wall), `deck` (screen deck plate), `kframe` (keyboard frame) | 121.3 x 157 x 23.3, "kb well 14.1 front, screen tower 23.3 rear" |
| handheld | HANDHELD | `body` tray, `face` (screen over a thumb keyboard), optional lanyard post | |
| writer | WRITERDECK | `body` tray, `face` with keyboard opening and a 20 palm rest, `feet` (two 30 x 16 x 12 tilt wedges to glue on) | 121.3 x 170.1 x 28.4 |
| clam | FIELD BOX | `base` with a 3.2 lip ring, `lid` friction fit over it | |
| panel | PANEL HEAD | `body` back box with strap slot ears, `face` single or dual bezel | |
| host | POCKET HOST | `body` with ports both sides and a front cable slot, `lid` plate carrying an art zone | |

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/coaming/shots/`.

| file | caption |
|---|---|
| `m01-welcome.png` | Welcome card over the folding deck: COAMING . cyberdeck case maker, the four steps (deck, shell, art, print), "start with the hack.build deck" and "start blank". |
| `m02-fold-assembled-open.png` | The hack.build folding deck assembled at open 110 deg: keyboard base tray with side port slots, lid with the faceplate's pink window band, COAMING label and pink chevrons, the seven knuckles; hardware ghosts (screen in teal, board, battery). Rail 1 DECK: seven form factor tiles and the hardware rows (screen, board, keyboard, battery) with editable w, d, thick, active fields and provenance notes. Warning chips: "hinge: 7 knuckles, rod 5.2 with 0.6 bore clearance, prints in place", "no latch: a strip of magnet tape in the rims works". |
| `m03-fold-half-open-shell.png` | Open slider at 60 deg on 2 SHELL: the lid swung about the hinge axis, wall, floor, clearance, corner radius, inlay depth sliders, feature chips (side ports, belt slots). |
| `m06-slab-archetype.png` | SLAB: the keyboard well in front, the raised screen deck with its window band and label, side port slots. Status: 121.3 x 157 x 23.3, 3 objects, 20.5k tris, 100 cm3, 53 ms. |
| `m07-writerdeck-archetype.png` | WRITERDECK: the long typing slab with the keyboard opening, the screen window, vent slots, side ports. Status: 121.3 x 170.1 x 28.4, 3 objects, 21.3k tris, 126 cm3. |
| `m05-print-bed.png` | PRINT BED at 4 PRINT: the folding deck open and flat with the hinge between the halves, and the faceplate face up, packed on the 256 x 256 plate with the pink grid; "plate 245 x 162 mm used, everything fits"; export buttons 3MF PROJECT, STL BUNDLE, DESIGN JSON, PRINT CARD. |
| `m04-art-face-editor.png` | 3 ART: the stage splits into the face editor and the 3D view. The editor is on the FACEPLATE zone tab ("faceplate zone 103.8 x 12.9 mm . as it prints . 87%"): the faceplate outline with its window, the COAMING label and the chevrons in the dashed zone under the window, centre x, centre y, fit, dup, delete, face and zone zoom. Rail: FILAMENTS T1 to T3 with roles, LAYERS (chevrons x3, COAMING), zone copy, print reality fold. Looked at 2026-10-05; an earlier caption named the lid face zone, which this shot does not show. |

---

## 4. Build pipeline and code map

No build step is shipped; the page is a bake of its parts (fonts and libraries inlined). Global state `ST` and `BUILD` are readable from the console; there is no hook object.

| CM lines | contents |
|---|---|
| 1511 to 1615 | 2D rings (`ringRect`, `ringRRect` with 5 segments per corner, `ringChamf`, `ringCircle`), `ccw`, `cw`, `dedupe`, `prism`, `pz`, `px`, `py`, `R` |
| 1617 to 1640 | `meshVolume` |
| 1640 to 1806 | 5 x 7 pixel font `FONT57`, `glyphMask`, `gridContours`, `glyphRegions`, `textRegions`, `insetRing`, `chevronRings` |
| 1812 to 1856 | `LIB` (screens, computers, keyboards, batteries) |
| 1857 to 1909 | `ARCHETYPES`, `MATERIALS`, `ST` |
| 1910 to 2264 | art engine: `scratch`, `dilate`, `despeckle`, `logoImage`, `textRuns`, `paintText`, `paintChev`, `paintShape`, `renderLayer`, `buildZoneLabels`, `greedyBoxes`, `zonePrisms`, `zoneRect` |
| 2265 to 2839 | layer model, props, editor (`drawEditor`, `bindEditor`, handles), presets (`applyPreset`) |
| 2848 to 3027 | `fixWind`, `PZ`, `PX`, `PY`, `textLamina`, `inlayLamina`, `portHolesYZ`, `ventHolesXZ`, `chevRings`, `outlineRing`, `trayBox`, `ringChamfCorner`, `bezelPlateW`, `bezelPlate` |
| 3031 to 3238 | `buildSlab`, `buildHandheld`, `buildClam`, `buildPanel`, `buildWriter`, `buildHost` |
| 3244 to 3317 | `hwBox`, `buildFold` |
| 3320 to 3331 | `BUILDERS`, `buildCase` |
| 3343 to 3449 | `FILAMENT_TEMPLATE` (99 keys), `projectSettings`, `SLICE_INFO`, zip |
| 3459 to 3504 | `slotParts`, `bedLayout` |
| 3511 to 3696 | `export3mf`, `stlBin`, `exportStl`, `designJson`, `applyDesign`, `importJson`, `printCard` |
| 3703 to 3746 | `rebuild` (130 ms debounce), undo and redo history |
| 3747 to 3909 | viewer: `rebuildScene`, `rebuildBed`, `WEDGE`, `liftMM`, `hingeMat`, `asmMatrix`, `hwMatrix`, `applyView`, `homeCam`, `lookAtZone` |
| 3985 to 4200 | tabs, guides, archetype tiles, part rows, bindings, boot |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The constructive prism kernel (route B, no CSG)

Comment (CM 1503 to 1508): "A part is a list of prisms. Slicers union overlapping solids inside one object, so every hole is a hole in an outline and every boss is another prism."

`prism(region, axis, a, b, slot)` (CM 1576 to 1611): the outline in the axis plane (z: x, y; x: y, z; y: x, z), outer CCW and holes CW, earcut with holes, caps from the triangulation, walls from the original rings; the y axis flips winding to stay outward; `fixWind` flips any prism with negative volume. `dedupe` strips consecutive duplicates (1e-6) and collinear midpoints (cross under 1e-7) "so earcut's cap boundary matches the wall skin". Walls with apertures are x or y prisms whose outlines carry the holes; a hole that would breach the outline is dropped or replaced (section 5.3).

### 5.2 The folding deck and its print in place hinge

`buildFold` (CM 3250 to 3317):

```
W  = max(kb, scr, comp, bat widths) + 2 (wall + clr) + 6
DB = (kb.d or 40) + 2 clr + 4 + 2 wall                          base depth
DL = max(scr.d, comp.d, bat.d) + 2 clr + 4 + 2 wall + 18        lid depth
HB = max(12, floor + kb.t + 2.5) ; HL = floor + bat.t + comp.t + scr.t + 2 + (2.4 + inlay) + 2
GAP 9 ; YAX = DB + GAP/2 ; ZAX = (HB + HL)/2 ; LID0 = DB + GAP ; LID1 = LID0 + DL
KR 5.2, PR 2.6, PC 0.6, AXC 0.6, N 7, S = min(96, W - 24) ; w = (S - (N - 1) AXC) / N
```

Construction: base and lid trays from `trayBox` with 2.5 corner facets (base without its rear wall, lid without its front wall, lid shifted to `LID0`); custom hinge walls plain outside the span and notched over it to `zN = ZAX - KR - 0.7` so the knuckles clear; odd knuckles are base knuckles (a disc with a `PR + PC` bore) with an arm from the base wall; even knuckles are lid knuckles with arms from the lid wall; one rod circle of `PR` clamped in z to `ZAX plus or minus (PR - 0.15)` (flats) running from the first knuckle +1.0 to the last -1.0, in the lid group, bridging every base bore. These are LOCKET R2's numbers (KR 5.2, PR 2.6, PC 0.6, AXC 0.6, seven knuckles, lid owns both ends). The readout warns "no latch: a strip of magnet tape in the rims works". The faceplate is a `bezelPlate` with 1.6 corner chamfers dropped 2 into the lid rim.

### 5.3 The shared tray and bezel vocabulary

`trayBox(W, D, H, opts)` (CM 2929 to 2967): a bed lamina carrying the underside art zone as flush inlays (mirrored), the floor, side walls as x prisms with `portHolesYZ` slots, a rear wall with `ventHolesXZ` rows, a front wall with an optional cable slot, four corner posts (rounded, or chamfer faceted with `ringChamfCorner`), belt slots as holes through floor and art.

| helper | rule |
|---|---|
| `portHolesYZ` (2888 to 2900) | 14 x 9 r 3 slots at 23 pitch, dropped if they would breach the outline (within 4 of an end), else one centred slot `min(14, D - 12)` |
| `ventHolesXZ` (2901 to 2911) | 7 x 2.4 slots on a 12 pitch in rows 5.2 apart; a row is dropped above the wall top minus 1.4 |
| `bezelPlateW` (2982 to 3026) | window rings at active area + 0.6 (r 2), an accent band from +3.2 to +1.0 in the accent slot, a lamina with the art zone; the zone is the biggest clear full width band below the window first, else above it (at least 8 tall) |
| `textLamina` (2853 to 2876) | the 5 x 7 pixel font: each glyph its own lamina column (0.5 margin, columns overlap 0.1) "so earcut never sees hole constellations it cannot bridge", with flush counter islands |

Seven builders share these; archetypes are parameter sets over one vocabulary (benches-cases.md idea 9).

### 5.4 Art zones, the COLLAR way

`buildZoneLabels` and `zonePrisms` (CM 2162 to 2257):

1. Raster at `res` px/mm (8 default); layers paint slot numbers (text in real fonts with a pipe splitting a fill run and an accent run, chevrons, shapes, the hack.build logo, images).
2. Per slot: dilate by `boost k / 2` px, but only when that is at least 1 px (CM 2178 to 2180): at the defaults (`boost` 0.10, `res` 8) it is 0.4 px, so the stroke boost does nothing until it reaches 0.25 mm at res 8 (computed). Then despeckle at `max(1, round(pi (minF k/2)^2 0.35))` px, 14 px at minF 0.9 and res 8 (computed).
3. Colour gap: remove each slot's cells within `gap k / 2` px of any other slot (1.8 px, 0.225 mm at defaults, computed), applied only when that is at least 1 px and more than one art slot is used.
4. Cutouts (belt slots) are air through.
5. Greedy rectangles become box prisms; a same slot neighbour to the right or top, diagonals included, gets +0.012 overlap "so nothing shares a face plane", and body cells at the zone border bleed 0.03 into the vector lamina; mirrored zones flip x.

README: "Everything outside the zone stays vector, so window rings and chamfers never stairstep. Underside and lid zones are shown as seen and printed mirrored." "Lid and underside art follows the laptop convention: it reads upright to the person across the table when the deck is open."

### 5.5 Assembled view, hinge pose and the shared bed packer

Every builder returns `asm: {objects: {id: {pos, rotX?, lift?, grp?, grpPos?, map?}}, hinge?, tilt?, hw}`. `asmMatrix` places each printed object; `hingeMat` rotates the lid group about `(YAX, ZAX)` by `180 - open` (slider 0 to 180, default 110); the writer feet use `map: 'wedge'` (`WEDGE`: x = z, y = -x, z = -y) and a tilt `asin(min(1, 16 / D))`; non fold archetypes get a lift slider (30 mm times each object's lift factor). Hardware ghosts `hwBox` at real dims (screen `0x2ec4b6`, computer `0x7bd88f`, keyboard `0x9a9184`, battery `0xffb020`).

`bedLayout(S, bedW, bedD)` (CM 3477 to 3504): sort objects by depth descending, fill rows left to right with an 8 mm gap, centre the set; "shared by the print bed view and the 3MF so what you see is what loads" (dl-cases.md); `export3mf` writes each item's transform from it. The bed view draws the plate with a 10 mm pink grid and turns it glassy (opacity 0.12) when the camera dips under it.

### 5.6 Part library with provenance, and no custom mode

`LIB` (CM 1812 to 1856): screens (spi35 85.42 x 55.60 x 5.2 active 73.44 x 48.96 "lcdwiki drawing"; spi40; hdmi5 121.00 x 89.48 "Waveshare (H) V4 drawing. older revisions ran 121.11x77.93"; round4 126 x 126; bar79, strip88 "~ outline from CAD only"; dsi7; memlcd27; eink75; custom), computers (zero2, pi4, pi5 "16-17 with ports. add cooler room", pi3a, cm4, fw13, x86 mini, custom), keyboards (rii518 "retailer listing, no factory drawing published", bbq20, keebdk, ortho40, ortho30, none, custom), batteries (pisugar, pisugar3p, bl5c, lipo103450, lipo5000, b18650x2 "cells 18.6x65.2 exact, holder ~", bank, ups, none, custom). Every part row shows editable w, d, thickness and active fields; a library pick only prefills them ("Custom dims are not a mode", README, after the owner's complaint that selecting custom dims did nothing).

### 5.7 Exports

| export | content |
|---|---|
| 3MF | Bambu and Orca dialect: per object one mesh per slot plus a component object, items placed from `bedLayout` and dropped to z 0; `model_settings.config` with part names `slot N` and extruders; `filament_maps` all 1; `project_settings.config` filling the `FILAMENT_TEMPLATE` (99 keys in this build, a JSON literal harvested from a Flash Studio round trip) once per slot, then overriding colours, types, preset names, densities and temperatures; only printer and process names are written; `filament_sequence.json` in the `plate_1` shape that Flash Studio itself writes; the print card inside as `Metadata/coaming_print_card.txt` |
| STL bundle | one STL per object per colour |
| design JSON | round trips the art, images included |
| print card | archetype, size, parts with library labels, filaments, print and wall settings, notes, per object volume |

`MATERIALS` (CM 1866 to 1875): PLA 220/55, PETG 250/80, ABS 255/95, ASA 260/95, TPU 235/35, PC 270/100, PA 280/100, PVA 220/60 (nozzle/bed) with density, cost, vitrification and max volumetric speed.

### 5.8 Hinge and viewer details the first pass left out (checker, 2026-10-05)

Read from `CM` at the lines named; behaviour inferred from the code unless marked.

| item | CM lines | how it is made |
|---|---|---|
| bore shape | 3285 | the base knuckle bore is a plain 32 segment circle of `PR + PC` (3.2), not the teardrop LOCKET R2 used (`teardrop_x` with a 0.6 roof); a horizontal 6.4 bore in a knuckle printed on its side bridges its roof, which LOCKET avoided (inferred) |
| knuckle ends | 3283 to 3291 | knuckles are straight discs with no end chamfers (LOCKET used 0.8 frustum chamfers) |
| hinge wall notch | 3264, 3270 to 3277 | over the hinge span the base and lid hinge walls drop to `zN = ZAX - KR - 0.7` and keep only an outer skin `nd = min(1.4, wall - 0.8)` (1.4 at wall 2.4) above it; outside the span the walls run full height. There are no per knuckle clearance arcs and no chamfers on the facing top corners, both of which LOCKET cut |
| arms | 3281 to 3291 | base arm from `(DB - 2, zFoot)` to the bore side at `YAX - (PR + PC + 0.4)`, `ZAX plus or minus 3.4`, up to `HB`; lid arm from `(LID0 + 2, zFoot)` to the axis at `ZAX - KR - 0.1` and `ZAX + KR - 0.6`; `zFoot = max(floor + 1.5, ZAX - KR - 9)`; arms are inset 0.05 from the knuckle ends |
| no sweep check | whole file | COAMING has no fold sweep or interference check; a search for "sweep" finds nothing, so the hinge numbers are trusted from LOCKET R2, where `build.py` swept them |
| faceplate placement | 3298 to 3301, 3305 | the faceplate is `W - 2 wall - 0.7` by `DL - 2 wall - 0.7`; the screen window sits `scr.d/2 + clr + 3` from its far edge; assembled 0.35 inside the lid wall and dropped so its top is 2 below the lid rim |
| hardware ghost placement | 3306 to 3312 | keyboard on the base floor at `wall + clr + 2`; screen under the faceplate; battery on the lid floor and the computer stacked on it, both centred in the lid interior |
| bed explode | 3866 to 3868 | in the bed view the explode slider lifts each mesh by `26 x (slot - 1) x e` plus 2 for slots above 1, so colours separate by slot |
| undo snapshot | 3705, 3711 to 3719 | every rebuild schedules a history push 450 ms later; a snapshot equal to the current one is skipped; 80 deep; undo and redo replay the design JSON through `applyDesign` with the history locked |

---

## 6. UX anatomy

| element | content |
|---|---|
| theme | hack.build paper shell: `--pink #FE0386`, cream, ink, void, a paper dot grid; VT323 for tabs, heads and readouts, Special Elite body, IBM Plex Mono, Permanent Marker; fonts loaded with `document.fonts.load` before the first build |
| header | mark, `COAMING cyberdeck case maker`, undo, redo, open, save |
| tabs | `1 DECK parts`, `2 SHELL walls`, `3 ART faces`, `4 PRINT export`, each with a guide sentence |
| DECK | start from hack.build deck or blank; seven archetype tiles with icons and a tag line; hardware rows (select plus w, d, thick, active fields with the provenance note) |
| SHELL | wall, floor, part clearance, corner radius, inlay depth (0.6 to 2.0); feature chips (side ports, vents, belt slots, lanyard post, dual screen, as the archetype allows) |
| ART | filament count 2 to 4, slot rows (colour, name, material, role); layers list; zone copy; print reality fold (grid, stroke boost, colour gap, min feature, despeckle); the stage face editor with zone tabs, +text +shape +chevrons +logo +image, centre x, centre y, fit, dup (ctrl d), delete, face and zone zoom; "drag moves, corners scale, top handle rotates, arrows nudge, drop images here" |
| PRINT | bed w x d, layer height, slicer names fold ("names only, never settings"), EXPORT 3MF PROJECT, STL BUNDLE, DESIGN JSON, PRINT CARD |
| stage | assembled or print bed segment, open (fold) or lift slider, object chips, hardware toggle, warnings top right, cams iso, top, front, side, under, status bar (archetype, size, note, objects, tris, cm3, ms, fits the bed) |

What makes it excellent: one vocabulary covers seven form factors; every number is editable and the library says where it came from; the bed view and the 3MF share one packer; the art editor shows exactly the raster that prints; undo covers the whole design.

Flaws seen on 2026-10-05: in a first drive order, after visiting 3 ART the 3D view stayed zoomed into a corner on later steps even after `homeCam('iso')` (measured; shots were retaken with ART last); no latch on the folding deck; no hook object or tests; the shipped example 3MFs come from older builds (127 and 86 per filament arrays) while this build's template has 99 keys.

---

## 7. Tests and harness

None shipped. The kernel guards itself: holes that would breach an outline are dropped or replaced, prisms with negative volume are flipped, and the readout counts inverted solids (benches-cases.md). The drive on 2026-10-05 built the folding deck, slab and writerdeck with 0 errors (measured).

---

## 8. How to make a new thing this way

1. Describe each archetype as a parameter set over one tray and one bezel builder; derive every size from the parts list.
2. Build only closed prisms; put every hole in an outline; drop or replace a hole that would breach the outline.
3. Reuse the proven hinge numbers (KR 5.2, PR 2.6, PC 0.6, AXC 0.6, seven knuckles, lid owns both ends, rod with flats).
4. Keep art in raster zones with per slot hygiene and keep everything else vector.
5. Give every printed object an assembled placement and a pose, and drive the bed view and the 3MF from one packer.
6. Show the source of every bought part number, and never hide the fields behind a custom mode.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` route B (constructive prisms with earcut), `inlay` and `artboard` (zones), `catalog` (provenance tilde), `hackbuild-3mf` (template dialect), `chase` (archetypes as presets over shared builders), `nest` (shelf packer) |
| feature kinds | window (port and vent holes in outlines), hinge, pocket (art), boss (corner posts), chamfer (facets in the outline), per `fab-knowledge:synthesis/mappings.md` line 96; kind it needs: `inlay` |
| canon id | MISSING as a typed id: the folding deck hinge is CANONS section 8.3 "print-in-place knuckle hinge with continuous rod" (KNUCKLE, LOCKET R2), no id; no entry for the archetype set, the shelf packer or the art zone |
| reference id | `cases/coaming-fold` (INDEX); the M11 table marks it "not needed for closure" and names this 991 KB build's `asm` records and `bedLayout` as its source if a later design writes it (`docs/plan/milestones/M11-reference.md` line 470); it does not exist under `reference/` on 2026-10-05 (MISSING) |
| milestone | none assigned (M11: not needed for closure) |
| lineage rows | MISSING: no row in `lineage.json` for the COAMING kernel (CM 1502 to 1909), the art engine (1910 to 2264), `buildFold` or `bedLayout` |
