# M02 sim

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: Deterministic sim, multi-trial by default.
Depends on: M00, M01
Adopted dependency: @dimforge/rapier3d-deterministic-compat 0.21.0 (Apache-2.0, D-040, D-134)
Commands added: sim.run, sim.sweep, asm.solve; part.probe (assigned in MILESTONES.md 1.3)
Release at exit: none

hbf (working name) is the binary with CLI, MCP and HTTP transports. PIP (was
HAFT) is the published print-in-place controller. Every number in this file
carries a qualifier (D-007). Pass counts and sweep results produced by a
simulation are computed; wall times are measured on a named machine.

## What this milestone proves

The sim package measures and never decides. A check or a declared
expectation turns its numbers into a verdict (D-064, D-074). M02 lands the
four sim modes the corpus already relied on, each against the legacy design
that found its failure class, and proves that results hash the same on two
runs and on two architectures before any sim hash enters BuildInputs (D-056,
D-134).

| mode | legacy evidence | failure class it catches |
|---|---|---|
| multi-trial dynamics (Rapier) | PAWL `final.mjs`, 17 trials | one run that looked fine |
| multi-trial granular (own solver) | SLUG `slug.html` capsule physics | arching that only shows across trials (58 mm mouth: mean 5.5 of 13 vends over 6 trials, BUILD.md) |
| pose sweep with sphere proxies and masks | DAVIT `davit.html` `collide()` | masks that whitelist real interference; right-only calibration |
| rotational swept volume | OGEE16 `check_sweep.py` | state sampling that misses an arc (pin head swept into its own servo) |
| prismatic raster sweep | SASH `runCheck` | a slide that binds between detent stations |
| insertion by search | COTTER `hook_fit.py` | a hook that cannot pass through its hole |

## Evidence roots

Short names expand by plain prefix, as in MILESTONES.md.

| short | absolute path |
|---|---|
| corpus | `fab-work-directory:benches/` |
| x | `fab-knowledge:evidence/x/` |
| notes | `fab-knowledge:sources/benches/` |
| syn | `fab-knowledge:synthesis/` |
| dl | `fab-knowledge:evidence/x/downloads/` |

Legacy inputs and their sha256 prefixes (first 16 hex digits, computed
2026-10-04). Each card copies its inputs into `designs/<id>/legacy/` with the
full sha256 in `SHA256SUMS` and a lineage README (D-142, D-156).

| input | sha256 prefix |
|---|---|
| `corpus/davit/outputs/davit.html` | ba332702646f2a9b |
| `corpus/davit/outputs/davit_stl.zip` | 3a8419694f054ce6 |
| `corpus/pawl/outputs/pawl/final.mjs` | e4e61a3dc9cc5aa8 |
| `corpus/pawl/outputs/pawl/core.mjs` | d1869500a5a871ff |
| `corpus/slug/outputs/slug/slug.html` | 2d09238c27d5ca4b |
| `corpus/slug/outputs/slug/params.json` | ff7402d24d1dad01 |
| `corpus/ogee16/outputs/ogee16-source.zip` | 47d6077e0596eb4e |
| `corpus/ogee16/outputs/ogee16-print-stl.zip` | 855ffe7c28c139e5 |
| `corpus/sash/outputs/sash/sash-src.zip` | 57d810decb4b107a |
| `corpus/sash/outputs/sash/sash.html` | 1af452be6cccc94a |
| `x/cotter-src/tools/hook_fit.py` | adb0f875c932e268 |
| `dl/dl-robots-machines/davit_r4.zip` (unzipped at `dl/dl-robots-machines/unzipped/davit_r4/`) | full sums in `designs/davit/legacy/r4/SHA256SUMS` (T02) |

The R4 zip carries the R3 `parts.py`, `lib.py` and `assembly.py`
byte-identical to `corpus/davit/outputs/` (sha256 e244f72a50c9cd27,
33d8ebe0f4aa6bcf, 8b7b5ce81fbfa501, computed 2026-10-04), so the R3
copies stay canonical and R4 adds `parts_r4.py`, `pack_sim.py`,
`sweep.py`, `verify_sim.py`, `README_R4.md`, `sim_r4.html` and `stl/`.

## Records taken while writing this file

These runs were made on 2026-10-04 on an Apple M1, macOS 12.7.4, Node
22.12.0 (below the 22.18 floor of D-039) and Python 3.14.6. They are seed
records for the cards below. CI on ubuntu x64 and arm64 replaces them as the
record of truth; they are kept as the first data points.

| run | result | qualifier | evidence |
|---|---|---|---|
| PAWL `final.mjs` on its own pin, `@dimforge/rapier3d-compat` 0.14.0 | 15 of 17 pass; fails: push z 0.12 N s, push x 0.12 N s (both fall at 3.5 s); "open loop (should fail)" passes; two runs byte-identical (sha256 2159ee46989f115e...) | computed; 17.82 s wall measured | `x/pawlrun/run1.txt`, `x/pawlrun/run2.txt` |
| same suite, `@dimforge/rapier3d-deterministic-compat` 0.21.0 | 9 of 17 pass; adds falls at stand hgt 192, open loop, walk T3.2 S38 sway23, T2.8 S38 sway23, T2.8 S38 sway18, T2.8 S38 sway28 | computed; 20.07 s wall measured | `x/pawlrun/det1.txt`, `x/pawlrun/final_det.mjs` |
| same suite, `@dimforge/rapier3d-compat` 0.21.0 | output identical to the deterministic 0.21.0 run, so the drop from 15 to 9 follows the 0.14 to 0.21 version change, not the deterministic build | computed | `x/pawlrun/v21/c21.txt` |
| PAWL stand 5 s, `world.takeSnapshot()` sha256, deterministic 0.21.0, two runs | 46623 bytes, 33920687d38b8f43... both runs | computed, one machine | `x/pawlrun/snap.mjs` |
| OGEE16 `check_sweep.py` on the shipped print STLs | 9 cranks through 25 steps each; no swept collisions; closest approach latch crank 2.10 mm to latch servo, all 8 bar cranks 3.02 mm to their own servo | computed; 14.76 s wall measured | `x/ogeesweep/src/source/check_sweep.py`, trimesh 5.1.1, scipy 1.18.1 |
| COTTER `hook_fit.py verify` | 7 of 7 INSERTS; poses to clear 106, 92, 106, 100, 93, 110, 92; max tilt 57, 72, 82, 56, 72, 57, 72 deg (order of the verify table); exit 0 | computed; 2.47 s wall measured | `x/cotter-src/tools/hook_fit.py`, shapely 2.1.2 |
| COTTER `search()` with a sharp bend, hole 6.35, board 6.35, rod 5.40, Rb 6.0, sweep 52 | TRAPPED, max tilt 12 deg | computed | same file, called from Python |
| DAVIT `DATA` blob | `pairs` 29 and `pairsMini` 29 (27 in-arm, 2 base to arm: `base x crank`, `base x std_servo#0`); `hubPairs` and `hubPairsMini` one `base x mount` pair for each of `1in` (1, 1.25 and 1.5 in pipe; ids 1in, 125in, 15in), `125in`, `15in`; `const.touch` 1.2 mm | counted from the file | `corpus/davit/outputs/davit.html` |

Two findings from these records shape the cards. `final.mjs` counts 17
trials (4 stand, 1 squat, 4 push, 8 walk); notes that say 16 miscount. The
open-loop trial labelled "should fail" passes on the legacy pin, and the
script exits 0 whatever happens, so its labels are prose (D-153).

## Decisions carried

| id | what this file does with it |
|---|---|
| D-134 | wires Rapier 0.21.0; measures the 30-trial granular runtime before snapshots enter BuildInputs |
| D-135 | DAVIT target 30 designed pairs per pipe, zero real fails, both arms; masks keyed by mesh hash and pose set |
| D-188 | the DAVIT R4 offline gate (43 pair sweeps) is a parity reference, refining D-135 |
| D-136 | rebuilds the SLUG runner seeded before the SLUG target |
| D-180 (supersedes D-149) | SLUG runner is rebuilt (absent after the Downloads search); DAVIT R4 and `pack_sim.py` are found and used as a parity reference and are not ported |
| D-055 | Rapier worlds and manifold objects freed by their owner; live count 0 after every sweep |
| D-056 | determinism job compares x64 and arm64 |
| D-051 | snapshot hashes enter BuildInputs.engines only after D-134 clears |
| D-053 | the `imported` mesh route lands here for legacy meshes |
| D-074 | trial suites declare their expected pass set; a capture or a binding is an expectation, never a hand exception |
| D-102 | imported meshes are checked for winding |
| D-106, D-107 | sim.run, sim.sweep, asm.solve, part.probe as CLI commands; MCP projection waits for M12 |
| D-140 | Python oracles stay and run under uv; no Python file is deleted |
| D-153 | every test script and suite asserts and exits non-zero |
| D-156 | lineage.json records every kernel copied |

## M02-T01 Rapier wired, owned and hashed

Goal: packages/sim runs Rapier deterministic-compat 0.21.0 with owned worlds
and a snapshot hash that repeats.

Inputs:
- `x/pawlrun/snap.mjs` (snapshot hash sample)
- `corpus/pawl/outputs/pawl/core.mjs` lines with `makeWorld` (timestep 1/480, gravity -9.81 on Y)
- `fab-knowledge:synthesis/api-library-ai-design.md` section on `snapshotHash`
- spec/sim.ts, spec/registry.ts (BuildInputs)

Steps:
1. Add `@dimforge/rapier3d-deterministic-compat` at exactly `0.21.0` to packages/sim/package.json; commit the lockfile change.
2. Write `initRapier()` that awaits `RAPIER.init()` once per process and returns the module.
3. Write `withWorld(fn)`: creates a World, runs `fn`, calls `world.free()` in `finally`, and increments and decrements a live-world counter exported for tests (D-055).
4. Write `snapshotHash(world)`: sha256 hex of `world.takeSnapshot()`.
5. Write the seeded PRNG used by every trial runner in this milestone: Park-Miller minimal standard (the generator HAFT used, syn/patterns-and-lineage.md seeded sweeps row), seed 1 by default, never `Math.random`.
6. Add a lint rule to the tiers job: `Math.random` is refused anywhere under packages/sim/src.
7. Add `simSnapshotsAdmitted = false` in admission.ts; T05 flips it.

Files to create:
- packages/sim/package.json
- packages/sim/src/rapier/init.ts
- packages/sim/src/rapier/world.ts
- packages/sim/src/rapier/snapshot.ts
- packages/sim/src/prng.ts
- packages/sim/src/admission.ts
- packages/sim/test/rapier-world.test.ts
- packages/sim/test/prng.test.ts

Acceptance:
- `npm test -w packages/sim -- rapier-world` exit 0: a 1 s drop of one cuboid hashed twice in one process gives one hash; live-world count is 0 after the test.
- `npm test -w packages/sim -- prng` exit 0: Park-Miller from seed 1 gives 16807 then 282475249 (computed, the published sequence).
- `grep -rn "Math.random" packages/sim/src` prints nothing.

Done when: a test can build, step, hash and free a Rapier world with a zero live count.

Card defects found at build, 2026-10-06, and what was built:

1. Steps 2 and 3 name no source for gravity and timestep, and profile holds
   no row for either. `withWorld(params, fn)` takes both as profile
   `Constant` rows (units m/s2 and s, E_SCHEMA otherwise) and types in no
   number. The T01 test reads them from
   `packages/sim/test/fixtures/pawl-world.json` (tier inferred, from PAWL
   `core.mjs` lines 4, 114 and 115; lineage row `pawl.core/sim-world`).
   They move to a profile row when one lands; T03 reads the same rows.
2. The vendor declarations name `WebAssembly`, `BufferSource`,
   `RequestInfo` and `Symbol.dispose`, which the ES2023 lib without DOM
   lacks, so a package that reaches them fails `tsc -b`. Rapier is exported
   at the subpath `@hackbuild/sim/rapier` (`src/rapier/index.ts`, added to
   the file list), the root `@hackbuild/sim` export stays free of it, and
   `packages/sim/tsconfig.json` sets `skipLibCheck`. A later consumer of
   the subpath (T11 core commands) sets `skipLibCheck` the same way.
3. Rapier 0.21.0 integrates gravity once per solver iteration
   (`numSolverIterations`, vendor default 4 per step), so a free fall
   follows semi-implicit Euler at dt / 4: the 1 s drop from 1 m ends at
   y -3.907539 m (computed), and the test derives that from the world's
   own iteration count.
4. Step 6 needs files the list omits: the rule is a `forbid` row in
   `tools/tiers.json`, read by `tools/tiers.mjs` over raw lines (comments
   count, so the gate agrees with the acceptance grep), with two cases in
   `tools/test/tiers.test.mjs`.
5. Step 1 says commit the lockfile; D-006 holds, so the lockfile change is
   staged, not committed.
6. The snapshot golden (`packages/sim/test/goldens/rapier-drop.json`, 2651
   bytes, sha256 8b86dd16...f013, computed) was recorded on one Apple M1
   arm64; an x64 mismatch is a T04 determinism finding, never a re-record.

## M02-T02 Imported mesh route and legacy folders

Goal: legacy meshes enter the kernel as hashed, winding-checked imported
bodies, and every legacy input has a sha256 and a lineage README.

Inputs:
- the legacy inputs table above
- packages/mesh from M00 (meshHash with triangles, D-051)

Steps:
1. Add MeshRoute `imported` to packages/mesh: reads binary or ASCII STL, welds on the dyadic 1/1024 mm grid (D-054), computes signed volume, and refuses a body with negative signed volume with E_KERNEL naming the file (D-102; the rp2040 standin at -6506 mm3 is the known case).
2. Record the route's guarantees in its MeshRoute entry: watertight not assumed; winding checked; meshHash over welded vertices and sorted triangles.
3. Create `designs/<id>/legacy/` for davit, ogee16, pawl, slug, sash and cotter. Copy the inputs, write `SHA256SUMS` with full hashes, and write a README with phase, kernels consumed and introduced, and known unfixed defects (syn/patterns-and-lineage.md 4.10). Copy the unzipped DAVIT R4 tree into `designs/davit/legacy/r4/` with its own `SHA256SUMS`; skip its R3 `parts.py`, `lib.py` and `assembly.py`, which are byte-identical to the R3 copies, and say so in the README.
4. Unzip `ogee16-source.zip` and `ogee16-print-stl.zip` into `designs/ogee16/legacy/` so that `source/` and `out/print/` sit side by side; `audit_print.py` reads STLs from `source/../out/print`.
5. Add one lineage.json row per kernel copied in this milestone (PAWL `core.mjs`, SLUG `step` and `relax`, DAVIT `collide`, OGEE `check_sweep.py`, SASH `runCheck`, COTTER `search`) with canonical path and sha256 (D-156).

Files to create:
- packages/mesh/src/routes/imported.ts
- packages/mesh/test/imported.test.ts
- designs/{davit,ogee16,pawl,slug,sash,cotter}/legacy/SHA256SUMS
- designs/{davit,ogee16,pawl,slug,sash,cotter}/legacy/README.md
- designs/davit/legacy/r4/SHA256SUMS
- lineage.json (rows added)

Acceptance:
- `npm test -w packages/mesh -- imported` exit 0: the 15 DAVIT STLs import with positive volume; a flipped copy of `crank.stl` returns E_KERNEL.
- `cd designs/davit/legacy && shasum -a 256 -c SHA256SUMS` exit 0, and the same for `designs/davit/legacy/r4/` and the other five folders.
- `node tools/lint-voice.mjs designs` exit 0.

Done when: every M02 card reads its legacy inputs from designs/<id>/legacy/ and nothing from outside the repo.

Corrections found while building (2026-10-06):
- The 15 DAVIT STLs are the R3 set from `davit_stl.zip`, unzipped to `designs/davit/legacy/stl/`; `r4/stl/` holds 11.
- `davit_jaw_idle.stl` loses 6 of 780 triangles to the 1/1024 mm weld and is not watertight after it (computed, ours and trimesh agree); it imports with positive volume, and the stage runner refuses it as a solid. Recorded in `designs/davit/legacy/README.md`.
- The route refuses a signed volume at or below 0 mm3, so a zero-volume body is E_KERNEL too. MeshRouteDef has no field for the step 2 notes, so they live in `IMPORTED_ROUTE` in `packages/mesh/src/routes/imported.ts`; the stage runner takes a `meshBytes(uri)` resolver, reads stl only, and refuses the stage 6 inset on an imported body.
- Lineage: the row `davit.collide/r4` named `pack_sim.py`, the calibration M02-T06 does not port (D-180); it is now `davit.calib/r4`, and `davit.collide/r3-page` (`davit.html`, `collide()` at line 541) is canonical. COTTER `search` stays under `cotter.hook-fit` (new row `cotter.hook-fit/m02-legacy`), and SLUG `step` and `relax` have canonical rows only: `tools/test/lineage.test.mjs` refuses a file that is a copy under one subject and canonical under another.
- The OGEE16 source zip carries eight top-level notes beside `source/`; its `README.md` would replace the lineage README and holds a dash, so they stay in the zip. `sash.html` inlines three.js with one exclaim; `tools/lint-voice.allow.json` exempts that file from the exclaim rule only.
- Inputs that later cards name outside the repo are copied too: the PAWL run records (`designs/pawl/legacy/records/`), the SLUG `slug.scad`, `BUILD.md`, `tri2.mjs`, `placecheck.mjs`, the DAVIT R3 `parts.py`, `lib.py`, `assembly.py`, `README.md` (as `README-R3.md`), the loose `sim_r4.html` and the two R4 run records. The T03, T05, T06 and T08 Inputs lines still cite the evidence paths; read them at the legacy copies.

## M02-T03 PAWL suite: record, port, target

Goal: PAWL's trial suite runs in packages/sim under the adopted Rapier with
a declared expected pass set, and the legacy result is recorded beside it.

Inputs:
- `corpus/pawl/outputs/pawl/final.mjs`, `corpus/pawl/outputs/pawl/core.mjs`
- `x/pawlrun/run1.txt`, `x/pawlrun/det1.txt`, `x/pawlrun/v21/c21.txt`
- `notes/benches-robots-a.md` section 3 (PAWL)

Steps:
1. Record first. Run the legacy suite unchanged under its own pin on CI x64 and arm64: `npm i --no-save @dimforge/rapier3d-compat@0.14.0` in a scratch folder holding `final.mjs` and `core.mjs`, then `node final.mjs`. Write the per-trial lines and the pass count to `packages/sim/records/pawl-legacy-0.14.0-<arch>.json` with Node version, date and sha256 of the output. The seed record is 15 of 17 (computed, Apple M1, 2026-10-04).
2. Port `core.mjs` to TypeScript without changing a constant. Port the 17 trials of `final.mjs` as a trial program with the same parameters (stand 60 s, hgt 0.192, hgt 0.212, open loop 15 s, squat 30 s, pushes z and x at 0.06 and 0.12 N s at 3 s, eight walk sets of 25 s) and the same fall rule (tilt over 30 deg or torso height under 0.12 m after 0.6 s).
3. Each trial reports ok, fell, tilt, travel, drift, peak saturation and joint, and a snapshotHash of the final world.
4. Run the port on the adopted 0.21.0 and record per-trial results in `packages/sim/records/pawl-0.21.0-<arch>.json`. The seed record is 9 of 17 (computed).
5. Declare the expected set (D-074) in the scene. The target is the legacy record of step 1: the same trials pass and the same trials fall. The open-loop trial is declared by its measured legacy outcome (pass), and the scene records that its label says it should fail; whether the label or the result is right goes to the owner queue.
6. If the port on 0.21.0 does not meet the target, do not retune core.mjs constants inside this card. Write a per-trial diff table into the PR body, keep the expectation at the legacy set, mark the scene's status `blocked: rapier 0.14 to 0.21 regression`, and list the question in the PR body (D-006 process, MILESTONES.md 3.6 rule 15). The exit row for PAWL then reads "recorded, target not met" until the owner answers.
7. The suite exits 1 when the measured pass set differs from the declared set, and 0 only when they match (D-153).

Files to create:
- packages/sim/src/programs/pawl/core.ts
- packages/sim/src/programs/pawl/suite.ts
- packages/sim/scenes/pawl.ts
- packages/sim/records/pawl-legacy-0.14.0-x64.json
- packages/sim/records/pawl-legacy-0.14.0-arm64.json
- packages/sim/records/pawl-0.21.0-x64.json
- packages/sim/records/pawl-0.21.0-arm64.json
- packages/sim/test/pawl-suite.test.ts

Acceptance:
- `npm test -w packages/sim -- pawl-suite` exit 0 when the measured pass set equals the declared set; the test prints both sets.
- A parity test runs the TypeScript core and `core.mjs` side by side on 0.21.0 for 2 s of stand: torso translation equal to 1e-12 m at every step (computed).
- `npx --no-install hbf sim.run --scene pawl --json` exits 0 or 1 by the rule in step 7; stdout is a CommandResult with `runs` 17 and `passes` equal to the count.
- Live-world count 0 after the suite.

Done when: the PAWL record exists for both pins on both architectures and the suite's verdict is the declared expectation, met or reported as blocked.

Card defects (written back 2026-10-06 by the T03 build):
- Step 1 and step 4 name CI x64. No CI ran (D-006). The x64 records were taken on Apple M1 under Rosetta 2 with the darwin-x64 build of Node 22.18.0; each record carries `machine.translated: true`. A CI x64 run is not run.
- The `hbf sim.run --scene pawl --json` acceptance needs the sim.run command and `--scene` flag of M02-T11; until T11 lands it is not run. The suite verdict and exit rule run today through `npm run pawl -w packages/sim` (exit 1, blocked).
- The full suite takes 103.3 s on Apple M1 native and 237.1 s under Rosetta 2 (measured), over the 60 s default test budget. `pawl-suite.test.ts` replays two push trials against det1.txt and the committed records, runs the 2 s parity, and checks the committed records; `npm run pawl -w packages/sim` runs all 17 and `npm run pawl:record -w packages/sim` rewrites the 0.21.0 record.
- The port reproduces `designs/pawl/legacy/records/det1.txt` byte for byte on both architectures (sha256 b6383eec, computed), so the 9 of 17 is final.mjs on 0.21.0 and the port adds no difference.
- `packages/sim/scenes/pawl.ts` fails the M02-T04 rule that every file under scenes/ is listed in RAPIER_SCENES. Registering PAWL there needs a RapierScene adapter in `src/rapier/scenes.ts` (a T04 file) and puts 302 s of simulated time per run into the snapshot job; owned by T04.

## M02-T04 Snapshot determinism across runs and architectures

Goal: every Rapier scene in this milestone produces one snapshot hash per
trial on two runs and on ubuntu x64 and arm64.

Inputs:
- T01, T03, T05 scenes
- `.github/workflows/ci.yml` determinism job from M00 (meshHash x64 and arm64)

Steps:
1. Extend the determinism job: on ubuntu x64 and ubuntu arm64 runners, run the PAWL suite (17 trials) and the granular benchmark (30 trials, T05) and write `snapshots-<arch>.json` mapping scene, trial and seed to snapshotHash.
2. Run each suite twice on each runner and compare within the runner.
3. Add a final step that downloads both artifacts and compares them key by key; any difference fails the job and prints the first trial and step at which the hashes differ (bisect by hashing every 480 steps).
4. Keep the comparison off BuildInputs until T05 sets the admission flag.

Files to create:
- .github/workflows/ci.yml (determinism job extended)
- packages/sim/test/determinism.test.ts
- tools/compare-snapshots.mjs

Acceptance:
- `npm test -w packages/sim -- determinism` exit 0 on one machine: two runs of each scene give equal hashes.
- CI determinism job green: x64 and arm64 hash maps equal for all 47 trials (17 PAWL plus 30 granular).

Done when: a difference in any trial hash between architectures turns CI red with the first differing step named.

Card defects found at build, 2026-10-06, and what was built:

1. The Inputs name T03 and T05 scenes; neither existed when T04 was built
   (T03 in flight, T05 not started). T04 lands the scene contract and the
   manifest they register in: `RapierScene` and `StepObserver` in
   `packages/sim/src/rapier/scene.ts`, `RAPIER_SCENES` in
   `packages/sim/src/rapier/scenes.ts` (both added to the file list). The
   manifest holds the T01 drop scene only (1 trial, its final hash equal to
   `test/goldens/rapier-drop.json`). The 47-trial row stays not run until
   PAWL (17) and granular-funnel (30) register.
2. T03 and T05 name `packages/sim/scenes/<id>.ts`, outside the package
   `rootDir` (src). The determinism test requires every `.ts` under
   `scenes/` or `src/scenes/` (index.ts aside) to be a registered scene id,
   so an unregistered PAWL or granular scene turns it red.
3. A scene calls `observe(world, step)` after every `world.step()`;
   `traceTrial` hashes every 480 steps and refuses, with E_SCHEMA, a scene
   that steps without observing. The record key is
   `<scene>/<trial>#seed<seed>`.
4. Step 3 bisects by checkpoint: the compare prints the first differing
   trial in run order, the first checkpoint step whose hash differs and the
   last step that agrees (480-step resolution; 2 s simulated at the
   granular 1/240 timestep, 1 s at the PAWL 1/480).
5. One compare implementation: `tools/compare-snapshots.mjs` reuses
   `diff()` from `tools/determinism/compare.mjs` and carries both modes,
   `record` (runs every scene N times, default 2, compares within the
   runner, writes `snapshots-<arch>.json`) and `compare`. The CI node legs
   x64 and arm64 run `record`; `determinism-compare` runs `compare`.
6. Wall time: the default `npm test -w packages/sim -- determinism` runs
   the first trial of each scene twice, to stay under about 60 s once PAWL
   and granular register; every trial runs twice in
   `npm run snapshots -w packages/sim` (script added) and in CI.
7. Rechecked 2026-10-06 while T03 was in flight: `scenes/pawl.ts` now
   exists and the registration guard turns `determinism` red (6 of 7
   pass, computed). Two seams block registering it from T04 without
   editing T03 files: `runPawlTrial` in `src/programs/pawl/suite.ts`
   takes no `StepObserver`, so it cannot be checkpointed, and
   `scenes/pawl.ts` sits outside `rootDir` (src), so `RAPIER_SCENES` in
   `src/rapier/scenes.ts` cannot import it. T03 closes both: move the
   scene data to `src/scenes/pawl.ts`, give `runPawlTrial` an optional
   third argument `observe` called as `observe(world, n + 1)` after each
   `world.step()`, and append to `RAPIER_SCENES` a `RapierScene` whose
   `run` calls it per trial with seed `PAWL_SCENE.seed`.
8. Fixed 2026-10-07 after verifier round 1 (determinism exit 1 on
   `scenes/cotter-hook.ts`). Root cause: the guard read every file under
   `scenes/` as a Rapier scene, but T06 to T11 put kinematic, proxy and
   SLUG scenes there too, and T03 never registered PAWL. The guard now
   holds two rules: every scene file is the `file` of a `SIM_SCENES`
   entry (`src/scenes.ts`, T11), and every scene file whose imports reach
   `@dimforge/rapier3d` (read from the files on disk: the scene's own
   imports, type ones included, then value imports only) is a registered
   Rapier scene; only `pawl.ts` reaches it (computed). PAWL stays in
   `scenes/pawl.ts` and loads at run time, the `SceneDeps.load` contract
   of T11: `RAPIER_SCENE_MODULES` in `src/rapier/scenes.ts` names
   `pawl.ts` with the adapter `pawlRapierScene` (in
   `src/programs/pawl/suite.ts`, which gains the optional `observe`
   argument and a `steps` field on its row), and `rapierScenes(load)`
   returns drop, granular-funnel and pawl in that order;
   `tools/compare-snapshots.mjs record` uses it. The record holds 48
   trials (drop 1, granular-funnel 30, PAWL 17; counted), one more than
   the Acceptance line's 47, which omits drop. The default run takes the
   first PAWL trial (60 s simulated, 28800 steps) and pins its hash and
   that of `x 0.12 N.s` to `records/pawl-0.21.0-arm64.json`, written
   without the observer, so observing is shown not to move the physics.

## M02-T05 Thirty-trial granular runtime and admission

Goal: the 30-trial granular runtime under Rapier deterministic is measured
on both CI architectures and recorded, and only then may sim snapshot hashes
enter BuildInputs (D-134, D-056).

Inputs:
- `corpus/slug/outputs/slug/params.json` and `slug.scad` (funnel mouth fb 78, a 156 mm square mouth; capsule d 50.8; lattice pitch 52)
- `notes/benches-robots-b.md` section 3 (SLUG funnel geometry)

Steps:
1. Build a Rapier scene `granular-funnel`: four funnel panels as cuboid colliders placed by their inner faces at the SLUG funnel angles (`R0 = fb + (t/2)/sin(ang)`, t 3 mm), a floor, and 18 balls of radius 25.4 mm spawned on the SLUG lattice (pitch 52, alternate-layer offset) with lateral velocity drawn from the seeded PRNG in the SLUG range of plus or minus 10 mm/s per axis.
2. Simulate 10 s at timestep 1/240 per trial. Seeds 1 to 30.
3. For each trial record wall time, steps, the count of balls below the mouth plane at 10 s, and the final snapshotHash. The ball count is informational (D-075): this scene measures runtime and determinism and claims nothing about SLUG.
4. Run on CI x64 and arm64 three times; record per-trial and total wall time with p50 and p90, runner image, Node version and date in `packages/sim/records/granular30-<arch>.json` (measured).
5. When both records exist and T04 is green, set `simSnapshotsAdmitted = true` and add `engines.rapier` with the snapshot hash set to BuildInputs (D-051). No decision sets a runtime budget; the record states the numbers and the PR body asks the owner whether a budget is wanted.

Files to create:
- packages/sim/src/rapier/granular.ts (the scene; packages/sim compiles only src, so a scenes/*.ts file cannot reach the registry in src/rapier/scenes.ts)
- packages/sim/scenes/granular-funnel.world.json (world and funnel rows with provenance)
- packages/sim/test/granular.test.ts and test/goldens/granular-funnel.json
- packages/sim/bench/granular30.ts (run by Node type stripping, `node bench/granular30.ts`)
- packages/sim/records/granular30-x64.json
- packages/sim/records/granular30-arm64.json
- packages/sim/test/admission.test.ts

Acceptance:
- `npm run bench:granular30 -w packages/sim -- --runs 3` exit 0 and writes the record (the script entry is added to packages/sim/package.json).
- `npm test -w packages/sim -- admission` exit 0: the flag is true only when both records exist, each holds 30 trials with a snapshotHash, and the hashes for one seed match across the two files.

Done when: the two runtime records are committed and BuildInputs carries the Rapier engine version and snapshot hashes.

Local record (2026-10-07, Apple M1 on a machine at load average about 30, 3 runs each,
measured): arm64 trial p50 195.4 ms, p90 333.5 ms, run total 5.64 to 9.51 s; x64 under Rosetta
p50 306.2 ms, p90 473.9 ms, run total 10.24 to 11.18 s. The 30 hashes match across the two
files (computed). These are local records, `machine.image` "local"; CI replaces them.

Card defects found in build:
- The `scenes/granular-funnel.ts` and `bench/granular30.ts` file names assume the sim compiles
  scenes; tsconfig rootDir is src. The scene lives in src/rapier/granular.ts.
- Step 5 cannot run until the CI determinism compare has run (T04 green needs CI, D-006), and
  adding `engines.rapier` to BuildInputs changes the buildHash of every design. The flag stays
  false; admission.test.ts computes it from the records and requires a non-local image.
- Step 1 names four funnel panels and a floor. The port has three leaning hull panels, the
  vertical back face, and the ceiling plate with the 156 mm square mouth cut out as the floor.
- Scene note, written back 2026-10-08 (audit, packages/sim lens): the funnel panels and the
  spawn lattice come from `packages/sim/src/capsule/geometry.ts` (`funnelPanel`, `spawnPos`),
  the one port of those SLUG formulas (lineage slug.capsule-geometry/slug-12); granular.ts
  builds its Rapier hulls from them. `scenes/slug.ts` reads its shared funnel and lattice rows
  from `granular-funnel.world.json`. Four SLUG numbers are still kept in both files (gravity
  9.81 m/s2 against contact.gravity 9810 mm/s2, the 1/240 step against drive.dt, spawnLateral
  10 against contact.spawnLateralSpan 20, 18 balls against protocol.capsules); each moves to
  the rows file in a later pass.


## M02-T06 DAVIT pose sweep, both arms, masks keyed by mesh hash

Goal: DAVIT's two-level sphere proxies and calibrated masks run in
packages/sim, the 30 designed pairs per pipe are declared data, and the
sweep reports zero real fails on both arms for the 1in, 125in and 15in pipes.

Inputs:
- `corpus/davit/outputs/davit.html` (`DATA.prox`, `DATA.pairs`, `DATA.pairsMini`, `DATA.hubPairs`, `DATA.hubPairsMini`, `DATA.const`, `chain()`, `collide()` at lines 508 to 580)
- `corpus/davit/outputs/assembly.py` (chain in Python), `parts.py`, `davit_stl.zip`
- `corpus/davit/outputs/README.md` ("30 designed contact pairs", "500 plus pose calibration sweep", verified ranges)
- `notes/benches-robots-a.md` section 1 (collision, masks, chain constants)
- `syn/verified-claims.md` C6 (29 plus 1; 532 has no harvested source; right-only calibration inferred)
- `dl/dl-robots-machines/unzipped/davit_r4/README_R4.md` (R4 fixes, item 8; Validation: 43 pair sweeps, 416 poses)
- `dl/dl-robots-machines/unzipped/davit_r4/sweep.py` (43 pair sweeps with manifold booleans; run record `dl/dl-robots-machines/records/davit_r4_sweep_run_2026-10-04.txt`)
- `dl/dl-robots-machines/unzipped/davit_r4/pack_sim.py` (the legacy proxy generator and mask calibration, `calib_pair`)
- `dl/dl-robots-machines/unzipped/davit_r4/verify_sim.py` (presets plus seeded random legal poses; run record `dl/dl-robots-machines/records/davit_r4_verify_sim_run_2026-10-04.txt`)
- `dl/dl-robots-machines/sim_r4.html` and `dl/dl-robots-machines/unzipped/davit_r4/stl/`

Steps:
1. Stage A, parity on legacy data. Port `chain()` and `collide()` to TypeScript with the legacy proxies and masks decoded from `DATA` (u16 points against `lo`, `hi`; coarse groups `[cx, cy, cz, r, start, end]`; touch 1.2 mm; masks per pair, per side, keyed by sorted name, flipped when visited in the other order).
2. Remove the explicit skip of arm pairs on different sides (the line commented `// arms cannot meet` in `collide()`) and test left against right like any other pair. The left arm uses the right arm's local points (same prints rotated 180 deg about the pipe); hub pairs are evaluated for each side separately.
3. Declare the designed pairs as data in `designs/davit/contacts.json`: the 29 arm pairs of `DATA.pairs` by name plus `base x mount` for each pipe, for each side. Nothing outside this file is ever whitelisted.
4. Define the gated pose set and its hash. For each model (std, MINI), pipe (1in, 125in, 15in) and side: the four presets HANG, REACH (55, 25, -70, 40, 30), LIFT (-35, 0, -95, 0, 6), TUCK (100, 0, -105, 90, 3); and from each preset, each joint swept alone through its verified range (pitch -120 to 120 and elbow -110 to 110 in 2 deg steps, roll and wrist -180 to 180 in 5 deg steps, grip 3 to 46 in 1 deg steps). poseSetHash is the sha256 of the canonical JSON of the list (D-051, RFC 8785).
5. A real fail is a fine-point pair under 1.2 mm on a pair absent from contacts.json, or on a declared pair at a point outside that pair's mask. Report each with pair, side, pose, distance in mm and point indices.
6. Run the seeded combined pose set as well (all five joints drawn together within range, seed 1, 600 poses per configuration, above the README's "500 plus"). This set is informational: its contacts are recorded and reported, never gated. The legacy calibration method is in `pack_sim.py` `calib_pair`: each pair's single governing joint swept through its range at 1 deg with the others at zero and grip 25 deg, every point within the 1.45 mm margin masked (runtime touch 1.2), right arm only, MINI meshes only, arm pairs at the 1.25 in pipe and hub pairs per pipe. Our gated set in step 4 covers both arms and both models; the difference is recorded in the PR.
7. Stage B, own masks. Generate fine points and coarse groups from the imported STLs and the servo and horn meshes in `DATA.hw` (surface sampling spacing chosen and recorded in the record), then calibrate masks for declared pairs only, on both sides, over the gated pose set. Key each mask by (meshHash a, meshHash b, poseSetHash). A mask whose key does not match the current meshes or pose set returns E_STALE naming the pair.
8. Report constant interference: a declared-pair point pair under 1.2 mm in every pose of the set is listed by name and count as a metric (D-049). It stays visible in every report; a check in M04 decides its verdict.
9. Stage B is new code with its own record; it does not claim to reproduce the legacy masks point for point. `pack_sim.py` is the parity reference and is not ported (D-180). Our generator and masks on the R4 STLs must reproduce `verify_sim.py`: 0 fails over its 420 seeded poses (4 presets plus 134, 140 and 134 draws from `default_rng(7)` per pipe 1in, 125in, 15in) and more than 5 unmasked contacts at the zero pose. The legacy run gives 0 fails and 25 unmasked contacts (computed 2026-10-04).
10. Known-bad fixture: R4 `README_R4.md` item 8. The R3 palm tab channel stops at 4.6 mm against grip servo tabs at 7.0 mm, 247 mm3 of interference that the R3 auto-calibrated masks whitelisted. Build the R3 palm and the grip servo at the zero pose as `packages/sim/fixtures/davit-r3-grip-tab/`; our sweep must report it as a real fail with Stage B masks, so a mask cannot hide a seating interference.
11. R4 parity (D-188): run our sweep on the R4 STLs over the 43 pairs of `sweep.py`. The legacy record lists one nonzero intersection, `palm x pincap` at 125in, 3.21 mm3, the designed pincap press fit (D2.35 pin in a D2.2 bore); declare it in contacts.json as a press fit and require 0 other intersections.

Files to create:
- packages/sim/src/proxy/decode.ts
- packages/sim/src/proxy/build.ts
- packages/sim/src/proxy/collide.ts
- packages/sim/src/proxy/masks.ts
- packages/sim/src/kinematics/davit-chain.ts (moves to motion at M07, D-139)
- packages/sim/scenes/davit.ts
- designs/davit/contacts.json
- packages/sim/test/davit-chain.test.ts (packages/motion/test/ at M07-T10)
- packages/sim/test/davit-sweep.test.ts (core/test/ at M07-T10)
- packages/sim/test/davit-masks.test.ts (core/test/ at M07-T10)
- packages/sim/records/davit-sweep.json
- packages/sim/fixtures/davit-r3-grip-tab/
- packages/sim/test/davit-r4-parity.test.ts (core/test/ at M07-T10, with davit-r4-parity-verify and davit-full)

Acceptance:

At M07-T10 the chain and every test that places a DAVIT or OGEE16 body moved: sim reads placements through the place(pose) binding core makes over packages/motion (D-139), so `davit-chain` runs as `npm test -w packages/motion -- davit-chain` and the sweeps below as `npm test -w core -- <name>`; `npm run davit:sweep` and `npm run ogee:record` run with `-w core`.

- `npm test -w packages/sim -- davit-chain` exit 0: TypeScript chain equals `assembly.py chain()` for the four presets on each model and pipe to 1e-9 mm at the tip point (-8, 18, -90) (computed; the Python run uses `uv run --project tools/py`).
- `npm test -w packages/sim -- davit-sweep` exit 0 with Stage A data: std model, pipes 1in, 125in, 15in, both sides, gated pose set: 30 declared pairs per pipe per side, 0 real fails, 0 left-right contacts (computed).
- Same test with Stage B masks: 0 real fails on the same set; constant-interference list printed and stored in the record.
- `npm test -w packages/sim -- davit-masks` exit 0: changing one byte of `crank.stl` makes the crank masks E_STALE; changing the pose set does the same.
- MINI: the same sweeps run and are recorded in `davit-sweep.json`; a MINI real fail is reported in the PR and in RISKS.md, and the D-135 gate covers the std model.
- `npm test -w packages/sim -- davit-r4-parity` exit 0: on the R4 STLs, 43 pair sweeps, 0 intersections except the declared pincap press fit; the 420 `verify_sim.py` poses give 0 fails with our masks and more than 5 contacts unmasked at the zero pose; the R3 grip-tab fixture is a real fail (computed).
- `uv run --project tools/py python designs/davit/legacy/r4/verify_sim.py` exit 0, `VERIFY PASS` (oracle, run beside the port).

Done when: the DAVIT sweep reports pairs, real fails and closest approach for both arms on three pipes, and no mask exists without a mesh-hash key.

Card defects (written back 2026-10-07 by the T06 build):
- The `verify_sim.py` acceptance cannot run in the repo as written. The script imports scipy, which `tools/py/pyproject.toml` does not pin and this card does not name, and it reads `data_r4.json`, which `pack_sim.py` writes and the repo does not hold; the command exits 1 with `ModuleNotFoundError: No module named 'scipy'` (measured 2026-10-07). It ran in a scratch copy under `fab-knowledge/evidence/m02-scratch/t06-oracle` with `uv run --project tools/py --with scipy python pack_sim.py` then `verify_sim.py`: `legal-pose fails: 0`, `unmasked zero-pose contacts (expect >5): 27`, `VERIFY PASS` (computed). The 2026-10-04 record says 25; the difference between the two blobs was not investigated. Owner decision: pin scipy in `tools/py` and commit a generated `data_r4.json`, or drop the row.
- The default test run covers Stage B and the 420-pose parity at 125in only (144 poses of the 420), to stay near the 60 s budget (davit-sweep 42.4 s, davit-r4-parity 27.8 s, both files in parallel, measured on Apple M1, 2026-10-07). `npm run davit:sweep -w packages/sim` sets `HBF_DAVIT_FULL=1`: both models, three pipes, both arms, Stage A, Stage B on the gated set, the 420 poses and the seeded combined set; it took 521.8 s measured and writes `packages/sim/records/davit-sweep.json`.
- `scenes/davit.ts` is not a Rapier scene, and `determinism.test.ts` (T04) fails every file under `scenes/` that is not in RAPIER_SCENES, as it already does for `pawl.ts`. T04 owns the rule; it needs an exemption for scene files that build no world. Not changed here.
- Step 6 combined set: 600 poses per configuration from `createPrng(1)`, five joints drawn to 0.1 deg. Its contacts are informational. Seven pairs outside contacts.json came under 1.2 mm in it, all cross-arm or against the mount: std 1in `fore|jaw_drive` 1.11 mm (left against right), mini 1in `jaw_drive|upper` 1.19 mm, `fore|jaw_drive` 0.83 mm, `jaw_idle|upper` 0.97 mm (left against right), mini 125in `fore|jaw_drive` 0.87 mm, `jaw_idle|mount` 1.13 mm, mini 15in `jaw_idle|mount` 1.00 mm (computed, Stage B masks). The legacy runtime skipped cross-arm pairs, so none of these could have shown there. The gated set has 0 real fails and 0 left-right contacts on both models, so no MINI row goes to RISKS.md; the combined contacts go to the M04 check.
- Stage B sampling: lattice spacing 5 mm, 6 mm group cells, 0.1 mm penetration offset (profile rows `davit.*`, inferred). A mask hides contact and never interference: a point of a slip pair inside the other body in any pose stays unmasked, and press pairs (palm x pincap) are masked by class. The R3 palm and servo at the zero pose give 247 mm3 within 10 percent of the README and the sweep reports them as a real fail.
- Step 11 parity: `sweep.py` samples random points; this port uses a 3 mm lattice for the sampled tier and the exact Manifold boolean at the 3 closest poses of each pair sweep. The pincap press fit measures 3.198 mm3 against the legacy 3.21 (computed), and nothing else exceeds 0.5 mm3.
- Step 9 zero pose: 26 unmasked contacts at the HANG preset on the R4 STLs at each pipe, against the legacy 25 (computed).
- The card names `designs/davit/legacy/r4/verify_sim.py` and `assembly.py` as inputs; lineage rows `davit.assembly/r3` and `davit.verify/r4` were appended with dest, and `davit.collide/r3-page` records the removed side skip under fixes.
- The CLI registered the three std scenes only (M02 report). `packages/sim/src/scenes.ts` now registers `davit-mini-1in`, `davit-mini-125in` and `davit-mini-15in` beside them: the MINI build of davit.html (`DATA.constm`, `DATA.pairsMini`, `DATA.hubPairsMini`, micro servos at every joint) through the same Stage A setup, which reads the model from the scene id. `core/test/sim-commands.test.ts` checks the davit scene ids equal `MODELS` by `PIPES` of `scenes/davit.ts`, and each MINI pipe through `hbf sim.sweep` against the record's Stage A rows: 0 real fails, 0 left-right contacts, 3384 poses, the 30 declared pairs of contacts.json per side, and each closest approach within 0.0005 mm of the record's 0.001 mm print (worst 0.000496 mm, computed). Each MINI sweep runs 5.7 to 7.1 s wall (measured, Apple M1, shared machine).
- `src/proxy/decode.ts` first decoded base64 with `atob`, which the package's TypeScript lib (ES2023, no DOM) does not declare, so `tsc -b` failed (routed by the M03 report, `.hbf-notes/m03-report.md`). Fixed: `bytes()` decodes through its own `B64_INDEX` table and the file names no `atob` (read 2026-10-08). The untracked `packages/sim/bench.tmp.mjs` still inlines the old form; it is the stray file named under the M02 close and is never staged.
- Lineage (audit of 2026-10-08, fidelity finding 8): the R3 page was canonical while R4 is the DAVIT revision of record (originals/davit/RECORD.md 1.2). `davit.collide/r4-page` and the new `davit.attempt/r4-page` (`sim_r4.html`) are now canonical and the two r3-page rows are copies whose source is `originals/davit/files/r3/davit.html` (the harvested page, copied with a SHA256SUMS row and a RECORD.md row marked not canonical). `chain()`, `collide()` and `attempt()` are byte-identical in the two pages (computed 2026-10-08), so no port changed. The std scenes in `packages/sim/scenes/davit.ts` are labelled an R3 and R4 hybrid fixture: R4 is MINI only, so std reads the R3 chain numbers and std parts with the R4 palm, jaws and pincap.

## M02-T07 Rotational swept volumes, OGEE16 pin heads

Goal: sim.sweep in rotate mode reproduces `check_sweep.py` on the shipped
OGEE16 geometry and finds the pin head on the proud-head fixture.

Inputs:
- `designs/ogee16/legacy/source/check_sweep.py`, `audit_print.py`, `kin.py`, `printed.scad`, `render_print.py`
- `designs/ogee16/legacy/out/print/*.stl`
- `notes/benches-mechanisms.md` OGEE16 R16 sections ("EVERY PIN HEAD SWEPT INTO ITS OWN SERVO", 577 mm3 per bar crank; after the fix latch 2.10 mm, bar cranks 3.02 mm)
- `printed.scad` comment at the `pin_seat()` module ("0.7mm of actual overlap on the eight bar cranks", latch head 0.5 mm above its case)

Steps:
1. Add `tools/py/pyproject.toml` dependencies for the oracle: trimesh, manifold3d, numpy, scipy, rtree; pin exact versions at card time and record them (the 2026-10-04 run used trimesh 5.1.1 and scipy 1.18.1).
2. Run the oracle on the shipped geometry and store its stdout as the golden: `cd designs/ogee16/legacy/source && uv run --project ../../../../tools/py python check_sweep.py`.
3. Port the sweep to TypeScript on manifold-3d (M00 pin 3.5.4): rotate each crank through 25 steps along the same placements (`kin.crank_phi` for bar cranks over the stroke, the latch crank by `asin(sin(-LCRANK_SW) + LP u / LCRANK_R)`), union the steps into one swept solid (the oracle concatenates; the port unions, so volumes may differ), intersect with every part not in the allowed set and with every servo box, and report clashes over 1.0 mm3 and the closest approach of each swept crank to a servo case.
4. Build the proud-head fixture. Copy `printed.scad` to `printed_proud.scad`; in `a_crank_row`, `a_crank_col` and `a_crank_latch` replace `drive_pin_flush()` with the legacy `drive_pin()` and remove the `pin_seat()` subtraction. Render the three crank assemblies with the command in `render_print.py` (`openscad -o <out> -D part="crank_row_asm" -D shape="circle" printed_proud.scad`, and the col and latch parts). Fail the render on any "Ignoring unknown" line (D-146). Record the OpenSCAD version. Commit the three STLs with sha256 under `designs/ogee16/legacy/fixtures/proud-head/` so CI needs no OpenSCAD.
5. Run oracle and port on the fixture. Expected from the bench record: each of the eight bar cranks sweeps into its own servo; the latch head passes about 0.5 mm above its case without a clash.
6. Free every manifold object; live count 0 after the sweep (D-055).

Files to create:
- packages/sim/src/sweep/rotate.ts
- packages/sim/src/closest.ts
- packages/sim/scenes/ogee16-cranks.ts
- designs/ogee16/legacy/fixtures/proud-head/printed_proud.scad
- designs/ogee16/legacy/fixtures/proud-head/{crank_row_asm,crank_col_asm,crank_latch_asm}.stl
- designs/ogee16/legacy/fixtures/proud-head/SHA256SUMS
- packages/sim/test/ogee-sweep.test.ts (core/test/ at M07-T10)
- packages/sim/test/closest.test.ts
- packages/sim/records/ogee-sweep.json
- tools/py/pyproject.toml (oracle dependencies)

Acceptance:
- Oracle on shipped geometry exit 0 with "no swept collisions"; port on shipped geometry: 0 clashes; closest approach latch 2.10 mm, each bar crank 3.02 mm, equal to the oracle within 0.01 mm (computed).
- `closest.test.ts` checks `closestOnTriangle`, `pointsToMesh` and `boxToMesh` over a face interior by hand arithmetic, and 2000 seeded points (Park-Miller seed 7) against an independent plane-projection and clamped-segment reference, with more than 100 landing on a face. The ogee approaches resolve in vertex and edge regions, so the sweep goldens alone never reach the face branch (verifier round 1, V5).
- Oracle on the fixture exits 1; port on the fixture: clash set equals the oracle's clash set by (crank, servo) pair, and contains exactly the eight bar cranks each against its own servo (computed).
- Per-pair clash volumes from port and oracle are both stored in the record beside the bench figure of 577 mm3 per bar crank (bench record, not reproduced in this harvest; retired by D-233). A port volume more than 2 percent from the oracle is written up in the PR as a finding, with the union versus concatenate difference checked first.
- `npm test -w packages/sim -- ogee-sweep` exit 0; manifold live count 0.

Done when: a rotating part is checked over its arc, and the regression that state sampling missed is caught by the port.

Card defects (written back 2026-10-07 by the T07 build):
- The closest approach in the acceptance is the oracle's corner measure: `check_sweep.py` line 84 takes the distance from the eight servo box corners to the swept surface, never from the box faces. The true gap from box to swept crank on the shipped geometry is 0.5 mm for each bar crank and 2.0 mm for the latch (computed; the port's `gapMm`, checked against manifold `minGap` to 1e-4 mm). On the proud-head fixture the oracle still prints 3.02 mm for the eight bar cranks it reports as clashing. The port reports both, `cornerMm` for parity (equal to the oracle within 0.01 mm, all nine cranks, both variants) and `gapMm`; M04 CHK-ASM-05 should read `gapMm`. The oracle's "tight" flag (under 1.5 mm) never fires on the shipped design, whose true bar crank gap is 0.5 mm.
- Volumes: the oracle's figure is the per-step sum over the 25 concatenated copies, 681.7 mm3 (row cranks) and 681.9 to 682.0 mm3 (column cranks). The port's per-step sum is 681.95 mm3 for each, within 0.04 percent. The port's count-once volume is 78.96 mm3 per bar crank, 88 percent below the oracle; union against concatenate was checked first and accounts for the whole difference, and manifold's own batch union of the 25 copies cut by the box gives 78.9597 mm3 (all computed). The bench figure of 577 mm3 per bar crank is not reproduced by either measure; its geometry and measure are unknown. All three are in `packages/sim/records/ogee-sweep.json`.
- Step 4: `a_crank_latch` calls no `pin_seat()`; it subtracts its own counterbore cylinder (`printed.scad` lines 428 to 434), and the fixture removes that too. The include and use paths point at `../../source`. OpenSCAD 2021.01 (vendor dmg, x86_64 under Rosetta) emits no "Ignoring unknown" line; it warns that PIN_HEAD2_D and PIN_HEAD2_H are reassigned (the known 5.5 against 6.0 head defect). Its STL facet order changes between runs: a re-render on 2026-10-07 gave the same triangle sets, volumes and bounds with different bytes, so `SHA256SUMS` pins the committed render.
- Step 2 runs the oracle on the shipped tree only. `check_sweep.py` reads `../out/print`, so the fixture run needs a temporary tree with the three crank STLs swapped in. `packages/sim/scripts/ogee_sweep_oracle.py` runs both unedited and writes `packages/sim/test/goldens/ogee-sweep-oracle.json`, with kin.py's params, crank angles and crank pin positions as independent placement checks. `npm run ogee:oracle -w packages/sim` took 66.02 s (measured, Apple M1, shared machine) and reproduced the golden byte for byte.
- Files beyond the list: profile constants `ogee16.sweepSteps` and `ogee16.sweepClashMm3` (inferred, derived from `check_sweep.py` lines 24, 85 and 94), the oracle script and golden above, npm scripts `ogee:oracle` and `ogee:record` (`ogee:record` rewrites the record in 14.12 s, measured), `tools/licences.json` rows for scipy 1.18.1 and rtree 1.4.1, and lineage rows `ogee16.check-sweep/m02-port`, `ogee16.kin/m02-port`, `ogee16.audit-print/r16p`, `ogee16.params/m02-scene` and `ogee16.printed/m02-proud-head`, each with dest.
- The port leaves out the verified union of `@hackbuild/mesh`: on the 25 copies of the shipped row crank it throws E_KERNEL after 22.8 s (measured, Apple M1), its batch audit reading 529 open edges, 9767 degenerate triangles and 479 non-manifold vertices (computed). The first T07 pass traced this to a 0.0004 mm sliver in the shipped crank that the D-054 grid weld pinches; that cause was not re-checked. The port measures against the copies directly and builds no swept solid.
- `npm test -w packages/sim -- ogee-sweep` runs in 15.66 s (measured, Apple M1, shared machine), within the 60 s budget.
- Verifier round 2, R5: `boxToMesh` measured the box gap by alternating projection from the triangle centroid, and cutting its loop to one pass survived every test, since the ogee servo boxes and crank faces sit square to each other. It was also wrong: on 400 seeded skew triangle and box pairs (seed 11) it read up to 0.134 mm too large against dense sampling, because its 1e-14 decrement stop halts a slow convergence (computed). It is now exact: zero when the triangle clipped to the closed box is not empty, else the least of triangle vertex to box, box corner to triangle, and interior triangle edge to box edge pairs. `closest.test.ts` adds a hand-worked edge pair gap of 1/sqrt(5) mm, a hand-worked slice through the box with no vertex inside (0 mm), and the 400 seeded pairs against a sampled reference (upper bound, and within longest edge / 200 below it), with both the touching and apart branches exercised more than 30 times each. The shipped and proud ogee figures are unchanged (bar cranks 0.5 mm, latch 2.0 mm, manifold `minGap` parity to 1e-4 mm, computed).
- R5 confirmed after the M02 report (2026-10-07): the alternating-projection loop no longer exists in `closest.ts`, so the old `triangleToBox` (from the round 2 scratch copy) was put back into a scratch copy of the current file with its loop at k < 64, k < 2 and k < 1; `closest.test.ts` fails on each (the 400 seeded pairs, pair 0 reads 0.2087 mm where the box and triangle touch, computed). Mutants of the exact code are caught too: no edge pair pass (2 tests fail), no corner pass (1), the box clip over one axis only (3). Baseline 8 of 8 pass. Logs and `mutate.mjs` in `fab-knowledge/evidence/leftovers/closest-r5`; the scratch source was restored and compared byte-equal to the repo file.

## M02-T08 SLUG trial runner rebuilt, seeded

Goal: SLUG's capsule physics runs headless and seeded in packages/sim, a
multi-trial vend protocol counts deliveries per vend, and the 126 of 128
figure is reproduced or reported as not reproduced.

Inputs:
- `corpus/slug/outputs/slug/slug.html`: `spawnPos` and `addCapsule` (lines 680 to 705), `step(dt, omegaRad)` (811), `relax(iters)` (916), vend button (968), reset (975), loop and `DT = 1/240` (1208)
- `corpus/slug/outputs/slug/params.json`, `slug.scad`, `BUILD.md` (line 266: "126 of 128 vends across eight trials delivered exactly one capsule. The two misses are both the first vend of a run, with the pocket starting empty.")
- `corpus/slug/outputs/slug/tri2.mjs`, `placecheck.mjs` (module-extraction pattern through `/tmp/app.mjs`)
- `notes/benches-robots-b.md` section 3
- `~/Downloads/slug.html` and `slug (1).html` to `slug (14).html`: 15 downloads, 11 distinct by sha256, mtimes 2026-08-16 11:50 to 2026-08-17 17:07; the last four equal the harvested `slug.html` (2d09238c27d5). None carries trial code; every one uses unseeded `Math.random` (computed 2026-10-04). They are the page's revision history and add no runner.
- `dl/dl-robots-machines/mandrel-spec.md` (mtime 2026-08-16 20:23): already cites 126/128 as the CHK-SIM-01 target ("SLUG def passes CHK-SIM-01 at >= 126/128 single-capsule over 8 seeded trials"), so the figure predates that file

Steps:
1. Extract the page's physics as a module the way the shipped tests did (`/tmp/app.mjs` pattern), with three.js stubbed for Vector3 math only, so the legacy code can run in node. Keep the extraction script in `designs/slug/legacy/tools/extract.mjs`.
2. Port `step`, `relax`, the funnel planes, `plateTop`, `plateTopRect`, `inHood`, `nearestPocket`, the ramp and the box walls to plain TypeScript arithmetic without changing an order of operations or a constant. Replace the `Math.random()` lateral velocity with the seeded PRNG in the same range: `(r - 0.5) * 20` mm/s on x and y.
3. Drive the motor in sim time: `motorSteps` advances by `rate * DT` per step at rate 1000 half steps/s until `targetSteps`; one vend is 4075.7728 half steps (`STEPS_REV`); rotor degrees per half step 90/4075.7728. The page advances by wall-clock frame time; the runner never reads a clock (state commits at command time).
4. Define the vend protocol in the scene, since the runner behind 126 of 128 is absent from the harvest and from Downloads and its protocol is unknown: reset with 18 capsules (lattice spawn); settle 2.0 s of sim time; then 16 vends, each a coin, a vend, the motor run to target, and 1.5 s of settle; a delivery is a capsule whose centre crosses below the deck top (`ZDECK_TOP`) during that vend's window. A vend passes when exactly one capsule is delivered.
5. Run 8 trials with seeds 1 to 8, then 30 trials with seeds 1 to 30 for the multi-trial record. Report per trial: vends, passes, the index and delivered count of every miss, and a hash of capsule positions at the end (sha256 over positions rounded to 1e-6 mm).
6. Declare the expectation 126 of 128 over 8 trials with both misses on a first vend, status `unverified` (D-136). If the port gives a different count, record it, keep the status `unverified`, and write the difference in the PR; the protocol in step 4 is the first suspect, and BUILD.md also leaves open whether 126 of 128 predates the cage drum (sheet-design.md records 56 of 56 over 4 trials after the cage rebuild).
7. The port reproduces the 58 mm mouth regression as a second scene: with `fb` set so the mouth is 58 mm, six trials give a mean well below 13 vends. The bench record is mean 5.5 of 13, worst 2 (BUILD.md line 234); the port records its own numbers and the test asserts only that the mean is below the 156 mm mouth's mean.

Files to create:
- designs/slug/legacy/tools/extract.mjs
- packages/sim/src/capsule/solver.ts
- packages/sim/src/capsule/geometry.ts
- packages/sim/src/capsule/vend.ts
- packages/sim/scenes/slug.ts
- packages/sim/scenes/slug-mouth58.ts
- packages/sim/test/slug-parity.test.ts
- packages/sim/test/slug-trials.test.ts
- packages/sim/records/slug-trials.json

Acceptance:
- `npm test -w packages/sim -- slug-parity` exit 0: with the legacy module's `Math.random` replaced by the same seeded PRNG, the legacy step and the port agree on every capsule position to 1e-9 mm after 2400 steps (10 s) of reset, settle and one vend (computed).
- `npm test -w packages/sim -- slug-trials` exit 0: two runs of seed 1 give one end-state hash; the 8-trial record is written with the measured vend count; the 58 mm mouth scene's mean is below the 156 mm mouth's mean.
- `npx --no-install hbf sim.run --scene slug --trials 8 --seed 1 --json` returns `runs` 128, `passes` as measured, `worst` naming the first miss; exit 0 when the measured set equals the declared expectation, 1 otherwise.
- The exit row reads "126 of 128 reproduced" only when the count and the miss positions match; any other outcome reads "unverified, measured N of 128".

Done when: SLUG trials are seeded and repeatable, and the 126 of 128 claim carries the status the port earned.

Long runs: `npm run slug:trials -w packages/sim` runs 8 trials, 30 trials and the 58 mm mouth
scene and writes records/slug-trials.json (40.0 s wall, measured). `npm run slug -w
packages/sim -- --trials 8 --seed 1` is the runner behind `hbf sim.run` until T11 registers it.

Local record (2026-10-07, Apple M1, darwin 21.6.0, Node 22.18.0, load average about 15 to 22;
wall times measured, counts computed):
- Parity: the legacy step and relax, extracted from the page bytes, and the port agree bit for
  bit (worst difference 0 mm) on every capsule through 2400 steps for seeds 1 and 7, and count
  the same deck crossings at the same steps.
- 8 trials, seeds 1 to 8: unverified, measured 90 of 128. Vend 1 delivers one capsule in every
  trial. Every miss is a 0-delivery vend from vend 12 or 13 to vend 16; at the end 6 or 7 of
  the 18 capsules are still above the deck, 5 or 6 of them resting on the hood. No capsule
  crosses before the first vend.
- 30 trials, seeds 1 to 30: 332 of 480; 11 or 12 passes per trial.
- Re-recorded 2026-10-14 (D-275): the solver takes its trig from src/trig.ts, an fdlibm port,
  so the counts and hashes above are equal on x64 and arm64 (computed); the 2026-10-07 arm64
  run read 91 of 128 and 335 of 480 through V8 Math.
- 58 mm mouth, seeds 1 to 6, 13 vends: mean 11.5 passes against 11.33 for the 156 mm mouth
  over the same seeds and vends. Bench record 5.5 of 13 (BUILD.md line 234, declared).
- Wall: 8 trials 7.8 s, 30 trials 27.0 s, 58 mm mouth 4.4 s; `npm test -w packages/sim --
  slug` (both files, 15 tests) 27.0 s.
- Mutation in `fab-knowledge/evidence/m02-scratch/t08`: 11 mutants, 10 caught; the survivor
  negates the quaternion ty term, which is zero for every input vector the funnel builds (all
  have x 0), so it is equivalent.

Card defects found in build:
- Step 4's protocol cannot reach 126 of 128 on this page's physics. The hood is a flat ledge
  inside the mouth square (r 100, 0 to 180 deg) and about six capsules park on it with nothing
  to move them, so the hopper stalls at vend 12 or 13 of 16. Owner question: what did the
  absent runner do (capsule count, refill, vends per run)? BUILD.md's "a possible 13 vends" for
  the 58 mm test suggests a different count. Default in force: the card protocol, status
  unverified (D-136).
- The misses do not fall on vend 1. At rotor 0 the pocket at 0 deg straddles the hood edge and
  fills, so the first vend always delivers; "the pocket starting empty" does not occur at reset
  on this page.
- Step 7's assertion fails as measured: the canonical page's solver does not arch at a 58 mm
  mouth (finite panels, no friction, and the hood is tested on the capsule centre only, line
  831, so a capsule half under the hood still drops). The bench figure came from an earlier
  page revision. slug-trials.test.ts checks the comparison against the record and fails if it
  flips without a re-record; it does not assert "below".
- `npx --no-install hbf sim.run --scene slug --trials 8 --seed 1 --json` exits 2 with E_REF
  ("sim.run is not registered in this build"); the command is T11's. The stand-in above exits 1,
  since 90 of 128 differs from the declared set.
- spec/sim.ts documents TrialResult.runs as trials and snapshotHash as a Rapier state hash; this
  card counts vends in runs (128) and fills snapshotHash with the capsule end-state hash of the
  last trial. The spec comments change at the M02 spec freeze.
- determinism.test.ts (T04) requires every scenes/*.ts to be a Rapier scene in RAPIER_SCENES;
  slug.ts and slug-mouth58.ts run on the capsule solver and join davit.ts and pawl.ts in that
  already red rule. The rule needs an engine field or a second manifest.
- Files add packages/sim/scripts/slug.mjs and the npm scripts `slug` and `slug:trials`.
  packages/sim had no vitest config, so the root 60000 ms timeout did not reach `npm test -w
  packages/sim`; the slug tests set their own. Resolved after M02 verifier round 2, where the
  sash-sweep all-pairs test timed out at the 5000 ms default in the unfiltered package run:
  packages/sim/vitest.config.ts carries the root floor, and test/timeout-floor.test.ts fails
  without it (expected 5000 to be 60000).

## M02-T09 Insertion by search, COTTER hook

Goal: sim.sweep in insert mode proves or refuses insertion of a rigid
section through a hole by best-first search, matching `hook_fit.py` verdicts
on the seven verified cases and a trapped case.

Inputs:
- `designs/cotter/legacy/tools/hook_fit.py` (copied from `x/cotter-src/tools/hook_fit.py`)
- `fab-knowledge:sources/latest/cotter-sparger.md` section 1.5 (closed-form hook rule and the seven cases)
- packages/geom from M00 (CrossSection offsets and booleans, D-163)

Steps:
1. Keep `hook_fit.py` as the oracle under uv (D-140); add shapely to `tools/py/pyproject.toml` (2.1.2 on 2026-10-04).
2. Port `hook_centreline`, `clip_poly`, `board` and `search` onto CrossSection: rod buffer resolution 16, board rows -3 to 3 at 25.4 pitch, board inset 0.01, steps tilt 1 deg and x, y 0.2 mm, the same 11 neighbour moves in the same order, priority `-minx - 0.02 * tilt` with insertion-order tie break, success when min x exceeds 0.5, limits tilt 0 to 100 deg, x -12 to 40, y -25 to 25, budget 250000 poses.
3. Port `design_full` (the closed-form rule) beside it so a case is stated by hole and board only.
4. Return per case: verdict INSERTS or TRAPPED, poses explored, max tilt, and the clearing pose.
5. Add an eighth oracle case from a shipped kit: hole 6.35, board 4.10 (the board of COTTER's first kit, `dl/dl-pip-latest/cotter/unzipped/cotter-kit_today_2026-09-21/layout.json`, `board.hole` 6.35, `board.tb` 4.1). `design_full` gives rod 5.40, bend R 6.70, sweep 68; `search` gives INSERTS, clear after 91 poses, max tilt 75 deg (computed 2026-10-04, shapely 2.1.2).

Files to create:
- packages/sim/src/sweep/insert.ts
- packages/sim/src/programs/cotter/hook.ts
- packages/sim/scenes/cotter-hook.ts
- packages/sim/test/cotter-insert.test.ts
- packages/sim/records/cotter-insert.json

Acceptance:
- `uv run --project tools/py python designs/cotter/legacy/tools/hook_fit.py verify` exit 0, 7 lines INSERTS.
- `npm test -w packages/sim -- cotter-insert` exit 0: verdicts equal the oracle on all 8 cases (hole, board: 6.35, 6.35; 6.35, 4.80; 6.35, 3.20; 6.00, 6.35; 6.00, 4.80; 7.10, 6.35; 7.10, 4.80; 6.35, 4.10); the sharp-bend case (hole 6.35, board 6.35, rod 5.40, Rb 6.0, sweep 52) is TRAPPED in both (computed).
- Pose counts and max tilt from the port are stored beside the oracle's (106, 92, 106, 100, 93, 110, 92, 91 poses; 57, 72, 82, 56, 72, 57, 72, 75 deg, computed). Equality is not gated, because CrossSection and shapely buffers differ at the vertex level; a verdict difference fails.

Done when: insertion is a sim mode with a refusal case, and the Python proof still runs beside the port.

Card defects (written back 2026-10-07 by the T09 build):
- Inputs name packages/geom; sim may not import it (`tools/tiers.json` edges.sim is spec, profile, mesh; PACKAGES.md 5.2), though T12's tiers line lists geom. The port runs on manifold CrossSection through `@hackbuild/mesh` (`loadManifold`, `kernel`, `scope`), as `src/sweep/rotate.ts` does with Manifold. `LineString.buffer(r, resolution=16)` becomes the union of hulls of consecutive 64-sided circles; clip area is within 0.05 percent and bounds within 0.01 mm of shapely's on all nine cases (computed). The T12 tiers line should read mesh, profile and spec unless the owner adds the sim to geom edge.
- Step 3: `design_full` is already ported once, as `mech/hook-rule` in packages/constraints (M01-T10), and sim may not import constraints. A second port would be a second implementation, so none was written. A case is stated by hole and board and the scene takes a `design(hole, tb)` function from its caller: T11 binds `hookRule` from constraints in core; the test binds the oracle's own `design_full` output from the golden. The sharp case carries its dims as the fixture.
- Step 5: the kit board is `state.board.hole` and `state.board.tb` in `layout.json`. The file is copied to `designs/cotter/legacy/kit-2026-09-21/layout.json` (SHA256SUMS, lineage `cotter.kit-layout/2026-09-21`) so CI reads it.
- The sharp case states no ext; `search()` without it uses `clip_poly`'s default ext 3.0 and gap 0.6, which the scene uses. With ext 2.0 it is also TRAPPED, max tilt 12 deg (computed, shapely 2.1.2).
- Step 1 needed no change: shapely 2.1.2 was already in `tools/py/pyproject.toml`.
- Files beyond the list: `packages/sim/scripts/cotter_insert_oracle.py` and `packages/sim/test/goldens/cotter-insert-oracle.json` (the oracle run unedited: `verify_all` stdout, the pairs it passes to `design_full`, each case's dims, verdict, popped path and clearing pose, shapely clip and board area and bounds, and the overlap test at 72 probe poses); 24 profile rows `hook.*` and `hookFit.*` (inferred, derived from `hook_fit.py` lines 12 to 70); npm scripts `cotter:oracle` (2.04 s wall, reproduces the golden byte for byte) and `cotter:record` (3.35 s wall), both measured on an Apple M1, shared machine; lineage rows `cotter.hook-fit/m02-insert`, `cotter.hook-fit/m02-clip`, `cotter.hook-fit/m02-oracle` and `cotter.kit-layout/2026-09-21`, each with dest.
- Result (computed): the port's verdicts equal the oracle's on all nine cases. Poses to clear 106, 92, 107, 100, 93, 110, 92, 91 against the oracle's 106, 92, 106, 100, 93, 110, 92, 91; max tilt 57, 72, 82, 56, 72, 57, 72, 75 deg, equal; clearing poses equal on all eight; the sharp case exhausts after 381 poses at max tilt 12 deg in both. The overlap test equals shapely's at all 72 probe poses. `npm test -w packages/sim -- cotter-insert` runs 14 tests in 2.4 s (measured, Apple M1).
- The sim measures: `insertSearch` returns `reached` and `stop` (clear, exhausted, budget, seated); the scene declares INSERTS or TRAPPED per case and reports the measured verdict beside it. T11 turns the comparison into the exit code.

## M02-T10 Prismatic raster sweep, SASH slide

Goal: sim.sweep in prismatic mode moves a raster body along a declared path
through a raster cavity at half steps, reports overlap cells and closest
approach, and matches SASH `runCheck` on the 21 sweep cases.

Inputs:
- `designs/sash/legacy/sash-src.zip` (`src/part2.js` `runCheck` at line 814; `sweep.py` 21 cases)
- `designs/sash/legacy/sash.html` (BENCH hook)
- `notes/benches-coins-inlay.md` section 5 (fit check table)

Steps:
1. Capture fixtures. On a copy of the SASH source (never the legacy file), add one line before `runCheck` that stores its inputs (`front`, `wall`, `slideGrids`, and per lane `N`, `p`, `Ls`, `Ws`, `slideY`, `dir`, `xLeft(k)` for k in half steps) on `MODEL`. Bake the copy, drive the 21 cases of `sweep.py` plus the default battery preset through Playwright, and write each case's inputs and `BENCH.check().lanes` to `designs/sash/legacy/fixtures/<case>.json`.
2. Port the raster sweep: for k from 0 to N - 1 in steps of 0.5, count slide cells with meta 1 that land on wall cells; keep the worst count and its k.
3. Add closest approach in mm: for each k, the smallest distance between a slide cell centre and a wall cell centre, minus half a cell pitch on each side; report the minimum over the path and its k. SASH did not compute this; it is new and reported as computed.
4. Add a negative fixture: the battery default with the wall raster shifted one cell into the slide path, built by the test from the default fixture.

Files to create:
- designs/sash/legacy/tools/capture.py
- designs/sash/legacy/fixtures/*.json (22 files)
- packages/sim/src/sweep/prismatic.ts
- packages/sim/scenes/sash-slide.ts
- packages/sim/test/sash-sweep.test.ts

Acceptance:
- `npm test -w packages/sim -- sash-sweep` exit 0: `overlapCells` and `overlapK` equal the captured `runCheck` values on all 22 fixtures (all 0 cells on the 21 cases, as `sweep.py` asserts); the shifted negative fixture reports more than 0 cells at a stated k.
- Closest approach reported for every lane of every fixture, in mm.

Done when: a slide that binds anywhere along its travel is caught between stations, with a distance when it does not bind.

Card defects (written back 2026-10-07 by the T10 build):
- Step 4: one cell does not reach the slide. At the battery default the side clearance `fit.cy` is 0.2 mm, two cells at 10 px per mm, and the bench's own runCheck on the wall raster shifted 1 and 2 cells toward the slide body reports 0 cells (computed). The negative fixture shifts `cy / px + 1` = 3 cells and overlaps 230 cells at k 0 with closest approach -0.100 mm (computed). `capture.py` records the bench's runCheck for shifts 1 to 4 in `battery-default.json`, and the test checks the port against all four.
- Step 1: no rebake. The part2 block of `sash.html` equals `src/part2.js` after trailing whitespace (`knowledge/designs/sash.md` section 1), so `capture.py` writes a temporary copy of the baked bench with one line before the runCheck call (bench line 1813) that keeps `G`, `front`, `wall` and `slideGrids` on `MODEL.capture`; the legacy files are never edited and their sha256 is checked first. The 21 cases are read from `sweep.py` inside the source zip, never retyped. Playwright 1.63.0 (the bench extra) wants Chromium build 1243, which is not installed on this machine; the script follows the harness convention (HBF_CHROMIUM, else system Chrome). Run: `uv run --project tools/py --extra bench python designs/sash/legacy/tools/capture.py`, 134.6 s wall for the 22 cases (measured, Apple M1, macOS 12.7.4, shared machine at load average about 24).
- Step 3: the closest approach is exact over the two cell sets (proof in the header of `packages/sim/src/sweep/prismatic.ts`), and the test checks it against an all-pairs distance on the 6 px per mm fixture, clear and overlapping. Over the 22 fixtures it runs 0.100 mm (`tight fits thin walls`, `fit.cy` 0.1) to 0.550 mm (`loose fits thick`, `fit.cy` 0.6), each within one cell of the smaller of `fit.cy` and `fit.cx` (computed). Mid-travel binding is covered by a synthetic comb that hits a pillar only at half steps.
- Files beyond the list: lineage rows `sash.bench/r2`, `sash.prismatic-sweep/part2` and `sash.sweep/sash-src`, each with dest. The port row is canonical under its own subject because `part2.js` is already canonical under `sash.parts` and `sash.run-check`, and a copy row of the same file fails `tools/test/lineage.test.mjs`.
- `npm test -w packages/sim -- sash-sweep` runs 29 tests in 10.63 s wall including `tsc -b` (measured, Apple M1, shared machine), within the 60 s budget. Six mutations of the port and scene were each caught (scratch copy and log under `fab-knowledge/evidence/m02-scratch/t10`).
- Leftover fix after the M02 report (2026-10-07): the all-pairs reference in `sash-sweep.test.ts` cost about 1.4 s per position by brute force on `res-6-6-copies` (measured, Apple M1, load about 13), so 'clear: equals the all-pairs distance at every fourth position' took 2.3 s alone and passed 5000 ms under full-suite load. It now reads the wall cells once, sorted by x, and scans outward from each body cell until dx squared reaches the best squared distance, which skips no nearer pair; the clear test runs in 0.2 s and the overlapping one in 0.08 s (measured). A new test compares the pruned scan with the brute-force scan, equal to the bit, on 40 seeded random rasters at three positions each; cutting the pruning bound to a quarter or dropping the leftward scan fails it (scratch log under `fab-knowledge/evidence/leftovers`). The fixture assertions are unchanged.

## M02-T11 Commands, closest approach, commit at command time

Goal: sim.run, sim.sweep, asm.solve and part.probe exist as hbf commands
returning CommandResult, and every outcome is computed at command time.

Inputs:
- spec/commands.ts (CommandName, CommandResult), spec/sim.ts (SimHandle: `closestApproach`, `sweep`, `trials`), spec/errors.ts (EXIT_CODES)
- `syn/api-library-ai-design.md` 5.1 and 5.2 (groups; MCP rows 11, 12 and 14)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/03-diagnostics.md` row "nothing ever latches under headless"

Steps:
1. Register the commands in core with their groups: sim.run and sim.sweep in prove, asm.solve and part.probe in build (D-106).
2. Arguments. Every command takes `--build <hbf://build/...>` as the spec states. Legacy designs are not CHASE (working name) documents until M10, so M02 adds `--scene <id>` resolving to a registered scene under packages/sim/scenes/; the flag is CLI-only, documented as transitional, and removed when every scene has a chase (M10). The MCP tool arguments of D-107 do not change.
3. sim.run: `--trials`, `--seed`; returns `runs`, `passes`, `worst`, per-trial rows and `snapshotHash` (Rapier scenes) or end-state hash (capsule scenes).
4. sim.sweep: `--mode pose|rotate|prismatic|insert`, `--steps`; returns clashes `{with, mm3}`, `sweptHash`, closest approach per moving body `{mm, at, state}`, and real fails for pose mode.
5. asm.solve: places the scene's bodies at one named pose (`--pose`) and returns placements, pairwise clashes and closest approach per declared joint; for DAVIT it applies the bisection clamp of `attempt()` (8 iterations) when `--clamp` is given and reports the clamped value.
6. part.probe: `--a`, `--b`, optional `--pose`; returns closest approach in mm with the two points.
7. Verdicts: these commands return measurements. When the scene declares an expectation (pass set, zero real fails, a clash set), the result carries the verdict of measured against declared and the exit code follows EXIT_CODES: 0 equal, 1 different, 2 input error.
8. Commit at command time: the browser drive and the CLI call one function that steps a fixed DT to completion. Add a test that runs the SLUG single-vend scene under three frame schedules (every step rendered, 2 frames in 700 ms, no frames) and asserts one end-state hash.
9. Pin the command count in `core/test/surface.test.ts` to the cumulative total of MILESTONES.md 1.3 at M02 exit.

Files to create:
- core/src/commands/sim.run.ts
- core/src/commands/sim.sweep.ts
- core/src/commands/asm.solve.ts
- core/src/commands/part.probe.ts
- packages/sim/src/commit.ts
- packages/sim/src/scenes.ts (scene registry)
- packages/sim/test/commit-at-command.test.ts
- core/test/sim-commands.test.ts
- core/test/surface.test.ts (count updated)

Acceptance:
- `npx --no-install hbf sim.sweep --scene ogee16-cranks --mode rotate --json` exit 0 on shipped geometry; stdout lists 9 closest approaches with 2.10 and 3.02 mm values.
- `npx --no-install hbf sim.sweep --scene ogee16-cranks-proud --mode rotate --json` exit 1; clashes list the eight bar cranks.
- `npx --no-install hbf sim.sweep --scene cotter-hook --mode insert --json` exit 0; `npx --no-install hbf sim.sweep --scene cotter-hook-sharp --mode insert --json` exit 1.
- `npx --no-install hbf asm.solve --scene davit-std-1in --pose REACH --json` exit 0 with zero real fails and a closest approach per declared pair.
- `npx --no-install hbf part.probe --scene davit-std-1in --a crank --b upper --pose HANG --json` exit 0 with a distance in mm.
- `npx --no-install hbf sim.run --scene nope --json` exit 2 with E_REF and a didYouMean list.
- `npm test -w packages/sim -- commit-at-command` exit 0; `npm test -w core` exit 0.

Done when: a script or a model can run every M02 mode from the CLI and read numeric results.

Corrections found while building (2026-10-07):
- Files beyond the list: `core/src/registry.ts` (four CommandDefs and CLI forms), `core/src/text.ts` (text mirror lines), `core/src/resolve-hook.ts` (a missing relative `.js` retries as `.ts`, so Node loads `packages/sim/scenes/*.ts`, which import their src by the `.js` names), `packages/sim/src/index.ts` (exports), `packages/sim/src/capsule/vend.ts` (each vend runs through `commitAtCommand`, so the CLI and a future browser drive share one stepping function; the T08 record hash is unchanged), and two `lineage.json` rows (`davit.attempt/r3-page`, `slug.vend-command/slug-12`).
- `packages/sim` is headless and has no node types, so the registry reads no file: core hands it `SceneDeps.load` and `readText`, and binds the COTTER design to `mech/hook-rule` plus the `hook.ext` and `hook.gap` rows.
- spec/commands.ts inputs have no `scene`, `mode`, `pose`, `clamp`, `a` or `b`, and require `build`, `joint` and `part`. Core widens its zod inputs with the CLI-only fields and casts; `SweepResult.clashes[].mm3` is typed number, while pose and prismatic clashes measure no volume and carry null. Both are open spec items for the M02 exit (T12); the MCP arguments of D-107 are unchanged. Closed 2026-10-08 (audit fixer round): `SweepResult.clashes[].mm3` is nullable on the sim.sweep command output (`SweepResult<number | null>`, spec/sim.ts and spec/commands.ts) while `SimHandle.sweep` stays number, so CHK-ASM-05 and CHK-MOT-02 keep their `c.mm3 > floor` test; the inputs item stays a CLI-only core layer under D-107, not a spec change: `core/src/registry.ts` cliRun and example are the one place the widened input meets CommandDef, the sim.sweep output typechecks with no cast, and the layer comes out at M10.
- The fixture scenes (`ogee16-cranks-proud`, `cotter-hook-sharp`) declare what the shipped design requires (no clash, every hook INSERTS), which is how they exit 1. `SHARP_CASE.expect` TRAPPED stays the T09 oracle expectation.
- `--json` carries the full computed floats (3.0170 and 2.1006 mm, corner measure of check_sweep.py); 2.10 and 3.02 print in each closest `line` and in the text mirror, and the true box gap (0.50 and 2.00 mm, computed) travels as `extra.gapMm`.
- A scene that declares nothing returns verdict skip and exit 0 (part.probe, slug-vend1, slug-mouth58); `resultOk` gives ok false for skip.
- part.probe answers the scene form only; the point, ray and section probes of the spec need a built part and land with chases.
- No browser drive exists yet; `commitAtCommand` is the function it must call. The commit test runs the page's own loop as its control: drawn every step it equals the committed end state, starved of frames it does not.
- Wall times (measured, Apple M1, shared with the M03 build): `npm test -w packages/sim -- commit-at-command` 11.1 s; `core/test/sim-commands.test.ts` 49.4 s; `npm test -w core` 85.3 s; `hbf sim.run --scene pawl` 62.4 s and `--scene slug` 9.4 s, neither PAWL run in a default test.
- The status line printed `0 fail  0 warn  0 pass  0 skip` on every sim result (M02 report). `simResult` in `core/src/commands/sim.run.ts` now counts the one comparison the command makes, measured against declared, once under its verdict, so `hbf sim.run --scene slug` prints `FAIL sim.run    1 fail  0 warn  0 pass  0 skip`, and a scene that declares nothing counts one skip (AGENT-SURFACE.md 6.2). findings stays empty until the M04 checks read these measurements, since the comparison is no registered check. asm.solve and part.probe share `simResult` and count the same way. Golden: `core/test/goldens/sim-status.json`, six status lines written from the oracles and records, checked by `core/test/sim-status.golden.test.ts`; putting the zero counts back fails all six. The target in the status line stays empty under `--scene`.

## M02-T12 Close the milestone

Goal: M02 is green by MILESTONES.md Part 3 and its records are in the repo.

Inputs:
- MILESTONES.md Part 3
- D-040 pin table

Steps:
1. Re-date the pin table (rule 10). If Rapier moved past 0.21.0, rerun T03, T04 and T05 before closing.
2. Write the exit table below with measured values filled from the records.
3. Run lint-voice over every file added.
4. Add the open questions to the PR body: PAWL target under 0.21.0 if T03 is blocked; the PAWL open-loop label; the SLUG vend protocol and whether 126 of 128 predates the cage; which DAVIT pose count (416, 420, 402, 532) the bench claim meant; a runtime budget for granular trials.

Files to create:
- none beyond the records already named

Acceptance:
- `npx tsc -b` exit 0.
- `node tools/lint-voice.mjs` exit 0.
- `node tools/counts.mjs && git status --porcelain` exit 0, empty output.
- `node tools/tiers.mjs` exit 0 (sim imports mesh, profile and spec only; profile from tests only, as a devDependency).
- CI green: house-rules, typecheck, derived, tiers, seed, unit, property, contract, parity, determinism.

Done when: CI is green on the push the owner asks for and the exit table holds measured numbers.

Close record (written 2026-10-07 by the T12 build). M02 is not green. The locally runnable
exit rows pass except `determinism` (since fixed, T04 card defect 8); CI has not run (nothing is pushed, D-006), PAWL is
blocked on the Rapier 0.14 to 0.21 regression, the SLUG row is unverified, and snapshot hashes
are not admitted to BuildInputs. Every run below was made on 2026-10-07 on an Apple M1, macOS
12.7.4 (darwin 21.6.0 arm64), Node 22.18.0, shared with the M03 build at load average 29 to 43
(measured, `uptime`), with SOURCE_DATE_EPOCH 315532800. Wall times are measured on that
machine and include the contention.

| exit row | command | got | qualifier | wall | met |
|---|---|---|---|---|---|
| snapshot hash equal across two runs | `npm test -w packages/sim -- determinism` | rerun after the T04 fix (card defect 8): exit 0, 9 of 9; drop, granular-funnel and PAWL first trials repeat on two runs, PAWL `60 s` and `x 0.12 N.s` equal the committed port record. `npm run snapshots -w packages/sim`: 48 trials twice, 0 differ, all 17 PAWL hashes equal the committed record. First run 1 of 7 failed on the old registration rule (cotter-hook) | computed | 17 s and 18 s (two runs); one run took 985 s at under 2 percent CPU while swap stood at 9.4 of 10 GB (measured), not reproduced; snapshots 98 s | yes |
| hash equal across x64 and arm64, 47 trials | CI determinism job | not run (CI, D-006). The record now holds 48 trials (drop 1, granular-funnel 30, PAWL 17; card defect 8). Local proxy: the 30 granular hashes match between the arm64 and Rosetta 2 x64 records, and the 17 PAWL hashes of `records/pawl-0.21.0-arm64.json` and `-x64.json` are equal | computed | not run | not run |
| 30-trial granular runtime on both architectures | `npm run bench:granular30 -w packages/sim -- --runs 3` | from the records, not rerun (the bench rewrites them): arm64 trial p50 195.4 ms, p90 333.5 ms, run total p50 5.9 s; x64 under Rosetta 2 trial p50 306.2 ms, p90 473.9 ms, run total p50 10.69 s; `machine.image` local on both | measured | 5.6 to 11.2 s per run | local only; CI not run |
| DAVIT std, three pipes, both arms | `npm test -w packages/sim -- davit-sweep` | exit 0, 6 of 6; record: 30 declared pairs per pipe per side, 1692 gated poses, 0 real fails and 0 left-right contacts in Stage A and Stage B for std and MINI on 1in, 125in, 15in, both arms | computed | 89 s, over the 60 s budget under this load | yes |
| DAVIT masks keyed, stale gives E_STALE | `npm test -w packages/sim -- davit-masks` | exit 0, 5 of 5 | computed | 8 s | yes |
| DAVIT R4 parity | `npm test -w packages/sim -- davit-r4-parity` | exit 0, 7 of 7 in 2 files; the default run covers 125in, 144 of the 420 poses; the full 420 run in `npm run davit:sweep -w packages/sim` (521.8 s, T06 record); in-repo `verify_sim.py` not run (`data_r4.json` absent; scipy is now pinned by T07) | computed | 37 s | yes, default subset |
| OGEE16 shipped and proud-head | `npm test -w packages/sim -- ogee-sweep` | exit 0, 14 passed, 1 skipped (the record writer); record: shipped 0 clashes, latch 2.10 mm, bar cranks 3.02 mm; proud head: the eight bar cranks clash with their own servo, per-step sum 681.95 mm3 beside the oracle 681.7 to 682.0 and the bench 577 mm3 (not reproduced, retired by D-233), union 78.96 mm3 | computed | 23 s | yes |
| PAWL | `npm test -w packages/sim -- pawl-suite` | exit 0, 8 of 8; records: legacy 15 of 17 on 0.14.0 on arm64 and Rosetta 2 x64; port 9 of 17 on 0.21.0 on both; reads "recorded, target not met", scene status blocked | computed | 12 s | blocked |
| SLUG | `npm test -w packages/sim -- slug-trials` | exit 0, 10 of 10; "unverified, measured 90 of 128" (8 seeded trials); 30 trials 332 of 480 | computed | 35 s | unverified |
| COTTER | `npm test -w packages/sim -- cotter-insert` | exit 0, 14 of 14; 8 of 8 INSERTS equal to the oracle, sharp case TRAPPED | computed | 4 s | yes |
| SASH | `npm test -w packages/sim -- sash-sweep` | exit 0, 29 of 29; 22 fixtures equal to `runCheck`, all 0 overlap; negative fixture 230 cells | computed | 10 s | yes |
| commands registered, commit at command | `npm test -w core`, `npm test -w packages/sim -- commit-at-command` | exit 0, 222 of 222 in 23 files; exit 0, 7 of 7 | computed | 88 s; 23 s | yes |
| live count 0 after every suite | each suite asserts it | asserted in rapier-world (exit 0, 9 of 9), pawl-suite, ogee-sweep, cotter-insert, all passing above | computed | 2 s for rapier-world | yes |
| spec changes forced (rule 19) | none made | two open items from T11: spec/commands.ts inputs lack `scene`, `mode`, `pose`, `a`, `b` (core widens its zod inputs), and `SweepResult.clashes[].mm3` is typed number while pose and prismatic clashes carry null. spec/sim.ts stays draft past SnapCurve because M02 is not green. 2026-10-08: mm3 is nullable on the command output, the inputs stay a core CLI layer (D-107) | none | none | mm3 closed; inputs at M10 |

Global rows, same machine and date: `npx tsc -b` exit 0 (3.5 s); `node tools/lint-voice.mjs`
exit 0, 1103 files, 0 block, 1 warn (RULES.md:31); `node tools/tiers.mjs` exit 0 (sim imports
`@hackbuild/mesh` and `@hackbuild/spec` from src, plus `@hackbuild/profile` from tests);
`node tools/counts.mjs && git diff --exit-code -- docs/plan/counts.json docs/plan/PLAN.md`
exit 0 (the working-tree form of 3.3). The literal `node tools/counts.mjs && git status
--porcelain` prints every staged file, because the repo has no commit (D-006). CI: not run.

Pins (step 1): re-verified and re-dated 2026-10-07 in PLAN.md section 16 and PACKAGES.md 2.1
and 8.5. Rapier 0.21.0 is still the registry latest (vendor, `npm view`), so T03, T04 and T05
do not rerun for a pin.

Mutations (scratch copy and log at
`fab-knowledge:evidence/m02-scratch/t12/`, `mutate.mjs`,
`results.json`): baseline admission and cotter-insert exit 0, 18 of 18. M1
`simSnapshotsAdmitted = true` in `src/admission.ts`: admission exit 1, the flag test fails
(expected true to be false). M2 the insertion clear test `here > st.clearX` loosened to
`st.clearX - 1` in `src/sweep/insert.ts`: cotter-insert exit 1, 3 of 14 fail. Both caught.

Card defects found at close:
- The tiers line listed geom; `tools/tiers.json` gives sim spec, profile and mesh only (T09
  defect). The line above now reads mesh, profile and spec.
- Step 4 names a PR body and no PR exists (D-006). The questions are listed below for the PR
  the owner asks for.
- `determinism` is red on a T04 rule that every file under `scenes/` is a RapierScene. Six of
  the seven files there build no world (none names a Rapier world, counted by grep), and PAWL
  is not registered (T03 defects). T12 edits no T04 file; the fix is a T04 exemption for non-Rapier
  scene files plus the PAWL adapter in `src/rapier/scenes.ts`.
  Fixed after verifier round 1 by the T04 fixer, 2026-10-07: T04 card defect 8.
- `packages/sim/bench.tmp.mjs` (untracked, 2026-10-06 22:55, a bundle that inlines
  `src/proxy/decode.ts`, built from `/private/tmp/bench.ts` by its header) is a stray file from the T06 build; left
  in place for its owner, never staged.
- M02 hunks in `packages/sim/package.json` and `tsconfig.json` (the davit, ogee and cotter
  scripts, the mesh reference), `packages/profile/data/constants.json` (the davit, hook,
  hookFit and ogee rows) and `tools/licences.json` (the Rapier row) were unstaged; the staged
  tree lacked the Rapier licence row its lockfile needs. T12 staged those four files after
  checking every hunk was M02's.
- Default test wall times: davit-sweep took 89 s and `npm test -w core` 88 s under load
  average about 30, over the about 60 s budget; the T06 record had 42.4 s for davit-sweep.

Open questions for the PR body (D-006 process, rule 15), each with the default in force:
- PAWL under Rapier 0.21.0: 9 of 17 against the legacy 15 of 17 (computed); the drop follows the
  version. Default: expectation kept at the legacy set, scene blocked, no constant retuned
  (D-231, D-134, T03).
- PAWL open-loop trial: labelled "should fail", passes on 0.14.0. Default: declared by its
  measured legacy outcome, pass (D-153).
- SLUG vend protocol and 126 of 128: the runner is absent (D-180); the card protocol measures
  90 of 128 (computed) and the hood ledge stalls the hopper at vend 12 or 13. Does 126 of 128
  predate the cage drum, and what count, refill and vends per run did the runner use? Default:
  card protocol, status unverified (D-136, D-232).
- DAVIT pose count: which of 416 (`README_R4.md`), 420 (`verify_sim.py`), 402
  (`mandrel-spec.md`) or 532 (`notes/benches-robots-a.md`) the bench claim meant. Default: M02's
  gated set of 1692 poses per configuration, with 420 as the parity set only (D-135, D-188).
- Granular runtime budget: no decision sets one. Recorded locally: arm64 trial p90 333.5 ms,
  run total p50 5.9 s; Rosetta 2 x64 p90 473.9 ms, 10.69 s (measured). Default: no budget,
  numbers recorded (D-134).
- DAVIT `verify_sim.py` in the repo: commit a generated `data_r4.json` or drop the acceptance
  row (T06). Default: oracle run in scratch only, VERIFY PASS.
- Spec: widen spec/commands.ts sim inputs and make `SweepResult.clashes[].mm3` nullable (T11). The mm3 half closed 2026-10-08 (`SweepResult<number | null>` on the command output); the inputs stay the core CLI layer until M10 (D-107).
  Default: core widens its own zod inputs; spec unchanged.

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| snapshot hash equal across two runs | computed | T01, T04 | `npm test -w packages/sim -- determinism` |
| snapshot hash equal across x64 and arm64, 47 trials | computed | T04 | CI determinism job |
| 30-trial granular runtime recorded on both architectures | measured | T05 | `npm run bench:granular30 -w packages/sim -- --runs 3` |
| DAVIT std, 1in, 125in, 15in: 30 declared pairs per pipe per side, 0 real fails, both arms, 0 left-right contacts | computed | T06 | `npm test -w core -- davit-sweep` (M07-T10) |
| DAVIT masks keyed by meshHash and poseSetHash; stale key gives E_STALE | computed | T06 | `npm test -w core -- davit-masks` (M07-T10) |
| DAVIT R4 parity: 43 pair sweeps, 0 intersections except the declared press fit; `verify_sim.py` 420 poses 0 fails; R3 grip-tab fixture reported | computed | T06 | `npm test -w core -- davit-r4-parity` (M07-T10) |
| OGEE16 shipped: 0 clashes; closest approach latch 2.10 mm, bar cranks 3.02 mm | computed | T07 | `npm test -w core -- ogee-sweep` (M07-T10) |
| OGEE16 proud-head fixture: eight bar cranks clash with their own servo; per-step sum about 682 mm3 per bar crank over 25 steps, within 2 percent of `check_sweep.py`; the bench 577 mm3 is retired (D-233) | computed | T07 | same |
| PAWL: legacy record 15 of 17 on 0.14.0; port meets the declared set on 0.21.0, or reported blocked with the per-trial diff (blocked at 9 of 17 on 0.21.0; the pin is owner decision D-231, default 0.21.0) | computed | T03 | `npm test -w packages/sim -- pawl-suite` |
| SLUG: 8 seeded trials, 128 vends; 126 of 128 reproduced, or "unverified, measured N of 128" (126 of 128 is declared and unverified, D-232; measured 90 of 128) | computed | T08 | `npm test -w packages/sim -- slug-trials` |
| COTTER: 8 of 8 INSERTS equal to the oracle (7 verify cases plus the 6.35, 4.10 kit board); sharp-bend case TRAPPED | computed | T09 | `npm test -w packages/sim -- cotter-insert` |
| SASH: 22 fixtures equal to `runCheck`; negative fixture overlaps | computed | T10 | `npm test -w packages/sim -- sash-sweep` |
| sim.run, sim.sweep, asm.solve, part.probe registered; outcome independent of frame schedule | computed | T11 | `npm test -w core`, `npm test -w packages/sim -- commit-at-command` |
| Rapier worlds and manifold objects: live count 0 after every suite | computed | T01, T03, T07 | each suite asserts it |

## Blockers and owner questions

| item | state | default in force |
|---|---|---|
| PAWL under Rapier 0.21.0 | 9 of 17 against 15 of 17 on 0.14.0 (computed, one machine); the drop follows the version, not the deterministic build | T03 keeps the legacy set as the target and reports blocked; no constant retuned without an owner answer; owner decision D-231, default 0.21.0 kept (D-134) with both records |
| PAWL open-loop trial | labelled "should fail", passes on 0.14.0 | declared by its measured legacy outcome; question listed in the PR |
| SLUG 126 of 128 | runner absent from the harvest and from Downloads (D-136, D-180); the 15 `slug.html` downloads carry no trial code and use unseeded `Math.random`; `mandrel-spec.md` (2026-08-16 20:23) already cites 126/128; protocol unknown; may predate the cage drum (56 of 56 over 4 trials after the rebuild, sheet-design.md); the T08 runner measures 90 of 128 (computed) | T08 protocol; 126 of 128 declared and unverified (D-232) |
| DAVIT legacy pose counts | the counts disagree: `README_R4.md` 416 random poses, `verify_sim.py` 420 poses (4 presets plus 416 draws), `mandrel-spec.md` 402 poses (CHK-INT-02 row), `notes/benches-robots-a.md` 532; the calibration itself (`pack_sim.py`) sweeps one joint per pair at 1 deg and has no fixed pose list | M02 uses its own gated set (T06 step 4) and its own seeded combined set; `verify_sim.py` 420 is the parity set only |
| DAVIT MINI | masks exist; D-135 names no model | std gated; MINI recorded |
| DAVIT R4 | found in Downloads: `dl/dl-robots-machines/davit_r4.zip`, unzipped at `dl/dl-robots-machines/unzipped/davit_r4/`, with `sim_r4.html` | parity reference in T06 steps 9 to 11; copied to `designs/davit/legacy/r4/`; not ported |
| OGEE 577 mm3 | bench chat record; not reproduced by `check_sweep.py` (681.7 to 682.0 mm3 per bar crank) or the port (681.95), both 25-step sums (computed) | retired (D-233); proud-head fixture rebuilt from `drive_pin()` in `printed.scad`; about 682 mm3 recorded as computed, clash set gated |
| OpenSCAD version for the fixture | not pinned by any decision | recorded at render time; STLs committed so CI does not run it |
| granular runtime budget | no decision sets one | numbers recorded; owner asked |

## Hands off to

M04 registers CHK-ASM-05 (swept volume) and the assembly and motion checks
on the sim modes here and turns the constant-interference metric into a
verdict. M06 uses the trial runner for canon goldens. M07 moves the DAVIT
chain into motion's kinematics module (D-139) and drives OGEE and SLUG
programs. The reference entries `machines/davit-joint`,
`machines/pawl-leg`, `machines/slug-drive` and `mechanisms/slider-badge`
take the records of this milestone as their `expected/sim.json` when they
are written with a chase in M10 and M11.
