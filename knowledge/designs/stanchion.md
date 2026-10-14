# STANCHION: how it is made

Record written 2026-10-05 from the original code. Slug `stanchion`. Family robots.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula or a value printed by the canonical page in the 2026-10-05 drive. "Stated" quotes the README or the page's build notes. Units are mm, degrees, cc (cm3) and mm/s.

Short paths: `F` is `fab-knowledge:originals/stanchion/files/`; `CAD` is `F/src/cad.py`; `H` is `F/stanchion.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "STANCHION, tracked mast robot, aileron-differential head, collar arms" |
| owner's slug | stanchion |
| canonical page | `H` (viewer v2), copied from `fab-work-directory:benches/stanchion/outputs/stanchion.html`; same size and date as `~/Downloads/stanchion (1).html` |
| sha256 | a955b326fd5cfeaf5f49d92a614054e5d0e050a953bd289cbac3b358c3f1ece0 (264097 bytes, 703 lines; line 79 is the 230555 character `window.DATA` blob) |
| date | 2026-08-01 04:10 (Downloads mtime of the identical copy) |
| generator | `CAD` (453 lines, sha256 4fe0bf820f88...), trimesh plus manifold3d; `view.py` assembly graph and software renderer; `export.py` mesh payload; `icheck.py` interference audit |
| runtime | three.js r128 from cdnjs; JetBrains Mono from Google Fonts |
| hook | none |
| chat | "Tread robot with 3D printed gimbal head", conversation c2de9815-2da7-4a65-b8aa-3604e61dbf60 |

### 1.1 Every revision found

| file | date | what |
|---|---|---|
| `~/Downloads/stanchion.html` | 2026-08-01 03:54 | viewer v1 (258556 bytes) |
| `stanchion (1).html` = harvest | 2026-08-01 04:10 | viewer v2: adds edge lines, the fold button, section clipping and the iso view. Canonical |

### 1.2 Why this revision

It is the newest, and it is v1 plus inspection tools; the geometry and the head solver are the same source. The drive on 2026-10-05 found no page errors. The interference audit took the assembly from 84 interfering instance pairs to 0 (stated in `knowledge/projects/robots.md` per the bench reader).

### 1.3 What is in `fab-knowledge:originals/stanchion/files/`

| path | what |
|---|---|
| `stanchion.html` | the viewer |
| `src/cad.py`, `view.py`, `export.py`, `icheck.py`, `README.md` | sources and the parts README |
| `exports/yaw_plate.stl`, `gimbal_cross.stl`, `cam_carrier.stl`, `pushrod.stl`, `pipe_collar.stl`, `servo_l_bracket.stl` | the head linkage parts, the clamp and the arm bracket (the other eight STLs stay in the bench folder) |

Hashes: `fab-knowledge:originals/stanchion/SHA256SUMS`.

---

## 2. What it makes and for whom

A tracked robot on a bought steel tank chassis (KOOKYE, uploads 2026-08-01) with a 1-1/4 in PVC mast carrying a stereo camera head (Hotpet OV9715 dual lens board) and two MG996R arms clamped to the pipe. The head pans on one SG90 and tilts and rolls on two SG90s through an aileron differential: two pushrods from two horns to a camera carrier on a printed cardan cross. Every printed bracket shares one mount pattern, so arms reconfigure without new parts. 590 mm tall, track base 245 x 172 (page HUD). 14 printed part shapes, 25 pieces, about 350 g PETG (stated). For a maker building a telepresence or vision rover who wants the head geometry solved before printing.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), waiting until the LOADING GEOMETRY overlay is removed. Files in `fab-knowledge:originals/stanchion/shots/`. No page errors.

| file | caption |
|---|---|
| `t01-boot-iso.png` | Whole robot, iso: tracked chassis with slotted decks, Pi tray, mast hubs, the pipe, two collar arms with L brackets, link arms, elbow pods and hand plates, the head base, yaw plate, pushrods and the domed head shell with the stereo lenses. Aside: DRIVE, HEAD (pan, tilt, roll, live servo A and B horn angles), ARMS (mirror, six sliders), VIEW (explode, section, group toggles, edges, dim others, ghost bought, section axis, camera presets). |
| `t02-head-tilt-roll.png` | HEAD view at pan 30, tilt 8, roll 8. |
| `t03-head-unreachable.png` | Tilt 10 and roll 10 at once: servo A 46.1, servo B 0.6 (computed by the page), the horns near the edge of their travel; the shell, carrier, cross and lens tubes close up. |
| `t04-arms-raised-turning.png` | Arms raised (swing 40, shoulder 60, elbow 30, mirrored) with the tracks counter-rotating at -20 and 20. |
| `t05-explode-ghost-bought.png` | EXPLODE 0.8 with GHOST BOUGHT: printed parts in teal pulled apart along their own vectors, bought parts (chassis, wheels, servos, boards, pipe) translucent. |
| `t06-section-x-selected-yaw-plate.png` | Yaw plate selected from the parts table (74 x 56 x 89.8, 58.2 cc, 1244 triangles, printed) and framed, others dimmed; section on X at 62: the base plate, the two SG90 cradles open to +Z, the gimbal fork post. |

---

## 4. Code map

| area | file and lines |
|---|---|
| frame, mount convention docstring | `CAD` 1 to 9 |
| parameter dict `P` and derived heights | `CAD` 19 to 62 |
| helpers `boxc`, `cyl`, `seg`, `hexp`, `ellip`, `U`, `D`, `I` | `CAD` 65 to 91 |
| PAD and HORN cutters | `CAD` 93 to 110 |
| split clamp | `CAD` 115 to 132 |
| pi_tray | `CAD` 138 to 162 |
| mast_hub | `CAD` 164 to 182 |
| pipe_collar | `CAD` 184 to 193 |
| head_base and cap | `CAD` 195 to 215 |
| yaw_plate | `CAD` 217 to 249 |
| gimbal_cross | `CAD` 251 to 256 |
| cam_carrier | `CAD` 258 to 277 |
| pushrod | `CAD` 279 to 282 |
| head_shell | `CAD` 284 to 297 |
| servo_l_bracket | `CAD` 299 to 321 |
| link_arm, elbow_pod, hand_plate | `CAD` 323 to 370 |
| bought parts (SG90, MG996R, chassis, decks, boards, pipe, camera) | `CAD` 375 to 441 |
| assembly graph, `basis()` with a det = 1 assert | `F/src/view.py` 17 to 120 |
| int16 mesh payload | `F/src/export.py` 1 to 22 |
| interference audit | `F/src/icheck.py` 1 to 32 |
| page tokens and layout | `H` 9 to 66 |
| page mesh decode, materials, edges | `H` 90 to 154 |
| page assembly (chassis, electronics, mast, head, arms) | `H` 155 to 236 |
| track hull path and link placement | `H` 239 to 288 |
| head linkage solve and rod placement | `H` 291 to 331 |
| state, limits, pose, explode, visibility | `H` 334 to 388 |
| panel sections and build notes | `H` 391 to 484 |
| wiring, camera presets | `H` 486 to 524 |
| damped orbit, pick, zoom to cursor, focus | `H` 527 to 602 |
| selection and framing | `H` 606 to 617 |
| section clipping | `H` 620 to 636 |
| loop: drive model, demo, horn readout, HUD | `H` 652 to 697 |

---

## 5. Mechanisms and constructions

There is no circuit in the outputs; the Pi and HAT are bought bodies in the model.

### 5.1 One mount pattern: PAD plus HORN on one face (`CAD` 93 to 110)

What it does: lets any bracket bolt to any other bracket's pad, to the collar pad, or straight onto a servo horn.

PAD: 4 x M4 clearance (4.5) on a 22 (across, Y) by 20 (up, Z) rectangle with M4 hex nut traps (8.1 across flats, 3.5 deep) on the far side, face normal +X, plate 6.0 thick. HORN: 6 x M3 clearance (3.4) on an r 8 circle plus a shaft relief bore `shaft_d/2 + 1.4`, concentric with PAD on the same face. `pad_cuts(x_face, t)` and `horn_cuts(x_face, t, shaft_d)` emit the cutters for a plate from `x_face` to `x_face + t`.

### 5.2 Split clamp on the pipe (`CAD` 115 to 132)

What it does: clamps a printed part onto the PVC with two M4 x 35 bolts, from one printed half used twice.

Construction: a cylinder of `ro` (`clamp_ro = clamp_rb + 2.4 + 1.4`, `clamp_rb = 42.2/2 + 0.175 = 21.275`, so `ro = 25.075`, computed) plus two lugs at plus and minus X (13 long, plus and minus 0.62 x 13 wide); cut the bore `rb`, a 1.6 kerf slab at Y = 0, and per lug and per bolt height an M4 clearance along Y with a hex nut trap; intersect with the +Y half. The -Y half is the same printed part rotated 180 degrees. Used by `mast_hub` (bolts at 14 and 40), `pipe_collar` (7.5 and 26.5) and `head_base` (two halves under a tower).

Limit (from the chat, bench reader): a split clamp carries at most two opposed accessory pads, one per half, because a pad straddling the kerf is cut in two.

### 5.3 Aileron differential camera head (`CAD` 217 to 282, `H` 291 to 331)

What it does: two SG90s on a yaw plate drive a camera carrier through two pushrods and a printed cardan cross; horns moving together tilt the camera, horns moving opposite roll it. A third SG90 in the head base pans the whole yaw plate.

Heights (derived, `CAD` 51 to 62): head base top and yaw axis 430; yaw plate 432.6 (horn thickness above the case); pitch axis 460; gimbal centre 520; rod attachment z 500 at x -25, y plus and minus 30; SG90 axis x -10 (`rod_att_x + sg_horn_r`); pushrod length 500 - 460 = 40 (computed).

Construction:

1. Yaw plate (`CAD` 217 to 249): a 74 x 56 x 5 base with a D18 x 2.4 hub boss underneath, a D6.4 shaft clearance and 4 x M2 on r 7 for the pan horn; two cradles for the tilt SG90s with shafts outboard along plus and minus Y; case pocket and flange slot "both swept to +Z so the servo drops in"; D13 shaft clearance; self-tap pilots D2.3 and M2 clearance per flange hole; a post up to the gimbal with a fork (D4.2 pin bore) for the cross's Y pins.
2. Gimbal cross (`CAD` 251 to 256): a 9 mm cube, two D9.2 bosses along Y and X, D3.4 pins (radius 1.7) 23 long on Y and 18 long on X: Y pins ride the yaw plate fork (pitch), X pins ride the carrier lugs (roll).
3. Camera carrier (`CAD` 258 to 277): a back plate the length of the board, a lug for the X pins, a bridge, two ears reaching to the rod sockets (D6.3 ball sockets with a 2.6 slot), M2 holes for the board, M3 heat-set holes for the shell posts.
4. Pushrods (`CAD` 279 to 282): a D5.2 rod with D7.2 ball ends, 40 between centres.
5. Head shell (`CAD` 284 to 297): an ellipsoid shell (48 x 78 x 62 semi-axes, 2.4 wall) clipped, a window for the board and two D17.4 lens holes at the 105 baseline, two ears with M3 holes.

The solver (`solveHorns`, `H` 293 to 314), per side: transform the rod socket into the yaw plate frame; take the lateral offset `dy` between the horn plane (`hy = sy (1 + sg_h + sg_shaft_up + 2)`) and the socket; reduce the rod to an in-plane radius `rad = sqrt(L^2 - dy^2)`; intersect the horn circle (centre `(sg_axis_x, dz)`, radius 15) with the socket circle (radius `rad`) by the two-circle construction

```
a = (R^2 - r^2 + d^2) / (2 d),  h = sqrt(R^2 - a^2)
P = C + a (S - C)/d  plus or minus  h perp(S - C)/d
```

keep the solution with the smaller x (the horn arm points aft), and report the horn angle `atan2(z - cz, -(x - cx))`. No real solution means "linkage cannot reach this pose"; |angle| over 85 degrees raises "near travel limit". Rods are placed by a quaternion from +Z to the rod vector and scaled to length (`placeRods`, 315 to 331).

This is the closed form CANONS asks for (`aileron-differential`: "stub unless M06-T03 finds a derivation"): the horn angles are an exact inverse of the carrier pose through a sphere-plane-circle intersection, not a linear mix. The README phrase "horn sum is tilt, horn difference is roll" is its small-angle reading. At tilt 10 and roll 10 the page solves servo A 46.1 and servo B 0.6 degrees (computed in the drive), so the horns move about 2.3 degrees per degree of head motion near neutral.

Travel limits (UI, `H` 341): pan plus and minus 95, tilt -22 to +10, roll plus and minus 10. Tilt-up runs out at about 11 mm of socket rise on a 15 mm horn; a 20 mm horn arm opens it to about plus and minus 20 tilt and plus and minus 18 roll; longer plate arms make it worse (more rod travel per degree), so the horn sets the reach (stated, build notes).

### 5.4 Collar arms (`CAD` 299 to 370, `H` 210 to 236)

Each arm: a `servo_l_bracket` on the collar pad (shoulder swing, MG996R), a second `servo_l_bracket` on the first one's horn (shoulder), a `link_arm`, an `elbow_pod` (elbow MG996R), a second `link_arm` and a `hand_plate`.

`servo_l_bracket`: plate A 4.5 thick (a 32 square intersected with a D32 disc) carrying PAD and HORN on its face; plate B at the MG996R flange level; two web plates beside the case; a case window; four M3 flange bolt holes at 49.5 x 10.0; a shaft clearance. `link_arm`: 92 between centres, 3.2 thick, D30 bosses, the horn pattern at one end, four M3 at the other on a 18 grid, D11 lightening holes every 17. `elbow_pod`: plate, webs, a 3.2 link slot jaw with four M3, the case window and flange bolts.

Re-mount between bracket 1 and bracket 2: a constant basis change, `R12 = inv(B1w) B2w` in python and a 90 degree Z rotation in JS; `basis()` asserts det = 1 so a mirrored basis cannot enter the chain (the PAWL `mout` lesson). Limits measured by solid overlap sweeps: swing -40 to 85 (the upper link reaches the mast at -40), shoulder -20 to 80 (the arm hits the head base going vertical), elbow 0 to 115 (stated, build notes).

### 5.5 Tracks and drive (`H` 239 to 288, 652 to 678)

`hullPath()`: 96 samples on each wheel circle (sprocket r 24, idler r 21, four road wheels r 15) grown by 2.5 for the track thickness; monotone chain convex hull; walked by arc length. `round(TL / 10.6)` link meshes per side, placed by `onPath(offset + i TL/N)` with the segment angle. Drive: slider times 2.4 = mm/s at the track (100 gives 240); `v = (sl + sr)/2`, `w = (sr - sl)/(2 track_y)` with `track_y = 70`; pose integrated per frame and clamped to plus and minus 1400; WASD adds 70 forward and 55 turn; wheels spin by distance over radius.

### 5.6 Interference audit (`F/src/icheck.py`)

For every instance pair outside the ignore set `IGN` (seven entries, six distinct pairs since carrier and pushrod appear in both orders: gearmotor and sprocket, side frame and gearmotor, carrier and pushrod, SG90 and pushrod, yaw plate and cross, cross and carrier): AABB reject with 0.01 slack; `trimesh.boolean.intersection`; flag over 0.05 cc; a boolean that throws is skipped silently (`except Exception: continue`, line 17), so a failed intersection reads as clear; report the intersection bounds mapped into the first part's local frame (`inv(T1) @ bounds`), so the fix location reads in that part's own coordinates. Poses: neutral; yaw 95, pitch 30, roll 24; yaw -95, pitch -30, roll -24. Those exceed the UI tilt and roll limits, so the audit is conservative.

### 5.7 Software render (`F/src/view.py` 122 onward)

A numpy rasteriser: look-at view, perspective (near 10, far 4000), per-triangle barycentric fill with a z-buffer, backface cull on signed screen area, Lambert `0.20 + 0.80 max(0, n.L)`, gamma 1/2.2, PNG through PIL or a hand-written zlib writer; six named views. The README states the HTML was cross-checked against `view.py` instance by instance to identical world coordinates.

### 5.8 Mesh transport (`F/src/export.py`)

Per part: origin `o` (bbox min), scale `s = max span / 32000`, vertices `round((v - lo)/s)` as int16, faces uint16 under 65536 vertices, triangle count, volume in cc, bbox extents, a printed flag. The page decodes `pos = q s + o`, then `toNonIndexed()` and `computeVertexNormals()` for flat shading.

### 5.9 Snap ball joints on the pushrods (`CAD` 268 to 282)

What it does: the pushrods clip onto the carrier with no hardware. Each rod is a D5.2 shank with a D7.2 ball (icosphere r 3.6) at each end, 40 between centres. Each carrier ear carries a vertical D6.3 socket bored through the ear at (-25, plus or minus 30, -20) in the gimbal frame, split by a 2.6 wide slot through the ear from 9 below to 4 above the socket centre. The ball is 0.9 larger than the socket, so the slotted ear springs open as the ball is pressed in and closes behind its equator; the slot is what makes it a snap rather than a press fit. The lower ball sits at the horn tip; how it is retained on the SG90 horn is not modelled.

### 5.10 Mast hub, Pi tray and head base (`CAD` 138 to 215)

- Mast hub (two identical halves): a D92 x 8 flange, a split clamp from z 2 to 46 with bolts at 14 and 40, and three 8.4 thick gussets at 38, 90 and 142 degrees from r 23 to 0.88 of the flange radius (40.5); each is drawn 30 tall, but the notch cutter removes everything beyond r 12 above z 14, so the gussets as built are 14 tall blocks; a D28 spigot bore and a pipe seat counterbore D42.55 x 8; two 14 x 4.4 slots on r 36 at 30 and 150 degrees with M3 head counterbores, for M3 bolts into the 22 mm deck slot pitch. The finished half is intersected with +Y, so one STL is printed twice.
- Pi tray: a 93 x 64 x 3 plate on four D12 x 6 feet; at each foot a 12 x 4.4 slot beside a D6.4 head pocket, which reads as a keyhole for sliding the tray onto deck bolt heads (the intent is not stated); four D7.2 bosses with M3 heat-set holes (D4.0) on the Pi's 58 x 49 pattern; 2.4 side rails 12 tall and a rear wall; a 10 wide open end over the Pi's port edge, a 16 wide notch at the other end, two 14 wide cutouts in the side rail; 7 wide vent slots every 13.
- Head base: a 44 x 38 tower from the pipe top to z 430 with an SG90 pocket (case plus 0.4, flange slot) open at the top and two M2 flange holes at plus and minus 13.95 from the flange centre, a D27 bore down into the pipe, a 18 x 15 wire chase; the tower is split at Y = 0 and each half is unioned to one half of a two-bolt split clamp (`head_base`, `head_base_cap`), so the pan servo is trapped when the clamp is bolted.

### 5.11 Hand plate and arm handedness (`CAD` 361 to 370, `F/src/view.py` 97 to 112)

The hand plate is a 42 x 3.2 x 24 plate with a D26 boss, a 4 x 20 x 24 end block, the four M3 holes on an 18 square that match the link end, and three D5.2 holes along x at the tip (z -8, 0 and 8) as a tool mount. The right arm is not a mirrored copy: its first bracket is placed with `Rz(180)` before the same left-arm basis chain, so every part stays a proper rotation and the same four bracket STLs serve both sides; `basis()` would reject a mirror.

### 5.12 Demo sweep (`H` 659 to 668)

DEMO drives yaw `52 sin 0.55T`, tilt `14 sin(0.8T + 1)`, roll `13 sin 0.37T` and both arms through shoulder -20 to 30 and elbow 40 to 90. The tilt and roll amplitudes exceed the UI limits (tilt +10, roll plus and minus 10), so the demo passes through poses where the readout says "linkage cannot reach this pose" and the rods are hidden; the demo shows the reach boundary rather than a safe motion.

---

## 6. Fits and print settings

| item | value | source |
|---|---|---|
| fit | 0.35 | `CAD` 30 |
| wall, layer | 2.4, 0.2 | `CAD` 27 |
| fasteners | M2 2.2, M3 3.4 (head 6.4), M4 4.5, M4 nut 8.1 x 3.5, M3 nut 6.1 x 2.6, M3 insert hole 4.0 (knurl minus 0.2) | `CAD` 28 to 30 |
| clamp kerf | 1.6 | `CAD` 115 |
| SG90 model | 22.8 x 12.2 x 22.5, flange 32.2 x 2.5 at 15.9, shaft offset 6.1, D4.8, 4.0 up, horn r 15 | `CAD` 41 to 42 |
| MG996R model | 40.7 x 19.7 x 42.9, flange 54.5 x 2.8 at 27.0, shaft offset 10.0, D5.9, 4.5 up, horn r 20, bolts 49.5 x 10.0 | `CAD` 44 to 46 |
| print | clamp halves and head base split face down; brackets mount plate down; links, hand plates and the cross flat; head shell face down, dome up, the only part with support | build notes, README |
| material | PETG or ABS structural, PLA for the head shell only; 4 walls, 30 percent infill | README |
| fasteners | M4 x 35 two per clamp, M4 x 16 for pads, M3 x 10 for MG996R flanges and horns, M2 x 10 self tappers for SG90s, M3 heat-set inserts in the Pi tray and shell posts | README |
| measure first | pipe OD (42.2 modelled; 1 in Sch40 is 33.4), stereo board length and lens spacing (130 x 24, 105 baseline), deck slot pitch 22, clone servo cases vary up to 1 mm | README |

---

## 7. UX anatomy

Dark instrument shell (`--bg #0d0f11 --panel #15181c --hot #48c9b0 --warn #e0a458 --bad #d9534f`), JetBrains Mono. Stage left with a HUD (height, track base, control hints, live track speeds and heading), a 340 px aside with collapsible sections, a fold button that hides the aside; under 840 px the layout stacks.

- DRIVE: two track sliders, stop, reset pose, demo (a slow sweep of head and arms).
- HEAD: pan, tilt, roll; live horn angles for servo A and B with warn and bad states.
- ARMS: mirror toggle, swing, shoulder and elbow per side.
- VIEW: explode 0 to 1 (per-instance vectors), section 0 to 100 on Y, X or Z (a three.js local clipping plane on every material), group toggles (chassis, wheels, tracks, electronics, mast, head, shell, arms), edges, dim others, ghost bought, camera presets (front, side, top, iso, head, fit all).
- PRINTED PARTS: a table (name, quantity, bbox, volume); click a row or a part in 3D to select, frame and dim the rest; an estimate of grams at 4 walls and 30 percent.
- BUILD NOTES (collapsed): measure-first list, the mount pattern, the head linkage and its travel, measured arm limits, print orientation, fasteners, a centre-of-mass warning.
- Orbit: damped toward a target (0.18), right or shift drag pan, wheel zoom toward the picked point, double click focus, elevation clamped -1.30 to 1.45 rad, hover tooltip.
- What makes it excellent: the head is solved, not animated, so an impossible tilt-roll combination says so; every printed part can be isolated, measured and sectioned in place; bought parts can be ghosted to see only what prints.

---

## 8. Tests and harness

| test | what | result |
|---|---|---|
| `icheck.py` | pairwise boolean volume at three poses | 84 pairs to 0 (stated); not rerun |
| `cad.py __main__` | every part watertight, triangle count, volume | stated; not rerun |
| view parity | `view.py` and the HTML cross-checked instance by instance | stated |
| drive 2026-10-05 | six shots | no page errors |

---

## 9. Port map

| item | value |
|---|---|
| packages | `mesh` (boolean CSG via manifold3d), `motion` (kinematic tree, basis with det check, two-circle linkage solve), `sim` (pairwise intersection at swept poses, bbox reported in the first part's frame), `ui-core` (orbit, explode, section, isolate, ghost bought) |
| feature kinds | `horn` (6 x M3 on r 8 with relief), `pad` (4 x M4 on 22 x 20 with nut traps), `screw`, `bore`, `pocket` (servo, swept to +Z), `boss` (insert bosses), `window` (link lightening D11 at 17); candidate `mount` (PAD plus HORN on one face as one declaration; PLAN line 608 names STANCHION) |
| canon id | `aileron-differential` (CANONS section 2.1, status stub "unless M06-T03 finds a derivation"; `solveHorns` is that derivation, section 5.3). MISSING: split clamp, track hull path |
| reference id | MISSING (CANONS lists `aileron-differential` with reference none; bench reader candidates `joints/aileron-differential`, `joints/split-clamp`, `joints/pad-horn-mount`) |
| milestone | M06 (M06-T03 types or stubs `aileron-differential`); M16 (registry row, `designs/stanchion/legacy/`) |
| lineage row | MISSING |
