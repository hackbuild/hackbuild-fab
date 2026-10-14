# Mechanism ConstraintDefs

Rules the mechanism canon owns, each run as a `constraints.query` dim with
the reason behind every bound and registered by `core` at load
(`core/src/load/constraints.ts`, D-044). `mech/cascade-slop` moved here
unchanged from the M01-T10 fixtures at M06-T02 and `mech/hook-rule` at
M06-T03 (M01 package placement); their recorded disagreements move with
them. Each reads every physical number from a profile constant row with
provenance (PROFILE.md 10.1) and reads facts through the shared readers in
`spec/constraints.ts`.

## Sources

| def | dims | canonical source (lineage row) | lines |
|---|---|---|---|
| `mech/cascade-slop` | `cascade.depth` | `originals/tumbler/files/tumbler.html` (`tumbler.bench/harvest`) | 193 to 203 (MATS, G), 2015 to 2024 (`depthOf`), 2108 to 2112 (slop, stroke, warn) |
| `mech/hook-rule` | `hook.d`, `hook.Rb`, `hook.sweep` | `originals/cotter/files/cotter-src/src/geo.js` (`cotter.geo/r5`); `tools/hook_fit.py` (`cotter.hook-fit/r5`) | geo.js 102; hook_fit.py 81 to 111 |

Facts: `cascade.depth` reads `kerf` and `fit` (mm per stage). `hook.*`
reads `hole` and `tb` (mm) and takes `fit`, `margin`, `rise` and `ext` as
facts when given, else the `hook.*` constants. Severity (D-067):
`cascade.depth` is warn (the bench warns and never refuses).

## Recorded disagreement: TUMBLER slop, linear or doubling

The bench code at tumbler.html line 2108 stacks slop linearly,
`slop = depth (k + c)`, and the SLOP STACKS text at lines 2337 to 2338
says the same (0.3 to 0.5 mm per sliding pair, inferred). The WHIFFLETREE
module note at line 1385 says "each stage doubles the stroke of the one
below it, so slop doubles too". That note is about the whiffletree's
binary stroke ladder, where stage i moves 2^i times the first stroke. The
fixture follows the code: linear in depth, ceiling floor(1.2 / (k + c))
(computed). A doubling chain would need its own def keyed on the
whiffletree stage count.
## Recorded disagreement: COTTER sweep at the loop limit

`GEO.hookRule` and `design_full` step the sweep while `s < 88` and return
88 unchecked when no smaller whole degree reaches the rise. The fixture
also tests 88, and when 88 does not reach the rise either it returns a
floor one degree over the 88 ceiling, so the query answers E_UNSAT and
names the largest rise a sweep of 88 locks. The 7 verify_all pairs all
solve under 88 (sweeps 52 to 77, computed), so the two agree on them.

`hook_fit.py` `design` alone defaults margin to 0.2 mm; `design_full` and
`GEO.hookRule` both pass 0.35 mm, which `hook.margin` holds.
## Tests

`core/test/mech-cascade-slop.test.ts` and `core/test/mech-hook-rule.test.ts`
are the M01-T10 fixture tests, moved unchanged into core, the lowest tier
that may import both this package and the constraints solver; the rules of
`rules.ts` are tested in `core/test/mech-constraints.test.ts`. They read
the M01-T10 card tables, the canonical originals and
`packages/mechanisms/test/legacy/hook-rule.py.stdout.txt`, the closed
form run of `design_full` copied verbatim from hook_fit.py by
`test/legacy/hook-rule.py` (`uv run --project tools/py python
packages/mechanisms/test/legacy/hook-rule.py`).

Two cases run the originals in place when they are on the machine:

- Cascade: for each of the 9 MATS rows, depths 0 to 24 read warn exactly
  where the bench's `dep*(G.k+G.c) > 1.2` does.
- Hook: `GEO.hookRule`, cut from geo.js and run as written, over 7357
  points (hole 1.50 to 12.00 mm by 0.01 on 7 boards). d and the sweep
  floor are equal; 194 Rb floors differ by one ulp (at most 4 machine
  epsilon relative, computed), because the port takes start + k step
  where the source adds 0.25 repeatedly; the 1410 points where the source
  returns 88 unchecked answer E_UNSAT here (computed).
