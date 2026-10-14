# hackbuild-fab

Design and verification for things you fabricate: multi-material FDM
prints, including circuits printed in conductive filament, laser-cut
sheet, vinyl-cut copper and PCBs. A design is a TypeScript declaration;
the tool builds it, runs checks that report a measured value against a
legal range, and refuses to export a part that fails one.

Works from a file. No account. Your exports are yours.

## Status

Work in progress, no release. Milestones M-1 to M09 are built and none is
complete, and no part this code exported has been printed. The `hbf`
command line runs locally, and `hbf mcp` serves its commands over MCP on
stdio (`docs/how-to/connect-an-mcp-host.md`). The HTTP server comes at
M12 and is not built. Browser benches bake to single files. The flex-pair bench
builds, checks and exports 3mf, stl and card in the page from file://,
and its 3mf bytes equal the `hbf` writer's for the same values (D-264).
flex-pair declares 3mf, stl, card and json; its coupon export waits on a
coupon reference (D-271). The milestone table is
`docs/plan/MILESTONES.md`.

CI first ran as run 38499440880 on 08fc356, 2026-10-14 02:08 UTC. 10 jobs
failed and 2 were skipped (measured): unit, exit-a, parity, cold,
corpus, exit-m06-m08, browser and determinism on x64, arm64 and macos.
Known red: the D-251 rows for `reference/electrical/pip-buried-route` in
unit, exit-a, parity and cold; the M06 AILERON row in exit-m06-m08; the
M09 flex-pair coupon export in browser. New red: no uv in the unit,
parity and cold jobs; no SOURCE_DATE_EPOCH in unit; the corpus input
`flex-pair-two.json` buildHash moved; the determinism corpus input drops
adjacency; the SLUG trials end differently on x64 linux than on arm64
macOS. Fixes for the uv, epoch and corpus input rows are committed after
08fc356 and have not run on a hosted runner.

On 2026-10-14 the board writers snap geometry to the 1 nm grid, so
spindle-r1 and shunt-art write the same bytes on macOS and Linux (a CI
branch run passed their parity on ubuntu-24.04, computed); the
flex-pair coupon row and the `flex-pair-two.json` corpus input are fixed
locally and have not run on a hosted runner. Still red locally:
pip-buried-route (D-251), and the project graph fixture
`packages/project/test/fixtures/graph.jsonl`, stale for shunt-art,
spindle-r1, coin-inlay and flex-pair and missing midi-pad until D-251 is
ruled. The CI parity job also reads an owner path in a vitest test, and
the SPINDLE 5V to GND short stays (D-249).

## What you can do today

- Rebuild a reference design and compare it with its committed goldens:
  `npx --no-install hbf parity reference/keys/flex-pair`.
- Run the checks on a reference and read each finding as measured, legal,
  constraint and fix: `npx --no-install hbf check.run reference/keys/flex-pair`.
- Look up a check: `docs/reference/checks/INDEX.md`, or
  `npx --no-install hbf explain CHK-PRT-03`.
- Export a slicer-ready 3MF at a terminal. The export gate asks a person
  at a TTY and has no bypass flag.

## Install

Needs Node 22.18.0 (`.nvmrc`), git, and uv for the Python tools.

    gh repo clone hackbuild/hackbuild-fab
    cd hackbuild-fab
    npm ci
    npx tsc -b
    npx --no-install hbf doctor

`npm ci` sets `core.hooksPath` to `.githooks`. `hbf doctor` reports
`board blocked` until the owner picks a Node version for the tscircuit set
(D-039); everything else in it should read `ok`. `npm run check` runs every
gate and the full test suite, which takes minutes; run one workspace with
`npm test -w packages/<name>`.

## Where things are

| path | what |
|---|---|
| `spec/` | typed contracts every package builds on |
| `packages/` | the kernels: geometry, mesh, 3MF, checks, circuits, copper, boards, nesting, motion, sim, UI |
| `core/` | the `hbf` command line |
| `designs/` | ported designs with their original files under `legacy/` |
| `reference/` | reference designs with committed goldens and a verified block each |
| `knowledge/` | constants, invariants and diagnostics the checks come from |
| `docs/` | check reference pages, evaluations, and the plan in `docs/plan/` |

Paths that start `fab-knowledge:` or `fab-work-directory:`, and paths
under `originals/`, name the owner's evidence archive, which is not
published.

## What is verified, and what is not

### Verified on this machine

- 2026-10-13: `npm ci`, `npx tsc -b`, `npx --no-install hbf doctor` and
  `npx --no-install hbf explain CHK-PRT-03` on a copy of the staged tree
  in a new folder (measured: npm ci 22 s, tsc 23 s; doctor all `ok` but
  `board blocked`). The copy was made with `git checkout-index`, not a
  clone from GitHub.
- 2026-10-13: `npx --no-install hbf parity reference/keys/flex-pair` on
  that copy, five of five goldens equal.
- 2026-10-13: the flex-pair bake opened from file:// with its own page
  build: `tools/smoke/page-build.spec.ts` passes, and the default and
  preset two 3mf bytes equal the `hbf` writer's (cmp). The bench smoke
  "edits, exports and round trip on flex-pair" fails on the coupon export.

### Measured on a printed body

- none

### Checked by machine on geometry

- see each reference README under `reference/`
- known red, recorded under D-251: `reference/electrical/pip-buried-route`
  fails `hbf parity` (build, report and query-solve moved), the
  determinism-queries test (query-solve hash), and the core tests
  message-numbers and project-graph. CI run 38499440880 parity fails on it.

### Not verified by anything

- A green CI run. Run 38499440880 is the only one, red as listed under
  Status.
- `npm ci` from a clone of the published repository.
- Any print of an export from this code.

## Licence

Code and spec are MIT (`LICENSE`). Emitter templates are MIT-0.
Printable designs are CC BY-SA 4.0 and boards CERN-OHL-W-2.0: each design
or reference folder, its `legacy/` archive included, takes the licence its
`chase.ts` declares. The failure corpus under `knowledge/` and community
coupons are CC BY 4.0, coupons credited by contributor. `docs/`, this
README and package READMEs are CC BY 4.0, and code samples inside them are
also MIT. Texts are under `LICENSES/`; `tools/licences.json` maps every
path (D-041, D-185, D-042, D-170). The hack.build name and logo are outside
every grant (`TRADEMARKS.md`). Author Moheeb
Zara, hack.build.
