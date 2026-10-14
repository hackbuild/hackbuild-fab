# LUG rev A: how it is made

A low-profile Raspberry Pi HAT written as tscircuit source: one-chip 1S LiPo charge and boost, a fuel gauge, a press-on hold-off soft power button with a clean-shutdown handshake, stereo I2S class D amps, two servo headers, a level-shifted NeoPixel output, a GPIO breakout and Qwiic. Four layers, autorouted, ground pour on inner 1, zero DRC errors, with gerbers, BOM, pick and place, netlist, GLB and a single-file viewer that opens from disk. It began as GROMMET, a 108 mm round carrier for a round DSI display, and became a standard HAT. This record says how it is built, from the original source, so a builder can make the next board the same way.

Number rule for this file: values are read from `files/lug.tsx` at the lines named, from `files/README.md`, or from the fab files; figures marked computed are by hand from those; figures marked stated are written in the README and not reproduced; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/lug/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | LUG rev A (bench `round-pi-board`, chat "Raspberry Pi circular display board"; registry `round-pi-board`, status "concept", which is stale) |
| slug | lug |
| canonical revision | rev A as harvested; DRC report generated 2026-07-29T10:07:38.884Z (`files/fab/drc-report.txt`), gerbers dated 2026-07-29 03:07 inside the zip |
| source | `files/lug.tsx`, 352 lines, sha256 `ff88947cb61584f220eb8d2495e882ea1c2ca785972c3de872f165fe4d7a644d` |
| viewer | `files/lug-viewer.html`, sha256 `faae6607145566d1a8739bea4d360d1d43cb3f0cf5e9be76d19808a6349cbaa4` (three.js inlined with OrbitControls and GLTFLoader, GLB in a script tag, PCB and schematic SVG inline) |
| circuit | `files/lug.circuit.json` |
| fab | `files/fab/lug-gerbers.zip` (sha256 `bab6d263214bfc65e239ab94e2be5cb24cbf72a1814f5772d4ee581430fb5399`: F and B copper, In1 and In2 copper, F and B mask, paste and silk, Edge_Cuts, PTH and NPTH drill), `lug-bom.csv`, `lug-pnp.csv`, `lug-netlist.txt`, `drc-report.txt`, `lug-pcb.svg`, `lug-schematic.svg`, `lug.glb` |
| companions | `files/companions/grommet.tsx`, `grommet-viewer.html` (GROMMET rev A, the round board, kept "for reference" by the README) |
| owner upload | `files/owner-uploads/Screen_Shot_2026-07-28_at_9_34_35_PM.png` (GROMMET's disc cropped by the canvas) |
| build scripts | MISSING: `build.mjs`, `lug.build.mjs`, `export-lug.build.mjs`, `make-viewer-lug.mjs` are named in the README "Rebuild" section and were not harvested |

### 1.1 Revision table

| rev | date | what |
|---|---|---|
| GROMMET rev A | 2026-07-28 | 108 mm round board with a chord flat for the Pi Ethernet and USB bank, BQ25896 plus TPS61088, LTC2954 latch, TAS5825M amp; viewer DRC tab shows 5 errors (stated, `sources/benches/benches-copper-pcb-b.md` section 2) |
| LUG rev A | 2026-07-29 | standard 65 x 56.5 HAT, MP2636 single-chip power path, STM6601 soft power, two MAX98357A; 0 DRC errors |

### 1.2 Why rev A

It is the only LUG and the final deliverable of the chat; it is good on the checks it ran (0 DRC errors, measured in the viewer's DRC tab; every named net present in the netlist). Its stated risk is that the chip pin maps were "written from knowledge, not parsed from datasheets" (`lug.tsx:10` to `11`); section 4.7 lists what a builder verifies before fab.

## 2. What it makes and for whom

A maker with a Pi Zero 2 W, 3A+ or a lightly loaded Pi 4 who wants a battery-powered, speaker-equipped, servo-driving project in a 14.0 mm stack above the Pi PCB (stated, with an 11 mm stacking header). They order the board from the gerbers, populate from the BOM and PnP, and write a shutdown script for the button handshake.

## 3. Shots

Driven headless on 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, swiftshader, 1280 x 860) through the viewer's own controls (no hook). Console errors: 0 (measured).

| file | what it shows |
|---|---|
| `shots/l02-assembly-exploded-with-lipo.png` | ASSEMBLY tab, explode 70, LiPo shown: the box Pi stand-in with header, SoC and the USB and Ethernet bank, the LUG HAT GLB with real parts and traces, the external LiPo block; header stats 37 parts, 141 pads, 67 holes, 131 traces, 70 vias, 15 nets, 4 layer, 65x56.5 mm; dims "hat sits 14.0 mm above the pi pcb" |
| `shots/l03-assembly-top-hat-only.png` | TOP camera with only the HAT. Against the PCB tab (shot l04) the board is turned 180 deg about its own normal: the 40-pin header runs along the bottom with pin 1 at the right, and the silk ("LUG rev A", "1S LiPo 5V 2A4") reads upside down and right to left, not mirrored; components and silk are still on the visible face, so the top side is up (looked at a crop of the shot, 2026-10-05); see 5 |
| `shots/l04-pcb-tab-circuit-to-svg.png` | PCB tab: `circuit-to-svg` render with the 40-pin header across the top, four mounting holes, U1 QFN-24 lower left, the two TSSOP amps right of centre, servo and NeoPixel headers along the bottom |
| `shots/l05-schematic-tab.png` | SCHEMATIC tab: tscircuit schematic with every block and net label |
| `shots/l06-drc-tab.png` | DRC tab: errors 0, warnings 208 grouped (11 refdes, 146 unnamed trace, 17 x 3 pin attribute) |

## 4. Circuits and constructions

### 4.1 Board outline, registration and the HAT header

Outline (`lug.tsx:64` to `76`): half sizes `HW` 32.5 and `HH` 28.25, corner radius `CR` 3, each corner sampled in 11 points (`i` 0 to 10). Origin at the centre of the four HAT holes; holes M2.5 at (+-29, +-24.5), 2.75 diameter (`:119` to `122` inside `Lug`). Header (`:78` to `108`): 40 plated holes, drill 1.0, pad 1.7, pin n at `x = -24.88 + floor((n-1)/2) 2.54`, odd pins at y 21.53 and even at 24.07; labels combine GPIO and function (`GPIO4_nINT`, `GPIO17_PSHOLD`, `GPIO12_SERVO1`) so the netlist reads as a pin budget. Board props: 4 layers, 1.6 thick, `autorouter="auto"`, `minBoardEdgeClearance` 0.6 (`:118`). Ground pour on inner 1 with pad margin 0.3, trace margin 0.3, edge margin 0.6 (`:348`).

### 4.2 QFN footprint generator

`qfn(pins, body, pitch, thermal)` (`lug.tsx:33` to `51`): `pins/4` per side, pad width `pitch - 0.22`, pad length 0.55, pad centre radius `body/2 - 0.45 + 0.55/2`, numbering down the left side then bottom, right and top (counter clockwise), thermal pad as pin `pins + 1` (`QfnFp`, `:53` to `62`). Written because the stock footprinter `qfn` "overlaps its corner pads" (README). U1 uses `qfn(24, 4, 0.5, 2.6)`, U3 `qfn(12, 3, 0.5, 1.7)`. At 0.5 pitch the pad is 0.28 wide (computed).

### 4.3 Power path: USB-C to MP2636 to 5 V (canon candidate `1s-power-path-boost`)

J2 USB-C power only with two 5.1k CC pulldowns (R1, R2). U1 MP2636 (QFN-24) is charger, synchronous boost and power path in one chip: VIN from VBUS with 10 uF (C3); SW1 to SW3 to L1 2.2 uH (1210) to VBAT; VOUT1 and VOUT2 to the V5V rail with 22 uF (C2); BAT pins to VBAT with 22 uF (C1) and 100 nF (C4); ISET to 10k (R3); EN from the STM6601 (`:149` to `158`, nets `:240` to `262`). J3 JST-PH 2 takes the 1S cell. U2 MAX17048 fuel gauge on VBAT and I2C1 with 1 uF (C5). Boost ceiling about 2.4 A at 5 V (stated): fine for a Zero 2 W, 3A+ or Pi 4 at light load plus micro servos and speakers, not a Pi 5 under load. V5V feeds the Pi through header pins 2 and 4 (`:278` to `279`); 3V3 for the pull-up, gauge bus and Qwiic comes from the Pi's own pin 1 (`:280`), pin 17 is labelled and left unconnected.

### 4.4 Soft power latch (canon candidate `soft-power-latch`)

U3 STM6601 (TDFN-12, `qfn(12, 3, 0.5, 1.7)`) on VBAT with 100 nF (C6); PB_IN from J4 (JST-SH 2, the user's button); EN drives U1 EN; nINT to GPIO4 with a 100k pull-up to 3V3 (R4); PSHOLD from GPIO17 (`:169` to `180`, nets from `:264`). Behaviour (README "Power button"): press once on; on a long hold the STM6601 pulls nINT low, the shutdown script halts and releases PSHOLD, then EN drops; a hung Pi is cut off by the long press regardless.

### 4.5 Stereo I2S amps (canon candidate `i2s-amp-pair`)

U4 and U5 MAX98357A (TSSOP-16) share BCLK GPIO18, LRCLK GPIO19 and DOUT GPIO21; VDD and PVDD on V5V with 10 uF each (C7, C8); outputs to J5 and J6 (JST-PH 2) (`:180` onward, nets `:291` to `314`). Only `OUTP` and `OUTN` of each amp are routed; the second output pins in the map (`OUTP2`, `OUTN2`) and `GAIN` have no trace, so gain is whatever the MAX98357A does with GAIN unconnected (datasheet check, unknown here). Channel select by SD_MODE (`:309` to `312`): U4 through 100k (R5) to 5 V, U5 through a 220k (R6) over 100k (R7) divider. The divider gives 5 x 100 / 320 = 1.5625 V (computed); the README and the source comment say "about 1 V". Whether 1.56 V selects the right channel on the MAX98357A must be read from its datasheet before fab: if it reads as left, both amps play left (inferred risk).

### 4.6 Servos, NeoPixel and breakout

Servo headers J7 and J8 (`Servo`, `:110` to `115`; 3-pin 2.54 at y -24.4, x 0 and 11; the component takes a `sig` prop that it never uses, the signal net is made by the trace at `:318` and `:320`) on GPIO12 and GPIO13, the hardware PWM pins that do not collide with I2S, servo V+ on V5V with 100 uF (1210) per header (C9, C10). NeoPixel: GPIO10 (SPI0 MOSI, because the PWM pins are taken) into U6 SN74AHCT1G125 (SOT-23-5) with OE_N to ground and VCC on 5 V, 330 ohm series (R8) to J9 (JST-PH 3), 100 nF (C11) (`:205` onward, nets `:324` to `335`). J10 2x6 breakout: 3V3, 5V, GPIO5, 6, 16, 20, 22, 23, 24, 25, two grounds. J11 Qwiic (JST-SH 4) on I2C1 at 3V3.

Height budget (stated): tallest SMD is a 1210 at about 2.5 mm, so the stacking header sets the 14.0 mm; J7, J8 and J9 must be right angle or vertical posts add 8.5 mm.

### 4.7 Known gaps a builder closes before fab

| gap | source |
|---|---|
| chip pin maps for MP2636, MAX17048, STM6601, MAX98357A, SN74AHCT1G125 written from knowledge | `lug.tsx:10` to `11`, README "Verify before you fab" |
| no HAT ID EEPROM on GPIO0 and GPIO1 (labelled but unused) | `lug.tsx:84`; noted in `sources/benches/benches-copper-pcb-b.md` |
| no back-power protection between the Pi's own USB 5 V and the boost output on pins 2 and 4 | same |
| SD_MODE divider at 1.56 V, not about 1 V | 4.5 |
| IC pins with no trace (computed 2026-10-05 by matching every pin name in the five pin maps against the `<trace>` list): U1 MP2636 `STAT1`, `STAT2`, `CE_N`, `MODE`, `VSET`, `NTC`, `VDD`, `PG_N`; U2 MAX17048 `CTG`, `QSTRT`, `ALRT_N`; U3 STM6601 `nSR`, `DBI`, `SEL`; U4 and U5 `GAIN`, `OUTP2`, `OUTN2`. A floating charge-enable, mode, voltage-set and NTC pin on the charger and floating `CTG` and `QSTRT` on the gauge each need a datasheet decision (tie, strap or route) before fab | `lug.tsx:15` to `30` against `:233` to `346` |
| USB-C J2 is a hand-drawn eight-pad footprint (six 0.6 x 1.2 signal pads at x -3.2 to 3.2 and two 1.2 x 1.7 shield pads at x +-4.32, `:131` to `145`), not a vendor land pattern; it has no shell through-holes or mechanical anchors | `lug.tsx:131` to `145` |
| BOM values printed as "5100 ohm" and "0.000022 F", MPNs only where typed; PnP all top, rotation 0 | `files/fab/lug-bom.csv`, `lug-pnp.csv` |
| netlist lists named nets only; speaker outputs and the SW node are absent from the text | `files/fab/lug-netlist.txt` |

### 4.8 Build pipeline and tscircuit lessons

Rebuild (README): `node build.mjs lug.tsx lug.build.mjs`, `node export-lug.build.mjs` (render, autoroute, pour, export, about 4 min stated), `node make-viewer-lug.mjs`. Lessons recorded: footprinter `qfn` overlaps its corner pads; `circuit-json-to-gerber` throws on 4-layer boards until `getGerberLayerName` is patched; `<platedhole>` inside `<footprint>` needs `pcbX`/`pcbY`, not `x`/`y`.

## 5. UX anatomy

`lug-viewer.html`:

| region | content |
|---|---|
| shell | dark (`--bg #101316`, panel `#171b20`, teal `#3fd9b4`, warn `#e0a33c`), JetBrains Mono; header with a board glyph, `LUG rev A` and the stats row |
| tabs | ASSEMBLY, PCB, SCHEMATIC, BOM, NETLIST, DRC, NOTES (`nav`, lines 84 to 92) |
| assembly | STACK card with toggles raspberry pi, lug hat, lipo (external) and EXPLODE (Pi down 10, HAT up 26, LiPo up 50 at full, lines 763 to 768); dims card "hat sits 14.0 mm above the pi pcb"; tools ISO, TOP, BOTTOM, EDGE, SPIN; hint "drag to orbit, scroll to zoom, right-drag to pan" |
| Pi stand-in | boxes for the PCB, header, SoC, Ethernet and two USB stacks, micro HDMI and USB-C, labelled a dimensional stand-in in NOTES (lines 712 to 722) |
| GLB placement | `GLTFLoader.parse` of the embedded GLB (from `circuit-json-to-gltf`); rotate the thinnest bounding axis to Z, recentre, sample every 17th vertex and count those above z +0.9 against below -0.9, flip 180 deg about X if more are below, place at the HAT mid plane z 13.2 (lines 731 to 757) |

What makes it excellent: one file holds the 3D stack with real height, the routed PCB, the schematic, BOM, netlist and DRC, and it opens from disk with no network; the stats row is the board's identity at a glance. Limits seen in the drive: in the TOP view (`camera.up` (0, 1, 0) from +Z, line 774) the board shows turned 180 deg about its normal against the PCB tab (shot l03: header at the bottom, pin 1 at the right, silk upside down), so the GLB placement (thinnest axis to Z by `rotation.x = -pi/2`, then a `rotation.x = pi` flip when more sampled vertices sit below z -0.9) lands the board right side up but rotated; the heuristic decides up from vertex counts rather than from layer data, and nothing checks the in-plane orientation.

## 6. Tests and harness

`drc-report.txt` from tscircuit DRC: errors 0, warnings 208. No electrical simulation, no reparse of the gerbers, no test file.

## 7. Port map

| item | value |
|---|---|
| packages | `board` (tscircuit 4-layer, inner pour, GLB and SVG outputs; gerber patch belongs in the wrapper), `catalog` (pin maps at tier inferred), `ui-core` (board stack view with height dims) |
| feature kinds | `pad`, `conductor`, `port` (board kinds); MISSING: an `assembly-stack` view kind with bought stand-in bodies |
| canon ids | `pi-hat-carrier` (candidate, CANONS.md section 4.2 line 659, "EEPROM and back-power diode as required checks"); `soft-power-latch`, `i2s-amp-pair`, `neopixel-level-shift-spi` (candidates, CANONS.md line 1183); MISSING: `1s-power-path-boost` (named in `sources/benches/benches-copper-pcb-b.md` plan mapping, absent from CANONS.md), `qfn-corner-clear-footprint` |
| reference ids | MISSING (no board reference for LUG in the handoff INDEX; `boards/spindle-r1` and `boards/tack-pin` are the board references) |
| milestones | M08 (board and catalog; LUG is a candidate source for `pi-hat-carrier`) |
| lineage row | MISSING |
