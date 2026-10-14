# TENON legacy copy

`tenon.html` is the shipped TENON bench, kept byte identical as a legacy
adapter target of the BenchHook conformance suite and the source of
`commitLight()` (M09-T03, M09-T11, M09-T12; D-128, D-142, D-156). Nothing
here is edited; `shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| copied from | `fab-knowledge:evidence/x/tenon/tenon.html` (harvest copy of 2026-10-04) |
| equal to | `fab-knowledge:originals/tenon/files/tenon.html` and `~/Downloads/tenon (14).html` |
| source | chat build, no git; parts in `tenon-src.zip`, part2.js and part3.js stamped 2026-09-29 17:38 and 17:54 |
| file date | 2026-09-29 17:59 (mtime, `knowledge/designs/tenon.md` section 1) |
| sha256 | 37fee2f32d1adda1e1cd999d3d75086bd83bfe4a41c1eaea75add359a4dd4713 |
| bytes | 1028369 |
| record | `knowledge/designs/tenon.md` |
| lineage rows | `tenon.bench/tenon-html` (canonical, the originals copy), `tenon.bench/m09-legacy` (this copy); the kernel is `tenon.kernel/part2` |

## Kernels it carries

The DOM free revolve kernel with radial feature fields (part2.js: state,
profile, feature fields, revolve, parts, build, plate, fit, mass), the
viewer and UI (part3.js) and the print-forge `orca3mf.js`, inlined with
three.js r128, JSZip and five font faces. It opens from `file://` with no
network.

## Hook shape at load

Measured 2026-10-04 with the network off (M09 card, load table): ready
after 5.6 s; members `ready`, `getState`, `setState`, `build`, `rebuild`,
`state()`, `model()`, `derive`, `blankState`, `presetState` and 15 more;
scrollWidth 390, 768 and 1280 at those widths; 0 requests off file and
data, 0 workers, 0 console errors.
