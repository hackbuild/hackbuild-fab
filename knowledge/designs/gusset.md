# GUSSET: how it is made

Record written 2026-10-05 from the original code. Slug `gusset`. Family kits-cotter (COTTER, SPARGER W, GUSSET). Record only: the owner's default decision D-019 keeps shop work (lumber, paint, yardage, crew, costing) out of the fab plan; GUSSET stays a HeatSync tool, and only its MaxRects nest and first-fit-decreasing lumber packer are mined into `nest` (`docs/plan/DECISIONS.md` line 2749). This record keeps the whole design so nothing is lost.

Number rules for this file. A number in a table row that names a code location is a declared value copied from that line. "Computed" means produced on 2026-10-05 by the canonical file itself in headless Chrome with its defaults (the build pack in `files/exports/`) or by arithmetic from a named formula. "Measured" comes from the drive in this folder. "Stated" quotes the page copy. Units inside GUSSET are inches unless marked mm; laser export is mm (`IN = 25.4`, line 203).

Short path: `F` is `fab-knowledge:originals/gusset/files/`. Every line number is a line of `F/gusset-v16.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "GUSSET: 2x4 and laser lounge set" (title); "Facing 2x4 sofas and a laser cut table, in HeatSync colors" |
| owner's slug | gusset |
| canonical file | `F/gusset-v16.html` (copied from `fab-work-directory:gusset (10).html`) |
| sha256 | a29d4f27b07376941230d21638b989f8ce5698ce0ec3ac2c04f2177e24b8ed97 |
| bytes | 267062 |
| date | 2026-10-01 18:42 (mtime of the byte-identical `~/Downloads/gusset (9).html`); the fab-work-directory copy is dated 2026-10-04 15:34 |
| storage key | `gusset:v16` (line 2099) |
| runtime | one hand-written file, 2213 lines; fonts inline as base64 (lines 8 to 11); three.js 0.147.0 with OrbitControls, SVGLoader and RoundedBoxGeometry from cdn.jsdelivr.net, so it needs the network |
| brand | HeatSync GANTRY palette and type; light and dark themes |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-pip-latest.md` lines 336 to 345, rechecked against `~/Downloads` on 2026-10-05.

| file | date | bytes | sha256 (first 16) | key | change |
|---|---|---|---|---|---|
| `gusset.html` | 2026-09-28 15:01 | 223167 | 18907984f9a9aaca | v1 | reclined A-frame sofa, egg crate table, MaxRects nest, lumber packer, fabric, paint, schedule, build pack, `window.claude` downloads |
| `gusset (1).html` | 2026-09-28 15:35 | 236292 | 9d010b156292a5a7 | v3 | `sofaModelBox()` box frame, square cuts; Whitewash palette |
| `gusset (2).html` | 2026-09-28 17:09 | 236962 | dd3a2c358a947ca3 | v4 | Hot seat palette |
| `gusset (3).html` | 2026-09-29 20:30 | 243396 | 45469ba22a63543d | v8 | posts turned, double, single; seat blocks; room fit and floor tape |
| `gusset (4).html` | 2026-09-29 20:58 | 255655 | 72da3e147fa4d70b | v10 | mannequins; cushion kit size; seam blocks |
| `gusset (5).html` | 2026-09-29 21:15 | 256436 | d7ce64c4976f47cb | v11 | lumber packing for one couch |
| `gusset (6).html` | 2026-09-30 19:36 | 258843 | a681caa634e0fcab | v12 | cut list colours on the 3D model |
| `gusset (7).html` | 2026-10-01 18:05 | 261581 | a74cab8fc8a95d34 | v13 | back cap behind the top rail; short slats on a deck rail |
| `gusset (8).html` | 2026-10-01 18:20 | 265860 | c46c86f0912071395 | v15 | cap inside or flush; store pads; back cushions ride up onto the seat; "you will feel every slat" |
| `gusset (9).html` = `fab-work-directory/gusset (10).html` | 2026-10-01 18:42 | 267062 | a29d4f27b0737694 | v16 | side cushions standing inside each arm; canonical |

### 1.2 Why this revision

v16 is the newest and the best: each step from v1 adds a physical correction or a buildable option (square cuts, seat blocks that bear load straight to the floor, a deck rail for short slats, the cap that lets back cushions lean on its front edge) and none removes one. The nest, `nestOnce` and `packBoards` are byte-stable from v1 to v16 (dl-pip-latest.md lines 354 to 355). The drive on 2026-10-05 found zero page errors and zero console errors through all four views and five of the six tabs (the drive never opens COLOR), and `buildPack()` wrote 1514626 bytes (measured). Known defect carried by every version: the storage key was bumped 16 times with no migration, so each bump drops the previous saved state.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `gusset-v16.html` | the shipped tool |
| `exports/gusset-build-pack-defaults.zip` | the full build pack written by `buildPack()` with defaults in the drive (computed, 2026-10-05) |
| `exports/gusset/README.md`, `build-plan.md`, `lumber/cutlist.csv`, `laser/sheet-01.svg`, `sheet-01-map.svg`, `sheet-01.dxf`, `sheet-02-map.svg`, `laser/parts.csv` | representative files from that pack: the table's egg crate sheet as cut file, map and R12 DXF; the top sheet map with the flame stencil |

Hashes: `fab-knowledge:originals/gusset/SHA256SUMS`.

---

## 2. What it makes and for whom

A lounge for HeatSync Labs: two facing sofas framed in dimensional 2x4 lumber with laser-cut plywood side and rear panels and a two-piece HeatSync mark appliqued on them, and an all laser-cut egg crate coffee table whose laminated top has the flames cut through the upper layer so the painted lower layer shows. For a crew of 1 to 6 members with a miter saw, a 2 x 4 ft laser and a build day; the tool plans the cuts, sheets, cushions, paint, shopping and the day's schedule.

Defaults (computed by the drive, header readouts and `F/exports/gusset/build-plan.md`): sofa 73 1/2 in wide, 27 7/8 deep, 26 tall; seat 17 in; table 44 x 16 x 15 1/2 in on 6 mm stock; lounge footprint 6 ft 1 1/2 in by 7 ft 11 3/4 in in an 8 ft by 6 ft 6 in room; 16 2x4 boards, 8 ply sheets, 16 kit cushions, build 5.4 h with a crew of 3.

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/gusset/drive/drive.mjs` (puppeteer-core, headless Chrome, 1280 x 860, light scheme, 6 s wait since there is no hook). Files in `fab-knowledge:originals/gusset/shots/`.

| file | caption |
|---|---|
| `g01-lounge-shape-tab.png` | LOUNGE view: two box-frame sofas in Hot seat colours (char frame, hazard and char cushions), side panels with slot pattern and the two-piece mark, the egg crate table with the stencilled mark, hazard floor tape marking the footprint. Header readouts: footprint against the room, seat height, 16 boards, 8 sheets, 16 kit cushions, 5.4 h. SHAPE tab with frame, arms, posts, deck, back cap and slat length selects and paragraphs explaining each. |
| `g02-table-view-laser-tab.png` | TABLE view and LASER tab: eight 48 x 24 in sheet thumbnails with fill colour equal to paint colour and the percentage used (79, 79, 82, 71, 71, 66, 74, 43); nesting select all parts together or one colour per sheet. |
| `g03-sofa-people-lumber-tab.png` | SOFA view with PEOPLE on: stature-scaled mannequins seated on each cushion, height tags, a lying 6 ft 2 in figure through the arm; readout "Lying 6' 2": 4" over the calves", "Knee room to table 6 5/8". LUMBER tab cut list for one couch with a colour swatch per row, lengths in fractions and cut notes. |
| `g04-sofa-exploded-cushions-tab.png` | SOFA view exploded, CUSHIONS tab: buy 22 x 20 x 4 foam plus covers, quantities and prices, a total, and three stuffing steps. |
| `g05-plan-view-build-day-tab.png` | PLAN view from above with shadows, BUILD DAY tab: six prep steps before the day and the crew schedule as a Gantt with one row per person; "done by about 2:21 pm, 5.4 h. One miter saw, so cutting is the first bottleneck." |

---

## 4. Code map

| area | lines |
|---|---|
| CSS tokens, light and dark, fonts | 1 to 160 |
| header, stage, views, toggles, tabs | 160 to 196 |
| traced mark paths `MARK.sun`, `MARK.ink` | 198 |
| units and fractions (`frac`, `fin`, `ftin`, `floor8`, `round8`) | 203 to 225 |
| state `KIT`, `DEF`, `P`, swatches `SW`, colour targets, presets, fabrics | 228 to 282 |
| mark geometry `markPolys`, `markPart`, `markBox` | 284 to 309 |
| 2D helpers and `pattern()` | 311 to 366 |
| bases (right-handed extrusion frames) | 368 to 373 |
| `sofaModel()` reclined A-frame | 375 to 545 |
| `tableModel()` egg crate | 546 to 618 |
| `sofaModelBox()` box frame (default) | 621 to 829 |
| three.js scene, materials, textures, meshes, cushions | 831 to 998 |
| `rebuild`, visibility, colours, `setView` | 999 to 1058 |
| cut-list colours on the model | 1059 to 1100 |
| people | 1102 to 1227 |
| lumber packer, MaxRects nest, laser items | 1228 to 1338 |
| fabric, foam, paint, schedule, derived bundle, shopping | 1340 to 1537 |
| zip writer, downloads capability, files | 1539 to 1835 |
| UI panes, warnings, stats, persistence, wiring, boot | 1836 to 2211 |

There is no global test hook, no undo and no tests.

---

## 5. Mechanisms and constructions

There is no circuit.

### 5.1 Box-frame sofa (`sofaModelBox`, lines 621 to 829)

What it does: a sled-sided box frame "the Seb Tech DIY style" (line 617 comment) with every cut square, laser panels filling the arms and back, and cushions sized first so the frame is sized from them.

Construction, in order:

1. Posts (lines 623 to 626): `turned` (default, one 2x4 per leg turned so its 3.5 in face runs side to side, floor rail laid flat), `double` (two 2x4s per leg, 3 in wall) or `single`. Inside width `Wi = n x cushW + 0.5`; total `Wt = Wi + 2 wT`.
2. Heights: deck top `deckH`; support under the deck `sup = deck - dThk` (1.5 slats or 0.75 ply); lowest rail `y0 = sup - 3.5`; cap bottom `capB = armH - 1.5`.
3. Depth: inside depth `zI = round8(cushD + 0.25 + backT cos lean + backH sin lean)`; back face `zBk = zI + 1.5`; side rail length `Ls = round8(zP1 - zF)`.
4. Back wall boards (lines 634 to 645): `k = max(2, floor(H / 5))` boards of 3.5 spread from `y0` to the cap with equal gaps; with the cap inside or behind, the top rail runs flush with the arm tops.
5. Side frames (lines 648 to 674): posts, floor rail, side rails (behind the panel when a panel is on), arm cap 3.5 x 1.5 the full depth.
6. Seat (lines 676 to 696): front apron flush with the deck, deck ledger behind it, back rails or slats; back cap inside (flat against the front of the top rail, top flush with the arm caps), behind, or on top.
7. Deck (lines 697 to 714): slats count `m = max(3, round((Wi + gap) / (3.5 + gap)))` with the gap from `slatGap` (0.5 to 8), or a 3/4 in ply deck; short slats (default 22 in) end on a deck rail standing on its own blocks.
8. Seat blocks (lines 715 to 729): short 2x4 legs under both ends of the ledger and the lowest back rail, "so the seat load bears straight down to the floor instead of hanging on screws driven into end grain". Centre legs when `Wi > 48`.
9. Side panels (lines 732 to 756): between the posts, flush with the post faces; below the seat only when arms are open (`lower`), or full height; a decorative cut pattern (section 5.6) avoiding the mark's bounding box; the two-piece mark appliqued (disc first, flames over it).
10. Rear panels (lines 757 to 791): split into columns and rows so each fits the bed minus 0.5 in; a 2x4 seam block between the back rails behind each vertical seam.
11. Cushions (lines 793 to 823): seat and back per seat; back cushions lean on the wall top, or on the inside cap's front edge, and ride up onto the seat cushions when the seat would be too shallow; optional side cushions stand inside each arm leaning out 6 deg; store pads 18 x 18 at 2 or 4 in as an alternative source.

Every part is a `box` or an `ext` (2D shapes with holes extruded along a right-handed basis so extrusions never mirror, lines 368 to 373). The model also returns the cut list `{name, len, qty, note, key}` and screw counts (3, 2 1/2 and 1 1/4 in).

### 5.2 Reclined A-frame sofa (`sofaModel`, lines 375 to 545)

The v1 style, still selectable: side frames with back legs leaning at `recline` (default 12 deg), front face `zF(y) = Zr + (y - deck) tan a`, back beams on edge between the leaning legs, angled arm and top caps, side panels shaped to the lean with doublers, rear panels on the reclined plane with a basis `(e1 x, e2 along the lean)` split to the bed. Cut lengths floored to 1/8 in. A warning keeps the back top at least 4 in above the arms (line 1934).

### 5.3 Egg crate table with a stencilled laminated top (`tableModel`, lines 546 to 618)

What it does: an all laser-cut table that slots together with no fasteners, carrying a two-layer top whose upper layer has the flames cut through.

| value | rule | line |
|---|---|---|
| stock `t` | `sheetMM / 25.4` (default 6 mm) | 547 |
| clearance `clr` | 0.15 mm converted to inches | 547 |
| base height `Hb` | `tH - topLayers x t` | 548 |
| half-lap depth `hm` | `min(4, Hb / 3)`; each member slotted `hm / 2` | 548 |
| long members | spine at z 0 and aprons at `+-(D/2 - 1.75)`, length `L - 2`, only `hm` tall (from `Hb - hm` to `Hb`, plus tabs), slots from the bottom `thick(x) + clr` wide and `hm / 2` deep | 550, 556 to 568 |
| cross members | four at `+-xT` and `+-xT/3`, `xT = (L - 2)/2 - 3`; the outer two are trestles laminated `trestleLayers` (2) thick with arch feet (foot 3.25, arch top `Hb - hm - 2.25`), the inner two are ribs only `hm` tall; slots from the top; cross-member slots are `t + clr` wide because they take the single-layer long members | 551 to 552, 570 to 595 |
| tabs | 1.5 wide and `t` tall on every member top between slots, into mortises `1.5 + clr` by `t + clr` in the lower top layer | 555, 564 to 565, 589 to 592 |
| top | rounded rectangle r 1.5; `topLayers` (2) layers; lower layer carries the mortises; with the mark on and 2+ layers, the upper layer gets the mark's flames as extra cut loops | 597 to 616 |

Load path (computed from lines 559 and 573): only the two trestles reach the floor. The spine, aprons and ribs are `hm` tall bands hanging in the top of the base, so every load goes from the top through the tabs and half-laps into the two laminated trestles. At the defaults (t = 6 mm, two top layers, H 15.5) `Hb` is 15.03 in and `hm` is 4 in.

Assembly notes from the code: trestle layers glued face to face; long members "slots face down", ribs "slots face up"; "flames cut through. Paint the lower layer first, glue the loose islands back in their spots" (line 614). Table length and depth are clamped to the bed minus the margins (`sanitize`, line 2109). Warnings: "3 mm ply is too thin for the table base and the panels" (line 1932); "The flame stencil needs at least 2 top layers" (line 1933); "The table is taller than the seat" (line 1935); "Table top and under layer are the same color, so the cut flames will not read" (line 1960); "Two coats of paint in a 0.15 mm slot will jam the table joints" (Laser pane, line 1997); the prep step says mask slots and tabs so the fit stays at 0.15 mm (line 1479).

The pack's sheet 1 (computed, `F/exports/gusset/laser/sheet-01-map.svg`) carries the egg crate members; sheet 2 the top layers with the flame stencil.

### 5.4 Two-piece mark as sheet applique and as stencil (lines 198, 284 to 309)

The traced HeatSync mark is two SVG paths `MARK.sun` and `MARK.ink`, parsed once with `THREE.SVGLoader`, sampled at 6 points per curve (`extractPoints(6)`), normalised to width 1 about the centre `MARK_C = {x 459.5, y 479.0, w 984.6, tx -26, ty -4}`, deduplicated at 1e-6. `markPart(which, size, cx, cy)` scales and places; `mirX` mirrors for the far side. On panels it is two applique layers of sheet: disc glued first, flames and arrow over it ("always a second color", line 256). On the table it is a stencil (5.3). Colour check: "The mark is two pieces. The sun disc has to be a different color from the flames and arrow, or the mark disappears" (line 1959).

### 5.5 Laser nest: MaxRects with five sort orders (`nest`, `nestOnce`, lines 1264 to 1313)

What it does: packs every flat part onto as few 48 x 24 in sheets as it can.

1. Items are bounding boxes of each laser part plus its extra loops (`laserItems`, lines 1315 to 1326), keyed `'all'` or by paint colour when `nestBy === 'color'` (one colour per sheet so whole sheets can be rolled with paint before cutting).
2. Five orders (lines 1265 to 1271): max side then area; area; height then width; width then height; min side then area. Each runs `nestOnce`; the result with the fewest bins wins.
3. `nestOnce`: oversize items (no fit even rotated) go to `oversize`; each item grows by `gap`; a new bin starts with one free rect `W + gap` by `H + gap`; `find` tries every free rect and both rotations, best short side fit with long side as the tie break; the first bin of the same key with the best short side wins, else a new bin.
4. `place` splits every free rect the placement overlaps into up to four maximal rects (left, right, below, above) and prunes rects contained in another.
5. Sheet `sheetW x sheetH` 48 x 24 in, `MARGIN` 0.25 in, gap `gapMM` 4 mm (lines 233, 1228); the bin passed to `nest` is the sheet minus both margins, 47.5 x 23.5 in (line 1497). Fabric beds reuse the same nest with a 0.2 in gap and rotation on (line 1388).
6. `placer` (lines 1328 to 1331) maps a part point to sheet inches, y down, inside the margin, with the 90 deg rotation.
7. Ties: `nest` keeps the first order that reaches the fewest bins (strict `<`, line 1273), so order 1 (max side then area) wins ties; the same line computes an unused `u` (the last bin's fill), dead code a port can drop.

Defaults give 8 sheets at 79, 79, 82, 71, 71, 66, 74, 43 percent used (measured, `g02` shot).

### 5.6 Decorative cut patterns with keep-outs (`pattern`, lines 327 to 366)

Slots (0.75 wide at 1.75 pitch; a slot that hits a keep-out is split into a top and a bottom part above and below all keep-outs with 0.8 clearance, each at least 1.6 long), grille (rows of 0.75 slots at 1.75 pitch in segments up to 12 long with 1.25 bridges), hex (R 0.8, spacing `1.5 R + 0.45` by `sqrt 3 R + 0.45`, odd columns offset), dots (r 0.5 at 1.6 pitch). Every hole's bounding box must lie inside the region and clear every keep-out rect by 0.6 (line 330). The keep-out is the mark's bounding box, so the pattern frames the mark.

### 5.7 Lumber packer: first fit decreasing on stock lengths (`packBoards`, `packWith`, lines 1237 to 1262)

Pieces from the cut list sorted longest first; stock 96, 120, 144 in; 1/4 in squared off the factory end of every board; kerf 0.125 in between pieces; a piece too long for the base stock opens the next longer stock; pieces over 144 go to `over`. With `boardLen` 0 ("least lumber"), it tries all three bases and keeps the lowest total length, ties to the shorter stock. The Lumber pane offers one couch or both and draws `boards.svg` (which cuts come from which board). "Lumber piece within the longest stock" is a check the plan carries from here.

### 5.8 Cut-list colours on the 3D model (`cutRowFor`, lines 1064 to 1100)

Maps each 3D lumber part back to its cut-list row by length within 0.3 in (boxes) or 3 in (extrusions) and shared name words (score `10 x shared - length difference`); "Color the 3D model to match this list" paints each part with its row's colour from a 14-colour palette (line 1059). A view mode the plan lacks.

### 5.9 Cushions, fabric, foam and yardage (`cushionPieces`, `fabricData`, lines 1340 to 1411)

Pieces per closure with seam allowance `sa` 0.5: zip box (two plates, two zipper plaque halves, front band, two side bands) or envelope (top plate, two overlapping bottom halves with a 5 in overlap, bands). Welt strips 1.5 wide, joined on 45 deg seams over 5/32 in cord. Yardage: shelf pack on the roll width minus 1 in with no rotation (grain kept), 10 percent waste, rounded up to 1/4 yd. Fabric laser beds nested per colour with rotation. Foam: indoor HR 2.6 lb ILD 34 seat and 24 back; outdoor reticulated 1.8 lb ILD 33 to 35 and 25; pieces per 24 x 72 slab. Safety: marine vinyl is PVC and never goes in the laser (chlorine); foam never goes in the laser (lines 276 to 281). Cushion sources: buy the 22 x 20 x 4 kit (default), store pads, or sew. Sewing extras (lines 1363 to 1410, added by the checker): welt length per cushion `2 (2 (W + D) + 3)`, cut as 1.5 in strips the length of the laser bed less 0.5 so they can be laser cut too; cord yardage with 5 percent extra rounded to 0.5 yd; dacron wrap yardage at 1.1 x area on 54 in goods rounded to 0.5 yd; one zipper slider per zip cover, `4 n` for two sofas of n seat and n back cushions; sewing time 60 min per zip cover or 45 per envelope, plus 20 with welt, which feeds the prep list's sewing hours.

### 5.10 Paint (`paintData`, lines 1414 to 1436)

Surface area per colour (boxes all six faces; extrusions both faces plus edges), two coats at 350 sq ft per gallon, 15 percent extra, rounded to quarts, gallons when 4 quarts or more, one 8 oz sample pot under 6 sq ft. Raw wood colours are clear coat.

### 5.11 Build-day scheduler (`scheduleData`, lines 1439 to 1485)

Greedy list scheduling across a crew of 1 to 6 with one miter saw as a shared tool. Task durations in minutes from counts: cut lumber `10 + 1.6 x pieces`, side frames 40, back wall `45 + 5 x beams`, slats `12 + 1.5 x m`, caps 20, side panels 24 (+10 with marks), rear panels `12 + 8 x panels` (+8), touch up 20, stuffing `6 x 2n`, table base 20, top 15, set 20. Prep list before the day: foam order, laser bed time at 25 min per sheet, lamination overnight, paint the night before with slots masked, paint the boards before cutting, order the cushion kit. Defaults finish at 2:21 pm, 5.4 h (measured, `g05`).

### 5.12 People and room fit (lines 1102 to 1227, 1915 to 1927)

Stature-scaled mannequins after Drillis and Contini segment ratios at 59, 63.5, 69, 74, 78 in; seated posture follows the back lean plus 0.14 rad; one lying person with feet through the open arm reports `through`, `over` (calf to cap clearance) and `past`. Room fit compares the lounge to `roomL x roomW` and a "Fit legroom to room" action sets the legroom. Warnings: lounge bigger than the room; foot opening under 6 in; calves barely clear the arm cap (under 1 in); 3 mm ply too thin; table taller than the seat.

### 5.13 Exports (`buildPack`, lines 1825 to 1834; files 1588 to 1823)

`gusset-build-pack.zip` through a hand-written store-only zip with CRC32 (lines 1539 to 1563):

| file | content | lines |
|---|---|---|
| `laser/sheet-NN.svg` | red 0.1 hairline cut paths in mm | 1588 to 1604 |
| `laser/sheet-NN-map.svg` | parts filled by paint colour, labelled, sheet caption | same |
| `laser/sheet-NN.dxf` | R12 (`$ACADVER AC1009`, `$INSUNITS 4`), POLYLINE and VERTEX on layer CUT, closed (70 = 1), y flipped to the sheet | 1605 to 1617 |
| `laser/parts.csv` | part, group, paint, hex, in and mm sizes, sheet, note; oversize rows say TOO BIG FOR BED | 1618 to 1623 |
| `lumber/cutlist.csv`, `lumber/boards.svg` | cut list and the board layout | 1637 to 1665 |
| `fabric/` | `pieces.csv`, 1:1 pattern SVGs in inches (cut line, dashed seam, notches, grain arrow), laser beds per colour, `foam.txt` | 1666 to 1722 |
| `build-plan.md` | dimensions, prep, timed build-day table, cut list, frame steps, sewing steps, shopping list with estimate, safety | 1739 to 1797 |
| `shopping-list.csv`, `palette.json`, `preview.png`, `README.md` | | 1798 to 1823 |

Downloads go through `window.claude.use('downloads')` when present, with an anchor fallback (`saveFile`, lines 1566 to 1580). Every tab also has its own download.

---

## 6. UX anatomy

- Header: wordmark, live stats (footprint vs room, seat height, boards, sheets, cushions, build hours with crew), theme toggle, BUILD PACK primary button; hazard tape divider (`repeating-linear-gradient(-45deg, #f2ab1e 0 12px, #15120f 12px 24px)`).
- Stage: views LOUNGE, SOFA, TABLE, PLAN with a 650 ms eased camera tween, instant under `prefers-reduced-motion` (`setView`, lines 1043 to 1058); explode slider; CUSHIONS, PANELS, PEOPLE toggles; PNG snapshot; a dimension HUD in the corner.
- Aside: six ARIA tabs SHAPE, COLOR, LUMBER, LASER, CUSHIONS, BUILD DAY with arrow-key navigation (lines 2127 to 2132). Panes hold `h2` sections, fields with fractional-inch readouts, tables and lead paragraphs.
- COLOR: five presets (Hot seat, Bone shop, Raw, Whitewash, Rust belt) and 15 colour targets each with GANTRY swatches plus raw wood under clear coat and a custom picker (lines 241 to 275).
- Persistence: `localStorage` `gusset:v16` `{P, C, TAB}` with type checks on restore (lines 2099 to 2107); theme in `gusset:theme`.
- Boot: if three or its addons did not load, "The 3D engine (three.js) did not load. Check the network and reload."; if WebGL fails, every tab and export still works (lines 2200 to 2210).
- Mobile breakpoints at 900, 600, 420 (lines 136, 144, 145; at 600 the dimension HUD hides).
- Lumber is drawn as `RoundedBoxGeometry` with edge radius `min(0.14, size / 4)` in, so 2x4s read as eased lumber and not as boxes (lines 951 to 952); cushions use the same geometry with their own radius (line 980).
- Seated mannequins tilt the torso to the back lean plus 0.14 rad, "a relaxed 8 degrees" (line 1147).

What makes it excellent: one model feeds the 3D view, the cut list, the sheets, the fabric, the paint, the shopping and the schedule, so every number on the page agrees; it plans a build day for real people (crew, one saw, prep the night before); it carries material safety (PVC, foam) and fit consequences of paint as warnings.

What it breaks against the hack.build law (record, not to copy into a fab bench): tabs instead of numbered steps, no guide, no welcome, no undo, paragraphs in panes, CDN dependencies, no hook, no tests, storage-key bumps with no migration.

---

## 7. Tests and harness

None ship. This folder's drive (`fab-knowledge:originals/gusset/drive/drive.mjs`) walks the four views and five of the six tabs (SHAPE, LASER, LUMBER, CUSHIONS, BUILD DAY; not COLOR) and writes the default build pack: zero page and console errors (measured 2026-10-05). The plan's M07 card ports `nest()` and `nestOnce()` with a test that evaluates the legacy file on the OGEE16 R16 lasercut footprints (183 pieces at 600 x 400, gap 4) and compares bin count and winning order (`docs/plan/milestones/M07-motion-nest.md` lines 512 to 519).

---

## 8. How to make a new thing this way

1. Size the frame from what sits in it (cushions here), then derive every cut from that.
2. Keep every 2D part as outer plus holes in one unit system and extrude it along a right-handed basis so mirrored sides never flip.
3. Slot sheet structures as half-laps at `t + clr` by half the member height, lock them with tabs into mortises in a laminated top, and cut a stencil through the upper layer to show a painted lower layer.
4. Nest with MaxRects over several sort orders and keep the fewest sheets; key bins by colour when finishing comes before cutting.
5. Pack stock lengths first fit decreasing with an end trim and the kerf, and try every stock length.
6. Turn the model into the people plan: quantities, prep, a schedule with shared tools, and safety lines next to the inputs that trigger them.

---

## 9. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| MaxRects nest, five orders, colour-keyed bins, map SVG, R12 DXF | nest | none | n/a | MISSING | M07 (`designs/gusset/legacy/gusset-10.html`, `packages/nest/test/gusset-orders.test.ts` planned, M07-motion-nest.md lines 211 to 215, 512 to 519) | MISSING (M07 plans rows for `nest`, `nestOnce`, line 501) |
| first-fit-decreasing lumber packer | nest (D-019 mines it) | none | n/a | MISSING | M07 | MISSING |
| egg crate table: half-laps, tabs into mortises | geom, nest | halfLap (backlog D-060), tabslot, lamination | MISSING (finger-joint is the nearest kerf canon, line 400) | MISSING (`sheet/egg-crate-table` proposed in knuckle-tenon-gusset.md section 5, not in `reference/`) | none | MISSING |
| stencil lamination (flames cut through the top layer) | inlay, nest | stencil (backlog D-060) | MISSING | MISSING (`sheet/stencil-lamination` proposed) | none | MISSING |
| two-piece mark applique | nest | applique (backlog D-060) | MISSING | MISSING (`sheet/applique-mark` proposed) | none | MISSING |
| decorative cut patterns with keep-outs | geom | window | MISSING | MISSING | none | MISSING |
| box-frame and reclined 2x4 sofas, seat blocks | out of scope (D-019) | none | MISSING | MISSING | none | MISSING |
| cushions, fabric, foam, yardage, paint, schedule, people | out of scope (D-019) | none | MISSING | MISSING | none | MISSING |
| cut-list colour mode on the 3D model | ui-core | none | n/a | MISSING | none | MISSING |

`lineage.json` holds three rows, none for GUSSET (checked 2026-10-05). By D-019 GUSSET gets no registry row; a `designs/gusset/` folder without a row is expected at M16 (`M16-knowledge-registry.md` lines 532, 576, 1115).
