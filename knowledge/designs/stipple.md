# STIPPLE (OGEE R17b): how it is made

A 10 x 10 mechanically multiplexed pin display cut from 1.5 mm sheet with no pivot pins anywhere in the cell. Ten row combs and ten column combs stand on edge and pass through bridged slots in two horizontal decks; each pixel's link is a pin-free balance beam whose nose sits on a column tooth and whose boss sits in a row tooth slot, so its crown rises by exactly the mean of the two teeth. Twenty-one servos (10 row, 10 column, 1 latch) write a frame in ten cycles, one per row. This record says how it is built, from the original page, so a builder can make the next sheet machine the same way.

Number rule for this file: constants are read from the page's `DATA.P` (line 117 of `files/stipple-r17b.html`) or from the line named beside them; figures marked computed come from the downloads reader's ports (`files/derived/stipple_latch.py`, `stipple_outlines.py`) or by hand from `DATA.P`; figures marked stated are written in the page rail and were not reproduced; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/stipple/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | STIPPLE, rail subtitle "OGEE R17 . 10 x 10 . 21 servos"; the registry calls the cap-well revision R17b |
| slug | stipple |
| canonical revision | R17b, `~/Downloads/stipple (1).html`, 2026-08-15 13:24, 765,800 bytes |
| sha256 | `f4afad81c417627e84349c5f6cf6b1016e520083ce8ac631b7d71fc6c02f1767` |
| copy here | `files/stipple-r17b.html` |
| companion | `files/companions/stipple-r17.html` (R17, 2026-08-15 13:14, sha256 `e1f4e1ddf366772e6658210b755e76ac7a34a61129c8bcbe2819eed9c1c67fb0`) |
| derived runs | `files/derived/stipple_latch.py` and `.json` (port of `rodState()` over both revisions), `files/derived/stipple_outlines.py` and `.json` (ring validity and bridged slot extraction), both by the downloads reader on 2026-10-04 |
| generator source | MISSING. The page says its geometry "comes from the same DXF the laser gets; placement is a straight port of kin.py" (lines 118 to 124); no STIPPLE `kin.py`, scad or DXF was found in Downloads or the benches (searched 2026-10-05). The 27 part outlines inside `DATA.parts` are the only copy |

### 1.1 Revision table

| rev | date | sha256 (first 12) | change |
|---|---|---|---|
| R17 | 2026-08-15 13:14 | e1f4e1ddf366 | STROKE 4.8, R_LATCH 4.2, one upper face layer, WALL_TOP 74.0, 20 placement checks |
| R17b | 2026-08-15 13:24 | f4afad81c417 | STROKE 5.0, R_LATCH 4.5, cap well of `FACE2_N` 4 laminations with its rim exactly `R_LATCH` above the seat, FACE2_TOP and WALL_TOP 78.5, 22 placement checks |

Both predate R16-P (first plate page 2026-08-16 11:49), so STIPPLE branches off R16 lasercut rather than following R16-P (stated, `sources/downloads/dl-ogee-stipple-mech.md` section 2.1).

### 1.2 Why R17b

Newest and good: every knowledge-tier number for R17b reproduces from its `DATA.P` (computed, `derived/stipple_latch.json`), the latch identity holds to 1e-4 at margin 0.7853 and overshoot 0.500 (computed), and the cap well adds two checks that R17 lacks: a latched cap finishes flush with the rim and a resting cap sits exactly `R_LATCH` below it (lines 698 to 708). Measured on boot: "22 placement checks pass". One defect carried: the rail NUMBERS panel still prints the R17 values (stroke 4.8, half select 2.400, margin 0.585) while `DATA.P` says 5.0, 2.500, 0.785 (lines 93 to 103 against line 117).

## 2. What it makes and for whom

A maker with a laser and 1.5 mm sheet (3.0 mm for the column combs, `TC`), 21 SG90 servos and a controller cuts 27 part types into a 223 x 223 x 78.5 mm box (computed from `BX0`, `BX1`, `WALL_TOP`) with a 10 x 10 field on an 18 mm pitch (162 x 162 array, stated in the rail). The display scrolls text, runs Life, bounces a ball and dithers plasma, all through the real write schedule. It is the dense, pin-free sibling of OGEE16: same latch, a tenth of the pitch area per pixel, no 3 mm rods to buy and press.

## 3. Shots

Driven headless on 2026-10-05 through `globalThis.__stipple` with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, swiftshader, 1280 x 860). Console errors: 0 (measured).

| file | what it shows |
|---|---|
| `shots/s02-row-write-pattern-latched.png` | solid render after `showInstant()` of the row-write pattern `(i j + i + j) mod 3 == 0`: latched caps flush with the grey rim, resting caps one well depth down; chip "22 placement checks pass"; rail with PATTERNS, SPEED, VIEW, LAYERS, CAP SHAPE, NUMBERS |
| `shots/s03-mid-write-row-3-cycle-ghost.png` | ghost render at 0.8 of a row 3 cycle (row comb 3 and column combs 1, 4, 7 raised): pink row combs, lime column combs, amber links, cream rods, teal latch plate visible through the ghosted frame |
| `shots/s04-xray-servos-layer-on.png` | x-ray: link field in amber, rods, caps, teal latch plate, row and column combs. The servo layer was switched on through the hook, but the rail's servos button still reads off (the hook does not restyle the buttons) and the servo blocks cannot be picked out against the ghosted walls at this distance (looked 2026-10-05) |
| `shots/s05-hex-caps-scroller-text.png` | hex caps (`setShape('hex')`) showing a frame of the "HACK BUILD STIPPLE" scroller; the CAP SHAPE buttons still mark circle because the hook does not restyle them |
| `shots/s06-frame-off-row4-full-col4-and-7-selected.png` | frame, latch and caps hidden, zoomed: row comb 4 and column combs 4 and 7 at full stroke; teeth, links on their seats and the crank discs at the drive end. `rodState` at that pose: rod (4,4) at z 60.000, rods (4,5) and (5,4) at 57.815 (measured through the hook) |

## 4. Mechanisms and constructions

Code locations are lines of `files/stipple-r17b.html` (vendor three.js occupies line 115, `DATA` line 117).

### 4.1 Pin-free balance beam (canon `pin-free-balance-beam`, reference `joints/balance-beam`)

What it does: averages a row tooth height and a column tooth height without a single pivot pin. The column end is a nose of radius `NOSE_R` 2.0 resting on a flat slot floor at `CT_FLOOR` 47.0; the row end is a boss of radius `BOSS_R` 1.6 sitting in a coplanar slot at `RT_FLOOR` 47.4; the link length between contact centres is `LINK_L` 12.

Kinematics `link(i,j,zR,zC)` (lines 142 to 148):

```
xb = px(j) + C                         row end x, fixed
zb = RT_FLOOR + zR[i] + BOSS_R         row end centre
za = CT_FLOOR + zC[j] + NOSE_R         column end centre
span = sqrt(LINK_L^2 - (zb - za)^2)    column end slides in x
theta = atan2(zb - za, span)
crown = (za + zb)/2 + CROWN_R
```

Why the rise is exact: a cylinder end sits exactly its radius above its floor at any tilt, so the crown centre is the mean of the two floor heights plus constants, and the half select rise equals `STROKE/2` exactly: 2.500 at stroke 5.0 (computed). At rest `za = zb = 49.0` and the crown top is 55.0 = `CROWN_TOP` (computed from `DATA.P`). Maximum tilt `TILT_MAX` 24.624 deg and x drift `XDRIFT` 1.0913 (in `DATA.P`, reproduced by the reader).

Construction of the link outline (`DATA.parts.link`, one ring, no holes, 15.6 x 8.0 extents computed): a nose disc, a boss disc and a crown arc of `CROWN_R` 6.0 with `CROWN_HX` 2.5 and `LINK_UND` 1.2 (in `DATA.P`); cut flat in the XZ sheet plane, extruded `T` 1.5 in the XZ sheet frame (`sheetXZ`, lines 196 to 199).

Shared parameters: `C` 6.0, `PITCH` 18, `CT_SLOTW` 1.9, `RT_SLOTW` 3.6, `CT_TOP` 52.0, `RT_TOP` 49.3 (in `DATA.P`).

Limits: the column end slides `XDRIFT` in x, so the column tooth slot floor must be long enough for it; nothing holds the beam down but gravity and the rod's weight on the crown, so the display works face up only.

### 4.2 Displacement coincidence latch at 1.5 mm (canon `displacement-coincidence-latch`)

Same latch as OGEE16 scaled to sheet 1.5: rod `PIN_W` 5.0, lug `LUG_P` 0.625, `LUG_H` 0.3, `LUG_RAMP` 0.6 (`LUG_TOT` 0.9), notch `NOTCH_W` 2.05, `PIN_PLAY` 0.275, `RAMP_A` 40, `SLOT_E` 3.025; plate `LP_Z` 64.0, `LP_T` 1.5, `LP_SLIDE` 1.5; `R_LATCH` 4.5, `Z_LUG0` 61.0 (all `DATA.P`).

`rodState()` (lines 149 to 161): `CAM = (PIN_W/2 + LUG_P + PIN_PLAY) - SLOT_E` = 0.375 (computed); `ceil_v(u) = -(u - (T/2 - PIN_PLAY)) tan(RAMP_A)` (line 138); cammed while the lug overlaps the plate and the plate has not been pulled past `CAM + 0.05`.

| quantity | R17b | qualifier |
|---|---|---|
| camlift | 0.3147 | computed |
| half select margin under the plate | 0.7853 | computed |
| full select overshoot | 0.500 | computed |
| identity: margin + overshoot = stroke/2 - camlift - LUG_TOT | 1.2853 = 1.2853 | computed |

Because the beam makes the half rise exactly stroke/2, the seeded short form of CHK-MOT-05 holds here; on OGEE16 it needs the measured half rise (see `originals/ogee16/RECORD.md` 4.1).

### 4.3 Cap well (R17b)

Four laminations of `face2` (`FACE2_N` 4) stacked from `FACE2_Z` 72.5 (lines 247 to 250); the top one is coloured `rim`. The rim height `FACE2_TOP` 78.5 sits `R_LATCH` above the resting cap seat so a latched cap finishes flush and a resting cap is one throw down (`buildCheck`, lines 698 to 708, tolerance 2e-3). Cap shapes circle, square, hex, triangle at `CAP_D` 11.0 (`DATA.parts.cap_*`); the well aperture is one fixed outline, so a shape swap changes the cap only (seen in shot s05). The aperture in each `face2` lamination is a 20-point circle of 12.0 (`CAP_D + CAP_FIT`) centred on the pixel, with no offset for the cam; OGEE16 offsets its pocket by `-CAM/2` and adds `CAM` to it. Here the 0.5 per side covers `CAM` 0.375 with 0.125 left on the cam side (computed). Every cap carries a 1.62 x 5.12 mortise for the 1.5 x 5.0 rod tenon (`FIT_TEN` 0.12, computed from `DATA.parts.cap_*`).

### 4.4 Combs and the bridge (reference `joints/bridge`)

Row combs (`rowcomb`, `T` 1.5, 206 x 47.8 extents computed) and column combs (`colcomb`, `TC` 3.0, 206 x 39.5) stand on edge (`sheetXZ` at `py(i)`, `sheetYZ` at `px(j) - C`, lines 279 to 299). Both pass down through the `deck` (`DK_Z` 43) and the `middeck` (`MD_Z` 21.5), but through two different slot forms, because the combs are two different thicknesses. The 1.5 row combs pass through slot lines of 1.8 (`T + FIT_SLIP`) broken by bridges (computed by the reader from the deck outlines, and recounted here from the hole bounding boxes of `DATA.parts`):

| sheet | slot lines | segments per line | slot width | segment length | bridge lengths |
|---|---|---|---|---|---|
| deck | 10 | 12 | 1.8 = T + FIT_SLIP | 7.5 | 10.0, 10.5 x 9, 7.5 |
| middeck | 11 | 12 | 1.8 | 7.5 | same |

Recount of the hole bounding boxes (computed 2026-10-05 from `DATA.parts`): the deck holds 120 holes of 7.50 x 1.80 (10 row lines of 12) and the middeck 120 of the same (also 10 lines of 12); the reader's eleventh middeck line is a row of ten longer 1.80 wide slots (eight of 15.00, one 25.20, one 12.30) that take the column servo bracket's tabs, not a comb. The 3.0 column combs do not use the 1.8 lines: they pass through discrete 3.30 wide slots (`TC + FIT_SLIP`), 120 of 3.30 x 6.30 in the deck (12 per column comb) and 40 of 3.30 x 5.30 in the middeck (4 per column comb).

Segments centre on the tooth stations `x = 18 j + C`. Rule (from `handoff/hbf/knowledge/kernels/sheet-design.md` lines 124 to 126, quoted by the reader): a long slot is broken by bridges with matching mortises in the vertical plate, and the bridges must land in the plate's gaps. This keeps the deck one piece while it guides 20 combs.

Shelves `lowshelf` (`LSH_Z` 62.35, top 63.85) and `upshelf` (`USH_Z` 65.65) sandwich the latch plate (`LP_Z` 64.0 to 65.5) with 0.15 of air on each face (computed from `DATA.P`), so it slides between them. Each shelf carries 100 rod passages of 3.50 x 7.05; the latch plate carries 100 rod slots of 1.80 x 6.05, symmetric at `+-SLOT_E` about the cell (OGEE16's runs from `SLOT_B` to `SLOT_E`); the lower face carries 100 of 1.80 x 6.60 (`2 FACE_E`) (hole sizes computed from `DATA.parts`).

### 4.5 Crank and yoke drive

`CRANK_R` 4.0, `CRANK_SW` 38.682 deg in `DATA.P`, which equals `asin(STROKE / (2 CRANK_R))` (computed: asin(0.625)); `crankPhi(rise)` (lines 166 to 170) inverts `rise = CRANK_R (sin phi - sin phi_rest)`. Crank pin `CPIN_D` 1.5 by `CPIN_LEN` 9 in a yoke `YOKE_H` 1.9 at lateral offset `YOKE_OFF + YOKE_LAT` (3.122 + 6.0, `DATA.P`). Latch crank `LCRANK_R` 4.0, `LCRANK_SW` 51.318 deg; this is not `asin(LP_SLIDE / (2 LCRANK_R))`, which gives 10.81 deg (computed), and the page carries no generator to say how it was derived (unknown). `YOKE_OFF` 3.1225 equals `CRANK_R cos(CRANK_SW)` (computed). Crank outline `DATA.parts.crank` (13 x 12): spline hole 4.85, two horn screw holes 1.69 at radius 3.5, and a 1.40 crank pin hole at `CRANK_R` that takes the 1.5 pin as a press (computed from the hole boxes). Drive plates `rowdrive` and `coldrive` each carry one yoke slot 8.70 long by 1.90 (`YOKE_H`), centred at z 30.5 and 50.5, which are `ROW_YOKE_C` and `COL_YOKE_C` in `DATA.P`. Row servos on `rsvbrk` at x 196, column servos on `csvbrk` at y 196, servo bodies drawn as boxes `SV_W + SV_FIT` by `SV_L` by `SV_OUT` (lines 258 to 273).

Peak crank torque 8.8 gf.cm and bar sag 0.073 mm are stated in the rail and not reproduced.

### 4.6 Write schedule

`writeFrame(target)` (lines 386 to 394): one clear pull (`doClear`, 220 ms pull, 120 ms unlatch all, 220 ms return, lines 364 to 369), then for each row with any set pixel one cycle raising that row comb and every wanted column comb together (`writeRow`, lines 370 to 385). Ten cycles per frame on a 10 x 10, which is the stated reason for 20 drive servos instead of a 3-actuator selector carriage (lines 357 to 360).

The clear's middle step unlatches every pixel at its first tick without testing the plate travel, so the sim's clear does not depend on `lp >= CAM + 0.05` the way `rodState` does; the clear pull runs even when the target frame is empty. Latch commit: `canLatch()` is evaluated synchronously at `u === 1` of the rise step, so a starved animation frame cannot fake a working machine (lines 371 to 379). The queue `pump(now)` advances one step per frame scaled by `SPEED` (lines 401 to 410); `SKIP` uses `showInstant` instead.

Patterns (`DEMOS`, lines 457 to 546): row write, scroller (4 x 7 font, lines 416 to 442), Life on a torus with a glider plus 18 random seeds, ball, rain, wipe, plasma with a 2 x 2 ordered dither ("one bit per pixel is all the machine has"), checker. `life` and `rain` use unseeded `Math.random`.

### 4.7 Placement check

`buildCheck()` (lines 680 to 714) reads the link mesh's two contact points through the renderer's own world matrix at five poses (rest, row only, column only, both, row full plus column half) and asserts column seat z, row seat z, row seat x and crown top against the formulas, plus the two cap-well rows; tolerance 2e-3. Comment: "A mesh whose origin is off its rotation axis passes every numeric check and fails this one."

## 5. UX anatomy

| region | content |
|---|---|
| layout | 246 px paper rail left with a 4 px ink border and 5 px shadow, void stage right (lines 4 to 41) |
| rail | `STIP` + pink `PLE` wordmark, subtitle; PATTERNS (8 demos plus clear) with a note on the real schedule; SPEED 0.25 to 6x plus skip motion; VIEW solid, ghost, x-ray; LAYERS frame, rows, cols, links, rods, caps, latch, servos (servos off at boot); CAP SHAPE; NUMBERS key-value list |
| stage | hand-rolled orbit ("no OrbitControls in a file that has to open off a disk", lines 562 to 595), target (81, 81, 34), wheel zoom 60 to 1400; double click a cap to toggle its latch (lines 597 to 610; it raycasts the caps group and flips `S.latched` directly, outside the write queue); check chip bottom left in slime or pink |
| render modes | ghost keeps links, rods and caps solid and ghosts the rest at 0.13; x-ray puts cells at 0.6 and the rest at 0.12 (lines 616 to 636) |
| hook | `globalThis.__stipple = {S, apply, P, caps, setDemo, setMode, setShape, setLayer, writeFrame, doClear, enqueue, showInstant, buildCheck, canLatch, rodState, link, blank, DEMOS, busy, step}` (lines 733 to 737) |
| offline | three.js inlined (2010 to 2021 header), system monospace fonts, no network |

What makes it excellent: the machine is the demo. Every pattern goes through the same queue the hardware would run, the latch commits at command time, and the check panel proves the renderer's transforms rather than restating numbers. The 2D part outlines and the extrusion thickness flag (`t: "T"` or `"TC"`) are the entire geometry payload.

## 6. Tests and harness

| tool | asserts |
|---|---|
| in-page `buildCheck()` | 22 rows: seat positions and crown top at 5 poses, cap flush and cap depth |
| `derived/stipple_latch.py` | margin, overshoot, camlift, identity in both general and stroke/2 forms, tilt, drift, box for R17 and R17b |
| `derived/stipple_outlines.py` | every hole inside its outer, no ring crossings, 0 of 27 parts bad; bridged slot extraction |

No Playwright or node harness shipped with the page. The `__stipple.step(ms)` hook lets a harness pump the queue without frames.

## 7. Port map

| item | value |
|---|---|
| packages | `mechanisms` (balance beam, latch), `motion` (write schedule as a program), `nest` (27 outlines, DXF), `geom` (bridged slot), `ui-core` (pattern drive pad, cap well view) |
| feature kinds | `bridge` (slot line with bridges), `lamination` (cap well, `FACE2_N`), `latch`, `pin_in_slot` (yoke), MISSING: `balance-beam` contact pair (nose on floor plus boss in slot) as a kind |
| canon ids | `pin-free-balance-beam` (CANONS.md line 406), `displacement-coincidence-latch` (line 405); MISSING: `row-cycle-write-schedule` (one clear plus one cycle per row), `cap-well-lamination` |
| reference ids | `joints/bridge`, `joints/balance-beam` (named in CANONS.md line 406; absent from the handoff INDEX, which lists `joints/bridge` only), `mechanisms/coincidence-latch` |
| milestones | M06 (balance beam canon, latch), M07 (write schedule as a motion program, DXF nest), M10 (STIPPLE as a chase design is not in the M10 list: MISSING) |
| lineage row | MISSING |
