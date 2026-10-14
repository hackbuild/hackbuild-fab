# KEYWAY rev A on packages/copper

The first board of the KEYWAY family (`knowledge/designs/keyway.md`) built
on the vinyl copper kernel (M05-T14, D-092, D-063): a 2x2 velocity and
pressure pad and a graded slider with a top copper wiper, cut from adhesive
copper foil with Velostat, two cardstock spacers, EVA caps and a chipboard
backer, plus a print then cut guide, all on one shared outline.

covers: [CHK-NET-01, CHK-NET-02, CHK-NET-08, CHK-NET-14, CHK-NET-15, CHK-NET-18, CHK-NET-19, CHK-NET-21, CHK-NET-31, CHK-NET-32, CHK-NET-33, CHK-NET-34, CHK-NET-35, CHK-NET-36, CHK-NET-37, CHK-NET-38]

| file | what |
|---|---|
| `chase.surface.ts` | the P dict of `legacy/gen_keyway.py` (lines 39 to 62) as chase params, one field per value; a surface chase (D-126) |
| `build.ts` | a line for line port of `legacy/gen_keyway.py` returning declarations: nets as shapes, the art, the audit probes, slider, clip field, zones, wiper, films, spacers and the eight layers; it imports `@hackbuild/spec` and types only |
| `test/parity.test.ts` | holds the port to the legacy generator and to `expected/` |
| `expected/oracle-brand.txt`, `oracle-brand-stats.json` | the legacy generator run with the brand on (`tools/py/copper/run_legacy_gen.py keyway --brand`, `tools/py/copper/dump_keyway_brand.py`) |
| `expected/gates.json`, `stats.json`, `layers.json`, `stack.json`, `edit.json` | the port's own goldens; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/keyway` after reading the diff |
| `legacy/` | the canonical generator and its oracle files (M05-T13) |

The kernel evaluates the draft (`packages/copper/src/vinyl/draft.ts`), the
45 gates run from `packages/checks/src/copper` (`runVinyl`), and the eight
layer documents are written only when every gate passes (`exportVinyl`).
Fonts and the owner's mark come from `reference/copper/_inputs/`, the mark
through the D-166 SVG document sanitiser (D-240).

## Why chase.surface.ts and not chase.ts

part.build, the metric record, the project graph, cold rebuild and the
determinism hashes all enumerate every `reference/<area>/<id>/chase.ts` as
a part.build reference; named chase.ts, this reference would fail all of
them. `hbf parity` takes a directory holding chase.surface.ts down core's
surface build path (core/src/commands/surface.ts): build.ts runs in the
build sandbox, core gates the board with packages/checks, and parity
compares expected/gates.json, layers.json and stack.json and passes only
when every gate passes (M05-T14 card defects).

## Gates and their checks

| gates | check |
|---|---|
| single island per net (8) | CHK-NET-01 |
| named netlist audit, 20 of 20 | CHK-NET-31 |
| least clearance with the pair named | CHK-NET-02 |
| copper inside the outline keepout | CHK-NET-08 |
| erode survival (9) | CHK-NET-14 |
| art island gaps and counters | CHK-NET-32 |
| wedge copper across the travel | CHK-NET-33 |
| slider ratio monotone | CHK-NET-15 |
| clip field staggered | CHK-NET-21 |
| film bridges only its zone, covers both combs (8), sliding film touches SA and SB only | CHK-NET-18 |
| spacer window exposes both combs (4) | CHK-NET-34 |
| film clears the collector, tail lands, slot over the film | CHK-NET-35 |
| wiper stray contact | CHK-NET-19 |
| film inside the keepout | CHK-NET-36 |
| spacers one piece | CHK-NET-37 |
| one document size | CHK-NET-38 |

Thresholds are profile constants (`vinyl.*` in
`packages/profile/data/constants.json`, inferred, each citing its generator
line); the clearance gate and edge keep are the board's params.

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T14): `npx vitest run reference/copper/keyway` passes:
  45 gates pass, line for line equal to `legacy/run-2026-10-04.txt`
  except the clearance pair; params equal `legacy/keyway_geometry.json`;
  copper 6975.5439 mm2 against 6975.5 (computed); slider span 0.811 to
  0.177 over 67.9 mm; every net within 0.2 percent of the shipped net's
  area and 0.5 percent symmetric difference; brand on, 45 gates line for
  line with the legacy brand run, copper 7532.7964 mm2 against 7532.7965,
  brand art 557.25 mm2 in 13 islands, 9.723 mm from SA (all computed).
- The least clearance is a tie: COM/ART, P1/P3, P2/P4, P3/SA, P4/SC and
  SB/SC all sit at 1.000 mm in exact arithmetic. shapely names P3/SA by
  float rounding under 1e-13 mm; Clipper2 hands rings back at float32 and
  rounds them equal, so the port names COM/ART and lists the whole tie in
  the finding; the test checks the generator's pair is in it (computed).
- The edit `clr` 0.70 to 1.10 flips the clearance gate alone, and export
  refuses with that line (computed).
- 2026-10-09: `npx --no-install hbf parity reference/copper/keyway` exits
  0: 45 pass, 0 fail; gates.json, layers.json and stack.json equal
  (computed, the board built in the sandbox at the chase defaults).

### Measured on a printed body

- none: no KEYWAY board has been cut from these files.

### Checked by machine on geometry

- 2026-10-08: the 45 gates above on every run of `test/parity.test.ts`
  (exit 0), and the layer documents' sha256 in `expected/layers.json`.

### Not verified by anything

- The emitted SVG path strings against the shipped layer files: not
  compared; the shipped strings come from another GEOS build (M05-T13).
- The guide sticker's type: drawn from the same glyphs as the generator,
  composite glyphs (double quote, colon, semicolon) blank as the
  generator draws them; not compared with a shipped guide.
- A person has not looked at the eight documents.
