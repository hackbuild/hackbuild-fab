# DETENT: how it is made

Record written 2026-10-05 from the original code. Slug `detent`. Family counters-machines (KNURL, DETENT, WASHER, PLENUM, QUENCH, COFFER). DETENT is the two-mirror laser scanner driven by two 28BYJ-48 geared steppers: a printed, generated, verified machine (rev C, then rev D with a snap cage and a three colour variant) and the firmware, control app and tests that make it draw (bench `detent-beam`). The chat titles call it a galvo; it is two steppers turning two mirrors, open loop.

Number rules for this file. A number that names a code location is a declared value copied from that line. "Computed" means produced by the canonical code itself: the verifier runs recorded on 2026-10-04 in `files/records/`, the firmware harness compiled and run on 2026-10-05 (`files/records/fwtest_run_2026-10-05.txt`), or the pages' own readouts in headless Chrome on 2026-10-05. "Stated" quotes build notes or page copy. Nothing here has been printed: the bundle says "Nothing here has been printed or physically tested" (`F/revD/README.md`, `F/revD/CONTEXT.md` line 13).

Short paths: `F` is `fab-knowledge:originals/detent/files/`. `P` is `F/revD/detent_parts.py`. `FW` is `F/beam/detent_firmware.ino`. `PL` is `F/beam/detent-plot.html`. `SIM` is `F/revD/detent.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "DETENT rev D / stepper mirror scanner" (`SIM` title); control app "DETENT." with firmware "detent 1.3" |
| owner's slug | detent |
| canonical geometry | rev D: `P` sha256 e72c2e26019f62122436ae1802fdce6c8ca08de74fd979e5327b0dbece3943d7 (43509 bytes), with `SIM` 5879d03fb38afaf1bbf6f0f325a91caa5e75a68d814e71dbd13c2bdad4672ccb (1110159 bytes) |
| rev D source bundle | `~/Downloads/detentfiles.zip`, sha256 8a3373f9a1fa0efc7df300844d5087f8a7b2244d764d4391713fad33ee5006c0, dated 2026-08-01 13:48 (28 entries, unpacked at `fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/detentfiles/`); the rev D sim first appears as `~/Downloads/detent (22).html` on 2026-07-30 18:34 |
| canonical firmware and app | `FW` sha256 4de1e3105c4f45f258cfd5d05fe01126d5e901d33633f54a5beeb820315cd4c2 (29248 bytes); `PL` 81cdd5d8100dee9d77fce80599adf3244011df1b27e5709a7917ce8d45428bbd (99580 bytes, equal to `~/Downloads/detent-plot (4).html`, 2026-08-01 03:10); both inside `~/Downloads/detent2.zip` (a5575bdd3f0c..., 2026-08-01 13:58) and the harvested `detent-latest.zip` |
| runtime | geometry: Python with trimesh, manifold3d, shapely; sims: single-file WebGL2 with the STLs embedded, opens from `file://`, Google Fonts only; app: single file, WebSerial and Web Bluetooth, Font Awesome 6.5.1 from cdnjs |
| name collision | a different DETENT (magnet detent pin array, DETENT-4, DETENT-L, DETENT-2, 2026-07-13 to 07-15) is recorded in `fab-knowledge:sources/downloads/dl-robots-machines.md` lines 87 to 103; it is a TUMBLER and SASH family display and is outside this record |

### 1.1 Every revision found

| what | date | file | note |
|---|---|---|---|
| pre rev C sims | 2026-07-30 11:08 to 11:41 | `detent (8).html` to `(10)` | 32 to 35 KB, no meshes |
| rev B | 2026-07-30 | build notes only | base plate, two brackets, laser cap, driver tray (five parts) |
| rev C | 2026-07-30 12:31 to 15:46 | `detent (12).html` to `(20).html`; harvest `benches/detent-printed/outputs/` | one chassis plus a hub printed twice; carries the inverted X-axis teardrop |
| rev D sim | 2026-07-30 18:08, 18:34 | `detent (21).html`, `(22).html` | sculpted chassis, snap cage, six parts |
| RGB machine | 2026-07-31 05:01 | `detent-rgb.html` | three colour combiner bench |
| firmware and app | 2026-07-31 22:22 to 2026-08-01 03:15 | `detent-plot.html` to `(5)`, `detent_firmware.ino`, `(1)` | earlier than the harvested 1.3 and the plot in `detent2.zip` |
| rev D bundle | 2026-08-01 13:48 | `detentfiles.zip` | generator, RGB generator, verifiers, notes, ten STLs, rev C archive |

### 1.2 Why this revision

Rev D is the newest geometry and the best: it fixes the rev C teardrop bug (`wcut`, `P` lines 223 to 241), keeps every rev C clearance, adds the snap cage, the floor under motor 1 and the can cradle, and moves the build to exact offsets and a `clean()` that keeps the repair that is watertight. The verifier re-run on 2026-10-04 gave 75 of 76 checks OK; the one fail is the content stamp, recomputed after `trimesh.load` and repack, so a different trimesh version changes it while the STL bytes are unchanged (`F/records/detent_revD_verify_run_2026-10-04.txt`); `verify_sim.js` passed every check with 88,568 triangles embedded (`F/records/detent_revD_verify_sim_js_run_2026-10-04.txt`). Rev C is kept only as `F/revD/archive-revC/` ("Do not build from these", `CONTEXT.md`). Firmware 1.3 and the plot app in `detent2.zip` are the newest and carry every field-audit fix. The drive on 2026-10-05 opened the mono sim, the RGB sim and the app with zero page or console errors (measured).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `revD/detent_parts.py` | generator for six mono parts |
| `revD/detent_rgb_parts.py` | RGB chassis, eccentric bushing, and the cage reused at the longer footprint |
| `revD/verify.py`, `verify_rgb.py` | geometry, beam, snap, tool access and layer-walk verifiers |
| `revD/verify_sim.js`, `verify_sim_rgb.js` | node harnesses that evaluate the sim's own placement code against CAD landmarks |
| `revD/pack_meshes.py`, `pack_meshes_rgb.py` | STL to 16-bit blob packer with sha256 stamp and `--inject` |
| `revD/render.py` | numpy z-buffer rasteriser used during development |
| `revD/detent.html`, `detent-rgb.html` | the two sims, real meshes embedded |
| `revD/CONTEXT.md`, `README.md`, `DETENT-build-notes.md`, `DETENT-RGB-notes.md` | the bundle's own documents |
| `revD/stl/` | the six mono STLs (chassis, hub print 2, shell, hood, fit gauge, snap gauge) |
| `revD/archive-revC/detent_parts_revC.py`, `verify_revC.py` | rev C generator and verifier for the diff |
| `beam/detent_firmware.ino`, `detent_motortest.ino`, `detent-plot.html`, `hackbuild-beam-prd.md` | firmware 1.3, the bare motor test, the control app, the BEAM monorepo PRD |
| `beam/tests/` | `fwtest.cpp`, `fwtest2.cpp`, `audit_test.py`, `caltest.py`, `plantest.py`, `narrow.py` |
| `records/` | the 2026-10-04 verifier runs and the 2026-10-05 `fwtest` run |

Hashes: `fab-knowledge:originals/detent/SHA256SUMS`.

---

## 2. What it makes and for whom

A desk laser scanner for light painting, slow vector plots, aiming a spot and teaching the optics, for a maker with two 28BYJ-48 plus ULN2003 kits, two 20 mm mirrors, a 12 mm laser module and an ESP32-C3 SuperMini. "Not a projector" (build notes): one half step is about 3 mm at a metre and a 400 mm circle is 364 steps, 0.6 s per frame at 600 pps (computed, sim readout `shots/d01`). Mono machine 71.0 x 65.0 x 62.8 mm, caged 82.8 x 76.8 x 66.4 mm (computed, verify run). The RGB machine adds a dichroic combiner bench for three 12 mm modules, 108.0 x 65.0 x 62.8 mm (stated).

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/detent/drive/shoot.cjs` with `drive/shots-revD.json`, `shots-rgb.json`, `shots-plot.json` (puppeteer-core, headless Chrome with SwiftShader, 1280 x 860, 6 s wait since no page has a hook).

| file | caption |
|---|---|
| `shots/d01-revD-cage-on-circle-scanning.png` | Rev D sim, cage on: gabled louvres and fingers, the beam leaving the aperture, the quarter for scale, header pills (build a660e9769efa). Right rail: the 1000 mm screen trace of a 400 mm circle with the backlash flat spots, beam footprints on both mirrors, readouts (optical step 0.1766 deg, spot pitch 3.08 mm, 364 steps per frame, 0.61 s, 1.65 Hz, 7,280 pps needed for 20 Hz, backlash at screen 20.9 mm, pincushion 8.5 mm). |
| `shots/d02-revD-cage-off-beam-path-star.png` | Cage off, star pattern: chassis, both motors, the laser through wall B, mirror 1 turning the beam up and mirror 2 sending it out, the scan field outline at 60 mm. |
| `shots/d03-revD-exploded-hood-on.png` | Explode at 70 percent: hood and cage lifted, motors pulled off their walls, hubs and mirrors out along their own normals, leader lines; beam off while apart. |
| `shots/d04-revD-naive-map-lissajous-wide.png` | 900 mm lissajous with the naive linear map: half angle 24.2 deg, pincushion at corner 53.7 mm, 5.44 s per frame. |
| `shots/d05-rgb-combiner-cage-off.png` | RGB sim: three modules in eccentric bushings on two webs, the optic bar, the combined beam (white when all three are on), envelope 108 x 65 x 63, build 2effb0f276cf, 124,326 triangles. |
| `shots/d06-plot-text-default.png` | Control app, text "DETENT" in the stroke font on the 120 x 120 target. |
| `shots/d07-plot-corners-solved-cube.png` | App after a four-corner solve on the skewed fixture corners: rotating cube in pink, the step lattice, "mm per step at d 0.341", "field needs 330 x 300", the console with the `Y` homography line. |
| `shots/d08-plot-lash-gauge-with-slack.png` | LASH test pattern with measured slack 8 and 6 steps and no comp: the doubled lines and "lash distortion 2.00 mm". |

---

## 4. Code map

### 4.1 Generator `P` (rev D)

| area | lines |
|---|---|
| docstring: rev C bug, rev D shape language, print rules, researched component data | 1 to 65 |
| print constants `LAYER 0.2`, `LINE 0.4`, `EF 0.6`, `CH 0.4`, `HV 0.20`, `HH 0.35`, `SELFTAP -0.30`; `lay()` | 78 to 89 |
| component constants (28BYJ-48, mirror, laser) | 93 to 101 |
| fits | 104 to 112 |
| machine constants (floor, walls, MIRC, STANDOFF, H1, SEP, H2, saddle, cradle) | 115 to 142 |
| footprint and rail | 145 to 152 |
| enclosure (shell, belt, hood, aperture) | 155 to 179 |
| primitives `cyl`, `bx`, `diff`, `uni`, `prism` | 183 to 220 |
| `wcut` (the fixed horizontal prism), `teardrop`, `gable`, `rrect`, `offsetter` | 223 to 295 |
| `cone_lead`, `hs`, `cham_top`, `vee`, `rim_chamfer`, `taper_cut` | 301 to 392 |
| `clean` (candidate repairs) | 395 to 439 |
| `bed_chamfer` | 442 to 471 |
| the five exact footprint offsets | 476 to 485 |
| `chassis()` | 489 to 647 |
| `mirror_hub()` | 651 to 705 |
| `_fingers`, `LOW_F`, `HIGH_F`, port | 709 to 740 |
| `shell()` | 743 to 827 |
| `hood()` | 831 to 867 |
| `fit_gauge()`, `snap_gauge()` | 871 to 931 |
| `PARTS` and export loop | 935 to 965 |

### 4.2 Sim `SIM` (rev D; the RGB sim differs only where section 5.9 says)

| area | lines |
|---|---|
| dark instrument CSS (`--bg #0b0e10`, `--acc #2ee6c5`, `--beam #7b2fff`, JetBrains Mono, Saira Condensed), grid 246 / stage / 330 | 11 to 108 |
| left rail A optical bench, B motor, C pattern, D view; stage; right rail scope, footprint, E readouts, F parts, H print check, G component data | 113 to 251 |
| vector helpers, Rodrigues `rotAx`, `reflect` | 256 to 270 |
| dead rev B state `G`, live model `M` | 273 to 285 |
| `trace(t1, t2)` | 288 to 319 |
| `solve(u, v)` Newton | 322 to 339 |
| `pathPoints`, `buildPlan` | 342 to 386 |
| `advance`, `setSteps` (backlash), `angles`, `pushTrail` | 389 to 433 |
| `MESHSTAMP`, `MESHMETA`, `MESHB64` | 438 to 440 |
| WebGL2 programs, unpack, edges | 448 to 561 |
| `placements` (where each solid sits and its explode direction) | 564 to 619 |
| `leaders`, beam tube, scan field and axes lines | 620 to 718 |
| camera, `draw3d` | 721 to 845 |
| scope and footprint canvases | 848 to 915 |
| `readout`, parts, spec and print tables | 918 to 1019 |
| wiring and loop | 1022 to 1063 |

### 4.3 Firmware `FW`

| area | lines |
|---|---|
| pin map and avoided pins | 4 to 7, 24 to 26 |
| `STEPS_PER_REV 4075.7728`, `TICK_HZ 20000`, `QUEUE_LEN 256` | 32 to 38 |
| `Config` and defaults | 42 to 75 |
| half-step table and one-register masks | 85 to 120 |
| segment queue | 124 to 136 |
| `stepAxisX/Y` (inversion at the phase advance) | 162 to 178 |
| step ISR `onTick` | 180 to 252 |
| `intervalFor`, `pushSeg`, `moveToSteps` (lash take-up, 2000-step split) | 256 to 322 |
| kinematics `mmToUV`, `uvToMm`, `rebuildInverse`, `mmToSteps`, `stepsToMm`, `limitsFromCorners` | 330 to 396 |
| `emit` (BLE 180-byte chunks), `stopAll`, `statusLine`, NVS | 400 to 456 |
| `parseArgs` with `strtof` | 459 to 479 |
| protocol `handle` | 481 to 706 |
| BLE NUS | 708 to 750 |
| `setup`, `loop` (status beat, dead-man, idle release) | 754 to end |

### 4.4 App `PL`

| area | lines |
|---|---|
| CSS (hack.build paper tokens) | 10 to 170 |
| markup: header chips, left aside, stage, right aside, manual, console | 172 to 455 |
| kinematics, `solveH`, `invertH`, `cornerMm`, `mmPerStep` | 497 to 575 |
| stroke font `GLYPH`, `flattenPath`, `subdivQ`, `textStrokes` | 577 to 683 |
| 3D sources and projection | 685 to 802 |
| 2D shapes, calibration patterns | 804 to 865 |
| image raster | 867 to 915 |
| SVG import | 917 to 1093 |
| `planSpeeds` | 1095 to 1151 |
| `centerFit`, `scaleToField`, `optimise`, `quantise`, limits | 1153 to 1229 |
| `simulate`, `lashError`, `stepCost` | 1231 to 1294 |
| `currentStrokes`, `rebuild` | 1297 to 1374 |
| `drawTarget`, `drawRig` | 1376 to 1609 |
| transport, `parseQc`, `onLine`, connect, `pushConfig` | 1611 to 1750 |
| `streamCmds`, `loopFrames` | 1752 to 1808 |
| calibration (capture, go to, solve, fit H, limits from corners) | 1846 to 1949 |
| stall hunt, drain | 1990 to 2043 |
| live steer with 30 Hz coalescing, keepalive | 2093 to 2182 |
| `TIPS` | 2194 to 2233 |

---

## 5. Mechanisms and constructions

### 5.1 Two-mirror stepper scanner layout (`P` lines 93 to 179)

What it does: a beam enters along +X at height H1, mirror 1 (rotating about Y, on wall A) turns it up, mirror 2 (rotating about X, on wall B) turns it out the front along +Y. Both mirror faces sit on their rotation axes.

Constants (declared): H1 `lay(14.4)`; SEP `lay(22.8)`; H2 = 37.2; MIRC 21.0 (hub seat to mirror centre); STANDOFF = MIRC + BOSS_H = 22.5, both walls, "the smallest standoff that keeps wall B clear of the driver going to motor 1's left screw" (line 119 to 121); WALL_A 5.2 (13 lines), WALL_B 6.4 (16 lines); FLOOR 2.4; LASER_TIP -13.0; saddle x -49.0 to -28.9, half depth 8.4, top `lay(H1 + LASER_CLR/2 x 1.4142 + 2.8)` = 26.0 (computed from the constants, and 26.0 measured as the highest saddle vertex in `F/revD/stl/detent_chassis.stl`; the line 141 comment and the sim's dead rev B object `G` both still say 27.6), which leaves 2.7 above the 23.27 peak of the laser bore teardrop (computed); cradle y -41 to -29.

Derived (computed, verify run): swept radius `hypot(10, 3)` = 10.44 mm; axis clearance 22.8 - 2 x 10.44 = 1.92 mm; mirror 1 to floor 14.4 - 10.44 - 2.4 = 1.56 mm; mirror mass 9.6 g at molybdenum 10.22 g/cm3; shaft in hub 8.5 mm.

Bought-part data, from NopSCADlib measured vitamins (declared, lines 54 to 64): can 28.0 x 19.0; screw pitch 35.0, hole 4.2, lug 7.0 x 0.85; the screw holes lie on a line through the can axis and the shaft is 8.0 off it; boss 9.0 x 1.5; shaft 5.0 with 3.0 flats, 10.0 long, flats only over the last 6.0; wire block 14.7 x 6.0 x 16.5 with outer face 25.0 from the shaft. Mo mirror 20.0 (+0/-0.13) x 3.0 (+0.2). 405 nm module 12.0 x 35.0. ULN2003 ZC-A0591 35 x 32, holes 30.5 x 25.5.

### 5.2 Print rules as geometry (`P` lines 42 to 52, 78 to 112, 442 to 471)

| rule | value | code |
|---|---|---|
| vertical dims in whole layers | `lay(v) = round(floor(v/0.2 + 0.5) 0.2, 3)` | 87 to 89 |
| walls in whole 0.4 lines | 2.4, 2.8, 5.2, 6.4 | 115 to 117, 156 |
| vertical bore allowance | +0.20 on diameter | 82 |
| horizontal bore allowance | +0.35 on diameter | 83 |
| self-tap holes under size | -0.30 | 84 |
| bed face | stepped in over 0.6 in three layers | `bed_chamfer`, 442 to 471 |
| cosmetic 45 chamfers | built from 0.4 steps | `CH`, `rim_chamfer`, `vee` |
| slicer hole compensation | must be OFF | docstring line 49 |

Fits (declared, lines 104 to 112): BOSS_CLR 9.0 + 0.6 + 0.35 = 9.95 gabled; SCREW_TAP 3.3 + 0.35 = 3.65 (M4 cuts its own thread); LASER_CLR 12.0 + 0.2 + 0.35 = 12.55 gabled; BORE_D 5.0 + 0.25 + 0.20 = 5.45 with BORE_FLAT 3.25; POCKET_D 20.4 ("prints near 20.05"); NOTCH_DP `lay(3.0)`; M3_FREE 3.40; M3_TAP 2.70. Build notes "should measure": hub bore 5.05 to 5.15, boss hole about 9.6, screw about 3.3, laser bore about 12.2, notch 20.0 to 20.1 light press (stated).

`bed_chamfer(m, amt)`: section the part at z = LAYER/2, keep it in world XY, then for n = amt/LAYER slabs buffer the footprint inward by `amt - (i+1) amt/n`, extrude each slab, union with a box covering everything above amt, intersect with the part. A 45 chamfer expressed the way a slicer builds it.

Print settings (stated, build notes): 0.2 layers, 0.4 nozzle, 5 perimeters, 25 percent infill, PLA or PETG; five perimeters at 0.42 width make the 5.2 and 6.4 walls fully dense; the 2.8 cage wants four perimeters and no infill. About 113 g PLA for the four structural parts.

### 5.3 Teardrops that know which way is up (`wcut`, `teardrop`, `gable`, `P` lines 223 to 269)

What it does: every horizontal hole and window has a roof no steeper than 45 deg so nothing needs support.

Construction:
1. `teardrop(d, h, xyz, axis)`: profile = circle r (96 segments) unioned with the triangle (-t, t), (t, t), (0, r 1.4142) where t = r/1.4142; the peak sits 0.414 r above the bore top and both flanks are tangent at 45 deg. Axis z extrudes directly; x and y go through `wcut`.
2. `wcut(prof, length, xyz, axis)`: extrude, centre, then for axis y rotate +90 about X (u to +X, v to +Z); for axis x rotate +90 about Y then +90 about X (u to +Y, v to +Z). "Profile +v always lands on world +Z."
3. `gable(w, h, r)`: flat sill, upright jambs, a 45 roof to a peak, corners eased by buffer(-r).buffer(r), r 0.6. The one window motif, used at four sizes on chassis, shell, hood and the beam aperture.

Failure lesson (rev C): its `teardrop(..., "x")` rotated +90 about Y then -90 about X, which sent profile +Y to world -Z; the 12.55 laser bore and both wall B M4 holes were round roofs with the peak pointing down. Rev C's verifier missed it because the overhang area was printed as information and only islands farther than 3 mm from the layer below were gated (`fab-knowledge:sources/benches/benches-machines.md` line 178). Rev D's `verify.py` still prints the bridged area as information (`[   ]` rows, lines 311 to 315), so an inverted teardrop would still pass the layer walk; the fix in rev D is in the generator. The plan gates overhang in print pose as CHK-PRT-13 and carries CHK-PRT-08 for the apex direction.

### 5.4 The sculpted chassis (`chassis()`, `P` lines 489 to 647)

One body: floor, wall A, wall B, laser saddle, can cradle, perimeter rail and every fixing. Construction in order:
1. Floor: the footprint `OFF(0)`, a rounded rectangle x -49.0 to 22.0, y -43.0 to 22.0, corner r 5, extruded 0 to 2.4. The floor runs back under motor 1 so the machine has a footprint and the cage has a rail on four sides; chassis 31.01 cm3 against 31.45 for rev C (stated).
2. Rail: footprint minus its 2.4 inset, 0 to 6.0; a stepped 0.8 chamfer on the outer top edge (added in the cut list) and a stepped 0.4 chamfer on the inner top edge (`rim_chamfer(..., 0.4, "in")` on the rail itself, line 511). The comment says "One 0.8 chamfer, on the outer edge": two 1.2 chamfers met and left a 152 mm2 island (stated); the code still adds the 0.4 inner step the comment does not mention.
3. Wall A: profile plateau then a 45 fall (`(wa_x0,0) (22,0) (22, WA_TOP - 13) (9, WA_TOP) (wa_x0, WA_TOP)`), WA_TOP `lay(H1 + 8 + CAN_CLR/2 + 3)` = 40.0, extruded 5.2 along -Y; top edges chamfered 1.2 with `cham_top` before the union.
4. Wall B: the tall wall, both ends falling, WB_TOP 62.8, through `wcut` along X, chamfered.
5. Saddle as a profile with a 5 mm 45 nose, chamfered 1.6 on its long top edges.
6. Cradle: two ribs 3.2 thick at x +-10.5, each cut by a 28.7 cylinder on the can axis, 45 half spaces at both ends and a gable window.
7. Union, then cuts: motor openings (`motor_cut`: CAN_CLR 29.15 cylinder plus a 15.5 wire slot) so each can drops through its wall from the mirror side; a seat for the 42 x 7 x 0.85 lug bar cut into the wall face as a pocket 44 x 7.6 and 1.7 deep (`bx(HOLE_SP + LUG_W + 2, LUG_T x 2, LUG_W + 0.6)` centred `LUG_T` behind the face); M4 tap teardrops 3.65 with 45 cone lead-ins on both walls; the laser bore teardrop 12.55 through wall B into the saddle and three M3 tap holes from the saddle top; the rail chamfer and the snap vee groove right round the footprint; windows (three tall gables in wall A, four in wall B, two through the saddle); four M3 fixing holes and six cable tie slots in the floor.
8. Hex field: 9 mm pitch hexagons r 4.1 kept 2.6 clear of fixings, ties, walls, saddle, cradle and the rail band, cut through the floor.
9. `bed_chamfer` on the whole part.

Rule from this part: chamfer each sub-solid before the union, because `hs()` returns a 600 mm rotated box and "will happily take the top off a wall on the far side of the machine" (lines 495 to 497; both mono and RGB chassis were broken this way, `CONTEXT.md`).

Front-driven motor mount: cans drop through from the mirror side, the lug plate lands on the mirror face, all four M4 are driven from the front into self-tapped holes, no nuts. `verify.py` proves it with a swept driver (section 5.8).

### 5.5 The mirror hub with a fluted collar (`mirror_hub()`, `P` lines 651 to 705)

Built along local +Y and stood up at the end. Construction:
1. Post HUB_D 16.0 x (MIRC + 4) = 25.0 plus a collar COLLAR_D 17.6 x 6.0 at the seat end; a stepped taper shoulder from 17.6 to 16.0 over the last 0.8 of the collar; six flutes (4.0 cylinders on r 9.8) in the collar for finger grip when homing by hand.
2. Cut away everything in front of the mirror plane past the bore (a box from y 9.5), and ease the long edges of that flat with 45 half spaces clipped to the flat region.
3. Notch: a cylinder POCKET_D 20.4 x 2 NOTCH_DP along X at y = MIRC; a 1.2 x 45 cone lead-in on its entry face so the mirror starts square.
4. Free end tapered 16.0 to 13.6 over 1.2.
5. Bore: 2.8 round lead-in, then the D bore (5.45 round intersected with a 3.25 slab) to 8.5; a 45 cone lead at the mouth (the shaft is round for its first 4 mm, a full-length D bore jams).
6. Grub: an M3 tap teardrop 2.70 along Z at y 8.6.
7. Rotate to stand on the seat, `bed_chamfer` 0.4.

The mirror face finishes flush with the front of the post on the rotation axis; the rest of the disc projects out of the notch. `verify.py` fires a 13 x 13 ray grid inside r 9.5 at the face and fails if anything sits proud by 0.05 (computed: 0.00 mm proud).

### 5.6 The snap cage: shell and hood with vee fingers and a belt (`vee`, `_fingers`, `shell()`, `hood()`, `P` lines 336 to 366, 709 to 867)

What it does: a perforated cage drops over the machine and clips to the chassis rail on all four sides, and a hood clips to the cage, with no screws, and both come off by hand.

Exact offsets (lines 474 to 485): one footprint and five offsets built from scratch by `offsetter` (each offset is the rounded rectangle with radius r + d): chassis rail `OFF(0)`, shell inner `OFF(0.4)`, shell outer `OFF(3.2)`, hood inner `OFF(3.5)`, hood outer `OFF(5.9)`. Chained `buffer()` resampled corner arcs and left sliver seams: the hood was 53k triangles, two thirds under 0.01 mm2, and is 9.5k now (stated).

`vee(off, z_apex, depth, mode, step 0.4)`: a stepped 45 vee around the footprint; for i in -n..n a ring of depth `depth - |i| step` is extruded over one 0.4 step; modes out_groove, out_rib, in_groove, in_rib. Both flanks 45, so it prints either way up and comes apart with the force it went on with.

| snap | groove | rib | engagement | slack | fingers | working length | outer fibre strain |
|---|---|---|---|---|---|---|---|
| shell to chassis rail (vee at z 3.6) | 1.0 | 1.1 | 0.70 | 0.30 | 8 | 19.4 | 1.23 percent |
| shell to hood (vee at z 59.0) | 1.4 (1.1 + 0.3) | 1.1 | 0.80 | 0.60 | 5 | 27.0 | 0.63 percent |

Strain `3 t y / (2 L^2)` with t 2.8 and y 1.1 (computed in `verify.py` lines 339 to 345). Rail engagement and slack measured by rays on all four rails: 0.70 / 0.30 (computed, `verify.py` lines 131 to 159, engagement `groove floor + 1.0 - rib tip`, slack `rib tip - groove floor`). The hood row is not ray-checked: from the offsets the rib tip sits at `OFF(4.3)`, the hood inner face at `OFF(3.5)` and the groove floor at `OFF(4.9)`, so 0.80 engagement and 0.60 slack (computed from the constants; the first pass of this record gave 0.30). PLA yields near 2 percent (stated). Too stiff: shell at 96 percent flow or PETG; falls off: 104 percent (stated).

Shell construction (lines 743 to 827): extrude the ring `SH_OUT - SH_IN` 0 to 64.0 (wall 2.8, 7 lines); add `in_rib` vees clipped to the eight low finger footprints (14 wide); cut the low finger slots (1.4 wide, both sides, from the floor to the belt) with round 2.4 slot ends; add `out_rib` vees on five high fingers (16 wide) and cut their slots from 32.0 to the top; cut the beam aperture `gable(30, 30)` on the front wall sitting on the belt at z 27.0, plus a six-step 2.4 x 45 funnel; cut the cable port `gable(20, 12)` on the back between fingers; cut louvres `gable(3.2, h)` in three bands (sills 6, 31, 47) on every face at 6 mm pitch, skipping anything in the `forbid` spans of slots, aperture and port; chamfer the top rim 1.2; `bed_chamfer` 0.4.

The belt: z 23.0 to 27.0 is uncut on every face (lines 162 to 168). "Twelve finger slots and three bands of louvres ... combined into a floor to ceiling cut ... and the cage came out of the boolean in three pieces" (build notes). The belt makes the cage one body by construction; `verify.py` checks single body and watertight for every part.

The aperture is sized from the corner inwards: the field is about +-19 deg each way, and a 45 roof cuts exactly the corner that field needs (lines 175 to 179); `verify.py` fires 81 rays (9 x 9 over +-19 deg) from mirror 2 and fails on one strike (computed: 0 hits).

Hood (lines 831 to 867): plate `HD_OUT` from 64.0 to 66.4 plus a skirt `HD_OUT - HD_IN` reaching 10.0 down; an `in_groove` vee of 1.4 at z 59.0; sight lights over the optical stack (two 22 x 5.2 slots at y +-6.5, two 16 x 4 at y +-18) and vent fields over motor 2 and motor 1's tail, every cut clipped to the plate inset by 3.0 (a vent that ran off the plate once took a 2 mm bite out of the skirt, stated); rim chamfer 1.2; flipped to print face down; `bed_chamfer` 0.4.

### 5.7 Coupons: fit gauge and snap gauge (`P` lines 871 to 931)

Fit gauge, 56 x 26 x 28, six minutes (stated): a 16 post with the same D bore (the shaft should slide on with no rock), a fin with the 20.4 x 3.0 notch (the mirror should press in and finish flush), a block with the 9.95 boss teardrop and a 3.65 tap teardrop, in the same print orientation as the real parts. Snap gauge, 40 x 32 x 26, ten minutes: a 40 mm slice of rail with its groove and one shell finger with the rib, rooted at the belt with the vee 19.4 below, feet for stability. "What you feel here is what the cage will do."

### 5.8 Mesh hygiene and the verifier (`clean`, `P` lines 395 to 439; `F/revD/verify.py`)

`clean(m)`: merge vertices; candidates are the mesh, the mesh with zero-volume shards dropped, that with holes filled, and a version with zero-area faces removed then refilled; score by (watertight, fewest pieces, fewest faces); keep the best, fix normals. "Dropping collinear triangles closes the hood's hole and opens one in the chassis," so no repair is trusted blindly; only zero-volume components are dropped, so a detached finger still shows up as a loose piece.

`verify.py` rebuilds dummy motors (can, lug bar, boss, wire block, shaft with flats), the laser and the hubs from the same constants, then checks (computed 2026-10-04):

| block | method | result |
|---|---|---|
| single body and watertight | `split`, `is_watertight` for chassis, hub, shell, hood | 0 loose pieces, 0 leaks |
| static interference | manifold intersection volume, 5 pairs | 0.00 mm3 each |
| cage fit | shell and hood against chassis, motors, laser, hubs at -60, 0, 60 deg | 0.00 mm3 each |
| snap engagement | rays at the vee height on four rails, rib at least 0.6 into the groove and not bottoming | 0.70 / 0.30 on all four |
| rotational sweep | 13 positions over +-60 deg, hubs against chassis, motors, laser, each other | 0.00 mm3 |
| beam path | three ray segments against the chassis; 81-ray field against the shell | 0 hits |
| tool access | a driver cylinder 3 to 10 mm, 40 mm reach, swept along each screw axis from the screw side, stop at the first interference over 1 mm3 | motor 1 left 4.0 mm, the other three 10.0 mm |
| notch and face | rays through the hub at four radii; 13 x 13 grid at the face | solid, solid, open, open; 0.00 proud |
| hubs out of the beam | 11 x 11 angle grid over +-25 deg, three segments | 0 hits |
| layer walk | every 0.2 layer: overhang = current minus previous buffered by a layer (reported only); island = current minus previous buffered by 3.0 (gated at 0.5 mm2); span from the inscribed width; sits on bed | chassis island 0.46 mm2 at z 21.5, span 0.2; hub 0, 1.0; shell 0, 0.2; hood 0, 1.2; gauges 0, 3.0 and 0.4 |
| stale sim | recompute the pack stamp and compare to `MESHSTAMP` in the page | FAIL a660e9769efa vs 16f8119a0d93 (trimesh version, not geometry) |

### 5.9 The RGB machine: dichroic combiner and eccentric bushings (`F/revD/detent_rgb_parts.py`)

What it does: puts three laser beams on one axis before mirror 1 so the same scanner draws in colour.

Optics order (declared, lines 9 to 27): blue 450 at x -74 runs the whole length through both dichroics; green 520 at x -56 joins at D1; red 638 at x -38 joins at D2. D1 reflects 520 and transmits 450; D2 reflects 638 and transmits 450 and 520; both shortpass and specified at 45 deg AOI. Blue is the alignment reference because a dichroic is a plane-parallel plate: tilting it shifts a transmitted beam sideways without changing its angle, so alignment is ordered and non-interacting.

Constants: pitch 18.0; optics 12.5 x 1.1 in a 1.35 slot (drop in from above, round seat 12.8); beam bores 9.0 along the bar and per module; bar half depth 8.0 to z 24.0; webs 6.0 thick at y -16..-10 and -42..-36 to z 30.0; bushing OD 15.6, bore 12.2 on a 12.0 barrel, eccentricity 0.55, web clearance 0.3; footprint grows only in X to 108.0 x 65.0.

Construction: the mono chassis code repeated at the longer footprint, plus two webs and an optic bar chamfered before the union; bushing bores as teardrops along Y through each web with an M3 grub tap from the web top; the bar gets a 9.0 teardrop bore along X and one along Y per module, and each optic slot is a box plus a seat cylinder rotated 45 deg in plan. Bushing (lines 262 to 278): 15.6 x 6.0 disc, six 3.2 flutes, a 12.2 bore 0.55 off centre with a cone lead, prints bore up so it has no teardrop. Two bushings 26 mm apart give 2 x 0.55 / 26 = 42.3 mrad of aim and 0.74 mrad of beam per degree of bushing rotation (computed in `verify_rgb.py` lines 71 to 79, which also asserts the range covers a 2 deg module error). The cage reuses `shell()` and `hood()` by rebinding the module globals (`_rgb_globals`, lines 282 to 308) with ten and seven fingers.

RGB sim: the beam is eight segments, each carrying only the colours that have joined by that point, colours mixed additively and normalised to the peak, so switching red off changes every segment downstream of D2 and nothing upstream (`detent-rgb.html` `mix` and `beamTube`).

Known issues the bundle ranks (stated, `CONTEXT.md`): the cage crushes the laser wires (modules end at y -43, shell inner face at -43.4); nothing clamps the barrel inside its bushing (about 15 mrad residual wander); optic slots 1.35 for a 1.1 optic (about 1 deg rock); the 3.0 mirror notch against glass that comes 3.0 +-0.2; thermal above about 30 mW per module; no RGB gauge.

### 5.10 The optical sim that draws the printed parts (`SIM`; `F/revD/pack_meshes.py`; `F/revD/verify_sim.js`)

Mesh packing: each mesh is merged and indexed, vertices quantised to uint16 over the part's own bounding box, indices uint16 or uint32, 4-byte aligned, base64; `MESHMETA` holds offsets, counts, lo and span; `MESHSTAMP` is the first 12 hex of the blob's sha256; `--inject` splices it between two comment markers. Bought parts (motor, laser, mirror, M4 screw, a US quarter 24.26 x 1.75 with 119 reeds "because a 71 mm machine floating on an empty grid could be any size at all") are built from the same constants. 88,568 triangles embedded (computed).

Rendering: WebGL2, flat normals from `dFdx/dFdy`, key, fill and teal rim light, culling disabled ("STL winding is not worth trusting", line 787). The beam is a real 8-sided tube at the modelled beam diameter.

Optics: `trace(t1, t2)`: beam from (laserX, 0, H1) along +X; mirror 1 normal `norm(-1, 0, 1)` rotated about Y by t1, mirror 2 normal `norm(0, 1, -1)` rotated about X by t2 (Rodrigues); ray-plane hits P1, P2; reflection `d - 2 (d.n) n`; footprint on mirror 2 in its local frame; screen hit at y = throw; clip flags when the strike radius exceeds `mirrorD/2 - beamD/2`. `solve(u, v)`: Newton with a numeric Jacobian (h 1e-4) from `atan2(u, throw)/2`, 24 iterations, stop at 0.02 mm, reject |t| > 0.9 rad. `buildPlan`: pattern points to step counts with the corrected or the naive map; steps per frame = sum of Chebyshev step distances. `advance(dt)`: step budget `pps dt` walked along the plan; `setSteps` applies `-dir lash/2` at each reversal. Scan field: every commanded point traced and binned into 72 angle bins of max radius, empty bins filled, drawn at 60 mm past mirror 2 with eight spokes.

Readouts (computed at defaults): mechanical step 0.0883 deg, optical 0.1766 deg, spot pitch `2 throw tan(step)` 3.08 mm at 1000 mm, addressable points, half angle, steps per frame, frame time, refresh, pps needed for 20 Hz (`steps x 20`), max optical slew, backlash at screen `2 throw tan(lash)`, pincushion at corner (naive against true at five points), beam on mirror 2 against the clear radius, mirror mass. Flags: beam walking off mirror 2; frame slower than flicker fusion; requested point unreachable; spacing under 21.

Explode (`placements`, lines 574 to 619): every part moves along the way you would pull it (cage +78 z, hood +124 z, motors -70 off their walls, laser (-30, 0, -40), screws +52, hubs +46, mirrors along their own normals by 30), with leader lines; beam and scan field switch off while apart ("a beam through a dismantled rig is a lie").

`verify_sim.js`: evaluates the page's own script with stubbed DOM and appends checks that apply `placements()` matrices to landmarks (hub seat, notch floor, mirror faces, motor faces and can centres, laser tip and tail, shell and hood landmarks including the hood stood back up from print orientation, the quarter's size against the Mint spec, explode endpoints) and asserts the drawn mirror normals equal the normals `trace` reflects off, to 0.002 mm (computed: all pass).

### 5.11 Firmware 1.3: queue, ISR, Bresenham, lash and safety (`FW`)

Target ESP32-C3 SuperMini, Arduino-ESP32 core 3.x. Pins: X = GPIO 0, 1, 3, 4; Y = 5, 6, 7, 10; laser GPIO 20 (U0RXD, quiet at boot) through 470R to a 2N2222; avoided GPIO 2, 8, 9 (strapping) and 21 (U0TXD boot log). All nine pins are below 32, so each phase is one `W1TC` then one `W1TS` register write from precomputed masks. Half-step table `0001 0011 0010 0110 0100 1100 1000 1001`, never IN1+IN3 or IN2+IN4. 63.68395:1 gearbox, 4075.7728 half steps per revolution, 0.0883266 deg per step.

Step ISR (`onTick`, lines 180 to 252) on a gptimer at 1 MHz resolution with the alarm at `1000000 / TICK_HZ` = 50 us (the line 776 comment says 100 us; the arithmetic gives 50): settle countdown; pop a segment, set the laser from bit 0, planned flag from bit 1 (value 2) of the flags; Bresenham setup `err = 2 minor - major`; reset the ramp counter on a reversal of either axis; after an idle release, re-energise the last phase and hold `TICK_HZ / 33` ticks (about 30 ms); unplanned segments ramp from 3x the interval at standstill linearly to 1x over `rampSteps` (`iv + 2 iv k / rs`); planned segments run their interval verbatim.

`moveToSteps` (lines 276 to 322): clamp to asymmetric soft limits when on; on a reversal queue a take-up segment of `lashX` or `lashY` steps with the laser off at the slower of draw and travel; split long moves into chunks of at most 2000 steps. Inversion is applied at the phase advance (`stepAxisX/Y`), so jog, raw steps and mm moves all invert while the logical counter follows the command ("Putting it in the kinematics only ever affected mm moves, which is why jog would not invert").

Kinematics in (u, v) = (tan 2 thetaX, tan 2 thetaY): ideal `a = atan2(x, throw + sep)`, `u = tan a`, `v = y cos a / throw`; measured `u = (h0 x + h1 y + h2) / w`, `v = (h3 x + h4 y + h5) / w`, `w = h6 x + h7 y + 1`; inverse by the adjugate; steps `round(atan(u)/2 in deg / 0.0883266)`.

Loop: line assembly with a 400-character guard; status line every 150 ms while moving and every 700 ms idle so a lost notify cannot wedge host flow control; dead-man: laser on, queue empty and host silent for 5 s turns the laser off with `warn deadman beam off`; idle release after `idleReleaseMs` (4000); BLE disconnect calls `stopAll(true)`. Config persists as one `Preferences` blob in namespace "detent". BLE NUS name "DETENT", MTU 247, notify in 180-byte chunks with 2 ms gaps.

Protocol (line based, same over USB CDC and NUS): `?` status (`st q= free= px= py= lx= ly= mx= my= run= drop= rate= lon= map= cs=`), `V` identify, `H` home, `S x,y,l[,iv] ...` batched absolute steps with an optional planned interval, `M x y l` mm, `J dx dy`, `L`, `R rate travel ramp`, `B lashX lashY`, `G throw sep w h`, `I invX invY`, `N` limits, `U` enforce, `P n` capture corner, `A margin` limits from corners, `Y h0..h7` homography, `E`, `D idle`, `X` stop, `W` persist, `Q` dump as `qc1`..`qc4 end` for adopt, `C` one-line config.

Defaults: rate 400, travel 500, ramp 150, limits +-2000 off, throw 150, sep 22, field 120 x 120.

Motor test sketch (`F/beam/detent_motortest.ino`): no BLE, ISR or queue; blocking half steps; `p` PIN WALK drives each of the 8 phase pins high for 1 s named by wire colour; `s` sweeps 40 to 1000 steps/s to hear the stall; 1 to 8 hold a phase for metering.

### 5.12 Control app: plan, preview, calibrate, stream (`PL`)

Pipeline `rebuild()` (lines 1318 to 1374): read geometry, limits and motion; `currentStrokes` by source; `optimise` (nearest neighbour with optional flip; unidirectional keeps one approach direction); `quantise` (sample each segment at one step or finer, drop duplicates, pen-up and pen-down points); `planSpeeds`; `simulate`; `lashError`; `stepCost`; readouts; draw.

| kernel | algorithm and constants | lines |
|---|---|---|
| `solveH(pts)` | 8 x 8 Gauss-Jordan with partial pivoting from four (x, y, u, v); rows `[x y 1 0 0 0 -ux -uy]` and `[0 0 0 x y 1 -vx -vy]`; null at pivot under 1e-14 | 537 to 558 |
| solve residual and quad aspect | push each corner mm through the map and compare to captured steps in mm (target under about 0.3 mm, manual); aspect = mean horizontal tangent span over mean vertical; warn when off the field W:H by more than 25 percent; FIT FIELD H sets H = W / aspect | 1882 to 1926 |
| `planSpeeds` | per point cap `vFloor + (vmax - vFloor) ((cos + 1)/2)^1.5`, vFloor 120 at both ends; forward pass `v_i <= sqrt(v_{i-1}^2 + 2 A d)`; backward pass the mirror; `iv = round(20000 / max(60, v))` clamped 1..65535; A from the accel field (default 3000, floor 200) | 1104 to 1151 |
| `simulate` | replay the firmware lash insertion, then a hysteresis band of half the measured slack per axis | 1236 to 1257 |
| `lashError` | subtract the mean error vector, report the worst residual (a uniform offset does not matter, the doubled line does) | 1263 to 1278 |
| stroke font | `GLYPH` on a 0..10 x 0..14 box, M L Q only, A to Z, 0 to 9 and 13 punctuation; `subdivQ` flattens by midpoint distance, depth 8 | 580 to 683 |
| SVG import | DOMParser; M L H V C S Q T A Z relative and absolute; rect, circle, ellipse, line, polyline, polygon; nested groups; translate, scale, rotate with centre, matrix; cubic flatten by control-point distance over chord, depth 9; arcs by endpoint-to-centre conversion at 0.12 rad; y flipped | 920 to 1093 |
| image raster | luma `(3R + 6G + B)/10`; rows at pitch x mm per step; serpentine runs of dark pixels; runs under 0.4 step dropped; reorder off | 868 to 915 |
| 3D sources | cube, tesseract (4D rotation in xw and yw at ratio 0.63, perspective `2.6/(2.6 + w)`), icosahedron (edges at the minimum vertex distance), torus knot p 2 q 3, lissajous 3:4:5, sphere rings; each edge its own stroke | 686 to 802 |
| `streamCmds` | batches of 6 points per `S` line to stay under the BLE MTU; send only while `free >= batch + 8`; poll `?` after 25 stalls of 40 ms; decrement free locally | 1768 to 1795 |
| live steer | pointer to mm to steps, coalesced to about 30 Hz (33 ms) with a 36 ms trailing flush ("AUDIT FIX"); shift-drag lights the beam; keepalive `?` every 2 s while the beam is held on | 2094 to 2182 |
| stall hunt | per axis, rates 500, 650, 800, 950, 1100, 1300, 1500; triple home blink 120 ms on and off; out-and-back legs of 240 steps ramping from 120 over `min(60, total/3)`; drain; "Set draw rate to about 70 percent of the last clean rate" | 1990 to 2043 |
| test patterns | LASH (same line both directions), RULER (ticks at 1, 2, 5, 10, 20, 50 steps), SQUARE with diagonals; a rate-ramp fan exists in `calStrokes` with no button | 831 to 865 |

Adopt on connect: connect sends `V` then `Q`; `parseQc` fills every control from `qc1`, corners from `qc2`, the homography from `qc3` and rebuilds on `qc4 end`. SEND pushes G R D B I N U Y; ADOPT sends Q; PERSIST sends W. Invert sends `I` and does not change the preview.

The manual's aperture rule: deflection 0.1766 deg per step, so limits spanning N steps make an N x 0.1766 deg cone; a window at distance d from the Y mirror must be at least `2 d tan(half angle)` plus the beam diameter; capture corners inside the clear opening and let FROM CORNERS make the limits a software aperture.

Default kinematics check (computed by `fwtest`): 60 mm right at throw 150, sep 22 is 109 steps (0.550 mm per step); 60 mm up is 123 steps.

### 5.13 Further mechanisms found on the checker pass (2026-10-05)

Read from the code; the first pass of this record left them out.

1. Glass mirrors in the RGB machine (`F/revD/detent_rgb_parts.py` docstring lines 29 to 41). The molybdenum mirrors are swapped for front-surface glass of the same 20.0 x 3.0 size, so the notch, pocket and hub are unchanged and `detent_mirror_hub_x2.stl` is the same part. Stated reasons: molybdenum reflects about 55 to 60 percent in the visible and is worst at blue; enhanced aluminium glass is above 94 percent from 450 to 650 nm and all-dielectric above 99 percent from 450 to 700; 2.4 g of glass against 9.6 g of molybdenum cuts mirror inertia about fourfold. The RGB sim header reads "mirror 20 x 3 glass" (`shots/d05`).
2. Why bushings and not set screws (same docstring, lines 43 to 60, stated). A cheap 12 mm module is 1 to 2 deg off its own barrel (1 deg is 17 mm at a metre). At an 18 mm module pitch a ring of radial set screws needs the neighbour's space and leaves at least one screw where no driver reaches, so each module sits in two eccentric bushings turned by hand from the open back and locked by one grub straight down through the web.
3. Laser polarity and coil control in firmware 1.3. `Config.laserHigh` (line 54, default 1) sets the gate polarity inside `writeLaser` (line 115), so every path that drives the beam honours it; `E 0|1` releases or energises the coils by hand; `H` zeroes both counters, flushes and puts the lash side back to positive; `X` flushes, kills the beam, clears the dropped count and sets the logical position to the physical one (`stopAll`, line 427), so the next move plans from where the shaft is.
4. Corner capture protocol. `P n` stores the current logical position as corner n in the order TL TR BR BL and sets bit n of `cornerSet`; `P` alone reports all four; `A margin` (default 4 steps) turns the four corners into asymmetric soft limits and enables them, refusing until all four bits are set; `Y` with fewer than eight numbers clears the homography and falls back to the ideal model. A full queue increments `dropped` (line 265), which the status line reports as `drop=`.
5. Sim pattern library (`SIM` `pathPoints`, lines 342 to 360). Circle of 181 points; square of four 40-point sides; 5-point star drawn as the {5/2} polygon, ten 24-point legs; lissajous 5:4 with a 0.7 rad phase over 401 points; spiral of three turns over 361 points; a calibration grid of 5 horizontal and 5 vertical lines (4 divisions), 41 points each, drawn serpentine, rows then columns; manual jog. Steps per frame is the Chebyshev sum including the closing leg back to the start.

---

## 6. UX anatomy

Sim (dark instrument shell): header pills (mirror, envelope, part count, cage, source, build stamp, state); left rail A optical bench (spacing, mirror and beam diameter, throw), B motor (half 4076, full 2038, half plus 2:1 belt; pps 50 to 1600; backlash 0 to 3 deg; model backlash, quantise), C pattern (circle, square, star, lissajous 5:4, spiral, calibration grid, manual jog; size; running, laser, clear, correction or naive map), D view (base, motors, cage, hood, quarter, scan field, axes, grid, wireframe, explode); stage WebGL2 with vignette, legend and HUD (drag orbit, wheel zoom, shift-drag pan); right rail 600 x 600 screen scope with fading trail and the ideal reference, 360 x 180 beam footprints on both mirrors, E readouts with warn colours and flags, F printed parts, H print check with the build stamp, G measured component data. No hook, no exports. Under 1080 px it stacks.

App (hack.build paper shell, `--pink #FE0386`, Permanent Marker, VT323, Special Elite, IBM Plex Mono, grain, block shadows): header mark, DETENT. wordmark, chips LINK, BEAM, POS, Q; USB, BLE, MANUAL, STOP. Left: RIG GEOMETRY, MOTION (SEND, ADOPT, PERSIST), JOG AND HOME, LIMITS, FOUR CORNERS (TL TR BL BR tiles, CAPTURE, GO TO, SOLVE, CLEAR, mapping, residual, quad aspect, FIT FIELD H), TEST PATTERNS with STALL HUNT. Stage: target canvas (field, step lattice when legible, ghost ideal path, the stepped trace in pink, dashed travel, live beam dot, "CLIPPING AT LIMITS" banner, zoom about the cursor 0.4 to 60) and a 3D rig canvas. Right: CONTENT, PATH (planner, reorder, unidirectional, ideal overlay, step grid; strokes, points, draw and travel steps, runtime, out of bounds, lash distortion), RUN (PREVIEW, ANIMATE, PLOT, LOOP, window free, sent). MANUAL overlay and a CONSOLE. Every control has a tooltip from `TIPS`. Works offline as a simulator ("[sim]" lines).

What makes it excellent: the sim draws the exact meshes you print and proves it with a hash and a landmark harness; every optical limit is a live readout with a flag; the app's preview is what the firmware will execute (same quantisation, same lash insertion, same planner intervals); the board is the source of truth and the page adopts it on connect; calibration is four corners and one button with an honest residual.

---

## 7. Tests and harness

- `verify.py` (76 checks) and `verify_rgb.py`: run 2026-10-04, 75 of 76 OK, the stamp fail explained above (computed).
- `verify_sim.js`: all pass, 88,568 triangles (computed).
- `fwtest.cpp`: compiled with c++17 and run on 2026-10-05: exact positioning, lash 7/5 lags and returns, diagonal 200 x 100 max `2y - x` deviation 1, a 9000 x 4500 move in 5 segments of at most 2000, clamp to (260, -260), reversal post-turn gap 41 ticks against cruise 23, planned interval 40 honoured; "ALL FIRMWARE MOTION TESTS PASS" (computed, `F/records/fwtest_run_2026-10-05.txt`). Its "copied verbatim" core has drifted from 1.3: `TICK_HZ 10000` (firmware 20000), symmetric `limitX/limitY` instead of asymmetric limits with `limitsOn`, `writeLaser(s.laser != 0)` instead of bit 0, and inversion still in `mmToSteps` (found here, by reading).
- `fwtest2.cpp`: compiles, then exits 139 (segfault) because it reads `h.txt` with no null check and `h.txt` is in no bundle (computed 2026-10-05); the plan records `h.txt` as missing and not to be fabricated (M07, D-149, D-180).
- Playwright: `audit_test.py` (qc adopt, SVG import, image raster, sketch, clip banner), `caltest.py` (free jog, asymmetric limits, four-corner solve on (-150, 140), (170, 155), (165, -130), (-160, -145), capture, invert sends `I 1 1` with steps unchanged), `plantest.py` (ramps from standstill and slows into a 90 deg corner by more than 1.5x cruise, batch tokens carry 4 fields, planner off strips iv, hunt logs), `narrow.py` (no horizontal scroll or clipped controls at 1100, 1400, 1920). Not re-run here.
- This folder's drive: `drive/shoot.cjs` with three configs, zero errors (measured).
- Checker pass 2026-10-05: 41 claims re-read against `P`, `verify.py`, `SIM`, `FW` and `PL` (print constants and fits, `lay`, `wcut` and the rev C rotation, chassis build order, hub build order, finger counts and widths, belt band, aperture and funnel, louvre bands, hood lights, the vee modes, `bed_chamfer`, `clean`, verifier sweep and ray counts, the optics trace and Newton solve, ISR ramp, lash take-up, chunking, kinematics, status and dead-man timers, `planSpeeds`, `solveH`, `simulate`, `lashError`, stream batching, stall hunt, image raster). Three were wrong and are corrected above: the saddle top (26.0, the comment's 27.6 is stale), the hood snap slack (0.60, not 0.30) and the rail chamfers (an inner 0.4 as well as the outer 0.8); the lug seat is now stated as its real pocket size. All eight shots were opened and show what their captions say.

---

## 8. Known defects and stale numbers found while reading

- `SIM` print table (lines 999 to 1016) is stale against rev D: snap vee "1.0 groove / 1.4 rib" (code 1.0 / 1.1), "snap finger strain 1.09 % at 24 mm" (verifier 1.23 at 19.4), "beam aperture 26.0 x 24.0" (code 30 x 30), "widest bridge span 2.6 mm" (verifier 0.2 on the chassis), cage "80.0 x 74.0" and hood "83.2 x 77.2" (79.6 x 73.6 and 82.8 x 76.8), snap gauge "40 x 18 x 26" (40 x 32 x 26), header envelope "71 x 64 x 63" (71.0 x 65.0 x 62.8). The `G` object (line 273) is dead rev B state. The RGB sim corrects the aperture row and its part sizes; its snap, strain and span rows stay stale.
- Build notes assembly step 3: "The mirror centre lands 15 mm in front of the wall" (STANDOFF is 22.5, MIRC 21.0).
- `detent_rgb_parts.py` docstring says "about plus or minus 4.9 degrees of aim, ... 0.7 mrad"; its own verifier and notes give 42.3 mrad (2.4 deg) and 0.74 mrad per degree. `_rgb_globals` sets `LOUVRE_X` and `HOOD_VENT_L`, which `shell()` and `hood()` never read (their ranges are literals), so the RGB cage has no louvres or hood vents over the combiner bench (x -86 to -42); found here by reading, not by a mesh check.
- `FW` handles BLE writes inside `RxCB::onWrite` and notifies from there (`handle` then `emit`), the pattern WASHER's firmware calls "the NimBLE trap" and moved to `loop()`.
- `FW` line 776 comment "100 us" against 50 us computed.
- The sim's drive mode is 4076 half steps per rev; the firmware and app use 4075.7728.
- `PL` markup defaults draw 700 and travel 900 while the firmware defaults are 400 and 500 and `S` starts at 400 and 500; the inputs win at the first rebuild.
- The overhang metric is still ungated in rev D's layer walk (section 5.3).
- `P` line 141 comment gives `SAD_TOP` 27.6; the expression evaluates to 26.0 (section 5.1). The sim's dead `G` object carries the same 27.6.

---

## 9. How to make a new thing this way

1. Generate every part from constants at the top of one file; take bought-part dimensions from a measured library and write where each number came from.
2. Put print physics into the geometry: whole layers, whole extrusion lines, diametral allowances by hole orientation, a stepped bed chamfer, and slicer compensation off.
3. Make every horizontal opening a gable or teardrop through one helper that maps profile +v to world +Z, and test the apex direction.
4. Chamfer sub-solids before the union, build offsets from scratch, and keep the repair that is actually watertight and one body.
5. Snap covers on vee fingers slotted free of the wall, with an uncut belt so the cage stays one body, and size apertures from the field's corner.
6. Verify the assembly by rebuilding the bought parts and trying to prove it wrong: interference, swept envelopes, rays along the beam, a swept driver, a layer walk.
7. Embed the exported meshes in the sim with a hash, and test the sim's own placement code against CAD landmarks.
8. On the device, plan on the host and execute verbatim on the board; ramp at reversals; take up lash slowly; invert at the phase table; keep the board the source of truth with adopt on connect; never be silent; kill the beam on silence and disconnect.

---

## 10. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| two-mirror stepper scanner layout and optical trace | sim, geom | bore, pocket, screw, window | MISSING | MISSING (`machines/two-mirror-scanner` proposed in `benches-machines.md` line 257, not in M11) | none | MISSING |
| 28BYJ-48 through-wall mount, front-driven self-tapped M4 | geom, catalog | bore, screw (driverAxis, reach) | MISSING | MISSING | M04 (CHK-ASM-01 driver reach) | MISSING |
| mirror hub: D bore with lead-in, notch press, fluted collar | geom | bore, pocket | MISSING | MISSING | none | MISSING |
| teardrop and gable via `wcut` | mesh | bore (teardrop), window | n/a (print rule) | MISSING | M04 (CHK-PRT-08 apex, CHK-PRT-13 overhang) | MISSING |
| stepped bed chamfer, `lay`, line-multiple walls, hole allowances | mesh, profile | relief | n/a | MISSING | M04 | MISSING |
| snap cage: vee fingers, belt band | geom | snap | snap-vee-finger-cage (candidate, CANONS.md line 437; belt rule lines 451 to 454) | MISSING | held until D-202 | MISSING |
| fit gauge and snap gauge coupons | profile | coupon | n/a | coupons/fit-gauge (named in M11-reference.md line 475; not yet in `reference/`) | M11 | MISSING |
| `clean()` candidate repair, exact offsets | mesh | none | n/a | MISSING | none | MISSING |
| assembly verifier (sweep, rays, driver, layer walk) | checks, sim | none | n/a | MISSING | M02, M04 | MISSING |
| mesh pack with stamp and `verify_sim.js` landmark parity | sim, ui-core | none | n/a | MISSING | M04 (stale-sim check, M04-checks-project.md line 682) | MISSING |
| RGB dichroic combiner and eccentric bushings | geom, catalog | bore, pocket | MISSING | MISSING | none | MISSING |
| firmware step ISR, queue, lash take-up, phase-table inversion | link (M13) | none | n/a | MISSING | M13 (DETENT firmware test) | MISSING |
| step-space planner `planSpeeds` | motion | none | n/a | MISSING | M07 (`planners/detent-steps.ts`, golden iv 167, 50, 91, 61) | MISSING |
| four-corner projective calibration in tan space | motion | none | n/a | MISSING | M07 (`detent-cal.json`, worst round trip 0.2876 mm) | MISSING |
| text line protocol, credit window, adopt on connect, dead-man, heartbeat | link | none | n/a | MISSING | M13 | MISSING |
| stroke font, SVG import, image raster, 3D sources | motion (sources) | none | n/a | MISSING | M07 | MISSING |
| BEAM monorepo (core, sources, link, studio) | out of plan scope (PRD v0.1, `F/beam/hackbuild-beam-prd.md`) | none | n/a | n/a | M16 registry | MISSING |

`lineage.json` holds three rows, none for DETENT (checked 2026-10-05). M07 plans `designs/detent/legacy/{detent-plot.html,detent-latest.zip}` (M07-motion-nest.md lines 210 and 257); M16 verifies a `designs/detent/` folder.
