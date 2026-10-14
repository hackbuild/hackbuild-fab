# WASHER: how it is made

Record written 2026-10-05 from the original code. Slug `washer`. Family counters-machines (KNURL, DETENT, WASHER, PLENUM, QUENCH, COFFER). WASHER is the pan/tilt servo laser: a 5 mW 405 nm diode aimed by two 9 g hobby servos on a printed head, drawing on glow paint, driven by `laser-rig.html` (a three.js sim plus plotter), a round touch face for a round display (`washer.html`), and a CLASP edition that lets strangers draw on a rig in a window. The chat called it a galvo; there is no galvanometer, the servos aim the diode itself.

Number rules for this file. A number that names a code location is a declared value copied from that line. "Computed" means produced by the canonical code on 2026-10-05 in headless Chrome (`fab-knowledge:originals/washer/drive/plan-square-2026-10-05.json` and the drive logs). "Measured (bench)" marks figures the code's comments or the PRD report from hardware sessions; they are stated by the source and not re-measured here. "Stated" quotes page copy.

Short paths: `F` is `fab-knowledge:originals/washer/files/`. `LR` is `F/rig/laser-rig.html` (6037 lines). `FW` is `F/rig/PanTiltLaser.ino` (1204 lines).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "LASER RIG" (`LR` title), board name "LASER RIG", round face "WASHER" |
| owner's slug | washer |
| canonical bundle | `~/Downloads/laserriggg.zip`, sha256 c4db09061623440cdb18a09a561f5090330ac7adab1a9bbaee40b85fbdc4c1a1, 292879 bytes, dated 2026-08-01 13:58 (zip entries 2026-08-01 20:58); byte-identical copy `laserriggg (1).zip` (2026-08-04) |
| canonical app | `LR` sha256 38a2c04770ba85a9afea7aa8ff4b988174d2246bb7ce8657851c5aefce411f9c, 308658 bytes (equal to `~/Downloads/laser-rig (33).html` and `(34).html`, 2026-07-30 21:12 and 21:34) |
| canonical firmware | `FW` sha256 9833e0176ca81ff7dbb70256c000bb0830879cf4657b016fc996b2138dbe3a94, 55769 bytes (equal to `PanTiltLaser (7).ino`, `(8).ino`); the copy embedded in `LR` lines 489 to 1697 is identical (computed) |
| bundle companions | `F/rig/hackbuild-laser-rig-prd.md` (the monorepo PRD with the invariants registry), `F/rig/servo_base_lego.scad`, `F/rig/stl/servo_base.stl`, `galvobody.stl`, `galvobrack.stl` |
| other surfaces | `F/face/washer.html` (round face, 2026-07-23); `F/clasp/PanTiltLaserCLASP.ino`, `laser-draw.html`, `laser-config.html`, `laser-sim.html` (the CLASP edition, harvest copies) |
| runtime | `LR`: three.js r128 and Font Awesome 6.5.1 from cdnjs, Google Fonts; opens from `file://`; the printed parts embedded as deflated int16 meshes (23 KB, lines 2534 to 2538) |

### 1.1 Every revision found

All in `~/Downloads`, dated by mtime (computed 2026-10-05).

| file | dates | bytes | note |
|---|---|---|---|
| `laser-rig.html`, `(1)` to `(8)` | 2026-06-09 to 07-17 | 70832 to 108610 | early sim and plotter |
| `laser-rig (9)` to `(12)` | 2026-07-23 to 07-29 | 138756 to 154006 | `(10)` to `(12)` equal the harvested upload `laser-rig__12_.html` |
| `laser-rig (13)` to `(27)` | 2026-07-30 10:51 to 18:20 | 163823 to 270419 | planner rewrite, servo model, packed binary |
| `laser-rig (28)` = harvest `outputs/laser-rig.html` | 2026-07-30 18:25 | 271133 | sha 1b4f11d80a37b488; pinned by M07 |
| `laser-rig (29)` to `(32)` | 19:21 to 20:25 | 282617 to 297838 | hermite wire format, TX ring |
| `laser-rig (33)` = `(34)` = zip | 21:12, 21:34 | 308658 | canonical |
| `PanTiltLaser.ino` to `(8).ino` | 2026-07-17 to 07-30 21:34 | 16173 to 55769 | `(4)` = harvest (42664); `(7)` = `(8)` = zip |
| `PanTiltLaserCLASP.ino` | 2026-07-23 22:22 | 33472 | earlier than the harvest CLASP edition (34732) |
| `washer.html`, `(1)`, `(2)` | 2026-07-17 to 07-23 | 32011, 31614, 31932 | `(2)` = harvest |
| `round-display.html` to `(4)` | 2026-07-17 | 40401 to 426753 | earlier round face experiments |
| `washer_demo.ino` | 2026-08-07 20:52 | 10867 | standalone "chaos" pattern firmware aimed at the NACELLE glow cube, kept in `F/history/` |

### 1.2 Why this revision

The 2026-08-01 bundle is the newest and the best, and it was assembled on purpose: firmware, app, PRD and parts in one zip. Against the harvested 2026-07-30 18:25 pair it adds the A4 hermite packet (position and velocity continuous across segments, curved splices over lost packets), a tangent overshoot clamp, an EMA loss estimator, a starvation gate, a TX ring so replies never block the segment servicer, `getData()` instead of a C string for BLE bytes ("This one line was the whole of plotting over bluetooth barely works", `FW` lines 1018 to 1024), per-axis lead, a digital twin viewport, a time-aware emission error metric, credit flow control from the board's `@` reports, and BLE writes with response. Nothing is removed. The PRD records bench measurements for several of these (section 5.6). The drive on 2026-10-05 opened `LR`, `washer.html` and `laser-config.html` with zero page or console errors (measured).

The plan pins the older harvested file: M07's WASHER golden (60 mm square, duration 2.2983 s, peak 143.669 mm/s, corner 29.461, mid-side 95.505) is reproduced exactly by `F/history/laser-rig-2026-07-30-harvest.html` and not by the canonical file, which plans the same square in 1.1703 s with peak 260 mm/s, corner 29.461 and mid-side 260 (computed, `drive/plan-square-2026-10-05.json`). The defaults changed (`feed` 160 to 260, `steps` 1.0 to 4.0, `buffer` 90 to 150); the planner code path for this square is the same.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `rig/laser-rig.html` | the canonical app |
| `rig/PanTiltLaser.ino` | the canonical firmware |
| `rig/hackbuild-laser-rig-prd.md` | the monorepo PRD: packages, theme layer, 27 invariants, fidelity budgets |
| `rig/servo_base_lego.scad` | SG90 pan base on a 6 x 6 LEGO plate footprint |
| `rig/stl/servo_base.stl`, `galvobody.stl`, `galvobrack.stl` | the printed head (from the bundle) |
| `clasp/PanTiltLaserCLASP.ino`, `laser-draw.html`, `laser-config.html`, `laser-sim.html` | the public unattended edition and its three relay apps |
| `face/washer.html` | the round touch face |
| `history/laser-rig-2026-07-30-harvest.html`, `PanTiltLaser-2026-07-30-harvest.ino` | the versions the plan pins |
| `history/washer_demo.ino` | the standalone pattern firmware |

The bundle's 1.6 MB `servo_base_lego.stl` (sha256 767d659286112adf...) is left out because the copied SCAD regenerates it. Hashes: `fab-knowledge:originals/washer/SHA256SUMS`.

---

## 2. What it makes and for whom

A drawing laser for a maker with an ESP32 board, two SG90 or MG90S servos and a 5 mW 405 nm module: text, SVG, images, freehand sketches and live finger painting land on a glow-paint target (default 305 x 305 mm at a 152 mm throw, rig 70 mm up, `LR` lines 2172 to 2184), and a public edition lets passers-by draw through a QR code. The engineering is about making a cheap servo plot cleanly: a planner bound by servo physics, a segment queue played on the board's clock, a packed escaped CRC binary stream that survives BLE, board-held configuration, and an honest sim of servo deadband, frame latching, acceleration and backlash.

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/washer/drive/shoot.cjs` (puppeteer-core, headless Chrome with SwiftShader and timer throttling off, 1280 x 860) with `drive/shots-rig.json`, `shots-apps.json`, `shots-config.json`.

| file | caption |
|---|---|
| `shots/w01-rig-idle-text-preview.png` | LASER RIG at load: header (SIM ONLY, Serial, Bluetooth, Firmware), the phosphor sim (target plane, the printed head with the brass module), Machine column (jog, ZERO, corners), Job column (Plot, Pause, Stop, Frame the job, speed, Source text "HACK.BUILD" cap 120), status bar (state, link, beam, job "2581 mm, 15.1 s", stream, STOP). At defaults the text is 802 x 120 mm on a 305 mm target and the bounds warning offers "Fit it" (computed). |
| `shots/w02-rig-live-paint-glow.png` | Live paint: a pointer loop drawn on the live pad lands as a fading violet glow on the sim target; readouts pan 121.8, tilt 114.1. |
| `shots/w03-rig-fit-preview-tuning.png` | After Fit to wall: the Plot preview canvas with HACK.BUILD coloured by speed, job 833 mm, 6.9 s. |
| `shots/w05-washer-round-face.png` | WASHER round face: 100 vmin dial, LINK and BEAM dots, DRAW mode tag, graticule with pan and tilt +-30 labels, dock of connect, arm, centre and settings buttons. |
| `shots/w06-clasp-config-app.png` | CLASP installer: install geometry (needs 90.2 deg of pan and 81.8 deg of tilt), motion, pulse window and home, unattended limits, rig status, jog stick. |

A plot in headless SwiftShader paused itself at 1 percent every time: `streamTick` treats a tick gap over 0.4 s as a throttled tab, sends FLUSH and L 0, and pauses (`LR` lines 4894 to 4911). That is the guard working on a slow renderer, not a defect.

---

## 4. Code map

### 4.1 App `LR`

| area | lines |
|---|---|
| CSS (paper shell with the older pink token, Courier Prime) | 13 to 466 |
| header, embedded firmware `<pre id="fwCode">` | 471 to 1697 |
| Machine column, viewport, aim and live pads, console, Job column, status bar | 1698 to 2048 |
| stroke font (94 glyphs, cap 14, x-height 9, descender -4.5, M L Q) | 2060 to 2166 |
| `CFG`, pulse map, `vOff`, `ik`, `sweepDeg` | 2172 to 2223 |
| `fkCalib`, `fk` | 2236 to 2280 |
| servo model `sim` | 2301 to 2386 |
| phosphor wall | 2394 to 2432 |
| three.js scene, wall | 2439 to 2518 |
| embedded printed parts `MESH_B64`, `meshGeometry`, `MOUNT`, `buildServo`, `buildRig`, beam | 2534 to 2740 |
| render loop | 2777 to 2860 |
| sources: text, SVG, image, test, draw; place, fit, optimise | 2869 to 3230 |
| `LINK` (Web Serial and Web Bluetooth, serialised BLE writer) | 3262 to 3417 |
| capability flags, `afterConnect`, `adoptBoardConfig`, `onLine` | 3421 to 3605 |
| `calibMap`, `wallToAngles`, `stepTo`, jog, zero, corners | 3620 to 3728 |
| `PLAN`, `SERVOS`, planner constants | 3766 to 3849 |
| curve refinement, merge, fillet, dedupe, densify | 3871 to 4107 |
| servo-space limits `degPerMm`, `resolutionSlew`, `sampleStepMM`, `resolutionMM` | 4119 to 4176 |
| `planChainPen` | 4179 to 4308 |
| `buildTimeline`, `withGates`, `nextGate`, `sampleAt` | 4315 to 4470 |
| `preparePath`, `fitToWall`, `pushConfig`, `smoothReadout`, `boundsCheck`, `replan` | 4473 to 4618 |
| preview, status bar, frame job, e-stop | 4620 to 4848 |
| `runPlot`, `streamTick` | 4850 to 5002 |
| packing: `crc8`, `escapeFrame`, `packSegmentsH`, `packSegments`, `packRun` | 5029 to 5153 |
| `TWIN` (local copy of the board's interpolator), `bufTarget`, `usVelAt`, `playbackError` | 5161 to 5290 |
| `emitSegments`, `flushSegments`, `emitFrames`, `finishPlot`, `togglePause` | 5297 to 5493 |
| aim pad, live pad | 5502 to 5718 |
| `wireUI` and boot | 5724 to 6033 |

### 4.2 Firmware `FW`

| area | lines |
|---|---|
| doc header: pins, laser drive, safety, wire protocol, binary formats, BLE backend | 1 to 196 |
| pins pan 26, tilt 25, laser 23; NUS UUIDs | 205 to 214 |
| state and persistent config | 216 to 249 |
| BLE RX ring under a portMUX, TX ring | 256 to 279 |
| `driveLaser`, `clampUs` | 284 to 298 |
| dither and `applyServos` | 300 to 340 |
| attach and detach | 342 to 356 |
| segment struct and queue (48) | 358 to 380 |
| NVS save and load, `configLine`, `configSet` | 383 to 474 |
| binary magics, per-transport framers, CRC-8 | 476 to 515 |
| `segPush`, `serviceSegments` (hermite playback) | 517 to 650 |
| `reply` into the TX ring, `sendStat` | 652 to 677 |
| `binSegment` (sequence gap stretch), `binFeed`, `binIdleCheck` | 684 to 815 |
| `handleLine` (text protocol) | 817 to 998 |
| BLE callbacks (buffer only) and setup | 1000 to 1063 |
| `setup`, `loop` (drain, trickle notify, service, report, dead-man) | 1068 to 1204 |

---

## 5. Mechanisms and constructions

### 5.1 The printed pan/tilt head (`LR` lines 2519 to 2708; `F/rig/stl/`)

Three printed parts: `servo_base` (a pocket for the pan servo, shaft up, tab ledge at z 14.0), `galvobody` (bolts to the pan horn; a 3 mm plate with a 24 x 12 through-slot takes the tilt servo), `galvobrack` (bolts to the tilt horn on the inboard face; a 12.5 bore holds the 12 mm module). Kinematic chain and mounting numbers read off the STLs (`MOUNT`, declared): pan horn top 20.2; pan shaft 5.6 off the pocket centre; tab ledge z 14.0; body offset 1.5 to put the horn boss on the pan axis; plate inboard face -11.5; tilt shaft 27.5 above the body base; bracket bore 8.79 from its mount face "so the beam pivots on the axis rather than swinging around it"; module 35 long, r 6.0, bore r 6.25. The 9 g servo proxy is 22.5 x 22.7 x 11.8 with tabs 32.2 and the shaft 5.9 from one end. Harvest STL sizes: servo_base 51.0 x 45.1 x 16.0, galvobody 26.0 x 51.0 x 23.0, galvobrack 20.0 x 17.6 x 17.6 (`fab-knowledge:sources/benches/benches-machines.md` line 507).

Mesh embedding: triangles quantised to 0.01 mm as int16, deflated, base64; `meshGeometry` inflates with `DecompressionStream('deflate')`, divides by 100 and builds a BufferGeometry; a block fallback keeps the tool running if decode fails.

LEGO base (`F/rig/servo_base_lego.scad`): SG90 pan base on a 6 x 6 stud plate. LEGO constants (declared): pitch 8.0, stud 4.8 x 1.8, plate 3.2, wall 1.5, roof 1.0 (2.2 cavity), tube 6.51 / 4.8, footprint undersize 0.2; tuning: clutch 0.05 per surface (0 tight, 0.10 easy), servo 22.8 x 12.2 with 0.4 press clearance and 16.0 grip, socket wall 2.0, six buttresses 2.0 thick reaching 16.5, studs on the exposed perimeter, a 6 mm cable notch; tubes under the servo culled by a circle-rectangle clash test. Prints flat, no supports, press-fit servo.

### 5.2 Kinematics: ideal map, home referencing and the bilinear corner map (`LR` lines 2188 to 2280, 3620 to 3651)

Pulse map shared with the firmware: `deg = (us - min) / (max - min) 180`, window 500 to 2500.

Ideal inverse kinematics (`ik`): with D = max(dist, 40) and `vOff = wallH/2 - mountH` (the target sits on the floor and the laser is at mountH), pan `90 + atan2(wx, D)`, tilt `90 + atan2(wy + vOff, hypot(wx, D))`, each with invert and trim, clamped 0 to 180. `wallToAngles` is home referenced: `home + ik(wx, wy) - ik(0, 0)`, so a design lands around the zeroed aim. Sweep readout: at defaults the target needs 90.2 deg of pan and 81.8 deg of tilt (computed).

Calibration: four captured corner aims (TL, TR, BL, BR in degrees); `calibMap` is bilinear in u = (wx + W/2)/W, v = (wy + H/2)/H. `fkCalib` inverts it by Newton with an analytic Jacobian, 6 iterations, u and v clamped to -1.5..2.5. `fk` undoes the home offset before inverting `ik`. Two recorded bugs (comments, lines 2232 to 2235 and 2263 to 2269): fk ignored the calibration, so the sim drew through a different map than the beam; fk inverted `ik` without the home offset, which at a 6 in throw with the rig 70 mm up a 305 mm target drew the design 159 mm away (a 28 deg offset).

Resolution: one deadband step is 1.91 mm on the target at defaults (8 us deadband on a 2000 us window over 180 deg at 152 mm, computed); sources sample at half that, a third with dither, clamped 0.08 to 3 mm (0.96 mm at defaults, computed).

### 5.3 Servo model in the sim (`sim`, `LR` lines 2288 to 2386; `SERVOS` lines 3832 to 3838)

Per axis, each tick: latch the target once per servo frame; inside the deadband (in degrees, `deadband 180 / (max - min)`) do nothing and halve velocity; otherwise `want = clamp(err / band x slew, +-slew)` and accelerate toward it at the accel limit; on a direction change eat `lash` degrees before the output moves. Board `@` reports override the model and are eased with `1 - exp(-18 dt)`; reports older than 400 ms drop back to the model.

| preset | slew deg/s | accel deg/s2 | deadband us | frame Hz | lash deg | band deg |
|---|---|---|---|---|---|---|
| micro9g (SG90, MG90S) | 240 | 1800 | 8 | 50 | 0.55 | 6.0 |
| micro9gm (MG90S metal) | 300 | 2600 | 6 | 50 | 0.30 | 5.0 |
| standard metal gear | 420 | 5000 | 4 | 50 | 0.18 | 3.5 |
| digital high speed | 700 | 9000 | 2 | 200 | 0.08 | 1.6 |

These are declared design values; the source gives no measurement procedure for them.

Phosphor wall: 1024 x 640 canvas; additive strokes of (157, 92, 255) at alpha `0.9 x charge x power + 0.06`, 4 px with a 10 px glow; fade toward black at alpha `clamp(dt 0.55, 0, 0.06)` per frame; 405 nm charges strontium aluminate fully (charge factor 1.0).

### 5.4 The planner: one continuous chain bound by servo physics (`LR` lines 3729 to 4470)

What it does: plans the whole job, beam-off repositions included, as one path whose speed never asks the servos for more than they have.

Pipeline (`preparePath`, `buildTimeline`):
1. Place on wall: centre, scale, mirror, rotate, offset.
2. `refineCurves` (tolerance `PLAN.tol` 0.05 mm): split each stroke at turns over 70 deg (`CORNER_DEG`), run a centripetal Catmull-Rom (alpha 0.5) through each smooth run and flatten by bisection until the midpoint is within tolerance, depth 12. Font curves are quadratics flattened exactly (`qFlatten`, max deviation half the control point's distance to the chord midpoint, depth 16), with tolerance applied in wall millimetres.
3. `mergeStrokes`: join chains whose ends are within `JOINTOL` 0.35 mm.
4. Optional greedy nearest-neighbour ordering with reversal from the parked beam at the wall centre.
5. Stitch: one point array with a per-segment beam flag; gaps under JOINTOL are drawn through with the beam on; a dwell is inserted before lighting the beam after a reposition longer than 5 mm only when `settle` is above 0 (default 0).
6. `dedupeChain` at 0.02 mm, keeping the more permissive beam state across a collapse.
7. `filletChain` (corner 0.3 mm, at most 0.28 of a short segment, steps every 0.4 mm): replace interior vertices with a quadratic Bezier; never at a beam state change; flatness tested against the last KEPT point (testing against the input neighbour collapsed a refined letter D from 106 points to 11, comment lines 4017 to 4024).
8. `densifyChain` at `DENSE` 0.25 mm.
9. `planChainPen`:
   - k = degrees per mm for the busier axis through `wallToAngles` (`degPerMm`); it is not a constant because the wall map is a tangent.
   - per segment cap = min(feed or travel, slew / k, resolution slew / k); the resolution ceiling `max(0.25, steps) x deadband deg x frame Hz` applies to drawn segments only.
   - per segment accel = min(PLAN.accel, servo accel / k x `ACC_SHARE` 0.7), so tangential and centripetal stay inside the servo limit.
   - curvature: circumradius R of each vertex triple, `v <= sqrt(SERVO.accel x 0.7 x R / k)` with the servo's angular acceleration in deg/s2 (line 4235).
   - junction deviation: `v <= sqrt(PLAN.accel x jd x sinH / (1 - sinH))`, `sinH = sqrt((1 - cos)/2)`, jd 0.18.
   - ends at rest; backward then forward sweeps; jerk smoothing by a running mean over `round(jerk x feed / DENSE x 0.5)` samples clamped 2 to 40, keep the lower, re-sweep.
   - time by trapezoid integration `t += 2 ds / (v_i + v_{i+1})`.
10. `withGates`: every beam transition time recorded exactly; `nextGate` binary-searches them. Sampling by segment ends lost strokes shorter than a segment, such as the full stop in a line of text (comment lines 4403 to 4414).

`PLAN` defaults (declared): feed 260, travel 400, accel 8000 (a ceiling above the servo limit), corner 0.3, jd 0.18, steps 4.0, tol 0.05, jerk 0.045 s, settle 0, hz 50, buffer 150 ms, speed 1.

The axis-alternating band: near one deadband step per frame the two axes cross their deadbands at different moments and a diagonal comes out pan-pop, tilt-pop. Smooth regimes are at 2.5 or more steps per frame, or far below one with dither (comments lines 3784 to 3797). `smoothReadout` names which ceiling binds and which regime the settings land in; at defaults "drawing at 260 mm/s, 2.7 steps per frame: both axes step every frame, smooth" (computed).

Computed on a 60 mm square at defaults (canonical): duration 1.1703 s, peak 260 mm/s, corner (30, -30) 29.461 mm/s, middle of a side 260 mm/s.

### 5.5 The hermite segment queue on the board (`FW` lines 358 to 380, 517 to 650; twin in `LR` lines 5163 to 5230)

What it does: the board holds a 48-deep queue of timed segments and plays them on its own clock, so link jitter never becomes beam stutter, and with hermite segments position and velocity are continuous across every boundary.

Segment: `{pan int16, tilt int16, vp int8, vt int8, flags, laser, dur ms}`. `serviceSegments` runs every `loop()` pass:
1. Start a segment from the live pulse and live velocity; continuity holds only if the previous segment ended within 250 ms, else velocity resets to zero.
2. Tangents: a hermite segment (flags bit 0) carries the endpoint velocity in sixteenths of a microsecond per millisecond; legacy segments get chord tangents at both ends, so the cubic is exactly the straight line old senders expect.
3. Overshoot guard: each tangent is clamped to `(3 |chord| + 24) / dur`, which bounds the curve to about 1.4 chords. PRD invariant 14: "Corner splice went from 11.25 mm off path to 1.60 mm" (measured, bench).
4. Start time is the previous segment's scheduled end when chained (no drift accumulation), else now.
5. Evaluate `h00 = (2T - 3)T^2 + 1`, `h10 = ((T - 2)T + 1)T`, `h01 = (3 - 2T)T^2`, `h11 = (T - 1)T^2`, with the velocity from the derivative basis; apply per-axis lead: `pulse = p + lead x vel` (pan answers late because it hauls the tilt assembly; 2 to 3 ms of lead straightens diagonals, comment lines 622 to 628).
6. Write the servos every 2 ms or faster. Writing on a 20 ms cadence is worse: two free-running 20 ms clocks drift and the latched value carries 0 to 20 ms of wander (lines 631 to 639).
7. Land exactly on the endpoint; mark the chain.
8. Starvation gate: with a job armed, a lit beam and an empty queue for more than 300 ms, the beam drops and velocity zeroes; the next segment relights it because each segment carries its own gate.

Dither (`applyServos`, lines 300 to 340): the carrier flips once per 20 ms frame and rides on top of the LIVE command at every write, amplitude `round(0.75 x deadband)`; off by default because it keeps both servos hunting. The first attempt quantised onto a deadband grid, which is not symmetric about the command and "measured worse than not dithering at all" (bench); a later version froze the command for the whole frame, which dropped the interpolator to 50 Hz whenever dither was on.

The app runs the same interpolator locally (`TWIN`) at wall pace, with a transport lag of 60 ms on BLE and 15 ms on serial, and demotes the board's `@` reports to a drift check that trims a slowly eased offset (snapping on jumps over 120 us).

### 5.6 Packed binary segments: A4, A5, A6, escaping, CRC and loss stretch (`FW` lines 476 to 815; `LR` lines 5029 to 5153, 5297 to 5438)

| format | layout | segments per packet |
|---|---|---|
| A5 flat | `A5 count seq [pan16 tilt16 flags dur] x count crc8` | up to 10 |
| A6 delta | `A6 count seq pan16 tilt16 flags dur [dpan8 dtilt8 flags dur] x (count - 1) crc8` | up to 10, deltas within a signed byte, never across packets |
| A4 hermite | `A4 count seq [pan16 tilt16 velp8 velt8 flags dur] x count crc8` | up to 8 |

- Escaping: after the opening byte, A4 through A7 (hermite) or A5 through A7 (legacy) are sent as `A7 0x` with the low nibble, so the opening byte can only mean a packet start and one lost byte costs one packet. The asymmetry is deliberate: old firmware would mistranslate `A7 04` (PRD invariant 10).
- CRC-8, polynomial 0x07, over the unescaped bytes before it. Load bearing: a lost BLE chunk splices the head of one packet onto the tail of another, which unchecked "lands as a bogus pulse and the beam jumps clean across the room".
- One framer per transport, selected by an int index because the Arduino IDE's generated prototypes break a function whose signature names a user struct ("It fails to compile in the IDE while building perfectly with a plain compiler, which is exactly how this reached the bench", lines 485 to 491). An idle framer closes after 250 ms.
- Sequence gaps: lost segments are counted and the surviving one is stretched by `gap x avgSegMs` (an EMA with alpha 1/8 of arriving durations, seeded from the JOB nominal), capped at 60000 ms; the hermite arrival velocity is scaled by `original / stretched`. PRD invariant 18: tempo error held to 9 ms across a dropped 8-segment packet where a one-neighbour estimate drifted 113 ms (bench). A bad CRC keeps the sequence primed so the lost time still stretches.
- BLE bytes are read with `getData()` and `getLength()`; routing them through a C string cut every packet at its first zero byte.
- Sender (`emitSegments`): sample the timeline from `emitT`; start at the maximum span (150 ms and 25 mm hermite, 60 ms and 3.0 mm legacy, never past the next gate), halve up to 8 times until the time-aware `playbackError` (plan position against the played cubic at T 0.25, 0.5, 0.75, through `fk`) is within `tol`; endpoint velocity from a centred difference through the full calibrated map, quantised as the wire carries it; durations carry a rounding residual (independent rounding drifted the gate by up to 15 ms over a job); consecutive identical pulse pairs with zero tangents merge up to 200 ms (90 ms legacy); a packet that grows past 176 bytes after escaping hands segments back rather than being dropped.
- Flow control: credit from the free-slot count in `@ pan tilt laser free` reports and `STAT q=`; every sent segment spends one; emit only while `room() >= 6`; on BLE stop while more than 3 writes are in flight; lead buffer `max(slider, 240 BLE or 140 serial)` ms.
- Capability discovery: `STAT ... seg=1 bin=2 herm=1`; without `seg=1` the app falls back to deduplicated `M` frames.

PRD fidelity budgets (stated as gates from measured baselines): worst hermite boundary velocity step at most 0.08 us/ms per ms; rms tracking error at most 1.1 x path tolerance; hermite segment count at most 0.45 x legacy; one dropped 8-segment packet: tempo error at most 30 ms; corner splice with stretch at most 2.0 mm; resync into a dwell 0.00 mm; laser gate timing +-4 ms; oversized packets after the fit loop 0.

### 5.7 Text protocol, board-held configuration and link behaviour (`FW` lines 817 to 1204; `LR` lines 3262 to 3605)

Commands (one per line, case-insensitive): `M p t l` (aim now, clears the queue), `SEG p t l d`, `CFG` and `CFG k=v ...` (stored in NVS namespace "laserrig": min max hp ht pol dm ww wh ds mh sl ac db sv cal dit ffp fft and corners tl tr bl br), `DITHER n`, `REPORT n` (`@ pan tilt laser free`, only on change, forced every 4 beats; self-armed at 150 ms during a job), `JOB n` (clear queue, reset sequence, seed the loss estimator), `FLUSH`, `ECHO n` (default 0: a 60 Hz ack stream floods the notify path), `P`, `L`, `RANGE a b` (no flash write or servo re-arm when unchanged, "a twitch at the top of every job"), `POL`, `ZERO [p t]`, `CENTER`/`HOME`, `DET`, `ATT` (idempotent), `DM ms`, `PING`, `?`.

Connect (`afterConnect`): `ECHO 0`, `CFG` (adopt the board's stored setup: geometry, servo profile, lead, dither and all four corners), `REPORT 50`, `DITHER n`, push the app's config after 1200 ms only if nothing was adopted, `?`. Config pushes are debounced 400 ms. The board is the authority on how it is installed.

BLE: writes go with response through one serialised writer; chunks start at 180 bytes and fall back stickily to 20 the first time a write is refused (PRD invariant 1: "the bench log showed lost jumping 29 in one beat before this change"). On the board, `onWrite` only copies bytes into a ring under a portMUX; parsing and every reply happen from `loop()`, and replies trickle out of a 1024-byte TX ring one 20-byte notify at least 3 ms apart. The serial line guard is 300 characters because a CFG line with four corners runs near 200 and the old 120 cap was silently destroying it ("which is why corner calibration never seemed to stick").

Safety: laser off at boot, on BLE disconnect, on FLUSH plus L 0 for every stop (FLUSH first, or the queue relights the beam), on a throttled tab (tick gap over 0.4 s pauses and cuts), on e-stop before any further emission, and by the dead-man: a lit beam with nothing queued and nothing arriving for 1500 ms; queued playback counts as life. Idle keepalive `?` every second; in-plot `?` every 1.2 s.

### 5.8 Sources (`LR` lines 2886 to 3230)

Text: the 94-glyph stroke font with explicit quadratics (the old inferred-curve font made an O 2.4 mm wider than designed at a 37 mm cap); weight 2 or 3 adds parallel passes `clamp(0.6 x resolution, 0.35, 1.0)` mm apart in alternating directions. SVG: every geometry element sampled by arc length through `getPointAtLength` at the sample step, with its CTM, y flipped. Image: luma `0.299 R + 0.587 G + 0.114 B` against a threshold, boustrophedon runs at a row spacing, rasterised at the rig's resolution (160 to 1400 px). Test: frame, diagonals and crosshair at 80 percent. Draw: freehand strokes from the aim pad. Fit to wall scales to 85 percent of the target and recentres.

### 5.9 The round face (`F/face/washer.html`)

A 100 vmin circular instrument for a round LCD: black outside the disc, cursor hidden, touch-action none; tokens `--teal #2dd4bf`, `--glow #74ffbe`, `--beam #cbb8ff`, `--warn #ff5d7a`, JetBrains Mono. A 70 vmin pad with a phosphor trail canvas (destination-out fade alpha `0.14 (1 - fade/100) + 0.006`) and a live beam overlay. Pad to aim: `home + (+-) nx x spanPan` and `-ny x spanTilt`, span 30 deg default (5 to 80). The send pump runs at about 30 Hz with an immediate flush on beam edges, deduplicated by string. Dock: connect, arm, centre, settings; centre mode FINE (x0.25), HOME, LOCK (sends `ZERO p t`), EXIT. Beam off on pointer up, cancel, lost capture, tab hidden, window blur and before unload. PING at `max(300, deadman/2)` ms while linked. It uses `M` frames only, not the segment queue.

### 5.10 The CLASP edition and its relay apps (`F/clasp/`)

`PanTiltLaserCLASP.ino` adds a WebSocket client to `relay.clasp.to:443/clasp` with hand-written MessagePack HELLO, SUBSCRIBE and SET and the frame `'S' | flags | u16 len | payload`. Addresses `/hackrig/<id>/config` (param, the config app writes), `/status` (published every 5 s), `/aim` (raw microseconds for calibration), `/direct` (live aim, last write wins), `/job/<client>` (one drawing per visitor, replaced not stacked, 8 slots), `/done/<client>`. Values are `key=value;` strings so the embedded codec has one value type. Config carries a monotonic `rev`; a write that is not newer is ignored; if no config arrives within 2.5 s of connecting the rig republishes its NVS copy. The duty limit lives in `driveLaser`: nothing upstream can hold the beam past `maxOnMs` 12000, then `cooldownMs` 3000. `normToUs` clamps every stranger's coordinate to -1..1 before mapping. Job grammar `m x,y l x,y x,y ...` in normalised units; segment duration from feed (travel at 2.5 x feed) clamped 8 to 400 ms; `jobMaxPts` 1200. Two config switches gate what strangers can do: `allowDirect` (live aim, refused while a job plays) and `allowQueue` (queued drawings), both default on (lines 106 to 107, 254, 474, 534, 555). The CLASP edition carries the older flat segment engine without hermite or packed binary.

`laser-draw.html`: phone drawing client; RDP simplification with the tolerance binary-searched over 0 to 0.3 for 18 rounds to fit `max(80, jobMaxPts)` points (a stepping search turned a 500-point circle into an eleven-sided polygon against a 120-point budget). `laser-config.html`: installer; solves throw and mount height from captured corners: `half = |panR - panL| / 2`, `D = (W/2) / tan(half)`, `L = hypot(W/2, D)`, `vOff = L (tan tTop + tan tBot) / 2`, `mountH = H/2 - vOff`, `homeTilt = 90 + atan2(vOff, D)`; a jog stick with squared response; a QR code via qrcodejs 1.0.0. `laser-sim.html`: a virtual rig on the relay with revision arbitration, bootstrap, job slots, dead-man, burn limit, cooldown and slew; it states it does not exercise the embedded MessagePack writer. All three load `@clasp-to/core@4.3.1` from jsDelivr.

### 5.11 The standalone chaos firmware (`F/history/washer_demo.ino`, 2026-08-07)

Found on the checker pass; the first pass listed the file only in the revision table. It drives the same head (pan GPIO 26, tilt 25, laser 23 into a 2N2222) with no serial protocol, BLE or host app, aimed at the NACELLE glow cube.

1. Travel: pulses 500 to 2550 us, centre 1525, span 1025 each way, so the patterns reach the mechanical stops (declared, lines 29 to 38).
2. Rate limiter (`writeBeam`, lines 245 to 269): every pattern returns a target in -1..1 rather than a position; the writer chases it once per 20 ms frame with a ceiling of `MAX_STEP_US` 100 us per frame (about 5000 us/s, the comment's full travel in about 0.4 s), scaling both axes by the same factor so a diagonal stays straight instead of stepping pan then tilt.
3. Nine patterns, each held for a random 6 to 11 s and never repeated back to back: fling (corner-biased random targets, a new one when within 0.04), zigzag plaid, spin (full radius, flips direction), lissajous with a drifting ratio, Lorenz attractor (sigma 10, rho 28, beta 2.6667, eight Euler steps of 0.006 per frame, x over 20 and z minus 25 over 22 to the face), scatter, whip, bloom, twitch on a wandering centre.
4. Safety: laser low at boot, dark for `ARM_DELAY_MS` 2000, then two 90 ms blips 180 ms apart before running (lines 298 to 305); holding BOOT (GPIO 0) at power up sets dry run, which keeps the laser off for the whole session.

---

## 6. UX anatomy

`LR`: header (LASER RIG wordmark, SIM ONLY or link pill, Serial, Bluetooth, Disconnect, Firmware fold with copy and download of the embedded .ino). Machine column (things you touch when no job runs): jog pad with step 0.5, 2, 5, 10 deg, ZERO, go to origin, corner capture TL TR BL BR, use calibration, clear; Pan/Tilt trims, invert, pulse window, lead per axis with a hint; Geometry: throw, wall width and height, mount height, servo type, slew, angular accel, deadband, dither with a folded explainer, resolution and sweep readouts. Centre: the phosphor sim viewport with pan, tilt and hit readouts; Aim/Draw and Live paint pads; the console folded away. Job column: a pinned run bar (Plot, Pause, Stop, Frame the job, live speed 0.1 to 2x, progress, ETA), Source (text, SVG, image, draw, test), Place (offset, scale, rotation, mirror, fit), Plot (speed-coloured preview, bounds warning, draw and travel length, estimate, peak, stops, stream health), Motion tuning fold (feed, travel, accel, corner, path tolerance, corner tolerance, steps per frame with the smooth-regime readout, jerk, rest before beam, update rate, lookahead buffer), optimise, dry run. Status bar after ISA-101: state, link, beam, job, stream, and an always-reachable STOP that flushes and kills the beam.

What makes it excellent: the sim is honest about the hardware (servo frame, deadband, accel and lash, the printed head itself); the plan is one continuous chain so text runs as a single move; every ceiling is named so a slider never looks broken; the board remembers its installation and the app adopts it; the wire format recovers from loss byte by byte and keeps tempo; every way the beam could stay lit by accident has a guard.

Theme drift: `LR` uses `--accent` hex ff3366 and Courier Prime (lines 14 to 19, and the draw-mode label colour on the aim pad), the exact wrong pink the plan names; its own PRD fixes the theme to `#FE0386` with IBM Plex Mono. `washer.html` uses a separate dark teal scheme.

---

## 7. Tests and harness

No tests ship with the bundle. The PRD (`F/rig/hackbuild-laser-rig-prd.md` sections 7 and 8) turns 27 bench-paid behaviours into named invariants, specifies golden vectors captured from the current HTML (packed bytes in all three formats including NUL- and escape-heavy payloads, parser outputs for recorded STAT, CFG and `@` lines, planner timelines), a firmware reference model in `/testing`, the fidelity budgets in section 5.6, and a ten-minute soak with 1 percent drop and 50 ms jitter. None of it exists as files. Checker pass 2026-10-05: 36 claims re-read against `LR`, `FW`, the SCAD, the round face and the CLASP files (`CFG` defaults and the sweep, `ik` and `vOff`, `MOUNT`, the four `SERVOS` presets, every `PLAN` default and planner constant, curvature, junction and jerk limits, emitter spans and merge caps, the 176-byte fit, `bufTarget` floors, twin lag and snap, queue depth, continuity window, tangent clamp, hermite basis, lead, 2 ms writes, starvation gate, loss stretch with its 1/8 EMA and 60000 cap, framer idle, dead-man, line guards, LEGO constants, round face span and fade, CLASP duty limit). All matched; one formula is now stated with the servo acceleration it uses, and sections 5.10 and 5.11 gained the CLASP permission switches and the chaos firmware. All five shots were opened and show what their captions say. This folder's drive evaluates the canonical and harvested planners on the M07 square (`drive/plan-square.cjs`): the harvested file reproduces the M07 golden exactly and the canonical gives 1.1703 s, peak 260 (computed).

---

## 8. Known defects and stale text found while reading

- The theme pink (section 6).
- `FW` loop comment "A packet always opens with 0xA5" (line 1134) predates A4 and A6.
- `LR` `playbackError` comment "The firmware interpolates linearly between segments" (line 5261) predates hermite; the function itself scores hermite playback.
- The Lookahead buffer slider label shows 90 while its value is 150 until the UI updates it (markup line 2023 to 2024).
- At defaults the text source (HACK.BUILD at cap 120) is 802 x 120 mm on a 305 mm target, so the first thing a new user sees is the bounds warning (computed).
- The CLASP edition and the round face did not get the hermite queue, credit reports or TX ring.

---

## 9. How to make a new thing this way

1. Plan in the units the actuator lives in: convert every mm/s and mm/s2 into degrees per mm along the path and cap by the actuator's slew, acceleration and resolution.
2. Plan the whole job as one chain with a beam flag, put curves back before planning, fillet only where the beam state does not change, and record gate times exactly.
3. Ship timed segments, not positions; let the device interpolate on its own clock with position and velocity continuous; clamp tangents so a splice stays near its chord.
4. Frame binary packets with an opening byte that cannot appear inside (escape), a CRC, a sequence number, and a stretch for lost time; one framer per transport.
5. Use credit from the device's own reports for flow control; never block the device's hot loop on a reply.
6. Keep the installation on the device; adopt it on connect; push only when the device has nothing.
7. Simulate the actuator's frame, deadband, acceleration and backlash so the preview shows what the hardware will draw, and run the device's interpolator as a local twin.
8. Gate the beam in the lowest function, with dead-man, starvation, disconnect, stall and stop ordering.

---

## 10. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| printed pan/tilt servo head (base, body, bracket) | geom, catalog | pocket, bore, screw | MISSING (no pan/tilt yoke canon) | MISSING | none | MISSING |
| LEGO-footprint servo base | geom | pocket, stud | MISSING | MISSING | none | MISSING |
| ideal IK with home referencing; bilinear corner map with Newton inverse; installer solve for throw and mount height | motion | none | n/a | MISSING | M07 (calibration module, bilinear beside projective) | MISSING |
| servo model (frame latch, deadband, accel, lash, band) and presets | sim, profile | none | n/a | MISSING | M07 | MISSING |
| mm-space planner bound by servo physics (`planChainPen`) | motion | none | n/a | MISSING | M07 (`planners/washer-mm.ts`; golden pinned to the 2026-07-30 file) | MISSING |
| curve refinement, merge, fillet against kept points, exact gates | motion | none | n/a | MISSING | M07 | MISSING |
| hermite segment queue with tangent clamp, lead, starvation gate | link (firmware) | none | n/a | MISSING | M13 | MISSING |
| A4/A5/A6 packets, escaping, CRC-8, sequence stretch with EMA | link | none | n/a | MISSING | M13 (codecs) | MISSING |
| credit flow control, serialised BLE writer with chunk fallback, TX ring | link | none | n/a | MISSING | M13 | MISSING |
| board-held config with adopt on connect; CLASP monotonic revision and bootstrap | link | none | n/a | MISSING | M13 | MISSING |
| unattended safety: duty limit in the driver, clamped stranger input, job slots | link | none | n/a | MISSING | M13 | MISSING |
| phosphor sim and digital twin viewport | ui-core, sim | view | n/a | MISSING | M09, M13 | MISSING |
| round touch face as a drive pad variant | ui-core | drive | n/a | MISSING | none | MISSING |
| laser-rig monorepo PRD and invariants | out of plan scope (separate repo) | none | n/a | n/a | M16 registry | MISSING |

`lineage.json` holds three rows, none for WASHER (checked 2026-10-05). M07 plans `designs/washer/legacy/laser-rig.html` from the harvested file (M07-motion-nest.md lines 211 and 259); that legacy copy should either move to the canonical file with new goldens or keep the old file and say so.
