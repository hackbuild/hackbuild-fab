# CI history and the verified block

This page holds the CI record and the verified block that the root
`README.md` carried until 2026-10-21. The README Status section names the
latest run only; the runs and the local evidence behind it stay here.

## Runs on main

- Run 38667622976 on 13856c3, 2026-10-15 01:48 UTC: 26 jobs passed and
  owner-files was skipped (measured, from `gh run view`). It is the
  latest run and the first green one.
- Run 38643946246 on 2026-10-14 21:55 UTC and run 38542405799 on
  2026-10-14 09:26 UTC failed; run 38513976956 on 2026-10-14 04:56 UTC
  failed (measured, from `gh run list`). Their failing jobs are not
  recorded here.
- Run 38499440880 on 08fc356, 2026-10-14 02:08 UTC, was the first. 10
  jobs failed and 2 were skipped (measured): unit, exit-a, parity, cold,
  corpus, exit-m06-m08, browser and determinism on x64, arm64 and macos.
  Known red then: the D-251 rows for
  `reference/electrical/pip-buried-route` in unit, exit-a, parity and
  cold; the M06 AILERON row in exit-m06-m08; the M09 flex-pair coupon
  export in browser. New red then: no uv in the unit, parity and cold
  jobs; no SOURCE_DATE_EPOCH in unit; the corpus input
  `flex-pair-two.json` buildHash moved; the determinism corpus input
  dropped adjacency; the SLUG trials ended differently on x64 linux than
  on arm64 macOS.

On 2026-10-14 the board writers began to snap geometry to the 1 nm grid,
so spindle-r1 and shunt-art write the same bytes on macOS and Linux (a CI
branch run passed their parity on ubuntu-24.04, computed). The CI parity
job also read an owner path in a vitest test, and the SPINDLE 5V to GND
short stays (D-249).

## Verified on this machine

- 2026-10-21: the commands in `docs/how-to/quick-start.md`, in a local
  clone made with `git clone` from the working repository, not from
  GitHub. The quick start lists what each one printed.
- 2026-10-13: `npm ci`, `npx tsc -b`, `npx --no-install hbf doctor` and
  `npx --no-install hbf explain CHK-PRT-03` on a copy of the staged tree
  in a new folder (measured: npm ci 22 s, tsc 23 s; doctor all `ok` but
  `board blocked`). The copy was made with `git checkout-index`.
- 2026-10-13: `npx --no-install hbf parity reference/keys/flex-pair` on
  that copy, five of five goldens equal.
- 2026-10-13: the flex-pair bake opened from file:// with its own page
  build: `tools/smoke/page-build.spec.ts` passes, and the default and
  preset two 3mf bytes equal the `hbf` writer's (cmp). The bench smoke
  "edits, exports and round trip on flex-pair" failed then on the coupon
  export.

## Measured on a printed body

- none

## Checked by machine on geometry

- See each reference README under `reference/`.
- Known red, recorded under D-251: `reference/electrical/pip-buried-route`
  fails `hbf parity` (build, report and query-solve moved), the
  determinism-queries test (query-solve hash), and the core tests
  message-numbers and project-graph.

## Not verified by anything

- `npm ci` from a clone of the published repository.
- Any print of an export from this code.
