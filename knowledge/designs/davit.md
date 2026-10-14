# DAVIT: how it is made

Record written 2026-10-05 from the original code. Slug `davit`. Family robots (DAVIT, JIB, DERRICK, PINTLE, PAWL, SPOOL, SPROCKET, STANCHION, TRUNNION, ARMATURE).

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula or a value printed by the canonical page in the 2026-10-05 drive. "Measured" comes from the 2026-10-04 reruns recorded in `fab-knowledge:originals/davit/files/records/`. "Stated" quotes a README. Units are mm, degrees, grams and kg cm unless marked.

Short paths: `S` is `fab-knowledge:originals/davit/files/src/`; `H` is `fab-knowledge:originals/davit/files/sim_r4.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | DAVIT R4, "Pair of pipe-mounted 9g robot arms" (`S/README_R4.md` line 3) |
| owner's slug | davit |
| canonical bundle | `fab-knowledge:originals/davit/files/davit_r4.zip` (copied from `fab-knowledge:evidence/x/downloads/dl-robots-machines/davit_r4.zip`, which is `~/Downloads/davit_r4.zip`) |
| sha256 (zip) | ad30781885c77bade39554e4ad427746984be38e8eb3bcaef27931cd882c8749 |
| zip date | 2026-08-02 11:15 (file mtime); entries 2026-08-02 04:13 |
| canonical page | `H`, the `sim_r4.html` inside the zip, sha256 1511d9082a6b72dd32c91ac4c2c602743c84f908bd39e3db6debaa3aab885da8, 1268878 bytes, 767 lines (line 151 is the 1234714 character `DATA` blob) |
| generator | `S/parts_r4.py` (sha256 ddae2111221f...), imports `S/lib.py` and the R3 `build_mount` and `_foot` from `S/parts.py` |
| runtime | three.js 0.160.0 ES module from cdnjs (`H` line 150), so the page needs the network once; geometry inline |
| hook | `window.__davit = {pose, chain, C, collide, attempt, contacts(), torquesProbe()}` (`H` lines 759 to 764) |

### 1.1 Every revision found

From `fab-knowledge:sources/downloads/dl-robots-machines.md` (DAVIT timeline) and the harvest `fab-work-directory:benches/davit/outputs/`.

| file | date | sha256 (12) | what |
|---|---|---|---|
| `davit.html` | 2026-08-01 05:18 | 5a84bdaf2a52 | first sim, no collision pairs |
| `davit (1).html` | 2026-08-01 13:28 | 7fb3e40362ab | std model only, `pairs` and `hubPairs` |
| `davit (2).html`, harvested `davit.html` | 2026-08-01 15:07 | 3794a0731a0c, ba332702646f | R3: std plus MINI, `pairsMini`; harvested `parts.py`, `lib.py`, `assembly.py`, `README.md` |
| `davit_revised_sim.html` | 2026-08-01 16:42 | 9393ada1195a | R2 revised printable geometry, collision on pre-revision proxies |
| `davit_R3_lightweight_sim.html` | 2026-08-01 18:16 | b11856200133 | R3 lightweight truss |
| `sim_r4.html` (loose) | 2026-08-02 03:51 | 1f05c5004732 | first R4 sim, "extended crank flange with true truss laps" note |
| `davit_r4.zip` | 2026-08-02 04:13 entries | ad30781885c7 | R4 bundle: generator, verifier, gate, packer, STLs, sim with the gusset panel crank. Canonical |
| `sim_r5.html`, `davit_r5_full_sim_fixed.html` | 2026-08-02 12:14, 12:29 | ca1bce8fe7a4, 87d519770b5c | R5 laser box beams plus printed nodes; meshes only |
| `sim_r6.html` | 2026-08-02 12:59 | a8ed91ce5704 | R6 four rigid serial axes |
| `sim_r7.html` | 2026-08-02 14:57 | 6660fbc9b4a3 | R7 5 axes, two standard shoulder servos |

### 1.2 Why this revision

R4 is the newest revision that ships its source and its proof. R5, R6 and R7 are later but are sims only: no generator, no STLs, and no collision engine (zero hits for `collide`, `pairs`, `prox`, `mask` outside the blobs, per the downloads reader), so nothing in them can be rebuilt or checked. R4 fixes ten R3 defects found by mesh inspection, four of them fatal (detached gear teeth, a 0.8 mm crank lap, an unseatable grip servo, undrivable horn screws), and it carries the only interference gate in the DAVIT line: `S/sweep.py` reran on 2026-10-04 with 43 pair sweeps and one intersection over 0.5 mm3, the designed 3.21 mm3 pincap press fit (measured, `fab-knowledge:originals/davit/files/records/davit_r4_sweep_run_2026-10-04.txt`), and `S/verify_sim.py` printed `legal-pose fails: 0`, `unmasked zero-pose contacts (expect >5): 25`, `VERIFY PASS` (measured, `fab-knowledge:originals/davit/files/records/davit_r4_verify_sim_run_2026-10-04.txt`). The zip copy of `sim_r4.html` is 22 minutes newer than the loose one and differs only in the BUILD note, which describes the gusset panel crank the zip's STLs carry. R4 is MINI only: the standard servo variant is retired (`S/README_R4.md` lines 3 to 6). The R3 standard build lives in `S/parts.py` and `fab-knowledge:originals/davit/files/README-R3.md` for reference.

### 1.3 What is in `fab-knowledge:originals/davit/files/`

| path | what |
|---|---|
| `davit_r4.zip` | the whole R4 bundle as found (24 entries) |
| `sim_r4.html` | the canonical page, from the zip |
| `src/parts_r4.py` | R4 generator (355 lines) |
| `src/lib.py` | CAD kernel and servo dicts (200 lines) |
| `src/parts.py` | R3 generator (423 lines); R4 imports `build_mount` and `_foot` from it |
| `src/assembly.py` | kinematic chain (55 lines) |
| `src/sweep.py` | the 43 pair interference gate (129 lines) |
| `src/pack_sim.py` | proxy generator and mask calibrator (179 lines) |
| `src/verify_sim.py` | runtime collision verifier (91 lines) |
| `src/render.py` | numpy z-buffer PNG renderer (62 lines) |
| `src/README_R4.md` | R4 defects, fits, print and assembly notes |
| `README-R3.md` | the R3 build guide from the harvest (assembly order, wires, screws) |
| `r3/davit.html` | NOT CANONICAL. The R3 page as harvested (`fab-work-directory:benches/davit/outputs/davit.html`, sha256 ba332702646f2a9b072b1c8ab6da46b3d3e4f268179af1f37fcfd7a61280260a, 1032684 bytes, 755 lines, copied 2026-10-08). Kept because the M02-T06 std scenes read its `DATA.const` and std parts; `chain()`, `collide()` and `attempt()` read the same in `H`, which is the canonical page (lineage rows davit.collide/r4-page and davit.attempt/r4-page; the r3-page rows are copies) |
| `exports/davit_mini_crank.stl`, `davit_palm.stl`, `davit_mount_125in.stl` | three representative R4 prints |
| `exports/r3_vs_r4.png` | the bundle's own R3 against R4 render sheet |
| `records/` | the 2026-10-04 sweep and verify runs |

Hashes: `fab-knowledge:originals/davit/SHA256SUMS`.

---

## 2. What it makes and for whom

A pair of 5 DOF arms plus a gear gripper per side that clamp to 1, 1-1/4 or 1-1/2 in schedule 40 PVC: shoulder pitch, shoulder roll, elbow, wrist roll, grip. Five 9 g micro servos per arm (SG90 or MG90S class, metal gear recommended), reach 255 mm at the hang pose (computed by the page header). Printed parts only; every fastener comes out of the servo bags except the #8 PVC screws. The left arm is the right arm's prints rotated 180 degrees about the pipe. For a maker building a Johnny Five style desk robot on a pole, who wants the arms to print without supports, assemble in one order, and never collide with themselves.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), waiting for `window.__davit`. Files in `fab-knowledge:originals/davit/shots/`. No page errors.

| file | caption |
|---|---|
| `d01-boot-hang.png` | Boot at HANG on 1-1/4 in pipe: both arms hanging from the one-piece collar mount, links coloured by part (crank teal, upper blue, fore green, palm tan, jaws amber, servos dark). Right panel MODEL, PIPE, POSE with RIGHT and LEFT ARM sliders and LINK L=R, LOAD, SERVO TORQUE bars at 4 percent. Header "reach 255 mm all 9g micro". |
| `d02-preset-reach.png` | REACH preset (pitch 55, roll 25, elbow -70, wrist 40, grip 30), collision status "clear". |
| `d03-preset-lift-payload-200.png` | LIFT preset with payload 200 g: pitch S1 4.77 / 2.2 kg cm at 140 percent and elbow 2.91 / 2.2 at 132 percent, both bars red; roll and wrist 6 percent (computed by the page). |
| `d04-tuck-pitch120-elbow-110.png` | TUCK preset driven through the hook to pitch 120 and elbow -110: the arms fold over the mount and the slider clamp leaves the pose clear. |
| `d05-explode-edges.png` | EXPLODE 45 at the folded pose with EDGES on: collision paused, parts pulled apart along their seat directions. |
| `d06-reach-cloud-1in.png` | 1 in pipe with REACH CLOUD on: the 21 x 19 x 6 sample tip cloud drawn as translucent teal points around the pole. |

---

## 4. Code map

| area | file and lines |
|---|---|
| house rules docstring | `S/lib.py` 1 to 5 |
| primitives `box`, `cyl`, `ngon`, `wedge45`, `gable_cut`, `tear`, `shield` | `S/lib.py` 16 to 81 |
| `union`, `diff` (one difference against the union of cutters) | `S/lib.py` 83 to 97 |
| servo dicts `STD`, `MIC`, clearances `CH`, `CV` | `S/lib.py` 103 to 137 |
| servo and horn stand-ins | `S/lib.py` 140 to 172 |
| horn recess and capture stack | `S/lib.py` 174 to 197 |
| R4 constants, `frustum`, `stadium`, `diamond` | `S/parts_r4.py` 35 to 65 |
| one-sided keyed horn recess `horn_recess_arm1` | `S/parts_r4.py` 67 to 78 |
| insertable micro pocket `micro_axial_cuts` | `S/parts_r4.py` 80 to 89 |
| cup and floor with driver channel | `S/parts_r4.py` 91 to 101 |
| journal boss with self-sized voids | `S/parts_r4.py` 103 to 119 |
| crank, upper, fore, palm, jaws, cap, base | `S/parts_r4.py` 122 to 326 |
| single body and watertight gate, export | `S/parts_r4.py` 328 to 355 |
| pipe mount (collar with two dovetail pads) | `S/parts.py` 65 to 85 |
| C channel base foot | `S/parts.py` 87 to 98 |
| kinematic chain `chain()` and `CFG` | `S/assembly.py` 12 to 47 |
| interference gate | `S/sweep.py` 1 to 129 |
| proxy points, cluster spheres, mask calibration | `S/pack_sim.py` 47 to 143 |
| runtime verifier | `S/verify_sim.py` 27 to 91 |
| page: styles and panel markup | `H` 7 to 148 |
| page: mesh decode | `H` 154 to 167 |
| page: scene, lights, materials | `H` 170 to 190 |
| page: `chain()` with explode terms | `H` 210 to 235 |
| page: joint list for torque | `H` 238 to 250 |
| page: scene graph, edges, pose | `H` 253 to 335 |
| page: torque and pinch, mass table, reach | `H` 338 to 405 |
| page: reach cloud | `H` 408 to 422 |
| page: damped orbit, pick, isolate, hover | `H` 425 to 478 |
| page: proxies, masks, `collide()` | `H` 482 to 600 |
| page: contact paint, `attempt()` slider clamp | `H` 601 to 654 |
| page: sag when stalled | `H` 656 to 680 |
| page: sliders, presets, pipe and volt wiring | `H` 683 to 745 |
| page: loop and hook | `H` 748 to 764 |

---

## 5. Mechanisms and constructions

There is no circuit; the servos are driven by an outside controller.

### 5.1 Single-difference boolean kernel (`S/lib.py` 83 to 97)

What it does: every part is the union of its solids minus the union of its cutters, in one manifold difference.

Construction: `union(ms)` folds pairwise unions with engine `manifold`; `diff(a, cuts)` unions all non-null cutters first, then one `trimesh.boolean.difference([a, cutter], engine='manifold')`, then `process(validate=True)`.

Failure lesson (docstring line 90 to 91): "Sequential subtraction corrupted meshes when cutters shared an axis." The fix is the single difference. `finalize()` (`S/parts_r4.py` 328 to 333) then asserts exactly one body over 1.0 mm3 and watertight, which is how R4 caught the detached teeth and the 22 mm3 splinter.

### 5.2 Printable round geometry: teardrop and shield (`S/lib.py` 49 to 81)

What it does: horizontal bores and horizontal journals that print without support and stay round where they bear.

`tear(d, h, axis, up)`: circle of radius r = d/2 sampled over plus and minus 0.75 pi (40 points), plus a 45 degree roof toward `up`: tangent points at (plus or minus r/sqrt2, r/sqrt2), apex at r sqrt2. Used for the elbow socket D7.9 (`S/parts_r4.py` 192) and the PVC screw holes D4.6 with D9.2 counterbores (`S/parts.py` 81 to 83).

`shield(d, h, axis)`: true semicircle on top (64 arc segments, equator to equator) closed by a single vertex at (0, -r): a 45 degree V below. Maximum radius d/2 everywhere, so the journal has round contact at every rotation angle and prints vertex down. Used for the crank flange (shield D36.0 x 10.8, line 123) and the elbow idler stub (shield D7.0 x 4.6, line 210).

Fits (`S/README_R4.md` lines 79 to 83): flange D36.0 in base bore D36.7; elbow stub D7.0 in teardrop socket D7.9; boss D45.6 in cup D46.3. Horizontal bores run 0.35 per side, verticals 0.35; `CH = 0.35`, `CV = 0.20` (`S/lib.py` 133 to 134).

### 5.3 Horn capture joint (`S/lib.py` 174 to 197, `S/parts_r4.py` 67 to 78)

What it does: the servo horn drops into a keyed recess in the printed face and the stock horn screw clamps the part between screw head and horn hub, so the horn is the drive and the screw is the retention.

Construction, top down from the mating face at `face_z`:

1. keyed plate pocket depth `t + CV` (horn thickness plus 0.20). R4 uses a one-sided pocket (`horn_recess_arm1`): a box of length `L = arm + 3.0 + 2 CH` = 19.2 centred at `L/2 - 3.0 - CH`, so for the micro horn it spans x -3.35 to +15.85 (computed; the docstring says "tail -3.5 .. +arm"), width `w + 2 CH` = 7.1. Each single-arm horn drops in one way and clocks itself.
2. hub relief `D hub + 2 CH`, depth `hub_relief - 0.2`, so the hub bottoms out 0.2 proud and the screw clamps.
3. screw clearance bore `screw_clear`, 80 long.
4. head counterbore `head_d + 0.8`, depth `head_h - 1.0`, from below, leaving a seat rim of at least 1.2.

Wall consumed: `capture_total = round(t + CV + (hub_relief - 0.2) + 1.2 + (head_h - 1.0), 1)`. For the micro horn (t 1.8, relief 2.2, head 2.6): 2.0 + 2.0 + 1.2 + 1.6 = 6.8 (computed; `CAP_M` comment line 39 agrees). The jaws are exactly `CAP_M` thick.

Limits: a double-ended bar model of the single-arm horn produced phantom collisions, so the stand-in runs -3 to +arm only (`S/lib.py` 168 to 170). R3 roll and wrist horn screws were undrivable (head counterbore behind a D2.8 waist); R4 cuts a D6.4 axial driver channel from each cup floor into the still-empty pocket below (`cup_and_floor`, lines 91 to 101), which fixes the assembly order: shoulder, roll, elbow, wrist, grip.

### 5.4 Insertable micro servo pocket (`S/parts_r4.py` 80 to 89)

What it does: a servo pocket that is open toward the insertion direction by construction.

Construction: pocket box 23.5 x 13.1 (`mic_pocket_LW`, 22.8 + 0.7 by 12.4 + 0.7) from the case top plus `CV` down to `z_face + open_dz` with `open_dz = -4.0`; tab seat box `tab_span + 2 CH` wide swept from the seat to the same open bottom; two pilots D1.7 x 6 at plus and minus `hole_dx/2` = 14.0 drilled up. The servo slides in from below and the two tab screws run upward.

Lesson: R3 palm tab channel stopped at 4.6 while the tabs top out 7.0 below the shaft face: 247 mm3 interference, "invisible in the sim because R3's auto calibrated masks whitelisted it" (`S/README_R4.md` lines 42 to 46). R4 clears the channel to 7.2 (`S/parts_r4.py` 257).

### 5.5 Axial journal: cup on boss (`S/parts_r4.py` 41 to 43, 91 to 119)

What it does: the shoulder roll and wrist roll joints. A printed cup on the distal link turns on a printed boss on the proximal link, with the micro servo inside the boss and its horn keyed in the cup floor.

Constants: `BOSS_M = 45.6`, `CUP_ID = BOSS_M + 0.7 = 46.3`, `CUP_OD = CUP_ID + 6.5 = 52.8`, cup cavity 13.4 deep; four floor lightening stadium slots 16.0 x 3.4 at r 19.6 on 45, 135, 225, 315 degrees.

Boss voids: `boss_with_voids(cx, cz_top, void_y, w=6.0, back_x, back_w=4.6)` cuts two stadium through-voids at plus and minus `void_y` whose half length self-sizes to keep a 2.0 wall to the OD: `c = sqrt((R - 2.0 - w/2)^2 - void_y^2)`, R = 22.8; an optional back slot sized the same way. Minimum wall 2.65 (stated, `S/README_R4.md` line 32).

Floor rule (written so nobody shrinks it): the roll and wrist servo tab corners swing at r 22.47 (5.4 shaft offset plus 16.2 half tab span, 6.2 half width), so the cup ID cannot go below 45.6. "A smaller joint fails on hardware, not on plastic" (`S/parts_r4.py` 17 to 19).

### 5.6 Crank gusset panel (`S/parts_r4.py` 122 to 160)

What it does: the shoulder pitch link from the shield flange on the base to the roll boss, carrying the whole arm moment.

Construction in order: shield flange D36.0 x 10.8 along x at x 5.4; boss with voids at x 26.0 top z -26.0 (`void_y 11.75`, back slot at x 10.5); beam 36 x 12 x 7.8 at (24.9, 0, -24.9) buried 2.8 into the drum; one gusset panel, a shapely box (7.0, -24.9) to (41.5, -4.4) extruded 6.8 and rotated into the xz plane; two triangular windows from the inner box (12.0, -19.9) to (36.5, -9.4) minus a diagonal strip buffered 2.75 (a 5.5 brace); end wedges at both ends flaring the beam onto the drum shoulders. Cuts: one-sided horn recess rotated 180 degrees and turned onto x (arm keyed downward), D6.0 x 4.8 driver bore through the flange band at x 8.9, D6.5 bore at x 41.9, the micro pocket at z -52, a 10 x 6 x 8 pocket-to-void wire notch, the voids, and 16 x 12 x 12 side windows into the voids (the -y one is the roll servo wire route).

History: attempt 1 (R2) let a 9.5 mm driver channel sever the 8.8 mm plate; attempt 2 (R3) was four sticks hung on a 0.8 mm lap, 54 mm2 in two slivers; R4 is 299 mm2 continuous behind the disc, about 500 mm2 through the panel (stated, `S/README_R4.md` lines 23 to 29).

### 5.7 Upper and fore links (`S/parts_r4.py` 163 to 242)

Upper: cup and floor with the driver channel down to z -45; a 45.0 degree frustum from r 26.4 at z -20.0 to r 13.2 at z -33.2 (R3 was 35 degrees, under the rule); an octagon tube D26.4 x 12.4; the elbow block (boxes plus four D10 corner cylinders); an octagon pad D14.4 at x -22 carrying the elbow socket. Cuts: an inner 45 degree cone shell void, four diamond windows (`diamond`, a square rotated 45 degrees in yz so every window edge is 45), the tube hollow D15 and two crossed 34 x 8.5 slots that leave four ribs, the elbow micro pocket with a `wedge45` gable roof, pilots, the teardrop socket D7.9, wire notch, groove and window, and side, back and front windows in the block.

Fore: full side plates (octagon head D32 x 6.8 plus a 4.8 skirt, and an inner plate 4.8) lapping a 49.2 x 18 x 5 bridge through their whole thickness (R3 hung them on octagon-vertex slivers: 42.5 mm2 at z -15; R4 224 mm2, stated); shield stub D7.0; octagon tube; frustum to the wrist boss; two yoke struts rotated -0.30 and 0.10 rad from the boss top to under each bridge wing so the wings print supported (R3 left 353 mm2 of unsupported underside, line 216). Cuts: one-sided horn recess at x 13.2, diamond windows in each plate, the wrist pocket at z -70, wire windows and groove, tube hollow and crossed slots, a 45 degree roof vent, a pocket vent, voids and side windows.

### 5.8 Palm and gear-sector gripper (`S/parts_r4.py` 245 to 296)

Palm: cup and floor with the driver channel to z -30; 45.0 degree frustum; open cradle 18.7 x 26.0 x 27; a wing plate 13.4 x 2.8 x 18 carrying the idle jaw pad and pin at their R3 coordinates (x -16, z -44). Cuts: cone shell void, grip micro pocket along y with tab channel clearing to y 7.0, pilots, D2.2 pin cap bore, D13.5 turret pass-through, and 24 x 12 x 13 cheek windows. R3 had a sealed 2.24 cm3 box here that vented nowhere.

Jaws: a D13.2 boss, two link segments (the second slotted 3.2 wide), a tip, three grip ribs, and five sector teeth: each tooth a box 3.8 x 1.7 at x 7.1, rotated about z by `center + (i - 2) 2 pi / 12`, so 5 of a 12 tooth sector at pitch radius 8.0 (`sector_teeth`, lines 266 to 273). Teeth root 1.4 into the boss; in R3 they met the D13.2 boss along a tangent line and four were separate bodies. The drive jaw sector centres on pi, the idle jaw on pi/12; jaw centre to centre `JAW_CC = 16.0`; both jaws `CAP_M` = 6.8 thick. The drive jaw takes the one-sided horn recess (restoring its 180 degree tooth root); the idle jaw takes a D5.5 bore on an octagon pin D4.8 across vertices; pin cap D2.35 stem pressed into D2.2 (`build_cap`, line 295 to 296). Backlash 0.59 at the pitch radius (stated, R3 README).

Pinch (page, `H` 382 to 383): `pinchN = stall60 x 0.0980665 x 1000 / 46`; at MIC stall 2.2 kg cm that is 4.69 N, shown as 478 g at the tips (computed by the page).

### 5.9 Pipe mount and C channel base (`S/parts.py` 65 to 98, `S/parts_r4.py` 299 to 326)

Mount `build_mount(od)`: pipe radius `pr = od/2 + CH`; a full ring collar D 2(pr + 4.2) x 46 (96 segments); per side a 12 x 29 pad, two 4.0 x 2.6 lips at y plus and minus 15.8, two 20 x 6 x 5 stop shelves at z -24.5. Cuts: a D3.4 pilot 10 deep in each pad top; six teardrop screw holes D4.6 with D9.2 counterbores at angles minus and plus 55 (z plus and minus 14) and plus and minus 90 (z 0); the pipe bore D 2 pr. Mount by drilling 3.2 through four of the six guides into the PVC and driving #8 x 3/4 pan heads (R3 README).

Base foot `_foot()`: a C channel that slides down over the pad lips and lands on the shelf, locked by one vertical #8 x 1/2 through a D4.6 hole in the top tab into the pad pilot. The lips carry shear and moment; the one screw only stops lift out. An arm comes off in one screw.

Mini base: foot plus a 16.65 x 20 x 46 web plus an octagon barrel D45 x 30 on x at `AX - 10.2` (`AX = 34.85`); cuts: the flange bore D36.7 x 19.6 with a `wedge45` gable roof, the S1 micro pocket with a gable roof, pilots, mirrored wire windows on both sides (R3 had one), and the splinter relief.

Shoulder offset from the pipe axis `XFM(od) = od/2 + 32.0`: 48.7, 53.1, 56.15; base offset `od/2 + 8.35`: 25.05, 29.45, 32.5 (`S/pack_sim.py` 19 to 21).

### 5.10 Kinematic chain (`S/assembly.py` 20 to 47, `H` 210 to 235)

Right arm; left arm is `RotZ(pi)` premultiplied.

```
Tc  = base T(xf + dx, 0, s1z) RX(pitch)
Tu  = Tc T(bx, 0, cdz) RZ(roll)
Tf  = Tu T(0, 0, edz) RX(elbow)
Tp  = Tf T(wdx, 0, pdz) RZ(wrist)
Tjd = Tp T(0, 14.6, -44) RY(-grip) RX(-pi/2)
Tji = Tp T(-16, 14.6, -44) RY(grip) RX(-pi/2)
Tcap= Tp T(-16, 21.4, -44) RX(-pi/2)
```

MINI constants: dx 11.2, s1z 5.4, bx 26.0, cdz -42.0, edz -62.0, wdx -2.0, pdz -60.0, rface -52.0, wface -70.0, ehx 10.0. Ten hardware placements (servo and horn per joint) are written relative to the carrier link with fixed rotations. The page adds an explode term `e` into each translation (0.55e and 1.05e on jaws and cap, 0.85e, 0.7e and 0.45e on servos and horns). Tip point `tip_local = (-8, 18, -90)` in the palm frame. Limits: pitch plus and minus 120, roll plus and minus 180, elbow plus and minus 110, wrist plus and minus 180, grip 3 to 46.

### 5.11 Two-level sphere proxy collision with calibrated masks (`S/pack_sim.py` 47 to 143, `H` 482 to 600)

What it does: interactive clash detection fast enough to clamp a slider every input event.

Proxy build (`prox_record`): 850 evenly sampled surface points per part (500 for pincap, jaws and horn); sort by a 13 mm cell key; one cluster sphere per cell `[cx, cy, cz, r, i0, i1]` with r the max point distance plus 0.01; points quantised to u16 against `lo`, `hi`.

Mask calibration (`calib_pair`): for each of 29 named pairs, sweep only the deeper link's governing joint through its legal range at 1 degree (or grip for two depth-5 bodies), at the 1-1/4 in pipe, with the other joints at zero and grip 25; mark every point within `MARGIN = 1.45` of the other body. The runtime threshold is `TOUCH = 1.2`. Hub pair `base x mount` is calibrated per pipe.

Runtime (`collide()`, `H` 552 to 600): per body, transform the cluster centres and build an AABB from centre plus radius; for each pair, skip if the two bodies are on different sides ("arms cannot meet", line 570); AABB reject with `TOUCH`; coarse sphere test `|ca - cb| <= ra + rb + TOUCH`; on a coarse hit transform the fine points once per frame stamp (cached) and test every unmasked point pair for squared distance under `TOUCH^2`. Masks are keyed by sorted body name and flip when the pair is visited in reverse order.

Slider clamp (`attempt()`, `H` 628 to 646): set the value (and the other arm's under LINK), pose, collide; on contact, 8 bisection steps between the old and requested value, keep the last clear value, paint both bodies 0xe0564a and name the pair.

Known limits: masks are calibrated on the right arm only, at one pipe for arm pairs, and are keyed by name, not mesh hash; left and right arms are never tested against each other by an explicit skip; a mask that hides a constant interference hides a real defect (the R3 grip servo). D-135 sets the port rule: masks keyed by mesh hash and pose set, calibrated on both arms, reporting constant interference.

### 5.12 Offline interference gate (`S/sweep.py`)

Tier 1: 6000 surface points per mesh over 8000 mm3 (2600 otherwise), KD-tree nearest distance per pose; each pair swept by its single governing joint with 91 steps (121 for pairs touching a static body), AABB precheck with 2 mm slack. Tier 2: an exact manifold boolean intersection at the worst pose of any pair that came within 1.0 mm. The horn hub is shaved 0.25 in the check model so the designed clamp does not alarm. 31 pairs; arm-internal pairs run at 1-1/4 in only, six static pairs at all three pipes: 31 + 6 + 6 = 43 pair sweeps. Fail threshold 0.5 mm3.

Result on 2026-10-04 (measured): pairs 43, tier2 38, one intersection over 0.5 mm3: `palm|pincap` at 1-1/4 in, 3.21 mm3 at grip 3, the designed press fit.

### 5.13 Static torque, pinch and sag (`H` 338 to 384, 656 to 680)

For each of the four driven joints, sum `r x (0, 0, -m g)` over distal printed parts (mass = part volume x 1.24 g/cm3 x infill), distal servo point masses at the case centre `(-shaft_off, 0, -H/2)` in the servo frame (13.4 g each), and the payload at the tip; dot with the joint axis; `kgcm = |N mm| / 98.0665`. Bars: warn above 60 percent of stall, over above 85 percent, display capped at 140. Stall from `SV[kind]['stall' + volt]`: MIC 1.8 at 4.8 V, 2.2 at 6.0 V (vendor class values, `S/lib.py` 131).

Sag: every third frame, for each joint whose |torque| exceeds stall, step `min(1.2, over/stall x 0.9)` degrees in the sign of the torque, clamp to limits, revert if the step collides. Display only.

Reach cloud (`H` 409 to 422): pitch -120 to 120 step 12, elbow -110 to 110 step 12, roll 0 to 180 step 36, wrist 0, grip 20; 2394 tip points (computed: 21 x 19 x 6), `THREE.Points` opacity 0.35.

### 5.14 Wire routes cut into every link (`S/parts_r4.py`)

What it does: each servo lead leaves its pocket through a cut that the generator places, so no wire crosses a joint outside the plastic.

| link | route, in order | code |
|---|---|---|
| crank | roll servo pocket, then the 10 x 6 x 8 wall notch at (26.0, -7.6, -35.0), then the stadium void, then the 16 x 12 x 12 side window at y -19.0 | lines 155 to 159 |
| upper | rim wire notch 7 x 10 x 5.6 at (0, -22.2, -2.8), tube wire groove 5 x 3.6 x 28 at y -13.3, elbow wire window 5 x 5.6 x 7 at (-13, -8.8, -68) | lines 193 to 195 |
| fore | tube wire groove 5 x 3.6 x 22 at y -12.0, boss wire window 5 x 20 x 5 at (-2.0, -16.5, -58) | lines 230 to 231 |
| base | two 10 x 20 x 6 windows at y plus and minus 12, z -12 (R3 cut only the -y one) | lines 323 to 324 |

The README calls the crank route out as a dual use: the side window that lightens the boss is also the roll servo exit (`S/README_R4.md` lines 62 to 64).

### 5.15 Gable roofs over horizontal bores and pockets (`S/lib.py` 35 to 47, `S/parts_r4.py` 186 to 188, 307 to 309, 317 to 319)

What it does: a pocket or bore whose axis lies flat gets a 45 degree triangular roof cut above it, so the ceiling prints as two 45 degree faces instead of a bridge.

Construction: `wedge45(sx, sy, sz)` is a six-vertex prism with a rectangular base and a ridge along y at height sz; it is 45 degrees when sz = sx/2. The base flange bore D36.7 x 19.6 gets `wedge45(36.7, 19.6, 18.4)` rotated 90 degrees about z and lifted to `S1ZM + 12.6`, so the roof starts just under the bore's top tangent. The elbow pocket in the upper link and the S1 pocket in the base each get a `wedge45(W, depth, 5.6)` roof at the pocket top (`ccz + L/2` in the upper, `L/2` in the base). `gable_cut` is the same wedge as a named cutter helper (rise defaults to sx/2).

### 5.16 Pin cap and jaw pivot stack (`S/parts_r4.py` 250 to 251, 260, 293, 295 to 296; `S/assembly.py` 30 to 32)

What it does: the idle jaw turns on a printed octagon pin on the palm wing and is held on by a printed cap pressed into the pin.

Construction: palm pad octagon D11.0 x 2.2 at (-16, 13.1, -44) and pin octagon D4.8 x 9.0 at y 16.5, both on the y axis; a D2.2 x 8.0 bore down the pin axis at y 17.4. The idle jaw bore is a D5.5 round (96 segments) through `CAP_M + 2`. The cap is a D8.6 x 2.2 head plus a D2.35 x 6.4 stem. In the chain the cap sits at `Tp T(-16, 21.4, -44) RX(-pi/2)`, 6.8 above the jaws at y 14.6, which is the jaw thickness `CAP_M`. The 0.15 mm diametral press is the one intersection the sweep gate reports (3.21 mm3, measured).

### 5.17 Mask calibration grid by pair depth (`S/pack_sim.py` 110 to 134)

`calib_pair` assigns each body a chain depth (hub 0, crank 1, upper 2, fore 3, palm 4, jaws and cap 5; hardware takes its carrier's depth). Pairs at different depths sweep `JOINT_AT[max depth]` over its legal range at `int(hi - lo) + 1` samples (1 degree). Pairs at the same depth other than 5 get one sample, the zero pose with grip 25, so a contact that only appears at another pose of an upstream joint is never masked; that is correct for a serial chain, since same-depth bodies are rigid to each other. Pairs at depth 5 sweep grip. Each sample is skipped when the AABBs are more than `MARGIN` apart; otherwise both KD trees are queried with `distance_upper_bound = MARGIN`.

### 5.18 Mesh transport in the page (`S/pack_sim.py` 37 to 45, `H` 154 to 167)

`part_record` writes each part as a face soup: every triangle gets its own three vertices, so `computeVertexNormals` gives flat facets without a crease angle. Vertices are quantised to u16 against the part's `lo` and `hi`; the index buffer is u16 below 65536 vertices and u32 above. Each record also carries `vol` (mm3) and `com` (centre of mass), which the page uses for the mass table and the torque sums. Proxy points use the same u16 scheme. The whole `DATA` object, including `const` and `constm` (both the same `CONSTM` dict in R4), is one JSON literal on `H` line 151.

### 5.19 Horn clocking at assembly (`S/README_R4.md` 96 to 103)

Because every recess is one-sided, the horn direction at zero pose is fixed by the plastic: crank and elbow horns point down, cup-floor horns point along +x, the drive jaw horn points toward the fingertip. Centre every servo before seating the horn. The grip servo slides in from below until its tabs stop at the channel top, then the two M2 tab screws run upward. A second floor on the boss diameter, besides the r 22.47 tab swing: the far tab screw pilot sits at r 19.4 (stated, line 54).

---

## 6. Fits and print settings

| item | value | source |
|---|---|---|
| horizontal clearance per side `CH` | 0.35 | `S/lib.py` 133 |
| vertical clearance `CV` | 0.20 | `S/lib.py` 134 |
| micro pocket | 23.5 x 13.1 | `S/lib.py` 137 |
| crank flange in base bore | shield D36.0 in D36.7 | `S/README_R4.md` 79 |
| boss in cup | D45.6 in D46.3, cavity 13.4 | `S/README_R4.md` 79 |
| elbow stub in socket | shield D7.0 in teardrop D7.9 | `S/README_R4.md` 80 to 81 |
| jaw pivot | octagon D4.8 in D5.5 | `S/parts_r4.py` 251, 293 |
| pin cap | D2.35 press in D2.2 (3.2 mm3 designed interference) | `S/parts_r4.py` 260, 296 |
| horn hub relief | 0.2 proud so the screw clamps | `S/lib.py` 180 |
| PVC screws | D4.6 teardrop, D9.2 counterbore, #8 x 3/4 | `S/parts.py` 81 to 83 |
| print | as authored, no supports; crank boss down with the flange standing; upper block down cup up; fore boss down; palm cradle down cup up; base upright on the foot; jaws and pincap flat | `S/README_R4.md` 87 to 89 |
| material | PETG, 3 to 4 perimeters, 40 to 50 percent infill on crank and fore, 25 percent elsewhere | `S/README_R4.md` 91 to 92 |
| volumes cm3 | crank 32.4, upper 42.4, fore 40.8, palm 35.9, jaw_drive 2.5, jaw_idle 2.7, pincap 0.2, base 32.7, mounts 41.2 / 45.5 / 48.8; arm plus base 189.6 against 226.7 for R3 | stated, `S/README_R4.md` 71 to 75 |

---

## 7. UX anatomy

Dark instrument shell (tokens `--bg #141619 --panel #1c1f23 --teal #3fbdb2 --amber #e0a54e --red #e0564a`, JetBrains Mono), grid `1fr 340px` by `46px 1fr` (`H` 9 to 18).

- Header: wordmark DAVIT R4, subtitle, an amber rev chip, live reach readout.
- Stage: canvas with hover tooltip naming the part, HUD hint line. Custom damped orbit (0.86 velocity decay), shift or right drag pan, wheel zoom 120 to 3200, double click focus on the picked point, click isolates the picked part (others to opacity 0.16), CLEAR SELECT. Z up, grid at z -330.
- Rail sections: MODEL (MINI 9G only in R4), PIPE (1, 1-1/4, 1-1/2 in), POSE (HANG, REACH, LIFT, TUCK presets; RIGHT ARM and LEFT ARM five sliders each; LINK L=R on by default), LOAD (payload 0 to 300 g, infill 30 to 100 percent, 4.8 or 6.0 V), SERVO TORQUE RIGHT and LEFT bars with the pinch line, COLLISION (status, SAG WHEN STALLED, a note that collision uses proxies), MASS PER ARM table, VIEW (EDGES, REACH CLOUD, explode 0 to 70), BUILD note.
- Warnings: a red contact readout naming each pair as "a side x b side", red torque bars, an amber "exploded view, collision paused".
- Exports: none in the page; STLs come from the generator.
- What makes it excellent: every slider move is checked against real part proxies and stops at the touch point instead of passing through; the torque bars update with payload, infill and voltage; the displayed meshes are the print geometry; the hook exposes the chain and collider so a headless test can drive the same code.

Stale text: the PIPE note still says "wedge locked, no screws" (`H` 93) and the HUD swaps to "R3 lightweight geometry loaded" (`H` 754); the build uses six teardrop screw guides and the meshes are R4.

---

## 8. Tests and harness

| test | what | result |
|---|---|---|
| `parts_r4.py __main__` | single body over 1.0 mm3 and watertight per part, volume and bbox report | stated pass (`S/README_R4.md` line 107) |
| `sweep.py` | 43 pair sweeps, two tiers, 0.5 mm3 threshold | measured 2026-10-04: one designed press fit at 3.21 mm3, no other intersection |
| `verify_sim.py` | packed proxies and masks against runtime semantics, seed 7: 4 presets per pipe plus 134, 140 and 134 random legal poses; then masks cleared at the zero pose must show more than 5 contacts | measured 2026-10-04: 0 fails, 25 unmasked contacts, VERIFY PASS |
| page drive | 6 shots, presets, hook calls | 2026-10-05: no page errors |

Pose counts disagree across sources (416 stated in README_R4, 408 random plus 12 presets in the code, 532 and 402 elsewhere); the code is the record: 408 random plus 12 presets.

---

## 9. Port map

| item | value |
|---|---|
| packages | `sim` (two-level proxies, masks, bisection clamp, sag, offline sweep gate), `motion` (chain, limits, presets), `mesh` (single difference, `tear`, `shield`, `wedge45`, `frustum`, `stadium`, `diamond`, single-body gate), `catalog` (MIC servo row and horn), `profile` (CH 0.35, CV 0.20, PETG 1.24 g/cm3) |
| feature kinds | `horn` (keyed one-sided recess, capture stack), `bore` (teardrop horizontal, shield journal), `pocket` (servo, swept open), `boss` (journal with self-sized voids), `window` (diamond, gabled, cone roofs), `web` (crank gusset panel), `screw` (horn screw driver channel, pilots), `tabslot` (dovetail pad and C channel foot) |
| canon id | MISSING: no mechanism entry for the horn capture joint, the shield journal, the cup-on-boss axial joint or the 5-of-12 gear sector gripper (spur-pair covers involute pairs only) |
| reference id | MISSING (`machines/davit-joint` is named in older notes but is absent from the handoff INDEX) |
| milestone | M02 (D-135 target 30 designed pairs per pipe, D-188 R4 gate as parity reference, `packages/sim/src/kinematics/davit-chain.ts`); M07 (chain moves to `packages/motion/src/kinematics/davit.ts`) |
| lineage row | MISSING (`lineage.json` has no DAVIT row; M02-T02 plans `designs/davit/legacy/` and `legacy/r4/`) |
