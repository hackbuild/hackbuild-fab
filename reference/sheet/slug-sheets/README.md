# SLUG sheets on packages/nest

SLUG's laser sheets out of nest (M07-T07, D-137, D-138): the 42 part names
and 63 pieces of the page's `PART_QTY`, cut from 3 mm ply and 3 mm acrylic
at 600 x 400 mm, 4 mm between parts and a 6 mm edge margin, kerf
compensation off. The layout is SLUG's own shelf packer, ported; the files
come from the one DXF writer and its SVG twin.

| file | what |
|---|---|
| `build.ts` | runs the scenes through `cutScene` (packages/nest/src/scene.ts): the checked nest, the drawings, the writer; returns what `expected/` keeps |
| `test/reference.test.ts` | holds `build.ts` to `expected/`, to the legacy record, to the M07-T05 fill record and to the committed files in `packages/nest/test/out/` |
| `expected/layout.json` | legacy-shelf (every placement), fill with part-in-part, and the informational complete scene: sheets per stock, parts, loops and fill per sheet, packer, gap, layoutHash |
| `expected/artifacts.json` | sha256 of each written DXF and SVG |
| `expected/findings.json` | the CHK-SHT-01 and CHK-SHT-02 kernel findings of every part |

The scenes are `packages/nest/scenes/slug-sheets.ts` and
`slug-sheets-complete.ts`. They read the pinned
`designs/slug/legacy/slug.html` as data: `OUTLINES` (line 272),
`PART_QTY` (lines 1042 to 1050), `ACRYLIC` (line 1051) and the sheet
controls (lines 174 to 177). The items move into a SLUG `build.ts` when
M10 gives SLUG a chase.

Rewrite the goldens with `HBF_ACCEPT_SHEET=1 npx vitest run
reference/sheet/slug-sheets` and the written files with
`HBF_DXF_RECORD=1 npm test -w packages/nest -- slug-sheets`, each after
reading the diff.

## Why there is no chase.ts

part.build, `hbf parity`, the metric record, the project graph, cold
rebuild and the determinism hashes all enumerate every
`reference/<area>/<id>/chase.ts` as a part.build reference, and no chase
kind is a sheet layout (D-126). SLUG has no chase until M10. So
`npx --no-install hbf parity reference/sheet/slug-sheets` cannot run yet,
and the check.run form of `report.json` waits for the CHK-SHT run bodies
of M07-T14 (M07-T07 card defects).

## Counts

Taken from the build (D-010), never from BUILD.md:

| scene | ply3 sheets | acrylic3 sheets | parts per sheet | loops per sheet |
|---|---|---|---|---|
| slug-sheets, legacy-shelf | 9 | 1 | 3, 3, 11, 18, 5, 5, 6, 7, 2; 3 | 34, 26, 38, 97, 52, 38, 39, 89, 5; 6 |
| slug-sheets, fill with part-in-part | 9 | 1 | the same layout: the shelf candidate wins and part-in-part saves no sheet | same |
| slug-sheets-complete (informational) | 9 | 1 | 3, 4, 11, 18, 6, 5, 6, 7, 2; 5 | 34, 22, 45, 97, 53, 38, 39, 89, 5; 8 |

BUILD.md line 85 and the page's sheet label (line 1154) say 6 mm ply and
10 sheets of ply; the files and the build give 9 sheets of ply3 and 1 of
acrylic3 (BUILD.md line 4, `params.json` t 3).

`PART_QTY` omits four baked outlines. The complete scene adds one of each,
quantities inferred: `door_flap` and `window` (acrylic panes, BUILD.md
lines 4, 109 and 153) and `ret_lip` and `ret_back` (the external reject
cup, BUILD.md lines 67 to 70; `ret_back` is the only cup part with bolt
holes, `knowledge/designs/slug.md` section 9). Both questions are in the
owner queue; parity stays on the shipped `PART_QTY`.

## What is verified, and what is not

### Verified on this machine

Apple M1, macOS 12.7.4, Node 22.18.0, 2026-10-08, all computed:

- `npm test -w packages/nest -- slug-sheets`: legacy-shelf gives 9 ply and
  1 acrylic sheets, parts and loops per sheet equal to the page's own
  `nest()` and `placedLoops()` and to `packages/nest/records/slug-legacy.json`;
  every written sheet holds the shipped file's rings vertex for vertex to
  1e-3 mm, ring count equal; 168 vertices the page repeats in place
  (`pinion` ring 4, 2 copies, on ply sheet 4; the outer rings of
  `rotor_gear_a` and `rotor_gear_b` on ply sheet 8) are dropped by the
  writer as zero-length edges, and the count is checked against the
  page's loops; 0 severed (CHK-SHT-01 and CHK-SHT-02 pass on all 42
  parts); fill mode at most 9 and 1, the layout M07-T05 recorded.
- `npm test -w packages/checks -- chk-sht-03`: the 10 written SLUG DXFs
  pass CHK-SHT-03 v2 with the independent reader, extents against the SVG
  twin included.
- `uv run --project tools/py tools/py/audit_dxf.py packages/nest/test/out`:
  ezdxf 1.4.4 reloads all 10 with 0 failures.
- M07-T15, 2026-10-08: `printf 'y\n' | script -q /dev/null npx --no-install hbf
  export.run --scene slug-sheets --kind dxf --out <dir>` exit 0, the gate
  answered at a pseudo-terminal, 10 files named
  `x01_slug-<stock>-sheet<n>_3.0mm-<stock>3.dxf`; `audit_dxf.py` over
  them, 0 failures (extents not run: the dxf kind writes no SVG twin
  beside the file). CI repeats both in the `dxf-audit` job.

### Measured on a printed body

Nothing. No sheet has been cut from these files.

### Checked by machine

`npx vitest run reference/sheet/slug-sheets` holds the three goldens and
the artifact hashes against the committed files.

### Not verified by anything

- `npx --no-install hbf parity reference/sheet/slug-sheets`: not run; no
  sheet path in parity yet (M10).
- Kerf: mode none, as the page cuts. The 0.15 mm slip SLUG relies on is
  the page's claim (lines 1159 and 1160), not measured here.
