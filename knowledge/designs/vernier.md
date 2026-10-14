# VERNIER: how it is made

Record written 2026-10-05 from the original code. Slug `vernier`. Family KEYWAY (chat `cricut-midi-seven`), second board: KEYWAY's capacitive, craft-store sibling. The shared generator skeleton, `svgpath.py` and the CSS 3D viewer shell are recorded once in `fab-knowledge:originals/keyway/RECORD.md` section 4; this record states them briefly and gives VERNIER's own line numbers.

Number rules for this file. A number in a code table is a declared value copied from the file and line named in that row. "Computed" means the rerun of the shipped generator on 2026-10-04, saved as `fab-knowledge:originals/vernier/files/rerun/run-2026-10-04.txt`. "Measured" means the headless drive of the shipped viewer on 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code with no run behind it.

Short paths: `F` is `fab-knowledge:originals/vernier/files/`. `GEN` is `F/gen_vernier.py`. `SIM` is `F/vernier_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | VERNIER rev A, capacitive control surface: 6 plates, 3 wedge sliders |
| owner's slug | vernier |
| canonical file | `GEN` |
| generator sha256 | ed2f18042496b51573e7d4e9542f6d328e980f3bebc2ea6315b7b76e70366ea7 |
| viewer | `SIM`, sha256 fff6c81cc12b19ac4844abf07ba3182e4f3d0b12ada0e154fbfd461197405e7c, 137299 bytes |
| date | 2026-08-10 18:46 (zip stamp of `~/Downloads/files (48).zip`, identical member for member; `vernier_sim.html` in Downloads equals the harvest copy) |
| process | Cricut: adhesive copper foil or tape, vinyl, print then cut sticker paper, 2 mm chipboard |
| size | 110 x 214 mm, r 3.2 (`GEN` line 40) |
| nets | 12: B1 to B6, S1A S1B, S2A S2B, S3A S3B (`GEN` line 61) |
| gates | 60, all pass (computed) |

Revisions: one shipped revision, in the harvest at `fab-work-directory:benches/cricut-midi-seven/outputs/vernier/` and in `files (48).zip`. The wedge spans changed inside the chat (A 20 to 88 and B 22 to 90 failed; A 18 to 88 and B 22 to 92 shipped; `fab-knowledge:originals/keyway/files/lessons/sensor-surfaces.md`); the failing version was never saved.

Why this revision: the only one, and it is good: 60 of 60 gates at 1.200 mm worst clearance (computed), the viewer builds all three tabs with zero page errors (measured).

`files/`: `gen_vernier.py`, `svgpath.py`, `README.md`, `vernier_geometry.json`, `vernier_sim.html`, `layers/` (`00_guide_under`, `01_copper`, `03_faceplate_print` as SVG and PNG; `02_vinyl_face.svg`, `04_vinyl_accents.svg`, `05_backer.svg`), `inputs/` (logo and three Plex Mono woff2, needed to regenerate), `rerun/run-2026-10-04.txt`.

---

## 2. What it makes and for whom

A self capacitance control surface from three craft-store materials. Six button plates (on or off), three graded sliders read as a ratio (continuous, or 8 zones each), 12 channels: one MPR121, or 12 of an ESP32-S3's 14 touch pins with no driver chip and no resistors. For a maker who wants many controls, a one afternoon build and no Velostat. The README's tradeoff table against KEYWAY: no velocity, no aftertouch, slider position only, three layers to align, 6 pads plus 3 faders plus 24 quantised zones.

---

## 3. Shots

Driven headless 2026-10-05, zero page errors (measured); Google Fonts fetched on load. For the two Sense model shots the driver capped the sense SVG at 690 px tall so the board and the readout fit one 860 px frame; the shipped page draws it full column width and scrolls. Files in `fab-knowledge:originals/vernier/shots/`.

| file | caption |
|---|---|
| `v01-stack-iso-default.png` | Layer stack at load (tilt 58, spin -16, lift 55): backer, placement guide, copper, vinyl faceplate (dark), printed faceplate, pink accent tiles. |
| `v02-stack-exploded-orbited.png` | Dragged and lift 100: the six sheets apart; the vinyl stops short of the two clip fields, which stay bare copper. |
| `v03-top-collapsed.png` | TOP cam, lift 0: the finished face, numerals and graduations from the printed faceplate, accent tiles over plates and bands. |
| `v04-sense-b3-touched.png` | Sense model, BTN 3 held: channel B3 single electrode, baseline 180, delta +71, state TOUCHED (read from the shot; +71 is `round(0.96 * 74)`, the sixth frame of the 0.16 per frame ramp, so the capture landed one frame before full delta +74, computed), "There is nothing in the reading that tells you how hard" (measured). |
| `v05-sense-slider-s1.png` | Slider 1 dragged to 73 percent: A/(A+B) 0.364, 72.9 percent of 64 mm, CC 93, zone 6 of 8 lit (measured). |
| `v06-wiring.png` | Wiring tab: 12 terminals with field and row, what drives it, numbers from the generator. |

---

## 4. Shared kernel (brief)

Same skeleton as KEYWAY: `P` dict (`GEN` lines 38 to 60), `rr`, `wire` (flat caps), `smooth(d=0.4)`, `outer_only` (lines 65 to 77), shared `OUTLINE`, `INNER = OUTLINE.buffer(-1.0)`, `RIM` (lines 79 to 81), per net union then smooth (lines 180 to 181), gates then refusal (lines 208 to 286), `poly_path` simplify 0.012 (lines 290 to 299) and `svg()` (lines 301 to 316) with `RIM` in every cut layer (lines 318 to 324), JSON for the viewer (lines 364 to 380). Two differences from KEYWAY: this `poly_path` drops each ring's repeated closing vertex (`pts[:-1]`, line 297), and `svg()` writes the document size with one decimal (`110.0mm`) and keeps no `LAYERS` table, so VERNIER has no document size gate. `VERNIER_OUT`, `VERNIER_BRAND` (lines 29, 36). Text and logo from `F/svgpath.py`.

---

## 5. Mechanisms, circuits and constructions

### 5.1 Capacitive plates (six buttons)

What it does: each plate is one self capacitance electrode under the vinyl faceplate plus the printed sticker; a fingertip adds a few pF over a tracked baseline (README "How it senses"). The 0.25 mm dielectric figure is from `fab-knowledge:originals/keyway/files/lessons/sensor-surfaces.md` line 54, not the README.

Construction (`GEN` lines 87 to 106): `rr(x0,y0,x1,y1, 2.4)` at columns x (9,35), (42,68), (75,101) and rows lo y (122,148), hi y (153,179); B1, B3, B5 on the hi row, B2, B4, B6 on the lo row.

Gate: plate solidity `NET[k].contains(rr(...).buffer(-0.6))` (lines 232 to 234). Lesson (owner's skill update): test a rounded plate against `pad_rr.buffer(-0.6)`; an inset box pokes its corners outside the rounding and fails a good plate.

### 5.2 Escapes: risers and inter-column lanes

Hi row plates rise straight from the pad centre to `top_band` y 183 (line 100). Lo row plates jog at the inter-row midline `jy = (148 + 153)/2` into a lane at x 38.5, 71.5 or 103.0, then rise (lines 101 to 105); `ex = min(x1 - 1.5, lane)` keeps the jog inside the plate.

### 5.3 Parked-terminal field (top)

What it does: every top terminal sits at exactly the x its trace arrives on, so the top half has no fan and no lane assignment.

Construction (lines 137 to 146): sort the six button nets by arrival x; pad `rr(cx-5, y, cx+5, y+10, 1.2)` with rows alternating y 186 and 199; a short `wire` from `top_band` into the pad. Gate: every top terminal x equals its arrival x to 1e-9 (lines 259 to 260). Same-row jaws 21.5 mm apart (computed).

Rule (lesson file): parking works whenever arrival x values are naturally at least the clip pitch apart; gate it so a later dimension change cannot break it silently.

### 5.4 Wedge-pair sliders (three straight bands)

What it does: A is a trapezoid thick at the left, B its mirror; position is A/(A+B); the pair sum is presence.

Construction (`wedges()`, lines 109 to 119): band (y0, y1); `hs = (y1-y0) - 1.4`; `hmax = hs - 3.1`, `hmin = 3.1`; A = `[(18,y0),(88,y0),(88,y0+hmin),(18,y0+hmax)]`; B = `[(92,y1),(22,y1),(22,y1-hmin),(92,y1-hmax)]`. Bands y (82,100), (60,78), (38,56) for S1, S2, S3.

End overlap rule: A spans 18 to 88 and B 22 to 92, so each thick end reaches past the other's tip far enough for its own escape to clear the opposite net. With A 20 to 88 and B 22 to 90 each escape shaved the opposite wedge at 0.4 mm (lesson file); the shipped spans clear with 2.4 mm to spare (lesson file, declared).

Gates per slider (lines 237 to 254): 41 column samples of width 0.7 mm across the travel, ratio monotone (tolerance 1e-6); span between 0.10 and 0.90; both wedges over 100 mm2. Travel over 60 mm (line 255). Computed: span 0.797 to 0.203 on all three, travel 64.0 mm.

### 5.5 Corridor escapes for stacked bands and the bottom fan

S3 (lowest) drops straight out of its thick ends at x 18.8 and 91.2 (`wedge_a[0] + 0.8`, `wedge_b[1] - 0.8`). S1 and S2 step sideways into corridor lanes x 11 and 15 (left), 99 and 95 (right) that clear every band below (lines 120 to 135).

Bottom field (lines 148 to 162): six slider terminals at x 20, 32, 44, 66, 78, 90, rows y 16 and 3; lanes y 29, 32, 35. Rule: per side, sort by travel; the trace travelling farthest takes the lane farthest from the block (`bot_lanes[sorted(side, key=travel).index(net)]`). Same-row jaws 14.0 mm (computed).

### 5.6 Vinyl dielectric faceplate and printed layers

Construction (lines 183 to 206): `TERMBLK` = a box around each clip field grown `face_win` 1.8; `VINYL = OUTLINE.buffer(-2.0) - TERMBLK.buffer(2.5 - 1.8)`, then `outer_only(smooth(VINYL, 0.8))`; `FACE = VINYL`; accents `rr` inset 3.0 per plate (r 2.0) plus band boxes inset 3.0 in x and 2.0 in y.

Gates (lines 270 to 282): live copper outside `TERMBLK.buffer(4.0)` minus vinyl under 0.5 mm2; vinyl clears every clip pad (under 0.01 mm2); `VINYL.buffer(-1.6)` contains every plate (1.6 mm overhang); vinyl one piece; accents within the vinyl and within `VINYL.buffer(-1.0)`; vinyl inside `INNER`. Vinyl area 17388.8 mm2 (computed).

Layers and stack (README): `05_backer` (chipboard), `00_guide_under` (print then cut, goes under the copper: traces at 32 percent pink, labels, brand in colour), `01_copper`, `02_vinyl_face` (one piece, windows over the clip fields), `03_faceplate_print` (on top of the vinyl: numerals, 9 zone ticks per band, brand), `04_vinyl_accents` (optional second colour). The guide carries the terminal labels because the faceplate has windows there (lines 331 to 334).

### 5.7 No ground guard, on purpose

A hatched guard cannot reach a terminal without crossing a band or an escape on one layer; spacing buys the margin. The README says 6 to 7 mm between plates and 1.2 mm copper to copper; the geometry gives 7.0 mm between columns and 5.0 mm between the two rows (computed from `col_x` and `row_lo`/`row_hi`, `GEN` lines 42 to 43), and 1.200 mm worst clearance (computed); the clean fallback is a separate perimeter ring with its own clip pad (README).

### 5.8 Read model and firmware

| item | value | source |
|---|---|---|
| per channel | track a baseline; compare delta, never an absolute count | README |
| slider | ratio of the pair; ignore the ratio unless the pair sum has risen | README |
| rate | 30 to 60 Hz for buttons and faders | README |
| controllers | ESP32-S3 (12 of 14 touch pins, no parts); MPR121 (exact fit); ESP32 classic (10 pins, add an MPR121 or drop a slider); CAP1188 x2; Teensy, RP2040, AVR use the MPR121 | README |
| viewer model | baseline 180 counts, threshold 28, delta = round(touch * 74), touch +0.16 per frame held and -0.22 per frame released; slider ratio interpolated between the generator's span ends; 8 zone strip | `SIM` lines 170 to 231 |

### 5.9 Constructions the first pass left out

**Computed escape and terminal tables.** Top field (`GEN` lines 139 to 146), sorted by arrival x:

| net | plate row | arrival x | terminal y, row |
|---|---|---|---|
| B1 | hi, riser at plate centre | 22.0 | 186, row 2 |
| B2 | lo, lane `lane_g1` | 38.5 | 199, row 1 |
| B3 | hi | 55.0 | 186, row 2 |
| B4 | lo, lane `lane_g2` | 71.5 | 199, row 1 |
| B5 | hi | 88.0 | 186, row 2 |
| B6 | lo, lane `lane_rm` | 103.0 | 199, row 1 |

Bottom field (lines 151 to 162), travel = |terminal x - arrival x| (computed):

| net | arrival x | terminal x | travel | lane y | row |
|---|---|---|---|---|---|
| S1A | 11.0 (corridor) | 20 | 9.0 | 29 | row 1, y 16 |
| S2A | 15.0 (corridor) | 32 | 17.0 | 32 | row 2, y 3 |
| S3A | 18.8 (thick end) | 44 | 25.2 | 35 | row 1 |
| S3B | 91.2 (thick end) | 66 | 25.2 | 35 | row 2 |
| S2B | 95.0 (corridor) | 78 | 17.0 | 32 | row 1 |
| S1B | 99.0 (corridor) | 90 | 9.0 | 29 | row 2 |

The block sits below the lanes, so the farthest traveller takes y 35, the lane farthest from the block, and the shortest takes y 29. Escapes leave each wedge 1.2 mm inside its thick end (`y0 + 1.2` for A, `y1 - 1.2` for B, lines 129 to 134).

**Printed faceplate and guide art pipeline (`GEN` lines 325 to 362).** Text is outlined geometry from `svgpath.text_geom`, split into two lists: `txf` (faceplate and guide) and `txg` (guide only). Plate numerals 1 to 6 at cap 8.0, Plex Mono 700, at plate centre minus 4.0; slider labels `SL 1` to `SL 3` at cap 2.6, left anchored at x 2.6; nine zone ticks per band, each 0.7 wide from band floor + 0.7 to + 2.5, on the 8 zone boundaries of the 64 mm travel; three title lines at cap 2.2 (`VERNIER REV A` at 80, 116; `12 CH . 6 PADS . 3 SLIDERS` at 78, 111.4; `COPPER + VINYL + PAPER` at 80, 106.8); tagline at cap 2.0, (55, 32.4). Terminal labels go to `txg` only, 1.4 above the pad for the bottom field and for row 1, else 3.4 below (lines 331 to 334), because the faceplate has windows there. The brand sits in `brand_strip` y 104 to 120: mark 14 mm at (10, 104), `hack` and `.build` at cap 5.6 from x 27 at y 112.6 and 104.6 (lines 164 to 178). `03_faceplate_print.svg` layers: the faceplate shape in cream, accent tiles at gold 22 percent, the three band rectangles stroked 0.35 ink, then brand and text each clipped by `.intersection(FACE)` so nothing prints off the vinyl. `00_guide_under.svg`: cream background, nets at pink 32 percent, the vinyl outline dashed pink 0.3, brand, and both text lists.

**Brand switch.** `VERNIER_BRAND=1` adds the mark and wordmark to `art` and so to the copper and the clearance gate (`GEN` lines 36, 176 to 178); off by default, and the shipped set is the off state. The viewer has no brand button (KEYWAY's has one).

**Viewer stack constants (`SIM` lines 108 to 166).** z and opacity per layer: backer 0, guide 0.30, copper 0.45, vinyl 0.60 at 0.92, printed faceplate 0.75, accents 0.90 at 0.8. `translateZ(z * lift * 1.2 + z * 4)` (KEYWAY uses 1.15). Iso cam is [58, -16].

**Viewer touch timing (`SIM` lines 207 to 231).** `touch` rises 0.16 per animation frame while held and falls 0.22 per frame; delta = round(touch * 74); TOUCHED when delta > 28, so the state flips on the third frame after pointerdown (touch 0.48, delta 36) and full delta arrives on the seventh (computed). The slider cursor is clamped to the travel (`wedge_b[0] + 1` to `wedge_a[1] - 1`, line 212); zone index is `min(7, floor(t * 8))`. The readout names the pair (`S1A and S1B`) and explains sum for presence, ratio for position.

---

## 6. UX anatomy

Same shell as KEYWAY (header with the verbatim mark, three tabs, CSS 3D stack with drag orbit, wheel zoom, shift or two finger lift, double click reset, ISO TOP EDGE COLLAPSE, layer list in build order; `SIM` lines 108 to 167). Sense model: copper with the vinyl at 30 percent, transparent hit rects per plate and per band, readout (channel, baseline, delta, state in marker type), slider pane (A/(A+B), position of 64 mm, CC, 8 zone strip) (lines 169 to 231). Wiring: terminal table with field and row, what drives it, stats from the generator (lines 233 to 259). The excellence: three layers explain the whole build, the layer you touch is visible as a sheet, and the slider readout teaches ratio sensing directly.

---

## 7. Known limits and failure lessons

1. Wedge end overlap failure at 0.4 mm before the spans moved (section 5.4).
2. Inset box plate test produced a false failure on rounded plates (section 5.1).
3. No ground guard; crosstalk is handled in threshold and baseline logic (section 5.7).
4. Font and logo inputs absent from the bench folder (same as KEYWAY).
5. No hook object in the viewer.
6. Docstring drift: the module docstring (`GEN` lines 16 to 18) says there is "no fan and no lane assignment anywhere on the board", but the bottom field is a travel-ranked fan (lines 148 to 162); and the `wedges()` docstring (lines 110 to 111) says triangles while the code builds trapezoids with a 3.1 mm thin end.
7. The README's "6 to 7 mm between plates" holds for columns only; rows sit 5.0 mm apart (computed).

## 8. Tests and harness

60 in-generator gates: 12 single island, clearance at 0.90 gate (computed 1.200 at B5/B6), outline keepout 1.0, 12 erode, 6 plate solidity, 3 x (monotone, span, plate area), travel, parked field, 2 x (pitch, same-row jaws), channel count 12, dielectric coverage, vinyl clears pads, 6 overhangs, one piece, accents in, vinyl in keepout, accents 1 mm in. 60 of 60 (computed). The jsdom check of 2026-10-04 builds VERNIER's tabs (`fab-knowledge:evidence/x/benches-conductive-b/simcheck.cjs`).

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (plates, straight wedge pair, parked field, corridor escapes, travel-ranked fan, faceplate rules, gates), `geom`, `circuit` (capacitive delta model, ratio slider with presence by sum, zone quantiser, channel budget), `profile` (vinyl, sticker paper) |
| feature kinds | `conductor`, `pad` (clip), `window` (faceplate windows), `lamination` |
| canon ids | `capacitive-plate` (proven, VERNIER provenance, CANONS.md line 580); `wedge-pair-slider` (proven, line 581) |
| canon MISSING | parked-terminal field; corridor escapes for stacked bands; travel-ranked fan with the block-side rule; dielectric faceplate with window and overhang rules (CHK-NET-09 needs a faceplate mode) |
| reference ids | `sensors/wedge-slider` (INDEX, VERNIER); `sensors/capacitive-plate` (README only); `surfaces/vernier-pad` (README only) |
| milestone | M05 (60 gates in the seven generator parity row, MILESTONES.md line 62), M06 |
| lineage row | MISSING |
