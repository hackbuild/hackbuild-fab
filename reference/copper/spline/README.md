# SPLINE rev A on packages/copper

A board of the KEYWAY family (`knowledge/designs/spline.md`) built on the
vinyl copper kernel (M05-T15, D-092, D-063): twelve radial blade keys with stub escapes into the hub void, a small arc slider with a concentric detour, two straight sliders and 18 contacts in one row.

covers: [CHK-NET-01, CHK-NET-02, CHK-NET-08, CHK-NET-09, CHK-NET-14, CHK-NET-15, CHK-NET-20, CHK-NET-21, CHK-NET-22, CHK-NET-24, CHK-NET-40, CHK-NET-41, CHK-NET-43]

| file | what |
|---|---|
| `chase.surface.ts` | the P dict of `legacy/gen_spline.py` as chase params, one field per value; a surface chase (D-126) |
| `build.ts` | a line for line port of `legacy/gen_spline.py` returning declarations: nets as shapes, the fan, the rail, the faceplate, the six layers and the 85 gates as a program; it imports `@hackbuild/spec` and types only |
| `test/parity.test.ts` | holds the port to the legacy generator and to `expected/` through `reference/copper/_harness/family.ts` |
| `expected/gates.json`, `stats.json`, `layers.json`, `stack.json` | the port's own goldens; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/spline` after reading the diff |
| `legacy/` | the canonical generator and its oracle files (M05-T13) |

The kernel evaluates the draft (`packages/copper/src/vinyl/draft.ts`) and
places the fan: version 1 of the lane ranker (gen_spline.py lines 157 to 180); 6 of 8 lanes used. The gates run from
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
| single island per net (18) | CHK-NET-01 |
| least clearance with the pair named | CHK-NET-02 |
| copper inside the outline keepout | CHK-NET-08 |
| erode survival (18) | CHK-NET-14 |
| blade plates solid (12), smallest blade over 120 mm2 | CHK-NET-40 |
| arc and straight ratios monotone and off both rails (3 x 2) | CHK-NET-15 |
| arc sweep, straight travel | CHK-NET-41 |
| exactly 18 channels | CHK-NET-43 |
| one row: pitch, finger gap, depth step, depth alternates | CHK-NET-21 |
| rail order follows arrival order, fan fits its lanes | CHK-NET-22 |
| vinyl covers live copper | CHK-NET-20 |
| vinyl clears the fingers, overhangs each blade (12), the arc and the straight sliders, accents clear the edge | CHK-NET-24 |
| faceplate one piece, inside the keepout | CHK-NET-09 |

CHK-NET-40 to -45 are the six gate families that ran under candidate
names until M05-T17 entered them (CHECKS.md section 9). Shared
thresholds are profile constants (`vinyl.*` in
`packages/profile/data/constants.json`, inferred, each citing its
generator line); thresholds that differ by board are the generator's
literals in `build.ts` with their line.

## Legacy sim

The generator ships `spline_sim.html`: the shipped viewer throws on `S.span` and never builds its tabs (knowledge/designs/spline.md section 7, measured 2026-10-05, jsdom 2026-10-04); not ported here, viewers arrive at M09 and M10 from the gate data.

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T15): `npx vitest run reference/copper/spline` passes:
  85 gates pass, line for line equal to `legacy/run-2026-10-04.txt`
  except the clearance pair; `min clearance 1.000 mm at L1_A/L1_B (gate 0.90)` (computed); params equal
  `legacy/spline_geometry.json`; copper 9123.8239 mm2 against 9123.8
  (computed); smallest blade 193.92 mm2; arc span 0.235 to 0.727 over 68.4 mm; straight span 0.887 to 0.113 over 42 mm; vinyl faceplate 29039.01 mm2 (all computed); every net within 0.2 percent of
  the shipped net's area and 0.5 percent symmetric difference.
- A clearance gate 0.1 mm above the least clearance refuses the board
  (computed).
- 2026-10-09: `npx --no-install hbf parity reference/copper/spline` exits
  0: 85 pass, 0 fail; gates.json, layers.json and stack.json equal
  (computed, the board built in the sandbox at the chase defaults).

### Measured on a printed body

- none: no SPLINE board has been cut from these files.

### Checked by machine on geometry

- 2026-10-08: the 85 gates above on every run of `test/parity.test.ts`,
  and the layer documents' sha256 in `expected/layers.json`.

### Not verified by anything

- The emitted SVG path strings against the shipped layer files: not
  compared; the shipped strings come from another GEOS build (M05-T13).
- The vinyl, the printed faceplate and the accents have no profile row
  with a thickness, so the stack declaration names the backer and the
  copper only (M05-T15 card defects).
- A person has not looked at the six documents.
