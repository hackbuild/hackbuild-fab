# PIP legacy copy

`src/` is the kernel source of PIP (was HAFT) at hackbuild/pip-controller
commit b137deb (2026-09-19T01:12:56Z), kept byte identical as the original
of record for the copper router port in `packages/copper/src/route/`
(D-013, D-092, D-142, D-156). Nothing here is edited, and nothing in
hackbuild-fab edits pip-controller (D-080). `shasum -a 256 -c SHA256SUMS`
checks the copy; `tools/legacy/pip/dump-route.mjs` refuses to run when a
checkout's `src/` differs from it.

| field | value |
|---|---|
| copied from | `git show b137deb:src/<file>` in a scratch clone of `fab-knowledge:evidence/x/pip-controller` |
| equal to | `fab-knowledge:originals/pip/files/pip-controller/src/` file for file (compared 2026-10-08) |
| record | `knowledge/designs/pip.md` 5.6 (two layer router) |
| lineage rows | `router/pip-controller-b137deb` (canonical, `router.js`), `router/pip-controller-legacy` (this copy of `router.js`), `pip.layout/pip-controller-b137deb`, `pip.geom/pip-controller` |
| read by | `packages/copper/test/negotiated.test.ts` (sha256 of every file) |

## What the port reads, by line

| file | lines | port |
|---|---|---|
| `src/router.js` | 9 to 30, heap | `packages/copper/src/route/heap.ts` |
| `src/router.js` | 37 to 67, grid, stencil, static marks | `packages/copper/src/route/stencil.ts` |
| `src/router.js` | 68 and 74, pads 0.15 and 0.02 | profile constants `route.keepoutPad`, `route.zonePad` |
| `src/router.js` | 34 to 259, negotiated congestion | `packages/copper/src/route/negotiated.ts` |
| `src/layout.js` | 28, route defaults | `RouteSettings`, fixture input until M05-T10 |
| `src/layout.js` | 281 to 290, `L.inside` | `insideByMargin` in `stencil.ts` |
| `src/geom.js` | 146 to 151, `GEO.segDist` | `packages/geom/src/segment.ts` |
| `src/model.js` | 18 to 19, routing warnings | `UNROUTED` and `ROUTE_CONFLICT` in `negotiated.ts` |

## The route fixture

`packages/copper/test/fixtures/pip-b137deb-route.json` is PIP's own route of
its default layout, computed by PIP b137deb and written once by

    git clone <fab-knowledge>/evidence/x/pip-controller <scratch>
    git -C <scratch> checkout b137deb518229ea8910bfe85e6416d34cee353f3
    (cd <scratch> && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --ignore-scripts)
    node tools/legacy/pip/dump-route.mjs <scratch>

with manifold-3d 3.5.3 from that checkout's lock and node v22.18.0. The
same run writes `packages/copper/test/fixtures/pip-b137deb-sweep-route.json`,
PIP's route of the 40 designs its own sweep draws at seed 1 (`test/sweep.mjs`
lines 5 to 26). CI never runs pip-controller; it reads the committed
fixtures.

## Bench, baker and bake inputs (M09-T01)

The rest of this folder is the input of the M09 bake parity
(M09-T13: the manifest bake must reproduce `pip.html` byte for byte), the
ParamRail and notes fixtures (M09-T08, M09-T09), the drive pad (M09-T10)
and the hook conformance target (M09-T11, M09-T12). Each file was written
by `git show b137deb:<path>` from
`fab-knowledge:evidence/x/pip-controller`
(clean at b137deb518229ea8910bfe85e6416d34cee353f3, 2026-09-18T18:12:56-07:00)
and equals that checkout's working file.

| file | role | lineage row |
|---|---|---|
| `pip.html` | the baked bench, 1924558 bytes, sha256 a1fa88bd6ffa603c76059567c8b27c804536e39e7c07ec56c58daad55b001263; bake parity target, hook template | `pip.baked/pip-controller-b137deb` |
| `bench/part1.html` | bench shell: rail rows and groups, the 16 `.note` elements | `pip.bench-part1/pip-controller-legacy` |
| `bench/part2.js` | state, commit model, `schedule` debounce, `HIST` undo, the `BENCH` hook (line 405) | `catalog-src.pip.part2/pip-controller-legacy` |
| `bench/part3.js` | viewer, rail UI, drive pad, `data-show` rules, `BENCH.ready` | `pip.bench-part3/pip-controller-legacy` |
| `src/*.js` | the kernel (section above) | `pip.<file>/pip-controller-legacy`, `snapfe/pip-controller-legacy`, `router/pip-controller-legacy` |
| `vendor/manifold-classic.js` | manifold-3d as a classic script, inlined by the baker | `manifold-classic/pip-controller-b137deb` |
| `tools/build_bench.py` | the baker, seed of `tools/bake/` (D-129) | `pip.baker/pip-controller-b137deb` |
| `tools/rastermesh.js`, `tools/orca3mf.js` | print-forge kernels the baker inlines | `healer/pip-controller-legacy`, `orca3mf/pip-controller-legacy` |
| `build.sh`, `package.json`, `package-lock.json` | build entry and the pinned dependency set of the bake | `pip.build-sh`, `pip.package`, `pip.package-lock` (each `/pip-controller-b137deb`) |
| `test/smoke.py`, `test/overflow.py` | smoke pattern and overflow at three widths | `pip.smoke`, `pip.overflow` (each `/pip-controller-b137deb`) |
| `LICENSE` | pip-controller licence, kept with the copy | `pip.license/pip-controller-b137deb` |

Hook shape at load, measured 2026-10-04 with the network off (M09 card,
load table): ready after 0.7 s; getters `ready`, `state`, `model`, `rev`,
`built`, `busy`; methods `log`, `loadDesign`, `designJson`, `firmware`,
`wiringSvg`, `printCard`, `ensureMesh`, `commit`, `exportCoupon`,
`exportBytes`; scrollWidth 390, 768 and 1280 at those widths; 0 requests
off file and data, 0 workers, 0 console errors.

## Installing the bake inputs

`bake.json` names three.js, jszip and the four `@fontsource` faces as
`npm:` sources. The baker resolves them from `designs/pip/legacy/node_modules`,
which is ignored by git (103 MB, measured 2026-10-12) and absent on a fresh
checkout. Install it from the pinned `package-lock.json` before any bake:

    npm ci --prefix designs/pip/legacy

Without it `node tools/bake/bake.mjs` stops with "package three not
installed above designs/pip/legacy. run npm ci first." The CI jobs `bake`
and `bake-determinism` run this step after the root `npm ci`, and
`bake-determinism` deletes the folder between its two cold runs.
`designs/pip/test/legacy-install.test.ts` holds both jobs to it.

## The original of record and the shipped outputs (M10-T01)

`pip.html` above is the pip-controller b137deb page. PIP's bench of record
is `haft (9).html` (`knowledge/designs/pip.md` 1.1, INDEX.md): the two
descend from `haft (6)` and neither contains the other. HAFT (9) carries
every PIP UI behaviour and adds the fixes from handling the first printed
set (bezel lip, header socket contact, datum corner, grip ledge, anti-smear
slots, print bleed, pry scallops, socket fits); pip-controller carries the
firmware `GUARD_US 2000` fix, which haft (9) lacks (it ships
`KEY_WAIT_US 200`). M10-T01 step 5 copies the original into `original/`
and marks it canonical; the pip-controller page stays as a `copy` row
naming the firmware fix it carries, and every parity and UX parity test of
M10-T13 and M10-T14 runs against `original/haft.html`.

| file | copied from | sha256 (12) | bytes | lineage rows |
|---|---|---|---|---|
| `original/haft.html` | `fab-knowledge:originals/pip/files/haft.html` | 6c9717338b2e | 1932855 | `pip.baked/haft-9` (canonical); `pip.baked/pip-controller-b137deb` is now a copy |
| `original/haft-src.zip` | same folder | b7b9ca40f5e0 | 401201 | `pip.src-zip/haft-9` |
| `original/haft-design.json`, `haft-header-design.json` | same folder | per SHA256SUMS | | `pip.example-design/haft-9`, `pip.example-header/haft-9` |
| `original/haft.3mf`, `print-card.txt`, `haft-stick-card.txt`, `haft.ino`, `haft-wiring.svg`, `haft-coupon.zip` | same folder (bench outputs; `haft.ino` lacks `GUARD_US`) | per SHA256SUMS | | `pip.print-3mf`, `pip.print-card`, `pip.stick-card`, `pip.haft-ino`, `pip.wiring-svg`, `pip.coupon-zip` (each `/haft-9`) |
| `examples/pip-design.json`, `examples/pip-stick-design.json` | `fab-knowledge:evidence/x/pip-controller/examples/` | e36e1de1189f, e48065b8ae3a | 2971, 2971 | `pip.example-design/pip-controller-b137deb` (copy), `pip.example-stick/pip-controller-b137deb` |
| `print/pip.3mf`, `pip-stick.3mf`, `pip-stl.zip`, `print-card.txt`, `pip-wiring.svg`, `pip-coupon.zip` | `fab-knowledge:evidence/x/pip-controller/print/` | per SHA256SUMS | | `pip.print-3mf`, `pip.print-3mf-stick`, `pip.print-stl`, `pip.print-card`, `pip.wiring-svg`, `pip.coupon-zip` (each `/pip-controller-b137deb`) |
| `shots/` | `fab-knowledge:originals/pip/shots/` | per SHA256SUMS | | side by side review against the gold drive shots |

Sizes and hashes measured 2026-10-14. `pip-stick.3mf`, `pip-stl.zip` and
`pip-coupon.zip` are not in the originals set (the record copied
pip-controller without its large print blobs); the other pip-controller
files equal `originals/pip/files/pip-controller/`.

`original/haft.html` installs the same `BENCH` as `pip.html`
(haft-src `bench/part2.js` lines 394 to 417, export kinds 3mf, stl, card,
json, ino, svg, coupon); the adapter `pip-haft` is the PIP adapter at the
haft sha256. The record of UX is `knowledge/designs/pip.md` section 6.
