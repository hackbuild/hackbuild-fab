# STIPPLE legacy copy

The STIPPLE (OGEE R17b) page, its R17 companion and the downloads
reader's latch port, kept byte identical as the inputs of the M07-T11
kinematics and write program port (D-142, D-156). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/stipple.md` |
| copied from | `fab-knowledge:originals/stipple/files/` (`stipple-r17b.html`, `companions/stipple-r17.html`, `derived/stipple_latch.py`, `derived/stipple_latch.json`), each byte identical to the originals' `SHA256SUMS`; `stipple-r17b.html` is also `x/downloads/dl-ogee-stipple-mech/stipple/stipple (1).html` |
| lineage rows | `stipple.bench/r17b` (canonical, `stipple-r17b.html`), `stipple.bench/r17`, `stipple.bench/r17-m07-legacy`, `stipple.kin/r17b`, `stipple.write/r17b`, `stipple.latch/downloads-derived`, `stipple.latch/downloads-derived-script` |
| read by | `packages/motion/src/kinematics/stipple.ts` (`readStippleParams` reads `DATA.P`, line 117), `packages/motion/test/stipple-programs.test.ts`, `packages/motion/test/latch-identity.test.ts`, `packages/checks/test/mot-checks.test.ts` |

## What each file holds

| file | lines read | what for |
|---|---|---|
| `stipple-r17b.html` | 117 (`DATA.P`), 138 to 170 (kinematics), 346 to 353 (cell placement), 362 to 394 (write schedule), 458 to 463 and 537 to 545 (patterns), 680 to 714 (`buildCheck`, 22 rows) | the port and its parity |
| `stipple-r17.html` | 117 (`DATA.P`) and 677 to 699 (`buildCheck`, 20 rows); kinematics and schedule are the same text 3 lines earlier | the R17 side of CHK-MOT-05 |
| `derived/stipple_latch.py` | whole | a Python port of `rodState()` by the downloads reader (2026-10-04); it reads the pages from `../stipple/`, which this folder does not have, so it is kept as the record and not run here (not run) |
| `derived/stipple_latch.json` | whole | its printed result, rounded to 4 decimals: margin, overshoot, cam lift and both identity forms on R17 and R17b; the independent source the CHK-MOT-05 test reads |

## Known unfixed defects

- The rail NUMBERS panel of R17b still prints the R17 values (stroke 4.8,
  half select 2.400, margin 0.585) while `DATA.P` says 5.0, 2.500, 0.785
  (lines 93 to 103 against line 117).
- `life` and `rain` draw from unseeded `Math.random` (lines 480, 499 and
  504); the port takes neither pattern.
- No STIPPLE generator source (`kin.py`, SCAD or DXF) exists anywhere in
  the harvest; `DATA` is the only copy of the geometry (record section 1).

## Held in the originals (R1-rails-public-11)

The copies `SHA256SUMS` lists are held out of git (D-286, PLAN.md section 5).
Each one's archive id is its `where: private` row in
`tools/legacy/inventory.json`: the original when `fab-knowledge:originals`
holds the same bytes, else `fab-knowledge:originals/_legacy/<repo path>`.
`shasum -a 256 -c SHA256SUMS` checks a restored copy. A file this README
names above is that held copy.
