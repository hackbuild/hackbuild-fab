# AUGER: how it is made

Record written 2026-10-05 from the original code. Slug `auger` (registry slug `ghost-pcb`, bench `ghost-pcb-auger`, chat "Ghost hunting PCB with spirit box"). A handheld paranormal instrument built as a tscircuit board with a parametric printed case generated from the same placement table, and a single-file 3D viewer that runs the firmware UI on the board's own round LCD.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Measured" means the headless drive of 2026-10-05 (Chrome with swiftshader WebGL, puppeteer-core, 1280 x 860) or a count taken that day from `out/auger.circuit.json`. "Computed" means a calculation shown here. "Vendor" means a distributor or datasheet value recorded in `SOURCING.md` (July 2026). "Inferred" means a reading of the code or a part value from memory that nothing in the folder checks. No generator was rerun (tscircuit, OpenSCAD and the node toolchain are not installed for this project).

Short paths: `F` is `fab-knowledge:originals/auger/files/`. `PL` is `F/src/placement.ts`. `BD` is `F/src/auger.board.tsx`. `FP` is `F/src/footprints.tsx`. `APP` is `F/viewer/app.js`. `SIM` is `F/viewer/sim.js`. `SCAD` is `F/case/auger-case.scad`. `GEO` is `F/tools/gen-case-geom.ts`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | AUGER rev B (silk says "rev B"; the board title, viewer header and README top half still say rev A) |
| owner's slug | auger |
| canonical source | the bench project `fab-work-directory:benches/ghost-pcb-auger/outputs/auger/` (src, tools, viewer, case, out) |
| canonical viewer | `F/out/auger-viewer.html`, sha256 8dcff79f69bb4b17ddc933daec8b3154ab8ae9cbff2f9f01bc62514909bde086, 2856502 bytes |
| circuit JSON | `F/out/auger.circuit.json`, sha256 4cc4f5792d800302e060008834eef651b9c91aa25e557e7644173999c95de6dd (the M08 known-bad fixture) |
| date | first download of the canonical viewer bytes 2026-07-30 15:41 (`~/Downloads/auger-viewer (12).html`), downloaded again as `auger-viewer (13)`, `(14)` and inside `~/Downloads/auger.zip` (members stamped 2026-08-01 21:04) |
| board | 96 x 208 mm, 74-point outline, 2 layer, 1.6 mm FR4, pink mask `#FE0386`, ink silk `#1a1a1a` (measured from the circuit JSON) |
| every hash | `fab-knowledge:originals/auger/SHA256SUMS` |

### 1.1 Every revision found

| when | file | what changed | role |
|---|---|---|---|
| 2026-07-28 22:35 | `~/Downloads/auger-viewer.html` | rev A wand, unrouted, ST7735, EC11, LiPo | superseded |
| 07-28 22:46 to 23:11 | `auger-viewer (1)` to `(4)` | ST7789, then the EVQWGD001 scroll wheel; 1208 to 1220 wire segments | superseded |
| 07-28 23:34 | `(5)` | live firmware UI panel added | superseded |
| 07-29 01:36 to 02:32 | `(6)` to `(8)` | CASE panel, 18650 replaces LiPo | superseded |
| 07-29 02:15 to 03:38 | bench uploads `Screen_Shot_2026-07-29_*` | owner screenshots; 03:38 shows the final round head with two shoulder tongues | reference |
| 07-29 03:48 to 07-30 12:26 | `(9)` to `(11)` | unrouted rebuild, then routed again | superseded |
| 07-30 15:41 | `(12)` = `(13)` = `(14)` = harvest `out/auger-viewer.html` | rev B round head, tongue meanders, thumbstick, final case | canonical |

The routed share of 0.1 mm wire segments is 85.8 to 90.4 percent in every routed build (computed by the dl-boards-tools reader, `fab-knowledge:sources/downloads/dl-boards-tools.md`).

### 1.2 Why this revision

It is the newest and the only one whose source is held: `src/`, `viewer/`, `case/` and `tools/` exist only in the bench folder, and the canonical viewer is the bake of exactly that source (its embedded circuit carries the 16-LED arc, tongues and RKJXV thumbstick of `PL`). The earlier viewers are steps of the same chat with no source. "Good" here has a limit: the board does not route (section 4.8). It is canonical as the design and the pipeline, never as a fab set.

### 1.3 What is in `fab-knowledge:originals/auger/files/` and what was left out

Kept: all of `src/`, `tools/`, `viewer/`, `case/` (including the 244 KB generated `auger-geom.scad`), `README.md`, `SOURCING.md`, `package.json`, `tsconfig.json`, `shot.py`, `shot2.py`, `out/auger-viewer.html`, `out/auger.circuit.json`, all 12 files of `out/gerbers/`, two case STLs (`out/case/auger-bezel.stl`, `auger-grip.stl`), two original renders (`out/renders/auger-iso.png`, `auger-case-exploded.png`), two owner uploads (2:15 and 3:38). Left out: `out/case.json` (1.1 MB int16 bake of the STLs, regenerable by `stl2json.py`), the other three case STLs (headback, arc inlay, battery door; in the bench `out/case/`), eight more renders, five more uploads, `node_modules` (three 0.160 is inlined in the viewer).

---

## 2. What it makes and for whom

A ghost-hunting wand in the hack.build voice for a maker who wants a real instrument on the bench at a con: a spirit box (Si4732 AM/FM/SW sweep receiver), three cheap EMF channels (coil, E-field disc, optional magnetometer), a sulfur gas can, an NTC cold-spot probe, a 1.53 in round 360 x 360 display, a 16-LED arc and a thumbstick. The silkscreen carries the stance: "AN INSTRUMENT, NOT AN ORACLE." and "GAS READING IS RELATIVE, NOT ppm." (`BD` lines 1058 to 1059). The styling references in the uploads are the Ghostbusters PKE meter and the Meshtastic SM1 shoulder with an SMA whip standing proud.

---

## 3. Shots

Driven headless 2026-10-05 from `F/out/auger-viewer.html` through the hooks `window.AUGER_SIM` and `window.__LAYER_IDS`; ready in 6.4 s; zero page errors (measured). Files in `fab-knowledge:originals/auger/shots/`.

| file | caption |
|---|---|
| `a01-iso-default-hunt-screen.png` | ISO at load. Left panel: wordmark, VIEW (FRONT BACK ISO EDGE SPIN, pink PNG), 22 layer rows with switch, chip and live count (traces top 627, bottom 695), EXPLODE, board OPACITY, CASE opacity. Stage: pink board with the round LCD showing the HUNT screen as a texture, the RKJXV stick with its pink cap, the MQ can, tongues with meander copper. Device card top right: the same LCD canvas with WHEEL, PUSH, MODE, MARK. |
| `a02-front-spirit-box.png` | FRONT preset after one MODE press: SPIRIT BOX screen on both the device card and the board display. |
| `a03-iso-exploded-62.png` | EXPLODE 62: mask, pour, traces, pads, silk and parts separate in z by group (offsets in section 5); EMF screen with the 60 Hz spike at bin 4. |
| `a04-back-copper-no-mask.png` | BACK preset with substrate, bottom mask, bottom silk and bottom parts hidden: the routed copper seen from behind, mostly 0.1 mm wire. The preset's fixed distance of 250 frames the handle and the neck side of the head; the far side of the head and both tongues fall below the 1280 x 860 frame (measured). |
| `a05-case-iso-exploded-78.png` | Case layers on, EXPLODE 78: pink bezel with the round window, LED diffuser arc and E-field ray slots lifted; grip, head back and battery door dropped below. |
| `a06-case-assembled-gas-screen-pick.png` | Case closed at EXPLODE 0, GAS screen with heaters ARMED (MQ-4 and MQ-135 bars): the assembled wand. |

---

## 4. Mechanisms, circuits and constructions

### 4.1 Pipeline and data flow

```
placement.ts (HEAD, DISP, ARC, HANDLE, SHOULDER, TONGUE, POS, MOUNT_HOLES)
   |-> auger.board.tsx (at(ref) spreads POS onto each part) -> build.tsx (RootCircuit.renderUntilSettled)
   |        -> out/auger.circuit.json -> tools/clean-traces.ts (drop off-board traces, in place)
   |        -> src/export.ts (circuit-json-to-gerber: 12 gerbers + PTH/NPTH)
   |-> tools/gen-case-geom.ts (clipper offsets) -> case/auger-geom.scad -> case/auger-case.scad -> STLs
   |                                                           STLs -> tools/stl2json.py -> out/case.json
   '-> src/pack.ts: template.html + three.min.js + slim circuit JSON + case.json + sim.js + app.js
                -> out/auger-viewer.html (one file, opens from file://)
```

Build order (README lines 220 to 226): `build.ts`, `clean-traces.ts`, `export.ts`, `gen-case-geom.ts`, `pack.ts`. The README calls the first `build.ts`; the file is `build.tsx`. Dependencies (`F/package.json`): tscircuit ^0.0.2172, circuit-json-to-gerber ^0.0.85, circuit-to-svg ^0.0.393, clipper-lib ^6.4.2, three ^0.160.0.

### 4.2 Board outline: round head, squared shoulders, antenna tongues, handle

`buildOutline()` (`PL` lines 28 to 73). Constants (`PL` lines 15 to 25): `HEAD {cx 0, cy 58, r 38}`, `HANDLE {halfW 15, yTop 8, yBot -94}`, `SHOULDER {xOut 48, y0 58, y1 90}`, `TONGUE {x0 36, x1 48, yTop 114, cham 3}`.

1. `cx(y) = sqrt(r^2 - (y - cy)^2)` gives the head circle's x at a height; `aHi`, `aLo` are the angles where the circle meets y 90 and y 58.
2. Walk the head circle from 90 deg down to `aHi` in 4 deg steps.
3. Right tongue: (36, 90), (36, 111), (39, 114), (45, 114), (48, 111), then the shoulder (48, 90), (48, 58).
4. Head circle from `aLo` down to -70 deg in 4 deg steps.
5. Handle with 4 x 8 mm chamfers at the butt (4 across, 8 along): (15, 8), (15, -86), (11, -94), (-11, -94), (-15, -86), (-15, 8).
6. Left side mirrored: circle 250 deg to 180 - `aLo`, shoulder, tongue, circle back to 90 deg.

Result: 74 points, extents 96 x 208 mm (measured). The tongue IS the antenna: the outline makes the shape and the meander is the element (`PL` comment lines 23 to 25).

### 4.3 Placement table and `at(ref)`

`POS` (`PL` lines 92 to 209) holds every part as `{x, y, layer, rot}`; `at(ref)` (`BD` lines 50 to 59) spreads it onto a component and throws `no placement for <ref>` on a miss, so a part cannot be placed by accident. The 16 arc LEDs come from `arcLeds()` (`PL` lines 77 to 89): `a = 162 + (18 - 162) i / 15`, at `(r 28.5 cos a, 63 + 28.5 sin a)`, `rot = round(a - 90)`. 14 M2 clearance holes of 2.2 mm (`PL` lines 212 to 227, `BD` line 702). The case generator reads the same file (section 4.9), so the shell cannot drift from the board.

### 4.4 Hand footprints (`FP`)

Built from raw `<smtpad>` and `<platedhole>` (helpers `P` and `TH`, `FP` lines 10 to 31). Every one is inferred tier ("VERIFY BEFORE FAB", `FP` lines 7 to 8).

| footprint | construction | lines |
|---|---|---|
| `Esp32S3Mini1Footprint` | 16 left pads at 0.8 pitch (1.5 x 0.6) from y 5.2 down, 11 bottom (0.6 x 1.5) from x -4, 16 right up from y -6.8, 5.5 x 5.5 GND pad at (0, -3); body silk 15.4 x 20.5 and an antenna line 6 mm under the top edge. 44 pads total; the real module has 65, so the pin numbering is invented | 41 to 112 |
| `MqSensorFootprint` | six 0.9 holes (1.7 ring) on r 5.0 at 60 deg steps from -90 deg; silk circles r 8.2 and 6.4 | 119 to 142 |
| `RoundLcd153Footprint` | 11 SMD pads 0.6 x 1.8 at 1.0 pitch from x -5 on the tail at y -24.5; silk circles body r 21.5 and active r 19.45; tail box 14 x 5 | 396 to 418 |
| `AntennaMeanderFootprint` (called with w 9, h 20, turns 10, trace 0.7 at `BD` lines 197 and 204; the footprint's own defaults are w 15, h 22, turns 9, trace 0.9) | `pitch = h / turns` = 2.0; per turn a horizontal pad `w x trace` at `y = h/2 - i pitch`, and between turns a vertical link pad `trace x (pitch + trace)` alternating right and left. Every pad carries port hint `ANT`, so tscircuit treats the meander as one pad group | 481 to 517 |
| `ThumbstickFootprint` (RKJXV1224005) | XA XW XB at x -8.5, YA YW YB at x 8.5 (y 5, 0, -5), PSW1 PSW2 at (-3, -9.5), (3, -9.5); two 2.2 holes; body silk 18.2 x 21.7 | 549 to 570 |
| `Holder18650Footprint` | POS and NEG 1.6 drill, 3.0 ring at y +34.5 and -34.5; two 2.2 holes; body 20.5 x 76 | 450 to 465 |
| `EFieldPadFootprint` | one circular SMD pad r 5, port `P` | 378 to 382 |
| others | ST7789 module, EVQWGD001 scroll encoder, SK6812-2020, microSD, JST-PH, two-pad TH, PJ-320A jack, whip tab, QFN-20, USB-C 16, Alps SKQU nav, AntTab, SMA edge (rev A and rev B leftovers, several unused) | 145 to 375, 421 to 446, 467 to 472, 525 to 541 |

Meander copper length is about 10 x 9 + 9 x 2.0 = 108 mm (computed) against a 765 mm quarter wave at 98 MHz (`FP` comment line 477): it hears strong local FM and little else.

### 4.5 Circuits as coded (`BD`)

| block | parts and nets | lines |
|---|---|---|
| MCU | ESP32-S3-MINI-1-N4 on the back of the head, 10 uF, 100 nF, EN RC (10k, 1 uF), IO0 boot pull-up 10k plus SW4 | 336 to 400, 787 to 803 |
| round LCD, QSPI | CLK IO15, D0 to D3 IO11 to IO14, CS IO16, RST IO17, TE IO18, BL IO21 | 805 to 816 |
| microSD on its own SPI | SCK IO33, MOSI IO34, MISO IO35, CS IO36 | 818 to 828 |
| receiver | Si4732-A10 in `soic16`; RCLK 32.768 kHz with 12 pF caps; FB1 600 nH plus 100 nF plus 4.7 uF; FMI through 100 pF to ANT1; AMI to the 40 mm loopstick L3 (TH pads 20 apart); LOUT also to IO4; RST IO42; SEN to GND; I2C IO47/IO48 shared with AHT20 | 144 to 215, 846 to 884 |
| EMF coil | 10 mH L1 into LMV324 stage 1 (1k/100k, AC coupled through C11 to the half rail), stage 2 (1k/100k), out to IO1. Gain 1 + 100k/1k = 101 per stage, about 10200 for both (computed) | 406 to 456, 941 to 964 |
| E-field | EPAD1 disc and ANT2 meander to IN3P, 10M bias R33 to the half rail, follower OUT3 to IO2 | 271 to 280, 966 to 971 |
| half rail | R14 100k / R15 100k with C13 10 uF: 1.65 V on 3.3 V (computed) | 450 to 456, 946 to 950 |
| mic | electret MK1 with 2.2k bias, 1 uF coupling, 100k to half rail, follower to IO3 | 457 to 470, 973 to 982 |
| gas | MQ-136 (comment says MQ-4) heaters through a high-side P-FET AO3401 Q2 (100k pull-up to V5V), driven by 2N7002 Q3 from IO39 through 10k; sense B1 with 10k load to IO7 | 217 to 236, 610 to 628, 778 to 785, 923 to 933 |
| cold spot | 10k NTC RT1 over 10k to IO6 (1.65 V at 25 C, computed); RT1 sits on a tab freed by two cutouts 1.4 x 12 at (-24.5, 53) and 8 x 1.4 at (-28.5, 47.5) | 258 to 269, 935 to 939 |
| power | TP4056 (PROG 1.2k, so 1200 / 1.2k = 1.0 A charge by the vendor formula), 18650, SS12D00 slide switch, ME6211 3.3 V LDO with EN tied to VIN, FP6291 boost enabled from IO40 only when heaters are armed (R60 30k, R61 10k), battery sense 100k/100k to IO5 | 576 to 696, 729 to 776 |
| LEDs | 16 SK6812-2020 on the arc from V3V3, data from IO37 through 330 R, chained DOUT to DIN | 315 to 331, 908 to 921 |
| haptic | ERM on V3V3 low-side through 2N7002 from IO41, 1N4148 flyback | 523 to 541, 984 to 992 |
| audio | PAM8302A `sot23_5` on V3V3, LC filters 22 uH plus 1 uF, 20 mm speaker, PJ-320A jack through 100 R | 475 to 552, 886 to 906 |
| pours | GND on both layers, `padMargin 0.35, traceMargin 0.35, boardEdgeMargin 0.4` | 997 to 998 |
| keepouts | 13 x 26 at each tongue (42, 101) and (-42, 101); 9 x 16 at the module radiator (-19, 62); 26 x 8 at the loopstick (0, 24) | 1001 to 1004 |

Netlist defects visible in the source, all inferred from the code and each a check the port must carry:

| defect | evidence | consequence |
|---|---|---|
| amp output never connected | `L4.pin1 -> U8.INP`, `L5.pin1 -> U8.INN` (`BD` lines 896 to 897); U8 has no output pins in `pinLabels` (lines 480 to 486) | the speaker hangs off the receiver audio input node (CHK-BRD-14 origin) |
| stereo into a mono BTL amp | `C50` LOUT to INP, `C51` ROUT to INN (lines 882 to 888) | the speaker would play L minus R |
| switched jack not switched | only TIP and SLV wired (lines 904 to 906) | README claim "cuts the speaker" is not built |
| PAM8302A in `sot23_5` | line 477 | the part ships in MSOP-8 or SOP-8 (inferred) |
| 5 V boost divider | FP6291 FB with 30k over 10k: 0.6 x (1 + 30/10) = 2.4 V with a 0.6 V reference (computed; the 0.6 V reference is inferred, not checked in this pass) | the "5 V" heater rail would sit near 2.4 V; same class as GROMMET's divider (CHK-BRD-12) |
| SK6812 on 3.3 V | lines 913 to 918 | SK6812 parts are usually rated from about 3.5 V (inferred) |

### 4.6 Route sanitiser (`F/tools/clean-traces.ts`, lines 1 to 31)

Ray-cast point-in-polygon over `pcb_board.outline` for every routed vertex (`inside`, lines 10 to 17); any trace with one vertex outside is deleted from the JSON in place. Rule from the header: "An unrouted net is honest; a trace running through air is not." It is a remedy, never a gate: it does not count what it drops against completion.

### 4.7 Gerber and drill export (`F/src/export.ts`, lines 1 to 31)

`convertSoupToGerberCommands(cj, {flip_y_axis: false})`, `stringifyGerberCommandLayers`, then Excellon twice (`is_plated` true and false). Output in `F/out/gerbers/`: F/B Cu, Mask, Paste, SilkScreen, F_Fab, Edge_Cuts, PTH, NPTH (12 files).

### 4.8 Routing state (measured from `F/out/auger.circuit.json`)

| quantity | value |
|---|---|
| components | 114 `source_component`, 400 SMD pads, 35 plated holes, 18 NPTH, 2 cutouts, 4 keepouts, 59 pour pieces |
| routed | 187 `pcb_trace`, 209 vias, 1322 wire segments |
| widths | 1178 at 0.1, 91 at 0.4, 20 at 0.6, 28 at 0.8, 5 at 1.0; the declared 0.8 mm power traces mostly did not survive (CHK-BRD-07 origin) |
| errors | 112 `pcb_trace_error` (58 "Could not find a route", 21 "Trace too close to board edge"), 21 `pcb_trace_missing_error`, 21 `pcb_port_not_connected_error` |

README lines 228 to 231: `AUTOROUTER=sequential-trace` is "the only one that completes on this board"; capacity and krt "run about ten minutes and terminate with ran out of iterations"; "164 nets are still open". The gerbers are of an unfinished board.

### 4.9 Board-to-case derivation (`GEO`, lines 1 to 122)

1. `offsetOutline(delta)` (lines 16 to 33): ClipperOffset (miter 2, arc tolerance 0.2) on the outline scaled by 1000, `jtRound`, closed polygon; a negative offset can split the outline, so keep the ring of largest `|Area|`.
2. Precompute every offset from -3.2 to +2.6 in 0.2 steps, 30 rings, emitted as `OFF_POLY`; SCAD's `board_poly(o)` picks `round((o - OFF_MIN) / OFF_STEP)` (`SCAD` lines 38 to 39). Doing `offset()` inside OpenSCAD on 74 points per band ran past ten minutes.
3. `clipBand(poly, y0, y1)` (lines 35 to 48) intersects with a 400 mm wide strip, so the grip is plain extrusions with no 3D intersection.
4. Bullnose: NB 12 slices, inset `BULL_R - sqrt(BULL_R^2 - dz^2)` at `dz = 5 i / 12` (lines 69 to 74).
5. Taper: NT 8 bands from y -14 to 2, heights `GRIP_H + (HEADBACK_H - GRIP_H) (i / 7)^0.8` = 22.5 down to 9.0 (lines 75 to 83), so the grip meets the head back flush.
6. Emit outline, offsets, head, display, arc, shoulder, antenna, mount and part positions as SCAD constants (lines 89 to 120).

### 4.10 Printed case (`SCAD`)

Constants (lines 17 to 35): `FIT 0.35, WALL 2.2, FACE 2.0, LAP 2.6, LAPW 1.4, SLIP 0.22, BEZEL_H 8.0, GRIP_COMP 3.0, CELL_H 19.5, HEADBACK_H 9.0, BULL_R 5.0, BULL_R2 2.6, SPLIT_Y 2.0, DIFF_T 1.6, DIFF_W 5.0`. Helpers: `ring` (two offsets differenced and extruded), `bullnose` (stacked insets), `boss` (od 5.6, id 1.75), `screw_cs` (2.4 bore to a 4.3 countersink), `arc_sector` (lines 38 to 74).

| part | construction | lines |
|---|---|---|
| bezel | band y 2 to 120 of: lap ring below the board, skirt ring, wall ring to 8, face plate, 2.6 bullnose, bosses, a collar r 21.9 to 24.1 that centres the round panel. Minus: window r 18.45 (1.0 overlap on the glass) plus a 1.2 rebate, the diffuser arc slot with a 1.2 wider rebate, the gas can bore 17.4 with an airflow chamfer to 20, a 0.9 membrane over the E-field disc with 12 ray slots 3.6 x 0.9 at r 9.4, four AHT vents, the NTC slot 7 x 4.5, the jack notch | 82 to 126 |
| arc inlay | arc sector 1.6 thick plus a 2.0 key 0.15 narrower per side; white PLA or 1.6 acrylic so 16 LEDs read as a bar | 130 to 136 |
| head back | lap ring with `SLIP 0.22`, wall to 9, bullnose, bosses; minus jack, five vents, card door, power switch | 142 to 163 |
| grip | flange, skirt, cell wall to 22.5, bullnose and taper bands from `auger-geom.scad`; minus battery door 24 x 74, USB-C 10.4 x 16 at the butt, stick bore 15.5, seven finger ridges d 5.4 at 8.5 pitch | 178 to 215 |
| battery door | 23.6 x 73.6 plate plus a 21.4 x 71.4 key, two countersunk M2, six grip ribs | 218 to 233 |

Measured sizes (README lines 140 to 144): bezel 79 x 88 x 9.4, head back 79 x 86 x 10.4, grip 41 x 87 x 15.8. All PLA, printed without supports in the exported orientation. Known issue (README lines 160 to 165): the microSD mouth sits inside the grip, so it gets a service door; rev B should move the socket to the butt or turn it 90 deg.

### 4.11 Viewer bake (`F/src/pack.ts`, lines 1 to 38)

Keep only 16 drawn element types (lines 13 to 20), then fill five placeholders with function replacers (lines 24 to 29). The comment records the bug: `String.replace` with a string replacement interprets `$&` inside minified three.js and corrupts it. Mesh packing (`F/tools/stl2json.py`): per-axis min and `scale = range / 65534`, int16 little endian, base64; about 0.005 mm precision and 450 KB instead of 2 MB (README line 176).

### 4.12 Viewer geometry kernels (`APP`)

| kernel | construction | lines |
|---|---|---|
| studio environment | 512 x 256 canvas: vertical cream gradient, two white softbox ellipses, a pink ellipse at 0.30 alpha, through `PMREMGenerator`; "without one, metalness reads as black" | 37 to 56 |
| substrate and mask | outline `Shape` with cutouts, NPTH and PTH as holes, `ExtrudeGeometry` depth 1.6; mask as two `ShapeGeometry` skins at +/-(0.8 + 0.11), opacity 0.88; pink edge line at +0.94 | 136 to 169 |
| pours | `brep_shape` outer ring plus inner rings as holes, at +/-0.85 | 171 to 179 |
| traces | per segment a rotated rect of length `len + w`, plus a 10-gon at each joint so corners do not notch; all merged per side into one `ShapeGeometry` at +/-0.89; vias as cylinders | 182 to 212 |
| pads | circle, polygon, rotated_rect, rect, merged per side at +/-0.95 | 215 to 229 |
| plated holes | open barrel cylinder plus two `RingGeometry` annuli at +/-0.96 | 232 to 254 |
| silkscreen | rasterised per side at 22 px/mm on a transparent plane at +/-1.0; bottom mapped with `tx(x) = (maxX - x + pad) * PPM` and the plane turned PI about y, so positions agree on both faces and glyphs read from behind; Plex Mono 700 at `font_size * 22 * 1.35` | 257 to 321 |
| silk-derived body box | `pcb_component` bounds cover only pads, so a module whose body sits off its header lands wrong; the body box comes from the component's own silkscreen extents, boxes under 0.6 mm ignored, rotation skipped when used | 339 to 366 |
| per-part 3D | `SHAPES` table: `round_screen` (cylinder plus a `CircleGeometry` face with the live LCD canvas as map and emissive map at 1.35), `can`, `rod`, `stick` (body, shaft, pink cap, dish), `box`, `none` for copper-only parts; fallback box from silk or pad bounds, height 1.6 over 6 mm else 0.7 | 372 to 495 |
| case | decode int16 base64 per axis, `computeVertexNormals`, PLA colours (bezel pink, grip and head back ink, inlay cream); top shells at +0.8, bottom shells mirrored `scale.z = -1` at -0.8 | 523 to 552 |
| refdes | one canvas at 16 px/mm, bottom refs in teal, plane 26 mm above the board with depth test off | 555 to 573 |

### 4.13 Firmware UI simulation (`SIM`)

Seven screens HUNT, SPIRIT BOX, EMF, GAS, CLIMATE, LOG, MENU drawn on a 360 x 360 canvas: a 240 layout centred (`PAD = 60`), a round clip, a 60-tick bezel, and an EMF sweep arc on r 167 spanning `emf / 20` of 300 deg (lines 419 to 451). Model (lines 93 to 150):

| quantity | equation or constant |
|---|---|
| anomaly | probability `dt * 0.055` per frame; length `1.2 + 2.4 rnd` s |
| EMF target | `0.6 + 0.5 rnd`, plus `5 + 11 rnd` in an event; first-order follow at `dt * 6`; peak decays `1 - 0.18 dt` |
| spectrum | 32 bins: mains 0.72 at bin 4, 0.28 at 8, 0.14 at 12; noise `0.03 + 0.05 rnd`; event adds `0.22 exp(-|i - 14| / 9)` |
| heaters | warm-up 45 s, then CH4 and sulfur follow with event bumps 0.22 and 0.30 |
| cold spot | temperature target drops 2.6 C during an event |
| sweep | bands FM 87.5 to 108.0 step 0.1, AM 0.530 to 1.710 step 0.010, SW 5.9 to 15.6 step 0.005; modes FORWARD, REVERSE, BOUNCE, RANDOM; dwell 60 to 500 ms step 20 (default 180); step 1 to 12 ch |
| RSSI landscape | five stations at (0.14, 0.9), (0.31, 0.62), (0.48, 0.98), (0.66, 0.55), (0.83, 0.75): `v = 0.10 + 0.07 rnd + sum h exp(-d^2 / 0.00035)` (lines 81 to 89) |
| LED bar | `lvl = clamp(emf / 14) * 10`; green below 0.45 of the bar, amber below 0.75, pink above (lines 454 to 463) |
| battery | `batt` starts 0.82 and drains `dt x 0.000014` per second; the status icon turns red under 0.25 |
| E-field | follows `0.55 + 0.4 rnd` in an event, else `0.12 + 0.12 rnd`, at `dt x 4` |
| spectrum follow | each bin follows its target at `dt x 9`; peak ticks decay `1 - 0.35 dt` |
| climate | temperature follows `21.4 - 2.6 (event) + 0.15 noise` at `dt x 0.8`; RH follows `43 +/- 1` at `dt x 0.5`; `dT` follows `temp - 21.4` at `dt x 2`; 88-sample history |
| logging | one "EMF n mG spike" entry per burst (when `event > 2.9`, then clamped to 2.85); heater state changes and MARK presses also log |
| defaults | band FM at 88.1, sweep REVERSE, dwell 180 ms, step 3 ch, mute on, sweep running, heaters OFF |

Inputs (lines 166 to 189): `mode` cycles screens, `mark` logs a 30 s buffer save, `ok` toggles edit or holds the sweep or resets peaks, `wheel+/-` moves selection or nudges a field. The same LCD canvas is the DOM device screen and the texture on the board, so the 3D board shows what you are doing (`APP` lines 841 to 863). The model uses unseeded `Math.random`.

#### 4.13.1 Firmware UI anatomy (`SIM` lines 191 to 418)

The screens are built from five drawing primitives, which is the part of AUGER's UI to port as a component set for any small round or square device display:

| primitive | construction |
|---|---|
| `statusBar` | 17 px panel: "AUGER" in pink, SD (dim, red when absent), a running clock, GAS coloured by heater state (dim off, amber warming, green armed), WIFI dimmed, a 28 x 9 battery outline with a teal fill (red under 0.25) |
| `title` | 13 px bold screen name at (6, 28), a right-aligned state word ("SWEEPING" or "HELD", "PEAK HOLD", "COLD SPOT", event count), and a 26 px pink tab over a 1 px rule at y 36 |
| `hints` | a 26 px strip at y 214 of key and action pairs, dim key then bright action ("WHEEL VALUE", "PUSH OK", "MODE >", "MARK SAVE"); the labels change with the edit state, so the strip always says what each control does now |
| `tile` | labelled value box: 8 px label, 19 px value, unit placed after the measured value width, and an optional 3 px bar under it |
| `bar` | a background track and a clamped fill |

| screen | content |
|---|---|
| HUNT | EMF hero (34 px value, pink over 6 mG, PK readout, EMF bar over 20 mG, E-field bar), four tiles (CH4, SULFUR, TEMP, dT COLD; pink when dT is under -1.5), a tuning line (frequency, band, sweep mode) |
| SPIRIT BOX | 30 px frequency, RSSI bar, a 228 x 62 RSSI history whose columns take a four-step ramp (`#1A2230` under 0.26, `#5C4A72`, `#C2367F`, `#FF2E96` over 0.72), and five field cells BAND SWEEP DWELL STEP MUTE |
| EMF | 32 bars at 7 px pitch with a 1 px peak tick each, bin 4 amber, bins over 8 pink during an event, a 60 Hz marker line, AC MAG and E-FIELD tiles |
| GAS | heater state row with a warm-up progress bar `1 - warm / 45`, two sensor rows with relative index and bar, the line "RELATIVE INDEX. NOT CALIBRATED ppm." |
| CLIMATE | TEMP and HUMIDITY tiles, a dT readout with a COLD SPOT flag under -1.5, a 90 s sparkline scaled 18 to 23 C |
| LOG | the newest 11 entries with time, coloured kind, text; "NOTHING RECORDED YET" when empty |
| MENU | nine items in an eight-row window that scrolls with the selection (`top = clamp(sel - 3, 0, n - 8)`): BAND, SWEEP, DWELL, STEP, MUTE ON RETUNE, LED BAR, GAS HEATERS (OFF, WARMING, ARMED; arming starts the 45 s warm-up), QUIET SAMPLING, WIFI IN HUNT |

Interaction pattern: one rotary wheel plus one push gives select-then-edit. The wheel moves the selection; PUSH turns the selected cell pink (edit mode) and the wheel then changes its value; PUSH again confirms. The prompt under the SPIRIT BOX cells reads "TURN TO SELECT, PUSH TO EDIT" or "TURN TO CHANGE, PUSH TO CONFIRM". Final draw (lines 419 to 451): clear, clip to the round glass, draw the 240 layout translated by `PAD = 60`, then the 60-tick bezel and the EMF sweep arc outside the layout.

#### 4.13.2 Drive pad wiring (`APP` lines 812 to 863)

| input | action |
|---|---|
| device card buttons | `data-act` attribute straight to `AUGER_SIM.input` |
| mouse wheel over the LCD | `wheel+` when scrolling down, `wheel-` up |
| keys | ArrowUp `wheel-`, ArrowDown `wheel+`, Enter or space `ok`, M `mode`, K `mark` |
| click on a part in 3D | SW1 sends `ok`; SW2 and SW3 still map to `mode` and `mark` from the rev A wand (`APP` lines 649 to 651) |
| minimise | the "-" in the device card header collapses it to its title bar ("+" to restore) |
| LED arc | each frame `AUGER_SIM.leds()` colours the materials of D10 to D19 and sets emissive intensity 1.8 (0 when the colour is the off value `0x101010`) |
| SPIN | adds 0.0035 rad to the camera azimuth per frame |

---

## 5. UX anatomy and what makes it excellent

| region | contents |
|---|---|
| shell | cream paper `#f5f0e6`, scene `0xF2ECE0`, IBM Plex Mono only, `--line rgba(26,26,26,.20)` (`F/viewer/template.html`) |
| left panel 264 px, 2 px pink right border, slides away behind a pink hamburger | wordmark "AUGER." with a pink dot, sub "REV A / 2 LAYER / 1.6MM FR4", pink tag; VIEW: FRONT, BACK, ISO, EDGE, SPIN, PNG (solid pink); LAYERS: 22 rows (17 board plus 5 case) with switch, colour chip and live count, courtyards, keepouts, refdes and case off by default (`APP` line 692); EXPLODE, OPACITY, CASE opacity sliders; STATS |
| stage | full bleed, custom spherical orbit with z up (`APP` lines 595 to 631): drag 0.008 rad/px, phi clamped +/-1.53, right or shift drag pan at `dist * 0.0016`, wheel x1.12 per notch clamped 28 to 900, click under 5 px picks |
| presets | front (theta -PI/2, phi 1.52, 250), back (phi -1.52), iso (theta -PI/2 - 0.5, phi 0.62, 300), edge (phi 0.05, 260) (`APP` lines 727 to 732) |
| explode offsets | case bezel +46, grip and head -46, inlay +58, door -58, parts +/-26, silk +/-8, pads and traces +/-4, pour +/-2, mask +/-6 (times the slider fraction, `APP` lines 756 to 767) |
| pick card, bottom right, pink border | refdes, MPN, side, x/y, rot, extent; clicking SW1 on the board presses PUSH |
| device card, top right, ink header "DEVICE . LIVE UI" | 240 px LCD canvas, WHEEL up, PUSH (solid), WHEEL down, MODE, MARK; wheel over the LCD turns the encoder; keys arrows, Enter or space, M, K |
| loader | "AUGER." and "BUILDING GEOMETRY" |
| exports | PNG at 2x by resizing the renderer with `preserveDrawingBuffer` (`APP` lines 744 to 753) |

What makes it excellent: one source of truth runs from a placement table to copper, gerbers, a printed case and a viewer, so moving a part moves the board, the shell and the picture together; the board in the viewer is real geometry from the circuit JSON (true outline, every trace, pad, ring and pour) in a 3D scene with real depth and lighting; and the firmware runs on the board's own display, so the device can be judged as a product before it exists. The device card plus the 3D board is the drive pad pattern to keep.

---

## 6. Known limits and failure lessons

| # | failure | fix or state | rule |
|---|---|---|---|
| 1 | capacity and krt autorouters never finish; sequential-trace leaves 164 nets open; 1178 of 1322 segments at 0.1 mm | open | routing completeness and declared width are gates (CHK-BRD-07) |
| 2 | traces through air | `clean-traces.ts` | a route sanitiser is a remedy and never a gate |
| 3 | OpenSCAD `band()` on a 74-point outline ran past ten minutes | offsets and bands precomputed in TypeScript; grip renders in about a minute (README lines 246 to 248) | precompute 2D booleans outside the CAD kernel |
| 4 | case drifted from board | case geometry generated from `placement.ts` | one placement table feeds every consumer |
| 5 | Si4732 drawn as QFN-20 | SOIC-16 after a distributor pass (`SOURCING.md`) | parts start inferred until a distributor or datasheet row says otherwise |
| 6 | stale viewer shapes: a `whip` entry drew a 90 mm rod; the round module rendered square | fixed in rev B (README lines 203 to 216) | viewer shape tables are derived, never hand kept |
| 7 | metal looked dead | procedural environment map | |
| 8 | microSD mouth inside the grip | service door; move it in a respin | |
| 9 | pink mask: PCBWay yes, JLCPCB no (`SOURCING.md`) | conflicts with the TACK note that JLC offers pink | a quote settles it |
| 10 | labels lag the code: "AUGER rev A" title and header, "170 x 75 mm", MQ-4 comment over MQ-136, QFN20 comment over `soic16`, "NECK 10 LED" over 16, LiPo over 18650; `leds()` and `/^D1\d$/` drive only D10 to D19; picking still maps SW2 and SW3 | open | derived labels carry the build hash and fail on mismatch |
| 11 | amp output, stereo into BTL, unswitched jack, boost divider (section 4.5) | open | semantic netlist checks CHK-BRD-12, CHK-BRD-14 |
| 12 | the `WHEEL &#9650;` (up arrow) button sends `wheel+` (`F/viewer/template.html` line 199), which adds 1 to the selection and moves it down in `SIM` (`input`, line 182), while the ArrowUp key sends `wheel-` (`APP` line 830): the button and the key disagree | open (read from the code) | one input map shared by buttons, keys and wheel |
| 13 | the GAS screen labels its rows "MQ-4" and "MQ-135" (`SIM` `scrGas`) while the board carries one MQ-136 can; the sim header still says "240x240 ST7789" | open (read from the code) | the UI sim reads part names from the board record |

JLC economics (vendor, `SOURCING.md`, July 2026): TH labour $3.50 plus $0.0173 per joint, Economic PCBA capped at 30 boards, extended part loading $3 per type Economic and $1.50 Standard; 48 plated holes cost about $4.30 a board. SI4732-A10-GS LCSC C1526102 from $1.11; ESP32-S3-MINI-1-N4R2 C3013941 $3.55 (quad PSRAM keeps GPIO33 to 37 free; never substitute R8).

---

## 7. Tests and harness

| harness | asserts | recorded result |
|---|---|---|
| `F/shot.py` (Playwright, swiftshader, 1280 x 900, 7 s wait) | `typeof window.AUGER_SIM`; then sets `AUGER_SIM.S.screen` for all seven screens (forcing `heater = 2` for GAS) and captures `#lcd`; then 10 shots through view buttons, `window.__LAYER_IDS` rows and the explode slider (62 and 78) | screenshots only; no numeric assertion |
| `F/shot2.py` | case triangle counts from the layer rows, 6 shots | same |
| `F/src/build.tsx` | prints element counts and the first 40 `*error*` elements | errors printed, never gated |
| drive 2026-10-05 | six shots through the same hooks | zero page errors, ready 6.4 s (measured) |

---

## 8. Port map

| item | value |
|---|---|
| packages | `board` (tscircuit capture, placement table with `at(ref)`, route sanitiser, gerber wrapper), `catalog` (hand footprints all inferred tier; CHK-BRD-06 must refuse them at export), `geom` and `mesh` (board-to-enclosure offsets, int16 mesh packing), `ui-core` (`board` kind viewer, firmware UI as drive overlay), `exports` (viewer bake with function replacers) |
| feature kinds | `pad`, `port`, `conductor`; no kind yet for the meander antenna, the thermal isolation cutouts, the keepouts, the shoulder tongue outline, the case shell derived from the outline |
| canon ids | none registered |
| canon MISSING | `pcb-meander-antenna` (outline tongue plus chained pads plus keepout), `ntc-isolation-tab`, `gated-boost-heater-switch` (boost EN plus high-side P-FET), `coil-emf-two-stage`, `e-field-follower`, `half-rail-bias`, `class-d-output-filter` (with the output-connected check), `board-to-enclosure` link (outline offsets, bands, bosses from mount holes), `firmware-ui-on-device-texture` drive |
| reference ids | MISSING in INDEX; proposed `boards/auger` and `exports/viewer-bake` (`fab-knowledge:synthesis/mappings.md` line 119); the circuit JSON is planned as `tools/corpus/board/known-bad/auger.circuit.json` (`docs/plan/milestones/M08-board-catalog.md` lines 118, 941); UI kind reference `reference/kinds/minimal-board` at M11 (`docs/plan/UI.md` line 644) |
| checks it originates | CHK-BRD-07 (routing complete, vertices inside, width survives), CHK-BRD-14 (amplifier output connected) |
| milestone | M08 (known-bad fixture), M11 (`board` view kind) |
| lineage row | MISSING (`lineage.json` holds three healer rows only) |
