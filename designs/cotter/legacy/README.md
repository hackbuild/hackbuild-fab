# COTTER legacy copy

The COTTER insertion proof and the first kit's layout, kept byte identical
as the inputs of M02-T09 (D-142, D-156). Nothing here is edited;
`shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/cotter.md` (section 5.3) |
| phase | 5, after the plan (2026-09-24; `syn/patterns-and-lineage.md` section 1) |
| copied from | `fab-knowledge:evidence/x/cotter-src/tools/hook_fit.py` into `tools/`, byte identical to `originals/cotter/files/cotter-src/tools/hook_fit.py` |
| kernel | `search()` at `tools/hook_fit.py` line 44, best-first search over the configuration space of a rigid section passing a hole |
| lineage rows | `cotter.hook-fit/r5` (canonical), `cotter.hook-fit/m02-legacy` (this copy), `cotter.hook-fit/evidence-x`. `search()` stays under the `cotter.hook-fit` subject: a new subject would make this file canonical there while it is a copy under `cotter.hook-fit`, which `tools/test/lineage.test.mjs` refuses |

## Kit layout

`kit-2026-09-21/layout.json` is the layout of COTTER's first kit, copied
byte identical from
`fab-knowledge:evidence/x/downloads/dl-pip-latest/cotter/unzipped/cotter-kit_today_2026-09-21/layout.json`
(lineage `cotter.kit-layout/2026-09-21`). M02-T09 reads `state.board.hole`
and `state.board.tb` from it for the eighth insertion case
(`packages/sim/scenes/cotter-hook.ts`).

## Kernels

Consumed: shapely (imported at module level), the closed-form hook rule of
`geo.js` that `design()` mirrors.

Introduced: the insertion proof by search (`search()`, `verify`), which
proves or refuses the closed form for the sizes that matter.

## Known unfixed defects

- `hook_fit.py` imports shapely at module level, so `design()` cannot be
  imported without it (`packages/constraints/test/legacy/hook-rule.py`).
- None other is recorded for this file in `knowledge/designs/cotter.md`.

## DXF writer and audit (M07-T01)

`kit.js` (`KIT.laserDXF` at line 32), `dxf_template.json` (the ezdxf-made
AC1024 skeleton it fills) and `audit_dxf.py` are copied byte identical
from `fab-knowledge:evidence/x/cotter-src/`
(`src/kit.js`, `assets/dxf_template.json`, `tools/audit_dxf.py`), each
equal to `originals/cotter/files/cotter-src/`. They are the inputs of
M07-T06 (lineage `cotter.kit/m07-legacy`, `cotter.audit-dxf/m07-legacy`,
`cotter.dxf-template/r5`).

- `audit_dxf.py` reads `e.closed` before it checks the entity type, so it
  crashes with AttributeError on a POLYLINE file (the SLUG sheets) before
  any verdict; M07-T06 ports and fixes it.

## Baked bench and baker (M09-T01)

`cotter.html` is COTTER r5, copied byte identical from
`fab-work-directory:cotter (5).html`
(renamed; 2026-09-24 16:19 mtime, 2135323 bytes, sha256
9067ce3e7b0862579168b8f2e1ffdb89e44d4ddacb94b40c38c2af7614b38ffc), equal to
`originals/cotter/files/cotter-r5.html`. It is a legacy adapter target of
the BenchHook conformance suite (M09-T11, M09-T12). Lineage rows
`cotter.bench/r5` (canonical) and `cotter.bench/m09-legacy` (this copy).

Hook shape at load, measured 2026-10-04 with the network off (M09 card,
load table): ready after 3.3 s; members `ready`, `state()`, `idle`,
`waitIdle`, `bom`, `plates`, `loadTemplate`, `designJson`, `loadDesign`,
`exportBytes`, `view`, `addItem`; scrollWidth 390, 768 and 1280 at those
widths; 0 requests off file and data, 0 workers, 0 console errors.

The COTTER baker stays outside the repo: its dash assert (line 24) names
the em and en dash it refuses as escapes, which lint-voice blocks in any
repo file, and the bytes cannot change (D-142). M09-T13 ports its features
into `tools/bake/` from
`fab-knowledge:originals/cotter/files/cotter-src/tools/build.py`
(sha256 434d8b1bc493ed09fa48a1f4579fd258d907cbf0dc382e3ea1cc4d484eb764bf,
equal to the `evidence/x/cotter-src/tools/build.py` copy): manifold ESM
turned into a classic script, base64 wasm, base64 woff2 fonts, the dash
assert and the exactly-one-match replace asserts. Lineage rows
`cotter.baker/r5` (canonical) and `cotter.baker/evidence-x`.

## Held in the originals (R1-rails-public-11)

The copies `SHA256SUMS` lists, except `cotter.html`, are held out of git
(D-286, PLAN.md section 5). `cotter.html` stays: the smoke job's legacy
report measures it (`tools/smoke/legacy-report.spec.ts`). Each held
copy's archive id is its `where: private` row in
`tools/legacy/inventory.json`: the original when `fab-knowledge:originals`
holds the same bytes, else `fab-knowledge:originals/_legacy/<repo path>`.
`shasum -a 256 -c SHA256SUMS` checks a restored copy. A file this README
names above is that held copy.
