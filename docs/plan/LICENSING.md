# Licensing

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

This file covers every licence in the project: what hackbuild-fab licenses
out, what it takes in, the copyleft exclusion rules and how they are
enforced, how licences enter the build hash, the OSHWA route for boards, and
the provenance card that answers platform AI-content tagging. PLAN.md
section 4.5 holds the summary. This file holds the audit.

Carries: D-001, D-024, D-041, D-042, D-043, D-051, D-090, D-094, D-137,
D-144, D-145, D-147, D-158, D-159, D-169, D-170, D-171, D-172, D-195. Corrections carried: C-11 (potrace
licence), C-15 (OSHWA certification cost unverified).

Working names used here: hbf (working name) for the binary, CHASE (working
name) for the design document, tools.hack.build (proposed). PIP (was HAFT)
is the published hackbuild/pip-controller.

Qualifier rule for this file: every version and licence field in section 2
is vendor tier, read from the npm, PyPI, crates.io or GitHub registry on
2026-10-04, unless the row names another source. Registry metadata is what a
package publishes about itself. Where a LICENSE file and the registry field
disagree, the row shows both.

---

## 1. What the project licenses

### 1.1 Licence per artifact

| artifact | where it lives | licence (SPDX) | decision |
|---|---|---|---|
| code: packages, kernel, CLI and MCP server, apps, tools | `packages/`, `kernel/`, `core/`, `apps/`, `tools/`, `tools/py/` | MIT | D-041 |
| spec (Part IR, contracts, chase schema) | `spec/` | MIT | D-041 |
| published packages: `@hackbuild/kernel`, npm `hackbuild-3mf`, PyPI `hackbuild_3mf`, and later hackbuild-inlay and hackbuild-copper | npm, PyPI, the extracted repos | MIT | D-041, D-027, D-036 |
| printable designs | `designs/<id>/`, `reference/<area>/<id>/`, their 3MF, STL, DXF, SVG and print card exports | CC-BY-SA-4.0 | D-041 |
| boards | design folders whose chase exports gerbers or KiCad files | CERN-OHL-W-2.0, optional OSHWA certification | D-041 |
| docs: `docs/`, the root README.md, package READMEs | `docs/**`, `README.md`, `packages/*/README.md`, the same files in extracted repos | CC-BY-4.0, code samples inside also MIT (owner, 2026-10-13) | D-170 |
| emitter and exporter templates copied verbatim into user outputs | `packages/*/templates/**`, `core/templates/**`, `designs/*/firmware/templates/**` | MIT-0 (owner, default); the code that fills them stays MIT | D-172 |
| marks: the hack.build name, hackbuild as a product prefix, logo files | `TRADEMARKS.md`; `reference/copper/_inputs/hackbuild-logo.svg` and later logo files | reserved, outside every open grant (owner, default) | D-171 |
| firmware inside a design | `designs/<id>/firmware/` | MIT (code under D-041; OSHWA needs OSI-licensed software) | D-041 |
| failure corpus: knowledge records, check origin records, coupon results | `knowledge/`, origin records in `registry/` and the check seeds, coupon records | CC-BY-4.0, community coupons credited by contributor (owner, 2026-10-13) | D-042 |
| user outputs: anything a person builds or exports with hbf from their own chase | outside the repo | no claim | D-041 |
| graduated design repos | own repo on the pip-controller layout | as the repo states; PIP is MIT for everything, `print/` included | D-035 |

Copyright holder for project-authored work: Moheeb Zara. The MIT text reads
`Copyright (c) 2026 Moheeb Zara`, as in
`fab-knowledge:evidence/x/pip-controller/LICENSE`.
Every package.json carries `"author": "Moheeb Zara <hackbuildvideo@gmail.com>"`
and `"license"` set per this table (D-001). No AI assistant, model or AI tool
appears as author, contributor, copyright holder or credit in any licence
file, notice, manifest or exported metadata (D-001).

Items with no decision entry yet are listed in section 7 with the state in
force today. Docs, marks and emitter templates now have owner entries
(D-170, D-171, D-172); their defaults are in force until the owner answers.
Design and reference READMEs follow their folder's `ChaseMeta.license`,
since the design path rows match first.

### 1.2 Licence files in hackbuild-fab

| file | content | lands in |
|---|---|---|
| `LICENSE` | MIT text, `Copyright (c) 2026 Moheeb Zara`, then one paragraph naming the path map below | M-1 |
| `LICENSES/CC-BY-SA-4.0.txt` | full legal code from creativecommons.org | M-1 |
| `LICENSES/CERN-OHL-W-2.0.txt` | full text from cern-ohl.web.cern.ch | M-1 |
| `LICENSES/CC-BY-4.0.txt` | full legal code, for the failure corpus default (D-042) | M-1 |
| `LICENSES/MIT-0.txt` | MIT No Attribution text, for emitter templates (D-172) | M00 (first template) |
| `TRADEMARKS.md` | the marks are outside every open grant; a fork or remix renames before it publishes; nominative use allowed; the hackbuild-3mf and `@hackbuild/kernel` names identify the upstream (D-171) | M00, before the hackbuild-3mf publish; copied into hackbuild-3mf |
| `CONTRIBUTING.md` | section 1.5 rules; DOCS.md section 7 | M00 |
| `LICENSES/OFL-1.1.txt` | SIL Open Font License, for the fonts shipped in bakes and in `reference/copper/_inputs/` | M05 (first font file in the repo) |
| `tools/licences.json` | the audit data behind section 2 and the path map | M-1, grows each milestone |
| `THIRD-PARTY-NOTICES.txt` | generated by `tools/licences.mjs --notices` from `tools/licences.json` and the installed LICENSE and NOTICE files: name, version, audited SPDX, copyright line, NOTICE text verbatim for Apache-2.0 items, each licence's full text once, and the source location for LGPL and MPL items | written into `apps/fab/dist` and into any package whose tsdown build inlines a dependency; a CI check fails when the committed or built file differs from a fresh generation | M09 (shared with the bake manifest generator), apps/fab from M12 |
| `README.md` licence line | one line: code and spec MIT; designs and boards per their chase; see LICENSING.md | M-1 |

Path map, the content of `tools/licences.json` `paths`, read top to bottom,
first match wins:

| path glob | licence |
|---|---|
| `reference/copper/_inputs/hackbuild-logo.svg` | owner's mark, outside the open grant (D-171 default) |
| `reference/copper/_inputs/*.woff2` | OFL-1.1; IBM Plex Mono from @fontsource/ibm-plex-mono 5.3.0, the package LICENSE beside them as `reference/copper/_inputs/OFL-1.1.txt` (M05-T13) |
| `packages/*/templates/**`, `core/templates/**`, `designs/*/firmware/templates/**` | MIT-0 (D-172 default) |
| `designs/*/firmware/**` | MIT |
| `designs/*/build.ts`, `designs/*/bench.ts`, `designs/*/src/**`, `reference/*/*/build.ts`, `reference/*/*/bench.ts`, `reference/*/*/src/**` | MIT (D-195 default) |
| `designs/*/**`, `reference/*/*/**` | the folder's `ChaseMeta.license` |
| `knowledge/**` | CC-BY-4.0 (D-042 default) |
| `docs/**`, `README.md`, `packages/*/README.md` | CC-BY-4.0, code samples also MIT (D-170 default) |
| `packages/catalog/data/kicad/**` | CC-BY-SA-4.0 (KiCad libraries, collection redistribution) |
| `**` | MIT |

The logo row sits first so no design or reference row can pull the mark
into a CC licence. The font row sits second for the same reason: below
the `reference/*/*/**` row it would never match.

The code row sits above the design row, so `build.ts`, `bench.ts` and
`src/**` inside a design or reference folder are MIT and can move into the
kernel without relicensing (D-195, owner, default). `chase.ts` is the
design document and follows `ChaseMeta.license` with the geometry, exports
and docs.

KiCad footprint, symbol and 3D model files copied into the repo live only
under `packages/catalog/data/kicad/`, with KiCad's LICENSE.md copied beside
them. Pad numbers and dimensions extracted as facts into other catalog rows
stay under the `**` row and carry a source path.

### 1.3 How a design gets its licence

`ChaseMeta.license` is a required SPDX string (`spec/chase.ts`, field
`license`; type `Spdx` in `spec/ids.ts`). It covers the design folder and
everything exported from it.

| case | value | source |
|---|---|---|
| hack.build design or reference whose chase declares a gerber or KiCad export | `CERN-OHL-W-2.0` | M10 migration rule, `milestones/M10-chase.md` step 1 |
| every other hack.build design or reference | `CC-BY-SA-4.0` | same |
| a chase created by `chase.scaffold` outside `designs/` and `reference/` | asked as a typed question, with the two values above offered as options; never filled silently | this file (no claim on user outputs); gap L-05 |

`ChaseMeta.derivedFrom {id, buildHash}` records remix lineage. A chase
derived from a CC-BY-SA-4.0 design is an adaptation under that licence's
share-alike term. hbf reports the parent's licence beside the child's in
`chase.validate` output as information; it never refuses a build over a
licence choice, because the person running the build owns that choice.
Whether to add a warning check for an incompatible child licence is gap
L-07.

### 1.4 Licence and authorship in exported files

The gold round trip
`fab-work-directory:benches/collar-coin/uploads/hackbuild-coin-nfc.3mf`
carries these metadata names in `3D/3dmodel.model` (measured, read
2026-10-04): Application, BambuStudio:3mfVersion, Copyright, CreationDate,
Description, Designer, DesignerCover, DesignerUserId, License,
ModificationDate, OrcaSlicer, Origin, Thumbnail_Middle, Thumbnail_Small,
Title. Copyright, Designer, DesignerUserId, License, Origin and Description
are empty strings in the gold file.

Writer rules for the bbs dialect (D-159), carried in `packages/3mf` at M00:

| metadata name | value | rule |
|---|---|---|
| License | `ChaseMeta.license` | empty when the chase has none |
| Designer | the `author` name of the workspace root package.json | empty when absent; never a tool, model or AI name (D-001) |
| Copyright | `Copyright (c) <year of sourceDateEpoch> <Designer>` | empty when Designer is empty |
| DesignerUserId, Origin, DesignerCover | empty | hbf never invents platform ids |
| Description | empty, or the chase's one-line description | never names a model or assistant |
| Application | `BambuStudio-01.10.01.50` | dialect string, kept per D-159 |

The core target writes the 3MF Core metadata name `LicenseTerms` in place of
`License` (name per the 3MF Core specification well-known list; confirm
against 3mf.io/spec when the core target lands at M00). `tools/lint-authors.mjs`
already fails on AI credit in Designer, DesignerUserId, Copyright,
Description or Origin (REPOS.md, CI job house-rules, D-002).

Other exports:

| export | licence carrier |
|---|---|
| print card | one line: `<NAME> by <Designer>, <SPDX>`, plus the parent line when `derivedFrom` is set |
| DXF, SVG | a comment or metadata element with the SPDX id and Designer; never on the cut layer |
| gerbers and KiCad (CERN-OHL-W-2.0) | a silk string with the source location where the board has room (board feature `silk string`, D-061). CERN-OHL v2 asks for a source location on products where reasonably practicable (inferred from the licence text; read it in full before the first board ships) |
| baked bench | the licence manifest of section 4.2 |

For user outputs hbf adds nothing that claims the output: no hack.build
licence, no hack.build designer, no copyright line of its own. The only
hack.build strings in a user's 3MF are the dialect Application value and
`Metadata/hackbuild_chase.json` with `{chase, buildHash}` (D-159).

### 1.5 Contributions

Contributions come in under the licence of the path they touch, the GitHub
Terms of Service section D.6 default (inbound equals outbound). There is no
CLA. Contributors are people; D-001 forbids crediting an AI tool in any
trailer, file header, CHANGELOG or contributors field, and the commit-msg
hook and lint-authors enforce it. Community coupons are credited by
contributor (D-042 default) through the coupon record that a profile row's
`Provenance.coupon` id points at (D-099).

The commit-msg hook rejects every `<word>-by:` trailer, people's included
(REPOS.md section 7.2, row `commit-msg`). An outside PR whose tooling
adds a DCO `Signed-off-by:` line would fail CI on every commit. The rules
for outside contributors live in a root `CONTRIBUTING.md` (M00, DOCS.md
section 7):

| rule | content |
|---|---|
| authors | people only; the git author of each commit is a person |
| trailers | none of any kind: no Signed-off-by, Co-Authored-By, Reviewed-by or Generated-with lines |
| outside PRs | a maintainer squashes the PR and rewrites the message to pass the hook; the contributor's git author line is kept, which is the credit |
| licence | inbound equals outbound by path, per the path map; no CLA, no DCO sign-off |
| coupons | a community coupon follows the intake record and review path of D-169; it enters at tier community |
| marks | contributions grant no right to the marks (D-171) |

### 1.6 Third-party marks in outputs

Some owner designs reproduce marks held by others. ESCUTCHEON R5 carries
the Starfleet delta traced from an insignia SVG and faces with the EFF,
iFixit and hive76 marks
(`fab-knowledge:evidence/x/downloads/dl-sweep/escutcheon/README.md`).
The open grants of section 1.1 cannot license those marks, and the project
never relicenses them (the D-147 reading in section 7).

| rule | content |
|---|---|
| examples and docs | no output that reproduces a third-party mark appears in a worked example, a docs page or a tutorial |
| canon seeds | no such output seeds a canon, a reference folder or a check fixture; the geometry may be reused with the mark removed or replaced by a project-owned shape |
| public galleries | no such output appears in a public gallery, a release asset or a bake published by hack.build |
| owner files | the files stay in the owner's evidence folders as private records |

---

## 2. Dependency audit

`tools/licences.json` holds one row per dependency. The table below is its
2026-10-04 content. From M-1 the table in this file is generated from that
JSON by `tools/counts.mjs` and the derived CI job fails on drift (D-010).

Row format:

```json
{
  "name": "replicad-opencascadejs",
  "version": "1.1.0",
  "published": "LGPL-2.1-only",
  "audited": "LGPL-2.1-only",
  "evidence": "npm view replicad-opencascadejs@1.1.0 license, 2026-10-04",
  "use": "packages/mesh brep route",
  "load": "lazy-separate-file",
  "status": "adopt-M14",
  "decision": ["D-024", "D-043"]
}
```

`published` is the registry field verbatim (`null` when absent). `audited`
is the SPDX expression the project relies on, filled from the LICENSE file
when the field is missing. `load` is one of `bundled`, `lazy-separate-file`,
`dev-only`, `python-tool`, `external-process`, `excluded`, `app-only`.

### 2.1 Runtime dependencies (JS and wasm)

| name | version | licence as published | use | constraint | decision |
|---|---|---|---|---|---|
| manifold-3d | 3.5.4 | Apache-2.0 | geom, mesh, checks, sim; CrossSection carries Clipper2 (BSL-1.0, vendor, `research/code-cad-and-eda-tooling.md` row Clipper2) | keep the Apache-2.0 and BSL-1.0 notices in every bake manifest | D-040, D-163 |
| three | 0.186.1 | MIT | ui-core, viewer, bakes | notice in bake manifest | D-127 |
| @dimforge/rapier3d-deterministic-compat | 0.21.0 | Apache-2.0 | sim | notice in bake manifest | D-134 |
| eecircuit-engine | 1.8.0 | MIT (wrapper, LICENSE Copyright (c) 2024 EElab.dev); the bundled ngspice 45.2 wasm is BSD-3-Clause, with `src/frontend/numparam` LGPL-2.0-or-later and `src/maths/KLU` LGPL v2 per ngspice COPYING (read 2026-10-04); xspice and osdi are disabled by EEcircuit-engine `Docker/run.sh:107` | circuit, lazy | audited `MIT AND BSD-3-Clause AND LGPL-2.0-or-later AND LGPL-2.1-or-later` (M05-T01, 2026-10-08: the KLU file headers that state a licence, `colamd.c` lines 53 to 56 and `colamd_global.c` line 7 at tag ngspice-45.2 commit 724dc77b9153dc75eaec474b1f7a44f1fcf5f362, give LGPL 2.1 or any later version; the other KLU, AMD and BTF files carry no licence text); load `lazy-separate-file`; never in a bake; the manifest names the ngspice 45.2 source tarball URL and the EEcircuit-engine commit of `Docker/run.sh`. 19 MB ESM file with `spice.wasm` inlined as a data URL (`evidence/scratch/c9/eecircuit-engine-1.8.0/package/dist/eecircuit-engine.mjs` line 62), 43 MB package (vendor, verified-claims C9); loaded only for device models and transients | D-086, D-043 |
| replicad | 1.1.0 | MIT | mesh brep route, M14 | lazy; never in the default offline bake; never a model default | D-024 |
| replicad-opencascadejs | 1.1.0 | LGPL-2.1-only | OCCT kernel for replicad, 48.9 MB (vendor, verified-claims C8) | separate lazily loaded file, replaceable by the user, source location in the manifest | D-024, D-043 |
| jszip | 3.10.1 | (MIT OR GPL-3.0-or-later) | 3mf writer | the project elects MIT; recorded as `audited: "MIT"` | D-040 |
| @modelcontextprotocol/server | 2.3.0 | Apache-2.0 | core MCP transport | NOTICE kept in the CLI package | D-108 |
| @modelcontextprotocol/core | 2.3.0 | Apache-2.0 | same | same | D-108 |
| zod | 4.6.5 | MIT | spec-derived schemas | none | D-040 |
| conduyt-js | 1.0.0 | MIT | link, M13 | none | D-093 |
| @virgilvox/hackbuild-ui | 0.2.0 | MIT in package.json; no LICENSE file in the tarball (read 2026-10-04); Font Awesome Free glyph data inside, "Icons: CC BY 4.0. Code: MIT." per the generated icons source comment | ui, bakes | the CC BY 4.0 icon attribution travels into every bake manifest; asking upstream for a LICENSE file is outside this plan (REPOS.md) | D-116 |
| kicadts | 0.0.58 | none in package.json; LICENSE file MIT; GitHub reports MIT | board KiCad read and write | `audited: "MIT"` with the LICENSE file as evidence, so scanners that flag a missing field pass | D-090 |
| tscircuit | 0.0.2744 | MIT | board capture | exact pin at M08 | D-089 |
| @tscircuit/core | 0.0.2088 (0.0.2087 earlier the same day, M08 card) | none in package.json; LICENSE file MIT (Copyright (c) 2024 tscircuit Inc., read 2026-10-04); GitHub reports MIT | board | `audited: "MIT"` from the LICENSE file; exact pin at M08 | D-089 |
| @tscircuit/props | 0.0.687 | ISC | board | none | D-091 |
| circuit-json | 0.0.516 | ISC | board, circuit, catalog interop IR | exact pin at M08 | D-091 |
| circuit-json-to-gerber | 0.0.112 | MIT | board | exact pin at M08 | D-089 |
| circuit-to-svg | 0.0.441 | ISC | board | exact pin at M08 | D-089 |
| circuit-json-to-kicad | 0.0.230 | none in package.json; LICENSE file MIT (Copyright (c) 2025 tscircuit Inc., read 2026-10-04) except KiCad-generated test artifacts | board | `audited: "MIT"`; at M08 confirm the npm tarball holds no KiCad-generated artifacts, else those files fall under the KiCad library row of section 2.7 | D-089 |
| occt-import-js | 0.0.23 | LGPL-2.1 | `packages/board/seed/step2mesh.mjs` STEP import | separate lazily loaded file only, never bundled into an MIT package | D-043 |
| @visioncortex/vtracer | 1.0.0-alpha.4 | MIT OR Apache-2.0 | inlay, evaluation at M03 against in-house quantize | alpha; adoption needs the M03 written verdict | D-145 |
| sparrow | 0.3.0 era, no npm package; GitHub JeroenGar/sparrow reports MIT, pushed 2026-10-04 | MIT | nest, strip mode, self-built wasm under evaluation at M07 | links jagua-rs; see the MPL rule in section 3 | D-137 |
| jagua-rs | 1.0.0 (crates.io, 2026-10-01) | MPL-2.0 | inside sparrow's wasm only; nest never calls it directly | rejects item holes, dropped multi-strip (verified-claims C8) | D-137 |
| earcut (port) | 2.2.4, ported into `packages/geom/src/earcut.ts` from KNUCKLE's vendored copy (`milestones/M00-foundation.md` M00-T03 step 4) | ISC | geom triangulation wrapper, shipped in the kernel and in bakes | ISC copyright line kept in the `earcut.ts` header and listed in the bake manifest and THIRD-PARTY-NOTICES | D-163 |
| opentype.js | 1.3.4 via replicad 1.1.0 (M14, `milestones/M14-brep.md` line 84); a direct pin when a text feature adopts it | MIT | glyph outlines (PLAN.md line 1322) | notice in bake manifest when bundled | D-024 |
| @fontsource/permanent-marker | 5.3.0 | Apache-2.0 | display face in bakes | notice in bake manifest | D-121 |
| @fontsource/special-elite | 5.3.0 | Apache-2.0 | tagline face in bakes | same | D-121 |
| @fontsource/vt323 | 5.3.0 | OFL-1.1 | readout face in bakes | OFL text in bake manifest; font not sold on its own | D-121 |
| @fontsource/ibm-plex-mono | 5.3.0 | OFL-1.1 | mono face in bakes; KEYWAY generator inputs in `reference/copper/_inputs/` | OFL text beside the woff2 files (M05 card) | D-121 |
| @fontsource/libre-baskerville | 5.3.0 | OFL-1.1 | the one tagline line | same | D-121 |

M08-T01, 2026-10-09: `tools/licences.json` holds rows for the board
packages installed that day (kicadts 0.0.58 and format-si-unit 0.0.14
audited MIT from their LICENSE files, both Copyright tscircuit Inc., with
no package.json licence field; circuit-json 0.0.525 and @tscircuit/props
0.0.698 ISC; sucrase 3.35.1 MIT; react 19.3.0 MIT as the props peer), for
the four recorded and uninstalled pins (tscircuit 0.0.2806, @tscircuit/core
0.0.2121, circuit-json-to-gerber 0.0.112, circuit-to-svg 0.0.447; status
`blocked`, PLAN.md section 16), for circuit-json-to-kicad 0.0.230
(`evaluated`, not installed, so the tarball check waits for adoption), for
occt-import-js 0.0.23 (LGPL-2.1, `lazy-separate-file`, outside the lockfile)
and for the excluded kiutils 1.4.8 and easyeda2kicad 1.0.1. The versions in
the table above are the 2026-10-04 values.

### 2.2 Dev and CI toolchain (not shipped)

| name | version | licence as published | use |
|---|---|---|---|
| typescript | 7.0.2 | Apache-2.0 | typecheck |
| vitest | 5.0.3 | MIT | unit and property tests |
| vite | 8.3.2 | MIT | apps build |
| @changesets/cli | 3.0.3 | MIT | kernel release |
| @playwright/test | 1.63.0 | Apache-2.0 | browser and hook conformance |
| fast-check | 4.10.2 | MIT | property tests |
| tsdown | 0.23.0 | MIT | package build |
| earcut | 2.2.4 | ISC | legacy BOSS devDependency (`milestones/M05-circuit-copper.md`); the runtime port is the section 2.1 row |
| polygon-clipping | 0.15.7 | MIT | same |

Pins and dates follow D-040; they are re-dated at each milestone exit, and
the audit rows are re-read on the same day.

### 2.3 Python tools (`tools/py`, run by uv)

| name | version | licence as published | use | decision |
|---|---|---|---|---|
| lib3mf | 2.5.0 | BSD classifier on PyPI; BSD-2-Clause per `research/code-cad-and-eda-tooling.md` | 3MF validation | D-040 |
| numpy | 2.5.3 | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 | validate_3mf.py | D-140 |
| pygerber | 2.4.3 | MIT | gerber reparse | D-090 |
| gerbonara | 1.6.3 | Apache-2.0 | gerber reparse | D-090 |
| ezdxf | 1.4.4 | MIT classifier | DXF audit in CI | D-138 |
| shapely | 2.1.2 | BSD 3-Clause | board tooling (M08 card step 4) | D-089 |
| fonttools | 4.66.1 | MIT | font handling for copper generators | D-089 |
| brotli | 1.2.0 | MIT | woff2 decode | D-089 |

gerbonara 1.6.3 brings click and quart with quart's server stack (flask,
hypercorn, werkzeug and their dependencies); pygerber 2.4.3 brings click,
pillow and pydantic. Each module has a row in `tools/licences.json`; all
are MIT, BSD-3-Clause, Apache-2.0 or MIT-CMU (installed metadata, read 2026-10-09).

### 2.4 Excluded

| name | version | licence as published | why it is out | decision |
|---|---|---|---|---|
| esm-potrace-wasm | 0.5.1 | GPL-2.0 | GPL inside an MIT inlay package; handoff RESEARCH.md:133 had it as MIT or Apache, which was wrong | D-043, D-145, C-11 |
| potrace (upstream) | any | GPL-2.0-or-later | same | D-043, C-11 |
| kiutils | 1.4.8 (last release 2024-02-02, last commit 2024-05-02) | GPL-3.0 | copyleft and stale on KiCad 10; replaced by kicadts | D-090 |
| brepkit-wasm | 3.0.0 | AGPL-3.0-only | second switch to AGPL (0.8.10 to 2.22.x was AGPL before, verified-claims C8) | D-043 |
| easyeda2kicad | 1.0.1 | AGPL-3.0 (PyPI) | part sourcing helper; may be run by a person by hand, never called from a package | D-043 |
| planegcs (@salusoft89/planegcs) | 1.2.0 | LGPL-2.0-or-later on npm; GitHub reports LGPL-2.1 (treat as LGPL-2.1) | not adopted; SKETCH keeps its damped Gauss-Newton solver (owner, default). If ever adopted, it loads as a separate file only | D-144, D-043 |

brepjs 20.1.2 itself is Apache-2.0; its API is mined for ideas only, and its
peer range still allows the permissive brepkit 2.x line (verified-claims C8).
Nothing from brepjs is a dependency.

### 2.5 Outside the MIT packages

| name | licence | where it stays | decision |
|---|---|---|---|
| CommonPub (`commonpub/commonpub`) | AGPL-3.0 (GitHub); `@commonpub/layer` 0.138.1 has no npm licence field | the site only. A hack.build instance that modifies the layer publishes its changes. Fab packages imported into the site stay separate packages and take on no obligation | D-043, D-033 |
| rtl-sdr driver in hackbuild-bench `src/core/drivers/rtlsdr` | a port of osmocom librtlsdr at 797f814, GPL-2.0-or-later source (`sources/repos/hackbuild-bench-and-ui.md`); GitHub reports GPL-2.0 for osmocom/rtl-sdr | the hackbuild-bench app only; `link` extracts every other driver at M13 and leaves this one (owner, default) | D-094, D-043 |

### 2.6 External programs (invoked, never linked or bundled)

| program | licence | how hbf touches it |
|---|---|---|
| OpenSCAD | GPL-2.0 with exception per `research/code-cad-and-eda-tooling.md`; GitHub reports NOASSERTION | import-and-audit route runs the binary as a process (D-146) |
| KiCad 10, kicad-cli | GPL-3.0 | export and DRC as a process; KiCad 11 headless IPC revisited later (D-090) |
| Bambu Studio, PrusaSlicer, OrcaSlicer | AGPL-3.0 | they read hbf's 3MF files; MIT hackbuild-3mf can be vendored into them without friction |

### 2.7 Sources mined for facts

Facts (dimensions, published numbers, behaviour) carry no copyright. Code
does. GPL sources give facts only.

| source | licence | what may be taken |
|---|---|---|
| BOSL2 | BSD-2-Clause | data and code, with the BSD notice kept (vendorable) |
| NopSCADlib | GPL-3.0 | dimensions as facts, each with a provenance tier and source path; no code |
| Boxes.py | GPL-3.0 (GitHub) | joint and box parameters as data; no code port or translation |
| CADAM | GPL-3.0 | UX observations only |
| Fritzing | GPL-3.0 | diagram conventions only |
| KiCad official libraries | CC-BY-SA-4.0 with the article 3 design-use waiver (kicad-footprints LICENSE.md, read 2026-10-04); the waiver does not cover redistributing library parts as a collection | boards that use the parts are unaffected; footprint, symbol or 3D model files copied into the repo stay CC-BY-SA-4.0 with KiCad's LICENSE.md beside them, under `packages/catalog/data/kicad/` only (path map, section 1.2); pad numbers extracted as facts into catalog rows carry a source path |
| vendor datasheets and drawings | vendor terms | numbers with page citations (D-076 rows cite pages); no copied figures |

---

## 3. Copyleft exclusion rules (D-043)

Rules, in force from M-1:

- No GPL or AGPL code enters an MIT package, a published package or a
  bake. Named exclusions: esm-potrace-wasm 0.5.1, potrace, kiutils,
  brepkit-wasm 3.0.0, easyeda2kicad, the rtl-sdr driver.
- LGPL code loads only as a separate file, fetched lazily, replaceable by
  the user, and never inside the default offline bake. The licence
  manifest names its source location. Today this covers
  eecircuit-engine (M05, LGPL parts inside its ngspice wasm),
  replicad-opencascadejs (M14) and occt-import-js (M08); planegcs would
  follow the same rule if a later decision adopts it.
- MPL-2.0 is file-level copyleft. jagua-rs may be compiled into sparrow's
  wasm if the MPL source files stay unmodified, or any modified MPL file is
  published, and the manifest names the exact crate version and its source
  location. The rest of the bake keeps its own licences. This answers the
  question M07 raises in `milestones/M07-motion-nest.md` step 6; adopting
  sparrow still needs the new DECISIONS.md entry that card names.
- A dual-licensed dependency is used under its permissive option, written
  into `audited` (jszip: MIT).
- A dependency with no licence field is audited from its LICENSE file. If
  no file settles it, `audited` is `unknown` and the dependency is not
  adopted.
- GPL and AGPL projects are mined for facts only: no port, no translation,
  no paraphrase of code. A ported fact carries a provenance tier and a
  source path (D-007, D-099).
- External programs under GPL or AGPL run as processes. Their binaries are
  never bundled into a package or a bake.
- Owner code without a LICENSE file is ported after the owner confirms its
  licence in the PR body: badge-replicator (one commit 9fdfb50, no LICENSE
  file, `milestones/M03-inlay.md` intake card); hackbuild-bench and
  hackbuild-ui state MIT in package.json with no LICENSE file.
- Graduated design repos and the extracted repos (hackbuild-3mf,
  hackbuild-inlay, hackbuild-copper) copy these rules and the audit tool.

Enforcement:

| check | where | fails on | lands |
|---|---|---|---|
| `node tools/licences.mjs --check` | CI house-rules job; also runnable on staged files beside lint-voice | a package in any workspace package's lockfile closure whose `audited` matches `\bGPL` or `AGPL` (word boundary, so LGPL expressions such as eecircuit-engine's and replicad-opencascadejs's fall to the LGPL rule instead); a dependency in the lockfile with no `tools/licences.json` row; an `unknown` audited value with status other than `excluded`; an LGPL row whose `load` is not `lazy-separate-file`; a `license` field in a workspace package.json that differs from the path map; a file under `packages/catalog/data/kicad/**` without KiCad's LICENSE.md beside it, or a package build that bundles such a file without the notice | M-1 |
| `packages/inlay/test/licence.test.ts` | `npm test -w packages/inlay -- licence` | the same closure test scoped to inlay; `grep -rn "potrace" packages/` returns nothing | M03 |
| bake manifest test | M09 bake suite | a baked file whose manifest misses a dependency the bake inlines; a default bake whose manifest lists any LGPL item (eecircuit-engine, replicad-opencascadejs, occt-import-js) | M09 |
| notices drift | CI house-rules job | `THIRD-PARTY-NOTICES.txt` in `apps/fab/dist` or in a package that inlines a dependency differs from a fresh `tools/licences.mjs --notices` run | M09 |
| registry `license` field | M16 registry gate | a tools.json row without an SPDX licence (D-158) | M16 |

`tools/licences.mjs` reads `package-lock.json` (npm workspaces, D-038
default) and `tools/py/uv.lock`, so the check covers JS and Python.

---

## 4. Licences in the build

### 4.1 BuildInputs

`BuildInputs.licences` is part of the build hash (D-051). The field is
`readonly licences: Readonly<Record<string, Spdx>>` in `spec/registry.ts`
(lines 161 to 162). Rules:

- Keys are the package names whose code ran in this build: always
  `@hackbuild/kernel` and `manifold-3d`; `@dimforge/rapier3d-deterministic-compat`
  when sim ran; `eecircuit-engine` when the engine loaded;
  `replicad` and `replicad-opencascadejs` when the brep route ran.
- Values are the `audited` SPDX expression from `tools/licences.json`, never
  the raw registry field.
- The design's own licence is already hashed through `defHash`, since
  `ChaseMeta.license` is part of the chase source.
- Every registry Manifest carries `license` (`spec/registry.ts`, Manifest),
  so a third-party pack of checks or feature kinds declares its licence and
  `registryHash` covers it.
- An audited licence change is a different build input, so the build hash
  moves. That is intended: two builds with one hash ran code under the same
  terms.

Example for a brep route build at M14:

```json
{
  "@hackbuild/kernel": "MIT",
  "manifold-3d": "Apache-2.0",
  "replicad": "MIT",
  "replicad-opencascadejs": "LGPL-2.1-only"
}
```

`part.inspect` prints the map; `export.run` writes it into the artifact
record so a fabricated file can be traced to the terms of the code that
made it.

### 4.2 Bake licence manifest

Every baked bench (D-129) inlines third-party code, fonts and icons, so it
carries their notices. The bake writes one
`<script type="application/json" id="hb-licences">` element holding, per
inlined item: name, version, SPDX, copyright line from its LICENSE file, and
the source location for LGPL or MPL items. The full texts of each licence
used appear once (MIT, Apache-2.0, BSL-1.0, ISC, OFL-1.1, CC-BY-4.0 for the
Font Awesome glyphs). The About panel renders this element. It names
Moheeb Zara and hack.build for project code and the third-party holders for
theirs, and nothing else; no AI or LLM credit (D-001). The design shown in
the bake adds one line with its `ChaseMeta.license`.

The bake manifest and `THIRD-PARTY-NOTICES.txt` (section 1.2) come from the
same generator.

The manifest counts toward the 16 MB bake ceiling (D-129). Its size is
measured at M09 and reported with the bake.

---

## 5. OSHWA certification for boards

Boards default to CERN-OHL-W-2.0 with optional certification (D-041).
CERN-OHL-W is the weak reciprocal variant: changes to the licensed board
stay open, while a larger product that embeds it may stay closed
(`research/maker-culture-and-market.md` section 3). That fits modules meant
to drop into other people's products, such as a BLOCKS stud or an SAO
footprint.

What is known, with grades from `research/maker-culture-and-market.md` and
the verdicts in `synthesis/verified-claims.md` C14:

| item | state |
|---|---|
| requires an open licence for hardware, for software if any, and for documentation | confirmed (certification.oshwa.org/requirements.html) |
| the requirement covers only what is under the creator's control, so a closed MCU on an open board is allowed | confirmed (verified-claims C14) |
| NC licences fail the OSHW definition (criteria 4, 7, 8) | confirmed |
| CERN-OHL-W-2.0 exists as an SPDX id | confirmed (spdx.org) |
| certification is free | unverified; dropped from every claim until a primary source is cited (C-15, D-022) |
| UID format is a two-letter country code plus six digits; re-register for a substantially new version; a listing cannot be removed, the mark can be dropped | vendor, from the OSHWA FAQ as read in the research note; re-read before the first application |
| OSHWA certified projects: 3,333 on the site in October | vendor, `research/maker-culture-and-market.md` line 51 |

Checklist for a board the owner chooses to certify (no board is chosen
today; the choice is the owner's):

- hardware files under CERN-OHL-W-2.0 in the design's chase;
- firmware under MIT (OSI licence, OSHW criterion 3);
- documentation under an open licence, which needs the docs decision of gap
  L-01 first;
- no NC term anywhere in the design folder;
- the source location on the board silk where it fits;
- the README verified block (D-008) stating what was checked by machine and
  what was measured on a built board.

An `hbf` documentation bundle for OSHWA (research idea, section 14 of the
market note) is a proposal with no milestone.

---

## 6. Platform AI-content tagging and the provenance card

### 6.1 The platform facts

Thingiverse, after the MyMiniFactory acquisition (closed 2026-01-30),
requires creators to tag AI-generated uploads; visitors can filter them and
AI-tagged content left the homepage. Enforcement is by account review and
reports, not mesh classification. Leadership said engineering categories may
treat AI-assisted parametric tools differently from art. Source:
3dprintingindustry.com interview 248928, grade B in
`research/maker-culture-and-market.md`, confirmed in verified-claims C13.
MyMiniFactory's SoulCrafted label (2025) promotes verified human-made work
(grade C, same note). MakerWorld and Printables policies in their own words
were not read (open question in the market note).

How a listing is tagged is the owner's call per platform and per listing.
hbf makes no platform claim on the owner's behalf.

### 6.2 The provenance card

The research idea (`research/maker-culture-and-market.md` section 16 idea 1,
`synthesis/plan-deltas.md` ideas list item 6): every bake and every 3MF
carries a small record of how the object was made, so a listing can show
that the geometry came from a deterministic build that passed declared
checks. The thesis supports this directly: the declarations say what must
be true, the build makes geometry, and the checks prove it.

Fields allowed under D-001:

| field | value |
|---|---|
| designer | a person's name, from the workspace author, or empty |
| licence | `ChaseMeta.license` |
| hbf | kernel version |
| buildHash | from BuildInputs (D-051) |
| checks | count passed, count failed, registryHash |
| chase | chase id and, for hack.build designs, the public source URL |
| licences | the BuildInputs licence map |

The research version also lists "which declarations the model wrote and
which a person wrote". Naming a model in exported file metadata conflicts
with D-001, which covers 3MF, DXF and print card metadata. That field is out
of the default card; whether any authorship-by-tool record belongs in an
export is owner question L-06.

Placement, proposed: additive keys in `Metadata/hackbuild_chase.json` beside
`{chase, buildHash}` (CHK-ART-02 reads only those two, so it keeps passing),
one line on the print card, and the same payload in the QR on the card. The
card needs a DECISIONS.md entry before it is scheduled; the natural place is
the M10 chase work or the M12 agent surface.

---

## 7. Owner questions and gaps

Owner-status decisions this file depends on, with the default in force:

| id | question | default in force |
|---|---|---|
| D-042 | failure corpus open or held closed | CC-BY-4.0, community coupons credited by contributor |
| D-094 | where the GPL rtl-sdr driver lives | hackbuild-bench app only |
| D-144 | adopt planegcs for SKETCH | not adopted; SKETCH keeps its own solver |
| D-147 | brand packs | brand registry with a brand.json contract; HeatSync assets from the heatsync skill; app chrome stays hack.build. Reading for this file: client and HeatSync marks keep their owners' terms and the project never relicenses them |
| D-170 | docs licence | CC-BY-4.0 for `docs/**` and root and package READMEs, code samples also MIT |
| D-171 | marks | hack.build name and logo reserved; TRADEMARKS.md; logo outside the MIT grant |
| D-172 | emitter templates | MIT-0 for template text copied into user outputs |

Gaps found while writing. L-01, L-02 and L-08 now have owner entries
(D-170, D-171, D-172, milestone M00). Each other gap needs a new
DECISIONS.md entry (append-only after M-1) before it changes anything.
Gap ids use the L series; they were G-01 to G-10 before 2026-10-05 and
were renamed so they do not collide with the gold acceptance rules G-01 to
G-57 (`fab-knowledge:synthesis/gold-standard.md`
section 11).

| gap | question | state today |
|---|---|---|
| L-01 | licence for docs (`docs/`, READMEs, the plan set) | carried by D-170 (owner, default CC-BY-4.0, code samples also MIT) |
| L-02 | the hack.build name and logo reserved as marks outside every open grant (OSHW criterion 2 allows this) | carried by D-171 (owner, default reserved; TRADEMARKS.md; logo path-map row) |
| L-03 | spec text also under CC BY 4.0 beside MIT, as the market note suggests for a standard | spec is MIT only (D-041) |
| L-04 | `build.ts` inside a design folder: design licence (CC BY-SA, which Creative Commons advises against for software) or MIT | carried by D-195 (owner, default MIT for `build.ts`, `bench.ts` and `src/**`; `chase.ts` follows the design) |
| L-05 | the licence `chase.scaffold` proposes for a user's chase | asked as a typed question with no preselected value (section 1.3) |
| L-06 | any record in exports of which declarations a model wrote | not written (D-001) |
| L-07 | a warning when a child of a CC-BY-SA-4.0 design declares a licence the share-alike term does not allow | information in `chase.validate` only |
| L-08 | notices carried into user outputs by emitted firmware and exporter boilerplate | carried by D-172 (owner, default MIT-0 for template text; filling code MIT) |
| L-09 | whether future graduated designs follow D-041 (CC BY-SA for print files) or PIP's precedent of MIT for the whole repo | PIP stays MIT as published; hackbuild-fab never edits pip-controller |
| L-10 | a CI job row for `tools/licences.mjs` in TESTING.md's job table | runs inside house-rules per section 3 |

---

## 8. Where each item lands

| milestone | licensing work | files |
|---|---|---|
| M-1 | LICENSE, LICENSES/, path map, `tools/licences.json` with every root and spec dependency, `tools/licences.mjs --check` in house-rules, package.json author and licence on every package | `LICENSE`, `LICENSES/*.txt`, `tools/licences.json`, `tools/licences.mjs`, `tools/test/licences.test.mjs` |
| M00 | 3MF License, Designer, Copyright per section 1.4; BuildInputs licences; path-map rows for docs, marks and templates (D-170 to D-172); TRADEMARKS.md and CONTRIBUTING.md before the hackbuild-3mf publish; hackbuild-3mf repo with its own MIT LICENSE, CC-BY-4.0 docs, TRADEMARKS.md and the audit tool | `packages/3mf/src/metadata.ts`, `packages/project/src/build-inputs.ts`, `TRADEMARKS.md`, `CONTRIBUTING.md`, `LICENSES/MIT-0.txt`, `tools/licences.json` |
| M03 | inlay closure test; potrace absent; vtracer verdict records its licence; badge-replicator licence confirmed in the PR body | `packages/inlay/test/licence.test.ts` |
| M05 | eecircuit-engine row (LGPL parts audited, `lazy-separate-file`, KLU headers read) and BuildInputs entry; OFL-1.1 text beside the Plex Mono woff2 files; earcut and polygon-clipping rows | `reference/copper/_inputs/OFL-1.1.txt` |
| M07 | sparrow and jagua-rs rows; MPL source location in the manifest if adopted | `tools/licences.json` |
| M08 | board rows (kicadts, tscircuit set, occt-import-js, gerbonara, pygerber, shapely, fonttools, brotli; easyeda2kicad and kiutils excluded); path-map row and KiCad LICENSE.md copy before any footprint file lands; silk source location on CERN-OHL boards | `tools/licences.json`, `packages/board/` |
| M09 | bake licence manifest and About panel; fonts and Font Awesome attribution; manifest size reported; `tools/licences.mjs --notices` and the notices drift check; no LGPL item in a default bake | `packages/ui-core/src/bake/licences.ts`, `tools/licences.mjs` |
| M12 | `THIRD-PARTY-NOTICES.txt` written into `apps/fab/dist` for the hosted app | `apps/fab/` |
| M10 | `ChaseMeta.license` migration fill (CERN-OHL-W-2.0 for board exports, CC-BY-SA-4.0 otherwise); scaffold question | `packages/chase/src/migrate/1-to-2.ts` |
| M13 | link extraction leaves the rtl-sdr driver in hackbuild-bench | none in hackbuild-fab |
| M14 | replicad and replicad-opencascadejs as lazy separate files; LGPL source location in the manifest; opentype.js row (1.3.4 via replicad) | `packages/mesh/src/routes/brep.ts` |
| M16 | registry `license` field on every tools.json row (D-158) | `registry/tools.json` |
