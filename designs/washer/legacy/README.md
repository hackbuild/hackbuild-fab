# WASHER legacy copy

The LASER RIG page as harvested on 2026-07-30 18:25, kept byte identical
as the input of M07-T01 and M07-T12 (D-142, D-156). Nothing here is
edited; `shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/washer.md` |
| file | `laser-rig.zip`, one stored member `laser-rig.html` (sha256 1b4f11d80a37b4882dccd9f1ae6a70705c270a962bd066f8cabca06ff7fd8ace), dated 1980-01-01 so the zip bytes are fixed; zipped because line 1610 of the page writes an em dash as an HTML entity, which the voice lint blocks in a plain file and only warns about inside a legacy archive |
| copied from | `fab-work-directory:benches/washer/outputs/laser-rig.html`, byte identical to `originals/washer/files/history/laser-rig-2026-07-30-harvest.html` (lineage `washer.app/harvest`, copy) |
| canonical | `originals/washer/files/rig/laser-rig.html` (lineage `washer.app/laserriggg`) |
| lineage row | `washer.app/m07-legacy` |

Two more copies, added by the M07 audit (2026-10-09) so the planner
checks that read the canonical page run where the originals tree is
absent, CI included:

| file | copied from | lineage row |
|---|---|---|
| `laser-rig-canonical.zip`, one stored member `laser-rig.html` (sha256 38a2c04770ba85a9afea7aa8ff4b988174d2246bb7ce8657851c5aefce411f9c), dated 1980-01-01; zipped for the em dash entity on its line 1852 | `originals/washer/files/rig/laser-rig.html` | `washer.app/m07-canonical-copy` |
| `plan-square-2026-10-05.json`, byte identical | `originals/washer/drive/plan-square-2026-10-05.json`, written by `plan-square.cjs` beside it in Chrome | `washer.app/m07-drive-record` |

This folder keeps the older harvested file on purpose: the M07 WASHER
golden (60 mm square, 2.2983 s, peak 143.669 mm/s) was taken from it. The
canonical file plans the same square in 1.1703 s at peak 260 mm/s because
its defaults changed (`feed` 160 to 260, `steps` 1.0 to 4.0, `buffer` 90
to 150); the planner path for this square is the same (computed,
`plan-square-2026-10-05.json` here). A port takes its
defaults from profile, so the golden here pins the code path and the
canonical defaults stay a profile question for M07-T12.

## Tools

`../extract/extract-plan.mjs` copies `CFG` and `ik` (lines 1924 to 1957),
`wallToAngles` (lines 3248 to 3271), `PLAN`, `SERVOS`, `densify`,
`degPerMm`, `resolutionSlew`, `resolutionMM` and `planChainPen` (lines
3394 to 3927, block by block) out of the zipped `laser-rig.html`, checks each marker,
and runs `planChainPen` in node on the 60 mm square with calibration off.
It writes `packages/motion/records/washer-plan.json` with `--write`, and
otherwise exits 1 when a number moves.

`../extract/extract-cal.mjs` (M07-T12) copies `CFG` and `ik` (lines 1924 to
1957), `fkCalib` and `fk` (lines 1987 to 2031) and `calibMap` and
`wallToAngles` (lines 3248 to 3271), captures the four corner aims the
ideal map gives at the target corners (rounded to 0.01 deg, the form the
page stores on the board), turns calibration on, and reads out the corner
residual, the round trip through whole pulse microseconds over a 10 mm
grid, and the quad aspect. It writes
`packages/motion/records/washer-cal.json` with `--write`, and otherwise
exits 1 when a number moves.

## Kernels

Introduced: the mm-space velocity planner bounded by servo slew,
acceleration and deadband resolution, with curvature, junction deviation
and jerk smoothing.
