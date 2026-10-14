# GROMMET: how it is made

Record written 2026-10-05 from the original code. Slug `grommet` (bench `round-pi-board`, chat "Raspberry Pi circular display board"). A 108 mm round 4-layer power, audio and IO board that stacks on a Raspberry Pi behind a Waveshare 4 in round DSI LCD, written in tscircuit and shown in a tabbed single-file viewer that builds the whole stack (display, Pi, board, battery) in 3D.

GROMMET is the first board of its chat. The chat then turned to LUG, a standard 65 x 56.5 mm HAT, which is curated separately at `fab-knowledge:originals/lug/` (same viewer shell, same QFN generator and HAT header code). Five other tools in Downloads carry the name GROMMET (patch rack, diffusion cell, room preview, Muse to CLASP, brainwave companion); none is this board (`docs/plan/GLOSSARY.md` line 566).

Number rules for this file. A number in a code table is a declared value from the file and line named. "Measured" means the headless drive of 2026-10-05 (Chrome, swiftshader WebGL, puppeteer-core, 1280 x 860) or a reading of a file in `fab-knowledge:originals/grommet/files/`. "Computed" means a calculation shown here. "Vendor" means a datasheet value. "Inferred" means a reading of the code. No build was rerun: the rebuild scripts (`build.mjs`, `export.build.mjs`, `gerber.mjs`, `make-viewer.mjs`) are in neither the harvest nor Downloads.

Short paths: `F` is `fab-knowledge:originals/grommet/files/`. `TSX` is `F/grommet.tsx`. `VW` is `F/grommet-viewer.html`. `VJS` is the viewer's app script, extracted at `fab-knowledge:originals/board-viewers/files/extracted/grommet-assembly-viewer.app.js`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | GROMMET rev A |
| owner's slug | grommet |
| canonical source | `TSX`, sha256 102ca22261bb8a749f799f8e270977891318c17eac58ca9355ebb1599f3a6ec4, 20775 bytes (harvest `fab-work-directory:benches/round-pi-board/outputs/grommet.tsx`) |
| canonical viewer | `VW`, sha256 16a639e2edfd3cdc6a8ee35dbfab81e9ff90042ca806e5ac228cf9194488b642, 2864529 bytes (equal to `~/Downloads/grommet-viewer (1).html`, 2026-07-28 21:49, and `(2)`, 07-29 03:07); its DRC pane says "generated 2026-07-29T04:44:04.092Z" |
| fab set | `F/fab-rev-a-prepour/` from `~/Downloads/files (23).zip` (members 2026-07-28 21:31 to 21:35): README, DRC report (2026-07-29T04:30:50.578Z), gerbers (14 members), BOM, PnP, netlist, PCB and schematic SVGs, circuit JSON, and the pre-pour `grommet.tsx` (sha256 5dfb30822e87..., 20600 bytes) |
| board | circle R 54 with a chord flat at x = +41, 4 layer, 1.6 mm; 41 parts, 183 SMD pads, 46 plated holes, 130 traces, 133 vias, 16 nets (viewer header, measured) |
| every hash | `fab-knowledge:originals/grommet/SHA256SUMS` |

### 1.1 Every revision found

| when | file | difference | role |
|---|---|---|---|
| 2026-07-28 21:31 | `files (23).zip` member `grommet.tsx` (20600 B) with gerbers, BOM, PnP, DRC | no ground pour; title silk at (-30, 44), pocket label at (0, -33) | fab set of record |
| 07-28 21:33 | `~/Downloads/grommet-viewer.html` (2710408 B) | viewer of the pre-pour build | superseded |
| 07-28 21:49 | `grommet-viewer (1).html` = harvest viewer | rebuilt after the pour | canonical viewer |
| 07-29 (harvest) | `TSX` (20775 B) | adds `<copperpour layer="inner1" connectsTo="net.GND" padMargin 0.3 traceMargin 0.3 boardEdgeMargin 0.6>` (`TSX` lines 331 to 332) and moves two silk labels to (0, 45) and (0, -6) | canonical source |

### 1.2 Why this revision

The harvested `TSX` is the newest source and the better board (it adds the inner GND plane a 4-layer power board needs), and the canonical viewer is its build: the viewer's DRC pane is time-stamped 14 minutes after the pre-pour report and lists the same five errors. The pre-pour package is kept beside it because it is the only fab set (gerbers, BOM, PnP) this board has; no gerbers of the poured revision survive.

### 1.3 What is in `fab-knowledge:originals/grommet/files/` and what was left out

Kept: `TSX`, `VW`, the bench README (it is LUG's README and names GROMMET as the earlier board, renamed `README-round-pi-board-bench.md`), the whole pre-pour package (12 files), the owner upload `Screen_Shot_2026-07-28_at_9_34_35_PM.png`. Left out: the LUG files (curated under `fab-knowledge:originals/lug`), the GLB (inlined in `VW` as base64; the pre-pour `grommet.glb` is in the Downloads zip), three.js r179 (inlined in `VW`).

---

## 2. What it makes and for whom

A round companion board for a Pi build behind a 4 in round 720 x 720 display (the shape of a smart speaker, a dashboard dial or a desk gadget): 1S LiPo charging with power path, a 5.1 V 3 A boost for the Pi, a push-button latch for clean power-off, stereo class D with DSP, Qwiic, a display I2C pass-through and a button and LED connector. It is for someone who wants the battery, audio and buttons in the same round footprint as the display, so the whole object stays a puck.

---

## 3. Shots

Driven headless 2026-10-05 from `VW`; ready when `#load` hides (1.5 s); zero page errors (measured). Files in `fab-knowledge:originals/grommet/shots/`.

| file | caption |
|---|---|
| `g01-assembly-iso-display-pi-grommet-lipo.png` | ASSEMBLY tab at ISO: round display module on top, Pi stand-in, GROMMET GLB, 66 x 66 x 9 pouch; STACK card with four toggles and EXPLODE; dims card "display glass to battery back 34.1 mm". |
| `g02-assembly-exploded-80.png` | EXPLODE 80: display up 33.6 mm, Pi up 6.4, board down 17.6, pouch down 43.2 (from the explode factors in section 5). |
| `g03-back-grommet-only.png` | Only the board, BACK button: the copper, the HAT header with pin 1 box, the 66 x 66 pocket outline, the chord flat at screen right and the top silk reading normally. The BACK camera sits at -Z with +Y up, so screen right is world -X: a chord at screen right with readable top silk means the board was turned PI about Y and its component face points -Z, at the pouch, not +Z at the Pi whose 11 mm stacking header it must receive (reasoned from the camera frame in `VJS` lines 108 to 114 and this shot). |
| `g04-edge-stack-height.png` | EDGE preset with every layer on: the vertical stack the chord exists for. |
| `g05-pcb-tab-circuit-to-svg.png` | PCB tab: the `circuit-to-svg` render of all layers on a `#f4f4f0` card. |
| `g06-drc-tab-5-errors.png` | DRC tab: five errors at U1 and one via over the edge, 197 warnings, shipped inside the viewer. |

---

## 4. Mechanisms, circuits and constructions

### 4.1 Coordinate frame and HAT registration

Origin at the centre of the four Pi HAT mounting holes (`TSX` lines 4 to 9). M2.5 holes 2.75 at (+/-29, +/-24.5) (lines 162 to 165). 40-pin header pin 1 at (-24.88, +21.53), odd row y 21.53, even row y 24.07, pitch 2.54, column `floor(i / 2)` (lines 99 to 111). Every pin label carries both GPIO and function (`GPIO18_I2S_BCLK`, `GPIO0_IDSD`; lines 114 to 122), so the netlist reads without a lookup. Plated holes 1.0 drill, 1.7 ring, with `pcbX`/`pcbY` (lines 124 to 151).

### 4.2 Round outline with a chord flat

`TSX` lines 83 to 97: `R = 54`, `CHORD_X = 41`, `aStart = acos(41 / 54)` = 40.6 deg (computed), `aEnd = 2 PI - aStart`, 168 steps, points rounded to 0.001 mm; the closing segment is the chord. The flat is 2 x sqrt(54^2 - 41^2) = 70.3 mm long and cuts 13 mm off the circle (computed). It exists because the Pi 4/5 Ethernet and USB-A bank reaches 28.5 mm below the glass while the board sits at 23.5 to 25.1 (stack table in `VW` NOTES).

### 4.3 QFN generator with corner clearance

`qfn(pins, body, pitch, thermal)` (`TSX` lines 15 to 35), written because footprinter's `qfn` overlaps its corner pads:

```
perSide = pins / 4
pw (tangential) = pitch - 0.22
pl (radial)     = 0.55
r  = body / 2 - 0.45 + pl / 2            # pad centre distance from the body centre
span = (perSide - 1) * pitch / 2
pad i: side = floor(i / perSide) (0 left, 1 bottom, 2 right, 3 top), t = span - (i % perSide) * pitch
  left (-r, t)   bottom (-t, -r)   right (r, -t)   top (t, r)     -> counter-clockwise numbering from top left
thermal pad: square `thermal` at the origin, numbered pins + 1
```

`QfnFootprint` (lines 37 to 61) gives each pad two port hints (number and function label). Instances: U1 BQ25896 `qfn(24, 4, 0.5, 2.6)`, U3 TPS61088 `qfn(20, 3.5, 0.5, 2.1)`, U5 TAS5825M `qfn(32, 5, 0.5, 3.4)` (lines 199 to 275). Pin maps U1_PINS, U3_PINS, U5_PINS (lines 65 to 81) were "written from my own knowledge, not parsed from datasheets" (README in `F/fab-rev-a-prepour/`): inferred tier.

### 4.4 Power path, boost and push-button latch

| block | parts | lines |
|---|---|---|
| input | USB-C power only (hand footprint, 6 pads plus 2 shield, `TSX` lines 175 to 194), CC1/CC2 5.1k to GND | 175 to 196, 352 to 360 |
| charger | BQ25896 at (-16, -40): VBUS1 and VBUS2 on VBUS, PMID1 decoupled by C1 10 uF (PMID2 left unconnected), SW1 and SW2 through L1 1.5 uH to VSYS, BAT to VBAT, ILIM 10k, TS to the J9 NTC connector, I2C bus 1 | 198 to 237, 362 to 384 |
| gauge | MAX17048 `son8`, CELL and VDD on VBAT, I2C bus 1 | 211 to 220, 386 to 395 |
| boost | TPS61088 at (-2, 38): VSYS through L2 2.2 uH, VOUT to V5V with 22 uF and 470 uF, FB from R4 100k (to V5V) over R5 16.9k (to GND), EN on BOOST_EN | 239 to 253, 397 to 422 |
| latch | LTC2954-1 `sot23_8`: VIN on VSYS, PB_N to the button net with 100 nF, EN_OUT drives BOOST_EN, KILL_N on KILL pulled to VSYS by R6 100k; the Pi drives KILL from GPIO26 after shutdown | 254 to 265, 424 to 433, 517 to 518 |
| out | V5V to header pins 2 and 4 and to the panel connector J8 | 435 to 448 |

The README states 5.1 V 3 A. The divider gives 1.212 x (1 + 100 / 16.9) = 8.38 V with the TPS61088's 1.212 V reference (vendor value, from memory, unverified in this pass) or 4.15 V with a 0.6 V reference (computed): neither is 5.1 V (CHK-BRD-12 origin). KILL sits on a node pulled to VSYS (up to 4.2 V) while a 3.3 V Pi GPIO drives it directly (CHK-BRD-13 origin).

### 4.4.1 Support pins left without a net (read from `TSX` lines 352 to 518)

Every IC pin that no `<trace>` names, listed so the port can carry a "support pin unconnected" check. What each pin needs is a reading of the parts from memory (inferred); that the pins carry no net is read from the code.

| part | pins with no trace | consequence (inferred) |
|---|---|---|
| U1 BQ25896 | STAT, INT_N, OTG, CE_N, QON, PMID2, BTST, REGN, D_MINUS, D_PLUS | no bootstrap capacitor from BTST to SW and no REGN capacitor, so the buck high-side driver has no supply; CE_N floats, so charge enable is undefined; D+/D- are open, so input current detection falls back to its default |
| U3 TPS61088 | COMP, SS, FSW, ILIM, MODE, NC1 to NC3 | no compensation network, no frequency resistor, no current-limit resistor, no soft-start capacitor; the boost has no defined operating point |
| U4 LTC2954-1 | ONn, INT_N, NC | the interrupt that tells the Pi a press happened goes nowhere, so the GPIO26 kill handshake has no request side |
| U5 TAS5825M | MCLK, SDOUT, GPIO0 to GPIO2, OUTA2, OUTB2, OUTC2, OUTD2, BSTA to BSTD | no bootstrap capacitors on any half-bridge, so no output stage can switch high; half the bridge outputs are open (section 4.5) |
| U2 MAX17048 | CTG, QSTRT, ALRT_N | CTG should go to ground per the part's usual connection; alert is unused |

The DRC passes all of this: tscircuit's checker reads geometry, never pin function, which is the gap CHK-BRD-12 and CHK-BRD-13 only partly close.

### 4.5 Audio

TAS5825M at (-41, 0) on I2S GPIO18 BCLK, GPIO19 LRCLK, GPIO21 DOUT, I2C bus 1, PDN_N on GPIO22, DVDD and AVDD on 3V3, PVDD on VSYS, ADR to GND (lines 266 to 298, 462 to 486). Output filters (lines 488 to 498): OUTA1 through L3 10 uH with C12 680 nF to J5+, OUTB1 straight to J5-; OUTC1 through L4 with C13 to J6+, OUTD1 straight to J6-. One leg of each bridge is filtered and OUTA2, OUTB2, OUTC2, OUTD2 are unconnected (inferred defect).

### 4.6 IO

J4 Qwiic on bus 1 with 3V3 (lines 300 to 308); J8 5 V plus I2C bus 0 pass-through from GPIO0/1 for the Waveshare panel (lines 309 to 316, 450 to 460) (GPIO0/1 are the HAT ID EEPROM pins, so a HAT EEPROM is impossible on this board); J7 8-pin JST-SH buttons: power to the latch, sleep GPIO17, A GPIO27, B GPIO23, each with a 10k pull-up to 3V3, and an LED pair with 330 R from 3V3 sunk by GPIO24 (lines 317 to 329, 500 to 515).

### 4.7 Ground plane and DRC

Inner1 pour with 0.3 pad and trace margins and 0.6 edge margin (lines 331 to 332); `minBoardEdgeClearance 0.6` (line 159). DRC (both reports): five errors at U1 in the bottom crescent: two traces in accidental contact with U1 pads (CE_N, SW1), one trace touching U1's own pin 14 to 15 trace, a 0.045 mm pad-to-trace clearance against 0.1 at PMID2, and `pcb_via_120` over the board edge; warnings 146 unnamed trace, 14 x 3 pin attribute, 9 refdes. Fix proposed in the README: delete the `.U1 > .PAD` trace (line 410) and stitch the thermal pads to the plane with vias.

### 4.8 Upstream workarounds (README)

1. footprinter `qfn` overlaps corner pads: replaced by `qfn()`.
2. `circuit-json-to-gerber` throws on 4 layers because it asks for a soldermask name on inner copper: `getGerberLayerName` patched in `node_modules` to return an unused key (must be repeated on a clean install).
3. `<platedhole>` inside `<footprint>` takes `pcbX`/`pcbY`; `x`/`y` stack every hole at the origin.

### 4.9 Assembly viewer kernels (`VJS`)

| kernel | construction | lines of `VJS` |
|---|---|---|
| frame | board plane is XY, +Z toward the viewer; groups `lcd`, `pi`, `brd`, `bat` | 26 to 28 |
| display stand-in | three discs: glass r 53.0 x 1.1 at z -0.55 (roughness 0.12), panel r 50.8 x 2.4 at -2.3, carrier r 54.0 x 1.6 at -4.3; four brass standoffs r 1.7 x 6 at the HAT holes, z -8.1 | 38 to 45 |
| Pi stand-in | boxes: PCB 85 x 56 x 1.4 at (10, 0, -11.8), header 51 x 5.6 x 8.5, SoC 15.5 square, Ethernet 16 x 21 x 13.5 and two USB stacks 17 x 14.5 x 16 at x 50, three small connectors; labelled "dimensional stand-in" in NOTES | 47 to 57 |
| pouch | box 66 x 66 x 9 at (0, -2, -29.6) | 59 to 60 |
| GLB placement | parse the base64 GLB from `circuit-json-to-gltf`; rotate the thinnest bbox axis to Z; recentre; sample every 17th vertex and count z above +0.9 against below -0.9; if more are below, flip PI about X; place at z -24.3 (the board mid plane) | 67 to 93 |
| explode | display +42 f, Pi +8 f, board -22 f, pouch -54 f | 100 to 106 |
| presets | iso (0.62 d, -0.66 d, 0.52 d) with d 210, front, back, edge; target (0, 0, -15) | 108 to 117 |

The orientation heuristic answers "which way up did the exporter put it" by counting geometry, which is why BACK shows the component face in `g03` (measured): the heuristic has no notion of which face is the top, only which side has more vertices. In this stack the Pi sits face down above the board (Pi PCB at -11.1 to -12.5, header body -12.5 to -23.5, NOTES stack table), so the GROMMET component face with J3 should point +Z; the scene points it -Z.

Other viewer details (`VJS`): a hemisphere light (`0xc3d8ea` over `0x1a1e24`, 1.05) plus three directional lights, a white key at (90, -140, 180) at 1.6, a cool fill at (-120, 110, -90) at 0.5 and a teal rim `0x3fd9b4` at (0, 60, -160) at 0.35 (lines 21 to 24); SPIN turns every group 0.005 rad per frame about Z (line 129); the tab handler calls `resize()` when the 3D pane is shown, because a hidden canvas has zero size (line 9); a GLB parse failure replaces the loader text with "GEOMETRY FAILED TO PARSE" (line 93); materials are `MeshStandardMaterial` with roughness 0.65 and metalness 0.1 unless set (line 30).

---

## 5. UX anatomy and what makes it excellent

| region | contents |
|---|---|
| shell | dark, off-brand: `--bg #101316`, `--panel #171b20`, `--panel2 #1d222a`, `--line #2a313b`, accent teal `#3fd9b4`, warn `#e0a33c`; font stack `ui-monospace, "JetBrains Mono", "IBM Plex Mono", Menlo, Consolas` (system monospace first) at 13 px |
| header | ring mark, "GROMMET rev A", stats row (41 parts, 183 pads, 46 holes, 130 traces, 133 vias, 16 nets, 4 layer, 108 mm) |
| tabs | ASSEMBLY, PCB, SCHEMATIC, BOM, NETLIST, DRC, NOTES |
| ASSEMBLY | full-pane three.js r179 with OrbitControls (damping 0.08); STACK card: display module, raspberry pi, grommet, lipo pouch checkboxes with swatches, EXPLODE slider; dims card "display glass to battery back 34.1 mm", "outline 108 mm, chord at +41"; tools ISO, FRONT, BACK, EDGE, SPIN; hint line |
| PCB and SCHEMATIC | `circuit-to-svg` output on a light card |
| BOM, NETLIST, DRC | tables and the DRC text, values printed as tscircuit gives them ("0.000022 F") |
| NOTES | verify-before-fab warning, stand-in disclaimer, the stack table in mm from glass to pouch, power, audio, I2C, buttons |

What makes it excellent: the board is shown in the object it lives in, at true height, with the reason for its shape (the chord) visible in the stack; every fab artefact (PCB, schematic, BOM, netlist, DRC) is one tab away in the same file, offline; and the DRC tab ships the errors instead of hiding them.

---

## 6. Known limits and failure lessons

| # | issue | state |
|---|---|---|
| 1 | five DRC errors at U1 and a via over the edge | open; fix is vias on the thermal pads |
| 2 | boost divider gives 8.4 V or 4.15 V, never 5.1 V | open (CHK-BRD-12) |
| 3 | 3.3 V GPIO26 on a VSYS pull-up | open (CHK-BRD-13) |
| 4 | half-filtered bridge outputs, second outputs floating | open |
| 5 | GPIO0/1 used for I2C pass-through; no HAT ID EEPROM | open; the LUG successor also lacks the EEPROM |
| 6 | pin maps from memory for U1, U3, U5 | inferred tier until datasheets are parsed |
| 7 | rebuild scripts missing from every source | the port rebuilds the pipeline |
| 8 | the owner's 21:34 screenshot (`F/uploads/Screen_Shot_2026-07-28_at_9_34_35_PM.png`, the pre-pour viewer with tabs 3D, PCB, SCHEMATIC and presets ISO, TOP, BOTTOM, EDGE) shows the disc touching the canvas at top and bottom and the pre-pour title silk at (-30, 44) reading only "T rev A"; the straight right edge in that shot is the chord flat at x +41, not a crop | the harvest moved the title to (0, 45); the camera distance is still a fixed 210 |
| 9 | rebuild takes about 5 minutes (render, autoroute, export) | README |
| 10 | bootstrap, compensation, enable and interrupt pins left without nets on U1, U3, U4 and U5 (section 4.4.1) | open; a pin-function check, never a geometry DRC, finds it |
| 11 | the assembly viewer turns the board face toward the pouch instead of the Pi (section 4.9) | open; orientation comes from the exporter's declared frame |

---

## 7. Tests and harness

No harness ships. The DRC report is tscircuit's own and is printed, not gated. Drive 2026-10-05: six shots, zero page errors (measured).

---

## 8. Port map

| item | value |
|---|---|
| packages | `board` (tscircuit capture with a 4-layer gerber wrapper that owns the `getGerberLayerName` patch), `catalog` (QFN generator, HAT header generator), `archetypes` (power path, latch, I2S amp), `ui-core` (assembly view with bought-body stand-ins and stack dims) |
| feature kinds | `pad`, `port`; outline with a chord flat has no kind; the battery pocket is silk only |
| canon ids | `pi-hat-carrier` is the nearest entry and cites LUG (`docs/plan/CANONS.md` lines 521, 659, 1142); `soft-power-latch`, `i2s-amp-pair` are listed as archetype candidates citing GROMMET (CANONS.md line 1183) |
| canon MISSING | `soft-power-latch` LTC2954 variant with the GPIO kill handshake (candidate, not registered), `i2s-amp-pair` TAS5825M variant, `1s-power-path-boost` two-chip (BQ25896 plus TPS61088), `round-carrier-chord-flat` outline, `qfn-corner-clearance` footprint generator in `catalog` |
| reference ids | MISSING; proposed `boards/pi-hat` (`fab-knowledge:synthesis/mappings.md` line 120); LUG becomes `reference/boards/lug-hat` at M08 |
| checks it originates | CHK-BRD-12 (regulator divider against Vref), CHK-BRD-13 (GPIO onto a node pulled above VDDIO) (`docs/plan/CHECKS.md` lines 1116 to 1117) |
| milestone | M08 |
| lineage row | MISSING |
