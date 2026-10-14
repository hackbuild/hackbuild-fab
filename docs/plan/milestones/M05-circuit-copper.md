# M05 circuit and copper

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: geometry to netlist to a per-MCU verdict, and vinyl copper routing.
Depends on: M01, M04
Adopted dependency: eecircuit-engine 1.8.0, lazy (MILESTONES.md 1.2)
Commands added: circuit.solve (MILESTONES.md 1.3)
Release at exit: hackbuild-copper extraction check (D-029); extract only
when BLOCKS and KEYWAY both build on the package and parity passes

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document. PIP (was HAFT) is the published
print-in-place controller at hackbuild/pip-controller, commit b137deb,
2026-09-19T01:12:56Z (D-013). BLOCKS is the printed stud-and-socket system
whose harvested build is titled BOSS; BOSS is used here only to name that
legacy build and its sim constants.

Every number in this file carries a qualifier (measured, computed, vendor,
inferred, unknown) and a source (D-007). "Computed, this card" means the
number was recomputed on 2026-10-04 with node v22.12.0 (and Python 3.14.6
for the copper generators) from the named legacy source; the port must
reproduce it, and the golden records what the port computes. Nothing in
this milestone is measured on a printed body by hackbuild-fab; the
measured numbers quoted (PIP crossings) come from pip-controller's own
docs.

## What this milestone decides and carries

| item | decision or correction | where in this file |
|---|---|---|
| analytic DC in the offline path, eecircuit-engine lazy for devices and transients | D-086 | M05-T01, M05-T03 |
| per-MCU pin rows replace the single 0.5 VIO threshold and the 0.3 to 0.7 VIO hint | D-076, C-02 | M05-T02, M05-T06 |
| BLOCKS verdict scoped to short and medium cPLA wires; cTPU presses never register | D-077, C-03 | M05-T07 |
| read models on port with tau, wait, reject; computed waits qualified | D-078 | M05-T05 |
| PIP timing and drive figures, pip.ino gap recorded | D-079, D-080, C-06 | M05-T11 |
| resistivity rows; Yousu never scaled; Nowka Protopasta only; cABS row from Capricate | D-081, C-09 | M05-T04, M05-T12 |
| bleed 0 until a coupon, applied once at emit | D-084, C-06 | M05-T10 |
| buried stack defaults from PIP: iso 0.96, over L2 1.68, trace 1.4, net floor 0.60 | D-085, C-06 | M05-T10 |
| BLOCKS canonical standard stays open; reproduction runs at BOSS v1 | D-087 (owner) | M05-T07, M05-T09 |
| one copper router: PIP core plus TOGGLE DP, escalation, cache; Float64; Manhattan mode; lane ranker; SPLICE ladder; weedability | D-092 | M05-T08, M05-T09, M05-T14 |
| cut-sheet sensor stacks declare `stack` | D-063 | M05-T14 |
| narrowed claim wording on the BLOCKS and Capricate pages | D-020, D-021, C-13, C-14 | M05-T07, M05-T12 |
| hackbuild-copper extraction trigger | D-029, D-025 | M05-T16 |
| circuit.solve on the CLI with CommandResult | D-064, D-106, D-114 | M05-T06 |
| reference/keys/flex-pair admitted with goldens; band follows the built cone | D-105, D-008 | M05-T18 |
| contact, slope, apartExcept and charge-release checks run with references | D-074, D-078, D-079 | M05-T19 |
| conductor parts get solid infill and no interlocking beams through per-object overrides; CHK-3MF-08 refuses beams against a conductor | D-159, D-067 | M05-T20 |

Detail on check rewrites lives in ../CHECKS.md, profile rows in
../PROFILE.md, the canon side (archetypes that use these kernels) in
../CANONS.md and M06, command shapes in ../AGENT-SURFACE.md, package
boundaries in ../PACKAGES.md and ../ARCHITECTURE.md, licences in
../LICENSING.md, and the extraction procedure in ../REPOS.md. This file
holds what a builder runs.

## Evidence roots

| short | absolute path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| syn | `fab-knowledge:synthesis/` |
| notes | `fab-knowledge:sources/` |
| corpus | `fab-work-directory:` |

Cards write evidence paths in full. The source notes behind this
milestone are
`fab-knowledge:sources/benches/benches-conductive-b.md`
(KEYWAY family and BOSS),
`fab-knowledge:sources/latest/haft-toggle.md`
(PIP and TOGGLE routers),
`fab-knowledge:sources/benches/benches-copper-pcb-b.md`
(SPLICE ladder),
`fab-knowledge:research/hci-fabrication-prior-art.md`
(Capricate) and
`fab-knowledge:synthesis/verified-claims.md`
C1, C3, C5, C9, C12.

## Package placement

| package | tier | owns in M05 | may import | does not import |
|---|---|---|---|---|
| catalog | 0 | per-MCU pin rows (D-076), the BOSS legacy row | spec | anything above tier 0 |
| circuit | 1 | net extraction, per-direction resistance, analytic DC solve, read models, eecircuit adapter, `circuit/*` ConstraintDefs | spec, profile, catalog, geom, mesh | copper, checks, any DOM module |
| copper | 1 | the one router (octile and Manhattan modes), assignment DP, layer escalation, cache, lane ranker, ladder rule, vinyl generators, copper gate functions, layer SVG emit | spec, profile, geom | circuit, checks, any DOM module |
| checks | 2 | run bodies for CHK-NET and the R54 copper family, reading circuit and copper outputs | tiers 0 and 1 | ui |

Circuit and copper sit side by side in tier 1 and never import each other;
a design's build.ts calls the router and hands its polylines to the kernel
as conductor features, and circuit reads them back from Part IR. This
keeps `tools/tiers.json` free of a same-tier edge (D-044). No file under
`packages/circuit` or `packages/copper` touches `document`, `window` or
`vue` (D-045).

---

## M05-T01 eecircuit-engine 1.8.0, lazy

Goal: the adopted dependency loads only on demand, agrees with the analytic
path on a resistor divider and an RC discharge, and never enters the
default offline path (D-086).

Inputs:
- fab-knowledge:evidence/scratch/c9/run.mjs (measurement script behind verified-claims C9)
- fab-knowledge:evidence/scratch/c9/eecircuit-engine-1.8.0/ (unpacked package)
- fab-knowledge:synthesis/verified-claims.md line 119
- ../LICENSING.md (eecircuit-engine: MIT wrapper; the bundled ngspice 45.2 wasm is BSD-3-Clause AND LGPL-2.0-or-later for numparam and KLU, xspice and osdi disabled by Docker/run.sh:107)

Steps:
1. Add `eecircuit-engine` at exact version 1.8.0 to
   `packages/circuit/package.json` dependencies. Record the licence in the
   audit table and in BuildInputs licences when the engine runs (D-041,
   D-051): audited `MIT AND BSD-3-Clause AND LGPL-2.0-or-later`, load
   `lazy-separate-file`, never in a bake (D-043). Read the KLU file
   headers in the ngspice 45.2 source and record their exact SPDX id in the
   audited expression if it differs from LGPL-2.0-or-later.
2. Write `packages/circuit/src/spice/engine.ts` exposing
   `loadSpice(): Promise<SpiceEngine>` that does
   `await import("eecircuit-engine")`, `new Simulation()`,
   `await sim.start()`, and caches the instance. No static import of the
   package anywhere in the repo.
3. Write `toNetlist(op: OperatingPointInput): string` emitting R, V and C
   lines and `.op` or `.tran` with `UIC` when initial conditions are set.
4. Record the engine version string from `sim.getInitInfo()` (ngspice 45.2)
   into BuildInputs engines when a result used it (D-051).
5. Add a test that the module graph of `circuit.solve --engine analytic`
   never resolves `eecircuit-engine` (spy on the dynamic import, assert
   zero calls) and a bake-side test placeholder that M09 fills: the
   default bake contains no eecircuit bytes.
6. Do not assert timings in CI. Start and `.op` figures are one machine's
   measurement (this host: start 449 ms, `.op` median 0.365 ms, verified-claims C9).

Files to create:
- packages/circuit/src/spice/engine.ts
- packages/circuit/src/spice/netlist.ts
- packages/circuit/src/spice/engine.test.ts

Acceptance:
- `npm test -w packages/circuit -- spice` exits 0.
- Divider `V1 1 0 5; R1 1 2 1k; R2 2 0 1k; .op`: node 2 equals 2.5 V from
  both engines within 1e-9 V (computed).
- RC discharge, PIP LEFT key path: R 1722798 ohm, C 9.109 pF, initial 3.3 V,
  `.tran 0.01u 60u UIC`; the 0.8 V crossing from ngspice is 22.238 us and
  the analytic `R C ln(3.3 / 0.8)` is 22.238 us; relative difference
  under 1e-6 (computed, this card: 1.36e-8).
- `grep -rn "from \"eecircuit-engine\"\|require(\"eecircuit-engine\")" packages core apps`
  returns nothing (dynamic import only).

Done when: circuit can call ngspice on demand and the offline path proves
it never did.

Card defects found while building (2026-10-08):
- Files names `packages/circuit/src/spice/engine.test.ts`. The circuit
  tsconfig compiles everything under `src` into `dist` with `types: []`,
  and every package keeps its tests under `test/`, so the tests are
  `packages/circuit/test/spice-engine.test.ts` (toNetlist decks, both
  engines, BuildInputs entries) and
  `packages/circuit/test/spice-offline.test.ts` (the import spy and the
  static scan). Both match the `-- spice` filter.
- Files omits what step 1 and the licence row touch:
  `packages/circuit/package.json`, `package-lock.json`,
  `tools/licences.json` (the eecircuit-engine 1.8.0 row) and
  `packages/circuit/src/index.ts` (re-exports).
- `OperatingPointInput` is not a spec type. It lives in
  `packages/circuit/src/spice/netlist.ts` beside `SpiceElement` and
  `SpiceAnalysis`; M05-T06 moves it to spec only if circuit.solve's input
  carries it.
- The KLU headers differ from LGPL-2.0-or-later: `colamd.c` lines 53 to
  56 and `colamd_global.c` line 7 (tag ngspice-45.2, commit
  724dc77b9153dc75eaec474b1f7a44f1fcf5f362) say LGPL 2.1 or any later
  version, and the other KLU, AMD and BTF files carry no licence text.
  The audited expression is `MIT AND BSD-3-Clause AND LGPL-2.0-or-later
  AND LGPL-2.1-or-later` in tools/licences.json, LICENSING.md 2.1 and
  `EECIRCUIT_LICENCE`; a test reads the row so the constant cannot drift.
- "From both engines" on the divider: the analytic DC solver is M05-T03.
  Until it lands the analytic side is the closed form 5 x 1k / 2k;
  M05-T03 adds its nodal solve to the divider test in
  spice-engine.test.ts. The RC analytic side is the existing
  `rcCrossingUs` (flex-switch.ts), not a second formula.
- Step 5 names `circuit.solve --engine analytic`, which M05-T06 creates.
  The spy test imports the whole package and runs its analytic functions
  with zero resolutions, then calls loadSpice() and sees one; M05-T06
  adds the circuit.solve run to that test. The M09 bake placeholder is a
  `test.todo`.
- ngspice 45.2 in this build leaves the previous result in place when a
  deck does not run, and stops answering after a parse error. The engine
  checks the result's Title line against the deck and drops the cached
  instance on any error line.
- The acceptance grep exits 2 while `apps/` does not exist (ugrep warns
  on the missing path); its output is empty, which is the pass condition.

## M05-T02 Per-MCU pin rows in catalog

Goal: the receiving pin's pullup and logic thresholds are catalog rows with
provenance, and the M01 test fixture becomes a read of those rows with
identical values (D-076, C-02).

Inputs:
- packages/circuit/test/fixtures/mcu-pins.json (written by M01-T08)
- fab-knowledge:synthesis/verified-claims.md lines 67 to 71
- spec/circuit.ts (McuPinSpec, PinState), spec/catalog.ts (PinDef, PartRow)
- fab-knowledge:evidence/x/benches-conductive-b/boss-src/src/sim.js lines 91 and 135

Steps:
1. Write the rows below into `packages/catalog/data/mcu-pins.json`, each
   with Provenance per D-099 (machine null, coupon null, date
   2026-10-04, method datasheet for vendor rows, tier per D-083 default).
2. Store the RP2040 pullup as `{ kind: "range", minOhm: 50000, maxOhm:
   80000 }`; `circuit.solve` evaluates both ends (D-076). Store the
   ESP32-C3 pullup as `{ kind: "typical", typOhm: 45000 }`. Kind
   `typical` is the case where the datasheet gives no range, and a result
   built on it names the typical value it used.
3. Add the BOSS legacy row with `legacy: { single: 0.5, hintBand: [0.3,
   0.7] }` (spec/circuit.ts LegacyThreshold, fractions of VIO), tier
   `inferred`. M05-T07 classifies against both members. The row is
   refused by every check except the reproduction reference in M05-T07;
   reading it from any other path throws E_REF naming D-076.
4. Point M01's `circuit/pullup-low-read` at the catalog rows and delete
   the fixture file; the M01 goldens N1 to N5 must stay byte equal.

| row id | VDD V | pullup ohm | VIL max V | VIH min V | tier | source |
|---|---|---|---|---|---|---|
| rp2040 | 3.3 | 50000 to 80000 | 0.8 | 2.0 | vendor | RP2040 datasheet pp. 616 to 617 |
| pico | inherits rp2040 | inherits | inherits | inherits | vendor, marked "not checked against the Pico datasheet" | D-076 |
| esp32-c3 | 3.3 | 45000 typical | 0.825 (0.25 VDD) | 2.475 (0.75 VDD) | vendor | ESP32-C3 datasheet v2.4 p. 55 |
| boss-legacy | 3.3 | 50000 typical | `legacy.single` 0.5 VIO (1.65 V); `legacy.hintBand` 0.3 to 0.7 VIO (0.99 to 2.31 V) | same | inferred (legacy row) | boss-src/src/sim.js:91 and :135; blocks.html hint code |

Files to create:
- packages/catalog/data/mcu-pins.json
- packages/catalog/src/mcu.ts
- packages/catalog/src/mcu.test.ts
- packages/circuit/src/constraints/pullup-low-read.ts (edit: catalog read)

Acceptance:
- `npm test -w packages/catalog -- mcu` exits 0; asserts every value above
  and that `boss-legacy` throws E_REF outside the reproduction context.
- `npm test -w packages/circuit -- pullup-low-read` exits 0 with M01's
  N1 to N5 unchanged.
- `node tools/counts.mjs && git status --porcelain` prints nothing.

Done when: no pin threshold or pullup lives in code outside catalog data.

Card defects found at build, 2026-10-08, and what was built:

1. Inputs name `packages/circuit/test/fixtures/mcu-pins.json` from
   M01-T08; that file never existed. M01-T08 (its defect 1) put the rows
   at `packages/catalog/data/mcu-pins.json` with only the pullup-read
   fields, and the M-S fixture holding thresholds in code was
   `packages/circuit/test/fixtures/rp2040.ts`. Step 4 deleted that file.
   Its readers now take catalog rows: `core/src/commands/build.ts`
   (imported the fixture at runtime for `Workspace.mcu`),
   `packages/circuit/test/skeleton.test.ts`,
   `packages/checks/test/skeleton.test.ts` and
   `tools/test/flexpair-probe-sim.test.mjs` (reads the data file as text).
   core and packages/checks gained a `@hackbuild/catalog` dependency
   (package.json, package-lock.json, and a core/tsconfig.json
   reference). The Files list named none of these.
2. The test was listed under `src/`, where tsc compiles it into dist (the
   M01-T08 defect 2 again). It is `packages/catalog/test/mcu.test.ts`.
3. McuPinSpec requires inputCap and leakage, which the table leaves out.
   pico inherits them from rp2040; esp32-c3 and boss-legacy carry PIP's
   7 pF and 1 nA, inferred, each source saying the figure is PIP's RP2040
   assumption and no ESP32-C3 figure is recorded (PLAN.md section 9).
4. "machine null, coupon null": spec Provenance has optional string
   fields. The data file stores null and `mcuPinRow` omits them. A row's
   `tier` and `source` are its provenance tier and source, stored once.
5. The boss-legacy "same" column is stored as `legacy` only:
   vilMaxV = vihMinV = legacy.single x vddV = 1.65 V, derived at read, so
   classify gives LOW at equality as sim.js:135 does (HIGH only above).
   Precise sources: boss-src.zip src/sim.js:91 and :135, src/parts.js:17
   (c3mini vio 3.3), src/app2.js:236 and handoff blocks.html:3779 (hint).
6. "Reproduction context" is `bossLegacyRow(reference)`, which returns the
   row only for `reference/electrical/blocks-pullup-band`
   (BOSS_REPRODUCTION) and throws E_REF with record D-076 otherwise;
   `mcuPinRow("boss-legacy")` throws E_REF naming D-076, and
   MCU_PIN_IDS and didYouMean leave the row out. M05-T07 reads it that way.
7. pico tier: this card says vendor, PROFILE.md section 5 said inferred.
   Built vendor per this card and D-076 (a Pico GPIO is an RP2040 GPIO),
   with the source marked "not checked against the Pico datasheet";
   PROFILE.md row updated to match.
8. Acceptance line 3 (`git status --porcelain` prints nothing) cannot hold
   while the tree is staged and uncommitted (D-006). What was checked:
   `node tools/counts.mjs` leaves the working tree diff unchanged.

## M05-T03 Analytic DC solver with BOSS element parity

Goal: the offline nodal solver reproduces every voltage and current the
BOSS sim computes when fed the same element list, before any geometry is
involved (MILESTONES.md Part 3 rule 1).

Inputs:
- fab-work-directory:benches/blocks/outputs/boss/boss-src.zip (shipped source, entries 2026-09-13 22:05 to 23:17)
- fab-knowledge:evidence/x/benches-conductive-b/boss-src/ (unpacked copy, with earcut 2.2.4 and polygon-clipping 0.15.7)
- boss-src/src/sim.js lines 63 to 140 (solve), boss-src/test_sim.js, boss-src/test_sim2.js
- fab-knowledge:sources/benches/benches-conductive-b.md B.7, B.8

Steps:
1. Vendor the zip into `designs/blocks/legacy/boss-src.zip` and unpack it
   to `designs/blocks/legacy/boss-src/`; write the sha256 of the zip and
   of every source file into `designs/blocks/legacy/README.md` and
   `lineage.json` (D-142, D-156). Add `earcut` 2.2.4 and
   `polygon-clipping` 0.15.7 as exact root devDependencies for legacy
   tooling only; record their licences in the audit.
2. Write `tools/legacy/boss/dump-elements.cjs`. It loads kernel.js,
   boss.js, parts.js, then evaluates sim.js with two textual patches: the
   string `50e3` becomes `globalThis.__PU` (default 50e3), and the line
   `const gnd = idOf(gndKey);` is followed by
   `globalThis.__DUMP = { R, V, diodes, gnd, nodes: [...nodeIds] };`. The
   legacy file on disk stays byte identical. It writes one JSON per scene
   with the element list and BOSS's own pin readings.
3. Port the solver to `packages/circuit/src/dc/nodal.ts`: dense modified
   nodal analysis, Gaussian elimination with partial pivoting, Float64,
   ground row replaced by identity, 1e-12 S from every other node to
   ground, element floor `R >= 1e-3`, open switch 1e9. Keep the BOSS
   piecewise linear LED (off below Vf at 1e-9 S, else `(V - Vf) / (Rs + 20)`,
   Newton up to 40 iterations, stop under 1e-4 V) as element kind
   `ledPwl`, marked legacy in its doc comment; device-accurate diodes go
   through eecircuit (M05-T01).
4. Parity test: every scene of test_sim.js and test_sim2.js, plus the
   button scenes of M05-T07, solved from the dumped element list; every
   node voltage and element current equal to BOSS within 1e-9 V and 1e-12 A.

Files to create:
- designs/blocks/legacy/boss-src.zip, designs/blocks/legacy/boss-src/, designs/blocks/legacy/README.md
- tools/legacy/boss/dump-elements.cjs
- packages/circuit/src/dc/nodal.ts
- packages/circuit/src/dc/nodal.test.ts
- packages/circuit/test/fixtures/boss-scenes/*.json (generated by the dump; never edited by hand)

Acceptance:
- `node tools/legacy/boss/dump-elements.cjs designs/blocks/legacy/boss-src packages/circuit/test/fixtures/boss-scenes` exits 0, then `git status --porcelain` prints nothing (fixtures reproduce).
- `npm test -w packages/circuit -- nodal` exits 0.
- test_sim2.js readings reproduced (computed, this card): IO2 released
  3.30 V, pressed 2.05 V (80 mm cPLA S-bend wires), lamp on supply
  0.02 mA at 2.15 V, lamp on IO3 OUT_H 0.01 mA at 2.10 V.
- test_sim.js readings reproduced (computed, this card): with wires LED
  0.034 mA at 2.24 V, IO2 released 4.18 V, pressed 3.65 V.

Done when: the analytic solver and BOSS agree on every BOSS scene to
machine precision.

Card defects found at build (2026-10-08):
- Files names `packages/circuit/src/dc/nodal.test.ts`, but the root
  vitest include reads only `packages/*/test/**` and `tsc -b` compiles
  `src/` into `dist/`. The test is `packages/circuit/test/nodal.test.ts`.
- Step 1 adds `polygon-clipping` 0.15.7 as a root devDependency, which
  `.hbf-notes/m00-report.md` found blocks lint-voice through the lock.
  It stays out of the lock; the dump exits 2 with
  `npm install --no-save polygon-clipping@0.15.7` when it is missing, as
  `tools/legacy/boss-booleans.cjs` does. earcut 2.2.4 was already a root
  devDependency, so root package.json and the lock do not change.
- Step 1 unpacks the whole zip, but `build.py` line 31 holds U+2014 and
  U+2013, which lint-voice never allows in a repo file. It stays in the
  zip only; designs/blocks/legacy/README.md gives its sha256.
- Inputs says zip entries 22:05 to 23:17; README.md and package.json are
  2026-09-14 00:44.
- Step 1 puts every source file in lineage.json; a new subject needs a
  canonical row, so rows cover the zip and the files a port or the dump
  reads (sim, kernel, boss, parts, app2, export), and the README pins
  every file.
- Acceptance 1 says `git status --porcelain` prints nothing, which cannot
  hold while the tree is staged and uncommitted (D-006). The reproduction
  check is `git diff --exit-code -- packages/circuit/test/fixtures/boss-scenes`
  after the dump, with no untracked file there.

## M05-T04 Net extraction and per-direction resistance

Goal: nets come from the conductive bodies of a built Part IR, and each
net's resistance comes from printed cross section, path length and a
per-direction resistivity row with its tier (D-020, D-081).

Inputs:
- spec/part-ir.ts (Part.bodies with role), spec/features.ts (ConductorFeature width and t, PortFeature), spec/profile.ts (ResistivityRow per direction)
- fab-knowledge:evidence/x/pip-controller/src/model.js lines 207 to 224 (per-net union, decompose, minGap) and 383 to 392 (Rtrace, Rpost)
- boss-src/src/kernel.js netCheck (union-find on z overlap within 0.02, bbox overlap, xy area over 1e-4 mm2)
- fab-knowledge:synthesis/verified-claims.md lines 39 to 45
- ../PROFILE.md resistivity table

Steps:
1. Extraction: for every body with role `conductor` or `flex-conductor`,
   decompose its manifold into connected components; two components join a
   net when `minGap(a, b) <= 1e-3` mm (touching). Port taps resolve by
   point containment at the tap z. Output spec/circuit.ts `Net { id,
   conductors, bodies, terminals, segments, totalOhm, tier, qualifier }`:
   taps land in `terminals` (pad and port feature ids), and `segments`
   and `totalOhm` come from step 2. The connected components behind a net
   are diagnostics, carried in the `extra` of the CHK-NET-01 CheckResult
   as `components`, never in Net. A declared net that extracts in more
   than one piece is CHK-NET-01 fail naming the pieces; two declared nets
   that extract as one are a short naming both.
2. Resistance: each segment's R comes from profile
   `sectionResistance(row, L, w t)` (M00-T02, spec/profile.ts
   SectionResistance), or `pi r^2` area for posts; circuit does not restate
   the formula R = rho L / (w t), rho in ohm mm (ohm cm x 10). Traces in the layer plane read the
   row's `along` value; posts and vias between layers read `through` with
   area `pi r^2` (PIP `Rpost`). Path length is the routed polyline length
   plus stubs, read from the feature, never retyped.
3. Every resistance carries the tier of the row it used. A net whose
   lowest tier is inferred carries `inferred` in its CheckResult extra,
   and CHK-NET-05 reports warn instead of pass while that holds (D-081).
4. Add the profile row `cabs-capricate` (Torwell cABS, measured by others,
   Schmitz et al. UIST 2015): along 0.4382, across 0.8171, through 0.9976
   ohm cm, conditions 100 percent fill, 0.8 mm nozzle, 0.2 mm layer, 230 C,
   samples 100 x 12 x 1 mm, n 14. Tier as ../PROFILE.md assigns to rows
   measured by others; if PROFILE.md has not assigned one, use `community`
   and list the question in the PR body.
5. Yousu raw filament 240 to 481 ohm cm is never returned for a printed
   direction; Nowka figures attach to Protopasta rows only (C-09).

Files to create:
- packages/circuit/src/extract/nets.ts
- packages/circuit/src/extract/resistance.ts
- packages/circuit/src/extract/extract.test.ts
- packages/profile/seed/profile.seed.json (row cabs-capricate)

Acceptance:
- `npm test -w packages/circuit -- extract` exits 0 over these goldens,
  all computed from `R = rho L / (w t)`:

| case | rho ohm cm | L mm | w x t mm | R ohm | source of rho |
|---|---|---|---|---|---|
| BOSS wire core, cPLA (legacy constant) | 30 | 80 | 1.2 x 0.96 | 20833 | boss.js SLOTS slot 2 (legacy) |
| BOSS wire core, cTPU (legacy constant) | 1500 | 80 | 1.2 x 0.96 | 1041667 | boss.js SLOTS slot 4 (legacy) |
| Capricate sample, along | 0.4382 | 100 | 12 x 1 | 36.52 | cabs-capricate |
| Capricate sample, across | 0.8171 | 100 | 12 x 1 | 68.09 | cabs-capricate |
| Capricate minimal trace, along | 0.4382 | 100 | 0.8 x 0.2 | 2738.8 | cabs-capricate |
| PIP trace per mm, working cpla | 500 | 1 | 1.4 x 0.72 | 4960.3 | cpla (inferred) |

- The BOSS wire cases are built as meshes on the prism route and
  extracted; the extracted R equals the formula within 0.1 percent and the
  BOSS readout (20.8 kohm, 1.04 Mohm) after rounding.
- A two-body fixture with a 0.0 mm overlap gap extracts one net; with a
  0.01 mm gap, two nets.

Done when: a part's nets and their resistances come out of its geometry
with a tier on every number.

Card defects found at build (2026-10-08):
- Step 1 joins components at `minGap <= 1e-3` mm. Stage 6 insets every
  conductive insert by `3mf.coincidenceInset` in plan, so two conductors
  drawn abutting build 0.001953 mm apart (computed, two prisms drawn
  touching); 1e-3 splits every abutting pair, and the 0.0 mm acceptance
  fixture fails with it (mutation checked). The rule built is
  `minGap <= 2 x 3mf.coincidenceInset + one 1/1024 mm grid step`
  (0.002977 mm at the inferred 0.001 mm inset); a drawn 0.01 mm gap builds
  0.0117 mm apart and stays two pieces. A body that took the 0.02 mm pinch
  inset is not covered and reads as split.
- Step 1 gives Net as `{ id, conductors, bodies, terminals, segments,
  totalOhm, tier, qualifier }`. spec/circuit.ts Net is frozen at M-S exit
  B (MILESTONES.md 1.5) with `resistance: NetResistance[]`, `bulkOhm`,
  `contacts`, `totalOhm` as a range, `unpricedContacts`, `capToGndPf`,
  `couplingPf` and `capMethod`. The spec shape is built. Capacitance needs
  the receiving pin's inputCap from Chase.hookup and the per-mm rule of
  M05-T05, so T04 writes `capToGndPf` 0, `couplingPf` {} and leaves both
  to T05; `NetResistance.solved` stays null (no voxel solve in this card).
- Step 1 resolves port taps by point containment at the tap z, but
  PortFeature and PadFeature carry no position. The tap is the net's lead:
  the first centreline end within half the trace width of its host body's
  plan bounds (the path1d lead rule on built geometry), moved inside by
  half the width; containment is a 4 grid step cube meeting a component.
- Files lists `packages/circuit/src/extract/extract.test.ts`; the root
  vitest include reads `packages/*/test/**` and `tsc -b` compiles `src/`.
  The test is `packages/circuit/test/extract.test.ts`, goldens in
  `packages/circuit/test/fixtures/extract/goldens.json`.
- Files lists `packages/profile/seed/profile.seed.json (row
  cabs-capricate)`. Rows the lookup serves live in
  `packages/profile/data/materials.json` (PROFILE.md 1), one row per
  direction: material `cabs` with `cabs.capricate.along`, `.across` and
  `.through` as PROFILE.md 4.1 names them, tier community, method coupon
  with `conditions` (230 C, 0.2 mm layer, direction); nozzle, fill,
  sample size and n go in `note`, since ProvenanceConditions has no field
  for them. The seed is unchanged.
- Step 2 says posts read area `pi r^2`. A post is a path-region conductor
  and reads its declared ring area through path1d `legOf`, so a
  polygonal post is priced at its drawn polygon.
- The card has no case on the `across` direction from geometry:
  ConductorFeature declares no print direction, so `across` is read only
  by row (the Capricate across golden goes through `sectionResistance`).
- Files omit what the extraction needs outside the four named files:
  circuit package.json and tsconfig gain `@hackbuild/geom` and
  `@hackbuild/mesh` (allowed by tools/tiers.json), the lock entry follows,
  packages/mesh exports its `toManifold`, and path1d exports `footprint`.

- Audit 2026-10-09 mutation: making `Net.tier` the first leg's tier
  instead of the lowest (packages/circuit/src/extract/resistance.ts)
  survived every M05 suite, since every fixture net read one material.
  extract.test.ts now builds a vendor Protopasta leg before an inferred
  cPLA leg on one net and holds the tier to inferred and the printed
  interface between them to unpriced (qualifier unknown); the mutant fails.

## M05-T05 Read models on port

Goal: every port declares how it is read, and the read model returns tau,
settle, wait and reject per net with qualifiers, so the firmware emitter
and the drive pad read one record (D-078).

Inputs:
- spec/circuit.ts (ReadModel, ReadOutputs), spec/chase.ts (HookupDecl, Chase.hookup: port, mcu, pin, read)
- fab-knowledge:evidence/x/pip-controller/src/model.js lines 414 to 438
- fab-knowledge:evidence/x/pip-controller/docs/electrical.md lines 26 to 70 and 143 to 162
- fab-knowledge:evidence/x/pip-controller/firmware/pip_stick/pip_stick.ino line 25, firmware/pip/pip.ino line 20
- fab-knowledge:sources/benches/benches-conductive-a.md line 667 (readCircuit list)

Steps:
1. Implement six read models in `packages/circuit/src/read/`:
   - `pullup`: pressed voltage `VDD R / (R + Rpu)` at both pullup ends,
     state LOW, UNDEFINED or HIGH per catalog row; tau `Rpu C`.
   - `charge-release` (PIP): pin driven away from its active level for 30
     us, floated, read after the wait. `tau = R C`; keys settle at 5 tau,
     ok when wait > 5 tau, reject `wait / (5 C)`; touch adds skin
     (Rskin 20 Mohm, the bench assumption) to R, settles at 3 tau, reject
     `wait / (3 C)`. Pin capacitance `C = cpin + 0.02 pF per mm of trace
     + 1 pF` with cpin 7 pF (inferred, model.js:420).
   - `adc`: source impedance against the 100 kohm line of CHK-NET-06; above
     1 Mohm the result says a 100 nF hold capacitor is needed (BOSS wire
     verdict thresholds, boss parts.js:426).
   - `ratiometric`: three-wire pot with pulldown at least 20 times the
     source (GIB, THINPOT rule).
   - `column-scan` and `ladder`: per-row internal pulls; ladder levels and
     smallest step in counts (FEELER ladder).
2. Waits are profile or coupon values with a qualifier, carried in
   `ReadOutputs.wait` (spec/circuit.ts). `wait.computed` is settleTaus x
   tau of the slowest path, qualifier computed. `wait.emit` for
   charge-release is 3500 us, qualifier inferred, source
   pip_stick.ino:25, until a coupon calibrates the wait (D-079). The
   3500 us figure is a margin chosen above the measured crossings (113 to
   2431 us, measured, pip-controller docs/electrical.md), so it carries
   inferred, the same qualifier spec/fixtures/keys-flex-pair.ts declares on
   its ports; writing measured would promote it (D-007). For PIP the
   record also carries `wait.firmwareShipped` 200 us, qualifier unknown
   (no measurement stands behind it), source pip.ino:20, so the gap stays
   visible (D-080; hackbuild-fab does not edit pip-controller).
3. ratiometric, column-scan and ladder have no legacy parity target in
   M05; their unit tests use values computed from the formulas and are
   marked "computed, this card". Their references arrive with the
   archetypes that use them in M06.

The charge-release core, typed against spec/circuit.ts `ReadOutputs` and
spec/ids.ts `Qualified`. It compiled with exit 0 on 2026-10-04 under
`npx -y -p typescript@7.0.2 tsc -p tsconfig.json`, where that tsconfig
extends spec/tsconfig.json and includes `spec/*.ts`, `spec/fixtures/*.ts`
and the snippet file, with no local stand-ins (scratch copy
`fab-knowledge:evidence/x/tsc/m05b/charge-release.ts`).
Run through tsx it printed LEFT tau 15.693 us, settle 78.46 us, ok; A
reject 4.348 Mohm at 200 us and 76.09 Mohm at 3500 us; START reject 58.87
Mohm, ok; LEFT crossing 22.238 us (computed, this card). In the package
the imports read from the `@hackbuild/spec` root export.

```ts
import type { Qualified, ReadOutputs } from "@hackbuild/spec";

/** Charge and release read (PIP). pathOhm: closed path, ohm. pinPf: pin plus trace, pF.
 *  settleTaus: 5 for keys, 3 for touch (pip-controller src/model.js:420 to 428).
 *  emit: the wait the emitted firmware uses, unit "us". shipped: the published firmware's wait, if it differs. */
export function chargeRelease(
  net: string, pathOhm: number, pinPf: number, settleTaus: 3 | 5,
  emit: Qualified, shipped?: Qualified,
): ReadOutputs {
  const tauUs = pathOhm * pinPf * 1e-6;
  const settleUs = settleTaus * tauUs;
  const computed: Qualified = { value: settleUs, unit: "us", qualifier: "computed", source: "settleTaus x tau" };
  return {
    net, tauUs, settleTaus, settleUs,
    wait: shipped ? { emit, computed, firmwareShipped: shipped } : { emit, computed },
    rejectOhm: (emit.value * 1e-6) / (settleTaus * pinPf * 1e-12),
    ok: emit.value > settleUs,
    qualifier: "computed",
  };
}

/** Time for a released pin at vddV to fall through vilV on the path, us. */
export function crossingUs(pathOhm: number, pinPf: number, vddV: number, vilV: number): number {
  return pathOhm * pinPf * 1e-6 * Math.log(vddV / vilV);
}
```

Files to create:
- packages/circuit/src/read/{pullup,charge-release,adc,ratiometric,column-scan,ladder,index}.ts
- packages/circuit/src/read/read.test.ts

Acceptance:
- `npm test -w packages/circuit -- read` exits 0 over:

| case | inputs | expected | qualifier |
|---|---|---|---|
| PIP LEFT key, wait 200 us | R 1722798 ohm, C 9.109 pF | tau 15.69 us, settle 78.46 us (78.47 with the fixture's unrounded C), settleTaus 5, ok | computed, this card |
| PIP A key, wait 200 us | R 1687980 ohm, C 9.200 pF | reject 4.348 Mohm (bench prints 4.35, docs round to 4) | computed, this card |
| PIP A key, wait 3500 us | same | reject 76.09 Mohm | computed, this card |
| PIP START touch, wait 1500 us | R 910897 ohm plus skin 20 Mohm, C 8.494 pF | reject 58.87 Mohm, ok | computed, this card |
| PIP LEFT crossing of RP2040 VIL 0.8 V from 3.3 V | R 1722798, C 9.109 | 22.24 us | computed, this card |
| BOSS button through 10 mm cPLA wires, rp2040 | M05-T07 path | UNDEFINED at both pullup ends | computed, this card |

- The read record for PIP carries `wait.emit` 3500 us inferred
  (pip_stick.ino:25), `wait.computed` 78 us computed (5 tau of LEFT) and
  `wait.firmwareShipped` 200 us unknown (pip.ino:20); a test asserts all
  three fields, their qualifiers and their sources.
- `npx -y -p typescript@7.0.2 tsc -p packages/circuit/tsconfig.json`
  exits 0 with `read/charge-release.ts` importing `ReadOutputs` from
  `@hackbuild/spec`; no local type stands in for a spec type.

Done when: a port's read is a typed record that a firmware emitter and a
drive pad can both consume, with every wait qualified.

Card defects (written back 2026-10-08 by the audit fixer round):
- The card prices every series element from a ContactRow (spec/profile.ts
  ContactRow, `ProfileLookup.contact`) but no step enters one, and the
  profile table is still empty: `solveKeys` reports each terminal and the
  flex cap interface as unpriced (qualifier unknown). The virtual exit B
  probe simulation (D-234) therefore reads inferred stand-ins, profile
  constants `electrical.contactFactor.lo` and `.hi` (10 to 30 times the
  solved path, transferred from the PIP stick), `electrical.skinOhm.lo` and
  `.hi`, `electrical.tracePfPerMm` and `electrical.tracePfFixed` (model.js
  line 418), `electrical.smearOhm`, `electrical.gndLeadPf`,
  `electrical.keyLeadPf` and `electrical.noiseV`, all tier inferred, read by
  `tools/skeleton/flexpair_probe/sim/run.mjs`. Add a step that enters the
  ContactRow rows a person measures on a coupon (cpla to ctpu printed
  interface, clip to pad, cap across the split) and moves the probe
  simulation and `packages/circuit` onto `contact()`; the electrical.*
  stand-ins then leave profile. The cap bridge itself is computed by
  `packages/circuit` `flexCapBridgeOhm` (pip-controller model.js line 404),
  and the RC crossing over a total node capacitance by `rcCrossingUs`; the
  trace capacitance this card defers to M05 is the caller's sum today.

Card defects found at build (2026-10-08):
- The ContactRow step above cannot be built from this card: a ContactRow
  is a coupon result a person enters (RULES.md, CLAUDE.md "never enter a
  coupon result"), and no coupon has been printed. What landed: the trace
  rule (`traceCapRule`, `nodeCapPf`, model.js:418) and the 5 tau reject
  (`chargeReleaseRead`) now run in `packages/circuit/src/read/`, and the
  probe simulation calls them; its expected/electrical.json is unchanged
  bit for bit. `electrical.tracePfPerMm`, `electrical.tracePfFixed` and
  `electrical.skinOhm.hi` are now the read model's own rows, not stand-ins.
  `electrical.contactFactor`, `smearOhm`, `gndLeadPf`, `keyLeadPf` and
  `noiseV` stay inferred stand-ins until a coupon row exists; the contact
  step stays open and moves to whichever card enters the first coupon.
- Files names `packages/circuit/src/read/read.test.ts`; the root vitest
  include reads only `packages/*/test/**` (as M05-T03 found). The test is
  `packages/circuit/test/read.test.ts`.
- The snippet returns a ReadOutputs without `rOhm`, `cPf` and
  `idleDroopV`, which spec/circuit.ts requires since the M-S exit B
  freeze, so it no longer compiles as written. The name `chargeRelease` is
  taken by release.ts's path-level function (M-S-T05). The port is
  `chargeReleaseRead` with a `leakNa` input; release.ts delegates its read
  record to it, and the flex-pair goldens stay equal.
- The snippet's `crossingUs` repeats `rcCrossingUs` in flex-switch.ts and
  collides with `crossingUs` in spice/engine.ts. The crossing row uses
  `rcCrossingUs`; no second implementation landed.
- Step 1 adc says above 1 Mohm a 100 nF hold capacitor is needed. BOSS
  parts.js:426 (canonical BLOCKS parts.js:702) asks for 100 nF between
  100 kohm and 1 Mohm and says no analog read at or above 1 Mohm. The port
  follows the original: bands fine, hold-cap, digital-only.
- Step 1 column-scan reads columns against internal pull-downs (BAFFLE),
  but McuPinSpec carries a pullup only. The pull-down is a caller input
  until a catalog card adds a pulldown range; no number stands in for it.
- ReadModel `ratiometric` in spec is BAFFLE's swapped drive pair, while
  step 1 names GIB's pull-down rule. Both landed: `swappedPair` and
  `pulldownFloorOhm`, max(1 Mohm, 20 Rsrc) (GIB part3.js:247).
- ReadModel `pullup` allows active high, which needs a pulldown row; the
  model refuses it with E_SCHEMA rather than guess.
- The thresholds in step 1 had no profile rows. Seven constants landed
  with provenance: `read.adc.lineOhm`, `read.adc.analogCeilOhm`,
  `read.adc.holdCapNf`, `read.ratiometric.pulldownRatio`,
  `read.ratiometric.pulldownMinOhm`, `read.ladder.leadOhm` (FEELER Rc
  4000) and `read.ladder.minStepCounts` (25). Files omits
  packages/profile/data/constants.json, docs/plan/PROFILE.md and
  lineage.json, which this card edits.
- The acceptance table prints settle 78.46 us at C 9.109 pF and the Exit
  row prints 78.47 us (the unrounded C); the test holds 78.46 at the
  table's C.
- lineage.json row pip.firmware/pip-controller-b137deb said "the measured
  3500 us key wait (pip.ino:63 to 81)"; pip.ino ships 200 at line 20 and
  lines 63 to 81 hold GUARD_US and the crossing timer. Corrected.
- The M05 verify pass found `classify` (packages/circuit/src/read/pullup.ts)
  untested at its edges: making `v <= vilMaxV` strict survived 655 tests,
  since every probe sat 1e-12 V below the bound, and `v >= vihMinV` had the
  same shape. pullup-low-read.test.ts now reads LOW at VIL max and HIGH at
  VIH min for rp2040 and esp32-c3 (typed from the vendor pages), and LOW at
  the BOSS row's one threshold, holding sim.js line 135 (`p.v > vio * 0.5`
  reads HIGH, so the threshold itself is LOW). Both mutants now fail.
- Audit 2026-10-09: pullup.ts restated the RC time constant
  (`tauUsOf = ohm x pF x 1e-6`) beside `rcTauUs` in flex-switch.ts, which
  the header of that file calls the one implementation; it now calls
  `rcTauUs`. The reject bound `wait / (settleTaus C)` is `rejectOhmAt` and
  the CHK-NET-29 fix wait is `settlingWait`, both in
  read/charge-release.ts (see M05-T19). packages/circuit/test/one-home.test.ts
  fails when a circuit, checks, copper or core command source restates
  tau, the reject bound or R = rho L / A outside its one home.
- Audit 2026-10-09: the ContactRow rows stay owner coupon work. PROFILE.md
  section 12 (D-082 list) now names them with every `electrical.*`
  stand-in they would replace; packages/profile/test/contact-standins.test.ts
  holds `contact()` to null, each listed stand-in to tier inferred and
  never method coupon, and the list to the profile rows whose source waits
  on a ContactRow. No number here is measured.
- Audit 2026-10-09 mutation: `ok: tUs > settleUs` made `>=` survived; no
  test sat a wait on the settle time. read.test.ts now holds a wait equal
  to the settle time to not ok and a wait past it to ok, and acceptOhm to
  touch reads only; the mutant fails.

## M05-T06 circuit.solve and CHK-NET-05 on the operating point

Goal: one command takes a built part or scene, extracts nets, solves the
operating point, classifies each receiving pin per MCU at both pullup
ends, and returns a CommandResult whose findings are check results
(D-064, D-076, D-106).

Inputs:
- spec/commands.ts (CommandName includes circuit.solve), spec/errors.ts (EXIT_CODES)
- packages/checks/seed/checks.seed.json (CHK-NET-05 v2.0.0 from M01-T08; CHK-NET-06, CHK-NET-12)
- ../AGENT-SURFACE.md (CommandResult, text mirror)
- ../CHECKS.md (CHK-NET-05 rewrite, severity D-067)

Steps:
1. Register `circuit.solve` in core with the spec/commands.ts
   `CommandIO["circuit.solve"]` shape. Input `{ build, stimulus, mcu,
   engine, pullup }`: `build` is a chase path, a reference path or an
   hbf://build URI; `mcu` a catalog row id, the port's declared `mcu` when
   null; `engine` "analytic" or "spice", analytic when null; `pullup`
   "range", "min" or "max", range when null. Output `{ nets, points,
   reads }`: `nets` are spec Net records (M05-T04), `points` one
   OperatingPoint per receiving pin and MCU row with a PinReading per
   pullup end used, `reads` one ReadOutputs per port with a read model
   (M05-T05). Check results travel in `CommandResult.findings`, never in
   the output. On the CLI, `--engine`, `--mcu` and `--pullup` set the
   fields of the same name and the positional argument sets `build`.
2. Default engine analytic. `--engine spice` loads M05-T01 lazily and
   records ngspice 45.2 in BuildInputs.
3. CHK-NET-05 run body: measured is the pressed pin voltage at the pullup
   range end that is worst for LOW (the range minimum); legal is `<= VIL
   max` of the row; verdict fail when above; warn instead of pass while
   the path's resistivity tier is inferred (D-081). The fix line names
   the M01 chain: the largest path that reads LOW, then `conductor.width`.
4. CHK-NET-06 run body on adc ports (warn, 100 kohm line).
5. Exit codes: 0 all findings pass or warn, 1 any fail, 2 unknown MCU id
   (E_REF with didYouMean), 4 never (no export here).
6. Text mirror: one line per pin, for example
   `IO2 pressed 1.31 V at pullup 50000, rp2040 band 0.80 to 2.00 V: UNDEFINED (computed, path tier inferred (legacy row))`.

Files to create:
- core/src/commands/circuit-solve.ts
- packages/checks/src/net/net05.ts, packages/checks/src/net/net06.ts
- core/test/circuit-solve.test.ts

Acceptance:
- `npm test -w core -- circuit-solve` exits 0.
- `npx --no-install hbf circuit.solve reference/electrical/blocks-pullup-band --mcu rp2040 --json`
  exits 1 (UNDEFINED is a fail for CHK-NET-05) with the per-pin rows of
  M05-T07.
- `npx --no-install hbf circuit.solve reference/electrical/blocks-pullup-band --mcu nrf52 --json`
  exits 2 with E_REF and didYouMean listing the catalog row ids.
- `npm test -w core -- message-numbers` exits 0 (every number in a
  circuit.solve message recomputes, M01-T05 rule).

Done when: a printed button's readability is one command away and its
answer names the pin, the MCU row and the bound.

Card defects found at build (2026-10-08):
- Acceptance 2 runs on `reference/electrical/blocks-pullup-band`,
  which M05-T07 creates, and M05-T07 needs this card's command. It cannot
  run at this card; it moves to M05-T07. Acceptance 3 runs now: `--mcu`
  is checked against the catalog before anything builds, so an unknown id
  exits 2 with E_REF and didYouMean over the catalog ids whether or not
  the reference exists. circuit.solve reads a built Part IR: nets from
  the conductive bodies (M05-T04) and the chase `hookup`. It has no
  element-list input, so M05-T07's build.ts must emit the BOSS button
  scene as geometry with a hookup entry (the BOSS pin stud and switch
  resistances included), or M05-T07 adds a network input to the command.
- Step 3 makes measured the pressed pin voltage with legal at most VIL.
  The seed row (2.0.0, legal kind interval, constraint
  `circuit/pullup-low-read`) and CHECKS.md 7.5 make the registry form the
  pullup interval in ohm: floor R (VDD - VIL) / VIL, ceiling the internal
  maximum or the declared resistor, measured the low end of the ends
  classified. Built to CHECKS.md 7.5; the volts and states at each end
  travel in extra (`pressedLowV`, `stateLow`, `pressedHighV`,
  `stateHigh`) and in the per-pin text lines. The same inequality, so
  UNDEFINED and HIGH fail either way. A declared external resistor is its
  own ceiling, so any fail on one is E_UNSAT (floor over ceiling).
- The seed row carried `pending: "M05"`, and the registry takes a seed
  pending over a module run body, so CHK-NET-05 would skip "run lands
  M05" forever. The row drops it; seed-conformance-net05.test.ts now
  asserts no pending and a run body. CHK-NET-29 still carries the same
  seed pending with a run body (M05-T19 owns it).
- Files lists four files. Also touched: core/src/registry.ts (CommandDef
  and CLI_FORM), core/src/text.ts (result lines),
  core/src/commands/check-run.ts (exports fromStore for hbf://build),
  core/test/surface.test.ts (the M05 row), core/test/message-numbers.test.ts
  (acceptance 4 had no circuit.solve case), the registered modules
  packages/checks/src/defs/net/CHK-NET-05.ts and -06.ts (net05.ts and
  net06.ts under packages/checks/src/net/ are their run bodies),
  packages/checks/src/views.ts and index.ts (a `circuit` kernel view: a
  feature target carries no Net, so the solved port reaches CHK-NET-05
  through the view), the seed row above and its test,
  packages/circuit/src/solve/ports.ts (the port pass: core may not hold
  circuit logic, PACKAGES.md), packages/circuit/src/release.ts
  (`floatPoint`, the declared charge-release point, factored out of
  `chargeRelease` with its goldens unchanged),
  packages/circuit/src/read/pullup.ts (`solvedV`, the spice engine's
  pressed volts; classification stays in one place),
  packages/circuit/src/constraints/pullup-low-read.ts (exports `whole`
  and `voltsText`), packages/circuit/src/index.ts, lineage.json (row
  pip.model/pip-controller-b137deb-pressed-path) and the M05-T01 note in
  packages/circuit/test/spice-offline.test.ts. spec/commands.ts and
  spec/errors.ts need no edit: CommandName, `CommandIO["circuit.solve"]`
  and EXIT_CODES already carry it.
- No step says what the pressed path is. Built as PIP's key total
  (pip-controller src/model.js lines 395 to 416: Rn + extra + Rsw +
  common): the read net's read path plus the return net's read path,
  `Net.totalOhm` hi ends, the return found through the ContactFeature the
  press closes. The closed contact has no ContactRow and the cap bridge
  needs geometry the Part IR does not carry (`flexCapBridgeOhm` takes
  colGap, colR and cap thickness), so the contact is listed unpriced, the
  path is a lower bound, the point's qualifier is unknown and a passing
  CHK-NET-05 reports warn. M05-T04 prices one terminal pair per net, so a
  return net whose read path ends at another contact (preset `two`, key 2)
  is priced on that pair with warning RETURN_PATH_PAIR.
- Step 1 says `reads` holds one ReadOutputs per port with a read model.
  ReadOutputs is the charge-release record (wait, reject); pullup and adc
  have their own outputs (M05-T05). `reads` holds the charge-release
  records, a pullup port is its OperatingPoint in `points`, an adc port
  reaches CHK-NET-06. The output adds `mcus`, `unsolved`, `warnings`,
  `engine`, `buildInputs`, `results` and `lines`.
- Step 2 records ngspice in BuildInputs, but CommandResult carries no
  BuildInputs and the stored build's must not move with a query flag. The
  output's `buildInputs` is the build's plus `engines.ngspice` and the
  eecircuit-engine licence when the engine ran; buildHash is unchanged.
  The engine solves the pressed dividers only; charge-release reads stay
  closed form (M05-T01 proves the RC agreement), so spice on a build with
  no pullup port is reported not run.
- Inputs name CHK-NET-12; no step runs it here (M05-T10 lands it).
- `stimulus` is typed number or boolean; only a held key (true) has a
  model in M05, a number is E_SCHEMA until the touch and adc references.
  ReadModel pullup `externalOhm: { auto: "e12" }` (P-22) has no solver in
  any M05 card and is refused with E_SCHEMA rather than guessed.
- No reference reads by pullup before M05-T07, and a copied design with
  skeleton-kinds.ts is refused outside DRAFT_KIND_DIRS. The pass and fail
  branches are tested on the flex pair rewired in process: hookup is
  wiring outside the Part IR (D-183), so the same build is solved with a
  pullup entry; the interval fail branch (floor between 50000 and 80000)
  is reached by pricing the same conductors on the vendor
  cpla-protopasta rows. Mutation found that branch untested at first.

## M05-T07 BLOCKS reproduction reference

Goal: the BLOCKS undefined-band result reproduces from circuit.solve at the
BOSS 50 kohm constant within 0.01 V of D-077, and the same scenes get
per-MCU verdicts, with the public scope stated (D-077, C-03).

Inputs:
- designs/blocks/legacy/boss-src/ (M05-T03)
- tools/legacy/boss/dump-elements.cjs (M05-T03)
- fab-knowledge:synthesis/verified-claims.md lines 67 to 72
- fab-knowledge:sources/benches/benches-conductive-b.md B.8
- ../PRIOR-ART.md (claim wording, related work)

Steps:
1. Scene: c3mini press seat, BUTTON (defaults) pressed, IO2 in PULLUP, two
   wires of the same shape, length and core between IO2 and button A and
   between GND and button B. Lengths 10, 40, 80, 120, 150, 170, 200 mm,
   shapes straight, zigzag, spiral; cores cPLA (slot 2) and cTPU (slot 4).
   This runs at BOSS v1 values, the default while D-087 is open.
2. Legacy mode: elements from the dump with `__PU = 50e3`; classify with
   the `boss-legacy` row's `legacy.single` (0.5 VIO) and with its
   `legacy.hintBand` (0.3 to 0.7 VIO, 0.99 to 2.31 V).
3. Per-MCU mode: the same elements with the pullup replaced by each catalog
   row end (rp2040 50000 and 80000; esp32-c3 45000) and classified by
   that row's VIL and VIH. This applies the pin table to the c3mini scene
   as a threshold exercise; a Pico seat scene is not part of the exit.
4. Write `reference/electrical/blocks-pullup-band/` with chase.ts,
   build.ts (the scene), README.md, expected/ (build.json, report.json,
   the table below as report rows) and covers [CHK-NET-05, circuit.solve,
   read pullup].
5. README carries the verified block (D-008): verified on this machine
   with date; checked by machine on geometry (none: element lists from the
   legacy sim); not verified by anything (real pullups and thresholds,
   real wire resistance, D-082). It states, in this order: the BOSS sim
   used a 50 kohm pullup and one 0.5 VIO threshold; the verdict holds for
   short and medium cPLA wires; with the default cTPU wires the press is
   never seen; it applies to carbon-filled filament only. The related-work
   paragraph uses the D-020 wording and the D-021 citations; it never says
   first, only, nobody or nothing else.

Expected table, pressed IO2 voltage (computed, this card, BOSS sim through
the dump, straight wires unless named):

| core, length | V at 50 kohm (BOSS) | BOSS 0.5 VIO read | hint band 0.99 to 2.31 | rp2040 at 50 kohm | rp2040 at 80 kohm | esp32-c3 at 45 kohm |
|---|---|---|---|---|---|---|
| cPLA 10 mm | 1.308 | LOW | undefined | 1.308 UNDEFINED | 0.960 UNDEFINED | 1.392 UNDEFINED |
| cPLA 40 mm | 1.624 | LOW | undefined | 1.624 UNDEFINED | 1.245 UNDEFINED | 1.711 UNDEFINED |
| cPLA 80 mm | 1.917 | HIGH | undefined | 1.917 UNDEFINED | 1.531 UNDEFINED | 2.001 UNDEFINED |
| cPLA 120 mm | 2.122 | HIGH | undefined | 2.122 HIGH | 1.748 UNDEFINED | 2.201 UNDEFINED |
| cPLA 150 mm | 2.240 | HIGH | undefined | 2.240 HIGH | 1.879 UNDEFINED | 2.315 UNDEFINED |
| cPLA 170 mm | 2.307 | HIGH | undefined | 2.307 HIGH | 1.954 UNDEFINED | 2.378 UNDEFINED |
| cPLA 200 mm | 2.392 | HIGH | released | 2.392 HIGH | 2.053 HIGH | 2.460 UNDEFINED |
| cPLA zigzag 200 mm | 2.420 | HIGH | released | | | |
| cPLA spiral 200 mm | 2.397 | HIGH | released | | | |
| cTPU 10 mm | 2.812 | HIGH | released | 2.812 HIGH | 2.583 HIGH | 2.854 HIGH |
| cTPU 40 mm | 3.153 | HIGH | released | 3.153 HIGH | 3.070 HIGH | 3.167 HIGH |
| cTPU 80 mm | 3.224 | HIGH | released | 3.224 HIGH | 3.180 HIGH | 3.231 HIGH |
| cTPU 200 mm | 3.269 | HIGH | released | 3.269 HIGH | 3.250 HIGH | 3.272 HIGH |

The D-077 rows round these to 1.31, 1.62, 1.92, 2.12, 2.24, 2.31, 2.39 V
for cPLA and 3.15 to 3.27 V for cTPU. The cTPU range holds for 40 to 200
mm on every shape (3.153 to 3.270, computed, this card); at 10 to 30 mm
straight the rerun gives 2.812 to 3.108 V. The verdict is unchanged
(HIGH under every row, the press is never seen), and the gap is listed for
DECISIONS.md under Gaps found while writing.

Files to create:
- reference/electrical/blocks-pullup-band/{chase.ts,build.ts,README.md}
- reference/electrical/blocks-pullup-band/expected/{build.json,report.json}
- packages/circuit/test/blocks-band.test.ts

Acceptance:
- `npx --no-install hbf parity reference/electrical/blocks-pullup-band` exits 0.
- `npm test -w packages/circuit -- blocks-band` exits 0 and asserts the
  seven cPLA straight rows equal 1.31, 1.62, 1.92, 2.12, 2.24, 2.31, 2.39
  V within 0.01 V, and every cTPU row from 40 to 200 mm lies in 3.15 to
  3.27 V within 0.01 V.
- Every per-MCU cell above matches its state; the rp2040 row at 50 kohm
  and 80 mm reads UNDEFINED where the BOSS 0.5 VIO read says HIGH.
- `node tools/lint-voice.mjs reference/electrical/blocks-pullup-band` exits 0.

Done when: the BLOCKS claim reproduces from the new solver with its scope
written next to the numbers.

Card defects found at build (2026-10-08):
- The folder was named `blocks-undefined-band`. hbf parity exports a 3MF
  whose object takes the folder name, and CHK-ART-01 refuses any name
  holding the token `undefined` (packages/3mf writer/completeness.ts, the
  TENON fault), so parity stopped at export with E_SCHEMA. The folder is
  `reference/electrical/blocks-pullup-band`; this file, M06, M10, M11,
  CANONS.md, the knowledge records blocks.md, boss.md and MECHANISMS.md,
  and the catalog constant BOSS_REPRODUCTION and its test follow it.
- circuit.solve had no element-list input (M05-T06 card defect), and the
  pin studs and the switch have no ContactRow, so the scene cannot be
  priced from geometry. Built as the element-list input: spec/chase.ts
  SceneDecl gains `legacy` (LegacySceneDecl: sim, elements folder, pin,
  rows), circuit.solve reads it instead of extracting nets
  (core/src/commands/circuit-solve.ts solveLegacy over
  packages/circuit/src/solve/legacy-scene.ts), and CHK-NET-05 runs once
  per scene and row through the circuit view on solve ports
  (`port.<scene>.<row>`) that never enter the Part IR or its buildHash.
  The path CHK-NET-05 prices is V Rpu / (VIO - V) at the BOSS pullup,
  whole ohm; every volt comes from the nodal solve.
- Step 4 lists expected/build.json and report.json as the goldens and the
  table as report rows. hbf parity builds a Part and writes four goldens,
  and report.json holds check results over that Part, so the table cannot
  travel there. The build emits the two wire cores of the default scene
  (80 mm cPLA, BOSS core 1.2 by 0.96 mm, stud pitch 8.0 mm), which no
  table number reads; the table travels as `expected/query-solve.json`, a
  circuit.solve golden declared in queries.json. core parity.ts gains the
  `command: "circuit.solve"` entry (built at the pinned epoch) and
  core/test/message-numbers.test.ts runs its query loop on
  constraints.query entries and traces the circuit.solve text instead.
- The scenes live in the reference (`scenes/`, written by
  `dump-elements.cjs ... --table`, the pressed BUTTON scenes at 50 kohm,
  15 files with the cTPU zigzag and spiral) and are byte equal to the
  M05-T03 fixtures; packages/circuit/test/blocks-band.test.ts checks it.
- The table leaves the per-MCU cells of the cPLA zigzag and spiral rows
  blank; the README table fills every cell from the solve, and the test
  holds the README rows to it.
- The text line prints the hint band as 0.3 to 0.7 VIO, the fractions in
  the boss-legacy row; 0.99 to 2.31 V is a product no output field holds,
  and the M01-T05 message-number rule refuses it.
- Files lists five files. Also touched: spec/chase.ts, core/src/commands/
  circuit-solve.ts and parity.ts, packages/circuit/src/solve/
  legacy-scene.ts, ports.ts (pickEnds exported) and index.ts,
  tools/legacy/boss/dump-elements.cjs (`--table`), queries.json, scenes/,
  core/test/circuit-solve.test.ts (the M05-T06 acceptance 2 now runs here:
  `--mcu rp2040` exits 1), core/test/message-numbers.test.ts,
  reference/test/readme-verified.test.ts (the reference list) and
  lineage.json (fixes on blocks.verdict/boss-src-app2 and
  blocks.sim/boss-legacy).
- CHK-NET-05's fix line on a scene names conductor.width; the element list
  has no conductor to widen. Its run body words every pullup fail the same
  way; left as it is.

## M05-T08 Copper router core: PIP parity, then Float64

Goal: the one router reproduces PIP's route exactly in a test-only legacy
mode, then runs with Float64 costs by default with the invariants intact
(D-092, D-156).

Inputs:
- fab-knowledge:evidence/x/pip-controller/src/router.js (262 lines, canonical copy, b137deb)
- fab-knowledge:evidence/x/pip-controller/src/layout.js lines 30 to 52 (defaults: route w 1.4, clr 0.8, grid 0.5, via 0.8, post 0.6, margin 3.0, iters 24)
- fab-knowledge:sources/latest/haft-toggle.md section 2.5 (algorithm table)
- fab-knowledge:evidence/x/benches-conductive-a/baffle-bench-src/part2.js lines 188 to 200 (Float64 starvation fix)
- fab-knowledge:synthesis/patterns-and-lineage.md 2.7

Steps:
1. Record in lineage.json: router canonical file pip-controller
   src/router.js at b137deb; copies TOGGLE part2c.js (different model),
   BOSS boss.js route(), BAFFLE part2.js makeRouter; fixes carried: BAFFLE
   Float64 (D-156). The copy rows `router/baffle-bench-src` (with the
   Float64 fix) and `router/boss-route` landed ahead of this card, and
   `tools/test/lineage.test.mjs` reads this step and fails when a named
   copy or carried fix has no router row. This step still moves the
   canonical row to the pip-controller file at b137deb, which the seeded
   `router/pip-haft-9` row does not name.
2. Vendor the PIP source at b137deb into `designs/pip/legacy/` with sha256
   per file and a lineage README (D-142). Nothing here edits
   pip-controller (D-080, D-013).
3. Generate the route fixture once with
   `tools/legacy/pip/dump-route.mjs`, run inside a scratch checkout of
   hackbuild/pip-controller b137deb after its own `npm ci` (manifold-3d
   3.5.3 from its lock): it writes the layout input (nets, terminals with
   radii, outline polygons, inside margin samples) and the route output
   (per net polylines per layer, stubs, vias, lengths, conflicts, hot,
   unrouted, iters). hackbuild-fab CI never runs pip-controller; it reads
   the committed fixture and its generator command.
4. Port to `packages/copper/src/route/negotiated.ts` with the constants of
   haft-toggle.md 2.5: 8-connected moves cost 1 or sqrt 2, octile
   heuristic, turn costs 0.35, 0.9, 4, via `7 + pres (zone other + zone
   this) / 2 + hist other`, terminal keepout `r + clr + w/2 + 0.15`, trace
   stencil `w + clr + 0.02`, via stencil `via + clr + w/2 + 0.15`, no
   corner cutting, Prim multi-terminal trees, shortest bbox half perimeter
   first, `pres` 0.6 times 1.7 per iteration, history +0.8 per conflicted
   cell, reroute only conflicted nets after iteration 0, up to `iters`.
5. A test-only flag `legacyFloat32History` keeps PIP's Float32 history
   array for the parity run. The default uses Float64 for g, history and
   every cost (D-092, BAFFLE lesson). The flag is not part of the public
   route options.
6. Output: per net polylines per layer with collinear points removed,
   stubs, vias, length, fails; `conflicts`, `hot`, `unrouted`, `iters`.
   Any unrouted or conflict becomes a warning in Part IR (D-049) that
   CHK-NET-12 reads (M05-T10).

Files to create:
- designs/pip/legacy/ (src/ at b137deb with sha256), designs/pip/legacy/README.md
- tools/legacy/pip/dump-route.mjs
- packages/copper/src/route/{negotiated.ts,heap.ts,stencil.ts,index.ts}
- packages/copper/test/fixtures/pip-b137deb-route.json
- packages/copper/src/route/negotiated.test.ts
- lineage.json (router row)

Acceptance:
- `npm test -w packages/copper -- negotiated` exits 0.
- Legacy mode on the PIP default fixture (computed, this card, PIP
  b137deb with manifold-3d 3.5.3): 12 nets, conflicts 0, unrouted 0, iters
  2, grid 301 x 129 at 0.5 mm, no vias; every polyline equal to the
  fixture point for point; lengths equal to 0.01 mm: GND 215.55, 3V3
  60.31, UP 36.40, DOWN 44.68, LEFT 54.96, RIGHT 25.92, X 34.66, B 49.01,
  Y 22.71, A 59.54, SELECT 28.35, START 24.62 mm.
- Default mode on the same fixture: conflicts 0, unrouted 0; lengths and
  iters recorded in the golden as computed; any length delta against
  legacy is printed in the test output, not asserted.

Done when: the PIP route comes out of packages/copper bit for bit in
legacy mode and clean in default mode.

Card defects found while building (2026-10-08):
- Files names `packages/copper/src/route/negotiated.test.ts`. The root
  vitest include is `packages/*/test/**` and the copper tsconfig compiles
  `src` into `dist`, so the test is `packages/copper/test/negotiated.test.ts`;
  it matches the `-- negotiated` filter.
- Inputs cite `layout.js lines 30 to 52` for the route defaults. At
  b137deb `defaults()` runs from line 24 and the `route` row is line 28.
- Step 3's `npm ci` runs pip-controller's install scripts; in the scratch
  checkout it ran as `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
  --ignore-scripts` (the checkout's own `setup` script skips the browser
  the same way). manifold-3d 3.5.3 came from its lock.
- Files omits what the steps need: `designs/pip/legacy/SHA256SUMS`; the two
  mm pads the router carries (router.js lines 68 and 74) as profile
  constants `route.keepoutPad` 0.15 and `route.zonePad` 0.02 in
  `packages/profile/data/constants.json` and PROFILE.md 10.1;
  `packages/geom/src/segment.ts` (PIP's `GEO.segDist` operand order, which
  the keep-in samples need bit for bit; `packages/circuit/src/path1d.ts`
  and `reference/keys/flex-pair/test/skeleton.test.ts` keep private
  copies in another operand order); `packages/copper/package.json`,
  `tsconfig.json` and `package-lock.json` (geom, spec and profile edges);
  the default-mode golden `packages/copper/test/golden/pip-b137deb-default.json`
  and its writer `packages/copper/scripts/pip-default-golden.mjs --write`.
- The PIP default fixture alone is a weak parity source: it routes in two
  iterations with no vias, and a 90 degree turn cost of 1.0 for 0.9 left
  every polyline equal (tried in a scratch copy, 2026-10-08). The dump also
  records PIP's own seed 1 sweep (test/sweep.mjs, 40 designs: 12 with
  conflicts or unrouted terminals, 25 with vias, up to 25 iterations) as
  `packages/copper/test/fixtures/pip-b137deb-sweep-route.json`, and legacy
  mode equals all 40 point for point (`negotiated-sweep.test.ts`); default
  mode on them is in the golden (`negotiated-sweep-default.test.ts`). Both
  match the `-- negotiated` filter; `packages/copper/vitest.config.ts`
  carries the 60000 ms root floor for the package run (about 75 s wall).
- Float64 history is no uniform gain on that sweep (computed, this card):
  route-level clean designs are 28 of 40 in legacy mode and 27 of 40 in
  default mode. Default converges where legacy did not on design 38 and
  fails where legacy converged on designs 0 and 2. M05-T10's seed 1 sweep
  counts (28 clean, 12 failing loudly) were taken on PIP's Float32 router;
  T10 states which mode its sweep runs.
- Step 6 asks for a Part IR warning. The router returns `warnings`
  (`UNROUTED`, `ROUTE_CONFLICT`, PIP's model.js lines 18 to 19 text); the
  build.ts that calls it attaches them to Part IR, which is M05-T10.
- PIP's `iters` is the converging iteration plus one, and `iters + 1`
  when it never converges (router.js line 259). The port keeps the count
  for parity; CHK-NET-12 (M05-T10) should read `conflicts` and `unrouted`,
  never `iters`, as the verdict.

## M05-T09 Router search layer: TOGGLE assignment, escalation, cache, Manhattan mode, BLOCKS seats

Goal: the router gains TOGGLE's order-preserving assignment DP, layer
escalation and plan-signature cache, a Manhattan mode, and BLOCKS seats
route on it, so both buried-trace lineages run on one package (D-092).

Inputs:
- fab-knowledge:evidence/x/toggle/src/src/part2c.js (4-connected router), part2d.js lines 121 to 143 (assignments), 168 to 260 (tryRoute, routeAll cache of 6, routeSearch)
- fab-knowledge:sources/latest/haft-toggle.md 4.5
- designs/blocks/legacy/boss-src/src/boss.js route() and parts.js seat generators
- fab-knowledge:sources/benches/benches-conductive-b.md B.5, B.6, B.11

Steps:
1. `assignments(nets, terms)`: for every rotation of the terminal ring, an
   order-preserving DP scoring angular distance plus `0.02 x radius`;
   return the distinct maps sorted by cost (part2d.js:121).
2. `routeSearch`: layers tried 1 then 2 when the mode is auto; per layer,
   up to three candidate gaps, up to three assignments (two on the quick
   single-layer pass), two lead variants; first success wins; report
   `tries` and `layers`.
3. Cache: last 6 results keyed by a canonical JSON signature of the plan
   view (terminals, outline, route settings). A hit returns the stored
   result with `cached: true`; a test proves a changed terminal misses.
4. `mode: "manhattan"`: 4-connected moves, Manhattan heuristic, turn 2.5
   per turn, via 30, history +1.5, 22 iterations, pop cap 400000, square
   dilation `R = ceil((w + clr) / g) - 1` cells (TOGGLE constants). This is
   the mode vinyl copper uses when 45 degree lanes are not wanted.
5. TOGGLE parity: dump the four presets' route inputs with
   `tools/legacy/toggle/dump-route.cjs` (loads part2a to part2d with vm, no
   rastermesh needed) and route them through the package.
6. BLOCKS seats: `tools/legacy/boss/dump-route-cfg.cjs` writes each seat's
   router config (obstacles, nets, keep-in, cell 0.4, clr 0.6, traceW 1.0);
   `designs/blocks/src/route-seat.ts` routes them on packages/copper in
   octile mode. The full BLOCKS chase port is M10; this card makes BLOCKS
   build its routing on the package for the D-029 trigger.
7. Sweep inputs are schema-validated before they run: the legacy case
   `{board: 'pico', mount: 'press', pins: 'all'}` (a string where a list is
   expected) returns E_SCHEMA, exit 2, instead of building a 0-pin seat
   that reports clean (benches-conductive-b.md B.11).

Files to create:
- packages/copper/src/route/{assign.ts,search.ts,cache.ts,manhattan.ts}
- packages/copper/src/route/search.test.ts
- tools/legacy/toggle/dump-route.cjs, tools/legacy/boss/dump-route-cfg.cjs
- packages/copper/test/fixtures/toggle-presets/*.json, packages/copper/test/fixtures/boss-seats/*.json
- designs/blocks/src/route-seat.ts, designs/blocks/test/route-seat.test.ts

Acceptance:
- `npm test -w packages/copper -- search` exits 0.
- TOGGLE presets through the package in Manhattan mode (computed, this
  card, TOGGLE legacy): solo4 1 layer 1 try, solo8 1 layer 1 try, blocks4
  1 layer 1 try, blocks8 2 layers 13 tries. Legacy-mode runs (Float32
  costs, as TOGGLE shipped) must equal these; default-mode runs record
  their tries and layers.
- `npm test -w designs/blocks -- route-seat` exits 0 with completion
  counts equal to BOSS (computed by BOSS, benches-conductive-b.md B.6):
  c3mini press 16 of 16, c3mini snap 16 of 16, teensy40 press 28 of 28,
  pico snap (24-pin default) 30 of 30, pico press all 40 pins listed by
  name 40 of 40. Pin-to-stud resistance ranges are recorded as
  informational metrics against BOSS's 6.1 to 51.2 kohm (D-075).
- The `pins: 'all'` case exits 2 with E_SCHEMA.

Done when: TOGGLE's and BLOCKS's routing problems are solved by
packages/copper with their legacy counts.

Card defects found while building (2026-10-08):
- Acceptance runs `npm test -w designs/blocks`, but designs/blocks was no
  workspace. This card created `designs/blocks/package.json`
  (`@hackbuild/design-blocks`), `tsconfig.json`, `vitest.config.ts` and
  `README.md`, added `designs/blocks` to the root `workspaces` and the root
  `tsconfig.json` references, and `package-lock.json` gained the workspace
  link only (no registry version moved).
- No dependency line: the card needs M05-T03 (`designs/blocks/legacy/boss-src`)
  and M05-T08 (`packages/copper/src/route/`).
- Files names `packages/copper/src/route/search.test.ts`; tests live under
  `packages/copper/test/` (the M05-T08 defect), so it is
  `packages/copper/test/search.test.ts`.
- Files omits what the steps need: the fixtures
  `packages/copper/test/fixtures/toggle-presets/{solo4,solo8,blocks4,blocks8}.json`
  and `boss-seats/*.json`; the default-mode golden
  `packages/copper/test/golden/toggle-presets-default.json` and its writer
  `packages/copper/scripts/toggle-default-golden.mjs --write`; the seat
  golden `designs/blocks/test/golden/route-seat.json`
  (`HBF_SEAT_RECORD=1`); the five mm lengths of part2d.js lines 171, 176,
  197, 229 and 237 as profile constants `route.stick.grid` 0.2,
  `route.stick.edgePad` 0.6, `route.stick.leadR` 0.65, `route.stick.comR`
  0.71 and `route.stick.leadHalf` 0.5 (`packages/profile/data/constants.json`,
  PROFILE.md 10.1); `packages/copper/src/route/index.ts` and
  `src/index.ts` exports and the surface list in
  `packages/copper/test/negotiated.test.ts`; the lineage fixes rows.
- Inputs name `evidence/x/toggle/src/src/`; the lineage source of record is
  `originals/toggle/files/src/src/` (byte identical, sha256 compared). The
  dump reads the originals and pins part2a to part2d.
- Step 6 says octile mode, and the octile router's terminals are discs.
  A BOSS pin pad is a 1.8 mm square (a snap bump 2.0 x 1.4) on the 2.54
  pitch: a disc of the pad's half width let copper come 0.34 to 0.49 mm
  from a foreign pad (computed, mutation M4 in
  `fab-knowledge/evidence/m05-scratch/t09-mutations.log`), and the
  circumscribed disc closes the pad row. `RouteTerminal` gained an optional
  rectangular `pad` whose keepout is the rectangle grown by clr + w/2 + the
  keepout pad (`markStaticRect`, BOSS's rectangle dilation of boss.js lines
  147 to 149); PIP's fixtures carry no pad and stay bit equal.
- The octile seat routes use vias where BOSS's router has none: c3mini
  press 1, pico snap 5, the other three 0 (computed). The BOSS seat stack
  has no via feature (L1 and L2 sit 0.48 mm of PETG apart); the M10 seat
  port emits a via plug (TOGGLE emits a w x w cPLA square in the separation
  layer, part2d.js line 299) or routes with vias barred.
- Step 7: BOSS's own sweep also passes `hinge: 'hooks'` (sweep.js line 5),
  no SEAT_PARAMS option; seat() treats it as none. The schema refuses it
  (E_SCHEMA, exit 2) along with `pins: 'all'`, an unknown key, a pin the
  board lacks, an off-step length, an unknown board and an empty pin list;
  the layout parity runs those sweep seats at hinge none.
- The canonical BLOCKS parts.js (lineage `blocks.parts/blocks-1`) has
  another seat (pin sockets with 2.6 x 1.9 landings, height 9.6 or 12.8,
  pegs). The card names the BOSS copy and D-087 keeps BOSS v1, so the port
  reads `blocks.parts/boss-legacy`; both rows record it.
- TOGGLE's cache key is a hand-picked field list (part2d.js line 210). The
  port keys the whole plan view and the `route.stick.*` values by RFC 8785
  canonical JSON.
- Default mode (Float64) on the four presets gives the legacy tries and
  layers, 1, 1, 1, 13 and blocks8 on 2 layers (computed). With route mode
  `1` there is no quick pass, so blocks8 makes 3 x 3 x 2 = 18 tries and
  fails loudly with UNROUTED.
- The seat layout parity covers ten BOSS seats: the five acceptance seats,
  the other four of BOSS's sweep and a four-pins-a-side c3mini seat whose
  lane budget (parts.js lines 81 to 83) adds a column; without that seat a
  lane pitch mutation survived (computed, mutation M2).
- Pin to stud estimates by BOSS's own formula (parts.js line 175, rho 30
  ohm cm, 400 ohm contact) on the octile route lengths: 5.6 to 23.0 kohm
  over the five seats against BOSS's 6.1 to 51.2 kohm (computed,
  informational, D-075).

## M05-T10 PIP buried stack reference: routes, net floor, zero silent failures

Goal: the PIP buried stack builds from profile defaults, every net is one
piece, net-to-net is at least 0.60 mm at 1.4 mm traces, and no routing or
clearance failure ever leaves a passing verdict (D-085, D-084, C-06).

Inputs:
- packages/copper (M05-T08), packages/circuit extraction (M05-T04)
- fab-knowledge:evidence/x/pip-controller/src/model.js lines 30 to 48 (trace layer per net from one 2D region closed by 0.01), 207 to 224 (minGap)
- fab-knowledge:evidence/x/pip-controller/print/print-card.txt (fits: trace 1.40, net to net 0.60, insulation 0.96, PETG over L2 1.68)
- fab-knowledge:evidence/x/pip-controller/test/sweep.mjs
- packages/checks/seed/checks.seed.json (CHK-NET-01, -02, -11, -12; CHK-KEY-03)

Steps:
1. Profile stack defaults (D-085), rows with tier inferred and source
   pip-controller src/layout.js:28: layer 0.24, skin 0.72, trace layer
   0.72, isolation 0.96, PETG over layer 2 1.68 on the 0.72 floor, trace
   width 1.40, net-to-net floor 0.60. Retire v3 0.48 insulation, 0.48 over
   L2 and the 0.3 net floor in the seed.
2. Bleed: profile field per (machine, material pair), default 0, applied
   once at emit (D-084). With 0 the emitted trace is 1.40 mm wide.
3. Emit each trace layer per net as one 2D region: strokes, stubs, post
   and via discs (radius moved off `w/2` by 0.12 when within 0.12),
   unioned, closed by +0.01 then -0.01 Miter (CHK-NET-11 rule).
4. Check run bodies:
   - CHK-NET-01: one piece per declared net (extraction, M05-T04).
   - CHK-NET-02: net-to-net `minGap` over every pair, legal at least the
     profile net floor 0.60, measured and both net names in the result.
   - CHK-NET-11: emitted per net from one region; post and via radii more
     than 0.12 from half the trace width.
   - CHK-NET-12: any `unrouted > 0`, `conflicts > 0`, or a pair under the
     net floor is a fail naming nets and hot spots. A route problem can
     never coexist with a pass verdict.
5. Reference `reference/electrical/pip-buried-route/` builds the PIP
   default layout from the M05-T08 fixture through copper and the kernel
   stages, extracts nets and runs the checks.
6. Sweep test with fast-check (seeded, shrinking, path replay) over the
   PIP generator space of test/sweep.mjs, driven from the dumped layouts:
   for every case assert the property "routing clean and net gap at least
   0.60, or CHK-NET-12 or CHK-NET-02 fails naming the nets".

Files to create:
- packages/profile/seed/profile.seed.json (stack rows)
- packages/copper/src/emit/trace-layer.ts
- packages/checks/src/net/{net01,net02,net11,net12}.ts
- reference/electrical/pip-buried-route/{chase.ts,build.ts,README.md,expected/}
- packages/checks/test/net-sweep.property.test.ts
- tools/legacy/pip/dump-sweep.mjs, packages/copper/test/fixtures/pip-sweep-seed1/*.json

Acceptance:
- `npx --no-install hbf parity reference/electrical/pip-buried-route` exits 0: 12 nets
  each in one piece, conflicts 0, unrouted 0, net-to-net 0.600 mm
  (computed, this card: 0.59999999; closest pairs GND with X, B, Y, A,
  which are the click-spring floor pads split by 0.60), next closest B/Y
  0.714, 3V3/UP 0.716.
- Z stack in build.json (computed, PIP b137deb): L1 0.72 to 1.44, L2 2.40
  to 3.12, pads 4.08 to 4.80, floor 4.80; isolation 0.96, over L2 1.68.
- `npm test -w packages/checks -- net-sweep` exits 0. The PIP baseline it
  must classify (computed, this card, sweep.mjs seed 1, 40 designs, 74 s
  on this host): 28 designs route clean with net gap at least 0.600; 12
  carry unrouted connections (2 to 5) or conflicts (1 to 20); 9 of those
  12 have a net gap from 0.000 to 0.528 mm. PIP's own floor warns only
  under 0.3 and its fits table fails under 0.4, so gaps from 0.4 to 0.6
  pass there; here all 12 fail CHK-NET-12 or CHK-NET-02, and the 28 pass.
- A forced failure (iters 1 on a design that needs 2) returns CHK-NET-12
  fail, exit 1, never pass.

Done when: the buried stack routes from profile defaults and the sweep
finds zero silent failures.

Card defects found while building (2026-10-08):
- Step 1 cites `src/layout.js:28` for the stack rows. At b137deb the
  `stack` row is line 27 and `route` (trace width 1.4) line 28.
- Files names `packages/profile/seed/profile.seed.json (stack rows)`. The
  rows the lookup serves live in `packages/profile/data/constants.json`
  (as M05-T04 found): `stack.skin`, `.trace`, `.iso`, `.overL2`,
  `.traceWidth`, `.netToNetMin`, plus PIP's emit pads as
  `route.postSep` 0.12, `route.discPad` 0.05, `route.regionClose` 0.01,
  `route.postOverlap` 0.02 and `route.gapSearch` 1.0 (model.js lines 8,
  27, 41 to 43, 48 and 221), all inferred and listed in PROFILE.md 10.1.
  The seed holds no 0.48 insulation, 0.48 over L2 or 0.3 net floor to
  retire. Bleed needed no new field: `profile.bleed()` already returns
  the default 0 (D-084).
- The M-S footprint form of CHK-NET-02 (`skeleton/net02.ts`, flex-pair)
  still types the 0.6 mm floor. Moving it onto `stack.netToNetMin` adds a
  readsInferred row to `reference/keys/flex-pair/expected/report.json`;
  left for the card that next re-accepts flex-pair (M05-T19 or -T20).
- Step 5 cannot build on the stage path as written: every conductor
  feature in a design without draft kinds meets `noGenerator`
  (core/src/load-build.ts) and no card admits the kind. Built here:
  `packages/circuit/src/kinds/conductor.ts` (the flex-pair draft's
  geometry, version 1.0.0), registered under the circuit kernel in
  core/src/kinds.ts, with `KernelCtx.slots` added to spec (optional)
  since a ConductorFeature names a material and no slot (skeleton
  finding F-03). registryHash moved for blocks-pullup-band,
  capricate-touch and trace-width-budget; their goldens were re-accepted
  with only registryHash-derived values moving. This also unblocks
  M05-T17 step 7. Two conductor defs under one kind id left every build
  linking `featureKind:conductor` stale in the project graph, so the
  flex-pair draft entry now delegates to the package def (one
  implementation, same geometry): flex-pair's defHash, registryHash and
  buildHash moved with every mesh hash equal, its goldens and print card
  were re-accepted and the virtual print reran (G-code equal but for its
  generated-at line, evidence/virtual-print/m05-t10/).
- Step 5 says the reference builds through copper. A build module imports
  only `@hackbuild/spec` and relative files (BUILD_IMPORTS, D-178), so the
  router and the emit run in `packages/copper/scripts/pip-buried-route.mjs`
  into `route.data.ts` and build.ts places them; the reference test reruns
  the generator and fails on any difference, and build.ts refuses data
  generated against other profile values (E_STALE). The data holds one run
  per distinct route over caps 1 to 24 (the router stops at convergence),
  so the `iters` param builds the forced failure.
- Acceptance line 1, net-to-net 0.600 mm with GND against X, B, Y and A:
  those pairs are PIP's click-spring floor pads (model.js line 100), PIP
  button geometry the buried stack does not build (M06 canon). The
  built closest pair is B/Y 0.716 mm and 3V3/UP 0.717 (PIP's own model,
  0.714 and 0.716: the extra 0.002 is the stage 6 coincidence inset on
  both sides); every pair is at least 0.60.
- Acceptance line 2, Z stack in build.json: build.json holds hashes and
  volumes only. The stack lands as Part IR metrics `stack.*`, asserted
  by reference/electrical/pip-buried-route/test/reference.test.ts.
- Acceptance line 3: the sweep baseline runs the router in legacy mode
  (PIP bit equal, as M05-T08 found the counts were taken on PIP's Float32
  router); the fast-check property runs the public default mode at drawn
  iteration caps. The nine gaps 0.000 to 0.528 equal on PIP's full model
  and on the copper stack (the twelve's closest pairs are trace pairs).
  `tools/legacy/pip/dump-sweep.mjs` took 75 s here. checks has no vitest
  config, so the sweep tests carry their own timeouts.
- CHK-NET-12's seed target is project. circuit.solve hands it a one-part
  ProjectGraph and the `part` and `extraction` views; its result targets
  the part. No seed row changed version.
- Files omits: `packages/copper/src/emit/route-record.ts` (route metrics
  and trace feature ids, one writer and one reader), circuit `netGaps`
  and `ExtractInput.gaps`, the checks views, core circuit-solve and the
  core to copper edge (package.json, lock, tsconfig), three lineage rows,
  the reference's chase.ts, route.data.ts, queries.json, tsconfig.json
  and test/, and the three READMEs and reference/test/readme-verified.test.ts.

## M05-T11 PIP drive readouts reference

Goal: the per-key path resistance, tau, settle and reject that the PIP
bench prints come out of circuit and the read model from PIP's geometry,
with every figure qualified (D-079, C-06).

Inputs:
- designs/pip/legacy/ (M05-T08)
- fab-knowledge:evidence/x/pip-controller/src/model.js lines 381 to 438
- fab-knowledge:evidence/x/pip-controller/docs/electrical.md lines 96 to 113 (pin map), 143 to 162 (measured crossings)
- fab-knowledge:evidence/x/pip-controller/README.md lines 155 to 180
- fab-knowledge:synthesis/verified-claims.md lines 11, 14, 15

Steps:
1. `tools/legacy/pip/dump-elec.mjs` (same scratch checkout as M05-T08)
   writes per key: trace length with stubs, via count, post heights and
   radii, switch resistance Rsw, common path (GND or 3V3), C, and the
   bench row (R, tau, reject).
2. In circuit, compose each key path as PIP does: `Rtrace(len) + 2
   Rpost(floor - L1, post r) + vias x Rpost(L2 top - L1 bottom, via r) +
   extra + Rsw + common`, where Rtrace uses the cpla `along` row (500 ohm
   cm, inferred), Rpost the `through` row (2000, inferred), and Rsw is
   taken from the fixture as a declared contact resistance (inferred;
   the switch geometry formulas move to the archetypes in M06).
3. Read model charge-release (M05-T05) with wait 200 us for the parity run
   (PIP bench `phys.waitMech` 0.2 ms) and the emitted default 3500 us
   (measured, pip_stick) for the reference's shipped record.
4. Cross-check the slowest key's crossing with eecircuit (M05-T01).
5. Write `reference/electrical/pip-drive/` with covers [read
   charge-release, CHK-NET-12 (via the route), circuit.solve]. README
   verified block lists: verified on this machine (computed rows);
   measured on a printed body by the owner, from pip-controller docs (press
   crossings 113 us RIGHT to 2431 us UP, idle 6.5 to 17.8 ms); not verified
   by anything here (contact resistance on the shop's spools, RP2040
   leakage, D-082). It names the pip.ino 200 us versus pip_stick 3500 us
   gap and that the owner decides (D-080).

Files to create:
- tools/legacy/pip/dump-elec.mjs, packages/circuit/test/fixtures/pip-b137deb-elec.json
- reference/electrical/pip-drive/{chase.ts,build.ts,README.md,expected/}
- packages/circuit/test/pip-drive.test.ts

Acceptance:
- `npm test -w packages/circuit -- pip-drive` exits 0; with the legacy
  route lengths every key R equals the bench within 1 ohm and tau within
  0.001 us (computed, this card):

| key | pin | type | R ohm | C pF | tau us |
|---|---|---|---|---|---|
| UP | GP29 | flex | 1630665 | 8.738 | 14.249 |
| DOWN | GP26 | flex | 1671506 | 8.903 | 14.881 |
| LEFT | GP28 | flex | 1722798 | 9.109 | 15.694 |
| RIGHT | GP27 | flex | 1578599 | 8.528 | 13.462 |
| X | GP3 | clicky | 1564030 | 8.700 | 13.607 |
| B | GP6 | clicky | 1634986 | 8.986 | 14.692 |
| Y | GP5 | clicky | 1504700 | 8.461 | 12.731 |
| A | GP4 | clicky | 1687980 | 9.200 | 15.529 |
| SELECT | GP12 | touch | 929388 | 8.569 | 179.339 (with 20 Mohm skin) |
| START | GP10 | touch | 910897 | 8.494 | 177.622 (with 20 Mohm skin) |

- Summary figures (computed): key paths 1.50 to 1.72 Mohm, touch paths
  0.91 to 0.93 Mohm, slowest key tau 15.7 us, settle 78 us (5 tau), key
  reject at 200 us 4.35 Mohm (A), touch accepts under 58.4 Mohm, idle
  droop 0.21 V at 1 nA over 1.5 ms (leakage inferred).
- With the default-mode route of M05-T08, the same ranges hold (keys 1.50
  to 1.72, touch 0.91 to 0.93 Mohm after rounding); per-key values are
  recorded in the golden.
- `npx --no-install hbf parity reference/electrical/pip-drive` exits 0.
- The eecircuit transient for LEFT crosses 0.8 V at 22.24 us, equal to the
  analytic value within 1e-6 relative.

Done when: the drive readout a person sees on a PIP stage overlay is a
circuit result with its qualifiers, and the measured crossings sit beside
it with their source.

Card defects found while building (2026-10-08, audited 2026-10-09):
- Step 5 covers lists `CHK-NET-12 (via the route)`. This folder builds
  no route: a build module imports only `@hackbuild/spec` (D-178), so
  build.ts lays one straight prism per net over the declared lengths, and
  CHK-NET-12 on the same route is covered by
  `reference/electrical/pip-buried-route` (M05-T10). The README covers
  line is [command:circuit.solve, read:charge-release].
- Step 2 says "in circuit" with no declaration to compose from. Built:
  `scene.drive` (`DriveSceneDecl`, `DriveNetDecl`, `DriveKeyDecl` in
  spec/chase.ts, additive); `packages/circuit/src/solve/drive-scene.ts`
  (`driveKeys`, `solveDriveScene`, `drivePortFeatures`); `postLeg` in
  path1d.ts (a cylinder over pi r^2, as PIP prices a post at model.js
  line 393); `chargePort` factored out of `solvePorts` in
  ports.ts so the extracted and the declared path share the one
  charge-release reader; `solveDrive` in core/src/commands/circuit-solve.ts.
  A chase computes nothing (D-178), so the hookup and `scene.drive` are
  written between markers by `packages/copper/scripts/pip-drive-scene.mjs
  --write`, and the reference test reruns it and fails on any difference.
- Files omits all of the above, plus the reference's queries.json,
  tsconfig.json and test/reference.test.ts, the shared fixtures
  `packages/checks/test/metric-gates/builds.json`,
  `packages/project/test/fixtures/graph.jsonl` and
  `reference/test/readme-verified.test.ts`, and the lineage row
  `pip.model/pip-controller-b137deb-drive`.
- Step 1: PIP keeps the posts in locals, so dump-elec.mjs wraps model.js
  lines 393, 396, 399 and 430 in memory (each found once, values
  unchanged) and refuses unless every total rebuilds within 1e-12
  relative. Rerun 2026-10-09 against
  `fab-knowledge/evidence/m05-scratch/pip-b137deb`: byte identical to the
  committed fixture.
- Step 3: the 200 us parity run is `packages/circuit/test/pip-drive.test.ts`
  (keys at `phys.waitMech` 0.2 ms, touch at `phys.waitTouch` 1.5 ms). The
  reference reads keys at 3500 us and touch at 1500 us (pip_stick.ino
  lines 25 and 31; the card names no touch wait), with pip.ino's 200 us on
  every key read as `wait.firmwareShipped`, qualifier unknown (D-080).
  `emitWait` now cites line 31 for a low drive.
- Summary, idle droop 0.21 V: PIP divides by the 7 pF pin alone (model.js
  line 433). The read record divides by the node, 8.5 pF, and gives
  0.18 V. The test holds both.
- Step 4 runs in the test, not in parity: circuit.solve on a drive scene
  reads the closed form (`rcCrossingUs`) and its line says spice not run.
- The default-mode route lands on PIP's legacy polylines for this
  layout, so per key paths agree within 1e-6 relative of the legacy ones.
- report.json carries CHK-PRT-05 warn: the 0.72 mm traces do not land on
  an ffc5p layer top. No figure reads the bodies.

## M05-T12 Capricate reproduction reference

Goal: Capricate's 30 kohm ceiling for capacitive electrodes in cABS falls
out of circuit.solve and the constraint solver on a rebuilt case, with the
cABS row and the citation corrected (D-021, C-12, C-13).

Inputs:
- fab-knowledge:evidence/x/web-hci-fab-research/capricate.txt lines 172 to 180 (routing to nearest endpoint, no schematics), 316 to 324 (trace size), 400 to 425 (resistivity, 30 kohm, 0.2 mm, 0.8 mm, 10 cm)
- fab-knowledge:research/hci-fabrication-prior-art.md 2.2 (Capricate numbers)
- fab-knowledge:synthesis/verified-claims.md lines 45, 158
- ../PRIOR-ART.md (claim wording, related-work table)

Steps:
1. Add ConstraintDef `circuit/capacitive-path-ceiling`: dim `net.ohm` on a
   capacitive electrode net, Bound 30000 ohm, kernel circuit, reason
   "SNR under 5:1 above 30 kohm for 5 to 20 mm electrodes in cABS",
   source Schmitz et al., UIST 2015 (measured by others). `net.ohm` is the
   per-net form of ConstraintDim (spec/constraints.ts). It inverts to a
   length ceiling on `conductor.pathLen` for a declared section:
   `L <= 30000 w t / rho`.
2. Add the check row for this bound as a new CHK-NET entry: id is the next
   free CHK-NET number from the seed tooling (never typed into this
   file), title "capacitive electrode path at most 30 kohm (Capricate SNR
   5:1)", origin {design: Capricate reproduction, date 2015, failure:
   "SNR fell under 5:1 above 30 kohm", numbers: "20 to 120 kohm in 10
   kohm steps, electrodes 5, 10, 15, 20 mm"}. ../CHECKS.md lists it.
3. Reference `reference/electrical/capricate-touch/`: cABS electrodes of
   diameter 5, 10, 15, 20 mm, 0.2 mm thick, each with a declared series
   resistor 20 to 120 kohm in 10 kohm steps (44 cases), plus the minimal
   trace case 0.8 x 0.2 mm, 100 mm long, printed along the flow. In the 44
   sweep cases the resistor's terminals sit on the electrode edge and on
   the sensing pad, so the lead length is 0 mm and the path resistance is
   the declared resistor alone; Capricate's series resistors stand in
   for trace resistance in the same way. The electrode disc is the
   sensing surface and is not part of the path. circuit.solve computes
   each net's resistance (the resistor plus any conductor segments, from
   the cabs-capricate row, M05-T04); the check reads that total. The
   golden records the lead length (0 mm) and the conductor share (0 ohm)
   per case, so a later layout that adds a lead moves the totals
   visibly instead of silently flipping the 30 kohm cases.
4. README verified block; the related-work paragraph describes Capricate
   as routing each electrode to its nearest endpoint with A* on a 3D grid
   inside the model, design intent in and geometry out; hackbuild-fab's
   direction (nets derived from built geometry, solved against the pin) is
   stated with the D-020 wording, "none found in the surveyed literature"
   only for multi-material printed nets with anisotropic resistance.

Files to create:
- packages/circuit/src/constraints/capacitive-path-ceiling.ts
- packages/checks/seed/checks.seed.json (new CHK-NET row), packages/checks/src/net/capacitive-ceiling.ts
- reference/electrical/capricate-touch/{chase.ts,build.ts,README.md,expected/}

Acceptance:
- `npx --no-install hbf parity reference/electrical/capricate-touch` exits 0.
- Sweep verdicts (computed, this card): for each of the 4 sizes, 20 and 30
  kohm pass (the 30 kohm case measures 30000 ohm, on the bound, legal at
  most 30000), 40 to 120 kohm fail; 8 pass and 36 fail over 44 cases; the
  fail message names 30000 ohm and the Capricate source.
- Minimal trace, 100 mm along: 2738.8 ohm, pass (computed). Capricate
  reports reliable sensing up to 10 cm for minimal traces (measured by
  others); the reproduction agrees in direction (inside the ceiling).
- `npx --no-install hbf constraints.query conductor.pathLen --material cabs-capricate --facts wMm=0.8,tMm=0.2,capacitive=true --json`
  exits 0 with a length ceiling 1095.4 mm along (computed:
  30000 x 0.08 x 0.02 / 0.4382 cm) and, with `--facts direction=across`,
  587.4 mm (0.8171 ohm cm).
- `node tools/lint-voice.mjs reference/electrical/capricate-touch` exits 0.

Done when: "Capricate did this in 2015" is answered by a green reference
that reproduces its ceiling and names what differs.

Card defects found while building (2026-10-08):

1. Step 2 asks for a new CHK-NET row at the next free number. CHK-NET-28
   was already entered by M04-T12 with this title and constraint
   `circuit/capacitive-path-ceiling`, pending M05, so no row was added.
   The build landed its run body (`packages/checks/src/net/capacitive-ceiling.ts`,
   wired in `packages/checks/src/defs/net/CHK-NET-28.ts`), dropped
   `pending`, and took a patch to 1.0.1 for the sweep numbers and the
   `capricate.txt` evidence in its origin (CHECKS.md 1.3).
2. The acceptance command names `--material cabs-capricate`. The profile
   material is `cabs`, with rows `cabs.capricate.along`, `.across` and
   `.through`; the command runs as `npx --no-install hbf constraints.query
   conductor.pathLen --material cabs --facts wMm=0.8,tMm=0.2,capacitive=true --json`.
3. Step 1 types the 30 kohm ceiling into the def. Every physical number
   comes from profile, so it is profile constant `capacitive.pathCeilOhm`,
   30000 ohm, tier community, method coupon (PROFILE.md 10.1), and the def
   reads it.
4. The Files list misses what the card needs to run: `spec/chase.ts`
   (`SceneDecl.series`, declared series nets),
   `packages/circuit/src/solve/series-scene.ts`, the series branch and
   CHK-NET-28 in `CIRCUIT_SOLVE_CHECKS` in `core/src/commands/circuit-solve.ts`,
   `packages/checks/src/views.ts` (the circuit view answers a series net),
   `packages/profile/data/constants.json`, the M01 package placement row
   for the new def, and the tests `packages/circuit/test/capricate.test.ts`,
   `packages/checks/test/capacitive-ceiling.test.ts` and
   `core/test/capricate-touch.test.ts`.
5. Step 3 reads as built geometry, but the conductor and port kinds load
   only as the flex-pair draft kinds until M05-T14 and M05-T18 admit them,
   and a mesh holds no resistor. The 45 nets are declared in
   `scene.series` (electrodes, leads, resistor per net); `build.ts` builds
   the four discs and the lead from that declaration, and `circuit.solve`
   prices each lead with path1d `legOf`. The nets and their capacitive
   ports are the solve's own and never enter the Part IR.
6. No 3MF: the profile has no harvested ffc5p preset for cABS (ABS) and
   the writer refuses a guessed row, so the chase declares only `stl`.
   Parity, check.run, the message-numbers test and the determinism hashes
   now write a 3mf package only when the chase declares one
   (`declares3mf`, core/src/commands/build.ts).
7. The minimal trace computes 2738.75 ohm (2738.7499999999995 in binary);
   2738.8 is its one-decimal rounding. Messages print 2738.75 and the
   tests hold it within half a unit of 2738.8.
8. Adding a ConstraintDef moves the registryHash of every part.build
   reference (D-243). The build re-accepted the seven other references
   (only registryHash and the hashes over it moved; every mesh hash and
   volume is unchanged), added an M05-T12 line to each README's verified
   block, regenerated the flex-pair print card, re-sliced it headless
   (`fab-knowledge:evidence/virtual-print/m05-t12/`:
   G-code equal to M05-T14's but for its generated-at line, the analysis
   equal from its summary on, `validate_3mf.py --overlap` 26 checks, 0
   failed), and rewrote the CHK-ART-02 fixtures, the metric record and the
   project graph fixture through their accept switches.
9. CHK-PRT-05 warns on the reference: the 0.2 mm electrodes and lead do
   not land on a layer top of the ffc5p preset (0.24 mm layers). Capricate
   printed at 0.2 mm on its own machine.

Later reference task, not an M05 exit row: the reverse check
(syn/plan-deltas.md section 5 idea 2; research/hci-fabrication-prior-art.md
idea 2). Export the capricate-touch minimal trace case (0.8 x 0.2 mm,
100 mm along) and its insulating body as an STL pair, then build them back with `part.build` and two `import` entries
(M04-T14), the electrode with `material: "cabs-capricate"` and the body
with an insulating material. Net extraction (M05-T04) and circuit.solve
then run on geometry another tool could have made, and the result must
equal the native case: 2738.8 ohm, pass (computed). The series-resistor
cases carry declared resistors that a mesh does not hold, so they stay
native only. The same path runs on
other tools' published outputs when a file is found, and each run is
published with the related-work table (PLAN.md section 2.4). Written as
`reference/electrical/capricate-reverse/` once M05 exits; it reads no
new kernel.

- Audit 2026-10-09 (independent recompute from `capricate.txt`): the
  44 cases, 8 pass and 36 fail, and the 1095.4 and 587.4 mm ceilings
  recompute equal. The paper gives no per-case results; the split reads
  "should not exceed 30 kohm" as including 30 kohm (4 pass and 40 fail
  otherwise), and the length ceilings are where R = rho L / A reaches
  30 kohm, untested past the paper's 10 cm. The Exit row qualifier said
  "computed from rows measured by others", which overstated the case
  split; the row and the reference README now say both.

## M05-T13 KEYWAY family oracle with shipped inputs

Goal: the seven vinyl copper generators run from inputs shipped in the
repo and reproduce their gate counts and stats exactly, so the package
port has an oracle. The logo and font inputs were unshipped in the bench
folders (syn/plan-deltas.md line 973); they exist in the corpus and are
vendored here, so nothing is fabricated (D-149).

Inputs:
- fab-work-directory:benches/cricut-midi-seven/outputs/{keyway,vernier,quadrant,spline,tessera,fret,stave}/ (gen_<name>.py, svgpath.py, <name>_geometry.json)
- fab-work-directory:benches/cricut-midi-seven/outputs/board-forge-updated.zip, member board-forge/assets/hackbuild-logo.svg (dated 2026-08-10)
- fab-knowledge:evidence/x/benches-conductive-b/gen/ (rerun, run.txt per generator)
- @fontsource/ibm-plex-mono 5.3.0 files ibm-plex-mono-latin-{400,600,700}-normal.woff2 (OFL-1.1)
- fab-knowledge:sources/benches/benches-conductive-b.md A.1 to A.13

Steps:
1. Copy each generator folder's gen_<name>.py and svgpath.py into
   `reference/copper/<name>/legacy/` unchanged, with sha256 in a lineage
   README. svgpath.py is identical in all seven (sha256 5d568680...7864).
2. Ship inputs in `reference/copper/_inputs/`: hackbuild-logo.svg (sha256
   c0b0c1f6...8c02, the owner's mark), the three woff2 files (sha256
   400: 08949f72...80f7, 600: 0d1f0b8d...df83, 700: 4f84d86c...765a) with
   the OFL-1.1 licence text beside them. Record them in ../LICENSING.md.
3. Write `tools/py/copper/run_legacy_gen.py`: copies the three woff2 next
   to the generator in a temp dir (the scripts read `HERE + '/ibm-plex-mono-latin-*.woff2'`),
   reads the generator source, replaces the literal
   `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg` with the
   shipped logo path in memory, sets `<NAME>_OUT` to a temp dir, and
   executes it. The legacy files on disk stay byte identical.
4. Pin the Python side in `tools/py/pyproject.toml`: shapely 2.1.2,
   fonttools 4.66.1, brotli 1.2.0 (the rerun's versions).
5. The oracle compares the run's `<name>_geometry.json` params and stats
   to the shipped file exactly, counts PASS and FAIL lines, and reads the
   min clearance line. Path strings are not compared (the rerun found
   vertex differences under 0.1 mm from a different GEOS build).

Files to create:
- reference/copper/{keyway,vernier,quadrant,spline,tessera,fret,stave}/legacy/ (gen_<name>.py, svgpath.py, <name>_geometry.json, README.md)
- reference/copper/_inputs/ (logo, three woff2, OFL.txt, README.md with sha256)
- tools/py/copper/run_legacy_gen.py, tools/py/copper/test_oracle.py

Acceptance:
- `uv run --project tools/py tools/py/copper/test_oracle.py` exits 0 with, per generator
  (computed, this card, Python 3.14.6, shapely 2.1.2):

| board | gates passed | failed | min clearance mm | tightest pair | gate |
|---|---|---|---|---|---|
| KEYWAY | 45 | 0 | 1.000 | P3/SA | 0.70 |
| VERNIER | 60 | 0 | 1.200 | B5/B6 | 0.90 |
| QUADRANT | 59 | 0 | 1.203 | B3/B4 | 0.90 |
| SPLINE | 85 | 0 | 1.000 | L1_A/L1_B | 0.90 |
| TESSERA | 85 | 0 | 1.100 | T1/T2 | 0.90 |
| FRET | 95 | 0 | 1.000 | K10/K15 | 0.90 |
| STAVE | 57 | 0 | 1.200 | D1/L1_A | 0.90 |

- params and stats of every geometry JSON equal the shipped file.
- `git diff --stat reference/copper/*/legacy` is empty after the run.

Done when: the KEYWAY family regenerates in CI from the repo alone.

Card defects found while building (2026-10-08):
- Step 2 and Files name the licence text `OFL.txt`; LICENSING.md section
  3 (M05 row) and the path map name `OFL-1.1.txt`. Shipped as
  `reference/copper/_inputs/OFL-1.1.txt` (the tarball LICENSE, IBM
  copyright line plus the OFL text) and `LICENSES/OFL-1.1.txt` (the OFL
  text alone, which the path map row now names as its `text`).
- The licence path map held the `reference/copper/_inputs/*.woff2` row
  below the `designs/*/**`, `reference/*/*/**` chase row, so first match
  gave the fonts the chase licence. The row now sits second, under the
  logo row, in `tools/licences.json` and LICENSING.md section 1.2.
- Files omits what the steps touch: `tools/py/pyproject.toml` and
  `tools/py/uv.lock` (step 4), `tools/licences.json` (the fonttools 4.66.1
  and brotli 1.2.0 rows the licence gate requires, and the OFL path row),
  `LICENSES/OFL-1.1.txt`, `docs/plan/LICENSING.md`, `lineage.json` (dest on
  the seven `<name>.generator/rev-a` rows and `svgpath/keyway-rev-a`, bench
  copy rows, `<name>.geometry` and `<name>.rerun` subjects, three
  `font.plex-mono-*` rows; the logo is a fixes line on
  `brand.mark/seed-svg`, since a copy row with its bytes would clash with
  the canonical `vtracer-corpus.mark/seed-brand`) and
  `.github/workflows/ci.yml` (the exit row and the done-when ask for CI;
  no step ran it).
- The sha256 pins live once, in `lineage.json`: `run_legacy_gen.py` reads
  them from there and refuses a generator, svgpath.py or input whose
  bytes differ. The legacy READMEs repeat them for readers, and the
  oracle fails when a README row differs from its file.
- The oracle also holds each run to the 2026-10-04 rerun gate list,
  committed as `reference/copper/<name>/legacy/run-2026-10-04.txt` (not
  in Files), numbers masked, so a renamed, dropped or reordered gate fails
  even when the counts match.
- Python here is 3.14.8 (uv, `requires-python >=3.14,<3.15`), not the
  3.14.6 of the table; the table reproduces exactly (computed
  2026-10-08). `--brand` reproduces the M05-T14 brand figures: copper
  7532.8 mm2, 18 art islands of which 5 are slider ticks, 45 gates
  (computed 2026-10-08); there is no shipped brand geometry JSON to
  compare to, so the oracle does not run it.

## M05-T14 Vinyl copper kernel and KEYWAY on the package

Goal: packages/copper owns the gate functions, the lane ranker, the ladder
rule and weedability once, with the board as data, and KEYWAY builds on it
with 45 gates at 1.00 mm (D-092, D-063, plan-deltas R54).

Inputs:
- reference/copper/keyway/legacy/ (M05-T13 oracle)
- fab-knowledge:sources/benches/benches-conductive-b.md A.1 (helpers), A.2 (gate taxonomy), A.3 (lane algorithms), A.5 (KEYWAY parameters)
- fab-work-directory:benches/trunnion/outputs/trunnion/splice-copper.svg (SPLICE rev C, 7 nets)
- fab-knowledge:sources/benches/benches-copper-pcb-b.md SPLICE rev C table
- packages/geom (CrossSection wrapper, D-163)
- packages/checks/seed/checks.seed.json (CHK-NET-08, CHK-NET-09, and the R54 copper family rows entered at M04)

Steps:
1. Port the helpers onto geom CrossSection: `rr` (rounded rect), `wire`
   (flat caps, round joins), `smooth` (closing then opening by d; d 0.4 or
   0.25 per board), `outerOnly`, `annulus` with callable radii, half-plane
   Voronoi cell. Port svgpath text and path parsing to TypeScript reading
   the shipped woff2 and logo.
2. Gate functions as check run bodies with the board as data: single
   island per net, named netlist audit, min clearance with pair names,
   inside outline keepout (CHK-NET-08 at 1.0), erode survival (buffer
   -0.55 proves 1.10 mm features), art island gaps, plate solidity and
   size, slider monotone and span, wedge width, travel, terminal stagger,
   parked terminals, one-row rail, monotone fan, lanes needed at most lanes
   available, channel budget, film bridging and coverage, spacer windows,
   wiper stray contact, dielectric coverage, vinyl rules, one document
   size, isomorphic intervals, tape fit. Ids come from the R54 copper rows
   in the seed; a gate with no row gets one through the seed tooling with
   its origin board and failure.
3. CHK-NET-24 run body reads the declared mask mode, `soldermask` or
   `faceplate`, and checks the board honours it; the capacitive boards
   declare faceplate (benches-conductive-b.md Deltas, conflict 7).
   CHK-NET-09 keeps its title and checks the mask piece in either mode
   (../CHECKS.md section 9.4).
4. Lane ranker as one primitive: inputs arrival coordinates, terminal
   coordinates, margin and lane list, plus orientation (`x` rail or `y`
   rail); output lane per net or a cycle report naming the two nets. v1
   (greedy two-condition, QUADRANT and SPLINE) and v2 (farther-than DAG,
   longest-path rank relaxed up to n+2 times, `LANE = lanes[need - 1 -
   rank]`, lanes[0] farthest) behind one interface; STAVE is v2 with
   orientation `y`.
5. Ladder rule (SPLICE rev C): every row on one 2.54 grid, segments
   orthogonal or 45 degrees, gap = pitch minus width; at 1.6 mm traces the
   gap is 0.94 mm.
6. Weedability proof: eroding each net by 0.75 mm leaves one connected
   piece; a net that splits fails naming it.
7. Stack declaration (D-063) for cut-sheet sensors: per-layer role
   (copper, film, spacer, wiper, dielectric, faceplate, accent, backer),
   material from profile, registration by shared outline, windows. KEYWAY's
   eight layers declare it, and the cross-layer gates read it.
8. Layer SVG emit: simplify at 0.012 mm preserving topology, y flipped, 3
   decimals, evenodd, every layer the same W x H with the shared rim.
9. KEYWAY build.ts on the package: P dict as chase params, generator as
   build.ts, gates as checks. Export refuses on any fail (the family's
   rule; BOSS exported on failure).

Files to create:
- packages/copper/src/vinyl/{helpers.ts,svgpath.ts,font.ts,lanes.ts,ladder.ts,weed.ts,stack.ts,emit-svg.ts}
- packages/checks/src/copper/*.ts (one file per gate family)
- reference/copper/keyway/{chase.ts,build.ts,README.md,expected/}
- reference/copper/splice-ladder/{chase.ts,build.ts,README.md,expected/}
- packages/copper/test/{lanes,ladder,weed}.test.ts

Acceptance:
- `npx --no-install hbf parity reference/copper/keyway` exits 0: 45 gates pass, 0
  fail; min clearance 1.000 mm at P3/SA within 0.005 mm; copper area
  6975.5 mm2 within 0.2 percent; slider ratio 0.811 to 0.177 over 67.9 mm
  within 0.002 and 0.1 mm; 9 terminals at pitch 12 with 14 mm adjacent
  jaws; all 8 layer SVGs one document size 110 x 174 mm (stats computed by
  the oracle, M05-T13). The tolerances are this card's choice for a
  Clipper2 port of shapely geometry and are recorded in the golden.
- With `brand: true`: copper 7533 mm2, art 557 mm2 in 13 islands, 9.73 mm
  from the nearest net, within the same tolerances.
- `npx --no-install hbf parity reference/copper/splice-ladder` exits 0 on SPLICE rev C
  (computed, this card, shapely on the shipped SVG): 7 nets, min gap
  0.940 mm, every net one piece after a 0.75 mm erosion; at 0.80 mm five
  nets split or vanish, which the test records as the proof's margin.
- `npm test -w packages/copper -- lanes` exits 0: TESSERA, FRET and STAVE
  lane counts used 4 of 9, 3 of 12, 5 of 6; SPLINE 6 of 8; a constructed
  cycle returns a report naming both nets.

Done when: KEYWAY builds and refuses on the package with its 45 gates.

Card defects found while building (2026-10-08):
- `npx --no-install hbf parity reference/copper/<name>` cannot pass here.
  parity and part.build serve part.build references only (mesh goldens, a
  3MF export, Part IR checks); build.ts runs in the D-178 sandbox and may
  import only `@hackbuild/spec` and `@hackbuild/kernel/author`; a
  FeatureKindDef generator may not use wasm. So no vinyl geometry can be
  made through part.build. Built instead: build.ts returns a VinylDraft
  (plain data, sandbox safe), packages/copper evaluates it, the gates run
  from packages/checks/src/copper (`runVinyl`), and the acceptance runs as
  `npx vitest run reference/copper/keyway` and
  `npx vitest run reference/copper/splice-ladder` against the legacy
  oracles and `expected/`. Core needs a build path for the surface chase
  kind (D-126: the kind selects the build path) and surface parity goldens
  before the parity lines here and in M05-T15 can run.
- The two references hold `chase.surface.ts`, not `chase.ts`: part.build,
  parity, the metric record (core/test/metric-record.test.ts and
  packages/checks/test/metric-gates.test.ts), the project graph, cold
  rebuild, the README verified test and the determinism hashes enumerate
  every `reference/<area>/<id>/chase.ts` as a part.build reference, and
  would all fail on a surface chase. Rename when core builds one.
- Fixed at the root (2026-10-09, M05 fix pass): core has a surface build
  path, `core/src/commands/surface.ts`. hbf parity routes a directory that
  holds `chase.surface.ts` and no `chase.ts` to it: build.ts runs in the
  D-178 sandbox like any build and returns plain data (`{ draft:
  VinylDraft }` or a `LadderDecl`), core evaluates it in process on
  packages/copper and gates it with `runVinyl`, and parity compares the
  surface goldens (vinyl: `gates.json`, `layers.json`, `stack.json`;
  ladder: `ladder.json`) and passes only when each is equal and the board
  passes (every gate; every net whole after the weed erosion). The golden
  shapes live once there (`vinylGoldens`, `ladderGolden`, `ladderNets`,
  `loadVinylInputs`) and the reference tests pin the same objects.
  `--accept` refuses on a surface reference: the one writer stays
  `HBF_ACCEPT_VINYL=1 npx vitest run <reference>`, beside the stats golden
  that reads the shipped oracle. The name `chase.surface.ts` stays,
  because the part.build enumerators above still list `chase.ts` only.
  KEYWAY's `expected/gates.json` became the default gate list (the shape
  every board shares) and the brand run moved to `gates-brand.json`, data
  unchanged. `hbf parity reference/copper/keyway` and `.../splice-ladder`
  now exit 0 (45 pass, 0 fail; 7 nets whole); core/test/surface-parity.test.ts
  holds the verdict, including a failing board whose goldens equal its own
  output.
- KEYWAY's least clearance is a tie: COM/ART, P1/P3, P2/P4, P3/SA, P4/SC
  and SB/SC sit at 1.000 mm in exact arithmetic; shapely names P3/SA by
  rounding under 1e-13 mm, and manifold's CrossSection hands rings back at
  float32, which rounds the six equal (the SPLICE gap 0.94 reads
  0.9399999976). The gate names the first tied pair in net order and lists
  the tie (copper TIE_MM 1e-4 mm); "at P3/SA" is checked as membership. The
  same holds for M05-T15's "tightest pair names equal".
- With the brand on, the art is 557.25 mm2 in 13 islands for the brand
  alone (18 with the five ticks), and its nearest net is SA at 9.7232 mm
  (computed, shapely 2.1.2 on the pinned generator and the port alike);
  the README's 9.73 mm is not reproduced.
- SPLICE at 0.80 mm: on the shipped SVG six nets split or vanish (SIGA
  empties; 5V, GND, SIGB, BASE1, COL split), shapely and the port net for
  net; the five came from the 3-decimal rings of `splice3d.json`, where
  SIGB stays whole. 0.80 is half the trace width, so the probe sits on a
  knife edge.
- Step 1's `svgpath` port reuses geom's one SVG path parser
  (`packages/geom/src/raster/svgpath.ts`, now with optional curve
  flattening at n 12 and 10) instead of a second parser. The family's
  `_Pen` ignores composite glyphs (svgpath.py line 183, `addComponent`),
  so `"`, `:` and `;` outline blank on every board; the port keeps that.
- D-240 puts the SVG document sanitiser and its fuzz here; the card never
  names them. Landed as `packages/geom/src/svg-doc.ts` and
  `packages/geom/test/svg-doc.fuzz.prop.test.ts`; the mark and the SPLICE
  cut file read through it.
- Step 2: a gate with no row got one. CHK-NET-31 to -38 (netlist audit,
  art weeding, wedge copper, spacer windows, wiper landing, film keepout,
  spacers whole, one document size) entered with KEYWAY origins and pages;
  the conductor dissipation candidate moves to CHK-NET-39 (CHECKS.md 9.9,
  RISKS.md R-26, M05-T19 step 8). Every R54 copper row used here stays
  pending in the registry: no producer puts a vinyl board into Part IR,
  so the run bodies are reached only through `runVinyl`. The new rows move
  every reference's registryHash: the six part.build goldens were
  re-accepted (registryHash only; CHK-NET-31 joins each report as a
  pending skip), their README verified lines, the flex-pair print card and
  virtual print citations (sliced again into
  `fab-knowledge:evidence/virtual-print/m05-t14/`,
  analysis equal), EXIT-B.md, the CHK-ART-02 fixtures, the M-S T06 result
  count and the packages/project graph fixture were rewritten (D-244).
- Step 2 and step 3 name gate families KEYWAY does not use (plate
  solidity and size, span off the rails, travel, parked terminals, one-row
  rail, monotone fan, lanes needed, channel budget, dielectric coverage,
  vinyl rules, isomorphic intervals, tape fit) and the CHK-NET-24 and
  CHK-NET-09 mask run bodies; KEYWAY has no mask and no faceplate. They
  are not written at M05-T14 and move to M05-T15 with the boards that
  exercise them.
- Step 7: spec/part-ir.ts StackLayer has six roles (conductor, resistive,
  spacer, backer, mask, face); the card's eight map onto them
  (`SPEC_ROLE` in packages/copper/src/vinyl/stack.ts). The print then cut
  guide has no stock row with a thickness, so it is emitted but left out
  of the declaration. Profile gained `cardstock-030`, `eva-2` and
  `chipboard-2` (inferred, the KEYWAY README's stated stock) and the
  `vinyl.*` gate constants (inferred, each citing its generator line).
- The `cricut` machine row's sheet (101.6 mm, the STAVE tape roll) is
  narrower than KEYWAY's 110 mm board; no check reads it here.
- Files omits what the steps touch: packages/geom (sanitiser, fuzz,
  curves), packages/profile/data (constants and materials),
  packages/checks (copper gates, eight pending modules, seed, entered.test,
  package.json and tsconfig dependency on copper), docs/plan/CHECKS.md,
  RISKS.md, docs/reference/checks, counts, lineage.json (fixes on the
  seven generator and svgpath rows, `splice.copper/*`), tools/py/copper
  dump scripts and their fixtures, `reference/copper/_harness/vinyl.ts`,
  the reference tsconfigs and their root references, and
  packages/copper/test/negotiated.test.ts (its public surface assertion
  now excludes the vinyl exports).

## M05-T15 The rest of the KEYWAY family on the package

Goal: VERNIER, QUADRANT, SPLINE, TESSERA, FRET and STAVE build on
packages/copper as data and reproduce 60, 59, 85, 85, 95, 57 gates.

Inputs:
- reference/copper/<name>/legacy/ (M05-T13)
- packages/copper vinyl kernel (M05-T14)
- fab-knowledge:sources/benches/benches-conductive-b.md A.6 to A.11

Steps:
1. One build.ts per board on the shared helpers, gates and lane ranker;
   no per-board copy of gate logic (benches-conductive-b.md Gaps 7).
2. TESSERA seeds its jitter from the declared seed 11 through a seeded
   generator that reproduces Python `random.Random(11)` draws for the
   values the generator uses, or reads the seed points from the oracle's
   geometry JSON as fixture data when the draw sequence cannot be matched;
   the README states which.
3. Each reference README records the legacy sim defect: SPLINE, TESSERA,
   FRET and STAVE sims throw on `S.span` and never build their tabs
   (jsdom rerun). The sims are not ported here; viewers arrive at M09 and
   M10 from `gates[]` data.

Files to create:
- reference/copper/{vernier,quadrant,spline,tessera,fret,stave}/{chase.ts,build.ts,README.md,expected/}

Acceptance:
- `npx --no-install hbf parity reference/copper/<name>` exits 0 for each of the six,
  with gates passed and min clearance equal to the M05-T13 table (0.005
  mm), tightest pair names equal, and stats within the M05-T14
  tolerances.
- `node tools/counts.mjs && git status --porcelain` prints nothing (the
  reference INDEX is generated).

Done when: all seven family boards build on the package with their legacy
gate counts.

Card defects found while building (2026-10-08):
- `npx --no-install hbf parity reference/copper/<name>` cannot pass, for
  the reason M05-T14's defects give (no surface build path; the
  references hold `chase.surface.ts`). The acceptance runs as
  `npx vitest run reference/copper/<name>` for each of the six, against
  `legacy/run-2026-10-04.txt` line for line, `legacy/<name>_geometry.json`
  (params equal, stats and nets within the M05-T14 tolerances) and the
  M05-T13 table read from this file.
  Fixed at the root with M05-T14's surface build path (see the M05-T14
  defects): `npx --no-install hbf parity reference/copper/<name>` exits 0
  for each of the six (60, 59, 85, 85, 95, 57 gates pass, 0 fail; gates,
  layers and stack goldens equal). The vitest acceptance above stays: it
  holds the stats, the M05-T13 table and the legacy rerun lines, which
  parity does not read.
- Step 1 is met as a gate program: each draft lists its gates in print
  order (`packages/copper/src/vinyl/program.ts`) and one registry runs
  each family's body (`packages/checks/src/copper/program.ts`); KEYWAY
  declares its program too. A board carries its own gate wording and its
  own design floors (the smallest plate, the rail pitch floor, a travel
  range) as data with their generator lines; floors the whole family
  shares are ten new profile constants (`vinyl.spanRailMin` and
  `spanRailMax`, `ratioMonotoneTol`, `wiringZoneGrow`, `maskShrink`,
  `bareMax`, `apartMax`, `accentEdgeClear`, `spacingTol`, `coordTol`,
  inferred, each citing its generator line).
- build.ts may not import the lane ranker (D-178), and a wire needs its
  lane, so a draft declares its fan (arrivals, terminals, margin, lanes,
  version) and a wire point reads `{ lane: net }`; the kernel places the
  fan once and refuses a fan the ranker cannot place, as the generators'
  SystemExit does. TESSERA's tap heights are the centroid of each tile's
  left strip (`gen_tessera.py` lines 144 to 145) and read as
  `{ centroid: "y", of }` the same way.
- Step 2 took the first route: `reference/copper/tessera/pyrandom.ts`
  reproduces `random.Random(11)`; the test holds all twelve seeds equal,
  digit for digit, to the shipped geometry JSON. It sits beside the board
  because build.ts may import only files in its own directory.
- Six gate families have no check row: plate solidity, size and count;
  travel and sweep; zones kept apart; channel budget; isomorphic
  intervals; stock fit. M05-T14 step 2 says such a gate gets a row, but
  a new row moves the registryHash of every part.build reference
  (M05-T14 defects), and at the time of this card M07
  (`reference/fit/ogee16-r16p`) and M05-T19 and M05-T20
  (`reference/keys/flex-pair`) were re-accepting those goldens. The
  gates run under `candidate:` names (`VINYL_CANDIDATES`, CHECKS.md
  section 9.9) and M05-T17 enters the six in one batch (step 8 there),
  numbered CHK-NET-40 to -45 after the dissipation candidate's
  CHK-NET-39.
- M05-T14 moved the CHK-NET-24 and CHK-NET-09 mask bodies here. They run
  in faceplate mode only, with CHK-NET-20; soldermask mode refuses until
  a board declares it.
- "tightest pair names equal" holds as membership in the tie, as at
  M05-T14: QUADRANT's five sector gaps tie at 1.203 mm (shapely B3/B4,
  the port B1/B2), STAVE's six pairs at 1.200 mm (shapely D1/L1_A, the
  port D1/D2), TESSERA's eight seams at 1.100 mm (both T1/T2); VERNIER,
  SPLINE and FRET have one pair.
- Profile has no row with a thickness for adhesive vinyl or printed
  sticker paper (the VERNIER README gives the two together as roughly a
  quarter of a millimetre, not split), so the six stacks declare the
  backer and the copper; the faceplate, print and accents are emitted
  and left out of the declaration, as the KEYWAY guide is.
- On a board with a fan the clearance param is also the lane margin
  (`tw + clr`), so raising it above the least clearance can leave the
  ranker without a lane (SPLINE: no free fan lane for K2) before any
  gate runs; the refusal test accepts either refusal and names which.
- FRET's docstring and copper layer title say 16 keys and 22 contacts;
  its P dict draws 15 and 21. The chase carries the P dict and the
  title is kept as the generator writes it.
- `node tools/counts.mjs && git status --porcelain` cannot print nothing
  here: nothing is committed, so `git status --porcelain` lists every
  staged file, and counts.mjs writes `docs/plan/counts.json` and PLAN.md
  Appendix B only (no reference INDEX is generated yet). The check that
  holds is that counts.mjs leaves no unstaged change.
- The brand variants of the six boards are not exercised: no shipped
  brand geometry exists for them and the M05-T13 oracle does not run
  them.
- Files omits: packages/copper (`vinyl/program.ts`, coordinates, fan,
  fields and mask in `vinyl/draft.ts`, `centroid` in `vinyl/helpers.ts`,
  the compact document style in `vinyl/emit-svg.ts` and `vinyl/stack.ts`),
  packages/checks/src/copper (`program.ts`, `plates.ts`, `ratio.ts`,
  `zones.ts`, `rail.ts`, `mask.ts`, `lattice.ts`, and the step
  parameters in `nets.ts`, `clips.ts`, `film.ts`, `sheets.ts`,
  `wiper.ts`, `gate.ts`, `run.ts`, `index.ts`),
  `packages/profile/data/constants.json`,
  `reference/copper/_harness/family.ts`, each board's
  `test/parity.test.ts` and `tsconfig.json`,
  `reference/copper/tessera/pyrandom.ts`, the root `tsconfig.json`
  references, `reference/copper/keyway/build.ts` (its program) and its
  test (the clip field is optional now), docs/plan/CHECKS.md (9.4 and
  9.9) and lineage.json (fixes on the eighteen generator, geometry and
  rerun rows).

## M05-T16 hackbuild-copper extraction check

Goal: the D-029 trigger is evaluated at exit and the result is recorded;
when it holds, packages/copper is split into hackbuild/hackbuild-copper by
the hackbuild-3mf procedure (D-029, D-025).

Inputs:
- ../REPOS.md (extraction procedure, repo state: hackbuild-copper empty, created 2026-09-15)
- MILESTONES.md Part 3 rule 13
- results of M05-T09 (BLOCKS seats on the package) and M05-T14, M05-T15 (KEYWAY family on the package)

Steps:
1. Evaluate the trigger: BLOCKS builds its routing on packages/copper
   (M05-T09 green), KEYWAY builds on packages/copper (M05-T14 green), and
   M05 parity passes (every reference in this file green on CI).
2. If it holds, prepare the split: `git subtree split --prefix
   packages/copper -b copper-split`, layout per ../REPOS.md, licence MIT,
   author Moheeb Zara <hackbuildvideo@gmail.com>, no attribution lines
   (D-001). The push to hackbuild/hackbuild-copper happens only when the
   owner asks (D-006).
3. Publishing waits: D-036 names only @hackbuild/kernel as published from
   hackbuild-fab, and no decision names the npm or PyPI name for
   hackbuild-copper; D-037 (npm scope) is owner status. The split repo is
   source only until the owner decides.
4. If the trigger does not hold, the exit table records which part failed.

Files to create:
- docs/plan/extractions.md (row for hackbuild-copper: trigger result, date, commit)

Acceptance:
- `npm test -w designs/blocks -- route-seat` and `npx --no-install hbf parity reference/copper/keyway` both exit 0 on the exit commit.
- `git subtree split --prefix packages/copper` exits 0 and the split tree
  passes `npm test` standalone in a scratch clone.
- The extraction row names the owner question (package name, publish) in
  the PR body (MILESTONES.md Part 3 rule 15).

Done when: the trigger result is written down with its evidence.

Card defects found while building (2026-10-09):
- The trigger runs through `node tools/extract-check.mjs copper`, the
  M03-T13 tool, with a `copper` row added to its `TRIGGERS` (D-029):
  part one reads `designs/blocks` and `reference/copper/keyway` (KEYWAY
  is a reference, not a design under `designs/`, so a trigger design may
  name its folder); part two runs `npm test -w designs/blocks --
  route-seat` and every `hbf parity` reference of the Exit table, the six
  family boards read from M05-T15's Files line. Files omits
  `tools/extract-check.mjs` and `tools/test/extract-check.test.mjs`.
- Acceptance line 1 holds after the M05 fixer pass. At the verifier pass
  `npx --no-install hbf parity reference/copper/keyway` exited 2
  (`E_REF add chase.ts to the directory`), as did splice-ladder and the
  six family boards (no surface build path; the references hold
  `chase.surface.ts`). The fixer added `core/src/commands/surface.ts`
  (D-244 amended); rerun 2026-10-09 at the M05 audit, `node
  tools/extract-check.mjs copper` exits 1 with part one holds, part two
  holds (all fourteen parity commands and route-seat exit 0) and the
  import closure failing on geom, spec alone. `npm test -w designs/blocks
  -- route-seat` exits 0 (21 of 21). The verdict is unchanged: not
  extracted, and only the closure fails.
- Acceptance line 2 cannot run as written: hackbuild-fab has no commit
  (D-006), so `git subtree split` has no history. Rehearsed as M00-T15
  did, on a scratch snapshot of the staged tree committed in a scratch
  repository: the split exits 0 with 102 files, and the split tree fails
  `npm test` standalone (`npm install` E404 on `@hackbuild/geom@0.0.0`;
  `tsc` missing). The tree also reaches outside its folder
  (`../../vitest.config.ts`, `../../tsconfig.base.json`, `../geom`,
  fixtures read from the repo root, `core/dist/resolve-hook.js` in three
  scripts). Standalone needs those cut and the closure open.
- The trigger leaves out the import closure, which REPOS.md 10.2 step 1
  needs ("the split must stand alone"): copper declares
  `@hackbuild/geom` and `@hackbuild/spec`, private under D-036, and
  `@hackbuild/kernel` is private and exports neither subpath, so step 2
  waits on D-037 even after parity passes, as M03-T13 found for inlay.
- "Green on CI" and "in the PR body" have no CI run and no PR before the
  first push (D-006). The owner questions (npm name, publish, push) are
  in `docs/plan/extractions.md` for the PR body.
- Result recorded in `docs/plan/extractions.md` with the hackbuild-3mf
  and hackbuild-inlay rows; `tools/test/extract-check.test.mjs` holds
  the rows to the tool's part one and closure, fails when a row claims
  part two for a reference with neither `chase.ts` nor
  `chase.surface.ts`, and (audit 2026-10-09) fails when the row records
  part two as failing while every parity reference has a chase, or names
  any cause but the import closure while the closure fails.
- Audit 2026-10-09: the CI parity loop ran only folders holding
  `chase.ts`, so the eight copper parity Exit rows never ran in CI. The
  loop now admits `chase.surface.ts`, and
  tools/test/ci-exit-rows.test.mjs holds it.

## M05-T17 Exit housekeeping

Goal: M05 closes green with pins re-dated, lineage written, counts
generated and every admitted item carrying a reference.

Inputs:
- MILESTONES.md Part 3
- lineage.json, tools/counts.mjs, tools/tiers.json

Steps:
1. Re-date the D-040 pin table: eecircuit-engine 1.8.0, manifold-3d
   3.5.4 and the Python pins of M05-T13 checked against their registries;
   any move reruns determinism and parity.
2. lineage.json rows: router (PIP canonical, TOGGLE, BOSS, BAFFLE copies),
   nodal solver (BOSS sim.js), read models (PIP model.js), vinyl helpers
   (KEYWAY family svgpath.py and gen_*.py), ladder and weedability (SPLICE
   rev C).
3. Coverage: every check whose run body landed here (CHK-NET-01, -02, -05,
   -06, -08, -09, -11, -12, -13, -24, -26, -27, -28 (the capacitive
   ceiling), -29, and the R54 copper rows) names a green reference in its
   covers list; CHK-NET-13, -26, -27 and -29 come from M05-T19, and
   CHK-3MF-08 from M05-T20. reference/keys/flex-pair
   (M05-T18) is the reference M09, M10 and M12 build on; its covers list
   is checked here with the rest.
4. Determinism job: every M05 reference builds on ubuntu x64 and arm64
   with equal mesh hashes (D-056).
5. Visual review on any meshHash change: before and after renders, the
   checkbox "I looked at the renders", desktop and 390 px (D-154).
6. tiers job: no circuit to copper edge; no DOM import below tier 3.
7. Carried from M01-T06 step 2: once the conductor kind has a generator
   on the stage path, give reference/electrical/trace-width-budget/build.ts
   one conductor feature bound to `/w`, accept `expected/envelope.json`
   through `hbf parity --accept` once, and run M01-T06 acceptance line 2:
   the param-form query returns an Interval on `/w` equal to golden 1
   (legal 3.23 to 6.00 mm, computed) with an empty `unbound`.
8. Carried from M05-T15: enter the six KEYWAY family gate families that
   run under `candidate:` names (CHECKS.md section 9.9) as CHK-NET-40 to
   -45 through the seed tooling, with their origins, in one batch;
   re-accept every part.build golden whose registryHash moves, rewrite
   the files that cite those hashes as M05-T14's defects list, and swap
   `VINYL_CANDIDATES` in `packages/checks/src/copper/gate.ts` for the new
   ids so the six boards' `expected/gates.json` change by id only.

Acceptance:
- `npx --no-install hbf constraints.query --chase reference/electrical/trace-width-budget --json`
  exits 0 with `/w` bound and `unbound` empty (M01-T06 acceptance line 2).
- CI green: house-rules, typecheck, derived, tiers, seed, unit, property,
  contract, parity, determinism, corpus.
- `node tools/tiers.mjs` exits 0.
- `node tools/lint-voice.mjs` exits 0.

Done when: the exit table below is green on CI on the commit the owner asks
to push.

Card defects, found at build 2026-10-09:
- Step 1: no pin moved. eecircuit-engine 1.8.0 and manifold-3d 3.5.4 are
  the registry latest; shapely 2.1.2 stays pinned with 2.2.0 published;
  the re-date is in PLAN.md section 16 and PACKAGES.md 2.1, which gains the
  eecircuit-engine row. Determinism and parity do not rerun for a pin.
- Step 2: the rows existed except the SPLICE rev C README section, which
  had none; `splice.readme/rev-c` (canonical, dest
  packages/copper/src/vinyl/ladder.ts) and `splice.readme/rev-c-weed`
  (weed.ts) are added. `toggle.build/part2d`, `router/toggle-part2c` and
  `router/boss-route` gain the dest their fixes already named, and
  `blocks.sim/blocks-1` a fix line for read/pullup.ts. The groups are read
  from this step by tools/test/lineage.test.mjs.
- Step 3: the copper references had no covers line; the seven boards now
  cover the ids their gates.json reports and splice-ladder covers
  CHK-NET-23 (tools/test/m05-coverage.test.mjs, ids read from this step
  and from the copper run bodies). At build they were green under `npx
  vitest run reference/copper` only and `hbf parity` exited 2 on them;
  after the fixer's surface path `hbf parity` exits 0 on all eight
  (M05-T16).
  CHK-NET-06 has no green reference: no reference declares an adc port, so
  every circuit.solve golden records it as a skip. It waits on a design
  with an adc read (TANG R5 or BAFFLE R3) admitted as a reference.
  CHK-NET-16 and -17 (R54 copper rows) have no gate reporting under them,
  and CHK-NET-25 is pending M06.
- Step 4 not run: no CI (D-006); this machine is macOS arm64 only.
- Step 5: no meshHash moved at this card (trace-width-budget's buildHash
  moved by a build.ts comment, every mesh hash equal), so no render review
  is added; the earlier M05 cards' reviews stay with the person.
- Step 7 blocked. A conductor is a region partitioned out of a host body
  at stage 5, and the trace-width-budget trace is its own only body: a
  conductor feature over the prism leaves one of the two empty (E_KERNEL
  "a body with volume after partition", run 2026-10-09), and core's
  featureMaterial reads the host body's material, never the conductor's
  declared one. It needs a decision: give the trace a host (a second,
  non-conductive body) and let featureMaterial prefer a feature's declared
  material, or let a conductor claim the body it covers. At build,
  acceptance line 1 stayed unmet: `/w` unbound "no-feature", exit 0.
  Audit 2026-10-09: D-248 (owner, default in force) takes the first way.
  featureMaterial returns a feature's declared material before its body's
  (core/test/feature-material.test.ts), and the trace gets a PETG skin
  host of `stack.skin` with the conductor the top `tMm` of it, bound to
  `/w`. Acceptance line 1 now holds: `npx --no-install hbf
  constraints.query --chase reference/electrical/trace-width-budget
  --json` exits 0 with `/w` legal 3.23 to 6.00 mm (computed) and
  `unbound` empty, held by core/test/trace-width-budget.test.ts. The
  goldens were accepted once (buildHash 9b0aa139 to fd8d4263, one body
  to two, computed) and the project graph fixture regenerated; the person
  look at the new renders is not done (D-154). Two gaps remain: parity writes query goldens only as
  `expected/query-<name>.json` (D-228), so the envelope golden is
  `expected/query-envelope.json`; and the envelope carries the buildHash,
  which moves with the epoch, while parity passes the pinned epoch to
  circuit.solve queries only (core/src/commands/parity.ts queryGoldens).
- Step 8: the six rows entered as CHK-NET-40 to -45 (D-247). The premise
  that a new row moves every registryHash no longer holds: D-243 hashes
  the checks of the build levels and the six are sheet level, so no
  registryHash or buildHash moved; the six gates.json goldens change by id
  only.
- Not in the steps: packages/checks `PAGE_MILESTONE` still read M04, and
  page.ts asks the milestone that registers a kernel to move it. It moves
  to M05 (D-247), so the build registry runs CHK-NET-13 and -27 in
  check.run. Their messages then carried numbers the message-number rule
  cannot trace (the CHI 2021 citation year, the press axis -1); CHK-NET-13
  cites TCB at CHI and CHK-NET-27 records the axis in `extra`. The
  flex-pair and pip-buried-route report goldens move their reportHash, the
  flex-pair README checks block and the M-S T06 result count follow, and
  the flex-pair 3MF and print card do not move. M07 moves it to M07 at its
  exit (M07-T15 left it at M04).
- The Exit rows of M05-T14 and M05-T15 name `hbf parity
  reference/copper/<name>`, which exited 2 at build; after the fixer's
  surface path it exits 0 on all eight boards. M05 had no entry in
  tools/test/ci-exit-rows.test.mjs, which covered M03 and M07. Audit
  2026-10-09: the M05 card is listed there, `reference/copper/<name>`
  expands to each board folder, and the CI parity loop runs surface
  chases (it skipped every folder without `chase.ts` before).
- Files omits: docs/plan/PLAN.md, PACKAGES.md, DECISIONS.md, CHECKS.md and
  M-S-walking-skeleton.md, packages/checks (seed, six def modules,
  copper gate ids, page.ts, net13.ts, net27.ts, entered and origin
  tests), the reference READMEs and report goldens, the vinyl gates.json
  goldens, packages/project/test/fixtures/graph.jsonl,
  docs/reference/checks, counts, and tools/test/m05-coverage.test.mjs.
- tools/licences.json carries an unstaged change from M07 (sparrow and
  jagua-rs rows); left as found.

## M05-T18 reference/keys/flex-pair

Goal: the keys flex-pair reference exists with goldens, so M09 (rail,
drive pad, bake), M10 (chase commands, parity), M12 (gate vector,
palette) and DOCS.md (first-printed-circuit tutorial) have a build hash,
a report and an edit to read (D-105; PLAN.md section 11 lists it among
the first entries).

Inputs:
- spec/fixtures/keys-flex-pair.ts (chase and reduced build; GND bus at
  y 3 mm, one trace per key to the bottom edge, caps revolved on their
  own axis at key.x, one port per key)
- ../AGENT-SURFACE.md 8.5 (worked example), 8.6 (the session), 12 (open
  item: flex-pair cone off the 0.24 mm layer grid)
- ../CHECKS.md rows CHK-KEY-01 to -03, CHK-NET-01, -02, -05, -11
- M05-T04 (Net, resistance), M05-T05 (charge-release), M05-T06
  (circuit.solve)
- fab-knowledge:evidence/x/pip-controller/src/layout.js line 46 (cpla 500 ohm cm along, inferred)

Steps:
1. Split the fixture at its build line into
   `reference/keys/flex-pair/chase.ts` and `build.ts`, imports pointed at
   `@hackbuild/kernel/author`. The chase stays identical to the fixture,
   so the JSON pointers M10 uses (`/params/1/fields/0/item/3/default` for
   the travel) hold.
2. Keep the fixture's additions as they are and check each one is
   present: `conductor.gnd` on net GND (centreline from the leftmost key
   to the right edge at y 3 mm, width `p.w`, t one trace band) with
   `port.gnd`; one `port.key<n>` per key with `mcu: "rp2040"` and read
   `{ model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500,
   waitSource: "default" }`; cap bodies are prisms over a circle at
   [key.x, 0]. The wait reads inferred (qualifyRow("inferred")) for the
   reason in M05-T05 step 2; the emitter derives the qualifier (D-206).
3. Add what the reduced build leaves out: one `pad` feature per net at
   its trace end (`pad.key<n>`, `pad.gnd`, size 3 x 3 mm, `for: "clip"`).
   Wire cups keep the fixture's LEADS warning and get no pad kind (the
   wire-cup claim is dropped, D-096).
4. Layer grid. The ffc5p preset prints a 0.25 mm first layer and 0.24 mm
   layers above it, so tops sit at 0.25 + 0.24n and the isolation top is
   2.41 mm. Since D-223 the key is the PIP flex cone key: the cone
   default 4.0 mm (PIP Hs) snaps through `m.layer` to 4.08 mm (17
   layers, computed). CHK-KEY-01 measures against the built cone, so the
   golden's band is 1.428 to 2.04 mm (35 to 50 percent of 4.08, floor
   1.2; computed; D-241, was 1.632 at 40 percent) and the travel default is 1.84 mm. The snap rule stays
   and the band follows the built cone, which settles the AGENT-SURFACE.md
   section 12 open item. The 1.2 to 1.68 band (1.344 to 1.680 at the
   superseded 40 percent) belongs to the spec fixture cone 3.2 built at
   3.36 mm, and 1.2 to 1.60 (was 1.28 to 1.60) to a cone that builds at
   3.20 mm (the BOSS case, M04 fixtures); D-241.
5. Write README.md with the verified block (D-008): verified on this
   machine with date (build, checks, circuit.solve); checked by machine on
   geometry (the covered checks); measured on a printed body (none);
   not verified by anything (cpla and ctpu resistivity on the shop's
   spools, the 3500 us wait on a printed pair, D-082). It states that
   every export carries the inferred-tier warning until a coupon is
   measured (D-081).
6. Run `npx --no-install hbf parity reference/keys/flex-pair --accept` once to write
   expected/. After that only a reviewed `--accept` changes it.

covers: [CHK-KEY-01, CHK-KEY-02, CHK-KEY-03, CHK-NET-01, CHK-NET-02,
CHK-NET-05, CHK-NET-11, circuit.solve, read charge-release]. CHK-NET-05
version 2 targets pullup ports, so here it reports skip with the reason
"no port with read model pullup" (AGENT-SURFACE.md 8.5); the golden
records that skip, and the pass and fail branches are covered by
reference/electrical/blocks-pullup-band (M05-T07).

Files to create:
- reference/keys/flex-pair/{chase.ts,build.ts,README.md}
- reference/keys/flex-pair/expected/{build.json,report.json,edit.json,section.png}

Acceptance:
- `npx --no-install hbf parity reference/keys/flex-pair` exits 0.
- expected/report.json: CHK-KEY-01 on `contact.key1` measured 1.84 mm,
  legal 1.428 to 2.04 mm, pass (computed, D-223, D-241); zero fail across the covered
  checks at the default params. A covered check that fails is a defect in
  the reference, fixed in chase.ts or build.ts before the golden is
  accepted, never by editing expected/.
- expected/edit.json: setting `/params/1/fields/0/item/3/default` from
  1.84 to 2.15 flips CHK-KEY-01 pass to fail, measured 2.15 mm, legal
  1.428 to 2.04, fix `set` 2.04 (nearest, D-064). Until this card lands,
  expected/edit.json holds the M-S metric move (`/keys/0/gap` 1.84 to
  1.86); this card replaces it.
- `npx --no-install hbf circuit.solve reference/keys/flex-pair --json` exits 0 with
  nets GND and K1, and `reads` holding one record for K1 with
  `settleTaus` 5, `wait.emit` 3500 us inferred and `ok` true. The along
  segment of conductor.key1 (15.0 mm centreline, 1.4 x 0.72 mm, cpla 500
  ohm cm along) equals 74404.8 ohm within 0.1 percent (computed, tier
  inferred); with preset `two` the GND bus runs 44.0 mm and its along
  segment equals 218254.0 ohm within 0.1 percent (computed, tier
  inferred). totalOhm and tau per net are recorded in the golden, never
  typed here.
- `node tools/lint-voice.mjs reference/keys/flex-pair` exits 0.

Done when: the flex-pair reference is green with goldens that the later
milestones read instead of retyping.

Card defects found at build (2026-10-08):
- Step 4 sets the band to 1.428 to 2.04 mm (D-241), and the acceptance
  lines and the Exit row said 1.632 to 2.04. Corrected here to 1.428; the
  golden holds 1.428 to 2.04 and the fix 2.04. Step 4's spec fixture band 1.344
  to 1.680 and the BOSS 1.28 to 1.60 were the 40 percent figures; under D-241 they read 1.2
  to 1.68 and 1.2 to 1.60. AGENT-SURFACE.md 8.5 and the section 12 row
  carried the same pre-D-241 numbers and are corrected; 8.6 (the M10
  session) still shows 1.28 to 1.60 and a 1.44 default and is left to
  M10, whose acceptance lines (M10-chase.md, the chase.diff and
  chase.patch rows) also still use 1.44 as the travel default where the
  reference default is 1.84 (D-223).
- Steps 1 and 2 were done at M-S-T09 and D-223: chase.ts and build.ts
  already sit in the reference and spec/fixtures/keys-flex-pair.ts
  re-exports them. The chase keeps PIP's flex cone key (D-223), so it is
  no longer identical to the AGENT-SURFACE.md 8.5 text; the pointer
  `/params/1/fields/0/item/3/default` still names the travel.
- Step 3: PadFeature (spec/features.ts) carries a net, a size and `for`,
  and no position, so a pad at "its trace end" has no geometry; the note
  names the point. The draft kinds had no pad kind, so
  reference/keys/flex-pair/skeleton-kinds.ts gains one (generates
  nothing), which moves registryHash. The 3 x 3 mm size has no profile
  row or source beyond this card (inferred). No profile contact row
  exists (packages/profile lookup `contact` returns null), so each pad is
  an unpriced contact and both nets read qualifier unknown; the
  circuit.solve nets line said "computed" regardless and now names the
  unpriced contacts (core/src/commands/circuit-solve.ts).
- The expected/edit.json acceptance needs parity to record a verdict flip
  and to accept a chase default pointer; parity recorded only mesh and
  metric deltas on a params pointer. core/src/commands/parity.ts now maps
  `/params/<g>/fields/<f>[/item/<i>]/default` onto the params it sets
  (E_STALE when the chase default is not `from`, E_REF when the pointer
  names no numeric field) and writes `expect.verdicts` when a check
  result changes verdict. reference/cosmetic/coin-inlay is the one other
  reference whose edit flips a check (CHK-INL-03 at depth 0.72) and its
  edit.json was re-accepted for that field alone.
- The covers list names CHK-NET-01 and CHK-NET-11. Both target nets, and
  check.run runs the registry on the part, body and feature levels only
  (core/src/commands/build.ts BUILD_LEVELS), so neither reaches
  expected/report.json; CHK-NET-11's run body is M05-T10's. The README's
  covers line leaves both out until a net-level run reaches the report
  (M05-T10 or M05-T17), and CHK-NET-05's skip is recorded in
  expected/query-solve.json, the circuit.solve golden, because check.run
  still runs the registry on the M04 kernels (`PAGE_MILESTONE`), where
  CHK-NET-05 skips "kernel circuit not registered".
- "totalOhm and tau per net are recorded in the golden" needs a
  circuit.solve golden; Files named none. Added `queries.json` and
  `expected/query-solve.json` (the M05-T07 pattern). The preset "two"
  GND bus figure has no command input (circuit.solve takes no preset), so
  `test/solve.test.ts` builds preset "two" and holds it.
- Files lists `expected/section.png`; the reference writes
  `expected/section-key1.svg` and `-key2.svg` with their PNGs (D-227).
- Also touched: core/test/skeleton.test.ts (the query golden in the
  parity file list, the chase pointer errors),
  reference/keys/flex-pair/test/solve.test.ts,
  reference/cosmetic/coin-inlay/README.md and expected/edit.json,
  docs/plan/AGENT-SURFACE.md 8.5 and 12,
  packages/project/test/fixtures/graph.jsonl (re-recorded for the new
  flex-pair build), docs/reference/checks pages (the covers list).
- The new build moves the writer 3MF bytes (the build hash in
  `Metadata/hackbuild_chase.json`), so the print card, EXIT-B.md and the
  README simulated block cite the new file, and the virtual print was
  rerun on it: G-code equal to M05-T12's but for its generated-at line
  (`fab-knowledge:evidence/virtual-print/m05-t18/`).
  knowledge/03-diagnostics.md cites build.ts lines, repointed to 154 and
  196.
- The CHK-NET-29 golden prices the pin at 7 pF from the skeleton run body
  while the circuit.solve read uses 8.3 pF on the same net (tau 2.451 us);
  two implementations of the key's capacitance. M05-T19 rewrites
  CHK-NET-29 and should read the one ReadOutputs.

## M05-T19 Contact, slope, apart and charge-release checks

Goal: the four net checks a printed button path needs beyond CHK-NET-05
run on extracted nets and the actuated sim, each with a reference:
CHK-NET-13 (conductor slope), CHK-NET-26 (apartExcept), CHK-NET-27
(makesContact through the actuated move) and CHK-NET-29 (charge-release
path inside the wait) (plan-deltas R54, D-074, D-078, D-079).

Inputs:
- ../CHECKS.md section 7.5 (CHK-NET-05 scope) and section 9.4 (rows and the CHK-NET-29 rule)
- spec/checks.ts (CheckDef, gates), spec/part-ir.ts (Assertion `apartExcept`, `contact`), spec/circuit.ts (ReadOutputs)
- M05-T04 (nets, per-direction resistance), M05-T05 (charge-release read), M05-T11 (PIP per-key R and C), M05-T18 (reference/keys/flex-pair)
- fab-knowledge:sources/benches/benches-conductive-a.md lines 102, 131, 240, 665 (FEELER pot collector, archetypes electrically broken, readCircuit list)
- fab-knowledge:evidence/x/pip-controller/docs/electrical.md lines 143 to 162 (measured crossings)

Steps:
1. CHK-NET-13 run body: for each conductor feature, the steepest segment
   of its centreline in print pose against the bed plane, in degrees.
   Legal 0 to 45 deg; above it the verdict is warn (severity warn, D-067), with
   the segment located by `at`. Origin TCB, CHI 2021 (vertical traces
   about 7x the resistance, measured by others).
2. CHK-NET-26 run body: for each `apartExcept {nets, cut}` assertion,
   build the net graph in the actuated state of step 3 and assert the
   named nets are joined; remove body `cut` and assert they fall apart.
   Joined without the cut fails naming the bodies that still join them;
   apart with the cut present fails as a vacuous assertion.
3. CHK-NET-27 run body: for each `contact` feature, move the actuating
   body along its declared axis by the feature's `gap` through the sim
   (M02 move, no physics step) and test touch between its conductive body
   and both terminals. Fail names the closest approach in `extra`.
4. CHK-NET-29 run body per ../CHECKS.md section 9.4: measured is the
   closed path ohm (plus declared skin for touch ports), legal 0 to
   `rejectOhm` from the port's ReadOutputs, `gates: ["read.rejectOhm"]`,
   `drivenBy` the port's wait pointer; a pass reports warn while the wait
   or the resistivity row is not measured.
5. reference/keys/flex-pair (M05-T18) gains: in build.ts one
   `apartExcept { nets: ["K<n>", "GND"], cut: "cap<n>" }` per key; its
   chase.ts `checks` already lists CHK-NET-13, -26, -27 and -29 (the spec
   fixture carries them); its covers list gains the same four ids. Re-accept expected/ once with the reviewed diff.
6. reference/electrical/pip-drive (M05-T11) adds CHK-NET-29 to its
   covers list, with the PIP START touch at 200 us as its fail fixture.
7. Fixtures under `packages/checks/test/fixtures/<id>/{pass,fail}.*`:
   CHK-NET-13 fail is a conductor ramp rising 10 mm over a 5 mm run
   (63.43 deg, computed); CHK-NET-26 fail is a flex-pair variant whose GND
   bus runs under key 1's trace; CHK-NET-27 fail is a contact whose `gap`
   is 0.48 mm short of the built cap-to-trace distance.
8. CHK-NET-30 (printed track swing: element resistance over element plus
   lead and drive resistance at least a declared fraction, warn, default
   30 percent) and CHK-FIT-07 (printed conductive socket on a printed
   stud: diametral interference 0.08 to 0.2, at least 3 collet fingers,
   axial squeeze 0.06 to 0.2) run here, entered by ../CHECKS.md from BAFFLE
   R3 and appended to the seed at M04-T12. Conductor dissipation stays a
   candidate in ../CHECKS.md 9.9 and RISKS.md R-26 until a coupon or cited
   source gives a limit; it would enter as CHK-NET-39, since M05-T14
   entered CHK-NET-31 to -38 for the KEYWAY gates.

Files to create:
- packages/checks/src/net/{net13,net26,net27,net29,net30}.ts, packages/checks/src/fit/fit07.ts
- packages/checks/test/fixtures/CHK-NET-13/, CHK-NET-26/, CHK-NET-27/, CHK-NET-29/

Acceptance:
- `npm test -w packages/checks -- net13 net26 net27 net29` exits 0 over:

| check | fixture | expected | qualifier |
|---|---|---|---|
| CHK-NET-13 | flex-pair traces on one face | 0.00 deg, pass | computed, this card |
| CHK-NET-13 | ramp 10 mm over 5 mm | 63.43 deg, legal 0 to 45, warn | computed, this card |
| CHK-NET-26 | flex-pair, cap1 cut | K1 and GND joined, then apart: pass | computed, this card |
| CHK-NET-26 | GND bus under key 1 | fail naming conductor.gnd and conductor.key1 | computed, this card |
| CHK-NET-27 | flex-pair at gap 1.44 | touch on both terminals: pass | computed, this card |
| CHK-NET-27 | gap 0.48 short | fail, closest approach 0.48 mm in `extra` | computed, this card |
| CHK-NET-29 | PIP A key, R 1687980 ohm, C 9.200 pF, wait 3500 us | legal 0 to 76086957 ohm, warn (wait and resistivity inferred) | computed, this card |
| CHK-NET-29 | PIP START touch, R 910897 plus skin 20000000 ohm, C 8.494 pF, wait 200 us | 20910897 ohm, legal 0 to 7848677 ohm, fail; fix wait 533 us predicts legal 0 to 20916726 ohm, warn | computed, this card |

- `npx --no-install hbf parity reference/keys/flex-pair` and `npx --no-install hbf parity
  reference/electrical/pip-drive` exit 0 after the re-accept.
- `npx --no-install hbf check.run reference/keys/flex-pair --only CHK-NET-29 --json`
  exits 0 with one warn per key net and `extra` naming the wait source.

Done when: a printed button whose path cannot settle inside its read wait,
whose contact never closes, or whose terminals are joined without the
actuator fails a named check on a green reference.


Card defects (M05-T19, found at build time 2026-10-09; written back here):

1. Step 3 moves "the actuating body along its declared axis", and
   ContactFeature declared neither. spec/features.ts gains optional
   `actuator` and `axis` (D-245); the flex-pair declares `cap<n>` and
   [0, 0, -1]. No SimHandle method moves one body, so the move is a rigid
   translation of the built mesh in packages/circuit `extract/actuated.ts`
   with the extraction touch rule, no physics step; "through the sim (M02
   move)" is not what runs.
2. Step 5 says chase.ts `checks` already lists CHK-NET-13, -26, -27 and
   -29 and the spec fixture carries them. Chase has no `checks` field
   (only a param row does, P-25) and spec/fixtures/keys-flex-pair.ts lists
   none; nothing was added. The covers list carries the four ids.
3. Step 4 asks for `gates: ["read.rejectOhm"]` and `drivenBy` the port's
   wait pointer. The seed loader carries no gates field and rejectOhm is
   not a part Metric, so the finding carries extra.gates "read.rejectOhm".
   The wait lives in Chase.hookup, never in params, and Fix.param and
   drivenBy point into params: the fix (the smallest whole microsecond
   wait that settles) travels in the constraint and in extra fixWaitUs,
   fixRejectOhm and fixVerdict. The seed's constraint
   circuit/charge-release-settle names no registered ConstraintDef.
4. The check.run acceptance line runs CHK-NET-29 through the M-S skeleton
   set over the skeleton nets, whose C is the 7 pF pin alone (no trace
   term): it reads legal 0 to 100000000 ohm at 3500 us, where circuit.solve
   reads 8.3 pF and 84337349 ohm on the same K1 (computed). Both run the
   one body, packages/checks/src/net/net29.ts. CHK-NET-13, -26 and -27 run
   in circuit.solve only; check.run at the M04 kernel set skips them. The
   default preset builds one key, so "one warn per key net" is one.
5. Landing CHK-FIT-07 (needs mesh and profile, so it runs at the M04
   kernel set) moves the report.json golden of every part reference: in
   eight references beyond flex-pair and pip-drive the skip reason "run
   lands M05" becomes "no feature target in this build", reportHash
   unchanged. They were re-accepted once with that one line reviewed
   (D-245); the card's re-accept list named two.
6. Step 8 had nothing in spec to read: ConductorFeature gains optional
   `role: "element"` (CHK-NET-30) and BoreFeature optional `onStud` (stud
   diameter, height, collet fingers; CHK-FIT-07), and seven profile
   constants carry the bounds (conductor.maxSlopeDeg, read.swing.minPercent,
   fit.collet.*). Drive resistance has no field or row, so the swing reads
   drive 0 and is an upper bound. No reference covers CHK-NET-30 or
   CHK-FIT-07; only their fixtures do.
7. The acceptance row "CHK-NET-27 flex-pair at gap 1.44": the flex-pair
   builds at 1.84 and passes CHK-NET-27 there in circuit.solve; the 1.44
   pass and the 0.48 short fail are a reduced flex key fixture. The fail
   reads 0.479922 mm because the mesher snaps the cap underside 4.92 to
   4.919921875 on the 1/1024 mm grid (computed).
8. The CHK-NET-29 A key row uses rounded inputs: reference/electrical/
   pip-drive gives C 9.19991 pF over 59.9957 mm of trace and legal 0 to
   76087660 ohm; 76086957 is the fixture at C 9.200 exactly.
9. Files to create named only the checks sources and fixtures. The card
   also needed spec/features.ts, packages/circuit/src/extract/actuated.ts
   and nets.ts (touchDistance), core/src/commands/circuit-solve.ts, the
   profile constants, two lineage copy rows (baffle.model/r3-36-collet,
   feeler.bench/thinpot-16-apart), packages/checks/test/fixture-load.ts,
   the entered, skeleton and circuit-solve test updates, D-245, EXIT-B.md
   and the packages/project graph fixture.
10. CHK-NET-13 on a filled region reads its face tilt, so the flex-pair
    column halves, vertical conductors in fact, read 0 deg; their
    resistance is the through row the circuit kernel prices (M05-T04).
11. Audit 2026-10-09: CHK-NET-29 computed its fix wait and its predicted
    bound in its own `settlingWait` (ohm x taus x pF x 1e-6, and wait x
    1e6 / (taus x C)), a second home of the charge-release reject bound.
    It now re-exports `settlingWait` from packages/circuit, which reads
    `rcTauUs` and `rejectOhmAt`, the same bound chargeReleaseRead writes;
    the fixture numbers (fix wait 533 us) are unchanged. Held by
    packages/circuit/test/one-home.test.ts.
---

## M05-T20 3MF per-object overrides for conductor parts

Goal: the 3MF writer sets the slicer overrides a printed conductor needs
from the body roles in Part IR, and CHK-3MF-08 refuses an export or slicer
save where interlocking beams can cut into a conductor (D-159 per-object
overrides; research/3dp-landscape.md section 10 item 2 and section 11
idea 8).

Inputs:
- fab-knowledge:research/3dp-landscape.md lines 320 to 343 (interlocking keys and defaults: `interlocking_beam` false, `interlocking_beam_width` 0.8 mm, `interlocking_depth` 2 cells; the conductor rule), lines 618 to 626 (section 9 gap 3: no per-object overrides for conductor parts), lines 680 to 690 (section 10 item 2) and lines 770 to 771 (section 11 idea 8)
- ../CHECKS.md section 9.11 (CHK-3MF-08 row and rule)
- spec/part-ir.ts (Body, BodyRole), spec/checks.ts (CheckDef, CheckTarget)
- packages/3mf writer and validator from M00-T07 and M00-T09; M05-T04 net extraction (conductive bodies)
- M05-T18 reference/keys/flex-pair

Steps:
1. Body adjacency metric: the mesh stage records `bodyAdjacency`, one row
   per pair of bodies with a coincident face, with the shared area in mm2
   (computed at build, hashed with the build per D-049).
2. Override table in `packages/3mf/src/overrides.ts`, keyed by body role,
   each row naming the check that wants it:

| applies to | key | value | wanted by |
|---|---|---|---|
| part whose body role is `conductor` or `flex-conductor` | `sparse_infill_density` | `100%` | CHK-NET-05 (resistance assumes a solid section) |
| object holding a conductor part, or sharing a face with one | `interlocking_beam` | `0` | CHK-3MF-08 |
| object holding a TPU body bonded to PETG with no conductor adjacency | `interlocking_beam` | `1` at slicer defaults | none yet; written only when a fit check asks, so it stays off in M05 |

   Overrides go into `Metadata/model_settings.config` as object and part
   metadata; they are process keys, so CHK-3MF-03 keeps refusing them in
   `project_settings.config`. A conductor rule wins over any other row for
   the same object.
3. CHK-3MF-08 run body per ../CHECKS.md 9.11: for every object that holds
   a conductor body or shares a face with one (from `bodyAdjacency`), the
   effective `interlocking_beam` (object metadata, else project value,
   else the slicer default false) must be off. In `--roundtrip` mode on a
   slicer save the Part IR comes from rebuilding the chase named in
   `Metadata/hackbuild_chase.json`; without that entry the check skips
   with the reason. A fail quotes the cross-section loss as
   `interlocking_depth` x `interlocking_beam_width` per shared side against
   the conductor width (inferred upper bound; the slicer's cell size is
   unverified).
4. The JS validator mirror and `tools/py/validate_3mf.py` both implement
   CHK-3MF-08; their verdicts agree on every fixture.
5. reference/keys/flex-pair adds CHK-3MF-08 to its covers list; its export
   carries the conductor overrides and passes.

Files to create:
- packages/3mf/src/overrides.ts, packages/3mf/test/overrides.test.ts
- packages/checks/src/3mf/chk-3mf-08.ts
- packages/checks/test/fixtures/CHK-3MF-08/{pass.3mf,fail-project-beam.3mf,fail-object-beam.3mf}
- tools/py/checks/chk_3mf_08.py

Acceptance:
- `npm test -w packages/3mf -- overrides` exits 0: the flex-pair export
  has `sparse_infill_density` `100%` on each conductor part and
  `interlocking_beam` `0` on each object that holds one; no process key
  appears in `project_settings.config`.
- `npm test -w packages/checks -- chk-3mf-08` exits 0 over:

| fixture | expected | qualifier |
|---|---|---|
| flex-pair export | pass | computed, this card |
| flex-pair with project `interlocking_beam` 1 | fail naming each conductor object; loss 1.6 mm per side (2 x 0.8) against 1.4 mm traces | inferred upper bound |
| flex-pair with object metadata `interlocking_beam` 1 on the cap object sharing a face with key 1 | fail naming that object and conductor.key1 | computed, this card |

- `uv run --project tools/py tools/py/validate_3mf.py --export` on the
  three fixtures gives the same verdicts.

Done when: a conductor never leaves the writer without its overrides, and
an interlocking beam against a conductor fails a named check.

Open item: whether Flash Studio honours part-level `sparse_infill_density`
and object-level `interlocking_beam` from `model_settings.config` is
unverified until the owner opens the flex-pair export in it; until then the
print card lists both settings for the person to confirm in the slicer.

Card defects (M05-T20, found at build time 2026-10-09; written back here):

1. Fixture row 3 names "the cap object sharing a face with key 1". The
   flex-pair export is one object, flex-pair, holding every part
   (core/src/commands/build.ts export3mf writes one object per part
   build), and cap1 shares faces with cone1 (10.733738 mm2) and top1
   (20.912209 mm2) only, never with conductor.key1, which touches the pad
   (39.354178 mm2) and its column half (1.944367 mm2) (computed, stage 8
   adjacency). fail-object-beam.3mf sets the object's `interlocking_beam`
   to 1 on flex-pair, which holds cap1 and conductor.key1, and the fail
   names flex-pair and conductor.key1. The cross-object branch (an object
   with no conductor that touches one in another object) is held in
   packages/3mf/test/overrides.test.ts by splitting the flex-pair into pad,
   caps and cones objects.
2. Fixture row 2: with the writer's object line `interlocking_beam` 0 in
   place the object value wins over the project, so a project value of 1
   alone passes. fail-project-beam.3mf also drops the object line, as a
   slicer save that cleared the object setting would. It fails CHK-3MF-03
   too (a process key in project_settings), as it should.
3. Step 3 takes the roundtrip Part IR "from rebuilding the chase named in
   Metadata/hackbuild_chase.json". The validator mirrors cannot rebuild a
   chase: packages/3mf imports no workspace package (D-027) and the Python
   validator has no core. The writer copies what the check needs from Part
   IR into that entry as a conductor record (objects holding or touching a
   conductor, conductor parts with declared width, touching parts with the
   shared area), written only when such an object exists so every other
   package keeps its bytes. Both mirrors read the record; with a build at
   hand (check.run, parity, the export.run gate, and `check.run <design>
   --artifact <save>`, which rebuilds the design) the run body also holds
   the record against Part IR roles and adjacency, and a record that misses
   a beam-free body fails. A package without the record skips (D-246).
4. "Loss 1.6 mm per side (2 x 0.8) against 1.4 mm traces": the flex-pair
   column halves are 1.2 mm wide (colR - cg2), so the fail quotes the 1.6
   mm bound against conductors 1.2 to 1.4 mm wide (computed from the
   declared widths, loss inferred).
5. The slicer defaults 0.8 mm and 2 cells had no profile row. Profile
   constants `3mf.interlockingBeamWidth` and `3mf.interlockingDepth` carry
   them (vendor, Orca `PrintConfig.cpp` 4792 to 4870 by way of
   research/3dp-landscape.md lines 324 to 336); the cell size is not in the
   survey and is taken as one beam width (inferred).
6. Step 1 left the adjacency method open. Stage 8 unions each pair whose
   bounds meet within one grid step and takes half the surface the union
   loses; rows at or under one grid cell squared drop. It counts coincident
   faces only: a stage 6 coincidence inset leaves an insert's side walls
   one grid step (1/1024 mm) off its host, so a conductor partitioned out
   of the pad shares its floor with the pad and never its sides. A
   conductor touching a neighbour only through inset side walls would get
   no row; no reference holds one.
7. No artifact check was resolved per design apart from the skeleton's
   CHK-3MF-06 and -07. CHK-3MF-08 resolves for chases that list the
   circuit kernel (core/src/kinds.ts), the kernel whose conductor kind
   makes conductor bodies, and the flex-pair's draft-kind design now takes
   the listed kernels' checks as a stage design does. That moves the
   registryHash, so the buildHash, of every reference listing circuit:
   flex-pair, pip-buried-route, blocks-pullup-band, capricate-touch,
   trace-width-budget and pip-drive; their goldens were re-accepted once
   (D-246). export.run and tools/slice/slice.mjs gate the written package
   on CHK-3MF-08 beside -06 and -07 where it resolves.
8. Files to create named neither the Part IR field nor the writer mirror.
   Also touched: spec/part-ir.ts (BodyAdjacency, Part.bodyAdjacency),
   spec/checks.ts (ArtifactBytes.part), packages/mesh stages.ts and
   partir.ts (and the content hash), packages/3mf writer model.ts, index.ts
   and card.ts, the validator index.ts and rules.ts (CHECK_META), and
   src/validate/chk-3mf-08.ts (the package rule both TypeScript callers run),
   packages/checks defs/3mf/CHK-3MF-08.ts and 3mf/package-checks.ts, the
   seed row (entered by M05-T20), entered.test.ts, core build.ts,
   check-run.ts, export-run.ts, parity.ts and kinds.ts,
   packages/profile/data/constants.json, tools/py/orca3mf.py (the Python
   writer mirror writes the same overrides, since test_agreement.py holds
   both writers equal on the flex-pair input), tools/py/validate_3mf.py,
   test_agreement.py, test_validate.py and test_corpus.py,
   tools/corpus/3mf/dump-input.mjs and inputs/flex-pair-two.json (body,
   role, width and adjacency), the fixture generator
   tools/corpus/3mf/make-chk-3mf-08.mjs (it builds through core, which the
   checks package may not import), the flex-pair print card
   (test/card.ts lists the per-object settings), CHECKS.md 9.11,
   knowledge/kernels/3mf-dialect.md and docs/reference/checks.
9. CHECKS.md 9.12 runs CHK-3MF-09 "at M05, beside CHK-3MF-08 (M05-T20)";
   no M05 card carries it, and it is not built here.
10. The open item is answered for the headless CLI only: two probe
    slices of the preset "two" export through `tools/slice/slice.mjs`
    with a fresh `--datadir` (Flash Studio 1.7.14, CLI Orca-Flashforge
    2.3.2) show the CLI applies both keys from `model_settings.config`:
    `interlocking_beam` 1 on the object changes the toolpaths (G-code
    685544 against 686412 bytes), and `sparse_infill_density` 100% on the
    pad part takes its sparse infill sections from 47 to 12 (computed).
    The writer's own overrides move no toolpath on the flex-pair, whose
    conductor parts are already filled by their walls with beams off by
    default. Whether the GUI shows and keeps them is not run; EXIT-B.md
    section 2 asks the person to look
    (`fab-knowledge:evidence/virtual-print/m05-t20/probes/result.json`).

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| divider 2.5 V both engines; LEFT RC crossing 22.238 us both engines, relative difference under 1e-6 | computed | M05-T01 | `npm test -w packages/circuit -- spice` |
| per-MCU rows rp2040 50000 to 80000 ohm, 0.8 to 2.0 V; esp32-c3 45000, 0.825 to 2.475 V | vendor | M05-T02 | `npm test -w packages/catalog -- mcu` |
| analytic DC equals BOSS on every BOSS scene within 1e-9 V | computed | M05-T03 | `npm test -w packages/circuit -- nodal` |
| extraction and resistance goldens (20833 ohm, 1041667 ohm, 36.52, 68.09, 2738.8 ohm) | computed | M05-T04 | `npm test -w packages/circuit -- extract` |
| read models: tau 15.69 us, settle 78.47 us, reject 4.35 Mohm at 200 us, 76.09 Mohm at 3500 us | computed | M05-T05 | `npm test -w packages/circuit -- read` |
| BLOCKS at BOSS 50 kohm: cPLA 10, 40, 80, 120, 150, 170, 200 mm give 1.31, 1.62, 1.92, 2.12, 2.24, 2.31, 2.39 V within 0.01 V; cTPU 3.15 to 3.27 V at 40 to 200 mm; per-MCU states as tabled | computed | M05-T07 | `npx --no-install hbf parity reference/electrical/blocks-pullup-band` |
| PIP route legacy mode bit equal, 12 nets, 0 conflicts, 0 unrouted, 2 iterations | computed | M05-T08 | `npm test -w packages/copper -- negotiated` |
| TOGGLE presets 1, 1, 1, 13 tries; blocks8 2 layers; BLOCKS seats 16, 16, 28, 30, 40 routed | computed | M05-T09 | `npm test -w packages/copper -- search`, `npm test -w designs/blocks -- route-seat` |
| PIP stack: net-to-net 0.600 at 1.40 mm traces, every net one piece, zero silent failures over the seed-1 sweep (28 clean, 12 failing loudly) | computed | M05-T10 | `npx --no-install hbf parity reference/electrical/pip-buried-route`, `npm test -w packages/checks -- net-sweep` |
| PIP readouts: keys 1.50 to 1.72 Mohm, touch 0.91 to 0.93 Mohm, tau 15.7 us, settle 78 us | computed | M05-T11 | `npx --no-install hbf parity reference/electrical/pip-drive` |
| Capricate: 30 kohm ceiling, 8 pass and 36 fail over 44 cases (30 kohm read as legal; 4 and 40 if read as excluded), length ceiling 1095.4 mm along (the length at which the trace reaches the ceiling, untested past Capricate's 10 cm) | computed; rho and ceiling measured by others; the case split inferred from the paper's grid | M05-T12 | `npx --no-install hbf parity reference/electrical/capricate-touch` |
| KEYWAY family oracle 45, 60, 59, 85, 85, 95, 57 gates, min clearance 1.000, 1.200, 1.203, 1.000, 1.100, 1.000, 1.200 | computed | M05-T13 | `uv run --project tools/py tools/py/copper/test_oracle.py` |
| KEYWAY on the package: 45 gates at 1.00 mm; SPLICE ladder 0.94 mm gap, 0.75 erosion one piece per net | computed | M05-T14 | `npx --no-install hbf parity reference/copper/keyway`, `npx --no-install hbf parity reference/copper/splice-ladder` |
| six family boards on the package with their gate counts | computed | M05-T15 | `npx --no-install hbf parity reference/copper/<name>` |
| hackbuild-copper trigger evaluated and recorded: part one holds; part two holds (route-seat and all fourteen `hbf parity` rows exit 0, the eight copper references through the surface path); closure fails on geom, spec; not extracted (rerun 2026-10-09 after the fixer, exit 1) | n/a | M05-T16 | `node tools/extract-check.mjs copper`, docs/plan/extractions.md |
| keys flex-pair: CHK-KEY-01 measured 1.84 mm in legal 1.428 to 2.04 at the built cone 4.08 mm (D-223, D-241); K1 along segment 74404.8 ohm (inferred tier); expected/ written | computed | M05-T18 | `npx --no-install hbf parity reference/keys/flex-pair` |
| net checks: CHK-NET-13 63.43 deg warns; CHK-NET-29 START touch at 200 us fails 20910897 against 7848677 ohm, fix wait 533 us; A key at 3500 us warns at legal 0 to 76086957 ohm | computed | M05-T19 | `npm test -w packages/checks -- net13 net26 net27 net29` |
| per-object overrides on the flex-pair export; CHK-3MF-08 pass on it, fail on the project-beam and object-beam fixtures, js and py agree | computed; loss inferred | M05-T20 | `npm test -w packages/checks -- chk-3mf-08` |
| CI green incl. house-rules, derived, tiers, determinism | n/a | M05-T17 | CI |

Decides: D-007, D-008, D-010, D-013, D-020, D-021, D-025, D-029, D-036, D-037, D-040, D-041, D-044, D-045, D-049, D-051, D-056, D-057, D-063, D-064, D-074, D-075, D-076, D-077, D-078, D-079, D-080, D-081, D-082, D-084, D-085, D-086, D-087, D-092, D-105, D-106, D-114, D-142, D-149, D-152, D-153, D-154, D-156, D-247
