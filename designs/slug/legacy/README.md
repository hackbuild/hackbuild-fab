# SLUG legacy copy

The SLUG page with its capsule physics, its parameters, SCAD source, build
notes and two harness scripts, kept byte identical as the inputs of M02-T05
and M02-T08 (D-142, D-156). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/slug.md` |
| phase | 2, gate-then-emit and sims (2026-08-15 to 2026-08-16; `syn/patterns-and-lineage.md` section 1) |
| copied from | `fab-work-directory:benches/slug/outputs/slug/` (`slug.html`, `params.json`, `slug.scad`, `BUILD.md`, `tri2.mjs`, `placecheck.mjs`); `slug.html` is byte identical to `originals/slug/files/slug.html` |
| lineage rows | `slug.step/slug-12` and `slug.relax/slug-12` (canonical, `slug.html`), `slug.bench/slug-12`, `slug.scad/slug-12`, `slug.audit/slug-12` |

## Kernels

Consumed: OpenSCAD as the source of truth (`slug.scad`, baked outlines),
three.js 0.160 in the page.

Introduced: the capsule physics, an own granular solver that exists once
(`step(dt, omegaRad)` at `slug.html` line 811, `relax(iters)` at line 916,
the whole sim at lines 673 to 954), and the shelf packer.

## Known unfixed defects

- The multi-trial runner behind "126 of 128 vends" (`BUILD.md` line 266) is
  absent from the harvest and from Downloads; the page uses unseeded
  `Math.random` (D-136, D-180). M02-T08 rebuilds it.
- The page echo of `P` has `tie_r2` 70 while the SCAD and the baked cut use
  52 (`syn/patterns-and-lineage.md` 4.1).
- `tri2.mjs` and `placecheck.mjs` import `/tmp/app.mjs` and a
  `/home/claude/slug/node_modules/three`, so neither runs as copied.

## Sheets (M07-T01)

`sheets/` holds the 20 shipped cut files, 9 ply and 1 acrylic sheet as
DXF and SVG, copied byte identical from
`fab-work-directory:benches/slug/outputs/slug/sheets/`
and pinned in `SHA256SUMS`. `../extract/extract-nest.mjs` copies line 272
(`OUTLINES`) and lines 1042 to 1137 (`PART_QTY` to `sheetDXF`) of
`slug.html`, runs the page's own `nest()` at 600 x 400, gap 4, margin 6,
and regenerates every sheet: all 10 DXF and all 10 SVG files come out byte
equal (computed). It writes `packages/nest/records/slug-legacy.json` with
`--write`, and with `--check` exits 1 when a number moves.

- `door_flap`, `window`, `ret_lip` and `ret_back` are baked outlines
  missing from `PART_QTY` (line 1042), so the shipped acrylic sheet lacks
  the two panes BUILD.md names (lines 4, 109, 153).
- BUILD.md says 10 sheets of 6 mm ply; the files are 9 ply sheets and 1
  acrylic sheet.
