# SPLINE: how it is made

Record written 2026-10-05 from the original code. Slug `spline` (the copper arc board of the KEYWAY family; a WebGL shader tool in Downloads shares the name and is a different project, see section 1). Family KEYWAY (chat `cricut-midi-seven`), fourth board. Shared skeleton, `svgpath.py` and viewer shell: `fab-knowledge:originals/keyway/RECORD.md` section 4.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Computed" means the rerun of 2026-10-04, `fab-knowledge:originals/spline/files/rerun/run-2026-10-04.txt`. "Measured" means the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code.

Short paths: `F` is `fab-knowledge:originals/spline/files/`. `GEN` is `F/gen_spline.py`. `SIM` is `F/spline_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | SPLINE rev A: 12 radial blade keys, 1 arc slider, 2 straight sliders, 18 finger rail |
| owner's slug | spline |
| canonical file | `GEN`, sha256 62491f4eec5699880bcc1b1d1529b936ec5e31e1c24788880898d9b7cc4bc3d6 |
| viewer | `SIM`, sha256 4d56aab9227242c641e79045e7c47b2dee6f6deab8a2c0401152a496fb359101, 186604 bytes |
| date | 2026-08-10, between QUADRANT (19:11) and TESSERA (19:40) by build order (inferred; no Downloads zip carries SPLINE) |
| size | 242 x 146 mm, r 3.2 (`GEN` line 40) |
| nets | 18: K1 to K12, AR_A, AR_B, L1_A, L1_B, L2_A, L2_B (`GEN` line 58) |
| gates | 85, all pass (computed) |

One shipped revision, harvest only (`fab-work-directory:benches/cricut-midi-seven/outputs/spline/`). Name collision: `~/Downloads/spline (5).html` and siblings are "SPLINE, generative shader engine" (WebGL, 2026-06-11 to 07-03), unrelated, not copied.

Why this revision: the only one; the generator is sound (85 of 85 at 1.000 mm, computed). The owner judged the blades unplayable ("dumb", plan record) and TESSERA replaced them, so SPLINE is kept as the record of two routing techniques (radial stub, concentric detour) and as a counterexample for blade keys. Its viewer has a defect (section 7).

`files/`: generator, `svgpath.py`, README, geometry JSON, viewer, `layers/`, `inputs/`, `rerun/`.

---

## 2. What it makes and for whom

QUADRANT grown to 18 capacitive channels on one row of contacts: 12 thin annular blades fanned around a hub like spline teeth (194 mm2 each, about twice a fingertip, computed), a 60 deg arc slider nested outside them, two 42 mm vertical sliders on the flanks. Two MPR121 at 0x5A and 0x5B, 18 of 24 used.

---

## 3. Shots

Headless drive 2026-10-05. The page throws `TypeError: Cannot read properties of undefined (reading '0')` on load (measured) and never builds its tab bar, so the shots show no tab row. For the Sense model and Wiring shots the driver unhid those sections directly; the shipped page cannot reach them. Sense SVG capped at 690 px tall. Files in `fab-knowledge:originals/spline/shots/`.

| file | caption |
|---|---|
| `s01-stack-iso-default.png` | Layer stack at load; no tab row under the header (the bug). Wide landscape board with the blade fan, arc, flank sliders and the 18 finger rail. |
| `s02-stack-exploded-orbited.png` | Exploded and orbited. |
| `s03-top-collapsed.png` | Top, collapsed: blade numerals, arc and flank graduations. |
| `s04-sense-k6-touched.png` | Sense model (unhidden by the driver), blade K6 held: TOUCHED. |
| `s05-sense-slider-ar.png` | Arc slider dragged: A/(A+B) 0.347, 74.8 deg of a 68 mm sweep, CC 29 (measured). The copper shows the radial stubs dropping inside the hub void and both arc ends stepping out to the r 88 detour. |
| `s06-wiring.png` | Wiring (unhidden): rail table; the "From the generator" pane is empty because the script stopped before filling it. |

---

## 4. Shared kernel (brief)

`P` lines 38 to 57; helpers lines 63 to 75; `pol` and `annulus` (`n = max(10, |a1-a0|/1.5)`) lines 77 to 87; outline lines 89 to 91; union and smooth(0.4) lines 205 to 206; gates lines 223 to 305; refusal line 309; emit lines 313 to 403.

---

## 5. Mechanisms, circuits and constructions

### 5.1 Radial blade keys with radial stub escape

Construction (lines 97 to 113): hub (121, 62); 12 blades over 30 to 150 deg, `step = 120/12` = 10 deg, width `step - 2.4` = 7.6 deg, each starting `key_gap_a / 2` = 1.2 deg into its step; each `annulus(26, 60, lo, hi)` rounded by `buffer(-1.0).buffer(1.0)`; net `K(12 - i)` so labels read left to right. Escape: a radial stub from r 30 to r 24 along the blade's own mid angle (`key_tap = (30.0, 24.0)`), ending inside the hub void, then the fan drop.

Lesson (README lines 37 to 42, and the `key_tap` comment at `GEN` line 44): a vertical drop from an angled blade's inner edge cuts its left neighbour; the clearance gate reported 0.000 mm. The module docstring (lines 19 to 20) still describes the old route, "Each blade drops straight out of its own inner edge through the hub void", which is the version that failed. Leaving along the blade's own angle into the void, where radius only shrinks on the way down, clears everything.

Gates: `annulus(r0+2, r1-2, a0+1.2, a1-1.2)` inside the net; smallest blade over 120 mm2 (computed 194, "a fingertip is about 100") (lines 243 to 247).

### 5.2 Arc slider with concentric detour escapes

Construction (lines 115 to 134): arc r 64 to 76; A spans 60 to 125 deg (`arc_a[1] + arc_off 5`), B spans 55 to 120; `hmax_a = 12 - 1.4 - 2.4`; A hugs r_in and thickens with angle, B hugs r_out and thins (same polar wedge as QUADRANT). Escapes: from the electrode's mid radius at `a_end` (A at 124, B at 56) step radially out to r 88, run angularly along r 88 to the exit angle (A to 152, B to 28) in `max(6, |da|/2)` steps, then join the fan.

Lesson: an arc outside the fan is trapped behind the blades; the detour reads as part of the artwork in place of a jumper. The two electrode ends need a 5 deg offset so each escape clears the other electrode; at 2 deg the gate caught 0.485 mm (README).

Gates (lines 249 to 261): 41 slices, ratio monotone, span inside 0.10 to 0.90 (computed 0.235 to 0.727), sweep between 40 and 100 mm (computed 68).

### 5.3 Vertical straight wedge sliders with corridor escape

Construction (lines 136 to 155): x (10, 24) and (218, 232), y 66 to 108; `hmax_l = (14 - 1.4) - 2.4`; A is thick at the bottom (`yA` 66 to 105), B thick at the top (`yB` 69 to 108) with `lin_off 3`. A escapes downward from its thick end; B steps sideways along `ly1 - 1.2` to a corridor at x 6 (left) or 236 (right).

Gates (lines 263 to 277): 41 horizontal slices, ratio monotone bottom to top, span inside 0.10 to 0.90 (computed 0.887 to 0.113), travel between 30 and 60 mm (42).

### 5.4 Single-row 18 finger rail and greedy fan

Same construction as QUADRANT with 18 fingers 9 wide on a 13 pitch, depths 16 and 11, lanes y 43 down to 22 on 3.0 (lines 157 to 189); the greedy two-condition lane assignment (lines 163 to 180). Computed: 6 of 8 lanes used. Gates: 18 channels, one row at pitch at least 12.5, finger gap at least 3.5, depth difference at least 4, alternation, monotone fan, lanes fit (lines 279 to 291).

### 5.5 Faceplate and accents

As QUADRANT: `VINYL = outer_only(smooth(OUTLINE.buffer(-2) - RAILZONE, 0.8))`, overhang 1.4 over blades, the arc and both straight sliders; accents per blade inset 1.6 radially and 0.5 deg, rounded 0.8; arc and straight slider faces (lines 208 to 221, 293 to 305).

### 5.6 Read model

As VERNIER plus: arc position from `atan2` about the hub clamped to `sl.a[0] + 2` = 62 deg through `sl.b[1] - 2` = 118 deg, the same window the generator's monotone gate samples (`GEN` line 251); straight sliders from y clamped to `y0 + 3` through `y1 - 3`, `t = 1 - (y - LO)/(HI - LO)` (`SIM` lines 196 to 214). Each slider interpolates between its own `sl.span` (line 197), which fixes the QUADRANT viewer's use of S1's span for every arc.

### 5.7 Constructions the first pass left out

**Rail order (measured from s06, consistent with `GEN` line 158).** Sorting by arrival x gives SL1 B, SL1 A, ARC A, KEY 1 to KEY 12, ARC B, SL2 A, SL2 B. The left straight slider's B net arrives first because its corridor sits at x 6.0, outboard of its A escape at x `10 + 10.2/2` = 15.1 (computed); the right slider mirrors this with B's corridor at x 236. The rail starts at `x0 = 121 - 17 * 13 / 2` = 10.5 and ends at 231.5 (computed). The fan uses 6 of its 8 lanes (computed, `lanes_used` in the shipped JSON).

**Faceplate and guide art (`GEN` lines 350 to 385).** Blade numerals at cap 4.2, Plex Mono 700, on each blade's mid angle at radius `r1 - 6` = 54; `ARC` at cap 2.4 at 129 deg on the arc's mid radius; nine radial ticks on the arc from `r_in + 0.4` to `r_in + 2.4`, 0.7 wide, across the 62 to 118 deg window; straight slider labels `SL1`, `SL2` at cap 2.4 above each slider (`y1 + 2.4`) and nine 1.8 x 0.7 ticks outboard of each slider's left edge (`lx0 - 2.6` to `lx0 - 0.8`); title lines at (200, 136) and (200, 131.4); `18 CONTACTS IN ONE ROW . NO VELOSTAT . NO COMPONENTS` at (121, 51) and the tagline at (121, 46), both inside the hub void above the fan lanes. Rail labels at cap 2.0 on the guide only. Brand: mark 13 mm at (6, 124), wordmark cap 5.2 from x 21; `SPLINE_BRAND=1` moves it into copper.

**Viewer hit geometry (`SIM` lines 173 to 186, 217 to 236).** Blade hit areas are the true annular electrodes, slider hit areas come from `G.slider_paths`; the arc cursor is radial from `r_in` to `r_out`, the straight cursor horizontal across the slider width. The blade readout quotes the plate area from `G.stats.blade_area` (194 mm2), which ties the "about two fingertips" sizing argument to the generator.

---

## 6. UX anatomy

KEYWAY family shell; hit paths from `G.electrodes` and `G.slider_paths`; radial cursor on the arc, horizontal cursor on straight sliders. In the shipped file only the Layer stack tab is reachable (section 7).

## 7. Known limits and failure lessons

1. Viewer bug: the stats block evaluates `S.span[0]` (`SIM` line 273) and SPLINE's stats carry no `span` key, so the script throws before `const TABS` and the tab bar is never built; Sense model and Wiring are unreachable (measured 2026-10-05; first found by jsdom 2026-10-04).
2. Blade keys were judged unplayable: narrow at the inner end (gaps about 1.1 mm at the inner radius per README), hard to hit; TESSERA replaced them.
3. Viewer copy drift: the wiring note says "Twelve channels is the whole point of the layout", copied from VERNIER.
4. Radial stub and 5 deg arc offset are both lessons the clearance gate forced (sections 5.1, 5.2).
5. Font and logo inputs absent from the bench folder.
6. Straight slider readout is inverted (inferred from `SIM` lines 204 to 206; no shot drives it): `t` is 1 at the bottom of the travel, and the label prints `t * 100` as "% from the bottom", so a finger at the bottom reads "100 % from the bottom".
7. The straight slider graduations (`GEN` lines 364 to 366) span `y0 + 2` to `y1 - 2` while the viewer reads `y0 + 3` to `y1 - 3`, so the printed zone ticks and the viewer's 8 zones disagree by up to 1 mm at the ends (computed).

## 8. Tests and harness

85 in-generator gates, 85 of 85 (computed), worst 1.000 mm at L1_A/L1_B. jsdom 2026-10-04 and the 2026-10-05 drive both record the load error.

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (blade keys, radial stub, concentric detour, polar and straight wedges, rail, greedy fan), `geom`, `circuit` |
| feature kinds | `conductor`, `pad`, `window`, `lamination` |
| canon ids | `arc-slider` (proven, SPLINE in provenance, CANONS.md line 582); `wedge-pair-slider` (line 581; SPLINE not in its provenance); `capacitive-plate` (line 580; SPLINE not in its provenance) |
| canon MISSING | radial blade key with radial stub escape (a counterexample entry); concentric detour escape for an arc outside a fan; single-row alternating-depth rail; greedy lane fan |
| reference ids | none in INDEX; MISSING |
| milestone | M05 (85 gates in the seven generator parity row, MILESTONES.md line 62) |
| lineage row | MISSING |
