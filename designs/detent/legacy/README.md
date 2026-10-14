# DETENT legacy copy

The DETENT control app and its harvested bundle, kept byte identical as
the inputs of M07-T01 and M07-T12 (D-142, D-156). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/detent.md` |
| copied from | `fab-work-directory:benches/detent-beam/outputs/` (`detent-plot.html`, `detent-latest.zip`) |
| canonical | `detent-plot.html` is byte identical to `originals/detent/files/beam/detent-plot.html` (lineage `detent.plot/beam`, canonical); `detent-latest.zip` holds the same page with firmware 1.3, the motor test and the `tests/` harnesses |
| lineage rows | `detent.plot/m07-legacy`, `detent.plot/m07-latest-zip` |

## Tools

`tools/extract-plan.mjs` copies `planSpeeds` (lines 1104 to 1151), the
kinematics and homography block (lines 474 to 570) and the SOLVE handler
body (lines 1883 to 1900) out of `detent-plot.html` by line number, checks
each marker, and runs them in node on the M07 fixtures. It writes
`packages/motion/records/detent-plan.json` and `detent-cal.json` with
`--write`, and otherwise exits 1 when a number moves.

## Kernels

Introduced: the trapezoidal speed planner with junction lookahead (one
tick interval per point, 20 kHz), and the four-corner homography in
(tan 2 thetaX, tan 2 thetaY) space.

## Known unfixed defects

- `tests/fwtest2.cpp` in the zip reads `h.txt`, which the zip does not
  hold; the firmware homography test is not run here (M13, D-180).
