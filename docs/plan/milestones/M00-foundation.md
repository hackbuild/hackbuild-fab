# M00 foundation

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: profile, geom, mesh and 3mf at parity, the hbf CLI skeleton with the
error contract, and hackbuild-3mf extracted.
Depends on: M-S exit A (D-179); M00 completes the profile, mesh, 3mf and
core slices M-S left thin, on draft contracts until M-S exit B
Adopted dependency: manifold-3d 3.5.4, jszip 3.10.1, lib3mf 2.5.0
(validation only) (MILESTONES.md 1.2, D-040); the legacy COLLAR dump script also
uses @playwright/test 1.63.0 and the sweep uses fast-check 4.10.2, both
already pinned in D-040
Commands added: part.build, check.run, export.run (kind 3mf, TTY gate),
part.inspect, view.render; utility verbs doctor, explain, parity
(MILESTONES.md 1.3)
Release at exit: hackbuild-3mf 0.1.0 on npm and PyPI from one tag after
D-037 (D-027)

hbf (working name) is the binary with CLI, MCP and HTTP transports; only the
CLI exists in M00. CHASE (working name) is the typed design document; the
chase package arrives at M10, so M00 references carry a `chase.ts` typed
against `spec/chase.ts` with no runtime chase package. PIP (was HAFT) is the
published print-in-place controller at hackbuild/pip-controller (D-013).
Every number in this file carries a qualifier (measured, computed, vendor,
inferred, unknown) or names the file it was counted from (D-007). Numbers
marked "counted 2026-10-04" were read from the named file by the plan
writer on that date; the M00 tests recount them and the generated value
wins (D-010).

## What this milestone decides and carries

| item | decision or correction | card |
|---|---|---|
| material-level loss wins, realGap pinned | D-100 | M00-T02 |
| provenance fields and tiers on every profile row | D-099, D-083 (owner default) | M00-T02 |
| bleed default 0 until a coupon | D-084 | M00-T02 |
| machines and dated presets, one PETG table from the gold | D-101 | M00-T02 |
| geom wraps CrossSection, no Clipper2 dependency | D-163 | M00-T03 |
| dyadic 1/1024 mm vertex snap | D-054 | M00-T03 |
| CHK-3MF-04 split into coincidence and pinch insets | D-070 | M00-T03, M00-T09 |
| wasm scope ownership, live count 0, ExecutionContext, union fallback | D-055 | M00-T04, M00-T06 |
| meshHash with triangles, BuildInputs | D-051 | M00-T04, M00-T13 |
| MeshRoute union and route guarantees | D-053 | M00-T05 |
| stage order of the kernel | D-047 | M00-T05 |
| multi-body Part IR, metrics and warnings | D-048, D-049 | M00-T05, M00-T13 |
| 3MF dialect, 127-key per-slot template | D-159, C-07 | M00-T07, M00-T08 |
| reproducible 3MF bytes and artifactHash | D-052, C-08 | M00-T07, M00-T08, M00-T14 |
| CHK-3MF-06 and CHK-3MF-07 rewritten | D-068, D-069, C-07 | M00-T09 |
| validator modes, numpy declared, Python stays in tools/py | D-140 | M00-T09 |
| conformance corpus with known-bad fixtures | D-152 (level 7) | M00-T10 |
| COLLAR key-set parity, SPRUE geometry parity | D-159, C-10 (SPRUE 21 keys) | M00-T11, M00-T12 |
| hbf CLI from M00 with CommandResult and exit codes | D-064, D-106, D-114 | M00-T13 |
| export gate on the CLI: TTY, no bypass, never for a failing build | D-109 | M00-T13 |
| content-addressed store and hbf:// URIs | D-050 | M00-T13 |
| determinism job on x64, arm64 and macos-14 | D-056 | M00-T14 |
| hackbuild-3mf extraction and first release | D-027, D-037 (owner) | M00-T15 |
| chase read as data, build.ts in a sandbox, untrusted reader limits | D-166, D-178 | M00-T16 |

Detail lives elsewhere and is linked, never restated: package boundaries in
../PACKAGES.md and ../ARCHITECTURE.md; check text in ../CHECKS.md; profile
rows in ../PROFILE.md; command shapes in ../AGENT-SURFACE.md; test levels and
CI jobs in ../TESTING.md; extraction procedure and repo state in
../REPOS.md; licences in ../LICENSING.md.

## Evidence roots

| short | absolute path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| syn | `fab-knowledge:synthesis/` |
| corpus | `fab-work-directory:` |
| repos | `hackbuild/` |

x and hbf are the pinned copies M-1-T00 made of the purgeable scratch
folders, checked by `fab-knowledge:evidence/SHA256SUMS`;
every sha256 quoted below matches the pinned file. Citations into syn and
`fab-knowledge/sources/` are provenance: where a step needs their content,
the card carries it inline or cites the plan file that holds it first.

Cards write evidence paths in full. The files M00 reads most:

| file | absolute path | what it is |
|---|---|---|
| gold round trip | `fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf` | Flash Studio save of 2026-08-19 (zip entry dates), 175,450 bytes, sha256 `24ee9c66419ac23eb2075e859bd0191a6431abb1d7d3628eea2372abc854f0c5` (counted 2026-10-04); a byte-identical copy sits at `3d/coin/hackbuild-coin-nfc.3mf` |
| COLLAR legacy bench | `fab-work-directory:benches/collar-coin/outputs/collar/collar.html` | identical to `hbf/designs/collar/legacy/collar.html`, sha256 `ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46` (counted 2026-10-04) |
| seed writers | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/` | orca3mf.js, orca3mf.py, validate_3mf.py, harvest_filament_keys.py, demo_coin.py, materials.json, filament_template.json (97 keys), build_orca3mf_js.py |
| seed raster mesher | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mesh/rastermesh.js` | raster in XY, exact in Z |
| 3MF dialect record | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/3mf-dialect.md` | normative dialect rules; its line excluding filament_extruder_variant is superseded by C-07 and D-159 |
| mesh kernel record | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/mesh-kernel.md` | raster, prism and revolve traps; its 6-decimal snap is superseded by D-054 |
| four-slot gold pair (inferred) | `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/feeler/feeler-ladder (1).3mf` and `feeler-ladder (2).3mf` | owner Downloads; feeler-ladder (1).3mf is the writer export (97 keys, sha256 `8f61c82cdfb2b9b308738cae21b27d268952e05fe5a85c267c92fc6768e426cf`) and feeler-ladder (2).3mf the Flash Studio save (669 keys, 127 per-filament at length 4, sha256 `78436fb9e8175222833163f6b703699c98ff665bcd2bc44694e1297214707300`); the save overwrote its input, so the pairing is inferred |
| two-slot save | `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/gib/gib-finger-rigid-200x14.3mf` | owner Downloads; Flash Studio save with two filament slots, sha256 `f5a83cb1f988c6bab5b0b5553aebcf3ef0032c7b39f1f248db717bd179d35157` (counted 2026-10-04) |
| verified claims | `fab-knowledge:synthesis/verified-claims.md` | section C2 is the authority on every 3MF number in this file; ../TESTING.md 6.2 and 6.3 and ../CHECKS.md 7.1 to 7.3 carry the numbers the steps use |

## What M00 does not do

| item | where it lands |
|---|---|
| pause events in `Metadata/custom_gcode_per_layer.xml` from `pocket.sealed` | the milestone that admits the sealed pocket kind (D-062) |
| per-object overrides from body roles (conductor parts solid infill, `interlocking_beam` 0) and CHK-3MF-08 | milestones/M05-circuit-copper.md M05-T20, once net extraction knows the conductive bodies |
| optional `paint_color` route | later 3mf work under D-159; not an M00 exit |
| `prusa` writer target | open item, see "Open items" |
| feature kind generators (chamfer, round and the rest) | the milestone that touches each kind (D-058) |
| routes lathe, trace, imported, brep | lathe and trace with their designs; brep at M14 (D-024); csg builds at M00 for the flex-pair conductors (M00-T05 step 6) |
| art intake, quantize, inlay feature kind | M03 |
| MCP server, loop detection, output caps | M12 (D-107, D-110, D-111) |
| check registry of all 86 seeded checks as CheckDef | M04; M00 implements only the checks its exits need |

---

## M00-T01 Wire the adopted dependencies and the five packages

Goal: profile, geom, mesh, 3mf and core exist as workspace packages that
import only along `tools/tiers.json`, with manifold-3d, jszip and the uv
Python environment installed at exact pins.

Inputs:
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/packages/profile/`, `geom/`, `mesh/`, `3mf/` (README and package.json; the README "May import" lines are stale, the tiers table wins)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/core/`
- `fab-knowledge:plan/PACKAGES.md` sections 3.1 (tier table) and 5.1 (3mf with its Python half); `fab-knowledge:plan/REPOS.md` section 4 (one published package, D-036) (source: api-library-ai-design.md 3.3 to 3.5)
- repo: `tools/tiers.json` and `tools/tiers.mjs` (M-1-T12), root `package.json` (M-1-T01)

Steps:
1. Create `packages/profile`, `packages/geom`, `packages/mesh`,
   `packages/3mf` and `core` with `package.json`: name `@hackbuild/<name>`
   (core is `@hackbuild/core` with bin `hbf`), `"private": true`, `"type":
   "module"`, `"license": "MIT"`, `"author": "Moheeb Zara
   <hackbuildvideo@gmail.com>"`, no `contributors` field, exact pins (D-001,
   D-036). `core/bin/hbf.mjs` is a two-line shim, `#!/usr/bin/env node`
   then `import "../dist/cli.js";`. Packages export `./dist`, so the CLI
   runs from built output and never from `src/` through type stripping;
   every `npx --no-install hbf` command in this file assumes `npx tsc -b` has run
   after `npm ci`.
2. Add `manifold-3d` 3.5.4 to geom and mesh, `jszip` 3.10.1 to 3mf, `zod`
   4.6.5 to core, `fast-check` 4.10.2 and `@playwright/test` 1.63.0 as root
   dev dependencies. Commit `package-lock.json` (D-038 default: npm
   workspaces). Then run `npx playwright install --with-deps chromium`:
   `@playwright/test` ships no browser, and `tools/legacy/collar-dump.mjs`
   (M00-T11) fails without one. view.render (M00-T13 step 11) needs no
   browser. Every CI job that launches Playwright runs the same line after
   `npm ci`. On macOS 12 (the owner's machine, ../RISKS.md R-24)
   Playwright 1.63.0 installs no Chromium (`ERROR: Playwright does not
   support chromium on mac12-arm64`,
   `fab-knowledge:evidence/audit/m0/exec/logs/pw-install.txt`).
   `tools/legacy/collar-dump.mjs` and every local Playwright launch read
   `HBF_CHROMIUM` as an executablePath override (system Chrome; the audit
   run used Chrome 150.0.7871.125). The local acceptance is
   `node -e 'require("fs").accessSync(process.env.HBF_CHROMIUM || require("playwright").chromium.executablePath())'`.
   CI on ubuntu-24.04 keeps the install line, and the parity numbers of
   record come from CI. Record the host OS and the `HBF_CHROMIUM` browser
   version in ../PACKAGES.md beside the pins, citing R-24.
3. Append the three tier 0 pairs to `sameTier` in `tools/tiers.json`, in
   the same change as the imports (../PACKAGES.md 3.2): `["geom",
   "profile"]`, `["mesh", "profile"]`, `["mesh", "geom"]`. Each pair is
   `[source, target]`. M-1-T12 writes `sameTier` empty, so without these
   pairs `node tools/tiers.mjs` fails on the first geom or mesh import.
   Then confirm the edges against `tools/tiers.json` (D-044): profile
   imports spec; geom imports spec, profile; mesh imports spec, profile,
   geom; 3mf imports spec, profile, mesh; core imports every headless
   package and never ui. No package in tiers S to 2 imports `document`,
   `window` or vue (D-045).
   Declare each edge twice, because packages resolve each other through
   `./dist/index.d.ts` and `tsc -b` builds only what it is told comes
   first. For every edge where X imports Y:
   - add `"@hackbuild/Y": "0.0.0"` to X/package.json `dependencies`
     (`"@hackbuild/spec": "0.1.0"` for spec);
   - add `{"path": "../Y"}` to X/tsconfig.json `references` (from core,
     `{"path": "../packages/Y"}`); skip this for spec, which is `noEmit`
     and resolves as source;
   - keep the root tsconfig.json references topological by tier (spec,
     profile, geom, mesh, 3mf, then core).
   Run `npm install` after the dependency edits so the lockfile records
   them. `node tools/tiers.mjs` fails on an `@hackbuild` import with no
   matching dependency or reference (M-1-T12 step 2). In a scratch
   workspace (typescript 7.0.2), mesh importing profile without the
   reference gave TS2307 and `tsc -b` exit 2 on a clean tree; with both
   declared it exited 0.
4. Extend `tools/py/pyproject.toml` (created in M-1-T07) with
   `lib3mf==2.5.0` and pytest, keeping the exact pins for numpy, trimesh,
   manifold3d and shapely as resolved on the day (`uv lock`); numpy is
   declared because the seed validator crashed without it (D-140,
   verified-claims C2). The scaffold `handoff/hbf/scaffold/pyproject.toml`
   is not copied or merged: it lists kiutils (GPL-3.0, excluded by D-043;
   kicadts replaces it, D-090). Every Python command in this milestone
   runs as `uv run --project tools/py ...` from the repo root, where no
   pyproject exists. Record the resolved Python and package
   versions in ../PACKAGES.md.
   Declare lib3mf as `lib3mf==2.5.0; platform_machine != 'aarch64'`:
   2.5.0 ships no linux aarch64 wheel and no sdist, only
   manylinux2014_x86_64, macosx_10_9_universal2 and win_amd64
   (`fab-knowledge:evidence/audit/m0/exec/logs/lib3mf-arm64.txt`);
   macOS arm64 uses the universal2 wheel. `validate_3mf.py` imports
   lib3mf inside the lib3mf rule only; on a platform where the marker
   excludes it, that rule is reported not run (D-153) and the run exits by
   its other rules. M00-T09 step 6 (exit 70 on a missing module) applies
   to modules the pyproject declares for the running platform.
   Write `tools/py/.python-version` with the interpreter uv resolved on
   the day (3.14; CPython 3.14.8 on the owner's machine, measured
   2026-10-05, where 2026-10-04 read 3.14.6) and
   set `requires-python = ">=3.14,<3.15"`; CI installs uv with
   `astral-sh/setup-uv` and runs `uv python install` from that file, so
   both legs and the owner resolve the same uv.lock wheels. Record the
   exact version in ../PACKAGES.md. Node follows the M-1-T01 toolchain
   path (22.18.0 through nvm); host Node 22.12.0 fails engine-strict.
5. Write a smoke test in mesh: create a 10 mm Manifold cube inside a scope,
   read its volume (1000 mm3, computed), free it, assert the live count is
   0.
6. manifold-3d 3.5.4 has no runtime version call and does not export
   `./package.json`, so the version cannot be read at load in tier 0.
   core reads the resolved `node_modules/manifold-3d/package.json` into
   `BuildInputs.engines.manifold` (D-051), and a mesh smoke test asserts
   that the resolved package version equals the 3.5.4 pin.
7. Give `packages/3mf/tsconfig.json` and `core/tsconfig.json`
   `"types": ["node"]` on top of the base. jszip 3.10.1's `index.d.ts`
   names `Buffer`, `NodeJS` and `Blob`, and core reads `node:fs` and
   `node:child_process`; the base `types []` (M-1-T01) leaves those
   undefined and `tsc -b` fails with TS2688, TS2304, TS2503 and TS2591.
   `@types/node` 22.20.5 is already a root dev dependency from M-1-T01;
   no package pins its own copy. `skipLibCheck` stays false: `@types/node`
   22 declares a global `Blob`, so jszip's declarations check clean
   (scratch run, typescript 7.0.2, `tsc -b --force` exit 0). profile,
   geom and mesh keep `types []`; manifold-3d 3.5.4 typechecks without
   Node types.
8. Give each of the five packages a `test` script (`vitest run
   --passWithNoTests`) and add the `unit` job to
   `.github/workflows/ci.yml` (level 1 of ../TESTING.md, D-152) in the
   M-1-T05 job shape:

   ```yaml
     unit:
       runs-on: ubuntu-24.04
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version-file: .nvmrc
             cache: npm
         - run: npm ci
         - run: npm test --workspaces --if-present
   ```

Files to create:
- packages/profile/package.json, packages/geom/package.json,
  packages/mesh/package.json, packages/3mf/package.json
- core/package.json, core/bin/hbf.mjs
- packages/*/src/index.ts, packages/*/tsconfig.json
- packages/mesh/test/smoke.test.ts
- tools/py/pyproject.toml, tools/py/uv.lock (extended from M-1-T07),
  tools/py/.python-version
- tools/tiers.json (edit: three `sameTier` pairs)
- root tsconfig.json (edit: references in tier order); each package's
  `dependencies` and tsconfig `references` per edge
- packages/3mf/tsconfig.json and core/tsconfig.json carry `"types": ["node"]`
- .github/workflows/ci.yml (edit: job `unit`)

Acceptance:
- `npm ci` exits 0.
- On CI (ubuntu-24.04): `npx playwright install --with-deps chromium`
  exits 0. Locally and on CI:
  `node -e 'require("fs").accessSync(process.env.HBF_CHROMIUM || require("playwright").chromium.executablePath())'`
  exits 0 (macOS 12 sets `HBF_CHROMIUM`, step 2).
- `node tools/tiers.mjs` exits 0, and `sameTier` in `tools/tiers.json`
  holds exactly the three pairs above.
- `npm i -w @hackbuild/3mf jszip@3.10.1 && npx tsc -b --force` exits 0
  (jszip and core resolve Node types through `"types": ["node"]`).
- `rm -rf packages/*/dist packages/*/*.tsbuildinfo core/dist core/*.tsbuildinfo && npx tsc -b` exits 0 (a clean tree, so a missing reference cannot hide behind a stale dist).
- `node -e 'for (const f of ["packages/3mf/tsconfig.json","core/tsconfig.json"]) { const o=require("./"+f).compilerOptions; if (!o.types.includes("node") || o.skipLibCheck===true) process.exit(1) }'` exits 0.
- `npm test -w packages/mesh` exits 0; the smoke test reports volume 1000
  and live count 0.
- `uv run --project tools/py python -c "import numpy, trimesh, manifold3d, lib3mf, shapely"` exits 0 on macOS and linux x64 (lib3mf is absent by marker on linux aarch64).
- `uv run --project tools/py python -c "import sys; print(sys.version)"` prints the version in `tools/py/.python-version`.
- `node tools/lint-voice.mjs packages core tools/py` exits 0.
- `npm test --workspaces --if-present` exits 0 (the `unit` job command).

Done when: CI typecheck, tiers and unit jobs are green with the five new
packages present.

## M00-T02 profile: lookup with read tracking, loss, fits, machines

Goal: every number a build reads comes from `ProfileLookup` with
provenance, the lookup records what was read, and
`realGap(0.275, 'hole', 'ffc5p', 'petg')` returns 0.075 per side to 6
digits through material-level loss (0.15 across the joint, the D-100
figure).

Inputs:
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/profile.seed.json` (imported in M-1-T07)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/3mf/materials.json`
- gold round trip (see Evidence roots) and `3d/coin/hsl.3mf`
- `fab-knowledge:synthesis/plan-deltas.md` R57
- `fab-knowledge:plan/PACKAGES.md` section 4.2 (profile) (source: mappings.md 4.1, profile row)
- repo: `spec/profile.ts`, ../PROFILE.md

Steps:
1. Implement the types of `spec/profile.ts`. Provenance is `{machine,
   coupon, date, method, tier, conditions {temperature, speed, layer,
   lineWidth, direction}}`; methods are datasheet, coupon, failure, felt,
   listing, derived (D-099). Tiers are verified, measured, vendor,
   community, inferred (D-083 owner default). A row without a tier fails
   load with E_SCHEMA.
2. `ProfileLookup` records every read as `(table, id, field)` in a set.
   `reads()` returns the rows in read order (spec/profile.ts; core relies
   on that order) and `readSet()` returns them sorted, with the rows.
   `profileHash` is sha256 over RFC 8785 canonical JSON of `readSet()`,
   exactly the rows read (D-051). Reading one row twice
   records it once; reading a different row changes the hash.
3. Loss is one table keyed by (process A, process B, motion) (D-100), per
   side (GapBasis perSide); the loader refuses a row with any other basis
   (../PROFILE.md 7.1). Seed rows, halved from the diametral seed figures
   with the seed figure kept in the source: machine ffc5p
   `holeUnderPerSide 0.075, outerOverPerSide 0.05` (inferred, derived;
   seed `ffc5p.processLoss` 0.15/0.10 diametral, `fits.py` docstring);
   material petg at layer 0.24 `holeUnderPerSide 0.125, outerOverPerSide
   0.075` (inferred, failure; seed `petg.processLossAt024` 0.25/0.15
   diametral, OGEE16 TIMES.md). Material-level wins when both exist.
4. `realGap(drawnPerSide, side, machine, material, layer?, feature?)`
   returns a number in mm per side, as `spec/profile.ts` types it;
   `realGaps` returns `{hole, outer}`. The row used and its tier are
   recorded through the lookup's read set and warnings. For side `hole`
   (printed hole around a printed shaft) the result is `drawnPerSide -
   holeUnderPerSide - outerOverPerSide`. Pinned cases:
   - `realGap(0.275, 'hole', 'ffc5p', 'petg')`: 0.275 minus 0.125 minus
     0.075 is 0.075 (computed; 0.55 drawn and 0.15 real across the joint,
     the D-100 figure), read from `material:petg@0.24`, tier inferred.
   - The same call against a test profile with the petg loss row removed:
     0.275 minus 0.075 minus 0.05 is 0.15 (computed), read from
     `machine:ffc5p`. This proves which level applied.
   - The same call at layer 0.20, where no material row exists: 0.15 from
     the machine row, tier inferred, and a warning naming the missing
     material row.
5. Bleed is a field per (machine, material pair) and returns 0 with tier
   inferred and reason "no coupon" until a coupon writes a row (D-084).
6. Fit classes load from the seed `fits` rows. PSLIP is the mixed printed
   and cut class with print-over 0.15 (inferred until a mixed coupon); a
   lookup of PSLIDE returns E_REF (D-100).
7. Machines (D-101): ffc5p, Flashforge Creator 5 Pro, 4 extruders,
   envelope 256 x 256 x 256 mm (vendor, datasheet: read from the gold
   `printable_area` and `printable_height`, ../PROFILE.md 2.4 and 8); presets keyed
   in the ../PROFILE.md 8.1 form `<machine>[-n<nozzle x 100>]_<yyyymmdd>`
   by harvest date, one per nozzle (`ffc5p_20260819` and
   `ffc5p-n025_20260819`; both saves are dated 2026-08-19, so the bare
   `<machine>_<yyyymmdd>` form would collide):
   - 0.4 nozzle preset from the gold: printer `Flashforge Creator 5 Pro 0.4
     nozzle`, process `0.24mm Standard @FF C5`, layer 0.24 (vendor, slicer
     save of 2026-08-19).
   - 0.25 nozzle preset from hsl.3mf: printer `Flashforge Creator 5 Pro 0.25
     nozzle`, process `0.12mm Standard @FF C5 0.25 nozzle`, layer 0.12
     (vendor, slicer save of 2026-08-19).
   - centauri (Elegoo Centauri Carbon, 256 mm cube, vendor); laser1220 and
     sheet600 with kerf null (inferred) until measured.
8. One PETG table harvested from the gold (D-101). The three gold slots use
   three presets: `Flashforge HS PETG @FF C5P`, `Flashforge PETG Pro @FF
   C5P`, `Generic PETG @FF C5P`; nozzle_temperature is 235, 255, 255 and
   filament_max_volumetric_speed 18, 12, 12 (vendor, counted 2026-10-04 in
   the gold project_settings.config). The seed materials.json PETG row
   (nozzle 240, maxvol 10) stays only as the Generic fallback for a
   material type the gold lacks, and the disagreement is listed in the
   table's notes.
9. `constant(id)` returns `{value, provenance}` for every seeded constant
   (for example `28byj48.halfStepsPerRev` 4075.7728, vendor, derived from
   the gear train 63.68395 x 64, ../PROFILE.md 2.4). Three constants are new in M00 and enter `constants.json` with
   these tiers and sources:

   | id | value | tier | source |
   |---|---|---|---|
   | `3mf.coincidenceInset` | 0.001 mm | inferred | D-070 (1 micron edge-normal inset) |
   | `3mf.pinchInset` | 0.02 mm | inferred | COTTER `applyArt` HAIR, D-070 |
   | `geom.sliverMin.n04` | 0.6 mm | inferred | `demo_coin.py` header |

10. Provenance of every row written in this card. Seeded rows load at the
   tiers of ../PROFILE.md 2.4; values are unchanged except the per-side
   halving of the two loss rows. New rows carry the tier and source
   stated in steps 7 to 9: presets and the PETG table are vendor with
   source "slicer save 2026-08-19" plus the file they came from; the three
   constants above are inferred. No row in M00 is written at tier measured
   or verified, and no import raises a seeded tier. Measured rows come
   only from a coupon a person enters (CLAUDE.md, What not to do).

Files to create:
- packages/profile/src/index.ts, lookup.ts, loss.ts, fits.ts,
  machines.ts, constants.ts, provenance.ts
- packages/profile/data/materials.json, machines.json, fits.json,
  loss.json, constants.json
- packages/profile/test/realgap.test.ts, lookup.test.ts, provenance.test.ts

Acceptance:
- `npm test -w packages/profile` exits 0.
- realgap.test.ts asserts `realGap(0.275, 'hole', 'ffc5p', 'petg').toFixed(6) === '0.075000'`, the 0.15 machine-row case and the layer 0.20 warning.
- lookup.test.ts asserts two builds that read the same rows give equal
  `profileHash`, and a build that reads one more row gives a different one.
- provenance.test.ts asserts a row with no tier fails with E_SCHEMA and
  PSLIDE returns E_REF, and that the three new constants of step 9 load
  with tier inferred and a non-empty source.

Done when: the realGap pin and the read-tracking test run in CI.

## M00-T03 geom: CrossSection wrapper, dyadic snap, offsets, earcut

Goal: every 2D operation goes through manifold's CrossSection with
coordinates snapped to 1/1024 mm, rounded rectangles offset exactly, and the
COLLAR outline offsets match to 1e-6 mm.

Inputs:
- `fab-knowledge:evidence/x/cotter-src/src/geo.js` (lines 7 to 56: POOL, `GEO.q` dyadic snap, `setMinCircularAngle(8)`, `setMinCircularEdgeLength(0.35)`, `simplify(0.002)`)
- `fab-work-directory:benches/blocks/outputs/boss/boss-src.zip`, member `src/kernel.js` (`rrect`, `ring2`, `stroke`, `triangulatePoly`, polygon-clipping booleans)
- `fab-knowledge:evidence/x/knuckle/knuckle-src.zip`, member `part0_earcut.js`
- COLLAR legacy bench, lines 643 to 720 (`ST` defaults, `SHAPES`, `rrect`, `ngon`)
- mesh kernel record, sections 2 and 3 (hole flag, earcut traps, jitter keyed on coordinates)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/packages/geom/README.md` (the parity target text)

Steps:
1. Wrap CrossSection: construct from rings with a fill rule, `offset(delta,
   join 'Round' | 'Miter' | 'Square', miterLimit, segments)`, union,
   difference, intersection, area, bounds, toRings. No Clipper2 package
   (D-163). Set `setMinCircularAngle(8)` and `setMinCircularEdgeLength(0.35)`
   as COTTER does.
2. `q(v) = Math.round(v * 1024) / 1024` on every coordinate entering the
   kernel (D-054). Dyadic values are exact in float64 and in float32 up to
   2^24/1024 = 16384 mm (computed). A nudge applied anywhere must exceed the
   downstream weld; a 0.2 micron nudge under a 1e-4 weld recreated
   non-manifold edges on CASK (plan-deltas R51). Z bounds that are layer
   tops are emitted as `q(firstLayer + i * layer)`, never accumulated; a
   parity route that must match a non-dyadic legacy grid states the
   exemption in its card (M00-T11 step 4).
3. Exact rounded-rectangle offsets: a rounded rectangle `{cx, cy, a, b,
   rc}` offset by `d` becomes `{a + d, b + d, max(rc + d, 0)}`, analytic
   until emit; inward past `rc` the corner becomes sharp.
4. earcut wrapper: a full linked-list earcut port, indices divided by
   dimension, winding normalised by signed area, caps from a bridged
   triangulation and walls from the original loops so bridge edges never
   become geometry, and a rotated copy with 0.1 micron jitter keyed on the
   coordinates for rows of holes with identical Y (mesh kernel record).
   Winding is read from the hole flag, never from the area sign.
5. Sliver report: rings narrower than the minimum feature 0.6 mm for a 0.4
   nozzle (`constant('geom.sliverMin.n04')`, inferred, `demo_coin.py`
   header, M00-T02 step 9) are returned with their location.
6. Insets for the CHK-3MF-04 split (D-070): `insetCoincident(cs)` is
   `offset(-0.001, 'Miter')`, a true edge-normal offset (never a homothety
   about the centroid, which pushed COLLAR spirals into the wall);
   `insetPinch(cs)` is `offset(-0.02, 'Miter')` (COTTER `applyArt` HAIR).
   Both distances are read through `constant('3mf.coincidenceInset')` and
   `constant('3mf.pinchInset')`, tier inferred (M00-T02 step 9).
7. COLLAR outline offsets. Port the legacy `SHAPES`, `rrect` and `ngon`
   functions verbatim into a float64 test helper. For the shape kinds whose
   function is a Euclidean distance or a convex half-plane maximum (round,
   rounded, dogtag, bar, hex, oct, tri) at the COLLAR defaults (dia 44,
   aspect 0.72, corner 0.3), build the outline through geom and offset it by
   d in {-2.2 (rim width), -0.5 (chamfer), +0.5}: rounded kinds through the
   exact rounded-rectangle offset, polygons through a Miter offset. At every
   output vertex, before snapping, `|sdf(p) - d|` is at most 1e-6 mm
   (computed). squircle and shield are level sets, not distances, and are
   reported "not applicable"; see "Open items" for the interpretation.
8. Boolean parity with BOSS: for the BOSS fixtures (`rect`, `rrect`, `ring2`,
   `stroke`, `circle` with a hole) union and difference areas through geom
   equal the polygon-clipping results of `kernel.js` within 1e-6 mm2
   (computed).
9. Unit-circle table (D-175): `scripts/unit-circle.mjs` writes
   `src/unit-circle.table.ts`, the correctly rounded float64 cos and sin of
   every turn fraction a ring of 3 to 256 points reads, folded to the first
   octant (6834 rows, computed), plus cos and sin of each earcut rotation
   attempt. It computes in BigInt fixed point, never Math.cos or Math.sin.
   `unitCircle(i, n)`, `circleRing(r, at, segments)` and `rrectRing` read
   it; a count outside 3 to 256 is E_SCHEMA. `Author.ring.circle` and
   `Author.ring.roundRect` in core are these generators, snapped, at the
   M-S defaults of 64 points per circle and 8 per corner quarter, so the
   flex-pair grid points and goldens hold.

Files to create:
- packages/geom/src/index.ts, cs.ts, snap.ts, rrect.ts, earcut.ts,
  inset.ts, sliver.ts, unit-circle.ts, unit-circle.table.ts (generated)
- packages/geom/scripts/unit-circle.mjs
- packages/geom/test/collar-offsets.test.ts, snap.test.ts,
  boss-booleans.test.ts, earcut.test.ts, unit-circle.test.ts
- packages/geom/test/fixtures/collar-shapes.ts (verbatim port, with the
  source path and sha256 of collar.html in its header comment)
- tools/legacy/boss-booleans.cjs (runs kernel.js with earcut 2.2.4 and
  polygon-clipping to write the fixture areas)

Acceptance:
- `npm test -w packages/geom` exits 0.
- collar-offsets prints 21 cases (7 kinds x 3 offsets) with max residual
  at most 1e-6 mm and 2 cases not applicable.
- snap.test.ts asserts `q(0.1) === 0.099609375` and that snapped values
  survive a Float32Array round trip unchanged for |v| up to 16384.
- boss-booleans.test.ts matches every fixture area within 1e-6 mm2.
- unit-circle.test.ts regenerates the table and finds it byte equal to the
  committed file, and finds no Math.cos, Math.sin or Math.tan call in
  packages/geom/src; core/test/author-ring.test.ts finds none in
  core/src/author.ts.

Done when: geom is the only 2D code path in mesh and 3mf (a lint test
greps for polygon-clipping and clipper imports and finds none).

## M00-T04 mesh core: ownership, union, audit, meshHash, store format

Goal: every manifold object has an owner and is freed, unions fall back
safely, every mesh is audited, and meshHash covers triangles.

Inputs:
- `fab-knowledge:evidence/x/cotter-src/src/geo.js` lines 7 to 24 (`GEO.scope` with POOL)
- `fab-knowledge:evidence/x/pip-controller/src/geom.js` lines 8 to 64 (`GEO.init`, `GEO.flush`, `GEO.liveCount`)
- `fab-knowledge:evidence/x/pip-controller/test/sweep.mjs` line 34 (sweep summary with live objects)
- `fab-knowledge:evidence/x/knuckle/knuckle-src.zip`, member `part3.js` line 149 (`K.audit`, coordinate-keyed edge pairing)
- BOSS `src/kernel.js` (`auditIndexed`, `auditMerged`, `signedVolume`)
- seed `validate_3mf.py` (`nonmanifold_vertices`, the vertex-fan check)
- `fab-knowledge:plan/AGENT-SURFACE.md` sections 7.1 (URIs and the `.hbfm` mesh format) and 7.3 (hashes) (source: api-library-ai-design.md 7.1, 7.3)
- `fab-knowledge:synthesis/plan-deltas.md` R51

Steps:
1. `wasm.ts`: patch Manifold and CrossSection constructors and methods
   once so every result joins a pool; `scope(fn)` runs `fn`, keeps only the
   plain data it returns and frees every kernel object created inside;
   `keep(obj)` hands one object out of the scope; `liveCount()` returns the
   pool size (D-055: COTTER scope plus PIP live count).
2. Cancellation: manifold-3d 3.5.0 added `ExecutionContext` (C-11). Each
   build carries one; starting a newer build cancels the older one, which
   resolves as cancelled and leaves live count 0.
3. `union(list)`: try a batch union, verify the result is a closed
   positive volume (status NoError, audit clean, volume above 0), else fold
   pairwise. Batch union failed on coplanar faces and pairwise fold on
   shared edges in PINTLE (plan-deltas R51). When both fail only on
   zero-area triangles and the candidate's D-054 snapped and welded mesh
   audits clean, take it (two kernel vertices under half a grid step apart
   snap onto one point). Every route, the stage runner and core call this
   union; no package carries a second one (packages/mesh/test/union.test.ts
   scans for `Manifold.union` callers).
4. `audit(mesh)`: undirected edges shared by exactly two faces on raw
   indices and keyed on snapped coordinates; each directed edge once
   (consistent winding); no triangle with area under 1e-14 mm2 (TENON
   sweep threshold); positive signed volume; zero non-manifold vertices by
   the fan check ported from the seed validator.
5. `meshHash` (D-051, D-175): after the D-054 snap take each coordinate
   as the int32 `round(v * 1024)`; sort unique vertices lexicographically
   and remap indices; rotate each triangle so its smallest index comes
   first, keeping cyclic order so winding survives; sort the triangle list;
   sha256 over a fixed little-endian layout (ASCII tag `hbf-mesh-2`, uint32
   vertex count, int32 coordinates, uint32 triangle count, uint32
   indices). ../AGENT-SURFACE.md 7.3 holds the full rule.
6. `.hbfm` store format for `hbf://mesh/<meshHash>`, every field
   little-endian, no padding: bytes 0 to 3 ASCII `HBFM`; uint32 version,
   1; uint32 vertexCount; uint32 triangleCount; then vertexCount times
   float32 x, y, z; then triangleCount times uint32 a, b, c. Total length
   is 16 + 12 * vertexCount + 12 * triangleCount bytes. The reader
   refuses a wrong magic, an unknown version, a length that disagrees
   with the counts, or an index at or above vertexCount, with E_KERNEL.
   The file is a transport copy; meshHash is computed from the kernel
   mesh, never from these bytes (../AGENT-SURFACE.md 7.1).

Files to create:
- packages/mesh/src/wasm.ts, union.ts, audit.ts, hash.ts, hbfm.ts
- packages/mesh/test/wasm.test.ts, union.test.ts, audit.test.ts,
  hash.test.ts, hbfm.test.ts

Acceptance:
- `npm test -w packages/mesh` exits 0.
- hash.test.ts (fast-check, seed printed): a vertex-permuted copy hashes
  equal; two meshes with equal vertices and different triangles hash
  different; an inverted copy hashes different. A known-answer case pins
  the layout: the unit tetrahedron with positions 0,0,0 1,0,0 0,1,0
  0,0,1 and triangles 0,2,1 0,1,3 0,3,2 1,2,3 (input not in sorted order)
  hashes to
  `f63dcbfde2b742b721d99b38f7b4f761bcd535a289e45f53c433928765fb8a8a`,
  and the same bytes rebuilt by hand and hashed with node:crypto give
  that value, so a byte order, tag, sort or rotation change fails here.
- wasm.test.ts: a cancelled build resolves cancelled and `liveCount()` is 0.
- audit.test.ts: a two-cube corner-touching fixture reports 1 non-manifold
  vertex (computed); a clean cube reports 0.
- hbfm.test.ts: a cube written then read returns equal counts,
  bit-equal float32 positions and equal indices; the first 16 bytes of
  the cube file are `HBFM`, 1, 8, 12; the file length is 16 + 12 * 8 +
  12 * 12 = 256 bytes; on a fixture snapped to the D-054 1/1024 grid
  within 16,384 mm, meshHash of the decoded mesh equals meshHash of the
  source (float32 holds those values exactly); a wrong magic, version 2,
  a truncated file and an out-of-range index each fail with E_KERNEL.

Done when: no code in mesh or 3mf calls `.delete()` outside `wasm.ts`.

## M00-T05 mesh routes raster, prism, stack, revolve and the stage runner

Goal: four routes produce audited bodies with declared guarantees, run
through the D-047 stage order, each with a parity proof against the most
refined legacy copy.

Inputs:
- seed raster mesher (see Evidence roots)
- the healer ported in M-1-T09 from `fab-knowledge:evidence/x/toggle/src/src/part2e.js` (flips map, freeze at 3, 200 passes, returns `{changed, converged, frozen}`)
- `fab-knowledge:originals/blocks/files/src-extracted/kernel.js` (lineage `mesh.prism/blocks-1`, canonical: `cleanRing` lines 26 to 47, `Mesh.prism` 223 to 236, `_prismPoly` 237 to 271 with 14 tries, `auditIndexed`); the BOSS copy, `fab-work-directory:benches/blocks/outputs/boss/boss-src.zip` members `src/kernel.js` (6 tries) and `test_parts.js`, supplies the parity fixtures (D-156)
- `fab-knowledge:evidence/x/tenon/tenon-src.zip`, members `src/part2.js` (`thetaList` line 208, `revolve` line 220) and `sweep.js`
- `fab-knowledge:sources/latest/knuckle-tenon-gusset.md` lines 501 to 510 (revolve with radial fields) and line 626 (sweep: 3 presets plus 60 random states)
- mesh kernel record; 3MF dialect record, "Geometry rules"
- `fab-knowledge:synthesis/patterns-and-lineage.md` line 834 (port order by lineage depth)
- repo: `spec/build.ts` (ShapeDecl per route), `spec/part-ir.ts`

Steps:
1. Each route declares its guarantees (D-053):

| route | ported from | guarantees |
|---|---|---|
| raster | seed `rastermesh.js` plus the TOGGLE healer | per slot manifold, exact Z, slots disjoint, slots sum to the solid |
| prism | BLOCKS `Mesh.prism` over geom (D-156) | manifold, exact Z |
| stack | BLOCKS `Mesh` with several shells in one slot (lineage `mesh.stack/blocks-src`; BOSS kernel.js is the older copy, D-156) | each shell manifold; overlaps only inside one slot; z overlap 0.01 to 0.02 mm (CHK-PRT-02) |
| revolve | TENON `revolve(rows, thetas)` with radial fields | one strictly manifold closed surface per part |

2. raster: port `rastermesh.js` to TypeScript; the pinch pass is the
   healer, which warns in a build and fails in a sweep on non-convergence,
   and warns above 0.2 percent flipped cells (mesh kernel record).
3. prism: port `Mesh.prism` with geom replacing polygon-clipping; up to 13
   retries as BLOCKS does (D-156), taken when the caps are degenerate or
   incomplete or when the shell fails the audit, as `_prismPoly` does
   (`ok = auditIndexed(...)`, kernel.js line 265); shells are never dropped
   after failed retries (dialect geometry rule 7). The retry nudge is the geom earcut
   jitter keyed on coordinates (mesh kernel record section 3), so only the
   count follows BLOCKS. BLOCKS `clipRetry` stays out: geom booleans run on
   CrossSection (D-163).
4. stack: one body made of several watertight prisms in one slot that
   overlap; skin once per contiguous run and cap only where a neighbour's
   section differs (mesh kernel record).
5. revolve: port `thetaList` and `revolve` with a field `f(theta, z)` per
   row and the column pair at each feature edge plus and minus 0.02 deg;
   profile checks from TENON `sweep.js`: no self intersection, positive
   area, no negative r, no zero-thickness back-tracking fins.
6. Stage runner (D-047), per body then per part: 1 base shape through its
   route; 2 pre-union cutters; 3 union positives; 4 post-union cutters; 5
   partition by role priority (flex-conductor, flex, conductor, art, body);
   6 insets (coincidence, pinch); 7 frame emit; 8 hash. This is the only
   stage runner: core's part.build meshes every design through it,
   including a reference with draft feature kinds, whose generated cutters
   go in per host body (`cutters`) and whose generated bodies join the
   declared ones before stage 1 (`bodies`, id = feature id, several shapes
   joined by a csg union). The csg route builds here for that. Only
   PRE_UNION_KINDS (chamfer, round) may emit stage 2 cutters; a generator
   of any other kind that does is E_KERNEL at
   `/features/<id>/preUnionCutters`, record mesh-kernel. Stage 5 is
   a total order, role priority then declaration order (feature bodies
   after declared ones), so two overlapping bodies of one role never
   overlap as parts; a body partition empties is E_KERNEL. Stage 6 insets
   a revolve body in its (r, z) profile along the edge normals, so an
   inner wall moves out, never into the host. Stage 7 welds every boolean
   output after the D-054 snap. Frame emit writes bed offsets as 3MF item transforms so
   vertices stay small (dialect geometry rule 4). A part turned over for
   printing keeps its handedness only under a rotation: BLOCKS kernel.js
   `rotY` (lines 314 to 315, 180 deg about y) is the reference, and its
   `flipZ` mirrors; the pose itself is declared per D-063.
7. Part IR per D-048 and D-049: `Part.bodies {id, mesh, material, slot,
   role}[]` with `solid` as their union; route warnings (healer flips,
   prism retries) go into `warnings` and hash with the build. The mesh
   layer hashes them into the part's content hash (`partContentHashOf`,
   typed Hash) and returns the part without `buildHash`; buildHash is
   sha256 over canonical BuildInputs (D-051) and only core assigns it.
   `assemblePart` is the one Part IR assembly path: core's part.build
   (`buildPart` in core/src/commands/build.ts) hands it the stage output
   and adds the buildHash, and the mesh-only runner is `stagePart`, named
   apart from core's `buildPart`. core/test/load-build.test.ts proves that
   a warning and metric change alone moves buildHash.
8. Parity per route:
   - raster: COLLAR, in M00-T11.
   - prism: `tools/legacy/boss-prism-dump.cjs` runs `Mesh.prism` on the
     BOSS fixtures (rect, rrect, ring2, stroke, circle with a hole) and
     writes volume and audit; the route matches each volume within 1e-6
     relative (computed) and both audits report 0 bad edges. Given the
     BLOCKS kernel.js path, the dump writes the same fixtures byte for
     byte: none of the five retries in either copy (computed 2026-10-05).
   - stack: fixtures of two and three overlapping prisms; the manifold union
     volume equals the analytic volume within 1e-6 relative (computed) and
     every z overlap lies in 0.01 to 0.02 mm, the band the route reads
     from profile constants stack.bandOverlap.lo and .hi (inferred).
   - revolve: `tools/legacy/tenon-revolve-dump.mjs` runs TENON `sweep.js`
     over its 63 states and records every `revolve(rows, thetas)` call with
     the legacy volume and audit into
     `tools/corpus/mesh/tenon-revolve-calls.jsonl`; the route reproduces
     each volume within 1e-9 relative and passes audit on every call. If
     `sweep.js` cannot run headless without parts of TENON not in the zip,
     the card records the blocker (D-149); it never writes a stand-in.

Files to create:
- packages/mesh/src/routes/raster.ts, prism.ts, stack.ts, revolve.ts
- packages/mesh/src/stages.ts, partir.ts
- packages/mesh/test/routes/raster.test.ts, prism.test.ts,
  stack.test.ts, revolve.test.ts, stages.test.ts
- tools/legacy/boss-prism-dump.cjs, tools/legacy/tenon-revolve-dump.mjs
- tools/corpus/mesh/boss-prism.json, tools/corpus/mesh/tenon-revolve-calls.jsonl
- lineage.json rows appended for rastermesh, prism, stack, revolve in the M-1-T09 schema `{id, kind, source, sha256, fixes[], dest}`; the healer rows exist from M-1-T09 (D-156)

Acceptance:
- `npm test -w packages/mesh` exits 0.
- prism.test.ts and stack.test.ts report every fixture within tolerance.
- revolve.test.ts reports the call count from the dump and 0 failures, or
  the card records the blocker and the exit row reads "not run". Under
  `npm test` it replays a bounded selection (the smallest call of each of
  the 63 states, of each field id, and call 276, the weld call: 67 calls,
  2,205,088 triangles, computed) inside a 3,000,000 triangle budget its own
  test asserts; `npm run revolve:full -w packages/mesh` replays all 448
  calls (53,315,256 triangles, counted from the dump). The full replay
  passed 600 s at load 124 under `npm test` (measured, M-S exit A verifier
  round 1) and took 1239 s wall under vitest at load 14 to 16 on the
  owner's Apple M1, 8 cores, 16 GB (measured 2026-10-07), so it is a named
  sweep, not a default test.

Done when: lineage.json has one canonical row per ported route with its
source file, sha256 and fixes, and `node --test tools/test/lineage.test.mjs`
exits 0.

## M00-T06 100-design sweep with live count 0

Goal: a seeded sweep of 100 designs across the four routes builds with no
leaked wasm object and no failed audit.

Inputs:
- `fab-knowledge:evidence/x/pip-controller/test/sweep.mjs` (summary line format)
- COLLAR legacy bench slider ranges (for example `rimW` 0.6 to 6, line 390)
- `fab-knowledge:plan/TESTING.md` sections 2.3 (sweep) and 4.2 (property) (source: api-library-ai-design.md 11.3, property tests replace the LCG sweep)

Steps:
1. A fast-check 4.10.2 property with a fixed seed draws 100 designs: 40
   COLLAR parameter sets (shape kind, dia 20 to 60, thk 2.4 to 5, cham 0 to
   1, rim width 0.6 to 6, edge style, layer 0.20 or 0.24), 20 prism, 20
   stack and 20 revolve fixtures with drawn parameters.
2. Each design builds inside `scope()`; after the run `liveCount()` must be
   0, every audit clean, no healer non-convergence.
3. A failure prints the seed, path and family so `FC_SEED=<s> FC_PATH=<p>
   FC_FAMILY=<f> npm run sweep -w packages/mesh` replays it (vitest passes
   no unknown CLI flags to workers, so replay reads the environment), and
   fast-check shrinks it.
4. The summary line follows PIP: `<N> designs, <F> failures, <W> with
   warnings, <T> s, live objects <L>`.
5. Add the `property` job to `.github/workflows/ci.yml` (level 2 of
   ../TESTING.md, D-152): the M-1-T05 job shape with `npm ci`, then
   `npm run sweep -w packages/mesh` with `FC_RUNS=100` (../TESTING.md
   4.2). The nightly 2000-run job is outside M00.
6. Wire the script. The file name `sweep.property.ts` stays outside the
   `*.test.ts` include of the root `vitest.config.ts` and of the
   workspace default, so `npm test` (the `unit` job) never runs the
   sweep. A second config selects it:

   ```ts
   // packages/mesh/vitest.sweep.config.ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     test: { include: ["test/**/*.property.ts"], silent: false },
   });
   ```

   and `packages/mesh/package.json` gains
   `"sweep": "vitest run --config vitest.sweep.config.ts"` beside
   `"build": "tsc -b"` and `"test": "vitest run --passWithNoTests"`
   (M-1-T12 step 3). The property prints the summary line of step 4 with
   `console.log` in an `afterAll`. `silent: false` is required: vitest
   5.0.3 defaults the reporter to `passed-only` and drops console output
   from passing tests. `vitest run test/sweep.property.ts` without the
   config exits 1 with "No test files found", because a CLI path is a
   filter over the include set, never an addition to it. Scratch run
   (vitest 5.0.3, Node 22,
   `fab-knowledge:evidence/x/coldstart/`): the config route
   exits 0 and prints the line; `npm test -w packages/mesh` runs only
   `smoke.test.ts`.

Files to create:
- packages/mesh/test/sweep.property.ts
- packages/mesh/vitest.sweep.config.ts
- packages/mesh/package.json (edit: script `sweep`)
- .github/workflows/ci.yml (edit: job `property`)

Acceptance:
- `FC_RUNS=100 npm run sweep -w packages/mesh` exits 0 and prints one
  line matching `^100 designs, 0 failures, [0-9]+ with warnings,
  [0-9.]+ s, live objects 0$`.
- `npm test -w packages/mesh 2>&1 | grep -c 'sweep.property'` prints 0
  (the unit job does not run the sweep).

Done when: the sweep runs in the CI property job on every push.

## M00-T07 3mf writer in TypeScript: template, determinism, completeness

Goal: the TypeScript writer emits the bbs dialect with the 127-key per-slot
template, reproduces its own bytes under one SOURCE_DATE_EPOCH, carries the
chase id and build hash, and refuses an incomplete export.

Inputs:
- seed `orca3mf.js` (byte-identical to `fab-knowledge:evidence/x/pip-controller/tools/orca3mf.js` by diff, 2026-10-04); date stamp at line 91, JSZip entries at line 247
- COLLAR legacy bench lines 1582 to 1840 (`make3mfXML`, `make3mfConfig`, `projectSettings`, `export3mf`; p:UUID prefix `index + (1 << 16)`; component objectid `index + 1`; `filament_sequence.json`)
- repo: `packages/3mf/data/filament_template.json` (M-1-T08: 127 gold keys with per-slot values) and `tools/corpus/3mf/seed-97.json`
- gold round trip; 3MF dialect record; verified-claims C2
- `fab-knowledge:evidence/x/tenon/tenon-src.zip`, member `export_default.js` (the `LABEL` map with no entry for upper, tray, puckA, puckB, spacer)
- `fab-knowledge:plan/TESTING.md` section 6.3 (bytes and hashes, C-08) and D-052 in `fab-knowledge:plan/DECISIONS.md` (source: api-library-ai-design.md 14.4)

Steps:
1. Port `orca3mf.js` to `packages/3mf/src/writer/` keeping its public
   shape: `build({filaments, printer, presetPattern, writeFilaments,
   layerHeight, title, objects})` returning `{entries, zip()}`, plus
   `stl()` and `printCard()`.
2. Template (D-159, C-07). Every key of the 127-key template is written N
   times, N = number of filaments, each slot taking the value of the preset
   its `filament_settings_id` names. Preset rows come from slicer saves
   only. PETG: the three gold columns. PLA: `Generic PLA @FF C5P`,
   harvested from
   `instruments/tang-small/facewithbuttons.3mf`
   (a slicer save, 127 of 127 template keys); ../PROFILE.md 9.1 also
   harvests it from the Downloads save `baffle-wire.3mf`. TPU: no slicer
   save holds a `Generic TPU @FF C5P` column. In the harvest every file
   naming it is writer-made (BOSS, legacy PIP, TOGGLE, SPARGER W, TENON,
   90 of 127 keys). The Downloads saves show Flash Studio either
   rewriting the slot to `Generic TPU @System` (`feeler-ladder (2).3mf`
   slots 3 and 4, `haft (3).3mf`, `haft (5).3mf`) or forking it as
   `Generic TPU @FF C5P(<file>)` (../PROFILE.md 8.1); neither is a
   harvested FF C5P row. Until the owner saves a project with `Generic
   TPU @FF C5P` from a fresh slicer install, a TPU slot writes
   the 29 computed keys from materials.json and the 98 non-computed keys
   from the `Generic PETG @FF C5P` column, raises BuildWarning `TPU preset
   row inferred` (../PROFILE.md 8.1), and the row carries tier inferred.
   The audit run of the ported writer threw `no harvested preset row for
   Generic TPU @FF C5P`
   (`fab-knowledge:evidence/audit/m0/exec/logs/ms-t07-3mf-UTC.txt`).
   The 127 gold keys are 98
   non-computed plus 29 computed (the seed's `computed` list, all present
   in the gold). The gold differs per slot on 17 keys, listed in
   `tools/corpus/3mf/template-diff.md` from M-1-T08; 8 of them are
   non-computed (close_fan_the_first_x_layers, fan_cooling_layer_time,
   filament_multi_colour, filament_self_index, filament_start_gcode,
   overhang_fan_threshold, pressure_advance, slow_down_min_speed; counted
   on the gold 2026-10-04). Write
   `filament_map` ('1' per slot), `filament_self_index` ('1' to 'N') and
   `filament_extruder_variant` ('Direct Drive Standard' per slot), as the
   gold does. Outside the 127 template keys the writer writes exactly these
   scalar keys: `version` '01.10.01.50', `from` 'project', `name`
   'project_settings', `printer_settings_id`, `print_settings_id`,
   `printer_model`, `printer_variant` and `printer_technology` 'FFF', as
   the gold and COLLAR (lines 1765 to 1775) do, and as the ninth
   `curr_bed_type` from MachinePreset.slicer.bedType, written only when
   the preset sets it (D-226; 'Textured PEI Plate' for both ffc5p
   presets, ../PROFILE.md 8.1); naming the printer stops Flash Studio
   inventing an external preset, and naming the plate stops it opening
   the file on the cold plate. An export carries 127 + 9 = 136 keys
   (measured on both corpus inputs 2026-10-06). Never write
   `extruder_variant_list`, `layer_height` or any other printer- or
   process-scoped key. The 97-key seed is used only for the diff report.
   Per D-150 (decided 2026-10-04 from owner saves), the 127-key port is a
   fidelity upgrade. A TPU slot carries the preset warning (../PROFILE.md
   8.1).
3. Package entries for target bbs: `[Content_Types].xml`, `_rels/.rels`,
   `3D/3dmodel.model`, `Metadata/model_settings.config`,
   `Metadata/project_settings.config`, `Metadata/slice_info.config`,
   `Metadata/filament_sequence.json`, `Metadata/hackbuild_chase.json`.
   Meshes stay in the root model with no `p:path` on root components
   (dialect record, empty-plate bug). The build item carries
   `printable="1"` and `auto_drop="1"` (the gold item has both; the seed
   omits `auto_drop`). The plate block carries `filament_map_mode` "Auto
   For Flush" and `filament_maps`. `Metadata/filament_sequence.json`
   holds exactly the gold bytes
   `{"plate_1":{"nozzle_sequence":[],"optimal_assignment":[],"sequence":[]}}`
   (the seed writer never emits this entry). Objects, components, the
   build and every item keep the seed's p:UUID scheme (`orca3mf.js` SUF
   table and BUILD_UUID), so lib3mf raises no 32944 warning (`A UUID for
   a build, build item or object is missing.`,
   `fab-knowledge:evidence/audit/m0/exec/logs/ms-t07-validate-seed.txt`).
4. Determinism (D-052, C-08). `CreationDate` and `ModificationDate` are
   the UTC date of `sourceDateEpoch` as YYYY-MM-DD, replacing `new Date()`
   at seed line 91. Each JSZip entry gets `date: new Date(epoch * 1000)` and
   `createFolders: false`, so no `3D/`, `Metadata/` or `_rels/` directory
   entries appear (the seed call at line 247 added them). Entries are added
   in sorted byte order of their names. Compression is DEFLATE at level 6
   for every entry. An epoch below 315532800 (1980-01-01T00:00:00Z, the
   earliest DOS date) is clamped to it, pinned by a test. A lint test fails
   on `Date.now` or `new Date()` without an argument anywhere in
   `packages/3mf/src`.
5. Number format: coordinates arrive snapped to 1/1024 mm, so `fmt(v)` is
   `v.toFixed(10)` with trailing zeros and a trailing point stripped and
   `-0` written `0`. The Python writer uses the same rule (M00-T08). This
   replaces the seed's 6-decimal format (D-054).
6. `artifactHash` (D-052): blank the `CreationDate` and `ModificationDate`
   values in `3D/3dmodel.model`; for each entry in sorted name order write
   the UTF-8 name, a 0x00 byte, the hex sha256 of the uncompressed bytes and
   a 0x0A byte; sha256 of that stream is the artifactHash.
7. `Metadata/hackbuild_chase.json` holds `{"chase": <id>, "buildHash":
   <hash>}` (D-159), written as RFC 8785 canonical JSON.
8. Export completeness, enforced before any byte is written (plan-deltas
   R50): every object and part name resolves (no `undefined`, `null` or
   `NaN` token), object names are unique, and the STL fallback zip has one
   member per part with unique names. A violation returns a fail
   CheckResult on the artifact target and no file. TENON's node exporter
   shipped five objects named `tenon-undefined` and a 7-member STL zip
   where five parts overwrote one name; that is the regression test.
9. Target core: plain 3MF Core with the Materials extension, one
   colorgroup entry per filament and triangles pointing at it; no
   `Metadata/*.config` entries (plan-deltas R50: core is a Materials
   colorgroup target). Target prusa is not built in M00 (see "Open items").
10. Attribution: `License` (bbs) and `LicenseTerms` (core) carry
    `ChaseMeta.license` (../LICENSING.md 1.4) through `BuildConfig.license`.
    `Designer` and `Copyright` are written by `packages/3mf/src/metadata.ts`
    only from `BuildConfig.designer` and stay empty when it is absent;
    whether hbf export passes the root package.json author, as
    ../LICENSING.md 1.4 says, or keeps both empty, as this step said until
    2026-10-05, is an owner question. `DesignerUserId`, `Origin` and
    `DesignerCover` stay empty. The writer refuses an AI or tool name as
    Designer with E_SCHEMA, record D-001; the print card and every entry
    carry no AI or tool credit (D-001); lint-authors reads the Designer
    value of every fixture.
11. The writer refuses: a slot out of range, a part with no triangles, a
    per-filament vector of the wrong length, `extruder_variant_list` in the
    settings. An unknown filament type or preset id is E_REF with up to 3
    `didYouMean` by edit distance (spec/errors.ts), ties in table order,
    from `src/writer/suggest.ts`; the Python writer ranks the same way and
    tools/py/test/test_agreement.py holds the lists equal (audit fix
    2026-10-06; both writers took the first three table keys before).
12. A build with no printer writes the machine preset of
    `packages/3mf/data/default_preset.json` (id, nozzle and slicer names of
    `ffc5p_20260819`, plate included), the same row the Python writer
    defaults to. The package keeps that slice as data so it stands alone
    (D-027); test_agreement holds it equal to its row of
    `packages/profile/data/machines.json` and builds every corpus input
    with no printer on both sides. The literal seed printer it replaces
    wrote no `curr_bed_type` (audit fix 2026-10-06).

Files to create:
- packages/3mf/src/writer/index.ts, model.ts, settings.ts, template.ts,
  zip.ts, hash.ts, stl.ts, card.ts, core.ts, completeness.ts, fmt.ts
- packages/3mf/src/metadata.ts (../LICENSING.md section 8, M00 row)
- packages/3mf/test/writer.test.ts, template.test.ts, bytes.test.ts,
  completeness.test.ts, core-target.test.ts, no-clock.test.ts,
  metadata.test.ts; template.test.ts pins the value of every computed key
  per slot against seed/materials.json
- packages/3mf/README.md with the verified block (D-008)

Acceptance:
- `npx tsc -b packages/3mf --force` exits 0 with the jszip imports in
  zip.ts (Node types from M00-T01 step 7; no `skipLibCheck`).
- `npm test -w packages/3mf` exits 0.
- template.test.ts: the per-filament key set of a 3-filament export equals
  the 127 gold keys exactly (set equality); `filament_map`,
  `filament_self_index` and `filament_extruder_variant` are present;
  `extruder_variant_list` and `layer_height` are absent; the keys outside
  the template are exactly the nine scalar keys of step 2, each equal to
  the gold value except `curr_bed_type` (the gold stores 'High Temp
  Plate'; the value follows the preset, D-226); a TPU slot
  raises `TPU preset row inferred`.
- bytes.test.ts: two builds of the same input with
  `SOURCE_DATE_EPOCH=1791072000` (2026-10-04T00:00:00Z) give equal sha256 of
  the .3mf bytes, under `TZ=UTC` and under `TZ=America/Phoenix`; the zip
  holds no entry whose name ends in `/`.
- completeness.test.ts: the TENON name set fails with the export
  completeness finding and writes nothing.

Done when: the seed `build_orca3mf_js.py` path (`../assets/orca3mf.js`) is
retired and the writer reads the template JSON directly.

## M00-T08 Python writer and harvester at entry-level agreement

Goal: `tools/py/orca3mf.py` writes the same entry contents as the
TypeScript writer for the same input, reproduces its own bytes, and the demo
coin still sums exactly.

Inputs:
- seed `orca3mf.py` (date at line 193, `writestr` at line 384), `harvest_filament_keys.py`, `demo_coin.py`
- verified-claims C2 (tetrahedron test: all 6 entries identical, packages 3979 B vs 4243 B; two py runs differed at byte 11; demo coin "parts 5473.667 vs solid 5473.667 mm3")
- the 25 owner 3MFs (see M00-T10) for the harvester's refusal rule

Steps:
1. Apply the T07 changes to the Python writer: 127-key per-slot template
   read from `packages/3mf/data/filament_template.json`, the three kept
   keys, the same `fmt`, dates from `SOURCE_DATE_EPOCH`, sorted entries, no
   directory entries, `auto_drop`, `hackbuild_chase.json`, completeness.
   `orca3mf.py` resolves its data from the repo root, never its own
   folder: `REPO = Path(__file__).resolve().parents[2]`; materials from
   `REPO / 'packages/3mf/seed/materials.json'` (replaced by the profile
   slicer table once M00-T02 lands); template from `REPO /
   'packages/3mf/data/filament_template.json'`. The seed loaded both from
   its own folder and `demo_coin.py` failed with `FileNotFoundError`
   before the volume line in the audit run
   (`fab-knowledge:evidence/audit/m0/exec/logs/m00-t08-demo-coin.txt`).
   A test runs `uv run --project tools/py tools/py/demo_coin.py <tmp>`
   from a clean checkout and asserts exit 0 and the volume line.
2. Zip determinism: one `zipfile.ZipInfo` per entry with `date_time` from
   the epoch in UTC, `create_system = 3`, `external_attr = 0o644 << 16`,
   `compress_type = ZIP_DEFLATED`, compress level 6.
3. Entry agreement: `tools/corpus/3mf/inputs/` holds JSON inputs (the
   2-part 2-filament tetrahedron of verified-claims C2 and the COLLAR coin
   parts from M00-T11, and keys flex-pair on preset two, the four-slot
   M-S exit B print with two TPU slots); both writers build each; every
   entry's sha256, the artifactHash and the warning codes are equal. Byte
   identity of the two zips is outside the requirement (D-052).
   `tools/corpus/3mf/dump-input.mjs` writes flex-pair-two.json from
   loadDesign and buildPart as export3mf lays it out and exits 1 unless the
   input rebuilds the export entry by entry; `--check` fails on drift. A
   test fails unless one input has 4 filaments and takes the TPU preset
   fallback with PRESET_INFERRED, so the warning comparison never runs on
   empty lists only (audit fix 2026-10-06; both inputs warned nothing
   before).
4. Harvester (D-159): classifies a vector as per-filament only when it is
   in the current template or a person accepts it; it refuses automatic
   classification when the filament count equals the machine's extruder
   count (4 on ffc5p) and whenever a non-template key has length N. The
   owner files show why: 1-filament saves carry 137 length-1 lists and the
   2-filament save 133 length-2 lists against 127 template keys (counted
   2026-10-04).
5. `demo_coin.py` runs on the new writer unchanged in its geometry.

Files to create:
- tools/py/orca3mf.py, tools/py/harvest_filament_keys.py,
  tools/py/demo_coin.py
- tools/py/test/test_bytes.py, tools/py/test/test_agreement.py,
  tools/py/test/test_harvest.py
- tools/corpus/3mf/inputs/tetra-2part.json, tools/corpus/3mf/inputs/collar-coin.json,
  tools/corpus/3mf/inputs/flex-pair-two.json, tools/corpus/3mf/dump-input.mjs

Acceptance:
- `SOURCE_DATE_EPOCH=1791072000 uv run --project tools/py pytest tools/py/test` exits 0.
- test_bytes.py: two runs give equal sha256 of the .3mf bytes.
- test_agreement.py: py and js artifactHash equal for every input; one
  input has 4 filaments and both writers warn PRESET_INFERRED on it.
- `npx tsc -b && node tools/corpus/3mf/dump-input.mjs --check` exits 0.
- `uv run --project tools/py tools/py/demo_coin.py /tmp/hbf-demo` exits 0
  and prints `volume check: parts 5473.667 vs solid 5473.667 mm3`
  (computed; verified-claims C2).
- `uv run --project tools/py tools/py/validate_3mf.py --export --overlap /tmp/hbf-demo/<coin>.3mf` exits 0.

Done when: the corpus job runs the agreement test on every push.

## M00-T09 Validator: modes, rewritten checks, JS mirror

Goal: `validate_3mf.py` passes the slicer's own gold save, fails each
known-bad fixture with the named check, and a TypeScript mirror reaches the
same verdict on every corpus row.

Inputs:
- seed `validate_3mf.py` (p:path only noted at line 119; no overhang check)
- verified-claims C2 (the seed exits 1 on the gold: missing mesh refs, model_settings part ids, length-4 printer keys flagged, extruder_variant_list)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` (CHK-3MF-01 to -07)
- `fab-knowledge:synthesis/plan-deltas.md` R50
- repo: ../CHECKS.md (full text of CHK-3MF-04, -06, -07)

Steps:
1. Modes:

| flag | for | rules |
|---|---|---|
| `--export` (default) | files a hackbuild writer produced | CHK-3MF-01 Application tag; CHK-3MF-02 every template key present and N long (a missing template key fails, because the writer emits all 127); CHK-3MF-03 every key outside the template is one of the writer's nine scalar keys of M00-T07 step 2 (curr_bed_type the ninth, D-226) (`filament_settings_id` is a template key), anything else fails; no `extruder_variant_list`; CHK-3MF-06; CHK-3MF-07; export completeness; topology per mesh; lib3mf read; model_settings parts resolve; key set compared with the template and reported as a note |
| `--legacy` | files a pre-template writer produced (BOSS, SPRUE, legacy bench exports) | CHK-3MF-01; CHK-3MF-02 on present template keys only: each one N long, missing template keys go to the key-set note; CHK-3MF-03 reported as a note listing non-template keys; `extruder_variant_list` fails; CHK-3MF-06; CHK-3MF-07 on present keys; topology per mesh; lib3mf read; model_settings parts resolve |
| `--roundtrip` | files a slicer saved | follows `p:path` through `3D/_rels/3dmodel.model.rels` into `3D/Objects/*.model`; model_settings part ids resolve against sub-model objects; printer-scoped vectors whose length equals the extruder count (4 on ffc5p) pass; `extruder_variant_list` and `layer_height` pass because the slicer wrote them; CHK-3MF-06 and -07 apply; a key-set report against the template is written |
| `--overlap` | modifier on either mode | pairwise part intersection volume per object under 1e-3 mm3 (manifold3d); with `--solid <stl>` parts sum to the solid within 0.1 percent |
| `--target bbs` or `core` | dialect | bbs is the default; core runs lib3mf in strict mode and the Materials rules and skips the dialect keys; `prusa` exits 2 with "target prusa not built in M00" |
| `--json` | output | CheckResult list in the D-064 shape |

   Per-filament classification is by template membership only, in every
   mode. A key is per-filament when it is one of the 127 template keys,
   never because its length equals N. This settles the case N equals E:
   the BOSS examples carry 4 filaments on the 4-extruder ffc5p, so a
   length-4 vector outside the template could be per-filament or
   per-extruder, and the validator does not guess. Such keys fail
   CHK-3MF-03 under `--export`, appear in the key-set note under
   `--legacy`, and pass under `--roundtrip` because the slicer wrote them.
   The harvester's refusal rule (M00-T08 step 4) is the same rule seen
   from the writing side.

2. CHK-3MF-06 per D-068: every component `p:path` resolves to a model part
   in the package other than the root model, and the referenced object id
   exists in that part; a component without `p:path` resolves in the root
   model. The gold (three components in object 4 pointing at
   `/3D/Objects/hackbuild-coin-nfc_2.model`) passes; a `p:path` to
   `/3D/3dmodel.model` or to a missing part fails.
3. CHK-3MF-07 per D-069: per-filament vectors have one element per filament
   with the key's per-slot type; `overhang_fan_threshold` elements match
   `^[0-9]+%$`, never bare numbers or `nil`; length checks are scoped to
   template keys, so the 4-element printer keys of the 4-extruder Creator 5
   Pro pass. The gold `['95%', '10%', '10%']` passes.
4. CHK-3MF-04 split per D-070 runs at build time on Part IR in
   `packages/3mf` (it needs body outlines from geom, which bytes do not
   carry): parameters `coincidenceInset` 0.001 mm and `pinchInset` 0.02 mm;
   on bytes its failure shows as `--overlap` volume.
5. Export completeness: unique resolved object names, part names without
   `undefined`, `null` or `NaN`, and when an STL zip is given its member
   count equals the part count (plan-deltas R50). The STL zip is passed
   explicitly with `--stl-zip <path>`; the validator never guesses a
   sibling file. Its check id comes from ../CHECKS.md (artifact family);
   see "Open items".
6. Every import is declared in `tools/py/pyproject.toml`; a missing module
   the pyproject declares for the running platform is an internal error
   (exit 70), never a skipped check, because a check that did not run is
   reported as not run (D-153). lib3mf on linux aarch64 is excluded by
   marker (M00-T01 step 4), so its rule reports not run there.
7. Exit codes follow `spec/errors.ts`: 0 pass, 1 fail, 2 usage or input, 70
   internal.
8. TypeScript mirror in `packages/3mf/src/validate/` implements CHK-3MF-01,
   -02, -03, -06, -07, export completeness and the mesh audit on an entry
   map; `check.run --artifact` uses it (M00-T13). The Python validator stays
   the reference and is never deleted before parity (D-140).
9. Zip limits per D-166 and ARCHITECTURE 11.1: `open_package` in
   `validate_3mf.py` opens every 3MF and `--stl-zip` the validator reads,
   and both harvesters import it. It refuses an entry name with a `..`
   segment, a leading `/` or `\`, or a drive letter, more than 4096
   entries, and a total inflated size over 256 MB counted in 1 MB reads
   across members, each with exit 2 and a message naming E_SCHEMA, the
   rule and the limit. Reading each member to its end also checks the
   CRC. Under `--overlap` a part manifold3d refuses (status other than
   NoError) fails CHK-PRT-03: an empty solid would intersect nothing and
   pass.

Files to create:
- tools/py/validate_3mf.py
- tools/py/test/test_validate.py
- packages/3mf/src/validate/index.ts, rules.ts, paths.ts, completeness.ts
- packages/3mf/src/checks/chk-3mf-04.ts
- packages/3mf/test/validate.test.ts

Acceptance:
- `uv run --project tools/py tools/py/validate_3mf.py --roundtrip tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf` exits 0.
- `uv run --project tools/py tools/py/validate_3mf.py --roundtrip tools/corpus/3mf/known-bad/cask-empty-plate.3mf --json` exits 1 and lists CHK-3MF-06 fail.
- `uv run --project tools/py tools/py/validate_3mf.py --roundtrip tools/corpus/3mf/known-bad/overhang-numeric.3mf --json` exits 1 and lists CHK-3MF-07 fail.
- `uv run --project tools/py tools/py/validate_3mf.py --export tools/corpus/3mf/known-bad/tenon-undefined.3mf --stl-zip tools/corpus/3mf/known-bad/tenon-stl.zip --json` exits 1 and lists the export completeness fail.
- The seed demo coin re-emitted by the M00-T08 writer passes `--export` CHK-3MF-03 with `printer_model` present (the audit run of the seed rule failed it on `printer_model`, `fab-knowledge:evidence/audit/m0/exec/logs/m00-t08-demo-validate.txt`).
- `npm test -w packages/3mf` exits 0 with the mirror agreeing on every
  corpus row (M00-T10).
- `uv run --project tools/py pytest -q tools/py/test/test_validate.py`
  exits 0, including the traversal, over-4096-entry, 300 MiB bomb, bad CRC and
  open-part overlap fixtures it builds in a temp directory.

Done when: the corpus job runs both validators and fails on any verdict
disagreement.

## M00-T10 Conformance corpus

Goal: every 3MF the project has evidence for sits in one manifest with its
expected verdict, and a validator that passes a known-bad fixture fails CI.

Inputs:
- gold round trip
- `fab-work-directory:benches/cask-caps/outputs/cask-cap-hackbuild/cask_cap_hackbuild.3mf` (701,124 bytes, written 2026-09-05; carries no `p:path`)
- `fab-knowledge:evidence/x/downloads/dl-cases/cask/cask_cap_hackbuild.3mf`, the broken Sep 5 original (701,152 bytes, sha256 `af0075baff988a1356799249af4aa62a2492313eb86e50508a436324672ec95a`, counted 2026-10-04): three root components carry `p:path="/3D/3dmodel.model"` and `overhang_fan_threshold` holds `Overhang_threshold_bridge` in every slot
- owner Downloads copies under `fab-knowledge:evidence/x/downloads/`: COTTER kits `dl-pip-latest/cotter/unzipped/` (four kits, 25 print 3MFs and 6 plates, counted 2026-10-04); BAFFLE `dl-baffle-inlay-coin/baffle/`; COTTER saves `dl-baffle-inlay-coin/3mf/cotter-kit_custom_2026-09-22/` and `cotter-kit_custom_2026-09-22 (1)/`; SASH `dl-baffle-inlay-coin/sash/`; KNURL `dl-ogee-stipple-mech/knurl/`; HAFT `dl-pip-latest/haft/`; TOGGLE `dl-pip-latest/toggle/`; TENON `dl-pip-latest/tenon/tenon (1).3mf`; CASK `dl-cases/cask/`; SLATE `dl-cases/slate/`; LOCKET `dl-cases/locket/`; FEELER and GIB `dl-gudgeon-tang-keyway/feeler/` and `gib/`
- `fab-knowledge:evidence/x/tenon/tenon.3mf` (5,197,121 bytes, sha256 `b82c11254e6c3532fdedb1a5ae273a86e46567f511c6999fd25abd52ec02dc77`) and `tenon-stl.zip` (7 members, counted 2026-10-04)
- `fab-work-directory:benches/blocks/outputs/boss/examples/*.3mf` (21 files)
- `3d/` (18 .3mf files) and `instruments/tang-small/` (7 .3mf files). `3d/coin/hackbuild-coin-nfc.3mf` is byte-identical to the gold (both sha256 `24ee9c66419ac23eb2075e859bd0191a6431abb1d7d3628eea2372abc854f0c5`, checked 2026-10-04). Three owner names carry spaces or parentheses: `3d/mechdisplay/all pivots.3mf`, `3d/mechdisplay/ogee16-pivot-pin (1).3mf`, `3d/locket/locket-r2 (1).3mf`.
- `fab-work-directory:benches/sprue/outputs/sprue/plates/*.3mf` (4 files)
- legacy bench exports: `fab-knowledge:evidence/x/pip-controller/print/pip.3mf` and `pip-stick.3mf`; `fab-knowledge:evidence/x/toggle/toggle-{solo4,solo8,blocks4,blocks8}.3mf`; `fab-knowledge:evidence/x/knuckle/knuckle-{clam,flip}.3mf`; `fab-knowledge:evidence/x/sparger-w/sparger-w/3mf/*.3mf` (4 plates)
- `fab-knowledge:plan/TESTING.md` section 6 (3MF corpus rows and runner) (source: api-library-ai-design.md 11.6)

Steps:
1. `tools/corpus/3mf/manifest.json`: one row per file with `{path, sha256,
   source (absolute evidence path), mode, target, expect (pass | fail |
   parse | legacy), failsWith [check ids], sameAs?}`. Files are copied
   into the repo with their sha256; the fixture set is about 62 MB
   (computed by du -sk over tools/corpus/3mf, 63,624 KiB on 2026-10-05;
   tools/corpus 67 MB). The 2026-10-04 estimate of about 20 MB (24 copied
   owner files 4,800,961 bytes by stat, BOSS 8.7 MB, TENON 5.2 MB by du)
   left out the legacy, known-bad and owner round-trip rows.
   - A file whose sha256 equals a row already in the manifest is not
     copied again. Its row keeps its own `source` and sets `sameAs` to the
     id of the existing row; `path` points at that row's copy. The owner
     coin `3d/coin/hackbuild-coin-nfc.3mf` is the one case today:
     `sameAs: "gold"`, `path: "gold/hackbuild-coin-nfc.3mf"`. `run.py`
     fails if a `sameAs` row's source sha256 differs from its target's.
   - Destination names under `tools/corpus/3mf/owner/` keep the source
     folder below `3d/` or `instruments/` and slugify the file name:
     lowercase, each run of spaces, parentheses or other characters
     outside `[a-z0-9._-]` becomes one `-`, and leading or trailing `-`
     before the extension is dropped. `3d/mechdisplay/all pivots.3mf`
     lands at `owner/mechdisplay/all-pivots.3mf`,
     `3d/mechdisplay/ogee16-pivot-pin (1).3mf` at
     `owner/mechdisplay/ogee16-pivot-pin-1.3mf`, `3d/locket/locket-r2
     (1).3mf` at `owner/locket/locket-r2-1.3mf`, and
     `instruments/tang-small/body.3mf` at `owner/tang-small/body.3mf`.
     `source` holds the original absolute path unchanged. `run.py` fails
     if two sources slugify to one destination.
   - Owner Downloads files land in three folders under the same slug
     rule: COTTER kit exports in `legacy/cotter/<kit>/`, owner round trips
     (generator and slicer save of one project) in
     `owner/roundtrip/<project>/`, and owner saves without a surviving
     input in `owner/downloads/`. No other folder takes Downloads files.
   - The TENON known-bad row carries `stlZip:
     known-bad/tenon-stl.zip`, and `run.py` passes it as `--stl-zip`
     (M00-T09 step 5); expected detail: 11 parts, 7 STL members, plus the
     undefined names.
2. Rows and expectations:

| set | files | mode | expect |
|---|---|---|---|
| gold | 1 | `--roundtrip` | pass; 127 per-filament keys; `p:path` resolves to the sub-model |
| known-bad CASK empty plate | 1, original | `--roundtrip` | fail CHK-3MF-06 and CHK-3MF-07 |
| known-bad missing part | 1, synthetic | `--roundtrip` | fail CHK-3MF-06 |
| known-bad TENON names | tenon.3mf plus tenon-stl.zip | `--export` | fail export completeness |
| known-bad numeric overhang | 2, synthetic | `--roundtrip` | fail CHK-3MF-07 |
| BOSS | 21 | `--legacy --overlap` | pass 21 of 21; key-set note lists 90 of 127 template keys present, 37 absent, and 7 non-template vectors, all 97 vectors 4 long (counted 2026-10-04) |
| owner saves | 25 rows, 24 copied files (coin row `sameAs: gold`) | `--roundtrip --json` | parse; key-set report written |
| SPRUE plates | 4 | `--legacy --overlap` | pass; `p:path` into `3D/Objects/object_*.model` resolves; key-set note lists 21 of 127 template keys present and 106 absent, each 2 long (counted 2026-10-04) |
| legacy bench exports | PIP 2, TOGGLE 4, KNUCKLE 2, SPARGER W 4 | `--legacy` | legacy: verdicts recorded, failures listed, never fixed in place |
| COTTER kits | 31 (25 print, 6 plates) from four kits, 2026-09-21 to 22; destination `legacy/cotter/` | `--legacy --overlap` | pass 31 of 31 (seed validator, computed 2026-10-04); the kits predate HOOK_OFF |
| owner round trips | BAFFLE wire pair, BAFFLE pre R2 pair, SASH (2)/(3)/(4), COTTER qr-tile pair and bin pair, KNURL app 3MF with resaves (1) and (5); destination `owner/roundtrip/<project>/` | `--legacy` on each generator, `--roundtrip` on each save | type, ids and part map equal; each save holds 127 of 127 at N; none holds the 7 seed-only keys; KNURL records layer drift 0.2 to 0.25 |
| owner saves without a surviving input | haft (3).3mf, haft (5).3mf, toggle-solo4.3mf, tenon (1).3mf, cask_cap_hackbuild (1).3mf, cask5_cap_hackbuild_large.3mf, casting-call-slate.3mf, table-read-slate.3mf, locket-r2 (1).3mf, feeler-ladder (2).3mf, gib-finger-rigid-200x14.3mf; destination `owner/downloads/` | `--roundtrip --json` | parse; header OrcaSlicer-Version 2.3.2; 127 per-filament arrays |
| known-good TENON names | tenon (1).3mf | `--roundtrip` | pass: 11 unique names |

   The BOSS and SPRUE rows run `--legacy` because neither writer emits the
   127-key template; under `--export` every BOSS file would fail CHK-3MF-02
   on the 37 absent keys and CHK-3MF-03 on the 7 non-template length-4
   vectors, which `--legacy` lists as the N equals E case without
   classifying them. The BOSS 21 of 21 figure in verified-claims C2
   came from the seed validator, which checks only the keys present; the
   `--legacy` rule reproduces that scope on purpose. The seed validator
   fails all 4 SPRUE plates today because it rejects `p:path` into
   `3D/Objects/` (reproduced 2026-10-04); the expected pass rests on the
   rewritten CHK-3MF-06 (step 2 of M00-T09), so a SPRUE fail after T09 is
   a CHK-3MF-06 defect, never a reason to relax the row.

3. Synthetic fixtures come from `tools/corpus/3mf/make_known_bad.py`, which
   records the source sha256 and the edit. `cask-empty-plate.3mf` is not
   synthetic: it is the broken Sep 5 original
   `fab-knowledge:evidence/x/downloads/dl-cases/cask/cask_cap_hackbuild.3mf`,
   copied unchanged (sha256 `af0075ba...`, three root components with
   `p:path="/3D/3dmodel.model"`, `overhang_fan_threshold` set to
   `Overhang_threshold_bridge`); it fails CHK-3MF-06 and CHK-3MF-07.
   - `gold-missing-part.3mf`: the gold with each `p:path` changed to
     `/3D/Objects/missing.model`.
   - `overhang-numeric.3mf`: the gold with `overhang_fan_threshold` as JSON
     numbers `[95, 10, 10]`; `overhang-bare.3mf` with strings `["95", "10",
     "10"]`.
   - `overlap-open-part.3mf`: the gold with the first triangle of its object
     sub-model removed, so the part is open; run `--roundtrip --overlap`, it
     fails CHK-PRT-03 (manifold3d reports the open part as not manifold).
   - TENON is copied unchanged: `tenon.3mf` as
     `known-bad/tenon-undefined.3mf` with `tenon-stl.zip` beside it; five
     objects are named `tenon-undefined` (counted 2026-10-04 in its
     `Metadata/model_settings.config`).
4. Owner key-set report `tools/corpus/3mf/reports/owner-keysets.json`: per
   file, filament count, printer preset, template keys present and absent,
   non-template keys of length N. Expected from the 2026-10-04 count: 24
   files name `Flashforge Creator 5 Pro 0.4 nozzle` and `3d/coin/hsl.3mf`
   names the 0.25 nozzle preset; 4 files have 3 filaments, 1 has 2 and 20
   have 1; all 25 carry `BambuStudio-01.10.01.50` (verified-claims C2). The
   test asserts the 24 and 1 split; the rest is recorded.
5. Template diff report `tools/corpus/3mf/reports/template-diff.json`: the
   seed 97 against the gold 127 lists 37 missing and 7 extra keys
   (verified-claims C2; generated, never typed).
6. `tools/corpus/3mf/run.py` runs every row through the Python validator
   and the TypeScript mirror, compares with `expect`, and exits 1 on any row
   outside expectation or any verdict disagreement. A changed expectation
   needs a reason line in the manifest.
7. COTTER exports come from the owner's Downloads: four kits unzipped at
   `fab-knowledge:evidence/x/downloads/dl-pip-latest/cotter/unzipped/`
   (cotter-kit_today_2026-09-21, cotter-kit_laser_2026-09-21,
   cotter-kit_custom_2026-09-22 and cotter-kit_custom_2026-09-22 (1)),
   31 3MFs (25 print, 6 plates), copied to `legacy/cotter/<kit>/`. The
   kits predate HOOK_OFF.

Files to create:
- tools/corpus/3mf/manifest.json, run.py, make_known_bad.py
- tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf
- tools/corpus/3mf/known-bad/*.3mf, tools/corpus/3mf/known-bad/tenon-stl.zip
- tools/corpus/3mf/boss/*.3mf, tools/corpus/3mf/owner/**/*.3mf (24
  files, slugified names, no copy of the coin),
  tools/corpus/3mf/owner/roundtrip/<project>/*.3mf,
  tools/corpus/3mf/owner/downloads/*.3mf (11 files),
  tools/corpus/3mf/sprue/*.3mf, tools/corpus/3mf/legacy/**/*.3mf
  (including legacy/cotter/<kit>/, 31 files)
- tools/corpus/3mf/reports/owner-keysets.json, template-diff.json
- .github/workflows/ci.yml job `corpus` (uv)

Acceptance:
- `uv run --project tools/py tools/corpus/3mf/run.py` exits 0 and prints
  one line per set with counts, including `boss 21 of 21 pass`, `owner 25
  of 25 parse`, `known-bad 5 of 5 fail as named`, `cotter 31 of 31 pass`,
  `owner downloads 11 of 11 parse` and `tenon known-good 1 of 1 pass`.
- Editing the validator to skip CHK-3MF-06 makes `run.py` exit 1 (a test
  does this on a copy).
- `find tools/corpus/3mf/owner -name '*.3mf' -not -path '*/roundtrip/*' -not -path '*/downloads/*' | wc -l`
  prints 24, `find tools/corpus/3mf/owner/downloads -name '*.3mf' | wc -l`
  prints 11, and `find tools/corpus/3mf -name '* *' -o -name '*(*'`
  prints nothing. The gold's sha256 appears once among copied files.

Done when: the corpus job is a required check on the main branch.

## M00-T11 COLLAR coin parity and the first reference

Goal: the COLLAR coin built on the packages matches the legacy bench per
part within 1e-3 mm3, its 3MF key set equals the 127 gold keys, and the
first reference carries goldens.

Inputs:
- COLLAR legacy bench (see Evidence roots): `ST` defaults line 643 (dia 44, thk 3.6, cham 0.5, inlay 1.2, layer 0.2, res 512, shape round, edge reeded count 40, rim on, w 2.2, slot 3, NFC off, faces empty), `planSlabs` 1201, `insetAt` 1215, `labelSlab` 1221, `buildMesh` 1368, `estimateVolume` 1508, `LUT_N = 8192` line 898
- gold round trip; verified-claims C2
- `fab-knowledge:synthesis/plan-deltas.md` M0 row near line 1245 (parity is a key-set assertion; COLLAR has no hook; it writes layer 0.2 under a 0.24 preset)
- `fab-knowledge:synthesis/mappings.md` line 81 (COLLAR reference ids)

Steps:
1. `designs/collar/legacy/collar.html` with `sha256.txt` and a lineage
   README naming the source path (D-142, D-156).
2. `tools/legacy/collar-dump.mjs`: Playwright 1.63.0 opens collar.html from
   `file://` (on the owner's macOS 12 machine through `HBF_CHROMIUM`,
   M00-T01 step 2). Boot applies the 'blank coin' preset (collar.html
   lines 2836 to 2848 and 3170 to 3177: edge plain, rim off, presetPattern
   'Generic {TYPE}'), so the page after load is not at the line 643
   literal. After the page status reads ready, the script assigns the line
   643 values to the page's `ST` in `page.evaluate` (`ST` is a `const`, not
   a window property, so the assignment runs as page code): dia 44, thk
   3.6, cham 0.5, inlay 1.2, layer 0.2, res 512, presetPattern 'Generic
   {TYPE} @FF C5P', edge reeded count 40 depth 1.0 width 2.8 twist 35
   gapDeg 0, rim on w 2.2 slot 3, nfc off, faces empty; then it calls
   `buildMesh()`. Expected parts: slot 1 and slot 3. The booted 'blank
   coin' state (one part, slot 1) is recorded as a second row.
   `projectSettings` returns JSON text, which the dump parses. The script
   writes per part `{slot, name, tris, volume, bbox}`
   (signed volume summed in float64 over the float32 positions) and the
   per-filament key list of `projectSettings(parts)` to
   `tools/corpus/collar/legacy-defaults.json`. COLLAR has no BENCH hook;
   if a needed function is not a page global, the card records a blocker
   and never edits collar.html.
3. `designs/collar/build.ts`: a headless port of `planSlabs`, `insetAt`,
   `labelSlab`, `baseLUT`, `edgeLUT` (8192 entries) and the shape and edge
   functions, emitting a raster ShapeDecl. Art layers need canvas and move
   with the art pipeline at M03; the defaults have empty faces, so the
   parity build needs none. `designs/collar/chase.ts` holds the legacy
   defaults, typed against `spec/chase.ts`.
4. Build through the raster route (with the healer) and the T07 writer.
   The parity build passes the legacy slab bounds to the raster route
   unsnapped in Z, since legacy `planSlabs` works on the 0.2 grid and 0.2
   has no dyadic form; the D-054 snap applies to XY only on this route
   (COLLAR pixel pitch 44/512 = 0.0859375 is already dyadic). With the Z
   snap, per-part volume missed legacy by 0.06 to 0.57 mm3; without it the
   port matched to 5e-11 mm3 (computed, audit run,
   `fab-knowledge:evidence/audit/m0/exec/logs/collar-raster-parity.txt`).
   A second test snaps Z with `q()`, reruns the legacy `labelSlab` on the
   same snapped bounds in the page, and compares both within 1e-3 mm3.
5. Compare per part: volume within 1e-3 mm3 of legacy (computed), equal
   count of set label cells per slot, summed over slab bands (the
   `labelSlab` output), and an equal healer `changed` count; triangle
   counts are reported, never compared (legacy 5368 against port 41960
   on slot 1 in the audit run). Labels and volumes do not change under
   translation, so each part's bounds are also compared with the legacy
   `bbox`: XY within 1/1024 mm, Z within 1e-6 mm (legacy Z is float32).
   The test takes the raster origin from `masks()`, the export path, not
   from a copy of the origin math, so a one cell shift on the export path
   fails against legacy (impl audit, delta 0.0859375 mm). A mismatch
   reports the slot, the cell indices and the healer flips; the tolerance is
   never widened to pass.
6. Key set: the per-filament key set of the exported project_settings
   equals the 127 gold keys exactly (set equality, never array length
   alone), with per-slot values from the slot presets.
7. Layer contract: the legacy default layer 0.2 is written under the
   `0.24mm Standard @FF C5` process (plan-deltas R54, layer contract). The
   parity run uses 0.2 to match legacy. The reference below defaults to
   0.24 so layer and preset agree, and its README records the change.
8. `reference/exports/orca-3mf-roundtrip/`: `chase.ts`, `build.ts` (the
   COLLAR build at layer 0.24), `README.md` with the verified block (D-008),
   `expected/` with build.json, report.json, edit.json, artifacts.json and
   section.png, and `covers: [export:3mf, CHK-3MF-01, CHK-3MF-02,
   CHK-3MF-03, CHK-3MF-06, CHK-3MF-07, CHK-PRT-01, CHK-PRT-03, route:raster]`
   (D-105). The edit in edit.json sets `/rim/w` from 2.2 to 3.0; the
   expected changed bodies are the body slot and the rim slot.
9. Goldens are written once with `npx --no-install hbf parity
   reference/exports/orca-3mf-roundtrip --accept`, read by a person, and
   committed only when the owner asks (D-006).
10. Add the `parity` job to `.github/workflows/ci.yml` (levels 4 and 5 of
    ../TESTING.md, D-152, compare mode only): the M-1-T05 job shape with
    `npm ci`, `npx playwright install --with-deps chromium` (for
    `tools/legacy/collar-dump.mjs`), `npx tsc -b`, then `npx
    vitest run tools/parity` and `npx --no-install hbf parity
    reference/exports/orca-3mf-roundtrip`. The job never passes
    `--accept`. The second command needs the `parity` verb of M00-T13, so
    the job lands with T13 or after it.

Files to create:
- designs/collar/chase.ts, build.ts, README.md, legacy/collar.html,
  legacy/sha256.txt, legacy/README.md
- tools/legacy/collar-dump.mjs, tools/corpus/collar/legacy-defaults.json
- tools/parity/collar.test.ts
- reference/exports/orca-3mf-roundtrip/{chase.ts, build.ts, README.md, expected/}
- .github/workflows/ci.yml (edit: job `parity`)

Acceptance:
- `node tools/legacy/collar-dump.mjs` exits 0 and writes legacy-defaults.json.
- `npx vitest run tools/parity/collar.test.ts` exits 0: every part volume
  within 1e-3 mm3; key set equal to the 127 gold keys.
- `npx --no-install hbf parity reference/exports/orca-3mf-roundtrip` exits 0.
- `uv run --project tools/py tools/py/validate_3mf.py --export --overlap <exported coin>.3mf` exits 0.

Done when: the parity test and the reference run in CI and the README
verified block lists what was checked by machine and what nobody has
verified (no slicer run of the new export yet).

## M00-T12 SPRUE geometry parity

Goal: SPRUE's shipped geometry passes through both hackbuild writers
unchanged, while the key set moves from SPRUE's 21 per-filament keys to the
127-key template.

Inputs:
- `fab-work-directory:benches/sprue/outputs/sprue/sprue.py` lines 748 to 772 and `sprue.html` lines 915 to 934 (21 list keys; verified-claims C2)
- `fab-work-directory:benches/sprue/outputs/sprue/plates/*.3mf` (4 plates; 24 settings keys each, 21 per-filament lists of length 2, counted 2026-10-04) and `parts/*.stl` (4)

Steps:
1. Read each plate's parts through `p:path` sub-models and the four part
   STLs.
2. Re-emit every plate through the TypeScript and Python writers with two
   PETG filaments.
3. Compare per part: volume within 1e-3 mm3, bounding box within 1e-6 mm,
   triangle count equal (computed).
4. Record SPRUE's own key set in the corpus report: 21 per-filament keys
   plus `version` and the two preset names, 24 in all. Key-set parity with
   SPRUE is not a target; SPRUE's geometry route moves onto packages at M03
   (D-028).

Files to create:
- tools/parity/sprue.test.ts, tools/py/test/test_sprue.py

Acceptance:
- `npx vitest run tools/parity/sprue.test.ts` exits 0.
- `uv run --project tools/py pytest tools/py/test/test_sprue.py` exits 0.
- Each re-emitted plate passes `validate_3mf.py --export --overlap`.

Done when: the SPRUE rows in the corpus report show geometry equal and the
key count change from 21 to 127.

## M00-T13 hbf CLI skeleton with the error contract

Goal: a person or a model can build, inspect, check, render and export a
3MF through `hbf`, getting a CommandResult and an exit code every time, and
the export never runs without a person at a terminal.

Inputs:
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/core/` (README, bin)
- `fab-knowledge:plan/AGENT-SURFACE.md` sections 5.3 (CommandDef), 6.1 (CommandResult and CommandError types), 6.2 (transport mapping and exit codes), 6.3 (text mirror), 6.5 (export gate), 7.1 to 7.3 (URIs, store layout, hashes) (source: api-library-ai-design.md, same section numbers)
- repo: `spec/commands.ts`, `spec/errors.ts`, `spec/checks.ts`, `spec/registry.ts`, ../AGENT-SURFACE.md

Steps:
1. `core/src/registry.ts` holds CommandDef objects typed by `CommandName`;
   M00 registers part.build, part.inspect, check.run, export.run,
   view.render and the utility verbs doctor, explain, parity. A test pins
   the registered count to the cumulative MILESTONES.md 1.3 total for M00.
2. CLI form: `hbf <command> <target> [--params <json>] [--json] [--detail
   summary|full]`. Inputs validate with zod 4.6.5: a schema failure is
   E_SCHEMA with a JSON pointer `path`, `got`, `expected` and a one-line
   `hint`; an unknown id is E_REF with up to 3 `didYouMean` by edit
   distance (D-064).
3. CommandResult per ../AGENT-SURFACE.md 6.1: `ok`, `verdict`,
   `stage`, `result`, `buildHash`, `inputsHash` (sha256 of RFC 8785
   canonical args), `findings` (fail first, then warn), `counts`,
   `errors`, `artifacts`, `next`. The text mirror prints status line,
   findings, errors, next, in that order (../AGENT-SURFACE.md 6.3). `--json` prints the
   structured result only.
4. Exit codes from `spec/errors.ts` `EXIT_CODES`: pass or warn 0, check
   fail 1, E_UNSAT 1, input errors 2, E_GATE_UNAVAILABLE 3, E_PROVENANCE 4,
   E_REPEAT 5, internal 70 (../AGENT-SURFACE.md 6.2).
5. Store per D-050: `<workspace>/.hbf/store/{builds,meshes,reports,artifacts}`
   keyed by content hash; `hbf://build/<h>`, `hbf://mesh/<h>`,
   `hbf://report/<h>`, `hbf://artifact/<h>` and the static
   `hbf://check/<id>`. An unknown or collected URI returns E_HANDLE naming
   the chase id it came from. Each kind has one file form:
   `builds/<buildHash>.json`, `meshes/<meshHash>.hbfm`,
   `reports/<reportHash>.json`, `artifacts/<artifactHash>.<ext>`.
   `StoreHandle.put` routes raw bytes into that form (a 3MF under its
   D-052 artifactHash, a PNG under its sha256) or refuses them with
   E_SCHEMA, so what put returns, `has` and `get` read back.
   `hbf://check/<id>` resolves to the check seed record; an unknown id is
   E_REF with up to three near ids. `hbf://build/<h>/part/<partId>` is
   E_HANDLE naming the build uri until M04-T08 step 3 resolves it.
6. `SOURCE_DATE_EPOCH`: the environment value when set (whole
   non-negative seconds, raised to 315532800 when lower, the zip mtime both
   writers clamp to); else the committer time of HEAD (`git log -1
   --format=%ct`); else 315532800. The value enters
   `BuildInputs.sourceDateEpoch` and is never `Date.now()`. `hbf parity`
   builds a reference at the `inputs.sourceDateEpoch` its
   `expected/build.json` records, so neither HEAD nor the caller's
   environment moves a golden.
7. part.build: target is a design or reference directory or its id;
   loads `build.ts` with Node's built-in TypeScript type stripping
   (verify on Node 22.18 and 24.11, the D-039 floors; if either fails,
   record it and compile with tsdown 0.23.0 into `.hbf/cache`); runs the
   stages; stores Part IR, meshes, metrics, warnings; `buildHash` is sha256
   of canonical BuildInputs (defHash, paramsHash, profileHash,
   registryHash, kernelVersion, engines {manifold: "3.5.4"}, adapter
   `3mf/bbs-01.10.01.50`, seed, sourceDateEpoch, licences) (D-051), typed
   as spec BuildInputs. defHash names each source file by its path relative
   to the design directory, so a byte-identical design in another directory
   gives one defHash and one buildHash (ARCHITECTURE.md 8; test in
   core/test/load-build.test.ts); kernelVersion is the @hackbuild/kernel
   package version.
8. check.run: on a build runs CHK-PRT-01, CHK-PRT-03 and CHK-3MF-04 on Part
   IR; with `--artifact <file.3mf>` runs the T09 mirror. Findings use the
   D-064 CheckResult shape with `origin: hbf://check/<id>`; a NaN or
   missing measured value is E_PARAM_MISSING.
9. export.run, kind 3mf (ExporterDef.fabrication true) (D-109): build, then
   checks; any fail returns exit 1 with the findings and no prompt. Without
   an interactive TTY on stdin and stdout it returns E_GATE_UNAVAILABLE,
   exit 3, naming the CLI line a person runs. With a TTY it asks once:
   `export 3mf for <machine> from <id>, build <hash>, <n> fail, <n> warn.
   writes <path>. this approval does not identify who approved. [y/N]`.
   There is no bypass flag and no environment token. On yes it writes the
   file and returns the artifact with its artifactHash. Every return (dry
   run, gate, done, fail) carries `warnings`: the build's, the checks' and
   the writer's, one per code, text and param. A TPU slot raises
   PRESET_INFERRED (PROFILE.md 8.1, D-187), and the prompt names those
   slots after the counts: `slots 3, 4 tpu values inferred from Generic
   PETG @FF C5P; they may not reach the slice.` A warning is not a check
   verdict and never enters counts.
10. part.inspect: bodies, slots, volumes, bounding boxes, meshHash,
    metrics, warnings of a stored build.
11. view.render: top, front, iso and section orthographic PNGs of a stored
    build, flat shaded per slot color, drawn by a z-buffer rasterizer over
    Part IR triangles in `core/src/render/` with a `node:zlib` PNG writer.
    No browser and no three, so core keeps the external dependencies
    ../ARCHITECTURE.md section 3 lists and the command runs on the owner's
    macOS 12 machine (../RISKS.md R-24). Output bytes depend only on the
    build, so PNG hashes are recorded per leg and join the determinism
    comparison (M00-T14). Browser screenshots stay in chase.render and
    tools/smoke, which run in CI.
12. doctor: Node version against `^22.18.0 || >=24.11.0` and against
    `.nvmrc`, manifold-3d version, uv on PATH with its version (fails
    with the M-1-T01 step 0 install line when absent), the Python modules, lib3mf version, the
    SOURCE_DATE_EPOCH source in use, `.hbf/` writable, `core.hooksPath`
    set. explain `<id>`: the check record (title, origin, legal kind) or the
    meaning of an error code.
13. parity `<dir>`: runs the triple (geometry matches, params round-trip,
    one edit gives the expected delta) against `expected/`; `--accept`
    writes new goldens and prints the diff; CI never passes `--accept`
    (D-152).
14. Contract tests (level 3 of ../TESTING.md 4.3): `core/test/contract.test.ts`
    asserts every registered CommandDef has at least one example that
    validates against its input schema and a description that passes
    lint-voice. Add the `contract` job to `.github/workflows/ci.yml` in
    the M-1-T05 job shape with `npm ci`, then `npx vitest run spec/test
    core/test/contract.test.ts`. spec/test carries the M-1 contract rows
    (30 commands, 19 MCP tools); seed conformance stays in the `seed` job.
    The registry contract row (FeatureKindDef, CheckDef) joins this job
    at M04.

Files to create:
- core/src/cli.ts, registry.ts, result.ts, text.ts, errors.ts, store.ts,
  jcs.ts (hashOf only: sha256Hex(canonicalize(x)) from spec/jcs.ts, with
  CanonicalizeError answered as E_PARAM_MISSING; core defines no
  canonicalizer or sha256 of its own, D-206, D-225), epoch.ts, tty-gate.ts,
  load-build.ts
- core/src/commands/part-build.ts, part-inspect.ts, check-run.ts,
  export-run.ts, view-render.ts, doctor.ts, explain.ts, parity.ts
- core/src/render/raster.ts, core/src/render/png.ts
- core/test/surface.test.ts, result.test.ts, errors.test.ts,
  gate.test.ts, store.test.ts, epoch.test.ts, contract.test.ts,
  timeout-floor.test.ts
- .github/workflows/ci.yml (edit: job `contract`)
- vitest.config.ts (edit: `testTimeout: 60_000`). A test that runs a
  build without its own timeout argument got the vitest default of
  5000 ms; a cold build spawns a sandbox child and took 4 to 6 s
  (measured) under a full parallel run, so export-warnings.test.ts
  timed out in 1 of 8 runs at verifier round 2 and 5 of 8 on the fixer's
  rerun. timeout-floor.test.ts pins the floor through `ctx.task.timeout`.
- core/vitest.config.ts (create): `npm test -w core` runs vitest from
  core/ and never read the root config, so neither its globalSetup nor
  the floor applied there. It imports `testTimeout` from the root config
  and runs test/global-setup.ts.

Acceptance (from the repo root; the first command builds every
workspace package into `dist/`, which `core/bin/hbf.mjs` imports as
`../dist/cli.js` per M00-T01 step 1):
- `npm ci && npx tsc -b` exits 0.
- `npx --no-install hbf part.build reference/exports/orca-3mf-roundtrip --json` exits 0;
  `buildHash` equals `expected/build.json`; a second run prints the same
  `buildHash` and `inputsHash`.
- `npx --no-install hbf part.build reference/exports/orca-3mf-roundtrip --params '{"rim":{"w":"wide"}}' --json` exits 2 with E_SCHEMA at `/rim/w`. ParamsOf is flat; this is the group-wrapped form, where the group id `rim` wraps its field `w` (core/src/commands/build.ts ungroup), and `{"w":"wide"}` names the same field.
- `npx --no-install hbf explain CHK-3MF-6` exits 2 with E_REF and `didYouMean` containing `CHK-3MF-06`.
- `npx --no-install hbf check.run --artifact tools/corpus/3mf/known-bad/cask-empty-plate.3mf --json` exits 1 with a CHK-3MF-06 fail finding.
- `npx --no-install hbf export.run reference/exports/orca-3mf-roundtrip --kind 3mf --machine ffc5p < /dev/null` exits 3 with E_GATE_UNAVAILABLE.
- gate.test.ts drives the TTY path through `script`, choosing argv from
  `process.platform`: on linux (util-linux) `["script", "-qec", cmd,
  "/dev/null"]`, on darwin (BSD) `["script", "-q", "/dev/null", "sh",
  "-c", cmd]`; any other platform marks the test skipped and reports it
  as not run (D-153). On the darwin builder machine, `printf 'y\n' |
  script -q /dev/null sh -c 'test -t 0 && test -t 1 && echo tty-ok'`
  printed tty-ok (measured, 2026-10-04). Answer y exits 0 and writes
  the file; answer n exits with E_GATE and writes nothing; a failing build exits 1 and the prompt text never
  appears.
- `npx --no-install hbf part.inspect hbf://build/<buildHash> --json` exits 0; `npx --no-install hbf part.inspect hbf://build/0000 --json` exits 2 with E_HANDLE.
- `npx --no-install hbf doctor` exits 0.
- `npx vitest run spec/test core/test/contract.test.ts` exits 0 (the `contract` job command).
- `npm test -w core` exits 0 on 8 consecutive runs (a flaky timeout is a fail).

Done when: every M00 acceptance command that names `hbf` runs from a clean
checkout, and the text mirror of a failing check reads like
../AGENT-SURFACE.md 6.3.

## M00-T14 Determinism job

Goal: every M00 reference and route fixture gives equal mesh hashes on
ubuntu x64, ubuntu arm64 and macos-14 arm64 (../TESTING.md 7), and each
writer reproduces its own bytes.

Inputs:
- D-056; `fab-knowledge:plan/TESTING.md` sections 7 (determinism) and 15.1 (CI jobs) (source: api-library-ai-design.md 12, `determinism` row)
- C-11 (manifold-3d 3.5.0 introduced cross-platform determinism; unproven here until CI runs)

Steps:
1. `.github/workflows/ci.yml` job `determinism`: a matrix on
   `ubuntu-24.04`, `ubuntu-24.04-arm` and `macos-14` (../TESTING.md 7,
   the owner builds on Apple silicon); each leg builds every M00
   reference and the route fixtures of M00-T05 with
   `SOURCE_DATE_EPOCH=1791072000`, and uploads `meshHashes.json` (body id to
   meshHash) and `artifactHashes.json`.
2. A compare job downloads every leg and fails on any difference, printing the
   body ids that differ.
3. On each leg, `tools/determinism/writer-bytes.mjs` and the Python
   test_bytes.py build every corpus input twice per writer and compare
   sha256 of the .3mf bytes, under `TZ=UTC` and `TZ=America/Phoenix`.
   On ubuntu-24.04-arm test_bytes.py runs under the same `uv run
   --project tools/py` line; lib3mf is absent there by marker (M00-T01
   step 4), so the lib3mf rule shows not run and the x64 leg carries it.
   view.render PNG hashes of every M00 reference are compared across legs
   with the mesh hashes.
4. Cross-arch byte identity of one writer's zip is recorded, not required;
   artifactHash equality across arch is required.
5. Browser legs (D-175): Playwright WebKit and Chromium load the baked
   kernel from file://, build the M00-T05 route fixtures and a ring set
   from `Author.ring.circle` at 3 to 256 segments in a page, and write
   `meshHashes.<engine>.json`; the compare job fails on any difference
   from the node list.

Files to create:
- .github/workflows/ci.yml job `determinism` and `determinism-compare`
- tools/determinism/hashes.mjs, tools/determinism/compare.mjs,
  tools/determinism/writer-bytes.mjs, tools/determinism/browser.spec.ts

Acceptance:
- `SOURCE_DATE_EPOCH=1791072000 node tools/determinism/writer-bytes.mjs` exits 0 and prints equal sha256 pairs.
- `node tools/determinism/hashes.mjs > /tmp/a.json && node tools/determinism/hashes.mjs > /tmp/b.json && node tools/determinism/compare.mjs /tmp/a.json /tmp/b.json` exits 0.
- The CI `determinism-compare` job is green on the PR.

Done when: determinism is a required check and its first green run is
linked in ../TESTING.md.

## M00-T15 hackbuild-3mf extraction and 0.1.0 release

Goal: hackbuild/hackbuild-3mf holds the JavaScript writer and validator
mirror with history, the Python half and the conformance corpus, ready to
publish npm `hackbuild-3mf` and PyPI `hackbuild_3mf` from one tag, and
hackbuild-fab depends on the published version once it exists.

Inputs:
- D-027, D-037 (owner), D-041 (MIT), D-170, D-171, D-172 (owner, defaults in force); ../REPOS.md (extraction procedure, repo state: hackbuild/hackbuild-3mf empty, created 2026-09-15); ../LICENSING.md
- `fab-knowledge:plan/REPOS.md` sections 10.2 and 10.3 (procedure; one tag, two registries) (source: api-library-ai-design.md 3.5, 14.1: semver, npm and PyPI from one tag, gated by the corpus)

Steps:
1. Name availability (D-037), recorded with the date in ../REPOS.md:
   `npm view hackbuild-3mf` (E404 means free), `npm view
   @hackbuild/kernel`, and `curl -s -o /dev/null -w '%{http_code}'
   https://pypi.org/pypi/hackbuild_3mf/json` (404 means free).
2. Preconditions: T07 to T12 green; `packages/3mf/README.md` with the
   verified block; LICENSE MIT; no AI attribution in any file, trailer or
   metadata (D-001). In hackbuild-fab, first: `TRADEMARKS.md` (D-171),
   `CONTRIBUTING.md` (../LICENSING.md section 1.5, ../DOCS.md section 7),
   `LICENSES/MIT-0.txt` and the `tools/licences.json` path-map rows for
   docs, the logo and templates (D-170, D-171, D-172), so the split
   carries them.
3. In hackbuild-fab: `git subtree split --prefix packages/3mf -b
   split/hackbuild-3mf`.
4. In a clone of hackbuild/hackbuild-3mf: pull the split branch, then
   restructure into `js/` (the split content, `private` removed, name
   `hackbuild-3mf`, version 0.1.0, author Moheeb Zara
   <hackbuildvideo@gmail.com>), `py/` (validate_3mf.py, orca3mf.py,
   harvest_filament_keys.py as package `hackbuild_3mf` 0.1.0 with console
   entry points), `corpus/` (from `tools/corpus/3mf`), a CI workflow
   running js tests, py tests and the corpus, and a release workflow on tag
   `v0.1.0` publishing npm from `js/` with provenance and PyPI from `py/`.
5. Commits and pushes happen only when the owner asks (D-006); subjects
   follow the D-005 default (imperative, lowercase, under 60 characters).
6. Publish only after D-037 clears and the owner's credentials exist
   (D-037 owner; default: nothing publishes until the owner creates the npm
   org; the unscoped npm name and the PyPI name are checked here). Until
   then M00 exits with the split branch and the release workflow ready and
   the exit row reads "publish pending D-037".
7. After publish: `packages/3mf` depends on `hackbuild-3mf` 0.1.0 exactly
   and keeps only the fab glue (ExporterDef registration,
   `hackbuild_chase.json`, CHK-3MF-04 on Part IR, the Part IR adapter);
   `tools/py/pyproject.toml` pins `hackbuild_3mf==0.1.0` and
   `tools/py/validate_3mf.py` becomes an entry point calling it, so every
   acceptance path in this file stays valid. The local Python copies are
   removed only after the corpus passes on the published version (D-140).

Files to create:
- in hackbuild-3mf: js/, py/pyproject.toml, py/hackbuild_3mf/, corpus/,
  README.md, LICENSE, LICENSES/CC-BY-4.0.txt (docs, D-170), TRADEMARKS.md,
  CONTRIBUTING.md, .github/workflows/ci.yml,
  .github/workflows/release.yml, CHANGELOG.md
- in hackbuild-fab: TRADEMARKS.md, CONTRIBUTING.md, LICENSES/MIT-0.txt,
  path-map rows in tools/licences.json; an update to
  packages/3mf/package.json and tools/py/pyproject.toml after publish

Acceptance:
- `git subtree split --prefix packages/3mf -b split/hackbuild-3mf` exits 0.
- In the hackbuild-3mf working tree: `npm test --prefix js` exits 0, `uv run --project py pytest` exits 0, and the corpus runner exits 0.
- `node tools/licences.mjs --check` exits 0 with the docs, logo and template rows present.
- `node tools/lint-voice.mjs` run in the hackbuild-3mf tree (its import of the fab linter and allow file) exits 0.
- In the hackbuild-3mf tree: `node --test tools/test/import-from-fab.test.mjs` passes and `sh tools/import-from-fab.sh --check <fab checkout>` exits 0.
- After publish: `npm view hackbuild-3mf version` prints `0.1.0` and
  `curl -s https://pypi.org/pypi/hackbuild_3mf/json` reports version
  0.1.0; hackbuild-fab's corpus job passes against the published package.

Standalone source (2026-10-06, implementation audit): `packages/3mf` lists
only `@hackbuild/spec` and jszip as runtime dependencies; `@hackbuild/mesh`
and `@hackbuild/profile` are devDependencies its tests read. The mesh shape,
signed volume and the CHK-PRT-01 audit the validator mirror runs live in
`packages/3mf/src/mesh.ts`, so the package loads no manifold-3d wasm and the
split carries the file as is, where `tools/import-from-fab.sh` cut a copy out
of `packages/mesh` before. `packages/mesh` is tier 0 and may not import
tier 1 (../PACKAGES.md 3.1), so it keeps the same code;
`packages/3mf/test/mesh-parity.test.ts` fails when the two drift in source
text or in audit output on hand fixtures and manifold-3d meshes at both
merge grids, when the sibling split `js/src/mesh.ts` differs from
the fab file, or when a workspace import other than spec returns under
`packages/3mf/src`. The writer's own UTF-8 encoder is gone: artifactHash
and the zip both take text through spec `utf8Bytes`, which closed a lone
surrogate in a title or name giving an artifactHash that differed from the
hash of the zip bytes under node (`test/bytes.test.ts`); corpus zip bytes
are unchanged (`tools/determinism/writer-bytes.mjs`, collar-coin
`0cb52145...`, computed).

Split drift (2026-10-06, implementation audit): the staged hackbuild-3mf
tree was imported at 18:07 on 2026-10-05, before fab passed
`mergeGridPerMm: 1e8` from the validator mirror to the audit, so the split
failed its own agreement test on `legacy/sparger-w/spargerw-plate-a-tube`
(185 of 186) and its corpus run (123 of 124) while fab ran 124 of 124, and
its README blamed fab for the row. The tree was re-imported from a fresh
rehearsal snapshot of the fab working tree. `tools/import-from-fab.sh
--check <fab> <split repo>` now imports into a scratch copy and names every
file that differs, and the split's `py/tests/test_package.py` fails when a
copied test still opens a fab path (the template harvester half of the
unsafe-name test, the root package.json read in `metadata.test.ts`). On the
re-imported tree: js 216 of 216, py 71 of 71, corpus 124 of 124 rows with
no disagreement, `--check` exit 0 (counted, scratch under
`fab-knowledge/evidence/impl-audit/fix-3mf-split/final`).

Reproducible check (2026-10-06, verifier round 3): the recorded exit 0 above
ran against a hand-made rehearsal snapshot that nothing could rebuild, and
the only snapshot left on disk (`fix-3mf-split/fabsnap`) predated both
trees, so the check exited 1 naming five js files, and against a fresh
rehearsal it still named `py/tests/test_bytes.py`, which fab changed after
the import. `tools/import-from-fab.sh` now rehearses the split itself when
no split repo is given: `--rehearse <fab> <dir>` copies every fab file git
does not ignore (working-tree bytes, staged or not), commits it once as
`rehearsal` at SOURCE_DATE_EPOCH 315532800 and runs `git subtree split
--prefix packages/3mf -b split/hackbuild-3mf`, so equal working trees give
equal split commits, and `--check <fab>` and the plain import use that.
`tools/test/import-from-fab.test.mjs` in the split holds it: a hand-built
fab with one file per git state (runs without a checkout), the rehearsed
split equal to fab `packages/3mf` read from disk, and `--check <fab>`
exiting 0 (the last two skip, which counts as not run, with no fab
checkout at HBF_FAB or the sibling `../hackbuild-fab`). The tree was
re-imported from the current working tree: js 219 of 219, py 74 of 74,
corpus 125 of 125 rows with no disagreement, `--check <fab>` exit 0
(counted, split commit f751f4f of the rehearsal).

Drift seen from fab (2026-10-07, verifier round 2): `--check <fab>`
exited 1 naming `py/tests/test_bytes.py` and `tools/lint-voice.allow.json`,
because fab gained `test_dated_literals_ignore_the_ambient_epoch` and the
`designs/sash/legacy/sash.html` exclaim row after the import and only the
split side could see it. The split was re-imported from the current
working tree, and fab `tools/test/split-fresh.test.mjs` now runs the
split's `--check` against the fab working tree (the sibling
`../hackbuild-3mf`, or HBF_3MF; skipped, counted as not run, without one),
so a fab edit to a copied file fails fab `npm test` until the split is
re-imported. Before the re-import it failed naming both files; a scratch
split with the new parametrize line or the sash row removed fails it
naming that file (scratch under
`fab-knowledge/evidence/m03-scratch/m00-t15-split-fresh`). On the
re-imported tree: js 219 of 219, py 78 of 78, corpus 125 of 125 rows with
no disagreement, `--check <fab>` exit 0 (counted).

Card defect, acceptance row 4: fab `node tools/lint-voice.mjs
../hackbuild-3mf` matches its allow rows against paths relative to the fab
root, so the split's RULES.md and tools/lint-voice.mjs (the word lists
themselves) report 50 block findings (counted, 2026-10-06). The row runs
the split's own copy, byte equal to fab's through the import: `node
tools/lint-voice.mjs` in the hackbuild-3mf tree exits 0.

Card defect (fixer, 2026-10-08): after M04 the check ran exit 1 (split
differs on js/src/validate/rules.ts, js/src/writer/completeness.ts,
js/test/validate.test.ts and py/hackbuild_3mf/data/checks.seed.json,
measured), and a plain re-import left the split's validate.test.ts at 1
fail of 219: `tools/import-from-fab.sh` copied seed rows for a hand-kept
list of seven ids, and M04-T12 added CHK-ART-01 to CHECK_META. The script
now reads the ids from CHECK_META in fab's built packages/3mf (exit 1
naming `npx tsc -b` when dist is missing). After the re-import, in the
hackbuild-3mf tree: `--check` exit 0, `npm test --prefix js` 219 of 219,
`uv run --project py pytest` 78 of 78, `uv run --project py corpus/run.py`
125 rows, 0 outside expectation, `node --test tools/test/*.mjs` 70 of 70
(measured exit codes and counts). A re-import overwrites
corpus/reports/; run corpus/run.py after it, as its header says.

Done when: either both registries list 0.1.0 and fab depends on it, or the
exit table records "publish pending D-037" with the split ready, and
`sh tools/import-from-fab.sh --check <fab checkout>` run in the
hackbuild-3mf tree exits 0 (with no split repo it rehearses the fab working
tree; after the first fab commit the fab checkout may be named as the split
repo).

## M00-T16 Untrusted input: chase source reader, build sandbox, reader limits

Goal: a chase is read as data and never executed, a build.ts runs only in
the D-178 sandbox, and every reader of outside bytes enforces the
../ARCHITECTURE.md 11.1 limits, each with a test that refuses its case.

This card was added on 2026-10-05 by the implementation audit. MILESTONES.md
1.3 and D-178 assign the reader and the sandbox to M00, and M-S defers them
here, but no M00 card carried them, so "every Exit row passes" could not
cover them. State on 2026-10-05: steps 3 and 4 are implemented (the js
reader in packages/3mf/src/validate/reader.ts, the Python limits in
tools/py/validate_3mf.py and the harvester, the fuzz test); steps 1 and 2
are implemented by the core audit fix of the same day (packages/chase
source.ts; core/src/sandbox.ts and sandbox-child.ts). M00 is not green
until this card's rows pass on CI.

Inputs:
- D-178, D-166, D-206; ../ARCHITECTURE.md 11.1 and 11.2; ../TESTING.md
  4.2.1; ../RISKS.md R-25
- spec/chase.ts (`CHASE_SOURCE_RULES`, `CHASE_SOURCE_LIMITS`,
  `ReadChaseSource`); spec/build.ts (`BUILD_SANDBOX`, `BUILD_IMPORTS`,
  `BUILD_SANDBOX_REASONS`)

Steps:
1. `packages/chase/src/source.ts` parses the literal `defineChase({...})`
   form without importing, evaluating or compiling it and returns the
   chase plus byte spans. Each rule of `CHASE_SOURCE_RULES` has one
   refusal test (E_SCHEMA, record `chase-source/<rule>`), and the reader's
   value equals the module's default export for every reference.
   `part.build` reads the chase only through it. Until the derived chase
   schema lands (M10) the reader checks the fields part.build reads, and
   `build.module` may omit ".ts" (the references write "./build"); the
   "./" prefix and the ban on ".." and absolute paths hold either way.
2. `build.ts` runs in a child node process under `--permission` per
   `BUILD_SANDBOX`. A build.ts calling `fetch`, writing through `node:fs`,
   importing `node:child_process` or `../outside.ts`, looping forever or
   returning NaN stops with E_KERNEL, record `build-sandbox/<reason>`, and
   writes nothing. The parent forks `core/dist/sandbox-child.js` with
   env {}, read grants for the design directory and the workspace's spec,
   packages, kernel, core and node_modules, and the heap cap; the child
   installs the import policy with `module.registerHooks` (Node 22.15 and
   later) and replaces fetch, WebSocket, EventSource, process.binding,
   process.dlopen, process.getBuiltinModule and process.kill with stubs
   that record the stop. A refusal the build catches is still reported.
   The parent kills the child at the wall budget and checks the reply as
   plain data with finite numbers before kernel stage 1, then applies each
   registered FeatureKindDef.schema to every draft feature of its kind
   (`featureSchemaProblem` in core/src/commands/build.ts); a refusal is
   record `build-sandbox/result-schema` at the feature's pointer. The
   whole-draft check stays structural (`draftProblem` in sandbox.ts) until
   the derived PartDraft schema lands with `chase.validate` (M10, D-131).
   The Author the child hands build.ts (core/src/author.ts) resolves
   `k.fit` through `ProfileLookup.fit`, so a dropped class names its
   replacement (D-100) and the fit row enters profileHash. `k.derive` takes
   only the fn of a declared derived field or AutoSpec (E_SCHEMA at
   `/author/derive` otherwise) and returns the value; the child sends each
   call back as an informational `derived.<field>` metric, which the parent
   appends to Part.metrics sorted by id, so the value hashes with the part
   and reaches the HUD and the `derived.<field>` status chip (P-09).
   The flex-pair
   draft kinds (`reference/keys/flex-pair/skeleton-kinds.ts`) still load
   in the parent as trusted kernel code; a skeleton-kinds.ts in any other
   directory is refused. `reference/exports/orca-3mf-roundtrip` imported
   `designs/collar/build.ts` across directories, which the allowlist
   refuses, so it carries a byte copy, `collar-build.ts`, that a test holds
   equal to the source.
3. The 3MF and zip readers (packages/3mf, tools/py/validate_3mf.py, the
   harvester) refuse traversal names, more than 4096 entries and inflation
   past 256 MB, counted while inflating, with E_SCHEMA naming the rule; the
   entry count is taken by walking the central directory before the zip
   library parses it, never from the EOCD count
   (exit 2 in Python).
4. `packages/3mf/test/reader.fuzz.prop.test.ts` drives the reader through
   those rules (../TESTING.md 4.2.1); the share decoder fuzz joins at M09
   with the share link, the SVG document sanitiser at M05 (its first SVG
   document, D-240) and M09, and the design-JSON reader at M09 and M10;
   M03 reads SVG path data only and fuzzes its raster intake.

Files to create:
- packages/chase/src/source.ts, packages/chase/test/source.test.ts
- core/src/sandbox.ts (parent), core/src/sandbox-child.ts (child runner),
  core/src/author.ts, core/test/author.test.ts,
  core/test/build-sandbox.test.ts and its fixtures in
  core/test/fixtures/sandbox/
- packages/3mf/src/validate/reader.ts,
  packages/3mf/test/reader.fuzz.prop.test.ts

Acceptance:
- `npm test -w packages/chase -- source` exits 0 with one refusal per
  `CHASE_SOURCE_RULES` entry and the reader equal to the module export for
  every chase.ts in reference/ and designs/.
- `npm test -w core -- sandbox` exits 0 with the six D-178 cases each
  stopping with its reason and writing nothing, plus a dynamic import, a
  caught refusal, process.getBuiltinModule, a chase.ts holding code, a
  build.module symlink out of the directory, the NPM_TOKEN canary
  absent from the child, and a draft feature its FeatureKindDef.schema
  refuses.
- `npx vitest run packages/3mf/test/reader.fuzz.prop.test.ts` exits 0
  (13 tests, measured 2026-10-08).
- `uv run --project tools/py pytest tools/py/test/test_validate.py
  tools/py/test/test_harvest.py` exits 0, including the entry-count and
  inflation-bomb cases.

Done when: part.build reads every reference chase through source.ts and
runs its build.ts in the sandbox, and the four rows pass.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| realGap(0.275, 'hole', 'ffc5p', 'petg') = 0.075 per side to 6 digits | computed | M00-T02 | `npm test -w packages/profile` |
| COLLAR outline offsets match to 1e-6 mm, 21 cases | computed | M00-T03 | `npm test -w packages/geom` |
| route parity: prism and stack within 1e-6 relative; revolve on a bounded selection of TENON calls | computed | M00-T05 | `npm test -w packages/mesh` |
| revolve on every TENON call (448) | computed | M00-T05 | `npm run revolve:full -w packages/mesh` |
| 100-design sweep, 0 failures, live count 0 | computed | M00-T06 | `npm run sweep -w packages/mesh` |
| writer key set equals the 127 gold keys; three kept keys present | counted from the gold | M00-T07 | `npm test -w packages/3mf` |
| two writer runs with one SOURCE_DATE_EPOCH give equal sha256 | computed | M00-T07, M00-T08, M00-T14 | `SOURCE_DATE_EPOCH=1791072000 node tools/determinism/writer-bytes.mjs` |
| py and js artifactHash equal | computed | M00-T08 | `uv run --project tools/py pytest tools/py/test/test_agreement.py` |
| demo coin prints `parts 5473.667 vs solid 5473.667 mm3` | computed | M00-T08 | `uv run --project tools/py tools/py/demo_coin.py /tmp/hbf-demo` |
| gold passes `--roundtrip` | n/a | M00-T09 | `uv run --project tools/py tools/py/validate_3mf.py --roundtrip tools/corpus/3mf/gold/hackbuild-coin-nfc.3mf` |
| known-bad fixtures fail with the named check (CASK original CHK-3MF-06 and CHK-3MF-07, missing part CHK-3MF-06, TENON export completeness, numeric overhang CHK-3MF-07) | n/a | M00-T09, M00-T10 | `uv run --project tools/py tools/corpus/3mf/run.py` |
| 21 of 21 BOSS 3MFs pass `--legacy --overlap` | n/a | M00-T10 | same |
| 25 owner 3MFs parse; 24 on the 0.4 preset, hsl.3mf on 0.25 | counted 2026-10-04 | M00-T10 | same |
| COLLAR per-part volumes within 1e-3 mm3 of legacy; key set equals 127 gold keys | computed | M00-T11 | `npx vitest run tools/parity/collar.test.ts` |
| SPRUE geometry parity; SPRUE writes 21 per-filament keys | computed; counted | M00-T12 | `npx vitest run tools/parity/sprue.test.ts` |
| hbf CLI: part.build, check.run, export.run with TTY gate; CommandResult; exit codes 0, 1, 2, 3 exercised | n/a | M00-T13 | `npm test -w core` |
| x64, arm64 and macos-14 meshHash equal for every M00 reference and route fixture | computed | M00-T14 | CI `determinism-compare` |
| `npm test -w packages/3mf` exits 0 | n/a | M00-T07, M00-T09 | `npm test -w packages/3mf` |
| chase source reader refuses each CHASE_SOURCE_RULES case | n/a | M00-T16 | `npm test -w packages/chase -- source` |
| build.ts sandbox stops fetch, fs write, child_process, ../outside.ts, a loop and NaN with their reasons | n/a | M00-T16 | `npm test -w core -- sandbox` |
| 3MF and zip readers refuse traversal, over 4096 entries and inflation past 256 MB; fuzz job green | n/a | M00-T16 | `npx vitest run packages/3mf/test/reader.fuzz.prop.test.ts` |
| hackbuild-3mf split ready; 0.1.0 on npm and PyPI after D-037. 2026-10-05: publish pending D-037; the working tree at `hackbuild-3mf` (local, no remote, staged, no commit) holds js/, py/, corpus/ and both workflows, built by `tools/import-from-fab.sh` from a rehearsal split, since hackbuild-fab has no commit to split yet. Until D-037 clears this row passes on the pending branch of the card's Done when: in the hackbuild-3mf tree, `sh tools/import-from-fab.sh --check <fab checkout>` exits 0 (2026-10-06, verifier round 3 fix: exit 0 against the script's own rehearsal of the fab working tree, split commit f751f4f). `npm view hackbuild-3mf version` printing 0.1.0 is the post-publish check; before the owner publishes it exits 1 with E404, which a verifier records as not run (gated on D-037), never as a fail | n/a | M00-T15 | `sh tools/import-from-fab.sh --check <fab checkout>` before D-037; `npm view hackbuild-3mf version` after |

M00 is green when every row passes on CI with the house-rules, derived,
tiers, typecheck, seed, unit, property, contract, parity, corpus and
determinism jobs (MILESTONES.md 3.3), the D-040 pins are re-dated in
PLAN.md section 16 and ../PACKAGES.md, and the PR body lists the working
names (hbf, CHASE) and the owner questions below.

| job | added by |
|---|---|
| house-rules, typecheck, derived, tiers, seed | M-1-T05 |
| unit | M00-T01 step 8 |
| property | M00-T06 step 5 |
| corpus | M00-T10 |
| parity | M00-T11 step 10 |
| contract | M00-T13 step 14 (registry row joins at M04) |
| determinism, determinism-compare | M00-T14 |

## Open items

| item | state | default in force |
|---|---|---|
| D-037 npm org and names | owner | nothing publishes until the owner creates the npm org; names checked in M00-T15 |
| D-038 package manager | owner | npm workspaces with a committed package-lock.json |
| D-083 tier ladder | owner | five tiers: verified, measured, vendor, community, inferred |
| D-005 commit subjects | owner | imperative, lowercase, under 60 characters, optional package scope |
| export completeness check id | closed: ../CHECKS.md assigns CHK-ART-01 (artifact family, block; plan-deltas R50 and R54) | the js and py validators report CHK-ART-01 and carry `export-completeness` as an alias in extra; the TENON known-bad row fails with it |
| COLLAR outline offsets target | the scaffold README line names the target without a sample set | M00-T03 step 7: seven distance-defined shapes, three offsets, residual at the output vertices |
| meshHash triangle order | D-051 said "sorted index triples"; sorting inside a triple drops winding | closed by D-175: rotate each triple to its smallest index, keeping winding, then sort the list, over int32 1/1024 grid coordinates |
| prusa target | D-159 lists bbs, prusa, core; the knowledge base names `mmu_segmentation` and nothing more | `--target prusa` exits 2 in M00; the writer waits for a primary source on the PrusaSlicer encoding |
| COTTER 3MF exports | resolved 2026-10-04 from owner Downloads | 31 files at `fab-knowledge:evidence/x/downloads/dl-pip-latest/cotter/unzipped/`, corpus `legacy/cotter/` (M00-T10 step 7) |
| CASK empty-plate original | resolved 2026-10-04 from owner Downloads | `fab-knowledge:evidence/x/downloads/dl-cases/cask/cask_cap_hackbuild.3mf`, copied unchanged as `known-bad/cask-empty-plate.3mf` (M00-T10 step 3) |
| TPU preset row | no slicer save with `Generic TPU @FF C5P` | a TPU slot takes the PETG non-computed column with BuildWarning `TPU preset row inferred` (M00-T07 step 2) until the owner saves the M-S flex-pair in Flash Studio |
