# M01 constraints

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: generate from legal. A builder asks what a dimension can be and gets a
bounded interval, the bound that binds, and the reason for every bound,
before any geometry is generated.
Depends on: M00
Adopted dependency: none; SNAPFE ported from `x/pip-controller/src/snapfe.js`
(MILESTONES.md 1.2)
Commands added: constraints.query, fits.table (MILESTONES.md 1.3)
Release at exit: none

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document. PIP (was HAFT) is the published
print-in-place controller at hackbuild/pip-controller (D-013). Every number
in this file carries a qualifier (measured, computed, vendor, inferred,
unknown) and a source (D-007). Numbers marked "computed, this card" were
recomputed on 2026-10-04 with node v22.12.0 from the named source file; the
port must reproduce them, and the golden records what the port computes.

## What this milestone decides and carries

| item | decision or correction | where in this file |
|---|---|---|
| interval solver, ConstraintDef registered by inversion | D-044 | M01-T04 |
| which bound binds, per query | D-072, plan-deltas R56 | M01-T04, M01-T05 |
| error contract on the query (E_UNSAT, E_PARAM_MISSING, nearest) | D-064 | M01-T04, M01-T05 |
| resistance budget is a width floor | D-072, C-01 | M01-T06 |
| click-spring rise window with stated criteria | D-071, D-229, C-04 | M01-T02, M01-T07 |
| strain limit by bend direction | D-073, C-05 | M01-T03, M01-T07 |
| resistivity rows, Yousu never scaled onto printed traces | D-081, C-09 | M01-T03, M01-T06 |
| per-MCU pin values for CHK-NET-05 | D-076, C-02 | M01-T08 |
| fit classes, PSLIP, felt bands | D-099, D-100 | M01-T09 |
| one KernelId union on every Bound | D-057 | M01-T04 |
| message numbers formatted from the computation | D-010 (no hand-typed numbers), syn/api-library-ai-design.md 6.4 C | M01-T05 |
| constraints.query and fits.table on the CLI | D-106, D-114 | M01-T05, M01-T09 |

Detail on the check rewrites lives in ../CHECKS.md; the profile rows in
../PROFILE.md; the command shapes in ../AGENT-SURFACE.md; the package
boundaries in ../PACKAGES.md and ../ARCHITECTURE.md. This file holds what a
builder runs.

## Evidence roots

| short | absolute path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| syn | `fab-knowledge:synthesis/` |
| corpus | `fab-work-directory:` |

Cards write evidence paths in full.

## Package placement

The constraints package never imports a kernel. Kernels and canons export
`ConstraintDef` objects typed against `@hackbuild/spec` only; `core`
collects them at load and registers them into the solver (D-044, syn/api-library-ai-design.md 3.4).

| ConstraintDef | owning package | tier | Bound.kernel | registered at |
|---|---|---|---|---|
| `profile/printability-floor` | profile | 0 | profile | core load |
| `profile/flex-fatigue-floor` | profile | 0 | profile | core load |
| `mesh/pitch-ceiling` | mesh | 0 | mesh | core load |
| `circuit/trace-resistance-floor` | circuit | 1 | circuit | core load |
| `circuit/pullup-low-read` | circuit | 1 | circuit | core load |
| `circuit/capacitive-path-ceiling` | circuit (M05-T12) | 1 | circuit | core load |
| `sim/click-spring-window` | sim | 1 | sim | core load |
| `profile/fit-band` | profile | 0 | profile | core load |
| `mech/cascade-slop` | mechanisms (fixture def here until M06-T02 moved it) | 1 | motion | core load |
| `mech/hook-rule` | mechanisms (fixture def here until M06-T03 moved it) | 1 | mesh | core load |
| `mech/ogee16-latch-servo-window` | constraints (fixture def, moves to the OGEE design at M10) | 1 | mesh | core load |

Kernel ids in the Bound.kernel column come from the one KernelId union in
spec/ids.ts (D-057). The three fixture defs live in
`packages/constraints/src/fixtures/` until their canon or design package
exists; they import spec only.

---

## M01-T01 SNAPFE port into packages/sim/fe

Goal: the corotational beam FE that PIP ships runs headless as a typed
module in `packages/sim/fe`, with its flat-arch stiffness test asserted.

Inputs:
- fab-knowledge:evidence/x/pip-controller/src/snapfe.js (101 lines, canonical copy per D-013)
- fab-knowledge:evidence/x/pip-controller/src/layout.js lines 36 (clicky defaults), 80 to 113 (clickerDims, SNAPFE_RIGID)
- fab-knowledge:evidence/x/fe2pip.cjs (the rerun script behind verified-claims C4 and C6)
- fab-knowledge:synthesis/verified-claims.md lines 13, 57, 84
- spec/sim.ts, spec/ids.ts

Steps:
1. Record the port in `lineage.json` (D-156), no fixes carried. The
   subject `snapfe` already names
   originals/pip/files/haft-src/src/snapfe.js canonical (row
   snapfe/pip-haft-9, pip.md 1.1); the pip-controller copy differs from it
   only in the line 1 comment (HAFT against PIP), so the bytes and sha256
   differ while the arithmetic is identical (verified-claims.md line 84
   says identical). Port from the canonical row and record each copy read,
   x/pip-controller/src/snapfe.js among them, with its dest. Whether D-013
   or pip.md 1.1 names the canonical PIP file is an owner question
   (.hbf-notes/impl-audit.md section 4); the port does not depend on it.
2. Port `solveLin`, `curve` and `summarize` to TypeScript without changing
   arithmetic order. Keep float64, keep the dense Gaussian elimination with
   partial pivot, keep the 40-iteration Newton loop and both convergence
   tests (`nr < 1e-9 * E * A`, `max |du| < 1e-12`). No globalThis export.
3. Port `SNAPFE_RIGID` as `clickRigid(p, rules)`: `lEff = max(4, l - sw *
   0.5)`, `h = Q * t`, `nel 18`, `steps 56`, `dmax 2.0`, `arches 2`.
4. Port `clickerDims` contact and stop strain as `clickReadout(fe, rules)`:
   `cg = max(dPeak + 0.15, 0.85 * dValley)`; `eStop` is the largest
   element strain over curve points with `d <= cg + 0.3 + 1e-9`.
   The 4 mm span floor, 0.15 mm, 0.85 and 0.3 mm are physical rule numbers
   (inferred, PIP layout.js lines 86, 95, 110), so they are profile
   constants `click.rigidSpanMin`, `click.contactPastPeak`,
   `click.contactValleyFraction` and `click.stopOvertravel` (PROFILE.md
   10.1), read by `clickRules(profile)` into `rules`. The solver settings
   nel, steps, dmax and arches stay in code as `CLICK_FE`.
5. Units in doc comments on every numeric field: mm, N, MPa, strain as a
   fraction (readouts print percent).
6. Add the flat-arch stiffness test: `curve({l: 24, h: 0.001, t: 0.55,
   w: 1.6, E: 1900, nel: 18, steps: 56, dmax: 0.01})`, k = F/d at point 5,
   against theory `2 * 12 * E * I / (l/2)^3` with `I = w t^3 / 12`.
7. Add a non-convergence test: a load step that does not converge sets
   `ok: false` and the readout carries it as a warning, never a silent pass.
   SnapCurve (spec/sim.ts) has no warning field, so the readout is
   `ClickReadout`, SnapCurve plus `ok` and `warnings`. The case l 22.5, h
   10, t 0.05, w 1.6, E 1900, nel 18, steps 2, dmax 2 does not converge
   (computed with the source snapfe.js).

Files to create:
- packages/sim/src/fe/snapfe.ts
- packages/sim/src/fe/click.ts
- packages/sim/src/fe/index.ts
- packages/sim/test/fe/snapfe.test.ts (a test under src/ is compiled into
  dist by `rootDir src` and is outside the vitest include
  `packages/*/test/**`; the `fe/snapfe` filter matches this path)
- lineage.json (rows for snapfe, snapfe.fe2pip and the pip.layout copy read)
- packages/profile/data/constants.json and PROFILE.md 10.1 (the four click
  rows of step 4)
- tools/test/lineage.test.mjs (PORT_SCOPE holds packages/sim/src/fe)

Acceptance:
- `npm test -w packages/sim -- fe/snapfe` exits 0.
- Flat-arch FE stiffness prints 0.585396 N/mm (computed, this card:
  0.5853964) and theory 0.585394 N/mm (computed: 0.5853935). The test
  asserts both to 6 decimals and `|k_fe - k_theory| <= 3e-6` N/mm. The
  unrounded difference is 2.83e-6 (computed, this card), so a 2e-6
  tolerance on unrounded values fails; the 2e-6 figure in the brief is the
  difference of the two rounded prints. The test prints them with
  console.log, which the default vitest 5 reporter under npm drops for a
  passing test (found at M01-T02, 2026-10-06); the print shows with
  `--reporter=verbose`, and the assertions hold either way.
- `node tools/tiers.mjs` exits 0: `packages/sim/src/fe` imports spec only.
- `grep -rn "document\|window" packages/sim/src/fe` returns nothing (D-045).
- Mutation check: changing one load-bearing line in a scratch copy (the
  element moment `4 * t1 + 2 * t2`, the rigid span `l - sw * 0.5`) fails
  `npm test -w packages/sim -- fe/snapfe`.

Done when: the FE runs under node with no DOM and its stiffness test is
green in CI.

## M01-T02 SNAPFE parity at PIP defaults and the Q sweep

Goal: the ported FE reproduces every published click-spring number to the
stated precision, including the full Q sweep that D-071 rests on.

Inputs:
- packages/sim/src/fe/ (M01-T01)
- fab-knowledge:evidence/x/fe2pip.cjs
- fab-knowledge:evidence/scratch/fe.cjs
- fab-knowledge:evidence/scratch/qfine.cjs (0.01 Q grid, written for this card)

Steps:
1. Run the legacy scripts against the legacy file first and save their
   stdout under `packages/sim/test/legacy/` as the parity source:
   `node fe2pip.cjs` from the x directory, then from the evidence
   directory `node scratch/fe.cjs x/pip-controller` and
   `node scratch/qfine.cjs x/pip-controller/src/snapfe.js`. qfine.cjs lives
   in evidence/scratch, not a session scratch folder, and fe.cjs takes the
   pip-controller directory, not the file. fe.cjs is the only legacy source
   of the l 22, t 0.5 row at 3 decimals (fe2pip prints 2), so its stdout is
   saved too. qfine.cjs against the canonical
   originals/pip/files/haft-src/src/snapfe.js gives byte-identical stdout
   (computed, 2026-10-06). Each script and snapfe.js read gets a lineage row
   with dest under packages/sim/test/legacy/.
2. Write `packages/sim/test/click.parity.test.ts` asserting the table
   below against the TypeScript port.
3. Assert the 0.01 grid from Q 1.00 to 2.40 against the saved legacy
   stdout for every row: snap flag, bistable flag exact; peak, dPeak, drop,
   cg, eStop to 3 decimals.

Expected values, PIP defaults l 24, t 0.55, w 1.6, E 1900, sw 3, all
computed by SNAPFE (verified-claims.md line 13, reproduced 2026-10-04):

| case | peak N | dPeak mm | drop | contact cg mm | eStop percent | snap | bistable |
|---|---|---|---|---|---|---|---|
| Q 2.0 (PIP default) | 2.527 | 0.629 | 76.5 percent | 1.369 | 2.31 | true | false |
| l 22, t 0.5, Q 2.0 (v3 numbers) | 2.282 | 0.571 | 76.5 percent (fe.cjs prints 76.5; fe2pip prints 0.76) | 1.245 | 2.32 | true | false |

Q sweep at PIP defaults, computed:

| Q | snap | drop | eStop percent | bistable | note |
|---|---|---|---|---|---|
| 1.0 | false | 0 | 0.73 | false | no snap |
| 1.1 | false | 0 | 0.76 | false | no snap |
| 1.2 | true | 0.01 (0.0139) | 1.42 | false | snap from 1.2 on the 0.1 grid |
| 1.51 | true | 0.293 | 1.79 | false | |
| 1.52 | true | 0.303 | 1.80 | false | |
| 1.55 | true | 0.335 | 1.84 | false | D-071 bracket, low end |
| 2.0 | true | 0.765 | 2.31 | false | D-071 bracket, high end |
| 2.19 | true | 0.913 | 2.495 | false | named in Exit; row added 2026-10-06 |
| 2.2 | true | 0.920 | 2.50 (2.504) | false | strain reaches the in-plane limit |
| 2.25 | true | 0.955 | 2.55 | false | |
| 2.31 | true | 0.995 | 2.60 | false | |
| 2.32 | true | 1.002 | 2.61 | true | bistable from 2.32 (latches) |

Two facts the 0.01 grid shows and the golden records (computed, this card):
the snap flag first sets at Q 1.16 with drop 0.000026, so "snaps from 1.2"
holds on the 0.1 grid only; eStop is not monotonic in Q at the 0.01 grid
(Q 2.09 gives 2.423, Q 2.10 gives 2.409) because contact cg moves in curve
steps of 2.0 h / 56.

Files to create:
- packages/sim/test/click.parity.test.ts
- packages/sim/test/legacy/fe2pip.stdout.txt
- packages/sim/test/legacy/qfine.stdout.txt
- packages/sim/test/legacy/fe.stdout.txt (step 1; added 2026-10-06)
- lineage.json rows snapfe.fe, snapfe.qfine and one per copy read

Acceptance:
- `npm test -w packages/sim -- click.parity` exits 0 with every row in
  both tables matching.
- The test prints the count of grid rows compared: 141 (Q 1.00 to 2.40 at
  0.01, computed from the grid definition). The default vitest 5 reporter
  under npm drops console.log from a passing test, so the line goes to
  process.stdout directly.
- Runtime of the 141-row sweep is printed and recorded in the PR body as
  measured on the CI runner (1.7 s on the writer's machine for the legacy
  script, measured, one run).

Done when: every published click-spring number reproduces from the port.

## M01-T03 Profile rows the queries read

Goal: the profile carries, with provenance, every number the M01 queries
read, and nothing in M01 reads a number from code.

Inputs:
- packages/profile/seed/profile.seed.json (from M-1-T07)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/profile.seed.json (seed row `petg-click` strainMax 0.025; seed row `cpla` resistivityOhmCm 30 with anisotropy 15/30/115)
- fab-knowledge:evidence/x/pip-controller/src/layout.js line 46 (phys rhoC 500, rhoCz 2000, rhoT 400)
- fab-knowledge:synthesis/verified-claims.md lines 52 to 59
- ../PROFILE.md (materials, resistivity table, constants)

Steps:
1. Check each row in the table below exists in the profile data
   (packages/profile/data/materials.json, constants.json and machines.json,
   the tables `loadProfile` reads since M00-T02) with the value, tier and
   provenance method shown. Rows fixed by a decided D entry are profile
   data and are added or corrected here; no measured row is written by this
   card (CLAUDE.md, D-082). The seed stays the byte copy of the handoff seed
   that tools/test/seed-conformance.test.ts checks.
2. Replace the v3 `cpla` working row (30 ohm cm, labelled measured-like) by
   the D-081 rows. Yousu 240 to 481 ohm cm is raw filament and is never
   scaled onto printed traces (C-09). M00-T02 retired the 30 and loaded
   the PIP preset rows; this card adds the `cpla-protopasta` rows.
3. Store the PETG strain limit per bend direction (D-073); the seed
   `petg-click` row becomes the in-plane row with method `failure`.
   M00-T02 loaded these rows; this card checks them.
4. Add `constant("click.dropMin")` = 0.5 (D-071).
5. Every row passes the profile data conformance test
   (packages/profile/test/conformance.test.ts, a zod schema of the
   spec/profile.ts Material and Constant shapes).

| row | read as | value | tier | method | source |
|---|---|---|---|---|---|
| cpla working (PIP preset), along | `resistivity("cpla", "along", "printed")`, row `cpla.pip.along` | 500 ohm cm | inferred | derived | x/pip-controller/src/layout.js:46 (D-081) |
| cpla working (PIP preset), through | `resistivity("cpla", "through", "printed")`, row `cpla.pip.through` | 2000 ohm cm | inferred | derived | same |
| ctpu working (PIP preset) | `resistivity("ctpu", "bulk", "printed")`, row `ctpu.pip.bulk` | 400 ohm cm | inferred | derived | same |
| cpla Protopasta molded | `resistivity("cpla-protopasta", "bulk", "molded")`, row `cpla-protopasta.molded` | 15 ohm cm | vendor | datasheet | D-081 |
| cpla Protopasta printed XY (stored as direction along) | row `cpla-protopasta.xy` | 30 ohm cm | vendor | datasheet | D-081 |
| cpla Protopasta printed Z (stored as direction through) | row `cpla-protopasta.z` | 115 ohm cm | vendor | datasheet | D-081 |
| PETG strain, beam bent in the layer plane | `strain("petg", "click" or "snap", "inPlane")` | 2.5 percent (seed 0.025 as a fraction) | inferred (../PROFILE.md 3.2) | failure | PIP failures at 2.7 to 3.3 percent (D-073) |
| PETG strain, beam bent across layers | `strain("petg", "click" or "snap", "acrossLayers")` | 1.5 percent (range 1.5 to 1.8) | inferred | derived | D-073, until a coupon |
| click.dropMin | `constant("click.dropMin")` | 0.5 ratio | inferred | derived | D-071 |
| ffc5p 0.4 preset nozzle bore | `machine("ffc5p")` preset `ffc5p_20260819` field `nozzle` | 0.40 mm | vendor | datasheet | D-101, gold save |
| perimeters for a printable wall | `constant("prt.perimetersMin")` | 2 count | inferred | derived | CHK-PRT-04 origin (../PROFILE.md 10.1) |
| cpla flex fatigue width floor | `constant("cpla.flexFatigueWidthMin")` | 0.80 mm | inferred | derived | hbf/knowledge/04-heuristics.md as cited in syn/api-library-ai-design.md 6.4 C (line 600); no matching line in 04-heuristics.md (../PROFILE.md 3.3) |

The material ids used in this card are `cpla` (working row) and
`cpla-protopasta`, as ../PROFILE.md 3.1 assigns them.

Corrections found at build, 2026-10-06:
- The card named packages/profile/seed/profile.seed.json as the file to
  write. ProfileLookup reads packages/profile/data/ (M00-T02), and the seed
  counts (11 materials, 12 constants) are asserted by seed conformance, so
  the rows land in data/ and the seed is unchanged.
- The card called the 0.40 mm row the ffc5p line width. The harvested
  preset line width is 0.42 mm (vendor, ../PROFILE.md 8.1); 0.40 mm is
  the preset nozzle bore (vendor). The row reads the bore. M01-T06 reasons
  "line width 0.40, two perimeters" (syn/api-library-ai-design.md line
  599) and computes 0.40 x 2 = 0.80 mm from these two rows. Reading the
  0.42 line width instead would give 0.84 mm (computed) and move the T06
  row 4 tie; that choice belongs to M01-T06 and is open there.
- The card gave strain as a fraction (0.025, 0.015). spec StrainLimit.pct
  stores percent, so the rows read 2.5 and 1.5.
- The perimeter and fatigue rows had no ids; ../PROFILE.md ids
  `prt.perimetersMin` and `cpla.flexFatigueWidthMin` are used.
- The seed files the Protopasta molded 15 under `resistivityAnisotropy.along`
  and the printed XY 30 under `across` (hbf seed lines 48 to 50); the rows
  name them molded and printed along.
- Acceptance named a conformance test that did not exist in
  packages/profile (seed conformance is tools/test/seed-conformance.test.ts,
  run by the root vitest); packages/profile/test/conformance.test.ts is
  added and checks the data rows.
- The Yousu raw-filament rows of ../PROFILE.md 4.1 are not in data/ at
  M01. The m01-rows test injects `cpla.yousu.raw` into a copy of the
  tables to test the C-09 rule on the row the plan names.

Files to create or change:
- packages/profile/data/materials.json (`cpla-protopasta` and its three rows)
- packages/profile/data/constants.json (`click.dropMin`, `prt.perimetersMin`, `cpla.flexFatigueWidthMin`)
- packages/profile/test/m01-rows.test.ts
- packages/profile/test/conformance.test.ts
- lineage.json (rows for the seed and layout.js copies read)

Acceptance:
- `npm test -w packages/profile -- m01-rows` exits 0; the test reads each
  row through `ProfileLookup` and asserts value, tier and method, and
  checks the rows against the seed and pip-controller layout.js line 46.
- `npm test -w packages/profile -- conformance` exits 0.
- The same test asserts that no cpla or ctpu resistivity row carries tier
  measured, and that the Yousu raw-filament row, if present, is flagged
  raw filament and is never returned for a printed direction (C-09).

Done when: every number in M01-T06 to M01-T10 resolves through ProfileLookup
with a tier. As built on 2026-10-06 this card covers the T06 and T07 rows
above; the T08 pin rows, T09 fit bands and T10 fixture numbers are checked
by those cards.

## M01-T04 Interval solver

Goal: `constraints.query(dim, ctx)` composes every registered ConstraintDef
that names the dim and returns an interval, the binding bounds, and E_UNSAT
with every bound when floors exceed ceilings.

Inputs:
- spec/constraints.ts (Bound, Interval, ConstraintDef, ConstraintSolver)
- spec/errors.ts, spec/checks.ts (LegalValues with nearest, D-064)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/spec/contracts.ts lines 101 to 146 (v3 shapes)
- fab-knowledge:synthesis/api-library-ai-design.md sections 3.4, 6.1 to 6.4
- fab-knowledge:synthesis/plan-deltas.md R56

Steps:
1. Registry: `register(def)` refuses a duplicate `id` and a def whose
   `kernels` holds a value outside KernelId (E_SCHEMA). `defsFor(dim)`
   returns defs in registration order; order never changes results.
2. Composition: effective floor = max of `lo` values, effective ceiling =
   min of `hi` values. Ties keep every tied bound and report all of them as
   binding.
3. Binding readout: `Interval.binding` is `{lo: number[], hi: number[]}`,
   the indexes into `lo` and `hi` of every bound equal to the effective
   floor or ceiling, empty on a side with no bound. (Defect fixed
   2026-10-06: spec carried one index per side, which cannot report a tie,
   so spec/constraints.ts widened the field and the AGENT-SURFACE.md 5.3 zod
   and 6.4 example C follow.) `solve()` returns `{interval, owners: {lo, hi},
   unsat}`, owners being the def id behind each bound for the text mirror.
   `lo` and `hi` are sorted by value, then def id, then the def's own
   order, so registration order never changes the bytes.
4. E_UNSAT: when floor exceeds ceiling, `legal` is null, every bound is
   returned, and `unsat` carries `path` (the JSON pointer of the
   fact that moves the binding floor), `got`, and `expected` computed by the
   def that owns the binding floor through spec
   `ConstraintDef.expectedFor(dim, ceiling, ctx)`, returning
   `UnsatExpectation {path, got, expected, nextDim?}`; nextDim feeds the
   M01-T05 `next` call. On tied binding floors the first tied def (in the
   sorted order) with an expectedFor answers; with none, `expected` names
   the ceiling and `path` is absent. E_UNSAT is returned, never thrown
   (spec/errors.ts ERROR_TRANSPORT).
5. A def reading a missing or non-finite fact raises E_PARAM_MISSING with
   the JSON pointer (`/facts/pathMm`). NaN never reaches a bound. Defs
   import spec only and cannot reach a constraints helper (tiers), so the
   solver tracks the fact keys each def reads: a read fact that is a
   non-finite number, or a non-finite bound after reading an absent or
   non-number fact, is E_PARAM_MISSING at that key with the def id in
   `record`. A non-finite bound from complete, finite facts is a def
   defect and crashes (exit 70).
6. `nearest(interval, measured)` clamps a measured value into the legal
   interval; a measured value inside returns itself, a null end is
   unbounded, an empty interval gives null.
7. The solver is pure: same dim, ctx and registry give byte-equal RFC 8785
   JSON. A test runs each golden twice and compares bytes, and once with
   the registration order reversed.
8. Integer dims (cascade depth) and grid dims (Q on a 0.01 grid) declare
   `steps: {<dim>: <step>}` on the def; the solver reports the effective
   floor rounded up and the ceiling rounded down onto that step (a value
   within 1e-9 grid units of a grid point counts as on it, so 1.2 / 0.15
   stays 8), and E_UNSAT when the rounded floor exceeds the rounded
   ceiling. Bound values stay unrounded for the message-number goldens.
9. Units and open ends (defects fixed 2026-10-06). spec `ConstraintDef`
   gains `units: {<dim>: <unit>}`, required for every dim it lists, since
   `Interval.unit` had no source; defs on one dim agree on unit and step
   or registration is E_SCHEMA. `Interval.legal` ends are `number | null`,
   null meaning unbounded, as D-225 already rules for every interval
   (`hook.Rb` in M01-T10 has a floor and no ceiling).
10. Registration manifest: each owning package exports
   `constraintDefs: readonly ConstraintDef[]` from its index;
   core/src/load/constraints.ts reads that export from profile, mesh,
   circuit, sim and constraints (fixture defs) and registers them. M01-T06
   to T10 add their defs to that export. core/test/load-constraints.test.ts
   checks every collected def against the Package placement table above;
   that every row is registered is an M01-T11 check.

Files to create:
- packages/constraints/src/registry.ts
- packages/constraints/src/solve.ts
- packages/constraints/src/errors.ts
- packages/constraints/src/index.ts
- packages/constraints/test/solve.test.ts (was src/solve.test.ts: src is compiled to dist and the root vitest include reads packages/*/test only)
- core/src/load/constraints.ts (collects defs from profile, mesh, circuit, sim and the fixture defs)
- core/test/load-constraints.test.ts

Acceptance:
- `npm test -w packages/constraints -- solve` exits 0 covering: one floor
  and one ceiling; two tied floors both reported binding; floor above
  ceiling gives legal null and E_UNSAT; missing fact gives E_PARAM_MISSING
  with path; duplicate id refused; unknown kernel refused.
- `node tools/tiers.mjs` exits 0: packages/constraints imports spec and
  profile only (spec only at M01-T04).
- Mutation: flipping the effective floor from max to min, or the empty
  test from `>` to `>=`, fails the solve suite.
- `npx tsc -b` exits 0.

Done when: a unit test can ask for any registered dim and read which bound
binds.

## M01-T05 constraints.query command, text mirror and message-number goldens

Goal: `npx --no-install hbf constraints.query` returns a CommandResult whose every
message number is formatted from the computation, and a golden test proves
it.

Inputs:
- core/ (hbf CLI skeleton and CommandResult from M00)
- packages/constraints/ (M01-T04)
- fab-knowledge:synthesis/api-library-ai-design.md 6.2 (transport mapping), 6.3 (text mirror), 6.4 C
- ../AGENT-SURFACE.md (command table, text mirror)

Steps:
1. Register `constraints.query` in group query (D-106). Arguments: `<dim>`,
   `--material <id>`, `--machine <id>` (default ffc5p), `--facts
   k=v,k=v`, `--json`. Facts parse numbers and booleans; unknown keys are
   passed through to defs.
2. Exit codes per spec/errors.ts EXIT_CODES and the transport mapping: a
   satisfiable interval exits 0; E_UNSAT exits 1; E_SCHEMA, E_REF (unknown
   dim, with didYouMean over registered dims) and E_PARAM_MISSING exit 2.
3. Text mirror: one status line, then one line per bound in the form
   `floor <value> <unit>  <reason>  [<kernel>, <tier>]`, then `binds`
   lines, then errors, then `next`.
4. Message numbers: every number in a reason or expected line is produced
   by a formatter call on the computed value (mm 2 decimals, ohm integer,
   ohm cm integer, percent 2 decimals, Q 2 decimals). A golden test parses
   every number out of the rendered text and the JSON strings and asserts
   each one equals a recomputation of the bound it came from at its
   precision. A number with no source bound fails the test.
5. `next` on E_UNSAT points at `constraints.query` for the dim that moves
   the binding floor (for conductor.width: `conductor.t`).
6. Param form (spec/commands.ts `CommandIO["constraints.query"]`):
   `npx --no-install hbf constraints.query --chase <id> [--param <pointer> ...]` with no
   `<dim>`. core builds the chase (or reuses the store entry for its
   build hash), maps each pointer to its dim through
   `ParamField.constraintDim`, the features through param read tracking,
   and the facts through the built part and its declarations; `--facts`
   overrides key by key. It calls `ConstraintSolver.forParams` and returns
   a `ParamEnvelope`; with no `--param` it answers every param that has a
   constraintDim. A pointer with no constraintDim, no feature or no param
   lands in `unbound` with its reason, never dropped. The text mirror
   prints one status line per pointer, then that pointer's bound lines.
7. Add the command to the surface count test so the cumulative total at
   M01 exit matches MILESTONES.md 1.3.

Files to create:
- core/src/commands/constraints-query.ts
- core/src/commands/param-bindings.ts (pointer to dim, features and facts)
- core/src/text/interval-mirror.ts
- core/src/text/fmt.ts (the message-number formatter; M04-T05 adds its named derivations here)
- packages/constraints/src/params.ts (ConstraintSolver.forParams)
- packages/constraints/test/params.test.ts
- core/test/fixtures/query-defs.ts (fixture.* stand-in defs, never registered by core)
- core/test/constraints-query.golden.test.ts
- core/test/message-numbers.test.ts

Files changed: core/src/registry.ts (CommandDef and CLI form),
core/src/main.ts (`--facts` as k=v or json, repeatable `--param`),
core/src/text.ts (fmt from fmt.ts, the query status and result lines,
`next` with a dim target), core/test/surface.test.ts,
packages/constraints/src/solve.ts and index.ts (boundsFor and compose
split out of solve, QueryResult.nextDim).

Acceptance:
- `npx --no-install hbf constraints.query conductor.width --material cpla-protopasta --facts pathMm=62,tMm=0.72,netBudgetOhm=8000,flexes=true,pitchMm=8.0,pitchClrMm=1.0 --json`
  exits 0 (M01-T06 golden 1). Needs the M01-T06 defs registered; before
  they land it exits 2 with E_REF, since no def names conductor.width.
- `npx --no-install hbf constraints.query conductor.widht --json` exits 2 with E_REF and
  didYouMean containing `conductor.width` (the didYouMean half also waits
  on the M01-T06 defs; the registered-dim list is empty before them).
- `npm test -w core -- message-numbers` exits 0 over every M01 golden
  declared in a reference's queries.json, plus the fixture queries.
- `node tools/counts.mjs && git diff --exit-code -- tools/reports/counts.json docs/plan/PLAN.md`
  exits 0 (D-010). CLI.md has no generator before M12-T10
  (`tools/gen-skill.mjs`), so its regeneration is an M12-T10 check.

Corrections found at build, 2026-10-06:
- Acceptance used `git status --porcelain` prints nothing. Under D-006
  nothing is committed, so porcelain lists every staged file; the line
  now diffs the generated files against the index. CLI.md is a skill
  companion generated at M12-T10 (AGENT-SURFACE.md 9.1), not by
  tools/counts.mjs.
- Step 3 form, as built: `floor <value> <unit>  <reason>  [<kernel>,
  <qualifier>[ from <tier>][, <source>]]`, `ceil ` for a ceiling, a floor
  printed rounded up and a ceiling rounded down; each `binds` line repeats
  the full line of a binding bound. "<tier>" is Bound.basis, printed after
  the qualifier so a computed number never reads as its input's tier
  (golden 2 prints `computed from inferred`). The status line is
  `<VERDICT> constraints.query <dim>   legal <lo> to <hi> <unit>`, `at
  least`, `at most`, or `none, floors exceed ceilings`. The column form in
  AGENT-SURFACE.md 6.3 and the 6.4 C JSON (bounds without `side` and
  `basis`) predate spec/constraints.ts version 5 and this step.
- Step 4: defs live in tiers 0 and 1 and cannot import core (tools/tiers.json),
  so core/src/text/fmt.ts formats what core prints and each def formats its
  own reason. The test checks every number in a reason at its printed
  precision against a fact the query passed, a number the def read from
  the profile while the test watched, or the bound itself, and inverts
  the first number of an E_UNSAT `expected` (that fact value fits, one
  printed digit less does not). A literal formula constant has no source
  and fails: the M01-T06 reason "key pitch 8.0 minus 2 x 1.0 clearance"
  fails on the 2; word it "key pitch 8.0 minus 1.0 clearance each side".
- Step 4 inputs: a query golden is a CommandResult and carries no input,
  so a reference declares its query goldens in `<reference>/queries.json`
  as `{"queries": [{"golden": "expected/query-1.json", "input": {<dim-form
  CommandInput>}}]}`. The test fails on an expected/query-*.json no
  queries.json names, checks golden.inputsHash equals the hash of the
  declared input, and reruns the input against the golden. M01-T06 to T10
  write this file beside their goldens, and parity reads the same file to
  regenerate them. Param-form goldens (envelope.json) are proved by the
  M01-T06 acceptance, not by this test.
- Step 5: the M01 placement table registers no def on conductor.t, and a
  NextCall must run as written (spec/commands.ts NextCall). The command
  tries the next query and withholds it when it would fail, so golden 2
  carries no `next` until a conductor.t def lands. The dim comes from
  UnsatExpectation.nextDim, which QueryResult now carries as `nextDim`.
- Step 6: M01-T04 implemented no forParams; it lands here in
  packages/constraints/src/params.ts over the same composition as solve.
  Facts from the built part are its scalar number and boolean params by
  field id and its `derived.<field>` metrics (k.derive) by field id;
  `--facts` overrides them. Material per pointer is the body material of
  its first bound feature unless `--material` is given; machine is the
  part's. A pointer whose constraintDim no def registers is E_REF at that
  pointer: spec unbound reasons have no "unregistered dim" entry.
- Step 7: fits.table lands with M01-T09, so surface.test.ts lists it in
  M01_PENDING; M01-T09 deletes the entry, and the test fails if a pending
  command is registered.
- `--machine` defaults to the profile slice machine (SLICE.machines[0],
  ffc5p), read from packages/profile, never typed in core.

Corrections found at audit recheck, 2026-10-06:
- Step 4 defect, fixed: when the binding floor's def has no expectedFor
  (profile/printability-floor, profile/flex-fatigue-floor), the solver
  worded the E_UNSAT expected with `String(ceil)`, so an off-grid ceiling
  printed raw ("a floor at most 0.7866 mm" at pitchMm 1.7, pitchClrMm
  0.4567). The checker passed it because it read every number at its own
  printed precision. compose, solve and forParams now take an optional
  CeilingText, and core passes the fmt.ts ceiling form, rounded down at
  the unit's precision ("0.78 mm"). The checker now holds that one number
  to the card precision table of this step and to the recomputed ceiling
  rounded down. The wording is unchanged, so the M01-T04 solve tests and
  the M01-T07 golden query-across.json (1.71 x t, on grid) still hold.
- Open, for the def owners: a number inside a def's reason is checked at
  its own printed precision, never at this step's unit table, because a
  reason mixes units. mesh/pitch-ceiling prints a 0.4567 mm clearance as
  "0.5", and circuit/trace-resistance-floor prints the path at 1 decimal
  ("62.0 mm path") where this step says mm at 2. Both trace to a fact,
  so the test passes. M01-T06 decides whether its reasons move to 2
  decimals; the goldens that carry "62.0" move with it.

Done when: a person reads the text mirror of a query and every number on it
traces to a computation.

## M01-T06 Trace width: the resistance budget is a floor

Goal: the trace-width query that v3 printed as an empty band (v3 PLAN.md
lines 319 to 326) returns the corrected interval, and E_UNSAT at the PIP
preset, with the binding bound named (C-01, D-072).

Inputs:
- packages/profile, packages/mesh, packages/circuit (ConstraintDef exports)
- fab-knowledge:evidence/x/plan-to-refine/PLAN.md lines 314 to 323 (v3 example)
- fab-knowledge:synthesis/verified-claims.md lines 52 to 54
- fab-knowledge:synthesis/api-library-ai-design.md 6.4 C

Steps:
1. Export four defs, each naming dim `conductor.width`:
   - `profile/printability-floor`: line width x perimeters = 0.40 x 2 =
     0.80 mm, reason "line width 0.40, two perimeters", source CHK-PRT-04.
   - `profile/flex-fatigue-floor`: 0.80 mm when `flexes` is true, reason
     "fatigue, cpla across layer lines under flex".
   - `mesh/pitch-ceiling`: `pitchMm - 2 * pitchClrMm` = 8.0 - 2 x 1.0 =
     6.00 mm, reason "key pitch 8.0 minus 2 x 1.0 clearance".
   - `circuit/trace-resistance-floor`: `w >= rho L / (R t)` with rho in
     ohm mm (ohm cm x 10), present only when `netBudgetOhm` is declared,
     reason "<R> ohm budget at <L> mm path, <t> thick, <rho> ohm cm (tier
     <tier>)", source CHK-NET-05; it exports `expectedFor(ceiling)` =
     `rho L / (ceiling t)` for the E_UNSAT line.
2. Write the reference `reference/electrical/trace-width-budget/`:
   chase.ts declares the facts of golden 1; build.ts builds one trace prism
   62.0 x nearest width x 0.72 mm on the M00 prism route; README.md
   carries the verified block (D-008) stating the resistivity tiers and
   that nothing here was measured on a printed body; expected/ holds the
   query goldens below plus build.json. The width param declares
   `constraintDim: "conductor.width"`, so the param-form query of the
   chase must return the same Interval as golden 1 (envelope.json in
   expected/).
3. Write each golden as a CommandResult JSON in expected/ through
   `npx --no-install hbf parity --accept` once, then never by hand.

The shape of the resistance floor, compiled under `tsc --strict` with
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` against local
stand-ins for the spec types (scratch copy at
`fab-knowledge:evidence/x/tsc/m01/snippet.ts`, exit 0, and run with its two assertions passing):

```ts
/** R = rho L / (w t): a maximum-resistance budget is a width floor (D-072). Units mm, ohm, ohm cm. */
export const traceResistanceFloor: ConstraintDef = {
  id: "circuit/trace-resistance-floor",
  version: "1.0.0",
  dims: ["conductor.width"],
  kernels: ["circuit", "profile"],
  bounds(dim, ctx) {
    if (dim !== "conductor.width" || ctx.facts["netBudgetOhm"] === undefined) return [];
    const rhoOhmMm = ctx.profile.resistivityOhmCm(ctx.material, "along") * 10;
    const L = num(ctx, "pathMm"), t = num(ctx, "tMm"), R = num(ctx, "netBudgetOhm");
    const w = (rhoOhmMm * L) / (R * t);
    return [{ value: w, kernel: "circuit", reason: `${R.toFixed(0)} ohm budget at ${L.toFixed(1)} mm path, ${t.toFixed(2)} thick, ${(rhoOhmMm / 10).toFixed(0)} ohm cm`, source: "CHK-NET-05" }];
  },
};
```

Goldens. Common facts: pathMm 62, tMm 0.72, flexes true, pitchMm 8.0,
pitchClrMm 1.0. All values computed from R = rho L / (w t).

| golden | material row | rho ohm cm | budget ohm | floors mm | ceiling mm | legal mm | binds | error |
|---|---|---|---|---|---|---|---|---|
| 1 | cpla-protopasta along (vendor) | 30 | 8000 | 0.80 printability, 0.80 fatigue, 3.23 resistance | 6.00 pitch | 3.23 to 6.00 | floor 3.23 resistance; ceiling 6.00 pitch | none, exit 0 |
| 2 | cpla working, PIP preset (inferred) | 500 | 8000 | 0.80, 0.80, 53.82 resistance | 6.00 | null | floor 53.82 resistance | E_UNSAT, expected "at least 71760 ohm at width 6.00, path 62.0, thickness 0.72", path /facts/netBudgetOhm, exit 1 |
| 3 | cpla-protopasta along (vendor) | 30 | 2000 | 0.80, 0.80, 12.92 resistance | 6.00 | null | floor 12.92 resistance | E_UNSAT, expected "at least 4306 ohm at width 6.00, path 62.0, thickness 0.72", exit 1 |
| 4 | cpla-protopasta along (vendor) | 30 | none | 0.80 printability, 0.80 fatigue | 6.00 | 0.80 to 6.00 | floor 0.80 printability and 0.80 fatigue (tie); ceiling 6.00 | none, exit 0 |

Unrounded values (computed, this card): 3.2292, 53.8194, 71759.26,
12.9167, 4305.56. The v3 band 0.80 to 1.20 is empty at its own numbers
because the budget bounds width from below (verified-claims.md line 52).

Files to create:
- packages/profile/src/constraints/printability-floor.ts
- packages/profile/src/constraints/flex-fatigue-floor.ts
- packages/mesh/src/constraints/pitch-ceiling.ts
- packages/circuit/src/constraints/trace-resistance-floor.ts
- packages/circuit/src/constraints/trace-resistance-floor.test.ts
- reference/electrical/trace-width-budget/chase.ts
- reference/electrical/trace-width-budget/build.ts
- reference/electrical/trace-width-budget/README.md
- reference/electrical/trace-width-budget/expected/query-1.json to query-4.json
- reference/electrical/trace-width-budget/expected/build.json
- reference/electrical/trace-width-budget/expected/envelope.json

Acceptance:
- Golden 1 command (M01-T05 acceptance line) exits 0 and prints
  `legal 3.23 to 6.00 mm`.
- `npx --no-install hbf constraints.query --chase reference/electrical/trace-width-budget --json`
  exits 0 with a ParamEnvelope whose width pointer holds an Interval
  equal to golden 1 (same bounds, `legal` 3.23 to 6.00, same binding)
  and an empty `unbound`.
- `npx --no-install hbf constraints.query conductor.width --material cpla --facts pathMm=62,tMm=0.72,netBudgetOhm=8000,flexes=true,pitchMm=8.0,pitchClrMm=1.0 --json`
  exits 1 with E_UNSAT, floor 53.82, expected naming 71760 ohm.
- `npx --no-install hbf constraints.query conductor.width --material cpla-protopasta --facts pathMm=62,tMm=0.72,netBudgetOhm=2000,flexes=true,pitchMm=8.0,pitchClrMm=1.0 --json`
  exits 1 with E_UNSAT, floor 12.92, expected naming 4306 ohm.
- `npx --no-install hbf parity reference/electrical/trace-width-budget` exits 0.
- The text mirror of golden 2 names the resistivity tier inferred on the
  resistance bound line.

Corrections found at build, 2026-10-06:
- Step 1, printability. M01-T03 left open whether the floor reads the
  preset nozzle bore (0.40 mm, vendor) or the preset line width (0.42 mm,
  vendor). The def reads the bore of the machine's default preset
  (`machine(id).presets[0]`, ffc5p_20260819) times `prt.perimetersMin`
  (2, inferred): 0.80 mm, computed from inferred, so golden 4 keeps its
  tie. The line width would give 0.84 mm (computed) and break the tie.
  The reason is "nozzle bore 0.40 x 2 perimeters (preset ffc5p_20260819)":
  the count prints as a digit read from the row, since a word "two" is a
  number no test can trace (M01-T05 step 4). A machine with no preset is
  E_REF at /machine.
- Step 1, fatigue. The row is `<family>.flexFatigueWidthMin`, family being
  the material id before its first hyphen, so `cpla-protopasta` reads the
  `cpla` row; a family with no row has no fatigue floor. Reason "fatigue,
  cpla across layer lines under flex", source the row id, qualifier
  inferred (qualifyRow). The 3MF writer's slicer filament type reads the
  same family (core/src/commands/build.ts slicerType through profile
  materialFamily), so `cpla-protopasta` exports as PLA; it failed E_REF
  before.
- Step 1, pitch. The reason is "key pitch 8.0 minus 1.0 clearance each
  side", as M01-T05 corrected; facts only, so qualify([]) (computed, no
  basis).
- Step 1, resistance. The snippet's `profile.resistivityOhmCm` does not
  exist; the def reads `resistivity(material, "along", "printed")` and
  computes through profile `sectionResistance`, the one home of
  R = rho L / A (a range row reads its high end). The reason ends "(tier
  <tier>)" and the bound carries qualify([row tier]). `expectedFor` has
  the spec signature (dim, ceiling, ctx), rounds the fitting budget up to
  the ohm (71760; the snippet's Math.round gives 71759, which does not fit
  6.00 mm, computed) and names nextDim conductor.t, which M01-T05 withholds
  until a conductor.t def lands. Lineage row
  circuit.trace-resistance-floor/m01-card-snippet records the snippet.
- The test lives at packages/circuit/test/trace-resistance-floor.test.ts:
  src compiles to dist and vitest reads packages/*/test only (as M01-T04
  found). core/test/trace-width-budget.test.ts adds the CLI goldens, the
  three other defs, and parity against the committed goldens with a
  tampered copy that must fail.
- Step 3. Parity wrote only the four JSON goldens. Query goldens are now
  parity goldens declared in queries.json (D-228); `hbf parity --accept`
  wrote query-1.json to query-4.json, build.json, report.json, edit.json
  and artifacts.json once at SOURCE_DATE_EPOCH 315532800. Default edit:
  /w 3.25 to 3.30 mm.
- Step 2, open. The param form cannot reach golden 1 yet. A stage design
  has no feature generator until the conductor kind is admitted (M05); the
  M-S draft kinds load for reference/keys/flex-pair only (D-179,
  DRAFT_KIND_DIRS). With a conductor feature the build fails E_KERNEL, so
  build.ts carries none, /w reaches no feature, and `constraints.query
  --chase reference/electrical/trace-width-budget` answers /w unbound
  "no-feature". envelope.json is not written. Acceptance line 2 waits on
  the conductor kind's admission, or a decision letting this reference
  load the draft conductor kind. Rechecked 2026-10-06: still unbound
  "no-feature", exit 0. No later card named the carry, so M05-T17 step 7
  now holds it (conductor feature in build.ts, envelope.json accepted,
  acceptance line 2 run).
- Step 2, build. The trace is drawn 62.0 x 3.25 x 0.72 mm on the prism
  route; the width default 3.25 mm is the first 0.05 mm step at or above
  the 3.23 floor (computed). The top is not snapped to the layer grid; it
  sits on the 1/1024 mm grid where ffc5p_20260819 prints 0.73 mm
  (computed). Volume 144.933 mm3 (computed by the build), under the 145.08
  mm3 drawn box (computed). Cause, checked 2026-10-06 from `hbf
  part.build --detail full`: the built bbox is 61.998 x 3.248 x 0.7197 mm
  (computed), so the mesh snap moves each side wall in by 1/1024 mm and
  the top down to 737/1024 mm, and 61.998 x 3.248 x 0.7197 = 144.933
  (computed). The drawn ring itself is exact (area 201.5 mm2, computed).

Files created or changed, as built: the four def files above, each owning
package's `constraintDefs` export in its index, packages/circuit/test/
trace-resistance-floor.test.ts, core/test/trace-width-budget.test.ts,
core/src/commands/parity.ts (query goldens), core/src/commands/build.ts
(slicerType by family), reference/electrical/trace-width-budget/
(chase.ts, build.ts, tsconfig.json, queries.json, expected/ with the four
query goldens and the four parity JSON goldens; README.md), tsconfig.json
(the reference), lineage.json, docs/plan/DECISIONS.md (D-228).

Done when: the plan's corrected example reproduces from the CLI, both the
satisfiable and the E_UNSAT form.

## M01-T07 Click-spring window and CHK-KEY-04

Goal: the rise window over Q is an FE-backed interval with its criteria
stated, the lower bound is computed by the solver and recorded, and the
seed row of CHK-KEY-04 carries the D-071 wording (C-04).

Inputs:
- packages/sim/src/fe/ (M01-T01, M01-T02)
- packages/profile rows from M01-T03 (strain by bend direction, click.dropMin)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json (CHK-KEY-04 v1.0.0: "rise between 2.0 and 2.4 x t", origin "rise 2.4 latches, under 2.0 stops snapping", kinds detent)
- fab-knowledge:synthesis/verified-claims.md line 84
- ../CHECKS.md (CHK-KEY-04 rewrite)

Steps:
1. Export `sim/click-spring-window` naming dim `spring.Q`, kernels `sim`
   and `profile`, step 0.01, grid Q 1.00 to 2.60. For each grid Q run
   `clickRigid` and `clickReadout` with the declared l, t, w, E, sw. Cache
   by RFC 8785 hash of the inputs.
2. Criteria, each its own bound with a reason:
   - floor `snap`: first grid Q where `snap` is true and drop is above 0.
   - floor `drop`: first grid Q where drop is at least
     `constant("click.dropMin")` (0.5).
   - ceiling `strain`: last grid Q before eStop first exceeds the strain
     limit for the declared bend direction (in-plane 0.025 for PIP's beam,
     D-073), searched upward from the drop floor.
   - ceiling `bistable`: last grid Q before `bistable` first turns true.
3. The window is the contiguous run from the effective floor to the
   effective ceiling. If any grid point inside fails a criterion, the def
   splits the run and reports E_UNSAT with the failing Q (eStop is not
   monotonic, M01-T02).
4. Write the reference `reference/keys/click-spring-window/`: chase.ts
   declares PIP defaults; build.ts builds the double cosine arch as a
   prism (centreline offset by t/2 each side, extruded by w) on the M00
   prism route, with the FE readout as Part IR metrics (D-049);
   expected/ holds the query golden and the metrics.
5. Rewrite the CHK-KEY-04 seed row to version 2.0.0 (a verdict can flip on
   the same Part IR, so major): title "click spring rise Q inside the
   FE-backed window: snaps, drop at least click.dropMin, strain at the stop
   within the bend-direction limit, not bistable"; appliesTo kinds
   `spring` (D-059); needs `sim`, `profile`; legal kind interval; origin
   keeps PIP 2026-09 and the failure "0.6 beam reached 2.7 to 3.3 percent"
   and drops "under 2.0 stops snapping". The CheckDef itself registers at
   M04; M01 lands the seed row and the constraint that backs it.

Golden at PIP defaults (l 24, t 0.55, w 1.6, E 1900, sw 3, PETG in-plane),
computed, this card, on the 0.01 grid:

| bound | Q | evidence at the bound |
|---|---|---|
| floor snap | 1.16 | drop 0.000026, peak 0.917 N |
| floor drop (binding) | 1.72 | drop 0.509; Q 1.71 gives 0.499 |
| ceiling strain (binding) | 2.19 | eStop 2.495 percent; Q 2.20 gives 2.504 |
| ceiling bistable | 2.31 | Q 2.32 is bistable |
| legal | 1.72 to 2.19 | PIP default Q 2.0 inside |

D-071 states the upper bound as 2.2 and the lower bound as "between Q 1.55
(drop 0.335) and Q 2.0 (drop 0.765), computed at M01". The computed lower
bound 1.72 lies in that bracket. The strict criterion "eStop at most 2.5
percent" puts the upper bound at 2.19 on the 0.01 grid because Q 2.2 gives
2.504 percent, which D-071 quotes rounded as 2.50. The golden records 2.19
and the PR body lists this for DECISIONS.md under gaps.

Finding text the golden renders for Q 2.40 (all numbers computed):

```
FAIL CHK-KEY-04 spring.click1 on part body
  measured rise 2.40 x t
  legal    1.72 to 2.19 x t, nearest 2.19   (snaps, drop >= 0.50, strain <= 2.50 percent petg in-plane, not bistable)
  because  snapfe at l 24.0 t 0.55: strain 3.29 percent at 2.40; bistable from 2.32
  fix      set /clicky/Q = 2.19   predicts strain 2.50 percent, drop 0.91, pass
  origin   hbf://check/CHK-KEY-04   PIP 2026-09, 0.6 beam reached 2.7 to 3.3 percent
```

The fix line rounds eStop 2.495 to 2.50 and drop 0.9125 to 0.91; the
message-number test checks both against recomputation at 2 decimals.

Files to create:
- packages/sim/src/constraints/click-spring-window.ts, and
  packages/sim/src/constraints/index.ts exporting `constraintDefs`
- packages/sim/test/constraints/click-spring-window.test.ts (vitest runs
  packages/*/test only, and src/ compiles to dist)
- reference/keys/click-spring-window/chase.ts
- reference/keys/click-spring-window/build.ts
- reference/keys/click-spring-window/README.md
- reference/keys/click-spring-window/queries.json, declaring three query
  goldens (D-228): expected/query-pip.json, expected/query-l22.json,
  expected/query-across.json
- reference/keys/click-spring-window/expected/build.json, report.json,
  edit.json and artifacts.json (parity compares all four, D-227)
- reference/keys/click-spring-window/test/reference.test.ts and tsconfig.json
- packages/checks/seed/checks.seed.json (CHK-KEY-04 row)
- packages/checks/test/seed-conformance-key04.test.ts

Acceptance:
- `npx --no-install hbf constraints.query spring.Q --material petg --facts l=24,t=0.55,w=1.6,E=1900,sw=3,bend=inPlane --json`
  exits 0 with legal 1.72 to 2.19, binding floor `drop`, binding ceiling
  `strain`.
- The same query with `l=22,t=0.5` exits 0 and its golden is recorded
  (bounds not stated in any source; recorded as computed by the port).
- The same query with `bend=acrossLayers` reads strain limit 0.015 and
  exits 1 with E_UNSAT, since eStop at the drop floor 1.72 is 2.007 percent
  (computed, this card) and exceeds 1.5 percent; expected names the drop
  and strain bounds.
- `npx --no-install hbf parity reference/keys/click-spring-window` exits 0.
- `npm test -w packages/checks -- seed-conformance` exits 0 with
  CHK-KEY-04 at 2.0.0. The seed schema test is
  tools/test/seed-conformance.test.ts (`npx vitest run
  tools/test/seed-conformance`); the workspace filter matches
  packages/checks/test/seed-conformance-key04.test.ts, which holds the
  CHK-KEY-04 row to step 5.
- Mutation: each of these, made in a scratch copy, fails
  `npx vitest run packages/sim/test/constraints reference/keys/click-spring-window`
  or the checks test: click.dropMin typed as 0.5 in place of the profile
  read, the bistable ceiling one step high, the split check removed, the
  strain search started at the grid bottom, the seed row at 1.0.0.

Done when: the window comes from the FE and the profile, and no fixed 2.0
to 2.4 constant remains in code or seed.

Corrections found at build, 2026-10-06:
- The upper bound 2.19 replaces D-071's 2.2 by D-229, which also states the
  split rule and the E fallback below.
- Step 4: the FE readout cannot be a Part IR metric of this build.
  build.ts imports only BUILD_IMPORTS (spec and the author surface, D-178)
  and `k.mech("click-spring-key")` is outside the slice until M06, so the
  window and its evidence are proved by the three query goldens, which
  parity reruns (D-228). build.ts carries the rise h = Q t as an
  informational metric. The arch is the clickElement2D helper of
  haft-src/src/model.js lines 683 to 694 (lineage
  pip.model/haft-9-click-spring-window), two arches on vb 0 and t + g,
  without the 0.4 mm run-out into the end blocks the reference does not
  build.
- Step 3: a failing grid point inside the run makes the def return a split
  floor one step above it and a split ceiling one step below it, so the
  solver answers E_UNSAT; a curve that does not converge is E_KERNEL naming
  the Q. The in-run recheck covers snap and drop only (written back
  2026-10-08): the strain ceiling is searched up from the drop floor and
  the bistable ceiling stops before the first bistable point, so neither
  can fail inside the run; step 3's "any criterion" holds for those two.
- Reasons print only facts, profile numbers and the def's own bound values
  (M01-T05 message numbers), so the FE evidence of the golden table (drop
  0.509, eStop 2.495) and the reason text of AGENT-SURFACE.md example D are
  not in the bound reasons; the sim test checks that evidence against
  clickReadout. Bound kernels: snap, drop and bistable `sim`, strain
  `profile`, as AGENT-SURFACE.md example D draws them; the def lists both.
- Acceptance 3: no single fact moves the drop floor, so the def has no
  expectedFor and E_UNSAT carries the solver's "a floor at most 1.71 x t,
  the ceiling"; the golden's binding indexes name the drop floor 1.72 and
  the strain ceiling 1.71.
- E is optional in facts: absent, the def reads the material's modulusMPa
  row (petg 1900, inferred). bend has no default: absent is
  E_PARAM_MISSING at /facts/bend.
- The finding text's fix line reads `set /clicky/Q`; the chase fields are
  flat, so the pointer is `/Q`. M04 writes the fix line from the chase.
- spec names the dim two ways: this card and CHECKS.md 7.4 use `spring.Q`,
  while spec/constraints.ts ConstraintDim and SpringFeature.riseQ say
  `spring.riseQ`, and SpringFeature still quotes the upper bound as 2.2.
  The def registers `spring.Q`; M06, which admits the spring kind, binds
  riseQ to it and corrects the spec comments.
- Finding text: M01 renders no finding (the CheckDef registers at M04), so
  no message-number test at M01 renders the Q 2.40 text. The sim test
  recomputes its numbers from clickReadout at 2 decimals (strain 3.29 at
  2.40, bistable from 2.32, fix Q 2.19 with strain 2.50 and drop 0.91, all
  computed); the M04 message-number test renders the whole finding.
- build.ts takes the arch height from Math.cos at the 65 turn fractions
  i/64. D-175 binds kernel generators to the unit-circle table and the
  author surface offers only `k.ring.circle`, whose points snap to the
  1/1024 mm grid before a caller can scale them, so the arch keeps
  Math.cos. Parity runs in node only; the browser determinism legs (D-175,
  M00-T14) have not built this reference (not run).

## M01-T08 CHK-NET-05 as an interval on the pullup

Goal: a printed button's readability is an interval on the pullup given the
path resistance and the receiving MCU's VIL, and it feeds the trace-width
budget (C-02, D-076).

Inputs:
- spec/circuit.ts (McuPinSpec, PinState)
- fab-knowledge:synthesis/verified-claims.md line 71 (RP2040 datasheet pp. 616 to 617; ESP32-C3 datasheet v2.4 p. 55)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json (CHK-NET-05 v1.0.0, origin BLOCKS 2026-08 "45k pullup lands undefined")
- ../CHECKS.md (CHK-NET-05 rewrite)

Steps:
1. Add MCU rows with provenance at `packages/catalog/data/mcu-pins.json`,
   the path PACKAGES.md 4.3 names for M05, read through `@hackbuild/catalog`
   `mcuPinRow`; M05 completes each row to McuPinSpec with identical values
   (D-076). A test fixture cannot serve the CLI acceptance line (defect 1):

| mcu | VDD V | pullup ohm | VIL max V | VIH min V | tier | source |
|---|---|---|---|---|---|---|
| rp2040 (Pico inherits, not separately checked) | 3.3 | 50000 to 80000 | 0.8 | 2.0 | vendor | RP2040 datasheet pp. 616 to 617 |
| esp32-c3 | 3.3 | 45000 typical | 0.825 | 2.475 | vendor | ESP32-C3 datasheet v2.4 p. 55 |

2. Export `circuit/pullup-low-read` naming dim `port.pullup` (ohm). A
   pressed key pulls the pin to ground through the printed path R; the pin
   reads LOW when `VDD * R / (R + Rpu) <= VIL`, so the floor is
   `Rpu >= R (VDD - VIL) / VIL`. Reason "pressed path <R> ohm reads LOW
   only above <floor> ohm at VIL <VIL> V".
3. Ceiling: for an internal pullup, the MCU's pullup maximum (rp2040
   80000; esp32-c3 45000, the typical value, single point). For an
   external resistor the ceiling is a declared fact `pullupCeilOhm`; with
   neither, E_PARAM_MISSING at /facts/pullupCeilOhm. The read-time ceiling
   from tau arrives with read models at M05 (D-078).
4. Verdict: the pullup range must lie inside the interval; the worst case
   for LOW is the range minimum, so measured is the range minimum.
5. Inverse: `expectedFor` returns the largest path R that reads LOW at the
   range minimum, `Rmin_pu * VIL / (VDD - VIL)`, and this value becomes
   `netBudgetOhm` for `conductor.width` when the query declares `mcu`
   instead of a budget (cross-kernel chain).
6. The BOSS legacy threshold (single 0.5 VIO, 50 kohm) and the blocks.html
   0.3 to 0.7 VIO hint are not used here; they exist only for the M05
   reproduction (D-076, D-077).
7. Rewrite the CHK-NET-05 seed row to version 2.0.0 with the CHECKS.md 7.5
   title "printed button reads LOW when pressed: pullup range inside the
   interval set by path resistance and the MCU VIL max" (defect 4);
   appliesTo feature kind `port`; needs `circuit`, `profile`; legal kind
   interval; constraint `circuit/pullup-low-read`; status entered, pending
   M05; origin BLOCKS 2026-08 with what "BOSS sim at 50 kohm and one
   0.5 VIO threshold read 2.05 V as HIGH; RP2040 band 0.8 to 2.0 V".

Goldens, all computed from the formula above with the fixture rows:

| golden | mcu | path R ohm | floor ohm | ceiling ohm | measured (range min) | verdict | note |
|---|---|---|---|---|---|---|---|
| N1 | rp2040 | 10000 | 31250 | 80000 | 50000 | pass | largest passing path R is 16000 |
| N2 | rp2040 | 20000 | 62500 | 80000 | 50000 | fail | nearest 62500; pullup is internal, so no fix, next is conductor.width |
| N3 | rp2040 | 30000 | 93750 | 80000 | 50000 | E_UNSAT, exit 1 | expected "path at most 25600 ohm at pullup 80000" |
| N4 | esp32-c3 | 10000 | 30000 | 45000 | 45000 | pass | largest passing path R is 15000 |
| N5 | esp32-c3 | 16000 | 48000 | 45000 | 45000 | E_UNSAT, exit 1 | expected "path at most 15000 ohm at pullup 45000" |
| chain C1 | rp2040, conductor.width, cpla-protopasta 30 ohm cm, 62 mm, 0.72 | budget 16000 | width floor 1.62 mm | 6.00 | | legal 1.62 to 6.00 | binds floor resistance (via CHK-NET-05) |
| chain C2 | rp2040, conductor.width, cpla working 500 ohm cm, 62 mm, 0.72 | budget 16000 | width floor 26.91 mm | 6.00 | | E_UNSAT | expected "at least 71760 ohm at width 6.00", which no rp2040 internal pullup reaches |

Files to create:
- packages/catalog/data/mcu-pins.json, packages/catalog/src/mcu.ts (defect 1)
- packages/circuit/src/constraints/pullup-low-read.ts
- packages/circuit/test/pullup-low-read.test.ts (defect 2)
- core/test/chain-net05-width.test.ts
- packages/checks/seed/checks.seed.json (CHK-NET-05 row)
- packages/checks/test/seed-conformance-net05.test.ts, lineage.json row checks.seed/hbf-handoff (defect 8)

Files changed outside the list: packages/circuit/src/constraints/trace-resistance-floor.ts
(the chain, defect 5), core/src/commands/constraints-query.ts (defect 3),
packages/circuit/src/release.ts (classify and pullupEnds take the row fields
they read, so the one pullupEnds serves the catalog row).

Acceptance:
- `npm test -w packages/circuit -- pullup-low-read` exits 0 over N1 to N5.
- `npx --no-install hbf constraints.query port.pullup --facts mcu=rp2040,pathOhm=10000,pullup=internal --json` exits 0, legal 31250 to 80000.
- `npx --no-install hbf constraints.query conductor.width --material cpla-protopasta --facts mcu=rp2040,pullup=internal,pathMm=62,tMm=0.72,flexes=true,pitchMm=8.0,pitchClrMm=1.0 --json` exits 0, legal 1.62 to 6.00.
- `npm test -w core -- chain-net05-width` exits 0 over C1 and C2.

Done when: a pullup and a trace width are answered by one query chain from
the MCU row to the printed section.

Card defects found at build, 2026-10-06, and what was built:

1. Step 1 put the MCU rows in a circuit test fixture, but the second
   acceptance line queries `mcu=rp2040` from the CLI, which cannot read a
   test fixture. The rows live at `packages/catalog/data/mcu-pins.json`
   (PACKAGES.md 4.3, D-076 catalog rows) with only the fields a pullup read
   needs (`McuPinRow`, a Pick of McuPinSpec); M05 adds inputCap, leakage and
   the boss-legacy row. The test checks the rp2040 row against the M-S
   fixture `packages/circuit/test/fixtures/rp2040.ts`.
2. The test file was listed under `src/`, where tsc compiles it into dist
   and the root vitest include does not reach. It is
   `packages/circuit/test/pullup-low-read.test.ts`.
3. The second acceptance line passes no `--material`, and the M01-T05 dim
   form refused every query without one. The dim form now asks for a
   material only when a def on the dim lists the `profile` kernel;
   `port.pullup` lists `circuit` only.
4. Step 7's title disagreed with CHECKS.md 7.5 and section 6; the seed row
   carries the CHECKS.md title and the 7.5 target kind `port` (was
   `conductor`). The origin keeps "BLOCKS 2026-08" as CHECKS.md writes it;
   verified-claims C5 dates the BLOCKS sources 2026-09-13, an open
   correction for CHECKS.md, not made here.
5. Step 5's chain needs the resistance floor to read the budget, which
   M01-T06 owns. `circuit/trace-resistance-floor` reads a declared
   `netBudgetOhm` first, and with none and `mcu` declared it reads
   `pullupPathBudget`, the largest whole-ohm path that reads LOW at the
   pullup range minimum (rounded down, so the budget never admits an
   UNDEFINED read). The bound's reason names the MCU, pullup and VIL; its
   basis is the lower of the resistivity and pin row tiers. E_UNSAT keeps
   path `/facts/netBudgetOhm`, the fact that overrides the chain.
6. Steps 3 and 4 left the external case's measured value open. An external
   resistor declares `pullupOhm` (measured is that one point) and
   `pullupCeilOhm`; a missing numeric fact raises E_PARAM_MISSING at its own
   pointer from the def, since the solver's fallback names the first
   non-numeric fact read, `mcu`.
7. The C1 legal "1.62 to 6.00" is the printed form. `conductor.width`
   declares no grid step, so the JSON legal is the unrounded 1.6146 to 6
   (computed) and the text mirror prints 1.62 to 6.00.
8. Step 7 named no test for the seed row and no lineage row for the seed
   it rewrites, so a mutated title, kind or constraint failed nothing.
   `packages/checks/test/seed-conformance-net05.test.ts` reads version,
   title, kind, needs, constraint and failure from CHECKS.md 7.5, and
   lineage row `checks.seed/hbf-handoff` (dest
   `packages/checks/seed/checks.seed.json`) records the rewrite. CHECKS.md
   section 6 lists CHK-NET-05 needs as `circuit` only while 7.5 and step 7
   say `circuit`, `profile` (the D-081 tier rule reads the resistivity
   row); the seed follows 7.5, and the section 6 cell is an open
   correction for CHECKS.md, not made here.
9. Both circuit defs round a computed ohm value to a whole ohm; they share
   `whole` in `pullup-low-read.ts` (relative tolerance 1e-9, then up or
   down), so the 71760 and 25600 expected lines come from one rounding.

## M01-T09 OGEE R16-P fits table as intervals, and fits.table

Goal: the OGEE R16-P fits table reproduces as intervals with the same
bounds, classes and reasons as fits.py, every row in band, and fits.table
prints it.

Inputs:
- fab-work-directory:benches/ogee16/outputs/ogee16-source.zip, members source/fits.py (5710 B, 2026-08-17), source/kin.py, source/params.scad
- fab-knowledge:synthesis/plan-deltas.md R57 (fit bands row, PRINT_OVER row)
- ../PROFILE.md (fits and loss, D-100)

Steps:
1. Run the legacy table first and save its stdout as the parity source:
   `unzip -o -q ogee16-source.zip -d <tmp> && cd <tmp>/source && uv run --project <repo>/tools/py python fits.py`
   (exit 0, prints "ALL FITS IN BAND"; needs no third-party packages,
   measured on the writer's machine 2026-10-04, and through uv on Python
   3.14.8 at build 2026-10-06; RULES.md runs Python through
   `--project tools/py`, never bare python3).
2. Port the table as a legacy fit model `ogee16-fits-v1`: LOSS 0.25 flat,
   bands on drawn clearance, SNAP and PSLIDE rows reported without the loss
   column applied, tolerance 1e-9 on band edges (fits.py line "lo - 1e-9 <=
   drawn <= hi + 1e-9"). Parity comes before the D-100 unified loss table;
   both run, and the difference is reported as a metric labelled
   informational (D-075).
3. Class names: PSLIDE in fits.py is the mixed printed-in-cut class; D-100
   names it PSLIP and drops PSLIDE. The golden stores `class: "PSLIP"` and
   `legacyClass: "PSLIDE"`.
4. Band provenance (D-099): SLIDE 0.70 to 0.90 carries method `felt`
   ("bands moved up 0.20 after they still feel tight", fits.py); the other
   bands carry method `derived` with fits.py as source. Every row's reason
   is the fits.py row name plus the class meaning from its docstring.
5. Each row is an interval on the hole: legal hole = shaft + band. The
   reference reports both clearance and hole intervals.
6. Register `fits.table` in group prove (D-106): input `build`, a chase
   path or id; output `{rows: FitRow[]}` (spec/commands.ts), each row
   carrying measured drawn clearance, the legal band, class, legacyClass,
   hole, shaft, the legal hole interval and the D-100 comparison. Each row
   is also a CHK-FIT-01 CheckResult (measured drawn, legal interval, reason
   as constraint; id, version and severity from the check seed), counted in
   `counts`; `findings` carries fail and warn only (AGENT-SURFACE.md 6.1).
   Exit 0 when every row is in band, 1 otherwise.
7. Write `reference/fit/ogee16-r16p/`: chase.ts declares the params that
   fits.py reads (T 3.0, FIT_SLIP 0.40, PRINT_OVER 0.15, FIT_PSLIP 0.70,
   FIT_LAP 0.15, FIT_TEN 0.15, FIT_BORE 0.40, LUG_W 12, TAB_W 10,
   FIT_SLIDE 0.75, FIT_LOCATE 0.30, FIT_PRESS 0.10, SHAFT_D 8.0, LTAB_W 8.0,
   PRINT_SHRINK 0.05, and the derived bores); build.ts emits the 18 rows as
   Part IR metrics (D-049). As built, FIT_PSLIP is a derived field
   (FIT_SLIP + PRINT_OVER + PSLIP_GIVE 0.15, params.scad line 31), as is
   CAP_FIT (CAP_GIVE 0.50 + PRINT_OVER, line 107); the chase also declares
   ROD_D 3.0, LUG_GRIP 0.10 (LUG_BORE = ROD_D - 0.10, line 113), CAP_D 16,
   PIN_W 10, LUG_P 1.25, NOTCH_W 4.45, SLOT_E 6.05, the barb literals of
   fits.py line 62 as BARB_D 3.8, BARB_OVER 0.10 and BARB_UNDER 0.15, and
   COUPON_WALL 2.0; FIT_SLIDE carries constraintDim fit.drawn for the parity
   edit. If spec/build.ts requires at least one body,
   build.ts builds the first row as a two-body coupon (8.00 mm shaft in an
   8.75 mm bore) on the prism route.

Golden rows (drawn values computed by fits.py from params.scad; all 18 in
band):

| fit | hole mm | shaft mm | drawn mm | class | band mm | after 0.25 loss mm |
|---|---|---|---|---|---|---|
| crank shaft in its wall bore | 8.75 | 8.00 | 0.75 | SLIDE | 0.70 to 0.90 | 0.50 |
| knob on the shaft D | 8.10 | 8.00 | 0.10 | PRESS | 0.00 to 0.16 | -0.15 |
| crank drive pin in the yoke slot | 3.40 | 2.65 | 0.75 | SLIDE | 0.70 to 0.90 | 0.50 |
| crank drive pin in the crank bore | 3.40 | 3.40 | 0.00 | PRESS | 0.00 to 0.16 | -0.25 |
| link turning on its pivot | 3.40 | 2.65 | 0.75 | SLIDE | 0.70 to 0.90 | 0.50 |
| pivot shank in the lug bore | 2.90 | 2.65 | 0.25 | LOCATE | 0.25 to 0.40 | 0.00 |
| pivot barb forced through the lug | 2.75 | 3.90 | -1.15 | SNAP | -1.30 to -0.15 | -1.15 (not applied) |
| printed lug in the cut deck slot | 3.70 | 3.15 | 0.55 | PSLIP (was PSLIDE) | 0.45 to 0.70 | 0.55 (not applied) |
| printed lug, along the deck slot | 12.70 | 12.15 | 0.55 | PSLIP | 0.45 to 0.70 | 0.55 (not applied) |
| printed rod in the cut face slot | 3.70 | 3.15 | 0.55 | PSLIP | 0.45 to 0.70 | 0.55 (not applied) |
| printed rod in the cut latch slot | 3.70 | 3.15 | 0.55 | PSLIP | 0.45 to 0.70 | 0.55 (not applied) |
| printed cap in the cut face pocket | 17.57 | 17.07 | 0.50 | PSLIP | 0.45 to 0.70 | 0.50 (not applied) |
| cap pressed on the rod tenon | 3.15 | 3.00 | 0.15 | PRESS | 0.00 to 0.16 | -0.10 |
| latch plate in its rail groove | 3.65 | 2.90 | 0.75 | SLIDE | 0.70 to 0.90 | 0.50 |
| pull knob on the latch tab | 8.10 | 8.00 | 0.10 | PRESS | 0.00 to 0.16 | -0.15 |
| deck tab in its wall slot | 10.25 | 9.90 | 0.35 | LOCATE | 0.25 to 0.40 | 0.10 |
| frame tab in its frame slot | 10.25 | 9.90 | 0.35 | LOCATE | 0.25 to 0.40 | 0.10 |
| servo bracket tab in the base | 3.25 | 2.90 | 0.35 | LOCATE | 0.25 to 0.40 | 0.10 |

The crank-bore row sits on the PRESS floor (drawn 0.00, computed as
CRANK_BORE minus CRANK_BORE, so exactly zero: the 1e-9 tolerance does not
decide it, corrected at build 2026-10-06); the profile test asserts the
tolerance at both band edges. The cap pocket row is hole 17.575 and shaft
17.075 (computed); the table prints them cut to two decimals. The seed
CHK-FIT-01 origin says "seven of seventeen pairs out of band"; the shipped
table has 18 rows, all in band, after the R16-P fixes.

Files to create:
- packages/profile/src/fits/ogee16-fits-v1.ts
- packages/profile/src/constraints/fit-band.ts
- core/src/commands/fits-table.ts
- reference/fit/ogee16-r16p/chase.ts
- reference/fit/ogee16-r16p/build.ts
- reference/fit/ogee16-r16p/README.md
- reference/fit/ogee16-r16p/expected/fits.json
- reference/fit/ogee16-r16p/expected/build.json
- reference/fit/ogee16-r16p/legacy/fits.stdout.txt (with sha256 of ogee16-source.zip)
- added at build: reference/fit/ogee16-r16p/legacy/fits-slide055.stdout.txt
  (fits.py with the FIT_SLIDE edit), reference/fit/ogee16-r16p/legacy/fits_golden.py
  (the one writer of expected/fits.json, from fits.py), the parity goldens
  expected/report.json, edit.json and artifacts.json,
  reference/fit/ogee16-r16p/{tsconfig.json,test/reference.test.ts},
  packages/profile/test/fit-band.test.ts; edits to core/src/registry.ts
  (CommandDef and CLI form), core/src/text.ts (row lines), core/test/surface.test.ts
  (M01_PENDING emptied), packages/profile/src/index.ts, the root
  tsconfig.json and lineage.json

Acceptance:
- `npx --no-install hbf fits.table reference/fit/ogee16-r16p --json` exits 0 with 18
  rows, counts pass 18 and an empty findings list (findings hold fail and
  warn only).
- A test compares each row's name, drawn, class, band and verdict with
  legacy/fits.stdout.txt; exit 0.
- Changing FIT_SLIDE to 0.55 in a test copy of the chase gives exit 1 with
  5 rows out of band, matching fits.py run with the same edit (computed,
  this card, legacy exit 1): the four SLIDE rows (crank shaft, yoke slot,
  link pivot, latch plate) at drawn 0.55 against 0.70 to 0.90, and the
  pivot shank in the lug bore at drawn 0.05 against LOCATE 0.25 to 0.40,
  because the pin shank diameter is LINK_BORE minus FIT_SLIDE. This is the
  one-edit delta of the parity triple.
- `npx --no-install hbf parity reference/fit/ogee16-r16p` exits 0.

Done when: the OGEE fits table prints from the registry with the same
bounds and reasons the bench printed.

Corrections found at build, 2026-10-06:
- expected/fits.json is written by legacy/fits_golden.py from the bench's
  fits.py, never by the port or by parity, so the test compares the port
  with an independent source. It is not one of the four parity goldens of
  D-227; the README names its writer.
- The legacy model holds its bands in packages/profile with provenance per
  band; profile/fit-band reads it when facts name `fitModel`, and reads
  `drawnFor` over the D-100 loss rows otherwise (per side, doubled to the
  joint). Dims: `fit.drawn` (facts fitClass, fitModel, layerMm) and
  `fit.hole` (plus shaftMm; absent is E_PARAM_MISSING at /facts/shaftMm).
- The D-100 comparison is `unifiedReal` and `lossDelta` on each row, not a
  Part IR metric: build.ts imports spec and the author surface only
  (D-178), so the loss rows are read by fits.table. At the shipped params
  lossDelta is 0.15 mm on every row except the barb, 0.40 (computed).
- Lineage: ogee16.fits/r16p gains its dest and fixes, and four copy rows,
  ogee16.fits/bench-zip, ogee16.kin/bench-zip, ogee16.params/bench-zip and
  ogee16.printed/bench-zip, record the zip this card read. build.ts reads
  printed.scad lines 150 to 152 (PRINT_SHRINK, RAIL_GAP, fr()) for the edge
  factors 2 and 4; the printed row was missing until the audit recheck of
  2026-10-06.

Corrections found at the audit recheck, 2026-10-06:
- The unifiedReal and lossDelta test only asserted typeof number and
  lossDelta equal to real minus unifiedReal, both read from the port, so
  dropping the factor 2 in fits-table.ts unifiedReal passed every suite
  (mutation run in a scratch copy). The test now checks unifiedReal against
  the PROFILE.md 7.1 loss rows typed as its golden (0.40 mm across the
  joint for the petg layer 0.24 hole row, 0.15 for the laser and fdm row,
  computed) and lossDelta against the 0.15 and 0.40 stated above.

## M01-T10 Interval fixtures: TUMBLER cascade, OGEE LSV_X, COTTER hook rule

Goal: three recorded composition and placement rules from the corpus run
as interval queries with their reasons, so the solver is proven on
mechanical constraints beyond fits.

Inputs:
- fab-work-directory:benches/tumbler/outputs/tumbler.html lines 193 to 203 (material table and `G`), 2015 to 2024 (`depthOf`), 2108 to 2112 (slop, stroke, 1.2 mm warning), 2337 to 2338 (SLOP STACKS note)
- fab-work-directory:benches/ogee16/outputs/ogee16-source.zip member source/params.scad lines 176 to 186 (LSV_X comment and value), 143 and 148 (SV_L 22.8, SV_SHAFT_OFF 5.5), 175 (RAIL_X1 136); member source/check_servos.py lines 25 to 40
- fab-knowledge:evidence/x/cotter-src/src/geo.js line 102 (`GEO.hookRule`)
- fab-knowledge:evidence/x/cotter-src/tools/hook_fit.py lines 81 to 111 (`design`, `design_full`, `verify_all`)
- fab-knowledge:synthesis/plan-deltas.md R56

Steps:
1. `mech/cascade-slop`, dim `cascade.depth` (integer, step 1): stacked
   slop = depth x (kerf k + fit c), warn above 1.2 mm with the message
   "deep chain, add a restoring lever"; input stroke needed = depth x 10
   mm (tumbler.html:2108). Floor 0, reason "a block with no input wire has
   depth 0" (`depthOf`, tumbler.html:2015). Ceiling = floor(1.2 / (k +
   c)). Severity warn
   (D-067), since TUMBLER warns and does not refuse. The WHIFFLETREE
   module note at tumbler.html:1385 says slop doubles per stage; the code
   at line 2108 and the SLOP STACKS text at lines 2337 to 2338 are
   linear. The fixture follows the code and records the disagreement in
   its README. (Corrected 2026-10-06: line 1385 is the WHIFFLETREE note,
   not SLOP STACKS.) The 1.2 mm warn and the 10 mm stroke per stage are
   profile constants `cascade.slopWarn` and `cascade.strokePerStage`
   (inferred, PROFILE.md 10.1); the ceiling bound is 1.2 / (k + c) and
   the solver's one grid snaps it down to the whole depth. Zero slop per
   stage leaves the ceiling open (legal 0 to null).
2. `mech/ogee16-latch-servo-window`, dim `latchServo.x` (mm): floor 123.3
   "printed servo body must clear column servo 3, which ends at x 104.4";
   ceiling 125 "laser crank plus keeper washer must clear the +X rail at
   136" (params.scad comment). LSV_X 124 is the shipped value, inside.
   Both bounds are encoded as stated in the source with method derived.
   The floor decomposes as 104.4 + 5.5 (SV_SHAFT_OFF) + 11.4 (SV_L / 2) =
   121.3 at zero clearance, so 123.3 carries 2.0 mm the source does not
   name; the ceiling's decomposition is not in the source. Both gaps are
   listed in the fixture README as unknown, and the fixture never invents
   the missing terms. The four stated values (123.3, 125, 104.4 and
   RAIL_X1 136) are profile constants `ogee16.latchServoX.lo`, `.hi`,
   `ogee16.colServo3EndX` and `ogee16.railX1` (inferred, derived). The
   floor reason says "the last column servo" in place of "column servo
   3", because the message-number rule (M01-T05) finds no source for a
   bare 3. Severity block: 123.0 reads fail.
3. `mech/hook-rule`, dims `hook.d`, `hook.Rb`, `hook.sweep` from
   `GEO.hookRule(hole, tb)` with defaults fit 0.95, margin 0.35, rise 5.5,
   ext 2.0 (geo.js:102 and hook_fit.py design_full; hook_fit.py `design`
   alone defaults margin to 0.2, the fixture uses 0.35 as both callers
   do):
   - `hook.d` set to round(hole - 0.95, 2).
   - `hook.Rb` floor: smallest Rb from d/2 + 1.0 in 0.25 steps with inner
     radius above tb/2 and bend clearance h = (Rb + d/2) - sqrt((Rb -
     d/2)^2 - (tb/2)^2) at most hole - 0.35.
   - `hook.sweep` floor: smallest whole degree from 20 with Rb (1 - cos a)
     + ext sin a + d/2 - hole/2 at least 5.5; ceiling 88 degrees (loop
     limit), E_UNSAT above it.
   The insertion proof by configuration-space search (hook_fit.py
   `verify_all`, 7 pairs) is an M02 card; M01 proves the closed form only.
   fit, margin, rise and ext are facts when given, else profile constants
   `hook.fit`, `hook.margin`, `hook.rise`, `hook.ext`; the search start
   and steps are `hook.bendStartOverRadius`, `hook.bendStep`,
   `hook.sweepMin` and `hook.sweepMax` (all inferred, PROFILE.md 10.1).
   The port takes Rb = start + k step (k whole, started from the closed
   form inner radius) in place of repeated addition, so a tight hole
   cannot loop forever; the 7 pairs equal the source floats. The source
   stops below 88 and returns 88 unchecked; the port also tests 88 and
   otherwise returns floor 89, so the query answers E_UNSAT at
   `/facts/rise` with the largest rise an 88 degree sweep locks. A fit at
   or under margin leaves no Rb and is E_SCHEMA at `/facts/fit`.

TUMBLER goldens (k, c from tumbler.html:193 to 203, bench values,
inferred):

| material | k mm | c mm | slop per stage mm | depth ceiling | depth 3 slop | depth 4 slop | depth 4 verdict |
|---|---|---|---|---|---|---|---|
| Delrin/POM 3mm (bench default) | 0.22 | 0.15 | 0.37 | 3 | 1.11 | 1.48 | warn |
| Cardboard 3mm | 0.30 | 0.15 | 0.45 | 2 | 1.35 | 1.80 | warn |
| PLA print 2mm | 0.00 | 0.15 | 0.15 | 8 | 0.45 | 0.60 | pass |

Stroke needed at depth 3 is 30 mm (computed, line 2108).

OGEE golden: latchServo.x legal 123.3 to 125.0, measured 124.0, pass;
LSV_X 123.0 gives fail with nearest 123.3.

COTTER hook goldens (computed, this card, from the closed form; the
search verification in hook_fit.py was not run by the writer. The builder
ran `hook_fit.py verify` on 2026-10-06 under `uv run --project tools/py`
with shapely 2.1.2: exit 0, all 7 pairs INSERTS):

| hole mm | board tb mm | d mm | Rb floor mm | bend clearance h mm | sweep floor deg |
|---|---|---|---|---|---|
| 6.35 | 6.35 | 5.40 | 11.45 | 5.9964 | 52 |
| 6.35 | 4.80 | 5.40 | 7.95 | 5.9807 | 62 |
| 6.35 | 3.20 | 5.40 | 5.20 | 5.9791 | 77 |
| 6.00 | 6.35 | 5.05 | 11.275 | 5.6464 | 53 |
| 6.00 | 4.80 | 5.05 | 7.775 | 5.6307 | 63 |
| 7.10 | 6.35 | 6.15 | 11.825 | 6.7464 | 52 |
| 7.10 | 4.80 | 6.15 | 8.325 | 6.7307 | 61 |

Files to create:
- packages/constraints/src/fixtures/cascade-slop.ts
- packages/constraints/src/fixtures/ogee16-latch-servo-window.ts
- packages/constraints/src/fixtures/hook-rule.ts
- packages/constraints/src/fixtures/README.md (sources, the two recorded disagreements, the unknown LSV_X terms)
- packages/constraints/src/fixtures/common.ts (fact reads, fact-or-constant, the severity to verdict map; added 2026-10-06)
- packages/constraints/src/fixtures/index.ts (exports `constraintDefs` for the core loader; added 2026-10-06)
- packages/constraints/test/fixtures.test.ts
- packages/constraints/test/legacy/hook-rule.py (the script the acceptance line names; added 2026-10-06)
- packages/constraints/test/legacy/hook-rule.py.stdout.txt (closed form run of hook_fit.py `design_full` for the 7 pairs)

Files changed (added 2026-10-06): packages/constraints/src/index.ts and
package.json (devDependency @hackbuild/profile for the test, lock entry to
match); packages/profile/data/constants.json and PROFILE.md 10.1 (the
constant rows above); lineage.json (dest on tumbler.bench/harvest,
ogee16.params/r16p, cotter.hook-fit/r5, new ogee16.check-servos/r16p and
copy rows for every file read); tools/test/lineage.test.mjs (fixtures in
PORT_SCOPE).

Acceptance:
- `npm test -w packages/constraints -- fixtures` exits 0 over every row of
  the three tables.
- packages/constraints/test/legacy/hook-rule.py.stdout.txt is produced
  once by a script that copies `design` and `design_full` from
  hook_fit.py verbatim (hook_fit.py imports shapely at module level, so
  the file itself cannot be imported without it) and prints the 7 pairs;
  the TypeScript test compares to it.
- If the builder's Python has shapely, also run `python3 hook_fit.py
  verify` in the cotter-src tools directory and record its exit code in
  the PR body (expected 0; not run by the writer). Otherwise the PR body
  says "hook_fit.py verify: not run".
- `npx --no-install hbf constraints.query cascade.depth --facts kerf=0.22,fit=0.15 --json`
  exits 0 with legal 0 to 3 and the ceiling reason quoting 1.2 mm.
- `npx --no-install hbf constraints.query hook.sweep --facts hole=6.35,tb=3.2 --json`
  exits 0 with floor 77.

Done when: three corpus rules that lived in one bench each answer as
queries with their reasons attached.

Corrections found at build, 2026-10-06 (second pass):
- Step 3 said the 7 pairs equal the source floats, which holds, but it
  is silent off those pairs. Run in place against the canonical
  `GEO.hookRule` over 7357 points (hole 1.50 to 12.00 mm by 0.01, boards
  0.8, 1.6, 3.2, 4.8, 6.35, 9.5 and 12.7 mm), d is equal everywhere, 194
  Rb floors differ from the source's repeated addition by at most 4
  machine epsilon relative (computed; start + k step lands on the nearest
  double, repeated addition can sit one ulp off it), the sweep floor is
  equal wherever the source reaches the rise, and at the 1410 points
  where the source returns 88 unchecked the port answers E_UNSAT
  (computed). fixtures.test.ts runs this grid; the fixture README records
  it.
- The tests also needed an independent check of the depth ceiling
  against the bench's own status line: for each of the 9 MATS rows,
  depths 0 to 24 read warn exactly where `dep*(G.k+G.c) > 1.2` does in
  tumbler.html (Acrylic at k 0.15 sits on the edge at depth 4, slop 1.20,
  pass). A case at hole 6, tb 3, fit 1, margin 0.5 puts h exactly at hole
  less margin on the Rb grid (Rb 5, computed), so a search that starts
  past the closed form fails a test.
- knowledge/designs/cotter.md row "peg hook rule (closed form)" still
  says the fixture file is named but absent; it now exists. The record is
  outside this card's files and is left to its owner.

## M01-T11 Exit housekeeping

Goal: M01 closes green under the Part 3 rules of MILESTONES.md.

Inputs:
- ../MILESTONES.md Part 3
- tools/counts.mjs, tools/tiers.json, tools/lint-voice.mjs

Steps:
1. Run the full CI set: house-rules, typecheck, derived, tiers, seed, unit,
   property, contract, parity, determinism.
2. Determinism: the three references from this milestone build on ubuntu
   x64 and arm64 with equal mesh hashes and equal query JSON bytes
   (D-056).
3. Re-date the D-040 pin table; M01 adds no dependency, so the re-date is
   a check of the M00 pins.
4. Regenerate CLI.md, llms.txt and counts (D-010); the surface test pins
   the cumulative command count at M01 to MILESTONES.md 1.3.
5. PR body lists: working names (D-012), owner questions touched (none
   are decided here), the D-071 upper-bound rounding gap (2.19 vs 2.2),
   the TUMBLER note-versus-code disagreement, the LSV_X unknown terms, the
   SNAPFE stiffness tolerance, and every acceptance line that was not run.
6. Visual review (D-154): renders of the two new geometry references
   (trace prism, click arch) at desktop and 390 px, checkbox "I looked at
   the renders" ticked by a person.

Files to create:
- none; run dates and results go in the PR body against the Exit table
- tools/test/determinism-queries.test.mjs (see the corrections below)

Acceptance:
- Every CI job green on the PR.
- `node tools/lint-voice.mjs` exits 0.
- `node tools/counts.mjs && git diff --exit-code -- tools/reports/counts.json docs/plan/PLAN.md`
  exits 0 after staging (CI form: `git status --porcelain` prints nothing).
- `node --test tools/test/determinism-queries.test.mjs` exits 0 after `npx tsc -b`.

Done when: the owner can ask for the M01 merge with every exit row below
proven by a green job.

Corrections found at build, 2026-10-06:
- Step 2: the determinism legs hashed meshes, builds, artifacts and PNGs
  but no query output, so "equal query JSON bytes" had no id to compare.
  tools/determinism/hashes.mjs now writes `query:<reference>#<golden>`
  (sha256 of the bytes parity writes for each queries.json entry) and
  `fits:<reference>` (sha256 of `hbf fits.table --json` for a reference
  whose build emits FITS rows); tools/test/determinism-queries.test.mjs
  checks each query id against the committed golden bytes. The node
  legs are x64, arm64 and macos-14 (M00-T14), not x64 and arm64 only.
- Step 4: CLI.md has no generator before M12-T10 (`tools/gen-skill.mjs`)
  and llms.txt none before M12-T11 (`tools/gen-llms.mjs`), as the M01-T05
  correction records; at M01 only tools/counts.mjs regenerates. The
  surface test asserts M01_PENDING is empty.
- Exit rows had no CI job: the parity job ran only orca-3mf-roundtrip,
  so the click-spring-window and trace-width-budget parity rows and the
  fits.table row were proven by no job. The parity job now runs `hbf
  parity` over every reference holding chase.ts, and the fits.table
  exit command.
- Files to create was "none"; the card edits tools/determinism/hashes.mjs,
  .github/workflows/ci.yml, core/src/commands/parity.ts (queryGoldens
  exported, one implementation for parity and the legs),
  core/test/surface.test.ts, PLAN.md section 16 and PACKAGES.md 2.1 (the
  re-date), and creates tools/test/determinism-queries.test.mjs.
- Acceptance 3 used `git status --porcelain` prints nothing. Under D-006
  every staged file lists, so in the working tree the line is
  `node tools/counts.mjs && git diff --exit-code -- tools/reports/counts.json
  docs/plan/PLAN.md` after staging (MILESTONES.md 3.3); the porcelain form
  holds on a CI checkout only.
- Step 1, rerun 2026-10-06 after every M01 card landed: root `npm test`
  failed 2 of 1016 vitest cases on the 5000 ms default timeout (measured
  5312 ms and 6438 ms under the full parallel run; each passes alone). The
  click-spring query goldens in core/test/message-numbers.test.ts and the
  declared-E case in packages/sim/test/constraints/click-spring-window.test.ts
  now carry the 60_000 ms per-test timeout the other FE and CLI tests use.
  A test that runs SNAPFE sweeps sets that timeout when it is written.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| flat-arch stiffness 0.585396 vs theory 0.585394 N/mm, difference at most 3e-6 | computed | M01-T01 | `npm test -w packages/sim -- fe/snapfe` |
| PIP defaults: 2.527 N at 0.629 mm, drop 76.5 percent, contact 1.369 mm, eStop 2.31 percent | computed | M01-T02 | `npm test -w packages/sim -- click.parity` |
| l 22 t 0.5: 2.282 N, contact 1.245 mm | computed | M01-T02 | same |
| Q sweep: no snap 1.0, 1.1; snap from 1.2 (drop 0.01); drop 0.293 at 1.51, 0.303 at 1.52; eStop 2.495 at 2.19 and 2.504 at 2.2, 2.55 at 2.25; bistable false 2.31, true 2.32 | computed | M01-T02 | same |
| click-spring window 1.72 to 2.19 at PIP defaults, binding drop and strain | computed | M01-T07 | `npx --no-install hbf parity reference/keys/click-spring-window` |
| trace width legal 3.23 to 6.00 at 30 ohm cm, 62 mm, 0.72 mm, 8000 ohm | computed | M01-T06 | `npx --no-install hbf parity reference/electrical/trace-width-budget` |
| E_UNSAT at 500 ohm cm: floor 53.82, expecting 71760 ohm at 6.00 | computed | M01-T06 | same |
| 2000 ohm budget at 30 ohm cm: floor 12.92, 4306 ohm at 6.00 | computed | M01-T06 | same |
| CHK-NET-05 pullup goldens N1 to N5 and chain C1, C2 | computed from vendor rows | M01-T08 | `npm test -w packages/circuit -- pullup-low-read`, `npm test -w core -- chain-net05-width` |
| OGEE R16-P fits table: 18 rows, bounds, classes and reasons equal fits.py, 18 in band | computed | M01-T09 | `npx --no-install hbf fits.table reference/fit/ogee16-r16p --json` |
| OGEE LSV_X legal 123.3 to 125 | as stated in source | M01-T10 | `npm test -w packages/constraints -- fixtures` |
| TUMBLER cascade ceiling 3 at k 0.22, c 0.15; COTTER hook rule 7 pairs | computed | M01-T10 | same |
| every message number recomputes | computed | M01-T05 | `npm test -w core -- message-numbers` |
| CI green incl. house-rules, derived, tiers, determinism | n/a | M01-T11 | CI |

Decides: D-007, D-010, D-044, D-049, D-057, D-064, D-067, D-071, D-072, D-073, D-075, D-076, D-081, D-099, D-100, D-105, D-106, D-114, D-156
