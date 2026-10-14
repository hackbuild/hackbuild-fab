# TACK rev A: how it is made

The hack.build blinky pin: a 36 mm round two-layer PCB with the real hack.build mark (the wrench is a soldermask opening over the front copper pour, so it renders as bare ENIG gold; the broken arc is black silkscreen), four pink 0603 LEDs that alternate left and right pairs from a two-transistor astable, powered by a CR2032, no firmware. A Python generator places parts from parsed KiCad footprints, draws every copper region as a shapely polygon, refuses to emit unless nine gates pass, emits gerbers and Excellon, then independently re-rasterises its own gerbers and compares them to the source geometry. The same chat produced the `board-forge` skill. It sits in this family as the board-route sibling of the printed sensors: the gate-then-emit discipline the printed benches copy.

Number rule: constants are generator values at the line named in `fab-knowledge:originals/tack/files/rev-a/pin.py` or `fab-knowledge:originals/tack/files/rev-a/emit.py`; IoU and gate results are measured by the generator run as reported in the README; the blink rate is computed from the RC values.

Folder: `fab-knowledge:originals/tack/`.

## 1. Identity and revision

| field | value |
|---|---|
| owner name | TACK |
| slug | tack |
| canonical revision | TACK rev A, the only revision; harvested `fab-work-directory:benches/tack/outputs/` (chat of 2026-08, files stamped 2026-09-14 19:45 at harvest) |
| sha256 | `tack-rev-a.zip` `069f16b8de66b0413e4693d22fffcc43e99004bd057021de7fed9f13f75ecb90`; `sim.html` `5667232026fd9219427fae2f562703d971b5a5ee8e1e4d63ceb7efb356ad92be` |
| copies here | `fab-knowledge:originals/tack/files/tack-rev-a.zip` and unpacked `fab-knowledge:originals/tack/files/rev-a/` (`pin.py` 402 lines, `emit.py` 275, `write_sim.py` 255, `fp/*.kicad_mod` six footprints, `gerbers/` GTL GBL GTS GBS GTO GBO GKO, PTH and NPTH drills, `drill-map.json`, `BOM.csv`, `CPL.csv`, renders), `fab-knowledge:originals/tack/files/sim.html` (single-file viewer with real KiCad models and live blink), `fab-knowledge:originals/tack/files/README.md`, `fab-knowledge:originals/tack/files/board-forge.skill` (sha256 `4f0fa5d9466a124f4607d04403edcea61db600a4421d6dbdf4d286e47f6dbf46`) |
| left out | `sim-template.html` and `viewer-template.html` (skill templates, not the design); the chat upload `files__36_.zip` (ARMATURE R1 carrier, a different design) |

Why rev A: it is the only TACK; it passed its own nine gates and the gerber reparse after the chirality fix (4.6).

## 2. What it makes and for whom

A wearable pin for hack.build events: order the gerbers (white soldermask, black silk, ENIG), hand-solder 14 parts, push in a CR2032, slide the switch, and the four pink LEDs blink left and right at about 0.72 Hz. Lace a safety pin through two holes or solder a tie-tack post to the bare PIN disc.

## 3. Shots

| file | what it shows |
|---|---|
| `fab-knowledge:originals/tack/shots/tack-front.png` | generator render, front: white mask, gold wrench (mask opening over the VPLUS pour), black silk arc, four LED footprints with pink rings, vias |
| `fab-knowledge:originals/tack/shots/tack-back.png` | generator render, back: CR2032 centre pad, slide switch pads with OFF and ON, PIN disc, Q1 and Q2, R1 to R4, C1 and C2, `+ UP`, `hack.build`, `TACK rev A` |
| `fab-knowledge:originals/tack/shots/sim-back.png` | `sim.html` BACK cam (puppeteer, 1280 x 860): Keystone 3034 retainer, JS102011 switch (a PCM12 model stand-in), SOT-23s, 0805s, mirrored silk; title bar `astable 0.72 Hz` |
| `fab-knowledge:originals/tack/shots/sim-iso-lift.png` | ISO cam with LIFT at maximum: front silk and mask over the gold-coloured FR4 core, back copper with its isolation outlines, parts below |
| `fab-knowledge:originals/tack/shots/sim-front.png` | FRONT cam at lift 0 as rendered in this headless run: the substrate colour covers the front mask, silk and LEDs (observed here; the lifted view and the static front render show the art) |

## 4. Mechanisms, circuits and constructions

### 4.1 Real footprints, never retyped

`load_pads` (`pin.py:48` to `67`) parses KiCad `.kicad_mod` files with `kicad_fetch._sexp` for pad number, type, shape, position, rotation, size and drill. `place_pad` (`:73` to `91`) negates KiCad y (footprints are y-down, the board frame is y-up), rotates by part rotation, builds circles, boxes or roundrects (`buffer(-0.25 min) .buffer(+0.25 min)`), and returns the polygon. Six footprints: Keystone 3034 1x20 mm, C&K JS102011SAQN, SOT-23, LED 0603, R 0805, C 0805 (`:69` to `71`).

### 4.2 Placement

`put()` (`:95` to `99`); back parts (side B): BT1 at (0, -2), SW1 at (0, 12.6) rotated 180, Q1 and Q2 at (+-14.6, 1.6) rotated 90, R1 and R2 at (+-15.6, -4.6), C1 and C2 at (+-4.2, -11.6), R3 and R4 at (+-13.1, -3.2); front LEDs D1 to D4 on a 13.2 radius at 135, 225, 45, 315 deg, rotated to their angle (`:102` to `116`). Vias named and placed by hand (`:118` to `129`); NPTH lace holes 1.3 at (+-3.4, 15.2) plus the switch's own NPTH (`:131` to `133`).

### 4.3 Copper as named polygons

Rules (`:28` to `35`): board radius 18, copper to edge 0.50, net to net 0.25 (fab minimum 0.15), trace 0.50, via 1.0 with 0.5 drill, annular minimum 0.15, circle resolution 64.

Front (`:141` to `176`): a VPLUS pour (`circle(0, 0, R - edge)`); two cathode islands (left pair, right pair), each a via, an arc trace at r 12.41 and a spoke to each LED cathode pad; two front hop lanes for BASE1 and BASE2 along r 16.6; the pour is carved by every island and hop grown by the clearance and by each NPTH plus 0.4. LED anodes flood into the pour.

Back (`:178` to `266`): BTMINUS from the battery centre pad to switch pad 3 (0.8 trace); GND seed from switch pad 2, the emitters and the PIN disc; VPLUS from both retainer clips by vias and from the 100k tops; cathode vias down to the 100R per pair; collectors COL1 and COL2 down the SOT centre channel to the 100R, then an arc lane at r 13.3 to the outer cap pad; BASE1 and BASE2 cross-coupled through the inner cap pads, arcs at r 14.1 and 15.15, the front hops and back stubs to each base and 100k. The GND pour is the board disc minus every back net grown by the clearance, vias and NPTH, keeping only the pieces that touch the GND seed.

Circuit (README, `pin.py:11` to `16`): MMBT3904 pad 1 B, 2 E, 3 C (datasheet); LED anode to pour, cathode via 100R to COL1 (left) or COL2 (right); C1 COL1 to BASE2, C2 COL2 to BASE1; R1 and R2 100k from VPLUS to each base; emitters to GND; the slide switch breaks battery minus (low side). Half period `0.693 x 100k x 10 uF = 0.693 s`, about 0.72 Hz (computed).

### 4.4 Logo as geometry

`ARC_D` and `WRENCH_D` are the canonical mark paths using only relative m, h, v, l commands; `path_poly` parses them directly (`:268` to `293`); `to_board` maps the 800-unit viewBox to a 21 mm logo with y flipped and centred (`:295` to `302`). Front mask openings: the wrench plus each LED pad grown 0.05; back openings: every back pad grown 0.05 and the PIN disc; front silk: the arc (`:304` to `317`).

### 4.5 Gates: refuse to emit (`run_gates`, `pin.py:323` to `398`)

1. Named netlist audit: the `want` table lists VPLUS 5 pieces, GND 1, BTMINUS 1, KL 2, KR 2, COL1 1, COL2 1, BASE1 4, BASE2 4, SW_NC 1, but the code only fails a net that is missing entirely; the piece counts are not compared (`:324` to `330`).
2. Single island per net across layers: union find over same-layer intersection plus any vias whose centre lies within `VIA_D/2 - 0.05` of pieces; 2b, the GND pour is one Polygon (no split plane).
3. Clearance per layer between different nets at least `CLR - 0.02` = 0.23.
4. Copper to the board edge at least `EDGE_CLR - 0.02` = 0.48.
5. Via annular ring at least 0.15, computed from the constants `VIA_D/2 - VIA_DRILL/2` = 0.25 for every via, not measured per via against its copper (`:376` to `379`).
6. No copper within 0.34 of any NPTH.
7. Front silk at least 0.12 from any mask opening (fabs clip silk on bare copper).
8. The wrench opening is fully backed by the front VPLUS pour (gold must be continuous).
9. Cathode islands not under the wrench opening (grown 0.2).

Any failure prints `GATE FAIL` and exits 1; a pass writes `gates.json` with the worst clearance. README result: zero clearance violations at 0.25.

Back silk gates (`emit.py:132` to `146`), run after the text pass because back silk exists only then: every back silk polygon at least 0.12 from a back mask opening, inside the board shrunk by 0.3, and at least 0.2 off every NPTH; failures print `SILK FAIL` and stop the emit. Back silk text (`emit.py:106` to `113`): `TACK rev A` 1.15, `hack.build` 1.3, `+ UP` 1.0, `ON` and `OFF` beside the switch, `PIN` 0.9 over the tie-tack disc, and reference designators at 0.85, all mirrored.

PIN disc (`pin.py:94`): a bare GND copper disc r 1.9 at (0, 14.0) on the back with a mask opening grown 0.05, part of the GND seed, for soldering a tie-tack post; the two 1.3 NPTH at (+/-3.4, 15.2) beside it take a safety pin.

### 4.6 Emit, then verify independently (`emit.py`)

Silk text from IBM Plex Mono Bold glyph outlines through fontTools (`:17` to `100`), back text mirrored; gerber regions per layer with polarity for holes (`:148` to `186`); Excellon for PTH and NPTH (`:197` onward). Verification (`:222` to `275`): pygerber renders each emitted copper layer at 20 px/mm, the source polygons are rasterised the same way, and the intersection over union must exceed 0.97: README reports 0.984 top and 0.981 bottom (measured).

Failure and fix (README): back-side chirality. Unmirrored back footprints meant the physically flipped SOT-23s landed B and E swapped; caught, BASE nets rerouted to the mirrored pin positions, regated to zero violations, re-emitted, re-verified. This became `CHK-BRD-03` (back-mounted asymmetric parts checked for chirality) in `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` and a review line in `fab-knowledge:evidence/x/benches-conductive-a/tack/skill/board-forge/references/design-review.md`.

Small inconsistency: `pin.py` docstring says `R(150)` per LED pair; the placed value and the BOM say 100R.

### 4.7 The sim

`write_sim.py` bakes `sim.html`: three.js inlined, `window.TACK_DATA` (copper rings per layer, mask openings, silk, parts) and `window.TACK_MODELS` (KiCad 3D models converted to meshes); one function owns the vertical stack (`slab(rings, z0, z1)`), mask layers, parts; views FRONT, BACK, ISO; LIFT explodes the layers; layer toggles copper, soldermask, silkscreen, parts; POWER blink alternates the LED pairs at the real RC rate. Model placement proof for all 14 parts (README).

### 4.8 Honest unverified list (README)

Pink LED Vf 2.8 to 3.0 V is marginal on a 3.0 V cell (red is the safe alternate); LCSC numbers left blank where stock was unverified; the switch 3D model is a PCM12 stand-in; thin isolation slots near the rim in the front pour; footprints from the v5-era mirror; back parts use flip-about-X mounting and the ON direction needs a first-build check.

## 5. UX anatomy

No parametric bench: the generator is the design tool, the sim is a viewer (header `TACK rev A`, `hack.build blinky pin | 36 mm | CR2032 | astable 0.72 Hz`, rail VIEW, LIFT, LAYERS, POWER, a hint line, a footer naming what is on each side). What makes it excellent is the pipeline: parsed footprints, named copper, nine refusing gates, an independent reparse, a chirality lesson turned into a check, and an honest unverified list.

## 6. Tests and harness

`python3 pin.py` (gates, writes `gates.json`) then `python3 emit.py` (gerbers, drills, IoU assert). Needs shapely, fontTools, pygerber, numpy, Pillow, the board-forge `kicad_fetch` script and IBM Plex Mono Bold; not rerun here.

## 7. Port map

| item | value |
|---|---|
| packages | board (shapely copper, gates, gerber and Excellon emit, reparse), catalog (kicad_fetch, footprint parse, 3D models), wiring (BOM, CPL), ui-core (board viewer) |
| feature kinds | pad, conductor (pour, traces), window (mask opening as art), port (battery, switch) |
| canon ids | astable-blinky-tack (candidate until M08; seed id astable-blinky resolves here) |
| canon MISSING | mask-opening artwork backed by a pour (gold logo) as a board feature with its gate; low-side slide power switch; CR2032 retainer seat |
| reference ids | boards/tack-pin (M08, named in CANONS.md; no folder yet) |
| reference MISSING | none beyond boards/tack-pin being unbuilt |
| milestone | M08 (board and catalog: boards that refuse to emit wrong) |
| lineage row | MISSING |
