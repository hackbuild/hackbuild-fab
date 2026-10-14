# TRUNNION: how it is made

Record written 2026-10-05 from the original files. Slug `trunnion`. Family robots (the servo carrier board for a pan and tilt laser rig).

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula or a value printed by a canonical page in the 2026-10-05 drive. "Measured" means observed in that drive. "Stated" quotes the README. Units are mm, mA, V, ohm, mW.

Short paths: `F` is `fab-knowledge:originals/trunnion/files/`; `SIM` is `F/trunnion-sim.html`; `L3` is `F/trunnion-layers-3d.html`; `B3` is `F/trunnion-3d.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "TRUNNION rev A, ESP32-C3 SuperMini carrier, 2 servos + gated laser" |
| owner's slug | trunnion |
| canonical board | `F/trunnion.kicad_pcb`, sha256 prefix 632e04b1be088d63, byte-identical to `~/Downloads/trunnion.kicad_pcb` (2026-08-01 02:48); KiCad version 20230517, generator "trunnion-gen", generator_version "gerbonara" |
| fab package | `F/trunnion-gerbers.zip` (prefix c9afd1780fad066d, 2026-08-01 02:49): F and B copper, mask, paste, silk, Edge.Cuts, PTH and NPTH drills (11 files) |
| firmware | `F/trunnion.ino` (49 lines) |
| pages | `SIM` (prefix cbbd564ad1b7, 2026-07-30 18:06), `B3` (19fa603ef9e9, 2026-07-30 18:22), `L3` (61d9e562378d, 2026-08-01 02:49, the copy that embeds the current board) |
| other files | `F/README.md`, `F/trunnion-bom.csv`, `F/board3d.json`, `F/exports/board-fab.svg`, `board-assembly.svg`, `F/tape/tape-wood.svg`, `tape-copper.svg` |
| hook | none |
| chat | "Laser servo control PCB design" (bench `trunnion`) |

### 1.1 Every revision found

| file | date | what |
|---|---|---|
| `trunnion-sim.html` | 2026-07-30 18:06 (identical copy at 18:23) | the paper-shell sim |
| `trunnion-3d.html` | 2026-07-30 18:22 | the board in 3D from `board3d.json` |
| `trunnion-layers-3d.html` | 2026-07-30 18:34 | KiCad viewer; its embedded board had one footprint at x 6.5 |
| `trunnion.kicad_pcb`, `(1)`, `trunnion-gerbers.zip`, `trunnion-layers-3d (1).html` | 2026-08-01 02:48 to 02:49 | the board with that footprint at x 47.5 and new UUIDs; the shipped set. Canonical |

The downloads reader found nothing newer (`fab-knowledge:sources/downloads/dl-robots-machines.md`, SPROCKET, STANCHION, TRUNNION section).

### 1.2 Why this revision

The 2026-08-01 board, gerbers and viewer are the newest and agree with each other: the viewer embeds the same `kicad_pcb` text that the gerbers come from. The sim and the 3D page are unchanged since 2026-07-30 and describe the same circuit. The drive on 2026-10-05 found no page errors, and found one page defect (section 7).

### 1.3 Siblings in the same bench

The bench folder also holds SPLICE rev C (`splice-copper.svg`, `splice-guide.svg`, `splice-backing.dxf`, `splice-3d.html`) and SPLICE-C (`splicec-*`), vinyl-cut copper versions of the same laser and servo circuit with an NPN switch. They are their own designs (registry row SPLICE at M16) and stay at `fab-work-directory:benches/trunnion/outputs/trunnion/`; the README's SPLICE section and `fab-knowledge:sources/benches/benches-copper-pcb-b.md` section 3 describe them. This record covers TRUNNION rev A and TRUNNION TAPE.

Hashes: `fab-knowledge:originals/trunnion/SHA256SUMS`.

---

## 2. What it makes and for whom

A 54 x 34 mm, 2 layer carrier (black mask, white silk) for an ESP32-C3 SuperMini that drives two hobby servos and switches a laser module low-side through a MOSFET, with the laser on a screw terminal. It is the electronics for a pan and tilt laser rig (the WASHER rig and the NACELLE target in the same corpus). Plus TRUNNION TAPE, the same circuit as an 80 x 52 mm single-sided copper tape build on lasercut wood. For a maker who wants a laser pointer on two servos that never flashes the diode during boot or reflash.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860). Files in `fab-knowledge:originals/trunnion/shots/`. No page errors.

| file | caption |
|---|---|
| `r01-sim-board-laser-off.png` | `SIM` BOARD tab: the board art (SuperMini socket, Q1, R1 to R3, D1, C1, C2, CUT=EXT jumper, two servo headers, two screw terminals) in the hack.build paper shell; CONTROLS; RAIL & SWITCH readout; the note "Gate held at 0 V by R2 ... the entire reason R2 exists". |
| `r02-sim-laser-on-stall-usb.png` | LASER ON at 400 mA, servo stall 80 percent, servos at 140 and 60, on USB: servo current 1160 mA, total 1560 mA, rail 4.45 V, Q1 Vds 12 mV, 5 mW; three warnings (over the 500 mA port, through the SuperMini USB-C traces, rail under 4.6 V) (computed by the page). |
| `r03-sim-ext-5v.png` | EXT 5V (SJ1 CUT): the note on J5 feeding the rail and the common ground plane. |
| `r04-sim-schematic.png` | SCHEMATIC tab. |
| `r05-sim-bom-fab.png` | BOM & FAB tab. |
| `r06-3d-iso-eject-explode.png` | `B3`: the board at real package sizes, EJECT U1 70 (the socketed SuperMini lifted off its headers), EXPLODE 60, copper and silk painted from the real geometry. |
| `r07-layers-iso.png` | `L3`: the KiCad file parsed live: substrate with 37 drills, F.Cu and B.Cu (V5 and USB5V traces in pink), silk from the Hershey-style glyph table, layer list with shape and net counts; "37 track segments, 47 pads, 5 vias, 720 zone polygons, 35 silk texts, 20 nets". |
| `r08-layers-top.png` | `L3` TOP view. |
| `r09-layers-separate-slider-defect.png` | `L3` after moving SEPARATE: the stack disappears because the handler reads `e.value` from the event (section 7). |

---

## 4. Code map

| area | file and lines |
|---|---|
| pins, PWM constants | `F/trunnion.ino` 7 to 13 |
| laser duty | `F/trunnion.ino` 17 to 19 |
| setup: laser first and off, then servos | `F/trunnion.ino` 21 to 37 |
| serial protocol | `F/trunnion.ino` 39 to 49 |
| sim tabs and board art | `SIM` 69 to 458 |
| sim schematic, firmware, BOM tabs | `SIM` 459 to 589 |
| sim electrical model and warnings | `SIM` 607 to 662 |
| sim controls, sketch text, BOM table | `SIM` 664 to 744 |
| 3D: geometry payload | `B3` 80 |
| 3D: copper and silk canvas textures at 26 px/mm | `B3` 111 to 176 |
| 3D: board, parts, dimensions, apply, loop | `B3` 177 to 379 |
| layers: embedded `kicad_pcb` text | `L3` 72 to 6519 |
| layers: glyph table | `L3` 6520 |
| layers: s-expression tokenizer | `L3` 6530 to 6553 |
| layers: board parser | `L3` 6560 to 6624 |
| layers: geometry helpers (merge per net, stadium traces, pads, polys, silk strokes) | `L3` 6644 to 6722 |
| layers: build the stack | `L3` 6724 to 6804 |
| layers: layer list, layout, camera | `L3` 6805 to 6840 |
| layers: slider and button wiring, drop a file | `L3` 6880 to 6905 |

---

## 5. Circuits and constructions

### 5.1 Pin choice on the ESP32-C3 SuperMini (README "Why these pins")

On the C3, IO2, IO8 and IO9 are strapping pins and IO4 to IO7 are the JTAG group; only IO0, IO1, IO3 and IO10 are unconditionally safe as outputs, so those are the only pins the board touches. IO1 servo A (J3), IO0 servo B (J4), IO10 through R1 100R to the Q1 gate. "A servo signal line held low at reset on a strapping pin is exactly the kind of thing that makes a board randomly stop taking uploads." Unused module pins are named on the board as NC nets so every pad is accounted for: NC2 to NC9, NC20 and NC21, ten nets named after the C3 GPIO numbers they sit on (counted in `F/trunnion.kicad_pcb`). The module's 3V3 pin lands on its own net `N3V3` that goes nowhere else; nothing on the carrier uses 3.3 V.

### 5.2 Low-side MOSFET laser switch with a boot-safe gate (README "The laser switch"; CANONS `mosfet-low-side-gate`)

The laser + sits on the V5 rail; its return goes through Q1, an AO3400A (logic level, 28 mohm at 4.5 V gate, 30 V 5.7 A). R2 100k holds the gate at 0 V through power up, reset and reflash: "without it the gate floats while the C3 boots and the diode can flash". R1 100R softens the gate edge. R3 1k plus D1 across the gate node give a visible armed state that dims with PWM duty and loads the pin with about 1.3 mA (stated; (3.3 - LED drop) / 1k). Drive with LEDC at 5 kHz, 10 bit: "well above anything the diode cares about and well below anything the FET minds".

Firmware half of the same rule (`F/trunnion.ino` 21 to 25): the laser channel is set up and written to 0 before anything else in `setup()`. CHK-DEV-04 asks for exactly this (a bootSafe row showing the beam pin driven inactive before `setup()` returns).

### 5.3 Power path and the dual-supply jumper (README "Power")

SJ1 is a normally closed solder jumper from the SuperMini's 5 V pin (USB VBUS) to the V5 rail; out of the fab USB powers everything. Two servos plus a 250 mA laser exceed a 500 mA USB port the moment anything stalls, so for that case cut SJ1 and feed 5 V into J5; USB then carries only the C3 logic, and grounds stay common through the bottom plane, "which is what makes a low-side switch legal in the first place". "Never feed J5 while the SJ1 bridge is intact and USB is plugged in": the SuperMini has no OR-ing diode or load switch on its 5 V pin. C1 470 uF 6.3 V radial covers servo and laser transients; C2 100 nF bypasses the rail.

Conflict recorded in the plan: D-088 sets the `c3-carrier` default to normally open (SPINDLE) against TRUNNION's normally closed SJ1.

### 5.4 Board, process and assembly

Board 54 x 34, corner r 1.2, 2 layer, 1.6 mm, 1 oz, HASL or ENIG; min trace 0.35, min gap 0.25, min drill 0.4 (stated), inside every cheap fab's standard process. GND zone on the bottom copper, already filled ("re-fill with B before re-exporting"). Footprints inline (18, counted in the file), so the board opens in KiCad 7 or 8 with no libraries; 37 segments, 5 vias, nets 0 to 20 (counted). Mounting: four M2.5 holes. Assembly order: SMD first (Q1, R1, R2, R3, D1, C2), then C1 (square pad is +), screw terminals, servo headers, and the SuperMini sockets last: put the female headers on the module's pins, drop it in, solder, pull the module off. The module rides about 8.5 mm above the board with its USB over the left edge.

### 5.5 Electrical model in the sim (`SIM` 607 to 662)

```
servo current = 2 x 8 + 2 x (60 + 6.4 x stall%)      mA (to about 700 per servo at full stall; the comment says "idle ~8mA each", but both terms are always summed, so the floor at stall 0 is 136 mA and servo angle never enters the model)
laser current = las x duty                            (las default 250 mA)
rail          = clamp(5.0 - I_total x R, 3.4, 5.2)    R = 0.35 ohm on USB, 0.08 ohm on a bench supply
Q1 Rds        = 0.030 (+0.010 when PWM is under 100 percent)
Pd            = I^2 x Rds x duty
```

Warnings: total over 500 mA on USB; over 900 mA through the SuperMini USB-C traces; rail under 4.6 V ("hobby servos get twitchy under 4.6 V and the laser dims"); Pd over 300 mW (move to a DPAK past 1.5 A). Info: SJ1 cut and the common ground; laser off with R2 holding the gate. A small SVG mechanism turns pan and tilt and draws the beam to a target with opacity from the duty.

### 5.6 KiCad file viewer, parsed live (`L3` 6528 to 6905)

The most reusable board viewer in this group: it embeds `trunnion.kicad_pcb` as text and parses it in the browser, and any `.kicad_pcb` dropped on the window replaces it.

1. `sexp(src)`: a recursive tokenizer over lists, quoted strings with backslash escapes, and atoms.
2. `parsePCB`: nets; `gr_line` on Edge.Cuts; `segment` (start, end, width, layer, net); `via`; `zone` `filled_polygon` per layer; `gr_text` with size and thickness; `footprint` pads rotated by the footprint's `at` angle into board space; F.CrtYd lines; board extents from Edge.Cuts.
3. Geometry: traces as stadium ribbons (two 12-segment half circles); pads rect, roundrect or circle with drill holes; vias as annuli with merged barrels; zones as polygons; silk stroked from an embedded glyph table, mirrored for `B.` layers; copper merged per net per layer (`mergeGeos`) so a click lights the whole net. Materials by net name (V5 and USB5V pink, GND darker copper).
4. Controls: SEPARATE (layer gap 0.12 per unit per rank above and below the substrate), COPPER Z (1 to 30 times 0.035 mm, rebuilds on change), SUBSTRATE opacity, ISO, TOP, BOTTOM, EDGE, SPIN. Click readout: net name, layer, segment count, routed length, distinct widths, pad count, zone polygons.

Limits: the substrate is the Edge.Cuts bounding rectangle, not the true outline; `gr_arc` is ignored.

### 5.7 Board in 3D from a geometry payload (`B3`)

`board3d.json` (37 holes, 43 pads, 20 traces, 5 vias, a GND plane polygon, 150 silk strokes, 13 parts, the module) drawn onto two canvas textures at 26 px/mm with drills punched by `destination-out`; the substrate extruded with its holes; parts as boxes at their real package sizes; EJECT U1 (the module is socketed), EXPLODE, SPIN, TOP, BOTTOM, ISO, COPPER, SILK, PARTS, RULER. It loads three.js r128 from cdnjs and shows an error card offline.

### 5.8 TRUNNION TAPE (`F/tape/`; README "The copper tape version")

80 x 52 single-sided on lasercut wood. `tape-wood.svg` layers: CUT (outline rx 3, pin holes 1.2, four 3.2 mounting holes), ENGRAVE (trace outlines for laying tape), TEXT. `tape-copper.svg`: one closed path per net for a Cricut; cut, weed, lay each net as a single piece. Differences from the PCB: Q1 is an IRLZ44N in TO-220 (easier to solder flat on tape); R2 100k bridges gate and source directly over Q1; one insulated wire jumper JMP carries the source over the signal lane; servo B moves to IO3 so its pad is not beside another pad; traces 1.4, pads 2.0, tightest gaps 0.54 at 2.54 pitches. Overlapping tape joints are resistive because the adhesive does not conduct: solder the seam. Poke the header pins through tape and wood and solder each pin to its pad on top.

### 5.9 Netlist as built (`F/trunnion.kicad_pcb`, read 2026-10-05)

| part | pins to nets |
|---|---|
| J1 (SuperMini row A) | 1 USB5V, 2 GND, 3 N3V3, 4 NC4, 5 NC3, 6 NC2, 7 SERVO1, 8 SERVO2 |
| J2 (SuperMini row B) | 1 to 5 NC5 to NC9, 6 LDRV, 7 NC20, 8 NC21 |
| J3, J4 servo headers | signal SERVO1 or SERVO2, V5, GND |
| J5 external 5 V | V5, GND |
| J6 laser | V5, LRTN |
| Q1 AO3400A | gate GATE, source GND, drain LRTN |
| R1 100R | LDRV to GATE |
| R2 100k | GATE to GND |
| R3 1k, D1 | GATE to LEDA, LEDA to GND |
| C1 470 uF, C2 100 nF | V5 to GND |
| SJ1 | USB5V to V5 |

The armed LED hangs off the gate node, after R1, so its current also flows through R1: at the README's 1.3 mA that costs about 0.13 V of gate drive (computed, 1.3 mA x 100 ohm), leaving about 3.17 V at the gate from a 3.3 V pin, still well above the AO3400A threshold. Below the LED's forward voltage the R3 and D1 branch draws nothing, so during boot only R2 holds the gate. Four unplated M2.5 holes carry no net.

### 5.10 Boot behaviour of the servos (`F/trunnion.ino` 29 to 36)

After the laser is safe, the sketch allocates LEDC timers 1 and 2 for ESP32Servo, attaches both servos at 50 Hz with a 500 to 2400 us range, and writes 90 degrees to both, so the rig drives to centre on every power up and reset. A serial command with no digits (`a` alone) parses as 0 and sends that servo to 0 degrees.

---

## 6. Firmware and protocol (`F/trunnion.ino`)

ESP32Servo at 50 Hz with 500 to 2400 us; laser on LEDC channel 0, 5 kHz, 10 bit, `laserWrite(pct)` maps 0 to 100 onto 0 to 1023. Serial at 115200: `a90` and `b120` set servo A and B in degrees (clamped 0 to 180), `l60` sets laser duty in percent (0 to 100), `off` turns the laser off. Board setting "ESP32C3 Dev Module", USB CDC On Boot enabled. Limit: `ledcSetup` and `ledcAttachPin` are the Arduino-ESP32 2.x API; core 3.x replaced them with `ledcAttach`, so the sketch does not compile on a current core (bench reader).

---

## 7. UX anatomy

- `SIM`: hack.build paper shell (3 px ink rule header, Permanent Marker "TRUNNION." with a pink dot, Special Elite subtitle, 4 px halftone background, panels with a 2 px ink border and a 4 px block shadow), tabs BOARD, SCHEMATIC, FIRMWARE (COPY SKETCH), BOM & FAB. BOARD: board art, CONTROLS (servo A and B, laser PWM, LASER ON or OFF, USB 5V or EXT 5V, laser load 50 to 1000 mA, servo stall), RAIL & SWITCH readout with warnings, MECHANISM, PIN MAP.
- `B3` and `L3`: dark stage with paper-style cards (cream border, block shadow, Permanent Marker title), floating VIEW or LAYER STACK card, an info card that answers clicks, a hint line.
- What makes it excellent: the sim's warnings are the board's design rules in plain words at the moment they matter (cut SJ1 when the draw passes USB); the KiCad viewer reads the real file, so the 3D view cannot drift from the gerbers.

Defect found 2026-10-05 (measured): in `L3` the SEPARATE, COPPER Z and SUBSTRATE handlers read `e.value` where `e` is the event (`$('#gap').oninput = e => { GAP = +e.value * .12; ... }`, lines 6882 to 6885), so GAP becomes NaN (read back through the page), the value readout goes blank (`textContent = undefined` on a nullable DOMString sets it empty, as `r09` shows) and the stack vanishes. The fix is `e.target.value`. The buttons and the click readout work.

---

## 8. Tests and harness

None in the outputs. The README states the copper tape and SPLICE files were "verified before export" (every pad on its net). The drive on 2026-10-05 recorded no page errors and the slider defect above.

---

## 9. Port map

| item | value |
|---|---|
| packages | `board` (KiCad writer with inline footprints and a filled zone; gerbonara-backed fab output; NC nets named per unused pin), `copper` (tape variant), `viewer` (KiCad file parser and per-net 3D layer stack), `link` and firmware (laser off first in `setup()`) |
| feature kinds | board-level kinds MISSING in Part IR (solder jumper, mask opening, keepout; D-061 lists TRUNNION among the boards that need them) |
| canon id | `mosfet-low-side-gate` (CANONS section 4.1, candidate, reference `boards/trunnion` at M08); `c3-carrier` (candidate, reference `seats/c3-supermini`, jumper default conflict D-088). MISSING: the armed indicator LED across the gate (a bench reader candidate) |
| reference id | `boards/trunnion` (CANONS reference column, M08); `seats/c3-supermini` (handoff INDEX, SPINDLE source) |
| milestone | M08 (boards and the c3-carrier archetype); M07 (DXF checks list TRUNNION backings, which are the SPLICE files); CHK-DEV-04 at M13 |
| lineage row | MISSING |
