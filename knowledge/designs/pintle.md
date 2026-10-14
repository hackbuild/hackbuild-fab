# PINTLE: how it is made

Record written 2026-10-05 from the original code. Slug `pintle`. Family robots. PINTLE is the joint module; DERRICK (`fab-knowledge:originals/derrick/RECORD.md`) is the five axis arm built from five of them, and the two ship in one bundle.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula, a value printed by the canonical viewer in the 2026-10-05 drive, or a value printed by the canonical source when rerun on 2026-10-05 (`fab-knowledge:originals/pintle/files/records/`). "Stated" quotes a README. Units are mm, degrees, cm3, grams and kg cm.

Short paths: `F` is `fab-knowledge:originals/pintle/files/`; `PP` is `F/src/pintle_parts.py`; `SC` is `F/src/snap_check.py`; `VT` is `F/src/viewer_tpl.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "PINTLE, 9g micro servo pancake joint module" (`PP` line 2); viewer title "PINTLE R5" |
| owner's slug | pintle |
| canonical revision | R6 (README section "R6: no slot in the retainer, no pegs on the rotor, thicker ledges"), as carried in the DERRICK R3 bundle |
| canonical bundle | `F/derrick-r3.zip`, copied from `fab-work-directory:benches/pintle-derrick/outputs/derrick-r3.zip`; sha256 f81604f7efce24fee0eab45bd0f43c99d30c383ec1a21fb7adc7517dc286cd98 |
| date | 2026-08-10: `pintle_parts.py`, `snap_check.py`, `README-PINTLE.md`, `pintle-viewer.html` 19:45; STLs and zip 20:43 (zip entry times) |
| generator | `PP`, sha256 5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1, 546 lines, trimesh plus manifold3d plus shapely |
| viewer | `F/pintle-viewer.html`, sha256 d2ccb00d82336a078a5c441f8cc4ecae4713b144e9bca66020fcb6dcac692ba8; three.js r128 classic script from cdnjs; payload JSON in a `<script type="application/json">` tag baked from `VT` |
| hook | `window.__pintle = {state, cam, items, apply, place, render}` (`VT` line 428) |

The unpacked `outputs/derrick/` tree in the bench is byte-identical to the zip (checked 2026-10-05, every member compared).

### 1.1 Every revision found

From `F/README-PINTLE.md` (R5 to R6 sections) and `F/r4/README-R4.md`. No PINTLE file exists in `~/Downloads` (downloads reader, DERRICK and PINTLE section: `Downloads/derrick-r3/` is byte-identical to the harvest).

| rev | date | change | driver |
|---|---|---|---|
| R1 | 2026-08-10 | rotor a spool with a D44 output plate | impossible to assemble: the closed retainer (bore 30.6) could not pass the D44 plate or the D34 flange, and the plate covered all six retainer screws |
| R2 | 2026-08-10 | rotor a plain D30 column; retainer slides on from above; BCD 22.6 | R1 assembly path |
| R3 | 2026-08-10 | flank insert rows down to z 6.5 and 13.0 | the upper row was drilled into the back of the 45 degree cone with no line of sight |
| R4 | 2026-08-10 17:13 (`pintle-r4.zip`) | flank land out to y 14.0, x -2.0 to 19.0, flat 21.0 x 16.7; batch-then-fold union | the cone meets the flank plane in a hyperbola that crossed the pad |
| R5 | 2026-08-10 | almost no hardware: belly snap with crush rib, retainer bayonet, keyhole posts, flank slide groove with detent; horn corrected (hub below a flat star) | 12 inserts and 20 screws per joint down to 0 inserts and 3 screws |
| R5.1 | 2026-08-10 | retainer lock hole became an arc slot; explode travel in mm along the world joint axis | the hole sat where the retainer does not end up |
| R5.2 | 2026-08-10 | stock horn screw restored through a stepped bore; lock screw off axis | "clever and wrong"; plus a phase bug between hinge and spar faces |
| R6 | 2026-08-10 19:45 | retainer slot removed for a printed detent with a hard stop; ledges 1.60 to 3.20; output pegs replaced by a dovetail rail with one M2 | three structural faults seen in the 19:27 screenshots |
| DERRICK R3 weight pass | 2026-08-10 20:43 | stator tail hollowed in two steps, four D6 bores in the rotor plate | arm mass |

### 1.2 Why this revision

R6 as shipped in the DERRICK R3 bundle is the newest and the best: every revision after R1 fixed a fault found by a check, and R6 fixes the last three structural faults (a retainer slot that cut a 4.10 mm ring apart, 1.60 mm ledges carrying the joint in tension, two 4.4 mm pegs carrying the output torque). Its own check passes: `SC` rerun on 2026-10-05 from the canonical source gave `FAILURES: 0` across 37 clear-or-traps assertions (computed, `F/records/snap_check_run_2026-10-05.txt`). R4 is kept under `F/r4/` because its `assembly.py` holds the assembly path checks that R5 and R6 replaced, and they are the lesson of R1 to R3.

Known drift inside the canonical bundle:

- `pintle-viewer.html` (19:45) was baked before the 20:43 weight pass: its readout lists STATOR 18.03 cc and ROTOR 9.28 cc, while the 20:43 source builds 17.02 and 8.47 (computed, `F/records/` and the DERRICK arm build run).
- `F/src/params.json` (18:58) predates R6: it has `z_rim_top 33.55` and `ret_ch_a` 62 degrees; R6 code has 35.15 and 42 degrees (`PP` lines 156, 161).
- The viewer title says "PINTLE R5"; `PP` still declares the unused keyhole post constants (`post_*`, lines 135 to 147) and the `rotor()` comment still mentions posts (line 433 to 434) though only the rail is built.
- `README-PINTLE.md` opens with the R4 BOM, fits and assembly (inserts and screws) above the R5 to R6 sections that removed them.

### 1.3 What is in `fab-knowledge:originals/pintle/files/`

| path | what |
|---|---|
| `derrick-r3.zip` | the bundle as shipped (PINTLE and DERRICK) |
| `pintle-viewer.html` | the module viewer |
| `README-PINTLE.md` | PINTLE readme, R1 to R6 |
| `src/pintle_parts.py` | the R6 generator |
| `src/snap_check.py` | the R6 capture and clearance check |
| `src/build.py`, `src/viewer_data.py`, `src/viewer_tpl.html`, `src/smoke.js`, `src/params.json` | build, viewer payload, viewer template, jsdom smoke, parameter dump |
| `exports/pintle-{stator,rotor,retainer,belly}.stl` | print-oriented R6 STLs (20:43) |
| `r4/` | `README-R4.md`, `assembly.py`, `section2d.py`, R4 `pintle_parts.py`, two section PNGs, `pintle-r4.zip` (sha256 ac2f4b44ccfe...) |
| `records/snap_check_run_2026-10-05.txt` | the rerun |

Hashes: `fab-knowledge:originals/pintle/SHA256SUMS`.

---

## 2. What it makes and for whom

A printed pancake joint module for one SG90 class 9 g servo. The servo hides inside a stator shell; its spline drives a rotor that rides on a printed slew ring at r 17, so the nylon spline carries torque only and the ring takes radial load, axial load and moment. Four printed parts (stator, rotor, retainer, belly), the servo, its stock cross horn and horn screw; no inserts and no purchased fasteners in the module itself. Output and flank are standard interfaces (a dovetail rail on the face, a slide groove on each flank), so modules chain into arms (DERRICK). For a maker building small arms who has watched a horn-mounted link wobble and strip a micro servo.

| load path | value |
|---|---|
| thrust annulus r 12.6 to 17.0 | pi (17^2 - 12.6^2) = 409.2 mm2 (computed; viewer readout 409) |
| journal D34 x 3.0 | 2 pi 17 x 3 = 320.4 mm2 (computed; viewer 320) |
| spline D4.8 | pi 2.4^2 = 18.1 mm2 (computed; viewer 18) |
| ring section modulus | 2694 mm3 (stated; no formula in the code) |
| spline section modulus | 10.9 mm3 (stated; pi d^3 / 32 = 10.86 computed) |

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), waiting for `window.__pintle.items`. Files in `fab-knowledge:originals/pintle/shots/`. No page errors.

| file | caption |
|---|---|
| `p01-boot-iso.png` | ISO view: grey stator with its spine, flank lands and slide groove, the orange rotor with the dovetail rail across its face and the horn screw bore, the teal retainer under the head rim ledges. Floating rail (VIEW, MOTION, EXPLODE, PARTS with volumes, SECTION, OVERLAY) and the READOUT pane: 37.2 g, slew ring 34.0, thrust annulus 409, journal 320, spline 18 mm2. Corner bracket HUD. |
| `p02-explode-full.png` | EXPLODE 1.00: belly and servo drop away below, retainer lifts 14, rotor 75 and the horn screw out of frame above; the three drop slots and twist channels in the head rim are visible. |
| `p03-section-y-load-path.png` | CUT AT Y with LOAD PATH: only stator, rotor and retainer drawn, amber rings at the journal top and bottom and the spline; the section shows the thrust flange on the deck, the journal in the race, the retainer lip over the flange, the stepped horn screw bore and the cross pocket. |
| `p04-section-x-offset.png` | CUT AT X at plane offset 6: the servo pocket, flange shelf and belly recess through the spine. |
| `p05-rotor-60-front.png` | FRONT view with the rotor at 60 degrees: the rail turns with the output. |
| `p06-top-wire.png` | TOP view in wireframe: the stadium spine under the D44 head, the three bayonet sectors. |

---

## 4. Code map

| area | file and lines |
|---|---|
| servo spec, fits, holes, levels, radii | `PP` 19 to 69 |
| derived z stack, cavity, race, horn pocket, rail, retainer bayonet, slide groove, belly snap, flank land | `PP` 71 to 181 |
| mesh helpers `_fix`, `extrude`, `cyl`, `frustum`, `bx`, `stadium_poly`, `ring` | `PP` 184 to 231 |
| batch-then-fold `union` | `PP` 234 to 255 |
| single `diff` | `PP` 258 to 261 |
| `inter`, `cham_out`, `sector`, `screw`, `polar` | `PP` 264 to 298 |
| servo and horn stand-ins | `PP` 302 to 324 |
| STATOR | `PP` 328 to 398 |
| ROTOR | `PP` 402 to 445 |
| RETAINER and locked pose | `PP` 449 to 475 |
| BELLY | `PP` 479 to 502 |
| TANG (R4 example link, no longer in `PARTS`) | `PP` 506 to 539 |
| capture and clearance check | `SC` 1 to 102 |
| build and export (rotor flipped) | `F/src/build.py` 9 to 38 |
| viewer payload (int16 quantised soup) | `F/src/viewer_data.py` 6 to 47 |
| viewer: rail and pane markup | `VT` 92 to 150 |
| viewer: part spec with explode travel | `VT` 162 to 171 |
| viewer: scene, clip plane, groups | `VT` 196 to 230 |
| viewer: load path rings | `VT` 240 to 253 |
| viewer: apply (spin, explode, clip, load set) | `VT` 267 to 292 |
| viewer: keys and readout formulas | `VT` 380 to 400 |
| R4 assembly path checks | `F/r4/assembly.py` 22 to 121 |

---

## 5. Mechanisms and constructions

There is no circuit; the servo is driven by an outside controller.

### 5.1 Slew ring: journal plus thrust annulus (`PP` 328 to 358, 402 to 408)

What it does: the rotor's flange sits on a printed thrust deck and turns in a printed race; the retainer traps it from above with axial float. Moment and radial load go into plastic at r 17 instead of into the spline.

Z stack (computed from `PP` 72 to 93 and confirmed by `F/src/params.json` for the levels that did not change in R6): belly 0 to 1.80; servo case 1.80 to 24.50; flange 17.60 to 20.10; shelf 20.25; roof underside 24.70; thrust deck 26.70; flange top 29.70; stator top `z_stop` 29.95 (flange top plus 0.25 float); retainer top 32.35; skirt top 32.75; output face 38.75; rail top 41.15.

Construction:

1. Stator deck: `cyl(22.0, 24.70, 26.70)`; race ring `ring(17.20, 22.0, 26.70, 29.95)`, so the journal bore is r 17.2 (`r_j + cl_journal`).
2. Rotor (in order): hanging boss r 12.6 from 25.90 to 26.71; thrust flange r 17.0 from 26.70 to 29.70; skirt and column r 15.0 to 38.75.
3. Lead-in on the flange: `cham_out(16.4, 17.6, 26.70, 27.90, 19.0)`, a cylinder minus a frustum extended 0.6 past both ends "so the cylinder never severs the part" (`PP` 271 to 277).
4. The rotor top edge is left sharp on purpose: every cone cutter there ends tangent to the column wall and cracks the mesh (`PP` 430 to 431).

Fits: journal 0.20 radial running fit; thrust 0.25 axial float, never clamp the retainer down on the flange (`PP` 38 to 39).

Limit: PLA creeps under sustained holding torque and the journal goes loose; print PETG or ABS (README "Print settings").

### 5.2 Retainer bayonet with detent and hard stop (`PP` 154 to 164, 359 to 370, 449 to 475)

What it does: the retainer drops through three slots in the head rim, twists 46 degrees so three lugs sit under the rim ledges, and clicks into place on printed detents. A channel end stops it exactly at the locked angle. No screw.

Rim (stator): `ring(19.6, 22.0, 29.95, 35.15)`. For each of three positions 120 degrees apart: a drop slot sector 38 degrees wide from r 19.2 to 22.5 and z 30.25 up through the rim; a twist channel 42 degrees long from the slot end, z 30.25 to 31.95 (`rim_ch0`, `rim_ch1`). Ledge over the channel: 35.15 - 31.95 = 3.20 (computed; R5 was 1.60). Detent dimples r 1.6, 0.5 deep in the ledge underside at r 20.5, at each lug's locked centre angle.

Retainer: ring r 15.3 to 19.4 from 29.95 to 32.35; three lugs 30 degrees wide, r 19.2 to 21.8, z 30.40 to 31.80; a bump r 1.2, 0.35 tall on each lug top at r 20.5; a lead-in frustum on the bore; two thumb notches r 2.2 at r 17.0 so it twists by hand. Locked pose = rotate 46 degrees (`retainer_locked`).

Why there is no screw: "the ring is only 4.1 mm wide radially, so any hole big enough for an M2 cut straight through both walls" (`PP` 456 to 457). The ring width is 19.4 - 15.3 = 4.10 (computed). R5.1 had a 56 degree arc slot at r 18.4; the 19:27 screenshots showed it cutting the ring apart.

Checks (`SC` 34 to 39, 64 to 68), rerun 2026-10-05: at the drop angle the retainer seats and lifts 1.2 clear (0.00); locked and seated clear (0.00); locked and lifted 1.2 traps 75.04 mm3; locked against a rotor lifted 1.2 traps 135.14 mm3; over twisted 8 degrees past locked traps 26.75 mm3, so it cannot be forced past (computed).

### 5.3 Belly snap with crush rib (`PP` 171 to 174, 371 to 376, 479 to 502)

What it does: a bottom cover that snaps into a recess and pushes the servo case up onto its flange shelf, so the servo is captured with no screws.

Stator side: recess = the spine stadium buffered -2.0, depth 1.80; snap groove = the stadium buffered -1.2 (0.8 into the recess wall) from z 0.55 to 1.35.

Cover: the stadium inset 2.25 (recess 2.0 plus 0.25 cover clearance), 1.80 thick; on each long side a ramped ledge (a convex hull 14 long whose lip reaches past the recess wall into the groove, ramp 0.45 over the groove height); two relief slots (x plus and minus 9, between `yw - 2.2` and `yw - 1.4`) so each ledge rides on a strip that flexes inward; a crush rib 0.40 tall, 6 wide, from `sv_x0 + 2` to `sv_x1 - 2`.

Check: seated clear 0.00; pulled down 0.5 traps 6.50 mm3 (computed, `SC` 41 to 43).

### 5.4 Horn drive and stepped horn screw bore (`PP` 123 to 127, 151 to 153, 410 to 420)

What it does: the stock cross horn's arms engage a cross pocket in the rotor; the stock horn screw goes down a stepped bore, its head lands on a shoulder, and tightening it clamps rotor to horn and horn to spline in one move.

Horn model (R5 correction): flat star arms from 28.30 to 30.50, reach 9.8, width 4.8, on a D7.2 hub (`PP` 313 to 324). The comment (`PP` 123) and the `SC` printout say the hub runs from the servo boss top 25.70 to the spline top 28.30; the stand-in cylinder actually runs from 25.69 to the arm top 30.50, with the D4.84 spline socket bored only up to 28.31, so the model is a hub with a 2.2 cap over the spline. The rotor's hub relief (r 4.1 up to 28.30) and the cross pocket (up to 30.90) clear both readings. R4 had the horn upside down and the pocket "would have closed on air 2.4 mm below the arms".

Pocket: four arms reach 10.5 (`horn_reach + 0.40 + 0.30`), width 5.6, z 28.20 to 30.90; hub relief r 4.1 from 25.40 to 28.30. Bore: D5.0 from the output face down to a shoulder at 31.80, then D2.8 to the pocket roof at 30.90; the shoulder web is 0.9. Shank needed under the head: 31.80 - 28.30 + 2.5 = 6.0 for 2.5 of thread in the spline; a stock SG90 screw gives that, else an M2.5 x 8 self tapper (README R5.2).

Checks (`SC` 45 to 50, 70 to 81): horn seated clear 0.00; horn turned 8 degrees against the rotor traps 28.23 mm3 (the pocket drives it); against the servo 0.15 (clear, under 1.0); driver path to the shoulder clear; shank path up and out through rotor and a fitted tool plate clear; head past the shoulder traps 8.25 mm3 (computed).

### 5.5 Dovetail rail output interface (`PP` 137 to 150, 433 to 445)

What it does: the output face carries a dovetail rail; a bracket with the matching groove slides on, and one M2 through a short slot at r 9.5 stops it sliding. Torque goes into the rail flanks over 27 mm, axial pull into the undercut.

Construction: convex hull of eight points: at the face z 38.74 width 8.0 (`rail_w0`), at z 41.15 width 12.0 (`rail_w1`), length 27.0 along x; flank angle atan(2.0 / 2.4) = 39.8 degrees from vertical (computed; "40 degree flanks so it prints without support"); minus a D5.0 bore so the horn screw passes straight through. Lock pilot D1.7, 4.0 deep, at r 9.5 on +y. The female half is DERRICK's `slide_iface` (groove with 0.20 clearance, the lock slot, a counterbore), see the DERRICK record.

Checks (`SC` 52 to 62): seated clear; slid 4, 10, 20 and 34 mm clear; lifted 1.5 traps 33.44 mm3; pushed 1.0 across traps 37.27 mm3; lock screw path clear (computed). R5 used two keyhole posts at r 8.0 with a 40 degree twist; R5.2 found the hinge and spar faces have opposite handedness, so the pattern needs a phase offset per mating face (`ROT_HINGE = -pi/2` in DERRICK).

### 5.6 Flank land, slide groove and detent (`PP` 166 to 181, 336 to 340, 384 to 397)

What it does: two flat lands at y plus and minus 14.0 that a cradle grips; a groove in each land takes the cradle's rib; a dimple takes the rib's bump; one pilot takes the cradle's stop screw.

The land rule: the stator shell above the spine is a 45 degree cone from r 9.0 at z 11.7 to r 22.0 at z 24.7, so in the flank plane y = 14 the cone surface is at z = y + (cone_z1 - r_head); the land is flat and open up to `land_z1 = pad_y + cone_z1 - r_head = 14 + 24.7 - 22 = 16.7` (computed, `PP` 178 to 180). Off the centreline the boundary is a hyperbola (the cone meets the plane at z 17.6 at x 5 and z 23.2 at x 15, stated).

Construction: pad boxes x -2.0 to 19.0, from 3.0 inside the spine wall (so the union is not a tangent plane) out to y 14.0, z 0 to 17.3; groove 2.2 deep, z 5.5 to 11.5, from x -3 to 25 (open at the tail); dimple r 1.7, 0.7 deep at x 16.5 at mid groove height; stop screw pilot D1.7 at (17.0, 12.0).

Checks (`SC` 94 to 100, using DERRICK's `hinge()` as the cradle): seated clear; drawn back 3, 8, 16, 30 clear; module lifted 1.0 traps 57.56 mm3; pushed 1.0 sideways traps 228.50 mm3 (computed).

History: R3 drilled the upper insert row into the back of the cone ("it verified as solid because it was solid, buried"); R4 moved the land out to y 14.0 and the holes to the open band.

### 5.7 Stator shell and cavity (`PP` 328 to 398)

Solids: the spine (a stadium from x -16.9 to 27.9, half width 9.0, z 0 to 26.7); the 45 degree cone; the deck; race ring; rim; the two flank pads; two D6.8 tab screw boss columns on the flange shelf.

Cuts in one difference: the cone interior void (a frustum to r 18.9) minus a keep body (spine and pad zone) so the walls stay solid, cone wall 3.10; servo pocket x -6.25 to 17.25, plus and minus 6.45 (0.35 per side), z -1 to 24.70; flange travel column x -10.9 to 21.9 up to the shelf 20.25 (0.30 per side); central bore r 12.9; thrust counterbore r 17.2; the bayonet sectors and detent dimples; belly recess and snap groove; a cable groove r 2.9 from (19.5, 0) to (24.0, -9.5) above the belly; the tail hollowed in two steps (x 22.2 to 26.6 up to z 27.2, x 17.6 to 22.25 only to z 20.0 "so nothing under the thrust deck is undercut"); slide grooves, dimples and the stop pilot.

Servo retention: the servo slides up from below until its flange stops on the shelf; the belly's crush rib holds it there. Flange slot 0.15 per side.

### 5.8 Batch-then-fold union and single difference (`PP` 234 to 261)

`union(ms)`: try one batch manifold union and keep it if `is_volume`; else fold pairwise, repairing with `fill_holes` and raising if still not a volume. Reason (README R4): a pad box coplanar with the spine wall broke the batch union, and the fold broke the rotor, whose four cross pocket cutters meet on a shared edge and only survive a batch union. `diff(base, cutters)`: one difference against `union(cutters)` "avoids coaxial-cutter corruption" (same lesson as DAVIT `lib.diff`). `screw(d, L, head_d, head_h)` models a socket cap fastener as a real part with its origin on the seating face.

### 5.9 Output plate lightening and lock pilot (`PP` 421 to 427)

Four D6.0 blind bores at r 11.0 on 45, 135, 225 and 315 degrees run from z 31.60 (`hp_z1 + 0.70`, so 0.7 of roof stays over the cross pocket) up through the output face; they sit off the rail's footprint (the rail is plus and minus 4.0 wide at the face) and off the lock pilot on +y. They were added in the 20:43 weight pass (rotor 9.28 to 8.47 cm3, computed). The lock pilot is D1.70, 4.0 deep from the face at (0, 9.5); the dovetail rail is unioned on after the difference, then bored D5.0 on axis so the horn screw passes.

### 5.10 Rotor drop-in and the assertion list (`SC` 30 to 32)

The first block of `SC` lifts the rotor 0, 1, 3, 8 and 16 mm out of the stator and wants every one clear: the rotor drops straight in from above with no fastener, which is the R1 lesson (the R1 spool could not be assembled at all). The 37 assertions group as: rotor drop 5, retainer 5, belly 2, horn 3, output interface 8, retainer hard stop 1, horn screw path 4, hinge lock path 2, cradle 7 (counted from the run record).

### 5.11 Load path readout (`VT` 239 to 251, 390 to 400)

The pane computes three areas from the payload parameters: thrust annulus `pi (r_j^2 - r_rboss^2)` = 409 mm2, journal wall `2 pi r_j flange_t` = 320 mm2, spline section `pi (sv_spline_d / 2)^2` = 18 mm2 (computed), and prints "Thrust and journal area total 730 mm2 against 18 mm2 of spline". LOAD PATH hides everything except stator, rotor and retainer, sets them opaque, and draws two amber circles at r 17.0 on z 26.70 and 29.70 (the flange faces) and an orange circle at the spline radius 2.4 on z 26.90 (`sv_top + 2.4`); the rings turn with the rotor angle. Printed mass is the sum of non-reference part volumes x 1.27.

### 5.12 Leftover R4 and R5 parameters (`PP` 121, 129 to 147, 175 to 177, 342)

Still declared and no longer cut: the output bayonet (`bay_r0 9.0`, `bay_r1 13.0`, lug 46, gap 56, twist 52 degrees), the keyhole posts (`post_r 8.0`, two posts, D4.4 shank, D7.4 head, 40 degree twist), the belly screw positions, and the flank insert grid (`pad_grid_x 5.0, 15.0`, `pad_grid_z 6.0, 12.5`, which DERRICK imports as `GRID_X`, `GRID_Z` without using them). The two D6.8 tab screw boss columns from the flange shelf to z 25.70 are still built but carry no pilot, since the belly crush rib now holds the servo. A port should drop the dead parameters and decide whether the bosses stay as stiffeners.

---

## 6. Fits, holes and print settings

| item | value | source |
|---|---|---|
| servo case pocket | 0.35 per side | `PP` 34 |
| flange slot thickness | 0.15 per side | `PP` 35 |
| flange travel column | 0.30 per side | `PP` 36 |
| horn pocket | 0.40 per side | `PP` 37 |
| journal radial | 0.20 running | `PP` 38 |
| thrust axial | 0.25 float | `PP` 39 |
| belly cover | 0.25 per side | `PP` 41 |
| dovetail groove | 0.20 | DERRICK `arm_parts.py` 59 |
| cradle rib in groove | 0.20 | DERRICK `arm_parts.py` 101 |
| holes | M2 tap 1.70, M2 clearance 2.20, counterbore 4.30, heat set 3.20 vertical and 3.40 horizontal (knurl minus 0.2), M2.5 clearance 2.70, horn screw access 5.00 | `PP` 42 to 45 |
| material | PETG or ABS, not PLA (creep) | README |
| print | 0.4 nozzle, 0.2 layers, 4 perimeters, 5 top, 4 bottom, 25 percent gyroid, no supports; break in by hand; PTFE dry lube on journal and thrust face | README "Print settings" |
| orientation | stator bottom face down; rotor flipped, rail down (support 0.77 to 0.13 cm3); retainer flipped, lug tops down (crisp detent bump) | DERRICK README "Build plates" |
| volumes, 20:43 source | stator 17.02, rotor 8.47, retainer 1.10, belly 0.91 cm3 | computed, DERRICK arm build rerun |

---

## 7. UX anatomy (`pintle-viewer.html`)

"Bench instrument, dark anodized": tokens `--ink #0A0C0D --panel #12171A --rule #232B2F --dim #6E7C82 --text #C7D2D6 --live #2DD4BF --load #F0A93B --hot #E8873A`; type roles stated in the CSS comment (tracked caps mono for labels, tabular mono for numbers). Full bleed stage with a corner bracket HUD drawn as four SVG paths with non-scaling strokes.

- Floating rail, top left, 274 px: title block; VIEW (ISO, FRONT, SIDE, TOP, FIT); MOTION (rotor angle -90 to 90, SWEEP, TURNTABLE); EXPLODE 0 to 1; PARTS table (swatch, name, volume or "ref"; click a row to toggle); SECTION (CUT AT Y, CUT AT X, plane offset -24 to 24); OVERLAY (LOAD PATH, WIREFRAME, GRID).
- Pane, bottom right: printed mass, slew ring diameter, thrust annulus, journal and spline areas computed live from the payload parameters (`VT` 390 to 400), and an amber sentence comparing them.
- Explode: absolute travel in mm along the joint axis per part (belly -175, servo -60, stator 0, retainer 14, horn 40, horn screw 52, rotor 75), so a part modelled upside down still flies out the way it was fitted.
- Section: one three.js local clipping plane on every material. LOAD PATH shows only stator, rotor and retainer and draws amber rings at the journal and the spline.
- Keys: drag orbit, wheel zoom, shift drag pan, 1 to 7 toggle a part, X section, E explode, R reset. Under 760 px the rail goes full width and the pane and keys hide.
- What makes it excellent: the argument of the design (bearing area against spline area) is on screen as live numbers, and the section plus load path view shows exactly which plastic carries the moment.

---

## 8. Tests and harness

| test | what | result |
|---|---|---|
| `snap_check.py` (R6) | 37 boolean assertions, each with an expected sign: clear means under 1.0 mm3, traps means over 1.0 mm3 | rerun 2026-10-05 from `PP`: FAILURES 0 (computed, `F/records/snap_check_run_2026-10-05.txt`) |
| `build.py` | watertight, single body, volume per part, exports with the rotor flipped | stated; the arm build rerun shows all four module parts watertight and one body |
| `smoke.js` | jsdom, three.js stubbed, every control driven | not rerun (needs jsdom and the `/home/claude/out` paths) |
| R4 `assembly.py` | ten assembly path sections: rotor lifted out 0 to 22, retainer lifted over the column, lip at least 1.0 and float 0.10 to 0.60, driver access at each retainer screw, horn screw driver with the link fitted, servo out of the bottom, rotor sweep, static pairs, insert mouths open outboard, a plate over the land (and the documented 58 mm3 limit 5 mm past it) | the R4 design; R5 removed the screws and inserts these probe |
| drive 2026-10-05 | six shots through the hook | no page errors |

The positive capture test (a feature that traps must interfere when pulled) is the rule D-074 adopts for chases: "DERRICK bracket lifted 1.5 mm: 33.44 mm3 against a 1.0 mm3 floor".

---

## 9. Port map

| item | value |
|---|---|
| packages | `mechanisms` (slew ring, bayonet, dovetail, snap), `mesh` (batch-then-fold union, single difference, chamfer cutter, sector), `checks` (capture assertions with an expected sign, assembly paths, driver reach), `catalog` (SG90 row with shaft offset 5.90), `profile` (fits table) |
| feature kinds | `bore` (journal race, stepped horn screw bore), `boss`, `snap` (belly with ramped ledge and crush rib), `detent` (retainer bump and dimple, cradle bump and dimple), `bayonet` (retainer: slots, channel, twist, hard stop), `horn` (cross pocket), `pocket` (servo, insertable from below), `tabslot` (dovetail rail and slide groove) |
| canon id | `slew-ring-joint` (CANONS section 2.1, typed; provenance cites the R4 README lines 1 to 40, not the R6 source); `bayonet` kind lists PINTLE (PLAN line 603, D-059, M10); "dovetail rail with keyhole entry" is a candidate in CANONS section 8.3. MISSING: the retainer detent hard stop, the belly snap with crush rib, the stepped horn screw clamp |
| reference id | `joints/slew-ring` (handoff INDEX, seed) |
| milestone | M06 (slew-ring-joint typed); M10 (`bayonet` kind) |
| lineage row | MISSING |
