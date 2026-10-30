# @hackbuild/inlay

Art to discrete flush inlay bodies with exact boundaries and enforced
printability. Tier 1, private (D-036); milestone M03 (PACKAGES.md 5.7).

Built: M03, staged, not released.

## Owns

- The intake stage: rectify by homography, glare stack reducers, key-colour
  cut, content bounds (M03-T02, ported from badge-replicator `src/lib`).
- Quantize: palette match, mono threshold, silhouette, Otsu (M03-T03).
- Layer rendering through an injected `Surface`: text with pipe split and
  runGap, rings, shapes, images (M03-T04).
- Hygiene as named recipes, despeckle at 0.35 of a min-feature disc
  (M03-T05).
- Split into slot bodies with role `art`, bed-face mirroring (M03-T06).
- The opacity rule, read from profile (M03-T07).
- The `inlay` FeatureKindDef and CHK-INL-01 to 04 (M03-T08).
- BAIL's layer kinds, from the owner's BAIL bench (plan v11 section 4.3 step a,
  lineage `bail.bench/*`): shape in 13 kinds, scope, seeded circuit and logo
  painters that test cell centres and need no Surface (logo uses
  `Surface.fillPath`), a marks registry (hack.build, HeatSync Labs), text with
  letter spacing and anchored arcs, and `lowerArtDocument`, which turns an art
  document of `spec/art.ts` into the layers a face composes. Reference
  `cosmetic/art-layers`. Image and relief layers and pocket cuts are typed in
  the document and refused by the lowering.

No DOM, no canvas and no `ImageData` constructor (D-045). Text, images and
SVG reach the package through the `Surface` interface; bench-core supplies the
canvas surface and geom a vector surface for node, which sets text in the
vendored IBM Plex Mono 400 and 700 (`packages/geom/src/text`, OK-01).

## May import

spec, profile, geom, mesh (D-044, `tools/tiers.json`). Every physical
number comes from profile with its provenance.

## Parity target

COLLAR v5, the art pipeline of record (`knowledge/designs/collar.md`
sections 4.4 and 4.5): compose, text with pipe split and runGap, hygiene,
cell for cell at res 512. SPRUE for its own recipe, Otsu and thin flags
(M03-T10). Sources and hashes are rows in the root `lineage.json`:
`collar.*`, `sprue.*`, `inlay.*`, `sash.smoke` and `knowledge.*`.

## Hygiene recipes

Three copies disagree on structuring element and boundary rule. All three
are kept as named recipes (M03-T05); none is a fix of another, and each
starts from a canonical row of `lineage.json`. COLLAR and SPRUE use their
bench rows, since a byte-equal harvest copy already sits under each bench
subject. `test/lineage.test.ts` holds this table equal to `lineage.json`.

| recipe | lineage id | sha256 | structuring element | out-of-grid cells in erosion |
|---|---|---|---|---|
| collar-v5 | collar.bench/collar-7 | ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46 | separable square box (collar.html:942 to 967) | no erosion step; art clipped to the R_art circle (collar.html:1183 to 1192) |
| print-forge | inlay.hygiene-print-forge/mesh-seed | 390736e35f58a901c4651f630490520c5828e3ba9ec747b97fd39483b2eb130c | disc `dx^2 + dy^2 <= r^2 + 0.25` (rastermesh.js:312 to 334) | count as not-slot, so the border erodes |
| sprue | sprue.bench/sprue-html | a1acb293ad96c7dd5062a9e65741a7f27959584dfb10e64decb41468c59e4fe7 | disc rows of half width `floor(sqrt(r^2 - dy^2))` (sprue.html:294 to 321) | erosion is not-dilate-not, so the border does not erode |

## What is verified, and what is not

### Verified on this machine

- 2026-10-30: `npx vitest run packages/inlay spec packages/chase` passes, 762
  tests in 40 files (measured), with the BAIL layer kinds in
  `test/bail-layers.test.ts` (shape in 13 kinds, scope, circuit, logo, text
  with letter spacing, each held to determinism, bounds, slot assignment and
  to the cells of BAIL's own canvas, within 2 percent on shapes, scope and
  logo and 8 percent on the circuit parts, circuitOf equal node for node on 5
  seeds), `test/marks.test.ts`, `test/art-lower.test.ts` and
  `test/art-layers.test.ts` (reference `cosmetic/art-layers`, goldens equal).
  A mutant that moved the circuit seed to `seed * 9973 + 18` failed 5 tests
  and was restored.
- 2026-10-14: `npx vitest run` in packages/inlay passes, 274 tests and 1 skipped in 15
  files (measured), with `test/text-coin.test.ts` building coin-inlay with initials.
- 2026-10-13: `npm test -w packages/inlay` passes, 270 tests and 1 skipped in 14 files
  (measured).
- M03, 2026-10-08: COLLAR parity at res 512 through `tools/py/harness/collar_parity.py`
  (Playwright 1.63.0, system Chrome 150) found 0 differing cells on the
  front and 0 on the back, and slot volumes 3.5956, 0.5322 and 1.0258 cm3
  equal to v5 `buildMesh` in the same run (computed). SPRUE parity found 0
  differing cells (computed). The three hygiene recipes match their
  sources cell for cell (computed).

### Measured on a printed body

None. No inlay body from this package has been printed.

### Checked by machine on geometry

CHK-INL-01 to 04 run on every body the `inlay` kind builds; `reference/cosmetic/coin-inlay`
covers them.

### Not verified by anything

- A person looking at the renders (M03-T14); the COLLAR render shows the
  blank only.
- Art reaching `part.build` (M03-T09 step 6, D-178).
- `validate_3mf.py --overlap` on an art coin, and `export.run` at a TTY for
  coin-inlay.

## Licence

MIT. The GPL tracers that D-043 and LICENSING.md section 2.4 exclude stay
out of this package and its lockfile closure (C-11). The vtracer
1.0.0-alpha.4 evaluation ran at M03-T11 with the verdict keep evaluating at
the next vtracer release; nothing under `packages/` imports it and the
in-house quantize stays the default (D-145,
`docs/evaluations/vtracer-1.0.0-alpha.4.md`). `test/licence.test.ts` reads the excluded names from LICENSING.md
and fails on any of them, or on any GPL or AGPL licence field, in the
closure. The closure holds LGPL members (sharp's libvips, reached through
manifold-3d); they pass only while their `tools/licences.json` row loads
as a lazy separate file, the rule `tools/licences.mjs` applies.

## Extraction

D-028: extract to hackbuild/hackbuild-inlay when COLLAR and SPRUE both build
on this package in hackbuild-fab and the M03 parity passes (M03-T13).
