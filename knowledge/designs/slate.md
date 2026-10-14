# SLATE: how it is made

Record written 2026-10-05 from the original code. Slug `slate`. Family cases-joinery: the Casting Call clapperboard card case, its r5 and r6 three knuckle barrel hinge with a printed D pin, its gooseneck latch, and the two colour raster inlay of the slate graphic.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Measured" numbers come from the headless drive of the shipped r6 page on 2026-10-05 (config `fab-knowledge:originals/slate/shots/_drive.json`, log `_drive-log.json` beside it) or, where marked, from the mesh counts in `fab-knowledge:sources/downloads/dl-cases.md` section 2 (edges not used twice, exact vertex index). "Computed" numbers were worked by hand from declared values.

Short paths: `F` is `fab-knowledge:originals/slate/files/`. `APP` is `F/extracted/slate-r6-app.js.txt`, the one inline app script of `F/slate-r6.html` cut out at html line 230; an `APP` line number plus 229 is the line in `slate-r6.html`. The script is the baked concatenation of part2.js (APP 2 to 240), part3.js (241 to 815), part4.js (816 to 1212) and part5.js (1213 to 1697).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SLATE r6, Casting Call clapperboard case |
| owner's slug | slate |
| canonical file | `F/slate-r6.html` (title "SLATE r6 / casting call clapperboard case") |
| sha256 | 0d34c2e15886c0b94084821847e23e3b2d3f7b6cbed101ca58fed8425932d92a |
| bytes | 1242848 |
| date | 2026-09-05 15:00 (Downloads mtime) |
| companion export | `F/slate-r6.3mf`, 2026-09-05 15:01, sha256 d8ced09dae92924c13301024e38272a8ed963dac219cff8d038f6b633a28a9cd |
| runtime | three.js r128 plus OrbitControls and JSZip as base64 data script tags (html lines 226 to 228), five fonts as base64 woff2 (Permanent Marker, Special Elite, IBM Plex Mono 400 and 700, VT323); opens from `file://` offline |
| print target | Flashforge Creator 5 Pro 0.4 nozzle, `0.24mm Standard @FF C5`, PETG black and white |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-cases.md` section 2; copies in `fab-knowledge:evidence/x/downloads/dl-cases/slate/`.

| date | file | sha256 prefix | hinge and notes |
|---|---|---|---|
| 2026-09-04 18:01 to 18:37 | Casting Call Compact Clapperboard Designer v4 and v5, three 3MFs | 6d75ba00, 8f61dd90, f7975096, 6a1ca3da, f3a4d880 | the single material designers SLATE replaced; square pin hinge; every solid a 12 triangle box; three solids with negative volume |
| 2026-09-04 21:01 | `slate.html` | 08281693 | five knuckle print in place hinge, lidH 13 |
| 2026-09-04 21:57 to 22:45 | `slate (1)`, `(4)` | 023221a6, de9767ec | first C socket ears; spring barb latch into a window |
| 2026-09-04 23:41 | `slate (7).html` = harvest | 94dddad3 | outboard end hinge, C socket ears on posts with gussets, spring barb latch; source zip with check.py, sweep.py, shots.py (`F/precursor-sep04/`) |
| 2026-09-05 01:19, 01:50 | `slate (8)`, `(9)` | 2091d4b2, 08a6d126 | printed split pin through two lugs; then cheeks with a corbel, gooseneck latch first appears |
| 2026-09-05 02:47 | `slate-r3.html` | e6a71d93 | r3 "flush end": the stick flush with the slate at both ends |
| 2026-09-05 03:16 | `slate-r4.html` | 946e9603 | r4 three knuckle barrel; stick knuckle roofed by a tangent cone |
| 2026-09-05 03:23 | `slate-r5.html` | 9e93bacc | r5: the stick knuckle gets a solid shoulder welded to the top plate along 2 rk times its length |
| 2026-09-05 11:49 | `casting-call-slate.3mf` | b9bc1d41 | r5 export after an owner open and save in Flash Studio (OrcaSlicer 2.3.2) |
| 2026-09-05 15:00, 15:01 | `slate-r6.html`, `slate-r6.3mf` | 0d34c2e1, d8ced09d | r6: EPS overlaps at five seams; latch tongue root overlaps past the slit |
| 2026-09-06 07:28, 16:03 | `table-read-slate.json`, `.3mf` | 9e8011a3, 7d57e147 | a second title, TABLE READ, on the r5 and r6 state; owner Flash Studio save |

### 1.2 Why r6 and what r5 is

r6 is the newest and the better one. It differs from r5 in eight lines over five hunks (diff of `F/extracted/slate-r5-app.js.txt` against `APP`, 2026-10-05): `EPS` overlaps added where the hinge end wall notch meets the wall (APP 609), at both body knuckle halves (652 to 653), at the stick's front and back walls (664 to 665), at the stick's top plate cut zones (667 to 668), and the latch tongue root now runs `tongue + slit + 1.0` so it overlaps the plate past the slit (707). Those overlaps took the body black mesh from 253 to 13 edges not used twice and the lid from 11 to 3 (measured, dl-cases.md section 2). The r6 drive built with no warnings, 0 errors, 124.4 g, and the stick opens to 154 deg (measured). r5 is kept in `F/r5/` because the owner printed it through Flash Studio (`F/owner-saves/casting-call-slate.r5.orca232-save.3mf`) and because CANONS cites r5 and r6 together.

The Sep 4 23:41 build (outboard end hinge with C socket ears, harvested with its source zip) is the precursor whose ears the plan calls janky; the barrel hinge replaced it on Sep 5. Its harness and print audit idea are recorded in section 7 and its socket and latch in section 5.7, so nothing it proved is lost.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `slate-r6.html`, `slate-r6.3mf` | canonical bench and its two colour export |
| `extracted/slate-r6-app.js.txt`, `extracted/slate-r5-app.js.txt` | the app scripts cut from the two html files, for reading and diffing |
| `r5/slate-r5.html` | r5 |
| `owner-saves/` | `casting-call-slate.r5.orca232-save.3mf` (owner Flash Studio save of the r5 export), `table-read-slate.json` and `.3mf` (the TABLE READ title) |
| `precursor-sep04/` | `slate-src.zip` (part1 to part5, build.py, check.py, sweep.py, shots.py), `README.md`, `print-card.txt` of the Sep 4 23:41 build |

Hashes: `fab-knowledge:originals/slate/SHA256SUMS`.

---

## 2. What it makes and for whom

A two colour printed case for the Casting Call improv card game: 256 mini cards in four decks plus a folded zine, made to look and work like a film clapperboard. The body is the slate with the graphic on its show face; the lid is the clapstick, striped across the seam so the stripes line up when shut; the stick swings on a three knuckle barrel hinge with a printed pin and clicks shut on a gooseneck latch. Welcome text (html line 221): "the lid is the clapstick. it swings on a plain three knuckle barrel hinge with a printed pin, the way a real slate does, and clicks shut on a keeper latch. body upright, stick inverted, pin on its flat: every part loaded along its layers, no supports anywhere."

Default dimensions (`dims()`, APP 64 to 94; measured in the drive):

```
card 44.45 x 63.5, t 0.397 ; fit slot +1.0, depth +1.2, height +3.6
slots = count x 0.397 + 1.0 -> SCENE 64: 26.41, STORY 64: 26.41, TWIST 32: 13.70, CHARACTER 96: 39.11
IW = sum(slots) + 3 x 1.2 = 109.23        W = IW + 2 x 2.0 = 113.23
ID = 44.45 + 1.2 + (3.0 + 0.8 zine) + 1.2 = 50.65     D = 54.65
IH = 63.5 + 3.6 = 67.1 ; bodyH = 1.6 + IH = 68.7 ; H = bodyH + lidH 14 = 82.7
```

Measured r6 build: 8,937 solids, 142 ms, no warnings, opens to 154 deg, 124.4 g PETG, bed used 183.98 x 117.3 of 256 x 256. The r6 3MF `slice_info` reports black 118.55 g and white 5.84 g, 124.39 g (dl-cases.md).

---

## 3. Shots

Driven headless on 2026-10-05 (1280 x 860). Copies in `fab-knowledge:originals/slate/shots/`.

| file | caption |
|---|---|
| `s01-welcome.png` | The welcome veil: SLATE, one sentence, the four step cards and START / OPEN A DESIGN. |
| `s02-assembled-iso.png` | The closed clapperboard in iso: black PETG body with the white inlaid slate (PRODUCTION, CASTING CALL, ROLL 4, SCENE 256, TAKE 1, DIRECTOR YOU, CAMERA THE AUDIENCE, DATE TONIGHT, SOUND APPLAUSE), stripes running from the body's fixed band up across the seam onto the stick, the barrel knuckle on the top hinge end corner with the pin's tail recess showing. Rail at 1 CARDS with ONE CARD and DECKS (each slot's width in mm). HUD: outside 113.23 x 82.7 x 54.65, inside 109.23 x 67.1 x 50.65, seam at 68.7, opens to 154 deg, 256 cards in 4 slots. |
| `s03-open-hinge-step3.png` | OPEN at 100 deg: the stick standing on its knuckle, the four deck slots with ghost cards and the zine, finger scallops in the back wall. Rail at 3 SLATE with SHELL, ZINE RAIL, FINGER SCALLOPS and HINGE (pin 6, bore clearance 0.2, axis 3 above the rim, knuckle r 5.5, length 8, seam 0.3, axial 0.4, barb 0.35). |
| `s04-open-side.png` | The same pose from the side: the stick's top plate and its latch finger standing up, the slate face edge on. |
| `s05-exploded-pin.png` | EXPLODED: the stick lifted, the D pin pulled out of the knuckles, the two body knuckles in the show walls and the stick's long knuckle between them. |
| `s06-board-face.png` | 2 BOARD from the front: the face preview canvas (the graphic as drawn, with the seam line) above TITLE BLOCK and FIELDS; the 3D front view shows the inlay as printed. |
| `s07-print-bed.png` | PRINT BED at 4 PRINT: body upright on its floor, stick inverted on its top face, pin lying on its flat beside them; status chips 124.4 g, 8937 solids, 142 ms, bed 183.98 x 117.3, "no supports needed". |

---

## 4. Build pipeline and code map

The r6 html is a baked page with no source zip of its own. The bake pattern is the one in `F/precursor-sep04/slate-src.zip` `build.py`: part1.html (markup, theme, placeholders) plus base64 three r128, OrbitControls, JSZip and the fonts, then part2.js to part5.js in one classic script. Globals (`ST`, `MODEL`, `build`, `rebuild`, `build3mf`, `buildStlZip`, `printCard`, `blankState`, `prismTris`, `exportGeom`, `massOf`, `tab`) act as the test hook.

| range in APP | contents |
|---|---|
| 7 to 13 | `MATS` (PETG nz 250, bed 80, density 1.27, cost 24/kg; PLA, ABS, ASA, TPU) |
| 16 to 60 | `blankState()` with the hinge and latch comments |
| 64 to 94 | `dims()` |
| 96 to 162 | prism soup kernel: `box`, `poly`, `circle`, `csock`, `earclip`, `prismTris`, `meshOf`, `volOf` |
| 164 to 239 | raster art: `greedy`, `dilate`, `label`, `despeckle`, `erode`, `thinFeatures`, `faceGrid` |
| 243 to 345 | `EPS = 0.012`, text helpers sized by cap height, `drawSlate`, `drawBack` |
| 348 to 381 | `artPrisms` |
| 385 to 510 | 2D helpers: `bitten`, `notchedWall`, `knuckleHalves`, `beadHalves`, `pinSections` |
| 512 to 578 | sweep: `pointInPoly`, `insidePrism`, `samplePrism`, `sweepCheck` |
| 581 to 779 | `build()` |
| 782 to 814 | `printLayout`, `printTf`, `tfPrisms`, `trisOf` |
| 820 to 1052 | `indexTris` (4 decimal weld), `exportGeom`, `massOf`, `FIL_KEYS` (77 keys), `filValue`, `projectSettings`, `build3mf` |
| 1055 to 1081 | `stlBin`, `buildStlZip` |
| 1084 to 1156 | `printCard` |
| 1159 to 1211 | download, `export3mf`, `exportStl`, `exportCard`, `exportJson`, `importJson` |
| 1218 to 1452 | control builders and panes CARDS, BOARD, SLATE, PRINT |
| 1455 to 1592 | viewer, `renderModel`, `frame`, `setCam`, `drawFace` |
| 1595 to 1697 | legend, HUD, status, `touch` (140 ms), `rebuild`, boot after the five fonts load |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The prism soup kernel

Solids are `{t:0}` axis aligned boxes or `{t:1}` polygon prisms extruded along x, y or z (`AXMAP`, APP 137). `poly` drops repeated consecutive points first "which ear clipping turns into unpaired edges" (APP 100). `prismTris` reorients CCW, ear clips the cap and emits caps and side quads (APP 138 to 157). Neighbours overlap by `EPS = 0.012` so the slicer has a defined union; the meshes are soup by design. The r5 to r6 change (section 1.2) is the lesson: every seam between two solids that should weld needs the overlap, or the slicer sees open edges. Mass is the sum of prism volumes (`volOf`), within 0.1 g of the slicer because overlaps are 0.012 thick.

### 5.2 The three knuckle barrel hinge (r5 and r6)

What it does: hinges the clapstick on the top hinge end corner. Each show wall carries one body knuckle; the stick carries one long knuckle between them; a separate printed D pin runs through all three.

Constants (`ST.hinge`, APP 32 to 33): `pin 6.0, clr 0.20, up 3.0, rk 5.5, knuckle 8.0, seam 0.30, axial 0.40, barb 0.35, cb 0.15, slit 1.0, prong 12, recess 1.0`.

Derived (APP 78 to 79 and the print card): axis `hx = W`, `hy = bodyH + up` (on the outer face of the end wall, 3 mm above the rim); `R = rb = rk = 5.5`; D flat `(pin/2)(1 - sqrt(1/2)) = 0.879` (computed); bores `pin + 2 clr = 6.4`; stick bearing `D - 2 knuckle - 2 axial = 37.85` (computed); tail recess `pin + 2 barb + 2 cb = 7.0` dia, 1.0 deep.

Construction, in build order (`build`, APP 606 to 735):

1. Hinge end wall: full height below `bH - notch` with `notch = max(0, R - up + 0.3)`, and above that only at the two knuckle zones `0..knuckle + axial` and `D - knuckle - axial..D`, so the stick's knuckle (which dips `R - up` under the rim) has room (APP 607 to 611).
2. Body knuckles (`knuckleHalves`, APP 436 to 470): a round of radius R on the axis split on the pin axis into two halves so each carries half a bore without the kernel knowing about holes. Outboard below the axis a 45 deg corbel runs from the tangent point down to the end wall face (`yc = -R sqrt2`). Inboard, where the round hangs over the inside of the box, its underside is a 45 deg flat rising from the wall's inner top corner (solved where `sin + cos = (yi + xi)/R`). The bore is a teardrop with its apex up (`tearUp`, flank 45). Each face gets two z ranges: `0..recess` with the tail recess bore `pin/2 + barb + cb`, then `recess..knuckle` with the bearing bore `pin/2 + clr` (APP 648 to 655).
3. Stick (lid) tray (APP 657 to 691): the front and back walls and top plate are `bitten` profiles, a rectangle with a circular bite of `R + seam` about the axis (APP 390 to 408), so the stick wraps each body knuckle with 0.30 of seam. Between the bites the top plate runs full width (with the latch slits, 5.3) and the hinge end wall exists only below the knuckle; above the axis the knuckle's shoulder is the wall.
4. Stick knuckle (`beadHalves`, APP 473 to 498): a round of `rb` on the axis with a solid shoulder from the axis up to the top plate over its whole inboard half, so it is welded to the top plate along `2 rb` times its length, cut at 45 deg outboard so it prints inverted. The bore is a circle with a square bottom: inverted, a round trough with a flat bridge roof; the pin bears on the round side. r4 roofed this knuckle with a tangent cone to a point; r5 replaced the point weld with the shoulder (dl-cases.md section 2).
5. The pin (APP 715 to 736): a rod of `pin` dia clipped at the D flat `yf = pin/2 - flat` below the axis, length `D - 0.2`, in seven z sections: 0.45 tip at `r - 0.3`, barb at `r + barb` for `recess - 0.3`, split prongs to `prong` 12, solid middle, then mirrored; split sections are two arcs either side of a `slit` 1.0 vertical gap (`pinSections`, APP 503 to 510), plus one intermediate lead in step at `r + barb/2` between tip and barb. It prints lying on its flat so its layers run its length and the prongs flex sideways inside a layer.

Checks (APP 763 to 769): knuckle ring under 1.8 mm round the tail recess; knuckle dips under the rim into the card headroom (`R - up > fit.height - 0.5`); knuckle taller than the stick (`up + R > lidH - top`); bead wall under 1.6; axis must sit above the rim (`up <= 0.3`).

Sweep (`sweepCheck`, APP 549 to 578): lid solids (latch barb and art excluded) are sampled at their corners and edge midpoints; the stick rotates about `(hx, hy)` from 0 to 100 deg in 1 deg steps; a sample below `bodyH - 0.3` inside the case footprint, or inside a body solid near the rim with 0.05 tolerance, is a foul; then 101 to 185 deg in 0.5 deg steps finds `stopAt`, the angle where the stick rests against the box (154 deg, measured). The print card prints "it opens to about N degrees" and the open slider is capped there.

Fits and print (print card, APP 1141 to 1153): bore clearance 0.20 per side, axial 0.40, seam 0.30, bearing 8.0 per body knuckle and 37.85 in the stick, pin flat 0.879, tail barbs 0.35 proud into 7.0 recesses 1.0 deep. "if the pin is stiff, chase the three bores with a 6 mm drill. the pin bears on the round side of the bores; the D flat never touches." "steepest overhang is the 45 degree flat under each knuckle." No supports, no brim. Assembly: set the stick between the body knuckles, push the pin through from either face until the far tail clicks; pinch a tail to remove.

Limits: the hinge is sized to the case corner, so `up + R` must fit inside `lidH - top` and `R - up` must stay above the card headroom; both warn.

### 5.3 The gooseneck latch

What it does: holds the stick shut at the free end. A tongue cut free on three sides in the stick's top plate is the spring; a stiff finger hangs from its tip down the outside of the slate's end wall with daylight `gap`; a barb at the foot reaches into a keeper pocket in the end wall's outer skin. "the tongue is the spring and it lies flat on the bed in the inverted print, so the flex is inside the layers where a printed spring belongs" (APP 693 to 701). Push the foot away from the box to open.

Constants (`ST.latch`, APP 38): `t 2.4, tongue 8.0, slit 0.5, gap 0.4, grab 0.6, barbW 12, barbH 2.0, slop 0.6, reach 8.0, flare 2.0`.

Construction:

1. Keeper in the body (APP 595 to 604): the latch end wall is built from boxes leaving a pocket `grab` deep in its outer skin from `yk0 = yk1 - barbH - slop` to `yk1 = bH - reach`, width `barbW + 2 gap`; "the pocket's top edge is the retention face, a 0.6 mm overhang in the body print"; the top outer corner is chamfered `grab` at 45 deg as the barb's lead in.
2. Top plate slit (APP 669 to 675): the middle of the top plate is three boxes leaving a U slit of `slit` round the tongue (`barbW` wide, `tongue + slit` long).
3. Free end wall (APP 686 to 691): slit either side of the latch segment, so tab, finger and wall segment move as one stiff box and the tongue is the only spring.
4. Latch parts (APP 702 to 713): tongue and tab box from the finger out to `tongue + slit + 1.0` (r6: root overlaps the plate past the slit); finger `t` thick from the foot up to the tongue; end wall segment; barb box `grab - 0.15` in, `barbH` tall, flagged `det` so the sweep ignores it; a ramp triangle under the barb; a thumb flare at the foot.

Print card fit line: "latch 0.4 mm daylight, keeper 0.6 deep, barb reaches 0.45 in, 8 mm tongue"; "if the latch will not hold, raise grab by 0.1 and reprint the stick only."

### 5.4 Deck slots, dividers, zine rail and finger scallops

Slots are `count x card.t + fit.slot` wide (APP 66), so "Every slot is cut to its own deck thickness, so nothing rattles and nothing wastes space" (guide, APP 1263). Dividers run from `floor - 0.4` to `bH - 0.6`, T'd into the zine rail (APP 632 to 634). The zine rail is one plate behind the zine with a pinch dip in the middle (`min(24, 0.3 span)` wide, `min(dip, bH - floor - 8)` deep) built with `notchedWall` (APP 636 to 640). The back wall carries one U notch per deck, `scalW` 26 wide and `scalD` 11 deep, open at the top so they bridge nothing; a scallop that would run under the back lug is skipped with a warning naming the deck (APP 615 to 629).

### 5.5 The two colour raster inlay of the slate graphic

What it does: prints the clapperboard graphic (stripes, frame, title band, field grid) as a flush white inlay in the black show faces of both parts, continuous across the seam.

1. `drawSlate` (APP 277 to 338) draws in global box millimetres on a canvas: stripes at `ang` 60, `pitch` 15, `duty` 0.5 clipped to the stick plus a `fixed` 14 mm band on the body; frame inset 3.2, weight 1.1; title band weighted 2 against each field row; label and value share a baseline "the way they do on a real slate"; text sized by cap height through `setFont` (APP 246 to 251), and shrunk to fit with `fitTxt`.
2. `artPrisms` (APP 348 to 381): `faceGrid` at `res` 8 px/mm; dilate by `boost` 0.30 mm; despeckle at `0.35 pi (minF res / 2)^2` px; `thinFeatures` warns when a whole connected blob fails an erosion and dilation at radius `minF/2` (0.85 mm), because "diagonal edges always have single pixel tips, so a raw minimum run is useless as a warning" (APP 215 to 217); then greedy rectangles of art (slot 1, white) and background (slot 0, black) become boxes `inlay` 0.96 deep (four layers at 0.24), each overlapped by EPS.
3. Mirroring and masks: the drawing is the face seen from the front, so it is mirrored about the case width before it lands on the model; the stick's art is masked by its own bitten profile, because "the art layer tiles the whole face, so it needs the part's own silhouette or it lays background colour over ground that is not there" (APP 360 to 361, 743 to 745).

### 5.6 Print poses and the layout

`printTf` (APP 793 to 798), all proper rotations: body `(x, y, z) -> (x + xo, D - z + bodyY, y)` (upright on its floor); stick `(x, y, z) -> (x + xo, z + lidY, H - y)` (inverted on its top face); pin `(z - 0.1 + pinX0, x - hx + pinY, y - hy + yf)` (lying on its flat). `printLayout` (APP 782 to 790) puts the stick and pin in one row and the body behind with an 8 mm gap; a layout larger than the bed warns. Design rule from the precursor README: the two support free poses do not fold into one plane, so it is not print in place.

### 5.7 Precursor mechanisms kept on record (Sep 4 23:41 build, `F/precursor-sep04/`)

From `fab-knowledge:sources/benches/benches-cases.md` section 4 and the precursor README:

| item | value |
|---|---|
| outboard end hinge | axis `hx = W + off 6.0`, `hy = bodyH - drop 3.2`; rule `off >= drop` keeps the stick's underside at or above the rim for the whole swing |
| C socket ears | two ears 4 mm thick on 4 mm posts at 8 mm from each face, mouth 110 deg up, lip relieved from 5.0 to 4.0 over a 38 deg taper with a funnel lead in, bore `axle + clr` 2.8, a gusset 22 mm into the end wall; snap force about 16 N one time (README); this is CANONS `snap-c-socket-lip` |
| axle | 5.0 dia, continuous through three stick bands, 0.2 flat facing the socket mouth |
| spring barb latch | cantilever on the stick's free end, barb into a window in the end wall: w 18, t 1.4, entry 0.8, grab 0.6, barbH 2.4, window 0.6 taller than the barb; 4 mm centre post splits the window span; closing about 2.3 N at 0.4 percent strain (README) |
| print audit | per solid in print pose, the longest first layer run with nothing underneath; found a 15.4 x 109 slot, a 17 mm comb rail, an 18 mm window and 0.7 ledges; after fixes the longest bridge was 8.8 mm (README; the audit script is not in the zip) |
| "No brim on the body: it welds the socket mouths shut." | precursor README |

### 5.8 Constructions and checks the first pass left out (checker, 2026-10-05)

Read from `APP` at the lines named; behaviour inferred from the code.

| item | APP lines | how it is made |
|---|---|---|
| stick end wall under the knuckle | 678 to 679 | between the two cut zones the stick's hinge end wall is one box from `bH` up to `hy - sqrt(rb^2 - wall^2) + 0.3`, so it stops 0.3 inside the knuckle round; above that the knuckle shoulder is the wall |
| knuckle tail recess depth | 649 to 654 | the recess bore `pin/2 + barb + cb` (3.5 radius, computed) and the bearing bore `pin/2 + clr` (3.2) are both `tearUp` teardrops with a 45 deg flank, apex at `r / cos 45`; each z range is extended by `EPS` into the next |
| scallop depth and foot | 617 to 628 | depth `min(scalD, bH - floor - 4)`; each scallop is clamped so it ends at `foot = W - R - 1.0`, 1 mm short of where the knuckle meets the rim; under 8 mm wide it is dropped with "no finger scallop for NAME: it sits under the hinge lug. put a wider deck at the hinge end" |
| zine checks | 757 to 762 | "zine W mm wider than the N mm slot" against `W - 2 wall`; "zine H mm taller than N mm of headroom" against `bodyH - floor + lidH - top` |
| case checks | 770 to 773 | "print layout W x D exceeds the bed"; "cards taller than the interior"; "lid cavity under 3mm" |
| sweep foul warning | 572 to 574 | every lid solid with a sample that fouls at any angle up to 100 deg is counted once: "N lid solids foul the body while the stick swings" |
| sweep scope | 552 to 553 | only body solids whose top is above `bodyH - 16` are tested, and only boxes and z prisms on either side, so x or y prisms (none in r6) would be skipped |
| open pose cap | 1535, 1637, 1656 | the OPEN view rotates the stick group by `-min(open, stopAt)`; the slider max is set to the rounded `stopAt` on each rebuild; pressing OPEN with the slider under 5 deg jumps it to 75 |
| content ghosts | 749 to 753 | one ghost card block per deck, the deck's true thickness wide and centred in its slot, 0.5 behind the divider; the zine 0.3 behind the front wall |
| stale text | 792, 1266 | the `printTf` comment and the PRINT step guide both say "pin standing on its head", while the transform lays the pin on its D flat (looked at in `s07`, where the pin lies flat beside the stick); a port should take the transform, not the text |

---

## 6. UX anatomy

| element | content |
|---|---|
| header | `SLATE.` brand, "casting call // clapperboard case // r6 barrel hinge", GUIDE, AUTO BUILD toggle (manual BUILD * when off), SAVE, OPEN |
| rail | four numbered tabs 1 CARDS, 2 BOARD, 3 SLATE, 4 PRINT; keys 1 to 4 switch; a guide sentence per tab (APP 1262 to 1267) |
| CARDS | ONE CARD (w, h, t), DECKS (name, count, the slot width in mm live, remove, + ADD A DECK), FIT (slot slack, depth slack, headroom), ZINE |
| BOARD | face preview canvas with the seam line, TITLE BLOCK, FIELDS (rows of label and value, + FIELD, + ROW up to 5), CLAPSTICKS (stripes, angle, pitch, duty, phase, fixed stick), FRAME, BACK |
| SLATE | SHELL, ZINE RAIL, FINGER SCALLOPS, HINGE (every hinge field with a unit note), LATCH, INLAY (depth, raster, boost, min feature, drop specks) |
| PRINT | FILAMENT (two slots: colour, name, material), PROCESS (layer, nozzle, bed, printer, process, filament pattern), EXPORT (3MF TWO COLOURS, STL PACK, PRINT CARD, DESIGN JSON), CARD (the live print card text) |
| stage bar | ASSEMBLED, OPEN, EXPLODED, PRINT BED; ISO, FRONT, TOP, SIDE, BACK; CLAP slider 0 to the stop angle (OPEN jumps to 75 deg); contents checkbox (ghost cards and zine); legend |
| HUD | outside, inside, seam, opens to, cards |
| status | grams, solids, ms, bed used, warnings or "no supports needed" |
| welcome veil | four step cards, START, OPEN A DESIGN |

What makes it excellent: the object reads as the thing it is (a real clapperboard whose stripes cross the seam); the case grows from the deck list, so every slot fits its deck; the hinge is a real barrel hinge with a printed pin and every overhang is a stated 45 deg flat; the sweep finds the stop angle and the slider respects it; the print card says how each part lies on the bed and why.

Flaws a port must not copy: no source zip for r5 or r6 (the html is the only source); no undo; the hook is a set of loose globals; the sweep samples only corners and edge midpoints, so a thin feature between samples can pass (inferred); r5 left 253 open edges on the body before the r6 overlaps (measured, dl-cases.md).

---

## 7. Tests and harness

No harness ships with r5 or r6. The precursor zip (`F/precursor-sep04/slate-src.zip`) holds:

| file | what it checks |
|---|---|
| `check.py` | Playwright with swiftshader: boot, prism count, build ms, dims, slots, bed; per prism edge pairing (key at 3 decimals); lid prisms intruding the closed body; a hinge sweep 0 to 110 deg in 2 deg steps (around a leftover rear hinge pivot, so it did not test the shipped hinge, per benches-cases.md); mass per slot; 3MF structure (filament count, per filament array lengths, printer and process ids, objects, items, extruders, `slice_info`, `filament_sequence`, no `extruder_variant_list`); JSON round trip byte identity; writes the 3MF, STL zip and card; console errors |
| `sweep.py` | lid box corners rotated 0 to 90 deg in 0.5 deg steps about `(W + off, bodyH - drop)` against body boxes |
| `shots.py` | four screenshots |

In page on every rebuild: the build checks in 5.2 and the `sweepCheck`. The drive on 2026-10-05 is the only run of r6 here (measured: 0 errors, no warnings).

---

## 8. How to make a new thing this way

1. Let the contents size the box: slot widths from counts and card thickness, depth from the cards and the zine, height from the card height.
2. Build in prism soup with a fixed overlap at every seam that must weld; audit edges per part.
3. Put the hinge on the corner where the object's real hinge is, size every knuckle from one radius on one axis, and give every downward face a 45 deg flat.
4. Print the pin as its own part lying on a D flat so its layers run its length; split and barb its ends so it clicks into recesses.
5. Make the latch spring a tongue in a plate that lies flat on the bed.
6. Sweep the moving part about the axis and record where it stops; cap the pose slider there.
7. Draw art in model millimetres once, mirror it per face, mask it per part, and inlay it four layers deep with a thin feature warning.
8. Put the print pose, the fits and the fix for each fit on the print card.

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (prism soup with EPS overlap; raster art boxes), `inlay` (face raster with boost, despeckle, thin feature test, mask per part), `sim` (sweep with stop angle), `hackbuild-3mf` (Bambu dialect with 77 key `FIL_KEYS`, `filament_sequence` `[1, 2]`), `constraints` (hinge checks) |
| feature kinds | hinge, latch, pocket (deck slots), window (keeper pocket), bridge (none left), snap (pin barbs), per `fab-knowledge:synthesis/mappings.md` line 91 |
| canon id | MISSING as typed ids. `docs/plan/CANONS.md` section 8.3 lists "barrel hinge with printed D pin" (SLATE r5, r6, with the declared numbers above) and "gooseneck latch" (SLATE r5, r6) as candidates with no id; section 2.2 lists `snap-c-socket-lip` from the superseded Sep 4 build. No entry for the finger scallop back wall, the per deck slot rule, or the seam crossing stripe inlay |
| reference id | MISSING. `synthesis/mappings.md` line 91 proposes `joints/outboard-end-hinge` and `joints/latch-window` from the Sep 4 build; neither covers r5 or r6, and none exists under `reference/` on 2026-10-05. Proposed here: `joints/barrel-dpin` and `snaps/gooseneck-latch` |
| milestone | none assigned; CANONS section 2.3 holds the barrel hinge and gooseneck latch as candidates "beside the knuckle hinge" for M10; the r5 and TABLE READ owner saves are in the M00 owner save corpus row |
| lineage rows | MISSING: no row in `lineage.json` for `slate-r6.html` (knuckleHalves, beadHalves, pinSections, sweepCheck, latch block, artPrisms) |
