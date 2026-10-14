# BLOCKS

The printed stud and socket system whose harvested build is BOSS
(`legacy/`, record `knowledge/designs/blocks.md`). The reproduction runs at
BOSS v1 values while the canonical standard stays open (D-087). The full
chase port is M10.

| file | what it holds |
|---|---|
| `legacy/` | BOSS as harvested, byte identical, with sha256 and a lineage README |
| `src/route-seat.ts` | the SEAT router setup ported from `legacy/boss-src/src/parts.js`, routed on packages/copper in octile mode (M05-T09) |
| `test/route-seat.test.ts` | the seat configs against BOSS's own, completion counts against BOSS, spacing read from the routes, and the `pins: 'all'` refusal |
| `test/golden/route-seat.json` | per seat route lengths, vias and pin to stud estimates as computed; rewritten with `HBF_SEAT_RECORD=1` |

`npm test -w designs/blocks` runs the tests.

## What is verified, and what is not

### Verified on this machine

- 2026-10-13: `npm test -w designs/blocks` passed, 1 file and 21 tests
  (measured): every seat config routed all its pins on packages/copper,
  and the route lengths, vias and pin to stud estimates equal
  `test/golden/route-seat.json` (computed).

### Measured on a printed body

- none from this port.

### Checked by machine on geometry

- route spacing read from the routes, in `test/route-seat.test.ts`.

### Not verified by anything

- any print of a SEAT routed by this port.
- the pin to stud resistances against a meter; they are computed.
- CI has never run on this repository.
