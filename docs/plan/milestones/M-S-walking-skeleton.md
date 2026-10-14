# M-S walking skeleton

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: one reference, keys flex-pair, goes from chase.ts through build.ts,
Part IR, six checks and a 3MF to a print on ffc5p read on a Pico, before
the contracts it ran are frozen.
Depends on: M-1
Adopted dependency: manifold-3d 3.5.4, jszip 3.10.1 (MILESTONES.md 1.2,
D-040); both are M00 pins taken early
Commands added: part.build, check.run, export.run (kind 3mf), parity, on
draft contracts (MILESTONES.md 1.3)
Release at exit: none

hbf (working name) is the binary; only its CLI exists here. CHASE (working
name) is the typed design document. PIP (was HAFT) is the published
print-in-place controller at hackbuild/pip-controller (D-013). Every number
in this file carries a qualifier (D-007). The decision that adds this
milestone is D-179.

## Why this milestone exists

M-1 lands about two dozen spec files, 30 feature kinds, 11 registries, 30
commands, the export gate and loop detection as types, with no package code
behind them. A contract that is wrong at first contact with a real design
would force a coordinated rewrite of every plan document that copies it.
spec/README.md already lists choices made where the plan was silent, and
CANONS.md section 10 lists spec gaps. This milestone runs the thinnest path
through the system on one real design and one real print, then freezes only
what that path ran.

The path is the keys flex-pair reference (`spec/fixtures/keys-flex-pair.ts`,
api-library-ai-design.md 8.5): a PETG pad with cPLA traces, TPU 95A cones
and cTPU caps, four materials on four slots as PIP prints them (D-223), one
or two keys read by charge-release.

## Two exits

| exit | cards | who | what it unblocks |
|---|---|---|---|
| A, machine | M-S-T01 to M-S-T09 | builder | M00 starts; M00 completes the slices this milestone left thin |
| B, physical | M-S-T10, M-S-T11 | owner prints and reads; builder records | the spec freeze for every file the path ran; M04 starts |

Exit B waits on the owner's machine and time (D-082). M00 to M03 proceed on
draft contracts meanwhile; their cards treat a contract change forced by
exit B as an expected edit.

Since 2026-10-07 a virtual exit B stands in provisionally (D-234): the
preset "two" 3MF sliced headless by the Flash Studio CLI, its G-code read
back, and the probe sketch run on a host simulation (TESTING.md 2.7,
D-235). M04 proceeds on draft contracts on that basis. The physical exit B
stays open and is required before any public claim about the printed key
and before the freeze of any contract part only the print exercises.

## What stays thin here

| slice | here | completed at |
|---|---|---|
| profile | realGap, the ffc5p_20260819 layer grid, petg, cpla and ctpu rows | M00 (full lookup, read tracking) |
| mesh | prism and stack routes, meshHash per D-175; since D-223 the reference also runs the M00-T05 revolve route | M00 (raster, revolve, scope ownership, sweep) |
| feature kinds | draft defs for pocket, conductor, contact and port, outside `FeatureKindRegistryAt` | M03 (pocket), M05 (conductor, contact, port); `FEATURE_KIND_ADMISSION` does not move |
| circuit | nets from the declared conductor graph, 1D path resistance, charge-release operating point, the rp2040 McuPinSpec literal | M05 (voxel solve, net extraction from bodies, rp2040 row into catalog) |
| checks | six run bodies in a skeleton registry | M04 (86 seeded checks as CheckDef) |
| 3mf | writer from the seed with the 127-key template, SOURCE_DATE_EPOCH, seed validator `--overlap` | M00 (corpus, roundtrip, extraction, validator `--export` at M00-T09) |
| core | three commands and parity with CommandResult and exit codes; build.ts runs in process | M00 (TTY gate, source reader and sandbox of D-178, doctor and explain) |

## M-S-T01 draft marks and the plan-type lint

Goal: every spec file says whether it is draft or frozen, and plan
documents link to spec types instead of copying them.

Inputs:
- spec/README.md
- spec/*.ts
- docs/plan/*.md, docs/plan/milestones/*.md

Steps:
1. Add the status table of MILESTONES.md 1.5 to spec/README.md, one row
   per file: status (draft), first milestone that runs it, frozen parts.
2. Put `/** Status: draft until <milestone>. MILESTONES.md 1.5. */` as the
   first doc comment of each spec file.
3. Write `tools/lint-plan-types.mjs`: collect every exported type and
   interface name from spec/*.ts; scan fenced code blocks in docs/plan;
   fail on a `type <Name> =`, `interface <Name>` or `<Name> {` declaration
   whose name is a spec export. Output: file, line, name, spec file.
4. Run it over docs/plan and write the hit list to
   `tools/reports/plan-types.txt`. Each hit is replaced by a link of the
   form `spec/<file>.ts` (`<Name>`) in the next edit of that document; the
   lint runs in warn mode until the M00 exit, then blocks. At M-S start
   the hit list holds 25 entries over 38 docs (ARCHITECTURE 5, CANONS 8,
   CHECKS 5, M04, M06, M07, M08, M12 1 each, M15 2; measured with
   `--warn` in the M-1 audit tree); the M00 exit clears them.
5. Wire the lint into the house-rules job.

Files to create:
- tools/lint-plan-types.mjs
- tools/test/lint-plan-types.test.mjs
- tools/reports/plan-types.txt

Acceptance:
- npx -y -p typescript@7.0.2 tsc -p spec/tsconfig.json  -> exit 0
- node tools/lint-plan-types.mjs --warn  -> exit 0, hit list written
- node tools/lint-plan-types.mjs  -> exit 1 while the list is non-empty
- node --test tools/test/lint-plan-types.test.mjs  -> exit 0 (node:test, as
  the other tools/test .mjs files; the root vitest config includes
  tools/test/**/*.test.ts only; a fixture doc restating `CheckResult`
  fails, one linking to spec/checks.ts passes)

Done when: spec/README.md shows a status for every file and the hit list
exists.

## M-S-T02 profile slice

Goal: the numbers keys flex-pair reads come from profile rows with
provenance.

Inputs:
- packages/profile/seed/profile.seed.json (M-1-T07)
- docs/plan/PROFILE.md (machines, resistivity, per-MCU rows)

Steps:
1. Wire `ProfileLookup` (spec/profile.ts) over the seed for the rows below
   only.
2. ffc5p_20260819: first layer 0.25, then 0.24, line 0.42 (vendor).
3. Materials petg, cpla, ctpu. Resistivity rows come from PROFILE.md
   section 5 (`cpla.pip.along` 500, `cpla.pip.through` 2000,
   `ctpu.pip.bulk` 400 ohm cm; inferred, derived, D-081), added to the
   lookup as rows. The seed values 30 and 1500 are retired (PROFILE.md
   "Retired" paragraph) and are not read.
4. `realGap(drawnPerSide, side, machine, material)` with material-level
   loss (D-100), on the per-side basis of spec/profile.ts. Seed loss
   values are diametral and are halved on import into
   `LossRow.holeUnderPerSide` and `outerOverPerSide`. The machine-level
   fallback is 0.275 - 0.075 - 0.05 = 0.15 per side (computed). Both sides
   come from `realGaps`; `realGap` returns Mm.
5. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.

The rp2040 pin row moves to M-S-T05 (circuit slice).

Files to create:
- packages/profile/src/lookup.ts, realgap.ts
- packages/profile/test/skeleton.test.ts

Acceptance:
- npm test -w packages/profile  -> exit 0; realGap(0.275, 'hole', 'ffc5p',
  'petg') = 0.075 to 6 digits (computed; the D-100 joint, 0.55 drawn and
  0.15 real diametral, on the per-side basis of spec/profile.ts); layer
  tops 0.73, 1.45, 2.41 mm for the flex-pair stack (computed)

Done when: the build reads every number above through the lookup.

## M-S-T03 mesh slice

Goal: prism and stack bodies on manifold-3d with a stable meshHash.

Inputs:
- packages/mesh (M-1-T12 skeleton)
- spec/build.ts, spec/ids.ts

Steps:
1. Wire manifold-3d 3.5.4; prism from a ring and z range; stack as
   prisms with the D-047 stage order for one pre-union cutter (the
   pocket) and union positives.
2. Dyadic 1/1024 snap (D-054) and meshHash per D-175.
3. Free every wasm object the build creates; assert zero live objects
   after a build.
4. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.

Files to create:
- packages/mesh/src/routes/prism.ts, stack.ts, hash.ts (meshHash over
  sha256Hex from spec/jcs.ts; no sha256 of its own, ARCHITECTURE.md 3,
  D-206)
- spec/jcs.ts and spec/test/jcs.test.ts (RFC 8785 and NIST vectors, the
  one-canonicalizer lint), landing with the first hash
- packages/mesh/test/skeleton.test.ts

Acceptance:
- npm test -w packages/mesh  -> exit 0; two builds give one meshHash; a
  flipped mesh hashes different; live count 0

Done when: the pad body builds watertight with its pockets cut.

Card defect, written back 2026-10-08 (audit, packages/mesh lens): step 1
as built. The prism and stack routes are `prismMesh` and `stackMesh`
(`packages/mesh/src/routes/prism.ts`, `stack.ts`), constructive and
without CrossSection.extrude, and the D-047 stage order for a body runs
through `runStages` in `packages/mesh/src/stages.ts`, the one stage
runner; no separate `buildBody` or `bodySolid` runner exists, and
`BodyStages`, `BuiltBody`, `PrismDecl`, `stack` and `prism` left the
package. The pocket is a `preUnionCutters` entry of the runStages cutters
input (`StageInput.cutters[bodyId].preUnionCutters`).
`packages/3mf/test/skeleton.test.ts` builds pad, traces and cap1 through
runStages, each on its own one-body draft with the same stage 2 and 3
cutters, so stage 5 partition does not reshape them.

## M-S-T04 draft feature defs

Goal: pocket, conductor, contact and port generate geometry for keys
flex-pair through draft defs, outside the admitted registry.

Inputs:
- spec/features.ts, spec/feature-kinds.ts (FEATURE_KIND_ADMISSION)
- spec/fixtures/keys-flex-pair.ts

Steps:
0. Replace the cylinder cap in the flex-pair build.ts with the PIP flex
   key before any def is written
   (fab-knowledge:evidence/x/pip-controller/src/layout.js
   lines 35 and 149 to 159, model.js lines 61 to 66). The fixture cap is a
   revolved rectangle, a solid cylinder on the pocket floor (z 2.41 to
   5.77, computed, evidence/audit/m0/exec/logs/ms-t03-mesh.txt), and no
   body carries current through the 0.96 mm PETG isolation, so exit B
   could not read a press. The key is PIP's flex cone key (pip.md 5.1,
   D-223; model.js lines 61 to 88): a TPU 95A cone, slot 3, wall 0.6 at
   40 degrees, and its foot ring as one revolved profile from one layer
   into the body (z 2.17 at defaults) up to zf + cone, kink points
   inset 0.02 inside the well (CHK-KEY-06); a separate cTPU cap disc,
   slot 4, radius rnt + 0.3 = 2.88 and 0.72 thick, bridging the 3.6
   hole; the TPU key top (collar, 45 degree flare, 10 mm face) as a second
   revolved profile; and a well of radius wellR = rsb + 0.6 = 6.61 cut
   from the pad. Under the cap a split cPLA contact column, slot 2, of
   radius colR = max(0.9, hole/2 - 0.2) = 1.6 has two halves 0.8 apart
   (colGap): one half on K<n>, one on GND. The column rises from the
   trace band to colTop = zf + cone - gap, which is 2.41 + 4.08 - 1.84 =
   4.65 at defaults (computed; cone 4.0 snaps to 4.08, the cap underside
   sits at 6.49, the pad top at 8.41 and the face 2.657 above it). The
   key trace starts under its own half.
   A GND stub joins the bus to the other half. CHK-NET-02 is recomputed
   on the new layout. `contact.key<n>.gap` is the distance from the
   column top to the cap underside. A skeleton test asserts that distance
   equals the gap param to 1/1024 mm. The cone bonds to the floor, as in
   PIP.
1. Write each def with generate, its one skeleton check, fit and the
   reference `keys/flex-pair`, typed as `FeatureKindDef` but registered in
   `reference/keys/flex-pair/skeleton-kinds.ts`, never in the package
   registry.
2. The build types against `PartDraft`. `PartDraftAt<M>` refuses the four
   kinds, since no kind is admitted before M03.
3. Record every place the spec type fought the real geometry in
   `tools/reports/skeleton-findings.md` (file, type, what failed, the
   change proposed).
4. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.

Files to create:
- reference/keys/flex-pair/skeleton-kinds.ts
- tools/reports/skeleton-findings.md

Acceptance:
- npx tsc -b  -> exit 0
- a test that declares `pocket` in a design other than keys/flex-pair
  through `PartDraftAt<"M00">` fails to compile (fixture with
  `@ts-expect-error`)
- the skeleton test reads column top to cap underside equal to the gap
  param to 1/1024 mm

Done when: the four kinds generate on the reference only, and the key
section shows the split column under the cone cap.

Card defect, written back 2026-10-07 from the virtual print (D-236): step 0
says the pad top sits at 8.41 and the face 2.657 above it. That pad top
omits PIP's bezel term (pip-controller `src/layout.js` lines 223 and 231,
pip.md 4.3), which put the cap top five layers under the pad top, inside
the pad's top shells; Flash Studio then printed the pad's internal bridge
in PETG across both key tops over the cap (layer 30, 8.653 and 8.635 mm2,
computed). build.ts now subtracts PIP's bezel 2.4 mm (source): pad top
6.01, face 5.057 above it; cone 4.08, colTop 4.65, cap underside 6.49 and
gap 1.84 are unchanged (all computed). `test/reference.test.ts` holds each
cap underside at or above the pad top.

## M-S-T05 circuit slice

Goal: each key net gets a 1D path resistance and a charge-release
operating point against the rp2040 row.

Inputs:
- spec/circuit.ts, spec/chase.ts (hookup)
- docs/plan/PLAN.md section 9

Steps:
1. Nets from the declared conductor features and contacts; per-segment
   R = rho L/(w t) along the print plane (D-072).
2. Charge-release: drive high, float, discharge through the pressed path;
   report tau and the time to cross VIL max with node capacitance 7 pF
   pin (inferred,
   fab-knowledge:evidence/x/pip-controller/src/layout.js
   line 46, `cpin`); trace capacitance unknown until M05.
3. Classify LOW, UNDEFINED, HIGH at the hookup wait of 3500 us (inferred,
   D-079), sweeping both ends of the pullup range.
4. The rp2040 row is a McuPinSpec (spec/circuit.ts) literal at
   `packages/circuit/test/fixtures/rp2040.ts` with vendor provenance
   (D-076): pullup 50 to 80 kohm, VIL max 0.8 V, VIH min 2.0 V at 3.3 V
   (vendor). The circuit slice reads it. It moves into catalog at M05.
5. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.
6. The settle criterion is one table, `SETTLE_TAUS` in release.ts: 5
   time constants for a key, 3 for touch (pip-controller src/model.js
   lines 420 to 428). CHK-NET-29 (M-S-T06) imports it and keeps no copy.
   Every original release.ts cites (pip_stick.ino, model.js, layout.js)
   has a lineage row naming release.ts as dest. Defect found 2026-10-06
   in the M01 verify: net29.ts held a second settle table and release.ts
   had no lineage rows; packages/checks/test/skeleton.test.ts and
   tools/test/lineage.test.mjs now hold both.

Files to create:
- packages/circuit/src/path1d.ts, release.ts
- packages/circuit/test/fixtures/rp2040.ts
- packages/circuit/test/skeleton.test.ts

Acceptance:
- npm test -w packages/circuit  -> exit 0; preset "one": key trace 15 mm
  at 1.4 x 0.72 mm gives 74.4 kohm, GND bus 30 mm gives 148.8 kohm
  (computed from 500 ohm cm, inferred); cap and contact resistance
  reported as unknown until a coupon

Done when: circuit returns an OperatingPoint per key net with every number
qualified.

Card defects, written back 2026-10-07 from the virtual print's electrical
half (`fab-knowledge:evidence/virtual-print/electrical.json`):
- `packages/circuit/src/release.ts` line 71 takes the first flex-conductor
  body for every key, so K2's contact elements read `cap1` instead of
  `cap2`. The figures are unchanged (both caps are equal); the names are
  wrong.
- The 1D path charges each conductor's whole centreline, so both keys
  carry the full 44 mm GND bus (218254 ohm, computed). K2's stub joins the
  bus 17.1 mm from the port, so its geometric return is about 84800 ohm and
  its path about 231 kohm (computed); CHK-NET-29's K2 figure 364753.72 ohm
  overestimates it, contrary to its lower-bound wording. Splitting a shared
  conductor at the tap is M05 net extraction work; neither changes a
  verdict at these margins.

## M-S-T06 six checks

Goal: six checks return CheckResult with measured, legal, constraint and
origin on keys flex-pair.

Inputs:
- packages/checks/seed/checks.seed.json (M-1-T07)
- docs/plan/CHECKS.md rows for the ids below

| check | proves | expected at defaults |
|---|---|---|
| CHK-PRT-04 | wall thickness is a whole multiple of line width | skip, reason "infill wall": the 8.39 mm well-to-edge wall is thicker than 2 x walls x lineWidth (D-198, computed) |
| CHK-NET-02 | edge-level clearance between nets | 0.7559 mm bus to the K1 column half on PIP's 40-sided column (`model.js:65`), legal at least 0.60 (computed, skeleton-findings F-06) |
| CHK-NET-29 | charge-release path settles inside the wait | path lead 74.4 + two column halves 28.6 each + GND stub 14.9 + bus 148.8 kohm, 295.31 kohm in the report (computed, inferred rows, skeleton-findings F-05), plus cap and contact (unknown), legal 0 to rejectOhm = 3500 us / (5 x 7 pF) = 100 Mohm (computed, inferred wait and capacitance); a pass reports warn per CHECKS.md 9.4 |
| CHK-KEY-01 | flex cone contact gap | 1.84 mm, legal 1.632 to 2.04 (computed: 40 and 50 percent of the snapped cone 4.08) |
| CHK-3MF-06 | every component p:path resolves outside the root model | pass on the export |
| CHK-3MF-07 | per-filament vectors one element per slot, per-slot types | pass on the export |

Run bodies receive spec CheckCtx and the Part IR only (D-024). CHK-PRT-04
reads pocket walls from Part.features and host outlines from Body.outline
(D-224); the registry completes Body.outline from the draft until the
emitters fill it.

Both flex-pair keys are read by charge-release (the fixture hookup), so
CHK-NET-29 gates them. CHK-NET-05 applies only to ports read by `pullup`
(CHECKS.md 7.5) and does not run here.

Steps:
1. Write the six run bodies in `packages/checks/src/skeleton/` against
   `CheckDef` (spec/checks.ts), selected by appliesTo (D-173). Before the
   run bodies select on it, correct CHK-3MF-06 and -07 appliesTo.level
   from 'project' to 'artifact' in checks.seed.json to match CHECKS.md
   lines 531 and 532; both rows stay at version 2.0.0. Add a draft
   CHK-NET-29 row to checks.seed.json at version 1.0.0 with appliesTo
   level net, taken from CHECKS.md 9.4.
2. Message template per CHECKS.md; Fix with nearest from LegalValues.
3. One-param edit test: on the reference, gap 1.0 fails CHK-KEY-01
   with fix set /keys/0/gap = 1.64 (1.632 rounded up to the 0.02 param
   step, computed; core/test/skeleton.test.ts). The packages/checks test
   reads its defaults from the reference chase fields (D-223: face 10,
   cone 4 built at 4.08, travel 1.84, four slots) and asserts the same
   fix 1.64 with legal 1.632 to 2.04. It also pins the 1.2 mm floor,
   read from profile constant key.flexGapFloor (inferred), never typed
   into the check: key01Interval(2.5, 1.2) is 1.2 to 1.25, cone 2.88 with
   gap 1.1 fails with fix set /keys/0/gap = 1.2, and a 1.22 mm floor row
   moves the legal lo to 1.22 (computed).
4. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.

Files to create:
- packages/checks/src/skeleton/*.ts
- packages/checks/test/skeleton.test.ts

Acceptance:
- npm test -w packages/checks  -> exit 0
- npx --no-install hbf check.run reference/keys/flex-pair --json  -> exit
  0, 71 results (the six M-S checks, CHK-PRT-01, CHK-PRT-03 and
  CHK-3MF-04, the M00 part checks, and since D-243 the registry checks of
  the part, body and feature levels; CHK-NET-31 since D-244; CHK-3MF-08,
  which the circuit kernel lists, since D-246; since D-247 CHK-NET-13 on
  each of the five conductors, CHK-NET-27 on contact.key1 and CHK-NET-05
  per port, read at the M05 page milestone; CHK-SHT-11 since D-251), each
  with measured, legal, constraint, origin
- the same with params gap 1.0  -> exit 1, CHK-KEY-01 fail, fix set
  /keys/0/gap = 1.44 (1.64 before D-241). Since M00-T13, check.run takes no --params (it
  checks a build), so this row runs as `npx --no-install hbf part.build
  reference/keys/flex-pair --params '{"/keys/0/gap": 1.0}' --json`; at
  defaults check.run also returns the M00 part checks and the registry
  checks of the build levels, 71 results

Done when: the six M-S checks return no fail at defaults and the edit fails with a fix.

## M-S-T07 3mf slice

Goal: the reference exports a four-slot 3MF (D-223) that the
slicer-format checks and the validator accept.

Inputs:
- packages/3mf/data/filament_template.json (M-1-T08, 127 keys)
- the seed orca3mf.js and validate_3mf.py (M-1-T07)

Steps:
1. Wire jszip 3.10.1; port the writer far enough for one object with
   one body per slot (three in the T07 test, four on the reference after
   D-223).
2. Per-slot values from the template; SOURCE_DATE_EPOCH, fixed UTC
   mtimes, no directory entries, sorted entries (D-052).
3. Run the seed validator with `--overlap`. The `--export` mode arrives
   with M00-T09; CHK-3MF-06 and -07 run in M-S-T06.
4. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.

Files to create:
- packages/3mf/src/write.ts
- packages/3mf/test/skeleton.test.ts

Acceptance:
- write the export first, as ci.yml exit-a runs it (packages/3mf/test/skeleton.test.ts
  writes nothing to disk, and out/ is empty in a clean tree); since M00-T13 the
  TTY gate needs a pseudo-terminal: `printf 'y\n' | script -qec "npx --no-install
  hbf export.run reference/keys/flex-pair --kind 3mf --machine ffc5p" /dev/null`
  (util-linux script; on macOS `script -q /dev/null` with the command after it)
  -> exit 0 and reference/keys/flex-pair/out/x01_flex-pair.3mf exists (the
  name partName writes, core/src/exporters/names.ts)
- uv run --project tools/py tools/py/validate_3mf.py --overlap
  reference/keys/flex-pair/out/x01_flex-pair.3mf  -> exit 0 (seed validator;
  --export arrives with M00-T09; CHK-3MF-06 and -07 run in M-S-T06)
- two exports with one SOURCE_DATE_EPOCH give equal sha256

Done when: the file passes CHK-3MF-06, CHK-3MF-07 and the validator.

## M-S-T08 CLI slice

Goal: part.build, check.run, export.run and parity return CommandResult
with the exit codes of spec/errors.ts.

Steps:
0. Give core/tsconfig.json `"types": ["node"]` (M00-T01 step 7 taken
   early). Under the M-1 base `types []`, a core file importing node:fs
   fails tsc -b with TS2591
   (evidence/audit/m0/exec/logs/tsc-core-nodefs.txt).
1. `core/src/cli.ts` with the three commands and parity; `--json` prints
   CommandResult. Create core/bin/hbf.mjs (`#!/usr/bin/env node` then
   `import "../dist/cli.js";`) and `"bin": {"hbf": "bin/hbf.mjs"}` in
   core/package.json, as M00-T01 step 1 specifies; M00-T01 then verifies
   it. Every hbf line in this card runs as `npx --no-install hbf`: no
   package named hbf exists on npm, and plain `npx hbf` without a local
   bin falls back to the public registry
   (evidence/audit/m0/exec/logs/ms-t08-npx-hbf.txt).
   `core/src/commands/parity.ts` compares build.json, report.json,
   edit.json and artifacts.json against expected/, and `--accept` writes
   them; it is the only updater for the JSON goldens (D-152, D-227).
2. export.run builds and checks first and refuses a failing build (exit
   1); the TTY prompt lands at M00.
3. build.ts runs in process for this reference only; the source reader and
   sandbox of D-178 land at M00.
4. For every @hackbuild import add the dependency and the tsconfig
   reference per M00-T01 step 3; `node tools/tiers.mjs` exits 0.

Files to create:
- core/src/cli.ts, core/src/commands/{build,check,export,parity}.ts
- core/bin/hbf.mjs
- core/test/skeleton.test.ts

Acceptance:
- npx --no-install hbf part.build reference/keys/flex-pair --json  -> exit
  0, buildHash equal on two runs
- npx --no-install hbf part.build with an unknown param  -> exit 2,
  E_SCHEMA
- node tools/tiers.mjs  -> exit 0

Done when: the three commands run from a clean checkout after `npm ci`.

## M-S-T09 reference and goldens

Goal: keys flex-pair sits under reference/ with goldens for exit A.

Steps:
1. Move the fixture to `reference/keys/flex-pair/` (chase.ts, build.ts,
   bench.ts, README.md with the verified block of D-008).
2. Write expected/ build.json, report.json, edit.json, artifacts.json
   with `npx --no-install hbf parity reference/keys/flex-pair --accept`.
   The section renders expected/section-key<n>.svg and .png and the
   generated README blocks (print card, checks) are written only by
   `HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair`
   (test/reference.test.ts), run by a person and never in CI; the SVG is
   the compared golden and the PNG its rendering for the person (D-227).
3. Print card for the owner: slots, filaments, preset, pause none, the
   probe wiring (GP2, GP3, GND).

Acceptance:
- npx --no-install hbf parity reference/keys/flex-pair  -> exit 0
- node tools/lint-voice.mjs reference  -> exit 0
- a section PNG through each key shows both column halves running from
  the trace band to colTop under the cap (read by a person)

Done when: exit A is green on CI.

## M-S-T10 print and read (owner)

Goal: the reference is printed on ffc5p and read on a Pico, and the result
is recorded by a person.

Inputs:
- reference/keys/flex-pair/out/flex-pair-two.3mf (preset two, written by
  the README print-card command with --preset two --out) and its print card
- fab-knowledge:evidence/x/pip-controller/firmware/pip_probe/pip_probe.ino (read only; D-080)
- reference/keys/flex-pair/EXIT-B.md: the owner's checklist for steps 2
  to 4, from the export line to the block pasted into the README. Pins
  come from the chase hookup: K1 (port.key1, lead at the near edge x
  -12.9 mm) on GP2, K2 (port.key2, x 15.1 mm) on GP3, GND (port.gnd,
  right edge y 3 mm) on a Pico GND pin (positions computed at preset
  two). tools/test/flexpair-probe.test.mjs holds the probe and the
  checklist equal to the print card and runs the step 1 compile, or
  reports it not run when arduino-cli or the core is absent.

Steps:
1. Builder writes `tools/skeleton/flexpair_probe/flexpair_probe.ino`
   modelled on the FLOAT US column of pip_probe: charge high, float, time
   the crossing per key. Compile with `arduino-cli compile --fqbn
   rp2040:rp2040:rpipico --warnings all --no-color
   tools/skeleton/flexpair_probe` on core rp2040:rp2040@6.1.0 (TESTING.md
   11). The verdict is the TESTING.md 11 rule: a nonzero exit or any line
   matching `warning:` fails. The FQBN is rpipico because the card reads
   on a Pico (GP2, GP3); pip_probe.ino compiles clean on it
   (evidence/audit/m0/exec/logs/ms-t10-pip-probe-compile.txt).
2. Owner opens the 3MF in Flash Studio and confirms four filaments on
   slots 1 to 4 (this also reports on D-150).
3. Owner prints preset "two" with PETG, cPLA, TPU 95A and cTPU, wires
   GP2, GP3 and GND, runs the probe, presses each key 50 times (inferred
   plan budget).
4. Owner enters results in the README verified block: date, machine,
   preset, presses read, crossing times released and pressed (measured).
5. A failure (no read, a short, a slicer refusal, a print defect) becomes a
   check origin record and a line in skeleton-findings.md.

Acceptance:
- the README verified block lists the print under "measured on a printed
  body" with the date
- each key reads pressed in 50 of 50 presses and released in 50 of 50, or
  the failure is recorded with its finding

Virtual results (D-234, D-235): the builder records the virtual exit B in
a separate "simulated" block of the README verified section, never under
"measured on a printed body": the slice run (slicer version, exit code,
G-code sha256), the analyzer verdicts (model area printed by another tool,
conductor regions touching two nets, lead continuity, printed contact gap,
unsupported spans), the slicer's time and filament estimates, the computed
key path and the probe simulation scores per scenario. Every number there
is computed. The virtual block does not meet this card's acceptance; it
lets M04 start on draft contracts.

Card defects, written back 2026-10-07 from the virtual print:
- Step 2 and the print card name `Generic TPU @FF C5P` for slots 3 and 4.
  Flash Studio 1.7.14 bundles no preset of that name; it bundles Generic
  TPU-95A, TPU-90A and TPU-64D @FF C5P (measured). The owner names the
  slot 3 and slot 4 presets (D-238); until then a headless slice maps the
  name to `Generic TPU-95A @FF C5P` (inferred stand-in).
- Inputs name `pip_probe.ino`; the probe the owner flashes is
  `tools/skeleton/flexpair_probe/flexpair_probe.ino` (step 1), now also run
  on a host shim (`tools/skeleton/flexpair_probe/sim/`). The simulation
  found four probe defects for a later card, none of which changes a pass
  read: a key pressed at boot counts a release with no press; the header
  quotes a 100 Mohm reject threshold for a 5 tau settle the sketch never
  tests (the VIL crossing accepts paths up to about 297.6 Mohm at 8.3 pF,
  computed); a dead key prints nothing until `s`; a hand across the leads
  mid-session reads as one ordinary press (all computed, simulated).

Done when: a person has written the measured block.

## M-S-T11 freeze

Goal: every spec file the path ran is frozen, with each change it forced
recorded as a decision.

Provisional freeze (D-235): before the print, T11 may freeze provisionally
only the contract parts that both exit A and the virtual print exercised:
the Part IR bodies, slots and materials the 3MF writer reads, the
`contact`, `conductor` and `port` feature records the analyzer and the
electrical sim read, `MachinePreset.slicer`, and the hookup read model the
probe runs. A provisional freeze is marked "frozen at M-S, provisional
until M-S-T10" in spec/README.md and the file's status comment; a change
the print forces is a new decision, not an edit in place. Every part only
the print exercises (contact resistance rows, `forceMinN`, `maxOhm`, the
charge-release wait) stays draft.

Steps:
1. For each line of skeleton-findings.md, change spec and add a
   DECISIONS.md entry naming the file and the evidence.
2. Mark the files and parts listed as frozen at M-S in MILESTONES.md 1.5
   as frozen in spec/README.md and in each file's status comment.
3. Replace any plan text that restated a changed type by a link (T01
   list).

Acceptance:
- npx -y -p typescript@7.0.2 tsc -p spec/tsconfig.json  -> exit 0
- every finding has a decision id or a written reason it needs none

Done when: spec/README.md shows the M-S rows as frozen.

## Exit

| exit number | card | command |
|---|---|---|
| spec files marked draft or frozen; plan-type hit list written | T01 | `node tools/lint-plan-types.mjs --warn` |
| realGap(0.275) = 0.075 per side (computed); layer tops 0.73, 1.45, 2.41 mm (computed) | T02 | `npm test -w packages/profile` |
| one meshHash on two builds; live count 0 | T03 | `npm test -w packages/mesh` |
| column top to cap underside equals gap to 1/1024 mm | T04 | `npx tsc -b` and the skeleton test |
| key trace 74.4 kohm, bus 148.8 kohm at 500 ohm cm (computed, inferred row) | T05 | `npm test -w packages/circuit` |
| six checks run at defaults with no fail; since D-243 check.run also runs the registry checks of the part, body and feature levels, 71 results: pass 25, warn 2, skip 44 since D-244 added CHK-NET-31, D-246 CHK-3MF-08 (a pass), D-247 read the M05 page milestone (CHK-NET-13 pass on five conductors, CHK-NET-27 pass, CHK-NET-05 one skip per port) and D-251 CHK-SHT-11 (a skip) (CHK-NET-29 warn, CHK-PRT-05 warn; CHK-3MF-04 skip, CHK-3MF-05 skip, CHK-ASM-01 skip, CHK-ASM-03 skip, CHK-ASM-08 skip, CHK-BRD-02 skip, CHK-FIT-02 skip, CHK-FIT-03 skip, CHK-FIT-05 skip, CHK-FIT-06 skip, CHK-FIT-07 skip, CHK-INL-01 skip, CHK-INL-02 skip, CHK-INL-03 skip, CHK-INL-04 skip, CHK-KEY-04 skip, CHK-KEY-05 skip, CHK-KEY-06 skip, CHK-MOT-05 skip, CHK-NET-04 skip, CHK-NET-04 skip, CHK-NET-04 skip, CHK-NET-04 skip, CHK-NET-04 skip, CHK-NET-05 skip, CHK-NET-05 skip, CHK-NET-10 skip, CHK-NET-25 skip, CHK-NET-31 skip, CHK-PRT-02 skip, CHK-PRT-04 skip, CHK-PRT-08 skip, CHK-PRT-10 skip, CHK-PRT-11 skip, CHK-PRT-14 skip, CHK-SHP-01 skip, CHK-SHP-02 skip, CHK-SHP-03 skip, CHK-SHP-04 skip, CHK-SHP-05 skip, CHK-SHT-05 skip, CHK-SHT-06 skip, CHK-SHT-09 skip, CHK-SHT-11 skip; CHK-PRT-04 skips per D-198; the KEY-06 and NET-04 skips wait on the views the M04-T03 card defects leave to a person); gap 1.0 fails CHK-KEY-01 (legal 1.428 to 2.04 since D-241, computed) with fix 1.44 | T06 | `npx --no-install hbf check.run reference/keys/flex-pair --json`; the gap edit through `part.build --params` (M00-T13) |
| seed validator `--overlap` exit 0; equal sha256 on two exports | T07 | `uv run --project tools/py tools/py/validate_3mf.py --overlap ...` |
| buildHash equal on two runs; tiers exit 0 | T08 | `npx --no-install hbf part.build reference/keys/flex-pair --json` |
| parity green; key section PNGs read by a person | T09 | `npx --no-install hbf parity reference/keys/flex-pair` |
| print read 50 of 50 per key, or failure recorded (measured) | T10 | owner, README verified block |
| virtual exit B recorded in the README simulated block: no model area printed by another tool, no conductor region on two nets, every lead reaches its column (computed) | T10 (D-234) | `node tools/slice/slice.mjs --design reference/keys/flex-pair --preset two <dir>`, `tools/py/gcode/analyze.py`, `node tools/skeleton/flexpair_probe/sim/run.mjs` |
| findings resolved; M-S files frozen | T11 | `tsc -p spec/tsconfig.json` |
