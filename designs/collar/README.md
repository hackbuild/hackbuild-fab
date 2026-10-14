# COLLAR

A flat, flush colour inlay challenge coin for a multi-toolhead FDM printer,
ported from the COLLAR bench (`legacy/collar.html`, record
`knowledge/designs/collar.md`). The body carries pockets and each colour
part fills its pocket, so both faces finish at one Z.

| file | what it holds |
|---|---|
| `chase.ts` | the design: the legacy `ST` defaults of collar.html line 643 and the legacy slider ranges |
| `build.ts` | a headless port of the slab planner and labeller; emits one raster body per slot; its bytes enter defHash |
| `legacy/` | the bench as harvested, its sha256 and a lineage README |
| `test/parity.entry.ts`, `test/parity.html` | the hack.build preset composed by `@hackbuild/inlay` on the ui-core canvas surface, bundled as one IIFE for the browser parity (M03-T09) |
| `test/nfc-pause.fixture.ts`, `test/nfc-pause.test.ts` | the owner's NFC pocket as two sealed pocket cases for CHK-PRT-15 (M03-T09 step 7) |

The build is raster in XY and exact in Z. `planSlabs` puts a Z break at
both faces, both inlay bands, every layer inside the edge break and around
the pocket, and every layer for an edge that changes with height.
`labelSlab` labels each grid cell of a slab at its middle height: air
outside the edge-cut outline less the edge break inset, the rim band, face
art, body, and air inside the pocket. Equal neighbouring slabs merge. The
raster route of `packages/mesh` heals pinches and meshes each slot.

Face art is composed by `@hackbuild/inlay` and proved against v5 in one
Chromium by `tools/py/harness/collar_parity.py`. It does not reach
`build.ts` yet: a build may import only `@hackbuild/spec` (BUILD_IMPORTS),
so art enters a part only through the `inlay` feature kind, which refuses a
host other than a prism standing on the bed, and node has no text route
(geom `vectorSurface` refuses `fillText`), so the hack.build back face
cannot compose in `part.build`. The chase defaults carry empty faces. Also
not ported: the print card and the pause layer readout; the face boards.

## References

| reference | role | per-slot volume, cm3 (slot 1, 2, 3) |
|---|---|---|
| COLLAR v5 `buildMesh` at the hack.build preset, Chrome 150 with the local Permanent Marker | parity gate of `collar_parity.py` | 3.5956, 0.5322, 1.0258 (computed, 2026-10-06) |
| Sep 19 reeded coin, `collar-coin-44mm (8).3mf` (lineage `collar.owner-export/20260919`) | newest COLLAR reference, informational; the collar.html revision that wrote it is not pinned | 3.60, 0.53, 1.03 (computed by COLLAR, its print card) |
| example 3MF `example-hackbuild-coin.3mf` (lineage `collar.export/example-preset`) | an earlier export of the preset, informational | 3.64, 0.51, 1.00 (computed by COLLAR, its print card) |

The Sep 19 card: blank 44.0 x 3.60 with a 0.50 edge break, inlay 1.20 as
6 layers at 0.20, 40 reeds 1.00 deep and 2.80 wide, rim band 2.20 in slot
3, total 5.15 cm3, 94,848 triangles, 7 slabs, 0.086 mm grid, no insert
pocket; its save names the `0.24mm Standard @FF C5` process (computed by
COLLAR; the save measured). v5 at the preset in a browser with the real
face reproduces the Sep 19 volumes at two decimals and misses the example
card by 0.04, 0.02 and 0.03 cm3 (computed); the example was exported by
an earlier revision whose font and revision number are unknown. Triangle
counts are recorded, never compared: COLLAR merges walls across slabs, the raster
route does not.

At the defaults the build writes layer 0.2 mm under the `0.24mm Standard
@FF C5` process, as the legacy does (collar.html lines 644 and 647), and
warns `LAYER_PRESET`. `reference/exports/orca-3mf-roundtrip` sets 0.24.

## What is verified, and what is not

### Verified on this machine

- 2026-10-05: `node tools/legacy/collar-dump.mjs` drove `legacy/collar.html`
  in Chrome 150.0.7871.125 through Playwright 1.63.0 (system Chrome through
  `HBF_CHROMIUM`) and through puppeteer-core 24.43.1; both wrote the same
  label grids and part volumes to `tools/corpus/collar/legacy-defaults.json`.
- 2026-10-05: `npx vitest run tools/parity/collar.test.ts` passed: the port's
  label grids equal the legacy grids cell for cell in every slab, for the
  line 643 defaults and for the booted blank coin; the healer flipped 0
  cells on both sides; per part volume within 1e-3 mm3 of the legacy mesh,
  largest difference 1.36e-4 mm3 (computed); the exported per-filament key
  set equals the 127 gold keys.

- 2026-10-06: `uv run --project tools/py --extra bench
  tools/py/harness/collar_parity.py designs/collar/legacy/collar.html
  designs/collar/test/parity.html` (Playwright 1.63.0, Chrome
  150.0.7871.125 through executable_path, swiftshader flags) printed
  `front 0 differing cells, back 0 differing cells` at res 512; the route
  served 5 requests and counted 0 others; the legacy back grid equals the
  M03-T05 capture made with Google Fonts; per-slot volumes equal v5's own
  estimateVolume in the same run within 1e-3 mm3 (computed).
- 2026-10-06: `npx vitest run designs/collar/test/nfc-pause.test.ts`
  passed, 13 tests: every fixture value equals the owner card text.

### Measured on a printed body

None from this port. The owner printed COLLAR coins from the legacy bench
(print cards in `fab-knowledge:originals/collar/files/`).

### Checked by machine on geometry

- The exported 3MF of the line 643 defaults passes `uv run --project
  tools/py tools/py/validate_3mf.py --export --overlap`: 12 checks, 0
  failed, both parts with 0 non-manifold vertices (computed).

### Not verified by anything

- No slicer has opened an export of this port.
- No coin from this port has been printed.
- `hbf part.build designs/collar` builds the empty-face defaults only (two
  bodies, slots 1 and 3); no art body, no per-slot metric (see above).
- The port's triangle counts are larger than the legacy's (41960 against
  5368 on slot 1, computed and measured); the legacy merges walls across
  slabs, the raster route does not.
