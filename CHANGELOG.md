# Changelog

All notable changes to hackbuild-fab are recorded here, in the form of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There is no
release yet and no version number, so each entry below Unreleased is one
milestone of `docs/plan/MILESTONES.md`, dated by the commit that first
carried it. None of these milestones is complete, and no part this code
exported has been printed. The milestone table and the Status section of
`README.md` say what each one still lacks.

## [Unreleased]

Release 1 work after the M10 landing.

### Added

- access switch reference: chase, build, spring coupon, pj398sm jack seat,
  print card generated from the build, bench with `drive.press` and
  `plot.curve`, and a recorded virtual slice (computed, never printed).
- Imported meshes: shell groups, piece count, worst pairwise overlap, and
  the piece count and floating piece checks.
- Function claims with toleranced bands, the claim function registry and
  CHK-CLAIM-01.
- `hbf draft`, `hbf adopt`, `hbf init`, `hbf evidence add` and `list`,
  `hbf capabilities`, `chase.render` and `chase.bake`.
- Loft, sweep and hull routes, junction fillets, revolve profile corners
  and top and bottom edge profiles in the mesh stage runner.
- The orca-family slicer driver for virtual slices.
- Catalog rows fetched from the KiCad library and the Seeed OPL.
- Agent hooks: quiet-output, touched-typecheck and stop-acceptance.
- The hbf Claude Code plugin package.
- `USE.md` and `SECURITY.md`.

### Changed

- Registries, `lineage.json`, the check seed, `docs/plan/DECISIONS.md` and
  the command name lists are generated from one fragment file each.
- Command specs moved out of core into the commands package.
- The 3MF writer is the vendored hackbuild-3mf build, re-exported by
  `packages/3mf`.

## [M10] chase, 2026-10-20

Commit: 78fcd4b

### Added

- M10-T01 to T03: designs as chase data plus `build.ts`, with the legacy
  copies held out of the public tree.
- `chase.validate` with typed questions, `chase.patch`, `chase.diff` with
  migrations and verdict changes, and `chase.scaffold`.
- The widget registry and ChaseBench, which binds a chase to a bench.

## [M09] ui, 2026-10-13

Commit: 983e195

### Added

- The bench shell, the bake to single files that open from `file://`, and
  the smoke suites.
- The flex-pair bench builds, checks and exports 3mf, stl and card in the
  page.

## [M08] board and catalog, 2026-10-13

Commit: b14f7e6

### Added

- The board, catalog and wiring packages.

## [M07] motion and nest, 2026-10-13

Commit: ce2f416

### Added

- The nest package with its DXF writer, and the motion package.

## [M06] canons, 2026-10-13

Commit: 63213c8

### Added

- The mechanism and archetype canons.

## [M05] circuit and copper, 2026-10-13

Commit: 41064c6

### Added

- The circuit solver and the copper router for vinyl copper.

## [M04] checks and project, 2026-10-13

Commit: a037417

### Added

- Check definitions with origins, and the project graph with its build
  hash.

## [M03] inlay, 2026-10-13

Commit: 7f9e5cb

### Added

- The inlay package and the art board.

## [M02] sim, 2026-10-13

Commit: f98f367

### Added

- The sim package and the legacy design sets.

## [M01] constraints, 2026-10-13

Commit: 93af9f0

### Added

- The interval solver and the click models.

## [M00] foundation, 2026-10-13

Commit: 333e40a

### Added

- The foundation kernels: profile, geom, mesh and the 3MF writer, with the
  corpus.
- The `hbf` command line with the error contract.

## [M-S] walking skeleton, 2026-10-13

Commit: 325a585

### Added

- The walking skeleton and the keys flex-pair reference.

## [M-1] housekeeping, 2026-10-13

Commit: 29f24b8

### Added

- The rules, the plan set and the workspace skeleton.
