# @hackbuild/spec

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

The typed contracts every package in hackbuild-fab types against: Part IR,
feature kinds, checks, constraints, profile, circuit, catalog, canons, sim,
registries, CHASE (working name), the bench hook, the hbf (working name)
command surface, errors and capabilities. Private workspace package, MIT,
zero dependencies (D-046). This folder is the source (D-162).

## Check it

```
npx tsc -p spec/tsconfig.json     # exit 0
npx vitest run spec/test          # every test passes
```

Both ran clean on 2026-10-13 (measured; TypeScript 7.0.2, vitest 5.0.3,
Node 22.18.0, the floor in `.nvmrc`). The tsconfig compiles every top-level file plus
`fixtures/`; `test/` is excluded because spec declares `types: []` and the
test imports vitest from the repo root.

`fixtures/negative.ts` holds `@ts-expect-error` lines, each one needed:
removing any of them makes tsc fail with the intended error (empty checks,
missing reference, a ParamsOf typo, a dotted MCP tool name, a CheckResult
without origin, an absolute face in chase.applied, a `checks` selector on
Chase, a waiver without a reason, a kind used before its admitting
milestone in k.part, the defineChase preset, duplicate field, enum
default and showWhen checks including a leaf nested in `all` and `any`, an
instance field a type lacks, a `plot.<id>` panel with no plot, and a
welcome start naming no preset). `fixtures/gold.ts` compiles one of every
gold standard shape (`fab-knowledge:synthesis/gold-standard.md` section 12, in the owner's
unpublished archive). `fixtures/surface.ts` asserts at compile time
the CommandName and McpToolName member counts, with no duplicates, and
that every command is covered by exactly one MCP tool or is CLI-only. `fixtures/nest-motion.ts` compiles the nest and motion types through
the index, with `@ts-expect-error` lines on quarter turns, stock, gap,
mode, packer, op tags, planner id and binding.

## Status

Every file here is draft (D-179). A draft part may change in any PR that
keeps the typecheck at exit 0 and updates its fixtures. A part freezes at
the exit of the milestone that first runs it in package code: the walking
skeleton M-S runs keys flex-pair to a print and freezes its parts at exit
B; the other files wait for M01, M05, M06, M08, M09 or M13. MILESTONES.md
section 1.5 lists each file, its first milestone and the parts that
freeze; the first comment of each file states the same. A frozen part
changes only through a new DECISIONS.md entry.

Plan documents name a type here and link this file; they do not copy the
body (MILESTONES.md 3.7). From M-S, `tools/lint-plan-types.mjs` lists the
copies.

Status per file, from MILESTONES.md 1.5 (card M-S-T01). The first doc
comment of each file states the same status.

| file | status | first run | frozen at that exit | stays draft until |
|---|---|---|---|---|
| `ids.ts` | draft | M-S | whole file | |
| `schema.ts` | draft | M-S | whole file | |
| `part-ir.ts` | draft | M-S | Part, Body, BodyRole, FrameDecl, MeshRef, Metric, BuildWarning, Assertion (apart, volumeParity) | Pose, StackDecl, Assembly, Instance, Connection, JointDecl, BoughtBody M02; Sheet M07 |
| `features.ts` | draft | M-S | FeatureBase and the pocket, conductor, contact and port shapes | each other kind at its admitting milestone in `FEATURE_KIND_ADMISSION` |
| `feature-kinds.ts` | draft | M-S | FeatureKindDef, GeneratedGeometry, KernelCtx | FeatureKindRegistryAt M03 |
| `build.ts` | draft | M-S | ShapeDecl (prism, revolve; D-223), BodyDraft, PartDraft, BUILD_STAGES, the Author calls the reference uses | BUILD_SANDBOX and imports M00; other routes M00; AssemblyDraft M02; Author.mech and applied merge M06 |
| `checks.ts` | draft | M-S | CheckDef, CheckResult, LegalValues, Fix, CheckOrigin; targets part, feature, net, artifact | other CheckTarget levels, waivers M04 |
| `profile.ts` | draft | M-S | Provenance, Material, ResistivityRow, Machine, MachinePreset, FitBand, LossRow, ProfileLookup | StrainLimit M01; BleedRow, Constant M00 |
| `circuit.ts` | draft | M-S | McuPinSpec, PinState, ReadModel (charge-release), Net, ReadOutputs, OperatingPoint | other read models, ContactElement, ReadResidual M05 |
| `registry.ts` | draft | M-S | BuildInputs, ExporterDef | RegistryEntry, DefFor, Manifest and the other defs M04 |
| `chase.ts` | draft | M-S | defineChase, defineBuild, ParamsOf, ParamField, MaterialSlot, Preset, ExportDecl, HookupDecl | CHASE_SOURCE_RULES M00; the rest M10 |
| `commands.ts` | draft | M-S | CommandResult, CommandDef, Artifact for part.build, check.run, export.run | CommandName and McpToolName unions M12 (D-107) |
| `errors.ts` | draft | M-S | ErrorCode, CommandError, EXIT_CODES | transport mapping M12 |
| `constraints.ts` | draft | M01 | | |
| `sim.ts` | draft | M01 | SnapCurve | SimHandle, SweepResult, TrialResult M02 |
| `catalog.ts` | draft | M05 | PinDef and the per-MCU rows | PartRow, ActuatorRow M08 |
| `canon.ts` | draft | M06 | | |
| `board-features.ts` | draft | M08 | | |
| `bench.ts` | draft | M09 | | |
| `hook.ts` | draft | M09 | | |
| `capabilities.ts` | draft | M13 | | |
| `nest.ts` | draft | M07 | | |
| `motion.ts` | draft | M07 | | |
| `index.ts` | follows the files it re-exports | | | |

## Files

| file | holds | decisions |
|---|---|---|
| `ids.ts` | unit aliases (Mm, Deg, Ohm, Volt, Micros), Vec2, Vec3, Quat, Ring, Axis, FaceFrame; brands Hash and FitClassId; GapBasis (per side, the only gap basis); hbf:// uri types; KernelId, MeshRoute, Process, Plane, Verdict, Severity, Tier (where a row came from), Qualifier, TIER_QUALIFIER, Qualification (qualifier plus basis tier), Qualified | D-007, D-050, D-053, D-057, D-067, D-083 |
| `schema.ts` | SchemaLike, structurally compatible with Standard Schema v1 | D-046 |
| `part-ir.ts` | Part, Body, BodyRole, FrameDecl, Pose, StackDecl, MeshRef, Metric, BuildWarning, Assembly, Instance, Connection, JointDecl, BoughtBody, Assertion, Sheet | D-047 to D-050, D-063, D-074, D-075 |
| `features.ts` | FeatureBase with optional body, the v3 kinds in camelCase, the admitted kinds, Feature union, FEATURE_KIND_ALIASES, MOVED_FEATURE_KINDS, FEATURE_KIND_ADMISSION and FeatureAt, backlog list | D-017, D-058 to D-060, D-062, D-177 |
| `board-features.ts` | the 14 board features of D-061 and the pad and net record (BoardRecord, RecordPad and kin, M08-T02) | D-061, D-088, D-089 |
| `feature-kinds.ts` | FeatureKindDef with NonEmpty checks and reference, fit or "none"; FeatureKindRegistryAt; GeneratedGeometry holding ShapeDecl declarations by stage; KernelCtx with MachineView, the host BodyDraft and the FaceDecl list | D-047, D-058, D-165, D-177 |
| `build.ts` | ShapeDecl per route, MeshRouteDef, BUILD_STAGES, APPLIED_MERGE, BodyDraft, PartDraft, Author<M> with applied(), arch() and bind(), AssemblyDraft<M>, BuildResultAt<M>, BuildFn<P, M>, BUILD_SANDBOX with an empty child environment; DriveStimulus, ContactState, ContactFn (the one contact function of a drive pad, G-20) | D-024, D-047, D-053, D-058, D-165, D-178 |
| `checks.ts` | CheckDef with drivenBy and version, selection by appliesTo, CheckTarget levels, ResultTarget with a pair member (P-23), CheckResult with waived, LegalValues with nearest, Fix, CheckOrigin | D-064 to D-067, D-074, D-173 |
| `constraints.ts` | Bound, Interval with binding and legal null on E_UNSAT, ConstraintDef, ConstraintSolver | D-044, D-072 |
| `profile.ts` | Provenance, ResistivityRow, StrainLimit by bend direction, Material, Machine, MachinePreset, FitBand, LossRow, BleedRow, Constant, ProfileLookup; lowestTier, qualifyRow, qualify (the only producers of a Qualification) | D-073, D-081, D-084, D-099 to D-101 |
| `circuit.ts` | McuPinSpec (with inputCap, leakage), PinState, ReadModel (auto E12 pullup, rc-time, slide; P-22), Net (with contacts, capToGndPf, couplingPf), ContactElement, ReadOutputs, ReadResidual, OperatingPoint | D-076 to D-079, D-086 |
| `catalog.ts` | CatalogHit, PinDef, CatalogField, CatalogPad, PartRow, ShaftOut, ActuatorRow | D-102 to D-104 |
| `canon.ts` | MechanismDef with derive() and optional apply(), MechanismApplyOut, ArchetypeDef with derive() and apply() on a PartDraft, ApplyIn, ApplyOut, MechanismStatus, ArchetypeStatus, CanonOriginal | D-095 to D-098, D-165, D-177 |
| `sim.ts` | SimHandle, SweepResult, TrialResult, SnapCurve, SimModelDef | D-134 to D-136 |
| `registry.ts` | RegistryKinds, RegistryEntry, DefFor, Manifest, typed lookups featureKind, checksFor and check (the dispatch path), ExporterDef with fabrication, AdapterDef, PanelDef, BuildInputs | D-051, D-052, D-109, D-161 |
| `bench.ts` | Bench layout: Shell, ViewsDecl (combine, section, explode, scene, tools), ViewMode, CamPreset, Overlay, DriveDecl with contact, pad and gesture stick, DRIVE_READOUTS, PlotDecl, StageTool, RailStep with view and cam, PanelRef, Welcome with starts, StatusChip, BuildDecl, SlotRegion, defineBench with panel, plot and preset checks; outside defHash | D-120, D-125, D-126, D-174 |
| `chase.ts` | Chase and every declaration type, ExpectDecl, WaiverDecl, ParamField per D-132 (derived with limit, verdict, focal; instances; slot; auto; quality; checks), ShowWhen union, ParamGroup readouts, note, fold, presets, Preset note and expect, ExportDecl kit and card, SceneDecl, MaterialSlot preview, ParamsOf, CheckedChase, CHASE_PARAM_RULES, CHASE_SOURCE_RULES, defineChase, defineBuild; no check selector | D-126, D-131, D-132, D-173, D-178, D-183 |
| `hook.ts` | BenchHook (drive with tilt and azimuth, release, error, clamp on write), DriveReadoutRecord, EXPORT_ALIASES, UNKNOWN_EXPORT_KIND | D-128 |
| `commands.ts` | CommandNames, CommandIO, ImportSpec, CommandDef, CommandResult, McpToolNames, MCP_TOOLS with covers, selector and annotations, McpToolIO, toolset profiles, limits | D-106 to D-115, D-133 |
| `errors.ts` | ErrorCodes, CommandError (with chase and personRuns), ThrownCommandError, isThrownCommandError, commandError, editDistance and didYouMean, EXIT_CODES, transport mapping | D-064, D-182 |
| `capabilities.ts` | observe and consequential capabilities | D-161 |
| `nest.ts` | QuarterTurn, NestItem, NestMode, Packer, SortOrder, NestGroupBy, NestRequest, Placement, NestResult (added by M07-T02, NestGroupBy and the optional packer, order and groupBy fields by M07-T03, DeclaredHole, HubDecl, KerfMode and the optional NestItem holes and hubs by M07-T04; D-046 names no file for them) | D-051, D-054, D-075, D-137 |
| `motion.ts` | StateVar, MotionOp, MotionProgram, MotionRule, MotionViolation, MotionRunResult, PlannedPoint, PlanResult, PathPoint, Planner, CalibrationReadout (added by M07-T02) | D-051, D-056, D-139 |
| `index.ts` | re-exports | D-046 |

## Rules for changing a contract

- Every numeric field carries a doc comment naming its unit. Lengths are mm
  unless the field name carries another unit suffix.
- A closed union that the plan calls a registry (panels, export kinds, fit
  classes, port interfaces, edge styles) is a registry-validated string
  (plan-deltas R90).
- Raising the command or tool count edits four files in one commit:
  `spec/commands.ts`, `spec/fixtures/surface.ts`, `spec/test/surface.test.ts`
  and `core/test/surface.test.ts`; from M12 `docs/explanation/command-surface.md`
  joins them.
- A zod schema in a package asserts `satisfies` against the spec type; the
  JSON Schema for MCP is derived from it.
- Runtime values in spec are limited to readonly tuples, lookup tables,
  the identity functions `defineChase`, `defineBuild` and `defineBench`,
  the pure functions `lowestTier`, `qualifyRow`, `qualify`, `gapPerSide`,
  `toolsFor` and `resultOk`, the guard `isThrownCommandError`, and the error
  helpers `commandError`, `editDistance` and `didYouMean`. Adding a function
  edits this list.

## Choices this package makes where the plan was silent

These are proposed and should be confirmed in CHECKS.md, AGENT-SURFACE.md or
DECISIONS.md before M04 and M12.

| item | choice here | why |
|---|---|---|
| unit aliases | Mm, Deg, Ohm are plain number aliases; only Hash and FitClassId are branded | a branded Mm forces a cast on every literal in build.ts; hashes and fit classes come from kernels and profile, so authors never type them |
| FitClassId | obtained through `Author.fit(id)`, which throws E_REF on an unknown id | the brand needs one constructor |
| E_UNSAT and skip transport | E_UNSAT exit 1, HTTP 200, `isError: false`; skip exit 0, HTTP 200, `isError: false`; `VERDICT_TRANSPORT` satisfies `Record<Verdict, TransportMapping>` | an empty interval is the answer to `constraints.query`, carried in `result`; section 6.2 of api-library-ai-design.md had `isError: true`; matches AGENT-SURFACE.md 6.2 and M12-T03; recorded in DECISIONS.md gaps |
| exit codes for E_GATE, E_KERNEL, E_PARAM_MISSING | 3, 1, 2 (HTTP 403, 200, 422) | section 6.2 of api-library-ai-design.md lists the other eight codes only; matches AGENT-SURFACE.md 6.2 and M12-T03; E_GATE shares exit 3 with E_GATE_UNAVAILABLE, E_KERNEL exits 1 because the caller acts on its record id, E_PARAM_MISSING names a fillable pointer (a non-finite value from complete inputs is a crash, exit 70), 70 stays for crashes; recorded in DECISIONS.md gaps |
| MCP annotations | read tools idempotent true; branch writers (chase_scaffold, chase_patch, arch_apply) readOnly false, destructive false, idempotent false; chase_bake BUILD (idempotent true) | D-107 requires explicit annotations; matches AGENT-SURFACE.md 5.2 and M12-T02 |
| MCP tool inputs | `McpToolIO`, derived from `CommandIO` (optional fields) by `StrictArgs` (required and nullable): per tool, the selector plus every covered command's fields, nullable unless every covered command requires them; `McpArgsIn` maps null back to absent; `MCP_TOOLS[].selector` names the field | D-107 fixes covers, not the selector; matches AGENT-SURFACE.md 5.2 |
| severity scale | Severity is block, warn, note, the seed vocabulary, with no mapping step; no severity stops the build, a kernel that cannot make geometry is E_KERNEL | D-067 as revised 2026-10-04: checks read Part IR, so a build always completes and stores it |
| SpringFeature fields | l, t, w, riseQ, ends, bend | D-059 names span, beam, rise Q, width and end pinning; PIP's `sw` input to SNAPFE is left out because its meaning is not recorded |
| backlog kinds | "hangSlot and peg" listed as two names | D-060 wording |
