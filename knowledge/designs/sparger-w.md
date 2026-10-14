# SPARGER W: how it is made

Record written 2026-10-05 from the original code. Slug `sparger-w`. Family kits-cotter (COTTER, SPARGER W, GUSSET).

Number rules for this file. A number in a table row that names a code location is a declared value copied from that file and line. "Computed" means rerun on 2026-10-05 on this Mac: `sparger_w.py` under `uv run --with manifold3d --with numpy --with trimesh` (trimesh 5.1.1) rewrote `audit.json` byte for byte equal to the shipped one after key sorting; `validate_3mf.py` passed all four shipped plates; arithmetic from the formulas named. "Measured" comes from the drive in this folder (`fab-knowledge:originals/sparger-w/drive/`). "Vendor" is a dimension the README says came from a seller's listing. "Sim" is an output of the owner's model ("a model, not a measurement", sim subtitle), never a bench test. "Stated" quotes the README.

Short paths: `F` is `fab-knowledge:originals/sparger-w/files/`, `S` is `F/source/`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SPARGER W, a bubble machine in a sealed 2 in tube |
| owner's slug | sparger-w |
| canonical file | `F/sparger-w.zip` (copied from `fab-work-directory:sparger-w.zip`) |
| sha256 | e99aa9c3965cea5ff4ff82a3eeb909cde6c7b00fbd35a5d159d5b6ea40adfb7b |
| bytes | 4819158 |
| date | zip entries 2026-10-01 18:48; file copied 2026-10-04 15:34 |
| contents | `sparger-w/README.md`, `source/` (13 files), `3mf/` (4 plates), `stl/` (12 parts), `sparger-w-bench.html` (sha256 9638689dcc7b9d4a0c18e166640bc5f64882b8af8dcb80b4dd48ef60363391c9, 3343316 bytes), `sparger-w-sim.html` (sha256 994b8afb5471a27f3757bc229afcd227595da46328b267c2507f0442945e65b3, 1841052 bytes) |
| runtime | geometry and audit: Python with manifold3d and numpy, offline; apps: two HTML templates filled with the Python output, loading three r128 from cdnjs and fonts from Google Fonts (not offline) |
| revision | rev 2 (stated, README "What the sim says (rev 2)") |

### 1.1 Every revision found

| where | what | notes |
|---|---|---|
| `fab-work-directory:sparger-w.zip` | the only package | canonical |
| `fab-knowledge:evidence/x/sparger-w/sparger-w/` | harvest unpack | `diff -r` against a fresh unpack: identical (checked 2026-10-05) |
| `S/sparger.py`, `S/sparger_tube.py`, `S/sparger_r.py` | three earlier generations in the same zip | SPARGER (box), SPARGER T (tube with weir), SPARGER R (thrown tube, wand disc); W imports helpers from all three, so they ship with it (section 5.12) |
| `~/Downloads` | nothing named sparger | searched 2026-10-05 |
| rev 1 | not shipped | described in the README: 1 x 3 mm tube at 60 rpm |

### 1.2 Why this revision

There is one package. It is good: all 12 printed parts are manifold (status `NoError`), no clashes between printed parts, bought parts and the modelled tube except the intended squeezes, diameter 50.4 fits a 2 in bore, all four 3MFs pass the validator (computed 2026-10-05, section 7). Rev 2 is the sim's answer to rev 1's flooding (section 5.10). What it does not have: a wet run (stated, "Not checked: a wet run"), and the template fill script (the HTML apps cannot be rebuilt from the zip).

### 1.3 What is in `files/`

| path | what |
|---|---|
| `sparger-w.zip` | the shipped package, byte copy |
| `source/` | sparger_w.py, sparger.py, sparger_tube.py, sparger_r.py, export3mf_w.py, orca3mf.py, validate_3mf.py, sweep_w.py, materials.json, filament_template.json, audit.json, bench_w_template.html, sim_w_template.html |
| `README.md` | the owner's README |
| `sparger-w-bench.html`, `sparger-w-sim.html` | the two built apps |
| `3mf/spargerw-plate-C-nozzle-and-pump.3mf`, `3mf/spargerw-plate-A-tube.3mf` | representative exports (the other two plates and the STLs are in the zip) |

Hashes: `fab-knowledge:originals/sparger-w/SHA256SUMS`.

---

## 2. What it makes and for whom

"The nozzle from the teardown (hub, two kidney slots, ring of tiny holes, rotating clock hand) inside the sealed 2 in tube. 50.4 mm across, 246 mm long, 157 mL bottle that screws off the bottom." (stated, README). A maker who wants a hand-held bubble machine that survives being carried, tilted and thrown, prints 12 parts in PETG and TPU with no supports, buys an N20, a 4010 blower, three 623ZZ bearings, a duckbill valve, a rocker switch and 35 cm of silicone tube, and follows a 12-step build.

One N20 gear motor turns a printed peristaltic rotor and, through a printed D spindle, the clock hand, the way the commercial bubble gun drives pump and wiper from one motor. Pump output therefore rides with the wipe rate.

Liquid path (stated, README): M4 nut weight in the bottle, bulkhead (2.1 mm hole, tight), up the wiring bay, over the blower, partition (2.4 mm hole), along the top of the head, in at the 110 deg window, 320 deg round the track under three 623ZZ rollers, out at the 70 deg window, into the socket on the back of the nozzle plate, buried ring channel, 36 holes of 1 mm, face, hand, films. The duckbill in the bulkhead lets air in as liquid goes out.

Frame (`S/sparger_w.py` lines 7 to 21): axis X from the front rim (x = 0, top in use) to the bottle; mm.

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/sparger-w/drive/drive.mjs` and `sim.mjs` (puppeteer-core, headless Chrome, 1280 x 860, three r128 loaded from cdnjs). The bench has no BENCH or HB hook; its own hook `SPARGER_BENCH` drove the modes. The sim was advanced 40 simulated seconds through `SPARGER_W_SIM.step(1/240)` before the shots. Zero page errors on both (measured). Files in `fab-knowledge:originals/sparger-w/shots/`.

| file | caption |
|---|---|
| `s01-bench-assembled.png` | Bench, ASSEMBLED, nozzle up, see-through shells: collar, nozzle plate, pump cup with the brass N20 behind it, blower, KCD11 rocker, grommet and supply lead, bulkhead with the duckbill, the threaded skirt and the bottle with the weighted pickup at the bottom. Status strip: tube 50.4 x 246, bottle 157 mL, 12 parts on 4 plates, clashes 0, 3MF audit passed. |
| `s02-bench-exploded.png` | EXPLODED along the axis, nozzle to the right, every printed and bought part labelled (bought ones in amber frames: N20 100 rpm, 3 x 623ZZ + M3 x 6, 4010 blower, KCD11 rocker, duckbill, 2 x M4 nut). |
| `s03-build-step3-tube-into-pump.png` | BUILD step 3 of 12, "Tube into the pump": the cup with the three roller bearings and the silicone tube entering the 110 deg window; the step text tells how to thread the tube and turn the rotor in so the rollers ride over it. |
| `s05-bench-wiring.png` | WIRING mode, camera in the wiring bay: red +5 V and black ground pairs from the grommet to the rocker, then to the N20 and the blower; the wiring SVG and the routing notes in the rail. |
| `s06-plate-C-nozzle-and-pump.png` | PLATES, plate C as exported: collar, nozzle plate face down, pump cup back down, lid, rotor, clock hand, spindle standing; the per-part bed sizes in the rail. |
| `s08-sim-nozzle-view.png` | SIM after 44 s at 1x, NOZZLE cam: the clock hand over the two kidney slots, the ring of 36 holes around them, films blowing into bubbles; readout 570 bubbles per minute, pump 1.3 mL/min, bottle 119.0 mL, "running clean" (sim). |

---

## 4. Build pipeline and code map

| step | where | what |
|---|---|---|
| parameters | `S/sparger_w.py` lines 34 to 58 | one dict `P` |
| derived stations | `derive()` lines 65 to 89 | radii, part stations along X, blower and bay positions, track station |
| parts | lines 99 to 276 | collar, hand, plate, cup, lid, rotor, spindle, head, tube, bottle, grommet, gasket |
| bought ghosts | lines 279 to 375 | N20, bearings, blower, duckbill, switch, wire paths, tube path, tubing, weight |
| build and poses | `build()` lines 377 to 391 | assembly dict, print dict through `x_up`, ghosts |
| audit | `INTENDED` lines 394 to 396, `audit()` lines 399 to 420 | pairwise clash and squeeze, size, volumes, pump per rev |
| outputs | `main()` lines 423 to 454 | STL per print, `view.json` (every mesh rounded, `geo` stations, tube and wire paths, audit), `audit.json` |
| 3MF | `S/export3mf_w.py` | four single-filament plates through `Orca3MF` (section 5.11) |
| apps | `S/bench_w_template.html`, `S/sim_w_template.html` | templates with `const DATA = __DATA__;` and `__MARK__`; the fill script is not in the zip |
| sweep | `S/sweep_w.py` | Playwright over the sim hook, 24 combinations (section 5.10) |

Helper library by import (line 28 to 30): from `sparger.py` `M, CS, ccw, box, prism_xy, prism_yz, prism_xz, cyl_x, cyl_y, cyl_z, union, mesh_arrays, stl_bytes, to_bed`; from `sparger_tube.py` `x_up`; from `sparger_r.py` `along_x, sector_yz, polar, rot_box_yz, thread`.

| helper | behaviour | location |
|---|---|---|
| `ccw(pts)` | reverse when signed area is negative | `S/sparger.py` lines 72 to 77 |
| `box(x0, x1, y0, y1, z0, z1)` | cube translated | lines 80 to 81 |
| `prism_yz(pts, x0, x1)` | polygon in (y, z) extruded along +x by a 3 x 4 permutation matrix | lines 88 to 91 |
| `prism_xz(pts, y0, y1)` | polygon in (x, z) extruded along y | lines 94 to 97 |
| `cyl_x`, `cyl_y`, `cyl_z` | cylinders by axis with explicit segments | lines 100 to 111 |
| `union(parts)` | `batch_boolean(parts, Add)` | lines 114 to 116 |
| `to_bed(man)` | bounding box min to the origin | lines 505 to 507 |
| `mesh_arrays`, `stl_bytes` | numpy structured binary STL writer | lines 485 to 502 |
| `x_up(man, sign)` | +1 front down `(x, y, z) to (y, z, x)`; -1 rear down `(x, y, z) to (-y, z, -x)`; both rotations (determinant +1) | `S/sparger_tube.py` lines 391 to 397 |
| `along_x(man, x0)` | an extrusion built along +z placed on +x from x0 | `S/sparger_r.py` lines 84 to 86 |
| `polar(r, a)`, `rot_box_yz(cy_t, cy_r, half_t, half_r, a)` | point at radius and angle; rectangle tangential by radial at radius and angle in (y, z) | lines 100 to 113 |
| `thread(a, e, x0, x1, pitch, xref)` | section 5.8 | lines 115 to 124 |
| `set_circular_segments` | 96 in W (line 32); 128 on tube shells passed per call | |

---

## 5. Mechanisms, circuits and constructions

### 5.1 The nozzle plate: kidney slots, buried ring manifold, 36 weep holes, socket (`part_plate`, lines 117 to 135)

What it does: the teardown nozzle. Air leaves through two kidney slots; solution fills a ring channel buried in the plate and weeps out of 36 small holes onto the front face, where the clock hand wipes it across the slots as films.

| parameter | value | location |
|---|---|---|
| plate | x 5.1 to 8.1 (3.0 thick), radius `r - 0.2` = 45.6/2 - 0.2 | lines 36, 120 |
| kidney slots | annulus r 5.8 to 13.8 minus two spokes 2.4 wide at 0 and 180 deg | lines 38, 122 to 124 |
| spindle hole | r `5.0/2 + 0.3` | line 121 |
| ring manifold | r 15.4 to 17.4, 1.2 high, 0.8 front skin | lines 39, 125 to 126 |
| weep holes | 36 of d 1.0 on r 16.4, first at `inlet_a + 5` = 95 deg, through the front skin into the manifold | lines 40, 127 to 129 |
| inlet socket | boss r 3.0 by 4.8 on the back at 90 deg; socket d 1.9 by 4.0 deep (the 2.0 OD tube seals by squeeze); a 0.6 radius feed from the socket bottom into the manifold | lines 41, 130 to 133 |
| key | 1.1 x 2.4 tab at +y in the keyway shared with the collar | line 134 |

Construction order: plate disc, then subtract the union of spindle hole, slots minus spokes, the manifold annulus slab, 36 holes, socket and feed; add boss and key before the subtraction. Print face down (`x_up +1`), so the 0.8 skin and the manifold roof print as a bridge over a 2.0 wide channel (inferred). The bench's first build step says to run a 1 mm drill through any weep hole that closed (stated, `S/bench_w_template.html` line 260). Genus 40 (computed audit): 36 holes, two slots, socket feed and spindle hole.

### 5.2 The clock hand and the D spindle (`part_hand` lines 107 to 114, `part_spindle` lines 181 to 184, `dcyl` lines 92 to 95)

The hand: an arm 18.2 long, 5.0 wide, 1.8 thick at x 3.0 to 4.8, a round tip, a hub r 4.5 from x 2.2, and a D bore. `dcyl(x0, x1, d, flat)` is a cylinder intersected with a box that cuts a flat on the +y side at `flat - r`.

| fit | shaft | bore | location |
|---|---|---|---|
| hand on spindle | D 5.0, flat 4.2 | D 5.15, flat 4.3 | lines 43, 113 |
| rotor front socket on spindle | D 5.0, flat 4.2 | D 5.15, flat 4.3, 3.0 deep, a drop of CA | line 173 |
| rotor rear bore on N20 shaft | D 3.0, flat 2.5 | D 3.1, flat 2.58 | lines 48, 174 |
| spindle tip clearance over the N20 shaft | | r 1.65 from the shaft tip minus 0.3 | line 184 |

The spindle runs from x 2.4 to the rotor plus 3.0, standing on its end for print (`x_up -1`). One motor therefore turns the rotor and the hand at the same rpm.

### 5.3 The printed peristaltic pump on bought bearings (`part_cup` 139 to 154, `part_lid` 157 to 163, `part_rotor` 166 to 178)

What it does: squeezes the silicone line against a printed track with three rollers, pushing about 0.018 mL per turn.

| parameter | value | location |
|---|---|---|
| track radius | 15.2 | line 45 |
| cup wall, back | 1.5, 1.5; cup x 16.0 to 25.0, back to 26.5 | line 45 |
| fins | three at 30, 150, 270 deg, 2.4 thick, radial from `ro - 0.2` to `r - 0.3`, from x `px1 + 1.2` = 9.3 to the cup back 26.5; their rear ends land on the head rails (section 5.4) | lines 47, 146 to 148 |
| tube windows | 2.6 wide at 70 and 110 deg, at the track station `bearing_x0 + 2` = 20.9 | lines 47, 152 to 153, 85 |
| N20 face holes | two r 0.9 holes 9.0 apart; shaft clearance r 2.2 | lines 48, 149 to 151 |
| rotor | plate r 14.3, 1.5 thick at x 17.2; hub r 3.5 to the cup back minus 0.2 | lines 46, 168 to 172 |
| rollers | three 623ZZ (3 x 10 x 4, vendor) on r 9.0 at 90, 210, 330 deg on M3 x 6 buttons through r 1.4 holes | lines 46, 175 to 177, 288 to 298 |
| lid | 0.8 plate with a 1.0 lip inside the track (r 15.05 to 14.0), r 4.5 centre hole | lines 157 to 163 |
| tube | ID 0.5, OD 2.0 (rev 2) | line 49 |

Squeeze and flow (computed): roller reach `9.0 + 10/2 = 14.0`; gap to the track `15.2 - 14.0 = 1.2`; two tube walls `2 x 0.75 = 1.5` are pressed into 1.2, so the lumen is closed and the walls are at 80 percent of their thickness (the README's "1.2 mm roller gap, 80 percent occlusion"). Contact radius `rc = track_r - tube_od/2 + 0.2 = 14.4` (line 417). Per revolution `pi (id/2)^2 x 2 pi rc / 1000 = 0.0178 mL` (audit 0.018). At `100 rpm x 5 V / 6 V = 83 rpm` and the sim's 0.9 slip factor: 1.33 mL/min (computed; README "about 1.3 mL/min").

Assembly (stated, bench step 3): feed the tube in at the 110 window, lay it round the track the long way, out at the 70 window, leave 40 mm on the outlet side, push the rotor in hub first while turning so the rollers ride over the tube, press the lid in. If the line pulls from the nozzle, swap the N20 leads.

Intended squeezes kept by the audit (computed, mm3): cup and tubing 7.75, bearings and tubing 5.05, rotor and bearings 1.96.

### 5.4 The head body: plenum, cone step, rails, ports (`part_head`, lines 188 to 208)

Tube shell R from the collar to the joint at x 55, a 45 deg cone step from R down to the plug radius (`cone = R - (r - 0.2)`), plug 8.0 long into the tube part. A ring at the plate's rear face holds the plate. Three rails at the fin angles (`rot_box_yz` half sizes 1.6 tangential and 1.4 radial, so 3.2 by 2.8, clipped to the annulus `r - 2.2` to `r + 0.3`) run from x 26.6, 0.1 behind the cup back, to 55.2; the 2.4 fins end at 26.5, so the fins meet the rail ends and the rails are the axial stop for the pump stack (computed from lines 146 to 147 and 198; bench step 6: "the three fins land on the three rails"). Nothing in the model stops the cup from turning except fin friction against the bore (inferred). Cuts: the key slot, the blower port box at the plug, the tube hole r `1.0 + 0.2` at (y 0, z 17.5), the lead hole r 2.5 at (-9, 12). Prints rear down (`x_up -1`), 61 tall (computed audit). The plenum is the space between the plate (x 8.1) and the pump (x 15): air turns inward from the outer annulus to the slots (`S/sparger_w.py` line 13).

### 5.5 The tube part: blower rails, wiring bay, 45 deg bulkhead, duckbill seat, thread (`part_tube`, lines 211 to 251)

| feature | construction | location |
|---|---|---|
| shell | cylinder R from x 55 to the skirt end `xs1`, cavity r to the bulkhead plus a 45 deg cone (cylinder from r to 0) at `xc0` | lines 215 to 218 |
| plug socket | the head's cone and plug subtracted with 0.4 extra, key slot | lines 218 to 219 |
| blower rails | two bars 2.4 wide at y -14 and +14 under the blower, intersected with the inner wall and a 45 deg ramp so they print without support; two stops at the far end | lines 225 to 228 |
| zip-tie anchor | a bar 4.4 by 3.6 at 205 deg standing off the wall with a 6.0 by 1.8 slot, beside the grommet | lines 229 to 235 |
| intake slots | four 2.4 slots at y -12, -6, 6, 12 over the blower | lines 238 to 239 |
| rocker cutout | 9.0 x 13.5 for a KCD11, on the +y side from y 15 outward | lines 241 to 242 |
| grommet hole | r 3.0 on the -y side (`cyl_y` at x `bx1 + 8.0`, y from -R - 2 to -15) | line 243 |
| pickup pass-through | r `1.0 + 0.05` at y 6 through the bulkhead (the 2.1 hole) | line 244 |
| duckbill seat | r `7.45/2 + 0.15` counterbore at y -6, seat depth from the bulkhead geometry plus 1.2; r 3.0 vent beyond | lines 244 to 248 |
| gasket groove | annulus 18.4 to 21.4, 0.8 deep in the bulkhead face | lines 221 to 222 |
| female thread | `thread(21.4 + 0.35, 0.4, xf, xs1 + 1, 3.5)` subtracted | line 220 |

Prints front down, 100.8 tall (computed audit). The bulkhead is a 45 deg cone so it prints with no support (inferred from line 217).

### 5.6 The sealed bottle, weighted pickup and duckbill vent (`part_bottle` 253 to 261, `ghost_duckbill` 308 to 313, `ghost_weight` 366 to 375, `tube_path` 338 to 356)

What it does: nothing relies on gravity except the pickup weight. The bottle is sealed by a TPU gasket; the duckbill opens as the pump draws, so the bottle does not go to vacuum; two M4 nuts glued on the line end keep the pickup in the liquid whichever way the tube points.

Bottle: 90 long, floor 2.4, neck bore radius 19, inner 45 deg shoulder (`taper`), male thread `thread(21.4, 0.4, rim, b0 + 0.6, 3.5, xref = xf)` phased to the female skirt. 157 mL (computed audit). Gasket: TPU 18.6 to 21.2 by 2.3 (`part_gasket` lines 272 to 276); bottle and gasket squeeze 134.18 mm3 (computed audit). Duckbill: UP100, 7.45 flange, 4.2 bore, 6.68 tall (vendor). Weight: two M4 hex nuts (7 mm AF, 3.2 thick, vendor) at the first point of the tube path.

The tube path (lines 338 to 356) is a list of centreline points from the bottle floor through the bulkhead, up the bay, over the blower at z 17.5, through the partition, along the head top, into the 110 window, 33 points round 320 deg of track at radius `rc` from 110 deg, out the 70 window, and into the plate socket. `ghost_tubing` (lines 359 to 363) sweeps it as hulls of sphere pairs of radius 1.0, so the line takes part in the clash audit. Length 323 mm, line volume 0.06 mL (computed audit).

### 5.7 Bought parts as ghosts in the audit (lines 279 to 335)

N20 (12 x 10 gearbox 9, motor 15.2, tail 2.0, D shaft 3.0 flat 2.5, 10 long), three 623ZZ with M3 button heads and shanks, 4010 blower (round body r 18.5 plus a frame, at z -5.0), UP100 duckbill, KCD11 rocker (9 x 13.5 body 16.5 deep with lugs), tubing, two M4 nuts. All "as dimensioned by their sellers" (comment line 278; vendor). `wire_paths` gives three centrelines (N20, blower, supply) meeting at the rocker; the bench draws each as a red and a black tube.

### 5.8 Phase-referenced single-start round thread (`thread`, `S/sparger_r.py` lines 115 to 124)

A circle of radius `a` offset by `e` from the axis, extruded along the axis with `twist_degrees = -360 h / pitch` and `n_divisions = max(8, h / pitch x 36)`, mapped onto +x from `xref`, then clipped to x0..x1. `xref` fixes the phase so the male and female line up in the assembly model. Values in W: a 21.4, e 0.4, pitch 3.5, female clearance 0.35 on the radius (declared, `S/sparger_w.py` line 54). The male is clipped from the rim to the bottle start plus 0.6; the female is subtracted from the skirt. No flank angle or start chamfer: the round eccentric profile is the whole thread.

### 5.9 Print poses and the clash audit (`build` lines 377 to 391, `audit` lines 399 to 420)

Poses: collar, plate, lid, rotor, tube, gasket front down (`x_up +1`); hand, cup, spindle, head, bottle rear down (`x_up -1`); grommet lies on its flange. Every part is then `to_bed`.

Audit: pairwise `(a ^ b).volume() > 0.5` over 12 printed parts plus 7 ghosts; a pair in `INTENDED` (grommet and tube, switch and tube, bottle and gasket, tubing with cup, bearings, plate, tube, head, weight, spindle and N20, rotor and N20, rotor and bearings, duckbill and tube) is a squeeze with its volume, anything else is a clash. Result (computed 2026-10-05, equal to the shipped `S/audit.json`): clashes none; squeezes plate and tubing 1.09, cup and tubing 7.75, rotor and bearings 1.96, tube and grommet 13.04, tube and switch 1.28, bottle and gasket 134.18, bearings and tubing 5.05 mm3; diameter 50.4, `fits_2in` true, length 246.0; per part status `NoError` with genus plate 40, tube 7, cup 5, rotor 4, head 3, collar, hand, lid, gasket, grommet 1, bottle and spindle 0; bed extents tube 50.4 x 50.4 x 100.8, head 61.0 tall, bottle 102.0.

### 5.10 The physics sim and the sweep that chose rev 2 (`S/sim_w_template.html` lines 171 to 360, `S/sweep_w.py`)

What it does: models the whole liquid and air loop so a design change can be judged before a wet run. Subtitle: "a model, not a measurement".

| element | model | location |
|---|---|---|
| solutions | plain gamma 0.025, glycerin 0.028, giant 0.030 N/m, with film formation probability, film life, bubble size factor `kd`, pop rate, bubble life | lines 176 to 180 |
| fans | WINSINN 52 Pa and 43 L/min, Gdstime 42 Pa and 72 L/min at 5 V (vendor, from the listings); linear curve, pressure scales with (V/5)^2, flow with V/5, off under 2.2 V | lines 181, 262 |
| plenum | pressure by 26-step bisection where fan flow equals orifice demand: cd 0.62, leak 20e-6 m2, open slots full area, blowing films 0.35 of area | lines 263 to 277 |
| film | blows when plenum pressure exceeds `4 gamma / w`, w = slot width 8 mm: 14 Pa for glycerin (computed) | lines 189, 321 |
| pump | `Qp = perRev x 0.9 x rpm / 60 x max(0, 1 - vacuum / 60000)`, rpm = rated x V / 6, off under 1.2 V; per rev from the same formula as the audit | lines 285 to 290 |
| bottle | ideal-gas air volume; the duckbill clamps vacuum at -3000 Pa; a loose seal leaks with neck wetness and acceleration | lines 291 to 297 |
| line | FIFO of `[volume, isLiquid]` segments, so an air gulp at the pickup reaches the nozzle seconds later | lines 298 to 307 |
| face | ring channel fills first (its volume `pi (r1^2 - r0^2) 1.2`, 0.25 mL, computed), then the face; drips over 0.08 mL at `(face - 0.08)(0.6 + 1.5 down)` per s, a knock term above 30 m/s2, and a wipe fling of 2 percent of the face per rotor turn | lines 193, 309 to 318 |
| hand | each blade crossing a slot exit takes 0.006 mL from the face and leaves a film with probability `clamp((face - 0.015) / 0.05) x form` | lines 323 to 335 |
| liquid level | 3000 seeded points in the bottle (Park-Miller, seed 7), level by quantile along a lagged gravity vector; the clunk is the extreme point along a faster gravity vector minus 2.5 mm | lines 194 to 204, 227 to 239 |
| motion | upright, level, inverted, slow roll, tossed and caught with random spins and impacts | lines 240 to 261 |

Hook: `window.SPARGER_W_SIM = {step, state, settings, reset, bpm, lineAir}` (line 632). Run here (measured with the sim): 40 s at 240 Hz upright on the defaults gives 612 bubbles per minute, pump 1.28 mL/min, plenum 9.0 Pa, line air 0 (sim).

`S/sweep_w.py` drives the sim headless through Playwright over 24 combinations (tube 1.0 and 0.5, hands 1 and 2, rpm 30, 60, 100, two fans) for 150 simulated seconds at 240 Hz, averaging bubbles per minute after 30 s. The README's rev 2 decision comes from it (sim): rev 1 (1 x 3 mm tube, 60 rpm) pumped about ten times what the films used and dripped most of it; rev 2 (0.5 x 2 mm tube, 15.2 track, 100 rpm N20) gives about 530 to 620 bubbles a minute, drips fall from 2.3 to about 0.25 mL/min, and a full bottle runs well over an hour. A two-blade hand starves the face on this tube; it only pays with the 1 x 3 tube and a 30 rpm N20.

### 5.11 Export and the 3MF dialect (`S/export3mf_w.py`, `S/orca3mf.py`, `S/validate_3mf.py`)

Four plates, one filament each (white "any PETG"; plate D "any TPU"), every part centred in XY and dropped to z = 0 at fixed bed positions: A tube at (128, 128); B head (80, 128) and bottle (175, 128); C collar, plate, cup, lid, rotor, hand, spindle; D gasket and grommet in TPU. `orca3mf.py` and `validate_3mf.py` are byte identical to `handoff/hbf/seed/3mf/` (cotter-sparger.md line 30): Application tag `BambuStudio-01.10.01.50`, every per-filament vector exactly N entries, no printer or process scoped keys, default printer Flashforge Creator 5 Pro, process "0.24mm Standard @FF C5". `validate_3mf.py` checks zip entries, Application, component refs, per-mesh degeneracy, edge use, positive volume, watertight after merge, lib3mf read, model settings and project settings vectors. All four plates pass (computed 2026-10-05).

### 5.12 The lineage inside the zip: SPARGER, T and R

Each is a complete generator with its own `P`, parts, audit and STL output, and each contributes a mechanism W does not use. A port that wants these mechanisms reads them here.

| file | design | mechanism worth keeping | location |
|---|---|---|---|
| `S/sparger.py` | SPARGER, box 200 x 135 x 50 (H <= 50.8) | weir trough over a 40 deg hex grille: one V notch per top-row hex column (`notch_positions`), notch depth 2.5, half angle 30 deg; a bypass notch at the far end with crest `bypass_head` 1.5 above the V roots caps the head, so per-notch flow is set by geometry and not by pump speed; gutter drains back to the reservoir under the deck; 5015 blower pressurises the plenum | docstring lines 2 to 25, `P` lines 35 to 61, `hex_layout` lines 177 to 202, `notch_positions` 229 to 234, `part_trough` 237 onward |
| `S/sparger_tube.py` | SPARGER T, the same weir scarfed 45 deg into the mouth of a 2 in tube with a flat land at z -24.2 so it does not roll; wet body prints rear down, bay front down | three V notches feed the top hex columns and every hex top vertex divides the rivulet; the overflow returns through a down pipe ending under the liquid so it does not whip foam; sliver avoidance: `part_trough` retries a harmless channel offset from the list 0.137, 0.211, 0.293, 0.071, 0.349, 0.419, 0.173, 0.251, 0.037, 0.389 until `_clean` (no triangle under 1e-6 after rounding to 5 decimals, trimesh watertight) | docstring lines 2 to 22, `_clean` 176 to 184, `part_trough` 187 to 193 |
| `S/sparger_r.py` | SPARGER R, built to be thrown around | sealed bottle, weighted pickup, micro peristaltic pump, foam applicator, a wand disc of 10 rings of 8 mm turned by an N20: each ring wipes the wet foam, carries a film round and the air window blows it off; the helpers W imports | docstring lines 2 to 20, `P` lines 30 to 56 |

### 5.13 Circuit

One supply, one switch, two loads (stated, bench wiring pane `S/bench_w_template.html` lines 385 to 406): a round two-core lead (a USB-A or USB-C pigtail with bare ends) enters through the TPU grommet and is zip tied to the anchor so a yank pulls the tie; +5 V goes to the KCD11, then splits to the N20 and the blower; grounds join; the blower and the N20 each on a 2-pin JST-XH so the head unplugs with one connector; under 0.5 A total, any USB port (stated, wiring SVG). If the pump pushes toward the bottle, reverse the N20 at its plug. No controller, no speed control: the N20's rated speed at 5 V sets both pump rate and wipe rate.

### 5.14 Collar, plate keyway, head-to-tube plug joint and grommet (`part_collar` lines 99 to 104, `part_head` 196 and 200 to 208, `part_tube` 218 to 219, `part_grommet` 264 to 269)

Added by the checker on 2026-10-05.

| feature | construction | location |
|---|---|---|
| collar | ring of R from x 0 to 2.0 with a bore of `r - 1.2`; a spigot of radius `r - 0.2` from x 2.0 to 5.05 (0.05 short of the plate face), same bore; a key 1.1 radial by 2.4 at +y. Pressed into the head, it clamps the nozzle plate against the head ring | lines 99 to 104 |
| plate seat | a ring in the head from the plate's rear face `px1` to `px1 + 1.0`, radius `r + 0.2`, minus a 45 deg cone from `r - 0.9` to `r + 0.12` over 1.02, so the ledge prints without support when the head stands rear down | line 196 |
| front keyway | a slot 1.8 radial by 3.0 wide at +y through the head from x 1.0 to `px1 + 0.3`; plate key and collar key (both 1.1 by 2.4) ride in it, so the plate and its weep ring keep their clock position (0.3 clearance per side, computed) | line 200 |
| plug joint | the head ends in a 45 deg cone from R to `r - 0.2` and an 8.0 plug of radius `r - 0.2`; the tube part subtracts the same cone grown by 0.4 and a cavity of r, so the plug runs 0.2 per side loose; a key rib 3.0 wide and 1.8 tall on the plug (+z) enters a 3.8 slot in the tube, 0.4 per side. Bench step 10: a friction fit, key rib up, tape or CA if it will be thrown | head line 207, tube lines 218 to 219 |
| head ports | blower port box at the plug through the partition (blower width minus 1.0, height plus 0.5); tube hole r 1.2 at (0, 17.5); lead hole r 2.5 at (-9, 12) | lines 203 to 205 |
| grommet | TPU: a shank r 3.15 from the outer wall to the inner wall in the r 3.0 side hole (0.15 interference on radius, computed), a flange r 4.6 by 1.2 inside, a bore r 1.8 for a lead about 3.5 thick (stated, wiring notes). Prints on its flange | lines 264 to 269, pose line 388 |

---

## 6. UX anatomy

### 6.1 Bench (`F/sparger-w-bench.html`, template `S/bench_w_template.html`)

- Header: hack.build mark, "SPARGER.W bench", tagline "parts, plates, wiring, build order"; mode buttons ASSEMBLED, EXPLODED, PLATES, BUILD, WIRING (lines 83 to 87). No numbered steps strip: a `machine`-like layout.
- Stage: three r128 on void with a pink grid; coordinate map `tv(x, y, z) = (y, LH - x, z)` stands the tube nozzle up (line 143); HUD line per mode (lines 379 to 383); part labels; see-through shells; five cam buttons iso, front, side, nozzle end (`head`), wiring bay (`bay`), plus `bottle` and `pumpclose` used only by build steps (`CAMS`, lines 533 to 534).
- Aside 380 px: VIEW (explode slider, labels, see-through shells, tubing and wires), BUILD (12 steps with back and next, each with a show set, a highlight set and a camera, lines 259 to 273), WIRING (SVG plus routing notes), PLATES (bed sizes per part, save plate), EXPORT, PARTS table (click a row to find it, STL per part), BUY LIST.
- Catalogue: `PRINTED` 12 parts with plate letter, material, preview colour, explode offset and pose; `BOUGHT` 7 (lines 146 to 168).
- Print poses recomputed in JS (`posePoint`, lines 221 to 225) for per-part STL; plates drawn from the same poses (lines 237 to 256).
- Exports: per-plate 3MF (the audited bytes embedded as base64), all STLs zip, everything zip (3MF, STL, `assembly.md` generated from the step HTML, `wiring.svg`, `bom.csv`); its own store-only zip writer with CRC32 (lines 413 to 453).
- `saveFile` (lines 454 to 471) uses `window.claude.use("downloads")` when present, wraps any extension outside txt json md csv svg zip html png pdf into a zip, falls back to an anchor download.
- Status strip: tube size, bottle volume, printed count and plates, clashes, 3MF audit verdict.
- Hook `window.SPARGER_BENCH = {setMode, showPlate, showStep, stlBlob, zip, PRINT}` (line 552).

Build order (stated, `S/bench_w_template.html` lines 259 to 273), each step with its own show set, highlight set and camera:

| step | title | camera | what the step text fixes |
|---|---|---|---|
| 1 | Print | iso | four plates, 0.2 mm layers, 4 walls on tube and bottle, 20 percent gyroid, no supports; open any closed 1 mm weep hole with a drill |
| 2 | Rotor and rollers | pumpclose | 623ZZ on each M3 x 6 button screw, screwed in from the hub side until the head just nips the inner race |
| 3 | Tube into the pump | pumpclose | in at 110, round the long way, out at 70, 40 mm on the outlet; rotor in hub first while turning; lid pressed in |
| 4 | N20 and spindle | pumpclose | 15 cm leads and an XH plug; two M1.6 x 4 through the cup back; CA in the rotor's front socket, spindle flat to flat |
| 5 | Line into the nozzle plate | head | outlet end fully into the socket, seals by squeeze; plate onto the spindle |
| 6 | Into the head body | iso | tube through the 2.4 hole, lead through the 5 mm hole; stack in from the front, "the three fins land on the three rails"; plate tab in the keyway |
| 7 | Hand and collar | head | hand flat to flat just clear of the face; collar in on the same keyway; turn once by hand to check the sweep |
| 8 | Tube part: blower and wiring bay | bay | 4010 slid onto its rails to the stops; KCD11 snapped in; grommet and zip tie through the anchor; wiring |
| 9 | Line through the bulkhead | bottle | 80 mm through the 2.1 hole; two M4 nuts glued on as the pickup; duckbill lips toward the bottle |
| 10 | Join head to tube | iso | XH plugged; slack pulled toward the bottle away from the blower inlet; plug in key rib up |
| 11 | Gasket, fill, bottle | bottle | gasket in the groove; about 120 mL of mix; screw on until the shoulder meets the skirt, "the rim squeezes the gasket about 0.5 mm" |
| 12 | First run | iso | nozzle up; liquid on the face after 10 to 15 s; air moving toward the bottle means swap the N20 leads; dripping means lower the N20 voltage |

### 6.2 Sim (`F/sparger-w-sim.html`)

Header "SPARGER.W sim", subtitle "the teardown nozzle in a sealed 2 in tube. a model, not a measurement", sim clock. Cams whole thing, nozzle, pump, bottle, bubbles. Legend: solution in the line, air in the line, air path, film on a slot, clunk in liquid. RUN panel: run or pause, reset, 1x, 4x, 16x; presets upright, tossed around, upside down, no vent, loose bottle. HOW IT WORKS text, MOTION and settings panes, charts, a big VT323 bubbles-per-minute readout, status strip with pump rate, bottle volume and a "running clean" chip.

### 6.3 What makes it excellent

1. One generator owns geometry, poses, bought ghosts, the liquid path and the audit, and every number in the README comes from that run or from the sim, with the README saying which (stated, "Checked, and not").
2. Bought parts and the tube itself are solids in the clash audit, and every intended contact is a named squeeze with a volume.
3. The design decision (rev 2) is recorded with the sweep that made it.
4. The bench shows the build order step by step with its own camera per step, and the wiring as both 3D wire pairs and a flat diagram.
5. The plate files in the bench are the audited bytes, not a re-export.

### 6.4 Flaws a port must not copy

| flaw | evidence |
|---|---|
| apps load three and fonts from CDNs, so they fail offline | `S/bench_w_template.html` lines 7 to 9, 137 |
| the template fill script is missing; the HTML cannot be rebuilt from the zip | contents list |
| README says N20 to cup with M1.6 x 2; BOM and bench step 4 say M1.6 x 4 | README, bench step 4 text (`S/bench_w_template.html` line 265) |
| README says about 32 cm of tube; buy list 35 cm; audit 323 mm | README, BOM, audit |
| `sparger_w.py` docstring says 1 x 3 mm tube; params are 0.5 x 2 (rev 2) | lines 15, 49 |
| bench step 1 says 0.2 mm layers and 4 walls; the 3MF preset is 0.24 mm | line 260, export3mf |
| the sim's embedded audit has 5 squeezes (older run); bench and `audit.json` have 7 | cotter-sparger.md section 2.7 |
| the sim's 1 mm ID tube option is labelled "needs a 15.6 mm track" but the sim computes it on the 15.2 track from `DATA.geo` (rc 13.9, computed), and no 15.6 geometry exists | `S/sim_w_template.html` lines 131, 289 |
| vendor dimensions export with no provenance tier | section 5.7 |
| no global BENCH or HB hook; the plan's hook contract does not fit | section 6.1 |

---

## 7. Tests and harness

| check | how | result |
|---|---|---|
| geometry audit | `python sparger_w.py --out <dir>` | computed 2026-10-05: `audit.json` equal to the shipped one; clashes none; 7 intended squeezes |
| 3MF validator | `python validate_3mf.py <plate>.3mf` (uv with trimesh, numpy, manifold3d, lib3mf) | computed 2026-10-05: "all export checks passed" on all four plates |
| sim sweep | `S/sweep_w.py` (Playwright, expects `/home/claude/sparger/out_w/sparger-w-sim.html` and a local three) | not rerun; the README's rev 2 figures are its output (sim) |
| drive | `fab-knowledge:originals/sparger-w/drive/drive.mjs`, `sim.mjs` | measured 2026-10-05: zero page errors; bench `PRINT` keys equal the 12 printed parts |

No unit tests, no node harness, no Playwright smoke of the bench.

---

## 8. How to make a new thing this way

1. Write the design as one Python generator with one parameter dict, a `derive()` for stations, one function per part, ghosts for every bought part dimensioned from its listing, a build that returns assembly, print poses and ghosts, and an audit that runs every pair.
2. Declare intended contacts by name and report each with its volume; anything else is a clash.
3. Model the consumable path (here the tube) as a solid so it takes part in the audit, and compute its length and volume from the same points.
4. Share one shaft between coupled functions when the ratio should stay fixed (pump and wiper).
5. Make the pump from printed parts and bought bearings: a track radius, a roller circle, a gap smaller than two tube walls, windows at the ends of the wrap.
6. Use a phase-referenced eccentric-circle thread for sealed screw joints and a TPU gasket in a groove with a declared squeeze.
7. Before any wet run, write a sim with the physics you care about, sweep it headless through a hook, and record which numbers are modelled and which were never measured.
8. Print every part in a pose that is a pure axis rotation, and audit the 3MF with the shared validator.

---

## 9. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| printed peristaltic pump on three 623ZZ | mechanisms, sim | peristaltic (backlog D-060) | MISSING (candidate "peristaltic three-roller", line 1172; fluidics row line 480) | MISSING (`mechanisms/peristaltic-3-roller` proposed in cotter-sparger.md section 6, not in `reference/`) | backlog until a second design needs it | MISSING |
| single-motor shared shaft for pump and wiper, D spindle and D bores | mechanisms | bore | MISSING | MISSING | none | MISSING |
| nozzle plate: kidney slots, buried ring manifold, weep holes, squeeze socket | geom, mesh | window, pocket, port | MISSING | MISSING | none | MISSING |
| phase-referenced single-start round thread | mesh | thread (D-059, kind planned) | MISSING (TENON's two-start thread break is the thread candidate, line 1168) | MISSING (M11 names `joints/thread-break` from TENON, M11-reference.md line 649) | M10 thread kind | MISSING |
| sealed bottle, gasket squeeze, duckbill vent, weighted pickup | mechanisms, catalog | thread, pocket | MISSING | MISSING | none | MISSING |
| weir with V notches and a bypass notch (SPARGER, T) | mechanisms | weir (backlog D-060) | MISSING | MISSING | backlog | MISSING |
| sliver avoidance by retrying a harmless dimension (T) | mesh | none | n/a | MISSING | none | MISSING |
| bought ghosts in a pairwise clash audit with intended squeezes | checks | none | check ids CHK-ASM-04 and -06 exist (CHECKS.md lines 496, 498); no canon entry | MISSING | M04 | MISSING |
| fluid and film sim with a headless sweep | sim | none | MISSING (fluidics row line 480 lists tesla-valve, coanda-gate, membrane-valve only) | MISSING | M02 (no SPARGER card) | MISSING |
| four single-filament plates through the seed writer | 3mf | none | n/a | MISSING | M00 | MISSING |
| bench wiring diagram and 3D wire paths | wiring | conductor | MISSING (circuit canon untouched) | MISSING | M08 (SPARGER W is one of three candidate wiring targets, MILESTONES.md line 139) | MISSING |
| per-step build order with cameras | ui-core | none | n/a | MISSING | M09 | MISSING |
| keyed clamp collar, 45 deg plate ledge, keyed plug joint with stated clearances, TPU press-fit grommet | geom, mesh | bore, pocket | MISSING | MISSING | none | MISSING |

`lineage.json` holds three rows, none for SPARGER W (checked 2026-10-05). The registry row `sparger-w` is planned at M16-T06 (`M16-knowledge-registry.md` line 523) with `designs/sparger-w/legacy/` as its home (line 642).
