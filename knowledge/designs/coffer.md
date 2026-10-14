# COFFER: how it is made

Record written 2026-10-05 from the original code. Slug `coffer`. Family counters-machines (KNURL, DETENT, WASHER, PLENUM, QUENCH, COFFER). COFFER is a hex tile system of component-free capacitive control surfaces cut from adhesive copper foil on a Cricut: five identical flat-top hexagon tiles (six hex keys, three wedge sliders, three arc sliders, a four-phase resolver dial with two crescent keys, and an ESP32-C3 SuperMini carrier), one six-edge port standard, a ground ring that turns the tiling into the wiring, 214 verification gates, every layer emitted (copper, guide sticker, vinyl faceplate, laser backer, printed cover), and a single-file viewer.

Number rules for this file. A number that names a code location is a declared value. "Computed" means produced on 2026-10-05 by the canonical generator itself, run through this folder's harness (`fab-knowledge:originals/coffer/drive/run_gates.py`, outputs in `drive/records/`) with shapely 2.1.2, ezdxf and IBM Plex Mono from `@fontsource/ibm-plex-mono` 5.3.0, or read off the viewer in headless Chrome. "Stated" quotes the README. Nothing here has been cut and measured; the README lists the SuperMini footprint, Cricut settings and every capacitance number as not verified.

Short paths: `F` is `fab-knowledge:originals/coffer/files/`. `HC` is `F/hexcore.py` (326 lines). `GC` is `F/gen_coffer.py` (631 lines). `ST` is `F/sim_template.html` (410 lines).

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "COFFER . hex tile system . hack.build" (viewer title) |
| owner's slug | coffer |
| canonical set | `fab-work-directory:benches/coffer/outputs/coffer/` (66 files) |
| generator | `GC` sha256 3c5d50fb394669e6e4d16c033cfc219493cfb37ccbdb53fe80baef23e49cae7d; `HC` b1bc9905fb4c5bb8bbf25ef4ff25cf20b3f201b22299c65f6572ce053e00de23 |
| viewer | `F/coffer_sim.html` sha256 b08c5a461bb715fd17b97463573d256178ad359b2a31ba92d74a195453213bb4 (159522 bytes), built from `ST` (8bf82b78...) |
| date | after 2026-08-10 22:02 and before the 2026-09-14 harvest copy (inferred: the earlier viewer `~/Downloads/coffer_sim.html`, e04a9075..., 2026-08-10 22:02, lacks the cover layer and the finger count that the canonical viewer has); the plan dates it "COFFER 2026-08" |
| runtime | generator: Python 3 with shapely, fontTools (IBM Plex Mono woff2 at `package/files/`), ezdxf; viewer: single file, Google Fonts only, SVG and CSS 3D, no WebGL |

### 1.1 Revisions and why this one

Two viewer revisions exist (computed by diff): the 2026-08-10 Downloads copy and the canonical one, which adds the cover layer to the exploded stack and the "N electrodes a finger can land on" line. The generator exists only in the canonical set. The canonical set is the newest and the only one with all layers.

### 1.2 What the generator does as shipped

`python3 gen_coffer.py` as shipped stops with `NameError: name 'usability' is not defined` on the first tile (computed 2026-10-05): the `if __name__ == '__main__'` block sits at `GC` line 351, and `gates()` calls `usability()` (defined at line 407), while `emit`, `emit_straps` and `emit_sim` (lines 464, 614, 625) are defined after the block and never called. The emitted files therefore came from an earlier wiring. (The earlier KB note that it "prints gate reports and writes no files" is corrected here: it prints nothing and raises.)

Run in the order the code implies (import the module, then `build`, `gates`, `emit` per tile, `emit_straps`, `emit_sim`), the generator passes 214 of 214 gates (K6 37, S3 37, A3 37, D1 37, M1 66; computed) and regenerates all five `_01_copper.svg` files, `K6_05_cover.svg` and `straps_copper.svg` byte for byte (computed; the other covers were not compared). Geometry JSON differs only in last-digit float noise, the guide sticker only in glyph positions from a different Plex Mono build, and the DXFs in ezdxf headers.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `hexcore.py` | the interlock: outline, port, ring, text, SVG and DXF writers, gates |
| `gen_coffer.py` | the five tile interiors, build, gates, finger-scale gates, every emitter |
| `sim_template.html`, `coffer_sim.html` | the viewer template and the built viewer |
| `hackbuild-logo.svg`, `README.md` | the mark the generator places, and the README |
| `exports/D1_00_outline.svg` to `D1_05_cover.svg`, `D1_05_cover.png`, `D1_04_backer.dxf`, `D1_geometry.json` | every layer of the resolver dial tile |
| `exports/M1_01_copper.svg`, `M1_02_guide.png`, `M1_geometry.json` | the controller tile |
| `exports/K6_01_copper.svg`, `straps_copper.svg` | the key tile copper and the seam straps |

Hashes: `fab-knowledge:originals/coffer/SHA256SUMS`.

---

## 2. What it makes and for whom

MIDI-style and instrument control surfaces for a maker with a vinyl cutter, 4 inch copper tape, a laser for a 3 mm ply backer and a printer for stickers: tiles of 108.0 x 93.5 mm that snap into a honeycomb, ground each other across every seam, and carry six channels each to a neighbour, with one tile carrying an ESP32-C3 SuperMini and an MPR121 on its expansion edge (one MPR121 is two sensor tiles; two at 0x5A and 0x5B are four).

---

## 3. Shots

Driven 2026-10-05 by `fab-knowledge:originals/coffer/drive/shoot.cjs` with `drive/shots.json` and `drive/shots-stack.json` (puppeteer-core, headless Chrome, 1280 x 860, 6 s wait, no hook; state set through the viewer's own globals).

| file | caption |
|---|---|
| `shots/c01-lattice-M1-centre.png` | LATTICE: the controller tile M1 in the centre cell of a seven-cell honeycomb; budget: 0 sensor tiles, 11 native GPIO, 12 with one MPR121. |
| `shots/c02-lattice-five-tiles-budget.png` | Five sensor tiles placed round M1 (K6, S3, A3, D1, K6): copper of every tile drawn from the emitted geometry, 27 mating tab pairs circled in pink across the seams, budget 30 channels against 12 with one MPR121 and the over-budget note. |
| `shots/c03-tile-D1-layer-stack.png` | TILE D1 with net D2 traced in pink: the four phase bands, the two crescents, the gather fan into six port pads, the ground ring and tabs, the mask tint; inspector "port slot u=-3 on edge 4". |
| `shots/c04-tile-M1-controller.png` | TILE M1 with GND traced: the SuperMini pad columns, the nested-L fans to two opposite edges, the ground trunk in the channel. |
| `shots/c05-sense-D1-dial-decode.png` | SENSE D1 with a touch at (-14, 21.6): true angle 131.2 deg, decoded 131.2 deg, the four band widths 4.14, 6.79, 6.61, 3.96 mm. The pink touch marker is drawn mirrored to the lower half (defect, section 8). |
| `shots/c06-port-table-pinmap.png` | PORT: the port table, the M1 pin map and the not-verified list. |
| `shots/c07-tile-K6-exploded-layer-stack.png` | TILE K6 with the CSS 3D exploded layer stack at lift 80: backer, guide, copper, mask and cover sheets. |

---

## 4. Code map

### 4.1 `HC`

| area | lines |
|---|---|
| frames docstring | 1 to 16 |
| `P` (the interlock dict), `PORT_EDGE` 4 | 22 to 45 |
| `apo`, `norm_ang`, `nvec`, `tvec`, `uv`, `neighbour_offset` | 47 to 63 |
| `hexagon`, `rounded`, `trace`, `teardrop`, `hexlet`, `annulus`, `polar_band` | 65 to 123 |
| port: `port_pads`, `gnd_tabs`, `gnd_ring` | 125 to 156 |
| outlined text: `font`, `_Pen`, `text_geom` | 158 to 228 |
| writers: `_d`, `svg_open`, `emit_svg`, `emit_dxf` | 230 to 282 |
| gates: `Gates`, `net_islands`, `min_clearance`, `build_mask`, `edge_coverage` | 284 to 326 |

### 4.2 `GC`

| area | lines |
|---|---|
| constants: gather line y -27, gather x, sensor floor -25.1, ring top at the port | 22 to 30 |
| `interior`, `fanpath` | 32 to 38 |
| `tile_K6` | 40 to 99 |
| `tile_S3` | 101 to 130 |
| `tile_A3` | 132 to 166 |
| `tile_D1` | 168 to 208 |
| M1 module footprint `MOD`, pin columns, `mod_pad`, `tile_M1` | 210 to 290 |
| `TILES`, `build` (ground net), `gates` | 292 to 349 |
| `__main__` (misplaced, section 1.2) | 351 to 361 |
| logo, colours, `COVER_INSET` 7.0 | 363 to 380 |
| finger scale: `electrodes`, `inscribed`, `usability` | 382 to 417 |
| guide lettering `label_geom`, logo placement `logo_spot`, `_spot` | 419 to 462 |
| `emit` (mask gates, copper, outline, guide, mask, cover gates and art, backer DXF, geometry JSON) | 464 to 612 |
| `emit_straps`, `emit_sim` | 614 to 631 |

### 4.3 `ST`

| area | lines |
|---|---|
| tokens (`--pink #FE0386`, cream, ink, panel, gold) and layout | 9 to 64 |
| views: lattice, tile, sense, port | 65 to 136 |
| helpers (`d2`, `nvec`, `tvec`, `uv`) and nav | 140 to 160 |
| lattice: cells, palette, `drawLat` (seams, budget) | 161 to 240 |
| tile: `drawOne`, `svgSheet`, `buildStack`, `layout` (CSS 3D), orbit | 241 to 312 |
| sense: `drawSense`, `readout` by kind | 313 to 380 |
| port tables | 382 to 406 |

The generator injects the geometry JSON at `/*GEOM*/` and the verbatim logo at `<!--LOGO-->` (`emit_sim`).

---

## 5. Mechanisms, circuits and constructions

### 5.1 The tile and its frames (`HC` lines 12 to 75)

Flat-top hexagon, side `s` 54.0 (108.0 wide x 93.531 tall, apothem 46.77), corners rounded 3.2 (`buffer(-r).buffer(r)`). Frames: tile-local mm, y up, origin at the centre; edge-local (u, v), u along the edge, v inward; edge e has outward normal `30 + 60 e` deg. `uv(e, u, v) = n (A - v) + t u`; `neighbour_offset(e) = 2 A n`. `hexagon(inset)` keeps a constant apothem inset by recomputing the side. Height 93.5 against the 101.6 mm tape gives 4 mm each side; a gate checks `height <= tape_w - 4`.

### 5.2 The six-edge port standard (`P`, `port_pads`, `gnd_tabs`, `gnd_ring`, `HC` lines 23 to 43, 125 to 156)

| item | value (declared) |
|---|---|
| signal pads | 6 per edge at u = -14, -8.5, -3, +3, +8.5, +14; 4.4 x 3.4, corners 0.8; centre v 3.2 (spans v 1.5 to 4.9) |
| ground tabs | 3 per edge at u = -21, 0, +21; 6.5 wide flat-capped traces (`cap_style=2`, so the tab ends exactly at its two points) from v 1.1 to v 7.0 (tip 1.1 short of the outline) |
| ground ring | band from v 6.5 to 9.5 on every edge (3 mm), a window cut on each signal edge spanning u -20 to +20 (the comment says -18 to +18) |
| sensor keep-off | `fan_v` 19.5 from the port edge (declared; nothing reads it) |
| routing | trace 1.8 (1.5 on M1), measured clearance 1.0 (0.70 on M1), copper to outline 1.0 |
| seam gaps | pad to pad `2 (pad_v - pad_h/2)` = 3.0, tab to tab `2 tab_v` = 2.2 |
| mating rule | u mirrors across a seam, so a pad at +14 faces the neighbour's -14; tabs are symmetric, so all three mate either way |

Why hexagons (README): the contact rail ate an edge on earlier boards (VERNIER); a ring reaching all six edges grounds every neighbour and guards every electrode.

### 5.3 Routing kit (`HC` lines 77 to 123)

`trace(pts, w)` buffers a LineString with round joins; `teardrop(pad, pts)` hulls the pad with one round cap 0.9 past where the trace leaves the pad, a local fillet with no thin neck; `hexlet` small rounded hex electrodes; `annulus` and `polar_band(cx, cy, a0, a1, rfun0, rfun1)` build bands whose radii are functions of angle. Shared sensor routing (`GC` lines 25 to 38): every sensor net runs from a tap to the gather line y -27 at x -20, -14, -6, 6, 14, 20, then straight through the ring window to its pad. `SENSOR_Y0` -25.1 ("sensor copper stays above this") is declared and never checked: the gate meant to hold it is the placeholder `G.check(True, ...)`.

### 5.4 K6, six interlocking hex keys (`tile_K6`, `GC` lines 40 to 99)

Six pointy-top hexlets of side 10.7 (18.53 across the flats) at pitch `sqrt(3) s + 4.4` round (0, 5.6). Routes by kind: side (K1, K4: tap the outer vertical edge and hug the interior), void (K2, K3: tap toward the centre, through the middle void, out the free grout corridor at -30 or 210 deg), drop (K5, K6: straight down). Ground spokes 2.2 wide at 30, 90 and 150 deg from r 12 to 44 guard between keys. Port order K4 K3 K5 K6 K2 K1. Computed: smallest key 298.5 mm2, inscribed 18.37 mm; minimum clearance 1.024 mm (K1 to K2).

### 5.5 S3, three wedge-pair sliders (`tile_S3`, `GC` lines 101 to 130)

Bands x (-30, -14), (-8, 8), (14, 30) and y (-20.5, 20), (-24, 34), (-20.5, 20); in each band A is a trapezoid from 0.75 of the band width at the bottom to 0.25 at the top, B the complement after a 1.6 gap, corners rounded 1.0. Ground guards 4 wide between bands. Position `A / (A + B)`, a ratio that ignores how hard the finger lands; the span 0.75 to 0.25 never pins to a rail; A + B is presence; eight zones turn two channels into eight buttons (README). Computed: smallest plate 258.7 mm2, inscribed 9.37 mm; minimum clearance 1.000 mm (GND to S1B), exactly on the gate.

### 5.6 A3, three concentric arc sliders (`tile_A3`, `GC` lines 132 to 166)

Hub at (0, -27); sweep 54 to 126 deg; rings (15, 28), (29.5, 40.5), (42, 51); split radius `r0 + (r1 - r0 - gap)(0.28 + 0.44 t)` with gap 1.4; escapes run 10 deg past the arc ends. Computed: smallest plate 131.9 mm2, inscribed 5.26 mm; minimum clearance 1.100 mm.

### 5.7 D1, the four-phase resolver dial (`tile_D1`, `GC` lines 168 to 208)

What it does: absolute angle from four capacitances, no seam, no dead reckoning.

Construction: centre (0, 5.6); `r_in` 9.0, annulus width W 21.5 (`r_out` 30.5); modulation m 0.35; gap 1.05; sweep -62.5 to 242.5 deg (305 deg). Band k spans `r_in + W cum(a, k)` to `r_in + W cum(a, k+1)` with `cum(a, k) = sum over j < k of (1 + m cos(a - 90 j)) / 4`, half the gap taken off each internal boundary, smoothed by `buffer(-0.3).buffer(0.3)`, 300 steps. Each band escapes along an arc from the sweep start to a fan angle `-107 + 13 k` deg and out at r 31 to its pad. Crescent keys L1 and L2: annuli from `r_out + 2.2` to `+ 12` over 148..212 and -32..32 deg, clipped to the interior inset 1.4 and smoothed 0.6, tapped at r 35.5. Port order L1 D1 D2 D3 D4 L2.

Decode: local band width `w_k = W (1 + m cos(a - 90 k)) / 4`, so `w1 - w3 = (m W / 2) cos a` and `w2 - w4 = (m W / 2) sin a`, and `atan2(D2 - D4, D1 - D3)` returns a for any finger coverage that scales all four equally. The 55 deg notch (242.5 to 297.5) where the traces leave is a blind sector; mask it in firmware. Computed: smallest plate 169.2 mm2 (the crescents), narrowest 6.16 mm (D2); minimum clearance 1.040 mm (D2 to D3); at a touch of 131.2 deg the viewer decodes 131.2 deg.

### 5.8 M1, the ESP32-C3 SuperMini carrier (`tile_M1`, `GC` lines 210 to 290)

Footprint carried from SPINDLE and marked not re-measured (declared): pad centres x +-8.75, pitch 2.54, 8 per column, pads 5.0 x 1.7, body 18.0 x 22.4, hole row x +-7.62. Columns with USB toward the front edge, bottom to top: left 5V GND 3V3 IO4 IO3 IO2 IO1 IO0; right IO5 IO6 IO7 IO8 IO9 IO10 IO20 IO21.

Construction:
1. Signal edges 2 (normal 150) and 5 (normal 330). Upper left carries IO0 IO1 IO2 IO3 IO4 3V3; lower right 5V IO5 IO6 IO7 IO8 IO9 (I2C on IO8 and IO9, the expansion port for an MPR121).
2. Nested-L fans: each pin runs out perpendicular to its pad row to a lane at `13 + 2.8 i` mm, then one diagonal to its port pad; no horizontal meets a diagonal above it. The code ranks pins by where the module pad's outer end sits along the edge tangent `tvec` and gives the first rank the outermost lane; the comment words the rule by port pad position, which gives the same order here because the port order follows the pin order. Trace 1.5, clearance 0.70.
3. 5V crosses under the module in the channel between the rows (it is the pin below GND, and a pin above GND cannot cross without cutting the ground trunk).
4. IO10, IO20, IO21 keep anchor pads only, each its own net.
5. Ground: the channel is the trunk with a spoke north to the ring and a south feed that leaves west, outboard of the whole upper-left fan, onto the ring past the window, so the two ring arcs left by two windows are one island with zero jumpers. Centre tabs are skipped on the two signal edges.

Consequences (README, stated): only two edges carry signals because the pad rows wall off the tile; with three or more windows some arc floats. Boot audit: IO2, IO8, IO9 are strapping pins (I2C idles high; IO2 must be high at reset); GPIO21 is U0TXD and strobes the boot log, so it is anchor only. Computed: 66 gates pass, minimum clearance 0.747 mm (3V3 to GND), module body keepout and every module pad claimed by exactly one net.

The C3 has no touch peripheral: MPR121 on the lower right edge first, a native touch S2 or S3 second, RC timing with 1 M per channel third (README).

### 5.9 Ground net and build (`build`, `GC` lines 295 to 307)

GND = union of the ring with its windows, every tab (minus skipped centres), and the tile's extras (spokes, guards, M1 trunk), closed by `buffer(0.25).buffer(-0.25)`.

### 5.10 Gates (`gates`, `usability`, mask and cover gates in `emit`; `HC` lines 284 to 326)

Per tile, all must pass or nothing is written:

| gate | rule |
|---|---|
| single island per net | parts over 0.02 mm2 |
| min net clearance | true pairwise distance over all nets, at least 1.0 (0.70 on M1), the offending pair named |
| copper to outline | at least 1.0; copper inside the outline |
| fits 4 inch tape | height at most `tape_w - 4` |
| port slot | every pad centre exactly at `uv(e, u, pad_v)` |
| pad and tab seam gaps | at least 2.0 and 1.4 |
| module body keepout and pad ownership | stray copper under the body under 0.05 mm2; each module pad claimed by one net |
| ground reach | at least 2 live tabs on every edge |
| gather lane | `G.check(True, ...)`, a placeholder that always passes |
| finger scale | open each net by 0.95 mm so traces vanish and keep the pieces of at least 60 mm2 (`electrodes`); smallest plate at least 120 mm2; narrowest inscribed circle (polylabel, 0.15 precision) at least 4.5 mm |
| mask | one piece; covers the sensor field; clears every pad by 1.0; leaves ground tabs at least 55 percent bare; "border at least 1.2", which compares the literal 6.0 to 1.2 and so always passes (`GC` line 498) |
| cover | one piece; clears pads by 1.5; tabs at least 60 percent bare of cover; carries every electrode |

Totals: 214 gates, 0 failures (computed).

### 5.11 Layers and the build stack (`emit`, `GC` lines 464 to 612)

Bottom up:
1. Backer, 3 mm ply, laser: DXF R2010 with layers OUTLINE, HOLES and ENGRAVE, the outline shifted so its lower left corner sits at the origin; HOLES is declared and stays empty because `emit` passes no holes; ENGRAVE carries the guide lettering (`HC` `emit_dxf`, lines 263 to 282). `$INSUNITS` is 6 (metres) because the writer never sets units and ezdxf's default stands; the plan's DXF writer gate fails that by name (M07-motion-nest.md lines 133 and 669).
2. Guide sticker, printed: cream outline, traces in pink at opacity 0.30, pads solid pink, module pads gold, the module body dashed, tile name, title and "108.0 x 93.5 mm . COFFER TILE . hack.build", every channel name rotated at its pad, GND labels on four edges, and the canonical mark placed by a largest-clear-square search: sizes 15, 12, 9.5, 7.5, 6.0 tried in turn, centres on a 2 mm grid over x -40..40 and y -18..32, the square kept inside the interior inset 1.0 and at least 0.8 mm from copper, lettering and the module body grown by 1.5 (`logo_spot`, `_spot`).
3. Copper foil, vinyl cutter: StrongGrip mat, fine point blade, one pass (stated); tight spots are the 4.4 mm K6 corridors and the D1 notch.
4. Vinyl faceplate as a dielectric: hexagon inset 6.0, one piece, every pad and tab bare (a deliberate departure from earlier mask-follows-outline rules). On M1 it is also holed over the module body grown 0.6 and over each module pad grown 0.7.
5. Printed cover sticker, inset 7.0 (with the same module holes on M1): the art is the emitted copper opened by 0.95 mm in pink at opacity 0.85 with a 0.45 mm ink edge, and a channel name on each plate whose inscribed width is at least 5.0 mm, sized `clamp(0.34 w, 1.9, 3.4)` mm, the title block and the hack.build wordmark under the field, and the mark placed by the same search; registered by its own hexagon.
6. Seam straps: 12 rounded 9 x 3.2 mm straps cut from the same foil, soldered across facing tabs.

Viewer geometry: every net simplified at 0.012 mm and written with sense metadata, pads, port numbers and windows.

### 5.12 The viewer (`ST`)

Lattice: a centre cell with M1 and six neighbours; tap to place and cycle tiles; rotate in 60 deg steps; mating tab pairs circled at every shared seam; budget (sensor tiles, channels wanted, controller tiles, native GPIO 11, 12 with one MPR121, the over-budget note). Tile: click a net to trace it; layer toggles; inspector; channel chips; an exploded CSS 3D layer stack (backer, guide, copper, mask, cover) with LIFT, drag orbit, wheel zoom, double-click reset. Sense: drag on a tile; readout by kind: keys (nearest centre, ON within 0.86 x the hexlet side), sliders (A/(A+B) and position per band), arcs (radius, angle, position, sweep `(a1 - a0) x mean radius`), dial (true angle, decoded angle, the four widths, the dead sector message). Port: the port table, the M1 pin map, the not-verified list.

### 5.13 Further constructions found on the checker pass (2026-10-05)

Read from the code; the first pass of this record left them out.

1. Seam straps (`emit_straps`, `GC` lines 614 to 623). One 60 x 40 mm sheet of twelve straps, 4 columns at 13 mm by 3 rows at 11 mm, each a 9.0 x 3.2 rectangle rounded 1.2. The lattice view counts "straps needed" as one per mating tab pair, so the five-tile layout in `shots/c02` needs 27 straps, more than two sheets.
2. Seam detection in the lattice (`ST` lines 204 to 222). Two placed cells share a seam when their centres are `2 x apothem` apart within 0.5 mm; the shared edge index comes from the direction between centres; three circles mark the tabs at u -21, 0 and +21. Tile rotation is ignored, which is safe because the tabs are symmetric about u 0. Channel budget is the sum of port pads over sensor tiles against 11 native GPIO or 12 with one MPR121.
3. The sense view's dial decode is analytic (`ST` lines 360 to 373): it computes the four band widths at the true touch angle and feeds them to `atan2(D2 - D4, D1 - D3)`, so "decoded" always equals "true" off the notch. It confirms the algebra, not the copper; the page says so under the stage ("a plausible self capacitance model, not measured").
4. Generator switches (`GC` lines 22 to 23). `COFFER_OUT` sets the output folder (default `out`); `COFFER_BRAND=1` adds a 4.0 mm "hack.build" wordmark to the copper layer.
5. Viewer injection (`emit_sim`, lines 625 to 631). The template's `<!--LOGO-->` gets the verbatim mark at 26 x 26 and `/*GEOM*/` the list of tile geometry objects, each net simplified at 0.012 mm and rounded to 0.001 mm, with sense metadata, pad slots, port constants and ring windows.
6. Dead helpers in `HC`: `build_mask` and `edge_coverage` (lines 314 to 326) are never called by the generator; the faceplate is built in `emit` instead.

---

## 6. UX anatomy

Paper shell with canonical tokens (`--pink #FE0386`, cream, ink, gold `#d9b45a`), Permanent Marker, Special Elite, IBM Plex Mono, dot grain; nav tabs LATTICE, TILE, SENSE, PORT; one stage panel and one side panel per view. No hook, no exports from the page (the generator is the exporter).

What makes it excellent: a single port standard makes every tile composable and the lattice view proves it; every channel is gated at finger scale, which is the question a user actually has; the cover sticker shows the user exactly the plates under their finger because it is the copper itself; the dial decodes absolutely with a ratio, so finger pressure does not matter.

---

## 7. Tests and harness

The generator's gates are the tests. This folder's `drive/run_gates.py` imports `gen_coffer` (skipping its broken `__main__`), runs `build`, `gates` and `emit` per tile plus `emit_straps` and `emit_sim`, and writes `drive/records/regen_summary_2026-10-05.json` and one gate report per tile (`K6_gates.txt` to `M1_gates.txt`). `drive/shoot.cjs` drives the viewer. Checker pass 2026-10-05: 38 claims re-read against `HC`, `GC` and `ST` (the interlock constants, frames and `uv`, pad and tab geometry, ring window, seam gaps, teardrop rule, every tile's construction constants and port order, the D1 band law and notch, the M1 footprint, pin columns, fans, 5V crossing and ground trunk, every gate rule and threshold, the gate counts in `drive/records/`, the layer emitters, the viewer's lattice, sense and stack code). Corrected: ground tabs are flat-capped, not square-capped; the sense marker line is 320 in the template; the gather-line floor and `fan_v` are declared, not gated; the mask border gate always passes; the DXF HOLES layer is empty and `$INSUNITS` comes from the ezdxf default; the nested-L ranking is stated as the code does it. Section 5.13 was added. All seven shots were opened and show what their captions say.

---

## 8. Known defects and stale numbers

- `GC` `__main__` placement (section 1.2): as shipped it raises NameError and emits nothing.
- The gather-lane gate is `G.check(True, ...)` (line 346).
- Tile blurbs ship stale into the JSON and the viewer: K6 "17.3 mm across the flats, 260 mm2" (geometry 18.53 and 298.5 computed); S3 "39, 53 and 39 mm of travel" (bands 40.5, 58, 40.5); A3 "31 / 46 / 61 mm of sweep" (README 33 / 51 / 66; the viewer's own formula gives 27 / 44 / 58). The plan's seed `hex-key across_flats 17.3` came from this blurb (CANONS.md line 514).
- `P['win_u']` comment says -18..+18; the cut spans -20..+20.
- S3's minimum clearance lands exactly on the 1.0 gate (GND to S1B, computed): one rounding step from a failure.
- Sense view: the touch marker is drawn at `(x, -y)` inside a group already flipped by `scale(1, -1)`, so it appears mirrored vertically while the readout uses the true point (`ST` line 320, `F/coffer_sim.html` line 325; measured in `shots/c05`).
- The over-budget note always says "Two MPR121 ... give 24, which is four tiles", even when five tiles ask for 30 channels and two MPR121 are not enough.
- The tile view's layer-stack caption lists four layers and omits the cover that the stack draws.
- The mask gate "mask border to outline" is `G.near(6.0, 1.2, ...)`, a literal against a literal, so it always passes (`GC` line 498); with the gather-lane placeholder that makes two gates of the 214 that test nothing.
- `P['fan_v']` and `SENSOR_Y0` are declared limits that no gate reads (section 5.3).
- The lattice comment says "centre plus its six neighbours plus a second ring on two sides"; the code builds the centre and six neighbours only (`ST` lines 164 to 167).
- The SuperMini footprint provenance conflicts with the plan's seed tier "verified" (`fab-knowledge:sources/benches/benches-machines.md` deltas, conflict 2).

---

## 9. How to make a new thing this way

1. Define the interface once (a port with typed slots, a mirror rule and seam gaps) and make every module obey it; let the ground ring be the wiring.
2. Route every sensor through one gather line and straight through a window, so tiles differ only in their interiors.
3. Encode absolute position as a ratio of capacitances (wedge pairs, sinusoidally modulated bands) so pressure and coverage cancel.
4. Gate on finger scale: open each net to erase traces, then area and inscribed circle.
5. Gate everything against the emitted geometry, refuse to write on any failure, and name the offending pair.
6. Make the print layers from the copper itself (guide and cover), so what the user sees is what they touch.

---

## 10. Port map

| mechanism or construction | package | feature kinds | canon id (CANONS.md) | reference id | milestone | lineage row |
|---|---|---|---|---|---|---|
| six-edge port standard with ground ring and tabs | copper, spec | port, pad, conductor | coffer-port (line 596) | surfaces/coffer-tile (named in CANONS.md line 596; not yet in `reference/`) | M06-T09 | MISSING |
| four-phase resolver dial | copper | conductor, pad | resolver-dial (line 584) | sensors/resolver-dial (M11-reference.md line 451, written at M06-T09) | M06-T09 | MISSING |
| hex keys | copper | conductor, pad | hex-key (line 585; across-flats corrected to 18.53, line 514) | surfaces/fret-hex | M06-T09 | MISSING |
| wedge-pair sliders | copper | conductor, pad | wedge-pair-slider (line 581) | sensors/wedge-slider (M11 line 447) | M06-T09 | MISSING |
| arc sliders | copper | conductor, pad | arc-slider (line 582) | sensors/arc-slider (M11 line 448) | M06-T09 | MISSING |
| capacitive plate with finger-scale gate | copper, checks | conductor, pad | capacitive-plate (line 580; `plate.minArea` 120, `plate.minInscribed` 4.5) | sensors/capacitive-plate | M06-T09 | MISSING |
| SuperMini carrier with nested-L fans and channel trunk | copper, catalog | pocket, pad, conductor | MISSING (no esp32c3-supermini carrier archetype) | MISSING | M08 (catalog) | MISSING |
| gather-line fan, teardrop entries, true pairwise clearance, single-island gate, tape gate | copper, checks | conductor | n/a | MISSING | M05 | MISSING |
| layer stack: guide, faceplate, cover from copper, backer DXF | nest, inlay | export layers | n/a | MISSING | M07 (DXF `$INSUNITS` fails by name) | MISSING |
| lattice composer with seam and budget view | ui-core | view | n/a | MISSING | M09 | MISSING |

`lineage.json` holds three rows, none for COFFER (checked 2026-10-05). M16 plans `designs/coffer/legacy/` (M16-knowledge-registry.md line 619). CANONS.md lines 640 to 642 already say the generator "never calls emit"; the port should also move `__main__` below `usability` and replace the placeholder gate.
