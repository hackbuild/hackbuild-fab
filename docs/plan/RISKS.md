# Risks

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; copied to
`hackbuild-fab/docs/plan/RISKS.md` at M-1 (D-162). PLAN.md section 22 lists
the first ten rows of the register below. Decision ids refer to DECISIONS.md,
correction ids (C-##) to PLAN.md Appendix A, card ids (Mxx-Tnn) to the files in
`milestones/`. Working names hbf, CHASE and STYLUS are used as defined in
D-012.

## 1. How to read the register

Likelihood and impact are scored 1 to 5. Both are inferred judgments made on
2026-10-04 from the evidence cited per row; the evidence itself carries its
own qualifier.

| score | likelihood | impact |
|---|---|---|
| 5 | happening now or shipped | a wrong part, a wrong public claim, or a broken house rule |
| 4 | expected within the plan's milestones | a milestone exit blocked, or a whole kernel's numbers in doubt |
| 3 | plausible, with a known trigger | one package or design delayed or reworked |
| 2 | possible, no trigger seen | extra work contained in one card |
| 1 | remote | cosmetic |

Sort key: likelihood times impact, highest first; ties go to the higher
impact, then to the lower id. Ids are stable: a retired risk keeps its id and
row with status retired, and a new risk takes the next free id (R-31 onward).

## 2. Register

| id | risk | likelihood | impact | trigger or signal | mitigation | decision ids | milestone |
|---|---|---|---|---|---|---|---|
| R-01 | Every electrical number is inferred until a Yousu coupon is measured. The working cpla row is the PIP preset 500 along, 2000 through, cTPU 400 ohm cm (inferred); the seed carries 30 ohm cm (Protopasta XY, vendor) under a Yousu spool. | 5 | 5 | CHK-NET-05 warns on every export; profile holds no measured resistivity row; a public number traces back to the PIP preset | working row per D-081 qualified inferred; CHK-NET-05 warns while inferred; exports and print cards carry the tier; archetype resistances computed at load so one coupon moves every archetype (D-098); resistivity coupon reference; only a person writes the coupon result | D-007, D-081, D-082, D-083, D-098, D-099 | M01 (T08), M05; retired at the first measured row |
| R-15 | Harness tools insert AI trailers or credit lines into commits, PR bodies, package.json or exported metadata, breaking rule zero. | 5 | 5 | the commit-msg hook rejects a message; `house-rules` fails lint-commits or lint-authors; a Co-Authored-By, Signed-off-by or generated-with line in any pushed range | `.githooks/commit-msg` via `prepare` (core.hooksPath) tested on 14 messages; `.claude/settings.json` attribution `{"commit": "", "pr": ""}` and a deny on `Bash(git commit*--trailer*)`; CI `house-rules`; CLAUDE.md states that harness reminders are overridden; old trailers guarded forward only | D-001, D-002, D-003, D-011 | M-1 (T02, T04, T05) |
| R-03 | Slicer dialect drift: Flash Studio, Orca nightly and Bambu change keys, value shapes or component layout, so a writer that passes today is refused or misread later. | 4 | 5 | nightly `slicer-roundtrip` reports differs; the owner reports a filament lost on open; a corpus row outside expectation | dialect pinned per D-159; CHK-3MF-06 and -07 rewritten so the gold save passes; conformance corpus with known-bad fixtures; nightly slicer round trip; each owner Flash Studio save joins the corpus as a gold row | D-052, D-068, D-069, D-159, D-187 | M-1 (T08), M00 (T07 to T10), nightly from M00 |
| R-02 | Contact behaviour dominates bulk resistivity, so computed waits mislead. PIP crossings 113 to 2431 us (measured) against a computed settle of 78 us. | 5 | 4 | a computed wait in emitted firmware without its qualifier; dead keys on a printed part; a read model whose wait is not marked calibrated | read models on port with per-net tau, wait and reject; emitted firmware waits 3500 us until a coupon calibrates; computed waits qualified; the PIP drive readouts reference records both numbers | D-007, D-078, D-079 | M05 (T05, T11), M10 (T13) |
| R-10 | Licence contamination: GPL or AGPL code enters an MIT package through a dependency, a port or a vendored file. | 3 | 5 | a new dependency or bump changes licence; a scanner flags kicadts as unlicensed; the brepjs peer range resolves to brepkit-wasm 3.x | D-043 exclusion list; exact pins so a licence change needs a deliberate bump; `tools/licences.json` and the LICENSING.md audit table; licences in BuildInputs; LGPL kernels only lazy and separate; rtl-sdr stays in hackbuild-bench | D-024, D-040, D-041, D-043, D-051, D-094 | M-1 onward; M03, M08 (T01), M14 |
| R-23 | The claim page is published before a measured coupon, so a public number rests on an inferred row or the claim reads wider than the evidence. | 3 | 5 | a draft post or README giving ohm, kohm, V or us without a tier; claim wording with first, only, nobody or nothing else; a BLOCKS page without 50 kohm, wire material and carbon-filled scope | D-020 wording; D-077 scope on the BLOCKS page; verified block in every README and post; tier stated on every public number until a measured row exists; Capricate reproduction as the demonstration | D-007, D-008, D-020, D-077, D-082 | M05 (T07, T12); before any publication |
| R-06 | Missing sources block parity targets: SLUG trial runner, SPINDLE reparse scripts, KEYWAY inputs, ARMATURE board scripts. | 5 | 3 | a parity card whose input path does not exist; a builder about to recreate a file from memory | rebuild the seeded SLUG runner; rewrite the SPINDLE reparse on gerbonara and pygerber; ship KEYWAY inputs in `reference/`; port TANG from the recovered r6_4 design files; DAVIT target from DATA.pairs with the recovered R4 sweep as parity reference; drop the ARMATURE board script citation; never fabricate bench files | D-135, D-136, D-180 | M02 (T06, T08), M05 (T13), M06, M08 (T07) |
| R-07 | tscircuit releases several times a day, so an unpinned board backend changes output between runs. | 5 | 3 | a lockfile diff on tscircuit packages; a board artifactHash moving with no source change | exact pins at M08, re-dated at each exit; gated direct-emit Python backend on one pad and net record; CHK-BRD on both backends; Circuit JSON at the edge only | D-040, D-089, D-091 | M08 (T01, T10, T15) |
| R-21 | pip.ino ships KEY_WAIT_US 200 while the measurement says 3500. | 5 | 3 | an issue on pip-controller about dead keys; archetype provenance still carrying the gap note | hackbuild-fab does not edit pip-controller; gap recorded here and in archetype provenance; firmware hackbuild-fab emits uses 3500 us; the owner decides | D-013, D-079, D-080 | M06 (T07, T08), M10 (T13) |
| R-04 | Cross-platform mesh determinism is unproven until the CI job runs, and the 3MF writers do not reproduce their own bytes today. | 3 | 4 | the `determinism` job shows a meshHash or artifactHash differing across arch; parity goldens flapping | x64 and arm64 determinism job under SOURCE_DATE_EPOCH; dyadic 1/1024 snap; meshHash over quantised vertices plus triangles; artifactHash over sorted entry contents; sim snapshots admitted only after D-134 | D-051, D-052, D-054, D-056, D-134 | M00 (T07, T14), M02 (T04) |
| R-25 | Untrusted file input: a stranger's 3MF, zip, share link, design JSON, SVG, raster, mesh or OpenSCAD file reaches a kernel, reads local files (OpenSCAD `include`, `use`, `import`, `surface`), writes outside its folder (zip traversal) or exhausts memory (inflation bomb). | 3 | 4 | a reader with no cap or path rule; a fuzz case that hangs or escapes; a share link or design file that crashes a bench; an OpenSCAD run outside a temp directory | D-166 rules in every reader (entry names, 4096 entries, 256 MB inflated, 1 MB share and design JSON, 60 s OpenSCAD in a temp directory, SVG stripped, 8192 px raster, 256 MB meshes); schema validation before `loadDesign`; modules built only from the opened workspace; `chase.ts` read as a literal and never executed, `build.ts` run in a child process under `--permission` with an import allowlist and a 30 s wall budget (D-178); a board `gen.py` run as the user, confined by sandbox-exec on darwin only, reads unrestricted (D-089, D-201); empty child environment; the permission model is stated as no boundary against hostile code (D-201 owner item); fuzz job on the 3MF reader and share decoder | D-089, D-102, D-146, D-160, D-166, D-167, D-178, D-201 | M00 (3MF reader, fuzz job), M02, M03, M09 (T04), M10 (T03) |
| R-28 | Relay replay: a grant secret sent on a public relay reaches every subscriber of the base path, who can replay or forge drive commands until disarm. | 3 | 4 | a relay frame carrying the secret; a replayed message accepted | the secret never travels on a relay; seq and HMAC mac per message; commands as CLASP Events (M13-T18) | D-210 | M13 (T18) |
| R-18 | Owner bandwidth on the owner queue: owner-status decisions and every physical measurement wait on one person. | 4 | 3 | a milestone exit card blocked on an owner item; the same question listed in two PR bodies | defaults in force from DECISIONS.md and PLAN.md section 23; the builder keeps working and lists the question in the PR body; owner-gated steps (publish, DNS, transfer, print) placed at card ends | D-005, D-012, D-037, D-082, D-087 | every milestone exit |
| R-20 | Single maintainer: the owner is the only maintainer and the only reviewer, and the visual review gate needs a person. | 4 | 3 | PRs waiting on render review; a fact that exists only in a chat | repo boundary rule; derived counts and lists; RULES.md and CLAUDE.md let a builder work from files; references kept green; plan docs in the repo; graduated-design template | D-010, D-025, D-035, D-154, D-162 | M-1 onward |
| R-22 | Catalog dimensions unmeasured: SG90, GC9A01 screen ears, SuperMini pads. | 4 | 3 | a fit failure on a servo, screen or seat; E_PROVENANCE at export | catalog gate refuses inferred rows at fabrication export (E_PROVENANCE, exit 4); per-field provenance on actuator rows; SG90 inferred until measured; SuperMini pads vendor tier; caliper measurement by the owner | D-082, D-083, D-096, D-102, D-104 | M08 (T03, T04, T05) |
| R-27 | Laser safety: a keepalive proves a page is open, not that a person is present; DETENT firmware has no duty limit; laser class, wavelength and power are unknown for DETENT and WASHER. | 2 | 5 | a beam held on with the tab in the background; a manifest offering fire.laser with a null deadmanMs | CHK-DEV-04 blocks a fire.laser device without dead-man, duty limit, laser block and boot-safe row; keepalive stops on blur, hidden and pagehide (M13-T08 step 5); M13-T19 measures dead-man, duty and boot state with a photodiode | D-161, D-210 | M13 (T08, T19) |
| R-12 | Count and prose drift: hand-typed counts disagree across files. | 5 | 2 | the `derived` job shows a diff; CHK-LNT-03 fires | `tools/counts.mjs` generates every count; generated lists; `derived` job; spec test pins 30 CommandName and 19 McpToolName members | D-010, D-106, D-107 | M-1 (T11), M16 (T11) |
| R-24 | The owner's machine (Apple M1, macOS 12.7.4) has no Chromium build for the pinned @playwright/test 1.63.0, so level 8 browser tests cannot run there. | 5 | 2 | `npx -y -p @playwright/test@1.63.0 playwright install --dry-run chromium | grep -c 'Download url'` prints 0 on that machine; the dry run exits 0 and prints no Download url line, and the real install fails with `Playwright does not support chromium on mac12-arm64` (measured 2026-10-04: the 1.63.0 download table maps mac12-arm64 and mac13-arm64 to no build; 1.61.0 still maps mac12-arm64); a smoke spec that passes in CI cannot be reproduced locally | level 8 runs in the CI `browser` job on ubuntu only for this machine; local Playwright launches (the COLLAR dump) read the HBF_CHROMIUM executablePath override to system Chrome 150.0.7871.125 (M00-T01 step 2); view.render needs no browser (D-209); the pin stays at 1.63.0 and no older Playwright is used for acceptance; the visual review gate (D-154) still needs a person in a real browser at desktop and 390 px; retest after an OS upgrade to macOS 14 or later | D-039, D-040, D-152, D-154 | M-1 (T01 step 0), M09 |
| R-08 | The OrcaSlicer Design tab, with an MCP bridge, covers part of the space for the shop's FDM users. | 3 | 3 | the Design tab reaches an Orca release; conductive or multi-material features appear in it | positioning per D-023; hackbuild-3mf under MIT so Orca can vendor it; interop at the edges; the nightly round trip includes Orca nightly | D-023, D-027, D-041, D-160 | M00 (T15), M12 |
| R-09 | Coupling to the owner's hackbuild-ui release cadence: the bench layer must go upstream before M09 exits. | 3 | 3 | the upstream PR still open at M09 exit; baked CSS hash differs from the pin; an upstream token rename; the local hackbuild-ui clone sits at a88fcc8, one unpushed commit ahead of GitHub main 96d1bec, and the owner may push or drop it before M09 so local and GitHub agree | exact pin; CSS hash check in CI; retiring alias table for tokens; bakes inline `dist/styles/hackbuild.css` | D-040, D-116, D-117, D-118 | M09 (T02, T13) |
| R-13 | Scope sprawl: about 198 tools across BENCH and the registry, plus backlog kinds and shop scope. | 3 | 3 | a PR adding a kind with one user, a seventh chase kind, or a repo with no trigger | repo boundary rule; backlog kinds admitted on a second user; six kinds fixed; shop scope out by default; registry scope field | D-019, D-025, D-060, D-126, D-158 | M06, M16 (T05, T09) |
| R-17 | The BLOCKS standard is undecided: two standards shipped, and parts from one do not seat in the other. | 3 | 3 | M10-T10 needs a default; a print mixing blocks from both | D-087 default none until a print; export layer equals the chosen standard; stale 0.24 text fixed on port | D-077, D-087 | M05 (T07), M10 (T10) |
| R-19 | file:// limits on heavy wasm: baked benches cannot use module scripts, wasm fetch, or blob and module Workers, and the size cap is 16 MB. | 3 | 3 | the `size` job fails; a worker fallback runs on the main thread and stalls the rail | bake rules of D-129; manifold as a classic script with base64 wasm; worker-or-main fallback by feature detection; BRep never in the default bake; eecircuit-engine lazy with analytic DC in the bake | D-024, D-086, D-129 | M09 (T13, T14), M14 |
| R-29 | No BRep-native LOCKET source exists, so the M14 BRep route has no design to prove parity against. | 3 | 3 | M14-T03 finds only mesh-route LOCKET revisions | M14-T03 step 1 records the rev J value (HL 39.2, closed 55.2) from the mesh sims as the reference | none | M14 (T03) |
| R-30 | OCCT memory grows across replicad builds in one session. | 3 | 3 | heap climbs across a 100-design sweep on the brep route | lazy separate kernel; a sweep test records heap per build at M14 | D-024 | M14 |
| R-16 | The novelty claim is challenged; Nano Dimension FLIGHT is unknown. | 2 | 4 | a reader cites a tool that derives nets from built conductive geometry; FLIGHT documentation describing connectivity extraction | D-020 wording, never first or only; related work per D-021; unverified claims dropped; lead with the failure corpus; Capricate reproduction | D-020, D-021, D-022, D-023 | M05 (T12); before publication |
| R-26 | A low-resistance printed or copper path across a supply heats PLA past its glass transition, and no check bounds dissipation. | 2 | 4 | an Electrifi or vinyl copper net with a supply across it; a softened or browned trace | candidate in CHECKS.md 9.9; circuit already computes the DC operating point (PACKAGES.md circuit owns); enter as CHK-NET-39 (CHK-NET-30 is printed track swing; M05-T14 entered CHK-NET-31 to -38 for the KEYWAY gates) when a coupon or cited source gives a limit | none | M05 |
| R-11 | MCP server 2.x churn: 2.1 to 2.3 shipped within two weeks. | 4 | 2 | a new minor changing transport, zod or discovery shapes | pin `@modelcontextprotocol/server` ^2.3.0 with core, dated; stateless server; MCP is a projection of the CommandDef registry; freeze at M12 after the name eval | D-040, D-050, D-108, D-113, D-114 | M12 (T01, T15) |
| R-14 | npm scope availability: `@hackbuild`, `hackbuild-3mf` and `hackbuild_3mf` are unchecked. | 2 | 3 | `npm view` or org creation fails; a name is taken | availability checked at M00; nothing publishes until the owner creates the org; fab builds on the workspace package until publish | D-027, D-036, D-037 | M00 (T15) |
| R-05 | Rapier deterministic speed is unmeasured. | 3 | 2 | granular30 p90 over the CI budget | M02-T05 measures and records per-arch wall time before snapshots enter BuildInputs; PAWL compat 0.14.0 runs stay legacy | D-056, D-134 | M02 (T05) |

Scores in sort order: R-01 25, R-15 25, R-03 20, R-02 20, R-10 15, R-23 15,
R-06 15, R-07 15, R-21 15, R-04 12, R-25 12, R-28 12, R-18 12, R-20 12, R-22 12, R-27 10, R-12 10, R-24 10,
R-08 9, R-09 9, R-13 9, R-17 9, R-19 9, R-29 9, R-30 9, R-16 8, R-26 8, R-11 8, R-14 6, R-05 6.

## 3. Detail, evidence and retirement

Short evidence roots used below:

| short | path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | x + `plan-to-refine/handoff/hbf/` |
| pip | x + `pip-controller/` |
| syn | `fab-knowledge:synthesis/` |
| corpus | `fab-work-directory:` |

### R-01 Electrical numbers inferred

Rows of D-081: Yousu cPLA and cTPU 240 to 481 ohm cm are raw filament
(vendor) and are never scaled onto printed traces (C-09). The PIP preset
500 along, 2000 through, cTPU 400 ohm cm is inferred
(pip `src/layout.js:46`, phys `rhoC 500, rhoCz 2000, rhoT 400`). The seed
carries 30 ohm cm (hbf `seed/profile.seed.json:46`), which is Protopasta XY
(vendor) and does not describe the shop's spools. Nowka 2024 printed values
(11.69, 16.37, 8.005 ohm cm) apply to Protopasta only. The C-01 example shows
the spread: at 30 ohm cm a 62 mm trace, 0.72 mm thick, under an 8 kohm budget
needs 3.23 mm width (computed); at 500 ohm cm the floor is 53.8 mm and the
solver returns E_UNSAT naming 71.8 kohm at 6.00 mm (computed).

Mitigation in cards: M01-T08 (CHK-NET-05 as an interval on the pullup),
M05-T04 (per-direction resistance), M05-T06 (circuit.solve and CHK-NET-05 on
the operating point), M06-T07 (archetype resistance at load). PROFILE.md holds
the coupon (four-wire along, across, through) and the write path.

Retires when: profile holds a measured cpla and ctpu row per direction with
machine, coupon id, date and method (D-099), entered by a person.

### R-15 AI trailers from harness tools

Any tool or workflow harness that inserts Co-Authored-By trailers or asks for
them can carry one into a commit (D-002 rationale). Trailers already landed in
four commits in another repo, and in freshblu c295890c (syn `verified-claims.md`
C7). The hook test set in M-1-T02 holds 4 real hackbuild-bench subjects that
pass and 4 messages from that repo with `Co-Authored-By: Claude Opus 4.8`
plus 4 edge cases that are rejected. Claude Code attribution settings are empty
strings (C-12).

Retires: never. The row stays open as a standing control; it is re-scored to
likelihood 2 once `house-rules` has been green on every push for one
milestone.

### R-03 Slicer dialect drift

The seed 3MF template misses 37 gold keys and adds 7 (C-07). The gold round
trip is
`fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf`
(Flash Studio save, 2026-08-19): 127 per-filament keys, per-slot values that
differ on 9 keys, three components in object 4 pointing at
`/3D/Objects/hackbuild-coin-nfc_2.model`. The seed validator exits 1 on that
file (measured, syn `verified-claims.md` C2). 24 of 25 owner 3MFs use the
Creator 5 Pro 0.4 preset and `3d/coin/hsl.3mf` uses 0.25. Orca nightly gained
a Design tab between 2026-08-13 and 2026-10-04 (R-08), so its project format
is in motion. Owner saves show 97-key exports open in Flash Studio with every
filament intact (D-150, decided). Stock Bambu Studio 2.3.0 writes only 96 of
the 127 keys, so its saves are a different dialect.

Mitigation in cards: M-1-T08 (127-key per-slot template harvested from the
gold), M00-T07 to M00-T10 (writer, Python writer, validator with rewritten
CHK-3MF-06 and -07, conformance corpus with the CASK empty-plate, TENON
undefined names and numeric `overhang_fan_threshold` fixtures). TESTING.md
section 10 defines the nightly round trip; Flash Studio has no CLI there, so
its round trip is the owner's step.

Retires: never; re-scored per slicer release. A difference that matters for
print becomes a CHK-3MF check keyed to slicer version.

### R-02 Contact behaviour over bulk resistivity

PIP figures (D-079, syn `verified-claims.md` C1): computed RC tau 15.7 us,
settle 78 us (5 tau); measured crossings 113 us (RIGHT) to 2431 us (UP); eight
of ten keys 1067 to 2431 us, 10 to 30x computed; RIGHT 1.4x, SELECT 5.3x.
Drive rows: touch 0.91 to 0.93 Mohm, keys 1.5 to 1.72 Mohm (computed), skin 1
to 20 Mohm (bench assumes 20), reject under about 4 Mohm (4.35 computed).
Evidence: pip `README.md:155-180`, pip `docs/electrical.md:34-41`. The bulk
resistivity model alone predicts the 78 us figure; the shop's printed contacts
read slower.

Mitigation in cards: M05-T05 (read models: pullup, charge-release, adc,
ratiometric, column-scan, ladder), M05-T11 (PIP drive readouts reference),
M10-T13 (emitted PIP sketch with `KEY_WAIT_US 3500` and `TOUCH_WAIT_US 1500`).

Retires when: a coupon calibrates waits for the shop's machine and material
pair and the read model stores a measured wait.

### R-10 Licence contamination

Known copyleft packages (C-11, D-043, syn `verified-claims.md` C8, C9):

| package | licence as published | handling |
|---|---|---|
| potrace | GPL-2.0-or-later | excluded; vtracer evaluated at M03 |
| esm-potrace-wasm 0.5.1 | GPL-2.0 | excluded |
| kiutils | GPL-3.0 | excluded; kicadts used |
| brepkit-wasm 3.0.0 | AGPL-3.0-only (its second switch to AGPL) | excluded |
| rtl-sdr driver | GPL | stays in hackbuild-bench (D-094) |
| CommonPub | AGPL-3.0 | site only |
| planegcs | LGPL-2.1 on GitHub, LGPL-2.0-or-later on npm | not adopted (D-144); separate file only if ever |
| replicad-opencascadejs | LGPL-2.1-only | lazy BRep route at M14 only (D-024) |
| kicadts 0.0.58 | MIT in LICENSE, no package.json licence field | recorded in the audit |

Mitigation in cards: M08-T01 writes the audit rows in `tools/licences.json`
read by LICENSING.md. No CI job in TESTING.md section 15.1 checks licences
before M08; see section 4.

Retires: never; standing control.

### R-23 Claim page before a measured coupon

Public wording per D-020: the build derives nets from the conductive geometry
it produced, computes per-net resistance from printed cross section, path
length and per-direction resistivity, solves the operating point and checks it
against the receiving pin's thresholds; for multi-material printed nets none
was found in the surveyed literature. The BLOCKS rerun (D-077) shows how a
claim can read wider than its evidence: at BOSS 50 kohm, cPLA wires give 1.31 V
at 10 mm to 2.39 to 2.42 V at 200 mm (computed), default cTPU wires give 3.15
to 3.27 V and the press is never seen; under RP2040 thresholds (VIL max 0.8 V,
VIH min 2.0 V) a 2.05 V press reads HIGH, and against the ESP32-C3 band
(0.825 to 2.475 V) every cPLA case is undefined (D-076).

Retires when: R-01 retires and the published page carries the verified block
with the measured row cited.

### R-06 Missing sources

| source | state | handling | card |
|---|---|---|---|
| SLUG trial runner | `slug.html` uses unseeded Math.random; the 126 of 128 runner was never harvested; Downloads searched 2026-10-04, absent | rebuilt seeded at M02-T08: 126 of 128 stays declared, unverified (D-232); the runner measures 90 of 128 over seeds 1 to 8 (computed) | M02-T08 (D-136, D-232) |
| SPINDLE reparse | scripts not found in any harvest | rewrite on gerbonara and pygerber, 55 of 55 pads | M08-T07 (D-149) |
| TANG R6 | recovered 2026-10-04 (four revisions; the handoff swings belong to r6_0) | port from r6_4 design files | M06-T07, M06-T09 |
| KEYWAY inputs | logo SVG and three Plex Mono woff2 read from `/mnt/skills`, not in the bench folder; 45, 60, 59, 85, 85, 95, 57 reproduced once supplied (syn `plan-deltas.md` line 973) | ship the inputs in `reference/` | M05-T13 |
| DAVIT R4 | recovered (davit_r4.zip): truss, pack_sim.py, sweep.py; 43 = sweep pairs | parity reference; target stays 30 runtime pairs | M02-T06 (D-135) |
| recovered in Downloads: SLATE r5, COAMING 990 KB, STIPPLE R17, BAFFLE R3, DETENT rev D, GUDGEON | copied with sha256 and mtime | `evidence/x/downloads/` | M16-T07 |

D-149 also drops ARMATURE board scripts unless the owner supplies them; the
Downloads search on 2026-10-04 found only the R1 package
(`fab-knowledge:sources/downloads/README.md`
section 3). CLAUDE.md forbids fabricating a missing bench file.

Retires when: every row above is rewritten, shipped or dropped.

### R-07 tscircuit cadence

@tscircuit/core reached 0.0.2086 with a 49,522,337 B unpacked bundle (vendor,
npm, syn `verified-claims.md` C9). Corpus boards built on tscircuit shipped
errors: AUGER 58 unroutable, GROMMET 5 DRC (D-089). tscircuit and circuit-json
are pinned at M08 (D-040), with exact versions recorded in M08-T01 and
re-dated in M08-T15.

Retires: never; re-dated with the pins at each milestone exit.

### R-21 pip.ino wait

pip `firmware/pip/pip.ino:20` sets `KEY_WAIT_US = 200`;
pip `firmware/pip_stick/pip_stick.ino:25` sets 3500. The bench default
`waitMech: 0.2` ms in pip `src/layout.js` matches the 200 us. Measured
crossings reach 2431 us (R-02), so slow keys read released at 200 us
(inferred from the measured crossings; no pip.ino run on a printed part is
recorded).
pip-controller CI rejects `haft` at word start, and hackbuild-fab never edits
that repo (D-013).

Retires when: the owner raises pip.ino or records why 200 us stays (D-080).

### R-04 Determinism

manifold-3d 3.5.0 introduced cross-platform determinism (vendor release
notes); hackbuild-fab pins 3.5.4. No run has compared x64 and arm64 mesh
hashes. The 3MF writers today: one tetrahedron gave py 3979 B against js
4243 B, two py runs differ at byte 11, JSZip adds directory entries, and
mtimes differ between local and UTC (measured, C-08). M00-T14 runs the
`determinism` matrix on `ubuntu-24.04` and `ubuntu-24.04-arm`; M02-T04 extends
it to 47 sim trials (17 PAWL plus 30 granular).

Retires when: the `determinism` job has been green on every reference for one
milestone after M02.

### R-18 Owner bandwidth

DECISIONS.md holds the owner queue with what each answer unblocks; PLAN.md
section 23 lists the defaults. The items that gate work directly: D-037 (npm
org before any publish), D-082 (every physical measurement), D-087 (BLOCKS
standard), D-032 (hackbuild-beam transfer before M13),
D-031 and D-034 (DNS). Proposed: batch the physical measurements of D-082 into
one print session per milestone (resistivity coupon, fit gauge, pullups and
thresholds, SG90).

Retires: never; re-scored at each milestone exit.

### R-20 Single maintainer

REPOS.md section 8 keeps required reviews off because the owner is the only
maintainer. The visual review gate (D-154) needs a person to look at desktop
and 390 px renders. PRIOR-ART.md lists team size as a place the project loses
to funded rivals.

Retires: never; standing context.

### R-22 Unmeasured catalog dimensions

| part | conflict | source |
|---|---|---|
| SG90 | shaft offset 5.4 (DAVIT), 5.3 (JIB), 5.9 (PINTLE); width 12.4 vs 12.2; tab span 32.4 vs 32.2; hole pitch 28.0 vs 27.8 (all inferred) | syn `plan-deltas.md` R70; syn `patterns-and-lineage.md` line 400 |
| GC9A01 1.28 in round display | GUDGEON screen ears and geometry taken from a photo; `gudgeon.html` notes the M2 ears and 30 mm hole spacing were read from the product photo | `fab-knowledge:sources/plan/knowledge-tiers.md:1787`; `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/extracted/gudgeon/04_part2c_state.js:13`; `fab-knowledge:sources/downloads/dl-gudgeon-tang-keyway.md` line 197 |
| ESP32-C3 SuperMini | pad map column order written with opposite handedness in 00-constants and COFFER; castellation offset 11.25 vs 11.20; seed tier verified, COFFER unverified | syn `plan-deltas.md` line 591; syn `mappings.md` line 206 |

The rp2040 stand-in mesh has signed volume -6506 mm3 (D-102), so imported
meshes are checked for winding.

Retires when: each row is measured by the owner and recorded as measured with
machine, date and method, or replaced by a parsed manufacturer drawing
(verified tier).

### R-12 Count and prose drift

The handoff stated 56 against 59 tools, 68 against 85 checks, 107 against 117
scaffold files; the knowledge word count 36,918 did not reproduce (36,223 by
`wc -w`); command counts drifted 20 to 30 across six files (D-010, D-106).
M-1-T11 adds `tools/counts.mjs` and the `derived` job.

Retires when: the `derived` job has been green since M-1 and no count in docs
is typed by hand.

### R-24 Browser tests on the owner's machine

`sw_vers` on the owner's machine prints macOS 12.7.4 (measured
2026-10-04). In `node_modules/playwright-core/lib/coreBundle.js` of
@playwright/test 1.63.0 (a copy sits in
`ossuary-projects/pip-controller/node_modules/`),
the chromium and chromium-headless-shell download tables map `mac12-arm64`
and `mac13-arm64` to no build; the first macOS entry with a build is
`mac14`. `npx playwright install --dry-run chromium` there exits 0 and prints no `Download url` line (count 0 on 2026-10-04); the real install then fails with `Playwright does not support chromium on mac12-arm64`. The
1.61.0 copy in `ossuary-projects/tensorflow-web/`
still maps `mac12-arm64` and its dry run exits 0, which is why older
Chromium builds sit in `~/Library/Caches/ms-playwright/`. Using 1.61.0
locally would test a different browser than CI, so it is not used for any
acceptance line. M-1-T01 step 0 records the result in the first PR body.

Retires when: `playwright install --dry-run chromium` on the pinned
version exits 0 on the owner's machine and one smoke spec passes there.

### R-08 Orca Design tab

PR #15238 opened 2026-08-13 and landed on main 2026-09-18; follow-ups ran to
2026-10-04 (#16089) and #16019 is open; nightly only; the bridge is
`tools/orca_cad_mcp_bridge.py` (syn `verified-claims.md` C13). Whether it
handles multi-material is unverified. The tab brings OCCT, SolveSpace and STEP
into the slicer; hackbuild-fab answers with checks, the printed conductor and
the failure corpus (D-023).

Retires: never; re-scored at each Orca release.

### R-09 hackbuild-ui cadence

@virgilvox/hackbuild-ui 0.2.0 (65 SFCs, 161 `.hb-` classes, GUIDELINES v1.2).
M09-T02 opens the upstream PR with the bench layer and tokens as package 0.3.0
carrying GUIDELINES v1.3. The owner controls the release and the package name
(D-117).

Retires when: 0.3.0 is published and the fab pin moves to it.

### R-13 Scope sprawl

The BENCH catalogue (`hackbuild-tools 2/MANIFEST.json`) holds 157 tools in 16
groups, 153 placeable; the fab registry holds 59; their union is about 198
(computed, syn `plan-deltas.md` line 307). Rows added at M16 (KNUCKLE, TENON,
COTTER, SPARGER W, DERRICK, JIB, SPLICE, LUG, TANG-small, PIP, GUSSET pending
D-019) widen it further.

Retires: never; standing control through the decisions listed.

### R-17 BLOCKS standard

BOSS v1: sockH 2.4, flangeH 0.72, trace 0.72, gap 0.48, L 0.24. Later
blocks.html: sockH 2.2, flange 0.6, trace 0.6, gap 0.4, L 0.2, exporting 0.2.
Stale 0.24 text remains in the PRINT NOTES panel, DEFAULT_PRINTER and the
printCard fallback (syn `verified-claims.md` C5). Source:
`fab-work-directory:benches/blocks/outputs/boss/boss-src.zip`
and `boss.html`.

Retires when: the owner picks a standard after a print (D-087).

### R-19 file:// and heavy wasm

Benches open from file:// with no server; classic scripts on `globalThis`
carry the kernel because file:// cannot load modules or fetch wasm (syn
`patterns-and-lineage.md` line 618). Sizes against the 16 MB bake cap:
replicad kernel 48.9 MB, eecircuit-engine one 19 MB ESM file in a 43 MB
package (vendor). PIP carries manifold as `vendor/manifold-classic.js` with
base64 wasm; badge-replicator falls back from worker to main thread by feature
detection.

The file:// rules above are Chromium facts. Safari and Firefox apply
their own file:// rules, and the nightly `browser-all` job runs smoke and
the 390 px overflow pass in the Playwright `webkit` and `firefox` projects
against every bake (TESTING.md 2.5, 15.2; supported browsers in UI.md
14.4). Each failure found there becomes a sub-row here.

| Sub-row | Engine | Bench | Fact that failed | Found |
|---|---|---|---|---|
| R-19a | none recorded yet | | | the first `browser-all` run at M09 |

Retires when: M09-T14 smoke and the `size` job pass on every fab bake,
and the `browser-all` WebKit and Firefox projects pass on every fab bake
or each failure has a sub-row with a stated workaround.

### R-16 Novelty challenged

Nano Dimension FLIGHT is the one commercial tool that could undercut the
derivation-direction claim, and the sources found do not say whether it
extracts connectivity from conductive regions (syn
`prior-art-and-position.md` line 526). Flat PCB netlist extraction exists
(Gerber against IPC-D-356) and Altium 3D-MID holds nets on a STEP or IGES
substrate (single part). Other 3D-MID tools are unverified (C-15).

Retires when: FLIGHT is checked against a primary source and PRIOR-ART.md
records the result.

### R-11 MCP server churn

`@modelcontextprotocol/sdk` ^2 resolves to nothing; v2 is
`@modelcontextprotocol/server` 2.3.0 with core and zod/v4; 2.1 to 2.3 shipped
within two weeks (vendor, npm). Protocol 2026-07-28 removed initialize and
Mcp-Session-Id and requires server/discover (C-11, C-12).

Retires when: the tool list freezes at M12-T15 and one minor bump lands with
no adapter change.

### R-14 npm scope

Availability of `@hackbuild/kernel`, `hackbuild-3mf` (npm) and
`hackbuild_3mf` (PyPI) is unknown (D-037). M00-T15 performs the subtree split
and the 0.1.0 publish only after the owner creates the org.

Retires when: all three names are held by the owner.

### R-05 Rapier speed

`@dimforge/rapier3d-deterministic-compat` 0.21.0 was published 2026-09-25
(vendor). M02-T05 builds the `granular-funnel` scene (18 balls, SLUG lattice)
and records per-trial and total wall time with p50 and p90 per arch in
`packages/sim/records/granular30-<arch>.json` (measured).

Retires when: that record exists and D-134 admits snapshots to BuildInputs.

### R-25 Untrusted file input

No plan document set a limit on an input from outside the workspace until
D-166. Imports cover STL, GLB, STEP, WRL and OpenSCAD (D-160), and OpenSCAD
executes a program that can read local files. The M09-T04 share decoder
inflated a payload with `CompressionStream` and loaded it with no cap.
Likelihood is 3 because share links and imported files arrive from
strangers once benches are public; impact is 4 because a hang or a read
outside the workspace breaks the offline trust the benches rest on.
Evidence: `fab-knowledge:plan/milestones/M09-ui.md`
(M09-T04), `fab-knowledge:plan/ARCHITECTURE.md`
(section 11.1).

A workspace also holds design files its user did not write (references,
a copied design, a catalog chase's items), and v3 ran `chase.ts` and
`build.ts` as modules with no loader rule. D-178 reads the chase as data
and runs `build.ts` in a sandbox (ARCHITECTURE.md section 11.2).

A direct-route board carries a third file of that kind, its `gen.py`
generator (D-089), which runs as the user through the tools/py interpreter
and falls under the rule that a person reviews code they did not write
(D-201). On darwin it runs under sandbox-exec: no network, writes only to
its run folder, no program but that interpreter, a minimal environment
(core/src/board.ts, record build-sandbox/generator). Its reads are
unrestricted, so it can copy any file the user can read into its fab
outputs, and on Linux and Windows it runs unconfined: a bwrap confinement
is not implemented and core/test/board-generator.test.ts skips off darwin.

Retires when: every reader in ARCHITECTURE.md section 11.1 enforces its
rule, `core/test/build-sandbox.test.ts` and
`packages/chase/test/source.test.ts` pass in CI, the fuzz job in TESTING.md section 4.2 has run green nightly at 2000
cases through M10, and OpenSCAD imports run only through the temp-directory
wrapper.

## 4. Maintaining this file

- Each milestone's exit housekeeping card re-scores every open row, records
  the date, and moves a row to retired when its retirement condition holds.
- PLAN.md section 22 lists the first ten rows in this order; a change in the
  top ten updates PLAN.md in the same commit.
- A new risk names its evidence by absolute path, its trigger, the decision
  ids it leans on and the card that carries the mitigation.
- Gaps found while writing: TESTING.md section 15.1 has no CI job that checks
  dependency licences between M-1 and M08-T01 (R-10); a `licences` step in the
  `house-rules` or `seed` job would close it and needs a decision entry.
