# M06 canons

Version 4, 2026-10-04, revised 2026-10-05 for the originals (D-222). Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: Compose from known-good modules.
Depends on: M02, M05
Adopted dependency: none; canons run on the kernels M00 to M05 landed (MILESTONES.md 1.2)
Commands added: mech.find, mech.derive, arch.find, arch.apply (MILESTONES.md 1.3)
Release at exit: none

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document. STYLUS (working name, was
FEELER) is the printed sensor design built from archetypes (D-164). PIP (was
HAFT) is the published print-in-place controller at hackbuild/pip-controller
(D-013). The circuit canon package is `archetypes`, formerly `circuits`
(D-014). Every number in this file carries a qualifier (measured, computed,
vendor, inferred, unknown) and a source (D-007). Numbers marked "computed,
this card" were recomputed on 2026-10-04 with node v22.12.0 from the named
legacy file; the port must reproduce them, and the golden records what the
port computes.

The owner's originals are the bar (D-222). The source of record for every
mechanism and archetype is the original file and function its row in
`knowledge/designs/MECHANISMS.md` names, under
`fab-knowledge:originals/<slug>/files/`,
with the record `knowledge/designs/<slug>.md` saying how it was made. A
card below that cites a corpus or evidence copy reads it only after its
sha256 equals the canonical row in lineage.json; where it differs, the
port reads the original and the PR names the difference. The generated
mockups at `fab-knowledge:mockups/` are
quarantined: no card reads, cites or copies a number, shape or layout from
them.

## What this milestone decides and carries

M06 turns two YAML seeds into typed registries. A mechanism is a
`MechanismDef` whose `derive()` computes its governing numbers in
TypeScript; an archetype is an `ArchetypeDef` whose
`apply({draft, face, params, profile})` returns bodies, features, ports and
material slots that the kernel merges into the host `PartDraft` before
stage 1, for every entry in `chase.applied` (D-095, D-165). The seed's
equation strings become docs. Composition then means picking registry
entries with checked interfaces, which is within reach of a much weaker
model than designing a mechanism from nothing (PLAN.md section 10).

| item | decision or correction | where in this file |
|---|---|---|
| two registries, typed defs with derive() and apply() | D-095, D-014 | M06-T01 |
| 24 seeded mechanisms typed or marked stub | D-097 | M06-T02, M06-T03, M06-T05 |
| canon corrections as goldens (detent, Geneva, seed cube, slew ring, snap family, counterbalance, metering ratio, crank-yoke) | D-096 | M06-T04, M06-T05 |
| TUMBLER 18 modules regenerate and pass their parity suite | D-097, PLAN.md section 21 | M06-T02 |
| KNURL Geneva and detent reproduce | D-096 | M06-T04 |
| 29 archetypes with tiers and corrections (splits, demotion, hex key, buried stack, stick, SuperMini tier, wire cups) | D-096, D-097, D-085, D-088 | M06-T07 |
| archetype resistances computed at load, tier propagates | D-098, D-081, C-09 | M06-T07 |
| four PIP buttons at PIP defaults with fits and feel readouts | D-096, D-071, D-079 | M06-T08 |
| `spring` feature kind admitted with the click spring as evidence | D-059, D-058 | M06-T08 |
| FEELER THINPOT 22 archetypes as candidates, encoder B phase step/4, `armW` defined | D-097, D-164 | M06-T10 |
| references written in this milestone for every admitted entry | D-105, MILESTONES.md rule 5 | M06-T06, M06-T09 |
| mech.find, mech.derive, arch.find | D-106, D-114 | M06-T11 |
| arch.apply places a BLOCKS stud on a fresh prism; every conductor check runs unchanged | D-106, D-115, D-132 | M06-T12 |
| BLOCKS standard stays open: both standards ship as presets | D-087 (owner, default none until a print) | M06-T07, M06-T12 |
| SuperMini dual-supply jumper default normally open | D-088 (owner, default normally open) | M06-T07 |
| pip.ino KEY_WAIT_US 200 stays untouched; archetype provenance records the gap | D-080 (owner, default no edit) | M06-T08 |
| teen and class kits wait | D-151 (owner, default after M06) | not in this milestone |
| typed or proven means the port regenerates the original's numbers and geometry, recorded from the original file | D-222, D-156 | "The originals rule", M06-T06, M06-T09 |
| the proven designs and mechanisms of the sample set registered with their original as source, so none is lost | D-222, D-097 | M06-T14 |
| aileron-differential typed from STANCHION `solveHorns`; slew-ring-joint sourced from PINTLE R6 | D-097, D-222 | M06-T03, M06-T05 |

Detail on the entry tables lives in ../CANONS.md; check rewrites in
../CHECKS.md; profile rows in ../PROFILE.md; command shapes in
../AGENT-SURFACE.md; package boundaries in ../PACKAGES.md. This file holds
what a builder runs.

## Evidence roots

| short | absolute path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| syn | `fab-knowledge:synthesis/` |
| src | `fab-knowledge:sources/` |
| corpus | `fab-work-directory:benches/` |
| orig | `fab-knowledge:originals/` (files, SHA256SUMS, shots, RECORD.md per design) |
| designs | `knowledge/designs/` in the repo (byte-identical copies of each RECORD.md, plus INDEX.md and MECHANISMS.md) |

Short names expand by plain prefix, as in MILESTONES.md. Cards write
evidence paths in full.

## Package placement

`tools/tiers.json` puts `mechanisms` and `archetypes` in tier 1 with an
empty `sameTier` list (M-1-T12). Neither package may import another tier-1
package, so neither imports `sim`, `circuit`, `copper` or `constraints`.

| need | how it is met without a same-tier edge |
|---|---|
| a mechanism or archetype rule as an interval | the canon package exports `ConstraintDef` objects typed against `@hackbuild/spec`; `core` registers them at load (D-044, registration by inversion) |
| click spring force curve | the archetype emits a `spring` feature; the sim FE from M01 (`packages/sim/src/fe/`) computes the curve as Part IR metrics when `core` builds the part (D-049) |
| net resistance | the archetype declares conductor sections; `circuit` computes per-net resistance after the build (M05) |
| resistance at load for registry readouts | `archetypes` reads `profile` (tier 0) through `ProfileLookup` (D-098) |

Archetype readouts use the declared section and CHK-NET uses built geometry, so the two values differ by design; only the formula is shared. Both packages call `profile` `sectionResistance` (M00-T02), the one home of R = rho L / A.
| sheet outlines for TUMBLER parts | `mechanisms` uses `geom` (tier 0) `CrossSection` offsets (D-163) |
| trial runs for canon goldens | `core` drives `sim` with the mechanism's generated parts (M02 trial runner) |

Allowed imports for both packages: `spec`, `profile`, `catalog`, `geom`,
`mesh`. A change to that list is a tiers.json change with a decision id; no
card in this file needs one.

## Status values used in both registries

D-097 allows an entry to be typed or marked stub. This file uses four
status values and one admission rule. The rule is this milestone's
reading of MILESTONES.md rule 5 together with D-097; it is listed for
DECISIONS.md under gaps in the exit PR.

| status | meaning | derive or apply | needs a reference to hold the status |
|---|---|---|---|
| typed (mechanisms) or proven (archetypes) | admitted: governing numbers computed and reproduced against a harvested legacy source | runs | yes, written in this milestone |
| stub | registered with id, family and provenance; no harvested source can prove a derivation | refused with E_REF naming the gap | no; listed as a coverage gap |
| candidate | registered with params and provenance; promotion waits for a reference in a named later milestone or for an owner answer | refused with E_REF naming the promotion milestone | no |
| unproven | demoted by a correction; the design it came from never implemented part of it | refused with E_REF naming the defect | no |

Every stub, candidate and unproven entry appears in the M11 coverage test
as a gap with its reason, never as covered.

## The originals rule

An entry reaches typed or proven only when its port regenerates the
original. "Reproduced against a harvested legacy source" in the status
table means all four of these, for every typed mechanism and proven
archetype in this milestone and in every later one that promotes an
entry:

| condition | what is compared | tolerance | where it is recorded |
|---|---|---|---|
| source pinned | the original file named by the entry's MECHANISMS.md row; its sha256 equals the canonical row in lineage.json and the line in `orig/<slug>/SHA256SUMS` | exact | `provenance.original {slug, file, fn, lines, sha256}` on the def |
| numbers regenerated | every number the original computes for the entry (readouts, fits rows, derive outputs, check verdicts), recorded by running or evaluating the original file at its defaults and at each preset the record names | equal to the printed precision of the original; a number the original prints as text compares as text | `expected/legacy.json`, each value with the command or line that produced it |
| geometry regenerated | the bodies the original builds for the entry: per-slot volume and bounding box for 3D bodies, outline point sets for sheet and copper parts | volume within 1e-3 mm3, bounding box within 1e-6 mm, outline Hausdorff within 1e-6 mm; raster bodies by the M10-T08 raster rule | `expected/legacy.json` plus the meshes or outlines under `expected/legacy/` |
| how it was made | the record's construction notes for the entry (section 5 of `designs/<slug>.md`): order of operations, the parameters the user sets, the rules the bench enforces | a test per stated rule; a rule with no test is listed in the PR | the reference README "made the way the original makes it" list, citing record section and lines |

A port that regenerates the numbers and not the geometry, or the
geometry and not the numbers, stays candidate with that reason. A source
that does not run headless is driven in a browser through its BenchHook
adapter (M09-T12) or the record's own drive script under
`orig/<slug>/drive/`; a source that cannot be run at all leaves the entry
candidate with reason "original not runnable" and never takes numbers
from prose. Nothing is recorded from the quarantined mockups.

---

## M06-T01 Canon contracts and the two registries

Goal: `packages/mechanisms` and `packages/archetypes` load every seeded row
into typed registries under the RegistryKinds `mechanisms` and `archetypes`,
with aliases, status and provenance, and refuse a row that does not
type-check.

Inputs:
- spec/canon.ts, spec/registry.ts, spec/ids.ts (MechanismDef, ArchetypeDef, ApplyIn, ApplyOut, RegistryEntry<K>); spec/build.ts (APPLIED_MERGE, Author.applied, Author.arch)
- packages/mechanisms/seed/mechanisms.seed.yaml and packages/archetypes/seed/archetypes.seed.yaml (imported at M-1-T07)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mechanisms.seed.yaml (132 lines, 24 rows)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/circuits.seed.yaml (244 lines, 29 rows)
- fab-knowledge:synthesis/plan-deltas.md R46, R47, R48
- fab-knowledge:synthesis/mappings.md section 7
- ../CANONS.md (entry tables)

Steps:
1. Read spec/canon.ts. The shape this milestone assumes is below; it was
   type-checked with `tsc --strict` (TypeScript 7.0.2) on 2026-10-04 with
   both example defs and their goldens. If spec/canon.ts differs, spec
   wins and the tests in this card adapt; list each difference in the PR.

   ```ts
   type CanonStatus = "typed" | "stub" | "candidate" | "unproven";
   interface Quantity { value: number; unit: string; qualifier: Qualifier }
   interface InputSpec { unit: string; doc: string; default: number }
   interface MechanismDef<I extends Record<string, number>, O extends string> {
     id: string;
     family: "logic" | "memory" | "intermittent" | "gears" | "motion" | "kerf"
       | "fluid" | "linkage" | "joint" | "metering" | "snap";
     dof: number | null;                // null when the source does not state it
     status: CanonStatus;
     inputs: { [K in keyof I]: InputSpec };
     derive(i: I): Record<O, Quantity>; // pure, no DOM, no profile writes
     governs: string[];
     failureModes: string[];
     processes: Process[];
     provenance: { design: string; date: string; path: string; lines?: string };
     reference: string | null;          // null only for stub and candidate
     aliases?: string[];
   }
   ```

   ArchetypeDef carries id, family (printed, copper, board, or the two
   mixed families of the seed), status ("proven" in place of "typed"),
   senses, channels, emits (feature kinds), read model per D-078, params as
   InputSpec, materials by slot role, declared conductor sections,
   `apply({draft, face, params, profile}): ApplyOut` (D-165), `resistances(profile)`
   computed at load (D-098), tier, provenance, reference, aliases, presets.
2. Write zod schemas whose inferred types are checked against the spec
   types with `satisfies` in both directions (the M-1-T07 pattern).
3. Load the two YAML seeds and map each row onto a def file under
   `src/defs/<id>.ts`. A row without a def file fails the load test; a def
   file without a seed row fails it too, except entries added by D-096 or
   D-097, which are listed in `src/added.ts` with their decision id.
4. Register the alias table. Each alias resolves to exactly one id:

   | alias | resolves to | decision |
   |---|---|---|
   | `printed-membrane-slider` (seed id) | `membrane-slider-wall` | D-096 (split three ways) |
   | `astable-blinky` (seed id) | `astable-blinky-tack` | D-096 (split) |
   | `circuits` (package name) | `archetypes` | D-014 |
   | `archetype.apply`, `circuit.find` (handoff command names) | `arch.apply`, `arch.find` | D-014 |

   The new ids `membrane-slider-wall`, `membrane-slider-thinpot`,
   `membrane-slider-gib`, `astable-blinky-tack`, `astable-blinky-shim` are
   working ids chosen by this card; the PR lists them for the owner beside
   the D-015 slug questions.
5. Add `lineage.json` rows for every legacy file a def ports from (D-156):
   canonical file, copies with sha256, fixes carried. TUMBLER, KNURL, PIP,
   BOSS, FEELER THINPOT, GIB, COFFER, KEYWAY generators, TOGGLE.
6. Registry ids are unique across both registries and against the
   `names.json` never-suggest list when it exists (M16); until then the
   test checks uniqueness inside the two registries only.

Files to create:
- packages/mechanisms/src/def.ts
- packages/mechanisms/src/registry.ts
- packages/mechanisms/src/added.ts
- packages/mechanisms/src/defs/ (one file per id)
- packages/mechanisms/test/load.test.ts
- packages/archetypes/src/def.ts
- packages/archetypes/src/registry.ts
- packages/archetypes/src/added.ts
- packages/archetypes/src/aliases.ts
- packages/archetypes/src/defs/ (one file per id)
- packages/archetypes/test/load.test.ts
- lineage.json (rows above)

Acceptance:
- `npm test -w packages/mechanisms -- load` exits 0: 24 seeded ids load,
  each with a def file; ids unique.
- `npm test -w packages/archetypes -- load` exits 0: 29 seeded ids resolve
  (27 directly, 2 through the alias table); ids unique.
- `node tools/tiers.mjs` exits 0: both packages import only spec, profile,
  catalog, geom, mesh.
- `grep -rn "document\.\|window\." packages/mechanisms/src packages/archetypes/src`
  returns nothing (D-045).
- `node tools/counts.mjs && git status --porcelain` prints nothing; the
  registry sizes are generated counts (D-010), never typed in docs.

Done when: both registries load from typed defs and a malformed def fails
the typecheck before any test runs.

Build notes, 2026-10-09 (written back by the M06-T01 build):

- Spec won (step 1) and was widened additively in spec/canon.ts:
  `MechanismStatus` and `ArchetypeStatus` carry the four statuses of
  this file; `MechanismDef.dof` is `number | null`; `ArchetypeDef.read`
  is `ReadModelKind | "none"`; `ArchetypeDef.channels` is `number | null`
  (null where params set the count: per board pin, per used pad); both
  defs gain optional `statusReason` (the E_REF hint) and `original`
  (`CanonOriginal` {slug, file, fn, lines, sha256, record}, the originals
  rule's `provenance.original`). `provenance` stays a string and
  `reference` an array. Aliases live in the table, not on the def.
- Every entry registers here as candidate (three-source-power-oring as
  unproven, D-096) with a `statusReason` naming the card that promotes it:
  M06-T02 to T05 for mechanisms, M06-T07 and T08 for archetypes, M08 for
  the board family, M07 for crank-yoke and integer-metering-ratio. A
  refused entry has empty params until its port types them with units.
  The split in M06-T07 step 1 is the target, never the T01 state.
- The eight D-096 mechanism additions and the seven archetype ids of
  CANONS.md 4.2 register here, so the alias targets exist;
  snap-vee-finger-cage stays out (D-202).
- The seed family board-or-copper maps to board for all three rows (each
  needs the M08 board backend); astable-blinky-shim (SHIM copper tape) is
  copper. `read` and `channels` are the CANONS.md 4.1 working values;
  M06-T07 confirms each against the original.
- Two port sources had no lineage row and gained a canonical one:
  `armature.netlist/r1` and `slate.src/sep04`. printed-pullup-meander's
  only source, `tang-r6/files/src/r6_0_04_design.js`, is a copy row of
  the tang-r6.design4 subject; its load test names that exception.
- Acceptance defect: `git status --porcelain` cannot print nothing while
  the tree is uncommitted (D-006). The derived check is `node
  tools/counts.mjs && git diff --exit-code tools/reports/counts.json
  docs/plan/PLAN.md` after staging; counts.json now carries
  `canon.mechanisms` and `canon.archetypes` (registered, byStatus,
  aliases), and both load tests compare them with the loaded registries.
- "Done when": a def file that does not type fails `tsc -b` (each package
  runs it as pretest); the expect-error fixtures in
  `packages/*/test/negative.ts` compile under `tsc -p
  tsconfig.tests.json` (`npm run typecheck`), which `npx tsc -b` does not
  read.
- zod's declarations name `URL`, so both packages set `skipLibCheck` as
  packages/sim does; neither takes node types.

## M06-T02 TUMBLER port: 18 modules regenerate and pass their parity suite

Goal: the 18 TUMBLER modules run headless in `packages/mechanisms` and
reproduce the legacy bench part for part, readout for readout and truth
table for truth table, at defaults and across all nine bench materials.

Inputs:
- fab-work-directory:benches/tumbler/outputs/tumbler.html (2468 lines). Module library lines 182 to 1733 (everything before `const $=id=>document.getElementById`); `MATS` lines 193 to 202; `G` line 203; `partWarnings` lines 339 to 348; `packSheet` 349; module starts: coin 613, inh 672, or 727, teet 783, diff 842, tumb 909, latch 979, snap 1036, ratch 1086, drum 1141, gen 1217, spur 1282, whif 1332, hinge 1392, fing 1448, tesla 1497, coanda 1569, memb 1633; `SIMS` input specs about line 1712; `vals()` line 1800
- fab-knowledge:sources/benches/benches-mechanisms.md (TUMBLER section)
- fab-knowledge:synthesis/mappings.md section 7.1

TUMBLER ships no tests. The parity suite this card defines is built from
the bench's own invariants: the plan audit the bench shows as GEOMETRY
WARNINGS (`partWarnings`), the logic function each module declares (`lg`),
the state each memory module keeps, and the readouts each module prints.

Steps:
1. Record the legacy outputs before porting. Extract lines 182 to 1733 of
   tumbler.html into a scratch module, evaluate it under node with no DOM
   stubs (it needs none), and for each module and each material in `MATS`
   (set `G.t`, `G.k`, `G.E` from the row; `G.c` stays 0.15) write:
   - `plan(vals(m))` parts: name, outer, holes, score, w, h;
   - `partWarnings` strings per part;
   - `draw(vals(m), u, st).read` at all-zero inputs (living hinge at
     `A = 1`, the bench default);
   - for modules with `lg`: `draw(...).q > 0.5` for every input combination
     of `SIMS[id]`, against `lg`. TUMBLER (`tumb`) uses inputs KEY and
     WRONG: open only at KEY 1, WRONG 0;
   - for stateful modules, the `q` sequence under the input sequences in
     the table below.
   Save as `packages/mechanisms/test/legacy/tumbler.json`.
2. Map module ids to seed ids: coin `coincidence-and`, inh `inhibit`, or
   `wedge-or`, teet `teeter-not`, diff `differential-xor`, tumb
   `tumbler-coded-and`, latch `detent-latch`, snap `snap-flexure`, ratch
   `ratchet-pawl`, drum `shift-drum`, gen `geneva-external`, spur
   `spur-pair`, whif `whiffletree-dac`, hinge `living-hinge`, fing
   `finger-joint`, tesla `tesla-valve`, coanda `coanda-gate`, memb
   `membrane-valve`.
3. Port each module's `params`, `plan` and readout arithmetic into a
   generator `generate(params, material)` returning sheet parts on the M00
   prism route (process laser unless the material row is a print), and a
   `derive()` returning every numeric readout as a computed Quantity. Keep
   float64 and the arithmetic order of the legacy code. The 2D stage and
   ISO view code (`draw` SVG, `asm`) stay in the legacy file; the viewer
   arrives in M09.
4. Port `partWarnings` as `sheetAudit(part, kerf)`: hole crossing the
   outline (0.01 mm tolerance) and hole thinner than 1.5 kerf. Each warning
   becomes a BuildWarning in Part IR (D-049).
5. Living hinge emits a `flexCut` feature so CHK-SHT-06 (rows at or under
   13 degrees each) runs on it; finger joint emits a `finger` feature.
   `finger` lacks a check today (PLAN.md 6.2); this card closes the gap
   with a check derived from TUMBLER `fingerEdgePts` (tab equals pitch plus
   one kerf, slot equals pitch minus one kerf), registered under the next
   free CHK-SHT number with origin TUMBLER 2026-08 and recorded in
   ../CHECKS.md (D-058).
6. Move the M01 fixture `mech/cascade-slop` from
   `packages/constraints/src/fixtures/` into
   `packages/mechanisms/src/constraints/cascade-slop.ts` unchanged, with
   its README and its recorded disagreement (SLOP STACKS note says slop
   doubles per stage; the code at tumbler.html:2108 is linear). The M01
   test moves with it and keeps passing.
7. Write the parity test comparing the port to the legacy record.

Legacy record at defaults, Delrin/POM 3 mm (t 3.0, k 0.22, c 0.15, E 3100,
bench values), computed, this card:

| module | seed id | parts | plan warnings | readouts at defaults | logic check |
|---|---|---|---|---|---|
| coin | coincidence-and | 4 | 0 | stack 6.0 mm, pin clear 2.70 mm | 4 of 4 |
| inh | inhibit | 4 | 0 | stack 6.0 mm | 4 of 4 |
| or | wedge-or | 3 | 0 | ratio 1 : 0.84, out stroke 10.1 mm, ramp 40 deg | 4 of 4 |
| teet | teeter-not | 3 | 0 | gain x1.00, out stroke 8.0 mm, spring 0.36 N | 2 of 2 |
| diff | differential-xor | 5 | 0 | pins 2, bars 2, lost motion 2.6 mm | 4 of 4 |
| tumb | tumbler-coded-and | 5 | 0 | pins 5, codes 3,125, window plus or minus 0.4 mm | 4 of 4 key cases |
| latch | detent-latch | 3 | 0 | hold force 0.80 N, throw 12 mm | state sequence |
| snap | snap-flexure | 2 | 0 | h/t 5.00, snap est 4.49 N, 2 states | state sequence |
| ratch | ratchet-pawl | 4 | 0 | step 30.0 deg, carry every 12 | state sequence |
| drum | shift-drum | 6 | 0 | step angle 45.0 deg, words 8, bits 32 | state sequence |
| gen | geneva-external | 3 | 0 | index 60.0 deg, centres 40.00 mm, wheel dia 69.3 mm | n/a |
| spur | spur-pair | 3 | 0 | centres 36.00 mm, ratio 1:2.00, OD 27.0 / 51.0 mm | n/a |
| whif | whiffletree-dac | 4 | 0 | stops 8, full stroke 28.00 mm, LSB 4.00 mm | 8 levels |
| hinge | living-hinge | 1 | 0 | bend R 14.0 mm, per row 12.9 deg, ligament 2.25 mm (at A 1) | n/a |
| fing | finger-joint | 2 | 0 | pitch 8.89 mm, tab 9.11 mm, slot 8.67 mm | n/a |
| tesla | tesla-valve | 4 | 0 | loops 5, est diodicity 1.80, Re window 200 to 2000 | n/a |
| coanda | coanda-gate | 3 | 0 | nozzle 1.5 mm, splitter 54.0 mm | n/a |
| memb | membrane-valve | 4 | 0 | est close 96 kPa, layers 4 | 2 of 2 |

Totals at defaults: 18 modules, 63 parts, 0 plan warnings (computed, this
card). Across the 9 materials in `MATS`: 162 cases, 567 parts, 0 logic
mismatches, 24 plan warnings, all on HDPE 3 mm (k 0.35, bench value) from
`living-hinge`: "HINGE PANEL: hole n thinner than 1.5 kerf, it will fuse
shut", because the 0.5 mm slits are under 1.5 x 0.35 = 0.525 mm (computed,
this card). The 24 warnings are part of the parity record; the port must
produce them.

Stateful sequences, computed, this card (q per step):

| module | inputs per step | q per step |
|---|---|---|
| detent-latch | S,R: 00, 10, 00, 00, 01, 00 | 0, 1, 1, 1, 0, 0 |
| snap-flexure | A: 0, 1, 0, 1, 0 | 0, 1, 1, 0, 0 |
| ratchet-pawl | CK: 0, 1, 0, 1, 0, 1, 0 | 0, 1, 1, 0, 0, 1, 1 |
| shift-drum | CK: 0, 1, 0, 1, 0 | 1, 0, 0, 0, 0 |
| whiffletree-dac | B0 B1 B2 over 0 to 7 | 0, 0.1429, 0.2857, 0.4286, 0.5714, 0.7143, 0.8571, 1 |

The ratchet and drum sequences are recorded as the legacy behaviour of the
2D stage, where `q` is a display value. The suite asserts them for
parity only; the mechanism verdicts for counting and sequencing come from
the derive() outputs (step angle, carry, words, bits).

Files to create:
- packages/mechanisms/src/tumbler/ (one generator per module, shared `sheetAudit`, `fingerEdgePts`, `hingeBandPts` ports)
- packages/mechanisms/src/constraints/cascade-slop.ts (moved from M01)
- packages/mechanisms/test/legacy/tumbler.json
- packages/mechanisms/test/tumbler.parity.test.ts
- packages/checks/src/defs/CHK-SHT-<next>.ts (finger check) and its seed row

Acceptance:
- `npm test -w packages/mechanisms -- tumbler.parity` exits 0. For every
  one of the 162 module and material cases: part count, part names, every
  outline and hole vertex within 1e-6 mm, warnings equal as strings,
  readouts equal to the printed precision, logic and state sequences
  equal.
- The test prints `cases 162 parts 567 warnings 24 logic 0 mismatches`.
- `npx --no-install hbf part.build reference/mechanisms/living-hinge --json` exits 0;
  the CommandResult lists CHK-SHT-06 with measured 12.86 deg per row
  (computed: 90 deg over 7 rows) and verdict pass.
- `npm test -w packages/constraints` and `npm test -w packages/mechanisms -- cascade-slop`
  both exit 0 after the move.

Done when: all 18 modules build from the package and every legacy number
the bench prints comes back from derive().

Build notes, 2026-10-09 (written back by the M06-T02 build):

- The record is `test/legacy/record-tumbler.mjs` over the canonical
  `originals/tumbler/files/tumbler.html` (sha256 pinned to
  `tumbler.bench/harvest`); it also records each case's cut sheet
  placements from the original's own `packSheet` at the planSVGFile width
  (line 1763). The port reproduces it bit for bit at all 162 cases: 567
  parts, 24 HDPE living hinge warnings, 0 logic mismatches (computed).
  vitest prints the totals line only under `--reporter verbose`.
- `packSheet` is lines 350 to 359, not 349.
- Material defect: the profile holds ply3 and acrylic3 with machine kerf
  null and no POM, HDPE, cardboard or print-sheet rows. The `MATS` strip
  is kept as the bench's declared rows (`src/tumbler/material.ts`, all
  inferred) and is a def param (t, k, c, E), as on the bench where the
  strip is the user's input. The references cut from slot material `pom3`,
  which no profile row backs; no check reads a number from it. A profile
  row per sheet waits for coupons.
- part.build of a laser part needed two core changes: a machine without
  a slicer preset builds with a sheet MachineView that refuses any layer
  read (`core/src/commands/build.ts sheetMachineView`, adapter none), and
  the four part checks that read a printer preset (CHK-PRT-05, -06, -09,
  -15) skip on such a machine (`sheetSkip`, versions unchanged since a
  printed part is unaffected). CHK-SHT-05 throws without a sag margin
  metric on any part that declares `thickness`, and TUMBLER states no sag
  margin, so the references leave `thickness` out and CHK-SHT-05 skips.
  CHK-PRT-07, -12 and -13 still run their print-layer rules on a laser
  part and pass; nothing marks them print-only.
- `finger` and `flexCut` are `src/kinds.ts` FeatureKindDefs whose
  generator emits no geometry (the cut is in the outline). KernelId has no
  mechanisms entry, so core registers them under `nest`
  (`core/src/kinds.ts`). FingerFeature gained an optional `edge` line and
  MechanismApplyOut an optional `warnings` list (spec, additive);
  Author.mech (`core/src/mech-apply.ts`) runs a typed def's apply(),
  prefixes ids `<id>.<n>.` and sends the def's audit to the build
  warnings.
- CHK-SHT-11 is entered by M06-T02 with its run body: it measures the
  segments on the finger edge line and the recesses between them on the
  body's outline. Adding it moves registryHash for every reference; the
  ten earlier references were re-accepted with only registryHash, the
  report's CHK-SHT-11 skip row and the 3MF hash moving (meshes and
  volumes equal, computed).
- Finding, not fixed: the original's finger plan draws EDGE A and EDGE B
  with the same segment parity and closes each edge with a diagonal from
  x L minus or plus one kerf to (L, 40); several plans hold holes that
  overlap each other or cross the outline (WEDGE OR guide frame, TESLA
  island pins, WHIFFLETREE beams, MEMBRANE flow layer), which `partWarnings`
  does not catch. The port keeps the original's geometry.
- The fact readers (needFact, factOrConstant, factMissingError and kin)
  moved into `spec/constraints.ts` so `mech/cascade-slop` could move to
  `packages/mechanisms/src/constraints` without a same-tier import.
- Acceptance defect: `npm test -w packages/mechanisms -- cascade-slop`
  cannot hold the M01 test, which drives the constraints solver, a tier-1
  sibling the mechanisms package may not import (tools/tiers.mjs scans
  tests too). The test moved to `core/test/mech-cascade-slop.test.ts`
  (`npm test -w core -- mech-cascade-slop`), beside `mech-hook-rule` and
  `mech-constraints`; `npm test -w packages/constraints` still exits 0.

## M06-T03 Typed derive() for the 24 seeded mechanisms

Goal: every seeded mechanism is typed with a derive() that reproduces a
legacy number, or marked stub with the reason, and the recorded results
that are constraints run as ConstraintDefs.

Inputs:
- packages/mechanisms (M06-T01, M06-T02)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mechanisms.seed.yaml lines 6 to 132
- fab-knowledge:synthesis/plan-deltas.md R46
- ../PLAN.md section 10.1 (recorded results that become constraints)

Steps:
1. For each of the 18 TUMBLER ids, derive() returns the readouts of
   M06-T02 plus the governing quantities the seed names (snap-flexure
   rise over thickness against 2.31 for bistability; living-hinge degrees
   per row against 13; finger-joint tab and slot from kerf; geneva-external
   per M06-T04; whiffletree LSB and full stroke).
2. The 11 rows that carry only id, family and provenance in the seed
   (inhibit, wedge-or, teeter-not, differential-xor, tumbler-coded-and,
   detent-latch, ratchet-pawl, spur-pair, tesla-valve, membrane-valve,
   slew-ring-joint) get their equations from the TUMBLER readout code or,
   for slew-ring-joint, from PINTLE (M06-T05). D-097 allows a stub; this
   card expects none of the 11 to need one, because each has a numeric
   readout in harvested code.
3. Mark stub where no harvested source proves a derivation. The
   2026-10-04 reading stubbed `aileron-differential` because the README
   states only "horn sum is tilt, horn difference is roll". The STANCHION
   record (`knowledge/designs/stanchion.md` section 5.3) found the closed
   form in the original: `solveHorns`,
   fab-knowledge:originals/stanchion/files/stanchion.html
   lines 293 to 314, with `placeRods` lines 315 to 331. Per side it moves
   the rod socket into the yaw plate frame, reduces the rod to an in-plane
   radius sqrt(L^2 - dy^2), and intersects the horn circle (radius
   `sg_horn_r`) with the socket circle by the two-circle construction,
   picking the aft root; a side with no intersection or a horn past 85 deg
   is flagged. Type `aileron-differential` from it: derive() takes the
   carrier tilt and roll and returns both horn angles, the rod lengths and
   the reachability flag. Golden: tilt 10, roll 10 gives servo A 46.1 deg
   and servo B 0.6 deg (computed in the original's drive, stanchion record
   section 5.3); `expected/legacy.json` is recorded by evaluating
   `solveHorns` in the original at defaults and at that pose. The expected
   split is 24 typed, 0 stub; the split the port records is the exit
   number. If the port cannot evaluate `solveHorns` headless, the entry
   stays stub with that reason and the PR says so.

   pin-free-balance-beam is typed from STIPPLE R17 and R17b, recovered
   from Downloads on 2026-10-04. derive() returns crown (seed equation
   `crown_top = (z_col + z_row)/2 + crown_r`), tilt and half-select rise.
   Goldens, computed from the two STIPPLE files:

   | STIPPLE file | STROKE | half-select rise | tilt max |
   |---|---|---|---|
   | R17b, `stipple (1).html` (mtime 2026-08-15 13:24) | 5.0 | 2.500 mm | 24.624 deg |
   | R17, `stipple.html` (mtime 2026-08-15 13:14) | 4.8 | 2.400 mm | 23.578 deg |

   Evidence: fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/stipple/stipple (1).html;
   fab-knowledge:evidence/x/downloads/dl-ogee-stipple-mech/derived/stipple_latch.json.
4. Recorded results that become constraints, exported as ConstraintDefs
   from `packages/mechanisms/src/constraints/`:

   | ConstraintDef | rule | source |
   |---|---|---|
   | `mech/rigid-two-pin-link` | a rigid link between two vertical sliders forces L^2 = S^2 + dz^2; dim `link.dzAtRest` legal exactly 0 | seed lines 99 to 104; OGEE R7 to R17 |
   | `mech/crown-from-rocker-origin` | crown arc struck from the rocker's own origin; dim `crown.originOffset` legal exactly 0 | seed line 103 |
   | `mech/detent-strip-separate` | a detent beam fused along its length is about 10x too stiff (computed in KNURL); dim `detent.fusedLength` legal exactly 0 | seed line 90; knurl.html README |
   | `mech/peg-is-cam` | a lasercut square peg acts as a cam; a journal must be round stock (pairs with CHK-ASM-09) | seed line 105 |
   | `mech/coincidence-ramp` | ramp_a at least 40 deg against acrylic friction 0.45 (design values) | seed line 101 |
   | `mech/hook-rule` | moved from `packages/constraints/src/fixtures/hook-rule.ts` unchanged (M01-T10) | COTTER geo.js:102 |

Files to create:
- packages/mechanisms/src/defs/*.ts (derive for every typed id)
- packages/mechanisms/src/constraints/*.ts (table above)
- packages/mechanisms/test/derive.test.ts
- packages/mechanisms/test/constraints.test.ts

Acceptance:
- `npm test -w packages/mechanisms -- derive` exits 0 and prints the
  status split; it equals counts.json `canon.mechanisms` (D-252; the
  forecast `typed 24 stub 0` from source availability is retired).
- `npx --no-install hbf mech.derive aileron-differential --params '{"tilt":10,"roll":10}' --json`
  exits 0 with horn A 46.1 deg and horn B 0.6 deg (computed; the
  original's drive), unless the port recorded the stub fallback of step 3.
- Every typed def's derive() output carries unit and qualifier on every
  field; a test fails any field without both (D-007).
- `npm test -w packages/mechanisms -- constraints` exits 0;
  `npx --no-install hbf constraints.query hook.sweep --facts hole=6.35,tb=3.2 --json`
  still exits 0 with floor 77 (M01 golden).

Done when: `mech.derive` can answer for every typed id and a stub says why
it cannot.

Build notes, 2026-10-09 (written back by the M06-T03 build):

- The port's split is typed 17, stub 0, candidate 7 (computed; the exit
  number), against the expected 24 and 0. The originals rule binds: an
  entry is typed only when the port regenerates its original's numbers
  and geometry. The 17 TUMBLER entries do both. geneva-external,
  count-wheel-detent, aileron-differential, pin-free-balance-beam,
  displacement-coincidence-latch, slew-ring-joint and capsule-pocket-rotor
  regenerate their originals' numbers (derive.test.ts, knurl.parity.test.ts)
  but not their bodies, so each stays candidate with its promotion card in
  statusReason (M10-T08 for KNURL, M07 or M11-T09 for the others). Their
  params are typed with units and derive() refuses until promotion.
- `solveHorns` lives inside the page's IIFE over three.js, so the record
  is driven in headless Chrome (`test/legacy/record-stanchion.cjs`, network
  for three.js r128): 35 poses at the HUD's one decimal; tilt 10, roll 10
  gives 46.1 and 0.6 deg (computed by the page, equal in the port).
- pin-free-balance-beam and displacement-coincidence-latch port link() and
  kin.py; packages/motion ports the same formulas for the motion programs.
  Both packages are tier 1 with no same-tier edge, so the formula exists
  twice; a single home needs a tiers decision.
- `mech/hook-rule` moved with cascade-slop; `constraints.query hook.sweep`
  reads it through core's loader. The ConstraintDefs of step 4 are
  `src/constraints/rules.ts`; coincidence-ramp reads the new profile
  constant `coincidence.rampMinDeg` (inferred) and names the acrylic3
  friction row. Adding them moves registryHash for every reference.
- `mech.derive` is M06-T11; the acceptance lines that call it were not
  run here.
- The ConstraintDefs this milestone adds, in the M01 package placement
  form core's loader test reads beside the M01 table:

  | ConstraintDef | owning package | tier | Bound.kernel | registered at |
  |---|---|---|---|---|
  | `mech/rigid-two-pin-link` | mechanisms | 1 | motion | core load |
  | `mech/crown-from-rocker-origin` | mechanisms | 1 | motion | core load |
  | `mech/detent-strip-separate` | mechanisms | 1 | motion | core load |
  | `mech/peg-is-cam` | mechanisms | 1 | motion | core load |
  | `mech/coincidence-ramp` | mechanisms | 1 | profile | core load |
  | `mech/detent-bands` | mechanisms | 1 | profile | core load |

## M06-T04 KNURL Geneva and detent reproduce; D-096 corrections as goldens

Goal: the KNURL Geneva and count-wheel detent come back from derive() to
the legacy precision, and the seed's two formula errors are fixed with
goldens that would fail the old formulas.

Inputs:
- fab-work-directory:benches/knurl/outputs/knurl/knurl.html (1569 lines): `K.defaults` lines 561 to 579, `K.layout` from line 583 (Geneva lines 588 to 600, `rp`, `Rs`, `slotLen`, `alpha` at 592 to 595), pawl lines 643 to 649 (`pawlK` 648, `clickN` and `pawlStrain` 649), `K.geneva` line 674, engagement rule lines 676 to 679, KNURL warnings lines 1202 to 1204, spec rows line 1526
- fab-work-directory:benches/knurl/outputs/knurl/README.md (line 13 carry over about 5.5 beads; line 62 "Do not go back to 0.15, that is what jammed the first print")
- fab-work-directory:benches/knurl/outputs/knurl/examples/knurl_default.json
- fab-knowledge:synthesis/verified-claims.md C4
- packages/mechanisms/test/legacy/ (this card writes knurl.json)

Steps:
1. Record the legacy numbers. knurl.html lines 163 to 549 (core) and 553
   to 1226 (design) evaluate under node with no DOM; call
   `KNURL.layout(KNURL.defaults())` and `KNURL.geneva(G, phi)`, then
   repeat with `print.clr = 0.15`. Save the outputs as
   `packages/mechanisms/test/legacy/knurl.json`.
2. Type `geneva-external` with inputs n, d (centre distance), phi; outputs
   rp = d sin(pi/n), Rs = d cos(pi/n), alpha = 180 - 360/n, dwell =
   (n+2)/(2n), index = (n-2)/(2n), and theta(phi) = atan2(rp sin phi, d -
   rp cos phi) within abs(phi) at most alpha/2, else sign(phi) 180/n
   (KNURL's closed form). The seed's `dwell_fraction: (n-2)/(2n)` is the
   index fraction; the golden at n 3 asserts dwell 5/6 so the old formula
   fails it. TUMBLER's inputs (crank radius cr) map through c = cr /
   sin(pi/n), which the TUMBLER golden asserts (centres 40.00 mm at n 6,
   cr 20).
3. Type `count-wheel-detent` with inputs E, stripT, stripH, freeLen,
   fluteDepth, clr; I = stripH stripT^3 / 12 (cube on the bending
   thickness; the seed line 92 `I = t w^3 / 12` cubes the wrong side,
   verified-claims C4); k = 3 E I / L^3; lift = fluteDepth - clr; click =
   k lift; strain = 3 lift stripT / (2 L^2). Default clr 0.4. The clr 0.15
   result is kept as the jam record in the def's failureModes with its
   numbers.
4. Port the KNURL warnings as the def's ConstraintDefs: pawl strain under
   2 percent; click force between 0.4 N and 3 N (KNURL design bands,
   method derived).
5. Write the two references (M06-T06 lists them):
   `reference/mechanisms/geneva-3` and `reference/mechanisms/detent-strip`,
   each a minimal part from the KNURL defaults with expected/ holding the
   derive golden and the build.

KNURL legacy at defaults (E 2000 MPa design value, stripT 1.6, stripH 3.6,
freeLen 20, fluteDepth 1.2, n 3, d 25, pinR 1.3, clr 0.4), computed, this
card:

| quantity | legacy value | golden tolerance |
|---|---|---|
| Geneva rp | 21.650635 mm | 1e-6 |
| Geneva Rs | 12.500000 mm | 1e-6 |
| Geneva slotLen | 9.150635 mm | 1e-6 |
| Geneva alpha | 60 deg | exact |
| Geneva dwell, index at n 3 | 5/6, 1/6 | exact |
| slot width 2 (pinR + clr) | 3.4 mm | 1e-9 |
| carry over alpha / delta (33 flutes, delta 10.909 deg) | 5.50 counts | 2 decimals |
| theta at phi -30, -15, 0, 15, 30 deg | -60, -53.8941, 0, 53.8941, 60 deg | 1e-4 |
| detent k | 0.9216 N/mm | 1e-9 |
| detent lift at clr 0.4 | 0.8 mm | 1e-12 |
| click force at clr 0.4 | 0.73728 N (prints 0.74) | 1e-9 |
| strain at clr 0.4 | 0.0048 (0.48 percent) | 1e-12 |
| click force at clr 0.15 (jam record) | 0.96768 N (prints 0.97) | 1e-9 |
| strain at clr 0.15 | 0.0063 (0.63 percent) | 1e-12 |
| pin sweep radius | 23.600635 mm | 1e-6 |
| pawl tip angle | 261.818182 deg | 1e-6 |

The example file knurl_default.json carries clr 0.4 and the same pawl
block (thick 1.6, len 20, tip 262, engage 7, height 3.6), so the shipped
default and the code default agree.

Files to create:
- packages/mechanisms/src/defs/geneva-external.ts
- packages/mechanisms/src/defs/count-wheel-detent.ts
- packages/mechanisms/test/legacy/knurl.json
- packages/mechanisms/test/knurl.parity.test.ts

Acceptance:
- `npm test -w packages/mechanisms -- knurl.parity` exits 0 with every row
  above.
- A test evaluates the seed's old formulas (dwell (n-2)/(2n); I = t w^3/12
  with w 3.6, t 1.6) and asserts both disagree with the goldens, so a
  regression to either fails.
- `npx --no-install hbf mech.derive count-wheel-detent --params clr=0.4 --json` exits
  0 with clickForce 0.73728 N computed and strain 0.0048 computed.
- `npx --no-install hbf mech.derive geneva-external --params n=3,d=25,phi=15 --json`
  exits 0 with dwell 0.833333 and theta 53.8941 deg.
- `npx --no-install hbf parity reference/mechanisms/geneva-3` and
  `npx --no-install hbf parity reference/mechanisms/detent-strip` exit 0.

Done when: KNURL's printed Geneva and detent numbers come from the canon,
and the two seed errors cannot return unnoticed.

Build notes, 2026-10-09 (written back by the M06-T04 build):

- The record is `test/legacy/record-knurl.mjs`: core lines 163 to 549 and
  design 553 to 1226 of knurl.html run under node with no DOM, as the card
  says. Every golden row reproduces (knurl.parity.test.ts, 14 tests); at
  phi plus or minus 30 K.geneva returns 59.99999999999999, within 1e-4 of
  the card's 60.
- E 2000 MPa is KNURL's literal at line 648; profile petg reads 1900 MPa
  (PIP). The def keeps 2000 as its param default; the disagreement is a
  gap for DECISIONS.md.
- KNURL's bands are the profile constants knurl.pawlStrainMax,
  knurl.clickMinN and knurl.clickMaxN (inferred, from lines 1202 to
  1204), read by `mech/detent-bands`.
- Both entries stay candidate (M06-T03 notes): KNURL's star, wheel and
  strip are raster-traced meshes, so the references mechanisms/geneva-3
  and mechanisms/detent-strip and their parity lines wait for M10-T08.

## M06-T05 Remaining seeded mechanisms and the D-096 additions

Goal: the five non-TUMBLER, non-KNURL seeded mechanisms are typed or
stubbed against their sources, and the D-096 additions are registered as
candidates with derive() goldens.

Inputs:
- fab-work-directory:benches/pintle-derrick/outputs/pintle/README.md lines 1 to 40 (slew ring table)
- fab-work-directory:benches/pintle-derrick/outputs/pintle/src/ (read only after its pintle_parts.py sha256 equals the R6 canonical 5280a22350a488e721d411504a562dec2007f421129e5f7462e055cb2b45a6b1)
- fab-knowledge:originals/pintle/files/src/pintle_parts.py (R6, source of record) and fab-knowledge:originals/stanchion/files/stanchion.html (`solveHorns`)
- fab-work-directory:benches/pintle-derrick/outputs/derrick/README-DERRICK.md lines 60 to 70 (counterbalance band)
- fab-work-directory:benches/ogee16/outputs/ogee16-source.zip (params.scad; latch identity; crank-yoke)
- fab-work-directory:benches/slug/outputs/slug/slug.scad lines 29, 35, 36, 84, 95, 265 to 267
- fab-work-directory:benches/cresset-plinth/outputs/plinth.html lines 2928 to 2929 (snap strain)
- fab-knowledge:sources/benches/benches-cases.md lines 513, 638, 642, 866, 907
- fab-knowledge:sources/benches/benches-mechanisms.md (OGEE16 crank-yoke, line 220)
- fab-knowledge:synthesis/verified-claims.md C4 (DERRICK, SLUG, OGEE rows)

Steps:
1. `slew-ring-joint` (typed, PINTLE R6): the source of record is the R6
   original, fab-knowledge:originals/pintle/files/src/pintle_parts.py
   lines 328 to 358 (`stator`: spine, cone, deck, journal and thrust
   faces) and 402 to 408, not the R4 README. Inputs journal D, journal
   height, thrust annulus rIn and rOut, spline d; derive areas and section
   moduli. The R4 README table below stays as lineage: where R6 dimensions
   differ, the goldens are recomputed from R6 and the PR lists both. The
   section modulus formula is not stated in either; the def returns the
   moduli with qualifier "computed" only if the port reproduces them from
   the R6 source, otherwise "unknown" with the source path, and the PR says
   which.
2. `displacement-coincidence-latch` (typed, OGEE): derive margin +
   overshoot = stroke/2 - camlift - lugTot, the identity CHK-MOT-05
   checks; ramp_a floor 40 deg as the `mech/coincidence-ramp`
   ConstraintDef (M06-T03). The def carries `apply()` (D-177): it emits
   the lug and cam features of admitted kinds, the `latch.margin` metric
   gated by CHK-MOT-05 and an `identity` assertion keyed by the applied
   mechanism id; reference mechanisms/coincidence-latch calls it through
   `Author.mech`, since latch is no longer a feature kind.
3. `capsule-pocket-rotor` (typed, SLUG): integer metering ratio gz_rot /
   gz_pin = 76/19 = 4 (slug.scad:35 to 36), so one vend is one motor
   revolution; mouth at least 2 capsule diameters; rotor face within
   about 2 mm of the funnel mouth (design rule, seed line 128).
4. Register the D-096 additions with status candidate (this card's
   reading of D-096 against MILESTONES.md rule 5; listed under gaps):

   | id | family | derive | golden (computed, this card) | source | promotion |
   |---|---|---|---|---|---|
   | `snap-tongue-relief` | snap | strain = 3 t d / (2 L^2), t = lipW | lipW 1.5, d 0.3, free 5.6: 2.152 percent | plinth.html:2928 to 2929; benches-cases.md:513 | when a snap-kind reference lands (PLAN.md 6.2 lists snap without a reference) |
   | `snap-finger-collar` | snap | interference and cam-out | about 0.8 mm cam out, about 1 percent strain (LOCKET R2, design values) | benches-cases.md:638 | same |
   | `snap-c-socket-lip` | snap | lip relief 5.0 to 4.0 over 38 deg taper, bore 2.8 | design values | benches-cases.md:422 (SLATE) | same |
   | `snap-holster-tab` | snap | tab thinned to 2.0, ridge 0.55 proud | design values | benches-cases.md:642 (LOCKET R2) | same |
   | `snap-press-plug-ribs` | snap | crush rib interference | unknown until the R2 source is ported | benches-cases.md:667 (LOCKET R2) | same |
   | `counterbalance-band` | linkage | band force for a gravity moment at an anchor radius | 500 gf at 47.6 mm gives 233.4 N mm; 234 N mm needs 501.3 gf | README-DERRICK.md:65 to 67 | owner milestone unassigned |
   | `integer-metering-ratio` | metering | vend per motor revolution from a gear ratio | 76/19 = 4; one vend 4075.7728 half steps (computed in source) | slug.scad:35 to 36 | M07 (SLUG vend program) |
   | `crank-yoke` | linkage | 2 R sin(SW) = stroke | R 6, stroke 9: SW 48.590 deg | benches-mechanisms.md:220 (OGEE16) | M07 (OGEE motion programs) |

5. The snap family shares one strain verdict. D-096 names PLINTH's
   thresholds (ok under 2.6, warn under 3.4 percent); D-073 sets PETG
   snap strain at 2.5 percent for beams bent in the layer plane and 1.5
   percent across layers. The def reads the limit from the profile by
   material and bend direction (D-073) and keeps PLINTH's 2.6 and 3.4 as a
   legacy preset that reproduces PLINTH's own verdicts. The conflict is
   listed under gaps for DECISIONS.md.

Slew ring lineage goldens, PINTLE R4 README (design numbers; areas recomputed; R6 wins where it differs):

| quantity | README | recomputed |
|---|---|---|
| thrust annulus r 12.6 to 17.0 | 409 mm2 | 409.2 mm2 (pi (17^2 - 12.6^2)) |
| journal D 34 x 3.0 | 320 mm2 | 320.4 mm2 (pi 34 x 3) |
| spline D 4.8 | 18.1 mm2 | 18.10 mm2 |
| ring section modulus | 2694 mm3 | not recomputed |
| spline section modulus | 10.9 mm3 | not recomputed |

Files to create:
- packages/mechanisms/src/defs/slew-ring-joint.ts
- packages/mechanisms/src/defs/displacement-coincidence-latch.ts
- packages/mechanisms/src/defs/capsule-pocket-rotor.ts
- packages/mechanisms/src/defs/pin-free-balance-beam.ts
- packages/mechanisms/src/defs/aileron-differential.ts (typed from `solveHorns`, M06-T03 step 3)
- packages/mechanisms/src/defs/ (eight candidate files from step 4)
- packages/mechanisms/test/additions.test.ts

Acceptance:
- `npm test -w packages/mechanisms -- additions` exits 0 with every
  computed golden in the two tables.
- `npx --no-install hbf mech.derive crank-yoke --params R=6,stroke=9 --json` exits 2
  with E_REF naming status candidate and promotion milestone M07; the
  derive golden runs in the package test, not through the command.
- `npx --no-install hbf mech.derive slew-ring-joint --json` exits 0 with the thrust
  annulus 409.2 mm2 computed.

Done when: every seeded mechanism has a status and a reason, and the D-096
additions are findable with their numbers.

Build notes, 2026-10-09 (written back by the M06-T05 build):

- R6 wins for the slew ring: the stator floor is cut to r_bore 12.9, so
  the thrust annulus is 12.9 to 17.0, 385.1 mm2 (computed), where the R4
  README's 12.6 gives 409.2. Neither source computes a section modulus,
  so derive() returns none rather than the README's prose numbers.
- SLUG's CD = gm (gz_rot + gz_pin) / 2 computes 118.75; the comment beside
  it says 106.25. OpenSCAD is not on this machine, so the record evaluates
  slug.scad's top-level assignments the way kin.py's load_params does.
- PLINTH's strain is recorded by running its own statement (lines 2927 to
  2928) on its ST.snap defaults: 2.152423 percent, equal to the port.
- snap-finger-collar, snap-c-socket-lip, snap-holster-tab and
  snap-press-plug-ribs carry declared values only, so they stay as M06-T01
  registered them, with no derive().
- The acceptance lines through `hbf mech.derive` wait for M06-T11.

## M06-T06 Mechanism references

Goal: every typed mechanism has a green reference written in this
milestone, under the ids the reference INDEX already uses where one
exists.

Inputs:
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/reference/INDEX.md
- fab-knowledge:synthesis/mappings.md section 7.1
- packages/mechanisms (M06-T02 to M06-T05)
- ../TESTING.md (parity triple, goldens)

Steps:
1. Each reference holds chase.ts (the def's defaults as params), build.ts
   (calls the def's generator), README.md with the verified block (D-008),
   `expected/` (build.json, report.json, edit.json, artifacts.json,
   section.png) and `covers: [<mechanism id>]` (D-105).
2. The parity triple per reference: geometry matches the legacy record;
   params round-trip; one edit gives the expected delta (TUMBLER: one
   kerf step 0.22 to 0.20 moves finger tab and slot by 0.02 mm; KNURL: clr
   0.4 to 0.15 moves click force 0.73728 to 0.96768 N).
3. The README's verified block lists "not verified by anything: printed or
   cut behaviour" for every TUMBLER reference, since no cut of the TUMBLER
   modules is recorded; KNURL's lists the printed Geneva and the clr 0.15
   jam from README line 62 under "measured on a printed body" as reported
   by the owner, with the README path.
4. Run each reference through `check.run` and record which checks apply
   (CHK-SHT-06 on living-hinge, CHK-SHT-07 on geneva-external hubs,
   CHK-MOT-05 on the coincidence latch).
5. Before writing each reference, record `expected/legacy.json` from the
   original under the originals rule: TUMBLER from
   fab-knowledge:originals/tumbler/files/tumbler.html
   (the M06-T02 records, re-keyed to the original's sha256); KNURL from
   originals/knurl/files/knurl.html (`K.layout`, `K.sim`,
   `K.pawlDeflection`, evaluated the way `orig/knurl/drive/layout.cjs`
   does); OGEE16 from originals/ogee16/files/src/source/params.scad and
   fits.py; SLUG from originals/slug/files/slug.scad; STIPPLE from
   originals/stipple/files/stipple-r17b.html; PINTLE from
   originals/pintle/files/src/pintle_parts.py (R6); STANCHION from
   originals/stanchion/files/stanchion.html `solveHorns`. Geometry parity
   compares against the bodies or outlines the original builds for that
   mechanism, never against a re-derivation from prose.
6. Each README carries a "made the way the original makes it" list: the
   construction steps from section 5 of `knowledge/designs/<slug>.md` for
   that mechanism, each with the record line and the test that holds it.

| mechanism id | reference id | source |
|---|---|---|
| coincidence-and | mechanisms/coincidence-and | TUMBLER coin |
| inhibit | mechanisms/inhibit | TUMBLER inh |
| wedge-or | mechanisms/wedge-or | TUMBLER or |
| teeter-not | mechanisms/teeter-not | TUMBLER teet |
| differential-xor | mechanisms/differential-xor | TUMBLER diff |
| tumbler-coded-and | mechanisms/tumbler-coded-and | TUMBLER tumb |
| detent-latch | mechanisms/detent-latch | TUMBLER latch |
| snap-flexure | mechanisms/snap-flexure | TUMBLER snap |
| ratchet-pawl | mechanisms/ratchet-pawl | TUMBLER ratch (INDEX had README only) |
| shift-drum | mechanisms/shift-drum | TUMBLER drum |
| geneva-external | mechanisms/geneva-3 | KNURL (TUMBLER gen asserted in M06-T02) |
| spur-pair | mechanisms/spur-pair | TUMBLER spur |
| whiffletree-dac | mechanisms/whiffletree | TUMBLER whif (INDEX had README only) |
| living-hinge | mechanisms/living-hinge | TUMBLER hinge |
| finger-joint | joints/finger | TUMBLER fing (INDEX had README only) |
| tesla-valve | mechanisms/tesla-valve | TUMBLER tesla (INDEX had README only) |
| coanda-gate | mechanisms/coanda-gate | TUMBLER coanda |
| membrane-valve | mechanisms/membrane-valve | TUMBLER memb |
| count-wheel-detent | mechanisms/detent-strip | KNURL |
| displacement-coincidence-latch | mechanisms/coincidence-latch | OGEE16 params.scad |
| slew-ring-joint | joints/slew-ring | PINTLE R6 pintle_parts.py lines 328 to 358, 402 to 408 |
| capsule-pocket-rotor | sheet/capsule-rotor-cage | SLUG slug.scad |
| pin-free-balance-beam | joints/balance-beam | STIPPLE R17b (Downloads) |
| aileron-differential | joints/aileron-differential | STANCHION stanchion.html `solveHorns` lines 293 to 331 (none if M06-T03 step 3 falls back to stub) |

`machines/ogee-cell` and `machines/slug-drive` stay with M07 and M10, which
build the machines; this card writes only the single-mechanism references.

Files to create:
- reference/mechanisms/<id>/ and reference/joints/<id>/ and reference/sheet/capsule-rotor-cage/ per the table, each with chase.ts, build.ts, README.md, expected/

Acceptance:
- `npx --no-install hbf parity reference/mechanisms/<id>` exits 0 for every reference
  row in the table (22 expected before this revision, plus
  joints/aileron-differential; the count is generated).
- `npm test -w packages/mechanisms -- originals` exits 0: for every typed
  mechanism, `provenance.original.sha256` equals the lineage.json
  canonical row; every value in its reference's `expected/legacy.json`
  is regenerated by the port to the original's printed precision; every
  legacy body or outline matches under the originals rule tolerances. A
  test that swaps in one perturbed legacy value fails.
- `grep -rln "fab-knowledge/mockups" packages/mechanisms reference/mechanisms reference/joints reference/sheet` prints nothing.
- `npx --no-install hbf reference.list --covers mechanisms --json` is not available
  until M11; until then `node tools/counts.mjs` writes the covered and gap
  counts for mechanisms into counts.json and the derived job passes.
- Every README passes `node tools/lint-voice.mjs` and carries the verified
  block with four lists.

Done when: every typed mechanism has a reference that builds green and
regenerates its original's numbers and geometry, and any stub shows up as
a gap with its reason.

Build notes, 2026-10-09 (written back by the M06-T06 build):

- 17 references, one per typed entry, written by the mechanism's apply()
  through k.mech; each holds `expected/legacy.json` cut from the TUMBLER
  record at the bench defaults. `test/originals.test.ts` regenerates
  every legacy value and checks the build's body outlines against the
  original's placements within 1e-6 mm and the meshed volumes against the
  cut area x t within the D-175 grid's reach.
- The seven candidate rows of the table (geneva-3, detent-strip,
  coincidence-latch, slew-ring, capsule-rotor-cage, balance-beam,
  aileron-differential) are not written: their entries are candidate.
- `section.png` is not written; renders and the person's look are M06-T13
  and D-154.
- The edits: kerf 0.22 to 0.20 where the plan reads kerf (finger tab and
  slot move 0.02 mm, computed), else one geometric slider step; the living
  hinge edit is the bend 90 to 95 deg, which flips CHK-SHT-06 to fail at
  13.57 deg per row.
- Any later check or ConstraintDef registration moves registryHash and so
  every reference's build.json; the goldens here are accepted on the tree
  of 2026-10-09 and need one more accept after the other M06 and M08
  lanes land.

Build notes, 2026-10-09, second pass (the seven candidate bodies):

- Split now typed 19, stub 0, candidate 5 of the 24 seeded (computed,
  `npm test -w packages/mechanisms -- derive`); 107 mechanism ids with the
  M06-T14 rows (counts.json).
- pin-free-balance-beam is typed with reference joints/balance-beam. The
  page has no outline generator (record section 1, "generator source
  MISSING"); its body is the `DATA.parts` link ring extruded to T, as the
  page's own `geomOf("link")` builds it (lines 186 to 194). The ring
  matches the original within 1e-6 mm, meshed volume 88.59822 against the
  page mesh's 88.59896 mm3 (computed), so the ring follows no param but t;
  noseR, bossR, crownR and linkL move derive() and raise LINK_OUTLINE.
- capsule-pocket-rotor is typed with reference sheet/capsule-rotor-cage:
  `src/bodies/slug-cage.ts` ports slug.scad lines 171 to 213 and
  regenerates all 82 baked loops of the six cage parts. Defect: the only
  geometry record is bake.py's OUTLINES rounded to 0.1 mm, and OpenSCAD is
  not on this machine, so the match holds at the bake's precision (a port
  value on a 0.05 mm boundary may round either way), never at the
  originals rule's 1e-6 mm. The owner decides whether that holds the
  status; the layout is a row 4 mm apart, not the original's sheet nest.
- geneva-external and count-wheel-detent stay candidate: KNURL builds every
  body by canvas raster and trace (`K.buildParts` lines 975 to 1060); run in
  headless Chrome, the r 3.0 hub traces to r 2.9918 to 3.0108 mm (computed,
  `evidence/m06-cmds/knurl/trace-measure.json`), so no exact port meets
  1e-6 mm. Defect: the raster rule this needs is M10-T08's.
- aileron-differential stays candidate: cad.py runs headless through
  `uv run --project tools/py` and equals the shipped STLs, but the pushrod
  ball ends are trimesh icospheres (no sphere route) and every route snaps
  to 1/1024 mm, off cad.py's grid.
- slew-ring-joint stays candidate: the rotor's dovetail rail is a hull
  extruded along x (lines 437 to 443), which no route makes; the stator
  cuts depend on shapely buffers; snapping the original's own vertices
  moves the volumes 0.157 and 0.172 mm3 (computed). Defect: the thrust
  contact the faces actually bear is 12.9 to 16.4 mm, 322.2 mm2 (computed,
  rotor lead-in chamfer line 429), where derive() gave 385.1; the def now
  returns both.
- displacement-coincidence-latch stays candidate: `src/bodies/ogee-latch.ts`
  ports p_rod() and p_latch(); rod.dxf matches within 2.4e-5 mm and all 18
  latch loops match (computed, the 6-digit export bounds it), but
  CHK-MOT-05 never runs on part.build or check.run (core supplies no motion
  handle there) and the lug is in the outline, so apply() emits no lug or
  cam feature as step 2 asks.
- Defect for the originals rule: 1e-3 mm3 cannot hold for any port snapped
  to 1/1024 mm against an unsnapped original, and 1e-6 mm cannot be checked
  against a 6-digit or 0.1 mm export; the rule needs a stated tolerance for
  each record kind.
- counterbalance-band (owner milestone unassigned) and crank-yoke (M07)
  keep their reasons.

## M06-T07 Archetype registry: 29 seeded entries, tiers, corrections, resistance at load

Goal: all 29 seeded archetypes are registered with a status, a tier
computed from the rows they read, resistances computed at load from the
profile, and every D-096 archetype correction applied.

Inputs:
- packages/archetypes (M06-T01)
- packages/profile resistivity rows (D-081, M01-T03) and catalog per-MCU rows (D-076, M05)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/circuits.seed.yaml lines 7 to 244
- fab-knowledge:synthesis/plan-deltas.md R47, R48
- fab-knowledge:synthesis/verified-claims.md C1, C3, C5, C9
- fab-work-directory:benches/blocks/outputs/boss/boss-src.zip member src/boss.js lines 1 to 40 (BOSS v1 STD, SLOTS, barR)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/designs/blocks/legacy/blocks.html (later standard)
- fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/runs/r6_out.json, r6_0_out.json, r6_1_out.json (TANG R6 runs, recovered from Downloads 2026-10-04)
- fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/unzipped/tang_r5_circuit_files/DIMENSIONS.txt (TANG R5)

Steps:
1. Assign status per entry (rule at the top of this file):

   | status | seeded ids | count |
   |---|---|---|
   | proven (reference in M06-T09) | force-comb, capacitive-plate, wedge-pair-slider, arc-slider, graded-slider-wiper, resolver-dial, hex-key, coffer-port, printed-rotary-pot, finger-pot, ladder-keypad, dome-button, blocks-stud, blocks-wire, blocks-board-seat, tilt-stick, click-spring-key, flex-cone-key, touch-comb-key, rp2040-zero-seat, buried-trace-stack, scan-six-pads (TANG R5), printed-membrane-slider as membrane-slider-wall (TANG R6), face-as-board (TANG R6) | 24 |
   | stub (source not harvested) | none | 0 |
   | candidate (board package arrives at M08, or source withdrawn) | astable-blinky as astable-blinky-tack, c3-carrier, mosfet-low-side-gate, printed-pullup-meander (TANG r6_0 only; removed by its author at r6_1) | 4 |
   | unproven (D-096 demotion) | three-source-power-oring | 1 |

   Added by D-096: membrane-slider-thinpot (proven, FEELER THINPOT source),
   membrane-slider-gib (proven, GIB source), astable-blinky-shim
   (candidate, M08), sao-port (candidate, M08), pi-hat-carrier (candidate,
   M08, LUG rev A). Counts are generated (D-010); the numbers above are the
   expected split as of 2026-10-04.
2. Apply the corrections:

   | entry | seed value | corrected value | qualifier | evidence | decision |
   |---|---|---|---|---|---|
   | click-spring-key | span 22, beam 0.5; 2.3 N, 76 percent, contact 1.24, 2.3 percent | PIP defaults l 24, t 0.55, w 1.6, Q 2.0, E 1900, sw 3: 2.527 N at 0.629 mm, drop 76.5 percent, contact 1.369 mm, eStop 2.31 percent | computed | x/pip-controller/src/layout.js:36; M01-T02 | D-096 |
   | click-spring-key limits | "rise about 2.4 x t latches; under 2.0 stops snapping" | FE window 1.72 to 2.19 at PIP defaults; snaps from Q 1.2, bistable from 2.32 | computed | M01-T07 | D-071, C-04 |
   | click-spring-key fatigue | "PETG fatigues above about 2.5 percent" | 2.5 percent for beams bent in the layer plane; 1.5 percent default across layers | inferred (empirical, HAFT failures 2.7 to 3.3) | verified-claims C4 | D-073, C-05 |
   | tilt-stick | 470k pullup; cap pressed on after the bezel | PIP stick: read by charge-release, pad printed in place (`top: 'inplace'`); 470k stays only in a TOGGLE preset at Protopasta 30 ohm cm | design value | layout.js:38; plan-deltas R47 | D-096 |
   | buried-trace-stack | traces 1.0 x 0.72, insulation 0.48, over L2 0.48, net to net 0.3 | traces 1.4 wide, layer 0.72, iso 0.96, PETG over L2 1.68 on the 0.72 floor, net-to-net floor 0.60 (computed off the model); no bleed | design values; net-to-net computed | layout.js:27 to 28; verified-claims C1 | D-085, D-084 |
   | rp2040-zero-seat | wire cups at 5.2 mm "so a trace fits between two cups" | claim dropped: cup gap 2.0 under a lane of 3.0 (computed from defaults) | computed | docs/printing.md:90 to 92; src/model.js:518 to 519 | D-096 |
   | rp2040-zero-seat firmware | "470k pullup per key as the fallback" | read model charge-release; keys wait 3500 us in emitted firmware until a coupon calibrates; pip.ino still ships 200 us | measured crossings 113 to 2431 us | README.md:155 to 180; pip.ino:20; pip_stick.ino:25 | D-079, D-080 |
   | hex-key | across flats 17.3 | 18.53 (README 18.5), about 297 mm2 | design value; area computed | COFFER geometry | D-096 |
   | astable-blinky | one entry, TACK and SHIM | astable-blinky-tack: 100k, 10 uF, about 0.72 Hz; astable-blinky-shim: 33k, 22 uF, about 1 Hz (0.6 to 1.6), one 220R per LED | design values | plan-deltas R47 | D-096 |
   | three-source-power-oring | proven, ARMATURE | unproven: D11 cathode on no net, R13 on VBUS_F only, so VIN neither charges nor disables the boost | from the netlist | plan-deltas R47 | D-096 |
   | membrane slider | one entry with TANG R6 numbers | three entries: thinpot (FEELER), membrane (GIB), wall (TANG R6, proven) | n/a | plan-deltas R47; benches-conductive-a.md:620 | D-096 |
   | c3-carrier | dual-supply jumper default unset; SuperMini pad map tier verified | jumper default normally open (SPINDLE) against TRUNNION normally closed; pad map tier vendor until calipers | vendor | plan-deltas R47 | D-088 (owner, default normally open), D-096 |
   | blocks-stud | ring 2.4, traces 0.72 with 0.48 PETG; "a printed button on a 45k pullup lands in the undefined band" | two presets, no default: `boss-v1` (sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24) and `blocks-html` (sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2); the band sentence is replaced by the D-077 scope (cPLA wires short to medium, BOSS 50 kohm, carbon-filled filament only) | design values | boss.js:5 to 24; verified-claims C5 | D-087 (owner, default none until a print), D-077 |
   | SAO port | absent | sao-port candidate: SAO v1.69bis, 2x3 at 2.54, 3V3, GND, SDA, SCL, GPIO1, GPIO2, about 820 mW | community tier (hackaday.com, 2019-03-20) | verified-claims C9 | D-096 |
   | pi-hat | absent | pi-hat-carrier candidate with EEPROM and back-power diode as required checks; LUG rev A 65 x 56.5, 4 layers, 0 DRC errors lacks both | design values | plan-deltas R47; round-pi-board/outputs | D-096 |

3. Resistances at load (D-098). Each archetype declares its conductor
   sections (width, thickness, length expression, material slot role,
   direction: along, across, through). `resistances(profile)` obtains each
   row through `ProfileLookup.resistivity()` and calls `profile`
   `sectionResistance(row, L, w t)` for each declared path (ohm cm, mm
   geometry; R = rho x 10 x L / A lives only in `profile`, M00-T02). It
   returns each value with the row's tier, and the archetype's tier is the lowest tier among
   every row it read (catalog pin rows included). No archetype stores a
   resistance number.
4. Working rows are the D-081 working default: cPLA PIP preset 500 ohm cm
   along, 2000 through, cTPU 400 (inferred, x/pip-controller/src/layout.js:46).
   Yousu raw-filament figures are never scaled onto printed traces (C-09).
5. Seed numbers that were resistances become derived outputs with their
   old values kept in provenance as "seed, computed from Protopasta 30 and
   cTPU 1500 on an assumed 1.0 x 0.72 section".

Load-time resistance golden, printed-rotary-pot arc (arc_r 6.5, sweep 300
deg, section 1.0 x 0.72 as the seed assumed; L = 34.0339 mm), computed,
this card:

| resistivity row | rho ohm cm | tier | R | note |
|---|---|---|---|---|
| Protopasta cPLA printed XY | 30 | vendor | 14,181 ohm | reproduces the seed's 14k |
| BOSS cTPU slot (Eel class) | 1500 | inferred | 709,040 ohm | reproduces the seed's 709k |
| PIP preset cPLA along (working default) | 500 | inferred | 236,347 ohm | |
| PIP preset cTPU (working default) | 400 | inferred | 189,077 ohm | |

At the working default the cTPU arc reads lower than the cPLA arc, which
reverses the seed's limit sentence ("a cPLA arc (14k) against 40k of
printed leads swings 10 percent; cTPU (709k) swings 73"). The archetype
recomputes that swing at load from the rows in force; the sentence becomes
a computed readout, and the reversal is listed in the PR as a finding that
waits on the Yousu coupon (D-082).

Files to create:
- packages/archetypes/src/defs/*.ts (every seeded and added id)
- packages/archetypes/test/status.test.ts
- packages/archetypes/test/corrections.test.ts
- packages/archetypes/test/resistance.test.ts

Acceptance:
- `npm test -w packages/archetypes -- status` exits 0 and prints the
  split; it equals counts.json `canon.archetypes` with 29 seeded ids
  resolving (D-252; the forecast `proven 26 stub 0 candidate 7 unproven 1`
  over 34 ids is retired).
- `npm test -w packages/archetypes -- corrections` exits 0: one assertion
  per row of the correction table, each failing on the seed value.
- `npm test -w packages/archetypes -- resistance` exits 0 with the four
  rows above to the ohm, and a propagation test: an in-memory
  ProfileLookup override (never the profile data files) that sets the cPLA
  row to tier measured leaves every archetype that also reads cTPU at
  inferred, and moves an archetype that reads only cPLA to measured.
- `grep -rn "ohm\b.*: *[0-9]" packages/archetypes/src/defs` finds no stored
  resistance value (the test greps for numeric resistance fields).

Done when: one profile row change moves every dependent archetype
resistance and tier, and every D-096 archetype correction has a failing
test against the old value.

Build notes, 2026-10-09 (written back by the M06-T07 build):

- Status split as built: proven 3 (flex-cone-key, click-spring-key,
  touch-comb-key), candidate 52 (29 seed and D-096 entries plus the 22
  STYLUS THINPOT entries of M06-T10, tilt-stick among them), unproven 1,
  over 56 ids; 29 seeded ids still resolve. Card defect: step 1's split
  (proven 26) assigns proven before any port exists, which the originals
  rule and the M06-T01 contract (a runnable status needs a reference and
  an original) forbid; each entry not ported here stays candidate with
  "not ported yet: promotes in M06-T09 when its reference regenerates the
  original's numbers and bodies", and the acceptance count follows
  tools/reports/counts.json.
- Spec widened additively: `ConductorSection` and `ArchetypeDef.sections`
  (declared paths at the defaults). `resistances(sections, profile)` reads
  each row through `ProfileLookup.resistivity()` and calls profile
  `sectionResistance`; the registry sets each entry's tier at load to the
  lowest tier among the rows its sections read (`loadArchetypes(defs,
  aliases, profile)`), so the propagation test passes its own lookup.
- Load golden: the printed-rotary-pot arc declares the seed's section; the
  four rows give 14181, 709040, 236347 and 189077 ohm to the ohm. The BOSS
  cTPU row (1500 ohm cm) has no profile row; the test builds it in memory
  from boss.js line 32. The reversal (cTPU arc below cPLA at the working
  rows) stands as a finding waiting on D-082.
- Corrections live in `src/corrections.ts`, one row per row of step 2's
  table, each with a probe the test reads; limit sentences the table
  corrects are edited in the defs and load.test.ts builds the expected
  limits from the seed with them applied.
- Mutations (scratch copy, rebuilt): the tier rule taking the first row's
  tier instead of the lowest fails resistance.test (after a probe with
  cPLA first and cTPU after was added: the first run survived); click
  span 22 fails corrections.test.

## M06-T08 The four PIP buttons at PIP defaults, and the spring kind

Goal: flex, clicky, touch and stick regenerate from their archetypes at
PIP defaults with the same fits rows and feel readouts the published PIP
model computes.

Inputs:
- fab-knowledge:evidence/x/pip-controller/src/layout.js lines 27 to 46 (stack, route, flex 35, clicky 36, touch 37, stick 38, phys 46), 81 to 96 (`clickerDims`), 97 to 113 (`SNAPFE_RIGID`), 115 to 147 (`stickDims`), 149 to 160 (`flexDims`)
- fab-knowledge:evidence/x/pip-controller/src/model.js lines 440 to 531 (mech readouts and the fits table)
- fab-knowledge:evidence/x/pip-controller/test/load.mjs, test/export.mjs (node twin loader; needs manifold-3d 3.5.3 as the PIP package.json pins)
- fab-knowledge:evidence/x/pip-controller/firmware/pip/pip.ino line 20; firmware/pip_stick/pip_stick.ino line 25
- packages/sim/src/fe/ (M01-T01, M01-T02); reference/keys/click-spring-window (M01-T07)
- ../CANONS.md section on the four PIP buttons

Steps:
1. Record the legacy fits and feel readouts. In a scratch copy of
   pip-controller with `npm install` run (manifold-3d 3.5.3 is the PIP
   devDependency), run a script that imports `setup` and `run` from
   `test/export.mjs`, builds `LAYOUT.defaults()` and the stick case
   (`P.groups.left.kind = 'stick'`), and prints `M.fits`, `M.mech` and
   `M.elec.rows`. Save as `packages/archetypes/test/legacy/pip-fits.json`.
   The writer's run on 2026-10-04 (identical src to the published
   b137deb) gives 34 fit rows at defaults and 41 in the stick case, all
   ok, with `live after 0`.
2. Admit the `spring` feature kind if no earlier milestone has: fields
   span, beam, rise Q, width, end pinning (PLAN.md 6.3); generator from
   `clickerDims` and the model's spring build; checks CHK-KEY-04 (2.0.0,
   M01-T07) and CHK-KEY-05; fit class for the slot (0.2 to 0.6
   diametral); reference buttons/click-spring (M06-T09). The FE curve is a
   Part IR metric computed by sim at build (D-049).
3. Port each button's geometry rules into its archetype's `apply()` and
   its fits into the archetype's fit rows. Archetype defaults equal PIP
   `defaults()` for its group.
4. Read models (D-078): flex, clicky and stick keys `charge-release` with
   wait 3500 us; touch `charge-release` with wait 1500 us (design value,
   pip.ino:21 and layout.js:46). Each wait carries "computed tau is not a
   wait; calibrated from a coupon" and the provenance row records that
   pip.ino ships KEY_WAIT_US 200 while pip_stick ships 3500 (D-080, owner
   default: hackbuild-fab does not edit pip-controller).
5. Write the four button references (M06-T09 lists them). Each places one
   button on a minimal PETG body with the PIP stack (skin 0.72, trace 0.72,
   iso 0.96, pad 0.72) and two buried nets to edge pads.
6. Geometry parity on the conductive and flex slots: intersect the legacy
   PIP default build's per-slot meshes (cPLA, TPU, cTPU) with a cylinder
   of the button's well radius at the legacy key position (flex group at
   x -44, y 1, pitch 14; clicky x 42, y 1, pitch 17; touch x 0, y -15,
   pitch 17; stick case left group at x -44, y 1; layout.js:30 to 33) and
   compare per-slot volumes against the archetype build. PETG is excluded
   because the bodies differ.

Feel readouts at PIP defaults, computed, this card (SNAPFE through the PIP
model; M01 holds the full Q sweep):

| button | readout | value |
|---|---|---|
| clicky | peak force | 2.527 N (2.52713) |
| clicky | dPeak | 0.629 mm (0.628571) |
| clicky | valley force | 0.594 N |
| clicky | dValley | 1.611 mm |
| clicky | drop | 76.5 percent (0.764782) |
| clicky | contact cg | 1.369 mm (1.369107) |
| clicky | eStop | 2.31 percent (0.023093) |
| clicky | bistable | false |
| flex | contact gap | 1.80 mm, 45 percent of the 4.0 mm cone (rule: at least 1.2 and 35 to 50 percent, D-241) |
| flex | key height | 8.577 mm |
| flex | cone base radius rsb | 5.940 mm |
| flex | wall horizontal thickness | 0.783 mm |
| stick | wall radius Rw | 5.456 mm |
| stick | band to wall at rest | 0.66 mm, closes at 14 deg |
| stick | contact arc 1 deg past contact | 36 deg |
| stick | contact arc at full tilt (17 deg) | 62 deg |
| stick | diagonals reach two pads | yes, pads 82 deg wide, split 0.80 mm |
| touch | combs | finger 1.0 mm, gap 0.8 mm, boss through bezel 0.6 mm |

Fits rows per button group at PIP defaults (legacy model.js, computed,
this card; all rows ok):

| group | rows | rows and values |
|---|---|---|
| flex key | 6 | contact gap 1.80; cap bridge 3.60; split between halves 0.80; column to cone wall 1.71; face through bezel hole 1.00 diametral; stands proud of the bezel 2.60 |
| click spring | 11 | slot at the end blocks 0.30; slot over the arch 1.50; slot length over spring 0.40; rib in the block groove 0.40; under the bezel 0.12; cap through bezel hole 0.50; cap flange in its well 0.80; travel to contact 1.37 (snap peaks at 0.63); tip over each pad 1.30 (pads split by 0.60); beam thickness 0.55; strain at the stop 2.3 percent |
| touch pad | 3 | comb gap 0.80; finger width 1.00; boss through the bezel 0.60 |
| stick | 13 | band to wall at rest 0.66; band on the wall pad 0.84; contact arc one degree past 36 deg; contact arc at full tilt 62 deg; diagonals reach two pads yes; pad to common ring 0.80; bezel hole over the thumb pad 1.60; pad rim above the bezel 4.56; dish depth 1.60; pad diameter 15.00; conductive collar thickness 1.20; stem stress at a 20 N side push 4.9 MPa; well wall to the outline 0.60 |

The other legacy groups belong to other archetypes and are asserted in
M06-T09: traces 4 rows (trace width 1.40, net to net measured 0.60,
insulation between layers 0.96, PETG over layer 2 1.68) to
buried-trace-stack; board 7 rows (pocket 0.30, bump height 0.48, bezel
squeeze 0.30, bump to bump 0.84, clearance under the board 0.96, USB
opening 12.50 wide, USB opening height 9.36 at defaults and 10.32 in the
stick case) to rp2040-zero-seat; bezel 2 and print 1 stay with the PIP
design at M10.

The stem stress row is a beam estimate: 20 N times the cap arm over the
stem section modulus (src/model.js:501 to 504, limit 15 MPa). The
archetype keeps the qualifier computed.

Files to create:
- packages/archetypes/src/defs/flex-cone-key.ts, click-spring-key.ts, touch-comb-key.ts, tilt-stick.ts (PIP and TOGGLE presets)
- packages/archetypes/test/legacy/pip-fits.json
- packages/archetypes/test/pip-buttons.parity.test.ts
- spec feature kind `spring` generator, checks and fit wiring in the package that owns kind generators (PACKAGES.md), if not admitted earlier

Acceptance:
- `npm test -w packages/archetypes -- pip-buttons.parity` exits 0: every
  fit row in the four groups equal by name, value to 0.01 and ok flag;
  every feel readout above equal to the printed precision.
- Per-slot volumes inside each button cylinder equal the legacy build
  within 1e-3 mm3; a slot with no material in either reports 0 in both.
- `npx --no-install hbf part.build reference/buttons/click-spring --json` exits 0 with
  metrics peak 2.527 N, drop 0.765, cg 1.369 mm, eStop 0.0231 and
  CHK-KEY-04 pass at Q 2.0 inside 1.72 to 2.19 (M01 golden).
- The emitted firmware stub for each reference carries KEY_WAIT_US 3500
  and TOUCH_WAIT_US 1500, each with a comment naming the coupon that will
  replace it.

Done when: the four PIP buttons are registry entries a design can place,
and their numbers match the published controller.

Build notes, 2026-10-09 (written back by the M06-T08 build):

- Source: the original of record (haft-src, haft (9)) evaluated in place
  by `packages/archetypes/scripts/pip-legacy.mjs` on manifold-3d 3.5.3,
  with pip-controller b137deb beside it; `test/legacy/pip-fits.json` holds
  both, at bleed 0.15 (haft default) and 0 (D-084), defaults and the stick
  case. The published copy gives 34 and 41 rows as the card says; haft at
  bleed 0 equals it on every button row (computed).
- Ports in `packages/archetypes/src/pip/` (flex, touch, stick, click,
  emit, common): stack from profile constants, layer from the machine,
  bleed from the profile bleed row. Fits rows, feel readouts, switch
  resistances and per-slot volumes equal the original: cPLA, TPU and cTPU
  inside each button's cylinder within 1e-3 mm3 at bleed 0 and 0.15, read
  before the kernel's D-054 snap and D-070 inset (card defect: 1e-3 mm3
  is below what a snapped, inset build can hold; the test meshes the
  declarations as PIP meshes its own). Cylinder z starts at the pad layer,
  since routed traces differ by design; the stick's cylinder is Rw + 3.9,
  its common ring, where the well radius would cut it (card defects).
- The archetype sits on the stack floor face and reports the body top it
  needs as metric host.top; ApplyOut gains optional metrics and warnings
  (spec, additive). The click spring's FE comes from packages/sim through
  `provideClickSolver`, registered by core (core/src/canon.ts, D-044).
- spring kind admitted in packages/mesh with CHK-KEY-04 and reference
  buttons/click-spring; SpringFeature gains optional sw (closes the M04-T01
  defect). pocket (mesh) and contact, port, pad (circuit) gain package
  defs, ported from the flex-pair drafts; core registers them on use
  (KernelKinds.onUse), so references that never declare them keep their
  registryHash. Author.arch is implemented (placeArchetype: resolve,
  validate, apply, map slots, prefix ids), which M06-T12 reuses.
- tilt-stick stays candidate: its PIP preset regenerates the 13 rows, Rw,
  rest gap, switch resistance and volumes, but its reference fails
  CHK-PRT-03 by 0.0006 mm3 (0.001605 against 0.001, computed: partition
  residue over 33 parts; finding for M04 and mesh), and the TOGGLE presets
  are not ported. The reference is kept at
  fab-knowledge:evidence/m06-arch/sticks-pip-stick-reference/.
- Findings: two half-ring conductors and a stem lathe sharing a radius with
  the thumb lathe fail the stage 8 union (fixed: one cPLA ring body with a
  hole; the TPU parts as one csg union, as PIP unions them); PIP's common
  terminal (Rw + 2.65) and ring post (Rw + 2.9) overlap in a 0.03 mm
  crescent (param commonTerm); PIP's thumb profile repeats its last vertex.
- Contacts: CHK-KEY-01 throws E_PARAM_MISSING on a contact without coneH,
  and circuit's pressed path needs a contact for every key port, so the
  touch, stick and click references carry no hookup row and the stick and
  click no contact feature (the tip prints apart). The firmware stub
  (`firmwareStub`) carries the waits instead.
- Virtual print of buttons/flex-cone (Orca-Flashforge 2.3.2, fresh
  datadir): 0 foreign deposits, 0 nets bridged, leads reach the columns
  (computed). Its contact gap table came out empty because analyze.py keys
  on flex-pair's contact ids (finding).
- Mutations: flex collar 0.24 to 0.2 fails three parity cases; touch
  fingers ignoring bleed fails the bleed 0.15 volume case.

## M06-T09 Archetype references

Goal: every proven archetype has a green reference written in this
milestone; stubs, candidates and the unproven entry are listed as gaps with
their reasons.

Inputs:
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/reference/INDEX.md
- fab-knowledge:synthesis/mappings.md section 7.2
- legacy sources per row below, and the original of record per row of the step 4 table
- `knowledge/designs/MECHANISMS.md` and the record of each source design
- packages/archetypes (M06-T07, M06-T08), circuit and copper (M05)

Steps:
1. One reference per proven archetype, same folder layout and parity
   triple as M06-T06. Electrical expected values (net resistances, read
   model outputs) come from `circuit.solve` (M05) on the built geometry and
   carry the tier of the rows they read.
2. Before writing each reference, record the legacy numbers from its
   source into `expected/legacy.json` with the command or line that
   produced them. A missing source blocks the row; the builder writes no
   stand-in (D-180). The numbers and the bodies come from the original of
   record in the step 4 table under the originals rule; the corpus path in
   the first table is read only when its sha256 equals that original.
3. Run `check.run` on each reference and record the selected check set.
   This set is the baseline M06-T12 compares against.

| archetype | reference id | source (harvested) |
|---|---|---|
| force-comb | sensors/force-comb | corpus/cricut-midi-seven/outputs/keyway |
| capacitive-plate | sensors/capacitive-plate | corpus/cricut-midi-seven/outputs/vernier; corpus/coffer/outputs/coffer |
| wedge-pair-slider | sensors/wedge-slider | corpus/cricut-midi-seven/outputs/vernier |
| arc-slider | sensors/arc-slider | corpus/cricut-midi-seven/outputs/quadrant |
| graded-slider-wiper | sensors/graded-slider | corpus/cricut-midi-seven/outputs/keyway |
| resolver-dial | sensors/resolver-dial | corpus/coffer/outputs/coffer |
| hex-key | surfaces/fret-hex | corpus/coffer/outputs/coffer; corpus/cricut-midi-seven/outputs/fret |
| coffer-port | surfaces/coffer-tile | corpus/coffer/outputs/coffer |
| printed-rotary-pot | sensors/rotary-pot | corpus/feeler-thinpot/outputs/feeler.html archetype `wiper` (lines 3332 to 3699); TANG R6 (Downloads, fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/runs/r6_out.json) |
| membrane-slider-thinpot | sensors/membrane-slider-thinpot | feeler.html archetype `thinpot` (line 4023) |
| membrane-slider-gib | sensors/membrane-slider-gib | corpus/gib/outputs/gib.html, gib-src.zip |
| finger-pot | sensors/finger-pot | corpus/gib/outputs/gib.html |
| ladder-keypad | buttons/ladder-key | feeler.html archetype `ladder` (line 4213); feeler-ladder-inplace-sample.3mf |
| dome-button | buttons/dome | feeler.html archetype `switch` (line 1701) |
| blocks-stud | conductors/blocks-stud | corpus/blocks/outputs/boss/boss-src.zip (boss.js `column`) |
| blocks-wire | conductors/blocks-wire | boss-src.zip parts.js `wire` (lines 323 to 426) |
| blocks-board-seat | seats/blocks-seat | boss-src.zip parts.js |
| tilt-stick | sticks/pip-stick and sticks/tilt-stick-4 | x/pip-controller (PIP preset); x/toggle (TOGGLE preset, 470k) |
| click-spring-key | buttons/click-spring | x/pip-controller |
| flex-cone-key | buttons/flex-cone | x/pip-controller |
| touch-comb-key | buttons/touch-comb | x/pip-controller |
| rp2040-zero-seat | seats/rp2040-zero-pressfit | x/pip-controller (board mode press) |
| buried-trace-stack | conductors/buried-trace-stack | x/pip-controller (stack and route defaults) |
| scan-six-pads | sensors/scan-six-pads | TANG R5 (Downloads, fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/unzipped/tang_r5_circuit_files/DIMENSIONS.txt) |
| membrane-slider-wall | sensors/membrane-slider | TANG R6 (Downloads, fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/runs/r6_out.json) |
| face-as-board | conductors/face-as-board | TANG R6 (Downloads, same run output) |

4. Originals of record (paths under
   fab-knowledge:originals/; record is
   `knowledge/designs/<slug>.md`). Each reference regenerates every number
   and body this row's function computes at the original's defaults:

   | archetype | original file and function | record |
   |---|---|---|
   | flex-cone-key | pip/files/haft-src/src/model.js lines 63 to 88; layout.js `flexDims` | pip.md 5.1 |
   | click-spring-key | pip/files/haft-src/src/layout.js `clickerDims` lines 81 to 113; model.js lines 89 to 112 and 366 to 390; snapfe.js | pip.md 5.2 |
   | touch-comb-key | pip/files/haft-src/src/model.js lines 113 to 136 | pip.md 5.3 |
   | tilt-stick (PIP preset) | pip/files/haft-src/src/model.js lines 137 to 177; layout.js `stickDims` | pip.md 5.4 |
   | tilt-stick (TOGGLE presets solo4, solo8, blocks8) | toggle/files/src/src/part2b.js lines 10 to 255; part2d.js lines 394 to 414 | toggle.md 5 |
   | rp2040-zero-seat | pip/files/haft-src/src/model.js lines 180 to 248 (press mode); gudgeon/files/extracted/05_part2d_circuit.js lines 9 to 27 (header cup option) | pip.md 5.7, gudgeon.md |
   | buried-trace-stack | pip/files/haft-src/src/model.js lines 26 to 51; geom.js `GEO.stroke` | pip.md 5.5 |
   | dome-button | thinpot/files/feeler_thinpot.html `domeCap` from line 1352 | thinpot.md |
   | ladder-keypad | thinpot/files/feeler_thinpot.html `ladder` from line 4213 | thinpot.md |
   | membrane-slider-thinpot | thinpot/files/feeler_thinpot.html `thinpot` from line 4022 | thinpot.md |
   | printed-rotary-pot | tang-r6/files/src/04_design.js from line 194, `D.buildRotor` (gold drive); FEELER `wiper` kept as a second preset with its own legacy record | tang-r6.md |
   | membrane-slider-wall | tang-r6/files/src/05_design.js `D.buildNeck` lines 38 to 94 | tang-r6.md |
   | face-as-board | tang-r6/files/src/04_design.js `D.buildFace` | tang-r6.md |
   | scan-six-pads | tang-r5/files/src/tang_r5_13_core.js from line 352 | tang-r5.md |
   | membrane-slider-gib | gib/files/src/src/part2.js `buildMembrane` | gib.md |
   | finger-pot | gib/files/src/src/part2.js `buildFinger` | gib.md |
   | force-comb, graded-slider-wiper | keyway/files/gen_keyway.py (comb zones; slider pass) | keyway.md 5.1, 5.3 |
   | capacitive-plate | gudgeon/files/extracted/05_part2d_circuit.js lines 19 to 52 (printed); vernier/files/gen_vernier.py (copper) | gudgeon.md, vernier.md |
   | wedge-pair-slider | vernier/files/gen_vernier.py `wedges()` | vernier.md |
   | arc-slider | quadrant/files/gen_quadrant.py | quadrant.md |
   | resolver-dial | coffer/files/gen_coffer.py `tile_D1` lines 168 to 208 | coffer.md |
   | hex-key, coffer-port | coffer/files/hexcore.py, gen_coffer.py; fret/files/gen_fret.py | coffer.md, fret.md |
   | blocks-stud | blocks/files/src-extracted/blocks.js lines 168 to 226; boss/files/boss-src/src/boss.js lines 93 to 110 (`boss-v1` preset) | blocks.md 5.4, boss.md |
   | blocks-wire | blocks/files/src-extracted/parts.js lines 565 to 710 | blocks.md 5.10 |
   | blocks-board-seat | blocks/files/src-extracted/parts.js lines 222 to 344 (with the `prismY` fix, blocks.js lines 251 to 258) | blocks.md 5.8 |

   Where this table and the first table name different files for one
   archetype, this table is the source of record and the first table's
   file is lineage; the PR lists each such row.

Gaps recorded, not written:

| entry | status | reason | unblocks when |
|---|---|---|---|
| printed-pullup-meander | candidate | r6_0 source only; removed by its author at r6_1; FEELER `meander` candidate may replace it on promotion | owner restores it in TANG, or promotion of the FEELER candidate |
| astable-blinky-tack, astable-blinky-shim, c3-carrier, mosfet-low-side-gate, sao-port, pi-hat-carrier | candidate | board backends land at M08 (D-089) | M08 writes boards/tack-pin, boards/shim-card, seats/c3-supermini, boards/trunnion, boards/sao-port, boards/lug-pi-hat |
| three-source-power-oring | unproven | ARMATURE netlist never implemented the VIN half | ARMATURE fixed and routed |

The INDEX entry `seats/rp2040-zero-cups` is retired with the wire-cup
claim (D-096); the cup mode stays a PIP board mode without a canon claim
about traces between cups.

Files to create:
- reference/<area>/<id>/ for every row of the first table, each with chase.ts, build.ts, README.md, expected/
- packages/archetypes/test/gaps.test.ts (asserts the gap table equals the registry's non-proven entries)

Acceptance:
- `npx --no-install hbf parity reference/<area>/<id>` exits 0 for every row of the
  first table (27 reference folders expected for 26 proven ids; the count
  is generated).
- `npm test -w packages/archetypes -- gaps` exits 0.
- `npm test -w packages/archetypes -- originals` exits 0: for every proven
  archetype, `provenance.original.sha256` equals the lineage.json
  canonical row; every value in `expected/legacy.json` (fits rows, feel
  readouts, resistances, read model outputs, gates) is regenerated to the
  original's printed precision; per-slot volumes and bounding boxes of the
  archetype's bodies equal the original's within 1e-3 mm3 and 1e-6 mm (the
  M06-T08 cylinder method for parts that sit inside a larger body). A
  proven archetype without a passing row fails the test, and the PR names
  it as demoted to candidate rather than relaxing the tolerance.
- Each reference README carries the "made the way the original makes it"
  list with record sections and the test per rule.
- `npx --no-install hbf parity reference/conductors/buried-trace-stack` asserts the
  four PIP traces rows of M06-T08, with net to net at least 0.60 mm at 1.4
  mm traces (computed off the model) and no silent routing failure
  (CHK-NET-12).

Done when: every proven archetype builds green from its reference, and
every other entry says what it waits for.

Build notes, 2026-10-09 (written back by the M06-T09 build):

- Written: reference/buttons/flex-cone, buttons/touch-comb and
  buttons/click-spring, each with chase.ts, build.ts (Author.arch),
  README with the made-the-way list and the verified block, the four
  parity goldens, `expected/firmware.ino` and a test reading the legacy
  record. hbf parity exits 0 on all three; check.run exits 0 with
  CHK-PRT-05 warns (PIP's 0.72 slabs on the 0.25 first layer, as
  electrical/pip-buried-route).
- Not written: the other 23 rows of the first table (no port yet) and
  sticks/pip-stick (see M06-T08). gaps.test.ts asserts each proven entry's
  folder and goldens and that each gap names what promotes it;
  originals.test.ts asserts each proven entry's record hashes its
  original. The CHK-PRT-03 ceiling being absolute over a whole part is
  listed for M04.
- Mutations: unprefixed Author.arch ids fail the flex-cone reference;
  contact travel taken at the peak fails the click-spring reference.

Build notes, 2026-10-09, second pass (written back by the M06-T09 archetype
port; evidence under fab-knowledge/evidence/m06-arch2/):

- Proven 9 (counts.json): the three PIP buttons plus blocks-wire,
  membrane-slider-thinpot, membrane-slider-gib, finger-pot,
  membrane-slider-wall and printed-rotary-pot. Each reference passes hbf
  parity and check.run (CHK-PRT-05 warns only) and its legacy record
  (test/legacy/<slug>.json, from the original evaluated in place) matches
  fits, readouts and per-slot volumes within 1e-3 mm3, bbox 1e-6 mm.
- Ported with parity, left candidate on a kernel or check defect: tilt-stick
  (PIP and TOGGLE solo4, solo8, blocks8; CHK-PRT-03 0.001605 and 0.002171 mm3:
  no part overlaps, the stage 8 snap of union crossing vertices made by the
  0.001 mm coincidence inset moves the solid; finding for mesh, M04);
  rp2040-zero-seat (bump and socket, five variants; CHK-PRT-04 measures
  pocket walls in plan only); blocks-stud (both presets; CHK-KEY-02 applies
  PIP's flex-cap limit to every pocket); dome-button (CHK-PRT-13 74.4 deg on
  the original's own print pose; owner); ladder-keypad (stage 8 union refuses
  the page's 0.01 mm laps); coffer-port, hex-key, resolver-dial (outlines
  within 1e-6 mm; copper archetypes have no part.build path, VinylDraft takes
  a rectangle only); buried-trace-stack (copper's emit gives 869.836 mm3
  against the original's 869.688). Their references are kept in evidence.
- Not ported, reasons in each def: blocks-board-seat (BLOCKS router),
  face-as-board, scan-six-pads, the copper sliders and capacitive-plate, the
  astable blinkies (M08).
- Original defects found: PIP leaves a 0.1 mm PETG fin between the back
  window and the USB notch (port default windowEnd 0.3; 0.4 regenerates it);
  COFFER's seed says 17.3 across flats, the shapes give 18.53; BLOCKS cPLA
  wire core ends 0.30 short of its cap ring; THINPOT ladder and switch
  declare holeD twice. analyze.py keys on flex-pair ids.
- The button references' goldens moved with the registry (registryHash,
  new checks from other lanes); left for the integration re-accept.

Build notes, 2026-10-10 (written back by the M06 promotion unblock; evidence
under fab-knowledge/evidence/m06-unblock/):

- Kernel and check defects fixed at the root, each with a test and a killed
  mutant (evidence `mutations.txt`): stage 8 records the union's volume
  before the D-054 snap (Part `unionVolumeMm3`, spec additive) and
  CHK-PRT-03 2.0.0 measures overlap against it, with the snapped solid held
  to the validator's 0.1 percent sum rule (CHECKS.md 7.10); CHK-PRT-04 2.0.0
  measures walls per z band, joining pockets that touch, cross or nest and
  opening a cavity that reaches past the outline; CHK-KEY-02 2.0.0 holds
  only a pocket capped by a flex or flex-conductor body; the D-055 union
  gains a last candidate that flips caps (a zero-area triangle on three
  distinct collinear grid vertices, left where three slabs share a face
  plane: the THINPOT ladder base), and each THINPOT page part is one csg
  union body, as the page hands a part's slabs to the slicer as one object
  (the `each` split is gone); packages/copper emitTraceLayers computes PIP's
  regions off the grid, so the emitted stack holds 869.687809 mm3 of cPLA
  below the pad plane against the original's 869.687808 (computed), where
  snapping every entry gave 869.836 (PIP's 0.7 mm half trace sits at 716.8
  grid steps and both edges rounded outward).
- Proven 11 (counts.json): rp2040-zero-seat (seats/rp2040-zero-pressfit)
  and blocks-stud (conductors/blocks-stud, blocks-html) added. Each passes
  hbf parity (accepted at SOURCE_DATE_EPOCH 315532800, rerun equal at
  1000000000), check.run with CHK-PRT-05 warns only, its reference test
  against the original's record, `validate_3mf.py --overlap`, and a virtual
  print with 0 foreign deposits and 0 nets bridged (computed).
- tilt-stick stays candidate: both references pass parity and check.run,
  sticks/pip-stick prints clean in the virtual print, but sticks/tilt-stick-4
  has 1.248 mm2 of the TPU stick printed by the PETG tool as an internal
  bridge at layer 40, and the owner's own TOGGLE solo4 save sliced the same
  way shows the same 1.253 mm2 at the same layer (computed): owner question.
  Its references are kept in evidence (`sticks/`), goldens accepted; a
  candidate's apply refuses, so they cannot sit in reference/ until it is
  promoted. pip-stick keeps commonTerm 2.9: at PIP's 2.65 the posts'
  crescent overlaps by 0.00165 mm3 after the snap, over the CHK-PRT-03
  ceiling (computed).
- ladder-keypad now builds and, with dome-button, fails CHK-PRT-13 on the
  flip bowls (62.664 and 74.377 deg over 359.44 and 133.07 mm2, computed);
  the original's own in-place export reads 48.885 deg over 643.17 mm2 by the
  same rule (computed). Owner question below; the check is unchanged.
- buried-trace-stack stays candidate: its geometry now equals the original
  (test/trace-layer-volume.test.ts in packages/copper), but archetypes may
  not import copper (tools/tiers.json), so it has no apply and no reference
  conductors/buried-trace-stack; promotes when core registers the emit for
  archetypes (D-044) or the reference places route data as
  electrical/pip-buried-route does.
- Not done: the copper build path for coffer-port, hex-key and
  resolver-dial. It is a COFFER board port on the vinyl surface path
  (VinylDraft takes a W x H rectangle; COFFER's hexagon, hexcore.py Gates,
  and tile_K6 and tile_D1 of gen_coffer.py, 214 gates), not a part.build
  change, and hex-key and resolver-dial also need their key and band nets,
  which the archetype ports do not hold. No copper archetype was promoted.
- Card defect: blocks-stud emits conductor, pocket and port, no contact
  (the def's emits list, from the seed, names contact); M06-T12 step 4's
  candidate list names contact checks the stud never selects.
- Moved goldens left for the integration re-accept: the check version
  bumps move registryHash and report.json of every reference;
  electrical/pip-buried-route also moves meshHashes and volumes (route.data.ts
  regenerated off the grid). Pre-existing and not touched:
  packages/checks metric-gates record (12 builds against the tree's 47),
  reference/test/readme-verified walk and README blocks of other lanes.

## M06-T10 FEELER THINPOT: 22 archetypes as candidates

Goal: the 22 THINPOT archetypes are registered as candidates with their
params, sim models and provenance, with the two FEELER defects fixed in the
port.

Inputs:
- fab-work-directory:benches/feeler-thinpot/outputs/feeler.html (7157 lines, 22 archetypes); archetype starts: cappad 1428, switch 1701, flexstrip 1848, compress 2009, meander 2105, tribo 2260, horn 2385, comb 2448, auxetic 2536, triaxial 2608, bistable 2685, gradient 2843, absorber 2912, rfpatch 2973, encoder 3091, wiper 3332, matrix 3699, level 3791, hotwire 3914, thinpot 4023, ladder 4213, whisker 4563
- feeler.html lines 3140 to 3156 (quadrature marks; B offset `step/2`)
- fab-work-directory:benches/feeler-v1/outputs/feeler.html (20 archetypes; encoder fit reads `P.armW`)
- fab-knowledge:sources/benches/benches-conductive-a.md lines 165, 166, 171 to 285, 564 to 584, 624 to 625, 633, 663
- fab-knowledge:synthesis/verified-claims.md C6 (22 holds for THINPOT; feeler-v1 has 20)

Steps:
1. Register each of the 22 ids as `feeler-<id>` with status candidate,
   group (well behaved, piezoresistive, metamaterial, hybrid, exotic, as
   the bench labels them), params with units and ranges, emitted kinds,
   read model, sim model id, materials, and provenance (feeler.html line
   range). Where a THINPOT archetype is the source of a proven entry, link
   it: switch to dome-button, ladder to ladder-keypad, thinpot to
   membrane-slider-thinpot, wiper to printed-rotary-pot, cappad to
   capacitive-plate.
2. Fix the encoder B phase in the port: marks are step/2 long on a step
   period; B must be offset by step/4 (90 electrical degrees). THINPOT
   offsets by step/2 (180 degrees), so B is the complement of A and
   carries no direction, while the FEELER sim uses step/4. Add a unit test:
   for a quadrature disc, the B mark set equals A rotated by one quarter of
   the mark period within 1e-9 rad (benches-conductive-a.md:624).
3. Define every param a fit reads. FEELER v1's encoder fit read `P.armW`,
   which is not an encoder param (`wiperW` is), so `Math.min(undefined, x)`
   gave NaN and the fit always read not ok; THINPOT replaced the fit. The
   port types params so an undefined read is a compile error, and a NaN or
   missing measured value at run time is E_PARAM_MISSING (D-064).
4. Port each archetype's electrical maths (`dividerR`, `niceR`, ladder
   levels V(k) = Rpar / (k R + Rpar), thinpot loaded divider) as
   computed readouts reading profile rows at load (D-098). FEELER's own
   rho values (cPLA 15, rhoZ 60, cTPU 1000) stay in provenance; the
   working rows are D-081's.
5. Candidates are refused by arch.apply with E_REF naming promotion
   through STYLUS (D-164) at M10.

Files to create:
- packages/archetypes/src/defs/feeler/*.ts (22 files)
- packages/archetypes/test/feeler.test.ts

Acceptance:
- `npm test -w packages/archetypes -- feeler` exits 0: 22 candidate ids
  load; the quadrature test passes with B at step/4; a test that sets the
  offset to step/2 fails it.
- `npx --no-install hbf arch.find --behaviour angle --json` exits 0 and lists
  `feeler-encoder` with status candidate after the proven `arc-slider`
  and `printed-rotary-pot`.
- No candidate def contains a param read that is not in its schema
  (typecheck, `npx tsc -b` exit 0).

Done when: STYLUS at M10 can promote any of the 22 by writing its
reference, without re-reading feeler.html.

Build notes, 2026-10-09 (written back by the M06-T10 build):

- The 22 defs under `src/defs/feeler/` are generated by
  `scripts/feeler-defs.mjs` from the original's own `params:[...]`
  declarations, evaluated with the helpers the page binds (its second
  declaration, line 3083, wins; an empty unit stays empty). FEELER_TABLE
  carries bench name, group, line range, sim model id and line, and link.
- Finding: switch and ladder declare holeD twice (contact hole and
  mounting holes), so one value serves both on the page; the port names the
  mounting hole mountHoleD.
- Senses, emits and read models are working values this card assigns;
  the electrical maths (dividerR, niceR, ladder levels, the loaded thinpot
  divider) equals the page's functions over a sweep; quadratureMarks puts
  B at step / 4 and the page's step / 2 fails isQuadrature.
- arch.find (M06-T11) is not built; its acceptance line is not run here.
- Mutations: B at step / 2 and the 20 mA divider at 10 mA each fail
  feeler.test.

## M06-T11 mech.find, mech.derive, arch.find

Goal: the three query commands answer from the registries with
CommandResult, typed errors and exit codes.

Inputs:
- spec/commands.ts (CommandDef, CommandResult), spec/errors.ts
- core command registry (M00 onward)
- ../AGENT-SURFACE.md (command table; MCP tools `canon_search` and `mech_derive` come at M12)
- fab-knowledge:synthesis/api-library-ai-design.md section 5.2

Steps:
1. `mech.find {query, family?, process?}` returns hits ranked by id,
   family and governs text match, each with id, family, status, dof,
   processes, provenance and reference id. Stub and candidate entries
   appear after typed ones with their status.
2. `mech.derive {id, params}` validates params against the def's inputs,
   fills defaults, runs derive(), and returns outputs with unit and
   qualifier, the inputs used, and `origin hbf://mechanism/<id>`. Unknown
   id: E_REF with didYouMean (exit 2). Missing or NaN input with no
   default: E_PARAM_MISSING (exit 2). Stub or candidate: E_REF naming the
   status and the reason (exit 2).
3. `arch.find {behaviour, process?, channels?}` matches senses, family and
   emits; returns id, family, status, channels, senses, emits, read model,
   tier, resistances computed at load with their tiers, provenance and
   reference id.
4. Command descriptions follow the AGENT-SURFACE standard (three
   sentences, a "Do not use" clause, at most 120 words) and pass
   lint-voice.
5. Resource URIs `hbf://mechanism/<id>` and `hbf://archetype/<id>` resolve
   to the def with its derive() source text (static resources).

Files to create:
- core/src/commands/mech.find.ts, mech.derive.ts, arch.find.ts
- core/test/canon-commands.test.ts

Acceptance:
- `npx --no-install hbf mech.find geneva --json` exits 0; first hit geneva-external,
  status typed, reference mechanisms/geneva-3.
- `npx --no-install hbf mech.derive genva --json` exits 2 with E_REF and didYouMean
  `geneva-external`.
- `npx --no-install hbf mech.derive count-wheel-detent --params E=NaN --json` exits 2
  with E_PARAM_MISSING naming `E`.
- `npx --no-install hbf mech.derive counterbalance-band --json` exits 2 with E_REF
  naming status candidate and the reason "owner milestone unassigned"
  (aileron-differential, the former stub example, is typed at M06-T03).
- `npx --no-install hbf mech.derive leaf-spring-detent-drum --json` exits 2 with E_REF
  naming status candidate and its original, `cotter-src/src/modules2.js`
  lines 38 to 65 (M06-T14).
- `npx --no-install hbf mech.derive pin-free-balance-beam --json` exits 0 with
  half-select rise 2.500 mm and tilt 24.624 deg at R17b defaults.
- `npx --no-install hbf arch.find --behaviour press --process fdm --json` exits 0 and
  lists click-spring-key, flex-cone-key, dome-button with tier inferred
  and resistances computed from the working rows.
- `npm test -w core -- surface` pins the cumulative command count at M06
  to MILESTONES.md 1.3.

Done when: a model can find a mechanism, ask for its numbers and get a
typed answer or a typed refusal.

Build notes, 2026-10-09 (written back by the M06-T11 build):

- `core/src/commands/mech.find.ts`, `mech.derive.ts`, `arch.find.ts`, the
  shared ranking `canon-hits.ts` and `canon-view.ts` (the hbf://mechanism
  and hbf://archetype resources, through an optional `canon` source on the
  packages/project resolver). `npm test -w core -- canon-commands` and
  `-- surface` pass; the surface test pins the M06 row.
- Card defect: step 1 names the input `query`; spec and AGENT-SURFACE 5.1
  name it `behaviour`, which the port keeps (family and process added to
  spec additively). CanonHit gained status, statusReason, dof, provenance,
  reference, original, channels, senses, emits, read, resistances and uri.
- mech.derive validates params before the status refusal, so
  count-wheel-detent E=NaN answers E_PARAM_MISSING at /params/E though the
  entry is candidate. On the cli the NaN is caught first by the inputs
  hash, with the same code and path and a generic hint.
- didYouMean gained a segments option (spec/errors.ts): genva is 10 edits
  from geneva-external as a whole id and 2 by its words.
- Acceptance as run 2026-10-09: mech.find geneva gives geneva-external
  first, status candidate with no reference (the card expects typed and
  mechanisms/geneva-3; M10-T08 promotes it). genva, E=NaN,
  counterbalance-band, leaf-spring-detent-drum, pin-free-balance-beam
  (2.500 mm, 24.624 deg) and arch.find press on fdm answer as the card
  says. Outputs: `fab-knowledge/evidence/m06-cmds/t11-t12/acceptance.txt`.
- Mutants: dropping the NaN guard and dropping typed-first ranking each
  fail canon-commands (evidence/m06-cmds/t11-t12).

## M06-T12 arch.apply: a BLOCKS stud on a fresh prism

Goal: `arch.apply` places a BLOCKS stud on a face of a plain prism, writes
the placement into `chase.applied` on the work branch, and every check that
selects the emitted conductor, contact and port features runs with no check
code or version changed.

Inputs:
- packages/archetypes blocks-stud def with presets `boss-v1` and `blocks-html` (M06-T07)
- reference/conductors/blocks-stud and its recorded check selection (M06-T09)
- fab-work-directory:benches/blocks/outputs/boss/boss-src.zip member src/boss.js lines 31 to 50 (`column`: cTPU socket ring 0 to sockH, cPLA flange and post d 3.0, stud d 4.8 x 1.8)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json (appliesTo of CHK-NET-01 to -12 and CHK-KEY-01 to -06)
- spec/chase.ts AppliedArchetype; D-115 (writes on a branch)

Steps:
1. Write the fresh prism reference `reference/conductors/blocks-stud-applied/`:
   chase.ts declares one PETG body, a 32 x 24 mm rectangle (4 x 3 studs at
   the 8 mm pitch) extruded 9.6 mm (BOSS brickH) on the prism route, no
   features, no applied entries.
2. Implement `arch.apply {part, face, id, params?}` in core:
   - resolve id through the alias table; refuse stub, candidate and
     unproven entries with E_REF;
   - run build.ts to get the host `PartDraft` named by `part` (E_REF if
     none), then call the archetype's
     `apply({draft, face, params, profile})`, which returns `ApplyOut`:
     added bodies, emitted features with body assignments (for
     blocks-stud: conductor for flange and post, contact for the stud,
     port with its read model), port ids and the material slots it needs;
   - write `{archetype, part, face, params}` into `chase.applied`, plus
     every slot in `ApplyOut.slots` that `chase.materials` lacks (matched
     by material and role), as one patch on branch `hbf/<chase>` with the
     same patch writer chase.patch exposes at M10 (anchor matches exactly
     once or E_STALE, D-115, D-165);
   - implement the kernel applied merge (spec/build.ts `APPLIED_MERGE`):
     `part.build` merges each `chase.applied` entry for a part into its
     `PartDraft` before stage 1, mapping local slots onto
     `chase.materials` and prefixing ids with
     `<archetype id>.<applied index>.`; add `Author.applied` and
     `Author.arch` to `@hackbuild/kernel/author`;
   - return the prefixed emitted feature ids and port ids, the applied
     record, `slotsAdded`, and next calls `part.build` and `check.run`.
3. Apply with `standard: boss-v1` at the top face centre, then a second run
   with `standard: blocks-html`. A call without `standard` returns a typed
   question naming both presets, since D-087's default is none until a
   print.
4. Build and check. The registry selects checks by feature kind and level,
   as it does for every part. From the seed appliesTo, the candidates for
   these features are CHK-NET-03, CHK-KEY-01, CHK-KEY-03, CHK-KEY-05
   (contact); CHK-NET-04, CHK-NET-05 (conductor); CHK-NET-10 (port);
   CHK-NET-01, -02, -06, -07, -11 (net); CHK-NET-12 (project). The test
   records the selected set and each result.
5. Compare against the baseline from M06-T09: the selected set for the
   applied stud equals the selected set for the stud in
   reference/conductors/blocks-stud at the same standard, and every
   per-feature measured value (CHK-NET-03, -04, -10) is equal within 1e-6.
6. Pre-flight: if the baseline itself shows a check misfiring on a stud
   contact (for example CHK-KEY-01, written for flex-cone gaps, returning
   E_PARAM_MISSING on a stud with no coneH), stop this card. The fix is a
   CheckDef appliesTo change with a version bump in its own PR under the
   M04 process, merged before this card, and named in the PR body. This
   card's own diff touches nothing under packages/checks.

Files to create:
- reference/conductors/blocks-stud-applied/chase.ts, build.ts, README.md, expected/ (one golden per standard)
- core/src/commands/arch.apply.ts
- kernel/src/applied-merge.ts
- core/test/arch-apply.test.ts

Acceptance:
- `npx --no-install hbf arch.apply --part body --face '{"origin":[0,0,9.6],"normal":[0,0,1],"u":[1,0,0]}' --id blocks-stud --params standard=boss-v1 --json`
  exits 0, lists emitted kinds conductor, contact, port, and leaves one
  entry in `chase.applied` on branch `hbf/blocks-stud-applied`, with
  `slotsAdded` naming the cTPU and cPLA slots the PETG prism lacked.
- `npx --no-install hbf part.build reference/conductors/blocks-stud-applied --json`
  on that branch exits 0 and the Part IR holds the stud bodies and the
  `blocks-stud.0.` prefixed features, which proves the merge ran.
- The same call with `--id blocks-stud` and no standard exits 2 with a
  typed question listing `boss-v1` and `blocks-html`.
- `npx --no-install hbf check.run reference/conductors/blocks-stud-applied --json`
  exits 0 or 1 by verdict (never 2 or 70), and every result carries
  measured, legal, constraint and origin (D-064).
- `npm test -w core -- arch-apply` exits 0: selected check ids and
  versions equal the baseline for both standards; per-feature measured
  values equal within 1e-6.
- `git diff --stat <M05 exit tag>..HEAD -- packages/checks/src` in this
  card's PR is empty.
- `grep -rln "blocks-stud" packages/checks/src` returns nothing: no check
  is keyed on an archetype id.

Done when: a stud placed by command on a part that never knew BLOCKS gets
the same checks, by the same code, as the stud BLOCKS built.

Build notes, 2026-10-09 (written back by the M06-T12 build):

- blocks-stud is a candidate at this tree, so arch.apply refuses it with
  E_REF naming its status and reason; the command and the merge are proven
  on the proven flex-cone-key first (`core/test/arch-apply.test.ts`,
  fixtures `core/test/fixtures/arch-apply/`): arch.apply on `host` returns
  exactly the entry, slots and kernels `applied` declares, and the merged
  build of `applied` equals the Author.arch build of `authored` body for
  body, with the same checks at the same versions and the same measured
  values. The BLOCKS lines switch on when the archetype lane promotes
  blocks-stud; the test asserts the refusal until then.
- reference/conductors/blocks-stud-applied (the fresh prism, face
  body.top) is written and at parity, build bc59d3..77; its edit /H 9.6 to
  9.61 flips CHK-PRT-05 warn to pass (computed).
- The merge lives in `core/src/applied-merge.ts`, beside the shared face
  resolver, and runs in part.build before stage 1; `kernel/` is an empty
  published shell, so `kernel/src/applied-merge.ts` was not written.
  Author.applied now returns the chase's entries for the part, and
  Author.arch resolves faces through `core/src/face-frame.ts` (the author
  ring test passes).
- Defect, not written: arch.apply writes nothing. The branch writer is
  chase.patch (M10, D-115) and this repository has no commit to branch
  from. The result carries `branch`, `written: false` and `notWritten`;
  the acceptance line that leaves an entry on `hbf/blocks-stud-applied` is
  not met.
- Card defects: the acceptance line names no chase (arch.apply takes it as
  the target); it passes a FaceFrame where spec takes a FaceRef (the port
  turns a frame on a declared face into a FaceRef, E_REF otherwise); an
  applied conductor needs the circuit kernel in meta.kernels, so the result
  gains `kernelsAdded`.
- A param with no default (D-087's standard) returns E_PARAM_MISSING with
  the schema's options as the typed question.
- CHK-KEY-01 2.0.0 to 2.1.0 (minor, the step 6 fix, in this change rather
  than its own PR): a contact that declares neither gap nor coneH skips
  with the reason; one that declares only one of them stays
  E_PARAM_MISSING (`packages/checks/test/key01-applies.test.ts`). The bump
  moves registryHash for every reference; the re-accept is left to the
  integration pass.
- Mutants: merge index from 1, slot numbering by 2, and the CHK-KEY-01
  condition widened to either field missing each fail their tests.

Build notes, 2026-10-10 (M06 promotion unblock):

- blocks-stud is proven, so the BLOCKS lines run: arch.apply on the fresh
  prism at boss-v1 and at blocks-html exits 0 and returns the entry, the
  cPLA and cTPU slots and the circuit kernel the fixtures
  `core/test/fixtures/arch-apply/stud-<standard>` declare; each merged build
  equals the Author.arch build body for body with the same checks at the
  same versions and values; at blocks-html the checks on the stud's
  features (CHK-NET-04, -05, -13, CHK-KEY-02) equal the baseline
  reference/conductors/blocks-stud in version, verdict and measured value
  within 1e-6 (`npm test -w core -- arch-apply`). No standard: the typed
  question naming both presets. Still not met: the write to branch
  hbf/blocks-stud-applied (chase.patch, M10, D-115).

## M06-T14 Originals canon additions: every proven design and mechanism registered

Order: this card runs after M06-T12 and before M06-T13, whose exit checks
include it. It is numbered after M06-T13 so the references other plan
files make to M06-T13 stay valid.

Goal: every mechanism, construction and printed circuit the owner's
originals prove is a registry entry with its original file and function as
source, its numbers recorded from that original, and a named reference and
promotion card, so none of them is lost and a builder makes each new thing
the way the original made it (D-222).

Inputs:
- `knowledge/designs/MECHANISMS.md` (one row per mechanism: designs that contain it, the canonical original file and function, canon and reference status) and `knowledge/designs/INDEX.md` (79 designs, tiers gold, bar, lineage, evidence; counted in that file 2026-10-05)
- the record of each source design, `knowledge/designs/<slug>.md`, sections "Mechanisms, circuits and constructions" and "How to make a new thing this way"
- fab-knowledge:originals/<slug>/files/ and SHA256SUMS (paths in the table below are relative to fab-knowledge:originals/)
- fab-knowledge:originals/LINEAGE-ADD.json (202 lineage rows, sha256 computed from the files on 2026-10-05)
- packages/mechanisms and packages/archetypes (M06-T01 to M06-T10), the status values and the originals rule at the top of this file
- ../CANONS.md (the entry tables of record; where CANONS.md and this card disagree on an id or family, CANONS.md wins and the PR lists the difference)

Steps:
1. Append the LINEAGE-ADD.json rows to lineage.json before any def in
   this card is written (D-156). The schema test (`tools/lineage.schema.json`)
   holds: one canonical row per subject, every sha256 recomputed from the
   file on disk. The four orca3mf.js byte variants stay `copy` rows until a
   diff names which carries which guard fix; that diff goes in the PR.
2. Register every row of the table below in the named registry with status
   from the status column, family, params with units and ranges where the
   original declares them, and `provenance.original {slug, file, fn, lines,
   sha256}`. An `(update)` row edits the existing entry rather than adding
   one. Ids follow CANONS.md; working ids are listed in the PR for the
   owner (D-015).
3. For each row whose original runs headless or through its drive script
   (`orig/<slug>/drive/`, present for 15 designs, counted 2026-10-05) or a
   BenchHook adapter, record `packages/<registry>/test/legacy/<id>.json`:
   every number the named function computes at the original's defaults,
   with the command that produced it. A row whose original cannot run
   records the reason; no number is copied from a record's prose without
   its line and the qualifier the record gives it.
4. A candidate here is refused by mech.derive and arch.apply with E_REF
   naming its original and its promotion card. Promotion is the originals
   rule run on the reference the "reference" column names, in the card the
   last column names; promotion never happens by editing status alone.
5. Notes carried into the defs, each as a test or a provenance line:
   SASH's 3 percent strain ceiling against D-073's 2.5 percent (profile
   governs, SASH kept as a legacy preset, listed under gaps); the TOGGLE
   stem stress (54.8 MPa, computed at TOGGLE defaults) gets a check the
   original lacks; SKETCH `fingerCells` (2n-1 cells) against finger-joint
   L/(2n+1), both recorded; BLOCKS TOUCH sourced from BOSS, where it works;
   the BLOCKS deck topo and mode key mismatch fixed in the port with a
   lineage fix line; the COLLAR and SASH pause layer conventions recorded
   side by side for kinds/sealed-pocket.
6. Rows from lineage-tier originals (OGEE, TAPPET, AUGER) are registered so
   the technique is kept; the AUGER rows and BOBBIN's castellated edge are
   not for port until their source is complete, and say so.

| id | family | registry | original (file and function) | reference | M06 status | promoted by |
|---|---|---|---|---|---|---|
| `knuckle-hinge-continuous-rod` | joint (hinge) | mechanisms | knuckle/files/src/part4.js `buildHinge` lines 189 to 219, derive lines 11 to 103; variants gudgeon `K.knuckle` (03_part2b_kernel.js line 153), locket build.py `knuck`, coaming `buildFold` | joints/knuckle-hinge | candidate | M10-T15 |
| `hinge-fold-sweep` | constraint | mechanisms | knuckle/files/src/part4.js `sweepCheck` lines 221 to 234; gudgeon 07_part2f_build.js `sweepCheck` from line 121 | joints/knuckle-hinge | candidate | M10-T15 |
| `barrel-hinge-d-pin` | joint | mechanisms | slate/files/slate-r6.html `ST.hinge`, `knuckleHalves`, `tearUp` | joints/barrel-hinge | candidate | M11-T09 |
| `gooseneck-latch` | snap | mechanisms | slate/files/slate-r6.html `ST.latch` | joints/gooseneck-latch | candidate | M11-T09 |
| `bayonet-ramp-detent` | joint (bayonet) | mechanisms | tenon/files/src/src/part2.js `grooveGeom`, `grooveField`; cask/files/cask_bench.html derive `lock_squeeze`, `sweepArc` | joints/bayonet; cases/cask-cap | candidate | M10-T16; M11-T09 |
| `retainer-bayonet-hard-stop` | joint | mechanisms | pintle/files/src/pintle_parts.py lines 154 to 164, 359 to 370, 449 to 475 | joints/retainer-bayonet | candidate | M11-T09 |
| `thread-break-two-start` | joint (thread) | mechanisms | tenon/files/src/src/part2.js `extThread`, `intThread` | joints/thread-break | candidate | M10-T16 |
| `round-thread-phase-referenced` | joint (thread) | mechanisms | sparger-w/files/source/sparger_r.py `thread` lines 115 to 124 | joints/round-thread | candidate | M11-T09 |
| `dovetail-rail-keyhole` | joint | mechanisms | cotter/files/cotter-src/src/geo.js lines 134 to 144, modules.js lines 36 to 42; pintle_parts.py lines 137 to 150; derrick/files/src/arm_parts.py lines 53 to 73 | joints/dovetail-keyhole | candidate | M11-T09 |
| `peg-hook-rule` | joint (substrate part source) | mechanisms | cotter/files/cotter-src/src/geo.js `GEO.hookRule` lines 99 to 128; tools/hook_fit.py search lines 44 to 71 (7 of 7 INSERTS, computed 2026-10-05) | joints/hang-hook | candidate | M11-T09 |
| `leaf-spring-detent-drum` | memory | mechanisms | cotter/files/cotter-src/src/modules2.js lines 38 to 65 | mechanisms/leaf-spring-drum | candidate | M11-T09 |
| `flexure-finger-spinner` | memory | mechanisms | cotter/files/cotter-src/src/modules2.js lines 67 to 81 | mechanisms/spinner-detent | candidate | M11-T09 |
| `laser-click-tab` | snap | mechanisms | cotter/files/cotter-src/src/modules.js lines 221 to 244 (strain at the barb per the corrected cotter record) | joints/laser-click-tab | candidate | M11-T09 |
| `crush-nub-press-tooth` | kerf | mechanisms | cotter/files/cotter-src/src/modules.js lines 221 to 244; test/laser_fit.mjs (tab +1 kerf, slot -1 kerf) | joints/crush-nub-tooth | candidate | M11-T09 |
| `leaf-detent-pin` | memory | mechanisms | tappet/files/tappet-r3.html `LEAF_L`, `LEAF_T`, `LEAF_W`, `LAND`, `RAMP` (lineage tier) | mechanisms/leaf-detent-pin | candidate | M11-T09 |
| `jacquard-griffe-select` | intermittent | mechanisms | tappet/files/tappet-r3.html `physStep` (lineage tier) | mechanisms/leaf-detent-pin | candidate | M11-T09 |
| `slide-detent-in-plane` | memory | mechanisms | sash/files/src/src/part2.js `composeSlide` lines 571 to 640 (SASH strain ceiling 3 percent against D-073 2.5 percent: the profile limit governs, SASH kept as a legacy preset) | mechanisms/slider-badge | candidate | M11-T09 |
| `keeper-rib-retainer` | snap | mechanisms | sash/files/src/src/part2.js lines 597 to 598, 215 to 218 | mechanisms/slider-badge | candidate | M11-T09 |
| `press-peg-fdm-loss` | fit | mechanisms | sash/files/src/src/part2.js lines 233 to 235, 647 to 653 | mechanisms/slider-badge | candidate | M11-T09 |
| `barbed-snap-tab-groove` | snap | mechanisms | knurl/files/knurl.html lines 650 to 654, 1022 to 1029 | snaps/barbed-tab | candidate | M10-T08 |
| `belly-snap-crush-rib` | snap | mechanisms | pintle/files/src/pintle_parts.py lines 171 to 174, 371 to 376, 479 to 502 | snaps/belly-snap | candidate | M11-T09 |
| `nub-latch` | snap | mechanisms | locket/files/src/build.py `latch_parts` | snaps/nub-latch (proposed) | candidate | M11-T09 |
| `lip-groove-alignment` | snap | mechanisms | locket/files/src/build.py `lip_parts`; pip/files/haft-src/src/model.js bezel lip and groove lines 249 to 265 | snaps/lip-groove (proposed) | candidate | M11-T09 |
| `magnet-pocket` | fit | mechanisms | sash/files/src/src/part2.js `magnetPositions` lines 246 to 254; knuckle part4.js `buildBezel`, `buildFlip` | joints/magnet-pocket | candidate | M10-T15 |
| `panel-insert-pocket` | fit | mechanisms | knuckle/files/src/part4.js `buildFlip` lines 423 to 463, `loopWithChannel` lines 167 to 183 | joints/panel-insert | candidate | M10-T15 |
| `horn-capture-joint` | joint | mechanisms | davit/files/src/lib.py lines 174 to 197; parts_r4.py lines 67 to 78 | joints/horn-capture | candidate | M11-T09 |
| `cup-on-boss-journal` | joint | mechanisms | davit/files/src/parts_r4.py lines 91 to 119 | joints/horn-capture | candidate | M11-T09 |
| `shield-journal-teardrop` | construction | mechanisms | detent/files/revD/detent_parts.py `wcut`, `teardrop`, `gable` lines 223 to 269; davit lib.py lines 49 to 81 | joints/horn-capture | candidate | M11-T09 |
| `gear-sector-gripper` | gears | mechanisms | davit/files/src/parts_r4.py lines 245 to 296 | machines/davit-joint | candidate | M07, else M11-T09 |
| `cradle-grip-mate` | joint | mechanisms | derrick/files/src/arm_parts.py lines 90 to 116; arm_build.py lines 27 to 55 | joints/cradle-mate | candidate | M11-T09 |
| `saddle-yoke` | joint | mechanisms | spool/files/src/spool_parts.py lines 102 to 203; route12.py lines 7 to 52 | joints/saddle-yoke | candidate | M11-T06 |
| `fork-d-hub` | joint | mechanisms | pawl/files/src/parts.py; core.mjs lines 17 to 43 (`mout` frame rule) | joints/fork-d-hub | candidate | M11-T09 |
| `split-clamp` | joint | mechanisms | stanchion/files/src/cad.py lines 115 to 132 | joints/split-clamp | candidate | M11-T09 |
| `horn-pocket-sheet-pivot` | joint | mechanisms | jib/files/jib.svg; jib.html lines 219 to 252 | joints/horn-pocket | candidate | M11-T09 |
| `bowtie-clamshell-pipe-clamp` | joint | mechanisms | jib/files/jib_mount.scad | joints/bowtie-pipe-clamp (proposed) | candidate | M11-T09 |
| `captive-flexure-rivet` | joint | mechanisms | phaselock/files/extracted/phaselock_v1.scad lines 71 to 86, 138 to 155 | joints/captive-flexure | candidate | M11-T09 |
| `rigid-link-singularity-row` | metamaterial | mechanisms | phaselock/files/phaselock_sheet_v1.html lines 51 to 87 | mechanisms/zigzag-metasheet | candidate | M11-T09 |
| `pivot-barb-pin` | joint | mechanisms | ogee16/files/src/source/printed.scad `a_pivot` line 393 | joints/pivot-barb-pin | candidate | M11-T09 |
| `captured-shaft-hub` | joint | mechanisms | ogee16/files/src/source/printed.scad (record section 4.x, captured shaft) | machines/ogee-cell | candidate | M07, else M11-T09 |
| `printed-frame-shrink-joint` | fit | mechanisms | ogee16/files/src/source/printed.scad `fr()`, `PRINT_SHRINK` line 150 | machines/ogee-cell | candidate | M07, else M11-T09 |
| `rocker-summer` | linkage | mechanisms | ogee/files/src/source/ogee.scad (also in ogee-source.zip) `rocker()` line 17 (lineage tier) | mechanisms/rocker-summer (proposed) | candidate | M11-T09 |
| `gravity-ramp-return` | memory | mechanisms | ogee/files/src/source/ogee.scad (also in ogee-source.zip) `pin()` line 106 (lineage tier) | mechanisms/rocker-summer (proposed) | candidate | M11-T09 |
| `peristaltic-three-roller` | fluid | mechanisms | sparger-w/files/source/sparger_w.py `part_cup`, `part_lid`, `part_rotor` lines 139 to 178 | mechanisms/peristaltic-3-roller | candidate | M11-T09 |
| `tilted-plate-through-plate` | kerf | mechanisms | slug/files/slug.scad lines 270 to 279 | sheet/tilted-plate-through | candidate | M11-T09 |
| `tangential-spacer-cage` | kerf | mechanisms | slug/files/slug.scad `rotor_ring`, `rotor_top`, `spacer` | sheet/capsule-rotor-cage | candidate | M11-T09 (covers added to the M06-T06 reference) |
| `egg-crate-half-lap` | kerf | mechanisms | gusset/files/gusset-v16.html `tableModel` lines 546 to 618 | sheet/egg-crate-table | candidate | M11-T09 |
| `stencil-lamination` | kerf | mechanisms | gusset/files/gusset-v16.html `tableModel` and lines 284 to 309 | sheet/egg-crate-table | candidate | M11-T09 |
| `cross-lap-through-tab` | kerf | mechanisms | sketch/files/sketch.html lines 595 to 649 (its `fingerCells` 2n-1 rule is reconciled with finger-joint L/(2n+1) in the derive test, both rules recorded) | joints/finger | candidate | M11-T09 (covers added to the M06-T06 reference) |
| `flex-neck-tilt-pivot` | joint | mechanisms | toggle/files/src/src/part2d.js lines 394 to 414; part2b.js lines 10 to 255 (adds a stem stress check: 54.8 MPa computed at the TOGGLE defaults, against no check today) | sticks/tilt-stick-4 | typed with the TOGGLE preset of tilt-stick (M06-T09) | M06-T09 |
| `swept-complement-cut` | intermittent | mechanisms | knurl/files/knurl.html lines 588 to 600 (lock ring) | mechanisms/geneva-3 | candidate | M10-T08 |
| `stud-rail-anti-stud` | joint | mechanisms | nacelle/files/scad/params.scad `lego_island`; washer_lego_adapter.scad | joints/stud-rail | candidate | M11-T09 |
| `row-cycle-write-schedule` | intermittent | mechanisms | stipple/files/stipple-r17b.html `doClear`, `writeRow`, `canLatch` | joints/balance-beam | candidate | M11-T09 (covers added) |
| `cap-well-lamination` | kerf | mechanisms | stipple/files/stipple-r17b.html `face2`, `FACE2_N`, `R_LATCH` | joints/bridge | candidate | M11-T06 |
| `aileron-differential (update)` | joint | mechanisms | stanchion/files/stanchion.html `solveHorns` lines 293 to 331; src/cad.py lines 217 to 282 | joints/aileron-differential | typed (M06-T03, M06-T05) | M06-T03, M06-T06 |
| `slew-ring-joint (update)` | joint | mechanisms | pintle/files/src/pintle_parts.py lines 328 to 358, 402 to 408 (R6) | joints/slew-ring | typed (M06-T03, M06-T05) | M06-T05, M06-T06 |
| `direct-pin-hex-skin-bridge-key` | archetype printed | archetypes | baffle-r3/files/src/model.js `keyCentres`, `keyArt` from line 297 | keys/skin-bridge-hex | candidate | M11-T09 |
| `skin-bridge-slider` | archetype printed | archetypes | baffle-r3/files/src/model.js `sliderArt` from line 344 | sensors/skin-bridge-slider | candidate | M11-T09 |
| `touch-segment-slider` | archetype printed | archetypes | gib/files/src/src/part2.js `buildTouch` from line 176 | sensors/touch-segment-slider | candidate | M11-T09 |
| `footprint-contract` | constraint | archetypes | gib/files/src/src/part2.js `build` from line 158 | sensors/touch-segment-slider | candidate | M11-T09 |
| `lego-tile-carrier-collet` | archetype printed | archetypes | baffle-r3/files/src/model.js `tile` from line 770 | conductors/lego-tile-carrier | candidate | M11-T09 |
| `board-table-seat` | archetype printed | archetypes | baffle-r3/files/src/model.js `BOARDS` from line 27, `applyBoard` from line 138 | seats/board-table | candidate | M11-T09 |
| `rp2040-zero-seat options` | archetype printed | archetypes | pip/files/haft-src/src/model.js lines 180 to 248; gudgeon/files/extracted/05_part2d_circuit.js lines 9 to 27 | seats/rp2040-zero-pressfit; seats/rp2040-zero-header-cups | press options proven (M06-T09); header cups candidate | M06-T09; M11-T09 |
| `teensy-socket-block` | archetype printed | archetypes | tang-r6/files/src/04_design.js from line 263 | seats/teensy-socket (proposed) | candidate | M11-T09 |
| `peg-socket-press-contact` | archetype printed | archetypes | tang-r6/files/src/03_design.js line 57; 04_design.js line 406; 05_design.js line 242 | conductors/peg-socket (proposed) | candidate | M11-T09 |
| `print-bleed` | construction | archetypes | pip/files/haft-src/src/model.js lines 26 to 29 and the bleed uses of pip record sections 5.1 to 5.5 | conductors/buried-trace-stack | proven as an option of buried-trace-stack, default 0 (M06-T09) | M06-T09 (option; default bleed 0, D-084) |
| `router-negotiated` | copper | archetypes | pip/files/haft-src/src/router.js; toggle/files/src/src/part2c.js and part2d.js lines 121 to 260 | conductors/router | candidate | M10-T13 |
| `net-check-union-find` | check | archetypes | blocks/files/src-extracted/kernel.js lines 366 to 394; pip/files/haft-src/src/model.js lines 268 to 285 | conductors/router | candidate | M10-T13 |
| `band-kernel` | kernel | archetypes | baffle-r3/files/src/model.js `derive`, `makeGeo` from line 163 | keys/skin-bridge-hex | candidate | M11-T09 |
| `read-pullup-e12` | read model | archetypes | toggle/files/src/src/part2b.js lines 258 to 295; part4.js lines 253 to 297 (replaces the declared 470k) | electrical/pullup-e12 | candidate | M11-T09 |
| `read-two-phase-slide` | read model | archetypes | tang-r6/files/src/05_design.js `D.buildNeck`; keyway/files/gen_keyway.py slider pass | sensors/graded-slider | candidate | M11-T09 (covers added) |
| `read-rc-charge-time` | read model | archetypes | tang-r6/files/src/04_design.js line 137 `padTime` | electrical/charge-release | candidate | M11-T09 (covers added) |
| `tilt-stick-8way` | archetype printed | archetypes | toggle/files/examples solo8 preset; src/src/part2b.js lines 224 to 246 | sticks/toggle-solo8 | candidate | M11-T09 |
| `blocks-press-bore-socket` | archetype printed | archetypes | blocks/files/src-extracted/blocks.js lines 144 to 166, 229 to 245 | conductors/blocks-stud | candidate | M10-T10 |
| `blocks-deck` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 430 to 562 (fix the topo and mode key mismatch) | blocks/deck (proposed) | candidate | M10-T10 |
| `blocks-side-tab-flat-flex` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 116 to 145 | blocks/side-tab (proposed) | candidate | M10-T10 |
| `blocks-jumper-bus` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 713 to 745 | blocks/jumper-bus (proposed) | candidate | M10-T10 |
| `blocks-cone-button-array` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 862 to 950; boss/files/boss-src/src/parts.js lines 538 to 576 | buttons/cone-array | candidate | M10-T10 |
| `blocks-knob` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 1044 to 1153 (detent mode has no mechanical detent; recorded) | blocks/knob (proposed) | candidate | M10-T10 |
| `blocks-lamp-series-r` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 1155 to 1188; boss parts.js lines 604 to 628 | blocks/lamp (proposed) | candidate | M10-T10 |
| `blocks-trim-meander` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 1190 to 1214 | blocks/trim (proposed) | candidate | M10-T10 |
| `blocks-force-brick` | archetype printed | archetypes | blocks/files/src-extracted/parts.js lines 827 to 860 | blocks/force (proposed) | candidate | M10-T10 |
| `blocks-touch-brick` | archetype printed | archetypes | boss/files/boss-src/src/parts.js lines 479 to 498 (the BLOCKS rename broke it; BOSS is the source) | blocks/touch (proposed) | candidate | M10-T10 |
| `composer-scene-contact-nets` | system | archetypes | blocks/files/src-extracted/sim.js lines 13 to 64; app2.js lines 42 to 96 | blocks/scene (proposed) | candidate | M10-T10 |
| `dc-mna-solver` | system | archetypes | blocks/files/src-extracted/sim.js lines 66 to 157 (add rotary and pass branches) | blocks/scene (proposed) | candidate | M10-T10 |
| `undefined-band-verdict` | check | archetypes | boss/files/boss-src/src/app2.js line 236 with test_sim2.js; blocks app2.js line 383 | electrical/blocks-pullup-band | candidate | M10-T10 (covers added to the M05 reference) |
| `firmware-scan-guard` | firmware | archetypes | pip/files/pip-controller/firmware/pip/pip.ino lines 63 to 81; haft-src/bench/part2.js `firmware()` lines 206 to 339 | firmware/pip-scan | candidate | M10-T13 |
| `bringup-probe` | tool | archetypes | pip/files/pip-controller/firmware/pip_probe/pip_probe.ino | firmware/pip-probe (proposed) | candidate | M10-T13 |
| `electrical-coupon` | coupon | archetypes | pip/files/haft-src/src/coupon.js lines 45 to 246 (fix the bleed omission and the settle rule) | coupons/pip-electrical | candidate | M10-T13 |
| `fits-table` | check | archetypes | pip/files/haft-src/src/model.js lines 510 to 611; ogee16 fits.py; knurl `K.checks` lines 1206 to 1221 | coupons/fit-gauge | candidate | M11-T09 (covers added) |
| `layout-solver-groups` | design rule | archetypes | pip/files/haft-src/src/layout.js `layout()` lines 163 to 451 | layouts/pip-groups (proposed) | candidate | M10-T13 |
| `clamshell-notched-walls` | case | mechanisms | gudgeon/files/extracted/07_part2f_build.js lines 46 to 66 | cases/gudgeon-clamshell | candidate | M11-T09 |
| `screen-bay-round` | case | mechanisms | gudgeon/files/extracted/07_part2f_build.js; 04_part2c_state.js `geom()` | cases/gudgeon-clamshell | candidate | M11-T09 |
| `tray-planar-walls` | case | mechanisms | knuckle/files/src/part4.js `buildTray` lines 237 to 316; coaming `trayBox` | cases/flip | candidate | M10-T15 |
| `bezel-stepped-chamfer` | case | mechanisms | knuckle/files/src/part4.js `buildBezel` lines 319 to 420; pip model.js `chamferTop` lines 624 to 635 | cases/flip | candidate | M10-T15 |
| `sdf-outline-case` | case | mechanisms | cresset/files/cresset.html `planCase`, `autoFit` | cases/cresset | candidate | M11-T09 |
| `analytic-span-shell` | case | mechanisms | plinth/files/plinth.html `planCase`, `fixDiag`, `fixZDiag` | cases/plinth-spans | candidate | M11-T09 |
| `hatch-detent` | snap | mechanisms | plinth/files/plinth.html `DEF.door` | cases/plinth-spans | candidate | M11-T09 |
| `registration-collar-breakaway` | case | mechanisms | cask/files/cask_bench.html `buildRibs` | cases/cask-cap | candidate | M11-T09 |
| `fit-report-bvh` | check | archetypes | cask/files/cask_bench.html `fitReport`, `meshContacts` | cases/cask-cap | candidate | M11-T09 |
| `plug-sleeve-cap` | case | mechanisms | scabbard/files/scabbard.html `buildParts`, `capClear` | cases/scabbard-shell | candidate | M11-T09 |
| `inlay-art-zone` | kind (inlay) | mechanisms | collar/files/collar.html `renderLayer` lines 990 to 1117, `buildFace` lines 1126 to 1198 | cosmetic/coin-inlay | candidate | M03-T08 (re-recorded from the original at M11-T09) |
| `sealed-pocket-pause` | kind | mechanisms | collar/files/collar.html lines 746 to 751, 1208; sash part2.js line 854 (pause convention mismatch recorded) | kinds/sealed-pocket | candidate | M11-T06 |
| `edge-profile-registry` | cosmetic | mechanisms | collar/files/collar.html `EDGES` lines 761 to 872 | cosmetic/edge-profiles | candidate | M11-T06 |
| `rim-band-edge-spots` | cosmetic | mechanisms | collar/files/collar.html `labelSlab` lines 1221 to 1258 | cosmetic/casino-chip | candidate | M11-T09 |
| `two-piece-mark-inlay` | cosmetic | mechanisms | cotter/files/cotter-src/src/modules.js `applyArt` lines 24 to 35 | cosmetic/flush-inlay-two-piece-mark | candidate | M11-T09 |
| `elephant-foot-relief` | construction | mechanisms | knurl/files/knurl.html lines 981, 1014 to 1015, 1032 to 1036, 1057 to 1058 | fits/first-layer-relief | candidate | M10-T08 |
| `copper-clip-field` | copper | archetypes | keyway/files/gen_keyway.py; quadrant gen_quadrant.py rail | copper/keyway | candidate | M05-T14 (covers added at M11-T09) |
| `copper-cut-sheet-stack` | copper | archetypes | keyway/files/gen_keyway.py material stack | copper/keyway | candidate | M05-T14 (covers added at M11-T09) |
| `copper-com-bus-knockout` | copper | archetypes | keyway/files/gen_keyway.py COM bus | copper/keyway | candidate | M05-T14 (covers added at M11-T09) |
| `lane-solvers` | copper | archetypes | tessera/files/gen_tessera.py; quadrant gen_quadrant.py; vernier gen_vernier.py; fret gen_fret.py | surfaces/tessera-voronoi | candidate | M11-T09 |
| `interval-gate` | check | archetypes | fret/files/gen_fret.py | surfaces/fret-hex | candidate | M11-T09 (covers added) |
| `tape-width-gate` | check | archetypes | stave/files/gen_stave.py | surfaces/stave-strip | candidate | M11-T09 |
| `dielectric-faceplate` | copper | archetypes | vernier/files/gen_vernier.py `face_win` | surfaces/vernier-pad | candidate | M11-T09 |
| `switch-as-bridge` | copper | archetypes | shim/files/gen_board.py | boards/shim-card | candidate | M08, else M11-T09 |
| `board-face-convention` | check | archetypes | shunt/files/sim.html viewer; gen_fab.py, check_fab.py | boards/shunt-art | candidate | M08, else M11-T09 |
| `mask-art-pour-backed` | board | archetypes | tack/files/rev-a/pin.py (also in tack-rev-a.zip) lines 268 to 295 | boards/tack-pin | candidate | M08 |
| `armed-indicator` | board | archetypes | trunnion/files/trunnion.kicad_pcb; splice/files/splice-c/splicec-3d.html | boards/trunnion | candidate | M08 |
| `copper-ladder-route` | copper | archetypes | splice/files/splice-c/splicec-3d.html `geo`; rev C copper SVG | copper/splice-c | candidate | M11-T09 |
| `qfn-corner-clear-footprint` | board | archetypes | lug/files/lug.tsx `QfnFp` from line 33 | boards/lug-pi-hat | candidate | M08 |
| `1s-power-path-boost` | board | archetypes | lug/files/lug.tsx line 149; grommet/files/grommet.tsx | boards/lug-pi-hat | candidate | M08 |
| `auger-front-ends` | board | archetypes | auger/files/src/footprints.tsx, auger.board.tsx (unrouted board, lineage tier) | none: listed, candidate until AUGER is routed | candidate, not for port yet | not before AUGER is routed |
| `board-to-enclosure` | case | mechanisms | auger/files/case/auger-geom.scad and `GEO` (lineage tier) | none: listed, candidate until AUGER is routed | candidate, not for port yet | not before AUGER is routed |
| `castellated-module-edge` | board | archetypes | bobbin/files/bobbin-rev-b.html `pcbdata` (source tsx missing) | none: listed, candidate until the source is found | candidate, not for port yet | owner supplies the tsx |
| `c3-supermini-carrier-copper` | copper | archetypes | coffer/files/gen_coffer.py `tile_M1` lines 210 to 290; spindle/files/gen_board.py | seats/c3-supermini; copper/spindle-v5 | candidate | M08 |
| `eurorack-rail-case` | sheet | mechanisms | eurorack-skiff/files/eurorack-skiff-r7.html `genRail`, `genCheek` | sheet/eurorack-skiff | candidate | M11-T09 |
| `vinyl-substrate-module` | copper | archetypes | kerf-eurorack/files/kerf-eurorack.html (DRC must catch collinear overlaps) | copper/kerf-eurorack (proposed) | candidate | M11-T09 |
| `process-by-role` | profile | none (profile) | mechdisplay/files/3mf-settings-extracted-20261005.json | none: profile seed rows by role (PROFILE.md), evidence tier | not a canon entry | listed in the originals index only |
| `cascade-slop-budget` | constraint | mechanisms | tumbler/files/tumbler.html `evalBench` | mechanisms/coincidence-and | candidate | M11-T09 (covers added to the M06-T06 reference) |
| `two-mirror-scanner` | machine | mechanisms | detent/files/revD/detent_parts.py lines 93 to 179; beam/detent_firmware.ino | machines/two-mirror-scanner | candidate | M07, else M11-T09 |
| `pan-tilt-servo-head` | machine | mechanisms | washer/files/rig/laser-rig.html lines 2519 to 2708; rig/servo_base_lego.scad | machines/pan-tilt-head | candidate | M07, else M11-T09 |
| `device-drive-safety` | device | mechanisms | sprocket/files/sprocket_fw/sprocket_fw.ino lines 51 to 115, 330 to 378 | devices/sprocket-drive | candidate | M11-T09 |
| `typed-mount-interface` | interface | mechanisms | spool/files/src/spool_parts.py line 46, 75 to 84; derrick arm_build.py; stanchion cad.py lines 93 to 110 | joints/saddle-yoke | candidate | M11-T06 (covers added) |

Files to create:
- packages/mechanisms/src/defs/originals/*.ts and packages/archetypes/src/defs/originals/*.ts (one per row, by registry)
- packages/mechanisms/test/legacy/<id>.json and packages/archetypes/test/legacy/<id>.json (step 3)
- packages/mechanisms/test/originals-additions.test.ts, packages/archetypes/test/originals-additions.test.ts
- lineage.json (appended rows)

Acceptance:
- `npm test -w packages/mechanisms -- originals-additions` and `npm test -w packages/archetypes -- originals-additions` exit 0: every table row resolves by id in its registry; every `provenance.original.file` exists under the originals root and its sha256 equals the lineage.json canonical row; every recorded legacy file names the command that produced it.
- `node --test tools/test/lineage.test.mjs` (M-1-T09) exits 0 with the appended rows: one canonical row per subject, every sha256 matching its source.
- `npx --no-install hbf mech.find detent --json` lists `leaf-spring-detent-drum`, `flexure-finger-spinner`, `slide-detent-in-plane` and `leaf-detent-pin` with status candidate, each with its original path, after the typed `count-wheel-detent`.
- `npx --no-install hbf arch.find --behaviour slide --json` lists `skin-bridge-slider` and `touch-segment-slider` as candidates with their originals.
- `grep -rn "fab-knowledge/mockups" packages/mechanisms packages/archetypes lineage.json` prints nothing.
- `node tools/lint-voice.mjs packages/mechanisms packages/archetypes` exits 0.

Done when: every proven design and mechanism in the originals is findable
by command with the file and function it was made by, and its promotion
card is named.

Build notes, 2026-10-09 (written back by the M06-T14 build):

- 128 rows registered, all candidate: 75 mechanisms and 53 archetypes, one
  def each under `src/defs/originals/`. Families widened additively: the
  mechanism list gained case, constraint, construction, cosmetic, device,
  fit, interface, kind, machine, metamaterial, sheet; the archetype union
  gained check, constraint, construction, coupon, design-rule, firmware,
  kernel, read-model, system, tool.
- flex-neck-tilt-pivot and print-bleed are candidate, where the table says
  typed and proven; rp2040-zero-seat keeps the registry's status; the
  aileron-differential and slew-ring-joint (update) rows were already
  carried; process-by-role is not a canon entry.
- lineage.json held 200 of the 202 LINEAGE-ADD rows; the other two conflict
  by design (davit.collide already has a canonical row; the healer copy has
  no dest). auger.case/rev-b was added so board-to-enclosure pins its
  original. Six files the table names have no lineage row (jib.svg,
  washer_lego_adapter.scad, test_sim2.js, the shunt sim.html,
  servo_base_lego.scad, ogee.scad; ogee-source.zip stands for the last).
- Legacy numbers recorded for two rows, barbed-snap-tab-groove and
  swept-complement-cut, from KNURL's drive (`layout.cjs`); every other row
  says no number is recorded and why.
- `node --test tools/test/lineage.test.mjs`: 17 pass, 2 fail, the two that
  failed before this card.

## M06-T13 Exit housekeeping

Goal: M06 closes green under the Part 3 rules of MILESTONES.md.

Inputs:
- ../MILESTONES.md Part 3
- tools/counts.mjs, tools/tiers.json, tools/lint-voice.mjs

Steps:
1. Run the full CI set: house-rules, typecheck, derived, tiers, seed,
   unit, property, contract, parity, determinism, corpus.
2. Determinism: every reference written in M06 builds on ubuntu x64 and
   arm64 with equal mesh hashes and equal derive() JSON bytes (D-056).
3. Re-date the D-040 pin table; M06 adds no dependency, so the re-date is
   a check of the pins in force.
4. Regenerate counts, CLI.md, llms.txt and the reference INDEX (D-010);
   the surface test pins the cumulative command count.
5. Visual review (D-154): before and after renders of every new reference
   with a meshHash (TUMBLER sheets, KNURL parts, the four PIP buttons, the
   applied stud) at desktop and 390 px, each placed beside the original's
   shot of the same part from `orig/<slug>/shots/` (the INDEX.md best shot
   or the record's shot list); a person ticks "I looked at the renders and
   the port matches the original's shot". A render that reads worse than
   the original (flat where the original is lit 3D, missing a body the
   shot shows, a different construction) is a defect in the port.
6. PR body lists: working names (hbf, CHASE, STYLUS, archetypes, the new
   archetype ids from M06-T01 step 4) per D-012; owner questions touched
   with defaults in force (D-080, D-087, D-088, D-151); the gaps below;
   every acceptance line that was not run.

Files to create:
- none; results go in the PR body against the Exit table

Acceptance:
- Every CI job green on the PR.
- `node tools/lint-voice.mjs` exits 0.
- `node tools/counts.mjs && git status --porcelain` prints nothing.

Done when: the owner can ask for the M06 merge with every exit row below
proven by a green job.

Build notes, 2026-10-09 (M06-T13, partial):

- Counts regenerated (`node tools/counts.mjs`, which reads the git index,
  so a status change counts only once staged). Not run: the full CI set,
  the arm64 determinism leg, the D-040 re-date, CLI.md, llms.txt and the
  reference INDEX (no generator for the last three exists in the repo),
  the visual review (a person), and the final re-accept of every
  reference, left to the integration pass because CHK-KEY-01 2.1.0 and the
  other lanes' checks move registryHash.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| 24 seeded mechanisms registered; the split printed equals counts.json `canon.mechanisms` and every entry not typed names its promotion card (D-252, refining D-203; the forecast 24 typed, 0 stub is retired) | computed by `node tools/counts.mjs` | M06-T03 | `npm test -w packages/mechanisms -- derive` |
| TUMBLER 18 modules: 162 cases, 567 parts, 24 plan warnings (HDPE living hinge), 0 logic mismatches; 63 parts and 0 warnings at defaults | computed | M06-T02 | `npm test -w packages/mechanisms -- tumbler.parity` |
| detent clr 0.4: 0.74 N (0.73728) at 0.48 percent, k 0.9216 N/mm; clr 0.15 kept as jam record 0.97 N at 0.63 percent | computed | M06-T04 | `npm test -w packages/mechanisms -- knurl.parity` |
| Geneva dwell 5/6, index 1/6 at n 3; alpha 60 deg; theta 53.8941 deg at phi 15 | computed | M06-T04 | same |
| KNURL Geneva and detent reproduce the legacy layout to 1e-6 | computed | M06-T04 | `npx --no-install hbf parity reference/mechanisms/geneva-3`, `.../detent-strip` |
| D-096 additions registered with goldens (snap 2.152 percent, 501.3 gf for 234 N mm, 76/19 = 4, SW 48.590 deg) | computed | M06-T05 | `npm test -w packages/mechanisms -- additions` |
| every typed mechanism has a green reference | n/a | M06-T06 | `npx --no-install hbf parity reference/...` per row |
| 29 seeded archetypes resolve; the split printed equals counts.json `canon.archetypes` and every entry not proven names its promotion card (D-252, refining D-203; the forecast proven 26 over 34 ids is retired); tier on every entry | computed by `node tools/counts.mjs` | M06-T07 | `npm test -w packages/archetypes -- status` |
| resistances at load: rotary-pot arc 14,181 / 709,040 / 236,347 / 189,077 ohm by row; tier propagates | computed from vendor and inferred rows | M06-T07 | `npm test -w packages/archetypes -- resistance` |
| four PIP buttons: clicky 2.527 N at 0.629 mm, drop 76.5 percent, contact 1.369 mm, eStop 2.31 percent; fits rows flex 6, click 11, touch 3, stick 13 equal legacy | computed | M06-T08 | `npm test -w packages/archetypes -- pip-buttons.parity` |
| every proven archetype has a green reference; gaps listed | n/a | M06-T09 | `npm test -w packages/archetypes -- gaps` |
| 22 THINPOT candidates; encoder B at step/4 | n/a | M06-T10 | `npm test -w packages/archetypes -- feeler` |
| mech.find, mech.derive, arch.find answer with CommandResult and typed errors | n/a | M06-T11 | `npm test -w core -- canon-commands` |
| arch.apply places a BLOCKS stud on a fresh prism; selected checks and versions equal the BLOCKS baseline; no check code changed | n/a | M06-T12 | `npm test -w core -- arch-apply` |
| every typed mechanism and proven archetype regenerates its original's numbers (printed precision) and geometry (volume 1e-3 mm3, bbox and outline 1e-6 mm), sources pinned by sha256 | computed | M06-T06, M06-T09 | `npm test -w packages/mechanisms -- originals`; `npm test -w packages/archetypes -- originals` |
| aileron-differential typed from `solveHorns`: tilt 10, roll 10 gives horns 46.1 and 0.6 deg | computed | M06-T03 | `npx --no-install hbf mech.derive aileron-differential --params '{"tilt":10,"roll":10}' --json` |
| every originals canon addition registered with its original file, function and sha256, legacy numbers recorded, promotion card named | n/a | M06-T14 | `npm test -w packages/mechanisms -- originals-additions`; `npm test -w packages/archetypes -- originals-additions` |
| no file in the canon packages or their references cites the quarantined mockups | n/a | M06-T06, M06-T14 | `grep -rn "fab-knowledge/mockups" packages/mechanisms packages/archetypes reference` prints nothing |
| CI green incl. house-rules, derived, tiers, determinism | n/a | M06-T13 | CI |

## Blockers and owner questions

| item | state | default in force |
|---|---|---|
| BLOCKS canonical standard | D-087 owner | none until a print; blocks-stud ships `boss-v1` and `blocks-html` presets, apply asks |
| SuperMini dual-supply jumper | D-088 owner | normally open (SPINDLE) |
| pip.ino KEY_WAIT_US 200 | D-080 owner | hackbuild-fab does not edit pip-controller; archetypes emit 3500 us with provenance |
| TANG R5 and R6 sources | recovered 2026-10-04 | four archetypes leave stub status |
| STIPPLE sources | recovered 2026-10-04 (R17, R17b) | pin-free-balance-beam is typed |
| snap strain thresholds | D-096 (PLINTH 2.6 and 3.4) and D-073 (2.5 in-plane, 1.5 across) disagree for PETG | profile limit by bend direction governs; PLINTH thresholds kept as a legacy preset; listed under gaps |
| status values stub, candidate, unproven and the admission rule | D-097 names stubs only | as defined at the top of this file; listed under gaps |
| new archetype ids for the splits and additions | working ids | listed in the PR for the owner with D-015 |
| teen and class kits | D-151 owner | after M06 |
| cTPU reads lower than cPLA at the working rows | inferred rows (D-081) | finding recorded; waits on the Yousu coupon (D-082) |
| SASH slide strain ceiling 3 percent | D-073 says 2.5 percent in the layer plane | profile limit governs; SASH kept as a legacy preset (M06-T14) |
| four orca3mf.js byte variants | which carries which guard fix is not yet diffed | inlay skill asset canonical as the plan seed; the diff goes in the M06-T14 PR |
| tilt-stick TOGGLE preset: the slicer prints 1.25 mm2 of the TPU stem as a PETG internal bridge at one layer, on the port and on the owner's own solo4 save alike | owner (evidence m06-unblock/vprint-sticks-tilt-stick-4, vprint-toggle-solo4-original) | tilt-stick stays candidate; the PIP preset reference prints clean |
| TPU flip bowls and domes past the 45 deg overhang limit (CHK-PRT-13): dome-button 74.377 deg over 133.07 mm2, ladder-keypad 62.664 deg over 359.44 mm2 in the original's print pose; the original's in-place sample 48.885 deg over 643.17 mm2; the owner printed the bowl | owner (evidence m06-unblock/dome) | profile overhang.maxDeg 45 (inferred) and the check row stand; both stay candidate |
| an original that cannot run headless | the originals rule needs its numbers recorded by running it | the entry stays candidate with reason "original not runnable"; no number taken from prose |

## Hands off to

M07 promotes `crank-yoke` and `integer-metering-ratio` with the OGEE and
SLUG motion programs and builds `machines/ogee-cell` and
`machines/slug-drive`. M08 promotes the board-family candidates with the
two board backends and writes their references. M10 renders KNURL,
STYLUS, BLOCKS and PIP from chase plus build.ts on these registries, and
STYLUS promotes THINPOT candidates; M10 also promotes the M06-T14 rows
whose design it ports (KNURL, BLOCKS, PIP, KNUCKLE, TENON). M11 turns the
gap tables into the coverage test and writes the originals index
references for every M06-T14 row whose promotion card is M11-T06 or
M11-T09, each under the originals rule. M12 projects mech.find and arch.find as `canon_search`,
mech.derive as `mech_derive` and arch.apply as `arch_apply`. M15 puts a
mouse gesture on the same arch.apply command.

Decides: D-007, D-010, D-014, D-044, D-045, D-049, D-058, D-059, D-064, D-071, D-073, D-076, D-077, D-078, D-079, D-080, D-081, D-084, D-085, D-087, D-088, D-095, D-096, D-097, D-098, D-105, D-106, D-114, D-115, D-132, D-149, D-151, D-156, D-164, D-165, D-177, D-180, D-202, D-203, D-222
