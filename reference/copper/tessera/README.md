# TESSERA rev A on packages/copper

A board of the KEYWAY family (`knowledge/designs/tessera.md`) built on the
vinyl copper kernel (M05-T15, D-092, D-063): twelve irregular tile keys, Voronoi cells of a jittered seed grid whose column boundaries are snapped to straight routing channels, three small sliders in a band under the keypad and 18 contacts in one row.

covers: [CHK-NET-01, CHK-NET-02, CHK-NET-08, CHK-NET-09, CHK-NET-14, CHK-NET-15, CHK-NET-20, CHK-NET-21, CHK-NET-22, CHK-NET-24, CHK-NET-40, CHK-NET-41, CHK-NET-42, CHK-NET-43]

| file | what |
|---|---|
| `chase.surface.ts` | the P dict of `legacy/gen_tessera.py` as chase params, one field per value; a surface chase (D-126) |
| `build.ts` | a line for line port of `legacy/gen_tessera.py` returning declarations: nets as shapes, the fan, the rail, the faceplate, the six layers and the 85 gates as a program; it imports `@hackbuild/spec` and types only, and `pyrandom.ts` beside it |
| `pyrandom.ts` | Python's random.Random for an int seed, as far as the tiles draw from it (see Seeds) |
| `test/parity.test.ts` | holds the port to the legacy generator and to `expected/` through `reference/copper/_harness/family.ts` |
| `expected/gates.json`, `stats.json`, `layers.json`, `stack.json` | the port's own goldens; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/tessera` after reading the diff |
| `legacy/` | the canonical generator and its oracle files (M05-T13) |

The kernel evaluates the draft (`packages/copper/src/vinyl/draft.ts`) and
places the fan: version 2 of the lane ranker (constraint ranking, gen_tessera.py lines 182 to 225); 4 of 9 lanes used. The gates run from
`packages/checks/src/copper` by the board's program (`runVinyl`); the six
layer documents are written only when every gate passes (`exportVinyl`).
Fonts and the owner's mark come from `reference/copper/_inputs/`.

## Seeds

M05-T15 step 2 offers two routes; this board takes the first. The seed
points come from the declared seed 11 through `pyrandom.ts`, a port of
Python's `random.Random` for an int seed (MT19937 seeded by
init_by_array, `random()` from two draws, `uniform(a, b)`), drawn in the
generator's order (lines 110 to 120). The test holds every seed equal, to
the last digit, to the seeds `legacy/tessera_geometry.json` records, so
no seed point is read from the oracle as fixture data. The tiles are
numbered top down per column (row 0 is the bottom course); the comment on
line 135 says bottom up (knowledge/designs/tessera.md 5.1).

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
| single island per net (18), every tile one piece | CHK-NET-01 |
| least clearance with the pair named | CHK-NET-02 |
| copper inside the outline keepout | CHK-NET-08 |
| erode survival (18) | CHK-NET-14 |
| smallest tile over 400 mm2, 12 tiles | CHK-NET-40 |
| channels clear of every tile (5), the arc inside the band, the band clear of every tile | CHK-NET-42 |
| channel sub-lanes on trace plus clearance (4), rail order, lanes needed | CHK-NET-22 |
| straight and arc ratios monotone and off both rails (3 x 2) | CHK-NET-15 |
| arc sweep, straight travel | CHK-NET-41 |
| exactly 18 channels | CHK-NET-43 |
| one row: pitch, finger gap, depth alternates | CHK-NET-21 |
| vinyl covers live copper | CHK-NET-20 |
| vinyl clears the fingers, overhangs each tile (12), the arc and the straight sliders, accents clear the edge | CHK-NET-24 |
| faceplate one piece, inside the keepout | CHK-NET-09 |

CHK-NET-40 to -45 are the six gate families that ran under candidate
names until M05-T17 entered them (CHECKS.md section 9). Shared
thresholds are profile constants (`vinyl.*` in
`packages/profile/data/constants.json`, inferred, each citing its
generator line); thresholds that differ by board are the generator's
literals in `build.ts` with their line.

## Legacy sim

The generator ships `tessera_sim.html`: the shipped viewer throws on `S.span` and never builds its tabs (knowledge/designs/tessera.md section 7, measured 2026-10-05, jsdom 2026-10-04); not ported here, viewers arrive at M09 and M10 from the gate data.

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T15): `npx vitest run reference/copper/tessera` passes:
  85 gates pass, line for line equal to `legacy/run-2026-10-04.txt`
  except the clearance pair; `min clearance 1.100 mm at T1/T2 (gate 0.90)` (computed); params equal
  `legacy/tessera_geometry.json`; copper 21922.1959 mm2 against 21922.2
  (computed); tiles 765.45 to 1734.29 mm2; arc sweep 37.1 mm; straight sliders 39 mm; vinyl faceplate 36179.01 mm2 (all computed); every net within 0.2 percent of
  the shipped net's area and 0.5 percent symmetric difference.
- The least clearance is a tie: T1/T2, T2/T3, T4/T5, T5/T6, T7/T8, T8/T9, T10/T11 and T11/T12 all sit at 1.100 mm (two seams of 0.55); the port names T1/T2 as the generator does and lists the tie (copper TIE_MM; the test checks the generator's pair is in the tie, M05-T14 card defects).

- A clearance gate 0.1 mm above the least clearance refuses the board
  (computed).
- 2026-10-09: `npx --no-install hbf parity reference/copper/tessera` exits
  0: 85 pass, 0 fail; gates.json, layers.json and stack.json equal
  (computed, the board built in the sandbox at the chase defaults).

### Measured on a printed body

- none: no TESSERA board has been cut from these files.

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
