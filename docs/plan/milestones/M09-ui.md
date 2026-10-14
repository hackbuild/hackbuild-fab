# M09 ui

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: rails generate, benches bake. A parameter rail renders from
ParamField declarations, the interaction contract lives once in ui-core,
every baked bench answers the frozen BenchHook, and one bake tool turns a
per-design manifest into a single offline HTML file with a reproducible
sha256.
Depends on: M03, M05
Adopted dependency: @virgilvox/hackbuild-ui 0.2.0 (then 0.3.0), three
0.186.1, @playwright/test 1.63.0, vite 8.3.2 (MILESTONES.md 1.2, D-040);
manifold-3d 3.5.4 and jszip 3.10.1 enter bakes as vendored assets, already
pinned in D-040
Commands added: none (MILESTONES.md 1.3 has no M09 row). The bake runs as
`node tools/bake/bake.mjs <manifest>`; M10 wraps it as `chase.bake`
Release at exit: hackbuild-ui 0.3.0 with GUIDELINES v1.3 as an upstream PR
the owner merges and publishes (D-116); baked benches as GitHub release
assets (D-034, owner default) when the owner asks

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document; the chase package arrives at
M10, so M09 renders from ParamField declarations typed against
`spec/chase.ts` and from the `chase.ts` files that M05 references already
carry. PIP (was HAFT) is the published print-in-place controller at
hackbuild/pip-controller (D-013). tools.hack.build (proposed) is the
cookieless bench origin of D-034. Every number in this file carries a
qualifier (measured, computed, vendor, inferred, unknown) or names the file
it was read from (D-007). Numbers marked "measured 2026-10-04" were
measured by the plan writer on that date on macOS arm64 with Chrome for
Testing build 1223 and swiftshader GL; the cards re-measure them in CI and
the golden records what CI sees. Repo paths are relative to the
hackbuild-fab root; evidence paths are absolute. "Bench" is the internal
word for the layout a chase renders into; user-facing copy uses the tool
name (05-taste.md, aesthetic-voice-ux-bible.md section 11).

## What this milestone decides and carries

| item | decision | where in this file |
|---|---|---|
| depend on @virgilvox/hackbuild-ui; upstream the bench layer as package 0.3.0 with GUIDELINES v1.3; bakes inline its CSS; CI checks the baked CSS hash against the pin | D-116 | M09-T02, M09-T13 |
| package name stays @virgilvox/hackbuild-ui | D-117 (owner; default in force) | M09-T02 |
| published token names win; handoff names become aliases; D-118 tokens added upstream; small labels on void use `--hb-lit-label` | D-118 | M09-T02 |
| header holds identity and state; undo, redo, open, save, guide at the right end of the guide strip | D-119 (owner; default in force) | M09-T07 |
| one system; paper shell except the board kind; no CONDUYT teal or JetBrains Mono | D-120 (owner; default in force) | M09-T07 |
| Special Elite for tool taglines; Libre Baskerville italic only for the brand line; bakes carry all five faces | D-121 (owner; default in force) | M09-T07, M09-T13 |
| graph rule 32 px at 10 percent pink for new work; shipped benches keep 26 px until rebaked | D-122 (owner; default in force) | M09-T06 |
| ui-core state is plain TypeScript with explicit commit; Pinia setup stores only as thin mirrors; `hbf.` storage prefix in try/catch; no store below tier 3 | D-123 | M09-T03, M09-T04, M09-T07 |
| ParamField `help` and a declared `notes` panel kind; PIP's 16 `.note` elements migrate there | D-124 | M09-T08, M09-T09 |
| UX law changes: legend chips under 640, export step last, one focal pink per view, ink chip on-state, welcome remembered, touch parity at 390, locatable findings, per-row reset, presets from welcome, share link in `location.hash`, enum options from legal values | D-125 | M09-T04, T05, T07, T08, T14 |
| six kinds fixed; M09 builds the `single` and `composer` region maps | D-126 | M09-T07 |
| three 0.186.1 inlined as a module script; vendor only decoders a design uses | D-127 | M09-T06, M09-T13 |
| BenchHook frozen on the PIP getter style with settled(), buildHash, drive, verbs, EXPORT_ALIASES; conformance on every baked bench with legacy adapters | D-128 | M09-T11, M09-T12 |
| bake from a per-design manifest; seed is pip-controller tools/build_bench.py plus COTTER baker features; deterministic; at most 16 MB; zero network at load; no blob or module Workers under file:// | D-129 | M09-T13 |
| no headless component library, no declarative 3D layer, no Storybook; a /kit route; one custom element `<hb-viewer>` | D-130 | M09-T06, M09-T07 |
| ParamField gains label, help, constraintDim, commit (touch, commit, light), step | D-132 | M09-T03, M09-T08 |
| read models and per-MCU verdicts feed the drive pad readout | D-076, D-078, D-079 | M09-T10 |
| corrected Yousu wording in the migrated note (raw filament, never scaled onto printed traces) | D-081, C-09 | M09-T09 |
| renderer binding lives in ui-core; DOM only in tier 3 | D-044, D-045 | M09-T01, M09-T06 |
| wasm and three objects freed by their owner; live count returns to baseline | D-055 | M09-T06 |
| lint-voice runs on rendered DOM text in smoke | D-004 | M09-T14 |
| test scripts assert and exit non-zero; a test that did not run is reported as not run | D-153 | every card |
| a person looks at desktop and 390 px | D-154 | M09-T15 |

Detail on bench anatomy, tokens and the law lives in ../UI.md; the hook
and bake tests in ../TESTING.md; the package boundary in ../PACKAGES.md
and ../ARCHITECTURE.md; agent-facing hook use in ../AGENT-SURFACE.md. This
file holds what a builder runs.

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
(D-156). Hashes are sha256 and sizes are bytes, measured 2026-10-04.

| source | role | absolute path | sha256 | size |
|---|---|---|---|---|
| PIP baked bench at b137deb | hook template, drive pad, interaction contract, bake parity target | fab-knowledge:evidence/x/pip-controller/pip.html | a1fa88bd6ffa603c76059567c8b27c804536e39e7c07ec56c58daad55b001263 | 1924558 |
| PIP baker | bake seed | fab-knowledge:evidence/x/pip-controller/tools/build_bench.py | 01d0ddc6ad8f82cd12e157f554842568d27335f8c9b0ee31bb246ec32f8ea9cd | |
| PIP bench shell and scripts | ParamRail fixture, notes, commit model, drive pad | fab-knowledge:evidence/x/pip-controller/bench/part1.html, part2.js, part3.js | recorded by M09-T01 | |
| PIP smoke script | smoke pattern, overflow at three widths | fab-knowledge:evidence/x/pip-controller/test/smoke.py, test/overflow.py | recorded by M09-T01 | |
| TOGGLE baked bench | legacy adapter target | fab-knowledge:evidence/x/toggle/toggle.html | 865fabfd703dad5c7fefdd1adcb21be715356e3fa1e5d202f986ca4ab9a1977b | 1046843 |
| KNUCKLE baked bench | legacy adapter target | fab-knowledge:evidence/x/knuckle/knuckle.html | c1cd25122127954b162df7925e0b85e0f044b120e01cc0f582776161d2c63c74 | 1102382 |
| TENON baked bench | legacy adapter target; `commitLight()` | fab-knowledge:evidence/x/tenon/tenon.html | 37fee2f32d1adda1e1cd999d3d75086bd83bfe4a41c1eaea75add359a4dd4713 | 1028369 |
| COTTER baked bench | legacy adapter target | fab-work-directory:cotter (5).html | 9067ce3e7b0862579168b8f2e1ffdb89e44d4ddacb94b40c38c2af7614b38ffc | 2135323 |
| COTTER baker | ESM manifold to a classic script, base64 wasm, fonts, dash assert, exactly-one-match asserts | fab-knowledge:evidence/x/cotter-src/tools/build.py | recorded by M09-T01 | |
| hackbuild-ui, GitHub main 96d1bec (2026-08-06T22:57:50Z) | design system source; the upstream PR branches from origin/main 96d1bec; local a88fcc8 is unpushed owner work and never enters the PR | hackbuild-ui | GitHub 96d1bec; local a88fcc8 (ahead 1) | |
| hackbuild-ui stylesheet | CSS hash check | hackbuild-ui/dist/styles/hackbuild.css | d492d5cb5f3288f7a34b769c2ec5e03502ab68a94657568716da7d3c9ced18c3 | 52004 |
| hackbuild-ui GUIDELINES v1.2 | design law | hackbuild-ui/GUIDELINES.md | 16180de25c26b63fcf2c0e344bede1d0fb6dca59590e43becb53989f395b21d7 | |
| handoff theme | bench layer source, retiring aliases | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/theme/tokens.css | 1066d52fc6862de809077be9a2878fbed070897abbe2bb9c743bdb0851520d51 | |
| hackbuild-bench on-ink tokens | `--hb-ink-line`, `--hb-ink-border`, `--hb-lit-label` values | hackbuild-bench/src/styles/bench.css lines 12 to 21 | git 2c66696 | |
| measured UI anatomy | skeleton and primitive values | fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/ui-anatomy.md | recorded by M09-T01 | |

The hackbuild-ui stylesheet size matches the npm pack of 0.2.0 (52004 B,
syn/verified-claims.md row 94). The hash above comes from the local build
(local clone at a88fcc8, one commit ahead of GitHub main 96d1bec; the
local dist and the npm 0.2.0 stylesheet hash the same); M09-T02 recomputes it from `node_modules` and the lock file
records that value.

What the legacy benches did at load, measured 2026-10-04 with the network
off (probe scripts at
`fab-knowledge:evidence/scratch/m09probe/`):

| bench | ready after | hook members | scrollWidth at 390 / 768 / 1280 | requests off file and data | workers | console errors |
|---|---|---|---|---|---|---|
| PIP | 0.7 s | getters ready, state, model, rev, built, busy; log, loadDesign, designJson, firmware, wiringSvg, printCard, ensureMesh, commit, exportCoupon, exportBytes | 390 / 768 / 1280 | 0 | 0 | 0 |
| TOGGLE | 3.7 s | ready, model(), state(), geom(), setTilt, set, exportBytes | 390 / 768 / 1280 | 0 | 0 | 0 |
| KNUCKLE | 4.6 s | ready, build(), state(), model(), derive, K, exportBytes, audit | 395 / 768 / 1280 | 0 | 0 | 0 |
| TENON | 5.6 s | ready, getState, setState, build, rebuild, state(), model(), derive, blankState, presetState and 15 more | 390 / 768 / 1280 | 0 | 0 | 0 |
| COTTER | 3.3 s | ready, state(), idle, waitIdle, bom, plates, loadTemplate, designJson, loadDesign, exportBytes, view, addItem | 390 / 768 / 1280 | 0 | 0 | 0 |

KNUCKLE overflows by 5 px at 390 on its first view (measured). Legacy files
stay byte-identical (D-142); the overflow goes into the legacy report of
M09-T14 and is fixed when KNUCKLE is rebuilt from a chase at M10.

## Package placement

| package | tier | M09 adds | may import |
|---|---|---|---|
| ui-core | 3 | bench core (state, commit model, debounce, undo, light path, ensureMesh, blankState, loadDesign), storage wrapper, welcome memory, share link, locate a finding, drive pad model, `installHook`, `<hb-viewer>` with the three binding; the M03 art board stays | spec, tiers 0 to 2, three 0.186.1 |
| ui | 3 | bench shell components for the `single` and `composer` kinds, ParamRail, field renderers, notes panel, checks and fits panels with locate, drive pad overlay, legend with slot-chip collapse, Pinia shell mirror, the /kit page | ui-core (same-tier edge added in M09-T01), vue, pinia, @virgilvox/hackbuild-ui |
| tools/bake | tool | manifest reader, asset inliners, determinism and size checks, CSS hash check | node built-ins, vite 8.3.2 |
| tools/hook | tool | BenchHook conformance suite, legacy adapters | @playwright/test 1.63.0 |
| tools/smoke | tool | smoke suite: overflow, pink budget, touch-only pass, network, workers, DOM voice lint | @playwright/test 1.63.0 |

ui-core imports no Vue; ui imports no three. Kernels below tier 3 stay
headless (D-045); the bench calls the same library functions that `hbf
part.build` and `hbf check.run` call (core, M00 and M04), injected into the
bench core as a `build` function so the core stays free of kernel imports
it does not need.

---

## M09-T01 Legacy benches in the repo, lineage and tier edges

Goal: every legacy bench the conformance suite runs sits in
`designs/<id>/legacy/` with its sha256, and the tier table admits the one
same-tier edge M09 needs.

Inputs:
- the legacy table above (paths and hashes)
- fab-knowledge:evidence/x/pip-controller/ (git b137deb)
- designs/cotter/legacy/ (created at M02-T01 with hook_fit.py)
- tools/tiers.json, tools/tiers.mjs (M-1)

Steps:
1. Create `designs/{pip,toggle,knuckle,tenon}/legacy/` and add the
   baked HTML of each, byte-identical. Add `cotter.html` (renamed from
   `cotter (5).html`) to the existing `designs/cotter/legacy/`.
2. Into `designs/pip/legacy/` also copy from pip-controller b137deb the
   files the bake parity in M09-T13 needs: `bench/part1.html`,
   `bench/part2.js`, `bench/part3.js`, `src/{snapfe,geom,font,layout,router,model,pkg,coupon}.js`,
   `vendor/manifold-classic.js`, `tools/build_bench.py`,
   `tools/rastermesh.js`, `tools/orca3mf.js`, `build.sh`, `package.json`,
   `package-lock.json`, `test/smoke.py`, `test/overflow.py`, `LICENSE`.
   hackbuild-fab never edits pip-controller (D-080); these are copies.
3. Write `SHA256SUMS` in each folder with full hashes and a lineage
   `README.md` per folder (source repo or chat, commit or file date,
   kernels it carries, hook shape from the load table above).
4. Add each source to `lineage.json` with role and hash (D-156).
5. Add `["ui", "ui-core"]` to `sameTier` in `tools/tiers.json`: both sit
   in tier 3 (D-044) and ui renders ui-core state. Extend
   `tools/test/tiers.test.mjs` with a case where `ui-core` importing
   `@hackbuild/ui` fails.
6. Register the legacy folders in the lint-voice scope table as legacy
   (M-1-T03: `designs/*/legacy/**` keeps word rules and brand hex
   reporting, never rewrites).

Files to create:
- designs/pip/legacy/ (files of step 2), SHA256SUMS, README.md
- designs/toggle/legacy/toggle.html, SHA256SUMS, README.md
- designs/knuckle/legacy/knuckle.html, SHA256SUMS, README.md
- designs/tenon/legacy/tenon.html, SHA256SUMS, README.md
- designs/cotter/legacy/cotter.html (SHA256SUMS and README.md updated)
- lineage.json entries
- tools/tiers.json (sameTier edit), tools/test/tiers.test.mjs (new case)

Acceptance:
- `cd designs/pip/legacy && shasum -a 256 -c SHA256SUMS` exits 0; the same
  for toggle, knuckle, tenon and cotter.
- `shasum -a 256 designs/pip/legacy/pip.html` prints
  a1fa88bd6ffa603c76059567c8b27c804536e39e7c07ec56c58daad55b001263.
- `node tools/tiers.mjs` exits 0; `node --test tools/test/tiers.test.mjs`
  exits 0 with the new case failing as expected.
- `node tools/lint-voice.mjs` exits 0.

Done when: the conformance and parity cards read every legacy input from
the repo and nothing from outside it.

## M09-T02 Upstream PR to hackbuild-ui: bench layer, tokens, GUIDELINES v1.3

Goal: a branch of hackbuild/hackbuild-ui carries the bench layer, the
D-118 tokens and GUIDELINES v1.3 as package 0.3.0, ready for the owner to
merge and publish; hackbuild-fab consumes the packed branch until then.

Inputs:
- hackbuild-ui (local clone at a88fcc8, one commit ahead of GitHub main 96d1bec; branch from origin/main; its CLAUDE.md rules apply inside that repo)
- hackbuild-ui/GUIDELINES.md sections 4c, 5, 6, 7b, 8
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/theme/tokens.css lines 37 to 186 (bench primitives, part palette)
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/ui-anatomy.md (measured primitive values)
- hackbuild-bench/src/styles/bench.css lines 12 to 21
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md sections 5.2, 5.3, 5.7, 7.1, 7.2, 10

Steps:
1. In a local clone on branch `bench-layer-0.3.0`, cut from origin/main 96d1bec, add tokens to
   `src/styles/tokens.css` (D-118):

| token | value | source |
|---|---|---|
| `--hb-part-a` to `--hb-part-f` | `var(--hb-pink)`, `var(--hb-slime)`, `var(--hb-lit-warn)`, `#f5f0e6`, `#6b6459`, `#4a463c` | handoff theme lines 37 to 42 (row train, column train, links, rods and pins, decks, frame) |
| `--hb-rail` | `336px` | handoff theme line 52; SKETCH rail |
| `--hb-tray` | `210px` | handoff theme line 53; SKETCH tray |
| `--hb-lit-label` | `#9a9184` | bench.css line 21 `--bn-label-void`; `--hb-lit-dim` reads 2.90:1 on void (computed, verified-claims row 97) |
| `--hb-ink-line` / `--hb-ink-inset` / `--hb-ink-border` | `#33312c` / `#2a2822` / `#44413a` | bench.css lines 12 to 14 |
| `--hb-gold` | `#d9b45a` | STAVE copper render (ui-anatomy.md, token drift) |
| `--hb-mask` / `--hb-silk` | `#FE0386` / `#ffffff` | board-forge PCB render (bible 5.2) |

2. Add the bench layer classes to `src/styles/hackbuild.css` with the
   measured values of bible 7.2, under the published names so both files
   load together: `.hb-steps`, `.hb-guide`, `.hb-prow` (the fab param
   row; `.hb-row` keeps its list-row meaning), `.hb-cams`, `.hb-legend`,
   `.hb-hud`, `.hb-stagebar`, `.hb-mat`, `.hb-welcome` (the welcome card;
   `.hb-card` keeps its meaning). Status uses the published
   `.hb-statusbar`; instrument heads use `.hb-panel-hd-inst`. Every value
   reads a token; no raw hex or px spacing in rules (ui CLAUDE.md).
   2b. Touch size and glyphs. In `src/styles/hackbuild.css` add
   `@media (max-width:640px), (pointer:coarse){ .hb-iconbtn{ width:44px; height:44px } }`;
   the published rule at line 849 is 34 x 34 px and UI.md section 11
   requires 44 x 44 px guide icon buttons under 640 px. In
   `scripts/gen-icons.mjs` add `undo: solid.faRotateLeft`,
   `redo: solid.faRotateRight` and `folder-open: solid.faFolderOpen` to
   `SOLID`, run `npm run gen:icons`, and keep the regenerated
   `src/icons/index.ts` and `docs/icons.md`. Never paste path data
   (GUIDELINES 7). Save uses the existing `floppy-disk`, guide uses the
   existing `question`, and the iso cam uses the existing `cube`; the cam
   buttons carry text labels (UI.md 6.2), so no section glyph is added.
   2c. Also in step 2: `.hb-range` at height 44 px under `(pointer:
   coarse)` and under 820 px, keeping the native thumb and `accent-color`;
   `.hb-tag.is-lit-ok` (`--hb-slime` border and text), `.is-lit-warn` and
   `.is-lit-err`, transparent fill, 1 px border; and the HbHeader `suffix`
   prop, rendered after the pink `accent` in paper, so a header reads
   `PIP<span>.</span>bench` with only the dot pink.
3. Chip on-state: the published `.hb-chip.is-on` fills pink. Add
   `.hb-chip.is-toggle.is-on` with ink fill for toggles inside a bench;
   pink fill stays for the one primary selection of a step (D-125, bible
   5.3 and 5.7). The PR body states this as the proposal the owner rules
   on.
   3b. Ink text on published pink fills: text on a `--hb-pink` fill
   becomes `--hb-ink` (4.62:1, computed, UI.md 17.2) in `.hb-chip.is-on`,
   `.hb-seg > button.is-on`, `.hb-tile.is-on`, `.hb-row.is-on`,
   `.hb-btn-danger` and the pink hover states of `.hb-btn`, `.hb-iconbtn`
   and `.hb-menu-item`. The PR body lists this as owner item D-196, with
   the 3.32 and 4.62 ratios beside a 1280 screenshot of each. Until the
   owner rules, fab benches add `.hb-on-pink{color:var(--hb-ink)}` inside
   the glue budget.
4. Add Vue components with no style blocks, each composing the existing
   0.2.0 components instead of re-implementing them
   (hackbuild-bench/RULES.md: consume components from the library):

| new component | composes | adds |
|---|---|---|
| HbSteps | the HbTabs markup (`.hb-tabs` role=tablist) plus `.hb-steps` | `done`, numbering, collapse to an HbSelect before it would wrap |
| HbGuide | content placed inside HbToolbar (`.hb-bar`) | step name, goal sentence, verb group; never a second bar |
| HbStageOverlay | slots placed inside HbStage (`graph` prop) | the corner (`tl tr bl br`) and centre positions only |
| HbMaterials | HbList and HbRow | swatch, extruder, material, parts, role; props only, never reads a profile |
| HbWelcome | `.hb-welcome` card with HbTiles and HbTile for the starts | sits in the stage centre over HbStage; HbModal is not used, because the welcome overlays the stage, not the page |
| HbParamRow | HbSlider, HbSelect, HbSwitch or HbSeg by field type | label, unit, paired number input, revert mark |

   Props are typed interfaces with `withDefaults`, emits typed,
   `defineModel` for two-way values, keyboard and ARIA on every
   interactive element. Export from `src/index.ts`.
5. GUIDELINES.md becomes v1.3: a "Bench layer" section with the strips
   and overlays (bible 7.1), the primitive table (bible 7.2), the
   countable pink budget (bible 5.7 table: structural, focal, data, never
   pink), the header verbs on the guide strip (D-119 default), legend
   collapse to slot chips under 640, the mobile table (bible 10), and the
   token additions. The KERF replica (7b) stays the bar and must still
   render.
6. Update `docs/components.md`, `docs/tokens.md` and the playground with a
   page that shows every new component in every state at 390 and 1280.
7. Set `package.json` version 0.3.0. Run `npm run typecheck` and
   `npm run build` (that repo's Verification section); look at the
   playground and `hackbuild-kerf-replica.html` in a real browser at
   desktop and 390 px.
8. Commit, push and open the PR only when the owner asks (D-006). The PR
   body lists: what was added, the chip proposal of step 3, D-117 (name
   stays @virgilvox/hackbuild-ui by default), D-119 to D-122 defaults
   written into GUIDELINES v1.3 for the owner to accept or change.
9. Until the owner publishes 0.3.0, run `npm pack` in the branch and
   commit the tarball to hackbuild-fab as
   `tools/vendor/hackbuild-ui-0.3.0-pr.<shortsha>.tgz` with its sha256 in
   `tools/vendor/SHA256SUMS`; `packages/ui` depends on it with a `file:`
   specifier. When 0.3.0 is on npm, the dependency becomes the exact
   version `0.3.0`, the tarball is deleted, and the lock file and the CSS
   lock (M09-T13) move in the same commit.

Files to create (hackbuild-ui branch):
- src/styles/tokens.css, src/styles/hackbuild.css (edits)
- src/components/HbSteps.vue, HbGuide.vue, HbStageOverlay.vue, HbMaterials.vue, HbWelcome.vue, HbParamRow.vue
- scripts/gen-icons.mjs (undo, redo, folder-open), src/icons/index.ts and docs/icons.md (regenerated by `npm run gen:icons`)
- src/index.ts (exports), GUIDELINES.md (v1.3), docs/components.md, docs/tokens.md, playground page, package.json (0.3.0)

Files to create (hackbuild-fab):
- tools/vendor/hackbuild-ui-0.3.0-pr.<shortsha>.tgz
- tools/vendor/SHA256SUMS
- packages/ui/package.json (dependency on the tarball, then on 0.3.0)

Acceptance:
- In the hackbuild-ui branch: `npm run typecheck` and `npm run build`
  exit 0; `grep -c 'hb-prow\|hb-welcome\|hb-steps' dist/styles/hackbuild.css`
  prints a count above 0; `grep -nP '[\x{2012}-\x{2015}\x{2212}]' -r src GUIDELINES.md docs`
  prints nothing.
- Distinct `.hb-` classes in the built stylesheet rise from 161 (0.2.0,
  counted 2026-10-04, syn/verified-claims.md row 94) by at least the nine
  bench layer classes; the new count is printed by tools/counts.mjs, never
  typed by hand (D-010).
- A person opens the playground and the KERF replica at desktop and 390
  px; the PR body says so.
- In hackbuild-fab: `cd tools/vendor && shasum -a 256 -c SHA256SUMS` exits
  0 and `npm ci` installs the tarball.

Done when: the branch builds, the owner has the PR text, and hackbuild-fab
installs the bench layer from the packed branch.

## M09-T03 ui-core bench core: commit model, debounce, undo, light path, ensureMesh

Goal: the interaction contract of bible 7.3 exists once, framework-free,
with timer behaviour pinned by tests.

Inputs:
- fab-knowledge:evidence/x/pip-controller/bench/part2.js lines 1 to 92 (blankState, HIST, commit, schedule 320 ms, doBuild, runBuild with QUEUED, ensureMesh)
- fab-knowledge:evidence/x/pip-controller/bench/part3.js lines 277 to 295 (range input calls touch, change calls commit)
- fab-knowledge:evidence/x/tenon/src/src/part3.js lines 43 to 64 and 384 to 434 (touch, commitLight)
- fab-knowledge:evidence/x/toggle/src/src/part4.js lines 60 to 70 (loadDesign merges onto blankState and drops unknown keys)
- spec/chase.ts (ParamField.commit), spec/hook.ts (BenchHook)

Steps:
1. `createBenchCore({ blank, build, light?, migrate? })` in
   `packages/ui-core/src/bench/core.ts`. `build(state)` returns a promise
   of `{ part, report, buildHash }` from the library functions behind
   `hbf part.build` and `hbf check.run`. The core holds `state`, `rev`,
   `built`, `building`, `queued`, `log` and the last build result.
2. Commit kinds, from `ParamField.commit` (D-132):

| kind | trigger | effect | source |
|---|---|---|---|
| `touch` | range `input` events | marks the mesh stale, updates 2D previews, no rev bump, no build | PIP part3.js line 286 |
| `commit` | `change` events and every non-range input | rev plus 1, undo snapshot scheduled, rebuild scheduled 320 ms later; a commit inside the window restarts it | PIP part2.js `schedule` |
| `light` | fields that change only mass, colour or slot | rev plus 1, runs `light(state)` synchronously, sets built to rev, no geometry build, meshHash unchanged | TENON `commitLight()` |

3. Rebuild runner as in PIP `runBuild`: one build at a time; a commit
   during a build sets `queued` and a single rebuild follows; a thrown
   build logs the message, keeps the previous model, and clears busy.
4. Undo: JSON snapshot of state 450 ms after the last commit, identical
   snapshots skipped, at most 80 entries with the oldest dropped; `undo()`
   takes a pending snapshot first, then steps back; `redo()` steps
   forward; both bump rev and schedule a build (PIP `HIST`).
5. `ensureMesh()` returns a promise that resolves once `built === rev`,
   building now when stale; every export path awaits it, and the viewer
   render loop pauses while an export packs (M09-T06). INLAY export time
   fell from 172 s to 1.4 s in headless Chromium when the loop paused
   (measured, bible 7.3).
6. `blankState()` is a full factory reset; boot calls it; a preset calls
   it first; loading a preset over art asks once ("loading a preset
   replaces your art. replace it?").
7. `loadDesign(json)` parses, runs `migrate` when given, merges onto a
   fresh `blank()` at every depth, drops keys absent from the blank and
   logs each dropped key, then commits. The no-NaN check of D-131 arrives
   with the chase package at M10; M09 logs a NaN found after merge as a
   build error.
8. `designJson()` writes `{ app, v, state }` with keys in a stable order.
9. The runner times each build. A build over 4.5 s appends a BuildWarning
   `{ code: "SLOW_BUILD", text: "build took <s> s, over 4.5 s" }` to the
   result, which the status strip shows. The bound is KNUCKLE's
   (`fab-knowledge:sources/latest/knuckle-tenon-gusset.md`
   lines 334 to 335; 1.6 to 3.0 s measured for 142k to 162k triangles at
   line 1017). Runtime budgets are in TESTING.md 8.3.
10. Typed length entry (plan-deltas R35): `parseLength(text): { mm: number }
    | CommandError` in `packages/ui-core/src/bench/parse-length.ts`, on the
    model of hackbuild-bench `parseFrequency`
    (`hackbuild-bench/src/core/dsp/spectrumMath.ts`
    lines 65 to 76). A bare number is mm; suffixes `mm`, `in`, `um`, `cm`
    are case-insensitive with optional space; commas are stripped. Anything
    else, an empty string, a negative value or a non-finite number returns
    a `CommandError` with code `E_SCHEMA` naming the text and the accepted
    suffixes. Every numeric ParamField with unit mm reads typed text through
    it; the result then snaps through the field's `step` and the
    constraints interval as before. The function is pure, so the `hbf` CLI
    can parse length arguments with it later.

| input | result |
|---|---|
| `12` | `{ mm: 12 }` |
| `12mm` | `{ mm: 12 }` |
| `0.5in` | `{ mm: 12.7 }` |
| `300um` | `{ mm: 0.3 }` |
| `1.2cm` | `{ mm: 12 }` |
| `1.2 CM` | `{ mm: 12 }` |
| `12 ft` | `E_SCHEMA`, unknown suffix |
| empty string | `E_SCHEMA`, empty |
| `-3` | `E_SCHEMA`, negative |
| `abc` | `E_SCHEMA`, not a number |

Files to create:
- packages/ui-core/src/bench/core.ts
- packages/ui-core/src/bench/undo.ts
- packages/ui-core/src/bench/merge.ts
- packages/ui-core/src/bench/parse-length.ts
- packages/ui-core/src/bench/core.test.ts
- packages/ui-core/src/bench/undo.test.ts
- packages/ui-core/src/bench/merge.test.ts
- packages/ui-core/src/bench/parse-length.test.ts

Acceptance (vitest 5.0.3 with fake timers):
- `npm test -w packages/ui-core -- bench` exits 0.
- One commit at t 0: no build at 319 ms, one build at 320 ms. A second
  commit at 200 ms moves the build to 520 ms; exactly one build runs.
- 81 commits spaced 500 ms apart leave 80 snapshots; the first state is no
  longer reachable by undo; 80 undos then 80 redos return to the last
  state with `designJson()` equal.
- A commit during a running build produces exactly one follow-up build.
- A light commit calls `build` zero times and `light` once; `built ===
  rev` immediately after.
- `ensureMesh()` called right after a commit resolves with a model whose
  `buildHash` belongs to the new rev.
- `loadDesign` of a document with an unknown key logs one line naming it
  and the resulting state equals `blank()` merged with the known keys.
- An injected builder that advances fake time by 4,600 ms yields one
  `SLOW_BUILD` warning; one that advances 4,400 ms yields none.
- `parseLength` returns every row of the step 10 table; mm values compare
  within 1e-9.

Done when: the timer table and the parseLength table hold, and nothing
in ui-core imports vue.

## M09-T04 Storage, welcome memory and the share link

Goal: the welcome card is remembered once dismissed, Guide reopens it,
storage failures never break a bench, and a design opens from a link that
works at file://.

Inputs:
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md section 9 proposed clauses (welcome memory, share link)
- fab-knowledge:synthesis/plan-deltas.md R33 (PIP has no storage; welcome shows on every load), section 5 idea 5 (share by URL hash)
- packages/ui-core/src/bench/core.ts (M09-T03)
- ../DECISIONS.md D-166 (untrusted input limits), D-167 (versioned share links)

Steps:
1. `storage.ts`: `get(key)`, `set(key, value)`, `remove(key)` over
   `localStorage`, keys prefixed `hbf.`, each call inside try/catch; a
   throw or a missing `localStorage` returns undefined and logs once per
   session (D-123). No other module touches `localStorage`.
2. Welcome: key `hbf.<designId>.welcome` holds `dismissed`. Boot shows
   the welcome unless the key reads `dismissed`. Dismissing writes it.
   Guide reopens the welcome without clearing the key. The welcome starts
   are blank plus the chase presets (D-125); the primary start is the one
   focal pink.
3. Share link (D-167): `encodeShare(designJson, chaseVersion)` returns
   `#d=<chaseVersion>.` followed by base64url of the design JSON
   compressed with `CompressionStream('deflate-raw')`.
   `decodeShare(hash, {migrate, validate})` reads the version prefix,
   inflates through a counting reader that stops at 1 MB (D-166), parses,
   calls `migrate(version, json)` and then `validate(json)`, and only then
   returns the design. Until M10-T03 wires `packages/chase` migrate, the
   binding passes a migrate that accepts the current `meta.chase` and
   refuses any other version. A payload with no version prefix goes to the
   design's `migrate/legacy.ts` when the design has one. Boot reads
   `location.hash`; a design that passes loads through `loadDesign` after
   the welcome decision; any refusal logs `share link could not be read,
   opened blank` plus the rule that refused it and boots blank. Saving the
   link never writes storage. The drop and file-picker paths call the same
   cap and `validate` before `loadDesign`, and document strings render as
   text, never through `v-html`.
4. Record the encoded length of the flex-pair default design and of the
   PIP example design JSON (2971 B uncompressed, measured 2026-10-04 from
   the legacy bench) in the test output, so print-card QR sizing at a
   later milestone starts from a measured number.

Files to create:
- packages/ui-core/src/bench/storage.ts
- packages/ui-core/src/bench/welcome.ts
- packages/ui-core/src/bench/share.ts
- packages/ui-core/src/bench/storage.test.ts
- packages/ui-core/src/bench/share.test.ts
- tools/smoke/welcome.spec.ts

Acceptance:
- `npm test -w packages/ui-core -- storage share` exits 0;
  `decodeShare(encodeShare(j)) === j` for the PIP example JSON and for 100
  fast-check generated JSON documents (seeded, fast-check 4.10.2).
- `npx playwright test tools/smoke/welcome.spec.ts` exits 0 on the
  flex-pair bake (M09-T13): first load shows the welcome; dismiss and
  reload hides it; Guide shows it; with an init script that makes
  `localStorage` throw on access, the bench boots, shows the welcome and
  logs zero console errors.
- A share link opened as `file://.../keys-flex-pair.html#d=2.<payload>` with the
  context offline yields a `designJson()` equal to the one encoded.
- `npm test -w packages/ui-core -- share` also shows: a payload inflating
  past 1 MB, a version above the current `meta.chase`, and valid JSON that
  fails `validate` each boot blank with the refusal logged and zero calls
  to `loadDesign`; the fuzz job of ../TESTING.md section 4.2.1 passes at
  `FC_RUNS=100`.

Done when: the welcome behaves as the law says with storage on, off and
throwing, and a link round trips a design offline.

## M09-T05 Locate a finding and apply its fix

Goal: every finding in CHECKS, FITS and the warnings is locatable on the
stage, and a finding with a fix applies it as one undoable commit.

Inputs:
- spec/checks.ts (CheckResult, CheckTarget, Fix, LegalValues with nearest; D-064, D-065)
- reference/keys/flex-pair (M05) and its expected/report.json
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md section 9 (locatable, fix clauses)
- ../AGENT-SURFACE.md worked example: one-param fix at CHK-KEY-01 using 1.44 within 1.28 to 1.60

Steps:
1. `locate(result, part)` in `packages/ui-core/src/bench/locate.ts`
   resolves `CheckResult.target` to bodies and features of the Part IR and
   returns `{ focus: ids[], bbox, sectionZ? }`; `sectionZ` comes from a
   target that names a layer or plane. A target that does not resolve
   returns `{ focus: [] }` and the row says `not on the stage`.
2. The viewer (M09-T06) frames `bbox`, sets the section plane at
   `sectionZ` when present, and outlines the focused ids. The legend
   badges each slot with the worst verdict of its bodies.
3. A finding row with `fix` shows the fix line in the bible 2.5 shape and
   a button `set <param> to <value>`; pressing it writes the value at the
   JSON pointer `fix.param` as one commit, so one undo restores the
   previous value.
4. Expose the current view focus as `BENCH.verbs.viewState()` returning
   `{ focus, sectionZ, cam }` for tests and agents (verbs are design
   extras per D-128).

Files to create:
- packages/ui-core/src/bench/locate.ts
- packages/ui-core/src/bench/locate.test.ts
- packages/ui/src/panels/ChecksPanel.vue
- packages/ui/src/panels/FitsPanel.vue
- tools/smoke/locate.spec.ts

Acceptance:
- `npm test -w packages/ui-core -- locate` exits 0: a CHK-KEY-01 result
  targeting `contact.key1` resolves to that feature and the `cap1` body.
- `npx playwright test tools/smoke/locate.spec.ts` exits 0 on the
  flex-pair bake: set `keys[0].gap` through the rail to a value below the
  interval `constraints.query` reports for `contact.gap` (1.00 when the
  interval is the AGENT-SURFACE example's 1.28 to 1.60); the CHECKS row
  for CHK-KEY-01 shows fail with measured, legal and constraint;
  clicking it makes `viewState().focus` contain `contact.key1`; pressing
  the fix button sets the value inside the legal interval the result
  reports (1.28 to 1.60 in the AGENT-SURFACE example, computed; the test
  reads the interval from the result, never from this file) and the row
  turns pass after the rebuild; one undo returns `keys[0].gap` to the
  failing value.

Done when: clicking any failing row moves the camera to the thing that
failed and its fix is one click and one undo.

## M09-T06 `<hb-viewer>`: the three binding in ui-core

Goal: one custom element renders Part IR bodies on the void stage with the
cams and modes of the bench skeleton, frees what it allocates, and pauses
during exports.

Inputs:
- fab-knowledge:evidence/x/pip-controller/bench/part3.js lines 1 to 249 (VIEW: presets, xray, section, plate, explode, legend, pressed state)
- fab-knowledge:evidence/x/tenon/src/src/part3.js lines 170 onward (own orbit, assembled and plate views, cut)
- hackbuild-ui/GUIDELINES.md section 6 (stage, keep scenes brightly lit)
- spec/part-ir.ts (Part, Body, MeshRef)

Steps:
1. Define `<hb-viewer>` in `packages/ui-core/src/viewer/` on three
   0.186.1 with on-demand rendering. Attributes and properties: `part`
   (Part IR with meshes resolved), `cam` (iso, top, front, side, under),
   modes `explode`, `xray`, `section` (with z), `plate`, `focus` (ids to
   outline), `paused`.
2. Lighting stays bright on every mode; silkscreen and trace colours
   read from slot colours and the `--hb-part-*` tokens. The graph rule is
   CSS on the stage element, 32 px at 10 percent pink (D-122 default),
   never drawn in WebGL.
3. Overlays share the stage container with the canvas and carry explicit
   z-index values (bible 9: overlays vanished behind the canvas).
4. Ownership: every geometry, material and texture the viewer creates is
   disposed when its body leaves the scene or the part is replaced. A
   counter of live three objects is exposed for tests (D-055 pattern).
5. Direct manipulation: drag orbits, wheel zooms, right drag pans; touch:
   one finger orbits, pinch zooms, two fingers pan; no camera sliders
   (bible 9). Pick in view emits `pick` with the body and feature id under
   the pointer; the drive pad (M09-T10) listens.
6. Only the decoders a design uses are vendored (D-127). The flex-pair
   bench uses none.

Files to create:
- packages/ui-core/src/viewer/hb-viewer.ts
- packages/ui-core/src/viewer/scene.ts
- packages/ui-core/src/viewer/controls.ts
- packages/ui-core/src/viewer/dispose.ts
- packages/ui-core/test/viewer/fixture.html
- tools/smoke/viewer.spec.ts

Acceptance:
- `npx playwright test tools/smoke/viewer.spec.ts` exits 0: after 50
  commits on the flex-pair bake the live three object count equals the
  count after the first build; `renderer.info.memory.geometries` equals
  its post-first-build value (computed by the test, recorded in the
  output).
- Each cam and mode renders without console errors; screenshots go to
  the visual review artifact (D-154).
- `node tools/tiers.mjs` exits 0: three is imported only under
  `packages/ui-core/src/viewer/`.

Done when: the viewer shows a flex-pair build in every mode and a long
editing session leaks nothing.

## M09-T07 Bench shell: header, steps, guide, stage, rail, status, welcome

Goal: the ui package renders the bench skeleton for the `single` and
`composer` kinds from hackbuild-ui components, with the law clauses that
are layout rules.

Inputs:
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md sections 6, 7.1, 7.2, 8, 9, 10
- fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/ui-anatomy.md (per-kind variations)
- fab-knowledge:evidence/x/pip-controller/bench/part1.html (PIP skeleton, mobile rules in its style block)
- hackbuild-ui components (0.2.0 plus the M09-T02 branch)

Steps:
1. `BenchShell.vue` with regions per kind (D-126):

| kind | regions | rail | reference |
|---|---|---|---|
| `composer` | header, steps, guide, stage left, rail right at `--hb-rail` | raised, 3 px ink left edge, one pane per step | PIP, BLOCKS |
| `single` | header, steps, guide, rail left (sunk, the design), stage, rail right (readouts); 330 / 1fr / 300, two columns at 1180 | left rail sunk | COLLAR |

   The other four kinds (surface, board, machine, catalog) mount at M10
   with their designs; the shell refuses an unknown kind with a logged
   error naming it.

   Every region is an existing hackbuild-ui component or an M09-T02
   component built on one. hackbuild-fab writes no local header, steps,
   guide, stage, status or welcome SFC (hackbuild-bench/RULES.md):

| region | component |
|---|---|
| shell | HbAppShell; BenchShell.vue picks the kind's region map and fills the slots `header`, `tabs`, `toolbar`, default, `rail`, `statusbar`; the `single` kind's left rail goes in the default slot beside HbStage |
| header | HbHeader: title `NAME`, accent `.bench`, tagline, the status pill as an HbPill in the default slot |
| steps | HbSteps (M09-T02, on the HbTabs markup) |
| guide | HbToolbar containing HbGuide |
| stage | HbStage with `graph`, HbStageOverlay for the corner and centre positions inside it |
| busy | HbSpinner plus the word `building` |
| status | HbStatusBar |
| welcome | HbWelcome in the stage centre, starts as HbTiles and HbTile |
| param row | HbParamRow (M09-T08) |
| materials | HbMaterials, fed by props from the rail |
2. Header: mark 26 to 28 px (`HbMark`), `NAME.bench` in Permanent Marker
   with the dot in pink and `bench` in paper (`PIP<span>.</span>bench`, HbHeader `suffix`), status pill, Special Elite tagline at low
   opacity hidden under 900 px. Identity and state only (D-119 default).
3. Steps strip: equal tiles, pink underline on the current step, green
   tick on visited steps, never wraps; under 640 the tiles tighten to 11
   px at .04em and collapse to a select before they would wrap. The last
   step is the export step, PRINT for one process and MAKE for a kit
   (D-125); a rail whose last step is neither logs an error and the smoke
   fails.
4. Guide strip: step name in VT323 pink 17 px, goal sentence in Special
   Elite 13 px, verbs undo, redo, open, save, guide at the right end;
   icon buttons with `aria-label` under 640 (D-119 default). Open accepts
   a file picker and a design JSON dropped anywhere on the page.
5. Stage: void with the graph rule, overlays cams and modes (top left,
   one wrapping strip, `max-width: calc(100% - 20px)`), legend (top
   right, VT323 15 px, slot number, name, role, mode notes in lit
   colours), hud and drive pad (bottom left), busy (`building`), welcome
   (centre, `max-width: min(640px, 100% - 20px)`, step grid two columns
   under 640). The welcome takes `--hb-shadow-pink` while open and the
   stage drops to `--hb-shadow-lg` (bible 5.3).
6. Legend under 640 collapses to slot chips in the status strip; it is
   never hidden (D-125).
7. Rail: the stage legend is the colour key on every step; materials
   (swatch, extruder, material, parts printed in it, role) are a step pane
   or a fold in the first step (D-221, owner, gold default), then the
   step's declared panels.
   Rail 290 px under 820; under 640 the main area stacks and the rail
   takes 46 percent with a 3 px top border (bible 10).
8. Status strip: ink, VT323 16 px, dims, tris, build ms on the left;
   chips on the right (`fits bed`, `mesh current` or `mesh stale`, `N
   warnings`); good chips slime. Warnings live here and in CHECKS, never
   in alerts.
9. Entering the export step runs the build and every check; export
   buttons stay disabled with the reason `mesh stale, building` until the
   status reads `mesh current`.
10. Shell state (current step, cam, modes, welcome open) is a Pinia setup
    store that mirrors the ui-core core by copying on each core event;
    the core stays the truth (D-123).
11. Shell family: paper shell for both kinds here; the instrument density
    is the board kind's and arrives with it (D-120 default). Fonts are
    the five faces in their roles (D-121 default).
12. The /kit page (D-130): `packages/ui/kit/index.html` shows every shell
    part and panel in every state with fixture data, served by vite for
    review and baked by M09-T13 as `dist/kit/kit.html`. It moves under
    apps/fab as the /kit route at M12.
13. Touch targets at least 44 px; every interactive element has keyboard
    handling and an ARIA role and state.
14. Accessibility per UI.md section 17: reduced motion, verdicts in text,
    colour plus word, focus order, and the token contrast table; tested
    by `tools/smoke/a11y.spec.ts` (axe-core, zero serious or critical
    violations at 390 and 1280 px), the reduced-motion smoke rerun and
    `npm test -w packages/ui-core -- contrast` (M09-T14).

Files to create:
- packages/ui/src/bench/BenchShell.vue, Rail.vue, Legend.vue
- packages/ui/src/stores/shell.ts
- packages/ui/kit/index.html, packages/ui/kit/main.ts
- packages/ui/test/shell.test.ts

Acceptance:
- `npm test -w packages/ui -- shell` exits 0 (vitest with a DOM
  environment): a rail ending in a step other than PRINT or MAKE logs the
  error; an unknown kind refuses to mount.
- `npx playwright test tools/smoke/smoke.spec.ts` (M09-T14) passes on the
  kit bake and the flex-pair bake at 390, 768 and 1280.
- `node tools/lint-voice.mjs packages/ui` exits 0; no raw hex outside
  token files.
- `grep -L 'hackbuild-ui' packages/ui/src/bench/*.vue` prints nothing:
  BenchShell.vue, Rail.vue and Legend.vue each import from the library.

Done when: the flex-pair bench shows the full skeleton at three widths
and a person has looked at it at desktop and 390 px.

## M09-T08 ParamRail from ParamField

Goal: the rail rows generate from ParamField declarations, including the
`list` type with per-instance type chips and `showWhen` rows, and render
PIP's layout step to match the shipped rows.

Inputs:
- spec/chase.ts (ParamField per D-132: label, help, constraintDim, commit, step; ParamGroup; ShowWhen)
- fab-knowledge:evidence/x/pip-controller/bench/part1.html lines 209 to 222 (BODY rows, slab-only and grips-only rows)
- fab-knowledge:evidence/x/pip-controller/bench/part3.js lines 296 to 339 (UI.visibility, renderGroups)
- reference/keys/flex-pair/chase.ts (M05; list param `keys`, derived `T`, constraint-backed `gap` and `w`)
- fab-knowledge:synthesis/api-library-ai-design.md section 8.4

Steps:
1. `ParamRail.vue` renders a ParamGroup as an instrument head and one
   `HbParamRow` per field. Renderers by type:

| type | control | rule |
|---|---|---|
| mm, deg, ratio, number | range plus number on one value, unit span | range `input` is touch, `change` is commit; `step` from the field; `step: "layer"` snaps to the machine layer |
| int | number, range when the span is under 50 | commit on change |
| bool | checkbox | commit on change |
| enum | chips when there are at most 4 options, select otherwise | options come from legal values when the field has a constraintDim; an illegal option is never offered (D-125) |
| text, art, part | text field, art board host (M03), catalog picker stub | commit on change |
| list | one block per instance with an instance head, per-instance type chips from the item's enum fields, add and remove within min and max | each instance edit is one commit |
| derived | read-only value with unit and its `help` line as the tooltip | never editable |

   The 4-option chip rule follows PIP practice: shape, group type and
   stick top render as chips; the 12-option pin map renders as selects
   (part1.html and part3.js `renderPins`).
2. `showWhen` hides a row or an instance field; hidden fields keep their
   values. Visibility re-evaluates after every commit (PIP
   `UI.visibility`).
3. Labels: the source string stays lowercase; the 10 px uppercase
   tracking comes from CSS. `help` renders as the label's tooltip and
   `aria-describedby` (D-124).
4. Per-row reset: a revert mark appears when the value differs from the
   default; clicking it resets the row in one commit (D-125).
5. A field with `constraintDim` reads its interval from one
   param-form `constraints.query` call per build (M01; `params` null,
   `ParamEnvelope` keyed by pointer) and draws the legal band on the range track; the row's
   tooltip gains the binding bound in the form `legal 1.28 to 1.60, set
   by <constraint>` with the numbers taken from the query result.
6. PIP fixture: `packages/ui/test/fixtures/pip-layout.ts` declares the
   PIP layout step as ParamGroups typed against spec/chase.ts: BODY with
   shape (enum stadium, slab, grips), width 100 to 220 step 1 mm, depth
   50 to 100 step 1 mm, corner 2 to 30 step 0.5 mm shown when shape is
   slab, grip drop 4 to 30 step 0.5 mm shown when shape is grips, bezel
   1.44 to 4.8 step 0.24 mm, bezel edge 0 to 1.92 step 0.24 mm, thickness
   derived; BUTTON GROUPS as a list of the four groups (LEFT CLUSTER, FACE
   KEYS, MENU KEYS, TOP L / R) with on, kind (d-pad, stick; left only),
   type (flex, clicky, touch; hidden when kind is stick), x -90 to 90 step
   0.5 mm, y -40 to 40 step 0.5 mm, pitch 10 to 30 step 0.5 mm (absent for
   the shoulder group and hidden for a stick). Values from part1.html
   lines 211 to 217 and part3.js lines 316 to 324.
7. If ShowWhen in spec/chase.ts cannot express a condition on a sibling
   field inside a list instance or on the instance id, the card stops,
   writes the needed change to spec/chase.ts as a proposal in the PR body,
   and leaves the fixture rows marked `not run` (D-153).

Files to create:
- packages/ui/src/rail/ParamRail.vue
- packages/ui/src/rail/fields/*.vue (one per row in the table)
- packages/ui/src/rail/showWhen.ts
- packages/ui/test/fixtures/pip-layout.ts
- packages/ui/test/rail.test.ts
- tools/smoke/rail.spec.ts

Acceptance:
- `npm test -w packages/ui -- rail` exits 0: rendering the PIP fixture
  gives the BODY rows in PIP's order with labels, units, min, max and
  step equal to part1.html; with shape stadium the corner and grip drop
  rows are hidden; with slab only corner shows; with grips only grip drop
  shows; LEFT CLUSTER with kind stick hides its type chips and pitch row;
  the shoulder group has no pitch row.
- `npx playwright test tools/smoke/rail.spec.ts` exits 0 on the flex-pair
  bake: a range drag fires touch on input and one commit on release
  (`BENCH.rev` rises by 1); adding a second key through the list control
  rebuilds with two caps; the reset mark on a changed row restores the
  default in one commit.
- An enum with a constraintDim whose legal set excludes one option renders
  without that option (unit test with a stub query).

Done when: PIP's layout rows and groups render from declarations with the
same ranges and the same show and hide behaviour as the shipped bench.

## M09-T09 Notes panel and the PIP note migration

Goal: panes hold heads, rows, chips and declared panels; every constraint
note has a home in a field `help` or a declared `notes` panel, and PIP's
16 `.note` elements are assigned.

Inputs:
- fab-knowledge:evidence/x/pip-controller/bench/part1.html (16 `class="note"` elements, counted 2026-10-04; syn/verified-claims.md row 19 corrects the older figure of 18)
- spec/chase.ts (PanelRef `notes` kind, ParamField.help; D-124)
- fab-knowledge:synthesis/plan-deltas.md R33 (at most one note per panel, generated from data)

Steps:
1. `NotesPanel.vue` renders a declared `notes` panel: at most one note
   per panel, lowercase, one to three sentences, text from data. The note
   string passes `node tools/lint-voice.mjs --stdin --kind dom`.
2. Migration table for PIP, written into the fixture of M09-T08 and used
   by M10 when PIP renders from its chase:

| # | part1.html line | where it sits in PIP | home |
|---|---|---|---|
| 1 | 196 | welcome card | the welcome description (a declared welcome field) |
| 2 | 218 | BODY | `help` on the derived thickness row |
| 3 | 238 | FLEX CONE | notes panel FLEX CONE |
| 4 | 262 | CLICK SPRING | notes panel CLICK SPRING |
| 5 | 271 | TOUCH COMB | notes panel TOUCH COMB |
| 6 | 287 | STICK | `help` on the stick top chips |
| 7 | 288 | STICK | notes panel STICK |
| 8 | 290 | step 2 pane | a declared empty state of the pane, shown when no group uses a moving key |
| 9 | 312 | MOUNT | `help` on the mount mode chips |
| 10 | 319 | HOOKUP | notes panel HOOKUP, filled from Part IR data at build time |
| 11 | 335 | materials and read timing | `help` on the cPLA in plane row, rewritten (step 3) |
| 12 | 346 | STACK | notes panel STACK |
| 13 | 358 | FILAMENTS | materials step pane role column (data, no note; D-221) |
| 14 | 365 | slicer profile | `help` on the profile name fields |
| 15 | 374 | FITS AND CLEARANCES | notes panel FITS |
| 16 | 379 | EXPORT | notes panel EXPORT |

3. Note 11 carries a number the corrections changed. PIP's text says the
   Yousu filament measures "240 to 480 ohm cm as extruded, and printed
   parts run worse". The migrated help reads: `yousu raw filament is 240
   to 481 ohm cm (vendor). printed traces use the profile row, 500 along
   and 2000 through (inferred), until a coupon is measured.` (D-081,
   C-09). The vendor figure is never scaled onto printed traces.
4. Every other migrated string keeps PIP's wording except where
   lint-voice rejects it; a rejected string is rewritten and the old and
   new text go in the PR body.

Files to create:
- packages/ui/src/panels/NotesPanel.vue
- packages/ui/test/fixtures/pip-notes.ts
- packages/ui/test/notes.test.ts

Acceptance:
- `npm test -w packages/ui -- notes` exits 0: the fixture assigns all 16
  notes (count asserted against a parse of
  designs/pip/legacy/bench/part1.html, never typed), every pane in the
  PIP fixture has at most one note per panel, and no pane renders a free
  paragraph.
- `node tools/lint-voice.mjs packages/ui/test/fixtures` exits 0.
- The help string of note 11 contains `240 to 481` and `inferred` and
  does not contain `run worse`.

Done when: every PIP note has a declared home and the rail renders no
loose paragraph.

## M09-T10 Drive pad reads

Goal: holding a key on the drive pad, or picking it in the view, shows
what the receiving pin reads, from Part IR metrics, with every number
qualified.

Inputs:
- spec/circuit.ts (ReadModel, McuPinSpec, PinState, ReadOutputs tau, wait, reject)
- reference/keys/flex-pair (M05) expected/report.json and its metrics
- fab-knowledge:evidence/x/pip-controller/bench/part3.js lines 360 to 392 (padKeys, renderPad with pointer capture, padRefresh)
- fab-knowledge:evidence/x/pip-controller/bench/part1.html line 190 (pad markup)
- D-076, D-078, D-079 in ../DECISIONS.md

Steps:
1. `drive.ts` in ui-core builds the pad model from the chase `views.drive`
   declaration and the Part IR: targets, the receiving pin, the read
   model, the per-MCU verdict from the catalog pin table (D-076), the net
   resistance, tau, settle (5 tau), wait and reject.
2. Readout format, one line per held target:
   `<target> <pin> reads <LOW|UNDEFINED|HIGH> on <mcu>, <R> Mohm computed, settles <t> us computed, wait <w> us <qualifier> (<source>, <calibrated|uncalibrated>)`.
   The qualifier comes from the emitter's Qualification for the read
   model's `waitSource` (spec/circuit.ts, D-206): `default` gives
   qualifyRow("inferred"), `coupon` gives the coupon row's tier;
   calibration is a separate flag. Until a coupon exists the PIP default
   reads `wait 3500 us inferred (pip_stick, uncalibrated)`, the qualifier
   and source M05-T05 step 2 records (pip_stick.ino:25); a
   coupon-calibrated wait reads `measured (coupon <id>, calibrated)`
   (D-078, D-079). Measured PIP crossings ran 113 to 2431
   us against a computed settle of 78 us (D-079), so the computed settle
   is never shown as the read time.
3. Gestures: hold on a pad key (pointerdown with pointer capture,
   pointerup and pointercancel release, `touch-action: none`, keys capped
   at 220 px wide); pick in view through `<hb-viewer>` `pick`; idle text
   `all pins idle` with the per-read-model idle state.
4. `BENCH.drive(target, value)` drives the same model and resolves with
   the readout record `{ target, pin, logic, mcu, ohm, settleUs, waitUs,
   waitQualifier, waitSource, calibrated }`, where `calibrated: boolean`
   is false until a coupon calibrates the wait (spec/hook.ts allows
   boolean flags in the drive record).

Files to create:
- packages/ui-core/src/drive/drive.ts
- packages/ui-core/src/drive/format.ts
- packages/ui-core/src/drive/drive.test.ts
- packages/ui/src/stage/DrivePad.vue
- tools/smoke/drive.spec.ts

Acceptance:
- `npm test -w packages/ui-core -- drive` exits 0: the readout for each
  flex-pair key equals the formatted metrics of expected/report.json
  (values read from the golden, never typed); every number in the line
  is followed by a qualifier word.
- `npx playwright test tools/smoke/drive.spec.ts` exits 0 on the
  flex-pair bake: `BENCH.drive(<first key target>, true)` resolves with
  `logic` from the golden; a touch hold on that pad key shows the same
  line; release returns to the idle text.
- Through the PIP legacy adapter (M09-T12), `drive('A', true)` at the
  example preset returns a readout containing `reads LOW` and `1.69
  Mohm`, and `drive('SELECT', true)` one containing `reads HIGH` and
  `0.93 Mohm` (the legacy bench printed `A GP4 reads LOW (1.69 Mohm,
  crosses in 78 us)` and `SELECT GP12 reads HIGH (0.93 Mohm, crosses in
  897 us)`, measured 2026-10-04; values computed by the bench). Across
  the ten PIP example keys the legacy rows read 1.505 to 1.723 Mohm for
  keys and 0.911 to 0.929 Mohm for touch (same run), inside D-079's 1.5
  to 1.72 and 0.91 to 0.93.

Done when: a person can hold a key on the stage and read, in one line,
what the pin sees and which numbers are computed.

## M09-T11 BenchHook in fab benches

Goal: every bench ui builds exposes `BENCH` on globalThis exactly as
spec/hook.ts declares, driven by the ui-core core.

Inputs:
- spec/hook.ts (BenchHook, EXPORT_ALIASES; D-128)
- fab-knowledge:synthesis/api-library-ai-design.md section 11.7
- fab-knowledge:evidence/x/pip-controller/bench/part2.js lines 405 to 428 (getter style, base64 exportBytes)

Steps:
1. `installHook(core, { exports, verbs })` in
   `packages/ui-core/src/bench/hook.ts` defines `globalThis.BENCH` with
   getters `ready`, `state` (setter replaces and rebuilds), `model`,
   `rev`, `built`, `busy`, `buildHash`, and members `log`, `settled()`,
   `loadDesign`, `designJson`, `ensureMesh`, `commit`, `drive`,
   `exportBytes`, `verbs`.
2. `settled(timeoutMs)` resolves when `ready && !busy && built === rev`
   and rejects after the timeout with the state that blocked it.
3. `exportBytes(kind)` resolves aliases through `EXPORT_ALIASES`
   (`print-card` to `card`, `design` to `json`, `stlzip` to `stl`), awaits
   `ensureMesh()`, pauses the viewer, and returns base64 (PIP's chunked
   `btoa` over 0x8000-byte slices). An unknown kind rejects with
   `unknown export <kind>`. Fabrication kinds go through the exporter
   registry and run the build and every check first (D-109); in a bench
   the export button press is the person's approval, and an export with a
   failing check stays disabled with the failing check named.
4. `ready` turns true only after the first build settles, so a test
   that waits on `ready` then `settled()` sees a model.

Files to create:
- packages/ui-core/src/bench/hook.ts
- packages/ui-core/src/bench/hook.test.ts

Acceptance:
- `npm test -w packages/ui-core -- hook` exits 0: the installed object
  type-checks as `BenchHook` (`satisfies` in the test), `settled()`
  resolves after a commit once the build ends, aliases map as listed.
- The conformance suite of M09-T12 passes on every fab bake.

Done when: a fab bench needs no adapter.

## M09-T12 BenchHook conformance with legacy adapters

Goal: one Playwright suite proves the frozen hook on every baked bench,
fab bakes directly and the legacy corpus through adapters.

Inputs:
- designs/{pip,toggle,knuckle,tenon,cotter}/legacy/*.html (M09-T01)
- fab-knowledge:synthesis/plan-deltas.md R79 (hook drift table)
- fab-knowledge:evidence/x/toggle/src/src/part4.js lines 88 to 108
- fab-knowledge:evidence/x/knuckle/src/part4.js lines 570 to 601, part5.js lines 39 to 170
- fab-knowledge:evidence/x/tenon/src/src/part2.js lines 6 to 73, part3.js lines 43 to 175
- fab-knowledge:evidence/x/cotter-src/src/app1.js line 68, app3.js lines 13 to 14 and 165 to 190

Steps:
1. `tools/hook/benches.ts` lists the benches under test: every
   `dist/bench/*.html` from the bake and every `designs/*/legacy/*.html`.
   A legacy HTML with no adapter fails the suite with `no adapter for
   <file>`, so "every baked bench" stays true as the corpus grows.
2. `tools/hook/legacy-adapters.ts` maps each legacy shape onto
   BenchHook. Each adapter names the sha256 it was written against and
   refuses a different file.

| bench | ready | rev and built | busy | designJson and loadDesign | export kinds | drive |
|---|---|---|---|---|---|---|
| PIP | `BENCH.ready` | `BENCH.rev`, `BENCH.built` | `BENCH.busy` | members | 3mf, stl, card, json, ino, svg, coupon | presses `#padKeys button[data-k=<target>]` with pointer events and returns `#padRead` text |
| TOGGLE | `BENCH.ready` | synthesised: rev counts adapter commits and loads; built follows rev when `model()` reports neither dirty nor building | `model().dirty or model().building` | globals | 3mf, stl, json, card, pinout | not provided; `setTilt` and `set` exposed as verbs |
| KNUCKLE | `BENCH.ready` | rev from `state().rev`; built follows rev when idle | `model().dirty or model().building` | globals | 3mf, stl, laser, card, json, png | not provided; `audit`, `derive` as verbs |
| TENON | `BENCH.ready` | synthesised as TOGGLE | `model().dirty or model().building` | globals | 3mf, stl, card, json | not provided; `rebuild`, `blankState`, `presetState`, `massReport` as verbs |
| COTTER | `BENCH.ready` | synthesised; built follows rev when `idle()` | `!idle()` | members | json, kit | not provided; `bom`, `plates`, `loadTemplate`, `waitIdle` as verbs |

   `buildHash` is `null` for every legacy bench. A drive that is not
   provided resolves `{ target, readout: "not provided by legacy bench" }`
   and the suite reports that bench's drive test as not run (D-153).
3. The TOGGLE adapter, type-checked under `tsc --strict` with
   `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` on
   2026-10-04 against spec/hook.ts imported as `@hackbuild/spec` (the
   package exports only `.`), shows the form:

```ts
import type { BenchHook } from "@hackbuild/spec";
import { EXPORT_ALIASES } from "@hackbuild/spec";

export type LegacyGlobal = Record<string, unknown> & { BENCH?: Record<string, unknown> };

export interface LegacyAdapter {
  id: "pip" | "toggle" | "knuckle" | "tenon" | "cotter";
  sha256: string;               // the legacy HTML this adapter was written against
  exports: readonly string[];   // kinds the page answers, after EXPORT_ALIASES
  adapt(g: LegacyGlobal): BenchHook;
}

const alias: Readonly<Record<string, string>> = EXPORT_ALIASES;

type Fn = (...a: unknown[]) => unknown;
const fn = (o: Record<string, unknown> | undefined, k: string): Fn => {
  const f = o?.[k];
  if (typeof f !== "function") throw new Error(`legacy hook has no ${k}`);
  return f as Fn;
};

export const toggle: LegacyAdapter = {
  id: "toggle",
  sha256: "865fabfd703dad5c7fefdd1adcb21be715356e3fa1e5d202f986ca4ab9a1977b",
  exports: ["3mf", "stl", "json", "card", "pinout"],
  adapt(g) {
    const B = g.BENCH;
    let rev = 0;
    let built = 0;
    const model = () => fn(B, "model")() as { dirty: boolean; building: boolean };
    const idle = () => { const m = model(); return !m.dirty && !m.building; };
    const hook: BenchHook = {
      get ready() { return B?.["ready"] === true; },
      get state() { return fn(B, "state")(); },
      set state(_v: unknown) { throw new Error("toggle: state is read only; use loadDesign"); },
      get model() { return model(); },
      get rev() { return rev; },
      get built() { if (idle()) built = rev; return built; },
      get busy() { return !idle(); },
      buildHash: null,
      log: [],
      async settled(timeoutMs = 120000) {
        const t0 = Date.now();
        while (!(hook.ready && idle())) {
          if (Date.now() - t0 > timeoutMs) throw new Error("toggle: not settled");
          await new Promise(r => setTimeout(r, 50));
        }
        built = rev;
      },
      loadDesign(json) { rev++; fn(g, "loadDesign")(json); },
      designJson() { return String(fn(g, "designJson")()); },
      async ensureMesh() { await hook.settled(); },
      commit() { rev++; },
      async drive(target) { return { target, readout: "not provided by legacy bench" }; },
      async exportBytes(kind) { return String(await fn(B, "exportBytes")(alias[kind] ?? kind)); },
      verbs: { setTilt: fn(B, "setTilt"), set: (p, v) => { rev++; return fn(B, "set")(p, v); } },
    };
    return hook;
  },
};
```

4. `tools/hook/conformance.spec.ts` runs per bench with the context
   offline: wait for `ready` (120 s ceiling), check member types against
   BenchHook, `settled()`, round trip `designJson` through `loadDesign`
   (whole string for fab bakes; the parsed `state` for legacy benches, as
   PIP smoke.py compares it), call `exportBytes` for each declared kind
   and assert non-empty base64 (a `3mf`, `stl` zip or `kit` starts with
   the zip signature `PK`), call `drive` on the first declared target.
5. The suite writes `out/hook/report.json`: per bench and per test, pass,
   fail or not run, with the reason for not run.

Files to create:
- tools/hook/benches.ts
- tools/hook/legacy-adapters.ts
- tools/hook/conformance.spec.ts
- tools/hook/playwright.config.ts

Acceptance:
- `npx playwright test -c tools/hook/playwright.config.ts` exits 0.
- `out/hook/report.json` lists PIP, TOGGLE, KNUCKLE, TENON, COTTER and
  every fab bake; drive is pass for PIP and the fab bakes and not run for
  the other four legacy benches, each with its reason.
- `npx tsc -p tools/hook` exits 0.

Done when: the hook is proven on the whole baked corpus, and every gap
is a named not run.

## M09-T13 The bake: manifest, PIP parity, fab bakes, CSS lock

Goal: one bake tool turns a per-design manifest into a single offline HTML
file, reproduces the PIP bench byte for byte from its legacy manifest, and
bakes the flex-pair bench and the kit page from ui.

Inputs:
- designs/pip/legacy/ (M09-T01): build_bench.py, build.sh, part files, package-lock.json
- fab-knowledge:evidence/x/cotter-src/tools/build.py (manifold ESM to classic script with `import.meta.url` replaced and `export default Module;` asserted, base64 wasm, `assert n == 1` on every replacement, dash assert)
- fab-knowledge:synthesis/plan-deltas.md R81
- node_modules/@virgilvox/hackbuild-ui/dist/styles/hackbuild.css and tokens.css

Steps:
1. Manifest format, `bake.json` beside the design or reference:

| field | meaning |
|---|---|
| `id` | output name: `dist/bench/<id>.html`, or `dist/legacy/<id>.html` when the shell is a legacy part1.html |
| `shell` | the HTML shell (legacy part1.html) or `ui` for a ui-rendered bench |
| `entry` | for `ui` benches: the TypeScript entry bundled by vite 8.3.2 into one ES module with no code splitting |
| `blocks` | ordered list of `{ from, label }` inline script blocks, each written as `<script>/* <label> */` plus source plus `</script>` |
| `vendor` | CDN tags to replace with files from node_modules, each `{ match, from }`; every match must hit exactly once |
| `wasm` | `{ from, global }`: base64 into a classic script assignment |
| `classic` | ES modules converted to classic scripts as COTTER does, with exactly-one-match asserts |
| `fonts` | `{ family, weight, style, from }` woff2 files inlined as `@font-face` data URIs |
| `css` | stylesheets inlined, with `@import` of a relative file resolved inline; an `@import` of a network URL fails the bake |
| `budget` | size ceiling in bytes, default 16777216 (16 MB, D-129) |

2. `tools/bake/bake.mjs` reads the manifest and writes the file with no
   timestamps, no absolute paths and LF line endings; output order is the
   manifest order. It prints `bake: <path> <bytes> bytes, <n> script
   blocks, sha256 <hash>` and appends the hash to `SHA256SUMS` in the output folder.
3. PIP parity: `designs/pip/legacy/bake.json` lists exactly what
   build.sh and build_bench.py assemble (part1.html with three.min.js r128
   and jszip 3.10.1 inlined from cdnjs tags, fonts Permanent Marker,
   Special Elite, VT323, IBM Plex Mono 400 and 600 from @fontsource 5.3.0,
   then blocks rastermesh.js, orca3mf.js, part10-manifold.js to
   part18-coupon.js labelled as build.sh names them, part2.js, part3.js).
   After `npm ci --prefix designs/pip/legacy` the bake output equals
   pip.html byte for byte. This proves the manifest bake reproduces the
   seed before the fab bakes use it (MILESTONES.md 3.1).
4. Fab bakes: `reference/keys/flex-pair/bake.json` with shell `ui`, the
   flex-pair bench entry, and:
   - three 0.186.1 bundled into the entry module and inlined as one
     `<script type="module">` (D-127); no decoders;
   - manifold-3d 3.5.4 as a classic script plus base64 wasm (COTTER
     pattern), because a module or blob Worker cannot load under file://
     (D-129);
   - jszip 3.10.1;
   - the five faces (D-121 default): Permanent Marker 400, Special Elite
     400, VT323 400, IBM Plex Mono 400, 500, 600 and 700 (the weights the
     hackbuild-ui fonts link loads), Libre Baskerville 400 italic, from
     @fontsource packages at pinned versions recorded in the PR body. The
     PIP bake carries four faces; fab bakes carry five;
   - hackbuild-ui `dist/styles/hackbuild.css` with its `@import
     "./tokens.css"` resolved inline; `fonts.css` is never inlined because
     it imports Google Fonts.
   `packages/ui/kit/bake.json` bakes the kit page the same way into
   `dist/kit/kit.html`.
5. CSS lock: `tools/bake/ui-css.lock.json` holds the hackbuild-ui version
   and the sha256 of each inlined stylesheet as installed. The bake writes
   `<style data-hb-ui="<version>" data-sha256="<hash>">`.
   `tools/bake/check-ui-css.mjs` recomputes from node_modules and from
   each baked file and fails on any mismatch (D-116).
6. Checks inside the bake: fail when the output exceeds the budget, when a
   `vendor` or `classic` match count is not exactly 1, when the design's
   own sources (blocks not marked vendored) contain U+2012 to U+2015 or
   U+2212, or when the output contains `<script src=` or `<link href=`
   pointing off the file.
7. Determinism job `bake-determinism` in CI: on a clean checkout run
   `npm ci` and `npm run bake:all`, record `dist/bench/SHA256SUMS`,
   delete `node_modules` and `dist`, run both again, compare. Equal hashes
   are the requirement (D-129).

Files to create:
- tools/bake/bake.mjs
- tools/bake/manifest.ts (types for bake.json)
- tools/bake/check-ui-css.mjs
- tools/bake/ui-css.lock.json
- tools/bake/test/bake.test.mjs
- designs/pip/legacy/bake.json
- reference/keys/flex-pair/bake.json
- packages/ui/kit/bake.json
- packages/ui/src/bench/entry.ts (the ui bench entry)
- .github/workflows/ci.yml (jobs bake, bake-determinism, ui-css, size)
- package.json scripts `bake:all`

Acceptance:
- `npm ci --prefix designs/pip/legacy && node tools/bake/bake.mjs designs/pip/legacy/bake.json`
  exits 0 and `shasum -a 256 dist/legacy/pip-legacy.html` prints
  a1fa88bd6ffa603c76059567c8b27c804536e39e7c07ec56c58daad55b001263; size
  1924558 bytes (measured 2026-10-04 on the shipped file).
- `node tools/bake/bake.mjs reference/keys/flex-pair/bake.json` exits 0
  and prints a size at most 16777216 bytes; the size is recorded in the
  golden (measured by CI).
- `node tools/bake/check-ui-css.mjs` exits 0; editing one byte of the
  inlined CSS in a test copy makes it exit 1.
- `node --test tools/bake/test/bake.test.mjs` exits 0: a vendor match that
  hits twice fails, an em dash in a design block fails, a network
  `@import` fails, an over-budget fixture fails.
- The `bake-determinism` job is green: two cold runs give equal
  SHA256SUMS.

Done when: the PIP bench rebuilds byte-identical from its manifest and
the fab benches bake to one reproducible file each.

## M09-T14 Smoke: overflow, pink budget, touch-only, network, workers, voice

Goal: the UI laws that can be counted are tests, run on every fab bake,
with the legacy corpus reported beside them.

Inputs:
- fab-knowledge:evidence/x/pip-controller/test/smoke.py (boot, steps, numeric edit, slider release, exports, round trip, widths)
- fab-knowledge:evidence/x/pip-controller/test/overflow.py (offending element list at 390)
- fab-knowledge:synthesis/aesthetic-voice-ux-bible.md sections 5.7 (pink budget), 10 (mobile)
- tools/lint-voice.mjs (`--stdin --kind dom`, M-1-T03)

Steps:
1. `tools/smoke/smoke.spec.ts` per fab bake, context offline, chromium
   with `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist` as
   PIP smoke runs it:
   - boot to `ready`, zero console errors and page errors for the whole
     run;
   - every step at 1280 with a screenshot to the review artifact;
   - one numeric edit and one slider release each raise `BENCH.built`;
   - every declared export returns bytes; design JSON round trips;
   - widths 390, 768, 1280: on every step `document.documentElement.scrollWidth`
     is at most the viewport width; on failure print up to 8 offending
     elements with their right edge (overflow.py form);
   - DOM text of every step piped to `node tools/lint-voice.mjs --stdin --kind dom`
     exits 0 (D-004).
2. Pink budget per view (each step at each width, plus the welcome):
   count visible elements whose computed `background-color`, any border
   side with non-zero width, or (for an element with a direct non-empty
   text node) `color` is `rgb(254, 3, 134)`, minus the structural set
   (header bottom rule, header title dot, current step underline,
   wordmark dot and `build`, the guide strip `STEP N NAME` label, the
   stage pink shadow, range `accent-color`, focus ring and the focused
   input's border and shadow, busy meter segments while building; UI.md
   section 10). Shell components mark structural elements with
   `data-hb-pink="structural"`. More than one remaining element fails and
   prints them. The count per view goes in the report.
3. Touch-only pass: a Playwright project with `hasTouch: true`,
   `isMobile: true`, viewport 390 x 844, no mouse calls. Every step is
   reached by tap; a numeric field is set by tap and typing; a range is
   dragged with touch pointer events; a drive pad key is held with a
   touch pointer; the stage is pinch-zoomed and two-finger panned through
   CDP `Input.dispatchTouchEvent` with two touch points; an export runs by
   tap. The pass fails if any step cannot be completed.
4. Network and workers: count requests whose URL is not `file:` or
   `data:`; the count must be 0. An init script wraps the `Worker`
   constructor and records `{url, type}`; a `blob:` URL or `type:
   "module"` fails (D-129). The legacy benches started zero workers
   (measured 2026-10-04).
5. Legacy report: the same overflow, pink and network measures run on
   `designs/*/legacy/*.html` and go to `out/smoke/legacy-report.json`
   without failing the job; legacy files stay byte-identical. Expected
   from the 2026-10-04 measurements: KNUCKLE scrollWidth 395 at 390; PIP
   pink-coloured background or border elements before subtracting the
   structural set 10, 6, 6 and 7 on its four steps at 1280.
6. Gold suite and report (D-212, TESTING.md 8.5): write the gold specs
   under `tools/smoke/gold/`, one per group, each test titled with its G
   id and tagged `@gold`; this card writes the bench-layer rules of the
   Exit table and leaves the chase-bound rows to M10-T17, which adds them
   to the same files. The applicability fixture writes
   `out/smoke/gold.json`. Write `tools/gold/report.mjs` to the TESTING.md
   8.5 Report subsection: it parses the rule ids and harness column from
   the 8.5 tables, merges the Playwright, Vitest, runtime, check, static
   and person inputs, grades each rule per bench as pass, fail, `n/a`
   with a reason, `not run` with a reason, or `person pending`, prints
   one line per bench and writes `out/gold/report.json`. Write
   `tools/gold/calibration.json` from the six study notes in
   `fab-knowledge:sources/gold/`, one
   row per gold bench and rule with the note line it came from. The
   `browser` job runs `node tools/gold/report.mjs --only <bench-layer
   ids>` after the gold specs; `browser-all` runs it with `--calibrate`.

Files to create:
- tools/smoke/smoke.spec.ts
- tools/smoke/pink.ts
- tools/smoke/touch.spec.ts
- tools/smoke/network.ts
- tools/smoke/legacy-report.spec.ts
- tools/smoke/targets.spec.ts
- tools/smoke/playwright.config.ts (projects desktop and touch-390)
- tools/smoke/gold/build.spec.ts, stage.spec.ts, readouts.spec.ts, warnings.spec.ts, shell.spec.ts, export.spec.ts, mobile.spec.ts, perf.spec.ts
- tools/gold/report.mjs
- tools/gold/report.test.mjs
- tools/gold/test/ (fixture inputs for the report test)
- tools/gold/calibration.json

Acceptance:
- `npx playwright test -c tools/smoke/playwright.config.ts` exits 0. On
  the flex-pair bake every measure runs: overflow none at 390, 768, 1280;
  pink at most 1 per view; touch-only pass complete; network 0; no blob
  or module workers; console errors 0; DOM voice lint exit 0. The kit
  bake has no build and no hook, so it runs overflow, pink, network,
  workers, console and voice only.
- `out/smoke/legacy-report.json` exists and lists all five legacy
  benches with their measures.
- A fixture page with two focal pink buttons fails the pink test; a
  fixture with one focal pink button plus a pink-text readout fails it
  too; a fixture with a 400 px wide element at 390 fails the overflow
  test.
- `tools/smoke/targets.spec.ts` selects the steps strip as
  `nav[aria-label=steps] button` (never `[role=tab]`) and finds every
  target at least 44 x 44 px at 390; the CSS unit test
  `npm test -w packages/ui -- range` finds `.hb-range` at height 44 px
  inside the coarse-pointer and under-820 media blocks.
- The bake manifest test fails a default bake whose manifest lists any
  LGPL item (eecircuit-engine, replicad-opencascadejs, occt-import-js);
  `node tools/licences.mjs --notices` writes THIRD-PARTY-NOTICES.txt from
  the same generator as the bake manifest, and CI fails when the
  committed or built file differs from a fresh generation (LICENSING.md
  1.2).
- `node --test tools/gold/report.test.mjs` exits 0 with every case of
  the TESTING.md 8.5 Report subsection: `57 of 57` on the all-pass
  fixture, exit 2 on an `n/a` without a reason and on an unknown id,
  `not run` and exit 1 on a missing Playwright report, `fail` on G-37
  with the static half failing, exit 0 under `--only` for a fail outside
  the list, and `--calibrate` exit 0 on an expected fail and 1 on a
  recorded pass that now fails.
- On the flex-pair and PIP legacy bakes `node tools/gold/report.mjs
  --only <bench-layer ids>` exits 0 and `out/gold/report.json` lists all
  57 rules for each bench, none missing.

Done when: the countable laws fail a PR that breaks them, the legacy
debt is visible in one report, and every gold rule has a verdict or a
stated reason.

## M09-T15 Exit housekeeping

Goal: M09 closes green under the Part 3 rules of MILESTONES.md.

Inputs:
- ../MILESTONES.md Part 3
- tools/counts.mjs, tools/tiers.json, tools/lint-voice.mjs

Steps:
1. Run the full CI set: house-rules, typecheck, derived, tiers, seed,
   unit, property, contract, parity, determinism, browser (hook
   conformance, smoke, touch-only), bake, bake-determinism, size, ui-css.
2. Re-date the D-040 pin table. M09 adds runtime dependencies that D-040
   does not name: vue, pinia, @vitejs/plugin-vue and the @fontsource
   packages. Pin each exactly, record the versions and dates in PLAN.md
   section 16 and PACKAGES.md, and list them in the PR body for the owner.
3. Regenerate counts (the hackbuild-ui class count, the fab bake list),
   the reference INDEX and llms.txt (D-010).
4. Visual review (D-154): screenshots of every step of the flex-pair
   bench and of the kit page at desktop and 390 px, in paper shell, as a
   PR artifact; a person opens the baked files from disk in a real
   browser and ticks "I looked at the renders". Counting classes
   headlessly is not looking.
5. PR body lists: working names (D-012); owner defaults in force (D-034,
   D-117, D-119, D-120, D-121, D-122) and the chip on-state proposal of
   M09-T02; the hackbuild-ui PR state (open, merged, or published as
   0.3.0); any ShowWhen spec proposal from M09-T08; every acceptance line
   that was not run, with its reason (D-153).
6. Release at exit: when the owner asks, attach `dist/bench/*.html` and
   `dist/bench/SHA256SUMS` to a GitHub release of hackbuild-fab (D-034
   default); nothing is published to a `.hack.build` origin.

Files to create:
- none; results go in the PR body against the Exit table

Acceptance:
- Every CI job green on the PR.
- `node tools/lint-voice.mjs` exits 0.
- `node tools/counts.mjs && git status --porcelain` prints nothing.

Done when: the owner can ask for the M09 merge with every exit row below
proven by a green job or a ticked person check.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| rebuild debounce 320 ms after commit; a commit inside the window restarts it | from source (PIP part2.js `schedule`) | M09-T03 | `npm test -w packages/ui-core -- bench` |
| undo snapshot 450 ms after the last commit, 80 deep | from source (PIP part2.js `HIST`) | M09-T03 | `npm test -w packages/ui-core -- bench` |
| light commit runs zero geometry builds | computed | M09-T03 | `npm test -w packages/ui-core -- bench` |
| `parseLength`: 12, 12mm, 0.5in, 300um, 1.2cm give 12, 12, 12.7, 0.3, 12 mm; unknown suffix, empty, negative and non-numeric text return E_SCHEMA (plan-deltas R35) | computed | M09-T03 | `npm test -w packages/ui-core -- bench` |
| welcome remembered, Guide reopens it, storage throwing does not break boot; share link round trips offline | measured | M09-T04 | `npx playwright test tools/smoke/welcome.spec.ts` |
| CHK-KEY-01 finding located and fixed in one commit, undone in one | measured | M09-T05 | `npx playwright test tools/smoke/locate.spec.ts` |
| viewer live object count back to baseline after 50 commits | measured | M09-T06 | `npx playwright test tools/smoke/viewer.spec.ts` |
| PIP layout rows and groups render from declarations with PIP's ranges and show and hide rules | from source (part1.html, part3.js) | M09-T08 | `npm test -w packages/ui -- rail` |
| 16 PIP notes assigned a home; note 11 carries 240 to 481 ohm cm vendor and the inferred printed row | counted; vendor; inferred | M09-T09 | `npm test -w packages/ui -- notes` |
| drive pad readout equals the flex-pair golden; PIP legacy A reads LOW at 1.69 Mohm, SELECT HIGH at 0.93 Mohm | computed (by the bench), measured readout 2026-10-04 | M09-T10 | `npx playwright test tools/smoke/drive.spec.ts` |
| BenchHook conformance on every baked bench; legacy drives reported not run where absent | measured | M09-T11, M09-T12 | `npx playwright test -c tools/hook/playwright.config.ts` |
| PIP manifest bake equals pip.html, sha256 a1fa88bd...1263, 1924558 bytes | measured | M09-T13 | `node tools/bake/bake.mjs designs/pip/legacy/bake.json` |
| fab bakes at most 16777216 bytes; zero network at load; no blob or module workers | measured | M09-T13, M09-T14 | `node tools/bake/bake.mjs reference/keys/flex-pair/bake.json`; smoke |
| same sha256 on a cold rebuild | measured | M09-T13 | CI job `bake-determinism` |
| baked CSS hash equals the pinned hackbuild-ui version | measured | M09-T13 | `node tools/bake/check-ui-css.mjs` |
| no overflow at 390, 768, 1280; one focal pink per view; touch-only pass at 390; DOM voice lint clean | measured | M09-T14 | `npx playwright test -c tools/smoke/playwright.config.ts` |
| hackbuild-ui 0.3.0 branch with bench layer, D-118 tokens and GUIDELINES v1.3; owner merges and publishes | n/a | M09-T02 | in the hackbuild-ui branch: `npm run typecheck && npm run build` |
| gold checklist G-01 to G-57 (`fab-knowledge:synthesis/gold-standard.md` section 11) reported per rule on the flex-pair and PIP legacy bakes: pass, `n/a` with a reason, or not run; zero fails among the bench-layer rules G-03 to G-06, G-10, G-11, G-14 to G-18, G-21, G-33, G-36, G-37, G-40, G-42 to G-46, G-51 to G-54, G-57 (D-212) | measured | M09-T11, M09-T14 | `npx playwright test -c tools/smoke/playwright.config.ts --grep @gold && node tools/gold/report.mjs --only <bench-layer ids>` |
| ready under 4 s, first build under 600 ms, commit to settled p90 under 2 s, 3MF under 1 s, build over 1 s shows `building`, over 2.5 s logs the param to lower (swiftshader) | measured | M09-T14 | browser job `runtime.json` (TESTING.md 8.3, D-213) |
| hook `error` set by a forced throw and cleared by a valid commit; unknown export kind rejects with `unknown export kind: <k>`; out-of-range `state` write clamped and logged under 100 ms | measured | M09-T11 | `npx playwright test -c tools/hook/playwright.config.ts` (D-214) |
| CI green incl. house-rules, derived, tiers, determinism; renders looked at at desktop and 390 px | n/a | M09-T15 | CI and the PR checkbox |

Decides: D-004, D-006, D-007, D-010, D-012, D-034, D-040, D-044, D-045, D-055, D-064, D-076, D-078, D-079, D-080, D-081, D-109, D-116, D-117, D-118, D-119, D-120, D-121, D-122, D-123, D-124, D-125, D-126, D-127, D-128, D-129, D-130, D-132, D-142, D-153, D-154, D-156, D-166, D-167, D-212, D-213, D-214, D-215, D-216, D-218, D-219, D-220, D-221
