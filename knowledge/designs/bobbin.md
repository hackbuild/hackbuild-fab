# BOBBIN: how it is made

Record written 2026-10-05 from the original code. Slug `bobbin`. An IQ radio module (Semtech SX1257 plus an RP2350A doing the DSP) on a 50.8 x 25.4 mm 4-layer board with 2 x 12 castellated edges, designed in tscircuit and published as a single-page product sheet whose 3D layer inspector, pinout and build report are all rendered from the circuit JSON. Only the two rendered pages survive; the board source `BOBBIN-BOARD.TSX` named in the footer is in no source.

Number rules for this file. A number in a code table is a declared value from the page and line named. "Measured" means the headless drive of 2026-10-05 (Chrome, swiftshader WebGL, puppeteer-core, 1280 x 860, three.js fetched from unpkg) or a count taken that day from the page's embedded `pcbdata`. "Computed" means a calculation shown here. "Vendor" means a part datasheet value as the page states it. "Inferred" means a reading of the code. Provenance of the design is unknown: no chat, bench or registry row names BOBBIN; it was found by the Downloads sweep (`fab-knowledge:sources/downloads/dl-sweep-unmatched.md` section 3.5).

Short paths: `F` is `fab-knowledge:originals/bobbin/files/`. `B` is `F/bobbin-rev-b.html`. `BJS` is its app script, extracted at `fab-knowledge:originals/board-viewers/files/extracted/bobbin-layer-plane-inspector.app.js`. `A` is `F/lineage/bobbin-rev-a.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | BOBBIN rev B, "IQ radio module" |
| owner's slug | bobbin |
| canonical file | `B`, sha256 de008dba21e8f88f4bdcaa19c92d3744c6fc440b838794ea2d6d3808ee178596, 133322 bytes |
| date | 2026-07-28 21:47 (`~/Downloads/bobbin (2).html`; `bobbin (3).html` at 21:51 is byte equal) |
| board | 50.8 x 25.4 mm, 4 layer, 1.4 mm; 31 components, 172 copper pads (140 top, 32 bottom), 34 plated holes, 139 vias, 262 trace runs all 0.15 mm wide (147 top, 30 inner 1, 21 inner 2, 64 bottom) (measured from `pcbdata`) |
| toolchain | `@tscircuit/core@0.0.1538` per the sweep reader; source `BOBBIN-BOARD.TSX` (footer) |
| every hash | `fab-knowledge:originals/bobbin/SHA256SUMS` |

### 1.1 Every revision found

| when | file | sha256 | what | role |
|---|---|---|---|---|
| 2026-07-28 21:20 | `~/Downloads/bobbin.html` (= `bobbin (1).html` 21:44) | ae77d1dea152... | rev A: placement rendered "from source", 31 components, 81 nets, 0 netlist errors, "routing not yet run"; pin cards as HTML; an animated band strip and waterfall | lineage, `A` |
| 2026-07-28 21:47 | `bobbin (2).html` (= `(3)`) | de008dba21e8... | rev B: routed board, 10-layer 3D inspector, pinout SVG from the circuit, build report with its own errors | canonical |

### 1.2 Why this revision

Rev B is newest and the only routed one; its inspector, pinout and report all read one embedded `pcbdata` block. Rev A keeps one thing rev B dropped, the band strip that shows the 500 kHz window to scale inside the 140 MHz band (section 4.6), so `A` is kept as lineage.

### 1.3 What is in `fab-knowledge:originals/bobbin/files/` and what was left out

Kept: `B` and `A`. Nothing was left out: no source, gerbers, BOM or STEP exist for this board anywhere in Downloads, the harvest or the evidence folders.

---

## 2. What it makes and for whom

A software radio front end small enough to solder onto a carrier, for a maker whose host is an ESP32. The page states the constraint the design follows from: an RTL-SDR at 2.048 MSPS is about 33 Mbps of raw samples and this module at full width about 24 Mbps, which no microcontroller UART takes, so the RP2350 captures the SX1257's serial IQ in PIO, decimates and filters on the board, and sends only spectrum frames (256 bins at 20 fps), 8 kHz PCM or decoded packets: about 40 kB/s, which fits a 2 Mbaud UART (declared on the page). Four host modes: ESP32 over UART, Pi or ESP32-S3 over SPI with an IRQ per frame, anything over USB-C CDC with rtl_tcp, and standalone with I2S audio out.

---

## 3. Shots

Driven headless 2026-10-05 from `B` (no hook; 6 s wait, ready 9.8 s); no page errors; 31 console errors from the pinout SVG (`height="auto"` and `transform="rotate(0deg)"` are invalid SVG attribute values) (measured). Files in `fab-knowledge:originals/bobbin/shots/`.

| file | caption |
|---|---|
| `b01-hero-3d-stack-all-layers.png` | Hero: "BOB" in ink and "BIN" in copper, spec card (SX1257, 860 to 1000 MHz, 500 kHz 12-bit IQ, RP2350A PIO, 4 layer 1.4 mm, 2 x 12 castellated 2.54 mm), and the inspector in 3D stack mode: green board, component boxes, translucent shield can over the RF section, layer list grouped Top side, Inner, Bottom side, Mechanical, Overlay. |
| `b02-exploded-spread.png` | Exploded at full spread: each layer plane at its z times the spread, inner 1 and inner 2 routing visible between the copper skins, castellation rings on every layer. |
| `b03-bottom-side-passives.png` | From bottom: the passives that live underneath, the castellation rings, and the bottom silk, which reads mirrored ("BOBBIN REV B" backwards) because the bottom silk canvas is drawn unmirrored (measured). |
| `b04-flat-top-copper-masks-off.png` | Flat 2D, then From top, with top silk and top mask off: top copper over the inner layers. Flat 2D alone sets the azimuth to 0, but From top resets it to -0.62 rad with the flat tilt kept, so the board is drawn rotated (section 6, item 10). |
| `b05-pinout-section.png` | "Twelve per side, generated from the source.": `circuit-to-svg` style pinout with J3 and J4 half barrels on the outline, U1 radio, U2 DSP, J2 USB-C. |
| `b06-build-report.png` | Build report: components 31, pads 172, plated holes 34, vias 139, trace segments 262, silk 167, netlist errors 0, placement errors 0, edge violations 24, clearance violations 1. The report rows render unstyled against the page edge (measured). |

---

## 4. Mechanisms, circuits and constructions

### 4.1 Board and edge interface

50.8 x 25.4 mm (2.0 x 1.0 in), 4 layer, 1.4 mm (`pcbdata.board`). Castellations: two rows J3 and J4 of 12 plated holes, 1.0 drill on 1.7 pads at 2.54 pitch, centred on y = +/-12.7, which is the outline itself, so the board route cuts them into half barrels (measured). The same holes take a 0.1 in header or press into a breadboard. Pin labels from the silk (measured): top row GND, VIN, 3V3, TX, RX, SCK, MOSI, MISO, CS, IRQ, RUN, GND; bottom row GND, SDA, SCL, AUL, AUR, PPS, (three GP pads unlabelled on rev B, labelled GP_A, GP_B, GP_C on rev A), BOOT, SWC, SWD. All IO at 3.3 V.

### 4.2 Circuit (as the page and the placement show it)

| block | parts (refs from `pcbdata.comps`) | notes |
|---|---|---|
| RF chain | J1 edge SMA at (-22.15, 0), U7 at (-16.9, 0), then a fork: FL1 at (-13.5, 5) above the axis and U6 at (-13.5, -5) below it (same 2.71 x 1.65 body as U7), into U1 SX1257 at (-7.5, 0); L1 and R2 sit under this section on the bottom (the page names a switch, a filter and an LNA; which ref is which, and reading the fork as receive and transmit paths, is inferred) | straight line from the SMA to the radio with no vias in the RF chain (page text); shield can 21 x 20 x 2.4 over the RF section |
| radio | SX1257 zero-IF IQ transceiver, 860 to 1000 MHz, up to 500 kHz, 12-bit I and Q over a four-wire serial port; SX1255 swaps in for 400 to 510 MHz (vendor, as stated) | pin numbering "functional rather than taken from the package drawing" (page) |
| reference | X1 32 MHz TCXO 0.5 ppm at (-7.5, 7.2), shared by radio and DSP | |
| DSP | U2 RP2350A at (4.5, 0), PIO capture, dual Cortex-M33, 16 MB flash; U3 flash at (4.5, -8.2) | |
| power | J2 USB-C at (20.4, -0.4), VIN 5 V, LiPo charger, about 180 mA receiving (declared); U5 at (12.5, 6.6) and U8 at (12.5, -6.6), two 3.6 x 2.5 parts beside the USB-C (regulator and charger by position, inferred) | |
| headers | J5 at (20, -6.8), two holes; J6 at (19, 9.6), four holes in a row (battery and debug by position, inferred). Hole inventory: 24 castellations, 4 for J6, 2 for J5, 4 at the J2 shell (y 1.57 and -2.62) = 34 (measured) | |
| passives | all 16 bottom parts: C1 to C10, R2 to R5, L1, FB1 (measured), each under the pin it serves | |

### 4.3 Firmware personalities (page)

The RP2350 flash holds several signal chains, chosen per session over the wire, each reconfiguring the radio and the PIO program; updates by UF2 drag. Chain 01 Sweep (retune, capture, FFT; a 140 MHz picture from 500 kHz bites), Chain 02 Listen (NFM or SSB, squelch, PCM, also on I2S), Chain 03 Decode (FSK and OOK slicer with a configurable preamble, LoRa), Chain 04 Transmit (gated behind a deliberate flag; licensing is the user's). Host software: a WebSerial bench console, rtl_tcp compatibility for SDR++, WebUSB UF2 install, MQTT spectrum nodes.

### 4.4 Layer-plane inspector (`BJS`)

| step | construction | lines of `BJS` |
|---|---|---|
| layers | 10 entries: silk top z +0.80, mask top +0.76, copper top +0.72, inner 1 +0.233, inner 2 -0.233, copper bottom -0.72, mask bottom -0.76, silk bottom -0.80, drills +0.84, substrate 0 (from `BT / 2 = 0.7` plus 0.02 to 0.14 and `BT / 6`) | 8 to 20 |
| canvas per layer | 26 px/mm, `X(x) = (x + BW / 2) S`, `Y(y) = (BH / 2 - y) S` | 24 to 31 |
| copper | stroke every trace run on that layer with round caps; fill pads on top and bottom; annular rings of every hole and via on every copper layer; then `destination-out` to punch every drill | 49 to 72 |
| mask | fill `rgba(20,98,74,.86)`, punch pads of that side and holes plus 1 px | 74 to 83 |
| silk | stroke silk paths with butt caps; text in Spline Sans Mono 600 at `size x 26 x 1.35`, rotated by `-rot` | 85 to 99 |
| drills and substrate | drills filled dark; substrate a hatched tan canvas with every drill punched | 101 to 117 |
| scene | one `PlaneGeometry(BW, BH)` per layer with its canvas as map, `rotation.x = -PI/2`, at its z; a solid 1.4 mm slab for the 3D view; component boxes (connectors 2.6 tall, parts over 4 mm 1.0, others 0.6) on their side; the shield can at 0.28 opacity | 160 to 199 |
| views | 3D stack (slab on, translucent when an inner layer is on), Exploded (every plane z times `spread`), Flat 2D (camera straight down); From top and From bottom flip `phi`; render order recomputed from the camera side so the near layers draw last | 201 to 237 |
| orbit | drag 0.008 and 0.006 rad/px, wheel radius 34 to 220 | 250 to 262 |
| frame | planes turned `rotation.x = -PI/2` and component boxes placed at `(x, z, -y)`, so board y maps to world -Z: a proper rotation, the board is never mirrored in this viewer (contrast SPINDLE, section 6 there) | 165 to 188 |
| controls | moving Spread switches to Exploded by itself; the substrate plane shows only in Exploded and Flat (the slab stands in for it in 3D); the slab turns 0.3 opacity with depth write off whenever an inner layer is on; All layers ticks every box; render order is recomputed on pointer release | 201 to 248 |
| mask detail | the mask punches pads of its side and every plated hole plus 1 px, never vias, so vias read as tented; eight holes of type `circular_hole_with_rect_pad` (both J5 holes, all four J6 holes, pin 1 of J3 and of J4) carry null pad sizes and have no entry in the pad list, so the copper canvases draw no copper at them, only the punched drill (measured from `pcbdata`); the square pin 1 marker of each castellated row is lost in the inspector | 59 to 83 |
| no WebGL or offline | replaces the stage with "The 3D inspector needs the three.js CDN" | 144 to 148 |
| report | ten rows from `pcbdata.report` and counts; edge and clearance rows always classed warn | 279 to 293 |

### 4.5 Build report with its own errors

`pcbdata.report` = sourceErrors 0, placementErrors 0, edgeErrors 24, clearanceErrors 1 (measured). The page explains the 24: "A trace that terminates in a hole centred on the outline is by definition at the edge, and the checker has no concept of a half barrel." and states the stance: "a board page that claims zero problems is a board page nobody should trust." 24 equals the castellation count (computed). The one clearance error is not explained.

### 4.6 Band strip (rev A only, `A` script 2)

A spectrum canvas of the 860 to 1000 MHz band with 11 Gaussian carriers over a noise floor, and an orange window `0.5 / 140` of the width (the 500 kHz capture "honestly scaled") sweeping across it with a frequency readout (`860 + pos x 140` MHz); the window is drawn at least 2 device pixels wide so it never vanishes on a narrow canvas; under it a waterfall of what is inside the window, scrolled one row per frame; frozen under `prefers-reduced-motion`. This is the clearest picture in the corpus of why the module sweeps.

---

## 5. UX anatomy and what makes it excellent

| region | contents |
|---|---|
| shell | light drafting sheet: paper `#eceff0`, sheet white, ink `#0d1412`, mask green `#14624a`, copper `#a4581f`; Bricolage Grotesque display, Public Sans body, Spline Sans Mono labels; corner tick marks on framed panels |
| nav | BOARD, WHY, HOSTS, STACKUP, PINOUT, FIRMWARE, REPORT |
| hero | wordmark, one-sentence claim, spec card |
| inspector | toolbar: 3D stack, Exploded, Flat 2D; From top, From bottom; Spread slider; All layers. Left list with grouped checkboxes and swatches. Stage readout "BOBBIN rev B, 50.8 x 25.4 mm, 4 layer, n/10 layers shown". Caption: every layer is rendered from the circuit JSON |
| sections | constraint (wire rate, frame rate, full rate), four host cards, construction (top copper, inner layers, bottom copper, edges), pinout SVG, four firmware chains, software, build report, specification table, "What it will not do" |

What makes it excellent: the datasheet and the board are one artefact. Every picture on the page is drawn from the design data, the honest limits ("It will not show you 2 MHz of spectrum at once", "It is not fabrication ready") sit beside the claims, and the report shows the checker's errors with the reason for each.

---

## 6. Known limits and failure lessons

| # | issue | state |
|---|---|---|
| 1 | not fabrication ready: several footprints are generator approximations, SX1257 pins functional only | stated on the page |
| 2 | the autorouter used both inner layers for signals; inner 1 should be a solid ground plane under the RF section | stated on the page |
| 3 | 24 edge violations are the castellations; the checker has no half-barrel concept | proposed fix: exempt declared castellated pads from the edge rule (`fab-knowledge:sources/downloads/dl-sweep-unmatched.md` section 7) |
| 4 | one unexplained clearance violation | open |
| 5 | source `BOBBIN-BOARD.TSX` missing | the design cannot be rebuilt; the embedded `pcbdata` is the only geometry |
| 6 | three.js from unpkg 0.150.1: offline the 3D inspector is replaced by a notice | breaks the offline-first rule |
| 7 | pinout SVG uses `height="auto"` and CSS `rotate(0deg)` in SVG transforms (31 console errors) | measured |
| 8 | report rows lose their layout and sit against the page edge | measured in `b06` |
| 9 | every trace is 0.15 mm, including power | measured; same class as AUGER's lost widths (CHK-BRD-07) |
| 10 | Flat 2D then From top or From bottom draws the board rotated: `setView("flat")` sets `theta = 0`, but `setSide` sets `theta` to -0.62 or 0.62 whatever the view (`BJS` lines 225 to 239) | measured in `b04`; a side switch in the flat view keeps theta 0 |
| 11 | bottom silk reads backwards from below: `drawSilk("bottom")` uses the same `X()` as the top and no glyph mirror | measured in `b03`; position and glyph mirroring must be handled separately (SHUNT rule) |
| 12 | eight rect-pad plated holes render with no copper (section 4.4, mask detail) | measured from `pcbdata`; the exporter must carry pad size for every hole type |

---

## 7. Tests and harness

None ship. The report counts come from the tscircuit render. Drive 2026-10-05: six shots (measured).

---

## 8. Port map

| item | value |
|---|---|
| packages | `board` (tscircuit capture, castellated module seat), `exports` (datasheet page rendered from the design record), `ui-core` (layer-plane inspector: one textured plane per layer with z spread) |
| feature kinds | `pad`, `port`, `conductor`; castellated half-barrel pad has no kind (D-number for the castellated seat is cited as `plan/DECISIONS.md` line 909 in the sweep note); shield can and RF keepout have no kind |
| canon ids | none |
| canon MISSING | `castellated-module-edge` (2 x N on 2.54, holes centred on the outline, exempt from the edge rule), `iq-radio-pio-capture` (SX1257 plus RP2350 PIO), `rf-straight-chain` (SMA, switch, filter, LNA, radio with no vias), `bottom-side-passives` placement rule |
| reference ids | MISSING (no INDEX or milestone entry) |
| checks it informs | board edge clearance exemption for declared castellations (proposed, CHECKS.md); CHK-BRD-07 declared width |
| milestone | none named; M08 by kind |
| lineage row | MISSING |
