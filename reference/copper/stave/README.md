# STAVE rev A on packages/copper

A board of the KEYWAY family (`knowledge/designs/stave.md`) built on the
vinyl copper kernel (M05-T15, D-092, D-063): eight keys cut from one slab by identical chevron seams, two long sliders across the ends and 12 contacts in one row down the left edge, 96 mm wide to cut from one pass of 4 inch copper tape.

covers: [CHK-NET-01, CHK-NET-02, CHK-NET-08, CHK-NET-09, CHK-NET-14, CHK-NET-15, CHK-NET-20, CHK-NET-21, CHK-NET-22, CHK-NET-24, CHK-NET-40, CHK-NET-41, CHK-NET-42, CHK-NET-43, CHK-NET-45]

| file | what |
|---|---|
| `chase.surface.ts` | the P dict of `legacy/gen_stave.py` as chase params, one field per value; a surface chase (D-126) |
| `build.ts` | a line for line port of `legacy/gen_stave.py` returning declarations: nets as shapes, the fan, the rail, the faceplate, the six layers and the 57 gates as a program; it imports `@hackbuild/spec` and types only |
| `test/parity.test.ts` | holds the port to the legacy generator and to `expected/` through `reference/copper/_harness/family.ts` |
| `expected/gates.json`, `stats.json`, `layers.json`, `stack.json` | the port's own goldens; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/stave` after reading the diff |
| `legacy/` | the canonical generator and its oracle files (M05-T13) |

The kernel evaluates the draft (`packages/copper/src/vinyl/draft.ts`) and
places the fan: version 2 of the lane ranker on a y rail with vertical lanes (gen_stave.py lines 125 to 154); 5 of 6 lanes used. The gates run from
`packages/checks/src/copper` by the board's program (`runVinyl`); the six
layer documents are written only when every gate passes (`exportVinyl`).
Fonts and the owner's mark come from `reference/copper/_inputs/`.

## Why chase.surface.ts and not chase.ts

As for KEYWAY (`reference/copper/keyway/README.md`): part.build and every
enumerator of `reference/<area>/<id>/chase.ts` treat a chase.ts as a
part.build reference. `hbf parity` takes this directory down core's
surface build path (core/src/commands/surface.ts) and compares
expected/gates.json, layers.json and stack.json (M05-T14 and M05-T15 card
defects).

## Gates and their checks

| gates | check |
|---|---|
| the board fits the 101.6 mm tape | CHK-NET-45 |
| single island per net (12) | CHK-NET-01 |
| least clearance with the pair named, chevron seams between keys | CHK-NET-02 |
| copper inside the outline keepout | CHK-NET-08 |
| erode survival (12) | CHK-NET-14 |
| key plate over 600 mm2, one size within 5 mm2, eight keys | CHK-NET-40 |
| slider ratios monotone and off both rails (2 x 2) | CHK-NET-15 |
| slider travel | CHK-NET-41 |
| exactly 12 channels | CHK-NET-43 |
| one row: pitch, finger gap, depth alternates | CHK-NET-21 |
| rail order, lanes needed | CHK-NET-22 |
| the wiring zone ends before the keys | CHK-NET-42 |
| vinyl covers live copper | CHK-NET-20 |
| vinyl clears the fingers, overhangs each key (8) and both sliders, accents clear the edge | CHK-NET-24 |
| faceplate one piece, inside the keepout | CHK-NET-09 |

CHK-NET-40 to -45 are the six gate families that ran under candidate
names until M05-T17 entered them (CHECKS.md section 9). Shared
thresholds are profile constants (`vinyl.*` in
`packages/profile/data/constants.json`, inferred, each citing its
generator line); thresholds that differ by board are the generator's
literals in `build.ts` with their line.

## Legacy sim

The generator ships `stave_sim.html`: the shipped viewer throws on `S.span` and never builds its tabs, and the handoff's legacy copy is the same file (knowledge/designs/stave.md section 7, measured 2026-10-05, jsdom 2026-10-04); not ported here, viewers arrive at M09 and M10 from the gate data.

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T15): `npx vitest run reference/copper/stave` passes:
  57 gates pass, line for line equal to `legacy/run-2026-10-04.txt`
  except the clearance pair; `min clearance 1.200 mm at D1/D2 (gate 0.90)` (computed); params equal
  `legacy/stave_geometry.json`; copper 11578.8916 mm2 against 11578.9
  (computed); key 858.84 mm2, all eight within 0.0 mm2; sliders 50 mm each; the wiring zone ends 22.5 mm before the keys; vinyl faceplate 20057.01 mm2 (all computed); every net within 0.2 percent of
  the shipped net's area and 0.5 percent symmetric difference.
- The least clearance is a tie: D1/D2, D1/L1_A, D7/D8, D8/L2_A, L1_A/L1_B and L2_A/L2_B all sit at 1.200 mm; shapely names D1/L1_A by rounding, the port names D1/D2 and lists the tie (copper TIE_MM; the test checks the generator's pair is in the tie, M05-T14 card defects).

- A clearance gate 0.1 mm above the least clearance refuses the board
  (computed).
- 2026-10-09: `npx --no-install hbf parity reference/copper/stave` exits
  0: 57 pass, 0 fail; gates.json, layers.json and stack.json equal
  (computed, the board built in the sandbox at the chase defaults).

### Measured on a printed body

- none: no STAVE board has been cut from these files.

### Checked by machine on geometry

- 2026-10-08: the 57 gates above on every run of `test/parity.test.ts`,
  and the layer documents' sha256 in `expected/layers.json`.

### Not verified by anything

- The emitted SVG path strings against the shipped layer files: not
  compared; the shipped strings come from another GEOS build (M05-T13).
- The vinyl, the printed faceplate and the accents have no profile row
  with a thickness, so the stack declaration names the backer and the
  copper only (M05-T15 card defects).
- A person has not looked at the six documents.
