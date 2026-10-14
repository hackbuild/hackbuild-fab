# QUADRANT rev A on packages/copper

A board of the KEYWAY family (`knowledge/designs/quadrant.md`) built on the
vinyl copper kernel (M05-T15, D-092, D-063): six annular sector buttons around a hub, three concentric arc sliders and all 12 contacts in one row of alternating depth fingers.

covers: [CHK-NET-01, CHK-NET-02, CHK-NET-08, CHK-NET-09, CHK-NET-14, CHK-NET-15, CHK-NET-20, CHK-NET-21, CHK-NET-22, CHK-NET-24, CHK-NET-40, CHK-NET-41, CHK-NET-43]

| file | what |
|---|---|
| `chase.surface.ts` | the P dict of `legacy/gen_quadrant.py` as chase params, one field per value; a surface chase (D-126) |
| `build.ts` | a line for line port of `legacy/gen_quadrant.py` returning declarations: nets as shapes, the fan, the rail, the faceplate, the six layers and the 59 gates as a program; it imports `@hackbuild/spec` and types only |
| `test/parity.test.ts` | holds the port to the legacy generator and to `expected/` through `reference/copper/_harness/family.ts` |
| `expected/gates.json`, `stats.json`, `layers.json`, `stack.json` | the port's own goldens; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/quadrant` after reading the diff |
| `legacy/` | the canonical generator and its oracle files (M05-T13) |

The kernel evaluates the draft (`packages/copper/src/vinyl/draft.ts`) and
places the fan: version 1 of the lane ranker (greedy with two conditions, gen_quadrant.py lines 137 to 163) places the fan; 2 of 6 lanes used. The gates run from
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
| single island per net (12) | CHK-NET-01 |
| least clearance with the pair named | CHK-NET-02 |
| copper inside the outline keepout | CHK-NET-08 |
| erode survival (12) | CHK-NET-14 |
| sector plates solid (6), wedges carry plate area (3) | CHK-NET-40 |
| arc ratio monotone and off both rails (3 x 2) | CHK-NET-15 |
| inner arc sweep | CHK-NET-41 |
| exactly 12 channels | CHK-NET-43 |
| one row: pitch, finger gap, depth step, depth alternates | CHK-NET-21 |
| rail order follows arrival order | CHK-NET-22 |
| vinyl covers live copper | CHK-NET-20 |
| vinyl clears the fingers, overhangs each sector (6), accents clear the edge | CHK-NET-24 |
| faceplate one piece, inside the keepout | CHK-NET-09 |

CHK-NET-40 to -45 are the six gate families that ran under candidate
names until M05-T17 entered them (CHECKS.md section 9). Shared
thresholds are profile constants (`vinyl.*` in
`packages/profile/data/constants.json`, inferred, each citing its
generator line); thresholds that differ by board are the generator's
literals in `build.ts` with their line.

## Legacy sim

The generator ships `quadrant_sim.html`: the shipped viewer builds its tabs; it reads every arc against S1's span (knowledge/designs/quadrant.md section 7); not ported here.

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T15): `npx vitest run reference/copper/quadrant` passes:
  59 gates pass, line for line equal to `legacy/run-2026-10-04.txt`
  except the clearance pair; `min clearance 1.203 mm at B1/B2 (gate 0.90)` (computed); params equal
  `legacy/quadrant_geometry.json`; copper 9459.4034 mm2 against 9459.4
  (computed); arc spans 0.180 to 0.779 (S1) over a 131.9 mm inner sweep; vinyl faceplate 20796.51 mm2 (all computed); every net within 0.2 percent of
  the shipped net's area and 0.5 percent symmetric difference.
- The least clearance is a tie: B1/B2, B2/B3, B3/B4, B4/B5 and B5/B6 all sit at 1.203 mm, the sector gaps being one angle at one radius; shapely names B3/B4 by rounding, the port names B1/B2 and lists the tie (copper TIE_MM; the test checks the generator's pair is in the tie, M05-T14 card defects).

- A clearance gate 0.1 mm above the least clearance refuses the board
  (computed).
- 2026-10-09: `npx --no-install hbf parity reference/copper/quadrant` exits
  0: 59 pass, 0 fail; gates.json, layers.json and stack.json equal
  (computed, the board built in the sandbox at the chase defaults).

### Measured on a printed body

- none: no QUADRANT board has been cut from these files.

### Checked by machine on geometry

- 2026-10-08: the 59 gates above on every run of `test/parity.test.ts`,
  and the layer documents' sha256 in `expected/layers.json`.

### Not verified by anything

- The emitted SVG path strings against the shipped layer files: not
  compared; the shipped strings come from another GEOS build (M05-T13).
- The vinyl, the printed faceplate and the accents have no profile row
  with a thickness, so the stack declaration names the backer and the
  copper only (M05-T15 card defects).
- A person has not looked at the six documents.
