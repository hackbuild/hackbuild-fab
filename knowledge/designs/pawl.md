# PAWL: how it is made

Record written 2026-10-05 from the original code. Slug `pawl`. Family robots. The owner's slug PAWL collides with the TUMBLER `ratchet-pawl` mechanism and with an unrelated June 2026 "PAWL, Doot game press" page (D-189 lists the collision); this record is the stepper biped.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula or a value printed by the canonical page in the 2026-10-05 drive. "Measured" means the M02 reruns of `final.mjs` on 2026-10-04 (`fab-knowledge:originals/pawl/files/records/`). "Stated" quotes page copy or a docstring. Units are mm, degrees, grams, N m, seconds.

Short paths: `F` is `fab-knowledge:originals/pawl/files/`; `C` is `F/src/core.mjs`; `PT` is `F/src/parts.py`; `H` is `F/pawl.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "PAWL, dynamics bench (verified geometry)"; "14 DOF stepper biped, 367 mm, 396 g, geometry from the verified CAD" |
| owner's slug | pawl |
| canonical page | `H`, copied from `fab-work-directory:benches/pawl/outputs/pawl/pawl.html`; byte-identical to `~/Downloads/pawl (7).html` |
| sha256 | da3f9111deb74abb89bb84122f662e36f74f5d4bf08fe655ef3dab437d8da696 (694114 bytes, 696 lines; line 423 is the 656077 character `MESHES` blob) |
| date | 2026-07-30 15:21 (Downloads mtime of `pawl (7).html`); exploded viewer 15:23 |
| companions | `F/pawl-exploded.html` (505d3069bf48...), `C` (d1869500a5a8...), `PT` mk3 (be215f3ddffd...), five python checkers, `final.mjs`, `smoke.mjs`, `render.py` |
| runtime | import map: three 0.160.0 and `@dimforge/rapier3d-compat@0.14.0` from jsdelivr; needs the network |
| hook | none; `smoke.mjs` drives the DOM handlers directly |
| chat | "Tiny 4.7mm stepper motor for miniature robotics", conversation 22b3cf25-1eb3-4c3a-9cc1-f9ebdc23836f |

### 1.1 Every revision found

| file | date | what |
|---|---|---|
| `pawl (2).html`, `(3)`; harvested `outputs/pawl.html` (`F/v1/pawl-v1.html`, ef01802506f4...) | 2026-07-30 11:59 to 12:24 | v1: 16 DOF with hip yaw, intersecting hip axes, box links, balance by moving the foot target |
| `pawl (4).html` to `(6).html`, `pawl-exploded.html`, `(1)` | 2026-07-30 13:10 to 14:48 | mk2 parts and intermediate benches on rapier3d-compat 0.14.0 |
| `pawl (7).html`, `pawl-exploded (2).html` = harvest `outputs/pawl/` | 2026-07-30 15:21, 15:23 | final: 14 DOF, offset axes, mk3 parts, convex hull colliders from the printed meshes, ankle torque balance. Canonical |

`pawl.html` and `pawl (1).html` of 2026-06-03 are the Doot game press (name collision).

### 1.2 Why this revision

The final bench is the newest and the only one built on parts that can be assembled: mk2 had a motor pocket sealed on four faces, zero loom space and a round shaft hole that transmitted no torque, all found by probing the solids. The final also replaces v1's foot-target balance (which "only fights the ground and pumps energy in until it oscillates apart") with an ankle torque strategy, and removes hip yaw because "three axes will not meet at one hip at this scale". Its suite reproduces: `final.mjs` on its own pin passed 15 of 17 trials, twice, byte-identical (measured 2026-10-04 by M02, `F/records/final_mjs_rapier-compat-0.14.0_run1.txt`).

### 1.3 What is in `fab-knowledge:originals/pawl/files/`

| path | what |
|---|---|
| `pawl.html`, `pawl-exploded.html` | the dynamics bench and the exploded assembly viewer |
| `src/core.mjs` | sim core shared by browser and node |
| `src/parts.py` | cadquery mk3 parts |
| `src/pack.py`, `route.py`, `check_parts.py`, `fdm.py`, `robot.py` | the five checkers |
| `src/render.py` | numpy z-buffer renderer |
| `src/final.mjs`, `src/smoke.mjs` | physics suite, jsdom smoke |
| `src/explode.json`, `src/meshes.json` | viewer payloads |
| `exports/thigh.stl`, `shank.stl`, `ankle_yoke.stl`, `foot.stl`, `thigh.step` | representative parts (the full set of 14 STL plus STEP stays in the bench folder) |
| `exports/pawl-before.png`, `pawl-after-front.png`, `pawl-after-iso.png` | the render-and-look evidence |
| `v1/pawl-v1.html` | the 16 DOF first bench |
| `records/` | M02's `final.mjs` runs on rapier3d-compat 0.14.0 and on the deterministic 0.21.0 |

Hashes: `fab-knowledge:originals/pawl/SHA256SUMS`.

---

## 2. What it makes and for whom

A 1/6 scale humanoid, 367 mm and 396 g (stated), on fourteen 15BY-GM12 class worm-geared steppers: hip roll, hip pitch, knee, ankle pitch and ankle roll per leg, shoulder pitch and roll per arm. Thirteen printed part shapes, 44 M2 x 6 caps into 44 heat-set inserts, 14 dowels 3 x 12, 14 M2 grub or clamp screws (`F/src/explode.json`). The page is a physics bench that does not animate: every joint is a Rapier revolute with limits, a torque ceiling, a slew ceiling and reflected rotor inertia, and the robot stands, squats, walks and takes pushes under an IMU ankle strategy. For a maker deciding whether a small stepper biped can stand before buying fourteen motors. The chat started from a 4.7 mm bipolar stepper listing; the robot uses 15 mm can geared steppers and the reason for the switch is not recorded.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), waiting until the boot overlay is removed. Headless sim rate was 2 to 12 frames per second with 8 substeps each, so motion in the shots is slower than in a real browser. Files in `fab-knowledge:originals/pawl/shots/`. No page errors.

| file | caption |
|---|---|
| `w01-stand-imu.png` | STAND, IMU ON, FREE: the robot on its printed-mesh hulls, CoM dot over the support polygon, motors and amber output shafts shown. Right pane: joint load per side, State (CoM 180, in polygon yes, torso pitch 2.2), Verified geometry (axes at 14, 56, 122, 188, 214; stance band 190 to 212.5; segments 66 / 66; self-clearance 10.0). |
| `w02-walk-trails.png` | WALK with FOOT TRAILS: one leg in swing, support polygon outline, joint load bars, travelled 66 mm, peak 54 percent R hipRoll. |
| `w03-squat-axes.png` | SQUAT with JOINT AXES arrows (the `mout` direction of every output shaft). |
| `w04-joint-test-knee-hoisted.png` | JOINT TEST, HOISTED: L knee at 90 with "mirror to other side" on; hint "+ = heel toward hip. hard stop at 0, no hyperextension". |
| `w05-open-loop-walk.png` | WALK with OPEN LOOP: torso roll 13.3 degrees, hip pitch bars amber at 88 percent. |
| `w06-exploded-assembly.png` | `pawl-exploded.html` EXPLODED: every printed part, motor body and shaft pulled apart; ASSEMBLY ORDER list (pelvis, torso, head, hip yokes, thighs, covers, shanks, ankle yokes, feet) with a note per step. |
| `w07-exploded-section.png` | ASSEMBLED with SECTION on. |

---

## 4. Code map

| area | file and lines |
|---|---|
| units, axis heights, segments, offsets | `C` 4 to 7 |
| actuator model `ACT`, envelope `AE` | `C` 9 to 15 |
| joint table with `mout` and `can` | `C` 17 to 43 |
| link masses, boxes, origins, COM, driven links | `C` 45 to 58 |
| quaternion helpers | `C` 60 to 65 |
| closed form leg IK | `C` 67 to 79 |
| stance band | `C` 80 to 89 |
| mesh decode into link frames | `C` 91 to 111 |
| Rapier world | `C` 113 to 178 |
| gait defaults | `C` 180 to 182 |
| sway, attitude, foot target | `C` 184 to 193 |
| joint angle and rate read | `C` 195 to 202 |
| targets with the ankle strategy | `C` 204 to 240 |
| PD servo with slew and torque ceiling | `C` 242 to 256 |
| page: import map, styles | `H` 7 to 52 |
| page: left pane (Mode, Joint test, Gait, Actuator model, Display) | `H` 56 to 111 |
| page: right pane (Joint load, State, Verified geometry, Notes) | `H` 118 to 153 |
| page: core inlined | `H` 166 to 422 |
| page: mesh decode with winding flip for the mirrored leg | `H` 425 to 436 |
| page: world with hull colliders, scene | `H` 439 to 465 |
| page: link meshes | `H` 466 to 485 |
| page: actuator mocks on an explicit basis, shafts on the driven link | `H` 486 to 530 |
| page: CoM, polygon, trails, UI wiring | `H` 531 to 612 |
| page: loop, support hull, readouts | `H` 613 to 696 |
| parts: constants | `PT` 24 to 59 |
| parts: teardrop, lead-in, bed relief | `PT` 62 to 89 |
| parts: explicit box and cylinder, actuator frame `_rot` | `PT` 91 to 127 |
| parts: insertable motor slot | `PT` 129 to 135 |
| parts: bore with lead-ins, D-socket, hub | `PT` 137 to 161 |
| parts: loom channel, U-channel, cover bosses, neck, fork, fish slot | `PT` 163 to 196 |
| parts: thigh, shank, ankle yoke, foot, hip yoke, pelvis, covers, torso, head, shoulder yoke, arm | `PT` 199 to 366 |
| parts: print directions, span assertions, export | `PT` 368 to 425 |
| packaging solver (OBB SAT) | `F/src/pack.py` 14 to 265 |
| mating concentricity and stance reach | `F/src/route.py` 1 to 62 |
| BRep point probes | `F/src/check_parts.py` 1 to 75 |
| overhang per build direction | `F/src/fdm.py` 1 to 63 |
| whole-robot self clearance and explode payload | `F/src/robot.py` 1 to 163 |
| z-buffer renderer | `F/src/render.py` 1 to 166 |

---

## 5. Mechanisms and constructions

The steppers are driven by an outside controller (the torso holds a "16ch driver stack", `PT` 305); no circuit is in the outputs.

### 5.1 Offset joint axes and the `mout` rule (`C` 17 to 43; `H` 486 to 530)

What it does: places every actuator and output shaft where the hardware actually goes, separate from the joint's control sign.

| joint | parent, child | at (x, y) | axis (control sign) | actuator | limits | carrier | can | mout | along |
|---|---|---|---|---|---|---|---|---|---|
| hipRoll | torso, hipY | 23s, 214 | (0,0,s) | r150 | -20, 35 | torso | (0,1,0) | (0,0,1) | 0 |
| hipPitch | hipY, thigh | 23s, 188 | (-1,0,0) | r150 | -30, 80 | thigh | (0,-1,0) | (s,0,0) | 0 |
| knee | thigh, shank | 23s, 122 | (1,0,0) | r150 | 0, 120 | shank | (0,-1,0) | (s,0,0) | 0 |
| ankPitch | shank, ankP | 23s, 56 | (-1,0,0) | r150 | -35, 35 | shank | (0,0.927,0.375) | (s,0,0) | 0 |
| ankRoll | ankP, foot | 23s, 14 | (0,0,s) | r150 | -25, 25 | ankP | (0,1,0) | (0,0,1) | -16 |
| shoPitch | torso, shoY | 42s, 306 | (-1,0,0) | r50 | -80, 120 | torso | (0,-1,0) | (s,0,0) | 0 |
| shoRoll | shoY, arm | 42s, 292 | (0,0,s) | r50 | -5, 95 | arm | (0,-1,0) | (0,0,1) | 0 |

Rule: X-axis joints exit outboard on both sides, Z-axis joints exit forward on both sides. Hardware frames are built from `mout` (ex) and `can` (ey Gram-Schmidt against ex) by `makeBasis(ex, ey, ez)`, "never setFromUnitVectors" and never from the anatomical `axis` (`H` 486 to 530). The output shaft mesh is parented to the driven link at the joint axis, so the joint angle shows on the shaft.

Why offset: "two gearbox bodies cannot occupy one point" (`pack.py` 48 to 49). Turning without hip yaw is by differential step length.

Lessons (all from rendering PNGs with `render.py`): output shafts floated disconnected until the shaft position subtracted the driven link origin; knee and hip pitch shafts pointed inboard until `mout` was separated from `axis`; the shoulder was incoherent three ways until rebuilt as a yoke with a D-hub and a single-sided plate.

### 5.2 Actuator model (`C` 9 to 15)

| ratio | stall tau | slew | reflected inertia `Jr` |
|---|---|---|---|
| r150 (legs) | 0.186 N m | 120 deg/s | 1.6e-8 x 150^2 = 3.6e-4 kg m2 (computed) |
| r100 | 0.132 | 180 | 1.6e-8 x 100^2 = 1.6e-4 |
| r50 (shoulders) | 0.069 | 360 | 1.6e-8 x 50^2 = 4.0e-5 |

Envelope `AE` and `PT` `A`: gearbox 12 x 14 x 13, worm housing D9.5 x 10, can D15 x 11, boss D6 x 2, D-shaft 3 x 10 with the flat at 2.5. Tier inferred: "no vendor publishes a dimensioned drawing for the worm variant. These are the published outline numbers padded for tolerance. Every part regenerates from this dict, so one caliper session updates the whole robot" (`pack.py` 17 to 19). D-104 makes this the shape of the catalog row (`mout`, can, slew, reflected inertia, stall, per-field provenance).

### 5.3 Closed form leg IK and the stance band (`C` 67 to 89)

Input: the ankle roll axis relative to the hip roll axis (metres). With the sole held level, the 26 hip offset (214 - 188) and the 42 ankle offset (56 - 14) are collinear with the leg: `OFF = 68`, leaving a symmetric 2R with a = b = `SEG` = 66.

```
hipRoll  = atan2(px side, -py)
r        = hypot(px, py) - OFF
L        = clamp(hypot(r, pz), 0.25 (a+b), 0.995 (a+b))
knee     = pi - acos((a^2 + b^2 - L^2) / (2ab))
hipPitch = atan2(pz, r) + acos((a^2 + L^2 - b^2) / (2aL))
ankPitch = knee - hipPitch
ankRoll  = -hipRoll
```

`HIP_MAX = 14 + 68 + 132 = 214`, legs straight. `STANCE_MAX = 0.2125` m: above it the IK sits on the locked-knee singularity, "which is what toppled the first build". `STANCE_MIN = (14 + 68 + 132 cos 35 deg) mm = 190.1` (computed): in a symmetric 2R the ankle pitch equals the hip pitch, so the ankle stop caps the crouch. The squat clamps the hip height after adding its term ("clamp LAST, or the squat dives out of band", line 211).

### 5.4 Rapier world (`C` 113 to 178)

Gravity -9.81 on y; timestep 1/480; the page runs 8 substeps per frame. Ground `cuboid(4, 0.05, 4)`, which Rapier reads as half extents, so an 8 x 0.1 x 8 m slab with its top at y 0, friction 1.10, restitution 0. Collision groups: ground `(1<<16)|0xFFFF`, left leg `(2<<16)|0x0005`, right leg `(4<<16)|0x0003`, body `(8<<16)|0x0001`, so legs touch the ground and the other leg, and arms and torso only the ground. Bodies spawn 4 mm above rest, linear damping 0.05, angular 0.10, mass and inertia set explicitly (box inertia plus `Jr` on driven links). Colliders: the convex hull of the printed mesh when `hullCollide` (density 0, friction 1.10 on the feet, 0.4 elsewhere), else boxes (the foot as a 36 x 5 x 64 sole plate plus a heel block). Joints: `JointData.revolute` with limits enabled, contacts disabled between parent and child. The knee's "hard stop at 0, no hyperextension" is this joint limit; no printed stop exists in the parts.

| link | mass g | box | COM |
|---|---|---|---|
| torso (pelvis, torso, head) | 150.3 | 86 x 153 x 40 | (0, 54, 0) |
| hipY | 2.8 | 27 x 38 x 29 | (0, -11, 0) |
| thigh | 24.1 | 30 x 90 x 28 | (0, -44, 0) |
| shank | 33.0 | 21 x 66 x 28 | (0, -43, 0) |
| ankP | 22.8 | 30 x 48 x 30 | (0, -21, -4) |
| foot | 8.2 | 38 x 20 x 70 | (0, -9, 5) |
| shoY | 8 | 18 cube | (0, -8, 0) |
| arm | 24 | 16 x 96 x 16 | (0, -66, 0) |

### 5.5 Servo loop (`C` 195 to 202, 242 to 256)

Per joint per step: relative angle from the parent and child quaternions, `2 atan2(r . axis, r.w)` with r flipped to w at least 0; relative rate along the world axis; command slewed by `wmax dt`; PD with `Kp = Jeff wn^2`, `Kd = 2 x 1.15 x wn x Jeff`, `Jeff = Jr + 1.2e-5`, `wn = 2 pi bw` (bw 25 Hz default); clamp to `tau x torque scale`; equal and opposite torque impulses on child and parent. `sat = |tau| / tmax` drives the load bars: amber above 0.7, red at 0.985 and over.

### 5.6 Ankle torque balance and gait (`C` 184 to 240)

Balance on planted legs only:

```
bp = clamp(-(kp pitch + kd pitchRate), -0.42, 0.42)     same sign on both legs
br = clamp(  kr roll  + kdr rollRate , -0.42, 0.42)     times side (anti-symmetric)
kp = kr = 1.6, kd = kdr = 0.08
```

Signs derived in the comment (lines 216 to 221): ankle pitch plus is dorsiflexion, which with the sole planted drives the body forward, so a forward lean needs a negative bias; ankle roll plus tips the body toward that leg's side, so the correction carries the side factor.

Gait: phase advances `dt / T`; legs half a cycle apart; swing fraction 0.40; swing foot `y = H sin(pi u)`, `z = -S/2 + S smoothstep(u)`; stance foot slides back linearly; lateral sway `A tanh(k sin(2 pi (p - 0.45))) / tanh(k)` with dwell k 2.2; arms counter-swing 0.45 rad; shoulder roll 0.09. Defaults T 2.40 s, S 38, H 16, A 23, hip height 209 (`C` 180 to 182). HOISTED makes the torso kinematic and drives it along the gait.

Readouts (`H` 613 to 689): CoM from body masses; support polygon = monotone chain hull of the four sole corners (x plus and minus 19, y -14, z -26 and 44 in the foot frame) of every foot that has at least one corner below world y 6 mm, so a foot on its edge contributes all four corners; CoM in polygon by edge sign count; projected CoM dot teal inside, red outside.

### 5.7 mk3 parts: assemblable hardware (`PT`)

Frame: world zero, mm, +Y up, +Z forward, leg centreline x 0; explicit `makeBox` and `makeCylinder` only ("No workplane normals anywhere"), because mk2's `cq.Workplane('XZ')` extrudes along -Y while `.workplane(offset=)` offsets along +Z, and every body was built downward with pockets 160 mm sideways.

Constants (`PT` 24 to 59): nozzle and extrusion width 0.40; `FIT 0.35`; `WALL = 6 x 0.40 = 2.40`, exactly six perimeters with no gap fill; `CHAM 0.6` lead-in on every bore; `EFOOT 0.5` elephant foot relief; layer 0.20; M2 clearance 2.25, pilot 1.70, heat-set 3.25 x 4.0; `BORE = 15 + 0.7 = 15.70`; loom `WIRE_D 5.5` at z -12.20; tube 20.60 x 27.90; `NECK 13.70`, `GAP 16.10`, fork arm 4.5, `FORK_OUT 25.10`; hub D12 x 9; foot back 24, forward 40, width 36, plate 5, clevis 20; pelvis 58 wide, shoulders at x 42 ("shoulders must be the widest thing on the robot").

Constructions:

1. U-channel limb (`u_channel`, 166 to 174): outer box minus a front-opening cavity (the can bore swept out to the front face so a motor drops in) minus the can bore minus the loom channel; a bolted cover on six heat-set bosses closes it (`cover_bosses`, `_cover`).
2. Insertable motor slot (`motor_slot`, 129 to 135): the actuator envelope at fit 0.35, unioned with copies swept +4 to +24 in 4 mm steps along +Z, so the pocket is open to its insertion direction. mk2's pocket was sealed on four faces.
3. Loom channel and fish slot (163 to 164, 194 to 196): a 5.5 teardrop channel the full length of each limb, open both ends; a 7 x 16 x 30 slot at mid span to feed the loom instead of blind threading. "One leg carries five motors and 20 conductors"; mk2's free space was 0.00 x 1.50.
4. D-socket hub (146 to 161 and the callers): a D12 boss with a D-socket for the 3 mm flatted shaft (radius 1.65, flat 1.15 from the axis, 0.15 clearance), a pinch slot and an M2 clamp screw cut by the caller. mk2's round clearance hole "transmitted zero torque".
5. Fork and neck (185 to 192): the link that does not hold the motor carries the fork and the D-hub; the far fork arm takes a D3.1 bore for a 3 mm dowel so the shaft is not cantilevered. mk2's shank held the ankle motor and still had a fork there.
6. Teardrop (62 to 74): a circle plus a square rotated 45 degrees riding 0.42 r above centre, so horizontal holes self-support; `lead_in` cones at bore mouths; `bed_relief` chamfers the bed edge 0.5 because squashed first layers make every part 0.2 to 0.4 oversize at the base.
7. Span assertions (400 to 425): each part's y bounds must sit within 5 low and 9 high of its intended span; the run prints "placement assertions: ALL PASS" or a count.

### 5.8 Checkers (`F/src/`)

| script | method | what it proved or caught |
|---|---|---|
| `pack.py` | OBB separating axis test (15 axes, the max over axes as the signed gap) between actuator envelopes (0.6 clearance) and link boxes; 7 samples per joint, 7^5 = 16807 combinations (computed), kept only when the sole is within 14 degrees of level and the hip to foot reach is 100 to 150; ground breach of any solid below the planted sole | actuators carried by the child link with the can down its own tube; offset axes |
| `route.py` | analytic placement of each mating bore and boss over three poses | worst concentricity drift, expected 0.000; knee flexion needed for hip to ankle 118 to 142 against the 120 degree stop |
| `check_parts.py` | `BRepClass3d_SolidClassifier` point tests on the real solids | motor installability (ray from the can centre toward +Z clear for 26 mm in 0.35 steps); loom channel clear over its span; D-socket void on the round side and material on the flat side; mean wall `2 V / A` at least 2.0. "Analytic models cannot catch CAD errors, that lesson cost a full rebuild" |
| `fdm.py` | per triangle normal against the stated build direction; overhang beyond 45 degrees, ceilings within 12 degrees of straight down; faces within 0.35 of the bed excluded | origin of CHK-PRT-12: a flat cover read 41.7 percent overhang because bed contact faces counted |
| `robot.py` | vertices deduplicated on a 1.5 grid; minimum pairwise distance between non-adjacent links; both legs driven from one pelvis pose through the same IK over 5 sways x 3 heights x 5 lift states x 3 shoulder angles = 225 poses (computed) | self clearance 10.0, tightest pair foot to foot; "applying the same joint vector to both legs describes a pose the robot cannot reach" |
| `render.py` | pure numpy orthographic z-buffer, flat shade `0.30 + 0.70 |n . l|`, PNG by hand with zlib | "replicates the EXACT placement math of pawl.html and pawl-exploded.html so the PNGs show what the browser shows, bugs included"; `pawl-before.png` shows the floating shoulder shafts |

### 5.9 Proportion audit (chat lesson)

"Proportions read as weird" was made measurable against human canon: pelvis to shoulder 0.94 against a human 1.45, torso 0.74x short, head 1.6x small, feet 1.43x long and 2.15x wide; only the ankle stack is forced (3.6x) (bench reader). The fix set `PELV_W 58` under `SHOX 42` per side (shoulder width 84) and the chest and head sizes in `PT` 51 to 59.

### 5.10 Part by part composition (`PT` 199 to 366)

| part | built from | motor | coupling |
|---|---|---|---|
| thigh | U-channel from the knee axis 122 up to hip pitch 188; a 26 tall fork from 98 to 124 below it | hip pitch, can down its own channel (`can (0,-1,0)`) | neck at the top for the hip yoke fork; knee D-hub on the +x fork arm with a D1.5 pinch slot at `HUB_L x 0.62` and an M2 clamp bore across it; D3.1 dowel bore in the -x arm; fish slot at knee + 34 |
| shank | U-channel 56 to 122, necks at both ends | knee (can down) and ankle pitch (can up, leaning 22 degrees forward, `can (0, 0.927, 0.375)`) | D6.7 boss clearance bores at both axes, 60 long, so the gearbox bosses pass |
| ankle yoke | 24 x 42 x 30 block at z -2 plus a 24 tall fork at the top | ankle roll, 16 aft, output +z | ankle pitch D-hub, M2 clamp and dowel; a loom bore at z -11 |
| foot | 36 x 5 x 64 plate (24 back, 40 forward) plus a 26 x 15 x 26 clevis, `NECK` wide slot | none | ankle roll D-hub on +z, dowel on -z, loom exit D5.5 at (0, 12, -18) |
| hip yoke | pure bracket, no motor: a Z-fork on top over the pelvis gearbox and an X-fork below over the thigh neck | none | two D-hubs (`ARM + 2` deep) and two dowel bores, loom bore down the -z arm |
| pelvis | 58 x 46 x 38 hollow shell, two 22 x 20 x 17.8 motor blocks at x plus and minus 23 | both hip roll motors, output +z, can up | two D3.25 heat-set bores per side at y 211 to bolt the torso; loom exit per side |
| torso | 58 x 106 x 40 chest open at the back (battery and "16ch driver stack"), ear bridges 20 x 24 at x plus and minus 39 | both shoulder pitch motors, output outboard | four heat-set bores in the side walls, drilled along z from the front face at y 224 and 310 |
| head | 40 x 47 x 36 hollow box | none | 26 x 5 x 4 sensor slot at the front, loom bore down the neck |
| shoulder yoke | lower Z-clevis 18 x 26, a 15.5 x 8 bridge over the torso ear, a 6.5 x 24 x 22 outboard plate | none | single-sided pitch D-hub on the plate (a 3 mm shaft cantilevered 7 mm under a 20 g arm, stated in the docstring), D1.7 pinch slot and M2 clamp; roll D-hub on the +z clevis arm with a dowel on -z |
| arm | U-channel 18.6 x 21.9, 132 long | shoulder roll at the top, output +z, can down the arm | neck at the top; 16 x 22 x 12 hand pad |

Cover plates are `TUBE_W` x `WALL` strips with six D2.25 clearance holes over the six heat-set bosses. The `__main__` report prints each part's mass as `volume x 1.24 x 0.35` g (PLA density at an effective 35 percent fill).

### 5.11 Mesh transport and the mirrored leg (`C` 91 to 111, `H` 425 to 436, 486 to 494)

`meshes.json` stores each part in world-zero coordinates at x 0, quantised as u16 against `lo` and `span` with a divisor of 65534 (not 65535), indexed u16 faces. `meshVerts` subtracts the link origin height, mirrors x for the right leg, and converts to metres; the same vertices feed the Rapier convex hull and the three.js geometry, so the collider is the drawn part. Mirroring flips triangle winding, so `geomFrom` swaps the first and third index of every face on the right side before computing normals. The actuator body and shaft meshes were encoded with the foot's origin offset baked in, so the page adds `AX.ankRoll` (14 mm) back to their y before use. The torso group carries a 20 x 4 x 2 teal eye marker at y 350 so the facing direction reads at a glance.

### 5.12 Friction and hoist controls (`H` 581 to 583, 604 to 606, 649 to 653)

The foot friction slider writes the new value to collider 0 of both feet and to the ground collider, so mu is changed on both sides of the contact. HOISTED switches the torso to `KinematicPositionBased` and every substep sets its next translation to (sway, `AX.ankRoll` + hip height, `(S / T) t`) with identity rotation, so the legs walk in the air at the commanded gait while the gantry carries the body forward; FREE switches it back to dynamic without resetting. RESET puts every body at its link origin plus the 4 mm spawn lift, zeroes velocities, commands and torques, and clears the trails.

### 5.13 Squat trajectory (`C` 209 to 211)

SQUAT lowers the hip by `0.016 (1 - cos(2 pi t / 3.2))` m: a 32 mm peak dip on a 3.2 s period, then clamps to the stance band, so at the default 209 the commanded hip bottoms at 190.13 (the band floor, computed) rather than at 177.

---

## 6. Fits and print settings

| item | value | source |
|---|---|---|
| fit | 0.35 per side | `PT` 29 |
| wall | 2.40 (six perimeters) | `PT` 29 |
| lead-in | 0.6 on every bore | `PT` 30 |
| elephant foot relief | 0.5 on the bed edge | `PT` 31 |
| D-socket | 0.15 clearance, flat 1.15 from the axis | `PT` 146 to 153 |
| heat-set | 3.25 x 4.0 for M2 | `PT` 33 |
| dowel | D3.1 bore for 3 mm | `PT` 214 |
| print directions | thigh, shank and covers +Z up (U open up), arm +Y, ankle yoke -Z, foot +Y, hip yoke -Y, pelvis +Y, torso -Z, head -Y, shoulder yoke -Y | `PT` 368 to 372 |
| hardware | 44 M2 x 6, 44 heat-set inserts, 14 dowels 3 x 12, 14 M2 grubs | `F/src/explode.json` |

---

## 7. UX anatomy (`pawl.html`)

Three column grid `252px 1fr 238px`, dark tokens (`--acc #2fd6c3`, `--warn #e8b23a`, `--bad #e2544a`), JetBrains Mono.

- Left pane: wordmark and subtitle; Mode (STAND, WALK, SQUAT, JOINT TEST; HOISTED or FREE; RESET, PAUSE); Joint test (joint select, the hint from the joint table, angle slider over the joint's limits, mirror to the other side); Gait (period 1.4 to 4.5, step length 0 to 64, step height 4 to 30, sway 0 to 34, hip height 191 to 212, swing fraction 0.25 to 0.5, dwell 0 to 4, IMU ON or OPEN LOOP); Actuator model (bandwidth 6 to 55 Hz, torque scale 0.3 to 3, foot friction 0.2 to 1.6); Display (CoM + POLY, MOTORS + SHAFTS, FOOT TRAILS, JOINT AXES).
- Stage: boot overlay ("loading rapier + three", with a network message on failure), OrbitControls, floor, grid, a forward arrow, CoM dot and its ground projection, support polygon line, foot trails (280 points).
- Right pane: Joint load per side per joint with the live angle; State (mass, CoM height, CoM in polygon, torso pitch and roll, travelled, peak load, sim rate); Verified geometry; Notes.
- `pawl-exploded.html`: explode slider, ASSEMBLED or EXPLODED, MOTORS, COVERS, SECTION, PLAY ORDER, the assembly order list with a note per step, a fasteners table, a Verified panel restating the checker results.
- What makes it excellent: the robot is the printed meshes under real joint limits and torque ceilings; open loop visibly fails and IMU on visibly stands, so the control decision is shown, not described.

Defect seen in the drive: the State "mass" readout shows "0 g" (measured 2026-10-05 in all five shots). `MTOT` sums `bodies[n].mass()` once at load (`H` 614); with every collider at density 0 the mass set by `setAdditionalMassProperties` is not yet reported at that moment.

---

## 8. Tests and harness

| test | what | result |
|---|---|---|
| `final.mjs` | 17 Rapier trials: stand 60 s, stand at hip 192 and 212, open loop "(should fail)", squat 30 s, pushes of 0.06 and 0.12 N s in z and x at 3 s, eight walks (T 3.2/2.8/2.4/2.0 at S 38 sway 23; S 20 and 50; sway 18 and 28); fall when tilt over 30 degrees or torso under 0.12 m | rapier3d-compat 0.14.0: 15 of 17 pass, fails push z 0.12 and push x 0.12 (both fall at 3.5 s), open loop passes; two runs byte-identical. Deterministic 0.21.0: 9 of 17 (measured, M02, `F/records/`) |
| `smoke.mjs` | jsdom, stubbed renderer, import map rewritten to node_modules, rapier swapped for the compat build, 300 frames, every button, every slider at min, max and value, every select option | not rerun |
| `parts.py __main__` | volumes and span assertions | prints "placement assertions: ALL PASS" or a failure count; not rerun (needs cadquery) |
| five python checkers | section 5.8 | not rerun |
| drive 2026-10-05 | seven shots | no page errors |

Label defect (D-153): the open loop trial is labelled "should fail" and passes; the script exits 0 whatever happens.

---

## 9. Port map

| item | value |
|---|---|
| packages | `sim` (Rapier world, PD actuator with slew and reflected inertia, multi-trial suite, pushes), `motion` (closed form IK, gait, IMU ankle loop, stance band), `mesh` (bed relief, lead-ins, teardrops, explicit primitives), `checks` (the five checkers), `catalog` (15BY-GM12 envelope and ratios, tier inferred) |
| feature kinds | `bore` with lead-in, `pocket` (insertable motor slot), `screw` (heat-set, pinch clamp), `boss` (D-hub), `hinge` (fork plus far-side dowel); MISSING: a D-shaft `coupling` kind with a torque-path check, a cable `loom` kind with conductor count |
| canon id | MISSING: "fork and D-hub" is a candidate in CANONS section 8.3 (with the PAWL actuator rows at M08); the ankle torque strategy and the stance band from the IK singularity have no entry |
| reference id | MISSING (`machines/pawl-leg` is named in older notes but is absent from the handoff INDEX) |
| milestone | M02 (M02-T03 PAWL suite: record on 0.14.0, port to deterministic 0.21.0); M08 (actuator rows, D-104) |
| lineage row | MISSING (M02 plans `designs/pawl/legacy/` and a lineage row for `core.mjs`) |
