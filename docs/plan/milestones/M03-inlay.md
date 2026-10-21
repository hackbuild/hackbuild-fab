# M03 inlay

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: COLLAR v5 art pipeline on shared kernels. Art in (photo, raster,
vector, live text), flush inlay bodies out, with the print-reality hygiene
that decides whether the art prints, the `inlay` feature kind admitted with
its checks and reference, and a face editor that a harness drives.
Depends on: M00
Adopted dependency: vtracer 1.0.0-alpha.4, evaluation only (MILESTONES.md
1.2); nothing enters `packages/inlay` until M03-T11 writes a verdict
Commands added: none (MILESTONES.md 1.3 has no M03 row); the cards use
part.build, part.inspect, check.run and view.render from M00
Release at exit: hackbuild-inlay extraction check (D-028); extract only when
COLLAR and SPRUE both build on the package and parity passes

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document. PIP (was HAFT) is the published
print-in-place controller at hackbuild/pip-controller (D-013). Every number
in this file carries a qualifier (measured, computed, vendor, inferred,
unknown) and a source (D-007). Numbers marked "computed, this card" were
recomputed on 2026-10-04 from the named source file; the port reproduces
them and the golden records what the port computes. Repo paths are relative
to the hackbuild-fab root; evidence paths are absolute.

## What this milestone decides and carries

| item | decision or correction | where in this file |
|---|---|---|
| `inlay` is a feature kind with generator, checks, fit `none` and reference | D-058, D-059 | M03-T08 |
| potrace stays out of every MIT package | D-043, D-145, C-11 | M03-T01, M03-T11 |
| vtracer 1.0.0-alpha.4 evaluated against the in-house quantize, verdict written | D-145, C-11 | M03-T11 |
| intake stage ported from badge-replicator `src/lib` | D-145, plan-deltas R63 | M03-T02 |
| despeckle at 0.35 of a min-feature disc | D-145 | M03-T05 |
| light over dark needs 1.2 mm; dark over light hides in two layers | D-145 | M03-T07 |
| bed-face art mirrored in X at extrude | D-063 (mirrorOnFlip) | M03-T06 |
| inlay bodies are multi-body parts with role `art` | D-047, D-048 | M03-T06, M03-T08 |
| headless kernels; text and images reach the kernel through an injected surface | D-045 | M03-T03, M03-T04 |
| ports start from the most refined copy, recorded in lineage.json | D-156 | every port card |
| hackbuild-inlay extraction trigger | D-028, D-036, D-037 (owner) | M03-T13 |
| art board controller lives in ui-core (tier 3) | D-044 | M03-T12 |
| seeded CHK-INL origins corrected | D-066 | M03-T08 |
| COLLAR NFC pocket recorded as a pause fixture; the 0.24 card is the off-grid case | D-062, D-007 | M03-T09 step 7 |
| Sep 19 reeded coin recorded as the newest COLLAR reference, informational only | D-007, D-153 | M03-T09 step 8 |

Detail on the inlay checks lives in ../CHECKS.md; the opacity rows in
../PROFILE.md; the package boundary in ../PACKAGES.md and
../ARCHITECTURE.md; licences in ../LICENSING.md. This file holds what a
builder runs.

## Evidence roots

| short | absolute path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| syn | `fab-knowledge:synthesis/` |
| corpus | `fab-work-directory:` |
| repos | `hackbuild/` |

Cards write evidence paths in full.

## Legacy sources and their hashes

Every port card records these in `lineage.json` before code is written
(D-156). Hashes are sha256, measured on 2026-10-04.

| source | role | absolute path | sha256 |
|---|---|---|---|
| COLLAR v5 bench | parity target for compose, text, hygiene | fab-work-directory:benches/collar-coin/outputs/collar/collar.html | ef0864ab66ca40e2930d12aba4cab3159aa470f743eee533d052fc99f844fd46 |
| COLLAR example export | per-slot volume target | fab-work-directory:benches/collar-coin/outputs/collar/example-hackbuild-coin.3mf | 922e43109c4ceeada265cda661a5280ffc7e03c1b3767a9fae71e5e64e2c31b4 |
| COLLAR owner print card, Aug 19 | NFC pocket pause fixture at 0.20 layers | fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-print-card.txt | 619d471ec14974766f9a5706ef7f506fb48227734e92103f74e230d4c4244134 |
| COLLAR owner print card, Aug 30 | NFC pocket pause fixture at 0.24 layers | fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-print-card (1).txt | 23b7d19d80e18ccf77cb330b74739d5b06a2216b8487d56dde022386ebd36c08 |
| COLLAR reeded coin, Sep 19 | newest COLLAR reference, informational volumes (`Metadata/collar_print_card.txt`) | fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-coin-44mm (8).3mf | 71c3629d716d8f2290d347136e867f5b6c5d1ca3dd819153ea9a5ce451447fec |
| SPRUE bench | parity target for the sprue recipe, Otsu, thin flags | fab-work-directory:benches/sprue/outputs/sprue/sprue.html | a1acb293ad96c7dd5062a9e65741a7f27959584dfb10e64decb41468c59e4fe7 |
| SPRUE generator | built-in art, print card | fab-work-directory:benches/sprue/outputs/sprue/sprue.py | 1c2f22a66394abff83774c9dbcac2c0c5766959cbc22564c362530b7b8c5da4b |
| rastermesh seed | print-forge hygiene helpers | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mesh/rastermesh.js | a99a159b91c9d392987b22393f04caf035762fe5301013c601c6e5f3a6697fe0 |
| badge-replicator homography | intake rectify | badge-replicator/src/lib/homography.ts | 4ed2bde48f11bf561d5746293b9e5f9905566b5df7b8e6f5de1be95152e3aeb6 |
| badge-replicator stack | intake glare reducers | badge-replicator/src/lib/stack.ts | 1ad36175f59991d58cbd640675da03f35974668ecf4bbdceb3b9ab2d0ad4d60f |
| badge-replicator knockout | intake key cut, content bounds | badge-replicator/src/lib/knockout.ts | 44afaeaf8a03ffbbafa92a5916ac263a1af7e81f91bd65bf0de879b60e1c43df |
| KNUCKLE face editor | most refined handle set (part6.js lines 402 to 560) | fab-knowledge:evidence/x/knuckle/knuckle-src.zip, member part6.js | zip 76098e29ab79bb32d0aef58ab155a09727b7277c76531e779c1469d8671527e2; part6.js 7ccd08dd86fb3dbf936ac47cda01fb210168e3690198771b07a9ac3024cc7a8a |
| SASH smoke harness | existing Playwright handle drive (lines 49 to 87) | fab-knowledge:evidence/x/benches-coins-inlay/sash-src/smoke.py | 2ddcfbfd16180501a2b98f4047e788dd120d98f45c76753154e892e673c1212d |
| art-inlay kernel record | acceptance bar for the face editor | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/art-inlay.md | 84334a01df5344cf3b5c669cf72a0542cd8c7c5c956ea4c3237c3b9a2fbcc800 |
| print-reality | opacity and min-feature rules | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/references/print-forge/print-reality.md lines 20 to 38 | 4b042b60c3f0f3ad1553a2a3d381923e2d93a59ff23e0611c329ec5420e24b49 |
| bench notes | every algorithm and constant below | fab-knowledge:sources/benches/benches-coins-inlay.md sections 1.3, 2, 7.1, 7.2, 8, 10 | n/a |

## Package placement

| package | tier | M03 adds | may import |
|---|---|---|---|
| inlay | 1 | intake, quantize, text layout, hygiene recipes, label grids, split into slot bodies, opacity rule, the `inlay` FeatureKindDef and its four checks | spec, profile, geom, mesh (D-044) |
| geom | 0 | even-odd polygon scanline fill, SVG path flattening for the mark paths, shape SDFs from COLLAR, mask trace to loops (SPRUE `trace`, `simplify`, `group`) | spec |
| profile | 0 | opacity rows and the min-feature row with provenance | spec |
| ui-core | 3 | the art board controller and the canvas `Surface` | spec, every lower tier |

`packages/inlay` imports no DOM, no `ImageData` constructor, no canvas
(D-045). Text, images and SVG reach it through the `Surface` interface in
M03-T04; ui-core supplies the canvas surface, geom supplies a vector
surface for node. The browser parity in M03-T09 and M03-T10 runs the same
inlay code in Chromium with the canvas surface.

---

## M03-T01 inlay package skeleton, lineage and the potrace exclusion

Goal: `packages/inlay` exists as a private tier 1 package with its lineage
recorded and no copyleft dependency.

Inputs:
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/packages/inlay/ (README, package.json, src/index.ts)
- every path in "Legacy sources and their hashes" above
- tools/tiers.json, tools/lint-voice.mjs, lineage.json (from M-1 and M00)

Steps:
1. Create `packages/inlay/package.json`: name `@hackbuild/inlay`, private
   true (D-036), type module, MIT, author Moheeb Zara
   <hackbuildvideo@gmail.com>, workspace dependencies on spec, profile,
   geom, mesh only. Exports point at `dist` (D-036 pack rules).
2. Rewrite the scaffold README: drop "vtracer + potrace in"; state owns,
   may import, parity target and the D-028 trigger. potrace and
   esm-potrace-wasm 0.5.1 are GPL-2.0-or-later and GPL-2.0 (D-043, C-11).
3. Compute sha256 for every row marked "recorded by M03-T01" and add one
   `lineage.json` entry per kernel: canonical file, copies, fixes carried.
   The hygiene entry names three copies that disagree on structuring
   element and boundary policy (COLLAR box, rastermesh disc, SPRUE disc);
   all three are kept as named recipes in M03-T05, none is "fixed".
4. Add `inlay` to `tools/tiers.json` at tier 1 with the import list above
   and `ui-core` at tier 3.
5. Add a licence test: `packages/inlay` and its lockfile closure contain no
   package whose licence field matches `GPL` or `AGPL`.

Files to create:
- packages/inlay/package.json
- packages/inlay/tsconfig.json
- packages/inlay/README.md
- packages/inlay/src/index.ts
- packages/inlay/test/licence.test.ts
- lineage.json (rows for collar compose, sprue compose, rastermesh hygiene, badge-replicator intake, knuckle face editor)

Acceptance:
- `node tools/tiers.mjs` exits 0.
- `npm test -w packages/inlay -- licence` exits 0.
- `grep -rn "potrace" packages/` returns nothing.
- `node tools/lint-voice.mjs packages/inlay` exits 0.

Done when: the package builds empty, its lineage rows carry hashes, and CI
tiers and house-rules jobs are green.

Card defects found at build, 2026-10-06, and what was built:

1. Step 2 asks the README to name the excluded tracer packages, but the
   third acceptance line requires that a grep of `packages/` for the
   tracer's name return nothing. The README cites D-043, C-11 and
   LICENSING.md section 2.4 instead, and `test/licence.test.ts` reads the
   excluded names from that table at run time.
2. Step 3 asks for one hygiene entry naming three copies, and the card
   table says the plain "recorded by M03-T01" for seven rows. Two lineage
   rules make one hygiene subject impossible: one canonical row per
   subject, and a file that is a copy under one subject is canonical under
   no other (`tools/test/lineage.test.mjs`). `collar.bench/harvest` already
   lists `collar.html` as a copy, so no new subject can start from it. The
   three recipes start from three canonical rows: `collar.bench/collar-7`
   (which now carries the pipe split and runGap fix and the 0.35 despeckle
   fix), `inlay.hygiene-print-forge/mesh-seed` and `sprue.bench/sprue-html`.
   The table in `packages/inlay/README.md` maps recipe to row and a test
   holds it equal. The seven hashes are now in the table above.
3. The print-forge recipe starts from `packages/mesh/seed/rastermesh.js`.
   The hbf seed the M03-T05 inputs name is a `healer` copy row, so it
   cannot be canonical. The helper block (`stamp` to `mirrorX`, lines 289
   to 367 there, 271 to 349 in the seed) has one sha256 across the repo
   seed and all four other copies (measured, prefix 162e81034434), so
   nothing is lost. The hbf seed is a copy row of the new subject.
4. The card names KNUCKLE `part6.js` as the most refined face editor, and
   `knowledge/designs/MECHANISMS.md` names `collar.html` lines 2002 to 2062
   for the same mechanism. Lineage follows the card. KNUCKLE adds four
   corners, centre and angle snaps, and wheel zoom about the pointer
   (`part6.js`:405 to 547), and COLLAR has one corner, no snap and no zoom
   (`collar.md` section 4.12). M03-T12 settles the MECHANISMS.md row.
5. The repo `knowledge/kernels/art-inlay.md` differs from the hbf copy the
   table hashes at line 104 only, a voice rewrite with the same
   requirement. The repo copy is the canonical row and the hbf copy a copy
   row.
6. Step 4 found `inlay` at tier 1 and `ui-core` at tier 3 in
   `tools/tiers.json` already (M-1-T12); nothing changed there.
7. Step 5 says "matches GPL or AGPL". The inlay closure reaches LGPL
   members through manifold-3d (sharp and its libvips, 14 `@img` rows with an
   LGPL audited value in `tools/licences.json`, counted 2026-10-06). The
   test applies the `tools/licences.mjs` rule:
   GPL or AGPL at a word boundary fails, an LGPL row passes only when it
   loads as a lazy separate file, and a published dual licence passes only
   when its audited row elects a licence outside the rule.
8. The table holds 16 sources (counted), with 16 hashes once the KNUCKLE
   row's two are counted and the bench notes row's n/a is left out.

## M03-T02 Intake stage: rectify, reject glare, key cut, trim

Goal: a photo or a model-returned plate becomes a flat RGBA source before
quantize, using badge-replicator's kernels ported as is.

Inputs:
- badge-replicator/src/lib/homography.ts (116 lines)
- badge-replicator/src/lib/stack.ts (122 lines)
- badge-replicator/src/lib/knockout.ts (186 lines)
- badge-replicator/src/lib/types.ts lines 109 to 147 (KnockoutOptions, StackOptions)
- fab-knowledge:sources/repos/other-projects.md section 1 (kernels, exact)
- fab-knowledge:synthesis/plan-deltas.md R63

Steps:
1. Define `RgbaImage {width, height, data: Uint8ClampedArray}` in
   `packages/inlay/src/intake/image.ts`. It is structurally compatible with
   ImageData, so a browser caller passes ImageData directly; the kernel
   never calls `new ImageData`.
2. Port `homography.ts`: `solveHomography(src[4], dst[4])` builds the 8x8
   DLT system with h33 pinned to 1, rows `[x, y, 1, 0, 0, 0, -x*X, -y*X] =
   X` and `[0, 0, 0, x, y, 1, -x*Y, -y*Y] = Y`, throws unless exactly four
   pairs; `gaussianSolve` is Gauss-Jordan with partial pivoting and a zero
   pivot replaced by 1e-12; `warpToRect` inverse-maps the destination
   rectangle to the marked corners with bilinear sampling per channel,
   alpha 255, out-of-source pixels black and opaque; `suggestSize` caps the
   long edge at 1600 with a floor of 64 per side.
3. Port `stack.ts`: `createReducer` with methods median (default),
   percentile (clamped 1 to 50), min, mean, trimmed (fraction clamped 0 to
   0.45); `stackLayers` keeps the row chunk of `max(1, floor(40000 /
   width))` rows and the `setTimeout(0)` yield between chunks, reporting
   progress 0 to 1. Default options `{method: 'median', percentile: 25,
   trim: 0.25}`.
4. Port `knockout.ts`: `knockoutKey` (Euclidean RGB distance, alpha =
   min(existing, ramp)), `knockoutEdges` (flood from all four frame edges
   with an Int32Array stack, join within tol plus soft), `sampleBorder`
   (15-bit histogram of border pixels, ignores alpha under 8, fallback
   magenta), `contentBounds(img, alphaFloor = 8)`, `applyKnockout`,
   `defaultKnockout()` = mode key, key [255, 0, 255], tolerance 70,
   softness 30, trim true. `alphaFor(d, tol, soft)` returns 0 at d <= tol,
   255 at soft <= 0 or d >= tol + soft, `round((d - tol) / soft * 255)`
   between.
5. Keep arithmetic order. Where `noUncheckedIndexedAccess` rejects an index
   read, use a local accessor that throws on out-of-range; outputs stay
   byte-identical to the source functions.
6. Compose the stage as `intake(shots, corners, opts)`: warp each shot,
   reduce the stack, apply the knockout, trim to content bounds when
   `trim` is true. Each step is optional and reported in the result.
7. The PR body asks the owner to confirm MIT for the three ported files:
   badge-replicator has no LICENSE file; its one commit (9fdfb50) is the
   owner's.

Files to create:
- packages/inlay/src/intake/image.ts
- packages/inlay/src/intake/homography.ts
- packages/inlay/src/intake/stack.ts
- packages/inlay/src/intake/knockout.ts
- packages/inlay/src/intake/index.ts
- packages/inlay/src/intake/intake.test.ts

Acceptance (`npm test -w packages/inlay -- intake` exits 0 with these
asserted):
- Homography from the unit square (0,0), (1,0), (1,1), (0,1) to (10,20),
  (110,25), (105,130), (5,120): coefficients h11 to h32 equal
  94.786730, -5.011848, 10, 3.815166, 99.715640, 20, -0.047393, -0.002370
  to 1e-6, and the centre (0.5, 0.5) maps to (56.287971, 73.596598) to
  1e-6 (computed, this card, exact rational solve).
- Three pairs throw.
- Median of [10, 200, 12] is 12; median of [10, 200, 12, 14] is 13;
  percentile 25 of [1..9] picks index round(0.25 x 8) = 2, value 3;
  trimmed 0.25 of [1, 2, 3, 100] is 2.5 (computed from the source rules).
- `defaultKnockout()` deep-equals {mode 'key', key [255, 0, 255],
  tolerance 70, softness 30, trim true}.
- Knockout alpha at distance 70 is 0, at 85 is 128, at 100 is 255
  (computed: round(15 / 30 x 255) = 128).
- `contentBounds` uses alpha floor 8: a 4 x 4 image with one pixel at alpha
  8 returns a 1 x 1 box; at alpha 7 returns null.
- A key-coloured shape fully enclosed by art survives `knockoutEdges` and
  is cut by `knockoutKey`.
- `grep -rn "document\|window\|new ImageData" packages/inlay/src` returns
  nothing.

Done when: intake runs in node on fixture arrays with the published
defaults and its tests are green.

Card defects found at build, 2026-10-06, and what was built:

1. The file list puts the test at `src/intake/intake.test.ts`. The root
   vitest include reads `packages/*/test/**` and `tsc -b` would compile a
   test under `src` into `dist`, so the test is `test/intake.test.ts`. Byte
   parity uses `test/fixtures/intake-cases.ts` (one runner for both sides)
   and `test/fixtures/intake-golden.json`, which
   `scripts/intake-golden.mjs` writes by running the badge-replicator
   originals under Node 22.18 type stripping; it refuses when a source
   sha256 differs from its lineage row. 23 cases (counted) cover warp,
   suggestSize, every reducer and clamp, the chunked stack and its
   progress, key, edges and none knockout, sampleBorder, contentBounds and
   the composed stage.
2. Step 6 leaves two source behaviours unstated. runComposite resamples an
   unmarked shot with a canvas; the kernel cannot (D-045), so an unmarked
   shot whose size differs from the output is E_SCHEMA and the caller's
   Surface resamples it. extract.ts never stacks a single plate, so the
   stage stacks only two or more layers and keeps a single shot's alpha.
   The output size follows capture.ts: options, else suggestSize of the
   first marked shot, else the first shot's size.
3. Step 5: the checked accessor throws E_KERNEL where the source would
   read past an array and return NaN (a reducer called with count 0). No
   input the source accepts reaches it; the golden holds the bytes equal.
4. The port reads five files the table does not list: `lib/types.ts`,
   `lib/units.ts` (clamp), `lib/composite.ts` (compose order),
   `stores/capture.ts` line 34 (stack defaults) and `stores/extract.ts`
   lines 185 to 194 (trim crop). Each has a canonical `inlay.intake-*`
   row with its dest; the three table rows now carry their dest.
5. pickColor, toHex and fromHex in knockout.ts are eyedropper helpers for
   the ui and are not ported to the kernel (tier 3, M03-T12).
6. Step 7 is open: no PR exists (D-006). The PR body must still ask the
   owner to confirm MIT for homography.ts, stack.ts and knockout.ts.
7. Written back 2026-10-08 (audit, packages/inlay lens): the card carried
   neither D-166 nor the 8192 px per side raster limit of ARCHITECTURE.md
   11.1. As built, `RASTER_MAX_SIDE` lives in `src/intake/image.ts` with
   `checkImage` and `checkSide`, and every allocating intake entry refuses
   a larger side with E_SCHEMA, record `inlay-intake/raster-size`. The
   golden case `stack.chunked` moved from 9000 to 8192 px wide and the
   golden was regenerated from the originals. The SVG document sanitiser
   D-166 placed here moves to M05 and M09 (D-240): M03 reads path data
   strings only. Added acceptance: `npx vitest run
   packages/inlay/test/raster-limit.test.ts` exits 0 (a side of 8193 px is
   E_SCHEMA on every allocating entry, 8192 passes), and the property fuzz
   `packages/inlay/test/raster.fuzz.prop.test.ts` (FC_RUNS 2000 in the
   nightly job, ../TESTING.md 4.2.1) refuses every oversize side without
   allocating it.

## M03-T03 Quantize: palette match, mono threshold, silhouette, Otsu

Goal: an RGBA source becomes a slot label grid in one of the three colour
modes, with Otsu and the dark-background flip as the default for dropped
art.

Inputs:
- fab-work-directory:benches/collar-coin/outputs/collar/collar.html lines 1088 to 1123 (palette and mono in `renderLayer`)
- fab-work-directory:benches/sprue/outputs/sprue/sprue.html lines 1517 to 1540 (`autoThreshold`)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/art-inlay.md (colour modes)

Steps:
1. `quantize(img, mode, opts)` returns a `LabelGrid` (slot per cell, 0 is
   the body or host slot).
2. palette: pixels with alpha under 120 are skipped; nearest slot by
   weighted squared RGB distance `0.30 dr^2 + 0.59 dg^2 + 0.11 db^2`;
   a pixel whose nearest slot is the body slot stays body (COLLAR
   `ST.base` rule).
3. mono: luminance `0.299 r + 0.587 g + 0.114 b`, hit when `lum <= thr`
   (default 128) or `lum >= thr` with invert; alpha under 120 skipped.
4. alpha (silhouette): any pixel with alpha >= 120 is a hit.
5. `otsu(img)`: SPRUE `autoThreshold` ported: scale so the long side is at
   most 256, composite luminance over white by alpha, 256-bin histogram,
   maximise between-class variance, threshold `t + 1` clamped 1 to 254,
   128 when the variance is 0; invert when the mean border luminance is
   below the threshold. The scaling is a resample, so the port takes an
   already-scaled RgbaImage and ui-core does the canvas downscale; node
   tests pass 256-pixel fixtures.
6. The row flip that COLLAR applies on read (`(res - 1 - j)`) belongs to
   the surface read in M03-T04, never to quantize. The INLAY bench printed
   text upside down when the two disagreed (benches-coins-inlay.md section
   3, row flip bug).

Files to create:
- packages/inlay/src/quantize.ts
- packages/inlay/src/otsu.ts
- packages/inlay/src/quantize.test.ts

Acceptance (`npm test -w packages/inlay -- quantize` exits 0):
- Palette with slots #1A1A1A, #F5F0E6, #FE0386, body slot 1: a pixel
  (250, 10, 130) maps to slot 3; (240, 236, 226) to slot 2; (30, 30, 30)
  stays 0 (body); alpha 119 stays 0.
- Mono at thr 128: luminance 128 is a hit, 129 is not; invert reverses.
- Otsu on a 256 x 256 fixture split 50/50 between luminance 40 and 210
  returns a threshold in 41 to 210 with invert false; the same fixture
  with a luminance-40 border returns invert true.

Done when: all three modes and Otsu reproduce the legacy rules on fixtures.

Card defects found at build, 2026-10-06, and what was built:

1. The file list puts the test at `src/quantize.test.ts`. As in M03-T02,
   tests live under `test/`, so the test is `test/quantize.test.ts`.
   Parity uses `test/fixtures/quantize-cases.ts` (one case list for both
   sides) and `test/fixtures/quantize-golden.json`, which
   `scripts/quantize-golden.mjs` writes by cutting collar.html lines 1086
   to 1116 and 1119 to 1123 (hex2rgb) and sprue.html autoThreshold out of
   the original files and running them as written; it refuses when a
   source sha256 differs from its lineage row or a cut does not start and
   end on its marker lines. 23 cases (counted): 14 quantize, 9 Otsu.
2. Inputs cite sprue.html lines 1517 to 1540; autoThreshold is lines 1517
   to 1538 (measured), and 1539 to 1540 are a blank line and the next
   section comment.
3. Acceptance row 2 reads "luminance 128 is a hit, 129 is not; invert
   reverses". Grey (128, 128, 128) computes to luminance
   127.99999999999999 in double precision (computed), so at thr 128 with
   invert the source does not hit it. The test uses (4, 210, 31), whose
   luminance is exactly 128 (computed), for the boundary, and grey 128 as
   the float case. The port keeps the source arithmetic.
4. Step 5 says the port takes an already-scaled image. `otsuSize` gives
   the canvas size the source draws at (long side 256, each side at least
   8) and `otsu` refuses any other size with E_SCHEMA, so a caller cannot
   skip the resample. The source compares invert against the threshold
   before the 254 clamp; the port does the same, and the case
   `near-white-clamp` holds it.
5. Lineage: `collar.bench/inlay-quantize` and `sprue.bench/inlay-otsu`
   are copy rows under the bench subjects (the canonical rows stay
   `collar.bench/collar-7` and `sprue.bench/sprue-html`), with dest
   `packages/inlay/src/quantize.ts` and `packages/inlay/src/otsu.ts`.
6. `quantize` returns a `LabelGrid` (surface.ts). The adapter from it to
   the `ImageQuantizer` that `face.ts` takes is not written here; it
   belongs to the face wiring in M03-T04 or M03-T09.

## M03-T04 Layer rendering: surface, text with pipe split and runGap, rings, shapes

Goal: every COLLAR layer kind renders onto a label grid through an
injected surface, with the pipe split and runGap placing runs exactly as
COLLAR v5 does.

Inputs:
- fab-work-directory:benches/collar-coin/outputs/collar/collar.html lines 920 to 1198 (`readMask`, `renderLayer`, `buildFace`), 663 to 751 (SHAPES, `shapeR`)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/brand/hackbuild-mark.svg (viewBox 117 103 800 800, verbatim)
- fab-knowledge:sources/benches/benches-coins-inlay.md section 1.3 (kernel steps 1 to 3)

Steps:
1. Define `Surface` in `packages/inlay/src/surface.ts`: `measure(text,
   font, sizeMm)`, `fillText(text, font, sizeMm, x, y, rot)`,
   `fillPath(svgPath, transform)`, `drawImage(img, cx, cy, wMm, hMm, rot,
   mirror)`, `readAlpha(grid)` with row 0 at the top as read in hand, and
   `clear()`. Every numeric parameter's doc comment names its unit (mm or
   radians). The sketch below type-checks under the spec tsconfig flags.
2. Port the text layout as pure code over `Surface.measure`. Straight mode:
   split each line on `|`; run i goes to `slot` when i is even and to
   `accent` (default `slot`) when odd; total width is the sum of run widths
   plus `runGap x (runs - 1)`; the first run starts at `-total / 2`; each
   later run starts after the previous width plus `runGap`; lines step by
   `size x 1.18`. Arc mode: one entry per character with spaces measured as
   `n` and widths multiplied by `track` (default 1); each split adds an
   entry of width `runGap` with no glyph; character n sits at angle `A =
   A0 + sign x ((cur + adv / 2) / Rb)` with `sign = flip ? 1 : -1`, `Rb =
   max(1, arcR)`, translated to `(Rb cos A, -Rb sin A)` and rotated by
   `flip ? (-pi/2 - A) : (pi/2 - A)`.
3. Port ring layers (per-cell radius test with `seg` and `duty`), image
   layers (scale `2 R_art x scale` across the long side, rotation, mirror),
   and `cut` layers into a holes mask that is never clipped to the art
   radius.
4. Port `buildFace` order: layers in list order, later layers overwrite
   earlier cells; muted layers skipped.
5. geom gains `fillPolygonEvenOdd` (SPRUE `fromPolygon`, pixel-centre
   sampling) and SVG path flattening for `M m L l H h V v Z z` plus the
   curve commands in the mark files. geom also gets a vector `Surface` for
   node that supports `fillPath`, rings and shapes; `fillText` in node
   throws `E_KERNEL` naming the missing font outline route (see
   unresolved items in the PR body).
6. ui-core gets `canvasSurface(res)`: an OffscreenCanvas or canvas with the
   COLLAR mm transform (`k = res / dia`, origin centre, y up), alpha read
   at threshold above 120, row flipped on read. Fonts are embedded and
   awaited with `document.fonts.load` before the first read; the bbox cache
   is cleared after the load (art-inlay.md, font determinism).

```ts
/** RGBA pixels, structurally compatible with DOM ImageData. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Slot number per cell, row 0 at the top as read in hand. 0 is the host or body slot. */
export interface LabelGrid {
  readonly w: number;
  readonly h: number;
  /** cells per mm */
  readonly res: number;
  readonly labels: Uint8Array;
}

/** Injected painter: canvas in the browser, a vector rasteriser in node. */
export interface Surface {
  /** advance width in mm of `text` set in `font` at `sizeMm` */
  measure(text: string, font: string, sizeMm: number): number;
  /** fill text with its baseline origin at (x, y) mm, rotated `rot` radians */
  fillText(text: string, font: string, sizeMm: number, x: number, y: number, rot: number): void;
  fillPath(svgPath: string, transform: readonly [number, number, number, number, number, number]): void;
  drawImage(img: RgbaImage, cx: number, cy: number, wMm: number, hMm: number, rot: number, mirror: boolean): void;
  /** alpha read back on the grid, 0 to 255, row 0 at the top */
  readAlpha(grid: { w: number; h: number; res: number }): Uint8Array;
  clear(): void;
}

export interface TextLayer {
  kind: 'text';
  /** a pipe splits runs: odd runs go to `accent` */
  text: string;
  slot: number;
  accent?: number;
  font: string;
  /** mm */
  size: number;
  /** mm of air added at each pipe split */
  runGap: number;
  mode: 'straight' | 'arc';
  /** mm, arc mode */
  arcR?: number;
  /** degrees, arc mode */
  arcDeg?: number;
  flip?: boolean;
  /** advance multiplier, arc mode */
  track?: number;
  /** mm */
  dx: number;
  /** mm */
  dy: number;
  /** degrees */
  rot: number;
  cut?: boolean;
}
```

Files to create:
- packages/inlay/src/surface.ts
- packages/inlay/src/layers/text.ts
- packages/inlay/src/layers/ring.ts
- packages/inlay/src/layers/image.ts
- packages/inlay/src/layers/shape.ts
- packages/inlay/src/face.ts
- packages/inlay/src/layers/text.test.ts
- packages/geom/src/raster/fill.ts
- packages/geom/src/raster/svgpath.ts
- packages/geom/src/raster/vector-surface.ts
- packages/geom/src/raster/fill.test.ts
- packages/ui-core/src/surface/canvas-surface.ts

Acceptance:
- `npm test -w packages/inlay -- text` exits 0. With a recording surface
  whose `measure` returns 1 mm per character: `hack|.build` straight,
  runGap 0.7, places run 0 (`hack`, slot 2) at x = -5.35 and run 1
  (`.build`, accent 3) at x = -0.65 (computed, this card: total 4 + 6 +
  0.7 = 10.7); runGap 0 places run 1 at x = -1.0.
- Arc `MAKE THINGS` at arcR 14, arcDeg 90, flip false, track 1.05: the
  recorded angle of character n equals the formula in step 2 to 1e-12.
- `npm test -w packages/geom -- fill` exits 0: a unit square at 10 cells
  per mm fills 100 cells; a square with a square hole fills the even-odd
  difference.
- `grep -rn "document\|window\|HTMLCanvasElement\|OffscreenCanvas" packages/inlay/src packages/geom/src`
  returns nothing.

Done when: every COLLAR layer kind renders through the surface and the
text placement test is green in node.

Card defects found while building, 2026-10-06 (the code follows the
right-hand side):

- Row order. The sketch says "row 0 at the top"; step 6 and COLLAR
  readMask (collar.html:928 to 934) flip rows so row 0 is the bottom
  (model y up). The port follows COLLAR; surface.ts states the order.
- COLLAR ring rows are not flipped (collar.html:997 evaluates y top-down
  and stores row j unflipped), so a segmented ring is mirrored top to
  bottom against text. Kept for cell parity; M03-T09 decides whether
  to fix it in the package with a parity note.
- Surface had no RGBA read, which image colour modes need. Added
  `readRgba(grid)`, same row order.
- `drawImage(img, cx, cy, wMm, hMm, ...)` cannot reproduce COLLAR's
  `(artD * k) / max(iw, ih)` operand order. It takes `spanMm`, the long
  side, and accepts `RgbaImage | NativeImage` so a browser image (the
  SVG mark) paints as COLLAR paints it.
- `fillText(x, y, rot)` cannot express COLLAR's translate, rotate, then
  set at x along the baseline. An optional `{align, along}` carries
  textAlign and that offset; the canvas surface then issues COLLAR's
  calls argument for argument (packages/ui-core/test).
- The mark files hold no curve commands (measured: m, h, l, v, z only).
  svgpath supports M L H V Z and refuses curves with E_SCHEMA.
- Shape SDFs (Package placement puts them in geom) land in
  packages/geom/src/raster/shapes.ts, not listed under Files.
  designs/collar/build.ts keeps its own SHAPES, shapeR and baseLUT
  until M03-T09 moves COLLAR onto the package; that copy is the one
  remaining duplicate.
- Tests live under each package's test/ (packages/inlay/test/text.test.ts,
  layers.test.ts; packages/geom/test/fill.test.ts, shapes.test.ts;
  packages/ui-core/test/canvas-surface.test.ts): root vitest includes
  only packages/*/test, and src/ tests would compile into dist.
  The `-- text` and `-- fill` filters still select them.
- The vector surface refuses drawImage as well as text (E_KERNEL): node
  has no resampler that matches canvas smoothing.
- RgbaImage is the M03-T02 type (intake/image.ts), re-exported by
  surface.ts; LabelGrid is defined once in surface.ts and quantize
  (M03-T03) returns it. Image layers call that quantize; palette mode
  takes slot colours and the body slot from FaceContext.palette.

## M03-T05 Hygiene recipes and the despeckle rule

Goal: the print-reality controls (stroke boost, open or despeckle, colour
gap, art clip) run as three named recipes that each reproduce one legacy
bench cell for cell, with despeckle at 0.35 of a min-feature disc.

Inputs:
- fab-work-directory:benches/collar-coin/outputs/collar/collar.html lines 940 to 985 (`dilate` separable box, `despeckle` 4-connected flood) and 1149 to 1197 (per-slot hygiene, gap, art clip)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/mesh/rastermesh.js lines 275 to 349 (`despeckle`, `open`, `dilate`, `gap`)
- fab-work-directory:benches/sprue/outputs/sprue/sprue.html lines 295 to 324 (`dilate` disc by row prefix sums, `erode`, `clean`) and 1097 to 1124 (`compose`, `checkThin`)
- fab-knowledge:sources/benches/benches-coins-inlay.md sections 7.1 and 7.2

Steps:
1. Implement `hygiene(grid, recipe, ctx)` with three recipes. Each is an
   ordered list of operations; none is merged with another, because their
   structuring elements and boundary rules differ and parity depends on
   them.

| recipe | used by | order and rules |
|---|---|---|
| `collar-v5` | COLLAR | per used slot: box dilate (separable square, radius `round(boost x k / 2)` px) when `boost x k / 2 >= 1`; despeckle drops 4-connected islands under `max(1, round(pi (minF x k / 2)^2 x 0.35))` cells when despeck is on; colour gap removes cells of slot s inside a box dilate of the union of other slots by `round(gap x k / 2)` when that radius >= 1 and more than one slot is used; clear art outside the clip region |
| `print-forge` | INLAY, SASH, KNUCKLE | per non-host slot: disc dilate by `round(boost x res)` (disc `dx^2 + dy^2 <= r^2 + 0.25`, only over host cells); open with disc radius `floor(minF / 2 x res)`, out-of-grid counts as not-slot in the erosion; despeckle at `round(0.35 x pi x (minF / 2 x res)^2)` cells; gap by `round(gap x res)`; rim re-stamped after hygiene |
| `sprue` | SPRUE (two colours) | open: erode then dilate by `round(minF / 2 x ppm)`; close: dilate then erode by `round(minGap / 2 x ppm)`; disc rows span `floor(sqrt(r^2 - dy^2))`; erosion is not-dilate-not, so out-of-grid cells do not erode; then OR the coin ring |

2. Default values come from the caller. COLLAR v5 passes boost 0.10, gap
   0.45, minF 0.90, despeck true (collar.html line 653). The `inlay`
   feature kind default (M03-T08) reads min feature 0.6 from profile
   (print-reality.md line 36, inferred) and uses `print-forge` with boost
   0.15 and gap 0.
3. Clip region: COLLAR clears art outside a circle of R_art even on a non
   round blank (collar.html, `x^2 + y^2 > rArt^2`). Keep that behaviour
   for the COLLAR parity and expose the clip region as a field so a design
   can clip to the blank outline inset by keep. Generalising the default is
   not part of M03 (benches-coins-inlay.md section 10 conflict list, item
   on art clip; candidate CHK-INL-10 at M04).
4. Port SPRUE `checkThin` as `thinFlags(layers)`: compose each layer alone
   raw and cleaned; `gone` when nothing survives, `weak` when under 75
   percent of the raw cells survive. Return flags as Part IR warnings
   (D-049), never as UI state.
5. Despeckle regression fixture: the COLLAR hack.build back face at res
   512 across 44 mm. The test asserts the full stop of `hack|.build`
   survives at factor 0.35 and is removed at factor 1.0, the v3 failure
   (art-inlay.md: "At the full disc it ate the full stop"). The fixture
   grid is captured from the legacy bench by M03-T09 and committed under
   `packages/inlay/test/fixtures/` with its sha256.

Despeckle thresholds at the shipped defaults (computed, this card):

| bench | res or k | minF mm | radius px | 0.35 x disc cells | full disc cells |
|---|---|---|---|---|---|
| COLLAR v5 | k = 512 / 44 = 11.636 px/mm | 0.90 | 5.236 | 30 | 86 |
| INLAY | 8 px/mm | 0.6 | 2.4 | 6 | 18 |
| SASH | 10 px/mm | 0.6 | 3.0 | 10 | 28 |
| KNUCKLE | 6 px/mm | 0.6 | 1.8 | 4 | 10 |

Other COLLAR v5 radii at defaults (computed, this card): boost 0.10 gives
0.58 px, under 1, so no dilate runs; gap 0.45 gives 2.62 px, rounded to a
3 px box. SPRUE at ppm 12 (computed): minF 0.6 gives 3.6 px rounded to 4;
minGap 0.35 gives 2.1 px rounded to 2.

Files to create:
- packages/inlay/src/hygiene/box.ts
- packages/inlay/src/hygiene/disc.ts
- packages/inlay/src/hygiene/despeckle.ts
- packages/inlay/src/hygiene/recipes.ts
- packages/inlay/src/hygiene/thin.ts
- packages/inlay/src/hygiene/hygiene.test.ts
- packages/inlay/test/fixtures/collar-back-512.labels.bin (from M03-T09)
- packages/inlay/test/fixtures/collar-back-512.sha256

Acceptance:
- `npm test -w packages/inlay -- hygiene` exits 0 with the table values
  asserted for `despeckleCells(minF, res)`.
- On the COLLAR back fixture: the full stop island survives at 0.35 and is
  removed at 1.0; island count after hygiene equals the legacy count
  captured with the fixture.
- Each recipe on its legacy fixture returns a grid equal cell for cell to
  the legacy output (fixtures from M03-T09 and M03-T10).
- `thinFlags` on a 0.3 mm line at ppm 12 with minF 0.6 returns `gone`.

Done when: the three recipes reproduce their benches and the period
survives.

Card defects found by the build, 2026-10-06:
- The full stop of `hack|.build` on the COLLAR back fixture is a 239 cell
  island (computed by the legacy bench in Chromium at res 512 across 44
  mm). At the v5 default min feature 0.90 the full disc is 86 cells
  (computed), so the full stop survives at factor 1.0 too and "removed at
  1.0" cannot hold at defaults. The test asserts survival at 0.35 and 1.0
  at 0.90, then the v3 failure at min feature 1.60, inside COLLAR's 0.3 to
  2 range: 95 cells at 0.35 (survives) and 272 at 1.0 (removed), computed.
- The test lives at `packages/inlay/test/hygiene.test.ts`, the package
  convention; `tsconfig.json` has rootDir `src`, so a test under `src`
  would be emitted into `dist`.
- The fixtures were captured here, ahead of M03-T09 and M03-T10, by
  `packages/inlay/scripts/hygiene-fixtures.mjs` (puppeteer-core 24.43.1
  and system Chrome 150 headless; the Playwright form later ran here with
  `executable_path` set to system Chrome 150, see M03-T09 and M03-T12). Besides the card file it writes
  `collar-512.legacy.json.gz` (both faces pre and post hygiene with legacy
  island sizes) and `sprue-phx.legacy.json.gz` (phx faces and layers, raw
  and clean, with the page's thin flags); `collar-back-512.sha256` lists
  all three. T09 and T10 reuse them.
- The legacy COLLAR post-hygiene grid carries 1 and 3 cell slot 3 islands:
  the colour gap runs after despeckle and leaves fragments. The port keeps
  that order, so the island count to match is 11 (3 slot 2, 8 slot 3).
- SPRUE ORs the ring only for kind `coin` (sprue.html:1110); the phx
  capture is a pick, so the ring path is checked against the legacy lines
  on a synthetic coin.
- Profile `despeckle.factor` cites SPRUE in its provenance; the bench notes
  put the 0.35 at COLLAR v3 (benches-coins-inlay.md section 10, conflict
  8). Left unchanged here (profile edits additive only); M03-T07 or the
  profile owner should correct the source text.

## M03-T06 Split, mirror and bodies

Goal: a label grid per face becomes one body per slot with an exact shared
boundary, bed-face art mirrored in X at extrude, through the M00 raster
mesh route.

Inputs:
- packages/mesh (raster route, healer from M-1-T09, meshHash) from M00
- fab-work-directory:benches/collar-coin/outputs/collar/collar.html lines 1200 to 1517 (`planSlabs`, `labelSlab`, meshing)
- fab-knowledge:sources/benches/benches-coins-inlay.md section 1.3 kernel steps 3 to 10
- spec/part-ir.ts (Body, BodyRole), spec/feature-kinds.ts (GeneratedGeometry)

Steps:
1. `mirrorFace(grid)`: `out[j][i] = in[j][w - 1 - i]`, holes likewise.
   The face function keeps returning art as read in hand; only the
   extrude mirrors (art-inlay.md, Mirroring).
2. `splitBodies(front, back, depth, host)` returns one `BodyDraft` per
   slot with role `art`, slab z ranges `[0, depth]` for the mirrored back
   face and `[thk - depth, thk]` for the front, host slot cells left to
   the host body. Depth is a whole number of process layers; any other
   depth returns input error `E_SCHEMA` (exit 2) naming the layer height.
3. Bodies go through the M00 raster route with the healer. The partition
   stage in D-047 carves them from the host by role priority (art before
   body); inlay never subtracts from the host itself.
4. Volumes per slot are reported as metrics (D-049): cells x cell area x
   slab height, mm3.

Files to create:
- packages/inlay/src/split.ts
- packages/inlay/src/mirror.ts
- packages/inlay/src/split.test.ts

Acceptance:
- `npm test -w packages/inlay -- split` exits 0.
- A 3-slot fixture coin: bodies are pairwise disjoint and sum to the solid
  (`uv run --project tools/py tools/py/validate_3mf.py --overlap` on the exported 3MF exits
  0).
- An asymmetric glyph on the back face reads mirrored in the emitted
  bottom slab and as-read in the face function.

Done when: inlay bodies come out of the shared mesh route watertight and
disjoint.

Card defects found by the build, 2026-10-06:
- The card never defines `host`. Built as `SplitHost {id, thk, slot,
  machine, materials}`: `machine` is the `KernelCtx.machineView` slice
  (`id`, `layerHeight`), so the layer height comes from the profile
  preset; `materials` is the slot to profile material list a `BodyDraft`
  needs. `splitBodies` also returns the shared raster `shape`, the
  content-addressed masks (`hbf://mask/<sha256>`, for `StageInput.mask`)
  and the metrics, which the card does not list.
- Through cuts are not in the card. COLLAR cuts a hole through every band
  and mirrors back holes with the back art (collar.html:1385 to 1392,
  1242). The port zeroes art under holes and returns the combined holes
  in model orientation; carving them from the host belongs to M03-T08
  (the generator) or M03-T09, and no step there names it yet.
- The metric is cells x cell area x declared depth (estimateVolume). The
  raster route snaps band bounds to 1/1024 mm, so a mesh volume differs
  from it: depth 1.2 reads 1.2001953125 at the bed band and 1.19921875 at
  the top band of a 3.6 part (computed). The healer can also flip art
  cells where a hole meets a stroke tangentially; the first fixture
  flipped 2 cells (computed), so the fixture keeps one cell of art around
  each hole and the test asserts 0 flips before comparing exactly.
- Files to create omits `packages/inlay/test/fixtures/split-coin.ts` (the
  3-slot coin and `stageCoin`) and `packages/inlay/scripts/split-fixture.mjs`
  (writes it as a 3MF at SOURCE_DATE_EPOCH 315532800). `tools/tiers.json`
  has no inlay to 3mf edge, so the test cannot import `@hackbuild/3mf`;
  the test spawns the script, then runs the validator line below on its
  output when uv is present (CI requires it). The acceptance line names no
  file: `node packages/inlay/scripts/split-fixture.mjs <out.3mf>` then
  `uv run --project tools/py tools/py/validate_3mf.py --overlap <out.3mf>`.
- Fixed 2026-10-08 (audit, tiers gate): the script in `packages/inlay/scripts/`
  imported `@hackbuild/3mf`, an inlay to 3mf edge between two tier 1
  packages, held only by a dated `edgeExceptions` row in `tools/tiers.json`.
  It moved to `tools/inlay/split-fixture.mjs` (tools import any workspace
  package) and the exception row is gone. The acceptance line now reads
  `node tools/inlay/split-fixture.mjs <out.3mf>`.
- Inputs cite lines 1200 to 1517; the mirror itself sits at 1382 to 1392
  inside buildMesh, the band labels at 1221 to 1258. Lineage rows
  `collar.bench/inlay-mirror` and `collar.bench/inlay-split` record both.

## M03-T07 Opacity floor in profile: light over dark 1.2 mm

Goal: the inlay depth floor for every colour pair is a profile row with
provenance, and the rule that classifies a pair is code.

Inputs:
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/references/print-forge/print-reality.md lines 20 to 28
- fab-knowledge:sources/benches/benches-coins-inlay.md section 1.1 (python coin v1: pink and white tinted grey at 0.8 inlay over black; fixed at 1.2)
- spec/profile.ts (Provenance per D-099, Constant)

Steps:
1. Add two profile constants with provenance:

| id | value | rule | tier | method | evidence |
|---|---|---|---|---|---|
| `opacity.lightOverDark` | 1.2 mm | inlay lighter than the colour under it | inferred | failure | print-reality.md lines 23 to 26; python coin v1 at 0.8 read grey |
| `opacity.darkOverLight` | 2 layers of the process layer height | inlay darker than the colour under it | inferred | failure | print-reality.md line 22; SPRUE white body black inlay |

   Machine ffc5p, conditions layer 0.24, PETG. Tier is inferred because no
   coupon measured either number (D-082 owner, D-083 owner default ladder).
2. Classify a pair by WCAG relative luminance: the inlay is light over dark
   when its luminance exceeds the luminance of the colour under it.
3. `opacityFloor(inlayHex, underHex, layer)` returns the floor in mm and
   the rule that set it; the value feeds CHK-INL-03 and the constraint
   solver as a Bound with kernel `profile`.

```ts
function lin(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relLuminance(hex: string): number {
  const v = Number.parseInt(hex.replace('#', ''), 16);
  return 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
}

/** Light over dark needs 1.2 mm; dark over light hides in two layers. Floor in mm. */
export function opacityFloor(inlayHex: string, underHex: string, layer: number): { floor: number; rule: 'light-over-dark' | 'dark-over-light' } {
  return relLuminance(inlayHex) > relLuminance(underHex)
    ? { floor: 1.2, rule: 'light-over-dark' }
    : { floor: 2 * layer, rule: 'dark-over-light' };
}
```

Relative luminance of the corpus slot colours (computed, this card):
#1A1A1A 0.0103, #F5F0E6 0.8745, #FE0386 0.2286, #FFFFFF 1.0, #000000 0.0,
#2B6CB0 0.1437.

Files to create:
- packages/profile/data/opacity.json
- packages/inlay/src/opacity.ts
- packages/inlay/src/opacity.test.ts

Acceptance (`npm test -w packages/inlay -- opacity` exits 0):
- COLLAR cream #F5F0E6 over black #1A1A1A: light over dark, floor 1.2.
- COLLAR pink #FE0386 over black #1A1A1A: light over dark, floor 1.2.
- SPRUE black #000000 in white #FFFFFF at layer 0.24: dark over light,
  floor 0.48 (computed).
- The profile row reads back with tier inferred and method failure; a
  lookup records the read for BuildInputs (M00 ProfileLookup).

Done when: the floor is data with provenance and the classifier is
tested.

Card defects found by the build, 2026-10-06:
- The step 3 sketch types 1.2 and 2 into the kernel, which the
  architecture law forbids. Built as `opacityFloor(inlayHex, underHex,
  layer, profile)`: both numbers come from `profile.constant()`, so the
  read lands in the lookup's read set, and a row in the wrong unit (mm for
  light over dark, layers for dark over light) or at 0 is E_SCHEMA. The
  result also carries `constant` (the row id), `qualification` (inferred
  for the mm row read as is, computed with basis inferred for layers x
  layer height) and `bound`, the `Bound` with side lo and kernel profile
  that CHK-INL-03 and the solver read.
- "Files to create" puts the test at `packages/inlay/src/opacity.test.ts`.
  The package compiles `src` only and keeps tests in `test/`, so it is
  `packages/inlay/test/opacity.test.ts`; the acceptance filter is
  unchanged.
- The card does not say how `data/opacity.json` loads. It is a constants
  file: `ProfileData.opacity` (optional, additive) appends its rows to the
  one constants table, so `constant(id)` reads them, a read records table
  `constant`, and an id listed in both files is E_SCHEMA.
- PROFILE.md 10.1 listed these rows as `inlay.lightOverDark` and
  `inlay.darkOverLight` with source COLLAR. The ids this card and M03-T08
  use are `opacity.*` and the source is print-reality.md lines 22 to 28,
  so PROFILE.md 10.1 now carries the card ids.
- The hex parse reuses `hexToRgb` from quantize.ts (one parser); its
  E_SCHEMA path reads `/slots` for a bad colour.
- The COLLAR v5 bench itself warns only below 0.8 mm ("six layers safe",
  benches-coins-inlay.md, `refreshNotes` row). The profile floor follows
  print-reality.md; the COLLAR warning stays a parity note for M03-T09.

## M03-T08 The inlay feature kind, its four checks and reference cosmetic/coin-inlay

Goal: `inlay` is admitted under the three-part contract with a generator,
a non-empty check set, fit class `none` and a green reference.

Inputs:
- spec/features.ts (the `inlay` member of the Feature union, as written by the spec set; spec wins on field names), spec/feature-kinds.ts (FeatureKindDef), spec/checks.ts
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json (CHK-INL-01 to 04, as corrected by M-1-T07)
- fab-knowledge:synthesis/mappings.md section 5.2 (inlay across eight designs) and the CHK-INL origin row
- fab-knowledge:sources/benches/benches-coins-inlay.md section 10 conflict 8 (misattributed origins)
- ../CHECKS.md (check versioning and message template)

Steps:
1. Register `FeatureKindDef<'inlay'>`: fields per D-059 (art region,
   slot, depth in layers, min feature, despeckle), plus face (`top` or
   `bed`), recipe and layers. `generate` runs quantize or layer render,
   hygiene, mirror for bed faces, split. `fit: 'none'`. `checks`:
   CHK-INL-01 to 04. `reference`: `cosmetic/coin-inlay`. The type rejects
   an empty checks tuple or a missing reference (D-058).
2. Implement the four checks against Part IR with CheckResult fields
   measured, legal, constraint and origin `hbf://check/<id>` (D-064):

| id | severity | measured | legal | constraint |
|---|---|---|---|---|
| CHK-INL-01 stroke below line width | block | mm2 of slot cells an opening at radius minF / 2 would remove | interval [0, 0] | profile min feature 0.6 (inferred) or the feature's minF |
| CHK-INL-02 despeckle at 0.35 x min-feature disc area | warn | smallest surviving island, mm2 | at least 0.35 x pi x (minF / 2)^2 | D-145 |
| CHK-INL-03 inlay depth meets the opacity floor | block | inlay depth, mm | at least `opacityFloor(inlay, under, layer)` | profile `opacity.*` (M03-T07) |
| CHK-INL-04 bed-face art mirrored in X at extrude | block | boolean, emitted bottom slab equals the mirrored as-read face | true | D-063 mirrorOnFlip |

3. Retarget CHK-INL-01 and -03 from `pocket` to `inlay`; that can flip a
   verdict on the same Part IR, so both go to version 2.0.0. Correct the
   origins (no verdict change, patch bump): CHK-INL-02 to COLLAR v3
   2026-08 ("despeckle at the full disc ate the full stop of hack.build");
   CHK-INL-04 to the python hackbuild coin v1 2026-08 ("back wordmark
   printed backwards"); CHK-INL-03 to python coin v1 2026-08 ("0.8 inlay
   over black tinted pink and white grey; 1.2 fixed it").
4. Severity maps per D-067: block refuses export, warn notes.
5. Write `reference/cosmetic/coin-inlay/` per D-105: `chase.ts` (a typed
   object that satisfies spec Chase; `defineChase` arrives at M10),
   `build.ts`, `README.md` with the verified block (D-008), `expected/`
   holding build.json, report.json, edit.json, artifacts.json and
   section.png, and `covers: ['feature:inlay', 'CHK-INL-01', 'CHK-INL-02',
   'CHK-INL-03', 'CHK-INL-04']`. The design is node-buildable: 44 mm
   blank, 3.6 mm thick, 0.2 layer, inlay 1.2 (6 layers), front face the two
   mark paths from hackbuild-mark.svg as `fillPath` layers (arc slot 3,
   wrench slot 2), back face one ring layer, `collar-v5` recipe. Text is
   covered by the browser parity in M03-T09 until a font outline route
   exists.
6. One-param edit for `edit.json`: inlay depth 1.2 to 0.72 (0.8 is off the 0.24 grid) flips CHK-INL-03
   to fail with nearest 1.2 and a fix `{param: '/features/0/depth', set:
   1.2, predicts: 'pass'}`.

Files to create:
- packages/inlay/src/kind.ts
- packages/inlay/src/checks/inl-01.ts
- packages/inlay/src/checks/inl-02.ts
- packages/inlay/src/checks/inl-03.ts
- packages/inlay/src/checks/inl-04.ts
- packages/inlay/src/checks/checks.test.ts
- reference/cosmetic/coin-inlay/chase.ts
- reference/cosmetic/coin-inlay/build.ts
- reference/cosmetic/coin-inlay/README.md
- reference/cosmetic/coin-inlay/expected/build.json
- reference/cosmetic/coin-inlay/expected/report.json
- reference/cosmetic/coin-inlay/expected/edit.json
- reference/cosmetic/coin-inlay/expected/artifacts.json
- reference/cosmetic/coin-inlay/expected/section.png

Acceptance:
- `npx -y -p typescript@7.0.2 tsc -p spec/tsconfig.json` exits 0 and
  `npx tsc -b` exits 0.
- `npm test -w packages/inlay -- checks` exits 0.
- `npx --no-install hbf part.build reference/cosmetic/coin-inlay --json` exits 0 with
  three bodies (slots 1, 2, 3).
- `npx --no-install hbf check.run reference/cosmetic/coin-inlay --json` exits 0 with
  CHK-INL-01 to 04 pass.
- The edit in `expected/edit.json` (depth 0.72, not 0.8, see defects) is asserted by
  `npm test -w packages/inlay -- checks`: CHK-INL-03 fail, check.run exit
  code 1, measured 0.72 mm, legal at least 1.2, constraint
  `opacity.lightOverDark`, fix sets 1.2 and predicts pass.
- `npx --no-install hbf parity reference/cosmetic/coin-inlay` exits 0.
- `npx --no-install hbf export.run reference/cosmetic/coin-inlay --kind 3mf` at a TTY,
  then `uv run --project tools/py tools/py/validate_3mf.py --overlap <file>` exits 0.

Done when: the kind type-checks with its checks and reference, and the
reference is green in CI.

Card defects found by the build, 2026-10-06 (the code follows the
right-hand side):

- Layer 0.2 mm. The ffc5p profile has no 0.2 mm preset and the layer
  comes from the preset (benches-coins-inlay.md section 10 item 11). The
  reference builds on ffc5p_20260819 at 0.24 mm: 1.2 mm is 5 layers, the
  blank 3.6 mm.
- The edit 1.2 to 0.8 mm. 0.8 is not a whole number of 0.24 mm layers, so
  build.ts refuses it with E_SCHEMA before any check runs. The edit is
  1.2 to 0.72 mm (3 layers, the grid value nearest 0.8): CHK-INL-03 fails
  with measured 0.72, legal at least 1.2, constraint
  `opacity.lightOverDark`, fix `/depth` to 1.2 predicting pass.
- Fix param `/features/0/depth`. Fix.param is a JSON pointer into design
  params (spec/checks.ts, D-064), and the spec field is `depthLayers`, a
  layer count. The chase param is `/depth` in mm; build.ts binds it to
  `depthLayers` through `k.bind`, and CHK-INL-03 joins MEASURES_PARAM in
  packages/checks so the registry fixes it on the param's step grid.
- "Three bodies (slots 1, 2, 3)" needs one body per slot across both
  faces, as COLLAR splits them. A feature per face cannot give that (the
  back ring repeats a front slot, a fourth body per face), so an `inlay`
  feature is one art slot and carries the whole art: `layers.top`,
  `layers.bed` (as read in hand), `recipe`, `grid`, `boost`, `gap`,
  `palette` and `material` beside the spec fields. `face` is the host's
  top FaceFrame; `art` is `hbf://art/<sha256 of the canonical art>`, and
  the generator refuses a feature whose fields moved without its uri.
- Recipe `collar-v5`. collar-v5 has no open step, so every convex corner
  leaves cells an open at the min feature removes and CHK-INL-01 (legal 0
  mm2) fails on any art with corners (a 6 mm square fails by its 4 corner
  cells, 0.25 mm2 at 4 cells per mm, computed). The reference uses
  `print-forge`, which opens at the min feature; the kind accepts both.
  `sprue` collapses slots to one mask and stays SPRUE's (M03-T10).
- The front mark as `fillPath` layers. The layer union had no path layer;
  `packages/inlay/src/layers/path.ts` adds one (registered in face.ts).
- Files to create omits the wiring the acceptance commands need: core had
  no package kind or check registry (M04 lands it). `core/src/kinds.ts`
  maps a kernel to its kinds, raster masks and checks; a chase gets them
  when `meta.kernels` lists the kernel, so references that list no such
  kernel keep their registryHash and goldens. `inlayChecks` in
  packages/checks builds the CheckDefs from the seed rows (one seed
  reader) and refuses a row whose version differs from the run body;
  `SKELETON_KERNELS` gains `inlay`. packages/checks and core depend on
  @hackbuild/inlay.
- Profile had no min-feature row. `inlay.minFeature` 0.6 mm (inferred,
  failure, print-reality.md lines 36 to 37) is appended to
  packages/profile/data/opacity.json, the M03 constants file. CHK-INL-01
  and -02 use the larger of it and the feature's minFeature.
- The seed rows are the single source of versions and origins, so step 3
  edits packages/checks/seed/checks.seed.json (CHK-INL-01 and -03 at 2.0.0
  on kind `inlay`, -02 and -04 at 1.0.1 with corrected origins), checked
  by packages/checks/test/seed-conformance-inl.test.ts.
- Tests live in `packages/inlay/test/checks.test.ts`, not `src/` (see
  M03-T04). The reference needs `tsconfig.json` and a root tsconfig
  reference to type-check.
- Through cuts are refused (E_KERNEL) by the kind; carving them from the
  host stays with M03-T09.
- `export.run` at a TTY is a person's step. The 3MF that check.run builds
  in memory, written by a scratch harness, passes `validate_3mf.py
  --overlap`; the gated export itself was not run.

## M03-T09 COLLAR builds on the package: browser parity against v5

Goal: the COLLAR hack.build preset composed by `@hackbuild/inlay` in
Chromium equals COLLAR v5's own `buildFace` output cell for cell, and the
design's build.ts produces the coin from the package.

Inputs:
- fab-work-directory:benches/collar-coin/outputs/collar/collar.html (classic script, top-level `ST`, `buildFace`, `applyPreset` reachable from `page.evaluate`; preset at lines 2851 to 2930)
- fab-work-directory:benches/collar-coin/outputs/collar/example-hackbuild-coin.3mf (`Metadata/collar_print_card.txt`)
- fab-work-directory:benches/collar-coin/outputs/hackbuild-coin/src/fonts/PermanentMarker-Regular.ttf, SpecialElite-Regular.ttf (Apache 2.0)
- designs/collar/legacy/collar.html with sha256 and lineage README (D-142)

Steps:
1. Copy collar.html into `designs/collar/legacy/` with its sha256 and a
   lineage README naming the chat and revisions v2 to v5.
2. Write `tools/py/harness/collar_parity.py` (Playwright on swiftshader,
   flags from seed `smoke_bench.py`): open the legacy file at file://,
   route `fonts.googleapis.com` to an @font-face sheet serving the two
   local TTFs and abort every other font request, so there is zero network
   (D-129 posture); IBM Plex Mono and VT323 style only chrome, never the
   art grid, so their fallback does not touch parity. Wait for
   `document.fonts.load` on Permanent Marker, run `applyPreset('hack.build
   coin', true)`, wait for the mark image to load, then read
   `buildFace('front', 512)` and `buildFace('back', 512)` as Uint8Array
   label grids.
3. In the same browser context load `designs/collar/test/parity.html`, a
   fixture page that bundles `@hackbuild/inlay` with the ui-core canvas
   surface as one IIFE (tsdown 0.23.0, format iife, file:// safe), feed it
   the same preset translated into inlay layers (palette image for the
   mark, text `hack|.build` slot 2, accent 3, Permanent Marker 8.4 mm,
   runGap 0.7; reeded edge and rim are geometry, outside the art grid), and
   read both grids.
4. Compare cell by cell; on any difference, write both grids and a diff
   PNG to the harness output folder and exit 1 (D-153).
5. Save the legacy back grid as the despeckle fixture for M03-T05.
6. Write `designs/collar/build.ts` as a BuildFn typed against spec/build.ts:
   blank, edge and rim from mesh and geom, art from `@hackbuild/inlay`
   with the `collar-v5` recipe and the `inlay` feature on both faces.
   Report per-slot volumes as metrics beside the legacy print card values.
7. Write the owner COLLAR NFC pocket as a pause fixture,
   `designs/collar/test/nfc-pause.fixture.ts`: two cases typed as
   `PocketFeature` with `sealed.pauseBefore` (spec/features.ts), values
   copied from the owner print cards below, and `pauseBefore.z` set equal
   to the pocket ceiling in both. Write `designs/collar/test/nfc-pause.test.ts`
   to assert the card arithmetic only (ceiling minus floor equals the
   pocket height, pocket width minus tag width, and the layer index on a
   uniform grid where first layer equals layer). CHK-PRT-15 and the 3MF
   pause writer arrive with the sealed pocket kind (D-062, M00 out-of-scope
   table), so this card records the expected check outcomes and hands the
   two cases to that milestone as its pass and fail fixtures.
8. Record the Sep 19 reeded coin as the newest COLLAR reference in
   `designs/collar/README.md` and print its per-slot volumes as
   informational metrics beside the legacy card. It is not a parity gate:
   the collar.html revision that wrote it is not pinned, and the M03-T09
   parity source stays the harvested v5.

COLLAR NFC pocket (owner print cards; tag 25.0, pocket 26.0 wide, 0.50 per
side, 0.60 tall; inlay 1.20 on both faces):

| case | source | layer | blank | floor Z | ceiling Z = `pauseBefore.z` | pause before | wall to inlay, floor and roof | plastic below and above the pocket |
|---|---|---|---|---|---|---|---|---|
| a | fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-print-card.txt (Aug 19) | 0.20 | 3.80 | 1.60 | 2.20 | layer 12 | 0.40, 0.40 | 1.60, 1.60 |
| b | fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-print-card (1).txt (Aug 30) | 0.24 | 4.00 | 1.68 | 2.28 | layer 11 | 0.48, 0.52 | 1.68, 1.72 |

Card values are measured from the files; the grid arithmetic that follows
is computed, this card.

- Case a sits on a uniform 0.20 grid: floor 1.60 is layer 8's top,
  ceiling 2.20 is layer 11's top, so the pause before layer 12 lands at
  the ceiling. Expected CHK-PRT-15 result on a 0.20 preset whose first
  layer is 0.20: pass. PROFILE.md has no 0.20 preset row, so the fixture
  names the grid it assumes.
- Case b cannot sit on a 0.24 grid at both ends, because 0.60 is 2.5
  layers. On a uniform 0.24 grid the floor 1.68 is layer 7's top and the
  ceiling 2.28 is 9.5 layers. On `ffc5p_20260819` (first layer 0.25, then
  0.24; tops at 0.25 + 0.24 n) both ends are off grid: floor nearest
  [1.45, 1.69], ceiling nearest [2.17, 2.41]. The card's "layer 11" starts
  at 2.41 on that grid, 0.13 above the declared ceiling, so the printed
  index and the declared Z disagree. Expected CHK-PRT-15 result: fail on
  `pauseBefore.z` 2.28 with nearest [2.17, 2.41]. This is the case the
  spec avoids by declaring only z (spec/features.ts `PauseBefore`).
- D-062 asks for floor at least 0.6 and roof at least 0.8. Counting all
  plastic below and above the pocket, both cases pass. Counting only the
  wall between pocket and inlay body, case a's roof 0.40 and case b's roof
  0.52 fall under 0.8. The fixture records both readings; which one the
  pocket check uses is an open question for DECISIONS.md.

Sep 19 reeded coin (computed by COLLAR, `Metadata/collar_print_card.txt`
inside fab-knowledge:evidence/x/downloads/dl-baffle-inlay-coin/collar/collar-coin-44mm (8).3mf):
blank 44.0 x 3.60 with a 0.50 edge break; inlay 1.20 as 6 layers at 0.20;
reeded edge, 40 reeds 1.00 deep and 2.80 wide at pitch 3.46 (pi x 44.0 /
40 = 3.456, computed, this card); rim band 2.20 full thickness in slot 3;
slot 1 #1A1A1A 3.60 cm3, slot 2 #F5F0E6 0.53 cm3, slot 3 #FE0386 1.03 cm3,
total 5.15 cm3 (the slot values sum to 5.16; the card rounds the total
from unrounded volumes); 94,848 triangles, 7 slabs, 0.086 mm grid. Against
the legacy example below: slot 1 0.04 lower, slot 2 0.02 higher, slot 3
0.03 higher, total equal. No insert pocket. The save's
`print_settings_id` is "0.24mm Standard @FF C5" while the card says 0.20
layers, the same mismatch CHK-PRT-15 is seeded from.

Legacy print card values (computed by COLLAR v5, print card inside the
example 3MF): slot 1 #1A1A1A 3.64 cm3, slot 2 #F5F0E6 0.51 cm3, slot 3
#FE0386 1.00 cm3, total 5.15 cm3; 88,650 triangles, 7 slabs, 0.086 mm
grid; inlay 1.20 mm as 6 layers at 0.20. The triangle count is COLLAR's
`conformQuads` mesher; the package uses the M00 raster route, so triangle
counts are recorded, never compared.

Files to create:
- designs/collar/legacy/collar.html
- designs/collar/legacy/collar.html.sha256
- designs/collar/legacy/README.md
- designs/collar/build.ts
- designs/collar/README.md
- designs/collar/test/parity.html
- designs/collar/test/parity.entry.ts
- designs/collar/test/nfc-pause.fixture.ts
- designs/collar/test/nfc-pause.test.ts
- tools/py/harness/collar_parity.py

Acceptance:
- `uv run --project tools/py tools/py/harness/collar_parity.py designs/collar/legacy/collar.html designs/collar/test/parity.html`
  exits 0 and prints `front 0 differing cells, back 0 differing cells` at
  res 512 (computed, both sides in one Chromium).
- The run makes zero network requests (the harness counts requests not
  served by a route and fails on any).
- `npx --no-install hbf part.build designs/collar --json` exits 0; per-slot volumes
  round to 3.64, 0.51 and 1.00 cm3 at two decimals against the legacy card
  (computed); a miss prints both values and exits 1.
- `uv run --project tools/py tools/py/validate_3mf.py --overlap` on the exported coin exits 0.
- `npx vitest run designs/collar/test/nfc-pause.test.ts` exits 0: case a
  ceiling 2.20, floor 1.60, pause before layer 12; case b ceiling 2.28,
  floor 1.68; both pocket heights 0.60 and both clearances 0.50 per side
  (computed).
- The `part.build` metrics print the Sep 19 volumes 3.60, 0.53 and 1.03
  cm3 beside the package's values as informational rows; a difference
  there never fails the run.

Done when: COLLAR's art comes from the package and matches v5 exactly in
one browser, and the NFC pause fixture is ready for the sealed pocket
check.

Card defects (found building this card, 2026-10-06):

- The example 3MF volumes 3.64, 0.51 and 1.00 cm3 are not what v5
  computes at the preset. COLLAR v5's own `buildMesh` in Chrome 150 with
  the real Permanent Marker gives 3.5956, 0.5322 and 1.0258 cm3
  (computed), which are the Sep 19 card's 3.60, 0.53 and 1.03. The
  example was exported by the chat, font and revision unknown. The
  harness gates the package volumes on v5's `estimateVolume` in the same
  run (within 1e-3 mm3) and prints both cards as informational rows; the
  acceptance numbers above and the Exit row read 3.60, 0.53, 1.03 when
  this card is next revised.
- Step 6 is blocked, so the `part.build` acceptance is not run in its
  card form. A build.ts may import only `@hackbuild/spec`
  (BUILD_IMPORTS, D-178), so art reaches a part only through the `inlay`
  kind; `packages/inlay/src/kind.ts` hostOf refuses any host but a prism
  from z 0, and COLLAR's blank is a raster body (reeded edge, edge break,
  rim band); and node has no text route (geom `vectorSurface` refuses
  `fillText`), so the hack.build back text cannot compose in `part.build`.
  Unblocking needs a raster host in the kind and a node font route, or
  art grids carried as content-addressed data; both are outside this
  card's files.
- `validate_3mf.py --overlap` on an exported art coin is not run: no art
  coin is exported from the package yet.
- `designs/collar/legacy/collar.html.sha256` is `sha256.txt`, written at
  M00 and read by every legacy reader; no second hash file is made.
- Step 2 names Playwright on swiftshader. The Playwright form ran on this
  macOS 12 host with system Chrome through `executable_path` and the seed
  flags; playwright is the `bench` extra of tools/py, so the acceptance
  command needs `--extra bench` on a fresh venv.
- Step 5 landed at M03-T05 (`collar-back-512.labels.bin`, captured with
  Google Fonts); the harness checks the legacy back grid against that
  capture at res 512 and they are equal.
- The D-062 bullet names only the roofs as failing the wall reading; the
  floor walls 0.40 and 0.48 also fall under 0.6 (computed). The fixture
  records both.
- Ring row order, deferred here by M03-T04: kept as COLLAR has it. The
  hack.build preset carries no ring, so this parity neither needs nor
  tests a change; a fix in the package waits for a parity case with a
  segmented ring.
- `designs/**/test/**/*.test.ts` was not in the vitest include list, so
  the nfc-pause acceptance found no test; vitest.config.ts now includes it.

## M03-T10 SPRUE builds on the package

Goal: SPRUE's two-colour faces compose through `@hackbuild/inlay` with the
`sprue` recipe, equal to sprue.html, and the design builds from the
package.

Inputs:
- fab-work-directory:benches/sprue/outputs/sprue/sprue.html (engine `globalThis.SPRUE` lines 275 to 943; app `globalThis.SPRUE_APP` with `compose`, `PRESETS`, `setFace`)
- fab-work-directory:benches/sprue/outputs/sprue/print-card.txt
- fab-work-directory:benches/sprue/outputs/sprue/fonts/BarlowCondensed-Bold.ttf
- designs/sprue/ from M00 (geometry parity, 21 per-filament keys, C-10)

Steps:
1. Copy sprue.html and sprue.py into `designs/sprue/legacy/` with sha256
   and a lineage README if M00 did not.
2. Port SPRUE `trace`, `simplify` (tolerance 0.75 px, canonical start and
   orientation, Douglas Peucker both halves) and `group` (outers CCW,
   holes CW) into geom; triangulation uses the geom earcut wrapper from
   M00 (D-163). Ear clipping in SPRUE is not ported.
3. Write `tools/py/harness/sprue_parity.py`: open sprue.html, run
   `SPRUE_APP.PRESETS.phx()`, read `SPRUE_APP.compose('front')` and
   `compose('back')` masks at ppm 12, then compose the same layers through
   the package fixture page with the `sprue` recipe (minF 0.6, minGap 0.35,
   margin 1.6) and compare cell by cell.
4. Port `checkThin` results into the comparison: every layer's flag from
   `thinFlags` equals SPRUE's `L.thin`.
5. Write `designs/sprue/build.ts` on the package: compose, trace to loops,
   prism route per slab, edge break per layer as SPRUE does (break_step
   0.30 pick, 0.16 coin). Report per-object volumes as informational
   metrics beside print-card.txt (D-075 label `informational`), because
   print-card.txt comes from the shapely route in sprue.py and the package
   follows the browser route.

Print card values (computed by sprue.py): coin 36 x 2.4 white 2067 mm3,
black 363 mm3, total 2430 mm3; pick 1.2 white 658 mm3, black 53 mm3, total
711 mm3. CHK-INL-03 on SPRUE: pick inlay 2 layers = 0.48 mm meets the
dark-over-light floor 0.48 at layer 0.24 exactly; coin 3 layers = 0.72 mm
passes (computed).

Files to create:
- designs/sprue/build.ts
- designs/sprue/test/parity.html
- designs/sprue/test/parity.entry.ts
- packages/geom/src/raster/trace.ts
- packages/geom/src/raster/trace.test.ts
- tools/py/harness/sprue_parity.py

Acceptance:
- `uv run --project tools/py tools/py/harness/sprue_parity.py designs/sprue/legacy/sprue.html designs/sprue/test/parity.html`
  exits 0 with 0 differing cells on front and back and every thin flag
  equal.
- `npm test -w packages/geom -- trace` exits 0: a loop and its reverse
  simplify to the same point list.
- `npx --no-install hbf part.build designs/sprue --json` exits 0; `npx --no-install hbf check.run
  designs/sprue --json` exits 0 with CHK-INL-03 pass on both objects.
- The volumes table prints package and print-card values side by side
  with the difference; no assertion on it.

Done when: SPRUE's faces come from the package and match sprue.html
exactly.

Card defects found by the build, 2026-10-06:
- `designs/sprue/` did not exist: M00-T12 kept SPRUE as corpus parity
  (`tools/corpus/sprue/`, `tools/parity/sprue.test.ts`). This card created
  the design: `chase.ts` (the bench state after `PRESETS.phx`, the bench
  slider ranges), `build.ts`, `tsconfig.json`, `README.md` and `legacy/`
  (sprue.html, sprue.py and print-card.txt with `sha256.txt` and a lineage
  README; print-card.txt sha256
  0d0e12011d9f2776a301b912d1b5d194e894f22bc694fc6c503258b74becb4da,
  measured).
- Step 5 cannot run as written. Under D-178 a build.ts imports only
  `@hackbuild/spec` (BUILD_IMPORTS; `@hackbuild/kernel/author` does not
  exist yet), Author `ring.offset` is a stub that throws E_KERNEL, and node
  has no font outline route (geom vector surface refuses text). So
  `designs/sprue/build.ts` runs SPRUE.build's slab plan on vector outlines
  as sprue.py does: one prism per slab, one csg body per colour, the bed
  art mirrored in X, the edge break by a convex half-plane inset of the
  pick, sprue.py's lightning bolt as art, coin circles at SPRUE's 192 sides
  from the unit-circle table. Compose, hygiene, thin flags and trace run in
  the browser parity page through the package. The mesh `trace` route
  (`landsAt: the milestone of the first trace design`) stays unbuilt: a
  build.ts has no way to hand it masks of package art. Against SPRUE.build
  on masks of the same blank and art at ppm 24, per colour volumes agree
  within 0.1 percent white and 0.3 mm3 black (computed,
  `tools/parity/sprue-design.test.ts`).
- CHK-INL-03 acceptance is not met. `hbf check.run designs/sprue --json`
  exits 0 with CHK-PRT-01 and CHK-PRT-03 passing, but no CHK-INL-03 runs:
  the check reads `inlay` features, and the inlay kind carves a prism host
  standing from z 0 with the art face at its top and admits only the
  collar-v5 and print-forge recipes (`packages/inlay/src/kind.ts`), so a
  SPRUE object with a stepped edge cannot declare one without the kind
  emitting a second black body. The rule itself, `opacityFloor` with the
  SPRUE colours at layer 0.24, gives floor 0.48 for both objects: pick 2
  layers 0.48 meets it exactly, coin 3 layers 0.72 passes (computed). Needs
  a decision: the inlay kind takes a host with an edge break and the sprue
  recipe, or CHK-INL-03 also reads art bodies. "Both objects" also needs
  two runs: check.run takes no params, and the design builds one part per
  call (pick at the defaults, coin with the `coin` preset).
- The test is `packages/geom/test/trace.test.ts`: geom's tsconfig has rootDir
  `src`, so a test under `src/raster/` would be emitted into dist.
- SPRUE paints text in pixel space with a middle baseline and letter
  spacing, and reads ink as luminance under 128 over white. The ui-core
  canvas surface's mm transform rasterises one cell of `PHX 2026`
  differently at the cell edge (measured, Chrome 150), so `canvasSurface`
  gained `text: "px"` and the inlay `TextOptions` gained `baseline` and
  `spacing`; black over white crosses luminance 128 at alpha 127 (measured,
  `SPRUE_INK_ALPHA`), where COLLAR reads alpha above 120. The SPRUE face
  module is `packages/inlay/src/layers/sprue.ts`; the blank outline comes
  from `designs/sprue/build.ts`, so one copy of SPRUE's pick exists.
- sprue.html runs checkThin only from `commit` (line 1221), which boot never
  calls, so every `L.thin` reads null after a preset. Both harness forms run
  the page's own checkThin (cut from lines 1114 to 1125) on the page's
  compose. The phx flags are all null; the harness adds a `phx-small`
  scenario whose two `gone` flags match, and the `coinyear` scenario (arc
  text, ring), all three gated.
- The phx preset's front face is empty (sprue.html line 269, "an empty
  front"; `knowledge/designs/sprue.md` s-01, FRONT (empty)), so the phx
  front comparison passes with nothing to compare and proves nothing on
  its own. Front coverage comes from `phx-small` and `coinyear`; a check
  that reads the phx front alone is vacuous (routed by the M03 report,
  written back 2026-10-08).
- The Playwright form ran on this host: Playwright 1.63.0 with
  `executable_path` set to system Chrome 150 launches on macOS 12. The
  puppeteer form `tools/legacy/sprue-parity.mjs` prints the same lines.
- Files beyond the card list: `designs/sprue/chase.ts`, `tsconfig.json`,
  `test/tsconfig.json`, `README.md`, `legacy/*`, `test/legacy-read.js`
  (the legacy page code both harness forms share),
  `tools/legacy/sprue-parity.mjs`, `packages/inlay/src/layers/sprue.ts`,
  `packages/inlay/test/sprue.test.ts`,
  `packages/ui-core/test/sprue-surface.test.ts`,
  `tools/parity/sprue-design.test.ts`; additive edits to the geom and inlay
  indexes, `packages/inlay/src/surface.ts`,
  `packages/ui-core/src/surface/canvas-surface.ts`, the root
  `tsconfig.json` and `lineage.json` (nine rows with dest).

## M03-T11 vtracer 1.0.0-alpha.4 evaluation and written verdict

Goal: a dated verdict says whether vtracer's cutout trace replaces,
complements or loses to the in-house quantize on ten corpus inputs.

Inputs:
- fab-knowledge:research/code-cad-and-eda-tooling.md section 5.5 (vtracer 1.0.0-alpha.4, 2026-08-29, MIT OR Apache-2.0, npm `@visioncortex/vtracer` 693 KB, crate `vtracer`, PyPI still 0.6.15; cutout, palette in OKLab, filter-speckle)
- fab-knowledge:synthesis/verified-claims.md row on vtracer (confirmed, still alpha)
- the ten inputs below

The ten inputs, committed under `tools/corpus/inlay/vtracer/` with sha256:

| n | input | source | how it becomes a PNG |
|---|---|---|---|
| 1 | hack.build mark | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/brand/hackbuild-mark.svg | rasterised at 1200 px through the canvas surface |
| 2 | COLLAR hack.build preset faces | collar.html face png export (1200 x 620) | harness clicks the export with the preset applied |
| 3 | COLLAR seal + tagline faces | same export, preset `seal + tagline` | same |
| 4 | COLLAR casino chip faces | same export, preset `casino chip` | same |
| 5 | python coin preview | fab-work-directory:benches/collar-coin/outputs/hackbuild-coin/hackbuild-coin-preview.png (2400 x 1240) | as is |
| 6 | SPRUE face previews | fab-work-directory:benches/sprue/outputs/sprue/previews/faces.png (2240 x 616) | as is |
| 7 | user art reference | fab-work-directory:benches/sprue/uploads/Screen_Shot_2026-09-06_at_3_30_13_PM.png (922 x 360) | as is |
| 8 | SPRUE marching snare | fab-work-directory:benches/sprue/outputs/sprue/sprue.py line 278 `motif_snare` | rendered to 640 px by a uv script |
| 9 | SPRUE lightning bolt | sprue.py line 312 `motif_bolt` | same |
| 10 | SPRUE phx pick back | sprue.html faces png with `PRESETS.phx()` | harness export |

Steps:
1. Install vtracer only in `tools/eval/vtracer/package.json` with an exact
   pin `1.0.0-alpha.4`; never in `packages/*`. If the npm build does not
   run under node, run it in Chromium through the harness, or build the
   crate CLI (`cargo install vtracer --version 1.0.0-alpha.4 --locked`) and
   record which route ran.
2. Route A (in-house): intake trim, quantize (palette against the design's
   slot colours, or Otsu mono), `print-forge` recipe at 8 px/mm, minF 0.6.
3. Route B (vtracer): colour mode, hierarchical cutout, fixed palette of
   the same slot colours, polygon mode, filter-speckle set to the despeckle
   cell count of route A; rasterise the SVG paths onto the same grid with
   geom `fillPolygonEvenOdd`, then run the same recipe.
4. Per input record: cell agreement between routes (percent of cells with
   equal labels), seam cells in route B before hygiene (covered by zero or
   by two paths), cells removed by hygiene per route, CHK-INL-01 and -02
   verdicts per route, wall time median of five runs per route (measured,
   machine named), bytes added to a bake.
5. Write the verdict with the table, the machine, the date and one of
   three outcomes: adopt as an optional vector-input route outside the
   default bake; keep evaluating at the next vtracer release; reject. The
   in-house quantize stays the default in every outcome while vtracer is an
   alpha (D-145).
6. If the outcome changes D-145, append a new DECISIONS.md entry that
   names D-145 as superseded in part (append-only after M-1).

Files to create:
- tools/eval/vtracer/package.json
- tools/eval/vtracer/run.mjs
- tools/corpus/inlay/vtracer/ (ten PNGs, SHA256SUMS)
- tools/py/render_sprue_motifs.py
- docs/evaluations/vtracer-1.0.0-alpha.4.md

Acceptance:
- `node tools/eval/vtracer/run.mjs tools/corpus/inlay/vtracer` exits 0 and
  prints one row per input, ten rows.
- `cd tools/corpus/inlay/vtracer && shasum -a 256 -c SHA256SUMS` exits 0.
- `node tools/lint-voice.mjs docs/evaluations/vtracer-1.0.0-alpha.4.md`
  exits 0; the file names the outcome in its first paragraph and every
  number in it carries a qualifier.
- `grep -rn "vtracer" packages/` returns nothing unless the verdict says
  adopt and a new decision entry exists.

Done when: the verdict file is committed with ten measured rows.

Card defects (found 2026-10-06 while building this card):
- The card has no dependency line. Route A needs M03-T02 (`contentBounds`,
  landed), M03-T03 (`quantize`, `otsu`, `otsuSize`) and M03-T04
  (`fillPolygonEvenOdd`, `flattenSvgPath`), which landed while this card
  ran and are bound, then M03-T05 (`hygiene` with `print-forge`), a profile min feature constant
  (M03-T07 names only the opacity rows; the harness binds
  `inlay.minFeature`) and CHK-INL-01 and -02 callable on a label grid
  (M03-T08). Until they land `run.mjs` prints ten rows with route A not run
  and exits 2, so a partial table never reads as the exit 0 above.
- vtracer `filterSpeckle` is a side length on 1.0.0-alpha.4 (measured): a
  square patch of area at most filterSpeckle squared is dropped. Step 3's
  "set to the despeckle cell count" would drop up to 36 cells against
  route A's 6. The harness passes `floor(sqrt(cells - 1))`, 2 for 6 cells.
- Steps 2 and 3 name no art size in mm. The harness fits the art long side
  to 40 mm (inferred) at 8 px/mm.
- Input 1 says "through the canvas surface"; ui-core `canvasSurface`
  (M03-T04) does not exist yet. `tools/eval/vtracer/corpus.mjs` rasterises
  the mark with a Chrome canvas drawImage at 1200 px.
- The repo has a PNG encoder (core/src/render/png.ts) and no decoder. The
  harness carries an 8-bit non-interlaced decoder, tested equal to
  vtracer's own decoder on Sub, Up and Paeth filtered inputs.
- The fourth acceptance grep hits `packages/inlay/README.md` (M03-T01
  licence prose that names the evaluation). Scope it to code and manifests:
  `grep -rn vtracer packages/*/src packages/*/package.json`.
- Step 3's fixed palette cannot express route A's Otsu threshold on mono
  inputs: vtracer snaps by its own colour distance, so grey grounds and the
  pink wrench land on the other side (measured, rows 1, 6 and 10 of the
  verdict). A fair mono route B uses `clustering: 'bw'` with
  `binaryThreshold` set from Otsu; not run.
- Files to create also needs `tools/eval/vtracer/corpus.mjs` (the corpus
  drive), `tools/corpus/inlay/vtracer/inputs.json` (mode and slot palette
  per input) and `tools/test/vtracer-eval.test.mjs`.
- Closed 2026-10-07 (verifier round 2 fixer): `checkInl01` and
  `checkInl02` are exported from packages/inlay as grid forms of CHK-INL-01
  and -02, and `runInl01` and `runInl02` measure through them (one
  implementation). run.mjs binds them and exits 0 with ten measured rows;
  the verdict is rewritten with the final outcome, keep evaluating.
- run.mjs passed print-forge a context with no `host`, `slots` or
  `despeck`, so route A and route B hygiene changed 0 cells on every row
  (measured, 2026-10-06 table). `hygieneCtx` in run.mjs now gives host 0
  (the body label), slots 1 to the palette length (1 in mono) and despeckle
  on; hygiene changes 691 to 3498 cells on route A (measured).
  `tools/test/vtracer-eval.test.mjs` holds both: the context removes a
  lone cell and a 2 x 2 patch, and run.mjs exits 0 with no "not run" cell.

## M03-T12 Art board controller in ui-core, driven by the existing harness

Goal: one face editor controller with the full handle set lives in
ui-core, and the existing Playwright handle drive moves, rotates and scales
layers through it and sees state change.

Inputs:
- fab-knowledge:evidence/x/knuckle/knuckle-src.zip member part6.js lines 402 to 560 (most refined copy: `FE`, HANDLE 5, ROT_STEM 26, HIT 9, bbox cache 200, snaps, keys)
- fab-work-directory:benches/collar-coin/outputs/collar/collar.html lines 2001 to 2142 (face view, `layerBBox` at res 160 by signature, arc text drag)
- fab-knowledge:evidence/x/benches-coins-inlay/sash-src/smoke.py lines 49 to 87 (handle drive through `UI.FE.handles` corners, dot, centre)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/art-inlay.md (direct manipulation acceptance bar)

Steps:
1. Port the KNUCKLE editor as `createArtBoard(opts)` in
   `packages/ui-core/src/artboard/`. It owns pointer, wheel and key input,
   hit testing and handle geometry; it emits `select`, `touch` (every
   move) and `commit` (pointer up, end of a nudge, delete, duplicate,
   reorder). Debounce, undo and rebuild scheduling belong to the M09
   interaction contract, so the controller holds no timers.
2. Handle set and constants (the acceptance bar in art-inlay.md, values
   from KNUCKLE part6.js):

| behaviour | rule |
|---|---|
| layer bbox | mask bounds of the layer rendered alone at a quick raster, cached by the canonical JSON of the layer minus placement, at most 200 entries |
| handles | four corner squares (HANDLE 5 px half size), rotate dot ROT_STEM 26 px beyond the top edge, hit radius HIT 9 px |
| select | click selects the topmost layer whose bbox contains the point; selection syncs both ways with the layer list through `select` |
| move | drag moves; centre snap at 0.6 mm of the board centre with guides drawn; alt disables snap; shift locks to the dominant axis |
| scale | corner drag scales about the centre; text size, image scale, shape w and h follow; arc text drag sets arcR and arcDeg instead of dx, dy (COLLAR) |
| rotate | dot drag rotates; snaps to -180, -90, 0, 90, 180 within 4 degrees; shift rounds to 15 degrees; alt disables snap |
| zoom and pan | wheel zooms by 0.9 or 1.1 per notch, clamped 0.5 to 8, about the cursor; right or middle drag pans |
| keys | arrows nudge 0.25 mm, shift 5 mm; Delete and Backspace remove; ctrl or cmd D duplicates; `[` and `]` reorder |
| text | double click on a text layer focuses its text field |
| drop | an image dropped on the board lands at the cursor position in mm |
| raster | exact print raster shown after a build; a 4 px/mm quick preview while dragging |

3. Expose `handles()` returning `{bb, corners, top, dot, centre}` in canvas
   pixels. The fixture binds it as `globalThis.UI = {FE: {handles}}` so the
   SASH harness reads it unchanged.
4. Build `packages/ui-core/test/artboard/fixture.html`: one IIFE bundle
   (tsdown 0.23.0, format iife) with the controller, the canvas surface
   and inlay, loaded at file://, three layers (text, image, ring), state
   exposed read-only as `globalThis.ARTBOARD.state()`.
5. Port the SASH smoke drive (lines 49 to 87) into
   `tools/py/harness/artboard_smoke.py`: read handles, drag the centre 30
   px right and 20 px up, drag the dot 40 px, drag a corner outward by half
   its offset from the centre; fail when state did not change ("rotate
   handle did nothing", "scale handle did nothing"). Add the remaining rows
   of the table: wheel zoom, right-drag pan, snap and alt, shift axis lock,
   arrow and shift-arrow nudges, Delete, ctrl D, brackets, a synthetic
   drop, double click on text, rotate snap at 3 degrees off 90.
6. Run the harness at viewport widths 390, 768 and 1280 with a touch-only
   pass at 390 (pointer events from touch), failing on console errors and
   on horizontal overflow (`scrollWidth > innerWidth`).
7. The headless half is also tested in node: hit testing, handle geometry,
   snap rules and key handling run on synthetic events against a stub
   surface.

Files to create:
- packages/ui-core/package.json (private, tier 3)
- packages/ui-core/src/artboard/controller.ts
- packages/ui-core/src/artboard/hit.ts
- packages/ui-core/src/artboard/bbox-cache.ts
- packages/ui-core/src/artboard/keys.ts
- packages/ui-core/src/artboard/controller.test.ts
- packages/ui-core/test/artboard/fixture.html
- packages/ui-core/test/artboard/fixture.entry.ts
- tools/py/harness/artboard_smoke.py
- tools/py/pyproject.toml (playwright pinned exactly, version recorded in the PR body)

Acceptance:
- `npm test -w packages/ui-core -- artboard` exits 0.
- `uv run --project tools/py tools/py/harness/artboard_smoke.py packages/ui-core/test/artboard/fixture.html out/artboard`
  exits 0 and prints every table row as pass at 390, 768 and 1280, plus
  the touch-only pass at 390; zero console errors; no overflow.
- Rotate snap: a drag ending at 93 degrees commits 90; with shift at 52
  degrees commits 45; with alt at 93 commits 93.
- Nudge: one ArrowRight adds 0.25 mm to dx; shift+ArrowRight adds 5 mm.
- A person opens the fixture at desktop and 390 px and ticks "I looked at
  the renders" in the PR (D-154). Counting classes headlessly is not
  looking.

Done when: the harness drives every handle through the ui-core controller
and the person check is ticked.

Card defects found at build, 2026-10-06, and what was built:

1. `controller.test.ts` is listed under `src/artboard/`, where `tsc -b`
   would emit it into `dist` and neither the root vitest include nor
   `tsconfig.tests.json` reads it. It lives at
   `packages/ui-core/test/artboard/controller.test.ts`, with a stub inlay
   Surface beside it (`stub-surface.ts`); the acceptance filter still
   matches.
2. Step 3 asks for `handles()` and for the SASH harness to read
   `UI.FE.handles` unchanged, which reads a property. The fixture binds a
   getter: `UI.FE.handles` returns `board.handles()`.
3. Step 4 names three layers, but the table's arc text row needs arc text.
   The fixture carries four: straight text with a pipe split, an image, a
   ring and arc text.
4. `packages/ui-core/package.json` and the playwright pin already existed
   (M03-T04; `tools/py/pyproject.toml` pins playwright 1.63.0 in the
   `bench` extra). The package gained a `fixture` script (tsdown 0.23.0,
   iife) through `npm pkg set`; the pyproject comment names the harness.
   The acceptance command needs `--extra bench` in a fresh environment.
5. Playwright 1.63 bundles no browser that runs on this macOS 12 host, so
   `artboard_smoke.py` now launches system Chrome 150 through
   `executable_path` (as the parity harnesses do; `HBF_CHROMIUM`
   overrides) and the Playwright form ran: 0 failed at 390, 768, 1280 plus
   touch (measured). The rows live once in
   `tools/py/harness/artboard_rows.json`, read by `artboard_smoke.py`
   (Playwright) and by `tools/py/harness/artboard_drive.mjs`
   (puppeteer-core 24.43.1 with system Chrome), which ran them.
6. Files beyond the list: `manip.ts` (the manipulator registry, one entry
   per inlay layer kind, so no switch on kind sits in the controller),
   `draw.ts` (painting, colours from the host theme) and `dom.ts` (canvas
   binding). `hit.ts` holds the handle constants and snap rules.
7. Which centre a scale drag measures from: KNUCKLE scales about the layer
   centre, COLLAR about the coin centre. The port takes KNUCKLE; image
   scale keeps COLLAR's 0.05 to 1.6 clamp, since KNUCKLE images have a
   width instead. Rings and paths have no rotation field, so the dot does
   nothing on them. A release commits only when the layer changed
   (KNUCKLE commits every release).
8. The bbox raster is the 4 cells per mm quick raster over (2 max(w, h) +
   8) mm, padded 0.5 mm (KNUCKLE pads 0.5 at 3 px per mm; COLLAR renders
   at 160 px over the coin).
9. The fixture's exact raster is a stand-in build: the face composed at
   10 cells per mm on the canvas surface, no hygiene. The print raster of
   record arrives from the host build through `setExact` (M09).
10. The fixture text face is a `local()` alias of a system sans: the repo
    holds no font file yet (the OFL row lands with the first font, M05).
    The font determinism rule still holds, since the surface waits for
    that face.

## M03-T13 hackbuild-inlay extraction check

Goal: the D-028 trigger is evaluated and the result is recorded, with the
extraction run only when the trigger and the dependency closure both hold.

Inputs:
- D-028 (extract when COLLAR and SPRUE both build on the package in hackbuild-fab and the M03 parity passes)
- D-036 (only @hackbuild/kernel publishes from hackbuild-fab), D-037 (owner: npm org and names; default nothing publishes until the org exists)
- ../REPOS.md (hackbuild-3mf extraction procedure); hackbuild/hackbuild-inlay is empty, created 2026-09-15 (verified-claims.md)

Steps:
1. Trigger part one: `designs/collar/build.ts` and `designs/sprue/build.ts`
   import `@hackbuild/inlay` and no legacy compose code.
2. Trigger part two: M03-T09 and M03-T10 parity harnesses exit 0, and
   `npx --no-install hbf parity reference/cosmetic/coin-inlay` exits 0.
3. Dependency closure: list the workspace imports of `packages/inlay`.
   `@hackbuild/inlay` imports spec, profile, geom and mesh, all private
   (D-036). An extracted repo cannot depend on private workspace packages,
   so extraction waits for `@hackbuild/kernel` to publish those subpaths,
   which waits on D-037.
4. When the trigger and the closure hold: `git subtree split --prefix
   packages/inlay -b inlay-split`, layout as REPOS.md gives for
   hackbuild-3mf, and stop. Pushing to hackbuild/hackbuild-inlay and any
   publish happen only when the owner asks (D-006). The npm name follows
   D-037 (default: checked at M00 with the other names).
5. When either fails, the exit table records which and why, in one line.

Files to create:
- tools/extract-check.mjs (prints trigger part one, part two and the import closure; exit 0 when all hold, 1 otherwise)

Acceptance:
- `node tools/extract-check.mjs inlay` runs and prints three lines. The
  expected result at M03 exit (inferred from D-036 and D-037 defaults):
  trigger holds, closure fails on geom, mesh, profile, spec; exit 1;
  recorded as "extraction deferred until @hackbuild/kernel publishes".
- `grep -rn "@hackbuild/" packages/inlay/src | grep -v "spec\|profile\|geom\|mesh"`
  returns nothing (tier rule).

Done when: the exit table carries the extraction result in one line.

Builder notes, 2026-10-06:
- Step 1 cannot hold as written. Under D-178 a build.ts imports only
  `@hackbuild/spec` (BUILD_IMPORTS), so neither `designs/collar/build.ts`
  nor `designs/sprue/build.ts` imports `@hackbuild/inlay`. The tool reads
  every source of the design folder outside `legacy/`: both designs build
  on the package through `test/parity.entry.ts`, and nothing imports
  `legacy/`. Art still does not reach `part.build` (M03-T09 step 6 and
  M03-T10 step 5 are blocked), so part one holds in the browser parity
  form only.
- Step 2 ran on this host: both harnesses through Playwright 1.63.0 with
  system Chrome 150 through executable_path (they launch here; the
  puppeteer-core forms were not needed), and `hbf parity
  reference/cosmetic/coin-inlay`; all three exit 0 (measured, about 60 s
  for the three).
- Step 3: the closure is `packages/inlay/src` imports plus the declared
  dependencies. A workspace dependency resolves outside the workspace only
  when its package.json is not private, or `@hackbuild/kernel` is not
  private and exports its subpath. Today `kernel/package.json` is private
  with only `.` exported, so the closure fails on geom, mesh, profile and
  spec. Step 4 (`git subtree split`) was not run, since the closure fails.
- `--skip-parity` skips part two, prints it as not run, and part two then
  does not hold. `--root DIR` points the check at another tree for tests.
- The source walk, import patterns and comment blanking moved from
  `tools/tiers.mjs` to `tools/source-scan.mjs`, which both tools import, so
  one scanner exists. Files beyond the card: `tools/source-scan.mjs`,
  `tools/test/extract-check.test.mjs`, and the `tools/tiers.mjs` import.
- The trigger table holds inlay only (D-028). M05 adds the copper row
  (D-029, BLOCKS and KEYWAY) to `TRIGGERS` in the same tool.

## M03-T14 Exit housekeeping

Goal: M03 closes green under the Part 3 rules of MILESTONES.md.

Inputs:
- ../MILESTONES.md Part 3
- tools/counts.mjs, tools/tiers.json, tools/lint-voice.mjs

Steps:
1. Run the full CI set: house-rules, typecheck, derived, tiers, seed, unit,
   property, contract, parity, determinism.
2. Determinism: `reference/cosmetic/coin-inlay` builds on ubuntu x64 and
   arm64 with equal mesh hashes (D-056). The browser parity runs are one
   Chromium per platform; their grids are compared per platform, never
   across platforms, because canvas text raster is a browser output.
3. Re-date the D-040 pin table. M03 adds no runtime dependency; vtracer
   lives in tools/eval only; the Python playwright pin is recorded.
4. Regenerate counts, the reference INDEX and llms.txt (D-010); the
   coverage table gains `inlay` with its reference.
5. PR body lists: working names (D-012); owner questions touched (D-037,
   D-082, D-083 defaults in force; MIT confirmation for the badge-replicator
   ports); the node font outline gap; the vtracer outcome; every acceptance
   line that was not run (D-153).
6. Visual review (D-154): section, assembled and plate PNGs of the
   reference coin and the COLLAR and SPRUE builds at desktop and 390 px;
   a person ticks "I looked at the renders".

Files to create:
- none; results go in the PR body against the Exit table

Acceptance:
- Every CI job green on the PR.
- `node tools/lint-voice.mjs` exits 0.
- `node tools/counts.mjs && git status --porcelain` prints nothing.

Done when: the owner can ask for the M03 merge with every exit row below
proven by a green job or a ticked person check.

Card defects and run record (2026-10-06, local, macOS 12 arm64):

- Step 1 ran locally job by job (CI not run, no push, D-006): house-rules
  (53 tests, lint-voice 0 block, lint-authors, lint-plan-types warn),
  typecheck, tiers, seed, unit (`npm test --workspaces`, `node --test`
  227 pass), property sweep, contract, corpus (125 rows, pytest 96 pass),
  exit-a vitest (1318 pass), parity (`vitest run tools/parity`, `hbf
  parity` over every reference, fits.table, the COLLAR legacy dump equal)
  and one determinism node leg (1003 mesh ids equal across two runs under
  UTC and America/Phoenix; writer bytes reproduce). All counts measured.
  Not run: the x64 and arm64 compare, the macos-14 leg, the browser legs.
- Typecheck failed before this card: `tsc -p tsconfig.tests.json` gave
  TS2345 twice in `packages/geom/test/trace.test.ts` (M03-T10), whose
  `disc` default parameter inferred `Uint8Array<ArrayBuffer>`. The
  parameter is now typed `Uint8Array`.
- Exit rows had no CI job: the parity job ran no M03 harness and no job
  ran `designs/**/test`. The parity job now runs the nfc-pause test, every
  design test, `hbf check.run reference/cosmetic/coin-inlay`, SPRUE parity
  and the art board smoke; a new `vtracer-eval` job runs the M03-T11
  corpus. `tools/test/ci-exit-rows.test.mjs` reads this Exit table and
  fails on a row no CI step runs (a tools/test file counts only when it
  spawns the script, as extract-check.test.mjs does).
- COLLAR parity (`collar_parity.py`) cannot run on CI: its fonts, the
  seed mark and both COLLAR 3MFs are lineage sources under
  fab-work-directory and fab-knowledge. It passed locally (front 0, back
  0 differing cells; volumes 3.5956, 0.5322, 1.0258 cm3 equal to v5,
  computed). The row stays owner-machine only until the inputs are copied
  into the repo with their lineage rows; the test carries the exemption.
- The COLLAR Exit row now reads 3.60, 0.53, 1.03 cm3, as the M03-T09
  defect asked; the T09 acceptance text still reads 3.64, 0.51, 1.00.
- M03-T11 was not green on 2026-10-06: `node tools/eval/vtracer/run.mjs
  tools/corpus/inlay/vtracer` printed ten rows and exited 2 with route A
  bindings `inlay.checkInl01` and `inlay.checkInl02` missing. Closed
  2026-10-07: the grid forms are exported from the inlay checks and the
  run bodies call them; the command exits 0 with ten measured rows
  (M03-T11 defects). The `vtracer-eval` CI job is not run (no push).
- `npm test -w packages/inlay` ran vitest from packages/inlay with no
  config, so the vitest default of 5000 ms applied, and the split test
  that replays COLLAR buildMesh timed out at 5329 ms under load (measured,
  verifier round 2). `packages/inlay/vitest.config.ts` carries the root
  60000 ms floor, held by `packages/inlay/test/timeout-floor.test.ts`.
- The art board smoke: the Playwright form (`artboard_smoke.py`) first failed
  because it launched Playwright's own Chromium (no browser installs on this
  host). Fixed in verifier round 1: it now uses system Chrome 150 through
  `executable_path` and ran: 0 failed (measured). The puppeteer-core twin
  `artboard_drive.mjs` ran 73 rows, 0 failed.
  The COLLAR and SPRUE harnesses ran in their Playwright form with system
  Chrome; `tools/legacy/collar-dump.mjs` needs `HBF_CHROMIUM` on this host.
- M03-T01 acceptance `grep -rn "potrace" packages/` hits
  `packages/inlay/test/hygiene.test.ts:415` (the test that asserts the
  name is refused); scope it to `packages/*/src packages/*/package.json`,
  as M03-T11 says for vtracer.
- Step 4: no INDEX, coverage table or llms.txt generator exists before
  M11 (`INDEX generated`) and M12-T11 (`tools/gen-llms.mjs`), as the
  M01-T11 correction records; only `tools/counts.mjs` regenerates.
- Step 3 is done in PLAN.md section 16 and PACKAGES.md 2.1 and 8.5
  (playwright 1.63.0 bench extra). vtracer has no `tools/licences.json`
  row: its lockfile is tools/eval/vtracer's own.
- Step 6: section, assembled and plate PNGs of the three builds are in
  `fab-knowledge:evidence/m03-scratch/t14-renders`.
  The COLLAR build renders the blank only (no art), the M03-T09 step 6
  block. view.render writes fixed-size sheets; the 390 px reading applies
  to the art board fixture. The person check is not done.
- Acceptance 3 in the working tree is `node tools/counts.mjs && git diff
  --exit-code -- tools/reports/counts.json docs/plan/PLAN.md` after staging
  (MILESTONES.md 3.3); the porcelain form holds on a CI checkout only.
- Files to create was "none"; the card edits `.github/workflows/ci.yml`,
  `packages/geom/test/trace.test.ts`, PLAN.md section 16, PACKAGES.md and
  this file, and creates `tools/test/ci-exit-rows.test.mjs`.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| intake defaults: key [255, 0, 255], tolerance 70, softness 30, content bounds alpha 8; homography centre (56.287971, 73.596598) | from source; computed | M03-T02 | `npm test -w packages/inlay -- intake` |
| despeckle 0.35 of a min-feature disc: 30 cells at COLLAR v5 defaults; the full stop (239 cells) survives at 0.35, removed at 1.0 with min feature 1.60 | computed | M03-T05 | `npm test -w packages/inlay -- hygiene` |
| three hygiene recipes equal their benches cell for cell | computed | M03-T05, T09, T10 | parity harnesses below |
| light over dark 1.2 mm; dark over light 2 layers (0.48 at 0.24) | inferred (failure, no coupon) | M03-T07 | `npm test -w packages/inlay -- opacity` |
| `inlay` kind admitted with CHK-INL-01 to 04 and reference cosmetic/coin-inlay | n/a | M03-T08 | `npx --no-install hbf parity reference/cosmetic/coin-inlay` |
| CHK-INL-03 at depth 0.72 (the 0.24 grid value nearest 0.8) fails with fix 1.2 | computed | M03-T08 | `npm test -w packages/inlay -- checks` |
| COLLAR hack.build preset: 0 differing cells front and back at res 512; per-slot volumes 3.60, 0.53, 1.03 cm3 (v5 buildMesh 3.5956, 0.5322, 1.0258; the example 3MF card 3.64, 0.51, 1.00 is informational, M03-T09 defect) | computed | M03-T09 | `uv run --project tools/py tools/py/harness/collar_parity.py ...` |
| COLLAR NFC pause fixture: case a z 2.20 before layer 12 on a 0.20 grid; case b z 2.28 expected to fail CHK-PRT-15 on ffc5p_20260819 with nearest [2.17, 2.41] | measured (cards); computed (grid) | M03-T09 | `npx vitest run designs/collar/test/nfc-pause.test.ts` |
| SPRUE phx preset: 0 differing cells, thin flags equal | computed | M03-T10 | `uv run --project tools/py tools/py/harness/sprue_parity.py ...` |
| vtracer verdict written over 10 COLLAR and SPRUE inputs | measured | M03-T11 | `node tools/eval/vtracer/run.mjs tools/corpus/inlay/vtracer` |
| art board handle set passes the existing harness at 390, 768, 1280 plus touch-only | measured | M03-T12 | `uv run --project tools/py tools/py/harness/artboard_smoke.py ...` |
| hackbuild-inlay extraction: trigger holds, closure fails on geom, mesh, profile, spec; extraction deferred until @hackbuild/kernel publishes (run 2026-10-06, exit 1) | n/a | M03-T13 | `node tools/extract-check.mjs inlay` |
| CI green incl. house-rules, derived, tiers, determinism; renders looked at | n/a | M03-T14 | CI and the PR checkbox |

Decides: D-006, D-007, D-008, D-010, D-028, D-036, D-037, D-043, D-044, D-045, D-047, D-048, D-049, D-056, D-058, D-059, D-063, D-064, D-066, D-067, D-075, D-083, D-099, D-105, D-129, D-142, D-145, D-153, D-154, D-156, D-163
