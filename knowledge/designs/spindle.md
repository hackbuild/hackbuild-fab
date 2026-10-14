# SPINDLE: how it is made

Record written 2026-10-05 from the original code. Slug `spindle` (bench `spindle`, chat "ESP32 board connector compatibility"). One circuit built two ways: SPINDLE v5, a single-layer copper-foil board cut on a vinyl cutter and laid on a lasercut plywood backer with a printed guide sticker and a transparent vinyl mask, and SPINDLE R1, an orderable 2-layer PCB with gerbers and a KiCad 7 board. Both are written as gated Python geometry: nothing is written unless every gate passes. A real-model 3D viewer and three headless proofs back the copper build.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Gate output" means the generator and checker printouts recorded in `F/README.md`. "Measured" means the headless drive of 2026-10-05 (Chrome, swiftshader WebGL, puppeteer-core, 1280 x 860) or a reading of a file in `fab-knowledge:originals/spindle/files/`. "Computed" means a calculation shown here. "Vendor" means a module datasheet or a community footprint file. "Inferred" means a reading of the code. The Python generators were not rerun (shapely, ezdxf, cairosvg and fontTools are not installed here, and the scripts read fonts from `/home/claude/fonts/`).

Short paths: `F` is `fab-knowledge:originals/spindle/files/`. `GEN` is `F/gen_board.py` (v5 copper). `LAY` is `F/layers.py`. `PCB` is `F/pcb.py` (R1). `KIC` is `F/kicad_out.py`. `EXP` is `F/export3d.py`. `SIM` is `F/sim.html`; its app script is extracted at `fab-knowledge:originals/board-viewers/files/extracted/spindle-layer-stack-sim.app.js` (`SJS`).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SPINDLE v5 (DETENT stepper plus laser breakout, copper foil) and SPINDLE R1 (orderable PCB) |
| owner's slug | spindle |
| canonical set | the harvest `fab-work-directory:benches/spindle/outputs/spindle/`, equal member for member to `~/Downloads/files (38).zip` (2026-08-01 13:36, final R1 with the KiCad export) |
| key hashes | `GEN` e973bfc1266c..., `PCB` 650351218717..., `KIC` cb50c4b14d12..., `LAY` 369bd6ee738d..., `SIM` ddbc7951bf79... (1138152 bytes); all in `fab-knowledge:originals/spindle/SHA256SUMS` |
| v5 board | 54 x 46 mm, corner 3.0, single layer, zero jumpers (`GEN` lines 46, 204) |
| R1 board | 46 x 46 mm, corner 2.0, 2 layer, 1.6 FR4, 1 oz, bottom GND pour (`PCB` lines 23 to 24) |
| module | ESP32-C3 SuperMini, 22.52 x 18 mm, 2 rows of 8 at 2.54, rows 15.24 apart, parsed from `F/parts/supermini.kicad_mod` and `.kicad_sym` (`mrtnvgr/KiCad_ESP32-C3-SuperMini`, community) |

### 1.1 Every revision found

| when (2026) | file | what | role |
|---|---|---|---|
| 07-31 14:23 | `~/Downloads/sim.html` | v1 "dual 28BYJ-48 driver shield", ULN2803 DIP-18 on the copper, 45 x 92 | superseded |
| 07-31 14:37 | `sim (1).html` | v1b, 45 x 90 | superseded |
| 07-31 15:19 | `sim (2).html`, copied to `F/lineage/sim-v3-2026-07-31.html` | v3, 70 x 60, GND perimeter ring, stock ULN2003 boards on headers, embedded net JSON | lineage |
| (v4) | not found | 70 x 58, ring kept, USB unreachable | named in the README only |
| 07-31 16:39 | `sim (3).html` | early v5 viewer | superseded |
| 08-01 03:14 | `files (33).zip`: `pcb.py` and README copied to `F/lineage/` | R1 before the hybrid module pad: drill at pad centre, rows 17.5 mm apart against 15.24 | lineage (failure 9) |
| 08-01 13:36 | `files (38).zip` = harvest | final R1 with `hole_dx`, drill-in-pad gate, KiCad export | canonical |

### 1.2 Why this revision

The final set is newest and good in the strong sense: the R1 generator adds the drill offset that puts the module holes on the real 15.24 mm row, the drill-inside-pad gate that would have caught the earlier miss, and the KiCad export with an independent readback (README lines 301 to 324). The v5 copper files were not regenerated after 08-01 and are the same ones the final README describes.

### 1.3 What is in `fab-knowledge:originals/spindle/files/` and what was left out

Kept: every `.py` and `.mjs`, `README.md`, `SIM`, the three layer SVGs, `circuit_bw.png`, `board_backer.dxf`, `spindle-r1-gerbers.zip`, `fab/` (9 gerber and drill files, BOM, CPL, netlist), `kicad/` (`.kicad_pcb`, `.kicad_pro`), `parts/` (the footprint and symbol the generator parses), the owner upload, and `lineage/`. Left out: `models/*.wrl` (eight KiCad packages3D VRML models, vendor blobs; in the harvest `models/`: `hdr6.wrl`, `res.wrl`, `w_TO-92_Inline_Wide.wrl`, `term508.wrl` are the four the scripts read). `sim_data.json` and `pcb_data.json` are not in the harvest (they are intermediate outputs of `EXP` and `PCB`).

---

## 2. What it makes and for whom

A breakout that drives two 28BYJ-48 steppers (through the stock ULN2003 boards they ship with) and a laser diode from an ESP32-C3 SuperMini, for the DETENT laser scanner. The chat's question was whether the SuperMini drops onto the board and how its pins map, which is why the pin geometry is parsed from files instead of typed. v5 is for someone with a vinyl cutter and a laser cutter who wants a board tonight; R1 is the same circuit for a fab house.

---

## 3. Shots

Driven headless 2026-10-05 from `SIM` (no hook; 6 s wait, ready 7.8 s); zero page errors (measured). Files in `fab-knowledge:originals/spindle/shots/`.

| file | caption |
|---|---|
| `s01-iso-default-guide-copper-parts-flow.png` | ISO at load: plywood backer, guide sticker texture, copper extruded from the cut polygons at x8, the SuperMini built from its castellation coordinates, the real KiCad header, resistor, TO-92 and terminal meshes, the laser barrel on two wires, pink and teal flow dots. Panels: title, LAYER STACK in build order with a stack readout, VIEW, Q1 BENCH, INSPECTOR. |
| `s02-top-guide-sticker-copper.png` | TOP: the guide artwork reads mirrored ("SPINDLE", "MOTOR 1" reversed) and the USB end sits at the bottom of the screen. The whole scene is the board's mirror image (section 6, item 1). |
| `s03-iso-lift-60-tape-x24-vinyl-on.png` | LIFT 60, copper x24, VINYL MASK on: the stack separates in build order (copper +6, vinyl +12, parts +18 mm); the translucent vinyl with its pad openings; inspector names the vinyl layer. |
| `s04-usb-edge-overhang.png` | USB EDGE camera: the module and its USB-C shell at the top edge of the backer. |
| `s05-q1-bench-ib-1-readout-stuck-at-0ma.png` | BASE CURRENT 1.0 mA: the bench reads Ic 0 mA, Vce 5.00 V, 1 mW, "saturated", and the laser stays dark at every slider value (section 6, item 2). |

---

## 4. Mechanisms, circuits and constructions

### 4.1 Pin geometry parsed at build time (`GEN` lines 25 to 37)

```
pads = { n: (x, y) }   from  \(pad\s+"(\d+)"\s+\w+\s+\w+\s*\n?\s*\(at ([-\d.]+) ([-\d.]+)   in supermini.kicad_mod
sig  = { n: name }     from  \(pin ... \(name "..." ... \(number "n"                     in supermini.kicad_sym
assert len(pads) == 16 and len(sig) == 16
ROW_DX = max |x| = 7.62          # rows 15.24 apart
PIN[name] = (side = +1 if x > 0 else -1, dy = -y)
```

This parse runs only in `GEN`. The R1 generator types the same columns as lists, `COL_R` and `COL_L` (`PCB` lines 61 to 62), and `MCX 23.0`, so R1 has no count assert and no link to the part file; the two lists match the parse today (read from the code).

Column order (USB at top), read from the symbol: right 5V, GND, 3V3, GPIO4, 3, 2, 1, 0; left GPIO5, 6, 7, 8, 9, 10, 20, 21. The order had been inverted until the symbol was read (README lines 44 to 49).

### 4.2 v5 copper generator: rules and layout (`GEN` lines 39 to 79)

| rule | value |
|---|---|
| pads | round 1.7, power 2.6; castellated landing 5.0 x 1.7 centred at `MCX + side (ROW_DX + 2.5 - 1.22)`, running about 2.4 mm past the module edge |
| traces | 1.2 signal and power; fillet r 1.0 (quadratic corner in the SVG); teardrop length 1.1 |
| gaps | `MIN_GAP 0.70` between nets (gate output: tightest 0.75); `OUTLINE_GAP 1.0` (gate output: tightest 1.02) |
| holes | lead 0.9, mounts 2.6 at (4, 3), (50, 3), (4, 44), (50, 44); mount keepout `MOUNT_D / 2 + 0.7` |
| module | `MCX 27`, `MCY = 46 - 22.52 / 2`, flush with the top edge so USB-C overhangs; escape exit at x offset 10.9 |
| headers | J1 at x 44 (motor 1), J2 at x 10 (motor 2) as vertical columns flanking the module; J1 rows aligned to the module's GND, 3V3, GPIO4, 3, 2, 1 rows so 5V and GND go straight across |
| lanes | right GND 46.5, V5 48.7; left GND 7.5, V5 5.3; buses GND y 12.0, V5 y 6.92 (5.08 apart, so the screw terminal pins land on them) |
| motor map | M1 IN1..IN4 = GPIO0, 1, 3, 4; M2 = GPIO5, 6, 7, 10 |
| laser | GPIO20 through R1 470 R at (28.92, 21) to (36.54, 21), Q1 TO-92 C B E at x 31.46, 34.00, 36.54, y 16.5; collector to LASER SW (27.5, 16.5) |
| spare | GPIO21 to an AUX pad at (14.6, 25.85) |
| 5V link | module 5V on `V5_MOD`, open solder link pads at (38.9, y5V + 0.5) and (41.4, y5V + 0.5): open by default, module on USB |
| power in | screw terminal pads (2.6) at (19.0, 12.0) GND and (19.0, 6.92) V5 sitting on the buses; a 2.54 header in parallel at (41.0, 10.73) GND and (41.0, 8.19) V5, placed clear of the terminal block body, each dropping straight onto its bus (`GEN` lines 71 to 73, 129 to 132) |
| J2 rows | J2 pins sit on the module's GPIO6, 7, 8, 9, 10, 20 rows (IN1, IN2, IN3, IN4, VCC, GND), mirroring J1 on the other side (`GEN` lines 66 to 67) |
| laser lane | the GPIO20 escape runs out to x 12.4, down to y 21 and across to R1, turning below GPIO21's stub so both escapes stay planar (`GEN` lines 76, 117 to 123) |

Strapping rule (`GEN` docstring and README lines 61 to 64): GPIO2, 8, 9 stay off the ULN2003 inputs because a ULN2003 input presents about 2.7 kOhm to ground, enough to hold a strapping pin low at reset. Laser on GPIO20, never GPIO21: GPIO21 is U0TXD and the ROM strobes its boot log there at every reset (`GEN` lines 117 to 123).

### 4.3 v5 net geometry and gates (`GEN` lines 81 to 200)

Net record: `{c: round pads, r: rect pads, runs: polylines with width}`; helpers `cpad`, `rpad`, `run`, `mod` (lines 82 to 88). Construction per net (lines 156 to 162):

1. round pads `Point.buffer(d / 2, 24)`, rect pads `box`, runs `LineString.buffer(w / 2, 16)`;
2. teardrops (lines 142 to 155): at a run end on a round pad, the convex hull of the pad disc and a `w / 2` disc at `min(d / 2 + 1.1, L)` along the run;
3. `unary_union` of all of it.

Gates, exit 1 and nothing written on any failure (lines 164 to 200): pairwise net distance at least 0.70; each net one polygon (a MultiPolygon is a split net, so no jumper is ever needed); bounds inside 54 x 46; every net at least 1.0 from the shared outline (measured against the square `box(0, 0, 54, 46)` exterior, line 177, while the cut outline has 3.0 mm corner radii, so copper 1.0 from both straight edges at a corner sits only 0.17 mm from the rounded edge, computed as 1.0 x sqrt 2 - 3.0 x (sqrt 2 - 1); the corner mounts and their keepouts occupy those regions today, so the gap is latent); no run buffer overlapping the module body box by more than 0.01 mm2 (bare foil has no mask); no copper inside any mount keepout. Every module pad not used gets its own `_NC_<name>` net (line 138), so unused castellations are still gated. A separate audit of the 21 required connections is named in the README and not in the folder.

Outputs (lines 202 to 293): `circuit_cut.svg` (black on white, outline as a 0.25 cut line, filleted runs, teardrops, pads), `circuit_bw.png` at 26 px/mm through cairosvg, `board_backer.dxf` R2010 with layers OUTLINE (rounded rect as lines and arcs), HOLES (mounts and every round pad's 0.9 lead hole), REGISTER (two 1.5 mm holes at MCX +/-12, y 2), ENGRAVE (TEXT labels for every pin, header, part), MODULE (body outline).

### 4.4 Three registered layers off one outline (`LAY`)

`LAY` executes `GEN` up to the gates (lines 18 to 24) so it builds from the same nets. `outline_d(inset)` (lines 34 to 41) is the one SVG path with arcs; `outline_poly(inset)` is `box.buffer(r)` (lines 43 to 45).

1. Guide sticker `spindle-guide.svg` (lines 149 to 208): cream fill, runs in pink at 0.30 opacity, pads solid pink (NC pads 0.35), dashed part outlines from the real model bounding boxes rotated and placed, dashed module box, mount circles, every label outlined to paths through fontTools `SVGPathPen` from IBM Plex Mono Regular and Bold (`text_path`, lines 50 to 66), and the hack.build mark from its two favicon paths ARC and WRENCH in a calibrated viewbox (117, 103, 800, 800) (lines 68 to 91).
2. Copper `circuit_cut.svg` from `GEN`.
3. Vinyl mask `spindle-mask.svg` (lines 210 to 243): openings = every pad grown `MASK_CLR 0.35`, clipped to `outline_poly(EDGE_KEEP 1.2)` so no opening eats the border; mask = outline minus openings. Gates: one piece (gate output: 1 piece, 37 openings); each edge strip of width 1.2 covered above 99.9 percent; the mask's outer edge equals the shared outline.

### 4.5 Logo pocket search (`LAY` lines 111 to 147)

Obstacles: the union of all copper, the real model footprints, the module box, the title block box (2.5, 0.8) to (26.0, 7.4) and every mount hole plus 1.0. Candidates are squares (the mark's corners reach 1.41 times further than a disc of the same half width), sizes from 14.0 down to 4.6 mm in 0.2 steps, centres on a 0.25 mm grid, inside an inset of 1.8 and clear of the obstacles by `LOGO_KEEP 1.2`; the first size that fits wins. Asserts it hits no footprint, the module or the title block. Gate output: 7.6 mm mark right of the laser block.

### 4.6 R1 PCB generator (`PCB`)

Rules (lines 22 to 32): trace 0.35, power 0.80, channel lanes 0.30, copper clearance 0.25, edge 0.40, pour 0.35, annular 0.30 beyond drill radius, mask expansion 0.05, via 0.4 drill on 0.8 pad.

| construction | detail | lines |
|---|---|---|
| `pad(net, x, y, w, h, drill, shape, ref, pin, smd, hole_dx, is_via)` | every pad, via and hole goes through one record; the drill sits at `x + hole_dx`, which every consumer uses (CHK-BRD-02) | 39 to 54 |
| hybrid module pads | pads from 6.30 to 11.20 off centre (4.9 x 1.6; the comment calls them ovals but `pad(..., shape="rect")` draws rectangles, so the gerber, the DRC and the KiCad file all carry rectangles), drill 1.05 offset by `hole_dx = side 7.62 - (pad_cx - MCX)` so holes land on the 15.24 row; the module can go in through-hole or be reflowed on its castellations | 56 to 89 |
| headers | J1 at x 40.6 `VCC GND IN4 IN3 IN2 IN1`, J2 at x 5.4 `IN1 IN2 IN3 IN4 GND VCC`, order following the module columns so each phase is a short monotonic hop | 91 to 106 |
| under-module channel | four boxed-in signals run down between the pad rows: lanes GPIO21 17.30, GPIO20 18.57, 3V3 24.92, GPIO2 27.46; exit at `MCY - 11.26 - 1.10`. Rule: within a column a lower pin takes the nearer lane, or its horizontal escape cuts a higher pin's vertical | 108 to 115 |
| J6 expansion | y 8.0: `21 G G 3V3 2 G`; R4 10k holds GPIO2 high at reset (GPIO2 is a strapping pin and the only free ADC pin) | 117 to 127 |
| power | J3 5.08 terminal and J4 2.54 header in parallel, C1 220 uF, C2 100 nF; 5 V crosses on B.Cu between vias at (2.4, 20) and (43.6, 20); the four GND vias at x 9.80, 16.00, 30.60, 36.20 sit on this trace: a 5V to GND short (D-249); JP1 open jumper `5V_MOD` to `5V` | 129 to 137, 180 to 190 |
| laser | GPIO20 to R2 100 R to AO3400A gate, R3 100k gate pulldown (holds the laser off while GPIO20 floats in reset), drain to J5 SW | 139 to 150, 174 to 178 |
| ground | short stubs into 13 stitching vias; the pour carries GND | 192 to 209 |

Bottom layer construction (lines 228 to 244): pour = `outline_poly(0.40)`; subtract every non-GND hole's ring buffered by 0.35; subtract bottom traces buffered by 0.35; add back every hole's ring as an island and the bottom traces; subtract the antenna keepout `box(MCX - 4.6, MCY - 11.66, MCX + 4.6, MCY - 5.66)` only, so the module's through-holes keep their bottom rings.

DRC, exit 1 on any violation (lines 246 to 288): top nets pairwise at least 0.25; every net one island across both layers (GND with the pour, each net with its rings); copper at least 0.40 from the edge; every drill inside its own pad with 0.15 margin (`pad_poly.buffer(-drill / 2 - 0.15).contains(hole)`); hole to hole at least 0.30; no top copper within a mount keepout plus 0.5. Gate output: 19 nets, 70 pads, 57 holes, tightest 0.32 against 0.25.

Gerber writer (lines 290 to 345): `%FSLAX46Y46*%`, `%MOMM*%`, aperture D10 0.1, regions as G36/G37 with `%LPD*%` for exteriors and `%LPC*%` for interiors; rings taken by index (`[p.exterior] + list(p.interiors)`) because shapely returns a new ring object on every `.exterior` access and an identity test silently fills every hole; polygons sorted largest first so an island inside a cleared interior is drawn after the clear; Edge_Cuts as a stroked path. Silk (lines 347 to 432): IBM Plex Mono Bold through fontTools `RecordingPen`, quadratics flattened at 8 steps and cubics at 10, contours combined by `symmetric_difference` (so counters become holes), then `SILK.difference(MASK_T)` so silk never sits on a pad. Excellon `METRIC,TZ`, `FMAT,2`, tools sorted by size (lines 434 to 451). BOM with a purpose column (14 lines), CPL as pad centroid per ref with Top and rotation 0, netlist, zip, `pcb_data.json` (lines 453 to 499).

### 4.7 KiCad 7 export (`KIC`)

`exec`s `PCB` into a namespace (line 15) and writes `version 20221018`: sorted net table; footprints per ref at the pad centroid with pads relative to it and Y flipped by `ky(y) = H - y`; through-hole pads with `(drill d (offset dx 0))` for the hybrid pads; SMD pads on F.Cu, F.Paste, F.Mask; four NPTH M2.5 footprints with `exclude_from_pos_files exclude_from_bom`; segments per layer; vias; Edge.Cuts as four `gr_line` and four `gr_arc` (start, mid, end); silk as editable `gr_text` and `gr_line`; a GND zone on B.Cu (`connect_pads clearance 0.35, thermal_gap 0.3, bridge 0.5`, declared `fill yes` but written with no `filled_polygon`, so KiCad shows it empty until the zones are refilled, inferred); an antenna rule area forbidding tracks, vias and pour (lines 80 to 219). Project file: min clearance 0.25, min track 0.25, min through hole 0.3, min via annular 0.13, min copper to edge 0.40 (lines 220 to 231). README readback: 14 footprints plus 4 holes, 59 segments, 15 vias, 55 of 55 pads match in position, size and net, drill offsets exact, 19 nets one island each. The readback script is not in any source (D-149).

### 4.8 Real models, lead recovery and the three proofs

`F/wrl.py`: regex over VRML2: for each `geometry IndexedFaceSet`, the last `diffuseColor` before it is its colour (works with the geometry-first, material-last layout), points scaled by 2.54 (KiCad models are in 0.1 in), faces fan-triangulated, colour gamma `c^0.4545` (lines 5 to 32). `pins()` clusters vertices below z -0.4 within 1.0 mm to recover the real lead positions (lines 52 to 65).

`EXP` builds `sim_data.json`: copper rings per net with labels; WRL meshes with Y and Z swapped and winding reversed (a reflection); placements; the module from its 16 castellation coordinates (castellation r 0.5, USB 8.94 x 7.35 x 3.16, SoC 5 x 5 x 0.9); flow paths; the guide PNG at 22 px/mm rendered from the printed SVG; the vinyl mask polygon; the outline; model pins and the expected pad positions (lines 16 to 136).

| proof | method | gate output |
|---|---|---|
| `F/checkfit.py` | real model bbox footprints (rotated and placed) against every other part, the module body, every pad that is not its own (a pad within 0.7 of one of the part's model pins is its own), the mount holes, the outline; prints the 8 tightest clearances (TIGHT under 0.5, touch under 1.0) | found the terminal block on the LASER SW pad by 0.04 mm and the 5V link 0.5 mm from J1's body (no iron access); after fixes tightest body to body 0.84 |
| `F/check3d.mjs` | builds every copper ring, model mesh and the castellated module in real three.js, counts NaN and index overruns, checks every flow curve has length; placement proof: model pins rotated and translated must land within 0.35 of their pads | all 19 pads within 0.000 mm |
| `F/checkstack.mjs` | z intervals in build order: plywood 0 to 3.00, guide to 3.10, copper, vinyl and module on the copper top; every part body above the board; no lead out of the plywood bottom | stack correct |

### 4.9 Viewer kernels (`SJS`)

| kernel | construction | lines of `SJS` |
|---|---|---|
| world map | `W3(x, y, z) = (x, z, y)`: board x to world X, board y to world +Z, height to world Y | 34 |
| backer | rounded rect 54 x 46 r 3 with mount holes, extruded 3.0, plywood colour | 46 to 57 |
| guide sticker | `ShapeGeometry` of the outline with y negated, UVs `(x / w, -y / h)`, `rotateX(-PI/2)`, texture = the printed SVG as PNG; comment: "Getting this wrong mirrors the artwork" | 59 to 74 |
| copper | each net's real rings with holes, extruded `0.07 x 8`, scaled per TAPE Z (x1, x8, x24); NC nets darker | 76 to 92 |
| vinyl | mask polygon with openings, 0.10 thick, physical material at 0.24 opacity | 94 to 104 |
| module | outline with castellation notches (`absarc` r 0.5 at each pad y), 16 through-holes, 1.0 thick, USB shell, SoC, antenna, two LEDs | 106 to 138 |
| parts | real WRL meshes per placement, `rotation.y = -rot` | 140 to 155 |
| laser | brass barrel r 6 x 32 beside the board, LED, beam cylinder, two Catmull-Rom wires | 157 to 177 |
| flow | `CurvePath` of line segments per flow path; points every 2.4 mm; base teal, load and motor feeds pink; speed `Ib x 0.02`, `Ic x 0.0012`, or 0.12 | 179 to 191, 298 to 314 |
| stack and LIFT | guide at 3.10, copper `3.10 + LIFT x 10`, vinyl `+ LIFT x 20`, parts `+ LIFT x 30`; readout of every z | 222 to 232 |
| Q1 bench | `HFE 100, VCC 5.0, RLOAD 22`; `icSat = (VCC - 0.2) / (RLOAD / 1000) / 1000`; `ic = min(Ib x HFE, icSat)`; `vce = max(0.2, VCC - ic x RLOAD / 1000)`; beam on when `ic > 4` | 234 to 258 |
| pick | raycast copper, parts, vinyl, guide, backer; a copper hit lights every mesh of that net in `0x5c0030` and names it | 261 to 280 |
| layer rows | each LAYER STACK row toggles its group, flips its ON/OFF tag and writes that layer's build note into the INSPECTOR, so the stack list doubles as the build instructions | 193 to 219 |
| bench drive | Ib slider starts at 5.0 mA; readouts Ib, Ic, Vce, dissipation and a state word ("off" under 0.2 mA, "saturated", or a warning "active, heating"); LED colour and beam visibility follow `ic > 4`, beam opacity `0.18 + 0.5 min(1, ic / 200)` | 234 to 254 |
| flow visibility | base dots shown when Ib > 0.2, load dots when `ic > 4`, feed dots always; dots advance `t x rate` along the path each frame (`t` += 0.016) | 298 to 314 |
| camera | yaw and pitch at 0.006 rad/px; presets TOP (0, 1.52, 96), ISO (0.42, 0.80, 112), USB EDGE (0, 0.12, 104) as (yaw, pitch, distance); SPIN 0.0032 rad per frame; COPPER THICKNESS buttons rescale the copper meshes `TAPEZ / 8` and restack | 27 to 32, 278 to 294 |

---

## 5. UX anatomy and what makes it excellent

| region | contents |
|---|---|
| shell | dark `#0a0a0a` with cream text and pink accents, IBM Plex Mono; panels `rgba(20,20,22,.94)` with 1 px lines |
| title, top left | "SPINDLE v5", "54 x 46 mm, single layer, zero jumpers", note that copper is the real cut geometry and parts are the KiCad models |
| LAYER STACK, left | GUIDE STICKER, COPPER TAPE, VINYL MASK (off), COMPONENTS, PLYWOOD BACKER in build order, each a toggle row with ON/OFF; stack readout "backer 0 to 3.00, guide to 3.10, copper to 3.66, vinyl to 3.76 mm" |
| VIEW, top right | LIFT slider, COPPER THICKNESS x1 x8 x24, CAMERA TOP ISO USB EDGE, FLOW and SPIN |
| Q1 BENCH, bottom right | BASE CURRENT slider 0 to 10 mA; readouts Ib, Ic laser, Vce, Q1 dissipation, state |
| INSPECTOR, bottom left | names whatever is clicked: a net (lit across every piece), a part with its package spec, a layer with its role |
| orbit | yaw and pitch (0.05 to 1.53), wheel x1.09 clamped 26 to 320, right drag pan |

What makes it excellent: the viewer is the build. Copper is the cutter's own polygons, the guide is the printed file, the vinyl is the cut mask, the parts are real models whose leads are proven to land on their pads, and LIFT separates the layers in the order you lay them down. The generators refuse to write a file that breaks a rule, and the same circuit is carried from foil to a fab PCB with the same pin map.

---

## 6. Known limits and failure lessons

| # | issue | evidence | state or rule |
|---|---|---|---|
| 1 | the 3D scene is the board's mirror image: `W3` sends board +y to world +Z, which points down the screen when seen from above, and the guide shape is built with y negated to match, so the printed artwork reads backwards and USB sits at the bottom in TOP | `s02` (measured); same failure as SHUNT's first mirror fix (`fab-knowledge:originals/shunt/RECORD.md` section 6, item 1) | open; board y must map to world -Z |
| 2 | Q1 bench never lights the laser: `icSat` is computed in A (0.218) and compared with `Ib x HFE` in mA, so Ic always shows 0 mA and the state always "saturated" | `s01`, `s05` (measured); `SJS` lines 236 to 241 | open; one unit system per model |
| 3 | stale labels: README v5 says laser GPIO21 and spare GPIO20; the sim bench label says "GPIO21 through R1"; `EXP` flow `base` starts at `mexit("GPIO21")` (now AUX); `PCB` docstring says I2C on GPIO8/9, which are unconnected; README says R1 470 R saturates near 50 mA while the sim uses 22 ohm and 218 mA | `F/README.md` lines 70, 95; `EXP` line 97; `PCB` line 10 | derived artefacts carry the generator's pin map and fail on mismatch |
| 4 | three earlier layouts rejected as "rethink the approach" | README | |
| 5 | v4: a GND perimeter ring kept from a rejected version dictated everything: USB unreachable, 70 x 58, module 5V unconnected "and I explained that away twice" | README lines 12 to 33 | do not carry structure from a rejected version |
| 6 | column order inverted until the symbol was read | README | parse pin maps from files with a count assert |
| 7 | GPIO21 strobes the boot log; laser moved to GPIO20 | `GEN` lines 117 to 120 | |
| 8 | LDR wired GPIO2 to ground blocks boot in bright light; with R4 up and 10k down the node stays 2.2 to 3.0 V with about 800 mV of swing | README lines 265 to 273 | |
| 9 | drill at pad centre gave a 17.5 mm row instead of 15.24 (1.13 mm per side, computed) and the reparse still passed at 99.91 and 99.28 percent | `F/lineage/pcb.prehybrid-2026-08-01.py`; `fab-knowledge:sources/downloads/dl-boards-tools.md` | a reparse proves file equals source; the hole row against the part is a separate proof |
| 10 | shapely ring identity silently filled every hole (would have shorted 35 non-GND pads to the pour) | `PCB` lines 294 to 296 | index rings |
| 11 | islands drawn before a larger polygon's clear were wiped | `PCB` lines 298 to 300 | largest first |
| 12 | clearing the pour under the whole module stripped its bottom rings | `PCB` lines 240 to 242 | keep out the antenna only |
| 13 | header order reversed against the module columns gave 51 DRC violations | knowledge record | headers follow module column order |
| 14 | gerbers carry `CreationDate` from `datetime.now()` | `PCB` lines 322 to 324 | fab zips are not reproducible byte for byte until the date is pinned (M08 asks for `SOURCE_DATE_EPOCH`) |
| 15 | v5 outline gate measures against a square, not the 3.0 mm rounded outline | `GEN` line 177 | gate against the cut outline itself |
| 16 | R1 module columns typed, not parsed | `PCB` lines 61 to 62 | one parsed pin map feeds both builds |

Jumper policy conflict: SPINDLE v5 link and R1 JP1 open by default; TRUNNION SJ1 closed. D-088 sets normally open.

---

## 7. Tests and harness

| harness | asserts | recorded result |
|---|---|---|
| `GEN` gates | section 4.3 | 0.75 tightest, 1.02 to outline (gate output) |
| `LAY` gates | mask one piece, edges above 99.9 percent, mark clear | 1 piece, 37 openings, 7.6 mm mark (gate output) |
| `PCB` DRC | section 4.6 | 19 nets, 70 pads, 57 holes, tightest 0.32 (gate output) |
| `F/checkfit.py`, `F/check3d.mjs`, `F/checkstack.mjs` | section 4.8 | clean (gate output) |
| gerber reparse | bottom 99.91, top 99.28 percent, isolated and bonded holes | README claim 35 isolated and 22 bonded; the M08-T07 reparse (`tools/py/board/reparse.py`, the original script is missing, D-149) gives 33 of 35 and 18 of 22 (computed, D-249) |
| KiCad readback | 55 of 55 pads, 15 vias, offsets exact | README; script missing |
| drive 2026-10-05 | five shots | zero page errors (measured); defects 1 and 2 above found |

---

## 8. Port map

| item | value |
|---|---|
| packages | `copper` (v5 generator, teardrops, fillets, gates, three-layer build, logo pocket search), `board` (R1 generator, pour synthesis, region gerber writer, outlined silk, Excellon, KiCad writer, readback), `catalog` (parse-at-build pin maps with a count assert; WRL parse and lead recovery), `geom` (shapely gates), `ui-core` (layer stack viewer, drive pad) |
| feature kinds | `pad` (with `hole_dx`), `conductor`, `port`; no kind yet for the castellated or hybrid module seat, antenna keepout, solder jumper with a default state, vinyl mask opening, guide sticker, registration hole |
| canon ids | `c3-carrier` (candidate, M08; `docs/plan/CANONS.md` lines 518, 598, 1139), `mosfet-low-side-gate` (candidate, lines 599, 1140) |
| canon MISSING | `npn-low-side-tape` for the v5 laser switch (candidate named for SPLICE only, CANONS.md line 1182), `under-module-channel-lanes` routing rule, `supply-jumper` with declared default, `strapping-pin-guard` (pull-up and no low-impedance load at reset), `boot-quiet-gpio` choice (GPIO20 not 21) |
| reference ids | `seats/c3-supermini` and `boards/spindle-r1` at M08 (`docs/plan/milestones/M08-board-catalog.md` lines 652 to 685, 749, 801); `copper/spindle-v5` proposed in `fab-knowledge:synthesis/mappings.md` line 114, MISSING in the milestone |
| checks it originates | CHK-NET-07 (no copper under the module body), CHK-NET-08 (1.0 from outline), CHK-NET-09 (vinyl mask one piece and border), CHK-BRD-01 (gerbers reparse with an independent parser; ring indexing and largest-first islands are what let the writer pass it), CHK-BRD-02 (drill inside its own pad, `hole_dx` everywhere), CHK-BRD-04 (strapping and boot audit), CHK-BRD-05 (BOM, CPL, netlist agree) (`docs/plan/CHECKS.md` lines 515 to 523) |
| milestone | M08 ("SPINDLE R1 reparses", 19 nets, 70 pads, 57 holes, tightest 0.32) |
| lineage row | MISSING |
