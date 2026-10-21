# Quick start

This guide takes the collar coin from the repository to the export gate:
install, build, check, start your own copy with its bench page, slice it
virtually, and stop where a person takes over. Run every command from the
repository root. Each step shows what it printed on 2026-10-21 in a fresh
local clone (macOS, Node 22.18.0); your build hash and times can differ.

## 1. Install

You need Node 22.18.0 (`.nvmrc`), git, and uv for the Python tools.

    gh repo clone hackbuild/hackbuild-fab
    cd hackbuild-fab
    npm ci
    npx tsc -b
    npx --no-install hbf doctor

`npm ci` took 63 s and `npx tsc -b` 131 s (measured, one run).
`hbf doctor` prints one row per dependency. Every row reads `ok` except
`board blocked`, which waits on the owner's Node choice for the tscircuit
set (D-039) and does not touch the coin.

## 2. See what the tool can do

    npx --no-install hbf capabilities --function face

It prints the commands, references and designs that serve one job:

    face      make a coin, tag or face  commands 0, archetypes 0, references 1, designs 2, knowledge 2, slicers 0
      designs   designs/collar, designs/sprue

Run `npx --no-install hbf capabilities` with no flag for every job.

## 3. Build and check the coin

    npx --no-install hbf part.build designs/collar
    npx --no-install hbf check.run designs/collar

Both build the coin from its chase and print every finding as measured,
legal, constraint and origin. The collar defaults print one warning:

    WARN check.run designs/collar build ee61df..b3   0 fail  1 warn  13 pass  44 skip
    WARN CHK-PRT-05 coin
      measured 0.40 mm
      legal    a multiple of 0.24 mm, nearest 0.25 or 0.49
      because  layer 0.24 mm over a first layer of 0.25 mm, preset ffc5p_20260819; a face between layer tops prints at the nearer one
      origin   hbf://check/CHK-PRT-05

A warning does not block an export; a fail does. To read what a check
measures and where its rule came from:

    npx --no-install hbf explain CHK-PRT-05

## 4. Start your own copy and open its bench

    npx --no-install hbf init stick --from collar --dir ../stick

It writes `chase.ts`, `build.ts`, `bench.ts`, a `package.json` that pins
the kernel to this checkout, and `stick.html`, the bench (4.8 MB,
measured). Open `../stick/stick.html` in a browser from the file; a
bench is baked to need no server and no network. This guide checked that
the page was written and did not open it in a browser.

`hbf part.build` and `hbf check.run` read designs inside this repository
only, so they refuse `../stick` with `E_REF`. Edit your copy through its
bench page for now, and use `designs/collar` at the terminal.

`--from toggle` does not work yet: the toggle design holds only its
original files and no chase, and `hbf init` refuses it with `E_REF`.

## 5. Slice it virtually

The driver slices with the Orca-family CLI installed on your machine
(Flash Studio by default; `--slicer` picks OrcaSlicer, Bambu Studio or
Snapmaker Orca). It runs every check first, gives the slicer a new empty
profile folder, and never reads your own slicer profile. It writes only
under the temp folder.

    node tools/slice/slice.mjs --design designs/collar "$(node -p 'require("os").tmpdir()')/hbf-slice/collar"

It printed:

    sliced: exit 0, 7923 ms wall (measured), Flash Studio CLI 2.3.2
    SLC-BED pass (computed): bed Textured PEI Plate allowed (support_multi_bed_types 1); every slot has textured_plate_temp and textured_plate_temp_initial_layer over 0
    SLC-SLOTS pass (computed): 3 of 3 material slots resolved by flatten, no substitution
    SLC-FOREIGN not run (computed): no analysis json; run tools/py/gcode/analyze.py and pass its slice.json with --analysis

The G-code is a virtual print. Its times and weights are computed, never
measured, and it is never sent to a printer. Without the slicer at its
default path the driver prints `not run: no <slicer> executable at
<path>` and exits 3; pass `--app <path>` or skip this step.

## 6. Stop at the export gate

The export is yours to run:

    npx --no-install hbf export.run designs/collar --kind 3mf

It builds the coin, runs every check, then asks you at the terminal to
approve. It needs a TTY, has no bypass flag, and no tool argument opens
it. An agent working in this repository may build, check and slice; it
never exports. This guide was checked up to this step; the export itself
was not run for it. [USE.md](../../USE.md) says what an export records
and how safety-critical parts export.

## 7. After you print

Print it, then add the slicer save and a caliper reading with
`hbf evidence add`:

    npx --no-install hbf evidence add designs/collar --claim <claim id> --file <your slicer save>.3mf
    npx --no-install hbf evidence add designs/collar --claim <claim id> --value <reading> --unit mm

Not yet for the collar: its chase declares no claims, so `hbf evidence
add` refuses with `E_REF` ("declares no claims; add one with chase.patch
first") and writes nothing. `npx --no-install hbf evidence list
designs/collar` prints `0 evidence rows`. Keep your save and readings
until the coin declares a claim.

## Where next

- [Connect an MCP host](connect-an-mcp-host.md) to drive the same
  commands from an agent.
- `docs/reference/checks/INDEX.md` lists every check.
- [SECURITY.md](../../SECURITY.md) covers the export gate and reporting a
  fault.
