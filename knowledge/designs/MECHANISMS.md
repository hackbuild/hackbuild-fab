# Mechanisms: cross index to the originals

Written 2026-10-05, BUCK rows added 2026-10-06, from the records under `fab-knowledge:originals/<slug>/RECORD.md`. Every row names the original designs that contain the mechanism, circuit, construction or UX pattern, and the one canonical original to port from, with its file and function. Paths are relative to `fab-knowledge:originals/`. Line numbers are the source line in that file, as the record cites them. The generated mockups in `fab-knowledge/mockups/` are not a source for anything here.

Columns: **canon** is the id in `docs/plan/CANONS.md` or MISSING; **reference** is the reference id the plan names (none exists under `hackbuild-fab/reference/` except `keys/flex-pair` on 2026-10-05) or MISSING. The design index is `INDEX.md` beside this file.

How to use a row: open the canonical design's record at the section that names the file, read the construction, then build the new part with the same kernel calls, the same fit rows and the same checks. Where two designs carry the same mechanism, the canonical one is the newer good revision or the one with the fix the other lacks; the record of the other says why it was not chosen.

## 1. Buttons and keys (the spring buttons and their kin)

The proven printed buttons. PIP holds the reference set of four; THINPOT holds the two FEELER spring buttons; BLOCKS and BOSS carry the cone as a brick. Port the PIP forms for any new keyed device and keep the THINPOT flange lock as the dome option.

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Flex cone key: TPU cone printed in place buckles under the thumb, cTPU cap lands across two split cPLA half columns (one key net, one GND) | pip, thinpot (`domeCone`), blocks (BUTTON), boss (BUTTON), feeler-v1 (precursor) | **pip** `pip/files/haft-src/src/model.js` lines 63 to 88 (cone, cap, half columns, cavity); `layout.js` `flexDims` lines 149 to 160 and defaults line 35; feel readout `bench/part3.js` line 431 | flex-cone-key | buttons/flex-cone (planned, absent) |
| Click spring key: double cosine PETG snap spring printed flat, cTPU dovetail tip on the shuttle, stepped slot with relief, keyed end-block ribs, flanged cap printed flange down; closure on the snap | pip | **pip** `layout.js` `clickerDims` lines 81 to 113 (defaults line 36); `model.js` lines 89 to 112 (slot, pads, well) and 366 to 390 (elements and caps); fits rows `model.js` lines 530 to 542 | click-spring-key | buttons/click-spring (planned, absent) |
| SNAPFE corotational beam solver and force curve for the click spring | pip | **pip** `pip/files/haft-src/src/snapfe.js` lines 7 to 99 (geometric stiffness line 57) | inside click-spring-key; `spring` kind (D-059) | MISSING (sim fixture `sim/click-spring-window` named in the PIP port map) |
| Touch comb key: interdigitated cPLA combs flush with the bezel on a PETG boss, finger bridges sense to 3V3 | pip | **pip** `model.js` lines 113 to 136 (comb, boss, finger clipping lines 125 to 127) | touch-comb-key | buttons/touch-comb (planned, absent) |
| Flip bowl dome with flange lock: dome printed upside down with plug and stem, flange locks under a 45 deg ramp collar lip | thinpot | **thinpot** `thinpot/files/feeler_thinpot.html` `domeCap` from line 1352 (collar gaps, lip, flange slope) | dome-button (flange lock: MISSING as a snap entry) | buttons/dome (planned, absent) |
| v1 rim dome with a floating conductive puck | feeler-v1 | do not port: retired with the paint_color 3MF dialect (`feeler-v1/RECORD.md` section 4.4) | retired | none |
| Cone button array with each, common and matrix wiring on a brick | blocks, boss | **blocks** `blocks/files/src-extracted/parts.js` lines 862 to 950 (note the half columns stand above the brick top, record section 8) | candidate (CANONS 8.3, BOSS cone button) | MISSING |
| Ladder keypad: dome keys on one analogue pin through a boustrophedon serpentine chain with trim bridges | thinpot | **thinpot** `feeler_thinpot.html` `ladder` from line 4213 | ladder-keypad | buttons/ladder-key (planned, absent) |
| Direct-pin hex skin-bridge key | baffle-r2, baffle-r3 | **baffle-r3** `baffle-r3/files/src/model.js` `keyCentres` and `keyArt` from line 297 | candidate (CANONS 8.3) | MISSING |
| Capacitive touch pad, printed (one GPIO per pad, charge-time read) | gudgeon, tang-r6 (hex pads), blocks (TOUCH), boss (TOUCH), gib (touch slider) | **gudgeon** `gudgeon/files/extracted/05_part2d_circuit.js` lines 19 to 52; BOSS TOUCH (`boss/files/boss-src/src/parts.js` lines 479 to 498) is the working brick form, BLOCKS broke its control key | capacitive-plate | sensors/capacitive-plate (planned, absent) |
| Capacitive plate, copper | vernier, coffer (K6), fret, tessera, spline, quadrant | **vernier** `vernier/files/gen_vernier.py` (plates and risers, record 5.1 to 5.2) | capacitive-plate | sensors/capacitive-plate (planned, absent) |
| Hex key on copper | coffer, fret | **coffer** `coffer/files/gen_coffer.py` `tile_K6` lines 40 to 99 | hex-key | surfaces/fret-hex (planned, absent) |
| Interdigitated force comb | keyway, tang-r6, tang-r5, blocks (FORCE), boss (FORCE), thinpot (comb) | **keyway** `keyway/files/gen_keyway.py` force zones (record 5.1); printed form **tang-r6** `tang-r6/files/src/04_design.js` from line 176 | force-comb | sensors/force-comb (planned, absent) |
| Scan of six force pads on one sense pin | tang-r5 | **tang-r5** `tang-r5/files/src/tang_r5_13_core.js` from line 352 with `src/tang_r5_circuit_data.js` | scan-six-pads | sensors/scan-six-pads (working id) |

## 2. Sticks

One mechanism in two presets. TOGGLE owns the solver and the drive pad; PIP owns the in-place thumb pad and the stem on an unbroken core.

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Flex-neck tilt stick: neck-anchored TPU lathe, cTPU collar, four or eight wall pads under a common ring, solved gate stop | toggle, pip | **toggle** `toggle/files/src/src/part2d.js` lathes lines 394 to 414, collar lines 23 to 42 and 407 to 412, well pads lines 283 to 292; PIP preset **pip** `model.js` lines 137 to 177 and `layout.js` `stickDims` lines 115 to 147 | tilt-stick (archetype); mechanism entry MISSING | sticks/tilt-stick-4, sticks/pip-stick (planned, absent) |
| Tilt solver: slab plan occupancy, profile sampling, Rodrigues hit test, thetaFirst scan and bisection | toggle | **toggle** `part2b.js` lines 10 to 121 | MISSING (governing relation inside tilt-stick) | MISSING |
| Solved gate, roof and cap height; round, square and octagon gates; stop per azimuth | toggle | **toggle** `part2b.js` lines 123 to 219 and 249 to 255 | MISSING | MISSING |
| Contact function with patch half angle and eight-way centroid decode | toggle | **toggle** `part2b.js` lines 224 to 246 | MISSING | MISSING |
| Stem stress check (absent in TOGGLE; the section where HAFT's first stick snapped) | pip (stem on an unbroken core), toggle (no check) | **pip** stick stem and `stickClear` bisection (`layout.js` line 241); add a check to the TOGGLE port | MISSING | MISSING |

## 3. Sliders, pots and dials

Each read model has one canonical source. Printed tracks come from GIB, THINPOT and TANG R6; copper from KEYWAY, VERNIER, QUADRANT and COFFER.

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Finger pot: track, collector bus and return lane, the skin as the wiper | gib, gudgeon, blocks (SLIDER) | **gib** `gib/files/src/src/part2.js` `buildFinger` from line 339 | finger-pot | sensors/finger-pot (planned, absent) |
| Membrane pot with a flipped TPU sheet | gib | **gib** `part2.js` `buildMembrane` from line 245; `simMembrane` line 553 | membrane-slider-gib | sensors/membrane-slider-gib (planned, absent) |
| THINPOT membrane pot: tapered track, three near-end terminals, flush low-ohm collector | thinpot | **thinpot** `feeler_thinpot.html` `thinpot` from line 4022 | membrane-slider-thinpot | sensors/membrane-slider-thinpot (planned, absent) |
| Wall membrane slider: TPU skin and cTPU strip over a gap, cPLA wiper, printed on its side | tang-r6 | **tang-r6** `tang-r6/files/src/05_design.js` `D.buildNeck` lines 38 to 94 | membrane-slider-wall | sensors/membrane-slider (planned, absent) |
| Toothed interdigitated touch-segment slider | gib | **gib** `part2.js` `buildTouch` from line 176, `sweepTouch` linearity | MISSING | MISSING |
| Skin-bridge slider with a swapped drive pair | baffle-r3, baffle-r2 | **baffle-r3** `baffle-r3/files/src/model.js` `sliderArt` from line 344 | candidate (CANONS 8.3) | MISSING |
| Printed rotary pot: cTPU arc on split pads, cPLA collector, leaf-spring spider rotor with bumps | tang-r6, blocks (KNOB), thinpot (`wiper`) | **tang-r6** `04_design.js` from line 194 (`arcBand`) and `D.buildRotor` | printed-rotary-pot | sensors/rotary-pot (planned, absent) |
| Detent selector knob (electrical sectors only, no mechanical click) | blocks | **blocks** `parts.js` lines 1044 to 1153; for a printed click use knurl or cotter below | MISSING | MISSING |
| Wedge-pair slider on copper | vernier, keyway, stave, coffer (S3) | **vernier** `gen_vernier.py` `wedges()` | wedge-pair-slider | sensors/wedge-slider (planned, absent) |
| Arc slider | quadrant, spline, tessera, coffer (A3) | **quadrant** `quadrant/files/gen_quadrant.py` (record 5.2) | arc-slider | sensors/arc-slider (planned, absent) |
| Graded wedge slider with a top copper wiper | keyway | **keyway** `gen_keyway.py` (record 5.3) | graded-slider-wiper | sensors/graded-slider (planned, absent) |
| Four-phase resolver dial | coffer | **coffer** `gen_coffer.py` `tile_D1` lines 168 to 208 | resolver-dial | sensors/resolver-dial (planned, absent) |
| Trace template generators (wheel sectors, interleaved slider, spiral coils, mutual rows and columns, self-cap grid, four-wire resistive) | tracelab | **tracelab** `tracelab/files/TraceLab_Explorer.html` `GENERATORS`; the record lists generator defects to fix first | candidate (seed, tier inferred) | MISSING |

## 4. Conductors, stacks, routing and the read

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Buried two-layer trace stack with posts, vias and the separation radius rule | pip, gudgeon, toggle, blocks, boss, tang-r6 (face-as-board) | **pip** `model.js` lines 26 to 51 (conductors per net) and `geom.js` `GEO.stroke` lines 102 to 115 | buried-trace-stack | conductors/buried-trace-stack (planned, absent) |
| Per-net union, decompose and minGap net check (manifold route) | pip | **pip** `model.js` lines 268 to 285 | MISSING | MISSING |
| Union-find net check over conductive prisms, OPEN and SHORT (prism route) | blocks, boss, feeler-v1, thinpot (`Ctx`), tang-r6, baffle-r3 | **blocks** `kernel.js` lines 366 to 394 and `parts.js` lines 61 to 87 | MISSING | MISSING |
| Print bleed allowance: conductive edges drawn back by bleed/2 | pip | **pip** `model.js` lines 26 to 29 and every `bleed` use in sections 5.1 to 5.5 of the record | MISSING (HAFT-only candidate behind D-084) | MISSING |
| Two-layer negotiated-congestion router (PathFinder style, Prim trees, via cost, history) | pip, toggle, gudgeon (H/V A*), blocks (A* with rip-up), boss | **pip** `pip/files/haft-src/src/router.js` (turn cost lines 86 to 102, rip-up lines 195 to 226); add TOGGLE's assignment DP, lead bending and one-then-two-layer escalation from `toggle/files/src/src/part2c.js` and `part2d.js` lines 121 to 260 | MISSING (D-092 names PIP as the core) | MISSING |
| Face as board: a plate that is a two-layer board with pads on top | tang-r6 | **tang-r6** `04_design.js` `D.buildFace` from line 91 and `D.faceStack` line 47 | face-as-board | conductors/face-as-board (planned, absent) |
| Band kernel: CrossSections swept between layer lines, slots disjoint and summing to the solid | baffle-r3, baffle-r2 | **baffle-r3** `model.js` `derive()` and `makeGeo` from line 163 | MISSING | MISSING |
| Charge-and-release read: per-key path resistance, tau, settle, reject threshold, droop | pip | **pip** `model.js` from line 451; drive readouts `bench/part3.js` line 312 | read model `charge-release` (D-078) | MISSING |
| Pull-up read with a computed E12 resistor and the internal pull-up trap | toggle | **toggle** `part2b.js` lines 258 to 295 and `part4.js` lines 253 to 297 (HOOKUP) | MISSING (CANONS fixes 470k as declared) | MISSING |
| Undefined-band pull-up verdict | boss (origin), blocks | **boss** `boss/files/boss-src/src/app2.js` line 236 with `test_sim2.js`; BLOCKS table recomputed in the blocks record 5.23 | MISSING | electrical/blocks-pullup-band (planned, absent) |
| DC MNA solver with switch, trim, force, pot, LED, touch and board pin modes | blocks, boss | **blocks** `sim.js` lines 66 to 157 (fix the missing rotary and pass branches first) | MISSING | MISSING |
| Firmware emitter (Joystick HID, scanOnce, two waits, self test) with GUARD_US and the measured key wait | pip | **pip** `bench/part2.js` `firmware()` lines 206 to 339 plus `pip/files/pip-controller/firmware/pip/pip.ino` lines 63 to 81 (GUARD_US) and `pip_stick.ino` lines 118 to 162 (raw mode) | MISSING (CANONS 3.1 correction row only) | MISSING |
| Bring-up probe (FLOAT, CAP, DRIFT) and flash, keys, mon tools | pip | **pip** `pip-controller/firmware/pip_probe/pip_probe.ino` and the repo `flash`, `keys`, `mon` scripts | MISSING | MISSING |
| Electrical test coupon on the same stack (trace runs, layer crossing, split widths, bump pair, flex key, click spring) | pip | **pip** `pip/files/haft-src/src/coupon.js` cells lines 45 to 150, card lines 200 to 246 | MISSING | MISSING |
| Wiring drawing generator | pip | **pip** `bench/part2.js` `wiringSvg` lines 342 to 391 | MISSING | MISSING |

## 5. Seats, terminals and printed connectors

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| RP2040-Zero seat: castellation pad table, press-fit bumps, header sockets, wire cups, back window, USB notch, anti-smear slots, datum corner, grip ledge | pip, gudgeon (header-pin cups), baffle-r3 (rp2040zero_r1 row) | **pip** `model.js` lines 180 to 248 with `layout.js` `zeroPads` line 10 and line 39 | rp2040-zero-seat (options MISSING as entries) | seats/rp2040-zero-pressfit (planned, absent) |
| Header-pin cup seat with straight escape stubs | gudgeon | **gudgeon** `05_part2d_circuit.js` lines 9 to 27 and `06_part2e_compose.js` lines 165 to 166 | variant inside rp2040-zero-seat | MISSING |
| Board-table driven seat (ten boards, pad maps, sense kinds, standoff and back-clearance rules) | baffle-r3 | **baffle-r3** `model.js` `BOARDS` from line 27 and `applyBoard` from line 138 | MISSING | MISSING |
| Board carrier seat: autosize to the pin set, perimeter targets, press mount, snap frame with bumps, presser ribs, barbed hooks and a pinned lid | blocks, boss, baffle-r2 (C3 bump seat) | **blocks** `parts.js` lines 222 to 344 (BLOCKS `prismY` fixes the BOSS hinge knuckles that land under the body) | blocks-board-seat | seats/blocks-seat (planned, absent) |
| Edge rails on a centre fin: board slides in edge first with 0.2 mm slot clearance, rails grow off the plaque, board height found by searching the cavity; speaker tray placed at the lowest clear z with a 45 deg kerb and a throat grille | buck | **buck** `engine.js` lines 538 to 578 (ESP32-S3 and amp rails), 496 to 525 and 639 to 655 (tray) | MISSING | MISSING |
| Stud column: cTPU clutch ring, cPLA flange, post and stud; peg modes | blocks, boss, toggle (BLOCKS brick) | **blocks** `blocks.js` lines 168 to 226 | blocks-stud | conductors/blocks-stud (planned, absent) |
| Printed wire with peg caps and a fitted length | blocks, boss | **blocks** `parts.js` lines 565 to 710 and scene wiring `app2.js` lines 42 to 96 | blocks-wire | conductors/blocks-wire (planned, absent) |
| Press-fit bore dialect and header pin socket with a cPLA wiper tab | blocks | **blocks** `blocks.js` lines 144 to 166 and 229 to 245 | MISSING | MISSING |
| Solo terminals: header bores, wire bores or flush pads in a row; BLOCKS brick sockets | toggle | **toggle** `part2d.js` lines 60 to 114 and 429 to 433 | MISSING (inside tilt-stick) | MISSING |
| Conductive LEGO studs and a tile carrier with split collet sockets | baffle-r3, nacelle (plain stud rail) | **baffle-r3** `model.js` tile from line 770 | candidate (CANONS 8.3) | MISSING |
| Teensy socket block with conductive collars and PIN bars | tang-r6 | **tang-r6** `04_design.js` from line 263 (`D.pinPlan`) | MISSING | MISSING |
| Peg-into-socket press contact across two parts (neck joinery) | tang-r6 | **tang-r6** `03_design.js` line 57, `04_design.js` line 406, `05_design.js` line 242 | MISSING | MISSING |
| Six-edge port standard on a hex tile (pads, ground tabs, ground ring, mirror rule) | coffer | **coffer** `coffer/files/hexcore.py` lines 23 to 43 and 125 to 156 | coffer-port | surfaces/coffer-tile (planned, absent) |
| ESP32-C3 SuperMini carrier on copper (nested-L fans, channel trunk) | coffer (M1), spindle, splice | **coffer** `gen_coffer.py` `tile_M1` lines 210 to 290; tape form **spindle** `spindle/files/gen_board.py` | c3-carrier (candidate) | seats/c3-supermini (planned, absent) |

## 6. Copper tape, vinyl and board circuits

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Cut-sheet stack declaration with layer roles and cross-layer gates; staggered two-row clip field | keyway (owner of the family kernel), vernier, quadrant, spline, tessera, fret, stave | **keyway** `gen_keyway.py` generator skeleton and `svgpath.py` (record 4.1 to 4.2, 5.4 to 5.5) | MISSING | MISSING |
| Lane solvers: greedy two-condition fan, constraint-ranked solver, travel-ranked fan, zigzag ribbon, parked terminals, corridor escapes | quadrant, tessera, vernier, fret, spline, stave | **tessera** `tessera/files/gen_tessera.py` (constraint-ranked solver, record 5.4); others in their records section 5 | MISSING | MISSING |
| Vinyl dielectric faceplate | vernier, keyway, coffer | **vernier** `gen_vernier.py` (record 5.6) | MISSING | MISSING |
| Switch body as the single crossing bridge, with a theta-graph non-planarity proof | shim | **shim** `shim/files/gen_board.py` (record 4.2) | MISSING | MISSING |
| Ladder routing rule and weedability on vinyl copper | splice, spindle | **splice** `splice/files/splice-c/splicec-3d.html` geometry and the rev C copper SVG (generator not harvested) | MISSING | MISSING |
| NPN low-side laser switch on tape | splice | **splice** (record 4.1) | npn-low-side-tape (candidate) | MISSING |
| Low-side MOSFET laser switch with a boot-safe gate and an armed LED | trunnion, spindle (R1) | **trunnion** `trunnion/files/trunnion.kicad_pcb` and `trunnion.ino` `setup()` | mosfet-low-side-gate (candidate) | boards/trunnion (planned, absent) |
| Two-transistor astable blinky | tack, shim | **tack** `tack-rev-a.zip` `pin.py` (`run_gates` lines 323 to 398) | astable-blinky-tack, astable-blinky-shim (candidates) | boards/tack-pin (planned, absent) |
| Gerber X2 writer, Excellon, CPL, and an independent reparse | shunt, tack, spindle | **shunt** `shunt/files/gen_fab.py` and `check_fab.py` | MISSING | exports/gerber-fabset (proposed) |
| Board face convention (position mirror against glyph mirror) and mirror-distinguishable silk | shunt | **shunt** `sim.html` viewer construction (record 4.9) | MISSING | MISSING |
| KiCad footprint pads parsed, never retyped, with a placement transform | tack, shim, shunt, spindle | **tack** `pin.py` `load_pads` line 48 and `place_pad` | MISSING | MISSING |
| Pi HAT carrier with a 1S power path, soft power latch, stereo I2S amps and a NeoPixel level shift | lug, grommet | **lug** `lug/files/lug.tsx` (power path line 149, latch line 169, amps line 180) | pi-hat-carrier, soft-power-latch, i2s-amp-pair (candidates) | boards/lug-pi-hat (planned, absent) |
| QFN footprint generator with corner clearance | lug, grommet | **lug** `lug.tsx` `QfnFp` from line 33 | MISSING | MISSING |
| Meander antenna, NTC isolation tab, gated boost heater switch, coil EMF and E-field front ends | auger | **auger** `auger/files/src/footprints.tsx` and `auger.board.tsx` (record 4.4 to 4.5); the board does not route | MISSING | MISSING |
| Board-to-enclosure derivation by offsets | auger | **auger** `auger/files/case/auger-geom.scad` and the GEO stage (record 4.9) | MISSING | MISSING |
| Three-source power OR-ing | armature | do not port until the netlist defects in the armature record section 5.8 are fixed | three-source-power-oring (unproven) | none |
| Vinyl copper routing for Eurorack modules with a single-sided DRC | kerf-eurorack | **kerf-eurorack** `kerf-eurorack/files/kerf-eurorack.html` (record sections 5 and 6; the DRC misses collinear overlaps) | MISSING | MISSING |

## 7. Hinges, latches, snaps and threads

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Print-in-place knuckle hinge with one continuous flatted rod (parity swap, anchored rod) | knuckle, gudgeon, locket, coaming | **knuckle** `knuckle/files/src/part4.js` `buildHinge` lines 189 to 219 and `derive` lines 11 to 103 | MISSING (CANONS 8.3, hinge kind) | joints/knuckle-hinge (planned M10, absent) |
| Hinge fold sweep check | knuckle, gudgeon, slate | **knuckle** `part4.js` `sweepCheck` lines 221 to 234 | MISSING (CHECKS 9.9 waits) | MISSING |
| Three knuckle barrel hinge on a printed D pin | slate | **slate** `slate/files/slate-r6.html` `ST.hinge`, `knuckleHalves` | candidate (CANONS 8.3) | MISSING |
| Gooseneck latch | slate | **slate** `slate-r6.html` `ST.latch` | candidate (CANONS 8.3) | MISSING |
| Nub latch; alignment lip and groove | locket, pip (bezel lip and groove) | **locket** `locket/files/src/build.py` `latch_parts`, `lip_parts` | MISSING | MISSING |
| Disc magnet pockets (glue or sealed with a pause layer) | knuckle, sash | **sash** `sash/files/src/src/part2.js` `magnetPositions` lines 246 to 254; case form **knuckle** `part4.js` `buildBezel`, `buildFlip` | MISSING | MISSING |
| Bayonet with ramp preload and detent gate | tenon, cask, pintle (retainer bayonet with hard stop) | **tenon** `tenon/files/src/src/part2.js` `grooveGeom`, `grooveField`; **pintle** `pintle/files/src/pintle_parts.py` lines 154 to 164, 359 to 370 and 449 to 475 for the printed detent and hard stop | MISSING (`bayonet` kind, D-059) | joints/bayonet (planned, absent) |
| Two-start thread breaks | tenon | **tenon** `part2.js` `extThread`, `intThread` | MISSING (`thread` kind) | MISSING |
| Phase-referenced single-start round thread | sparger-w | **sparger-w** `sparger-w/files/source/sparger_r.py` `thread` lines 115 to 124 | MISSING | MISSING |
| Cantilever snap tongue with relief slots and a strain check | plinth | **plinth** `plinth/files/plinth.html` `DEF.snap` (strain at lines 2928 to 2929 per CANONS 2.2) | snap-tongue-relief (candidate) | MISSING |
| Finger collar faceplate; crush rib plugs; holster spring tab | locket | **locket** `build.py` `build_faceplate`, `open_ports` and `build_plug_icon`, `build_holster` | snap-finger-collar, snap-press-plug-ribs, snap-holster-tab (candidates) | MISSING |
| Vee-finger snap cage with an uncut belt | detent | **detent** `detent/files/revD/detent_parts.py` `vee`, `_fingers`, `shell()`, `hood()` lines 336 to 366 and 709 to 867 | snap-vee-finger-cage (candidate, D-202) | MISSING |
| Barbed snap tabs into a wall groove | knurl | **knurl** `knurl/files/knurl.html` lines 650 to 654 and 1022 to 1029 | MISSING | MISSING |
| Belly snap with a crush rib | pintle | **pintle** `pintle_parts.py` lines 171 to 174, 371 to 376 and 479 to 502 | MISSING | MISSING |
| In-plane cantilever slide detent; thumb tab under a keeper rib; press-fit cover pegs with FDM loss | sash | **sash** `part2.js` `composeSlide` lines 571 to 640, keeper lines 597 to 598, pegs lines 233 to 235 | MISSING | mechanisms/slider-badge (proposed) |
| Dovetail rail with keyhole entry | cotter, pintle (output interface), derrick (female output) | **cotter** `cotter/files/cotter-src/src/geo.js` lines 134 to 144 and `modules.js` lines 36 to 42 | candidate (CANONS 8.3) | joints/dovetail-keyhole (proposed) |
| Peg hook rule with a configuration-space insertion proof | cotter | **cotter** `geo.js` `GEO.hookRule` lines 99 to 128 and `tools/hook_fit.py` search lines 44 to 71 | candidate (substrate part source) | MISSING |
| Captive TPU flexure joint with a dumbbell rivet | phaselock | **phaselock** `phaselock/files/extracted/phaselock_v1.scad` lines 71 to 86 and 138 to 155 | MISSING | MISSING |
| Pivot pin with a printed head and long lead-in barb; captured shaft hub | ogee16 | **ogee16** `ogee16/files/src/source/printed.scad` `a_pivot()` line 393 | MISSING | MISSING |
| Peg in a pinched-mouth post bore | ogee | **ogee** `ogee/files/ogee-source.zip` scad (record 4.3); superseded by the OGEE16 barb pin | MISSING | MISSING |

## 8. Springs, detents, counting and intermittent motion

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Separate cantilever detent strip on a fluted count wheel | knurl | **knurl** `knurl.html` `K.layout` lines 638 to 649 and `K.pawlDeflection` lines 1101 to 1110 | count-wheel-detent | mechanisms/detent-strip (planned, absent) |
| Three-slot external Geneva in closed form and a lock ring cut as the swept complement | knurl, tumbler | **knurl** `knurl.html` lines 588 to 599 and `K.geneva`, `K.sim` lines 674 to 685 | geneva-external (swept cut: backlog `sweepcut`) | mechanisms/geneva-3 (planned, absent) |
| Printed leaf-spring detent drum | cotter | **cotter** `cotter-src/src/modules2.js` lines 38 to 65 | candidate (CANONS 8.3) | mechanisms/leaf-spring-drum (proposed) |
| Flexure-finger click spinner with a press-fit knob | cotter | **cotter** `modules2.js` lines 67 to 81 | candidate (CANONS 8.3) | mechanisms/spinner-detent (proposed) |
| Laser click tab with spring prongs and keyhole slit roots; crush-nub press tooth | cotter | **cotter** `modules.js` lines 221 to 244 | candidates (CANONS 8.3) | joints/laser-click-tab, joints/crush-nub-tooth (proposed) |
| Printed leaf-spring detent on a grooved pin | tappet | **tappet** `tappet/files/tappet-r3.html` (`LEAF_L`, `LEAF_T`, record 4.2) | MISSING | MISSING |
| Displacement coincidence latch | ogee16, stipple, ogee | **ogee16** `ogee16/files/src/source/ogee16.scad` `p_rod()` line 68 and `params.scad` lines 80 to 87 | displacement-coincidence-latch | mechanisms/coincidence-latch (planned, absent) |
| Crank to yoke drive | ogee16, stipple | **ogee16** `params.scad` lines 151 to 152 and `kin.py` lines 130 to 132 | crank-yoke (candidate) | MISSING |
| Pin-free balance beam and bridged combs | stipple | **stipple** `stipple/files/stipple-r17b.html` `DATA.P` (record 4.1 and 4.4) | pin-free-balance-beam | joints/balance-beam, joints/bridge (planned, absent) |
| Rocker as a displacement summer, gravity ramp return | ogee | **ogee** `ogee.scad` `rocker()` line 17 | MISSING | MISSING |
| Jacquard griffe selection | tappet | **tappet** `tappet-r3.html` `physStep` | candidate (pivot-averaging coincidence display, CANONS 8.3) | MISSING |
| TUMBLER modules: coincidence AND to membrane valve | tumbler | **tumbler** `tumbler/files/tumbler.html` from line 613 (module start lines in CANONS 2.1) | eighteen typed entries | mechanisms/* (planned, absent except living-hinge in the handoff INDEX) |
| Capsule pocket rotor in a tangential spacer cage; integer metering ratio | slug | **slug** `slug/files/slug.scad` `rotor_ring()`, `rotor_top()` and lines 35 to 36 | capsule-pocket-rotor, integer-metering-ratio (candidate) | sheet/capsule-rotor-cage (planned, absent) |
| Printed three-roller peristaltic pump on bought bearings | sparger-w | **sparger-w** `sparger-w/files/source/sparger_w.py` `part_cup`, `part_lid`, `part_rotor` lines 139 to 178 | MISSING (backlog `peristaltic`) | mechanisms/peristaltic-3-roller (proposed) |
| Phase-programmed zig-zag rows (rigid-link singularity) | phaselock | **phaselock** `phaselock/files/phaselock_sheet_v1.html` lines 51 to 87 | MISSING | MISSING |
| Living hinge | tumbler, sketch (hinge entity) | **tumbler** module at line 1392; sheet entity **sketch** `sketch/files/sketch.html` lines 574 to 587 | living-hinge | mechanisms/living-hinge (handoff INDEX) |

## 9. Robot joints, arms and motion

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Printed slew ring: journal plus thrust annulus; spline carries torque only | pintle | **pintle** `pintle_parts.py` lines 328 to 358 and 402 to 408 | slew-ring-joint (cite R6, not the R4 README) | joints/slew-ring (planned, absent) |
| Horn capture joint; insertable micro servo pocket; cup-on-boss axial journal | davit | **davit** `davit/files/src/lib.py` lines 174 to 197 and `parts_r4.py` lines 67 to 119 | MISSING | MISSING |
| Servo jaw on one axis: horn on one side, pivot screw on the other; jaw cut from the head skin with a gap-dilated twin and a swing wedge; arm inset found by sampling the head at swing and slide poses | buck | **buck** `buck/files/src/engine.js` jaw frame lines 233 to 271, arm inset 273 to 310, jaw 336 to 366, hinge pads 398 to 411 | MISSING | MISSING |
| Swept insertion pocket: each cutter hulled with a copy along the insertion direction (135 deg, up and back through the mouth); path proven by intersection volume at 1.5, 4, 8, 14 and 22 mm of travel | buck, davit (insertable pocket, straight) | **buck** `engine.js` lines 248 to 249, 352 to 364 and check 848 to 853 | MISSING (checks: CHK-ASM-02, -03, -10 second origin) | MISSING |
| Talking jaw drive: speech synthesis with a vowel-group syllable envelope, microphone RMS, wiggle | buck | **buck** `buck/files/src/app.js` lines 433 to 482 | MISSING | MISSING |
| Shield journal and teardrops that know which way is up | davit, detent, jib | **detent** `detent_parts.py` `wcut`, `teardrop`, `gable` lines 223 to 269; **davit** `lib.py` lines 49 to 81 | MISSING | MISSING |
| Gear-sector gripper | davit | **davit** `parts_r4.py` lines 245 to 296 | MISSING | MISSING |
| Two-mate arm composition and the cradle grip interface | derrick | **derrick** `derrick/files/src/arm_build.py` lines 27 to 55 and `arm_parts.py` lines 90 to 116 | MISSING | MISSING |
| Counterbalance band and static holding torque | derrick, davit, spool, jib | **derrick** `arm_build.py` lines 139 to 163 (regenerate `arm_ref.json` first) | counterbalance-band (candidate) | MISSING |
| Saddle and yoke on one square interface at any quarter turn; mate by face scored | spool | **spool** `spool/files/src/spool_parts.py` lines 102 to 203 and `route12.py` lines 7 to 52 | MISSING | joints/saddle-yoke (handoff INDEX) |
| Fork and D-hub; offset joint axes and the mout rule | pawl | **pawl** `pawl/files/src/parts.py` and `core.mjs` lines 17 to 43 | candidate (CANONS 8.3) | MISSING |
| Aileron differential with the exact horn solve | stanchion | **stanchion** `stanchion/files/stanchion.html` `solveHorns` lines 291 to 331 (page) and `src/cad.py` lines 217 to 282 | aileron-differential (stub: type it from solveHorns) | MISSING |
| Split clamp from one printed half used twice; PAD plus HORN mount pattern | stanchion | **stanchion** `cad.py` lines 93 to 132 | MISSING | MISSING |
| Horn as the only bearing between sheet parts; bowtie-key clamshell pipe clamp | jib | **jib** `jib/files/jib.svg` and `jib_mount.scad` | MISSING | MISSING |
| Two-level sphere proxy collision with calibrated masks; offline interference gate | davit, derrick, stanchion, spool, sparger-w | **davit** `src/pack_sim.py` lines 47 to 143 and `src/sweep.py` | MISSING | MISSING |
| Rapier world, PD servo loop, ankle torque balance and gait | pawl | **pawl** `core.mjs` lines 113 to 256 | MISSING | MISSING |
| Servo planner bound by servo physics, hermite segment queue, packed binary link | washer, detent (stepper queue) | **washer** `washer/files/rig/laser-rig.html` lines 3729 to 4470 and `rig/PanTiltLaser.ino` lines 358 to 815 | MISSING | MISSING |
| Motor law, mixes, dead-man and arm safety over BLE, CLASP and serial | sprocket | **sprocket** `sprocket/files/sprocket_fw/sprocket_fw.ino` lines 51 to 115 and 330 to 378 (record 5.2 to 5.6) | MISSING | MISSING |

## 10. Cases, shells and sheet construction

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Clamshell walls as notched rings and a round screen bay | gudgeon | **gudgeon** `07_part2f_build.js` lines 46 to 66 | MISSING | cases/gudgeon-clamshell (handoff INDEX) |
| Tray walls as planar bars with apertures; stepped bezel chamfer; acrylic panel pocket | knuckle, coaming, pip (bezel) | **knuckle** `part4.js` `buildTray` lines 237 to 316, `buildBezel` lines 319 to 420, `buildFlip` lines 423 to 463 | MISSING | cases/flip, cases/clamshell (proposed) |
| Folding deck case archetypes over shared builders | coaming | **coaming** `coaming/files/coaming.html` `buildFold`, `bezelPlate` | MISSING | cases/coaming-fold (handoff INDEX) |
| Traced mark as a case outline by signed distance; auto-fit; farthest point posts | cresset | **cresset** `cresset/files/cresset.html` `planCase`, `autoFit` | MISSING | MISSING |
| Shell from analytic edge spans with corner pinch passes; GPIO hatch with detents; board STL clash | plinth | **plinth** `plinth.html` `planCase`, `fixDiag`, `fixZDiag`, `boardClash` | MISSING | MISSING |
| Keyed bayonet cap, registration collar with breakaway rings, BVH fit report | cask | **cask** `cask/files/cask_bench.html` `derive`, `buildRibs`, `fitReport` | MISSING | MISSING |
| Revolve kernel with radial feature fields | tenon | **tenon** `part2.js` `Prof`, `build` | MISSING | MISSING |
| Organic shell as a signed distance field (ellipsoids and round cones, smooth min, posed by tilt) grown by `Manifold.levelSet`, simplified and cached by shape key | buck | **buck** `buck/files/src/sdf.js` `makeHead` lines 30 to 60; `engine.js` lines 183 to 231 | MISSING (no SDF route in the D-053 union; owner decision D-230) | MISSING |
| Hollow shell printed rim down: cavity roof and cheeks capped with 45 deg planes found by scanning the field; inside bosses ramped 45 deg by hull | buck | **buck** `engine.js` lines 197 to 214 (caps) and 394 to 397 (`rampBoss`) | MISSING (generator for what CHK-SHP-03 checks) | MISSING |
| Slide-on audit: head first surface and fixed bodies rasterised at 0.4 mm along the slide axis, overlap per cell under 0.05 mm; fin profile cut to the same rule | buck | **buck** `engine.js` lines 910 to 948 (audit) and 613 to 631 (fin cut) | MISSING (candidate, CHECKS.md section 9.9) | MISSING |
| Pegboard plaque: hook holes a whole number of inches apart on the 1 in grid, keyholes, locating lip under the neck rim, four rim screw bosses, trim inlay channel | buck, cotter (substrate, peg hooks) | **buck** `engine.js` lines 657 to 736 and rim bosses 412 to 431 | candidate (substrate part source, CANONS.md line 1240) | MISSING |
| Joints written once per edge (finger, tab and slot, through tab, cross lap, butt); kerf only at export | sketch, tumbler, eurorack-skiff, slug | **sketch** `sketch.html` lines 595 to 649 (`fingerCells`) and `offsetLoop` lines 939 to 954 | finger-joint (SKETCH cell rule differs) | joints/finger (planned, absent) |
| Tilted plate through plate | slug | **slug** `slug.scad` lines 270 to 279 | MISSING | MISSING |
| Egg crate half lap and stencil lamination | gusset | **gusset** `gusset/files/gusset-v16.html` `tableModel` lines 546 to 618 | MISSING | sheet/egg-crate-table (proposed) |
| Eurorack rail hole rule and wedge cheek with tilt | eurorack-skiff | **eurorack-skiff** `eurorack-skiff-r7.html` `genRail`, `genCheek` | MISSING | MISSING |
| LEGO stud rail and anti-stud adapters | nacelle | **nacelle** `nacelle/files/scad/params.scad` `lego_island` and `lego_fit_test.scad` (the console SCAD has no greebles and no back vents, record 5.5) | MISSING | MISSING |

## 11. Faces, inlays and finish

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Face art composer with hygiene (stroke boost, open, despeckle, colour gap), arc text, images | collar, inlay, sprue, gudgeon, knuckle, coaming, sash | **collar** `collar/files/collar.html` `renderLayer` lines 990 to 1117 and `buildFace` lines 1126 to 1198 | MISSING (inlay kind at M03) | cosmetic/coin-inlay (handoff INDEX) |
| Blank shapes as implicit outlines with bisection | collar, inlay, sprue | **collar** `collar.html` `SHAPES` lines 668 to 721 | MISSING | MISSING |
| Edge profile registry r(theta, z) | collar, coin (reeded cutters) | **collar** `collar.html` `EDGES` lines 761 to 872 | MISSING | cosmetic/edge-profiles (handoff INDEX) |
| Rim band and edge spots | collar | **collar** `collar.html` `labelSlab` lines 1221 to 1258 | MISSING | cosmetic/casino-chip (proposed) |
| Sealed insert pocket with a computed pause layer | collar, coin, sash | **collar** `collar.html` lines 746 to 751 and 1208 | MISSING | kinds/sealed-pocket (proposed) |
| Flush multicolour inlay printed face down and mirrored | cask-caps, collar, sprue, scabbard | **sprue** `sprue/files/sprue.html` `SPRUE.build` lines 668 to 717 | MISSING | MISSING |
| Inlay a hair (0.004 mm) smaller than its pocket on every face so the mesh cleaner cannot make parts overlap (tongue, inner ears, nose, eyes, trim) | buck | **buck** `engine.js` EPSI line 142, tongue 367 to 386, trim 722 to 732 | MISSING | MISSING |
| Two-piece mark as flush inlay or mono deboss | cotter, gusset (applique) | **cotter** `modules.js` `applyArt` lines 24 to 35 | MISSING | cosmetic/flush-inlay-two-piece-mark (proposed) |
| Single-stroke label and mark inlay on a bezel | pip | **pip** `model.js` lines 301 to 363 with `src/font.js` | MISSING | MISSING |
| Elephant foot relief on bed-side skins; as-printed fit model | knurl | **knurl** `knurl.html` lines 981, 1014 to 1015, 1032 to 1036 and `K.checks` lines 1206 to 1221 | MISSING | MISSING |
| Recessed emblem badge with stepped chamfer and magnet backer for plating | escutcheon | **escutcheon** record section 4 (generator not found; third-party faces stay out per LICENSING 1.6) | MISSING | MISSING |

## 12. Kernels and exports

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Raster in XY, exact in Z with the pinch healer | toggle, inlay, sash, gudgeon, knuckle, knurl, collar (own mesher) | **toggle** `part2e.js` (lineage row `healer/toggle-part2e`) over `toggle/files/extracted/rastermesh.js` | kernel | MISSING |
| Constructive prism kernel, no CSG | gudgeon, knuckle, coaming, gib, tang-r6, blocks, feeler-v1, thinpot | **knuckle** `knuckle/files/src/part3.js` `K`; **gudgeon** `03_part2b_kernel.js` lines 12 to 38 | kernel | MISSING |
| Manifold memory discipline (wrap and flush) | pip, cotter (POOL) | **pip** `geom.js` lines 11 to 64 | kernel | MISSING |
| Export mesh clean after manifold `simplify(0.001)`: collapse zero length edges and flip zero area caps, keeping the mesh manifold | buck | **buck** `engine.js` `cleanMesh` lines 79 to 125 and `meshOf` 871 to 882 | kernel | MISSING |
| Single difference and batch-then-fold union | davit, pintle | **pintle** `pintle_parts.py` lines 234 to 261 | kernel | MISSING |
| Lathe mesher and cap texture heightfields | toggle | **toggle** `part2a.js` lines 58 to 153 | kernel | MISSING |
| Orca3MF project writer and validator | inlay (seed), toggle, blocks, tang-r6, baffle, knuckle, pip, collar (own), sprue (split model) | **inlay** `inlay/files/skill/print-forge/assets/orca3mf.js` and `scripts/validate_3mf.py` | kernel | exports/orca-3mf-roundtrip (proposed) |
| Shelf plate packer, MaxRects nest, lumber packer | pip, sprue, sketch, gusset, slug, derrick | **gusset** `nest`, `nestOnce` lines 1264 to 1313 and `packBoards` lines 1237 to 1262; plate **pip** `src/pkg.js` | MISSING | MISSING |
| Print orientation scorer and time model | derrick, ogee16, tenon (owner pose correction of 2026-10-05, record 5.9: evidence for a bed contact rule, no scorer) | **derrick** `src/orient.py` and `src/estimate.py` | MISSING | MISSING |
| DXF writers (R12 and AC1024) and kerf compensation | cotter, sketch, eurorack-skiff, slug, ogee16 | **cotter** `cotter-src/src/kit.js` laser DXF; kerf **ogee16** `cutfiles.py` `compensate()` | MISSING | exports/dxf-ac1024-lwpolyline (proposed) |
| Fits table with plain-word notes feeding warnings | pip, ogee16, knurl | **pip** `model.js` lines 510 to 611; classes **ogee16** `fits.py` | MISSING | MISSING |
| Constrained 2D sketch solver | sketch | **sketch** `sketch.html` `SKS` lines 1002 to 1998 | MISSING | MISSING |
| Viewer bake with int16 mesh packing | auger, davit, derrick, spool, stanchion | **auger** `auger/files/src/pack.ts` lines 1 to 38 | MISSING | exports/viewer-bake (proposed) |
| KiCad file parsed live in the viewer | trunnion, board-viewers | **trunnion** `trunnion/files/trunnion-layers-3d.html` `parsePCB` lines 6528 to 6905 (fix `e.value` to `e.target.value`) | MISSING | MISSING |

## 13. Bench UX patterns

The bar for the bench itself: a lit 3D stage, steps on a rail, a drive pad, a commit model, readable status, exports that reproduce the shipped files.

| mechanism | designs that contain it | port from | canon | reference |
|---|---|---|---|---|
| Welcome with three starts, four steps and an adaptive rail | pip, toggle, gudgeon, knuckle, coaming, cotter | **pip** `bench/part1.html` lines 193 to 400 and `bench/part3.js` lines 253 to 258 | UX | MISSING |
| PANES schema rail with show predicates | toggle | **toggle** `part4.js` lines 111 to 227 | UX | MISSING |
| Drive pad with spring back, hold toggle and pose | toggle, pip (chords, pick in view) | **toggle** `part3.js` lines 259 to 328; chords **pip** `bench/part3.js` lines 116 to 183 and 363 to 394 | UX | MISSING |
| Commit model: range previews on input, commit on change, debounce and deep undo | toggle, pip, collar, inlay, knuckle, cotter | **toggle** `part4.js` lines 209 to 228 and `part3.js` lines 11 to 54 | UX | MISSING |
| Composable xray, section, explode and plate views | pip, toggle, cask, sparger-w | **pip** `bench/part3.js` lines 116 to 232 | UX | MISSING |
| Art board direct manipulation and face editor | collar, inlay, sprue, knuckle, coaming, gudgeon | **collar** `collar.html` lines 2002 to 2062 | UX | MISSING |
| Error retention: last good model kept under an ERROR chip | toggle | **toggle** `part3.js` and `part4.js` (record 6.5) | UX | MISSING |
| BENCH hook for drives and tests | toggle, pip, cotter, blocks, collar | **toggle** `part4.js` lines 88 to 109 | UX | MISSING |
| Firmware UI on the device texture | auger | **auger** `auger/files/viewer/sim.js` (record 4.13) | UX | MISSING |
