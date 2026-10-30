# SPRUE

Two colour flush inlay giveaways, a 351 guitar pick and a coin, ported from
the SPRUE bench (`legacy/sprue.html`, record `knowledge/designs/sprue.md`).
A white body and a black inlay sum to the blank; art sits on both faces,
the bed face mirrored in the mesh, and the top edge steps in over the last
inlay layers.

| file | what it holds |
|---|---|
| `chase.ts` | the bench state after its boot preset `phx` (sprue.html line 956 and 980) and the bench slider ranges |
| `build.ts` | SPRUE.build's slab plan on vector outlines: one prism per slab, one csg body per colour; the pick outline and SPRUE's coin polygon for the parity page |
| `legacy/` | the bench, the generator and its print card as harvested, with sha256 and a lineage README |
| `test/parity.entry.ts`, `test/parity.html` | the package side of the browser parity: SPRUE faces composed by `@hackbuild/inlay` on the bench-core canvas surface |
| `test/legacy-read.js` | the legacy side of the browser parity, shared by both harness forms |

Two routes, one plan. The browser route (sprue.html) composes text and
images on a canvas, cleans the mask with the `sprue` hygiene recipe and
traces it to prisms; the package reproduces that compose cell for cell in
`test/parity.entry.ts` with `@hackbuild/inlay` and `@hackbuild/geom`
(`trace`, `simplifyLoop`, `groupLoops`). A build.ts imports only spec
(D-178), and node has no font outline route, so `build.ts` runs the same
slab plan on vector outlines, as sprue.py does, with sprue.py's lightning
bolt as the art. Text faces stay with the browser.

## What is verified, and what is not

### Verified on this machine

- 2026-10-06: `uv run --project tools/py tools/py/harness/sprue_parity.py
  designs/sprue/legacy/sprue.html designs/sprue/test/parity.html` (Playwright
  1.63.0 on system Chrome 150.0.7871.125) and `node
  tools/legacy/sprue-parity.mjs` (puppeteer-core 24.43.1, same Chrome) both
  exited 0: phx, phx-small and coinyear give 0 differing cells raw and clean
  on both faces at ppm 12 (computed), and every thin flag equals the page's
  own checkThin, the two `gone` flags of phx-small included. Zero requests
  left file:// beyond the three chrome font stylesheets the legacy page
  links, which were aborted.
- 2026-10-06: `npx vitest run tools/parity/sprue-design.test.ts` passed: the
  pick and coin outlines equal SPRUE's point for point; the build's per
  colour volumes are within 0.1 percent (white) and 0.3 mm3 or 0.5 percent
  (black) of SPRUE.build run on masks of the same blank and art at ppm 24
  (computed); the bed-face bolt is mirrored in X.
### Measured on a printed body

- none

### Checked by machine on geometry

- `npx --no-install hbf part.build designs/sprue --json` exits 0 with
  CHK-PRT-01 and CHK-PRT-03 passing (computed).
- Volumes beside the print card (informational, D-075). The print card
  comes from sprue.py's shapely route with its own art (a snare and arc
  text on the coin, the bolt and a year on the pick), so the package
  build, which carries the bolt only, differs per colour; the totals show
  the slab plan and edge break. Printed by both harness forms:

| object | colour | package mm3 (computed) | print card mm3 (computed by sprue.py) | difference |
|---|---|---|---|---|
| pick | white | 683.7 | 658 | 25.7 |
| pick | black | 28.0 | 53 | -25.0 |
| pick | total | 711.7 | 711 | 0.7 |
| coin | white | 2271.4 | 2067 | 204.4 |
| coin | black | 158.2 | 363 | -204.8 |
| coin | total | 2429.6 | 2430 | -0.4 |

### Not verified by anything

- CHK-INL-03 does not run on this design: it reads `inlay` features, and
  the inlay kind carves a prism host from its top face, which leaves no
  room for SPRUE's stepped edge (card M03-T10 defects).
- No slicer has opened an export of this port, and no part from it has
  been printed. A person has not looked at a render of it.
- The slabs sit on SPRUE's uniform 0.24 mm grid; the ffc5p preset's first
  layer is 0.25 mm (vendor), so the build warns `LAYER_GRID`.
