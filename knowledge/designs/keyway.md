# KEYWAY: how it is made

Record written 2026-10-05 from the original code. Slug `keyway`. Family KEYWAY (chat `cricut-midi-seven`, conversation 126dc235-5228-4b5d-9f73-06f23c259d06): KEYWAY, VERNIER, QUADRANT, SPLINE, TESSERA, FRET, STAVE. KEYWAY is the first board of the seven and the only force build; it owns the family kernel described in section 4, which the six siblings reuse.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. A number marked "computed" comes from the rerun of the shipped generator on 2026-10-04 (shapely 2.1.2, Plex Mono woff2 from `@fontsource`, logo from `board-forge-updated.zip`), saved as `fab-knowledge:originals/keyway/files/rerun/run-2026-10-04.txt`. A number marked "measured" comes from the headless drive of the shipped viewer on 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/keyway/files/`. `GEN` is `F/gen_keyway.py`. `SIM` is `F/keyway_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | KEYWAY rev A, 2x2 velocity and pressure pad plus graded slider |
| owner's slug | keyway |
| canonical file | `GEN` (the generator is the design; every layer is its output) |
| generator sha256 | d712ce489ad04cc33f670715e204ad8ac21ee3429a1123e48cfa3dfdcf715e3c |
| viewer | `SIM`, sha256 7922d05d4e12387156a2103192149c8258ec15cbf9f354f153c4009b078618d9, 73864 bytes |
| date | 2026-08-10 18:46 (zip stamp of `~/Downloads/files (49).zip`, byte identical member for member to the harvest) |
| process | Cricut cut sheets: adhesive copper foil, Velostat 4 mil, 0.3 mm cardstock, 2 mm EVA, 2 mm chipboard, print then cut sticker paper |
| size | 110 x 174 mm, corner r 3.2 (`GEN` line 41) |
| nets | 8: COM, P1 to P4, SA, SB, SC (`GEN` line 84) |
| gates | 45, all pass (computed) |

### 1.1 Every revision found

| where | file | date | sha256 | role |
|---|---|---|---|---|
| `fab-work-directory:benches/cricut-midi-seven/outputs/keyway/` | generator, svgpath, README, geometry JSON, sim, 11 layer files | harvest | as `SHA256SUMS` | canonical source of these files |
| `~/Downloads/files (49).zip` | the same members | 2026-08-10 18:46 | per member identical (`fab-knowledge:sources/downloads/dl-gudgeon-tang-keyway.md` section 6) | the owner's download |
| `~/Downloads/mandrel-endgame*.html` (Aug 16) | a mockup that shows "KEYWAY 8 layer stack" and "gates 45/45" | 2026-08-16 | n/a | a UI mockup of a later app, no KEYWAY geometry; not copied |

Earlier in the chat the comb ran 13 fingers at 1.5 mm on 2.5 mm pitch (recorded in `F/lessons/sensor-surfaces.md`, "Interdigitated force comb"); that revision's files are not in any folder found.

### 1.2 Why this revision

There is one shipped revision, and it meets the bar: the rerun reproduces every parameter and stat in `F/keyway_geometry.json` (computed), all 45 gates pass at 1.000 mm worst clearance (computed), and the viewer drives with zero page errors (measured). The 11 finger comb is the revised one the owner kept after the weeding test.

### 1.3 What is in `files/`

| path | what |
|---|---|
| `gen_keyway.py` | the parametric generator and its 45 gates |
| `svgpath.py` | SVG path parser and font outliner (md5 124f0352..., identical in all seven boards) |
| `README.md` | the owner's README: idea, terminal table, cut settings, assembly, wiring, controllers |
| `keyway_geometry.json` | params, per net paths, art, every material layer, terminals, stats |
| `keyway_sim.html` | the viewer: layer stack, sense model, wiring |
| `layers/` | `01_copper_base.svg` (+png), `01_copper_base_brand.svg`, `02_velostat.svg`, `03_spacer_lower.svg`, `04_spacer_upper.svg`, `05_copper_wiper.svg`, `06_foam_caps.svg`, `07_backer.svg`, `08_overlay_guide.svg` (+png) |
| `inputs/` | `hackbuild-logo.svg` (sha256 c0b0c1f6..., same bytes as the copy in `board-forge-updated.zip`) and the three Plex Mono woff2 files; the generator needs these and the bench folder does not ship them |
| `rerun/run-2026-10-04.txt` | the 45 gate lines from the rerun |
| `lessons/` | the board-forge skill update this chat wrote: `SKILL.md`, `sensor-surfaces.md`, `vinyl-copper.md`, `board-viewer.md` (stamped 2026-08-10 18:41 to 18:43) |

Regenerate: copy `inputs/*` next to `GEN`, set `LOGO` (`GEN` line 37) to the local logo path, run `python3 gen_keyway.py` with shapely 2.x and fontTools plus brotli.

---

## 2. What it makes and for whom

A component free MIDI control surface cut on a Cricut. Four velocity and pressure sensitive zones in a 2x2 grid, one graded position slider with pressure, nine alligator clip terminals. No parts sit on the board; every sensor is copper geometry plus a stack of sheets the same machine cuts. For a maker with a vinyl cutter and a microcontroller with five ADC inputs who wants a playable pad without a PCB order.

One copper pattern serves two sensors and the material stack picks which (`F/README.md` "The idea"): bare copper read as self capacitance, or copper under tented Velostat read as a force sensing resistor. The force build gives real velocity (slope of a ramp) and aftertouch (level while held); the capacitive build gives on or off.

---

## 3. Shots

Driven headless on 2026-10-05 (Chrome, puppeteer-core, 1280 x 860) from `SIM` with no hook (the viewer has none); script steps are recorded in section 9. Zero page errors (measured). The page fetches Google Fonts on load (five requests, measured); offline it falls back to the mono stack. Files in `fab-knowledge:originals/keyway/shots/`.

| file | caption |
|---|---|
| `k01-stack-iso-default.png` | Layer stack at load: CSS 3D, tilt 58, spin -18, lift 55. Backer, guide sticker with the mark, base copper, lower spacer, four Velostat squares, upper spacer, wiper, four pink EVA caps. Right rail: View pane with the lift slider, ISO TOP EDGE COLLAPSE, BRAND IN COPPER and its note; the layer list in build order with material per row. |
| `k02-stack-exploded-orbited.png` | After a 160 px drag and lift 100: the eight sheets separate in true order, each one the emitted SVG on a div, so the knockout KEYWAY in the COM bus and the comb background read as real holes. |
| `k04-top-collapsed-brand-in-copper.png` | TOP cam, lift 0, BRAND IN COPPER on: the stack reads as the built board; the brand note switches to "Copper 7533 mm2. 557 mm2 of that, 7.4 percent, is decoration doing no electrical work". |
| `k05-sense-force-pad1-held.png` | Sense model, Velostat force mode, PAD 1 held at about 84 percent force (aftertouch 107 of 127) with the attack slider at 60 ms: zone PAD 1, 4.2 kohm, ADC 720, peak slope 10.18 counts per ms, MIDI velocity 112, aftertouch 107 (measured from the shot). The ADC trace shows the plateau. |
| `k06-sense-slider-wiper.png` | Sense model scrolled to the slider, pointer held at 62 percent of travel: wiper 1.380 V (428 counts), CC 79, and the note "A is 5.4 mm of copper here against B's 7.4 mm" (measured). The copper view still shows the brand art because the toggle from k04 is global. |
| `k07-wiring-terminal-field.png` | Wiring tab: the nine terminal rows with row pill, force build and capacitive build roles; the controller pane; "Numbers that came out of the generator". |

Finding from the drive: with the default 12 ms attack, the press reached full force inside the first animation frame and the readout showed peak slope 0.00 and velocity 0 (measured at the first attempt). The 12 ms default is shorter than one 16.7 ms frame at 60 Hz (computed), so the model can miss the ramp. At 60 ms the sampler sees the ramp: peak slope 10.18 counts per ms gives velocity 112 (measured, k05); `slope * 11` reaches 127 only at 11.55 counts per ms (computed from `SIM` line 287), so a 60 ms attack does not saturate. See section 7.

---

## 4. The family kernel (owned here, reused by all seven)

### 4.1 Generator skeleton

| step | what | `GEN` lines |
|---|---|---|
| docstring | states the topology trick that makes it single layer | 2 to 20 |
| environment | `KEYWAY_OUT` (default `HERE/out`), `KEYWAY_BRAND` (default `'0'`) | 28 to 33 |
| `P` dict | every dimension, named | 39 to 62 |
| `rr(x0,y0,x1,y1,r)` | rounded rect: `box(inset by r).buffer(r, join_style=1, resolution=16)`, r clamped to half the short side minus 0.001 | 66 to 68 |
| `wire(pts, w)` | `LineString(pts).buffer(w/2, cap_style=2 flat, join_style=1 round, resolution=16)` | 70 to 71 |
| `smooth(g, d=0.4)` | closing then opening: `buffer(d).buffer(-d)`, round joins | 73 to 74 |
| `outer_only(g)` | drop interior rings | 76 to 78 |
| outline | `OUTLINE = rr(0,0,W,H,R)`; `INNER = OUTLINE.buffer(-edge_keep)`; `RIM = OUTLINE - OUTLINE.buffer(-0.15)` | 80 to 82 |
| nets | `nets = {name: []}`, `add(net, g)`; after build `NET = {k: smooth(unary_union(v))}`, `COPPER = union(NET + ART)` | 84 to 86, 194 to 195 |
| gates | `gate(ok, msg)` appends PASS or FAIL | 197 to 287 |
| refusal | any FAIL prints and `sys.exit(1)` before a file is written | 290 to 291 |
| emit | `poly_path` simplify 0.012 mm with `preserve_topology`, y flipped `H - y`, 3 decimals, one `M ... Z` per ring, `fill-rule="evenodd"`; `svg()` writes `width="Wmm" height="Hmm" viewBox="0 0 W H"`, items `(geom, fill, opacity, stroke, stroke_width)`, negative width means dashed `1.6 1.2` | 295 to 323 |
| shared outline | `RIM` is unioned into every layer SVG so all layers share one outline and one document size | 326 to 340 |
| JSON | params, per net paths, outline, art parts, every material layer, terminals, pads, stats; the viewer inlines it as `const G=` | 364 to 380 |

Order matters in two places. Lanes and routes are fixed in data before any geometry is unioned (rule from `F/lessons/sensor-surfaces.md`, "Compute lanes FIRST, then emit one polyline per net"). `smooth` runs per net after the union, so a sliver cannot survive into the clearance gate.

### 4.2 `svgpath.py` (text and logo kernel)

| function | what | `F/svgpath.py` lines |
|---|---|---|
| `_bez3`, `_bez2` | cubic flattened at n 12, quadratic at n 10 | 16 to 33 |
| `path_to_rings(d)` | M L H V C S Q T Z, absolute and relative; arcs (`A`) raise | 36 to 125 |
| `rings_to_geom` | even odd fill: polygons sorted by area descending, a ring whose representative point lies inside an earlier one is subtracted from it | 128 to 143 |
| `path_geom` | affine transform of the result | 146 to 150 |
| `_Pen` | fontTools pen; TrueType quadratic runs with implied on-curve midpoints become explicit Q segments | 154 to 183 |
| `text_geom(s, font, cap_mm, x, y, tracking, anchor)` | scale = cap_mm / OS/2 sCapHeight (fallback 698); missing glyphs advance 600 units; anchors l, c, r; returns (geometry, advance mm) | 196 to 230 |

Brand mark: a regex over `<path transform="translate(tx,ty)" ... d="...">` in the logo keeps each path separate, so path [0] (arc, ink) and [1] (wrench, pink) stay addressable (`GEN` lines 170 to 184).

### 4.3 Viewer shell (`SIM`)

| part | what | `SIM` lines |
|---|---|---|
| tokens | `--pink #FE0386 --cream #f5f0e6 --ink #1a1a1a --sunk #efe9db --gold #d9b45a`; Plex Mono body, Permanent Marker title, Special Elite tag | 6 to 8 |
| header | ink bar, 3 px pink bottom rule, the canonical mark inline (viewBox `117 103 800 800`, comment "VERBATIM favicon geometry; never approximate, never redraw"), title KEY in cream and WAY in pink | 12 to 18, 67 to 68 |
| tabs | Layer stack, Sense model, Wiring; built last from `const TABS` | 345 to 351 |
| layout | `.wrap` grid `minmax(300px,1fr) 340px`, one column under 860 px | 25 to 26 |
| stack | `#stage{perspective:1400px}`, `#stack{transform-style:preserve-3d}`; one div per layer holding an SVG built from the emitted path strings; `translateZ(z*lift*1.15 + z*4)` | 40 to 47, 132 to 170 |
| orbit | pointer capture; drag spins 0.4 deg/px and tilts clamped to plus or minus 89; wheel zoom 0.35 to 3.2 at 1.09 per notch; shift drag or two finger pinch changes lift; double click resets tilt 58, spin -18, zoom 1, lift 55 | 184 to 204 |
| cams | Iso [58, -18], Top [0, 0], Edge [80, 0]; Collapse toggles lift 0 and 55 | 172 to 174 |
| layer list | build order top first with swatch and material; click toggles `display:none` (never opacity) | 205 to 210 |

---

## 5. Mechanisms, circuits and constructions

### 5.1 Interdigitated force comb (four zones)

What it does: two comb electrodes on one copper layer face each other without touching; Velostat tented above them touches nothing at rest and bridges more facing edge as force grows, so resistance falls from open to a couple of kohm (README).

Construction, per zone (`GEN` lines 88 to 113), in order:

1. Zone box `x0..x0+34, y0..y0+34` at `pad_x (13.5, 62.5)`, `pad_y (60.0, 100.0)`.
2. Spines: the COM spine on the inner side (toward the bus), the sense spine on the outer side, each 2.2 wide, full zone height. Left column: sense at x0, COM at x1 - 2.2; right column mirrored.
3. Finger count `n = int((pad_h - 1.0) // fing_pitch)` = 11 (computed); `ybase = y0 + (pad_h - (n-1)*pitch - fing_w)/2` centres the set. The 11 is the total per zone, alternating: 6 COM fingers (even i) and 5 sense fingers (odd i) (computed from `GEN` lines 106 to 111). The README and `F/lessons/sensor-surfaces.md` line 33 say "11 fingers per side", which the code does not do.
4. For i in 0..n-1 at `yy = ybase + i*pitch`: even i is a COM finger from the COM spine to 1.4 short of the sense spine; odd i is a sense finger from the sense spine to 1.4 short of the COM spine. Each finger is a `box` 1.8 tall.
5. Union per net, then `smooth(0.4)`.

Constants:

| name | value | source |
|---|---|---|
| zone | 34 x 34 | `GEN` line 43 |
| spine | 2.2 | line 44 |
| finger, pitch, gap | 1.8 on 3.0, gap 1.2 | line 44 |
| tip gap | 1.4 | line 44 |
| fingers per zone | 11 | computed |
| facing edge | `fingers * 27.2` = 299 mm | `GEN` line 378 (27.2 is a declared constant, the finger overlap length; inferred from 34 - 2 x 2.2 - 1.4 - 1.0) |

Gates on it: single island per net; netlist audit by name counts COM on every zone's COM spine and each sense net on its own spine (part of the 20 of 20, `GEN` lines 205 to 214); Velostat bridges COM plus its own zone only, buffered 0.6 (lines 268 to 270); Velostat covers both combs over 20 mm2 (computed 260 and 260 mm2 per zone); the lower spacer window exposes both combs over 15 mm2 (computed 197 and 247 mm2).

Fits and cut settings: finger gap 1.2 is the weeding limit; the serpentine background between fingers lifts as one connected piece per zone, pulled along the fingers (README "Cut settings"). Foil on a StandardGrip mat, fine point, vinyl setting plus pressure.

Limits and lessons: the first revision ran 13 fingers at 1.5 on 2.5 pitch; 11 at 1.8 on 3.0 weeded far easier and the sensitivity difference was not detectable by hand (`F/lessons/sensor-surfaces.md`). The resistance curve in the viewer is plausible, not measured; firmware should log open and hard press readings per zone at boot.

### 5.2 COM centre bus with knockout label

What it does: one fat bus feeds the inner spine of all four zones, which is the topology trick that keeps COM single layer with zero jumpers.

Construction (`GEN` lines 115 to 121): `box(47.5, 60, 62.5, 134)`; `text_geom('KEYWAY', Plex Mono 700, cap 7.5)`, `outer_only` (the counters are filled so the cut stays weedable), rotated 90 about the origin, translated to the bus centre plus half the cap, y 74; `bus.difference(text)`. The label is a hole, which costs no weeding.

### 5.3 Graded wedge slider with top copper wiper

What it does: two opposed copper trapezoids split by a diagonal gap; a Velostat strip lies on both in full contact; a top copper wiper held off by an upper spacer slot picks off the graded sheet potential when pressed. Drive SA high and SB low and SC reads position; drive both high and SC reads contact resistance, which is pressure.

Construction (`GEN` lines 123 to 137):

1. Band y 40 to 54; `hsum = 14 - 1.2`.
2. `hA(x) = 10.6 + (2.2 - 10.6) * (x - 15.5)/(85.8 - 15.5)`: SA thickness falls linearly from 10.6 to 2.2 across x 15.5 to 85.8.
3. SA = spine box x 13.5 to 15.5 full band, plus the trapezoid with floor y 40 and top `y0 + hA(x)`.
4. SB = spine box x 87.0 to 89.0, plus the trapezoid from `xbt = 15.5 + 1.2` to 87.0 with its floor at `y0 + hA(x) + 1.2` and its top at the band ceiling. The 1.2 offset is the diagonal gap.
5. SC landing pad `rr(90.2, 43.0, 96.5, 51.0, 1.2)`, off the right end of the band.
6. Material layers (lines 255 to 266): Velostat strip `box(14.0, 39.5, 87.5, 54.5)`; upper spacer `box(13.0, 38.5, 89.5, 55.5)` minus slot `box(16.0, 44.5, 85.5, 50.5)`; wiper `box(15.0, 44.0, 96.0, 50.0)`, whose tail reaches past x 89.5 onto the SC pad.

Constants: travel 67.9 mm, span 0.811 to 0.177 (computed; README rounds to 81 to 18 percent). Trapezoids, never triangles: a triangle pins the ratio to 1.000 and 0.000 at the ends (`F/lessons/sensor-surfaces.md`).

Gates: both wedges keep at least 1.8 mm of copper across 41 vertical cuts of the travel; ratio `a/(a+b)` strictly decreasing over the 41 samples (lines 239 to 249); slider Velostat touches SA and SB only and clears SC by at least 1.5 (computed 2.70); wiper stray contact `WIPER - VELO_SL - box(spu)`, intersected with copper and minus the SC pad grown 0.2, under 0.01 mm2 (computed 0.000); tail lands over 8 mm2 (computed 34.8); the spacer slot lies over the Velostat for more than 99.5 percent of its area (lines 275 to 284).

The wiper trick: the wiper tail folds down past the spacer onto the SC landing pad, where there is only air underneath, so the top conductor needs no insulator patch and no jumper.

### 5.4 Edge lane escapes and staggered clip field

What it does: every sense escape runs an outer edge lane to a nine pad terminal field at the top, crossing nothing.

Construction: `ROUTE` dict of explicit polylines per net (`GEN` lines 143 to 155), each emitted with `wire(pts, 1.6)`. Side slots x for each net (`slots`, line 47) and four fan lanes y 136.0, 138.6, 141.2, 143.8 (line 54). Rule in the comment (lines 141 to 142): within each side the trace that travels farthest takes the lowest lane, so no riser crosses an occupied horizontal. COM and its second tap (named GND in the route table, net COM) drop straight from the bus.

Terminals (lines 159 to 167): nine `rr` pads 10 x 10, r 1.2, x = 7 + 12 i; odd i on row 1 (y 159), even i on row 2 (y 146); order SA P3 P1 COM COM P2 P4 SC SB. An assert checks every route ends inside its pad. Adjacent jaws sit `2 * 12 - 10` = 14 mm apart (computed; gate line 250 to 252).

Lessons (`F/lessons/sensor-surfaces.md`, "Terminal fields"): a single row on 12 mm pitch cannot be clipped; when the count will not fit the width, split into two fields on opposite edges (VERNIER does).

### 5.5 Material stack

| layer | file | material | geometry (`GEN` lines 255 to 266) |
|---|---|---|---|
| backer | `07_backer.svg` | 2 mm chipboard or 1/16 in ply | the shared RIM only |
| guide sticker | `08_overlay_guide.svg` | print then cut sticker paper | nets at 30 percent pink, Velostat at 30 percent gold, brand ink and pink, ticks, dashed windows and slot, dashed spacers and wiper, labels (lines 343 to 362) |
| base copper | `01_copper_base.svg` | adhesive copper foil | all nets plus ticks |
| lower spacer | `03_spacer_lower.svg` | 0.3 mm cardstock | box around all four zones grown 1.0, minus four windows inset 3.0 |
| Velostat | `02_velostat.svg` | Velostat or Linqstat 4 mil | four squares inset 2.0 per zone, plus the slider strip |
| upper spacer | `04_spacer_upper.svg` | 0.3 mm cardstock | slider frame with the slot |
| wiper | `05_copper_wiper.svg` | adhesive copper | the wiper strip with its tail |
| key caps | `06_foam_caps.svg` | 2 mm EVA | four squares inset 4.0 |

Every layer reports the same document size, 110 x 174 mm (computed, the last gate), so sizing one layer in Design Space registers all.

Cut settings (README): foil fine point, vinyl plus pressure, StandardGrip, foil up; Velostat fine point, vinyl, on a fresh mat (the README; the StrongGrip, taped frame or cardstock carrier advice is from `F/lessons/sensor-surfaces.md` line 165); cardstock two passes if windows tear; EVA deep cut, foam, multi pass; chipboard knife on StrongGrip; sticker paper print then cut, calibrated first.

Assembly order (README): backer, guide, copper (burnish), lower spacer, Velostat (four squares taped at the edges so they tent; strip in full contact), upper spacer, wiper with its tail folded onto SLD W, caps.

### 5.6 Brand art as a switch

What it does: the mark and wordmark live on the printed guide by default; `KEYWAY_BRAND=1` puts them in the foil for a photo board.

Construction (`GEN` lines 169 to 192): logo paths scaled to 24 mm, flipped y, placed at (16.8, 5.5); `hack` and `.build` in Plex Mono 700 cap 9.0. `BRAND_K` (arc plus `hack`) and `BRAND_PK` (wrench plus `.build`) are kept for the guide. Five slider tick islands sit in the copper either way (`box` 1.8 wide, 3.0 or 2.0 tall at y 56).

Numbers (README, gate output): brand off 6976 mm2 copper; brand on 7533 mm2, +557 mm2, 7.4 percent, 13 islands, 9.73 mm from the nearest net. Gates: art islands at least 0.70 apart (computed 15.17 with brand off), every counter survives a 0.3 erode.

### 5.7 Read circuit and firmware

| item | value | source |
|---|---|---|
| zone circuit | COM to 3V3; each zone to an ADC and 10 kohm to GND | README "Wiring the force build" |
| velocity | onset threshold, then the maximum rise per ms over the first 10 to 30 ms is velocity, mapped 1 to 127 by one scale factor | README |
| aftertouch | after the slope stalls, send level as channel pressure or CC | README |
| calibration | log a resting zero per zone at boot (Velostat drifts with humidity) | README |
| slider | drive SA high, SB low, read SC (position); then SA and SB both high, read SC (pressure) | README |
| pins | 5 ADC, 2 GPIO, one rail, one GND; four 10 kohm resistors | `SIM` lines 336 to 344 |
| controllers | Teensy 4.x best; ESP32 and S3 on ADC1 only; Uno R4; 328 or 32u4 at exactly six ADC; RP2040 has three ADC so needs a mux | README |
| sample rate | about 1 kHz per zone for velocity | README |
| capacitive build | skip layers 2 to 6, COM to GND, P1 to P4, SA, SB to touch channels, position = (A-B)/(A+B) | README |

### 5.8 Constructions the first pass left out

**Escape slot ordering rule (`GEN` docstring lines 16 to 19, `slots` line 47, `h_sa`/`h_sb`/`h_sc` line 51).** Two rules work together. Side slots: within each edge, a LOWER entrant takes the OUTER slot, or its riser would cut a higher trace's horizontal. Left edge: SA enters at y 35.0 and takes x 2.6 (outermost), P3 enters at y 64.0 and takes x 5.45, P1 enters at y 130.0 and takes x 8.3. Right edge, mirrored: SB y 37.0 at x 107.4, SC y 47.0 at x 104.55, P4 y 64.0 at x 101.7, P2 y 130.0 at x 98.85. Fan lanes: the trace travelling farthest takes the lowest lane (P1 and P2 on 136.0, P3 and P4 on 138.6, SA and SC on 141.2, SB on 143.8). Terminal order SA P3 P1 COM COM P2 P4 SC SB is then monotone with the arrival order along the fan, which is what removes every crossing. The `assert` at line 167 ties each route's last point to its pad centre x and pad height.

| net | entry y | slot x | lane y | terminal x, row | source |
|---|---|---|---|---|---|
| SA | 35.0 | 2.6 | 141.2 | 7, row 2 | `GEN` lines 146 to 147 |
| P3 | 64.0 | 5.45 | 138.6 | 19, row 1 | line 145 |
| P1 | 130.0 | 8.3 | 136.0 | 31, row 2 | line 144 |
| COM | bus at x 50 | none | 136.0 | 43, row 1 | line 148 |
| COM (GND tap) | bus at x 57 | none | 138.6 | 55, row 2 | line 149 |
| P2 | 130.0 | 98.85 | 136.0 | 67, row 1 | line 150 |
| P4 | 64.0 | 101.7 | 138.6 | 79, row 2 | line 151 |
| SC | 47.0 | 104.55 | 141.2 | 91, row 1 | line 152 |
| SB | 37.0 | 107.4 | 143.8 | 103, row 2 | lines 153 to 154 |

**Guide sticker art pipeline (`GEN` lines 342 to 362).** The print then cut layer is the only full colour layer and it is built from the same geometry as the copper: cream outline fill (`bg=CR`), Velostat at gold `#d9b45a` 30 percent, all nets at pink 30 percent, `BRAND_K` in ink and `BRAND_PK` in pink, the five ticks in ink, spacer windows and the slot as 0.25 dashed ink outlines, spacers and wiper as 0.3 dashed pink outlines, then text. Text is outlined with `svgpath.text_geom` (Plex Mono 600 by default): terminal labels at cap 2.2, placed 1.4 above a row 1 pad or 3.2 below a row 2 pad; zone numerals 1 to 4 at cap 7.0 in 700 weight at each zone centre minus 3.5; the title line `KEYWAY  REV A  .  4 FORCE ZONES + GRADED SLIDER` at cap 2.2, y 31.4; the tagline `make things. break things. repeat.` at cap 2.0, y 1.9, 400 weight. All type is geometry, so the sticker file has no font dependency.

**Note on and note off (README "Wiring the force build").** Onset is a small threshold crossing; note off is the reading falling back under the onset threshold with a few milliseconds of hysteresis. The viewer models onset and velocity but not note off.

**Slider pressure pass (README "Reading the slider").** Position pass: SA high, SB low, read SC; the wiper spans 81 to 18 percent of the divider, so a reading near neither rail with no press is an open wiper, which is the touch detect. Pressure pass: SA and SB both high, read SC; the two wedges act as one electrode and SC reads contact resistance.

**Viewer layer stack constants (`SIM` lines 132 to 140).** Per layer z and opacity: backer 0 and 1, guide 0.35 and 1, base copper 0.5 and 1, lower spacer 0.62 and 0.95, Velostat 0.75 and 0.9, upper spacer 0.85 and 0.95, wiper 0.95 and 1, caps 1.1 and 0.75. The copper layer draws nets plus ticks plus the two brand parts with class `brand`; `body.nobrand .brand{display:none}` (line 63) hides them in both the stack and the Sense SVG, which is why the brand toggle is global.

**Sense view feedback (`SIM` lines 220 to 297).** The active zone's highlight rect takes `fill-opacity = force * 0.5` each frame; the slider highlight goes to 0.18 while held and a 1.2 wide pink cursor line marks the wiper x. In capacitive mode the resistance row is relabelled "delta capacitance" and shows `ADC - 30` counts. The trace canvas is 600 x 240 internal pixels with three faint gridlines and the label `ADC 0-1023 / 900 ms`. The wiring table rows come from `G.terminals` sorted by `idx` with role text from the `FN` map (lines 309 to 323), so the table cannot drift from the generator's terminal order.

---

## 6. UX anatomy and what makes it excellent

| element | content |
|---|---|
| header | ink bar, pink rule, verbatim mark, KEYWAY title, tag "rev A, 2x2 force pad + graded slider, make things. break things. repeat." |
| Layer stack tab | the CSS 3D stack (section 4.3); View pane: lift slider, ISO TOP EDGE COLLAPSE, BRAND IN COPPER with a live copper area note; Layers pane in build order with material, click to hide |
| Sense model tab | the copper drawn as SVG with the Velostat over it and transparent hit rects per zone and the slider; mode switch Velostat force or Bare capacitive with an explanation; attack time slider 2 to 80 ms; readout zone, sensor resistance or delta capacitance, ADC 10 bit, peak slope, MIDI velocity (large marker type), aftertouch, a 900 ms ADC trace on a dark canvas; Slider pane: wiper volts and counts, position percent, CC, a note naming the local wedge thicknesses |
| Wiring tab | terminal table generated from `G.terminals` (number, pad, net, row pill, force role, capacitive role); controller pane; generator numbers pane ("Every figure here is measured from the emitted geometry") |

The force model (`SIM` lines 214 to 218, 273 to 297):

```
R(f) = open if f < 0.02 else 2000 + 420000 * exp(-6.2 f)      f = normalised force 0..1
ADC10 = 1023 * 10k / (10k + R)
cap mode: ADC = 30 + 250 * (1 - exp(-3.2 f))
press: force = target * dt / attack until dt >= attack; target from pointer height in the zone,
       clamped 0.12 to 1 on pointerdown and 0.05 to 1 on pointermove (SIM lines 246, 251)
release: force *= 0.82 per frame
velocity = clamp(round(peak slope counts/ms * 11), 0, 127); cap mode multiplier 26
aftertouch = round(force * 127)
slider: ratio = span[0] + (span[1]-span[0]) * t; V = 3.3 * ratio; CC = round(t * 127)
```

All curve constants are plausible, not measured; the README says so for the force curve, the viewer note does not.

What makes it excellent: the viewer draws every layer from the emitted path strings, so the picture is the cut file; the mode switch shows the force versus capacitive tradeoff on the same copper; the stats pane reads only generator output; the knockout and brand behaviour are honest (a hole is a hole, decoration is a switch with its cost printed); and the generator refuses to write anything until 45 gates pass. The design itself is a single layer with zero jumpers for eight nets, two sensor kinds and a top conductor.

---

## 7. Known limits and failure lessons

1. Font and logo inputs are not in the bench folder (`GEN` lines 34 to 37 point at local woff2 and `/mnt/skills/...`); the rerun needed `inputs/`. M05 parity needs them vendored.
2. The document size gate (`GEN` lines 382 to 383) runs after every file is written and after the refusal check, so it can never block emission. It passes today (computed).
3. With the default 12 ms attack the viewer can report velocity 0 on a full press (measured); attack shorter than one frame defeats the slope sampler. A port should integrate the ramp analytically or sample at a fixed step.
4. The brand note in the viewer says "Generate it with KEYWAY_BRAND=0" for the off state (`SIM` line 180), which is the default and needs no flag.
5. No hook object: the viewer exposes nothing for a harness; the drive had to use real pointer input.
6. Fonts load from Google Fonts at run time; offline the marker title falls back.
7. Cell or skin effects: the capacitive build has no ground guard; spacing buys margin (`F/lessons/sensor-surfaces.md`).

---

## 8. Tests and harness

| harness | what | result |
|---|---|---|
| in-generator gates | 45 gates (single island x8, netlist audit 20/20, clearance >= 0.70, outline keepout 1.0, erode 1.10 x9, art gaps, counters, wedge width, slider monotone, stagger, film and spacer x12, slider film, wiper stray and landing, slot, film keepout, spacers one piece, document size) | 45 of 45 (computed) |
| rerun | `fab-knowledge:evidence/x/benches-conductive-b/gen/keyway/` | params and stats equal to the shipped JSON; path strings differ at isolated vertices under 0.1 mm (computed, different GEOS build; `fab-knowledge:sources/benches/benches-conductive-b.md` line 29) |
| viewer jsdom | `fab-knowledge:evidence/x/benches-conductive-b/simcheck.cjs` | KEYWAY builds its tabs (computed 2026-10-04) |
| viewer drive | this record's shots | zero page errors (measured) |

---

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (comb, wedge pair, wiper trick, route dict, gates, layer emit with shared outline), `geom` (rr, wire, smooth, outer_only; CrossSection offsets replace shapely buffer), `circuit` (divider sense model, slope velocity, capacitive alternative), `profile` (Velostat 4 mil, cardstock 0.3, EVA 2, chipboard 2, cut settings), `ui-core` (CSS 3D stack viewer, direct manipulation rules) |
| feature kinds | `conductor`, `pad` (clip terminal), `window` (spacer windows and slot), `lamination` (the sheet stack; lacks layer roles and registration by shared outline) |
| canon ids | `force-comb` (proven, KEYWAY provenance, CANONS.md line 579); `graded-slider-wiper` (proven, line 583); `wedge-pair-slider` (proven, line 581) |
| canon MISSING | staggered two row clip field with 14 mm adjacent jaw rule; COM bus with knockout label; cut-sheet stack declaration with layer roles (copper, film, spacer, wiper, caps, guide, backer) and cross-layer gates (film bridges only its zone, wiper stray contact, slot over film); brand-in-copper switch with floating copper report |
| reference ids | `sensors/force-comb` (INDEX, KEYWAY), `surfaces/keyway-pad` (INDEX, KEYWAY); `sensors/graded-slider` named in CANONS.md line 583 and absent from INDEX |
| reference MISSING | clip field, cut-sheet stack, wiper trick as its own fixture |
| milestone | M05 (KEYWAY 45 gates at 1.00 mm, MILESTONES.md line 62), M06 (canon), M10 (KEYWAY renders from chase, MILESTONES.md line 67) |
| lineage row | MISSING (`lineage.json` has three rows, none for this family) |

Drive script steps for the shots (puppeteer-core, real mouse): load, wait 6 s; shot; drag the stage 160 px left and 40 px down; set lift 100; shot; TOP cam, lift 0, BRAND IN COPPER; shot; Sense tab; attack 60 ms; mouse down at the upper middle of PAD 1, wait 700 ms; shot; release; scroll the slider into view; mouse down at 30 percent, move to 62 percent; shot; Wiring tab; shot.
