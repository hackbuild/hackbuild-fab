# TUMBLER: how it is made

A gallery of 18 parametric mechanical modules for laser-cut sheet (and print): logic gates, memory, motion, kerf tricks and fluidics. Each module has a live action view whose output comes from its own geometry, an orbitable 3D view drawn without a 3D library, a cut sheet with closed and open topology enforced, and a "what bites" list. A bench wires gate blocks into circuits, evaluates them, and reports the slop and input stroke a cascade needs. A Tricks pane carries the rules of the craft. Everything follows one material strip: change the sheet and every cut file redraws. This record says how it is built, from the original code, so a builder can make the next module the same way.

Number rule for this file: constants and equations are read from `files/tumbler.html` at the lines named (module defaults are the bench defaults); figures marked computed are by hand from those; measured figures come from the headless drive of 2026-10-05.

Folder: `fab-knowledge:originals/tumbler/` (files, shots, SHA256SUMS).

## 1. Identity and revision

| field | value |
|---|---|
| owner name | TUMBLER (bench `tumbler`, chat "Mechanical logic gates gallery and circuit designer", conversation 68bdca6c) |
| slug | tumbler |
| canonical revision | harvested `tumbler.html`, 155,975 bytes, 2468 lines, sha256 `fe14c0cd07d8b10f8852317942fb86aa6ae3e30d12b60af344890e68cbc47178` |
| copy here | `files/tumbler.html` |
| exports | `files/exports/tumbler-bench-sheet-differential-coincidence.svg` (2026-08-11 20:25, DIFFERENTIAL 1 and COINCIDENCE 1, 228 x 146 mm), `tumbler-bench-sheet-tumbler-lock.svg` (20:40, shell, key, pin stack x10, bolt), `tumbler-bench-sheet-shift-drum.svg` (2026-08-12 16:58, cams T0 to T3 and four followers); all written by `planSVGFile` from Downloads, copied from `evidence/x/downloads/dl-ogee-stipple-mech/tumbler/` |
| companion | `files/companions/tumbler-may-escape-room-builder.html` ("TUMBLER // escape room builder", 2026-05-29, a different tool under the same name, kept for the record) |
| left out | nothing else exists; no tests, no source split |

### 1.1 Revision table

From `sources/downloads/dl-ogee-stipple-mech.md` section 5.

| date | file | state |
|---|---|---|
| 2026-05-29 | `tumbler.html` to `(2)` | escape room builder, unrelated |
| 2026-08-11 20:14 | `tumbler (3).html` | mechanical logic bench |
| 2026-08-11 20:25 to 2026-08-12 16:58 | `tumbler-bench-sheet*.svg` | cut sheets from the bench |
| 2026-08-12 20:25 | `tumbler (5).html` | last Downloads state |
| harvest | `tumbler.html` | later: adds yaw and elevation camera, pointer orbit, pan, pinch, tap tags |

### 1.2 Why the harvest

Newest and good: the 3D views orbit, pan and zoom by pointer and pinch, and every module still draws, plans and exports (measured: 0 console errors, 18 cards, bays and bench render). It is the copy CANONS.md cites line by line for the 18 module rows (CANONS.md lines 386 to 403).

## 2. What it makes and for whom

A maker with a laser (or a printer) and one sheet material picks a module, sizes it with sliders, watches it work, downloads a cut SVG with a cut layer and a score layer, and builds it. Or they wire gates on the bench into a half adder, a latch, a counter, a coded lock or a sequencer and cut every part on the bench in one sheet. The material strip defaults to Delrin 3 mm, kerf 0.22, fit 0.15 (`G`, line 203).

## 3. Shots

Driven headless on 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (Chrome, 1280 x 860) through the page's global functions (`openBay`, `BY`, `setBenchView`; the script is classic, so they are on `window`). Console errors: 0 (measured).

| file | what it shows |
|---|---|
| `shots/u01-gallery-18-modules.png` | PARTS pane: black header with the hack.build wordmark and TUMBLER, PARTS / BENCH / TRICKS nav, material strip (MATERIAL, t, KERF, FIT, note), category rail with counts (logic 6, memory 4, motion 3, kerf 2, fluid 3) and legend, card grid with live void thumbnails |
| `shots/u02-bay-coincidence-3d-both-inputs.png` | COINCIDENCE bay in 3D with both inputs driven through the module state (the A and B lamps read unlit because they style from the buttons, the Q lamp is lit): readout "stack 6.0mm pin clear 2.70mm input force 2 x slide", A, B and Q lamps, PARAMETERS sliders with number boxes, WHAT BITES notes, cut sheet head "4 parts / 228x69mm / 50.6cm2" |
| `shots/u03-bay-tumbler-lock-2d-key-in.png` | TUMBLER lock bay in 2D: pin stacks at the shear line, BOLT lit and the Q lamp lit, while the INSERT KEY thumb still sits at 0 because the drive set the module's input target directly rather than moving the range control (looked 2026-10-05); readout "pins 5 codes 3,125 window +/-0.4mm", INSERT KEY slider and WRONG KEY toggle, code digit editor 1 3 0 2 4, live cut sheet of 5 parts with SVG CUT FILE and ADD TO BENCH |
| `shots/u04-bay-geneva-3d.png` | GENEVA bay in 3D with TURN held: crank disc with its pin, the six-slot wheel with pink scalloped rim, readout "index 60.0deg centres 40.00mm wheel dia 69.3mm", notes on why the wheel size follows from the crank, cut sheet "3 parts / 147x179mm / 139.1cm2" |
| `shots/u05-bench-half-adder-2d.png` | BENCH with the HALF ADDER preset in 2D: palette of 15 block types and 5 presets, tool strip, canvas with blocks and wires, hint "half adder. XOR is the sum, AND is the carry." |
| `shots/u06-bench-half-adder-3d.png` | same circuit in 3D: each block draws its module's `asm` on a board; status "BLOCKS 6 LINKS 6 CASCADE DEPTH 2 STACKED SLOP 0.74mm INPUT STROKE NEEDED 20mm slop inside budget" |

## 4. Mechanisms and constructions

### 4.1 The part model and topology rule

`part(name, w, h, outer, holes, score)` (line 336): one closed outer loop, closed holes fully inside it, open score polylines. `partN` normalises to the origin (line 449). `partWarnings` (lines 339 to 348): a hole whose bounding box crosses the outline, or a hole thinner than 1.5 kerf ("it will fuse shut"); the second test is skipped when the material's kerf is 0, so the three print materials get no thin-hole warning (line 345). The bay shows a GEOMETRY WARNING badge listing them. Point builders: `rectPts`, `circPts` (26 segments default, line 223), `slotPts`, `keyedBorePts` (line 237, the key slot is part of the same hole), `ratchetPts`, `gearPts` (line 264), `genevaGeo`/`genevaPts` (lines 282 to 310), `hingeFieldPts` (line 311), `fingerEdgePts` (line 322).

### 4.2 Cut file export

`planSVGFile(parts, title)` (lines 1762 to 1773): shelf pack at 240 mm wide (`packSheet`, lines 350 to 359, gap 9), width and height in mm, group `cut` (black, stroke 0.1, one `evenodd` path per part), group `score` (blue `#0000ff`, open), group `labels` (grey 3 mm text), and a header comment `title : TUMBLER : material t kerf fit : cut layer closed evenodd, score layer open engrave`. The on-screen plan (`planSVGBody`, lines 1751 to 1761) draws the same packing with pink dashed scores. `benchSheet()` (line 2313) writes every part of every block on the bench into one file. The three shipped sheets carry the header "bench layout : TUMBLER : Delrin/POM 3mm t=3 kerf=0.22 fit=0.15" (measured by the downloads reader).

### 4.3 Material strip

`MATS` (lines 192 to 202): Delrin 3 mm (t 3.0, k 0.22, E 3100), Delrin 1.5 mm (1.5, 0.20, 3100, "the flexure material"), Acrylic 3 mm (3.0, 0.15, 3200, "snaps at any flexure"), Plywood (3.0, 0.20, 9000), Cardboard (3.0, 0.30, 800, "proof of motion only"), HDPE (3.0, 0.35, 900), PLA print 2 mm (k 0.00, E 3500, "dial FIT to 0.2 per face"), PETG print 2 mm (k 0, E 2100), TPU print 1.5 mm (k 0, E 30). `initStrip()` (lines 1735 to 1745) writes `G.t`, `G.k`, `G.E`, `G.c` and redraws everything.

### 4.4 ISO prism renderer (3D without a 3D library)

`renderISO(items, glows, texts)` (lines 377 to 418): each item is a prism `{pts, holes, ax: z|y|x, b, th, rot, dx, dy, dz, pr, tag, top, side, stroke}` (`prism`, line 376). Projection `prj(x,y,z)`: yaw rotate about the camera centre, then `[u, v sin(el) - z cos(el) 1.6]` (lines 367 to 373). Painter sort key `pr * 100000 + cz * 2.4 + vdep * 1.4`; side quads per edge sorted by edge depth; cap drawn last as one evenodd path with its holes; glows and texts on top, pointer-transparent. The returned viewBox is the projected bounds plus 6. `orbitAttach` (line 572): pointer orbit, pan with shift, right button or two fingers, pinch and wheel zoom, tap on `data-tag` throws a lever.

`fitVB(m)` (lines 1806 to 1819): draws the module at all inputs 0 (time 0) and all inputs 1 (time 0.45) into a hidden SVG, unions `getBBox()` of both and pads 4, so the 2D stage never jumps as the mechanism moves. The 3D camera radius is set once per view entry (`_vb3`).

### 4.5 The 18 modules

Each module is `{id, name, cat, fn, blurb, params, ports, lg, draw(p,u) -> {vb, body, q, read}, asm(p,u) -> {items, glows, texts}, plan(p) -> parts[], notes[]}` (`MODS`, line 608 onward). `draw` derives the output `q` from its own geometry; `asm` returns prisms for the 3D view; `plan` returns cut parts. Inputs per module are in `SIMS` (lines 1711 to 1726): toggle, `pulse`, `hold` or `slider`. Equations below are the code's; canon ids are CANONS.md section 3 rows.

| module (line) | fn | governing geometry in the code | canon id |
|---|---|---|---|
| COINCIDENCE (613) | AND | half gap `(nd - pd)/2 - c`; a bar aligns when its offset is under 0.75 of that; drop `t + 0.4` per aligned bar; `q = drop / (2t + 0.8)`; cut notch `nd + k`, guide slots `tv + gs` with `gs = pd + 2c + k`; both bars one part | coincidence-and |
| INHIBIT (672) | A AND NOT B | same bar mounted backwards, notch at home | inhibit |
| WEDGE OR (727) | OR | ramp ratio from the angle; free length in each slot is lost motion; binds past 60 deg | wedge-or |
| TEETER (783) | NOT | gain `ao/ai`; spring `F = 3 E I x / L^3`, `I = t w^3/12`, slit from the block edge | teeter-not |
| DIFFERENTIAL (842) | XOR | two drop pins, each bar two holes at opposite phase, lost-motion yoke ORs the pins | differential-xor |
| TUMBLER (909) | CODED AND | `tumbSolve` (line 473): each pin rises `d * lift` with the key in; ok when error is under `shear` and insertion over 0.85; `5^n` codes (3125 at n 5, computed); channels open at the bottom for loading | tumbler-coded-and |
| DETENT LATCH (979) | SR | hold `F = 3 E I dep / L^3`; pawl is block, beam and tip in one part | detent-latch |
| SNAP FLEXURE (1036) | BISTABLE | `Q = rise / tk > 2.31` for two states; `Fs = 48 E I rise / span^3`; beam formed by two crescent holes | snap-flexure |
| RATCHET (1086) | COUNTER | step `360/n`; carry pin on tooth zero divides by n | ratchet-pawl |
| SHIFT DRUM (1141) | SEQUENCER | one cam track per bit (`camTrackPts`, line 512); dwell over about 80 percent merges lobes; keyed bore | shift-drum |
| GENEVA (1217) | INDEXER | `c = cr / sin(pi/n)`, `wr = c cos(pi/n)`, lock disc `0.92 cr`; frame-stepped motion (2.2 deg per frame) | geneva-external |
| SPUR PAIR (1282) | GEARS | involute from `inv(a) = tan a - a`; `rp = m z/2`, `ra = rp + m`, `rd = rp - 1.25 m` | spur-pair |
| WHIFFLETREE (1332) | BINARY DAC | output `sum b_i stroke 2^i`; stops `2^n` | whiffletree-dac |
| LIVING HINGE (1392) | FLEXURE | bend radius `span/theta`; per row `bend/rows`; ligament `span/(rows+1) - slot w`; bad over 13 deg per row or under 0.6 ligament | living-hinge |
| FINGER JOINT (1448) | JOINERY | `seg = L/(2n+1)`; tab `seg + k + fit`; slot `seg - k - fit`; readout press, slip or loose | finger-joint |
| TESLA VALVE (1497) | DIODE | estimated diodicity `1 + 0.12 n clamp(4/cw, 0.4, 2.2)`; islands become parts pinned to the lid | tesla-valve |
| COANDA GATE (1569) | FLUID LATCH | splitter 8 to 12 nozzle widths; the air path is one connected hole (`coandaHole`, line 548) | coanda-gate |
| MEMBRANE VALVE (1633) | TRANSISTOR | close pressure `P = 1000 Em mt^3 fd / fw^4` kPa; 4-layer stack | membrane-valve |

Known defects in the code: WHIFFLETREE `bits` ranges 2 to 5 but `SIMS.whif` drives only B0 to B2; the bench LOCK block has 3 inputs while the module defaults to 5 pins; GENEVA steps per frame, so its rate depends on frame rate (KNURL's closed form is the canon kernel, CANONS.md line 499).

### 4.6 Bench: blocks, evaluation and the cascade budget

Block types `BT` (lines 1948 to 1964): LEVER, CLOCK, AND (coin), OR, NOT (teet), INHIBIT, XOR (diff), LOCK (tumb, 3 inputs), LATCH, SNAP, COUNT (Q and CY), DRUM (4 outputs), FLUID (coanda), VALVE (memb), FLAG. Modules without a block answer "it is a mechanism not a gate" (`addNodeFor`, line 1971).

`evalBench()` (lines 1981 to 2014): 16 passes of combinational evaluation from wire sources, then one edge-triggered pass for state blocks (LATCH set on S rising and reset on R rising, SNAP toggles, COUNT carries every n teeth of the RATCHET module's `n`, DRUM steps through the SHIFT DRUM program grid, FLUID sides). Two block semantics are easy to miss: VALVE evaluates as the inverse of its control input (the membrane closes the flow when control is asserted, so the block is a NOT, line 1995), and COUNT's Q output is `c mod 2`, only the lowest bit of the count, with CY true on every `n`th rising edge (lines 1998 and 2009). The bench is evaluated every animation frame (`loop`, line 2424 onward). Outputs are booleans; the bench does not run module geometry, while the 3D bench view calls each block's module `asm` with its port values so the drawn mechanisms move (`bench3D`, line 2127).

Budget (lines 2015 to 2024 and 2110 to 2112): `depthOf()` is the longest wire chain; `STACKED SLOP = depth (kerf + fit)` (0.74 mm at depth 2 with k 0.22 and c 0.15, computed and measured in shot u06); `INPUT STROKE NEEDED = depth x 10 mm`; over 1.2 mm the status reads "deep chain, add a restoring lever". The code is linear in depth while the Tricks note says slop "doubles per stage" (CANONS.md line 546 records the disagreement).

Presets (`preset`, line 2287): HALF ADDER, SR LATCH (cross-coupled INHIBITs), 2 BIT COUNTER, CODED LOCK, SEQUENCER. Save and load the bench as JSON.

### 4.7 Tricks pane

`DOC` (line 2327 onward): fan-out, slop stacks (0.3 to 0.5 mm per sliding pair; past 1.2 add a restoring stage), routing without wire; kerf measurement (cut a 20.00 mm square, the shortfall is one kerf); fit rules press (tab plus one kerf, slot minus one kerf), slip (tab plus one kerf, slot as drawn), sliding (slot plus kerf plus 0.15), rotating (hole plus kerf plus 0.20); cut tricks (living hinge, flexure spring, buckled beam, lost-motion slot, keyed bore, open slot to rim, chamfered pin nose, captive nut pocket hex plus 0.2, score fold, island on pins, sacrificial rub plate); prior art (Turing Tumble, Spintronics, Digi-Comp, Ford Mk 1, escapements, fluidics, soft membrane logic); build order.

## 5. UX anatomy

| region | content |
|---|---|
| header | void bar, 3 px pink rule, `hack.build` in Permanent Marker with pink `.build`, `TUMBLER` in VT323; nav Parts, Bench, Tricks with Font Awesome icons, pink on the active tab |
| material strip | ink bar: MATERIAL select, t, KERF, FIT, and the material's one-line note in slime |
| gallery | 170 px category rail with counts and a legend ("cut lines closed, in ink. score lines open, in pink dash..."), card grid `minmax(230px, 1fr)` with live void thumbnails, name in Permanent Marker, fn chip, first sentence of the blurb |
| bay | name, fn chip, category, ALL PARTS back; ACTION panel (2D, 3D, reset view; readout line in slime; lamps per input and an output lamp Q lit over 0.5); CUT SHEET (packed plan, part count, extents, area, warnings badge, SVG CUT FILE, ADD TO BENCH); PARAMETERS (range plus number per parameter, code digit and bit grid editors); WHAT BITES |
| bench | palette left (blocks and presets), tool strip (2D, 3D, FIT, MOVE / WIRE, DELETE, RUN CLOCK, PULSE, CLEAR, CUT SHEET, SAVE, LOAD), pink 20 px grid canvas, inspector with a mini stage and "open in parts", hint line, status line |
| loop | eases each input toward its target (`lerp` 0.45 for sliders, 0.24 for buttons), redraws the open bay each frame, evaluates the bench each frame, paints it every 4 frames and the 3D every 3 (`loop`, line 2424) |
| tokens | `--hb-paper #f5f0e6`, `--hb-raised #fffdf7`, shadows `--sh3/5/7`, radius 0, 5 percent dot overlay; footer "make things. break things. repeat." |

What makes it excellent: one material strip drives every dimension of every module and every export; each module is a single object with its own draw, 3D, plan and notes, so a new module is one `MODS.push`; the cut SVG separates closed cut from open score so a laser driver can map layers; the bench turns a single gate into a circuit with a physical budget.

Limits: Google Fonts and Font Awesome come from CDNs (not offline); no global hook; the 3D views are an SVG painter, readable for stacked plates and weak for anything with depth complexity (shot u02 shows the coincidence bars as two flat plates and a pin).

## 6. Tests and harness

None shipped. The in-page checks are `partWarnings` per part and the bench budget line. The downloads reader confirmed the three exported SVGs carry the header and layers (`sources/downloads/dl-ogee-stipple-mech.md` section 5).

## 7. Port map

| item | value |
|---|---|
| packages | `mechanisms` (18 modules as MechanismDefs), `geom` (part topology, warnings), `nest` (shelf packer to be replaced), `profile` (material strip and four kerf fit rules), `constraints` (cascade slop and stroke), `ui-core` (ISO painter fallback, fitVB, lamp drive pad), `chase` (gallery as a catalog chase) |
| feature kinds | `flexcut`, `finger`, `snap`, `detent`, `pin_in_slot`; MISSING from the 26 kinds: `keyedbore`, `score` (export layer), `island-on-pins` |
| canon ids | coincidence-and, inhibit, wedge-or, teeter-not, differential-xor, tumbler-coded-and, detent-latch, snap-flexure, ratchet-pawl, shift-drum, geneva-external, spur-pair, whiffletree-dac, living-hinge, finger-joint, tesla-valve, coanda-gate, membrane-valve (CANONS.md lines 386 to 403, all present); MISSING: `cascade-slop-budget` as a constraint row, `material-strip` profile rows for cardboard, HDPE and the print entries |
| reference ids | `mechanisms/living-hinge` (handoff INDEX); `mechanisms/coincidence-and`, `inhibit`, `wedge-or`, `teeter-not`, `differential-xor`, `tumbler-coded-and`, `detent-latch`, `snap-flexure`, `ratchet-pawl`, `shift-drum`, `spur-pair`, `whiffletree`, `tesla-valve`, `coanda-gate`, `membrane-valve`, `joints/finger` named in CANONS.md section 8.1 and absent from the handoff INDEX (planned for M06) |
| milestones | M06 ("TUMBLER 18 modules regenerate and pass", M06-T02), M07 (nest), M11 (gallery as a catalog chase) |
| lineage row | MISSING |
