# FRET rev A on packages/copper

A board of the KEYWAY family (`knowledge/designs/fret.md`) built on the
vinyl copper kernel (M05-T15, D-092, D-063): fifteen flat-top hex keys in a Wicki-Hayden lattice (up a column +2, up-right +7, down-right +5) routed down zigzag grout ribbons, two flank sliders, one arc across the top and 21 contacts in one row; the generator's docstring says 16 keys and 22 contacts, its P dict draws 15 and 21.

covers: [CHK-NET-01, CHK-NET-02, CHK-NET-08, CHK-NET-09, CHK-NET-14, CHK-NET-15, CHK-NET-20, CHK-NET-21, CHK-NET-22, CHK-NET-24, CHK-NET-40, CHK-NET-41, CHK-NET-43, CHK-NET-44]

| file | what |
|---|---|
| `chase.surface.ts` | the P dict of `legacy/gen_fret.py` as chase params, one field per value; a surface chase (D-126) |
| `build.ts` | a line for line port of `legacy/gen_fret.py` returning declarations: nets as shapes, the fan, the rail, the faceplate, the six layers and the 95 gates as a program; it imports `@hackbuild/spec` and types only |
| `test/parity.test.ts` | holds the port to the legacy generator and to `expected/` through `reference/copper/_harness/family.ts` |
| `expected/gates.json`, `stats.json`, `layers.json`, `stack.json` | the port's own goldens; rewrite with `HBF_ACCEPT_VINYL=1 npx vitest run reference/copper/fret` after reading the diff |
| `legacy/` | the canonical generator and its oracle files (M05-T13) |

The kernel evaluates the draft (`packages/copper/src/vinyl/draft.ts`) and
places the fan: version 2 of the lane ranker (gen_fret.py lines 224 to 250); 3 of 12 lanes used. The gates run from
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
| single island per net (21) | CHK-NET-01 |
| least clearance with the pair named, sliders clear of the honeycomb | CHK-NET-02 |
| copper inside the outline keepout, sliders inside it | CHK-NET-08 |
| erode survival (21) | CHK-NET-14 |
| hex key plate over 450 mm2, 15 keys | CHK-NET-40 |
| interval sets, no duplicate notes, range, diatonic degrees (6) | CHK-NET-44 |
| grout ribbon sub-lanes (5), ribbon trace budget, rail order, lanes needed | CHK-NET-22 |
| flank and arc ratios monotone and off both rails (3 x 2) | CHK-NET-15 |
| arc sweep, flank travel | CHK-NET-41 |
| exactly 21 channels | CHK-NET-43 |
| one row: pitch, finger gap, depth alternates | CHK-NET-21 |
| vinyl covers live copper | CHK-NET-20 |
| vinyl clears the fingers, overhangs each key (15) and the arc, accents clear the edge | CHK-NET-24 |
| faceplate one piece, inside the keepout | CHK-NET-09 |

CHK-NET-40 to -45 are the six gate families that ran under candidate
names until M05-T17 entered them (CHECKS.md section 9). Shared
thresholds are profile constants (`vinyl.*` in
`packages/profile/data/constants.json`, inferred, each citing its
generator line); thresholds that differ by board are the generator's
literals in `build.ts` with their line.

## Legacy sim

The generator ships `fret_sim.html`: the shipped viewer throws on `S.span` and never builds its tabs (knowledge/designs/fret.md section 7, measured 2026-10-05, jsdom 2026-10-04); not ported here, viewers arrive at M09 and M10 from the gate data.

## What is verified, and what is not

### Verified on this machine

- 2026-10-08 (M05-T15): `npx vitest run reference/copper/fret` passes:
  95 gates pass, line for line equal to `legacy/run-2026-10-04.txt`
  except the clearance pair; `min clearance 1.000 mm at K10/K15 (gate 0.90)` (computed); params equal
  `legacy/fret_geometry.json`; copper 20171.5139 mm2 against 20171.5
  (computed); key 584.57 mm2; notes C3 to E5, 28 semitones, intervals {2}, {7}, {5}; arc sweep 108.2 mm; flank sliders 122 mm; vinyl faceplate 53823.51 mm2 (all computed); every net within 0.2 percent of
  the shipped net's area and 0.5 percent symmetric difference.
- A clearance gate 0.1 mm above the least clearance refuses the board
  (computed).
- 2026-10-09: `npx --no-install hbf parity reference/copper/fret` exits
  0: 95 pass, 0 fail; gates.json, layers.json and stack.json equal
  (computed, the board built in the sandbox at the chase defaults).

### Measured on a printed body

- none: no FRET board has been cut from these files.

### Checked by machine on geometry

- 2026-10-08: the 95 gates above on every run of `test/parity.test.ts`,
  and the layer documents' sha256 in `expected/layers.json`.

### Not verified by anything

- The emitted SVG path strings against the shipped layer files: not
  compared; the shipped strings come from another GEOS build (M05-T13).
- The vinyl, the printed faceplate and the accents have no profile row
  with a thickness, so the stack declaration names the backer and the
  copper only (M05-T15 card defects).
- A person has not looked at the six documents.
