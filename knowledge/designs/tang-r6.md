# TANG R6: how it is made

Slide instrument printed on one 256 mm plate in four filaments (PLA, conductive PLA, TPU 95A, conductive TPU) with no discrete resistors and no supports. The face plate is the circuit board, the neck is a printed membrane slider, the three knobs are printed rotary pots. The owner names this bench as one of the best. This record says how every part of it is built, from the original code, so a builder can make the next design the same way.

Number rule for this file: every constant is read from the source file and line named beside it (the bench default); figures marked computed were produced by the bench code or by hand from those constants; measured figures come from the gold drive run of 2026-10-05.

Folder: `fab-knowledge:originals/tang-r6/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | TANG R6 |
| slug | tang-r6 |
| canonical revision | r6_4, `~/Downloads/tang_r6 (4).html`, 2026-09-15 00:20, 1074782 bytes |
| sha256 | `9a12993fb5ebff4a2f4d577a4bf396698564cfc538cd213113cd4ed0332482eb` |
| copy here | `fab-knowledge:originals/tang-r6/files/tang_r6_4.html` |
| extracted sources | `fab-knowledge:originals/tang-r6/files/src/` (`00_shell.html`, `01_orca3mf.js`, `02_kernel.js`, `03_design.js`, `04_design.js`, `05_design.js`, `06_app.js`), cut from r6_4 by the downloads reader with three.js, JSZip, Clipper and earcut left out |
| exports | `fab-knowledge:originals/tang-r6/files/exports/` (3MF, print card, design json, two .ino, two wiring texts, all produced by the real export buttons in the gold drive) |
| headless rerun | `fab-knowledge:originals/tang-r6/files/runs/run.js` with outputs `r6_out.json` and `r6_0_out.json` |

### 1.1 Revision table

| label | file in Downloads | date | sha256 (first 16) | what changed |
|---|---|---|---|---|
| R1 | `tang_sim (5).html` (harvest `fab-work-directory:benches/tang/outputs/tang_sim.html`) | 2026-08-15 02:55 | `3f523b47805e34ed` | lasercut ply and Cricut copper; a different design, recorded in `fab-knowledge:sources/benches/benches-conductive-a.md` section 3 |
| R5 | `tang_r5_sim (13).html` and its zips | 2026-08-17 | `f251530457b2338c` | printed body, copper face, film sensor, see `fab-knowledge:originals/tang-r5/RECORD.md` |
| r6_0 | `tang_r6.html` | 2026-09-08 19:32 | `2ed6639361f82132` | first R6; optional printed pull-up meander (109.9 mm of 0.8 cPLA, 57.2 kohm computed) |
| r6_1 | `tang_r6 (1).html` | 2026-09-08 20:03 | `0888fa64f502b776` | socket moved, USB in a neck wall notch, meander removed from geometry (the UI chip stayed) |
| r6_2 | `tang_r6 (2).html` (= `(3)`) | 2026-09-10 13:44 | `00a3b807eeeeace1` | conductive pegs into neck sockets, waist and foot joinery |
| r6_4 | `tang_r6 (4).html` | 2026-09-15 00:20 | `9a12993fb5ebff4a` | design code byte identical to r6_2; `06_app.js:85` to `89` explode moves the neck out along its insertion path `[-34, 0, 16]` |

### 1.2 Why r6_4

It is the newest and it is good: the design modules equal r6_2 (checked with `cmp` by the downloads reader), which is the first revision with the peg and socket neck connection and the wall-notch USB. All four variants (cap, force, PIN mode, cPLA arc) build with face nets clean (160, 184 and 145 conductive prisms computed), neck nets clean (34 computed), 17 closed sub parts and everything on one 256 plate (`fab-knowledge:originals/tang-r6/files/runs/r6_out.json`). r6_0 is worse: higher lead resistance (pot swing 73.4 percent against 78.7 percent computed) and a meander that later revisions dropped.

## 2. What it makes and for whom

A maker with a four-head printer (FlashForge Creator 5 Pro preset) and a Teensy 4.0 prints a hand-held slide instrument: a 158 x 104 mm body, a 240 mm neck, six touch pads, three knobs and a speaker grille. Nothing but the audio amp is hand wired. The person picks a topology, adjusts the shell and the sensors, reads the electrical consequences in the rail, and exports a 3MF with every part assigned to its filament slot plus firmware and wiring text.

## 3. Shots

All at 1280 x 860 from the gold drive (`fab-knowledge:evidence/gold/tang-r6/drive/drive.js`), copied into `fab-knowledge:originals/tang-r6/shots/`.

| file | what it shows |
|---|---|
| `fab-knowledge:originals/tang-r6/shots/d-step1-mode.png` | step 1 MODE: iso cam, ghosted PLA body, white face with black hex pads and three knurled caps, pink TPU neck; rail with CONNECTION, PADS, POTS, SLIDE PRESSURE chips; status strip `158 x 104 x 30.2 mm, neck 240`, `142,128 tris`, `371 ms`, chips `nets clean`, `manifold`, `fits 256` |
| `fab-knowledge:originals/tang-r6/shots/d-tool-explode.png` | explode: face lifted 30 mm with the three pegs and the rotor spiders visible under it, caps lifted 52, neck pulled up and back out of its mortise |
| `fab-knowledge:originals/tang-r6/shots/d-step3-neck.png` | step 3 NECK, iso cam: NECK rows (length 240, width 30, thickness 12, tenon 18) and MEMBRANE SLIDER rows (air gap 0.6, TPU skin 0.8, cTPU track 0.8, track width 11, wiper width 6.8, rails 6, foot 7, waist 2, peg 3, socket 3.2) with the print-on-its-side note; the readout grid (track 358 kohm over 210 mm, swing 78 percent, press force 2.2 N, computed) sits below the fold and is not in the frame |
| `fab-knowledge:originals/tang-r6/shots/d-step4-pots.png` | step 4 POTS: the camera switches to `under`; arcs, collectors, rotor spiders and wiper leads on the face underside; readout arc 709 kohm, 3 in parallel 236 kohm, swing 79 percent (3222 counts) |
| `fab-knowledge:originals/tang-r6/shots/d-step5-pads.png` | step 5 PADS on the 2D board cam: blue L1, orange buried L2, purple cTPU arcs, red vias, black pads, green stops; Teensy pin names on the socket; RC readout 4.2 us untouched, 9.7 us touched |
| `fab-knowledge:originals/tang-r6/shots/d-step6-wire.png` | step 6 WIRE: pin map, CIRCUIT rho inputs, download .ino and wiring text |
| `fab-knowledge:originals/tang-r6/shots/d-step7-print.png` | step 7 PRINT on the plate cam: body upright, face pad side down, neck on its side with the pink membrane wall up, rotors and caps; materials rows and EXPORT with volume per slot |
| `fab-knowledge:originals/tang-r6/shots/d-checks-panel-with-failures.png` | the CHECKS list with SHORT and CLEAR rows naming nets and features after pads were pushed too close |

## 4. Mechanisms, circuits and constructions

Code locations below are in `fab-knowledge:originals/tang-r6/files/src/`. Line numbers are r6_4.

### 4.1 Geometry kernel: Clipper regions to constructive prisms

What it does: every solid is a list of prisms `{z0, z1, paths, slot, label, net}` where `paths` is a Clipper region in integer units. A part is meshed per slot by re-slabbing.

Construction:
1. 2D primitives in integer units, `SC = 1000` per mm (`02_kernel.js:10`): `rect`, `rectC`, `circle` with `segsFor(r) = clamp(ceil(6 r), 16, 96)` segments (`:18` to `23`), `roundRect` as a round offset of an inset rect (`:24` to `27`), `arcBand` annular sector (`:29` to `35`), `hexagon` by circumradius (`:36` to `39`), `stroke` of an open polyline with round joins and square, butt or round ends through `ClipperOffset` (`:41` to `46`).
2. Booleans `union`, `diff`, `inter` with nonzero fill (`:47` to `54`), `offset` round or miter (`:55` to `59`).
3. `exPolys` turns paths into outer plus holes and runs `cleanRing` to drop duplicates and collinear midpoints within 0.0005 mm (`:74` to `103`), because earcut skips collinear vertices while walls would not.
4. `meshPrism` (`:115` to `161`): triangulates a copy rotated by 0.3713 rad with a 0.1 um coordinate-hashed jitter so rows of holes on one y line do not produce slivers, takes the winding from the copy and keeps original coordinates; emits bottom cap reversed, top cap, then walls per ring.
5. `meshPart` (`:185` to `220`): collects every z breakpoint of a part, unions the footprints present in each slab, lifts each slab `DZ = 0.002` above the one below and welds them with a foot prism over the shared footprint from `z0 - EZ` to `z0 + EZ` (`EZ = 0.02`, `:11`). Result: one closed shell per slab, no coincident rings, the foot stays inside the part.
6. `manifoldAudit` counts open, over-shared and misoriented edges per mesh (`:171` to `183`); `signedVolume` flips inverted shells (`:162` to `169`, `:204`).

Limits and lessons: the jitter and rotation are the fix for earcut hole bridges on axis-aligned rows; collinear vertex removal must run before both caps and walls. The kernel runs in node (`root.K || require`), which is what makes headless reruns possible.

### 4.2 Face as board (canon face-as-board)

What it does: the 3.12 mm face plate carries two buried conductive layers, a pad layer and through vias, so pads, pots, socket and neck pegs are wired inside the print.

Layer stack, `D.faceStack` (`04_design.js:47` to `51`), at layer 0.24 (`03_design.js:28`):

| band | z from face underside | layers | content |
|---|---|---|---|
| L1 | 0 to 0.72 | 3 | traces, buses, pot arcs and collectors, peg pads, collars (underside) |
| sep | 0.72 to 1.20 | 2 | PLA with l12 vias |
| L2 | 1.20 to 1.92 | 3 | buried lanes, 3V3 bus and risers |
| sep2 | 1.92 to 2.40 | 2 | pad vias only |
| pad | 2.40 to 3.12 | 3 | hex pads or force combs (top face) |

Construction, `D.buildFace` (`04_design.js:91` to `445`):
1. Outline `D.outline` (`03_design.js:37` to `43`): rounded rect from `-L/2` to the tail centre, union a semicircle of radius `W/2` at `+X`.
2. Through holes (`04_design.js:106` to `121`): column holes 3.4, pot holes (6.5 printed or 7.2 real), grille arcs: rings from `grilleR0` 10 to `grilleR` 34 at `slotPitch` 6, slot width 3, four spokes with a gap angle `(slotW + 1) / (r + slotW/2)` rad.
3. Router DSL (`:54` to `88`): `trace(layer, net, pts, w)` strokes with square ends, `region(layer, net, paths)`, `via(net, x, y, kind)` square 1.6 vias of kinds `l12`, `padl2`, `padl1`, `meander(...)` serpentine resistor with `ends`.
4. Pads (`:126` to `174`): six hexes, circumradius `R` 7.8, rows `x` -53 and -32, columns `y` at `-pitch, 0, pitch` with pitch 16.5 (`03_design.js:21`). Cap mode: one solid hex per net `P0..P5`. Drive via positions per row form a staircase so L2 lanes never cross (`:162` to `173`).
5. Pot tracks on L1 (`:194` to `231`), see 4.4.
6. Buses (`:234` to `243`): GND south bus on L1 at y -48.5, 3V3 south bus and west riser on L2 at y -45, bus width 3.0.
7. Neck peg pads (`:246` to `258`): three L1 pads from `D.neckLandsWorld` (`:448` to `454`) at the tenon, 3V3 at `+landPitch` 9, W at 0, GND at -9.
8. Socket or bars (`:261` to `366`), see 4.6.
9. Pot stop blocks on the underside (`:369` to `374`).
10. Assembly into prisms, `bandRegion` (`:384` to `391`): per band, PLA region = outline minus through holes minus the union of that band's conductors; each conductor is pushed as its own prism with its net. L1 is split at `z = 2 L` when a pot arc end sits on a pad (lower and upper halves, `:415` to `420`). The sep band splits at the Teensy pin hole depth 0.96 (`:422` to `425`).
11. Everything is lifted by body height `H` (`:436` to `437`).

Constants (`03_design.js:24`, `:26`): trace 1.0, bus 3.0, clearance 0.8, via 1.6, Teensy pin hole 0.8 reaching 0.96 into the plate, collar 1.7, socket block 2.88 tall, block pad 3.3.

Net proof, `K.netCheck` (`02_kernel.js:249` to `286`): union find over conductive prisms of one part; same band pairs touch when `area(inter(offset(A, 0.01), B)) > 1e-7`; stacked pairs need real shared area over 1e-6 mm2; a component with two nets is SHORT, a net in two components is OPEN, two nets inside the clearance (offset each by `clear/2 - 0.001` and intersect) is CLEAR. Findings name the nets and up to six feature labels. `runChecks` adds resistor checks: each printed resistor must touch exactly its declared `ends`, and every resistor net must reach both ends (`05_design.js:217` to `234`); any conductor cut by a through hole is HOLE (`:237`).

Fits and print: face prints pad side down (`05_design.js:158`, print matrix `RX(180)`), so the pads land on the bed and the underside conductors are the last layers.

Limits: body length, width and wall move the shell but not the socket, pads or routing (gold note section 6); slider ranges are wider than legal and 16 of 46 params break a net at their range end (measured, gold drive phase b), and the checker names every one.

### 4.3 Capacitive hex pads and force combs

Cap mode: solid hex per net, read by RC charge time through the Teensy internal pull-up. Force mode (`04_design.js:137` to `160`, `:176` to `189`): each hex is inset 0.4; a drive spine 1.6 wide on the outer flat and a sense spine on the inner flat; `lanes` 5 fingers of width `finger` 1.5 on pitch `finger + gap` (gap 1.2), even fingers from the drive side, odd from the sense side, reach `2 (apo - 0.4) - spine - gap`; both combs are intersected with the inset hex. All sense combs join a 2.4 wide sense spine between the rows and go down one via to L2 and pin A9.

Readouts (`05_design.js:336` to `337`): drive lead per pad from the summed L1 and L2 drive trace resistances at cPLA 30 ohm cm; `tau = (22000 + leadMax) x 60 pF`, touched `x 140 pF`. At defaults: leads 23.9k to 47.2k, 4.2 us and 9.7 us, 2493 to 5816 cycles at 600 MHz (computed, `d-step5-pads.png`). The 22k pull-up and the 60 and 140 pF are bench assumptions in that line.

Firmware (`05_design.js:361` to `374`): `padTime()` discharges the pin 20 us, switches to `INPUT_PULLUP`, counts `ARM_DWT_CYCCNT` until the pin reads high (cap 200000 cycles); baseline is 16 samples; touched when `t > 1.5 x base`; the baseline tracks with `(31 base + t) / 32` when untouched.

Lesson: force mode emits `padForce()` but `loop()` calls only `padsScan()` (gold drive export `pinforce_ino__tang_r6.ino`), so the force read is never exercised.

### 4.4 Printed rotary pot (canon printed-rotary-pot)

What it does: a knob turns a conductive TPU leaf-spring rotor whose bumps ride a cTPU resistive arc and a cPLA collector ring on the face underside.

Track geometry (`04_design.js:194` to `231`), defaults `03_design.js:22`:
1. Arc gap centred at 270 deg (south, toward the wall). Arc spans `a0 = 270 + (360 - sweep)/2` to `a0 + sweep`, sweep 300, radius 6.5, width 1.0, `arcBand` with 64 segments.
2. Collector ring radius 9.5, width 2.0, sweep 270 on L1, net `PW1..PW3`.
3. End stubs radial from `arcR - arcW/2 + 0.3` to the 3V3 bus (y -45) and GND bus (y -48.5), width 1.0. Where a stub crosses the arc, the overlap is split: the lower half of L1 is arc material (`sub: 'lower'`), the upper half is a cPLA pad on the bus net (`sub: 'upper'`), so the flexible arc sits face to face on a rigid pad.
4. Arc slot 4 (cTPU) or 2 (cPLA) by `arcMat`.
5. Wiper lead north from the collector, 3 mm past its OD.

Rotor `D.buildRotor` (`05_design.js:97` to `121`):
1. Spider in slot 4: core disc `coreD/2 + 1.8`, a signal arm at 90 deg to `tipR` 12.5, two balance arms at 210 and 330 deg to `balR` 11.0, width 3.6, thickness `armT` 1.68, minus a square core hole `coreD` 4.
2. Bumps (domes) 2.2 wide and 1.92 tall: one on the arc radius and one on the collector radius at 90 deg, plus one on the collector at 210 and 330 deg, so the balance arms ride the collector and the rotor does not tip.
3. PLA core square through the spider, hub 9 dia, 1.44 tall, then a D shaft 6.0 with a 0.5 flat, length `face thickness + bore 8`.
4. Preload = bump top minus hub top = `(1.68 + 1.92) - (1.68 + 1.44)` = 0.48 mm (computed).

Cap `D.buildCap` (`:122` to `135`): 16 dia, 12 tall, twelve 1.0 radius knurl scallops, a pointer, a bearing ring two layers tall, D bore with 0.15 clearance and the flat at `+0.1`.

Stop block on the face underside (`04_design.js:369` to `374`): PLA arc band from `tipR - 0.6` to `tipR + 1.4` centred on 270 deg with a half angle of `180 - colSweep/2 + 4` = 49 deg (computed; the arm half angle is added and then subtracted again in the code, so it does not widen the block), `stopH` 2.4 deep. The signal arm at `tipR` 12.5 hits it; the balance arms at `balR` 11.0 pass under its inner edge (the balance corner check below).

Equations and readouts:
- arc ohms `rho x L / (w x t)` with rho 1500 ohm cm cTPU, L = 300 deg of r 6.5 = 34.03 mm, w 1.0, t 0.72: 709,040 ohm (computed, `04_design.js:443`).
- swing = `Rpar / (Rpar + lead3V3 + leadGND)` with the three arcs in parallel across shared leads (`05_design.js:321` to `326`): 236 kohm parallel, leads 25.4k and 38.7k, 78.7 percent, 3222 of 4095 counts (computed). cPLA arc: 14,181 ohm, 6.9 percent (computed).
- leaf force `F = 3 E I d / Lc^3`, `I = armW armT^3 / 12`, `Lc = colR - hubD/2` = 5, E 30 MPa: 0.49 N at 0.48 preload (computed, `05_design.js:299` to `301`).

Checks (`05_design.js:258` to `274`): bump centres inside their tracks, hub clear of the arc by 0.8, arc to collector gap 0.8, balance arm corners clear of the stop, pot pitch at least collector OD plus clearance, rotor sweep clear of the speaker.

Firmware: `potRead` maps between self-calibrated min and max (`05_design.js:397` to `400`).

Limit: at mid travel the wiper sees about 226 kohm (computed by the downloads reader from the bench leads), above the usual 100 kohm ADC source guidance; cTPU reads lower than cPLA only in this model (CANONS.md section 10).

### 4.5 Membrane slider on the neck wall (canon membrane-slider-wall)

What it does: the neck is printed on its side. A TPU skin with a conductive TPU strip on its inner face sits 0.6 mm from a cPLA wiper strip on the deck. Pressing the skin closes the gap; the strip is the resistive track, the deck strip is the wiper.

Box feature engine `boxParts` (`05_design.js:12` to `35`): features are axis-aligned boxes in the print frame (x along the neck, y depth from the deck, z across the width). Later features overwrite earlier ones; `cut` features remove from every slot; conductive features keep their own prism with a net so the checker sees them; the band breakpoints are every distinct z.

`D.buildNeck` (`:38` to `94`), defaults `03_design.js:23`:
1. PLA tenon 18 long (`tIn`) and `H + foot` deep, waist from 18 to 20 narrowed by 2 each side, beam 240 x 12 x 30.
2. TPU rails 6 wide on both edges with a 0.4 key, root and tip walls 1.2.
3. Membrane: TPU skin 0.8, TPU edges, cTPU strip 0.8 thick and 11 wide centred, air gap 0.6. Membrane cavity from `tenon + mstart` to `L - mstart` (3).
4. cTPU feet 2 mm long reach down from the strip ends onto a 3V3 pad (root, lower edge) and a GND pad (tip, upper edge), offset across the width so each foot clears the wiper strip.
5. Deck cPLA: 3V3 pad and lead, GND pad and return lead (1.5 x 1.2), wiper strip 6.8 wide biased 0.6 and 0.2 so both feet clear it.
6. Three cPLA lands 10 x 6 x 6 on the tenon top at 9 mm pitch, each with a 3.2 square socket 4.6 deep (`cut`).
7. World transform: print frame to local `(x, z - W/2, H - y)` then rotate 180 about Z and place at the mortise (`:90` to `91`).

Equations:
- track `rho_cTPU x trackLen / (condW x condT)`, trackLen = cavity minus the 2 mm feet = 210 mm: 357,955 ohm (computed, `:329`).
- swing = track over track plus both deck leads plus the face 3V3 and GND leads: 77.7 percent, 3182 counts (computed).
- press force `192 E I gap / span^3`, `I = condW t^3 / 12`, t = condT + tpuT = 1.6, span = W - 2 railW = 18, E 30 MPa: about 2.2 N (computed, `:293` to `297`).

Firmware two-phase read (`05_design.js:383` to `395`): discharge the wiper, float, read; under 12 counts is no touch; then enable `INPUT_PULLUP` and read again, `1023 - vb` is pressure.

Print: neck on its side so the 0.6 gap is an in-plane distance with no bridge (`05_design.js:159`, wiring text `:437`).

Limits: gap under 0.5 adds a second `membrane` check that makes `report()` throw (gold note 2.3); the SLIDE PRESSURE chips change nothing since r6_1; the firmware header prints `slider track on the undefined` (`S.neck.trackOn` absent, `:350`).

### 4.6 Teensy socket block and PIN bars

TEENSY mode (`04_design.js:263` to `321`): a PLA block 2.88 tall under the face spanning the Teensy 4.0 footprint plus 3.3; 28 pin holes 0.8 dia on 2.54 pitch rows 15.24 apart (`D.pinXY`, `:22` to `24`), reaching 0.96 into the plate; cPLA collars 1.7 dia around every used pin, full block height, each on its net. Pin plan `D.pinPlan` (`:31` to `37`): pads on pins 7, 8, 9, 12, 11, 10; pots A4, A1, A0; neck wiper A8; force sense A9. Drive lanes: three west pins go up, via, east on L2; three east pins go east on L1 then via; six L2 lanes drop in a staircase (`laneX` -33.5 to -20.5, `yLevel` 42.6 to 47.0) into the pad vias. USB faces `-X` into a notch in the neck wall (`03_design.js:70`), usbY 32.5, 16 wide, 14 tall.

PIN mode (`04_design.js:322` to `366`): 12 or 13 cPLA bars 3 x 10 x 2.4 at pitch 4 starting at `bar.x0` -74, with an extra 3 mm gap before P3 (the first B row pad, so the A and B pad groups separate) and before PW1, each with a 0.9 pin hole 2.8 north of the bar centre and a 1.5 screw pilot 0.6 south of it; order GND, 3V3, [SNS], NW, P0 to P5, PW1 to PW3. Pad drive lanes ride L2 north from the pad vias, jog east at y 22, 24.5 and 27 (A1/B1 lowest, A3/B3 highest) and drop through an l12 via 1.5 mm inside the bar's south end; pot wipers ride L1 on shelves at y 29.7, 27.9 and 26.1.

Checks (`05_design.js:278` to `291`): USB connector face within -1.5 to 0.5 of the wall inner face and inside the notch; at least 6 mm of wall between mortise and notch; Teensy bottom above the floor plus 2; socket block clear of the corner column by 0.8.

Lesson: PIN mode firmware still emits Teensy pin numbers.

Teensy pin map (`04_design.js:7` to `24`): the board hangs component side down with its pins up into the face, so seen from above the digital column is the +Y (north) row and the analog column the -Y (south) row facing the pads; `i = 0` is the USB end; pin centres are `socket.x - 17.78 + 1.27 + 2.54 i` and `socket.y +/- 7.62`. The south row runs VIN, GND, 3V3, then 23 down to 14 (A9 to A0); the north row runs GND2 then 0 to 12. Pot wipers ride L1 straight into the analog row on shelves at y -17, 18.8 and 21.2; 3V3 leaves by a south stub, an l12 via at y 21.5 and a 2.0 wide L2 link to the west riser; GND runs L1 west past the VIN hole, drops through a via at y 16 and rides a 2.0 wide L2 riser down the wall side to the L1 GND riser at y -20.

### 4.7 Neck joinery and conductive peg contacts

Body side (`03_design.js:57` to `95`): open mortise `N.W - 2 waist + 0.4` = 26.4 wide (computed) through the neck wall from `H - N.H - 0.4`; cradle block under the tenon foot to `H - N.H - foot - 0.4`, two cheeks 2.0 wide boxing the tenon to `H - 4`, all fused to the wall; walls built as z bands between floor, cradle, cheek, notch, USB and rim heights.

Face side (`04_design.js:406` to `412`): three cPLA pegs 3.0 square, 4.0 tall snapped to the layer, with a 2.4 square tip three layers tall.

Neck side: 3.2 sockets 4.6 deep in 6.0 tall lands, so the floor under the socket is 1.4 conductive (computed).

Check text (`05_design.js:242` to `256`): pegs line up within 0.01; slack `socket - peg` = 0.2 (computed); under 0.1 is a NOTE (press fit); socket floor under 1 mm is FIT; the joinery line reads as an assembly instruction (waist stops it going in, full width tenon stops it pulling out, foot rests in the cradle, face pegs lock it down).

Assembly: drop the neck into the open mortise foot first, then lay the face on; the pegs carry 3V3, W and GND into the neck.

### 4.8 Body shell, columns, speaker and grille

`D.buildBody` (`03_design.js:57` to `95`): floor 2.4 snapped; wall ring 2.0; six columns 8 dia with 2.6 pilots half embedded in the long walls (`D.columnPositions`, `:44` to `53`); wall bands cut by mortise and USB notch above their heights. Speaker 77.2 frame glued to the face underside with a two-layer locating ring `speakerD/2 + 0.7` to `+1.0` (`04_design.js:401` to `404`); cavity check `H - floor >= speakerDepth + 0.4` (`05_design.js:276` to `277`).

### 4.8a Audio path and firmware loop

The generated sketch (`05_design.js:401` to `413`) adds the only hand-wired part: a MAX98357A I2S amp on Teensy I2S2 (BCLK pin 4, LRCLK pin 3, DIN pin 2), soldered to the pin tails that stick up through the face. I2S2 is chosen because I2S1 would take pin 7, which is the A1 pad drive (comment at `:401` to `402`; wiring text `:424`). Signal chain: `AudioSynthWaveform` triangle at 0.4 amplitude, 220 Hz start, both channels into `AudioOutputI2S2`, `AudioMemory(12)`, `analogReadResolution(10)`, `analogReadAveraging(4)`. `loop()` runs `padsScan()` and `slideRead()` every 5 ms; when the slide is touched the pitch is `110 x 2^(2 slidePos / 1023)` Hz (two octaves over the neck, computed from the line); pot 1 sets amplitude `potRead(0) / 1023 x 0.6`. Pads and pots 2 and 3 are read but drive nothing in the sketch; the sketch is a bring-up test, not an instrument voice.

### 4.9 Plate packer and print reality

`D.packPlates` (`05_design.js:182` to `204`): each part's print-pose bounds; body, face and neck in a column at 6 mm margins, small parts in rows to the right; fits flag when any item crosses the bed. `D.snap` (`03_design.js:33`) snaps heights and floors to the layer; `D.normalize` (`05_design.js:138` to `144`) applies it before every build.

Print poses (`05_design.js:156` to `167`): body upright, face flipped pad side down, neck on its side, rotors flat bumps up, caps top down. Print card grams per slot at defaults: 260.9, 6.5, 13.9, 3.2 g (measured from the exported card, `fab-knowledge:originals/tang-r6/files/exports/card__tang_r6_print_card.txt`).

### 4.10 3MF writer and exports

`01_orca3mf.js` is the print-forge Orca writer: parts named `<PART> slot <n>`, extruders 1 to 4, filament colours from the materials panel, printer `Flashforge Creator 5 Pro 0.4 nozzle`, process `0.24mm Standard @FF C5` (`01_orca3mf.js:37` to `43`; the process does not follow a 0.20 layer). Shared rotor and cap meshes are one object with three instances (`06_app.js:229` to `245`). Exports (`06_app.js:249` to `259`): 3MF, STL zip with print card, wiring and .ino inside, print card, design json, .ino, wiring text.

## 5. UX anatomy

- Header: mark, `TANG.R6`, tagline, OPEN, SAVE, RESET (`00_shell.html:136` to `149`).
- Steps strip: MODE, BODY, NECK, POTS, PADS, WIRE, PRINT with a guide strip `STEP N NAME` plus one goal sentence (`06_app.js:208` to `220`).
- Per-step camera: POTS opens `under`, PADS and WIRE open `board`, PRINT opens `plate`, steps 1 to 3 return to iso (`06_app.js:219`).
- Stage: cams `iso top under front plate board`; tools explode, ghost body (0.28 opacity), face on/off, neck on/off, a cut range moving a clip plane (`06_app.js:52` to `102`, `:224` to `225`). Explode offsets per part along insertion paths (`:85` to `89`).
- 2D board view: canvas of the face with conductors coloured by z band, pin names, drag pan and wheel zoom 2 to 40 px/mm (`06_app.js:104` to `124`).
- Rail panes: topology chips (connection, pads, pots, slide pressure), CHECKS list with kind words; numeric rows label, range, number, unit; readout grids under NECK, POTS, PADS, CIRCUIT and EXPORT (`06_app.js:140` to `170`).
- Status strip: dims, tris, build ms, chips `nets clean` or `N electrical`, `manifold`, `fits 256` or `over the bed` (`06_app.js:133` to `148`).
- Hook: `window.TANG = { S, M, rebuild, setCam, orbit, applyCam, view, buildScene }` (`06_app.js:265`).

What makes it excellent (from the gold note, `fab-knowledge:sources/gold/tang-r6.md` section 5): the face is the board and the checker proves it on every build, naming nets and features; checks state passing values with numbers and read as assembly instructions; electrical readouts sit under the params that move them; the camera follows the step; a 2D board view sits inside the 3D bench; topology chips regenerate routing, pin map, notes, wiring, firmware and file names from one pin plan; print reality (layer snap, print poses, one-plate packing) is part of the geometry; exports are a kit; every sub part is audited manifold; design code runs headless.

Known UX flaws to avoid when porting (gold note section 6): readouts parsed from check text; dead chips (slide pressure); fields shown for the wrong topology; slider ranges wider than legal; range drag without preview; hook writes not syncing inputs; no undo or debounce; board view never framed; legend unreadable on the board; alert on a bad file; pink on too many elements.

## 6. Tests and harness

- Headless node rerun: `fab-knowledge:originals/tang-r6/files/runs/run.js` builds cap, force, PIN and cPLA-arc variants from `fab-knowledge:originals/tang-r6/files/src/` with the bench's own Clipper and earcut (outputs `r6_out.json`, 1.0 to 1.3 s per build measured by the downloads reader).
- Gold drive: `fab-knowledge:originals/tang-r6/files/runs/gold-drive.js` (puppeteer-core, phases a to d; logs and every shot in `fab-knowledge:evidence/gold/tang-r6/`). Measured: ready 2.6 to 4.2 s desktop, first build 363 to 496 ms, rebuild 275 to 441 ms, 3MF export 771 ms.
- In-page checks: `D.runChecks` (`05_design.js:207` to `310`).

## 7. Port map

| item | value |
|---|---|
| packages | geom (Clipper regions, stroke, arcBand), mesh (re-slab prism mesher, manifold audit), circuit (net union, resistor ends, readouts, read models), 3mf (Orca writer), checks, ui-core (composer, board2d view, per-step cam), chase |
| feature kinds | conductor, pad, port, contact (peg into socket, rotor bump on track, membrane), pocket (socket block, mortise, cradle), bore (pot holes, D bore), window (grille), boss (columns) |
| canon ids | face-as-board (proven), printed-rotary-pot (proven), membrane-slider-wall (proven; seed id printed-membrane-slider), capacitive-plate (proven, for cap pads), force-comb (proven, for force pads), printed-pullup-meander (candidate, r6_0 only) |
| canon MISSING | peg-into-socket press contact across two parts; open-mortise neck joinery with waist, foot and cradle; Teensy 4.0 socket block with conductive collars; PIN mode raised bars; RC charge-time pad read (read model gap, CANONS section 1.5); two-phase position plus pressure slide read |
| reference ids | conductors/face-as-board, sensors/rotary-pot, sensors/membrane-slider, sensors/capacitive-plate, sensors/force-comb (named in CANONS.md; no folder under `reference/` yet) |
| reference MISSING | none for the canon rows; joinery, socket block and bars have none |
| milestone | M06 (canons: face-as-board, printed-rotary-pot, membrane-slider-wall), M05 (circuit net check and readouts), M09 (bench shell, board2d), M10 (chase) |
| lineage row | MISSING (`lineage.json` has no TANG row) |
