# DERRICK: how it is made

Record written 2026-10-05 from the original code. Slug `derrick`. Family robots. DERRICK is a five axis arm built from five PINTLE joint modules; the module itself is recorded in `fab-knowledge:originals/pintle/RECORD.md` and this record covers the brackets, the chain, the checks and the print planning.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula, a value printed by the canonical source rerun on 2026-10-05 (`fab-knowledge:originals/derrick/files/records/`), or a value printed by the canonical viewer in the 2026-10-05 drive. "Stated" quotes a README. Units are mm, degrees, grams, cm3 and kg cm.

Short paths: `F` is `fab-knowledge:originals/derrick/files/`; `AP` is `F/src/arm_parts.py`; `AB` is `F/src/arm_build.py`; `DV` is `F/src/derrick_viewer_tpl.html`; `PL` is `F/src/plate.py`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "DERRICK / 5 axis arm on PINTLE joints" (viewer title); "DERRICK R3" (README) |
| owner's slug | derrick |
| canonical bundle | `F/derrick-r3.zip`, copied from `fab-work-directory:benches/pintle-derrick/outputs/derrick-r3.zip`; sha256 f81604f7efce24fee0eab45bd0f43c99d30c383ec1a21fb7adc7517dc286cd98 |
| date | 2026-08-10: R1 18:18 (`arm_ref.json`, `a_elbow_in.png`), R2 18:58, viewer and module R6 19:45, R3 weight pass, plates and zip 20:43 (zip entry times) |
| generators | `AP` (211 lines), `AB` (309 lines), both importing PINTLE's `F/src/pintle_parts.py` |
| viewer | `F/derrick-viewer.html`, sha256 db65adc42d0f8bd95e9763b79b5f61133179211687bd22965c9ee7de1c16c819, baked from `DV`; three.js r128 classic script from cdnjs |
| plate views | `F/derrick-plate.html` (2D SVG, no dependencies), `F/derrick-plate-3d.html` (three.js, nozzle height clip) |
| hook | `window.__derrick = {computePose, INST, mul, apply}`, defined before the three.js check so kinematics run without the CDN (`DV` line 239) |
| chat | "Modular pancake motor for robotic joints", conversation 8f0e3908-e414-4255-9523-a26628da2f2f; no registry entry of its own |

### 1.1 Every revision found

DERRICK R1 to R3 live in the same chat as PINTLE R4 to R6 (all 2026-08-10). `~/Downloads/derrick-r3/` and `derrick-r3.zip` are byte-identical to the harvest (downloads reader). Only R3 survives as files; R1 and R2 are described in the README.

| rev | change | evidence |
|---|---|---|
| R1 | brackets on PINTLE R4 with inserts; first fold sweep found the next module's D44 head 54.6 mm3 through the hinge cheek at every pose | README "Verification" |
| R1 to R2 | SPAR pad moved from the far face to the near face: lateral offset of the tool from 132 to 49 mm | README "The two mates" |
| R2 | brackets follow PINTLE R5 to R6 (rail interface, slide groove, no inserts) | README "Assembly order, R2" |
| R3 | weight pass 233 to 201.6 cm3; orientation scoring, time estimate, time-balanced plates, 3D plate view | README "Weight reduction, R3", "Build plates" |

### 1.2 Why this revision

It is the only revision with files and it is complete: nine part generators, an arm build that checks single bodies, forward kinematics, static torque, self collision at seven poses and a 35 pose fold sweep, an explode check, orientation scoring, a print time model, a time-balanced plate packer and three viewers. Rerun on 2026-10-05 from the canonical source (computed, `F/records/`): all nine parts watertight and one body; self collision clear at all seven poses; fold sweep 0 clashes; explode 0 overlapping pairs at full travel (2 at half travel, as the README says); plates 12 and 14 parts, 155 and 156 minutes, 0 placement problems.

Known drift in the bundle, found on 2026-10-05:

- `F/src/arm_ref.json` (18:18) is stale. It is the golden that `smoke_arm.js` compares the viewer against at 0.0005 mm, and that M07 plans to port. Regenerated from the canonical source the home tool sits at (55.55, 23.28, 186.61); the shipped file says (48.75, 18.02, 181.49); the shipped viewer's own `computePose` gives (55.55, 23.28, 186.61) (computed through the hook). So the shipped viewer and the shipped source agree with each other and disagree with the shipped golden by 6.8 mm in x. The regenerated golden is `F/records/arm_ref_regenerated_2026-10-05.json`.
- Torque differs three ways at home for J2: shipped golden 0.3712, regenerated python 0.3287, viewer 0.3551 kg cm (computed). The viewer's library volumes were baked at 19:45, before the 20:43 weight pass (it shows 301 g printed mass), which explains part of it.
- README-DERRICK carries the R1 torque table (0.37 / 2.39 / 0.60), reach 185 mm (regenerated: 192.5 at reach out), two total masses (274 g and 256 g; regenerated 269.9 g printed plus 45.0 g servos, computed), cheek "6 mm" (code `CT_IF = 7.0`), and an R2 assembly order that still sets inserts.

### 1.3 What is in `fab-knowledge:originals/derrick/files/`

| path | what |
|---|---|
| `derrick-r3.zip` | the bundle as shipped |
| `README-DERRICK.md` | arm readme |
| `derrick-viewer.html`, `derrick-plate.html`, `derrick-plate-3d.html` | the three pages |
| `src/arm_parts.py`, `src/arm_build.py`, `src/arm_ref.json`, `src/arm_render.py`, `src/orient.py`, `src/estimate.py`, `src/plate.py`, `src/plate3d.py`, `src/explode_check.py`, `src/smoke_arm.js`, `src/smoke_plate.js`, `src/derrick_viewer_tpl.html`, `src/plate3d_tpl.html`, `src/pintle_parts.py` | sources |
| `exports/derrick-{gudgeon,hinge,spar-upper,spar-fore,tool-plate}.stl` | print-oriented brackets |
| `exports/plate_preview.png`, `plate3d_preview.png`, `a_home.png` | the bundle's own previews |
| `records/` | 2026-10-05 reruns: arm build, regenerated `arm_ref`, orientation, estimate, plate, explode |

Hashes: `fab-knowledge:originals/derrick/SHA256SUMS`.

---

## 2. What it makes and for whom

A desk arm with five SG90 or MG90S servos: J1 base yaw, J2 shoulder pitch, J3 elbow pitch, J4 wrist pitch, J5 wrist roll, and a tool plate with a 6 hole M2 grid. Every module is held by a bracket that grips both flank lands, so only the output face drives the next link. Reach 192.5 mm from the base axis at full extension; the tool travels from 22.3 below the table to 244.2 above it (computed). Fourteen purchased fasteners for the whole arm plus the horn screws from the servo bags, no inserts (README). For a maker who wants a printed arm whose joints do not wobble and whose torque budget is known before the first print.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), waiting for `window.__derrick` and `THREE`. Files in `fab-knowledge:originals/derrick/shots/`. No page errors.

| file | caption |
|---|---|
| `d01-boot-home.png` | HOME pose (0, -50, 80, -30, 0): five modules in grey with orange rotors and teal retainers, the gudgeon base, hinges, spars and the tool plate; amber joint axis lines. Rail: POSE buttons, five JOINT sliders, EXPLODE, VIEW, SHOW groups. Pane: tool 56 / 23 / 187, reach 60, printed mass 301 g, holding torque J2 0.35, J3 0.69 amber. |
| `d02-reach-out-shoulder-over-stall.png` | REACH OUT (all zero): tool 56 / -184 / 60, reach 193; J2 2.63 kg cm in red (over SG90 stall), J3 1.01 amber. |
| `d03-twist-side.png` | TWIST pose from the SIDE view: base yaw 45 and wrist roll 88. |
| `d04-explode-full.png` | EXPLODE 1.00 at HOME: each part travels along its own joint axis by its stack position (belly -175, servo -60, retainer 14, horn 40, rotor 75, lock screw 160) and each joint's cluster fans 200 mm along world x, so every screw shows where it lives. |
| `d05-explode-half-modules-only.png` | EXPLODE 0.50 with only MODULES shown. |
| `d06-reach-down-front.png` | REACH DOWN (0, 45, 45, 45, 0) from the FRONT: tool at z -22, J2 2.14 red. |
| `d07-plate-3d.png` | `derrick-plate-3d.html`, PLATE 1: twelve print-oriented parts on the 256 mm bed with the keep out, rotors rail down, stators bottom down, hinge on its side; nozzle height slider at the top; 176 layers, 101 g, 2.6 h at 0.20, 26 percent coverage. |
| `d08-plate-2d.png` | `derrick-plate.html`: both plates in 2D with hull outlines, the 6 mm keep out and the parts table. |

---

## 4. Code map

| area | file and lines |
|---|---|
| module interface facts (H, land plane, BCD, pilot) | `AP` 15 to 26 |
| bracket parameters, handedness phases | `AP` 29 to 50 |
| female output interface `slide_iface` | `AP` 53 to 73 |
| interface pad disc | `AP` 76 to 79 |
| the U cradle that grips both flank lands | `AP` 90 to 116 |
| GUDGEON base | `AP` 120 to 140 |
| HINGE (90 degree turn) | `AP` 144 to 157 |
| SPAR (in-plane link, tapered, lightened) | `AP` 161 to 184 |
| TOOL PLATE | `AP` 188 to 199 |
| part table, link lengths L1 82, L2 68 | `AP` 202 to 211 |
| mate transforms `M_hinge`, `M_spar`, `frames` | `AB` 16 to 55 |
| part library, hardware per joint | `AB` 58 to 81 |
| instance table (name, mesh, transform, mass) | `AB` 82 to 107 |
| named poses | `AB` 110 to 119 |
| static torque table | `AB` 139 to 163 |
| self collision at the poses | `AB` 173 to 211 |
| fold sweep | `AB` 213 to 237 |
| exports, rotated to print orientation | `AB` 240 to 250 |
| viewer payload and `arm_ref.json` | `AB` 252 to 309 |
| explode overlap check | `F/src/explode_check.py` 1 to 49 |
| orientation scoring | `F/src/orient.py` 1 to 35 |
| print time model | `F/src/estimate.py` 1 to 61 |
| plate orientation table, hulls, time balance, packing, verify | `PL` 11 to 193 |
| 3D plate payload | `F/src/plate3d.py` 1 to 50 |
| viewer: instance table, explode travel | `DV` 146 to 206 |
| viewer: `computePose` (row-major 4x4, torque) | `DV` 209 to 238 |
| viewer: hook | `DV` 239 |
| viewer: refresh, explode in world space, readouts | `DV` 396 to 435 |
| viewer: orbit, keys (1 to 5 pick, arrows jog 3 degrees, H, R) | `DV` 438 to 478 |

---

## 5. Mechanisms and constructions

There is no circuit.

### 5.1 Two mates make the whole arm (`AB` 27 to 55)

What it does: every bracket is authored in the frame of the module it holds (axis +z, bottom face z 0, output face z H = 38.75, flank lands at y plus and minus 14, servo tail +x), so the arm is a list of mating transforms from one rotor face to the next bracket's interface.

```
HINGE_R = [(0,-1,0), (0,0,-1), (1,0,0)]            columns: the new axis turns 90 degrees
M_hinge = R(HINGE_R, (0,0,H) - HINGE_R . (0, IFACE_Y, ZI))
SPAR_R  = [(1,0,0), (0,-1,0), (0,0,-1)]            new axis antiparallel, reach L
M_spar(L) = R(SPAR_R, (0,0,H) - SPAR_R . (-L, 0, PAD_Z))
MATES = [M_hinge, M_spar(82), M_spar(68), M_hinge]
F0 = I;  F(i+1) = F(i) Rz(q_i) MATES[i];  tool = F4 Rz(q4) T(0,0,H)
```

`IFACE_Y = 14.0 + 0.20 + 7.0 = 21.2`, `ZI = 4.40`, `PAD_Z = 3.00` (`AP` 37, 44, 42).

The staircase lesson: the SPAR pad sits on the same face the cradle opens from, so the next module folds back alongside the previous one. On the far face each pitch stage stepped 40.75 mm sideways and three stages put the tool 132 mm off the base axis; on the near face the total is 49 mm, all from the two hinges (README).

Handedness: the hinge's mating face is a quarter turn from the spar's, so its interface pattern needs `ROT_HINGE = -pi/2` or the lock slot lands in solid material (`AP` 46 to 50). PINTLE R5.2 found the tool plate 180 degrees out before the check caught it.

### 5.2 The cradle grip (`AP` 90 to 116)

What it does: a U that slides onto the module from the tail end; a rib on each cheek runs in the module's flank groove, a bump on the rib clicks into the groove's dimple, and one M2 x 8 up through the floor stops it sliding back out.

Construction: floor `bx(-3, 20, -(y_in + 4), y_in + ct_i, -4, 0)` with `y_in = 14.2`; two cheeks 4.0 thick (7.0 on a hinge's interface side) up to `CH = 16.5` (just under where the 45 degree cone crosses the cheek plane); ribs `gv_deep - 0.20 = 2.0` deep from z 5.7 to 11.3; bump r 1.4 at x 16.5; floor window `x 1 to 14, y plus and minus 10`; stop screw clearance D2.2 with a 4.3 counterbore 2.2 deep at (17, 12).

Capture (PINTLE `snap_check.py`, rerun 2026-10-05): seated clear; drawn back 3 to 30 clear; module lifted 1.0 traps 57.56 mm3; pushed 1.0 sideways traps 228.50 mm3 (computed). The floor is not the load path; the rib is.

### 5.3 Female output interface (`AP` 53 to 73)

The dovetail groove that takes PINTLE's rail: a convex hull 52 long, `rail_w0/2 + 0.20` at the face to `rail_w1/2 + 0.20` at depth `rail_t + 0.20`, so 0.20 clearance on every flank; a D5.6 clear bore for the horn screw path; a 3 mm stadium slot at r 9.5 for the M2 lock screw (`CLR 2.2`) and its 4.3 counterbore from the back; the whole pattern turned by `rot` for the mating face's handedness and placed by the pad's transform `tf`. Pad disc r 12.0, 7.0 deep behind the mating face (`PAD_R`, `PAD_TH`).

### 5.4 GUDGEON, HINGE, SPAR, TOOL PLATE (`AP` 120 to 199)

- GUDGEON (base cradle): a cradle on a 52 x 52 x 4 foot (x -22 to 30, y plus and minus 26), two convex hull gussets from the cheeks to the foot, four D3.4 holes for M3 x 12 to the bench 7 in from the corners, two D3.6 band anchors at (26, plus and minus 22).
- HINGE: a cradle with the 7.0 interface cheek; a pad disc at `T(0, 21.2, 4.4) Rx(-90)` on its outer face with the interface cut at `ROT_HINGE`. Turns the axis 90 degrees (J1 to J2 and J4 to J5). The code also cuts a D3.6 band anchor along x at (`HG_X0 + 5`, 0, `HG_Z1 - 5`) = (-10, 0, 21.0) (`AP` 153 to 156), but the hinge body tops out at z 16.5 (the cheek height `CH`), so the cutter misses the part: hinge volume is 7666.72 mm3 with and without it (computed 2026-10-05 on a scratch copy). The README's "the HINGE and base GUDGEON have matching anchors" holds for the GUDGEON only; a band that needs a lower anchor on the hinge has nowhere to hook.
- SPAR: a cradle plus a flat beam (convex hull from the fork at x -3, width `2 CY = 36.4`, to the pad at x -L, width 24), a pad disc at `T(-L, 0, 3)` with the interface; lightening holes `n = max(2, (L - 30) // 26)` along the beam, each `min(19, 0.72 w)` for the local web width `w = CY + (PAD_R - CY) f`; on the upper arm two D3.6 counterbalance anchors at x -0.42 L, y plus and minus 14. The spar lies in the plane its joint swings through, so gravity loads it in its stiff direction.
- TOOL PLATE: 46 x 34 x 4 with a pad disc and the interface on the underside, six D2.2 holes at x plus and minus 16, y -11, 0, 11.

### 5.5 Static holding torque and the counterbalance band (`AB` 139 to 163, `DV` 209 to 238)

For joint j: every instance owned by a later joint, plus this joint's own rotor, contributes `r x (0, 0, -m)` in g mm about the joint axis; `kgcm = |tau . axis| / 10000`. Masses: printed parts by volume x 1.27 g/cm3 (PETG), servo 9.0 g at a fixed COM (5.5, 0, 13.0) in the module frame, horn 0.60 g, M2 screws 0.35 to 0.5 g, M3 1.1 g, horn screw 0.45 g.

| joint | carries g | home | reach out | reach up |
|---|---|---|---|---|
| J1 base yaw | 254.8 | 0.00 | 0.00 | 0.00 |
| J2 shoulder | 199.3 | 0.33 | 2.46 | 0.07 |
| J3 elbow | 136.0 | 0.65 | 0.95 | 0.01 |
| J4 wrist pitch | 74.8 | 0.11 | 0.11 | 0.02 |
| J5 wrist roll | 19.2 | 0.00 | 0.00 | 0.00 |

(computed 2026-10-05, `F/records/arm_build_run_2026-10-05.txt`; the README's 0.37 / 2.39 / 0.60 column is the R1 golden.)

Budget rule (stated): a hobby servo holds about a third of stall continuously. SG90 stall about 1.8, MG90S about 2.2 kg cm (vendor class). The viewer colours under 0.6 green, over 0.6 amber, over 1.8 red. The shoulder at full extension is over both stalls. Remedies in order: a counterbalance band of about 500 gf on the spar anchors 47.6 mm out from the shoulder axis (0.58 L1, the anchors sit at x -0.42 L1 from the fork; F = M / r: the README's 234 N mm, which is the R1 golden 2.39 kg cm, gives 234 / 47.6 = 4.92 N = 501 gf; the regenerated 2.46 kg cm = 241.2 N mm gives 5.07 N = 517 gf, computed; CANONS `counterbalance-band`), keep the workspace off the horizontal, or a twin module shoulder (not built). Payload: about 60 g tucked in at home on one shoulder servo, 80 to 100 g with the band (stated).

### 5.6 Self collision and fold sweep (`AB` 173 to 237)

Every pair of instances in different groups (J1 to J5, `base`, `tool`; adjacent joints are included, only same-group pairs are skipped, `AB` 191 to 198) at seven poses (home, stow, reach out, reach up, reach down, twist, elbow in): AABB prefilter with -0.05 slack, then a manifold intersection, 1.0 mm3 threshold. Same-joint pairs are skipped (verified in the module), and self tappers are skipped because "they are modelled at nominal diameter into an undersized pilot, so their thread engagement reads as overlap by design" (`AB` 194 to 196). Fold sweep: J2 at -40, J5 at 60, q3 from -90 to 90 step 30 by q4 from -90 to 90 step 45, 35 poses, worst pair per pose. Rerun 2026-10-05: all seven poses clear, 0 fold clashes (computed).

First real bug this caught (R1): the next module's D44 head poked 54.6 mm3 through the hinge cheek into the previous rotor face at every pose; lowering the pad centre cleared it (README; the code now has `ZI = 4.40`).

### 5.7 Explode along each part's joint axis (`F/src/explode_check.py`, `DV` 186 to 206, 400 to 406)

Each part travels a fixed number of mm along its own joint axis in world space, ordered by its place in the stack (belly -175, M3 -150, M2 x 8 -130, brackets -95, servo -60, stator 0, retainer 14, horn 40, horn screw 52 in the viewer, rotor 75, tool plate 120, M2 x 12 160), plus a per-joint fan of 200 mm along world x so the five clusters separate. Travel in world space means a part modelled upside down (the cradle screw) still flies out the way it was fitted. Check rerun 2026-10-05: 0 overlapping pairs at 1.0; 2 at 0.5 (J1 rotor in J2 belly 109.1 mm3, J3 servo in J4 spar 1193.3 mm3), which is a part passing another on its way out (computed).

### 5.8 Print planning: orientation, time, plates (`F/src/orient.py`, `F/src/estimate.py`, `PL`)

Orientation scoring: six axis-aligned candidates per part; height; bed area = faces with normal z under -0.98 within 0.25 of z 0; steep overhang projected area = faces with normal z under -0.707 above the bed; support volume = overhang projected area x mean overhang height x 0.12. The finding (rerun 2026-10-05): SPAR upper "as is" 23.69 cm2 overhang and 4.41 cm3 support, flipped 1.20 cm2 and 0.03 cm3. "As is" here means the `arm_build.py` export, which rotates every spar 180 degrees about x (`AB` 243 to 244) and so put the fork down on supports; the authored frame has the plate at z -4 to 0 and the fork up. `PL` flips the spars 180 again, which is the authored frame. The hinge is treated the same way: the export turns it -90 about x and `PL` adds Y 90 on top. Orientations therefore compound, and a port must store one print transform per part, not two.

Time model: faces split into walls (|nz| at most 0.70), tops and bottoms; shell = walls x 3 perimeters x 0.45 + tops x 4 layers + bottoms x 3 layers x layer height, capped at the part volume; extruded = shell + infill x (volume - shell); time = extruded / flow (9 mm3/s at 0.20 fine, 14 at 0.28 draft) plus 0.45 s (0.35 draft) per object still printing at each layer. PETG 1.27 g/cm3, 2.405 mm2 filament section.

Plates (`PL`): Elegoo Centauri Carbon 256 x 256, 6 mm margin, 3.5 gap; outlines are convex hulls of the print-oriented meshes buffered 0.6; parts sorted by estimated time and dealt longest first into the least loaded plate; bottom-left fill on a 1 mm occupancy grid trying 0 and 90 degrees; every placement verified inside the bed and against every other hull (overlap area over 0.01 mm2 fails). Rerun 2026-10-05: 155 and 156 minutes; 12 and 14 parts; 26 and 30 percent coverage; 0 placement problems; 101 g and 102 g; 5.2 h and 66.3 m for both (computed). Both plates run 0.20 because module parts carry the 0.35 detent bump, which a 0.28 layer is thicker than (README).

Orientation table (`PL` 28 to 36): stator as is, rotor flipped (rail down), retainer flipped (lug tops down), belly as is, gudgeon as is, hinge on its side (Y 90; brim, only 3.6 cm2 on the bed), spars flipped, tool plate flipped.

### 5.9 Viewer mesh payload and instance table (`AB` 252 to 300, `DV` 146 to 185)

`q16` quantises each library mesh to signed int16 against its own `lo` and `hi` (scale 32767, not 65535), faces as little-endian u16 (the builder asserts under 65536 vertices), and stores `vol` in cm3 and `com`. The payload holds one copy of each mesh (stator, rotor, retainer, belly, servo, horn, five brackets, four screws); the viewer builds its own instance table per joint: stator, retainer, belly and servo fixed to the joint frame; bracket fixed; rotor, horn, the M2 x 12 lock screw and the horn screw spinning with `Rz(q)`; the M2 x 8 cradle stop screw at `cradle_screw` on z -4 flipped by `FLIPX`; four M3 x 12 under the base; the tool plate owned by J5 at `T(0, 0, H)`. Mass is `hw_mass` for hardware (M2 x 8 0.35, M2 x 12 0.5, M3 x 12 1.1, horn 0.60, horn screw 0.45 g), 9.0 g for a servo at the fixed COM (5.5, 0, 13.0), otherwise `vol x 1.27`. Owner index is joint + 1, the tool plate `NJ + 1`, which is what the torque loop compares against.

### 5.10 Stop screw and detent bump on the cradle rib (`AP` 101 to 115)

The rib is a box from `y_in` inward by `gv_deep - 0.20` = 2.0 between z `gv_z0 + 0.20` = 5.7 and `gv_z1 - 0.20` = 11.3, so it runs in PINTLE's 2.2 deep groove (z 5.5 to 11.5) with 0.2 clearance top, bottom and floor. The bump is a D2.8 cylinder 2.15 long (`gv_deep - 0.05`) rooted on the cheek face at y plus or minus `y_in`, pointing inward, at x `gv_detent_x` = 16.5 and mid rib height z 8.5; it stands 0.15 proud of the 2.0 rib face and drops into the module's dimple when the module is fully home. The floor screw is an M2 x 8 driven up through a D2.2 clearance with a D4.3 x 2.2 counterbore at `cradle_screw` (17.0, 12.0), into a D1.70 pilot from z -1 to 5 in the stator (`F/src/pintle_parts.py` 42, 397). The window in the floor (x 1 to 14, y plus and minus 10) leaves the module's land screws reachable.

### 5.11 GUDGEON gussets and foot (`AP` 125 to 140)

Each side gusset is the convex hull of six points: the cheek outer face (y plus or minus 18.0) from x -3 to 20 at z -4 and at `0.55 CH` = 9.1, and the foot top at y plus or minus `0.72 BASE_Y` = 18.7. Since 18.0 and 18.7 are close, each gusset is a thin wedge that fills the corner between cheek and foot rather than a long buttress. The foot is 52 x 52 x 4 under the floor (z -8 to -4). The bench holes are D3.4 7 in from each corner for M3 x 12; the band anchors are D3.6 at (26, plus and minus 22).

### 5.12 Explode fan and camera (`DV` 383 to 393, 396 to 410, 438 to 478)

The explode offset is applied in world space: `w = T(Fj_z dz + fx, Fj_z dz, Fj_z dz) w`, with `dz = EXPL[key] x ex` along the joint's world z axis and `fx = (joint - 2) x 200 x ex`, so the fan is centred on J3 and spreads J1 and J5 400 mm apart at full travel. VIEW presets set (theta, phi, r): ISO (-0.85, 1.02, 520), FRONT (-pi/2, pi/2, 470), SIDE (0, pi/2, 470), TOP (-pi/2, 0.02, 500), all on target (20, 0, 110). Orbit 0.008 rad per pixel, phi clamped 0.02 to pi - 0.02; wheel zoom 10 percent per notch, r 120 to 2200; shift or right drag pans, two-finger touch pans.

---

## 6. Fits and print settings

| item | value | source |
|---|---|---|
| cheek to flank land | 0.20 sliding | `AP` 35 |
| dovetail groove | 0.20 on every flank | `AP` 59 |
| male pilot (R4 interface, unused by the rail) | D11.90 into D12.00 | `AP` 41 |
| cheek thickness | 4.0; interface cheek 7.0 | `AP` 29 to 30 |
| floor | 4.0 | `AP` 31 |
| counterbore depth | 2.2 for an M2 socket head | `AP` 43 |
| band anchors | D3.6 | `AP` 45 |
| base foot | 52 x 52 x 4, 4 x M3 | `AP` 120 to 122 |
| material | PETG 1.27 g/cm3 | `AB` 12 |
| print | 0.20 layers both plates, 3 perimeters, 4 top, 3 bottom, 25 percent, tree supports assumed; slow the rotor's thrust face top layers; brim on the hinge | `F/src/estimate.py`, README |
| volumes, 20:43 source | gudgeon 16.25, hinge 7.67, spar upper 13.71, spar fore 12.11, tool plate 6.66; module 27.50 (stator 17.02, rotor 8.47, retainer 1.10, belly 0.91); arm 201.6 cm3 | computed |

---

## 7. UX anatomy (`derrick-viewer.html`)

Same dark anodized instrument as PINTLE (tokens `--ink #0A0C0D --panel #12171A --rule #232B2F --live #2DD4BF --load #F0A93B --stop #E4572E`), full bleed stage, corner bracket HUD.

- Rail, top left, 280 px: title block; POSE buttons from the payload's seven poses; JOINTS sliders -90 to 90 per joint; EXPLODE 0 to 1; VIEW (ISO, FRONT, SIDE, TOP, TURNTABLE); SHOW groups (MODULES, SERVOS, BRACKETS, HARDWARE, TOOL), WIREFRAME, GRID, AXES.
- Pane, top right: TOOL (x / y / z, reach from the base axis, printed mass); STATIC HOLDING TORQUE per joint coloured green, amber, red; a note naming the shoulder fix.
- Keys: 1 to 5 pick a joint, left and right jog 3 degrees clamped to plus and minus 90, H home, R reset view. Under 820 px the rail goes full width and the pane hides.
- Kinematics in plain row-major 4x4 arrays, so the page computes poses and torques without three.js and the hook works when the CDN fails; an error card says three.js did not load.
- Plate 3D page: PLATE 1 and 2 tabs, ISO, TOP, FRONT, CORNER, TURNTABLE, a NOZZLE HEIGHT slider (and UP, DOWN keys) that clips every part at the current print height and counts the layers and the parts still printing there, FINE 0.20, WIREFRAME, BED, a parts table, and a pane with layer, solid volume, filament, time and coverage.
- What makes it excellent: every fastener is a real part that flies out on its own axis; the torque table turns red exactly when the arm reaches out, so the counterbalance decision is made on screen; the plate view lets you scrub up through the print.

---

## 8. Tests and harness

| test | what | result |
|---|---|---|
| `arm_build.py` | single body and watertight for nine parts; FK at seven poses; torque at three; self collision at seven poses; 35 pose fold sweep | rerun 2026-10-05: all pass, `clashes 0` (computed) |
| `explode_check.py` | the viewer's own explode offsets through pairwise booleans at 0.5 and 1.0 | rerun: 2 pairs at 0.5, 0 at 1.0 (computed) |
| `orient.py`, `estimate.py`, `plate.py` | orientation table, time estimate, packed and verified plates | rerun: as section 5.8 |
| `smoke_arm.js` | jsdom with a hand-written THREE stub that throws on non-finite matrices; FK and torque against `arm_ref.json` at 0.0005 mm and 0.00005 kg cm; every button twice, every slider -90 to 90 step 15, keys, drags, wheel, resize, turntable; fails on NaN | not rerun; against the shipped files it would compare the viewer to the stale golden (section 1.2) |
| `smoke_plate.js` | the same harness for the plate page, "26 instances placed" | not rerun |
| drive 2026-10-05 | eight shots | no page errors |

---

## 9. Port map

| item | value |
|---|---|
| packages | `motion` (mate chain FK, poses, jog), `sim` (pairwise booleans over poses and a fold sweep, explode overlap), `checks` (capture assertions, handedness), `nest` or a print concern (orientation scoring, time model, time-balanced plate packing, nozzle height view), `mechanisms` (counterbalance band) |
| feature kinds | `tabslot` (rib in groove, dovetail), `detent` (rib bump), `screw` (stop and lock screws with counterbores), `pocket`, `window` (spar lightening sized to the web); MISSING: a typed mechanical interface (pattern, handedness, symmetry order) that would have caught the R5.2 phase bug, and a `mount` kind (PLAN line 608 names it with STANCHION, PINTLE and SPOOL as sources) |
| canon id | `counterbalance-band` (CANONS section 2.2, candidate, milestone unassigned). MISSING: the two-mate composition of one joint module into an arm (hinge and spar), the cradle grip |
| reference id | MISSING (candidates in the bench reader: `machines/derrick-arm`, `joints/cradle-mate`) |
| milestone | M07 (`packages/motion/src/kinematics/derrick.ts`, `designs/derrick/legacy/{arm_ref.json, smoke_arm.js, arm_build.py}`, test at 0.0005 mm; the golden must be regenerated first, section 1.2); D-074 capture assertions (PLAN line 822) |
| lineage row | MISSING |
