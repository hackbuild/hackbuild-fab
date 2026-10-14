# SHIM: how it is made

Record written 2026-10-05 from the original code. Slug `shim` (the circuit business card; a browser coding agent in Downloads, `shim.html` to `shim (7).html`, 2026-06-10, shares the name and is a different project, not copied). Modelled on the badge pouch card (`fab-knowledge:originals/badge-pouch-card/RECORD.md`).

Number rules for this file. A number in a code table is a declared value from the file and line named. "Gate output" means the generator and verifier output pasted into `F/README.md` by `make_readme.py` in the chat. "Measured" means the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Computed" means a calculation done for this record and shown. "Inferred" means a reading of the code. The generator was not rerun for this record (its parts library path and the `svgpathtools`, `ezdxf` and `cairosvg` dependencies were not set up).

Short paths: `F` is `fab-knowledge:originals/shim/files/`. `GEN` is `F/gen_board.py`. `CHK` is `F/check_board.py`. `SIM` is `F/shim-sim.html`, built by `F/make_sim.py`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SHIM rev A, hack.build circuit business card |
| owner's slug | shim |
| canonical file | `GEN` (with `CHK`, `make_sim.py`, `make_readme.py`, `text.py`) |
| generator sha256 | 55ae3afd3cfd86a894a3101f15e226abf5fd5063061cf819afe2c777da094588 (verifier `CHK` 70b18454a6b2156eca7a54063d55a1ff054273be52fa057e595a77e0b2241a9c) |
| viewer | `SIM`, sha256 3fbbdf35b2283edfb7f5711e962fb5b14af7a6b97d15b7aad0c414d521e593dd, 391869 bytes |
| date | 2026-08-11 13:13 UTC (`$TDCREATE` 2461264.0509722 in `F/shim-backer.dxf`, Julian date converted, computed) |
| process | vinyl-cut copper foil 0.05 mm on a lasercut backer (1.5 mm ply or 2 mm acrylic), printed guide sticker, transparent vinyl mask |
| card | 88.9 x 50.8 mm (3.5 x 2 in), corner r 3.2 (`GEN` line 21) |
| circuit | CR2032 two transistor astable, two red 3 mm LEDs at about 1 Hz |

One revision found: the harvest at `fab-work-directory:benches/shim/outputs/shim/` (30 files). No copy in Downloads. The README's build log path (`/home/claude/shim/out`) shows the scripts write to `out/`; the harvest holds the outputs flat beside the scripts, so `CHK` and `make_sim.py` need an `out/` folder with those files to rerun.

Why this revision: the only one, and it is good: the generator gates pass, an independent verifier that never imports the generator passes, the viewer is tested in jsdom, and the drive shows zero page errors and zero off-page requests (measured).

`files/`: `gen_board.py`, `check_board.py`, `make_sim.py`, `make_readme.py`, `text.py`, `test-sim.js`, `README.md`, `shim-copper-cut.svg` (+ 600 dpi png), `shim-mask-cut.svg`, `shim-guide.svg`, `shim-parts.svg`, `shim-backer.dxf`, `shim-geometry.json`, `shim-sim.html`, `parts/` (15 KiCad footprints: the chosen Keystone 3002 plus alternatives tried).

---

## 2. What it makes and for whom

A business card that is a working circuit. The left third is the hack.build mark cut in copper; press SW1 and two LEDs alternate. For handing out at events: cut on a vinyl cutter and a laser, hand soldered, no PCB order. The brush wordmark and tagline go on the printed guide sticker because Permanent Marker at this size is not weedable in copper.

---

## 3. Shots

Driven headless 2026-10-05 from `SIM` (CSS 3D, no WebGL, no hook); zero page errors, zero off-page requests (measured). Files in `fab-knowledge:originals/shim/shots/`.

| file | caption |
|---|---|
| `h01-stack-home.png` | Home view: lift 7, tilt 52, spin -18, zoom 7.5 px/mm; backer, guide, copper, mask and part outlines. |
| `h02-stack-exploded-orbited.png` | Lift 26 after a drag: ply backer, cream guide with registration crosses, wordmark and spec block, copper with the mark, translucent blue vinyl mask, black part outlines with D1 lit red. Readout bottom left: tilt, spin, lift, zoom. |
| `h03-flat-top-face.png` | FLAT: the card face as built. The VCC ring inside the GND ring, BAT1 retainer, the label placer's designators and polarity marks, the blink running. |
| `h04-copper-x24-sw1-highlight.png` | Copper thickness preset x24 (1.20 mm, nine stacked slices of the real cut polygon), lift 14, SW1 selected in the parts table and outlined pink. |
| `h05-copper-only-flat.png` | Guide, mask and parts hidden, flat, copper thickness still at x24 from h04 and SW1 still selected in the table: the copper and backer alone. The C2N riser runs up the 6.5 mm gap under SW1 between the two unrouted lead holes (the two dark dots), which is the one crossing handed to the switch. |

---

## 4. Mechanisms, circuits and constructions

### 4.1 The circuit

Two transistor astable (`GEN` lines 75 to 104): Q1, Q2 2N3904 TO-92 (leads formed to 2.54); LEDs D1, D2 red 3 mm in the collectors through 220R (R1, R2); timing 33k (R3, R4) with 22 uF 16 V (C1, C2, 6.3 mm radial at 2.5 pitch); CR2032 in a Keystone 3002 SMD retainer; 6 mm THT tact switch in series with the cell.

| quantity | value | qualifier |
|---|---|---|
| period | 1.38 x 33k x 22 uF = 1.00 s | computed (README "close to one second") |
| rate spread | 0.6 to 1.6 Hz from electrolytic tolerance | README, inferred |
| LED current | about 5 mA per side through 220R at 3 V | README, inferred |
| LED colour | red, since pink Vf is marginal at 3 V (TACK finding) | README |

Nets (`GEN` lines 91 to 104, README): GND (BAT1.2, Q1.E, Q2.E), VBAT (BAT1.1 x2, SW1), VCC (SW1, R1 to R4 top), C1N, C2N, B1, B2, N1A, N2A; decorative LOGO_ARC and LOGO_WRENCH.

### 4.2 Non-planarity proof and the switch as bridge

The reusable insight (README, docstring). Contract the two pin devices and the graph is a theta between the two transistors with three internally disjoint paths: GND; Q1 collector to Q2 base; Q1 base to Q2 collector. VCC must touch all three, and no face of a theta graph touches more than two of its paths, so exactly one crossing is unavoidable on one layer.

Resolution: lay the circuit out as a ring with VCC inside and GND outside, and hand the crossing to SW1. The 6 mm tact switch shorts its leads in pairs per row (pad 1 at (0,0) and (6.5,0), pad 2 at (0,4.5) and (6.5,4.5)), leaving a 6.5 mm column gap with no copper. The C2N riser runs up that gap under the switch body with 1.35 mm to the nearest lead (README); VBAT lands on the right column (`SW1 1@1`), VCC on the left (`SW1 2@0`). The two unused leads (`1@0`, `2@1`, net `None`) get backer holes and no copper, and are gated as bare leads. Zero wire links.

Risk (README): a switch with column-wise pairing shorts the crossing; meter the 6.5 mm span before soldering. Solder only the diagonal pair.

### 4.3 Footprint parse and placement transform

`parse_mod(name)` (`GEN` lines 38 to 63): regex over `(pad num type shape (at x y [rot]) (size w h) [(drill d)])`, plus F.Fab `fp_line`, `fp_arc`, `fp_circle`; raises if no pads parse. `xf(rot, pos)` (lines 65 to 72): footprint y-down to board y-up, `(x, y) = (fx, -fy)` then rotate CCW by rot and translate. Repeated pad numbers get keys `num@index` (lines 143 to 152) so BAT1's two tabs and SW1's paired leads are addressable.

### 4.4 Copper construction

Order (`GEN` lines 222 to 254):

1. Pads (`pad_poly`, lines 173 to 183): battery centre disc (circle over 8 mm) at full size, 64 segments; retainer tab (rect over 4 mm) as its box buffered 0.25; any other pad a circle of 1.70 (`PAD_FINE`, 2.54 pitch or tighter) or 2.20 (`PAD_MED`, drill over 1.0, the switch).
2. Tracks: hand-routed `TRACKS` dict of polylines and widths (lines 106 to 131): GND ring 2.60 open air, VBAT and VCC bus 2.40, constrained runs 1.60. `LineString.buffer(w/2, round caps, round joins, 16)`.
3. Teardrops: at each track end within 1.2 mm of a same-net pad, add `convex_hull(end disc of radius w/2 union pad)` (lines 243 to 248). One end cap, never the whole leg.
4. Logo (`logo_polys`, lines 186 to 217): the two paths of the canonical logo parsed with `svgpathtools`; aborts if any of `csqtaCSQTA` appears so the polygon is the artwork exactly; uniform scale to 24.0 mm wide at x 2.6, centred on y 25.4; ink fill selects LOGO_ARC, the other LOGO_WRENCH.
5. `net_geom = {k: unary_union(v)}`; `copper = union(all)`; outline `box(0,0,W,H).buffer(-3.2).buffer(3.2)`.

Constants (`GEN` lines 21 to 35): `W_MAIN` 2.60, `W_TRACE` and `W_STUB` 1.60, `CLEAR_MIN` 0.70, `EDGE_MIN` 1.00, `LEAD_R` 0.30, `HOLE_D` 1.00, `HOLE_D_SW` 1.30; registration crosses at (84.5, 46.5), (84.5, 4.6), (33.6, 47.4).

### 4.5 Generator gates (refuse to write)

Lines 260 to 327: islands per net equal 1 unless declared in `MULTI_ISLAND` (VBAT 2, bridged by the BAT1 frame; logo pieces decorative); pairwise net clearance at least 0.70 except `CLEAR_EXEMPT` (the two logo pieces); copper contained by the outline and at least 1.00 from it; every bare lead (r 0.30) at least 0.70 from every net; no part F.Fab body (convex hull of lines plus circles) contains another part's pad centre; minimum track width at least 1.5. Any failure prints and `sys.exit(1)` before `os.makedirs(OUT)`.

Gate output: min clearance 0.800 mm (B1/C2N, C2 pads at 2.5 pitch), copper to outline 2.300 mm, VBAT 2 islands declared.

### 4.6 Layers emitted

| file | how | `GEN` lines |
|---|---|---|
| `shim-copper-cut.svg` | one black even-odd path of all copper on white, y flipped, 4 decimals | 346 to 349 |
| `shim-mask-cut.svg` | `outline.buffer(-1.2)` minus pad openings (all pads buffered 0.7) minus BAT1 and SW1 bodies buffered 0.6 | 351 to 357 |
| `shim-guide.svg` | the printed face: cream card, copper at 28 percent pink, pads in pink, dashed F.Fab outlines, wordmark `hack` ink plus `.build` pink in Permanent Marker fitted to a 26.4 mm column (5.22 mm cap, gate output), tagline in Libre Baskerville italic fitted to the same column (1.72 mm), spec block and BOM block in Plex Mono, designators and polarity marks by the label placer, registration crosses | 359 to 446 |
| `shim-parts.svg` | F.Fab geometry per part in `<g data-ref>`, LED circles with ids `led1`, `led2` for the viewer | 448 to 465 |
| `shim-backer.dxf` | ezdxf R2010, mm; layers OUTLINE (1), HOLES (5), REGISTER (3), ENGRAVE (7); holes 1.00, 1.30 at SW1 | 467 to 491 |
| `shim-copper-cut.png` | cairosvg at 600 dpi | 493 to 496 |
| `shim-geometry.json` | board, gate values, nets, pads, bodies, holes, parts for the verifier | 498 to 506 |

### 4.7 Label placer

`label(st, font, size, ax, ay, cands)` (lines 372 to 385) tries 16 ring offsets (`RING`, lines 387 to 389: eight at radius 3.1 to 4.3 mm, then eight at 4.5 to 5.8 mm, computed from the offsets; the diagonal (4.7, 3.4) is the farthest at 5.8); a candidate box must not intersect copper, any body or any taken box, and must lie inside `outline.buffer(-0.8)`. Fallbacks: designators "REF VALUE" at 1.35, then "REF" at 1.3 and 1.1; polarity marks at 1.25 then 1.05 (lines 422 to 438).

Gate output: `labels unplaced: ['D2', 'R1', 'R3', 'R4', 'Q1.E', 'Q1.C', 'D2.K', 'C2.+', 'BAT1.-']`. The guide therefore lacks the cathode mark for D2 and the plus mark for C2, two polarised parts, and the generator does not fail on it (section 6).

### 4.8 Text kernel (`F/text.py`)

fontTools `RecordingPen` replayed through `TransformPen` into `SVGPathPen`; fonts from `fonts/node_modules/@fontsource/...` (marker, mono, mono-bold, elite, bask-italic), falling back to the family's 400 weight; y is the baseline; `y_up` mode emits glyphs flipped so the whole drawing is flipped once for SVG (lines 32 to 65); `text_width` sums advances (lines 68 to 78).

### 4.9 Independent verifier (`CHK`)

Reads only the emitted SVGs and `shim-geometry.json`, never imports the generator (lines 1 to 166):

1. Parse the single copper path into subpaths; even-odd by containment depth (a ring inside an odd number of others is a hole).
2. Every routed pad centre covered by exactly one island.
3. An island carrying two nets is a short.
4. A net on several islands must be a declared bridge.
5. A padless island under 2.0 mm2 fails.
6. Pairwise island clearance at least 0.70 (logo to logo skipped).
7. Outline containment and at least 1.00.
8. Every hole inside its own pad's copper, or a bare lead at least 0.70 from all copper.
9. Mask covers copper except pad openings (+0.75) and BAT1 and SW1 bodies (+0.65); stray exposed area over 1.0 mm2 fails.
10. Netlist audit against an `EXPECT` table typed independently of the generator (lines 135 to 153).

Verifier output (README): 12 islands; B1 B2 C1N C2N GND N1A N2A VCC = 1, VBAT = 2; worst island clearance 0.800 (B1..C2N); copper to outline 2.300; passed.

### 4.10 Assembly (README)

1. Lasercut the backer (OUTLINE cuts, HOLES drills, REGISTER and ENGRAVE mark).
2. Print the guide at 100 percent on sticker stock, align its three crosses to the engraved ones.
3. Cut, weed and transfer the copper onto the guide.
4. Lay the transparent vinyl mask.
5. Fit THT parts from the top, leads through the backer, solder on the copper side, trim.
6. Solder both BAT1 tabs (only the right is routed; the left is an island for adhesion, bridged by the retainer frame).
7. Solder the SW1 diagonal pair only.
8. Drop the cell in from the top edge, plus face up.

Battery holder choice: Keystone 3002 for its 5.10 mm square tabs (adhesion on foil) over the 3034's 1.27 mm clip pads; the THT retainer was rejected because its spring strap crowds the layout (README). Resistors: axial P2.54 vertical chosen; P7.62 and P15.24 horizontal in `parts/`, unused.

### 4.11 Constructions the first pass left out

**Placement table (`GEN` lines 75 to 88).** Board origin bottom left, y up: BAT1 (62.5, 37.5) rot 0; Q1 (39.0, 5.06) rot 90; Q2 (70.0, 23.14) rot 270; D1 (44.0, 17.0) rot 0; D2 (64.0, 11.0) rot 180; R1 (49.08, 17.0) rot 0; R2 (58.92, 11.0) rot 180; R3 (46.00, 8.46) rot 90; R4 (64.00, 17.0) rot 180; C1 (55.5, 20.6) rot 0; C2 (53.0, 7.6) rot 180; SW1 (66.75, 16.5) rot 0. The two halves of the astable mirror each other by 180 deg rotations (D1/D2, R1/R2, C1/C2, Q1 90 against Q2 270).

**Hand route as data (`GEN` lines 106 to 131).** GND is a 2.60 ring: bottom rail y 3.6 from x 33.8 to 71.0, left rail x 33.8 up to y 26.0, top rail y 26.0 to x 70.0, a 2.60 spur at x 62.5 up to the BAT1 centre disc, and 1.60 stubs to Q1.E and Q2.E. VCC is a 2.40 bus at y 14.0 from x 42.5 to the switch at 66.75, with four 1.60 drops to R1 to R4 and a stub down to `SW1 2@0`. VBAT is one 2.40 run from the right BAT1 tab at (75.3, 37.5) down x 76.6 to `SW1 1@1`. C2N runs y 7.6 east to x 70.0 then north up the switch gap to Q2's collector at y 18.06.

**Battery label anchor override (`GEN` line 428).** Designator anchors are the mean of each part's pad centres, except BAT1, forced to (61.6, 22.9) below the retainer, because the mean of its three pads lands on the centre disc where no label can fit.

**Guide sticker composition (`GEN` lines 391 to 445).** Cream card with `rx` 3.2; all copper at pink 28 percent; pads solid pink; every F.Fab primitive as a 0.18 dashed ink line (dash 0.9 0.6); wordmark at (2.8, 3.0) along the bottom left, `hack` ink and `.build` pink; tagline at (2.8, 45.0) top left in `#3a3a3a`; spec block four lines at cap 1.3 from (39.0, 48.2) stepping 2.2 down (first line ink, rest `#4a4a4a`); BOM block five lines at cap 1.25 from (72.8, 11.6) stepping 2.1; registration crosses 3 mm, 0.15 stroke. All text is emitted in board space and flipped once inside a `scale(1,-1)` group, which is why `text.py` has a `y_up` mode.

**Parts overlay and blink targets (`GEN` lines 448 to 465).** Each part is a `<g data-ref>` with 0.25 ink stroke and 10 percent ink fill; D1 and D2 also get a filled circle `#e01020` at 0.25 opacity on their F.Fab body circle, with ids `led1` and `led2`, which the viewer's blink timer drives.

**Backer DXF contents (`GEN` lines 467 to 491).** OUTLINE carries the rounded outline polyline; HOLES one circle per drilled pad (1.00, or 1.30 where the footprint drill exceeds 1.0, which is SW1), including the two unrouted SW1 leads; REGISTER the three 3 mm crosses; ENGRAVE every F.Fab line and circle, so the laser marks each part's body on the backer.

---

## 5. UX anatomy (`SIM`)

Built by `make_sim.py` from the real emitted layers (lines 11 to 24): copper recoloured `#c07a3a`, mask translucent blue, guide and parts as emitted, backer ply `#c9a878` with holes. No CDN, no server.

| control | behaviour | `make_sim.py` lines |
|---|---|---|
| drag | orbit: spin += dx * 0.45 clamped plus or minus 180, tilt += dy * 0.40 clamped 0 to 85 | 156 to 172 |
| wheel | zoom x 1.08 per notch, clamped 4 to 16 px/mm; shift wheel lifts | 179 to 184 |
| shift drag, two finger drag | lift 0 to 26; pinch zooms | 142 to 165 |
| LIFT slider | 0 to 26, default 7 (a parameter of the exploded diagram, so it keeps a slider) | 78 |
| copper thickness | x1, x8, x24 of 0.05 mm as 1, 4, 9 stacked slices of the real cut polygon | 110 to 117 |
| BLINK 1 Hz | alternates `led1` and `led2` opacity every 500 ms | 199 to 207 |
| layer toggles | backer, guide, copper, mask, parts | 102 to 109 |
| parts table | row click outlines that part pink | 208 to 219 |
| keys | R reset; Left and Right spin 4 deg, Up and Down tilt 3 deg | 192 to 198 |
| FLAT ON / FLAT OFF | toggles: tilt 0, spin 0, lift 0 (the card face as built); a second press runs `reset()` back to HOME | 187 to 191 |
| double click, RESET VIEW | `reset()` to HOME | 185 to 186 |
| readout | bottom left: tilt, spin, lift, zoom in px/mm, rewritten on every `draw()` | 128 to 129 |
| pinch detail | two pointers zoom by the ratio of their spread and lift by 0.12 per px of midpoint travel; shift drag lifts 0.10 per px; shift wheel lifts 0.03 per wheel unit | 159 to 169, 181 |
| HOME | lift 7, tilt 52, spin -18, zoom 7.5 | 135 |
| layer z | `translateZ(i * lift * zoom / 6)` | 122 to 126 |

What makes it excellent: one hand-routed card carries a real proof (theta graph), a real trick (the switch body as the bridge), an independent verifier with its own netlist, and a viewer whose layers are the cut files.

---

## 6. Known limits and failure lessons

1. Polarity marks missing on the guide for D2.K and C2.+ (label placer output); board-forge `design-review.md` requires a mark on every polarised part. A port should fail on an unplaced polarity mark.
2. The backer DXF header carries unset extents (`$EXTMIN 1e+20`, `$EXTMAX -1e+20`, `fab-knowledge:sources/benches/benches-copper-pcb-a.md`); LightBurn tolerates it.
3. Keystone 3002 geometry is from the KiCad footprint only, never checked against the vendor drawing (README).
4. Foil peel under repeated cell swaps is untested (README).
5. Blink rate is a calculation (README).
6. Scripts write to `out/` while the harvest is flat, so `CHK` and `make_sim.py` do not run from the harvest folder as is.
7. Routing is hand-authored; no router runs. This exercises the gate and emit half of a `copper` package.
8. README assembly step 7 names the rows the wrong way round: it says "the right lead of the lower row and the left lead of the upper row". In the code VBAT is `SW1 1@1` at board (73.25, 16.5), the right lead of the UPPER row, and VCC is `SW1 2@0` at (66.75, 12.0), the left lead of the LOWER row (computed through `xf(0, (66.75, 16.5))` from the footprint pads at (6.5, 0) and (0, 4.5), and matching the VBAT and VCC track ends at `GEN` lines 113 to 115). It is still a diagonal pair, and only those two leads have copper, so a builder following the copper gets it right.
9. The verifier's netlist audit (`CHK` lines 134 to 153) compares `EXPECT` with the pad net labels in `shim-geometry.json`, which the generator wrote; the electrical half is checks 1 to 3 (pad centres to islands, shorts, broken nets). A pad given the wrong net label in `NETS_BY_PAD` and routed consistently with that label would pass checks 1 to 3 and be caught only by `EXPECT`.

## 7. Tests and harness

| harness | asserts | result |
|---|---|---|
| generator gates | section 4.5 | pass (gate output) |
| `CHK` | section 4.9 | pass (verifier output) |
| `F/test-sim.js` (jsdom) | asserts: drag changes the card transform, shift drag lifts above 7, FLAT zeroes lift, RESET restores the exact transform, slices 3 gives 9 copper divs, Q1 row outlines pink, mask toggle hides the layer. Exercised without an assert: wheel zoom (width only logged), BLINK click, ArrowRight. Events are dispatched as `MouseEvent` named `pointerdown` and so on, with no `pointerId` | pass per the chat (not rerun here) |
| drive 2026-10-05 | five shots | zero page errors (measured) |

## 8. Port map

| item | value |
|---|---|
| packages | `copper` (stack order guide, copper, mask; mask rules 1.2 inset, single piece, pad + 0.7; Cricut SVG; gate suite), `circuit` (independent netlist audit; theta planarity argument as a query), `nest` (backer DXF with named layers), `catalog` (KiCad footprint parse), `ui-core` (CSS 3D stack viewer) |
| feature kinds | `pad` (solder), `conductor`; kinds it needs that are absent: registration mark, guide-sticker art, bare lead (a hole with no copper that keeps clearance), declared bridge (a part body joining two islands) |
| canon ids | `astable-blinky-shim` (candidate at M08, CANONS.md line 657: 33k, 22 uF, about 1 Hz, one 220R per LED); seed id `astable-blinky` resolves to `astable-blinky-tack` (line 664) |
| canon MISSING | switch-as-bridge crossing (a part body as the one allowed crossing on a single layer); theta-graph planarity check; teardrop rule as a construction; verbatim-artwork check (no curve commands) |
| reference ids | `boards/shim-card` (README only, CANONS.md line 1138 "gap: candidate until M08") |
| milestone | M08 (board-family candidates promote, CANONS.md section 9) |
| lineage row | MISSING |
