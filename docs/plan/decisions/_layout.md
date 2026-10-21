# Decisions

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

This file is the decision log for hackbuild-fab. Entries D-001 to D-164 carry the id, title, status and decision text of the architect record, `fab-knowledge:plan/_architect.md` section 2, under the same group headings. PLAN.md sections end with a `Decides:` line that cites these ids. Where this file and another plan document disagree on a decision, this file wins; where this file and `fab-knowledge:synthesis/verified-claims.md` disagree on a fact, verified-claims.md wins and the disagreement goes under Gaps found while writing.

Names follow the plan set conventions: hbf (working name) is the binary, CHASE (working name) the typed design document, STYLUS (working name, was FEELER) the printed sensor design, tools.hack.build (proposed) the cookieless bench origin, and PIP (was HAFT) the published print-in-place controller, hackbuild/pip-controller.

After M-1 this file lives at `docs/plan/DECISIONS.md` in hackbuild-fab and the copy in fab-knowledge/plan/ is frozen (D-162).

## Status

| status | meaning | what the builder does |
|---|---|---|
| decided | settled by evidence or by the architect record | acts on the decision text as written |
| owner | only the owner can settle it | uses the default in the decision text, keeps working, and lists the question in the PR body (CLAUDE.md, Owner decisions) |
| superseded | a later entry names this one in its Supersedes row | follows the later entry |

As of 2026-10-08 the log holds 238 entries: 182 decided, 48 owner, 8 superseded. D-176 was never issued. D-165 to D-211 were added after the architect record from named reviews: D-165 from a cold-start review of arch.apply; D-166 to D-169 from a completeness review of the plan set (security, permanent addresses, distribution and community); D-170 to D-172 from a review of LICENSING.md section 7 gaps L-01, L-02 and L-08 (then numbered G-01, G-02, G-08); D-173 to D-179 from expert reviews of 2026-10-04; D-180 to D-190 from the plan audit and the Downloads readers of 2026-10-04 (`fab-knowledge:sources/downloads/README.md`); D-191 to D-211 from the cross-file followups of that audit (`fab-knowledge:audit/AUDIT.md`); D-212 to D-221 from the gold standard of 2026-10-05 (`fab-knowledge:synthesis/gold-standard.md`); D-222 and D-223 from owner instructions of 2026-10-05; D-224 to D-226 from the implementation audit of 2026-10-05; D-227 from the implementation audit of 2026-10-06; D-228 from the M01-T06 build of 2026-10-06; D-229 from the M01-T07 build of 2026-10-06; D-230 from the skills and design downloads reader of 2026-10-06 (`fab-knowledge:sources/downloads/skills-2026-10-06.md`); D-231 to D-233 from the M02 build of 2026-10-07 (`.hbf-notes/m02-report.md`); D-234 to D-238 from the virtual exit B of 2026-10-07, D-234 on an owner instruction of that day (`fab-knowledge:evidence/virtual-print/VIRTUAL-EXIT-B.md`); D-239 from the plan-drift audit of 2026-10-08 (`fab-knowledge:evidence/audit2/plan-drift/`). From M-1 onward tools/counts.mjs generates these counts (D-010).

## Rules for this log

- Entries are append-only after M-1. Nobody edits an entry's text, status or rows in place.
- Each entry is a file `docs/plan/decisions/D-NNN.md` holding its index row, a blank line and the entry; this file is generated from those files and `docs/plan/decisions/_layout.md` by `npm run registries` (R1-split-01). Add a file, never edit this one.
- A change is a new entry with the next free id. Its Supersedes row names the entry it replaces by id. The replaced entry then counts as superseded; the index below shows its status as `superseded by D-###`, and its body stays as written.
- An owner answer is recorded the same way: a new decided entry that supersedes the owner entry and quotes the answer with its date.
- A new entry carries all six rows. Evidence paths are absolute. A number in a new entry carries a qualifier (measured, computed, vendor, inferred, unknown) per D-007.
- Before M-1 lands, a change to an entry's Status or Decision is a new entry with the next free id, sourced from verified-claims.md, the architect record or a named review with its date. A Rationale, Evidence or Supersedes row may be corrected in place before M-1 when the corrected row names its source. The architect record is frozen from 2026-10-04; where it and this file differ, this file wins.

## How to read an entry

| row | content |
|---|---|
| Status | decided or owner, as in the architect record |
| Decision | the architect decision text, unchanged; for an owner entry it states the default in force |
| Rationale | the architect rationale where the record gives one inline, otherwise the rationale of the same entry in the architect decision log data |
| Evidence | absolute paths to the files that support the decision, with section, line or row notes |
| Supersedes | the v3 PLAN.md section or open decision, the handoff file, and the plan-deltas rulings (R##) and owner items (D#) the entry replaces or settles; `new` when nothing earlier covered it |
| Milestone | where the builder first acts on it (M-1, M00 to M16), or `none` when no milestone waits on it |

Path roots used in Evidence rows:

| root | absolute path |
|---|---|
| v3 plan, handoff | `fab-knowledge:evidence/x/plan-to-refine` |
| PIP (was HAFT) clone | `fab-knowledge:evidence/x/pip-controller` |
| other scratch clones (knuckle, tenon, toggle, cotter-src) | `fab-knowledge:evidence/x` |
| knowledge base | `fab-knowledge` |
| harvested corpus | `fab-work-directory` |
| owner repos | `hackbuild` |

Section 22 of v3 PLAN.md is the list of 20 open decisions; "v3 open decision N" refers to it. "plan-deltas R##" and "plan-deltas D#" refer to rulings and owner items in `fab-knowledge:synthesis/plan-deltas.md`.

## Index

| id | title | status | group |
|---|---|---|---|
<!-- decisions:index -->

## House rules and process

<!-- decisions:entries D-001 D-011 -->

## Names

<!-- decisions:entries D-012 D-017 -->

## Scope, claim and position

<!-- decisions:entries D-018 D-024 -->

## Repos, packaging, toolchain, licensing

<!-- decisions:entries D-025 D-043 -->

## Architecture

<!-- decisions:entries D-044 D-057 -->

## Feature kinds

<!-- decisions:entries D-058 D-063 -->

## Constraints and checks

<!-- decisions:entries D-064 D-075 -->

## Electrical

<!-- decisions:entries D-076 D-094 -->

## Canons, reference, profile, catalog

<!-- decisions:entries D-095 D-105 -->

## Agent surface

<!-- decisions:entries D-106 D-115 -->

## UI

<!-- decisions:entries D-116 D-130 -->

## CHASE

<!-- decisions:entries D-131 D-133 -->

## Sim, motion, nest, inlay, tools

<!-- decisions:entries D-134 D-151 -->

## Testing, docs, milestones, registry

<!-- decisions:entries D-152 D-169 -->

## Licensing additions

Appended before M-1 from LICENSING.md section 7. Each closes one gap that had no entry; the gaps L-03 to L-07, L-09 and L-10 stay open there.

<!-- decisions:entries D-170 D-172 -->

## Additions after the architect record

Appended before M-1 from named reviews dated 2026-10-04. Each cites its review or source in its Rationale and Evidence rows.

<!-- decisions:entries D-173 D-211 -->

## Gold standard

Appended 2026-10-05 from `fab-knowledge:synthesis/gold-standard.md`, the study of the six benches the owner named as their best (TOGGLE, BLOCKS, PIP/HAFT, COTTER, COLLAR, TANG R6), each driven in headless Chrome at 1280 x 860 and 390 x 844 on 2026-10-05. Study notes are `fab-knowledge:sources/gold/*.md`; screenshots are `fab-knowledge:evidence/gold/<bench>/shots/` (526 PNGs, counted). "G-NN" is a rule of gold-standard.md section 11; "P-NN" is a plan gap of its section 12.

<!-- decisions:entries D-212 D-230 -->

## Findings from the M02 build

Appended 2026-10-07 from the M02 sim report, `.hbf-notes/m02-report.md`, and its verifier round 2 logs under `fab-knowledge:evidence/m02-verify/r2/`. Each entry reran the original code beside the port before it was written.

<!-- decisions:entries D-231 D-233 -->

## Findings from the virtual print

Appended 2026-10-07 from the virtual exit B of the keys flex-pair reference, `fab-knowledge:evidence/virtual-print/VIRTUAL-EXIT-B.md`. Nothing was printed; every figure below is computed unless it says measured.

<!-- decisions:entries D-234 D-238 -->

## Findings from the audit of 2026-10-08

Appended 2026-10-08 from the plan-drift lens of the implementation audit, `fab-knowledge:evidence/audit2/plan-drift/`. The log is append-only, so a wrong figure in an earlier entry is corrected here and the earlier entry stays as written.

<!-- decisions:entries D-239 D-251 -->

## Findings from the audit of 2026-10-11

Recorded by the third implementation audit (honesty-drift lens) over M05 to M08 and the M06 and M08 integration.

<!-- decisions:entries D-252 D-255 -->

## Findings from the M09 build

Recorded by the M09 close of 2026-10-12 from the builder, verifier, gold and fixer reports (`.hbf-notes/m09-report.md`).

<!-- decisions:entries D-256 D-273 -->

## Owner calls of 2026-10-14

Taken by the agent under owner delegation on 2026-10-14: the owner asked the work to continue without them looking at anything. Where a person was meant to look at a render, an agent looked with the Read tool, and each entry says so. Evidence lives in `fab-knowledge:evals/2026-10-14/calls/`; the independent recheck is `fab-knowledge:evals/2026-10-14/calls/verify.md`.

<!-- decisions:entries D-274 D-285 -->

## Calls of release 1, from 2026-10-20

Taken by the agent under the owner delegation of 2026-10-20 for release 1 of plan v9 (`fab-knowledge:plan-v5/PLAN.md` section 6). The owner can reverse any of them.

<!-- decisions:entries D-286 on -->

## Owner queue

Every owner entry, with the default the builder uses until the owner answers. As of 2026-10-07 the queue holds 48 entries; from M-1 onward tools/counts.mjs generates the count. Answered since the architect record: D-148 by D-186, D-149 by D-180 and D-150 by D-187, from owner files found in Downloads. D-015 is carried by D-189. D-042, D-170, D-185 and D-257 were answered by the owner on 2026-10-13. D-249 and D-254 were answered by the agent under owner delegation on 2026-10-14 (D-276, D-277).

| id | question | default in force | what an answer unblocks |
|---|---|---|---|
| D-005 | Which commit subject form does hackbuild-fab use? | imperative, lowercase, under 60 characters, no trailing punctuation, optional lowercase package scope (`mesh: freeze pinch healer after three flips`), no type word; body wrapped at 72 saying what failed, what changed, and what was and was not verified, with old and new numbers when a number moved. | the first commit and the commit-msg hook subject test |
| D-011 | Should the hackbuild-resume commits with AI trailers be rewritten? | guard forward only; no history rewrite. | closes the hackbuild-resume item; no fab work waits on it |
| D-012 | Are hbf, CHASE and STYLUS the final names? | use `hbf` (binary), CHASE (document format) and STYLUS (was FEELER) as working names, marked "(working name)" on first use in each document and listed in the first PR body. RABBET stays rejected. | the binary name, the MCP server key mcp__hbf__*, the package bin field and docs freeze at kernel 1.0 |
| D-016 | Is the DETENT machine id detent-28byj and the feature kind detent? | keep the `detent` feature kind; the DETENT machine profile id becomes `detent-28byj`. | the M07 machine profile id |
| D-019 | Is shop work (lumber, paint, yardage, crew, costing) in scope? | lumber, paint, yardage, crew scheduling and costing are out of scope; GUSSET stays a HeatSync tool; its MaxRects with five sort orders and first-fit-decreasing lumber packing are mined into `nest`. | the GUSSET registry row (D-158) and any shop package |
| D-030 | Archive hackbuild-radio, or make it the radio driver package? | archive the empty repo (created 2026-08-06T20:15:59Z, 13 minutes 7 seconds before hackbuild-bench); no radio.hack.build. Radio lives in hackbuild-bench. | REPOS.md state; no milestone waits |
| D-031 | Add DNS for app.hack.build? | docs cite https://hackbuild.github.io/hackbuild-bench/ ; app.hack.build has no DNS record and no Pages CNAME, and adding one is the owner's DNS change. | every doc link to the device bench |
| D-032 | Transfer virgilvox/hackbuild-beam into the hackbuild org? | transfer virgilvox/hackbuild-beam (created 2026-08-05) into the hackbuild org before M13. | M13 BEAM parity in the transferred repo |
| D-033 | What is hackbuild-site and where does the registry live? | hackbuild-site does not exist and live hack.build is the private hackbuild-resume on Netlify; the registry data lives in `hackbuild-fab/registry/` until a site repo exists; the site default is a CommonPub thin app plus a static front page on hackbuild-ui. | M16 registry publishing and the BENCH union page |
| D-034 | Which origin hosts baked benches, and which subdomains exist? | baked benches publish as GitHub release assets and on hackbuild-fab GitHub Pages until a cookieless origin exists (proposed `tools.hack.build/<slug>/<sha>.html`, working name); never on the signed-in `.hack.build` cookie origin. fab.hack.build, sketch.hack.build and blocks.hack.build are proposals; every DNS change is the owner's. | M09 publishing of baked benches beyond release assets |
| D-037 | Will the owner create the npm org hackbuild before the first publish? | the owner creates the npm org `hackbuild` before the first publish; until then nothing publishes. Names `@hackbuild/kernel`, `hackbuild-3mf` (npm) and `hackbuild_3mf` (PyPI) are checked for availability at M00. | the hackbuild-3mf 0.1.0 publish at M00 exit and @hackbuild/kernel |
| D-038 | npm workspaces or pnpm 12.9.1? | npm workspaces with a committed package-lock.json, exact pins, `npm ci` in CI (owner repos and pip-controller use npm). pnpm 12.9.1 with catalogs is the alternative. | M-1 T01 lockfile and every CI install step |
| D-080 | Raise pip.ino KEY_WAIT_US from 200 to 3500 us? | hackbuild-fab does not edit pip-controller; the gap is recorded in RISKS.md and in the archetype provenance; the owner decides whether to raise pip.ino to 3500 us. | removes RISKS.md R-21; the archetype provenance note |
| D-082 | When will the owner print the coupons and measure the chips and parts? | none until the owner prints them: Yousu cPLA and cTPU four-wire coupon along, across and through at shop settings; real RP2040, Pico and C3 pullups and thresholds; SG90 dimensions; KNUCKLE hinge and TENON threads; COTTER hook on the real board. Until then fabrication exports carry inferred warnings and public claims state the tier. | promotes resistivity, pin and catalog rows from inferred or vendor to measured; removes export warnings |
| D-083 | Is measured a fifth tier between verified and vendor? | five tiers, highest first: verified (manufacturer drawing, parsed), measured (shop coupon with machine, coupon id, date, method), vendor, community, inferred. | the Tier union in spec/ids.ts and the profile seed |
| D-087 | Which BLOCKS standard is canonical? | none until a print. BOSS v1 is sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24; the later blocks.html is sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2 and exports 0.2; the export layer must equal the chosen standard. The stale 0.24 text in blocks.html (PRINT NOTES, DEFAULT_PRINTER, printCard fallback) is fixed on port. | the BLOCKS port export layer and the blocks-stud archetype |
| D-088 | Is the SuperMini dual-supply jumper normally open or normally closed? | normally open (SPINDLE), against TRUNNION's normally closed. | the c3-carrier archetype default at M06 and board emit at M08 |
| D-094 | Can the rtl-sdr driver leave the hackbuild-bench app? | stays in the hackbuild-bench app only. | M13 link driver extraction scope |
| D-117 | Keep @virgilvox/hackbuild-ui or rename to @hackbuild/ui? | keep @virgilvox/hackbuild-ui, the name that installs today; @hackbuild/ui is the alternative its README names. | the M09 dependency line and the 0.3.0 upstream release |
| D-119 | Where do undo, redo, open, save and guide sit? | GUIDELINES 4c; the header holds identity and state; undo, redo, open, save and guide sit at the right end of the guide strip. | the M09 shell header and guide strip |
| D-120 | One shell system, or a separate dark instrument shell? | one system; paper shell for every kind except board; instrument density (full-bleed void, floating ink panels, VT323 heads) for the board kind and live device views; CONDUYT teal and JetBrains Mono never appear in fab. | the M09 shell family and board kind styling |
| D-121 | Which face sets tool taglines? | Special Elite for tool taglines in headers; Libre Baskerville italic only for "make things. break things. repeat."; bakes include all five faces. | M09 header typography and bake font set |
| D-122 | 32 px at 10 percent or 26 px graph rule? | 32 px at 10 percent pink for new work; shipped benches keep 26 px until rebaked. | M09 stage background tokens |
| D-144 | Keep SKETCH v3's solver or adopt planegcs? | keep SKETCH v3's damped Gauss-Newton with rank DOF; planegcs (LGPL-2.1 on GitHub, LGPL-2.0-or-later on npm, 892 KB) is not adopted; the v3 line "stop building the sketch constraint solver" is deleted. | the M12 FAB app shell built on the SKETCH reference |
| D-147 | Where do brand packs live? | a brand registry with a brand.json contract; HeatSync assets from the heatsync skill; app chrome stays hack.build. | COTTER port and any client-branded design |
| D-151 | When do teen and class kits start? | after M06. | kit references after M06 |
| D-168 | Which channels carry hack.build designs and kits, and do paid bounties or contests run? | hack.build tools at the D-167 pattern (release assets until the host exists); npm and PyPI after D-037; an MCP docs page at M12; Printables and MakerWorld cross-posts, non-exclusive, chase attached, never MakerWorld Exclusive; Tindie for SAO and circuit-card kits after M06; CommonPub build logs once a site exists; no bounties or contests until the owner sets rules. | listing copy, the kit bake, the M12 docs page and any bounty rules |
| D-171 | Are the hack.build name and logo reserved as marks? | yes; TRADEMARKS.md at the root and in hackbuild-3mf; `reference/copper/_inputs/hackbuild-logo.svg` excluded from the MIT grant. | the hackbuild-3mf 0.1.0 publish and any fork's naming |
| D-172 | Are emitter and exporter templates MIT-0? | MIT-0 for template text copied into user outputs; the filling code stays MIT. | M00 3MF writer templates and the firmware emitters |
| D-189 | What are the final names for the colliding slugs STAVE, TANG, TACK, TENON, KERF, SPLINE, TESSERA, SHIM, HASP, GROMMET, DETENT, PAWL, SPOOL? | namespace slugs by group (`copper/stave`, `laser/stave`), rename the laser STAVE to a CASK process variant, and gate the registry on uniqueness and the never-suggest list. | the M16 slug uniqueness gate and names.json |
| D-192 | Which plan files stay living after M-1? | DECISIONS.md, MILESTONES.md Parts 1 and 4 and the current card stay living; the rest freeze at M-1; tables and counts are generated. | the M-1-T13 copy and the docs counts job |
| D-195 | Is code inside a design folder (build.ts, bench.ts, src/**) MIT? | MIT; chase.ts, geometry, exports and docs follow ChaseMeta.license. | the LICENSING.md path map and L-04 |
| D-196 | Does text on a pink fill turn ink (4.62:1) in place of paper (3.32:1)? | ink, through `.hb-on-pink` in fab glue and proposed upstream in the 0.3.0 PR | the M09-T14 axe gate on the focal element; GUIDELINES v1.3 |
| D-197 | Does ghost stay the default render? | ghost by default, conductive and flex bodies solid | the M09 stage default and the bake screenshots |
| D-198 | Is CHK-PRT-04 limited to perimeter-band walls, and is the flex-pair pocket clearance 0.26 per side? | yes to both | M-S exit A for CHK-PRT-04 and CHK-FIT-01 |
| D-199 | Is there a derived qualifier for geometry-only claims? | not adopted; such claims read computed | the spec/checks.ts verdict schema and RULES.md qualifier list |
| D-200 | Do sealed-pocket floor and roof count all plastic, or only the wall to the inlay body? | all plastic below and above; pauseBefore is z only | the M03 sealed-pocket check and the COLLAR NFC fixtures |
| D-201 | Pin trusted build.ts by defHash before first run? | not adopted; a person reviews a build.ts they did not write | an `hbf trust` verb and an MCP refusal for untrusted builds |
| D-202 | Is snap-vee-finger-cage a sixth snap form? | listed, kept out of the M06 counts | the M06 snap family count |
| D-211 | Reserve `hbf` or `@hackbuild/hbf` on npm? | `npx --no-install hbf` everywhere; reserve when the org exists | the CLI package name and the D-037 publish |
| D-220 | Does slot colour reach the stage, legend and 3MF, as in TANG, TOGGLE, COLLAR and COTTER? | yes: `MaterialSlot.preview` (hex) drawn on stage, legend and art boards and written as the slot's 3MF filament colour; a colour edit is a light commit | `MaterialSlot` in spec/chase.ts, the M09 legend and the M10 3MF colour write |
| D-221 | Does the stage legend replace the materials panel pinned first on every pane? | yes: the legend is the colour key on every step (chips under 640 px); materials and resistivity are a step pane or a fold in the first step | UI.md 6.3 rail order and the M09 rail layout |
| D-230 | Do organic surfaces get an SDF level set route in the `MeshRoute` union, or stay imported meshes? | no new route; BUCK's head and any organic part enter as an `imported` part source with a provenance tier; the SDF level set waits as a CANONS.md backlog note | an `sdf` member in `packages/mesh` with its guarantees and reference, and a parametric BUCK port instead of a fixed head mesh |
| D-231 | Does PAWL stay on Rapier 0.21.0 with 9 of 17, get retuned for 0.21.0, or run on a second 0.14.0 pin (15 of 17)? | keep `@dimforge/rapier3d-deterministic-compat` 0.21.0 (D-134); PAWL scene blocked with the legacy set declared; no constant retuned; both records kept (0.14.0 15 of 17, 0.21.0 9 of 17, computed) | the M02 PAWL exit row and the `machines/pawl-leg` expected sim record at M10 and M11 |
| D-238 | Which slicer presets do the flex-pair TPU 95A (slot 3) and cTPU (slot 4) slots name? | keep `Generic TPU @FF C5P` with the PRESET_INFERRED warning (D-187); headless slices map it to `Generic TPU-95A @FF C5P` as an inferred stand-in | the writer filament names, the print card and the EXIT-B.md slot table |
| D-248 | Where does a printed conductor get its material, and what hosts a trace that is its own only body? | the conductor's declared material, read by featureMaterial before the body's; the trace gets a PETG skin host of `stack.skin` under it, as the PIP buried stack lays trace layer 1 (reference/electrical/trace-width-budget built so) | how single-material printed traces are declared at M06 and M08; whether stage 5 lets a conductor claim its body |
| D-250 | Node 24.11 as the dev floor, Node 24 only for the tscircuit backend, or an older tscircuit set on 22.18? | Node 24.11 as the dev floor (D-039 range unchanged); until answered the four tscircuit packages stay uninstalled and M08-T10 and M08-T11 do not run | M08-T10, M08-T11, the tscircuit pins and the LUG, AUGER and Circuit JSON exit rows |
| D-259 | May a byte-identical legacy file that writes dashes as escapes enter designs/*/legacy, or does it stay outside the repo? | the COTTER baker build.py stays outside; lineage records it with dest null and M09-T13 ports from the originals path | the M09-T01 done-when for that file and a lint-voice escape exemption under designs/*/legacy |
| D-265 | Are the PIP legacy gold rows report-only, outside the M09 zero-fail count? | report-only against tools/gold/calibration.json; rules with no subject on the legacy page grade n/a with a reason | the M09 gold Exit row; the PIP fixes wait for the M10 rebuild from a chase |

## v3 open decisions to D ids

v3 PLAN.md section 22 listed 20 open decisions. Each now maps to one entry.

| v3 open decision | question in v3 | entry | status |
|---|---|---|---|
| 1 | Confirm hbf, STYLUS, CHASE | D-012 | owner |
| 2 | TypeScript or plain ESM with JSDoc | D-141 | decided |
| 3 | three.js version | D-127 | decided |
| 4 | STYLUS as one design with an archetype registry | D-164 | decided |
| 5 | Python's role | D-140 | decided |
| 6 | Where designs live | D-142 | decided |
| 7 | Whether link subsumes conduyt-js | D-093 | decided |
| 8 | Whether SKETCH and BLOCKS graduate to repos | D-143 | decided |
| 9 | How much of the two canons ships in M6 | D-097 | decided |
| 10 | Catalog caching versus on-demand | D-103 | decided |
| 11 | The planegcs LGPL question | D-144 | owner |
| 12 | Whether CrossSection replaces Clipper2 | D-163 | decided |
| 13 | Whether ngspice per tick is fast enough | D-086 | decided |
| 14 | Whether the four overlays justify Reka UI | D-130 | decided |
| 15 | Whether TresJS earns a place | D-130 | decided |
| 16 | Chase as JSON or TS module | D-131 | decided |
| 17 | Six kinds fixed or extensible | D-126 | decided |
| 18 | When BRep lands | D-024 | decided |
| 19 | Two canons, one registry or two | D-095 | decided |
| 20 | Rapier deterministic speed for thirty-trial runs | D-134 | decided |

## plan-deltas owner items D1 to D26 to D ids

plan-deltas.md section 4 listed 26 owner items with defaults. The column v4 default compares the default in force here with the plan-deltas default.

| plan-deltas item | question | plan-deltas default | entry | v4 default |
|---|---|---|---|---|
| D1 | design system package name | move to @hackbuild/ui before fab depends on it | D-117 | changed: keep @virgilvox/hackbuild-ui, the name that installs today |
| D2 | what hackbuild-site is | CommonPub thin app plus static front page on hackbuild-ui | D-033 | same, plus registry in hackbuild-fab/registry/ until then |
| D3 | radio.hack.build and hackbuild-radio | drop the domain, archive the repo | D-030 | same |
| D4 | transfer hackbuild-beam | yes | D-032 | same, before M13 |
| D5 | commit subject convention | lowercase imperative, no prefix | D-005 | changed: optional lowercase package scope |
| D6 | header verbs and shells | GUIDELINES 4c, one shell | D-119, D-120 | same |
| D7 | tagline face | Libre Baskerville per GUIDELINES; fix benches on port | D-121 | changed: Special Elite for taglines, Baskerville only for the motto |
| D8 | graph rule | 32 px | D-122 | same; shipped benches keep 26 px until rebaked |
| D9 | package manager | npm | D-038 | same |
| D10 | SKETCH constraint solver | keep v3's solver | D-144 | same |
| D11 | names hbf, STYLUS, CHASE; detent kind vs DETENT machine | keep hbf and CHASE; detent kind, machine id detent-28byj | D-012, D-016 | same |
| D12 | licence defaults and failure corpus | open corpus, CC BY-SA designs, CERN-OHL-W boards | D-041, D-042, D-185 | same defaults, decided by the owner 2026-10-13 (D-042, D-185); OSHWA cost marked unverified |
| D13 | MCP tool name form | underscores, measured in an eval | D-107, D-113 | decided: underscores; prefix vs suffix eval before freeze |
| D14 | shop scope | out of scope | D-019 | same |
| D15 | rtl-sdr driver licence | app only | D-094 | same |
| D16 | measured as a fifth tier | fifth tier | D-083 | same |
| D17 | canonical BLOCKS standard | none until a print | D-087 | same |
| D18 | SuperMini jumper default | normally open | D-088 | same |
| D19 | colliding slugs | namespace by group, laser STAVE to a CASK variant | D-015, D-189 | same; collision list widened to thirteen names (D-189) |
| D20 | brand packs | brand registry, heatsync skill assets | D-147 | same |
| D21 | missing sources | recover, rewrite or drop each | D-149, D-180, D-136 | decided (D-180): nine sources recovered and cited from evidence/x/downloads/; SLUG runner (rebuilt), SPINDLE reparse (rewritten), ARMATURE scripts (dropped), HEDDLE (gate closed) |
| D22 | OGEE R16-P bill | shipped builder | D-148, D-186 | decided (D-186): shipped builder, 124 in 20 and 119 in 21, derived at build |
| D23 | 97-key 3MFs in Flash Studio | correctness fix until confirmed | D-150, D-187 | decided (D-187): fidelity upgrade, confirmed by owner saves |
| D24 | physical measurements | none; gate the fabrication tier | D-082 | same |
| D25 | rewrite hackbuild-resume history | guard forward only | D-011 | same |
| D26 | teen and class kits | after M6 | D-151 | same |

## plan-deltas rulings R1 to R97 to D ids

Generated from the Supersedes rows above. A ruling with no entry is carried by a plan document or a milestone card instead of a decision; each such ruling is listed under Gaps found while writing.

| ruling | entries |
|---|---|
| R1 | D-001, D-006 |
| R2 | D-002 |
| R3 | D-004, D-007 |
| R4 | none (see gaps) |
| R5 | D-003 |
| R6 | D-003, D-010 |
| R7 | D-009 |
| R8 | D-008 |
| R9 | D-020, D-022 |
| R10 | D-021 |
| R11 | D-021, D-029 |
| R12 | D-076, D-077 |
| R13 | D-013 |
| R14 | D-018, D-019 |
| R15 | D-018 |
| R16 | D-023 |
| R17 | D-027, D-030, D-031, D-032, D-033, D-035 |
| R18 | D-031, D-034 |
| R19 | D-036 |
| R20 | D-044 |
| R21 | D-008, D-158 |
| R22 | D-015, D-158, D-189 |
| R23 | D-010 |
| R24 | D-130 |
| R25 | none (see gaps) |
| R26 | D-116 |
| R27 | D-118, D-122 |
| R28 | D-123 |
| R29 | D-038 |
| R30 | D-039, D-040, D-181 |
| R31 | D-161 |
| R32 | none (see gaps) |
| R33 | D-119, D-120, D-121, D-124, D-125 |
| R34 | D-124, D-132 |
| R35 | none (see gaps) |
| R36 | D-147 |
| R37 | none (see gaps) |
| R38 | D-048 |
| R39 | D-058 |
| R40 | D-059, D-060 |
| R41 | D-061 |
| R42 | D-062 |
| R43 | D-063 |
| R44 | D-063 |
| R45 | D-049 |
| R46 | D-095, D-096, D-097 |
| R47 | D-071, D-079, D-085, D-087, D-088, D-096, D-097, D-164 |
| R48 | D-098 |
| R49 | D-078, D-079, D-183 |
| R50 | D-052, D-062, D-068, D-069, D-156, D-159 |
| R51 | D-053, D-054, D-055, D-156 |
| R52 | D-054, D-070, D-084, D-163 |
| R53 | D-064, D-065, D-066, D-067, D-074, D-075, D-182 |
| R54 | D-093 |
| R55 | D-053, D-057 |
| R56 | D-071, D-072 |
| R57 | D-051, D-081, D-083, D-099, D-100, D-101 |
| R58 | D-056, D-134, D-135, D-136, D-188 |
| R59 | D-014, D-086 |
| R60 | D-137, D-138 |
| R61 | D-043, D-089, D-090, D-091 |
| R62 | D-092, D-156 |
| R63 | D-043, D-145 |
| R64 | D-043, D-093, D-094 |
| R65 | D-139 |
| R66 | D-139 |
| R67 | D-105 |
| R68 | D-105 |
| R69 | D-149, D-180 |
| R70 | D-076, D-102, D-104 |
| R71 | D-104 |
| R72 | D-021, D-022 |
| R73 | D-040, D-043, D-056, D-090, D-108, D-127, D-134, D-137, D-144, D-146, D-163, D-181 |
| R74 | D-022, D-041, D-042, D-185 |
| R75 | D-131, D-132 |
| R76 | D-133 |
| R77 | D-047 |
| R78 | D-050, D-051 |
| R79 | D-128 |
| R80 | D-128 |
| R81 | D-129 |
| R82 | D-106, D-107 |
| R83 | D-064, D-107, D-108, D-109, D-110, D-111, D-182 |
| R84 | D-112, D-155 |
| R85 | D-045, D-152 |
| R86 | D-153 |
| R87 | D-152, D-154 |
| R88 | none (see gaps) |
| R89 | D-095 |
| R90 | D-132 |
| R91 | D-007, D-046 |
| R92 | D-024, D-027, D-135, D-136, D-148, D-157, D-186 |
| R93 | D-157 |
| R94 | D-012, D-126, D-131 |
| R95 | D-026 |
| R96 | D-010 |
| R97 | none (see gaps) |

## Gaps found while writing

Nothing here is a decision. Each item names a mismatch or an uncovered ruling found while writing this file, and where it is carried today. Each is resolved by a new entry; the architect record is frozen from 2026-10-04. D-181 to D-184 closed the D-040 pins, D-064 transport rows, D-078 location and agent-surface trust rules items that stood here.

### Text mismatches between sources

| item | what differs | carried as |
|---|---|---|
| D-003 skeleton | The architect decision text lists the RULES.md sections without Git conventions. The RULES.md brief, the architect decision log data, plan-deltas R5 and `fab-knowledge:synthesis/aesthetic-voice-ux-bible.md` section 4.1 include it. | This file keeps the architect text unchanged. RULES.md follows its brief and carries a Git conventions section. |
| Titles | Several architect titles differ in wording from the architect decision log data (for example D-004 "lint-voice" against "lint-voice replaces lint-dashes", D-039 "Node floor" against "Node floor 22.18", D-116 "Design system dependency"). The decision substance matches. | This file uses the architect record titles, as its brief requires. |
| Rationale source | 150 entries carry no inline "Rationale:" in the architect record (as of 2026-10-04). | Their Rationale row uses the architect decision log data for the same id. |
| Defaults changed from plan-deltas | D-005 adds an optional package scope (plan-deltas D5 had no prefix). D-117 keeps @virgilvox/hackbuild-ui (plan-deltas D1 moved to @hackbuild/ui). D-121 sets Special Elite for taglines (plan-deltas D7 chose Libre Baskerville). | The defaults in this file are the ones in force. The table "plan-deltas owner items D1 to D26 to D ids" marks each change. |
| Owner queue unblocks column | No source states what each owner answer unblocks. | The column is derived from each entry's decision text and from the milestone briefs in `fab-knowledge:plan/_briefs.md`. Treat it as inferred. |
| D-065 counts | D-065 stated 19 project-level and 25 artifact checks; the M04 retarget gives 7 artifact, 7 source, 2 page, 3 project | resolved by D-191 |

### Entries without a milestone in any brief

| entry | gap |
|---|---|
| D-146 OpenSCAD route | No milestone brief in `_briefs.md` names the import-and-audit route or its lint for "Ignoring unknown". Its Milestone row reads unassigned. Carried since by milestones/M04-checks-project.md M04-T14 (`part.build` with `import`, format scad). |
| D-160 interop | Only STEP has a dated milestone (M14). The other formats land with the package that emits them (3MF M00, DXF M07, gerbers, KiCad and Circuit JSON M08); no brief states the import side (STL, GLB, STEP, WRL, OpenSCAD) as a card. Carried since by M04-T14 (STL, GLB, OpenSCAD) and M14-T02 step 7 (STEP, WRL) through `ImportSpec` on `part.build` in spec/commands.ts; no new command, so D-106 keeps 30. |

### plan-deltas rulings with no decision entry

| ruling | content | where it is carried |
|---|---|---|
| R4 | Rewrite the contrast frames at v3 PLAN.md lines 85, 89, 1057, 1060 to 1061, and in `handoff/hbf/knowledge/kernels/agent-capability.md`. | PLAN.md section 1 outline; lint-voice warns on contrast frames (D-004). The agent-capability.md rewrite has no owner document. |
| R25 | KEEP: extension is a registry entry, never a switch on kind. | PLAN.md section 20 rule 4 and ARCHITECTURE.md extension points. |
| R32 | KEEP the bench skeleton. Its count "#FE0386 in 31 bench folders" is corrected to 32 by verified-claims C6 and C-10. | UI.md skeleton; Appendix B of PLAN.md carries 32. |
| R35 | A typed mm entry parser on the model of hackbuild-bench `parseFrequency` (bare number is mm; in, um, cm suffixes). | No decision entry. Carried as a card step: milestones/M09-ui.md M09-T03 step 10 (`parseLength`). |
| R37 | Delete the seed/brand copies (wrong hex, dashes) and point at the package; patch the skills separately. | M-1 card T07 skips seed/brand on import. Patching the three skills (hackbuild-explainer, brand-forge, design-forge) is owner work outside the repo, recorded in milestones/M-1-housekeeping.md Open items. |
| R54 | New check families from the corpus (print, layer contract, sheet, copper, board, circuit, assembly, artifact, device) with origins. | CHECKS.md and the M04 card; only the device row's CLASP limit has an entry (D-093). |
| R88 | KEEP `validate_3mf.py --overlap` on every browser export; 21 of 21 BOSS 3MFs pass; demo coin sums to 5473.667 mm3 (measured by rerun, verified-claims C2). | M00 card corpus acceptance; TESTING.md 3MF corpus. |
| R97 | The first commit to hackbuild-fab carries RULES.md, CLAUDE.md, AGENTS.md, the hook, lint-voice, the house-rules job and the corrected scaffold; no geometry code before them. | M-1 card and REPOS.md first commits; D-157 names M-1 first. Commits still wait for the owner to ask (D-006). |

### Rulings carried in part

| ruling | part with no entry | where it is carried |
|---|---|---|
| R5 | Moving the current builder brief to START-HERE.md. | Not carried, by choice: the handoff brief stays evidence and START-HERE.md is not created; RULES.md, CLAUDE.md and docs/plan/ take its place (milestones/M-1-housekeeping.md Open items). |
| R50 | Export completeness check (unique resolved object names, STL zip entry count equals object count; TENON tenon-undefined). | M00 card known-bad fixture. |
| R53 | Fix `{text, param, to}` shape in plan-deltas. | D-064 sets `Fix {param, set, predicts}` instead. |
| R56 | Interval fixtures (TUMBLER cascade, OGEE LSV_X 123.3 to 125, COTTER hook rule, SLUG mouth). | M01 card. |
| R57 | New profile fields (lineWidth, strainMax, fatigue, changer type, purge per change, skin and contact resistance, servo profile, process presets by part role, LEGO studgrid). | PROFILE.md. |
| R58 | Insertion by search (COTTER hook_fit.py) and prismatic sweep (SASH). | M02 card. |
| R61 | Fab-house facts with dates in profile (PCBWay pink mask through Advanced PCB only, verified-claims C13). | No decision entry. Carried as dated rows in PROFILE.md 8.2 and milestones/M08-board-catalog.md M08-T03 step 10. |
| R64 | Codecs (DETENT text, WASHER CRC-8 binary) with a lossy mock transport. | M13 card. |
| R82 | Per-transport exposure field on CommandDef; nest.pack loses its gate. | AGENT-SURFACE.md CommandDef. |
| R83 | Input-validation failures return isError tool results. | AGENT-SURFACE.md transport mapping. |
| R87 | Cross-implementation agreement, firmware compile, slicer round-trip harness, viewer probe, doc-number drift. | TESTING.md. |
| R89 | Generic `RegistryEntry<K>` with `DefFor<K>`; `kinds` dropped from registries. | spec/registry.ts brief; PLAN.md section 20 rule 4. |
| R92 | KEYWAY sims throwing on `S.span` (four of seven) and the KEYWAY input shipping. | M05 card ships the inputs; the S.span fix has no card. |

### Facts awaiting a source

| item | state |
|---|---|
| plan-deltas R59 and section 0 item 7 | Cite eecircuit-engine timings as 302 ms start and 0.32 ms median; verified-claims C9 reran 449 ms and 0.365 ms on this host. D-086 carries the rerun as one machine's measurement. |
| `hackbuild-tools 2/MANIFEST.json` (D-158) | Settled 2026-10-04: copied to `fab-knowledge:evidence/x/downloads/dl-boards-tools/hackbuild-tools-2/MANIFEST.json` with its sha256 in that folder's SHA256SUMS; D-158 Evidence cites the copy. M16 copies it under registry/. |
