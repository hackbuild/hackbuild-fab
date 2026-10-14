# vtracer 1.0.0-alpha.4 evaluation

Outcome: keep evaluating at the next vtracer release. Ten fully measured
rows (2026-10-07): after the same print-forge hygiene both routes pass
CHK-INL-01 and -02 on every input where they paint art, and on the six flat
colour inputs they agree on 98.30 to 99.84 percent of cells (measured), so
route B gains nothing over route A on raster art, while it adds 907593
bytes to a bake and 15 to 45 ms of trace per input (measured), and its
fixed palette cannot carry route A's Otsu threshold on the four mono
inputs. The in-house quantize stays the default (D-145). D-145 is
unchanged and no DECISIONS.md entry is added. First table 2026-10-06
(route A quantize only); this table 2026-10-07.

## What ran

- Package: `@visioncortex/vtracer` 1.0.0-alpha.4 (vendor: MIT OR Apache-2.0,
  unpacked 692673 bytes), installed with an exact pin in
  `tools/eval/vtracer/package.json` only. Nothing under `packages/` imports
  it.
- Route: the npm wasm build runs under node 22.18.0 (measured). The
  Chromium route and the crate CLI were not needed and were not run.
- Machine: Apple M1, 8 cores, 16 GiB, macOS 12 (darwin 21.6.0 arm64).
- Command: `node tools/eval/vtracer/run.mjs tools/corpus/inlay/vtracer`.
  It exits 0 with ten rows: route A binds `contentBounds`, `quantize`,
  `otsu`, `otsuSize`, `hygiene`, `checkInl01` and `checkInl02` from
  `@hackbuild/inlay`, `fillPolygonEvenOdd` and `flattenSvgPath` from
  `@hackbuild/geom`, and `inlay.minFeature` and `despeckle.factor` from
  profile. A missing binding prints "not run" in its column and exits 2.
  Four runs on 2026-10-07 gave equal non-time columns (measured).
- Grid: 8 px/mm (card), art long side 40 mm (inferred; the card names no art
  size). Both routes read the same grid, sampled at cell centres from the
  trimmed source.
- Route B options: colour clustering, cutout, polygon mode, fixed palette of
  the design's slot colours (`tools/corpus/inlay/vtracer/inputs.json`),
  filterSpeckle 2.

## Corpus

Ten PNGs in `tools/corpus/inlay/vtracer/`, checked by `SHA256SUMS`, written
by `node tools/eval/vtracer/corpus.mjs`. Inputs 1 to 4 and 10 come from
headless Chrome driving the legacy benches over `file://` through
puppeteer-core 24.43.1. Playwright refuses this macOS 12 host, so the
Playwright form of the drive was not run. Inputs 8 and 9 come from
`tools/py/render_sprue_motifs.py`, which imports `motif_snare` and
`motif_bolt` from the hash-checked SPRUE generator.

Input 2 (COLLAR hack.build preset) shows the back wordmark clipped at both
ends of the art circle in the bench's own face export (measured, by eye on
the PNG). The input is kept as the bench produced it.

## Table

All numbers are measured on the machine above on 2026-10-07. Wall time is
the median of 5 runs inside one process; A ms is route A quantize, B trace
ms is the vtracer call. Seam cells are measured by filling each route B
path onto the grid with geom `fillPolygonEvenOdd` and counting cells
covered by zero paths or by two or more. Hygiene is print-forge at 8 px/mm
on both routes: boost 0.15 mm, open at minF 0.6 mm (profile
`inlay.minFeature`, inferred), despeckle under 6 cells (profile
`despeckle.factor` 0.35, computed), host the body label 0. Hygiene cells
count cells whose label hygiene changed. CHK-INL-01 and -02 run through
`checkInl01` and `checkInl02`, the grid forms the Part IR run bodies call.

| n | input | mode | source px | grid cells | Otsu thr | raw agree % | agree % after hygiene | B seam cells (zero / two or more) | hygiene cells A / B | INL-01 A / B | INL-02 A / B | A ms | B trace ms | B paths | B svg bytes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 01-hackbuild-mark | mono | 1200 x 1200 | 319 x 320 | 141 | 83.08 | 82.47 | 51974 (51974 / 0) | 1944 / 1276 | pass / pass | pass / pass | 1.3 | 26.6 | 2 | 1910 |
| 2 | 02-collar-hackbuild | palette | 1200 x 620 | 320 x 165 | n/a | 98.36 | 98.59 | 378 (0 / 378) | 2234 / 1984 | pass / pass | pass / pass | 2.6 | 34.5 | 24 | 6898 |
| 3 | 03-collar-seal-tagline | palette | 1200 x 620 | 320 x 165 | n/a | 97.30 | 98.30 | 369 (0 / 369) | 2493 / 1927 | pass / pass | pass / pass | 3.1 | 40.0 | 44 | 7553 |
| 4 | 04-collar-casino-chip | palette | 1200 x 620 | 320 x 165 | n/a | 98.79 | 99.11 | 289 (0 / 289) | 1744 / 1524 | pass / pass | pass / pass | 3.6 | 32.5 | 23 | 5025 |
| 5 | 05-python-coin-preview | palette | 2400 x 1240 | 320 x 165 | n/a | 98.08 | 98.38 | 638 (0 / 638) | 2364 / 2275 | pass / pass | pass / pass | 2.5 | 31.0 | 19 | 6914 |
| 6 | 06-sprue-face-previews | mono | 2240 x 616 | 320 x 88 | 183, inverted | 47.16 | 50.81 | 263 (0 / 263) | 2503 / 1303 | pass / pass | pass / pass | 0.4 | 20.6 | 28 | 4431 |
| 7 | 07-user-art-reference | mono | 922 x 360 | 320 x 125 | 19, inverted | 81.03 | 78.35 | 0 (0 / 0) | 1078 / 0 | pass / pass | pass / skip | 0.5 | 15.6 | 1 | 236 |
| 8 | 08-sprue-snare | mono | 640 x 586 | 320 x 293 | 1 | 99.14 | 99.14 | 435 (0 / 435) | 3498 / 3485 | pass / pass | pass / pass | 1.2 | 43.3 | 14 | 5612 |
| 9 | 09-sprue-bolt | mono | 347 x 640 | 174 x 320 | 1 | 99.84 | 99.84 | 46 (0 / 46) | 691 / 689 | pass / pass | pass / pass | 0.7 | 22.0 | 2 | 1133 |
| 10 | 10-sprue-phx-faces | mono | 868 x 424 | 320 x 156 | 139, inverted | 46.45 | 48.10 | 101 (0 / 101) | 1571 / 721 | pass / pass | pass / pass | 0.6 | 23.5 | 13 | 2343 |

Row 7 was measured on a SPRUE upload whose author is unknown. That input
left the public tree on 2026-10-13 (D-269), so a rerun from a clone gives
nine rows; the row 7 numbers stay as measured on 2026-10-07.

Raw agreement compares route A's quantize labels with route B's filled
labels before any hygiene. Wall times move with load: route B on row 1
ranged from 21.1 to 88.5 ms across the 2026-10-06 session (measured), and
the four 2026-10-07 runs gave 23.8 to 33.0 ms. Every non-time column was
equal across all four 2026-10-07 runs (measured).

Bytes added to a bake by route B (measured): wasm 668378, js glue 16421,
907593 when the wasm is embedded as base64 for a `file://` bench. Route A
adds 0 (computed; it is already in the default bake).

## Findings

- filterSpeckle is a side length on this pin (measured): a square patch of
  area at most filterSpeckle squared is dropped, and a 2 x 2 patch is
  dropped at every setting from 1 to 7. The card's "set to the despeckle
  cell count" would drop patches up to 36 cells at the INLAY default of 6
  cells (computed). The harness passes the largest side whose square is
  under the route A count, 2 for 6 cells (computed).
- vtracer snaps to the fixed palette by its own colour distance (OKLab per
  the vendor notes), while route A uses COLLAR's weighted RGB distance and
  Otsu. On row 1 the pink wrench (#FE0386) is a hit for Otsu at 141
  (luminance 93, computed) but route B's two-colour palette sent its 17074
  cells to the white body (measured). On rows 6 and 10 the grey ground
  (#8a8a8a) sits under the Otsu threshold for route A and nearer white for
  route B, so about half the cells disagree (measured, 47.16 and 46.45
  percent agree). A fixed palette cannot carry an Otsu threshold; vtracer's
  binary clustering with `binaryThreshold` can, and was not run.
- On flat slot colours (rows 2 to 5, 8, 9) the routes agree on 97.30 to
  99.84 percent of cells before hygiene (measured).
- Cutout mode leaves no uncovered cell on any opaque input (measured, rows
  2 to 10) but overlaps 46 to 638 cells per input (measured) where the
  simplified polygons of two neighbours cross. Row 1 is uncovered only
  over the transparent ground of the mark, which vtracer does not trace.
- Polygon mode moves corners: an L of slot 1 on a 24 x 18 grid lost one
  convex corner cell to a 1-cell bevel (measured with a scratch probe on
  2026-10-06); a plain rectangle keeps every cell (measured, the case in
  `tools/test/vtracer-eval.test.mjs`). Route A's despeckle and opening would see the bevel as
  a changed island outline.
- The wasm build runs headless under node with no native step (measured),
  so a route B in node tests is possible without Chromium.

- After hygiene, CHK-INL-01 passes on both routes for every input
  (measured). print-forge opens at the same radius the check opens with,
  and an open of an open removes nothing, so the check cannot tell the
  routes apart once the recipe has run; it separates recipes, as the
  collar-v5 case in `packages/inlay/test/checks.test.ts` shows.
- CHK-INL-02 passes wherever art is painted (measured). Row 7 route B is a
  skip: vtracer returned one path in the body colour, so route B painted
  no art cell, against 19 percent art cells for route A before hygiene
  (computed from the 81.03 raw agreement).
- Hygiene changes fewer cells on route B (689 to 3485 against 691 to 3498,
  rows 2 to 5, 8, 9, measured): cutout polygons already round small
  corners that route A's raster opening removes.

