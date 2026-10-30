# hackbuild-fab

Design and verification for things you fabricate: multi-material FDM
prints, including circuits printed in conductive filament, laser-cut
sheet, vinyl-cut copper and PCBs. You write a design as a short
TypeScript declaration, a chase: the parameters, the features and the
claims. The tool builds the part, runs checks that each report a measured
value against a legal range and the constraint that set it, and refuses
to export a part that fails one.

Each design also bakes to a bench: one HTML file that opens from
`file://` with no server, shows the part in 3D, lets you move its
parameters and runs the same checks in the page. Every number comes from
a printer and material profile that says where it came from, and nothing
leaves your machine. Works from a file. No account. Your exports are
yours.

## Status

Work in progress, no release. Owner proof is open: no part this code
exported has been printed, and profile values stay inferred until a
person enters coupon results. The latest CI run is run 41016217627 on
ecd38a8 (2026-10-30): 17 of 19 jobs passed; browser failed on one gold
row, access-switch G-15, which waits on an owner decision (measured).

The flex-pair bench builds, checks and exports 3mf, stl and card in the
page from file:// (D-264). The bench pieces are becoming libraries
(`@hackbuild/spec`, `viewer`, `bench-core`, `bench`) built as npm ESM,
CDN ESM and an IIFE; a CDN page and a Vue app mount TOGGLE from the
staged packages, and the bakes open from file:// in Chromium, Firefox
and WebKit. Nothing is published (D-037). CI history and the verified
block: [docs/explanation/ci-history.md](docs/explanation/ci-history.md);
changes per milestone: [CHANGELOG.md](CHANGELOG.md).

## Install

You need Node 22.18.0 (`.nvmrc`), git, and uv for the Python tools.

    gh repo clone hackbuild/hackbuild-fab
    cd hackbuild-fab
    npm ci
    npx tsc -b
    npx --no-install hbf doctor

`npm ci` sets `core.hooksPath` to `.githooks`. `hbf doctor` reports
`board blocked` until the owner picks a Node version for the tscircuit set
(D-039); every other row should read `ok`.

## Make your first part

[docs/how-to/quick-start.md](docs/how-to/quick-start.md) walks the whole
path on the collar coin: build, check, open the bench, slice virtually,
and stop at the export gate. In short:

    npx --no-install hbf capabilities
    npx --no-install hbf check.run designs/collar
    npx --no-install hbf init stick --from collar --dir ../stick

`hbf capabilities` lists what the tool can do today and which commands,
references and designs serve each job. `hbf init` copies a design into a
folder of your own with its bench page, `stick.html`; open it in a
browser. `hbf init stick --from toggle` does not work yet: the toggle
design has no chase, only its original files, and `hbf init` refuses it
with `E_REF`. `hbf part.build` and `hbf check.run` read designs inside
this repository only; a folder made by `hbf init` is edited through its
bench page for now.

## The export gate

A fabrication export (`hbf export.run`) builds the part, runs every check
and then asks a person at a terminal to approve. The gate needs a TTY and
has no bypass flag, and no tool argument opens it. An agent may build,
check and slice a part; only you export it. [SECURITY.md](SECURITY.md)
says how the gate is held and how to report a fault in it.

## Use policy

[USE.md](USE.md) states what the project will not help make (weapon
parts, parts made to injure, marks you do not own), how safety-critical
parts export, and what every export records about who proposed it.

## Where things are

| path | what |
|---|---|
| `spec/` | typed contracts every package builds on |
| `packages/` | the kernels: geometry, mesh, 3MF, checks, circuits, copper, boards, nesting, motion, sim, UI |
| `core/` | the `hbf` command line and `hbf mcp` |
| `designs/` | ported designs, each with a chase, a build and a record of its originals |
| `reference/` | reference designs with committed goldens and a verified block each |
| `knowledge/` | constants, invariants and diagnostics the checks come from |
| `docs/how-to/` | task guides: [quick start](docs/how-to/quick-start.md), [connect an MCP host](docs/how-to/connect-an-mcp-host.md) |
| `docs/reference/checks/` | one page per check; `hbf explain <check id>` prints the same |
| `docs/plan/` | the plan and its decisions |

Paths that start `fab-knowledge:` or `fab-work-directory:`, and paths
under `originals/`, name the owner's evidence archive, which is not
published.

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
