# Extractions

Part of the hackbuild-fab plan set; PLAN.md is the index. One row per
repo that a decision says to split out of hackbuild-fab. A row records
the trigger result, the date it was evaluated, and the commit it was
evaluated on. REPOS.md section 10 holds the procedure, MILESTONES.md
Part 3 rule 13 the duty to record the result when a trigger fails.

`node tools/extract-check.mjs <package>` prints the three parts of a
trigger: part one (the trigger designs build on the package and import no
legacy code), part two (the parity commands exit 0) and the import closure
(every dependency of the package resolves outside this workspace). It
exits 0 only when all three hold. `tools/test/extract-check.test.mjs`
holds the rows below to what the tool reports.

| repo | decision | part one | part two | import closure | result | date | commit |
|---|---|---|---|---|---|---|---|
| hackbuild-3mf | D-027 | n/a | n/a | n/a | split rehearsed on a scratch snapshot; staged in ../hackbuild-3mf, no commit, publish pending D-037 | 2026-10-06 | none |
| hackbuild-inlay | D-028 | holds | holds | fails on geom, mesh, profile, spec | deferred until @hackbuild/kernel publishes | 2026-10-06 | none |
| hackbuild-copper | D-029 | holds | holds | fails on geom, spec | trigger fails on the import closure; not extracted, deferred until @hackbuild/kernel publishes | 2026-10-09 | none |

"none" in the commit column: hackbuild-fab has no commit yet (D-006), so
each check ran on the staged working tree of that date.

## hackbuild-3mf

M00-T15. M00 exit with no trigger beyond the M00 preconditions (D-027,
REPOS.md 10.1). The source is the M00 report (`.hbf-notes/m00-report.md`,
M00-T15): `git subtree split` cannot run with no commit, so the split was
rehearsed on a scratch snapshot and the tree built with
`tools/import-from-fab.sh`; `tools/test/split-fresh.test.mjs` holds the
staged ../hackbuild-3mf to a fresh import. Publish waits on D-037.

## hackbuild-inlay

M03-T13. Source: the M03 Exit table (`milestones/M03-inlay.md`) and its
report: `node tools/extract-check.mjs inlay` on 2026-10-06 printed part
one holds (collar and sprue through `test/parity.entry.ts`), part two
holds (both harnesses and `hbf parity reference/cosmetic/coin-inlay`
exit 0) and the closure fails on geom, mesh, profile and spec; exit 1.

## hackbuild-copper

M05-T16, evaluated 2026-10-09 (America/Phoenix) on the staged tree with
node v22.18.0. D-029: extract when BLOCKS and KEYWAY both build on
`packages/copper` and the M05 parity passes.

### What ran

`node tools/extract-check.mjs copper`, exit 1, rerun 2026-10-09 after the
M05 fixer added core's surface build path (`core/src/commands/surface.ts`,
D-244 amended) and again at the M05 audit the same day, with the same
output:

```
trigger part one (D-029): holds; blocks via src/route-seat.ts, test/route-seat.test.ts; keyway via build.ts, test/parity.test.ts; no legacy import
trigger part two (D-029): holds; npm test -w designs/blocks -- route-seat exit 0, hbf parity reference/electrical/blocks-pullup-band exit 0, hbf parity reference/electrical/pip-buried-route exit 0, hbf parity reference/electrical/pip-drive exit 0, hbf parity reference/electrical/capricate-touch exit 0, hbf parity reference/copper/keyway exit 0, hbf parity reference/copper/splice-ladder exit 0, hbf parity reference/copper/vernier exit 0, hbf parity reference/copper/quadrant exit 0, hbf parity reference/copper/spline exit 0, hbf parity reference/copper/tessera exit 0, hbf parity reference/copper/fret exit 0, hbf parity reference/copper/stave exit 0, hbf parity reference/keys/flex-pair exit 0
import closure: fails on geom, spec (private workspace packages; @hackbuild/kernel is private; D-036, D-037); extraction deferred until @hackbuild/kernel publishes
```

Both trigger parts hold; only the import closure fails. The eight copper
references hold `chase.surface.ts`, which `hbf parity` builds through the
surface path and holds to its surface goldens. The first evaluation, at
the verifier pass the same morning, ran before that path existed: each of
the eight copper parity runs stopped with `E_REF add chase.ts to the
directory` and part two failed. Part two follows the M05 Exit table: the
BLOCKS seat test of M05-T09 and every reference the table runs through
`hbf parity`.

### Evidence beside the trigger

These ran the same day and are recorded so the next evaluation starts
from them. None of them is the trigger as D-029 and M05-T16 write it.

| command | result |
|---|---|
| `npm test -w designs/blocks -- route-seat` | exit 0, 21 of 21; seats 16, 16, 28, 30, 40 routed (computed) |
| `npx vitest run reference/copper` | exit 0, 8 files, 70 of 70: KEYWAY, the SPLICE ladder and the six family boards against their legacy oracles and `expected/` (the M05-T14 and M05-T15 substitute acceptance at the verifier pass, before `hbf parity` built surface chases) |
| `npm test -w packages/copper` | exit 0, 9 files, 140 of 140 |
| `git subtree split --prefix packages/copper -b copper-split` | not run on hackbuild-fab, which has no commit (D-006). Rehearsed on a scratch snapshot of the staged tree committed in a scratch repository: exit 0, 102 files on the split branch |
| `npm install` then `npm test` in a clone of the rehearsed split | install exit 1 (`E404 @hackbuild/geom@0.0.0 is not in this registry`); test exit 127 (`tsc: command not found`) |

The split tree is not standalone yet. Besides the closure (`@hackbuild/geom`
and `@hackbuild/spec` at runtime, `@hackbuild/profile` in tests), it reaches
outside its folder: `vitest.config.ts` imports `../../vitest.config.ts`,
`tsconfig.json` extends `../../tsconfig.base.json` and references
`../geom`, four tests read fixtures from the repo root
(`new URL("../../../", import.meta.url)`), and three scripts register
`core/dist/resolve-hook.js`. REPOS.md 10.5 copies the BLOCKS and KEYWAY
references into the new repo's `reference/`; those import
`@hackbuild/checks` and core as well.

### Which part failed

1. Import closure: geom and spec are private workspace packages (D-036);
   `@hackbuild/kernel` is private and exports neither subpath, and nothing
   publishes before D-037 clears.
2. CI: no run exists. "Green on CI" waits for the first commit and push
   (D-006). The CI parity loop runs the surface references as well
   (`.github/workflows/ci.yml`, held by `tools/test/ci-exit-rows.test.mjs`).

### Owner questions (MILESTONES.md Part 3 rule 15)

| question | default in force |
|---|---|
| the npm name for the split package (no decision names one; `npm view hackbuild-copper` returned E404 on 2026-10-09, so the name was free that day; `https://pypi.org/pypi/hackbuild_copper/json` returned 404) | none named; the split stays source only (M05-T16 step 3) |
| publish of hackbuild-copper | D-036 names only @hackbuild/kernel; D-037 default: nothing publishes until the npm org exists |
| push to hackbuild/hackbuild-copper (empty and public, created 2026-09-15T06:59:43Z, `gh repo view` on 2026-10-09) | D-006: only when the owner asks |

### When to run it again

After `@hackbuild/kernel` publishes the geom and spec subpaths (the
closure can hold) and the split tree stops reaching outside its folder. Then the procedure is
REPOS.md 10.1 to 10.5 with `--prefix packages/copper`, on the owner's
request.
