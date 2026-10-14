# KNUCKLE: how it is made

Record written 2026-10-05 from the original code. Slug `knuckle`. Family cases-joinery: the flip and clamshell badge cases, their print in place knuckle hinge, magnet latch, acrylic panel and lens.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "measured" comes from the headless drive of the shipped page on 2026-10-05 (Chrome with swiftshader at 1280 x 860; config `fab-knowledge:originals/knuckle/shots/_drive.json`, log `fab-knowledge:originals/knuckle/shots/_drive-log.json`). A number marked "computed" was worked by hand from the declared values in this file. "README" means the owner's README states it and nothing here reran it. "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/knuckle/files/`, `SRC` is `F/src/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | KNUCKLE, flip phone badge case bench |
| owner's slug | knuckle |
| canonical file | `F/knuckle.html` |
| sha256 | c1cd25122127954b162df7925e0b85e0f044b120e01cc0f582776161d2c63c74 |
| bytes | 1102382 |
| date | 2026-09-24 19:05 (mtime of `~/Downloads/knuckle.html`, byte identical) |
| source | `F/knuckle-src.zip` (sha256 76098e29ab79bb32d0aef58ab155a09727b7277c76531e779c1469d8671527e2), unpacked at `SRC`; parts stamped 2026-09-24 17:29 to 19:04; every part is inlined in the html at the line given in section 4 |
| runtime | three.js r128, JSZip 3.10.1, earcut 2.2.4, four fonts (Permanent Marker, Special Elite, VT323, IBM Plex Mono), all inlined; opens from `file://` offline |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, 256 x 256 bed, PETG |

### 1.1 Every revision found

| where | file | date | sha256 | role |
|---|---|---|---|---|
| `~/Downloads/knuckle.html` | bench | 2026-09-24 19:05 | c1cd2512...527e2 | same bytes as canonical |
| `fab-knowledge:evidence/x/knuckle/` | bench, src zip, two examples (json and 3MF each), lasercut zip, five preview PNGs, print card, README | copied 2026-10-04 | as `SHA256SUMS` here | the only package |
| `fab-knowledge:sources/downloads/dl-pip-latest.md` section 3 | Downloads search | 2026-10-04 | | no other KNUCKLE file exists; two name hits are an unrelated ROM |

### 1.2 Why this revision

There is one revision, and it is a good one by the bar this record uses: the drive on 2026-10-05 booted with 0 console errors and 0 page errors (measured); both worked examples built with no warnings and `BENCH.audit()` returned 0 prisms with open edges (measured); the dims reproduce the shipped print card to the hundredth (closed 101.3 x 124.2 x 35.28 FLIP, 38.16 CLAMSHELL, measured). It is the newest case in the family and the first bench after the Sep 18 plan that consumes the seed `rastermesh.js` and `orca3mf.js` unchanged (`F/extracted/` copies differ from `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/` only by one trailing blank line each, diffed 2026-10-05).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `knuckle.html` | the shipped bench |
| `knuckle-src.zip`, `src/` | part0_earcut.js, part1.html, part2.js to part6.js, BUILD.txt, t2.py, sweep.py |
| `extracted/rastermesh.js`, `extracted/orca3mf.js` | the two print-forge kernels as inlined in `knuckle.html` lines 405 to 758 and 759 to 1058 |
| `README.md`, `print-card.txt` | the owner's README and the FLIP example print card |
| `knuckle-flip.json`, `knuckle-clam.json` | the two worked examples as design JSON |
| `knuckle-flip.3mf` | representative export (FLIP, three filaments) |
| `knuckle-flip-lasercut.zip` | panel.svg, panel.dxf, panel-engrave.png, README-laser.txt |
| `previews/` | the five owner preview PNGs (closed, open, bed, clamshell open, chamfer plus magnets plus lens) |

Not copied: `knuckle-clam.3mf` (1,390,241 bytes, same writer as the FLIP file; it stays in `fab-knowledge:evidence/x/knuckle/`). Hashes: `fab-knowledge:originals/knuckle/SHA256SUMS`.

---

## 2. What it makes and for whom

A case for the CactusCon 15 hardware badge (ESP32-S3 board, 2.8in TFT, two 14500 cells), for a badge team that wants a flip phone they can print in one pass and finish with a laser cut acrylic panel. Two archetypes from one state:

- FLIP (MicroTAC and Nokia 8110 lineage): a tray holds board, display and cells; a screwed bezel frames the screen; a thin flip hinges off the bottom wall and carries a pocket for a laser cut acrylic panel or a keypad. Cuts on the flip's outer face go through to the pocket, so angled vent slots show the fluorescent acrylic from outside.
- CLAMSHELL (StarTAC lineage): the lid is a tray the size of the body, the acrylic panel sits flush with its rim on four corner posts, and a battery can live under the panel.

Both print as one shell object, open and flat, hinge included, no supports; the bezel is a second object that prints face down; both share one 256 x 256 plate (README; `SRC/part4.js` lines 509 to 571).

Worked examples (measured, drive 2026-10-05; the print card in `F/print-card.txt` gives the same FLIP numbers):

| | FLIP | CLAMSHELL |
|---|---|---|
| closed | 101.3 x 124.2 x 35.28 | 101.3 x 124.2 x 38.16 |
| open flat length | 174 | 248 |
| tray H, body with bezel HF, flip or lid TF | 27.48, 29.88, 4.8 | 13.48, 15.88, 21.68 |
| hinge axis zax, knuckle r | 17.64, 5 | 19.08, 5 |
| triangles, build time | 151,012 tris, 2541 ms (drive log) | 172,976 tris, 3328 ms (k07 status strip; the log does not record ms for this shot) |
| warnings | none | none |

The README records 142,500 tris and 1979 ms for the FLIP and 161,984 tris and 3025 ms for the CLAMSHELL from its own run; the drive's counts are higher by 6 to 7 percent (measured against README), which is consistent with the raster art meshing differently when the fonts rasterise on a different machine (inferred).

Filament slots (FLIP print card, `F/print-card.txt`): slot 1 `#1A1A1A` PETG black 129.5 g, slot 2 `#FFFFFF` PETG white 0.3 g, slot 3 `#3DBB4A` PETG cactus 0.7 g; acrylic panel 93 x 36.2 x 3 fluorescent `#39FF14`.

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/knuckle/shots/`.

| file | caption |
|---|---|
| `k01-welcome.png` | Welcome card over the blank build: wordmark, one sentence of purpose, the four step grid (badge, shell, style, print), and three starts: START BLANK, CACTUSCON 15 FLIP (pink), CACTUSCON 15 CLAMSHELL. |
| `k02-flip-open-assembled.png` | The CactusCon 15 FLIP in iso at open 150 deg: black tray with the lit screen texture in the bezel window, white and cactus inlay on the bezel lower zone, seven knuckles on the rod, the flip lying open with the fluorescent acrylic panel and its engraving showing. Rail at BADGE with the ARCHETYPE tiles and DISPLAY rows; status strip 151,012 tris, 2541 ms, chips "fits bed" and "mesh current". |
| `k03-flip-half-open-shell-step.png` | The flip swung to about 95 deg so its outer face reads CACTUSCON 15 with the angled vent slots cut through to the green panel; rail at SHELL with wall, floor, board gap, corner, post, glass gap, then BEZEL and FLIP groups. |
| `k04-flip-closed-explode.png` | Open 0: the flip folded over the lower face, the knuckle row closed under the hinge wall, bezel lifted a little by the explode slider. |
| `k05-print-bed.png` | PRINT BED view at PRINT: the shell object open and flat (tray, knuckles, flip with its vent slots) beside the bezel face down on the 256 plate grid; EXPORT panel with 3MF PROJECT, STL ZIP, LASERCUT ZIP, PRINT CARD, FACES PNG and the per slot grams (129.5, 0.3, 0.7). |
| `k06-style-face-editor.png` | STYLE step: the stage splits into the 3D view and the face editor showing the BACK zone (84.3 x 111.5 mm print raster) with BADGE PIRATES, BPCN // MESH NODE, seeded digital rain, saguaro and the hack.build mark; rail FILAMENTS, PARTS, ACRYLIC with finish and engrave mode. |
| `k07-clamshell-open.png` | CACTUSCON 15 CLAMSHELL at open 150 deg: the lid tray with the flush fluorescent panel, side lanyard tabs, closed 101.3 x 124.2 x 38.16 in the legend. |
| `k08-deluxe-magnets-lens-chamfer.png` | Chamfered corners, magnet latch and clear lens on the FLIP: two magnet discs visible in the bezel, the lens over the window, and the two live warnings in the status strip ("bezel thickened to 3.12 for the magnet pockets", "board corner radius must be at least 6.9 to clear the cavity corners"). |

The five owner PNGs in `F/previews/` are kept as shipped.

---

## 4. Build pipeline and code map

`SRC/BUILD.txt`: `python3 /mnt/skills/plugins/print-forge/scripts/build_bench.py src out/knuckle.html --vendor node_modules --fonts` after `npm install three@0.128.0 jszip@3.10.1 earcut@2.2.4` and the four `@fontsource` packages. The print-forge skill builder concatenates part1.html with the vendored scripts and parts in this order (script tags in `F/knuckle.html`):

| line in knuckle.html | block | source |
|---|---|---|
| 380 | jszip.min.js | node_modules |
| 395 | three.min.js r128 | node_modules |
| 405 | rastermesh.js | print-forge `assets/`, equal to the hbf seed |
| 759 | orca3mf.js | print-forge `assets/`, equal to the hbf seed |
| 1059 | part0_earcut.js | earcut 2.2.4 dist, verbatim |
| 1063 | part2.js | `SRC/part2.js` (140 lines) |
| 1206 | part3.js | `SRC/part3.js` (348 lines) |
| 1557 | part4.js | `SRC/part4.js` (601 lines) |
| 2161 | part5.js | `SRC/part5.js` (170 lines) |
| 2334 | part6.js | `SRC/part6.js` (628 lines) |

| file | lines | role |
|---|---|---|
| `SRC/part1.html` | 375 | tokens, header, steps, guide, stage (cams, legend, HUD, welcome, face canvas), four rail panes, status strip |
| `SRC/part2.js` | 140 | `BENCH` global (line 3), part libraries (9 to 38), `blankState` (41 to 67), `exampleState` (69 to 104), `SAVE_KEYS` (110), undo history (114 to 134), library apply helpers (137 to 140) |
| `SRC/part3.js` | 348 | prism kernel `K` (5 to 160), mark paths and rain seed (173 to 180), saguaro (182 to 192), `paintLayer` (194 to 277), `composeZone` (282 to 323), `zoneBlock` (327 to 348) |
| `SRC/part4.js` | 601 | `snapLayers` (7), `derive` (11 to 103), corner and post helpers (107 to 135), `wallSet` (137 to 156), `wallAperture` (158 to 165), `loopWithChannel` (167 to 183), `buildHinge` (189 to 219), `sweepCheck` (221 to 234), `buildTray` (237 to 316), `buildBezel` (319 to 420), `buildFlip` (423 to 463), `buildLid` (466 to 506), `build` (509 to 553), `bedLayout` (555 to 571), commit model (573 to 595), hook (597 to 601) |
| `SRC/part5.js` | 170 | `printParts` (4 to 17), `pkgConfig` (18 to 27), 3MF and STL zip (28 to 38), design JSON and load (39 to 46), `printCard` (48 to 78), laser bundle (80 to 126), faces PNG (127 to 149), `BENCH.exportBytes` (154 to 165), `BENCH.audit` (166 to 170) |
| `SRC/part6.js` | 628 | viewer `VIEW` (5 to 187), UI (190 to 618) with the face editor (403 to 562), readouts and status (564 to 589), boot (621 to 628) |

Meshes everywhere are `{positions: Float32Array, indices: Uint32Array}` in mm, CCW outward.

---

## 5. Mechanisms, circuits and constructions

### 5.1 The print in place knuckle hinge with one continuous rod

What it does: joins the tray and the flip (or lid) along the bottom wall, prints open and flat in the same object as the tray, and frees with a few bends. Body knuckles alternate with flip knuckles; the body owns both ends; one rod runs through every flip knuckle bore and is anchored in the two end body knuckles.

Constants (`SRC/part2.js` line 55, `hinge`):

| key | value | meaning |
|---|---|---|
| kr | 5 | knuckle radius |
| pr | 2.5 | rod radius |
| bore | 0.35 | radial gap between rod and flip knuckle bore |
| axial | 0.6 | axial gap between knuckles |
| n | 7 | knuckle count, forced odd |
| gap | 0.6 | closed gap between bezel face and the closed flip |
| cable, cableW | false, 14 | cable bay for a keypad ribbon |

README: "Those are the values that freed cleanly on the LOCKET and GUDGEON hinges on the Creator 5 Pro in PETG. If the rod fuses, raise the bore gap to 0.45."

Derivation (`SRC/part4.js` `derive` lines 31 to 96):

```
boreR = pr + bore                                          2.85
if kr - boreR * sqrt2 < 0.8: kr = boreR * sqrt2 + 0.8      wall over the teardrop apex
ya = kr + 0.7 ; yb = kr + 0.3                              body starts ya, flip edge yb from the axis
zax = (HF + TF + gap) / 2                                  axis height above the bed (fold condition)
krMax = zax - 0.3 ; kr > krMax -> kr = max(2.4, krMax), then pr may shrink (min 1.2)
zArm = min(H - 0.2, HF + gap - 0.3)                        arm ducks under bezel and closed flip
S = W - 2c ; n = max(3, n | 1) ; kw = (S - (n - 1) axial) / n
knuckle i is a body knuckle when i is even
```

The fold condition: the flip prints flat on the bed from z 0 to TF; a 180 deg turn about an axis at `zax` lands its inner face at `HF + gap`, so closed thickness is `HF + gap + TF` (FLIP: 29.88 + 0.6 + 4.8 = 35.28, computed, equal to the print card).

Geometry construction (`SRC/part4.js` `buildHinge` lines 189 to 219), in order:

1. Body knuckle profile in (y, z): from `(-kr + 0.6, 0)` along the bed to `(ya + 0.5, 0)`, up to the arm height `zA`, then one of three cases so the disc never has an overhang under it: if `zA >= zax + kr` straight to the disc top; if `zA >= zax` an arc from the arm's height round to 90 deg; else a step out to `(kr, zA)`, up to `(kr, zax)` and the quarter arc. Then the upper left quarter arc and a 0.6 bed chamfer at `(-kr, 0.6)`.
2. Flip knuckle profile: rectangle from `(-yb, 0)` to `(kr, zax)` plus the upper half disc of `kr`, with a teardrop bore `K.teardrop(0, zax, boreR, 30)` (apex up, `cv + r sqrt2`).
3. Each knuckle is that profile extruded along x with `K.prism(profile, holes, x0, x1, 'x')`. A flip knuckle also gets a 0.52 wide root bar at `y = -yb - 0.24` from z 0.1 to `min(TF, zax) - 0.1` that ties it into the flip plate.
4. Dropped knuckles: with a cable bay, flip knuckles whose span overlaps `plus or minus cableW / 2` are skipped (`derive` lines 90 to 96); warnings if none sits in the bay or fewer than two flip knuckles remain.
5. Rod: a 40 segment circle of `pr` clamped in z to `zax plus or minus (pr - 0.15)` (0.15 flats top and bottom so the rod has a flat underside on the bed side and the top does not sag), extruded from `firstBody.x0 + 0.5` to `lastBody.x1 - 0.5`, in the body slot.

The sweep check (`sweepCheck` lines 221 to 234): six points of the flip section `(-yb, 0), (-yb, TF), (-yb - 0.5, TF), (-yb - 2, TF), (kr, 0), (kr, zax/2)` are rotated about the axis from 0 to 180 deg in 2 deg steps. A point at `yy >= ya` with `0 <= zz <= HF` hits the body wall; the first four are also tested even-odd against the body knuckle profile. First hit returns "hinge sweep: flip hits the body wall at N deg of closing" or "flip plate hits a body knuckle at N deg". README: "The closing rotation sweeps the flip through the far half plane, which is what keeps the flip plate from ever entering a body knuckle."

Fits and print: bore 0.35 radial (0.45 if fused, README), axial 0.6 (2.5 layers at 0.24, computed), knuckle wall at least 0.8 over the teardrop apex. Print card: "after printing work the hinge back and forth a dozen times to free the rod." No brim.

Limits and lessons: the rod is in the body slot, so a filament change between body and flip colours does not reach the rod (inferred). `kw < 3` warns "knuckles narrower than 3 mm, use fewer". `zArm < 3` warns that the body is too thin for this hinge. The sweep samples six points, so a feature added to the flip face that stands proud of those points is not swept (inferred).

### 5.2 The tray: walls as planar bars with apertures and notches

What it does: the body that holds the board on four corner posts over a battery bay, with USB C, antenna and extra apertures in its walls.

Construction (`SRC/part4.js` `buildTray` lines 237 to 316, helpers 107 to 165):

1. Floor: `K.plate(0, yc, W, L, style, c)` from z 0 to `floorT`, with the back art zone cut as a hole when it is larger than 12 x 12.
2. Walls (`wallSet`): four bars, each a prism in its own plane (`x` for the side walls with the outline in (y, z), `y` for the end walls) so a hole in the wall is a hole in that prism's outline. Corners are separate z prisms from `cornerPiece` (round: two arcs; chamfer: a 45 deg cut with an inner chamfer `R - t (2 - sqrt2)`). Bars overlap the corner pieces by 0.04.
3. Apertures (`wallAperture`): skipped with a warning if within `c + 0.5` of a corner; clamped above the floor by 0.3; turned into a top notch (`K.rectNotched`) when the aperture top is within 0.6 of the wall top, so it never leaves a sliver bridge. USB C centre `zPcb1 + h/2 - 0.5` (top side) or `zPcb0 - h/2 + 0.5` (bottom side). SMA: a 6.5 round hole, needs 8 mm of wall. u.FL: a top notch 8 wide, 2.4 deep.
4. Cable slot through the hinge wall from `zPcb1 + 0.3` to `min(H - 0.6, zPcb1 + 3.6)`, `cableW` wide, or a notch if under 1 mm tall.
5. Corner posts: a square of `post` (5.5) merged 0.5 into the walls, with a blind screw hole `min(6, zPcb0 - floorT - 1)` deep of `mount.hole` (1.7 for M2 self tap). `postShift` slides each post along the wall so its outer corner stays 0.5 inside the outline: round `a = c - t + 0.5; q = (c - 0.5)^2 - a^2; shift = max(0, a - sqrt(q))`; chamfer `max(0, c - 2t + 1.71)`.
6. Lanyard: ear 22 x 5.5 with a 14 x 2.6 slot; corner tabs 12 x 7 with 2.5 r holes; side tabs 9 x 12 with 2.4 r holes.

Stack-up (`derive` lines 21 to 29):

```
floorT = snapLayers(1.68)                     7 layers at 0.24
bayH   = max(3, batt.bay if the battery is in the body else 3)
zPcb0  = floorT + bayH ; zPcb1 = zPcb0 + pcb.t
zDisp0 = zPcb1 + disp.stack ; zDisp1 = zDisp0 + disp.t
H      = zDisp1 + topClr                      tray height
Tb     = snapLayers(bezelT), raised to snapLayers(latch.h + 0.96) with magnets
HF     = H + Tb
snapLayers(v) = round(max(L, round(v / L) L), 4 dp), L = print.layer
```

Checks in `derive`: display module within the walls minus 0.2 ("display module runs into the walls"); board corner radius at least `pcbCornerMin` (round: `max(0, (c - t) - 3.41 clr)`), which is the second warning in `k08`.

Fits: board gap `clr` 0.4 per side, glass gap 0.5, wall 2.0, floor 1.68 (README).

### 5.3 The bezel: z bands with a stepped window chamfer, counterbores, lens rebate and feature policing

What it does: a plate screwed over the tray that frames the active area, carries the lower art zone, the earpiece grille, optional magnet pockets, optional lens, and prints face down.

Construction (`SRC/part4.js` `buildBezel` lines 319 to 420):

1. Collect z levels: `{H, HF, HF - cbDepth}` with `cbDepth = snapLayers(1.44)`, one level per chamfer layer `HF - m layer` for `m = 1..steps`, the lens depth, the magnet depth, the lower acrylic depth. Each band between two levels is one prism of the outer plate with that band's holes; bands overlap 0.02.
2. Window: active area plus `2 winClr` (0.6). The chamfer is a staircase: band m below the top grows the window by `ch - m layer`, so a 0.72 chamfer is three layers (`chamfer` 0.72 declared as "3 layers", `SRC/part2.js` line 53). With a lens the chamfer is off and a rebate `win + 2 x 1.5 + 0.3` deep `snapLayers(lens.t + 0.1)` takes its place.
3. Screws: counterbore of `mount.head` (4.2) for the top `cbDepth`, shank (2.3) below; columns `r 2.5` with a shank hole from `zPcb1 + 0.05` up to `H + 0.02` so the screw clamps the board between post and column.
4. Feature policing in priority order "window > shanks > zone > grille > magnets > apertures", 0.6 margin; a loser is skipped with "overlaps another bezel feature, skipped".
5. Grille: five 0.8 r holes at 3.2 pitch, or three 9 x 1.2 slots, between the window top and the far wall.
6. Locating lip bars 1.0 wide, 1.2 deep below H on four sides, skipped where they meet the display module plus 0.4 or a body keypad; "fewer than two bezel lip bars fit" warns.
7. Print pose: `[x, 2 yc - y, HF - z]`, a 180 deg turn about x so the outer face is on the bed (`build` line 535).

### 5.4 The disc magnet latch

What it does: holds the flip (or lid) shut with glued disc magnets, opposite poles facing.

Constants: `latch {kind 'none', d 6.2, h 2.2}` (`SRC/part2.js` line 56); the CLAMSHELL example uses 4 x 2.

Construction: pockets `d + 0.2` diameter (radius `d/2 + 0.1`), depth `snapLayers(h + 0.1)`. FLIP: two pockets in the bezel at `x = plus or minus W/4` in a band `d + 2.4` at the flip's far end (`buildBezel` lines 333 to 339), and two in the flip ring's top band (`buildFlip` lines 445 to 451). CLAMSHELL: bosses `d + 2.4` square merged into the lid's far wall at `x = plus or minus (W/2 - c - 9)` with the pocket in the top band (`buildLid` lines 483 to 494). The bezel thickens to `snapLayers(h + 0.96)` when needed and warns ("bezel thickened to 3.12 for the magnet pockets", measured in `k08`). Print card line: "N disc magnets d x h, glued, opposite poles facing" (`SRC/part5.js` line 69).

### 5.5 The flip plate and the acrylic panel pocket (insert)

What it does: a plate with a pocket on its inner face that holds a laser cut acrylic panel at a friction fit, or a keypad.

Constants: `flip {len 60, autoLen true, t 4.8, panel 'acrylic', panelT 3.0, pocketClr 0.15, margin 4}` (`SRC/part2.js` line 54).

Derivation: `TF = max(snapLayers(flip.t), snapLayers(pocketD + snapLayers(inlay + 0.72)))` so the floor under the pocket keeps the inlay plus three layers; auto length `FL = round(2 ((win.cy - win.h/2 - 1.5) - yb)) / 2`, lengthened for a keypad, minimum 20; "flip covers the screen window when closed" if it would.

Construction (`buildFlip` lines 423 to 463): floor from z 0 to `TF - pocketD` with the outer art zone cut as a hole; ring above with the pocket (`W - 2 margin` by `FL - band - max(margin, 2.6)`, corner r 2.0; keypad `kp + 0.4`, r 1.5). With a keypad and a cable bay, `loopWithChannel` merges the pocket into the outer loop through a channel to the hinge edge so the ring stays one simple polygon. Panel size `pocket - 2 pocketClr`, corner r `max(0.3, 2.0 - clr)`. Print card: "slide the acrylic panel into the flip pocket (friction fit at 0.15 clearance, a dot of CA at two corners if loose)."

CLAMSHELL lid (`buildLid` lines 466 to 506): a tray the size of the body with its own walls; four corner posts up to the panel underside `TF - panelT`; panel `IW - 2 clr` by `IL - 2 clr`; an optional lid battery under the panel.

### 5.6 Laser companion parts

What it does: turns the panel zone, the lens and the bezel lower inlay into cut files for a laser.

`SRC/part5.js` lines 80 to 126: `panel.svg` holds a red 0.1 hairline cut path (rounded rectangle) and the engraving as an embedded PNG at `res` px/mm with `image-rendering:pixelated`; `panel.dxf` holds one closed LWPOLYLINE on layer CUT with `$INSUNITS 4` (no `$ACADVER`); `panel-engrave.png`; optional `lens.svg/.dxf`, `lower-inlay.svg/.dxf` (r 1.85); `README-laser.txt`: "on fluorescent stock engrave the BACK face mirrored so the glow reads through the front". Shipped example: panel 93 x 36.2 from 3 mm fluorescent acrylic `#39FF14`, corners r 1.85 (`F/print-card.txt`).

### 5.7 The prism kernel `K` (no CSG)

`SRC/part3.js` lines 5 to 160. Every solid is a closed prism; solids of one slot overlap by design (posts 0.5 into walls, bands 0.02) and are concatenated per slot at export with no union; the slicer unions them.

| function | algorithm |
|---|---|
| `K.snap` | round to 1e-6 |
| `K.dedupe` (10 to 29) | snap, drop consecutive duplicates and the closing duplicate, then repeatedly drop forward collinear midpoints (cross under 1e-7, dot over 0). Comment: earcut drops collinear boundary vertices, which would T junction the walls |
| `K.arc`, `K.circle` | `segs(r) = max(6, min(24, ceil(2.2 r)))` per quarter |
| `K.roundRect`, `K.chamfRect`, `K.plate` | radius or chamfer clamped below half the side |
| `K.teardrop` (56 to 61) | arc from 135 deg round the bottom to 45 deg plus an apex at `cv + r sqrt2` |
| `K.slot` | stadium |
| `K.rectNotched` (69 to 75) | a rectangle with notches cut down from the top edge |
| `K.prism` (82 to 111) | dedupe, outer CCW, holes CW, earcut, caps and side quads per loop; `MAP` remaps (u, v, w) for planes z, x (outline in y, z) and y (outline in x, z); flips if the signed volume is negative; throws on `b <= a` or a degenerate outline |
| `K.audit` (149 to 158) | coordinate keyed edge pairing at 5 decimals; returns the count of undirected edges not shared by exactly two faces |

### 5.8 Art zones (raster in XY, exact in Z)

Four zones: `flip` (flip or lid outer, bed face, mirrored in y), `lower` (bezel lower, top face), `back` (tray floor, bed face, mirrored in x), `panel` (virtual: composed only, becomes the laser engraving). Layer kinds (`paintLayer` lines 194 to 277): `text` (four fonts, `|` splits into slot and slot2, arc radius, letter spacing), `shape` (rect, ellipse, ring, frame, diamond, chevrons, slots, cactus), `rain` (seeded LCG `s = (s 9301 + 49297) mod 233280`, glyph set `0-9A-FXZ<>/\|[]{}#$%&*+=:;`, 12 percent dropout), `mark` (hack.build arc in slot, wrench in slot2, verbatim paths, viewBox 117 103 800 800), `image` (mono threshold or silhouette, invert). Every layer has `cut` (opens through into the pocket or bay) and `mute`.

`composeZone` (282 to 323): a grid of `(w + 0.12) res` by `(h + 0.12) res` cells with a 0.06 bleed ring forced to the host slot; each layer painted to a canvas as alpha, over 127 writes the slot (inside the zone) or a cut (inside minus `cutMargin`, 1.0, or 0.4 for the virtual panel); then per non-host slot `RasterMesh.dilate` by `boost res`, `open` with radius `floor(minF/2 res)`, `despeckle` at `round(0.35 pi (minF/2 res)^2)` cells, and `gap`. Defaults `print {layer 0.24, minF 0.6, boost 0.1, gap 0, res 6}`.

`zoneBlock` (327 to 348): mirrors per axis, clamps the inlay so one solid layer remains, stacks an art slab and a body slab in `RasterMesh.volume`, runs `fixPinches` (warns above 0.2 percent of cells), meshes per slot. The zone rectangle is a hole in the host prism; the 0.06 bleed overlaps the hole edge. Inlay depth `shell.inlay` 0.72 (three layers).

### 5.9 Exports and the print card

| kind | content (`SRC/part5.js`) |
|---|---|
| 3MF | `Orca3MF.build(pkgConfig())`: two objects (`knuckle-shell`, `knuckle-bezel`), parts merged per slot named `<slot name>-<n>`, origin at each object's bed min corner, positions from `bedLayout`; printer and process names, preset pattern `Generic {TYPE} @FF C5P`, filament block written |
| STL zip | per object per slot STL, `print-card.txt`, `design.json` |
| laser zip | section 5.6 |
| print card | Orca3MF card, dims, hinge line, board mounting hole table from the board centre and corner, display and window, USB, keypad, panel, lens, inlay, latch, lanyard, PRINT and ASSEMBLY lines, warnings |
| json | `{app: 'knuckle-bench', v: 1, state}` |
| png | all zone label grids side by side |

`bedLayout` (555 to 571): shell left and bezel beside it with 3 mm margins if `sw + zw + 9 <= bedW`, else stacked; a misfit warns and suggests side lanyard tabs.

### 5.10 Constructions the first pass left out (checker, 2026-10-05)

Each item below was read from the code named in its row; no run stands behind the behaviour except where marked.

| construction | code | how it is made |
|---|---|---|
| bezel lower acrylic inlay | `SRC/part4.js` `buildBezel` lines 347, 364, 385, 417; `SRC/part5.js` lines 68, 121 | with `shell.lower = 'acrylic'` and more than 8 mm between `zoneTop` and `zoneBot`, the lower art zone is replaced by a pocket `IW - 2 post - 2` wide, corner r 2, `snapLayers(1.6)` deep from the outer face (1.68 at 0.24 layers, computed). The overlap police treats it as a zone. The laser bundle cuts a matching part 0.3 smaller in each axis with r 1.85 (`lower-inlay.svg` and `.dxf`), and the print card lists it as 1.5 mm acrylic. The ghost sits 0.15 inside the pocket at `HF - 1.6 + 0.05` |
| flip magnet band floor clamp | `SRC/part4.js` `buildFlip` lines 445 to 451 | the flip ring is split at `zm = max(floorZ + 0.24, TF - magD)` so at least one layer of ring stays under each magnet pocket even when the pocket is deeper than the ring; both ring bands overlap by 0.02 |
| magnet pocket placement on the flip | same | pockets at `x = plus or minus W/4`, `y = y0 + band/2` with `band = d + 2.4`, which is the same band the bezel reserves at `flipFar - band/2`, so the pairs face each other when closed (inferred from the matching formulas) |
| corner screw drop | `buildBezel` lines 408 to 414 | a bezel column (r 2.5 disc, 5 x 5 test box) that overlaps the display module grown by 0.4 is not built and warns "display module sits on a bezel column, that corner screw is dropped"; `D.columns` counts the survivors |
| bezel locating lips | `buildBezel` lines 391 to 406 | four bars inset 0.15 from the cavity wall, 1.0 wide, from `H - 1.2` to `H + 0.02`, ends kept `max(c, wallT) + 0.5` from the corners |
| keypad face aperture | `buildBezel` line 357 | a body keypad opens a rounded window `kp + 0.6` (0.3 per side), r 1.5, policed last |
| face apertures | `buildBezel` line 358 | rows in EXTRA APERTURES with `wall = 'face'` become bezel holes at `(along, yc + z)`, round or r 0.8 rectangles |
| hardware ghost cells | `buildTray` lines 306 to 309, `buildLid` lines 500 to 503 | the cell count is parsed from the battery id (`x2`, `x1`); cell diameter `min(bay - 3, w / cells - 1)`, centred `0.5` under the board |
| build time warning | `build` line 551 | a build over 4500 ms warns "build over 4.5 s, drop the art resolution" |
| pinch heal warning | `SRC/part3.js` lines 344 to 345 | `fixPinches` runs on every zone volume; above 0.2 percent of cells it warns "N pinch cells healed, art is at the resolution limit" |
| bed fit hint | `build` line 549 | a misfit names the shell footprint and, for ear or corner lanyards, suggests side lanyard tabs |
| keyboard and drop | `SRC/part6.js` lines 393 to 400, 549 to 552 | ctrl or cmd Z undoes, shift Z or Y redoes; a dropped `.json` loads a design, a dropped image becomes an image layer |

---

## 6. UX anatomy

### 6.1 Shell and steps

`SRC/part1.html`: ink header with the hack.build mark, `KNUCKLE.bench` in Permanent Marker, tagline "flip phone badge cases. print in place hinge, lasercut panels, real parts.", UNDO, REDO, OPEN, SAVE, GUIDE. Step strip 1 BADGE, 2 SHELL, 3 STYLE, 4 PRINT (visited steps turn green). Guide line: VT323 pink step name plus a Special Elite goal sentence (`SRC/part6.js` lines 193 to 198). Tokens `--pink #FE0386`, `--cream #f5f0e6`, `--paper #fffdf7`, `--ink #1a1a1a`, `--void #0a0a0a` (part1 lines 12 to 16).

### 6.2 Rail panes

| step | panels |
|---|---|
| BADGE | ARCHETYPE (two tiles with inline SVG), DISPLAY (library, module, active, offset, mount, stack, on board, auto), BOARD, BATTERY, PORTS, KEYPAD, EXTRA APERTURES (table) |
| SHELL | SHELL, BEZEL, FLIP or LID, HINGE, LATCH, READOUT (closed, open flat, body, flip, board sits, axis, closed gap) plus warnings |
| STYLE | FILAMENTS (1 to 4 chips, colour, name, material, role), PARTS (slot per body, bezel, flip; inlay depth), ACRYLIC (panel and lens finish, engrave mode), ART (zone chips, layer list, add text, shape, rain, mark, image), LAYER (properties) |
| PRINT | PRINT REALITY (layer, min feature, stroke boost, colour gap, despeckle, art res, auto rebuild), PLATE (bed, folded slicer profile), EXPORT (buttons and per slot grams, objects, plate, tris) |

Library rows prefill and stay editable; `markEdited` flags an input whose value differs from the library entry (`SRC/part6.js` lines 247 to 250). Notes carry provenance ("verified", or a tilde for community consensus).

### 6.3 Stage, cams and the open pose

Cams strip iso, top, front, side, under. HUD: ASSEMBLED or PRINT BED, an `open` slider 0 to 180 that rotates the flip group about the hinge axis (`gFlip.rotation.x = -(180 - open)`, flip meshes offset by `-zax` inside a group placed at `zax`; `VIEW.pose` lines 168 to 175), an explode slider (bezel up 26 mm, panels 10 to 14 mm; on the bed each slot lifts `14 (slot - 1)`), HARDWARE and PANELS toggles. Hardware ghosts: board, display with a canvas screen texture, cells as cylinders, LiPo box, keypad with proud keys, USB, SMA, magnets, screws. Acrylic materials per finish: fluor (opacity 0.78, emissive 0.6 of the colour), clear 0.3, tint 0.62, frost 0.88, opaque, mirror; the engraving shows as a NearestFilter decal on the panel's inner face.

### 6.4 Face editor

On STYLE the stage splits (3D 42 percent, face canvas the rest). Hint: "drag moves, corners scale, dot rotates, wheel zooms, right drag pans, alt off snaps, arrows nudge, delete removes". Layer bounding boxes come from painting the layer at 3 px/mm and scanning alpha, cached by a JSON signature of the layer minus placement (200 entries). HANDLE 5, ROT_STEM 26, HIT 9; centre snap within 0.6 mm; rotate snaps to 0, 90, 180 within 4 deg, shift gives 15 deg steps. The canvas draws the exact print raster after a build and a 4 px/mm preview while dragging, and says which (`print raster`, `engrave raster`, `preview`).

### 6.5 Commit model, readouts, warnings

`touch()` previews only; `commit()` marks dirty, bumps `ST.rev`, snapshots history (450 ms debounce, 80 deep) and rebuilds 300 ms later; `runBuild` queues one rebuild while building. Status strip: closed dims, tris, ms, chips "fits bed" or "over bed", "mesh current" or "mesh stale", one chip per warning. Fonts load before the first build because canvas `fillText` falls back silently (boot comment, `SRC/part6.js` line 620).

### 6.6 What makes it excellent

1. One `derive()` feeds the builders, the readout, the hardware ghosts and the print card, so the numbers a person reads are the numbers that print.
2. Every clamp names its new value in a warning, and failure still builds.
3. The hinge is solved from the stack (axis at the fold height), not typed, and swept numerically on every build.
4. The open slider makes the print in place joint visible as a joint.
5. Every dimension that comes from a bought part is editable, prefilled from a library with provenance notes.
6. One shell object plus a bezel on one plate, with a laser bundle and a print card that lists the four board mounting holes for the board designer.

### 6.7 Flaws a port must not copy

The art composer needs a DOM canvas, so the kernel cannot run in node (`SRC/part3.js` line 294). The hook has no `rev`, `built` or `busy`; harnesses poll `!dirty && !building`. The DXF has no `$ACADVER`. M10-T15 records a 5 px overflow at 390 wide.

---

## 7. Tests and harness

| harness | what it does |
|---|---|
| `SRC/t2.py <tac or clam>` | Playwright on swiftshader: boot to `BENCH.ready`, click the example, wait for `BENCH.model().objects && !dirty && !building`, print tris, ms, warnings, dims and `BENCH.audit()`; screenshots open, closed, side, under, bed, four face zones, shell and print steps; every export through `BENCH.exportBytes`; design JSON round trip compared on `state` |
| `SRC/sweep.py [case]` | nine named variants as JS snippets (kpflip, kpbody, deluxe, thin2, clamlatch, tft35, blank, blankclam, usbleft18650); each builds, reports tris, ms, warnings, dims, audit and bed fit, screenshots, exports a 3MF and runs `validate_3mf.py --overlap --quiet` |

Both harnesses point at `/home/claude/flip/out/knuckle.html` and `/mnt/skills/plugins/print-forge/scripts/validate_3mf.py`, so they need path edits to run here. README validation list: `validate_3mf.py --overlap` green on both examples and nine variants, every prism edge paired, every mesh watertight after vertex merge, lib3mf manifold, filament vectors the right length, design JSON round trips, no console errors, no horizontal overflow at 390, 768, 1280, hinge sweep clear on every variant. "Only you can do": the Flash Studio round trip and printing the hinge. No node test, no seeded random sweep, no liveness test, no islands test.

Drive 2026-10-05 (measured): ready in 6.1 s (`readyMs` 6103 in the log); FLIP, CLAMSHELL and the chamfer plus magnets plus lens variant built; audit 0; 0 errors.

---

## 8. How to make a new thing this way

1. Hold the design as one state object with a blank and an example constructor; libraries prefill editable fields and flag edits.
2. Write one `derive()` that turns state into every dimension, clamps with a warning that names the bound, and snaps every height to the layer.
3. Build each part as closed prisms in its own plane; carry wall apertures as holes in the wall bar and turn any that reach the top into notches.
4. Build the print in place hinge from two profiles and one rod: odd count, body owns both ends, teardrop bores on the moving side, rod with 0.15 flats, axis at `(HF + TF + gap) / 2`, arm under the closed part.
5. Sweep the moving part about the axis in 2 deg steps against the fixed profile and wall on every build.
6. Stack face features in z bands; build chamfers as layer steps; police overlaps in a stated priority.
7. Put art in raster zones over a hole in the host prism with a 0.06 bleed and hygiene per slot; mirror bed faces.
8. Emit a laser companion for every printed pocket that holds a cut part.
9. Export one 3MF with filaments, an STL zip with the card, the laser zip, and the design JSON; put the board mounting holes on the card.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (prism route, `K` with dedupe and audit; raster route through the seed `rastermesh.js`), `inlay` (art zones, composer), `hackbuild-3mf` (seed `orca3mf.js`), `sim` (sweepCheck as a 2D swept point test), `constraints` (derive clamps with reasons), `catalog` (DISPLAYS, BATTERIES, KEYPADS, MOUNTS, STACKS with provenance notes), `ui-core` (open pose slider, face editor), `nest` or a `companion` exporter for the laser bundle |
| feature kinds | hinge, bore (teardrop), pocket (panel, magnet, lens rebate, art), screw (counterbore, column, post), chamfer (stepped bands), window; kinds it needs that are not admitted: `magnet`, `insert`, `aperture` (promote to notch), per `fab-knowledge:synthesis/mappings.md` line 149 and `docs/plan/milestones/M10-chase.md` M10-T15 |
| canon id | MISSING. `docs/plan/CANONS.md` section 8.3 lists "print-in-place knuckle hinge with continuous rod" (KNUCKLE, LOCKET R2) with no id, landing as the `hinge` kind reference at M10. No canon entry for the disc magnet latch, the friction fit acrylic panel insert, the stepped window chamfer or the lens rebate |
| reference id | `joints/pin-hinge-inplace` (INDEX, LOCKET R2) is superseded by `joints/knuckle-hinge` (M11 table, to be written at M10-T15); `joints/magnet-pocket` and `joints/panel-insert` are proposed ids in M10-T15; `cases/flip`, `cases/clamshell`, `cosmetic/acrylic-engrave-panel` are proposed in `synthesis/mappings.md` line 149. None exists under `reference/` on 2026-10-05 (MISSING) |
| milestone | M10-T15 (KNUCKLE from a chase, with a headless kernel); legacy folder M10-T01; KNUCKLE 3MFs in the M00 legacy corpus row |
| lineage rows | MISSING: no row in `lineage.json` for `SRC/part3.js` (K, composeZone), `SRC/part4.js` (derive, buildHinge, sweepCheck, buildBezel), `SRC/part5.js` (laser bundle) or the vendored kernels as inlined here |
