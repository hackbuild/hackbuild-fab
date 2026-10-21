# BLOCKS

The printed stud and socket system whose harvested build is BOSS
(`legacy/`, record `knowledge/designs/blocks.md`). Release 1 builds one
part at a time from the chase: the printed wire and the stud brick, the
parts whose archetypes are ported and proven. The brick standard stays
open (D-087): the chase asks it, starts at "not chosen", and refuses a stud
until one is picked. The full chase port, with the scene composer and the
other parts, is M10-T10.

| file | what it holds |
|---|---|
| `chase.ts` | the release 1 chase: `part` (wire, stud), `standard` (unset, boss-v1, blocks-html), the wire fields of WIRE_PARAMS, the brick height and pegs; presets `boss-v1` and `blocks-html` are the two standard starts |
| `build.ts` | places the blocks-wire or blocks-stud archetype through Author.arch; refuses a stud with no standard and a boss-v1 wire; warns LAYER when the standard's layer differs from the machine preset's |
| `expected/` | the parity goldens of the defaults (the wire) at SOURCE_DATE_EPOCH 315532800, written by `hbf parity designs/blocks --accept`; the edit moves the wire length 80 to 120 |
| `legacy/` | BOSS as harvested, byte identical, with sha256 and a lineage README |
| `src/route-seat.ts` | the SEAT router setup ported from `legacy/boss-src/src/parts.js`, routed on packages/copper in octile mode (M05-T09) |
| `test/build.test.ts` | the chase through packages/chase validate.ts, each part value built and checked, held to the reference goldens and to BOSS's own column |
| `test/route-seat.test.ts` | the seat configs against BOSS's own, completion counts against BOSS, spacing read from the routes, and the `pins: 'all'` refusal |
| `test/golden/route-seat.json` | per seat route lengths, vias and pin to stud estimates as computed; rewritten with `HBF_SEAT_RECORD=1` |
| `bench.ts` | the bench: steps part, materials, print (blocks.html's strip less BUILD, the scene), cams iso, top, front, under, no drive pad; the welcome's two starts are the two standards, neither preselected (D-087) |
| `bench.entry.ts`, `page-build.ts`, `page-facts.d.ts`, `bake.json` | the bake inputs, as `reference/keys/midi-pad` has them; `node tools/bake/bake.mjs designs/blocks/bake.json` writes `dist/bench/blocks.html` |
| `test/bench.test.ts` | the bench against the gold benches: one sentence per goal, the part step carrying both part groups, the two standard starts, the print step on plate |

`npx vitest run designs/blocks` runs the tests. `npx --no-install hbf
part.build designs/blocks --json` builds the defaults; `--preset boss-v1`
and `--preset blocks-html` build the stud at each standard.

## Release 1 cut

- The defaults build the wire, since the wire is ported on the blocks-html
  standard only (packages/archetypes/src/blocks/wire.ts) and so builds
  without a standard choice. Its meshes equal
  `reference/conductors/blocks-wire/expected/build.json`.
- The stud brick is one stud, 8 x 8 mm, as `reference/conductors/blocks-stud`
  builds it. At blocks-html its meshes equal that reference's goldens; at
  boss-v1 its taps (S 9.1, S.sock 1.2) and post top (9.6) equal BOSS's
  column evaluated in place (computed).
- The board seat is out of the chase. Its archetype `blocks-board-seat` is
  refused, and BOSS's c3mini press seat built from `src/route-seat.ts`
  (traces stroked from the route, BOSS v1 columns through blocks-stud,
  pin pads, plain columns) failed two block checks on 2026-10-21
  (computed, not committed): CHK-NET-02, an L1 trace 0.24 mm above a
  foreign column's flange, 0.51 mm net to net against the 0.6 floor
  (D-085); CHK-PRT-04, a plain socket void leaving a 1.5 mm wall to the
  body edge, off the 0.42 mm line width grid. Both follow from the BOSS v1
  stack (flange top 3.12, L1 3.36) and the 8 mm grid, not from the port.
  The L2 trace layer also failed the mesh audit. The seat returns with
  M10-T10 and an owner call on D-087.
- Release 1 BLOCKS is a smaller bench than blocks.html: no scene, no
  deck, no wiring on a grid, and only two of the original's parts. The
  side by side (R1-designs-reach-14) shows it.

## Bench (`bench.ts`, baked to `dist/bench/blocks.html`)

- Steps part, materials, print. The part step holds the part pick, the
  standard (its focus) and the wire and brick groups, as blocks.html's
  PART pane holds CATALOG and PARAMETERS; BUILD, the scene composer,
  waits for M10-T10.
- No drive pad: blocks.html drives its circuits from SELECTED and BOARD
  PINS in a scene, which this cut does not carry.
- The welcome starts are `boss-v1` and `blocks-html`, the two standards;
  the defaults behind the card build the wire, which needs no standard.
- The chase exports json besides 3mf and stl, for the design file the
  G-57 drive loads and exports; only defHash and the build hash moved in
  the goldens (mesh hashes and volumes equal, computed).

## What is verified, and what is not

### Verified on this machine

- 2026-10-21: the gold suite on `dist/bench/blocks.html`
  (`npx playwright test -c tools/smoke/playwright.config.ts --grep @gold`,
  then `node tools/gold/report.mjs --origin fab --bench blocks --only` the
  bench-layer rules) exited 0: 23 pass, 3 n/a (G-05 no light field, G-21
  and G-52 no drive pad), 0 fail (measured, headless Chrome).
- 2026-10-21: `node tools/gold/side-by-side.mjs` shot the bake against
  `fab-knowledge:originals/blocks/files/blocks.html` (the bytes the
  `blocks` hook adapter names; no copy sits in `legacy/`) at 390 and
  1280 px, 18 images in `fab-knowledge:evidence/r1/side-by-side/blocks/`;
  scrollWidth equals the viewport on both pages in every state
  (measured). The fab b-work shot is the welcome's first tile, start
  blank, which the shell adds before the two standard starts.
- 2026-10-21: `npx vitest run designs/blocks` passed, 2 files and 30 tests
  (measured): the chase validates with 0 errors, the wire and both studs
  build with 0 failing checks (CHK-PRT-05 warns that faces sit between
  layer tops, and LAYER warns that blocks-html prints at 0.20 on a 0.24
  preset), and the parity goldens are equal when rerun at epoch
  1000000000.
- 2026-10-13: `npm test -w designs/blocks` passed, 1 file and 21 tests
  (measured): every seat config routed all its pins on packages/copper,
  and the route lengths, vias and pin to stud estimates equal
  `test/golden/route-seat.json` (computed).

### Measured on a printed body

- none from this port.

### Checked by machine on geometry

- route spacing read from the routes, in `test/route-seat.test.ts`.
- every registered check on the wire and on the stud at each standard, in
  `test/build.test.ts`.

### Not verified by anything

- any print of a part built from this chase, or of a SEAT routed by this
  port.
- the pin to stud resistances against a meter; they are computed.
- a person looking at the rendered parts (D-154).
- CI has never run on this repository.
