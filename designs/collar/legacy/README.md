# COLLAR legacy copy

`collar.html` is the COLLAR challenge coin bench as the owner last used it,
kept unchanged as the original of record for the port in `../build.ts`
(D-142, D-156, D-222). It is never edited; `tools/legacy/collar-dump.mjs`
refuses to run when its bytes stop matching `sha256.txt`.

| field | value |
|---|---|
| copied from | `fab-work-directory:benches/collar-coin/outputs/collar/collar.html` (lineage row `collar.bench/harvest`) |
| canonical row | `collar.bench/collar-7`, `fab-knowledge:originals/collar/files/collar.html`, byte identical |
| sha256 | `ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46` (`sha256.txt`) |
| bytes | 149897 (measured) |
| built | 2026-08-19 19:25, the newest of six builds that day (`knowledge/designs/collar.md` 1.1) |
| record | `knowledge/designs/collar.md` |
| chat | `0ae6e90c-b9cb-4869-9852-ee33f5af5386`, "Multicolor STL for hack.build challenge coins" |

What the port reads from it, by line: the `ST` defaults (643), blank shapes
and `shapeR` (668 to 732), the edge registry (760 to 872), `baseLUT` and
`edgeLUT` with `LUT_N = 8192` (898 to 918), `planSlabs` (1201), `insetAt`
(1215), `labelSlab` (1221), the pixel tables and band merge in `buildMesh`
(1368 to 1406) and `estimateVolume` (1508).

## Revisions

Six builds came out of that chat on 2026-08-19 (mtimes and sha256
measured, `knowledge/designs/collar.md` 1.1). The parity source is the
last, v5 in the plan's numbering. The record names only v3 and v5; the
other labels below are inferred from build order.

| revision | mtime | sha256 (12) | what it added |
|---|---|---|---|
| v1 | 03:38 | 487d84c0fc9c | first build: tabs BLANK, ART, EDGE, PRINT |
| v2 | 12:38 and 12:45 | ab61ade8b46d, 64415130ba2c | guide strip, `commit`, `buildNow`, `ensureMesh`; then `blankState`, `hasWork` |
| v3 | 12:58 | f69278a18443 | four numbered steps, welcome card, slot badges; despeckle at the full min-feature disc ate the full stop of hack.build, so the factor became 0.35 (`knowledge/designs/collar.md`, hygiene step 2) |
| v4 | 18:47 | e4dfe7144da6 | 127-key `FILAMENT_TEMPLATE`, `MATERIALS`, slicer profile fold |
| v5 | 19:25 | ef0864ab66ca | blank shapes, direct manipulation on the face boards, edge spots, cut-through layers; this file |

The sha256 lives in `sha256.txt` (M00), which every reader of this copy
checks; there is no `collar.html.sha256`.

## Public through release 1 (R1-rails-public-10)

Kept in git: `collar.html`, `README.md` and `sha256.txt`. The CI step
"legacy COLLAR dump reproduces the committed grids"
(`tools/legacy/collar-dump.mjs`), `tools/parity/collar`, the geom fill and
shapes tests and `packages/inlay/scripts/hygiene-fixtures.mjs` read the
page, and release 1 grades the COLLAR chase side by side with it
(`fab-knowledge:plan-v5/PLAN.md` 6, designs row). The folder holds no
slicer save, shot or print zip.
