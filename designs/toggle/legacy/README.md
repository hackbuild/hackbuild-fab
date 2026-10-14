# TOGGLE legacy copy

`toggle.html` is the shipped TOGGLE bench, kept byte identical as a legacy
adapter target of the BenchHook conformance suite (M09-T11, M09-T12;
D-128, D-142, D-156). Nothing here is edited; `shasum -a 256 -c SHA256SUMS`
checks it.

| field | value |
|---|---|
| copied from | `fab-knowledge:evidence/x/toggle/toggle.html` (harvest copy of 2026-10-04) |
| equal to | `fab-knowledge:originals/toggle/files/toggle.html` and `~/Downloads/toggle.html` |
| source | chat build, no git; parts in `toggle-src.zip`, stamped 2026-09-15 15:54 to 16:53 |
| file date | 2026-09-15 18:10 (mtime, `knowledge/designs/toggle.md` section 1) |
| sha256 | 865fabfd703dad5c7fefdd1adcb21be715356e3fa1e5d202f986ca4ab9a1977b |
| bytes | 1046843 |
| record | `knowledge/designs/toggle.md` |
| lineage rows | `toggle.bench/toggle-html` (canonical, the originals copy), `toggle.bench/m09-legacy` (this copy) |

## Kernels it carries

The DOM free TOGGLE kernel (part2a to part2e: lathe, solver, Manhattan
router, build, healer), the shell (part3, part4: state, history, viewer,
drive pad, rail, exports) and the print-forge `rastermesh.js` and
`orca3mf.js`, inlined with three.js r128, JSZip 3.10.1 and four fonts. It
opens from `file://` with no network.

## Hook shape at load

Measured 2026-10-04 with the network off (M09 card, load table): ready
after 3.7 s; members `ready`, `model()`, `state()`, `geom()`, `setTilt`,
`set`, `exportBytes`; scrollWidth 390, 768 and 1280 at those widths; 0
requests off file and data, 0 workers, 0 console errors.
