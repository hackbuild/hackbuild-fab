Sheets and plates: the sheet loop with part-in-part, the fallback packers and the one DXF writer. Tier 1; milestone M07 (PACKAGES.md).

Built: M07, staged, not released.

## What is here (M07-T03 to T05)

| file | what | ported from |
|---|---|---|
| `src/sheet-loop.ts` | `nest(request)`: copies grouped by stock or by part id, candidate packers, fewest sheets wins (ties to the lower index of maxSide, area, height, width, minSide, shelf), gap `auto` | GUSSET `nest()` (lineage `gusset.bench/nest-orders`) |
| `src/shelf.ts` | shelf packer, the `legacy-shelf` mode | SLUG `nest()` (`slug.nest/slug-12`) |
| `src/maxrects.ts` | MaxRects best short side fit, the five sort orders, the multi-sheet loop | OGEE16 `packOne()` (`ogee16.packone/r16p`), GUSSET `nestOnce()` |
| `src/autogap.ts` | largest whole gap from 2 to 16 mm at the fewest sheets | OGEE16 `autoGap()` (`ogee16.autogap/r16p`) |
| `src/hash.ts` | `layoutHash`, sha256 of the RFC 8785 form of the sorted placements (D-051) | |
| `src/box.ts` | footprints, turns, `placeRings` (SLUG `placedLoops`) | |
| `src/profile.ts` | a part's region from its rings (depth parity, representative point), `compensate` +kerf/2 with miter limit 4 (M07-T04) | OGEE16 `polygon_from_rings()`, `compensate()` (`ogee16.cutfiles/r16p`) |
| `src/part-in-part.ts` | `nestHoles`: copies largest first go into the holes of parts already placed (hole less islands, offset inward by gap/2; MaxRects on the container's bbox; accepted only when the outline grown by gap/2 lies inside, difference at most 1e-6 mm2), `composePlacement`, `cutOrder` (inner parts before their host, for the T06 DXF writer) (M07-T05) | nest's own pass, no legacy source (D-137) |
| `src/connect.ts` | CHK-SHT-01, 02 and 07 kernels, `beamOf` (E_PARAM_MISSING on a null kerf in mode outline), `kerfNext`, `packSheets`: the checked nest that refuses before it places anything (M07-T04) | OGEE16 `check_connected()` (`ogee16.cutfiles/r16p`) |
| `src/arcs.ts` | arc fitting for the cut writers: whole circles within 0.02 mm, arcs within 0.1 mm with the sagitta test, edge midpoints held on a whole circle too (M07-T06) | SKETCH `IO.fitArcs`, `IO.wholeCircle` (`sketch.bench/v3`) |
| `src/dxf.ts` | the one DXF writer: `writeDxf` on the AC1024 skeleton in `data/dxf-template.json` (`tools/py/make_dxf_template.py`), every ring one closed LWPOLYLINE with its first vertex repeated or one CIRCLE, bulges, handles from 0x100, `$HANDSEED` the next free; `drawSheets` turns a layout into drawings in cut order (M07-T06) | COTTER `KIT.laserDXF` (`cotter.kit/r5`), OGEE16 sheets `dxf()` (`ogee16.sheet-template/r16p`), SKETCH `IO.sheetDXF` |
| `src/svg.ts` | `writeSvgCut`, the svg-cut twin: the writer's entity list in its order, mm, one y flip, COTTER colours (M07-T06) | COTTER `KIT.laserSVG`, SKETCH `IO.sheetSVG` |
| `src/assembly-order.ts` | assembly-order mode: `stepLayout` packs step by step with the fill-mode packers and shares only the most recent sheet when that saves a sheet; `requireSteps` (E_PARAM_MISSING naming every item with no step), `assignSteps` (a part over several steps becomes `<part>@<step>` items), `stepSpans`, `assemblyReport` (sheets against fill mode, D-075) (M07-T09) | OGEE16 viewers' `reg(..., asm)` steps (`ogee16.asm-steps-lasercut/r16`, `ogee16.asm-steps-printed/r16p`); Roadkill as prior art |
| `src/scene.ts` | `cutScene`: a sheet scene (request, machine, kerf mode, writer options, file label per stock) through `packSheets`, `drawSheets`, `writeDxf` and `writeSvgCut`; refuses a sheet larger than the machine's sheet envelope; a refused nest writes no file (M07-T07) | |

No clock and no unseeded draw under `src/`: `tools/tiers.json` refuses
both. `packSheets` also returns the items it packed (compensated rings), which `drawSheets` draws. Sparrow is not adopted
(`docs/explanation/nest-sparrow-evaluation.md`); a request naming it is
refused with E_SCHEMA. Assembly-order refuses part-in-part. Part-in-part runs in fill mode as a second
candidate (every packer again on the roots the pass leaves; a tie goes to
the layout without it), takes the geom handle (`nest(request, geom)`,
`packSheets` passes it) and is refused in legacy-shelf mode.
`nestTrials` returns every candidate's sheet count, an informational
metric (D-075).

## Scenes

`scenes/` holds sheet scenes as data, importing node and types only so core
can load one by path until M10 moves scene items into build.ts:
`slug-sheets.ts` (SLUG's 42 `PART_QTY` names read as data from the pinned
page, legacy-shelf, kerf mode none, arcs off) and `slug-sheets-complete.ts`
(informational: the four baked outlines `PART_QTY` omits, one each). The
reference is `reference/sheet/slug-sheets`.

## Tests

`npm test -w packages/nest`: `shelf-parity` (SLUG ply and acrylic, every
placement and every placed vertex against the page's own `nest()` and
`placedLoops()`), `maxrects-parity` (OGEE16 R16-P knob and servo plates
against the page's `pack()` and `autoGap()`), `gusset-orders` (GUSSET's
`nest()` and `nestOnce()` on the 183 R16 lasercut footprints) and
`nest.property` (fast-check, 1000 runs, seed in the file) and `connect`
(the 46 SLUG outlines, the 27 OGEE R16 parts against cutfiles.py, and the
card's deck, keeper, hub and declared-hole cases) and `part-in-part` (the
card's frame fixture, an island, a frame in a frame at every turn, and
SLUG fill mode on and off; every inner part proven inside its host's holes
on even-odd polygons, at least the gap from its host, and no two parts
sharing area) and `slug-sheets` (SLUG's 10 sheets against the page's `nest()`, the legacy record and the shipped DXF files vertex for vertex to 1e-3 mm; fill mode against the M07-T05 record; the complete scene against the page's `nest()`; the written files committed in `test/out/`) and `dxf` (the template against its generator, one CIRCLE
for a 10 mm circle, bulges on a rounded rectangle, the repeated first
vertex, cut order, and the OGEE16 R16 lasercut through the writer: 27 parts,
183 pieces, 3 sheets of 600 x 400 at the cutfiles.py kerf 0.18, inferred;
the files in `test/out/` are committed and compared byte for byte,
`HBF_DXF_RECORD=1` rewrites them, and `uv run --project tools/py
tools/py/audit_dxf.py packages/nest/test/out` reloads them with ezdxf). The legacy code
runs from the pinned files in `designs/*/legacy/`; the numbers it is held
to come from the records in `records/`.

## What is verified, and what is not

### Verified on this machine

- 2026-10-13: `npm test -w packages/nest` passes, 103 tests in 11 files
  (measured), including the parity rows: `shelf-parity` against SLUG's own
  `nest()` and `placedLoops()`, `maxrects-parity` against the OGEE16 R16-P
  page's `pack()` and `autoGap()`, `gusset-orders` against GUSSET's
  `nest()` and `nestOnce()`, and `slug-sheets` against the shipped SLUG DXF
  files vertex for vertex to 1e-3 mm (computed).
- M07 audit, 2026-10-09: on the 41 plates re-exported at the gate,
  `validate_3mf.py --overlap` compared 1878 pairs on the 20 plates with
  copies and found 0 mm3 of overlap (computed).

### Measured on a printed body

None. No sheet this package laid out has been cut.

### Checked by machine on geometry

CHK-SHT-01, 02 and 07 run in `packSheets` before anything is placed; the
written DXF files reload closed through `tools/py/audit_dxf.py` with ezdxf.

### Not verified by anything

- A cut of any layout on a laser or a vinyl cutter, and the kerf 0.18 mm
  the OGEE16 lasercut reads from cutfiles.py (inferred).
- `hbf parity reference/sheet/*` (lands M10).

## Records

| record | written by |
|---|---|
| `slug-legacy.json` | `node designs/slug/legacy/tools/extract-nest.mjs --write` (M07-T01) |
| `ogee16-plates-legacy.json` | `node designs/ogee16/legacy/tools/extract-plate.mjs --write` (M07-T01) |
| `ogee16-cut-legacy.json` | `uv run --project tools/py designs/ogee16/legacy/tools/cut-record.py --write` (M07-T01) |
| `ogee16-cut-footprints.json` | `uv run --project tools/py designs/ogee16/legacy/tools/footprint-record.py --write` (M07-T03) |
| `ogee16-connect.json` | `uv run --project tools/py designs/ogee16/legacy/tools/connect-record.py --write` (M07-T04) |
| `slug-fill.json` | `HBF_SLUG_FILL_RECORD=1 npm test -w packages/nest -- part-in-part` (M07-T05) |
| `dxf-inventory.json` | `uv run --project tools/py tools/py/dxf_inventory.py tools/corpus/dxf --write` (M07-T01) |
| `../data/dxf-template.json` (not a record: the writer's skeleton) | `uv run --project tools/py tools/py/make_dxf_template.py --write` (M07-T06); without `--write` it compares |
