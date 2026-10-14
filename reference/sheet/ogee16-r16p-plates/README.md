# OGEE R16-P plates on packages/nest

The OGEE R16-P printed bill on 256 mm build plates (M07-T08, D-137,
D-186): one part type per plate, MaxRects best short side fit by area
with quarter turns of 0 and 90, a 10 mm margin and a 4 mm gap, and one
3MF per plate written through packages/3mf with the layout as instances.

| file | what |
|---|---|
| `build.ts` | runs the scene for both drives through `packPlates`, `printableParts` and `plateLayouts` (packages/nest/src/plates.ts) and `write3mf`; returns what `expected/` keeps and the plate files |
| `test/reference.test.ts` | holds `build.ts` to `expected/` and to the legacy record, reads every plate 3MF back and audits its build items, runs `tools/py/validate_3mf.py --overlap` on each, and runs CHK-LNT-03 on the build-it page fixture |
| `expected/layout.json` | per drive: the bill, the footprints, the gap 4 layout (every placement) and the gap auto layout; packer, gap, fill per plate (informational, D-075), layoutHash |
| `expected/artifacts.json` | sha256 of each plate 3MF |

The scene is `packages/nest/scenes/ogee16-r16p-plates.ts`. Its bill is
derived from a `drive` parameter and the array size N (params.scad line
36): each part type carries the instance rule of the printed viewer that
places it, a count c0 + c1 N + c2 N^2. The parts are the shipped print
STLs through the imported mesh route, parked on z 0 at the origin, their
footprints the XY bounds. Rewrite the goldens with `HBF_ACCEPT_SHEET=1
npx vitest run reference/sheet/ogee16-r16p-plates` after reading the
diff. `HBF_PLATES_OUT=<dir>` on the same run keeps the 41 plate files in
that directory to open in a slicer.

## Counts

Taken from the build (D-010), all computed:

| drive | pieces | types | plates at gap 4 | gap auto | closed form |
|---|---|---|---|---|---|
| knobs (default) | 124 | 20 | 20 | 16 mm, 20 plates | 12 + 8N + 5N^2 |
| servos | 119 | 21 | 21 | 16 mm, 21 plates | 15 + 6N + 5N^2 |

Both equal `build_plate.py` QTY (lines 5 to 12), the PARTS baked into
`ogee16-plate.html` and the page's own `pack()` and `autoGap()`
(`packages/nest/records/ogee16-plates-legacy.json`).

## Why there is no chase.ts

part.build, `hbf parity`, the metric record, the project graph, cold
rebuild and the determinism hashes all enumerate every
`reference/<area>/<id>/chase.ts` as a part.build reference, and no chase
kind is a plate layout (D-126). OGEE16 has no chase until M10, as SLUG
(`reference/sheet/slug-sheets/README.md`).

## Findings

- The knob bill carries 9 drive pins. By assembly, only the 2N shaft
  cranks seat one with knobs (`printed.scad` lines 339 and 354); the
  ninth is the latch crank pin (line 434), which only the servo drive
  has. `build_plate.py` line 8 lists the pin with the common parts, and
  D-186 keeps that bill, so the scene does too. A knob kit by seated
  instance is 123 pieces (computed); the question is in the owner queue
  of the PR.
- The 1/1024 mm weld of the imported route leaves 4 zero-area
  triangles in `rowbar_asm.stl` (0 as read in float32, computed), and
  `validate_3mf.py` failed CHK-PRT-01 topology on the two rowbar plates.
  `printableParts` rebuilds a part that fails only on zero-area
  triangles through manifold, keeping bounds, triangle count and volume.
- The build-it page of 2026-08-18 prints 99 pieces for the knob build
  from its `PARTS_TBL` (pivot NN, knob N, drivepin N) while its blurb and
  the derived bill say 124. CHK-LNT-03 fails on the fixture that states
  the table's total beside the blurb; on the page as shipped it passes,
  since the table states no total.

## What is verified, and what is not

### Verified on this machine

Apple M1, macOS 12.7.4, Node 22.18.0, uv with tools/py, 2026-10-08, all
computed:

- `npm test -w packages/nest -- ogee16-plates`: the bill from instance
  counts equals the closed forms, `build_plate.py` QTY and the page's
  PARTS; footprints equal the page's PARTS to 0.01 mm; knobs 124 pieces
  in 20 types on 20 plates, servos 119 in 21 on 21; 0 overlaps, 0 out of
  bounds, minimum gap 4.000 mm at gap 4; gap auto 16.
- `npx vitest run reference/sheet/ogee16-r16p-plates`: the 41 plate
  3MFs read back with 0 overlapping build items, every item at least
  4 mm from the next, inside the margin and under 256 mm;
  `validate_3mf.py --overlap` exits 0 on all 41. Its CHK-PRT-03 build
  row compares every pair of build items as placed: 1878 pairs over the
  20 plates of two or more copies (knobs 945, servos 933), 0 mm3 worst,
  and the 21 plates of one copy carry no build row (computed, M07 audit
  2026-10-09). Before that rule the validator compared 0 pairs on every
  plate and passed copies stacked at one spot.
- M07-T15, 2026-10-08: `printf 'y\n' | script -q /dev/null npx --no-install
  hbf export.run --scene ogee16-r16p-plates --kind 3mf --params
  '{"drive":"knobs"}' --out <dir>` exit 0 at the gate, 20 plates, and
  with `servos` 21 plates; `validate_3mf.py --overlap` exits 0 on each
  of the 41. CI repeats both in the `dxf-audit` job.

### Measured on a printed body

Nothing. No plate has been sliced or printed from these files.

### Checked by machine

`npx vitest run reference/sheet/ogee16-r16p-plates` holds the goldens and
rebuilds them to equal bytes.

### Not verified by anything

- `npx --no-install hbf parity reference/sheet/ogee16-r16p-plates`: not
  run; exit 2, E_REF on `/chase` (no chase.ts, above).
- The 3MF names the ffc5p default preset: centauri, the bed of record,
  carries no slicer preset (PROFILE.md 8). Both beds are 256 x 256 mm.
- A person has not opened these plates in a slicer or looked at them.
  The M07-T15 renders (top and iso of every plate) wait for that look
  (D-154).
