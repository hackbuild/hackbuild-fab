# ARMATURE: how it is made

Record written 2026-10-05 from the original files. Slug `armature`. Family robots (the motion and power carrier board).

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula, a count made from the netlist on 2026-10-05, or a value printed by a canonical page in the 2026-10-05 drive. "Vendor" means a datasheet constant. "Stated" quotes `ARMATURE-R1_FAB.md` or a part note. Units are mm, V, mA, ohm.

Short paths: `F` is `fab-knowledge:originals/armature/files/`; `V` is `F/armature-viewer.html`; `S` is `F/armature-sim.html`; `NET` is `F/ARMATURE-R1.net`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "ARMATURE R1, ESP32-S3 motion and power carrier, 100 x 60 mm, 2 layer" |
| owner's slug | armature |
| files | `NET` (sha256 8dbc349ca7a5...), `F/ARMATURE-R1_BOM.csv` (d536b92f96f2...), `F/ARMATURE-R1_CPL.csv` (17e1ad30e5b5...), `F/ARMATURE-R1_FAB.md` (8b52e31131b8...), `V` (aee0e9c42410..., 86081 bytes, 458 lines), `S` (158d42f1c728..., 1270352 bytes, 626 lines) |
| date | 2026-08-01 14:26 (the viewer and the sim are byte-identical to `~/Downloads/armature-viewer.html` and `armature-sim.html`) |
| source | the netlist header names `board.py` and `armature/build.py` (`NET` line 2); neither is in the harvest or in Downloads (D-180 drops the citation unless the owner supplies them) |
| runtime | `V`: no dependencies; `S`: three.js r15x inlined (the deprecation banner names r150 to r160), 25 quantised KiCad models plus parametric kinds inline |
| hook | none |
| status | netlist, placement, BOM and two viewers; NOT routed: no copper, no gerbers (stated) |

### 1.1 Every revision found

One: R1. `files (36).zip` in Downloads holds the same six files (downloads reader `dl-boards-tools.md`).

### 1.2 Why this revision

It is the only one. It is recorded whole because it is the corpus's only three-source power path, high-side gate bank and WS2812 level-shift board, and because its netlist carries defects that the next board must not copy (section 5.8).

### 1.3 What is in `fab-knowledge:originals/armature/files/`

All six harvested files. Hashes: `fab-knowledge:originals/armature/SHA256SUMS`.

---

## 2. What it makes and for whom

A carrier for an ESP32-S3-WROOM-1 (N16R8) that runs a small robot: two DRV8833 drivers (two steppers or four DC motors), four servo headers, a six-output gate bank (four low-side N-FET, two high-side P-FET), two WS2812 chains with level shifters and edge pads, Qwiic, a debug UART, and three power sources (USB-C, 6 to 28 V VIN, a 1S LiPo with charger and boost). 100 x 60 mm, 2 layer, 1.6 mm, 2 oz copper, pink mask `#FE0386`, white silk, ENIG. For a maker who wants one board under a robot instead of a stack of breakouts.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), 6 s wait. Files in `fab-knowledge:originals/armature/shots/`. No page errors.

| file | caption |
|---|---|
| `a01-viewer-board.png` | `V` BOARD tab: the pink 100 x 60 board as SVG with part bodies, designators, zone labels (POWER, MCU, MOTOR, SERVO, GATE, PIXEL), mount holes, the antenna keepout, edge pads; floating LAYERS card and zone buttons. |
| `a02-viewer-select-d11.png` | D11 selected: the inspector card shows its note ("Lets the VIN buck charge the pack when USB is absent, without shorting VBUS to the buck output"), package, footprint, MPN, LCSC, position, zone and one net chip, V5_EXT. The single net is the defect (section 5.8). |
| `a03-viewer-power-tree.png` | POWER tab: the power tree drawn from data: USB-C, VIN TERM and 1S LiPo through F1, D3 and the cell protector; U2 MP2315 buck 5.2 V, U3 TP4056 charge, U5 MT3608 boost 4.9 V; D2, D4, D6 Schottky OR to VSYS; NEOPIXEL, VM via JP1 to the DRV8833s, servos and gate bank, U6 SY8089 to +3V3 and the module; a note on rail voltages after the diode drop. |
| `a04-viewer-pinmap.png` | PIN MAP tab: GPIO, module pad, signal and class per row. |
| `a05-viewer-fab.png` | FAB tab: "Sending this out": stackup, routing constraints, assembly, first power-on order. |
| `a06-sim-iso-demo.png` | `S` ISO with the demo running: the board in 3D with real KiCad part models, the 14 pixel strip on the edge pads. |
| `a07-sim-lift-labels.png` | LIFT 70 with floating refdes: every part raised by `lift x (3 + 16 y/H)` (more for the MCU) so the silk underneath shows; the INSPECTOR card and the zone key. |
| `a08-sim-motor-edge.png` | MOTOR EDGE camera: J4, J5 motor terminals, the drivers and JP1. |

---

## 4. Code map

| area | file and lines |
|---|---|
| netlist: components with MPN and LCSC fields | `NET` 3 to 640 |
| netlist: nets and nodes | `NET` 641 onward |
| viewer: header, tabs (nav at 109 to 114), panes | `V` 100 to 168 |
| viewer: data `D` (board, mount, keepouts, parts with notes, edge pads, strain holes, gpio, nets, power nodes and edges, bom, zones) | `V` 171 |
| viewer: board group flipped `translate(0,h) scale(1,-1)`, text counter-flipped | `V` 186 to 290 |
| viewer: paint, select, net view, clear | `V` 291 to 360 |
| viewer: wheel zoom at the cursor by 1.12, drag pan, tabs, pin map, power tree, BOM, FAB | `V` 361 to 458 |
| sim: data and world mapping `bx(x) = x - W/2`, `bz(y) = H/2 - y` | `S` 90 to 140 |
| sim: silk canvas at 24 px/mm | `S` 141 to 202 |
| sim: rounded board shape with holes, top-only texture | `S` 203 to 253 |
| sim: model decode and parts | `S` 254 to 418 |
| sim: cameras, pick, hover, select, net view | `S` 419 to 581 |
| sim: frame loop with lift and demo, boot | `S` 590 to 626 |

---

## 5. Circuits and constructions

### 5.1 Three-source power with diode OR-ing (stated in `F/ARMATURE-R1_FAB.md` and the part notes; CANONS `three-source-power-oring`)

| rail | source | nominal | feeds |
|---|---|---|---|
| VSYS | Schottky OR of USB (D2), VIN buck (D4), battery boost (D6); SS54 | 4.5 to 4.8 V after the diode | servos, gate bank, pixels, 3V3 buck, Qwiic |
| VM | JP1, bridged 1-2 = VSYS, cut to 2-3 = raw VIN | 4.6 V or VIN | both DRV8833 |
| +3V3 | U6 SY8089 buck from VSYS | 3.3 V, 2 A | module, logic, pull-ups |
| VBAT | 1S LiPo behind U4 DW01A plus Q1 FS8205A | 3.0 to 4.2 V | boost input, charger output |

Chain: USB-C (5 V 3 A) to F1 2 A PPTC; VIN 6 to 28 V through D3 reverse block to U2 MP2315 set to 5.2 V with R3/R4 = 100k/18.2k; U3 TP4056 at 580 mA (R5 = 2k; 1.2k for 1 A only with a pack of 1000 mAh or more); U5 MT3608 boost to 4.9 V with R10/R11 = 100k/13.7k, deliberately 300 mV under the wired rails so the OR diodes hand over; Q2 MMBT3904 pulls the boost EN low when a wired rail is present; R12 100k EN pull-up to VBAT. Bulk C25 1000 uF at the strip, C31 470 uF servo and gate rail, C32 470 uF at the drivers. VBAT sense 100k/100k into GPIO10 with C15.

Check of the set points with vendor reference voltages (computed): MP2315 `0.791 x (1 + 100/18.2) = 5.14 V`; MT3608 `0.6 x (1 + 100/13.7) = 4.98 V`; TP4056 with a 2k program resistor gives 580 mA in its datasheet table (vendor). The README values (5.2 V, 4.9 V) are the targets.

### 5.2 Motor drivers (`F/ARMATURE-R1_FAB.md` GPIO map)

U7, U8 DRV8833 (HTSSOP-16 with exposed pad) on J4, J5 3.5 mm 4P terminals; inputs GPIO4 to 7 and 15 to 18. nSLEEP on GPIO8 pulled down by R18 so the motors stay off through boot; nFAULT open drain shared on GPIO9 with a 10k pull-up; ISEN pins to GND. DRV8833 absolute max 11.8 V, so JP1 in the VIN position is only safe to about 10 V (stated).

### 5.3 Gate bank: low-side N-FET and high-side P-FET with a level shift

Low side: Q3 to Q6 AO3400A on GPIO21, 38, 39, 40; 100R gate series, 100k gate pulldown, SS34 flyback to VSYS; "pulldown means the load cannot fire while the GPIO floats through reset" (the TRUNNION rule). High side: Q7, Q8 AO3401A sourcing VSYS on GPIO41, 42 through Q9, Q10 MMBT3904 level shifters with R35, R36 100k gate pull-ups; "a 3.3 V GPIO cannot pull a P-FET gate off a 5 V rail", default OFF. J15 2x06: odd pins switched, even pins the matching reference; J16 screw terminal duplicates LS1.

### 5.4 WS2812 chains with a level shift

U9, U10 SN74AHCT1G125 on VSYS with 330R series (R21, R22) to J8, J9 and edge pads E1 to E6 (3.2 x 3.2, with unplated strain holes at x 96.8). WS2812 VIH is 0.7 VDD, so 3.3 V data is out of spec at 5 V: "the shifter is not optional" (stated). GPIO47 chain A, GPIO48 chain B.

### 5.5 Servos, I2C, USB, boot

Servos J11 to J14 1x03 on GPIO11 to 14 with 220R series, pin order signal, VSYS, GND (GND nearest the edge). Qwiic J17 JST-SH with 4.7k pull-ups to 3V3. USB: J1 HRO TYPE-C-31-M-12 with 5.1k CC pulldowns and a USBLC6-2SC6 ESD array, native USB on GPIO19 and 20. Boot: SW1 EN with 10k plus 1 uF, SW2 GPIO0 with 10k; GPIO3 (strapping) carries a user LED that pulls it to its default. GPIO33 to 37 unused so N16R8 (octal PSRAM) and N8R2 (quad) modules share the layout.

### 5.6 Layout rules for routing (viewer FAB tab)

VSYS and VM at least 2.5 mm; motor outputs 1.5 mm; at least nine 0.3 mm vias per DRV8833 thermal pad; tight switching loops for U2, U5, U6 with feedback away from the switch nodes; USB 90 ohm differential matched within 2 mm; bottom layer a solid GND pour unbroken under drivers and regulators; no copper, pour or mask in the antenna keepout (18 x 6 at (46, 54.25)). First power-on order: 12 V at J2 with no module and no pack (5.2 V at C3, 3.3 V at C13), then USB only (VSYS about 4.6 V), then pack only (boost up, VSYS about 4.5 V), then USB back (boost EN low, "if it does not, Q2 or R13 is wrong"), then the module, then the motors.

### 5.7 Validator gates (stated)

The generator reports 127 placements, 95 nets, 398 connections, 0 errors, tightest body to body 0.38 between adjacent header bodies; gates: designator uniqueness, no pin on two nets, every part connected, the GPIO table agrees with the netlist, body bbox collision, edge margin, mount hole clearance, antenna keepout. Counted from `NET` on 2026-10-05: 127 components, 95 nets, 398 nodes (computed), matching. The count of 398 nodes includes 6 nodes on the edge pads E1 to E6 (one each), which have no component entry (finding 2). Three components have exactly one connected pin: D11, LED1 and LED2 (findings 1 and 5).

### 5.8 Netlist defects the validator did not catch (computed from `NET` on 2026-10-05)

1. D11 cathode is unconnected. D11 (1N4148W) appears only as pin 2 (A) on V5_EXT (`NET` 1117). Its note says it lets the VIN buck charge the pack when USB is absent, which needs pin 1 (K) on VBUS_F. With K floating, VIN never reaches the charger; and because R13 (Q2 base) sits on VBUS_F only (`NET` 1155, Q2_B at 1018), VIN presence also never disables the boost. R13's note says "Q2 base from V5_CHG"; no net named V5_CHG exists. "Every part connected" passes because D11 has one connected pin; a gate of "every pin of a 2-pin part connected" catches it.
2. Edge pads E1 to E6 appear as nodes in nets (VSYS, GND, NEO_A_5V, NEO_B_5V) but the components block holds no E refs, and the CPL and BOM omit them; KiCad's Update PCB from Netlist will report unknown references.
3. Qwiic J17 pin 2 is on VSYS (about 4.6 V) while its pull-ups go to 3V3; Qwiic boards expect 3.3 V on that pin. The part note states the intent ("GND / VSYS / SDA / SCL"), so it is a choice that breaks the Qwiic convention and should be gated by a port type.
4. LCSC codes reused across different values (computed from the BOM on 2026-10-05): C8465 for both the 2P VIN terminal and the 4P stepper terminals; C25767 for 2k, 13.7k and 22.1k. Reuse across same-value lines (C2286 LEDs, C124375 headers, C318884 switches) is legitimate.

5. The charge status LEDs cannot light (found by this check on 2026-10-05). LED1 (CHG, red) and LED2 (FULL, green) appear only by their cathodes, on `LED1_K` and `LED2_K`, which run through R6 and R7 to U3's open-drain CHRG and STDBY pins (`CHG_LED`, `STDBY_LED`). Neither anode is on any net; the TP4056 status circuit needs both anodes on VBUS_F. Same failure class as D11: one pin connected passes "every part connected".
6. U2's enable pin is on its own output (found by this check; inferred from the vendor pin function, not simulated). MP2315 pin 6 EN sits on `V5_EXT`, the buck's 5.2 V output, while pin 2 IN is on `VIN_P`. At power up `V5_EXT` is 0 V, so EN is low and the converter has nothing to lift it; the MP2315 expects EN pulled toward VIN (or driven) to start. The VIN path would therefore never come up. U6 SY8089, by contrast, has EN on its input rail VSYS, which is the usual wiring.

A generator gate that would have caught 1, 5 and 6: every pin of a two-pin passive or diode is on a net; and no regulator's EN shares a net with its own output.

CANONS already marks `three-source-power-oring` unproven for finding 1.

### 5.9 GPIO map as wired (computed from `NET`, 2026-10-05)

| GPIO | net | GPIO | net |
|---|---|---|---|
| 0 | IO0 (boot button) | 19, 20 | USB D-, D+ |
| 1, 2 | SDA, SCL | 21, 38, 39, 40 | GATE_LS1 to LS4 |
| 3 | LED_USER (strapping pin held at default) | 41, 42 | GATE_HS1, HS2 |
| 4 to 7 | M1 AIN1, AIN2, BIN1, BIN2 | 43, 44 | U0TXD, U0RXD |
| 8 | nSLEEP (R18 100k to GND) | 47, 48 | NEO_A, NEO_B |
| 9 | nFAULT (both drivers, R20 to 3V3) | 15 to 18 | M2 AIN1, AIN2, BIN1, BIN2 |
| 10 | VBAT_SENSE (R16, R17, C15) | 11 to 14 | SERVO1 to SERVO4 |

GPIO 33 to 37 are absent from the module's net list, which is the PSRAM-agnostic rule in practice. The high-side drive inverts: GPIO41 high turns Q9 on, which pulls `G_HS1` down against R35 100k to VSYS and turns the P-FET Q7 on; GPIO low or floating leaves R35 holding the gate at VSYS, so the output is off through reset. The WS2812 buffers have OE tied to GND (always enabled) and run from VSYS, so their outputs swing to the strip's supply.

### 5.10 Boost hand-over logic (`NET` nets `EN_BOOST`, `Q2_B`, `VBAT`)

R12 100k pulls U5 EN up to VBAT, so the boost runs whenever a cell is present. Q2's base takes R13 100k from VBUS_F; with USB present Q2 saturates and pulls `EN_BOOST` low, shutting the boost so the pack is not discharged into VSYS while it is being charged. Because R13 sees only VBUS_F (finding 1), a VIN-only supply does not shut the boost; the OR diodes still prevent back-feed, since the boost's 4.9 V target sits under the buck's 5.2 V, so the cost is pack drain rather than a fault.

---

## 6. Fabrication

| item | value | source |
|---|---|---|
| stackup | 2 layer, 1.6 mm FR4, 2 oz, pink mask, white silk, ENIG | `F/ARMATURE-R1_FAB.md` |
| CPL | `Designator, Mid X, Mid Y, Layer, Rotation`, mm with an `mm` suffix, origin lower-left of the outline, 127 rows all Top | `F/ARMATURE-R1_CPL.csv` |
| BOM | JLCPCB and PCBWay columns `Comment, Designator, Footprint, Package, MPN, LCSC Part # (verify), Qty`; 61 lines | `F/ARMATURE-R1_BOM.csv` |
| mount holes | (4, 4) to (96, 56), a 92 x 52 pattern | viewer data |
| verify before commit | LCSC is a candidate, MPN is authoritative; re-check U2, U3, U4 and Q1, U5, U6 pin numbering against the symbols used | `F/ARMATURE-R1_FAB.md` |

---

## 7. UX anatomy

- `V` (paper shell, the `board` kind in all but name): ink header with a 3 px pink rule, the mark, "ARMATURE." in Permanent Marker with a pink stop, rev line, tagline; tabs BOARD, PIN MAP, POWER, BOM, FAB. BOARD: the SVG board in one flipped group with per-element counter-flipped text; LAYERS card (soldermask, silkscreen, part bodies, designators, keepout and holes, dimensions); zone buttons that tint a block and dim the rest to 0.3; FIT, CLEAR; drag pans the viewBox, wheel zooms at the cursor by 1.12; click fills the inspector (ref, value, note, package, footprint, MPN, LCSC, position, zone, net chips); a net chip lists every node. POWER: the tree from `power_nodes` on a column and row grid with orthogonal `power_edges`, colours by role (source ink, protection brown, converter pink, rail green, load teal).
- `S` (dark, header 44 px, floating panels): SHOW (parts, silkscreen and mask, floating refdes, pixel strip, ground plane), LIFT, CAMERA (ISO, TOP, USB EDGE, MOTOR EDGE, PIXEL EDGE; spherical presets), ZONES, DEMO (LED4 on, LED1 breathing, LED3 blinking, a 14 pixel HSL chase on the edge pads), INSPECTOR with the zone key. World mapping `bx(x) = x - W/2`, `bz(y) = H/2 - y` (board y to -Z, the sign SHUNT settled on), `rotation.y = +rot`. Board extruded with mount (r 1.6) and strain (r 1.0) holes, UVs rewritten to x/W and y/H, triangles regrouped so only the top carries the 24 px/mm silk canvas. Models `{lo, span, g:[{c, n, p, i, w}]}` quantised to uint16 against the bbox; parametric `@usbc @jstsh @term2 @term4 @sj`; substitutions declared per part (`mnote`: WROOM-32 model for the WROOM-1, a vertical PH for the side-entry J3, SOIC-8 and TSSOP-16 without exposed pads, a 10 x 10.5 can 0.3 taller than fitted). Shadows PCF soft 2048, hemisphere, key, pink rim and fill, fog 190 to 420.
- What makes it excellent: every part carries a one-line reason in its note, the power tree is data, and the FAB tab gives a first power-on order that tests each source on its own.

---

## 8. Tests and harness

The generator's validator (section 5.7) is stated; its script is not in the outputs. The knowledge files credit a `check3d.mjs` run with three real errors (1xN headers need rot 90 in the CPL, a flyback diode's w and h swapped standing in for a rotation, two body sizes underestimated) and a P-FET S and D swap caught by the net view; that script is not among the harvested files. The 2026-10-05 netlist count and the four defects above are this record's own check.

---

## 9. Port map

| item | value |
|---|---|
| packages | `board` (netlist, BOM, CPL from one source; the validator gates; FAB.md as a handoff template), `catalog` (substitution table; "LCSC is a candidate, MPN is authoritative"), `viewer` (2D datasheet viewer with PIN MAP, POWER, BOM, FAB; 3D sim with lift and zones) |
| feature kinds | board-level kinds MISSING in Part IR (keepout, strain hole, edge pad as a declared bought-less pad) |
| canon id | `three-source-power-oring` (CANONS section 4.1, status unproven, provenance ARMATURE partial); `mosfet-low-side-gate` lists ARMATURE (partial). MISSING: high-side P-FET with an NPN level shift; WS2812 level shift with AHCT1G125; DRV8833 with an nSLEEP pulldown and a VM jumper; the PSRAM-agnostic S3 pin rule |
| reference id | MISSING (bench reader candidate `boards/esp32-carrier`, once fixed and routed) |
| milestone | M08 (boards; CHK-BRD-04 boot audit and CHK-BRD-05 cross-check would catch findings 1 and 2); D-180 drops the ARMATURE board script citation unless supplied |
| lineage row | MISSING |
