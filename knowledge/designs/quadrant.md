# QUADRANT: how it is made

Record written 2026-10-05 from the original code. Slug `quadrant`. Family KEYWAY (chat `cricut-midi-seven`), third board: VERNIER's radial sibling and the first with every contact in one row at one edge. Shared skeleton, `svgpath.py` and viewer shell: `fab-knowledge:originals/keyway/RECORD.md` section 4.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Computed" means the rerun of 2026-10-04, `fab-knowledge:originals/quadrant/files/rerun/run-2026-10-04.txt`. "Measured" means the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code.

Short paths: `F` is `fab-knowledge:originals/quadrant/files/`. `GEN` is `F/gen_quadrant.py`. `SIM` is `F/quadrant_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | QUADRANT rev A: 6 annular sector pads, 3 concentric arc sliders, 12 finger rail |
| owner's slug | quadrant |
| canonical file | `GEN`, sha256 a6783b385d6c2e44732a072c9e9f31dd9e8aa65a2d6721ac75ddabff2efd5fcd |
| viewer | `SIM`, sha256 f83a697054d762647c85609029583eaf9f53d0d93064a31842eb46b7791f239a, 186729 bytes |
| date | 2026-08-10 19:11 (zip stamp of `~/Downloads/files (50).zip`, identical member for member) |
| size | 190 x 134 mm, r 3.2 (`GEN` line 37) |
| nets | 12: B1 to B6, S1A to S3B (`GEN` line 55) |
| gates | 59, all pass (computed) |

One shipped revision (harvest `fab-work-directory:benches/cricut-midi-seven/outputs/quadrant/` and `files (50).zip`). Inside the chat the hub void ran at 14 mm and failed clearance (README); that state was not saved. This revision passes 59 of 59 at 1.203 mm worst clearance (computed) and its viewer builds all tabs with zero page errors (measured).

`files/`: generator, `svgpath.py`, README, geometry JSON, viewer, `layers/` (guide, copper, faceplate SVG and PNG; vinyl, accents, backer SVG), `inputs/`, `rerun/`.

---

## 2. What it makes and for whom

The same 12 capacitive channels and materials as VERNIER laid out as a fan console: six keystone sector buttons around a hub at the bottom edge, three concentric arcs swept by a thumb, and all twelve clip contacts in a single row along the bottom, which the owner asked for. One MPR121 or 12 ESP32-S3 touch pins.

---

## 3. Shots

Headless drive 2026-10-05, zero page errors (measured). Sense model shots: the driver capped the sense SVG at 690 px tall to fit one frame. Files in `fab-knowledge:originals/quadrant/shots/`.

| file | caption |
|---|---|
| `q01-stack-iso-default.png` | Layer stack at load: landscape fan console, six sheets. |
| `q02-stack-exploded-orbited.png` | Exploded and orbited: the rail stays bare on every layer above the copper. |
| `q03-top-collapsed.png` | Top, collapsed: sector numerals, arc graduations, accent tiles. |
| `q04-sense-b3-touched.png` | Sector B3 held: single electrode, baseline 180, delta +59, TOUCHED (read from the shot; +59 is `round(0.80 * 74)`, the fifth frame of the 0.16 per frame touch ramp, so the capture came before full delta +74, computed). |
| `q05-sense-slider-s3.png` | Outer arc S3 dragged: cursor along the radius, A/(A+B) 0.282, 43.9 deg of sweep (17 percent), CC 22, zone 2 (measured); the copper view shows the six lane fan under the hub and the 12 finger rail with alternating depth. |
| `q06-wiring.png` | Wiring tab: the rail table, controllers, generator numbers. |

---

## 4. Shared kernel (brief)

`P` lines 35 to 54; `rr`, `wire`, `smooth(0.4)`, `outer_only` lines 60 to 72; polar helpers `pol(r, a)` (lines 74 to 76) and `annulus(r_in, r_out, a0, a1, n)` with `n = max(12, |a1-a0|/1.5)` and radii that may be callables of angle (lines 78 to 85); outline lines 87 to 89; union and smooth lines 188 to 189; gates lines 208 to 275; refusal line 279; emit lines 283 to 370.

---

## 5. Mechanisms, circuits and constructions

### 5.1 Annular sector keys

Construction (lines 96 to 112): fan 18 to 160 deg, gap 3.2 deg; `step = (160 - 18 + 3.2)/6`, sector width `step - 3.2`; each `annulus(20, 42, lo, hi)`, then rounded by `buffer(-1.6).buffer(1.6)`. Labels run left to right while angle runs right to left, so net = `B(6 - i)`. Each sector taps at `pol(20.9, mid)`, its inner edge, and drops through the hub void.

Gate: `annulus(r0 + 2.5, r1 - 2.5, a0 + 3, a1 - 3)` inside the net (solid copper, lines 230 to 232).

Lesson: the hub void radius is a routing dimension. The fan lanes run through it; at 14 mm inner radius the lanes shaved the sectors and the clearance gate failed; 20 mm clears (README).

### 5.2 Arc wedge sliders (polar wedge pair)

Construction (lines 114 to 129): hub (95, 34); arcs at inner radius 48, 64, 80, band 12; `hmax = 12 - 1.4 - 2.0`; A spans 18 to 166 deg with `hA(a)` rising linearly from 2.0 to hmax and hugs the inner radius (`annulus(r_in, r_in + hA(a))`); B spans 14 to 162 with `hB(a)` falling and hugs the outer radius (`annulus(r_out - hB(a), r_out)`). The 4 deg end offsets let each thick end reach past the other's tip. A escapes at 165 deg from `r_in + hmax/2`, B at 15 deg from `r_out - hmax/2`; each arc's A passes the left end of every smaller arc, its B the right end, and both drop through empty space.

Gates per arc (lines 234 to 249): 41 angular slices of 1 deg, ratio monotone; span inside 0.10 to 0.90; both wedges over 200 mm2. Sweep of the inner arc over 100 mm (lines 250 to 251). Computed: spans 0.180 to 0.779, 0.185 to 0.784, 0.188 to 0.787; inner arc sweep 132 mm.

Firmware note (README): arcs report an angle; scale each arc's CC by its radius if the three should feel matched.

### 5.3 Single-row alternating-depth clip rail

What it does: twelve contacts in one row at one edge that full-size clips can still grab, by staggering finger depth in place of rows.

Construction (lines 131 to 172): order nets by arrival x (monotone fan, so angular order maps to rail order); finger centres `x0 = 95 - 11 * 14 / 2`, pitch 14; finger `rr` 9 wide from y 2.5, depth 16 (even index) or 11 (odd), r 1.2. Rail order: SL3 A, SL2 A, SL1 A, BTN 1 to BTN 6, SL1 B, SL2 B, SL3 B (README).

Gates (lines 253 to 264): 12 channels; rail one row at pitch at least 13.5; finger gap at least 4.0 (14 - 9 = 5); depth difference at least 4.0 (5); depth alternates; rail order equals arrival order.

Limit (README): with full-size alligator clips, 5 mm of side gap plus 5 mm of depth offset is workable, not roomy; mini clips (about 6 mm jaw) are comfortable; widen `rail_pitch` and the board grows.

### 5.4 Greedy two-condition lane fan

What it does: assigns each net a horizontal lane between its arrival x and its finger x so no vertical crosses a horizontal.

Algorithm (lines 137 to 163), lanes y 37, 34, 31, 28, 25, 22 (farthest first), `MARG = tw + clr = 2.5`:

```
for net in nets by travel |TX - ARRIVE| descending:
  for lane, farthest from the rail first:
    ok = no overlap with spans already on this lane (with MARG)
    for every committed q on another lane:
      q nearer the rail: net's finger drop clears q's span; q's source drop clears net's span
      q farther:         net's source drop clears q's span; q's finger drop clears net's span
    take the first ok lane
  none: SystemExit('no free fan lane for <net>: add a lane')
```

Each net is then one polyline: escape, drop to its lane, run to its finger x, drop into the finger (line 170). Lesson in the code comment (lines 137 to 143): checking only the first condition is how a vertical shaves a horizontal; the source drop crosses lanes farther from the rail, the finger drop lanes nearer.

### 5.5 Faceplate, accents, guide

`RAIL` = each finger box grown 1.0; `RAILZONE` = its bounds from y 0 up to the rail top plus 3.0; `VINYL = outer_only(smooth(OUTLINE.buffer(-2.0) - RAILZONE, 0.8))` (lines 191 to 197). Accents: sector annuli inset 2.6 radially and 1.6 deg, rounded 1.2; arc faces inset 0.6 (lines 199 to 206). Gates: dielectric covers live copper outside `RAILZONE.buffer(4.0)` (under 0.5 mm2), clears every finger, overhangs every sector by 1.6, one piece, accents 1 mm inside, inside the keepout (lines 266 to 275). Arc graduations: nine radial ticks per arc on the faceplate (lines 328 to 334).

### 5.6 Read model

As VERNIER (baseline 180, threshold 28, delta ramp). Arcs: `angOf` takes `atan2` against `G.hub`, clamps to 20 to 160 deg, maps to t, and interpolates the ratio between the span ends (`SIM` lines 196 to 206).

### 5.7 Constructions the first pass left out

**Computed arrival and rail table** (from `GEN` lines 96 to 172; computed on 2026-10-05 with a short script over the declared constants, not from the generator run). Sector step is (160 - 18 + 3.2) / 6 = 24.2 deg and each sector spans 21.0 deg; the tap sits at radius 20.9 on the sector's mid angle. Arc escapes sit at 165 deg (A, radius `r_in + 4.3`) and 15 deg (B, radius `r_out - 4.3`).

| rail # | net | arrival x | finger x | depth |
|---|---|---|---|---|
| 1 | S3A | 13.6 | 18 | deep 16 |
| 2 | S2A | 29.0 | 32 | shallow 11 |
| 3 | S1A | 44.5 | 46 | deep |
| 4 | B1 (mid 149.5 deg) | 77.0 | 60 | shallow |
| 5 | B2 (mid 125.3 deg) | 82.9 | 74 | deep |
| 6 | B3 (mid 101.1 deg) | 91.0 | 88 | shallow |
| 7 | B4 (mid 76.9 deg) | 99.7 | 102 | deep |
| 8 | B5 (mid 52.7 deg) | 107.7 | 116 | shallow |
| 9 | B6 (mid 28.5 deg) | 113.4 | 130 | deep |
| 10 | S1B | 148.8 | 144 | shallow |
| 11 | S2B | 164.3 | 158 | deep |
| 12 | S3B | 179.7 | 172 | shallow |

The six sector taps arrive inside x 77 to 113.4 but their fingers spread over x 60 to 130, so the buttons carry the longest travels (B1 17.0 mm, B6 16.6 mm, computed) and take the lanes farthest from the rail first; the arc escapes arrive within 8 mm of their fingers.

**Printed faceplate and guide art (`GEN` lines 319 to 352).** Sector numerals at cap 7.0, Plex Mono 700, at the sector mid angle and radius `(r0 + r1)/2 - 4.0`; arc labels `SL1` to `SL3` at cap 2.6 at angle `arc_a_span[1] + 5` = 171 deg, radius `r + 4.6`; nine radial ticks per arc, 0.7 wide from `r + 0.4` to `r + 2.4`, on the 8 zone boundaries of the 20 to 160 deg read range; title `QUADRANT REV A` and `12 CHANNELS` at (158, 126) and (158, 121.4); the line `6 SECTORS + 3 ARC SLIDERS . 12 CONTACTS IN ONE ROW` at (95, 33.4) inside the hub void; tagline at (95, 27.0) cap 2.0. Rail labels go to the guide only, 1.6 above each finger top. Brand: mark 13 mm at (4, 106), wordmark cap 5.2 from x 19 at y 113.8 and 106.6. Faceplate: cream face, accents at gold 22 percent, the three arc faces stroked 0.35 ink, brand and text clipped to the face. `QUADRANT_BRAND=1` puts the brand in copper (line 185).

**Viewer hit geometry (`SIM` lines 173 to 186).** Sector hit areas are the true annular electrodes from `G.electrodes`, and arc hit areas are full annuli `G.arcs_path` from 14 to 166 deg, both drawn as transparent `path` elements over pink highlight paths, so the touch target is the copper shape rather than a bounding rect (VERNIER and KEYWAY use rects). The arc cursor is a 1.6 wide radial line from `r_in` to `r_out` at the pointer angle. The vinyl wash is 22 percent (VERNIER 30). The wiring table shows deep or shallow finger per rail position (line 238).

---

## 6. UX anatomy

VERNIER's shell with sector and arc hit paths drawn from `G.electrodes` and `G.arcs_path`, a radial cursor line across the touched arc, angle readout "deg of sweep (percent)" (`SIM` lines 170 to 231). Wiring tab: rail table. The excellence: the fan maps angle to rail order so the whole board routes with six lanes and no crossings, and the viewer shows the hub-void fan in the copper.

## 7. Known limits and failure lessons

1. Hub void at 14 mm failed clearance (section 5.1).
2. Rail clip room is tight with full-size clips (section 5.3).
3. The viewer reads every arc against `G.stats.span`, which is S1's span, so S2 and S3 readouts use S1's ends (`SIM` line 200; spans differ by under 0.01, computed).
4. README says "a 1.6 mm arc gap"; the code uses `sl_gap = 1.4` (`GEN` line 45).
5. Font and logo inputs absent from the bench folder.
6. The slider readout labels the raw polar angle as sweep: "43.9 deg of sweep (17 %)" in q05 is the pointer's `atan2` angle about the hub, while the sweep from the start of travel is 43.9 - 20 = 23.9 deg (computed from `SIM` lines 196 to 202). The percent is right; the degree figure is not a sweep.

## 8. Tests and harness

59 in-generator gates, 59 of 59 (computed), worst 1.203 mm at B3/B4. jsdom check 2026-10-04: tabs build.

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (polar annulus, sector keys, polar wedge pair, single-row rail, greedy lane fan, gates), `geom` (annulus with callable radii), `circuit` (angle slider read) |
| feature kinds | `conductor`, `pad`, `window`, `lamination` |
| canon ids | `arc-slider` (proven, QUADRANT provenance, CANONS.md line 582); `capacitive-plate` (proven, line 580; QUADRANT not listed in its provenance) |
| canon MISSING | single-row alternating-depth clip rail; annular sector key with inner tap; greedy two-condition lane fan; hub void radius as a routing constraint |
| reference ids | `sensors/arc-slider` (INDEX, QUADRANT); `surfaces/quadrant-fan` (README only) |
| milestone | M05 (59 gates, MILESTONES.md line 62), M06 |
| lineage row | MISSING |
