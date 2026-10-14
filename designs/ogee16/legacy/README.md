# OGEE16 legacy copy

The OGEE16 R16-P source tree and its shipped print STLs, kept byte
identical as the inputs of M02-T07 (D-142, D-156). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/ogee16.md` |
| phase | 2, gate-then-emit and sims (2026-08-14 to 2026-08-18; `syn/patterns-and-lineage.md` section 1) |
| copied from | `fab-work-directory:benches/ogee16/outputs/` (`ogee16-source.zip`, `ogee16-print-stl.zip`) |
| unzipped | `source/` from `ogee16-source.zip` and `out/print/` from `ogee16-print-stl.zip`, side by side, since `audit_print.py` reads `source/../out/print`. The eight top-level notes in the source zip (`README.md`, `BUILD.md`, `PRINT.md`, `SHEETS.md`, `CLOTH.md`, `PINS.md`, `MIN.md`, `TIMES.md`) stay inside the zip: its `README.md` would replace this file and carries a dash the voice lint blocks |
| lineage rows | `ogee16.check-sweep/r16p` (canonical, `source/check_sweep.py`, byte identical to `originals/ogee16/files/src/source/check_sweep.py`), `ogee16.check-sweep/bench-source-zip` |

## Kernels

Consumed: OpenSCAD (`source/*.scad`), trimesh, scipy, shapely and
manifold3d in the Python checkers.

Introduced: `kin.py` as the one kinematics source with a JS twin diffed
against it, the `fits.py` table, the swept crank check
(`source/check_sweep.py`, 9 cranks through 25 steps) and MaxRects plates.

## Known unfixed defects

- The drive pin head is written 5.5 at `printed.scad` line 237 and
  reassigned 6.0 at line 393, so the drive pin builds with a 6.0 head in a
  6.2 counterbore; the two pins need separate names
  (`knowledge/designs/ogee16.md` 4.4).
- The proud-head geometry that swept 577 mm3 per pin head (bench chat
  record) is not in the harvest. M02-T07 rebuilt it from `drive_pin()` in
  `fixtures/proud-head/` (its own SHA256SUMS); the 577 mm3 figure is not
  reproduced there (`packages/sim/records/ogee-sweep.json`).
- `fits.py` mirrors `printed.scad` values by hand (`PR`), so the two can
  drift (`syn/patterns-and-lineage.md` 4.1).

## Plates and cut files (M07-T01)

| file | what |
|---|---|
| `ogee16-plate.html` | the build plate page `build_plate.py` baked from `source/plate_template.html`, with `PARTS`, `GROUPS` and `DRIVE` embedded (lines 182, 266, 267); copied from the bench outputs |
| `ogee16-buildit-app-20260818.html` | the OGEE build-it page of 2026-08-18 (M07-T08), copied byte for byte from `originals/ogee16/files/companions/` (the same bytes as `evidence/x/downloads/dl-ogee-stipple-mech/ogee/ogee16 (6).html`); its `PARTS_TBL` (line 404) prints 99 printed pieces for the knob build while its blurb (line 405) and the bill the scene derives say 124, the golden failing fixture of CHK-LNT-03 |
| `ogee16-cut.zip` | the shipped lasercut set, unzipped beside `out/print/` as `out/cut/` (three sheets as DXF and SVG) and `out/dxf/` (33 OpenSCAD part exports), the layout `cutfiles.py` reads |

`tools/extract-plate.mjs` runs `packOne`, `pack` and `autoGap` of
`source/plate_template.html` (lines 263 to 340) on the embedded data for
both drives and audits each plate. `tools/kin-record.py` imports
`source/kin.py`, runs `check_viewer.py`'s harness on the viewer's JS
block from `source/viewer_template.html`, and replays setPixel and clear
with the viewer's `apply()` rule. `tools/cut-record.py` reruns
`source/cutfiles.py` on `out/dxf/` into a temporary folder and compares
the result with `out/cut/`. Each writes its record under
`packages/nest/records/` or `packages/motion/records/` with `--write`,
and otherwise exits 1 when a number moves.

`tools/extract-steps.mjs` (M07-T09) runs the `reg(...)` registry blocks of
`source/viewer_template.html` and `source/printed_viewer_template.html` in
node on stub THREE objects and records the assembly step of every part
(`packages/nest/records/ogee16-steps.json`), with counts held to
`cutfiles.py` BOM and `build_plate.py` QTY. No `reg` call places the
lasercut `coupon` or the printed `drivepin`, so both are listed as
unassigned.

- `build_plate.py` cannot run from the source zip: it reads
  `three.min.js`, which the zip does not hold, and its docstring still
  says 99 pieces.
- `check_viewer.py` printed MISMATCHES and exited 0 whatever the count;
  it also reads `out/ogee16.html`, which `build_viewer.py` writes and the
  zips do not hold.
- `cutfiles.py` writes `$INSUNITS` 6 (metres) through `ezdxf.new()` while
  its coordinates are millimetres; `out/dxf/*.dxf` carry no HEADER
  section at all.
- The rerun of `cutfiles.py` with ezdxf 1.4.4 and shapely 2.1.2 gives the
  shipped rings, vertex for vertex, but sheets 1 and 2 list some rings in
  another order (computed, `packages/nest/records/ogee16-cut-legacy.json`).
