# TESSERA: how it is made

Record written 2026-10-05 from the original code. Slug `tessera` (the copper tile board of the KEYWAY family; a Vue and Nuxt page editor in Downloads shares the name and is a different project). Family KEYWAY (chat `cricut-midi-seven`), fifth board, replacing SPLINE's blades. Shared skeleton, `svgpath.py` and viewer shell: `fab-knowledge:originals/keyway/RECORD.md` section 4.

Number rules for this file. A number in a code table is a declared value from the file and line named. "Computed" means the rerun of 2026-10-04, `fab-knowledge:originals/tessera/files/rerun/run-2026-10-04.txt`. "Measured" means the headless drive of 2026-10-05 (Chrome, puppeteer-core, 1280 x 860). "Inferred" means a reading of the code.

Short paths: `F` is `fab-knowledge:originals/tessera/files/`. `GEN` is `F/gen_tessera.py`. `SIM` is `F/tessera_sim.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | TESSERA rev A: 12 Voronoi tile keys, 1 arc and 2 straight sliders, 18 finger rail |
| owner's slug | tessera |
| canonical file | `GEN`, sha256 9eba22a9b6f862cf9fca24db15ffb4a2c1adec93eb2ce7745cf0957156f68f92 |
| viewer | `SIM`, sha256 22c6a1f285b3ebc69751c5be0e7a25c28140e41eb0f68e3b6588e513cca8320c, 162271 bytes |
| date | 2026-08-10 19:40 (zip stamp of `~/Downloads/files (52).zip`, identical member for member) |
| size | 242 x 176 mm, r 3.2 (`GEN` line 38) |
| nets | 18: T1 to T12, AR_A, AR_B, L1_A, L1_B, L2_A, L2_B (`GEN` line 55) |
| gates | 85, all pass (computed) |

One shipped revision. The lane solver went through two failed states inside the chat (sort key deadlock; rank indexed up) and the smoothing radius changed from 0.4 to 0.25 (README); none of those states was saved. Name collision: `~/Downloads/tessera-architecture.md` and its mockup (2026-05-28) are a page editor, not copied.

Why this revision: the only one; 85 of 85 at 1.100 mm (computed). It is the source of the constraint-ranked lane solver that FRET and STAVE reuse. The owner judged the board itself not playable (plan record); FRET is the playable one. The viewer carries the `S.span` defect (section 7).

`files/`: generator, `svgpath.py`, README, geometry JSON, viewer, `layers/`, `inputs/`, `rerun/`.

---

## 2. What it makes and for whom

Twelve chunky irregular tiles (765 to 1734 mm2, computed) in place of SPLINE's blades, three small sliders in a band under the keypad, 18 contacts in one row. Two MPR121. The tiles are Voronoi cells whose column boundaries are snapped to straight vertical channels, and those channels are the routing.

---

## 3. Shots

Headless drive 2026-10-05; the page throws the `S.span` TypeError on load (measured) and builds no tab row. The driver unhid Sense model and Wiring directly; the shipped page cannot reach them. Sense SVG capped at 690 px tall. Files in `fab-knowledge:originals/tessera/shots/`.

| file | caption |
|---|---|
| `t01-stack-iso-default.png` | Layer stack at load, no tab row. |
| `t02-stack-exploded-orbited.png` | Exploded and orbited. |
| `t03-top-collapsed.png` | Top, collapsed: tile numerals on irregular tiles, accent inlays. |
| `t04-sense-t5-touched.png` | Tile T5 held: "One channel, 765 to 1734 mm2 of plate depending on the tile", TOUCHED (measured). The copper shows four columns of tiles with each tile tapping out of its left edge into the channel beside it, top row in the leftmost sub-lane. |
| `t05-sense-slider-l1.png` | Straight slider SL1 dragged: A/(A+B) 0.313, 78 percent along 39 mm, CC 99, zone 7 (measured). The arc sits right of the last channel inside the slider band. |
| `t06-wiring.png` | Wiring (unhidden): rail table; generator pane empty. |

---

## 4. Shared kernel (brief)

`P` lines 36 to 54; helpers lines 61 to 73 with `smooth(d=0.25)` (line 68, see 5.6); `apol` and `annulus` (`n = max(10, |a1-a0|/1.2)`) about the arc centre lines 75 to 85; outline lines 98 to 100; union and smooth lines 250 to 251; gates lines 266 to 359; refusal line 363; emit lines 367 to 456.

---

## 5. Mechanisms, circuits and constructions

### 5.1 Voronoi tiles with snapped channels

Construction (lines 106 to 147), in order:

1. Field (10, 76, 232, 170); `nch = cols + 1 = 5` channels 10 wide; `cell_w = ((232 - 10) - 5 * 10)/4`; channel centres `CHAN[i] = 10 + i * (cell_w + 10) + 5`.
2. Seeds: `random.Random(11)`; per column a coursing offset of plus or minus 0.34 of a row height (alternating by column) so seams do not line up; seed at the column centre plus `uniform(-6, 6)` in x and `uniform(-5.5, 5.5)` in y.
3. Tile: the column strip `box(left, FY0, right, FY1)` intersected with `halfplane(seed, q)` for every other seed. `halfplane(p, q)` (lines 87 to 96) is a 900 mm quad on p's side of the perpendicular bisector.
4. `buffer(-0.55)` (seam), then `buffer(-1.6).buffer(1.6)` (round the corners).
5. Net `T(j * rows + (rows - r))`. Row index `r` 0 is the bottom course (seed y grows with r, line 119), so the formula numbers each column TOP down: T1 is the top tile of column 0 and T3 its bottom tile (computed from the shipped JSON `pads`: T1 row 2, bounds y 125.5 to 169.5; T3 row 0, y 76.6 to 100.3). The code comment on line 135 says "numbered bottom-up per column", which is wrong.

Gates (lines 286 to 299): smallest tile over 400 mm2 (computed 765); every tile one piece; 12 tiles; every channel strip clear of every tile; sub-lanes per channel at least `tw + clr` apart.

Parameters that reshape it: `seed`, `jitter`, `cols`, `rows`; channel width scales with rows since each channel carries one trace per row (README).

### 5.2 Edge taps and channel sub-lane order

Construction (lines 140 to 147): the tap height is the centroid y of the tile's left 2.6 mm strip; the escape runs from `left + 1.4` to the sub-lane x. Sub-lane `sub = CHAN[j] - (rows-1) * 3.0/2 + (rows - 1 - r) * 3.0`: the top row takes the leftmost sub-lane, so a trace entering lower down crosses only lanes of rows above it, which lie to its left.

### 5.3 Sliders parked between channels

Straight (lines 150 to 164): x (22, 61) and (128, 167), band y 51 to 71, `lin_off 5`, A thick at the left, B mirrored; escapes from each thick end at `lx0 + 1.4` and `lx1 - 1.4`. Arc (lines 166 to 180): centre (205.5, 24.5), r 32 to 44 over 60 to 120 deg with a 4 deg end offset, escapes 3 deg in from each end. The arc uses a tighter radius with a wider angle so its sweep fits the window between two channels' trace bundles (README).

Gates (lines 301 to 335): straight ratio monotone and span inside 0.10 to 0.90 (computed 0.831 to 0.169 over 39 mm); arc monotone, span (computed 0.202 to 0.733), sweep between 25 and 70 mm (computed 37); the arc stays inside the band; the band is clear of every tile.

### 5.4 Constraint-ranked lane solver (version 2)

What it does: assigns fan lanes by a partial order in place of a sort key.

Algorithm (lines 182 to 225), lanes y 46 down to 22 on 3.0 (line 51), `MARG = 2.5`:

```
farther[p] = { }
for p, q:
  if ARRIVE[p] within span(q) +- MARG: p must sit farther than q     (p's source drop crosses q's lane)
  if TX[p]     within span(q) +- MARG: q must sit farther than p     (p's finger drop crosses q's lane)
rank = longest path in that DAG, relaxed up to n + 2 times; no convergence -> SystemExit('lane constraints contain a cycle')
need = max(rank) + 1; need > len(lanes) -> SystemExit
LANE[k] = lanes[need - 1 - rank[k]]          # lanes[0] is the farthest; the index counts down
assert same-lane spans are disjoint with MARG
```

Computed: 4 of 9 lanes used.

### 5.5 Rail

18 fingers, 9 on 13, depths 16 and 11, centred on the board (lines 226 to 234). Order follows arrival: tiles 1 to 3, SL1 A and B, tiles 4 to 6, tiles 7 to 9, SL2 A and B, tiles 10 to 12, ARC A and B (README). Gates lines 337 to 346.

### 5.6 Faceplate, accents, smoothing

`VINYL` as QUADRANT, overhang 1.4; accents are each tile buffered -2.4 plus arc and straight faces (lines 253 to 264). Smoothing at 0.25 (line 68): closing is extensive, and the 0.4 sliver cleanup grew every net by 0.4 and ate 0.8 of every 1.0 mm lane gap, manufacturing a clearance failure (README).

### 5.7 Read model

As SPLINE: arc by `atan2` about `G.hub` (here the arc centre), straight sliders by x (`SIM` lines 196 to 213).

### 5.8 Constructions the first pass left out

**Slider band layout between channels (computed from `P`, lines 40 to 47).** The channels sit at x 15, 68, 121, 174 and 227. SL1 (x 22 to 61) parks between channels 0 and 1, SL2 (x 128 to 167) between channels 2 and 3, the brand mark (x 74, y 53, 13 mm, wordmark cap 5.4 from x 89) between channels 1 and 2, and the arc (centre x 205.5) right of channel 3. Every channel's three traces pass down through the band in the gaps between these parts, so the band is laid out by the channel grid, not by the sliders.

**Straight wedge shape (`GEN` lines 150 to 164).** Horizontal here (VERNIER's orientation): `hsum = 20 - 1.4`, `hmax = hsum - 2.4` = 16.2; A runs x `lx0` to `lx1 - 5` hugging the band floor, thick (16.2) at the left; B runs `lx0 + 5` to `lx1` hugging the ceiling, thick at the right. Each escape leaves 1.4 mm inside its thick end at the wedge's mid height.

**Faceplate and guide art (`GEN` lines 404 to 422).** Tile numerals at cap 9.0, Plex Mono 700, at each tile's centroid minus 4.5 in y; `ARC`, `SL1`, `SL2` at cap 2.4 just above the band (`ly1 + 2.2`); nine arc ticks from `r_in + 0.4` to `r_in + 2.6`; nine straight slider ticks 0.7 wide hanging below the band (`ly0 - 2.8` to `ly0 - 1.0`); title `TESSERA REV A` at (95, 47) and tagline at (95, 42.4), above the fan lanes. Rail labels at cap 2.0 on the guide only. Accents are each tile eroded by 2.4, so the inlay follows the irregular tile shape, plus arc and straight faces inset 0.6.

**Viewer (`SIM` lines 196 to 236).** Straight sliders read along x, clamped to `x0 + 5` through `x1 - 5`, label "% along 39 mm"; the arc reads by `atan2` about `G.hub`, which TESSERA's JSON sets to the arc centre (205.5, 24.5), not a board hub. Each slider uses its own span. The tile readout quotes `tile_min` to `tile_max` from the stats rather than the touched tile's own area. The Wiring tab's stats would list `G.channels.length` straight channels (5), but the `S.span` throw on line 274 stops the script first.

---

## 6. UX anatomy

KEYWAY family shell with irregular tile hit paths. Only the Layer stack tab is reachable in the shipped file.

## 7. Known limits and failure lessons

1. Viewer `S.span` throw (`SIM` line 274): stats carry no `span` key; the tab bar never builds (measured).
2. Lane order as a sort key deadlocked; the constraint graph fixed it (README).
3. Indexing the rank up the lane list inverted every constraint; the clearance gate caught it as a dead-on overlap (README).
4. Smoothing 0.4 ate lane gaps; 0.25 ships (README).
5. Judged not playable; FRET followed.
6. Font and logo inputs absent from the bench folder.
7. Comment drift: line 135 says tiles are numbered bottom up; they are numbered top down (section 5.1).
8. The fifth channel `CHAN[4]` at x 227 carries no trace: column 3 taps left into `CHAN[3]` at x 174, so the last channel is only the right margin of column 3 (computed from `channels` [15, 68, 121, 174, 227] in the shipped JSON). Its strip is still gated clear of tiles.

## 8. Tests and harness

85 in-generator gates, 85 of 85 (computed), worst 1.100 mm at T1/T2.

## 9. Port map

| item | value |
|---|---|
| packages | `copper` (Voronoi tiles with snapped channels, edge taps and sub-lane order, constraint-ranked lane solver, rail), `geom` (half-plane Voronoi, erode then round), `circuit` |
| feature kinds | `conductor`, `pad`, `window`, `lamination` |
| canon ids | `arc-slider` (proven, TESSERA in provenance, CANONS.md line 582); `wedge-pair-slider` (line 581; TESSERA not in its provenance); `capacitive-plate` (line 580; not in its provenance) |
| canon MISSING | Voronoi tile keypad with snapped channels; constraint-ranked lane solver with index-down rule; channel sub-lane ordering rule; closing radius under a quarter of the narrowest gap as a check |
| reference ids | none in INDEX; MISSING (lane ranker and Voronoi channel board have no reference) |
| milestone | M05 (85 gates, MILESTONES.md line 62) |
| lineage row | MISSING |
