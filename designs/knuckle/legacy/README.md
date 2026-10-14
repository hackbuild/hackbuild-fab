# KNUCKLE legacy copy

`knuckle.html` is the shipped KNUCKLE bench, kept byte identical as a
legacy adapter target of the BenchHook conformance suite (M09-T11,
M09-T12; D-128, D-142, D-156). Nothing here is edited; `shasum -a 256 -c
SHA256SUMS` checks it.

| field | value |
|---|---|
| copied from | `fab-knowledge:evidence/x/knuckle/knuckle.html` (harvest copy of 2026-10-04) |
| equal to | `fab-knowledge:originals/knuckle/files/knuckle.html` and `~/Downloads/knuckle.html` |
| source | chat build, no git; parts in `knuckle-src.zip`, stamped 2026-09-24 17:29 to 19:04 |
| file date | 2026-09-24 19:05 (mtime, `knowledge/designs/knuckle.md` section 1) |
| sha256 | c1cd25122127954b162df7925e0b85e0f044b120e01cc0f582776161d2c63c74 |
| bytes | 1102382 |
| record | `knowledge/designs/knuckle.md` |
| lineage rows | `knuckle.bench/knuckle-html` (canonical, the originals copy), `knuckle.bench/m09-legacy` (this copy) |

## Kernels it carries

The prism kernel `K` (no CSG), the art composer (`paintLayer`,
`composeZone`, `zoneBlock`), `derive`, the hinge, sweep check and bezel
builders, the laser bundle, earcut 2.2.4 and the print-forge
`rastermesh.js` and `orca3mf.js`, inlined with three.js r128, JSZip 3.10.1
and four fonts. The art composer needs a DOM canvas, so the kernel does
not run in node.

## Hook shape at load

Measured 2026-10-04 with the network off (M09 card, load table): ready
after 4.6 s; members `ready`, `build()`, `state()`, `model()`, `derive`,
`K`, `exportBytes`, `audit`; no `rev`, `built` or `busy`, so a harness
polls `!dirty && !building`; 0 requests off file and data, 0 workers, 0
console errors.

## Known unfixed defects

- scrollWidth 395 at 390 wide on the first view (measured), 768 and 1280
  at those widths. The overflow goes into the M09-T14 legacy report and is
  fixed when KNUCKLE is rebuilt from a chase at M10.
