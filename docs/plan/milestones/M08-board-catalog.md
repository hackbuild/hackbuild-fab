# M08 board and catalog

Version 4, 2026-10-04. Part of the hackbuild-fab plan set; PLAN.md is the index.

Goal: boards that refuse to emit wrong.
Depends on: M05
Adopted dependency: kicadts 0.0.58; tscircuit and circuit-json pinned exactly at M08; pygerber and gerbonara pinned at M08 (MILESTONES.md 1.2)
Commands added: catalog.find, catalog.pins (MILESTONES.md 1.3); export.run gains kinds gerbers, kicad, bom, cpl, circuit-json, wiring
Release at exit: none

hbf (working name) is the binary with CLI, MCP and HTTP transports. CHASE
(working name) is the typed design document. PIP (was HAFT) is the published
print-in-place controller at hackbuild/pip-controller (D-013). Every number
in this file carries a qualifier (measured, computed, vendor, inferred,
unknown) or names the file it was counted from (D-007). Numbers marked
"computed, scratch run" were produced on 2026-10-04 on this host from the
named legacy files, with the tool versions listed under "Records taken while
writing this file"; the port must reproduce them, and the golden records
what the port computes.

`board` answers "can it be fabbed" (PLAN.md 9.1). This milestone gives it two
backends that emit one pad and net record, an independent reparse of every
artifact it writes, and a catalog whose weakest row stops a fabrication
export before a person is asked to approve it.

## What this milestone decides and carries

| item | decision or correction | where in this file |
|---|---|---|
| two backends, one pad and net record, CHK-BRD on both | D-089 | M08-T02, M08-T06, M08-T10 |
| SPINDLE R1 reparse rewritten on gerbonara and pygerber | D-089, D-180, plan-deltas R69 | M08-T07 |
| KiCad files through kicadts, kiutils dropped | D-090, D-043 | M08-T08 |
| SHUNT face convention and lead-landing proof as a registry check | D-089 (seed fixed in M-1-T10) | M08-T09 |
| catalog tier on every row, inferred refused at export with E_PROVENANCE | D-102, D-064 | M08-T03, M08-T14 |
| catalog storage: committed rows, external lookups into .hbf cache | D-103 | M08-T03 |
| per-MCU pin rows extend the M05 threshold rows | D-076, C-02 | M08-T04 |
| SuperMini pads at vendor tier | D-096 | M08-T04 |
| SuperMini dual-supply jumper default normally open | D-088 (owner, default in force) | M08-T12 |
| one actuator row type, PAWL and WASHER fixtures, SG90 stays inferred | D-104 | M08-T05 |
| Circuit JSON emission and tscircuit enclosure reads | D-091 | M08-T11 |
| exact tscircuit and circuit-json pins, re-dated at exit | D-040, R-07 in RISKS.md | M08-T01, M08-T15 |
| board feature namespace | D-061 | M08-T12 |
| expected-violation sets on a deliberate art board | D-074 | M08-T09 |
| copyleft exclusion for board tooling | D-043 | M08-T01 |
| determinism of written artifacts | D-051, D-052 pattern | M08-T06 |
| catalog.find, catalog.pins; export kinds | D-106, D-114 | M08-T14 |
| wiring package; three parity candidates (PIP, SPARGER W, TANG R5), owner picks | MILESTONES.md 1.4 | M08-T13 |

Detail on the checks lives in ../CHECKS.md; the catalog and pin rows in
../PROFILE.md and ../PACKAGES.md; the command shapes in ../AGENT-SURFACE.md;
the licences in ../LICENSING.md. This file holds what a builder runs.

## Evidence roots

| short | absolute path |
|---|---|
| x | `fab-knowledge:evidence/x/` |
| hbf | `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/` |
| syn | `fab-knowledge:synthesis/` |
| notes | `fab-knowledge:sources/` |
| corpus | `fab-work-directory:` |

Cards write evidence paths in full.

## Records taken while writing this file

Scratch environment, 2026-10-04: Python 3.14 venv with shapely 2.1.2,
fonttools 4.66.1, brotli 1.2.0, gerbonara 1.6.3 (Apache-2.0), pygerber
2.4.3 (MIT), numpy; Node v22.12.0 with kicadts 0.0.58, circuit-json
0.0.516, @tscircuit/props 0.0.687, typescript 7.0.2. Scripts lived under
`fab-knowledge:evidence/scratch/m08/`.

| record | result | qualifier |
|---|---|---|
| SPINDLE R1 `pcb.py` regenerated (font path patched) | `DRC OK 19 nets, 70 pads, 57 holes, tightest 0.32mm (rule 0.25), 46x46mm` | computed, scratch run |
| pad count behind "70 pads" | 55 component pads plus 15 vias; 57 holes = 42 drilled component pads plus 15 vias | counted from pcb.py |
| regenerated vs shipped bytes | BOM, CPL, netlist, Edge_Cuts, F_Paste, PTH, NPTH equal; F_Cu, B_Cu, F_Mask, B_Mask, F_Silkscreen differ in bytes | computed, scratch run |
| two regenerations on one host | every file equal except the `%TF.CreationDate` line and zip member mtimes | computed, scratch run |
| shipped gerbers reparsed with gerbonara, vector compare against the regenerated source geometry | F_Cu 369.706 mm2, symmetric difference 0.000041 mm2; B_Cu 1883.166, 0.000087; F_Mask 259.997, 0.000026; B_Mask 114.681, 0.000053; F_Paste 19.120, 0.000000; F_Silkscreen 51.535, 0.0000 | computed, scratch run |
| pads and holes in the reparse | 55 of 55 component pads inside F_Cu; 57 of 57 drilled pads with a bottom ring; 57 of 57 PTH hits within 1 um, worst offset 0.0000 mm | computed, scratch run |
| pour isolation | 35 of 35 non-GND holes clear of the pour; 22 of 22 GND holes on a pour piece; the B_Cu pour is two pieces (1778.5 and 34.2 mm2) because the 5V bottom trace at y 20 cuts across the board | computed, scratch run |
| shipped gerbers rasterised with pygerber at 40 px/mm against the source drawn on the same grid | F_Cu agrees on 96.78 percent of source copper pixels, B_Cu 99.62 percent; 0 disagreeing pixels outside a 2 px (0.05 mm) band around source edges | computed, scratch run |
| raster agreement at 20 px/mm | F_Cu 93.04 percent unshifted, 96.91 percent after a 1 px shift; the raw percentage depends on grid alignment and is not a gate | computed, scratch run |
| legacy README raster figures | bottom 99.91 percent, top 99.28 percent. Method unknown. First stated in the R1 README from before the drill offset change (`fab-knowledge:evidence/x/downloads/dl-boards-tools/spindle/files (33)/README.md`, from `files (33).zip` downloaded 2026-08-01 03:14), whose `spindle-r1-gerbers.zip` differs from the shipped one in 8 of 9 members (only `spindle-NPTH.drl` equal) and whose `pcb.py` drills the module at pad centre (17.5 mm row against 15.24). Copied unchanged into the final README. Not parity evidence and not an acceptance target | unknown method |
| Excellon header | gerbonara warns `"G90" header statement found after end of header` on `spindle-PTH.drl` line 11; the SHUNT fix 16 applies to SPINDLE too | computed, scratch run |
| `pcb.py` font | reads `/home/claude/fonts/IBMPlexMono-Bold.ttf`, absent; SHUNT's `fonts/ibm-plex-mono-latin-700-normal.woff2` gives a silk symmetric difference of 0.0000 mm2 against the shipped silk | computed, scratch run |
| kicadts readback of `spindle-r1.kicad_pcb` against the regenerated pads | 18 footprints; 55 non-NPTH pads read; 55 of 55 equal on position, size, net, drill and drill offset (tolerance 1e-3 mm); 15 of 15 vias; 20 net entries (19 nets plus net 0); 59 segments | computed, scratch run |
| kicadts write round trip | parse, write, parse keeps 18 footprints, 59 pads, 59 segments, 15 vias, 20 nets, 2 zones, 4 gr_arc, 8 gr_line, 54 gr_text; a second write equals the first | computed, scratch run |
| SHUNT `check_fab.py` on the shipped fab set under gerbonara 1.6.3 | 9 gerber layers and 2 drill files parse; drill worst offset 0.0000 mm over 83; F_Cu 101 pads, B_Cu 61 (2 own, 59 through-hole from F); F silk 164453 vertices, 0 missing, 0 unexpected, mirrored variant shares 2030; B silk 40241 vertices, unmirrored variant shares 978; B silk ink box 8.04 to 145.95 mm inside the 154 mm width; slot 104 contour points at (77, 104); 4 NPTH at 3.20 mm | computed, scratch run |
| LUG `lug.circuit.json` element counts | 37 source_component, 37 pcb_component, 141 pcb_smtpad, 67 pcb_plated_hole, 4 pcb_hole, 131 pcb_trace, 70 pcb_via, 15 source_net, 146 source_trace, 0 error elements | counted from the file |
| AUGER `auger.circuit.json` error elements | 112 pcb_trace_error (58 "Could not find a route"), 21 pcb_trace_missing_error, 21 pcb_port_not_connected_error, 6 pcb_pad_trace_clearance_error, 2 pcb_via_trace_clearance_error, 1 pcb_via_clearance_error, 1 pcb_courtyard_overlap_error | counted from the file |
| npm registry, 2026-10-04 | tscircuit 0.0.2744 (MIT), @tscircuit/core 0.0.2087 (no licence field), circuit-json 0.0.516 (ISC), @tscircuit/props 0.0.687 (ISC), circuit-json-to-gerber 0.0.112 (MIT), circuit-to-svg 0.0.441 (ISC), circuit-json-to-kicad 0.0.230 (no licence field), kicadts 0.0.58 (no licence field; LICENSE file MIT), occt-import-js 0.0.23 (LGPL-2.1) | vendor (registry metadata) |
| PyPI, 2026-10-04 | easyeda2kicad 1.0.1 is AGPL-3.0 | vendor (registry metadata) |
| peer dependencies against typescript 7.0.2 | tscircuit, @tscircuit/core, kicadts, circuit-json-to-gerber and format-si-unit (pulled by circuit-json) declare `typescript ^5`; `npm install` fails with ERESOLVE; per-package `overrides` entries setting typescript 7.0.2 for each resolve it, and `npm ci` then exits 0 | computed, scratch run on kicadts plus circuit-json |
| circuit-json 0.0.516 field names | `source_printed_part` with `ftype: "printedpart"`; `cad_component.model_3mf_url`; clearance errors `pcb_pad_pad_clearance_error`, `pcb_pad_trace_clearance_error`, `pcb_via_clearance_error`, `pcb_via_trace_clearance_error` carry `actual_clearance` and `minimum_clearance`; `pcb_plated_hole` shapes `circular_hole_with_rect_pad` and `pill_hole_with_rect_pad` carry `hole_offset_x`; `source_component_internal_connection`; `pcb_soldermask_opening`, `pcb_keepout`, `pcb_cutout`, `pcb_hole`; no solder jumper element | read from `dist/index.d.mts` |
| @tscircuit/props 0.0.687 | `AssemblyPrintedPartProps` (name, mountedTo, mountFace, mountGap), `EnclosureFdmBoxProps` (boardRef, wallThickness, floorThickness, lidThickness, boardClearance, standoffHeight, topHeadroom, lidLipDepth, disableCutouts), `CutoutApertureProps` (margin, widthDimensionOffset, heightDimensionOffset, depth) authored around the part's `insertionDirection` | read from `dist/index.d.ts` |

## Legacy sources and their hashes

Every port starts from these files (D-156). The builder records them in
`lineage.json` with the sha256 below before writing package code.

| file under `corpus/benches/` | sha256 | role |
|---|---|---|
| `spindle/outputs/spindle/pcb.py` | 650351218717462917332d02c7cfb70883ad3a66ffad24b0e2756b90ce8a3176 | SPINDLE R1 generator, gates, gerber region writer, Excellon, BOM, CPL, netlist |
| `spindle/outputs/spindle/kicad_out.py` | cb50c4b14d1250cb6ce11f9bf4a8bb8c5e506f3027697fdf836901f27823ecf5 | KiCad 7 writer (`exec`s pcb.py) |
| `spindle/outputs/spindle/kicad/spindle-r1.kicad_pcb` | 55d09eba04102cd70885849c045311c4752c9afaf1d925f7543e59e598a03cd8 | legacy KiCad golden |
| `spindle/outputs/spindle/spindle-r1-gerbers.zip` | 10baf366e105f2b065c6ddc0922b165ed507a6a3f087c58e19afd53a42ad58e3 | legacy fab set |
| `spindle/outputs/spindle/check3d.mjs` | 2605af49627df4d597ad4b6f39a1a58e56993fcbc32d2801d0d2119b720a2eb1 | SPINDLE placement proof (19 pads at 0.000 mm per README) |
| `shunt/outputs/shunt-r1/gen_fab.py` | eeffed1bc78e44dfc06acc09e04b4f6dd1cb3a62834a6fd6da09e0b979374013 | Gerber X2 and Excellon writer from board.json |
| `shunt/outputs/shunt-r1/check_fab.py` | cb9902bfc157afd390b89405369f271c79e81030192f39447c5b341214942f14 | gerbonara reparse with silk vertex compare |
| `shunt/outputs/shunt-r1/board.json` | db835634c13a8661fb0ac20132e55e11190e6f3262fa20f07f5a69fe3b08d375 | SHUNT source of truth (168560 bytes) |
| `shunt/outputs/shunt-r1/textpoly.py` | 253202dccc4eda01eba47df6eb7566fc9d2519c3f4c7d3386b21594baa6820ee | text to filled polygons, odd containment depth |
| `shunt/outputs/shunt-r1/probe.mjs` | ddc820b2e99db8b01b9e2245a794fcd3d7442a5231f8e32ea65d3f66354f1167 | uv registration and mirror probe |
| `shunt/outputs/shunt-r1/check3d_shunt.mjs` | 2753dcdcb26212400f04d7e714fd5cbb77aca54d54bb0bd22913738ad1bc1aad (M-1-T10) | lead landing proof |
| `round-pi-board/outputs/lug.tsx` | ff88947cb61584f220eb8d2495e882ea1c2ca785972c3de872f165fe4d7a644d | tscircuit HAT, pin maps written from knowledge |
| `round-pi-board/outputs/lug.circuit.json` | a032c41a8a81e2ae15f7a54cb3cae262ccdff61391d420fdeb7cb7e3ddcedf6c | LUG Circuit JSON, 0 errors |
| `ghost-pcb-auger/outputs/auger/out/auger.circuit.json` | 4cc4f5792d800302e060008834eef651b9c91aa25e557e7644173999c95de6dd | known-bad routed board |
| `cresset-plinth/outputs/board-rp2040-pizero-standin.stl` | bcb1a5f1639589d69ccbb11e7a590253aba1471ff1bd77694aef3e65d9d6e028 | inverted-winding imported mesh |

Recovered from Downloads (copies under `fab-knowledge:evidence/x/downloads/`):

| file | sha256 | role |
|---|---|---|
| `dl-boards-tools/spindle/files (33)/pcb.py` | 97e05388476f74e7f4408249ae82c1555cbcd9c98adb5cba5349ca815b08bfb4 | SPINDLE R1 generator before the drill offset change; module holes at pad centre, no `hole_dx`, no drill breakout gate. Negative fixture for M08-T07 and CHK-BRD-02 |
| `dl-boards-tools/spindle/files (33)/spindle-r1-gerbers.zip` | fa630c889c104813e99d56dd6c79fc3ebe8d9c42ccc66c0f73650b9bb0b4eb6e | the fab set that `pcb.py` wrote; negative fixture |
| `dl-boards-tools/spindle/files (33)/README.md` | 439e99d3929b1b91b9e47aba1e9ce74f367136fcb6d26712391807b0e45f522c | first statement of the 99.91 and 99.28 percent raster figures |
| `dl-gudgeon-tang-keyway/tang/tang_r5_wiring.html` | 1b4f1347b15b6d5f0d09214d7081a4a1f31310964d5ff2a7e4a31395d5cf3331 | TANG R5 wiring drawing and net list; M08-T13 parity candidate |
| `dl-gudgeon-tang-keyway/unzipped/tang_r5_circuit_files/DIMENSIONS.txt` | 889657c1afcb8c883fbe1e34e60fc53b795f8a3626964f9e75b3f8e1cd64e293 | TANG R5 sensor island dimensions and Teensy 4.0 pin assignment |

Seed files already in the repo from M-1-T07: `packages/board/seed/check3d.mjs`
(merged with the SHUNT proof in M-1-T10), `sim-template.html` (face
convention fixed in M-1-T10), `viewer-template.html`, `step2mesh.mjs`, and
`tools/py/board/kicad_fetch.py`, `price.py`, `wrl.py`.

Missing sources (D-180, superseding D-149): the SPINDLE pygerber reparse and kiutils readback
scripts were never harvested (`corpus/benches/spindle/outputs/spindle/` file
list); M08-T07 and M08-T08 rewrite them. The LUG rebuild scripts named in its
README (`build.mjs`, `export-lug.build.mjs`, `make-viewer-lug.mjs`) are not in
`corpus/benches/round-pi-board/outputs/`; M08-T10 writes its own adapter.
Downloads searched 2026-10-04: SPINDLE reparse and kiutils scripts, LUG and
GROMMET rebuild scripts, and ARMATURE scripts are absent. The TANG R5 wiring
diagram was recovered
(`fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r5_wiring.html`);
M08-T13 lists it as a third parity candidate.

## Package placement

| package | tier | may import | owns |
|---|---|---|---|
| catalog | 0 | spec, profile | part rows, pin rows, actuator rows with per-field provenance; read tracking; the provenance gate function; adapters that fill the `.hbf` cache |
| board | 1 | spec, profile, catalog, circuit | the record, both backends, writers (KiCad, Circuit JSON, BOM, CPL, netlist), board checks' kernels, reparse driver |
| wiring | 1 | spec, board, circuit | wiring diagrams from a pin map using real pad geometry |
| tools/py/board | Python via uv (D-140) | shapely, fonttools, gerbonara, pygerber | the direct-emit route, gerber and Excellon writers, the reparse script, `wrl.py`, `kicad_fetch.py` |
| core | app | everything headless | catalog.find, catalog.pins, export.run kinds |

`board` reaches Python only from the Node CLI through `uv run`. A baked bench
never runs Python: it carries the record and the written artifacts from the
build (ARCHITECTURE.md runtime contexts). The tiers job (D-044) fails on any
import edge outside this table.

---

## M08-T01 Pins, install, licences

Goal: every board dependency is installed at an exact pin on Node and Python,
`npm ci` passes with typescript 7.0.2, and each licence is recorded.

Inputs:
- the D-040 pin table in docs/plan/PLAN.md section 16
- docs/plan/LICENSING.md, D-043
- the registry records above (npm and PyPI, 2026-10-04)
- `fab-knowledge:synthesis/verified-claims.md` C9 (kicadts licence field, kiutils dates)

Steps:
1. Resolve the current versions on the day the milestone starts and pin
   them exactly (no `^`, no `~`) in `packages/board/package.json`:
   tscircuit, @tscircuit/core, @tscircuit/props, circuit-json,
   circuit-json-to-gerber, circuit-to-svg, sucrase (the JSX transform the
   tscircuit headless pipeline uses, seed reference
   `knowledge/references/board-forge/tscircuit-pipeline.md` lines 34 to 69),
   kicadts 0.0.58. On 2026-10-04 the registry gives tscircuit 0.0.2744,
   @tscircuit/core 0.0.2087, circuit-json 0.0.516, circuit-json-to-gerber
   0.0.112; take the values of the day and write them into the PLAN.md 16
   table with the date.
2. Run `npm install`. For every ERESOLVE line of the form `peer
   typescript@"^5..." from <pkg>`, add `"<pkg>": {"typescript": "7.0.2"}`
   under the root `overrides`, and repeat until install exits 0. The
   scratch run needed entries for kicadts and format-si-unit with
   circuit-json alone; the tscircuit set adds at least tscircuit,
   @tscircuit/core and circuit-json-to-gerber. Do not set
   `legacy-peer-deps`; the overrides list is the record of every package
   that has not declared support for TypeScript 7.
3. Commit `package-lock.json`; confirm `npm ci` exits 0 on a clean clone.
4. Add to `tools/py/pyproject.toml`: gerbonara, pygerber, shapely, fonttools,
   brotli at the versions of the day (2026-10-04: 1.6.3, 2.4.3, 2.1.2,
   4.66.1, 1.2.0) with `uv lock`.
5. Licence audit rows in `tools/licences.json` (read by LICENSING.md's
   generated table): kicadts MIT by LICENSE file with no package.json
   licence field; @tscircuit/core MIT by its LICENSE file (Copyright (c)
   2024 tscircuit Inc., read 2026-10-04) and circuit-json-to-kicad MIT by
   its LICENSE file (Copyright (c) 2025 tscircuit Inc., read 2026-10-04,
   KiCad-generated test artifacts excepted; check the npm tarball for such
   artifacts and route any under the KiCad library row);
   KiCad library files (footprints, symbols, 3D models) are copied only
   under `packages/catalog/data/kicad/` with KiCad's LICENSE.md beside
   them (CC-BY-SA-4.0, the design waiver does not cover a collection), and
   the LICENSING.md path-map row lands before the first footprint; gerbonara Apache-2.0; pygerber MIT; occt-import-js
   LGPL-2.1, used only by `packages/board/seed/step2mesh.mjs` as a separate
   lazily loaded file, never bundled into an MIT package (D-043);
   easyeda2kicad (PyPI) AGPL-3.0, excluded (D-043); kiutils GPL-3.0,
   excluded (D-090).
6. `hbf doctor` prints the board pins, the overrides list, and the uv
   module versions.
7. Add `tools/pins-exact.mjs` to the CI typecheck job: it fails when
   tscircuit, @tscircuit/core or circuit-json carry a range in any
   package.json (R-07 in RISKS.md).

Files to create:
- packages/board/package.json (private, exact pins)
- package.json (root `overrides`)
- package-lock.json
- tools/py/pyproject.toml, tools/py/uv.lock (board modules added)
- tools/licences.json (board rows)
- tools/pins-exact.mjs
- core/src/commands/doctor.ts (board section)

Acceptance:
- `npm ci` -> exit 0 with typescript 7.0.2 installed (`node -e "console.log(require('typescript/package.json').version)"` prints 7.0.2)
- `node tools/pins-exact.mjs` -> exit 0; editing a pin to `^` makes it exit 1
- `uv run --project tools/py python -c "import gerbonara, pygerber, shapely, fontTools"` -> exit 0
- `npx --no-install hbf doctor --json` -> exit 0; `result.board.pins` lists every package of step 1 with an exact version
- `node tools/lint-voice.mjs tools/licences.json` -> exit 0

Done when: a clean clone installs the board stack with no peer errors and
every board dependency has a licence row.

Card defects found while building (2026-10-09):
- Step 1 cannot hold on the Node 22.18.0 floor. Every circuit-to-svg from
  0.0.437 (published 2026-10-02, vendor) and jscad-electronics 0.0.210
  declare `engines.node` 24.x, and `.npmrc` `engine-strict=true` (D-038,
  D-039) refuses them on install and on `npm ci` (measured, scratch
  workspace). The card's own 2026-10-04 values (tscircuit 0.0.2744 with
  circuit-to-svg 0.0.441) carry the block; the scratch run of the Records
  table installed kicadts and circuit-json only, so it never met it. The
  newest tscircuit whose tree passed was 0.0.2713, and with it
  @tscircuit/core 0.0.2042 failed to import, because its `*` peers
  (@tscircuit/checks among them) resolve to the day's releases, which need
  a newer circuit-json (measured). Landed: kicadts 0.0.58, circuit-json
  0.0.525, @tscircuit/props 0.0.698 and sucrase 3.35.1 installed; tscircuit
  0.0.2806, @tscircuit/core 0.0.2121, circuit-json-to-gerber 0.0.112 and
  circuit-to-svg 0.0.447 recorded under `hbf.pinsBlocked` in
  `packages/board/package.json`, held exact by `tools/pins-exact.mjs`,
  reported `warn` by `hbf doctor`, with licence rows of status `blocked`.
  Owner question, default in force: the four stay uninstalled and M08-T10
  and M08-T11 wait. Options: Node 24.11 for `.nvmrc` and CI (D-039 admits
  it), relaxing engine-strict (D-038), or an older set with every `*`
  peer pinned by hand. PLAN.md section 16 holds the record.
- Step 2's trigger does not fire inside the workspace. npm nests a
  typescript 5.9.3 peer under `packages/board/node_modules` instead of
  raising ERESOLVE (measured), so the overrides follow every package with
  a typescript `^5` peer: kicadts and format-si-unit on the installed set.
  With the full set of the day a scratch workspace needed 19 entries (17
  typescript; zod for @tscircuit/circuit-json-util and
  @tscircuit/modelprinter, which peer zod 3 against the 4.6.5 pin; the
  first uses zod in its types only, the second at run time, so M08-T10
  smoke-renders before trusting it).
- zod: @tscircuit/props 0.0.698 peers zod `*` and was written against zod
  3, so it resolves to the root zod 4.6.5 pin (D-040) and its import throws
  `z.function(...).args is not a function` (measured, node 22.18.0). Its
  types read fine, which is what M08-T11 needs; nothing imports it at run
  time. The same holds in the full set of the day, where @tscircuit/core
  imports props, so the Node question above is not the only block on
  M08-T10: the tscircuit runtime needs zod 3 where props resolves it, and
  the D-040 pin puts zod 4 at the root. Owner question with the engines one.
- npm 10.9.3 ignores a nested override on a peer when it places new
  packages against an existing lockfile (ERESOLVE with the override
  present, measured). The landed lockfile was resolved fresh in a scratch
  copy of the manifests, then every entry the old lockfile held was put
  back at its old version (21 had moved, vite 8.3.2 to 8.3.4 among them),
  and `npm install` confirmed it unchanged. A builder adding the blocked
  four repeats that, or the D-040 pins drift.
- tscircuit 0.0.2806 asks for kicadts `^0.0.53` and circuit-to-svg
  `^0.0.445`, which on a 0.0.x line mean those versions exactly, so the
  tree would hold kicadts 0.0.53 beside the 0.0.58 pin and two
  circuit-to-svg copies (computed, scratch lockfile).
- The full set brings rollup-plugin-dts 6.5.1 (LGPL-3.0-only) and
  occt-import-js 0.0.23 (LGPL-2.1) into the lockfile; both need
  `lazy-separate-file` rows before it lands (licences gate).
- Acceptance 4 reads `result.board.pins`; `hbf doctor --json` printed
  `{ lines }` only. It now prints `{ lines, result: { board } }`, and the
  board section reads its pins from `packages/board/package.json` and the
  Python pins from `tools/py/pyproject.toml`, so neither list is typed twice.
- LICENSING.md section 2 says its table is generated from
  `tools/licences.json` by `tools/counts.mjs`; counts.mjs holds no licence
  code, so the table is hand-kept. The M08 rows were added beside it.

---

## M08-T02 The pad and net record and the package skeletons

Goal: `board`, `catalog` and `wiring` exist as private packages, and both
backends have one typed record to emit.

Inputs:
- spec/board-features.ts (D-061), spec/catalog.ts, spec/ids.ts (KernelId includes board)
- `fab-knowledge:sources/benches/benches-copper-pcb-b.md` section 8 idea 1; benches-copper-pcb-a.md conflicts table
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/scaffold/packages/{board,catalog,wiring}/` (READMEs name stale tiers and targets)

Steps:
1. Create the three packages private, MIT, author Moheeb Zara
   <hackbuildvideo@gmail.com>, exports pointing at dist (D-036). Rewrite the
   scaffold README lines: catalog is tier 0 (scaffold says 2); board may
   import catalog and circuit; wiring's parity target is "unpicked, see
   M08-T13" (scaffold says TANG R5.29).
2. Write `packages/board/src/record.ts` as below. It passed
   `tsc` 7.0.2 with strict, noUncheckedIndexedAccess and
   exactOptionalPropertyTypes in a scratch copy with a stub of the three spec
   names it imports. If spec/ already exports a record type under another
   name, use spec's and delete this file's duplicate.
3. Record rules, enforced by `packages/board/src/record.zod.ts` and a
   test: coordinates in the board frame, mm, origin at the outline bounding
   box minimum, +y up, top view; tscircuit's centred frame and KiCad's
   y-down frame convert at the adapter, never inside a check; every pad
   key `ref.pin` is unique; every net member names an existing pad; nets
   sorted by name and members sorted; `recordHash` is sha256 over RFC 8785
   canonical JSON with every coordinate quantised to 1e-6 mm and the hash
   field removed (D-051 method).
4. The record enters Part IR as a body-less board part: `metrics.board`
   holds counts (nets, pads, holes, vias, tightest clearance), and
   `recordHash` joins BuildInputs through the adapter field
   (`board/direct-1` or `board/tscircuit-<version>`).
5. Add `lineage.json` rows for every file in "Legacy sources and their
   hashes".

The record is `BoardRecord` in `spec/board-features.ts`, with `RecordPad`,
`RecordPart`, `RecordNet`, `RecordVia`, `RecordHole`, `RecordTrack`,
`RecordJumper`, `RecordBridge`, `RecordRead`, `RecordModel`, `BoardBackend`,
`CopperLayer` and `PadShape` beside it (landed M08-T02, 2026-10-09; plan
docs link to spec types and never copy their bodies, MILESTONES.md 1.5).
`packages/board/src/record.ts` re-exports it.

Files to create:
- packages/board/{package.json,README.md,tsconfig.json,src/index.ts,src/record.ts,src/record.zod.ts,src/record-hash.ts,test/record.test.ts}
- packages/catalog/{package.json,README.md,tsconfig.json,src/index.ts}
- packages/wiring/{package.json,README.md,tsconfig.json,src/index.ts}
- tools/tiers.json (rows for the three packages)
- lineage.json (board rows)

Acceptance:
- `npx tsc -b packages/board packages/catalog packages/wiring` -> exit 0
- `npm test -w packages/board -- record` -> exit 0; a record with a duplicate `U1.GPIO20` pad fails with E_SCHEMA at `/pads/<i>`; a net member naming a missing pad fails with E_REF; two records equal after quantisation give one `recordHash`
- `node tools/tiers.mjs` -> exit 0; an import of `catalog` from `profile` makes it exit 1
- `node tools/lint-voice.mjs packages/board packages/catalog packages/wiring` -> exit 0

Done when: a check author can write a CHK-BRD kernel against one type that
both backends fill.

Card defects found while building (2026-10-09):
- Step 2's guard misses: spec/board-features.ts already exported a draft
  `BoardRecord` and `BoardPad` under the same name with a thinner shape
  (backend `direct-emit`, pads as `{ id, at, size }`, nets as strings),
  read only by `Part.board`. The record above replaced them in spec, with
  `readonly` fields, `BoardSide` for `Side`, and `RecordModel` and
  `RecordRead` named; `packages/board/src/record.ts` re-exports it and
  adds `padKey`. The card's code block became the link above.
- Step 3 leaves the order of set arrays open. `recordHash` sorts parts,
  pads, vias, holes, tracks, jumpers, bridges and reads by the canonical
  JSON of each quantised element, so emission order never moves the hash;
  outline and track points keep their order. Lengths round to 1e-6 mm by
  key (x, y, w, h, z, drill, holeDx, pad, width, thickness, outline and
  track points); rot stays exact.
- Step 3 rules the validator adds beyond the card: a member's pad must be
  on that net, a pad on a net must be among its members, the outline must
  be counter-clockwise without a closing point, and vias, tracks, jumpers
  and bridges must name nets and pads that exist.
- Step 4: BuildInputs has no field for recordHash, and the adapter field
  holds a dialect name. `boardAdapter` gives `board/direct-1` and
  `board/tscircuit-<version>`; `boardMetrics` gives nets, pads, holes,
  vias and npth with pads and holes counted as SPINDLE pcb.py lines 225
  and 287 count them (vias inside both). Tightest clearance needs copper
  geometry and moves to M08-T06, as does wiring the record into part.build.
- Files to create lists packages that M-1 already created; T02 rewrote
  their READMEs and filled board. tools/tiers.json already held the three
  rows with the card's edges.

---

## M08-T03 Catalog rows, read tracking and the provenance gate

Goal: every part row carries a tier and per-field provenance, a build
records which catalog fields it read, and a fabrication export with an
inferred field on its geometry or connectivity path stops with
E_PROVENANCE, exit 4.

Inputs:
- spec/catalog.ts (CatalogHit, PartRow, ActuatorRow, PinDef), spec/profile.ts (Provenance per D-099), spec/errors.ts
- docs/plan/PLAN.md 11.2; DECISIONS.md D-102, D-103, D-083 (owner, five tiers in force)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/checks.seed.json` CHK-BRD-06 ("inferred provenance refused at fabrication export", origin board-forge 2026-08)
- `fab-work-directory:benches/round-pi-board/outputs/lug.tsx` lines 9 to 11 ("Pin-number to function maps for U1, U2, U3, U4, U5 and U6 were written from knowledge, not parsed from datasheets. VERIFY BEFORE FAB.")
- `fab-work-directory:benches/cresset-plinth/outputs/board-rp2040-pizero-standin.stl` (84 triangles, watertight, signed volume -6506 mm3, computed in benches-cases.md line 515)
- `tools/py/board/kicad_fetch.py` (KiCad GitHub mirrors frozen at 2020-10)

Steps:
1. Storage (D-103): committed rows live in `packages/catalog/data/` as one
   JSON file per row, verified and vendor tier only, plus community rows
   whose source is a library file committed beside them. External lookups
   (KiCad libraries through `kicad_fetch.py`, distributor pages) write rows
   into `<workspace>/.hbf/cache/catalog/` with provenance `{method:
   "listing" | "datasheet", source, date, tier}`, never into `data/`.
2. Every field that shapes geometry or connectivity carries its own
   provenance: pad table, pin numbering and names, body envelope, mount
   holes, keepouts. A row's tier is its weakest such field.
3. Read tracking mirrors ProfileLookup (M00): `CatalogLookup` records
   `{catalogId, field, provenance}` for every field a build reads; the list
   becomes `BoardRecord.reads` and `Part.metrics.catalogReads` for printed
   parts that read bought-part envelopes.
4. Gate function `provenanceGate(reads, exporter)` in catalog: when
   `exporter.fabrication` is true and any read field is inferred, return
   E_PROVENANCE with one CommandError per field: `path`
   `/catalog/<id>/<field>`, `got` the tier, `expected` "verified, measured,
   vendor or community", `hint` "measure <field> of <id> or pick a vendor
   row; catalog.find <query> --tier vendor", `record` CHK-BRD-06. Fields
   read only by checks (VIL, VIH, pullup, strapping notes) do not trigger
   the gate; their tier is reported inside the check result (D-102
   "inferred usable in sim").
5. Profile rows keep their own rule: inferred resistivity and similar
   process numbers add warnings to exports, they do not refuse them
   (PLAN.md 9, D-082). The gate covers catalog rows only.
6. CHK-BRD-06 runs the same function inside `check.run` and returns a fail
   finding per inferred field (exit 1 there); `export.run` returns the
   E_PROVENANCE error (exit 4).
7. Imported meshes on catalog rows: the loader computes signed volume; a
   negative volume refuses the row with E_SCHEMA at `/mesh` and hint
   "winding inverted, signed volume <v> mm3; reverse triangle order". The
   CRESSET stand-in is the fixture.
8. LUG rows: write `packages/catalog/test/fixtures/lug/` rows for MP2636,
   MAX17048, STM6601, MAX98357A, SN74AHCT1G125 with pin maps from
   `lug.tsx` at tier inferred, method "derived", source "lug.tsx pin maps
   written from knowledge". These rows stay fixtures; they never enter
   `data/`.
9. Row audit for the two direct-route references, written as
   `reference/boards/<id>/parts.audit.json`. SPINDLE R1: `pcb.py`
   hand-codes the pads of J1 to J6, Q1, R2 to R4, C1, C2 and JP1; for each,
   fetch the matching KiCad footprint with `kicad_fetch.py get` and compare
   pads with `kicad_fetch.py pads`; equal within 0.01 mm gives a community
   row citing the footprint file, anything else an inferred row naming the
   difference. SHUNT R1: parts placed from its 10 `parts/*.kicad_mod`
   footprint files are community rows (KiCad v5 library, mirror frozen 2020-10); J1, J2 and
   SW1 are parametric stand-ins "from remembered datasheet dims" (SHUNT
   README open list) and are inferred. The audit result decides the
   CHK-BRD-06 verdict each reference golden records; nothing is promoted
   to make an export pass.
10. Fab-house rows (plan-deltas R61): write
    `packages/profile/data/fab-houses.json` from PROFILE.md 8.2, one row
    per fact with `{house, fact, checked, tier: "vendor", method:
    "listing", source}`. A board chase declaring a pink mask for JLCPCB,
    or for PCBWay without the Advanced PCB service, gets a BuildWarning
    quoting the row and its date; the direct-emit and tscircuit fab notes
    copy every row they read with its date.

Files to create:
- packages/catalog/src/{lookup.ts,gate.ts,load.ts,signed-volume.ts}
- packages/catalog/data/README.md (row format, tiers, how a person adds a row)
- packages/profile/data/fab-houses.json
- packages/catalog/test/{gate.test.ts,load.test.ts}
- packages/catalog/test/fixtures/lug/*.json
- packages/catalog/test/fixtures/rp2040-pizero-standin.stl (copied, sha256 above)
- packages/checks/src/brd/chk-brd-06.ts
- reference/boards/spindle-r1/parts.audit.json, reference/boards/shunt-art/parts.audit.json

Acceptance:
- `npm test -w packages/catalog` -> exit 0
- `npm test -w packages/profile -- fab-houses` -> exit 0: the two rows load with tier vendor and a checked date; a pink-mask JLCPCB fixture build carries one BuildWarning naming the row
- `gate.test.ts`: a read list with one inferred `pads` field and a fabrication exporter returns E_PROVENANCE naming `/catalog/<id>/pads`; the same list with a non-fabrication exporter (png) returns ok; a read list whose only inferred field is `vil` returns ok
- `load.test.ts`: the stand-in STL row is refused with E_SCHEMA and the hint carries `-6506` (computed, plus or minus 1 mm3)
- `npx --no-install hbf check.run reference/boards/lug-hat --only CHK-BRD-06 --json` -> exit 1 with fail findings for U1 to U6 (after M08-T10 lands the reference)

Done when: the catalog can tell an export which parts were written from
memory, field by field.

Card defects found while building (2026-10-09):
- Step 7 and the Files list name `signed-volume.ts`. The mesh kernel already
  holds the one winding test (`importStl`, which refuses the stand-in at
  E_KERNEL, packages/mesh/test/imported.test.ts), and a second signed-volume
  routine would be a second implementation. The loader calls `importStl` and
  turns its refusal into E_SCHEMA at `/mesh` with the card's hint; that
  needs the edge catalog to mesh, added to tools/tiers.json `edges` and
  `sameTier` (both tier 0). Owner question beside D-044: PACKAGES.md and the
  Package placement table above still say catalog imports spec and profile.
- Step 3 puts reads on `Part.metrics.catalogReads`; metrics is `Metric[]`.
  The reads went on `Part.catalogReads` (spec/part-ir.ts), beside
  `Part.board.reads`.
- Step 1 says `data/` holds verified and vendor rows only, while M08-T04
  step 3 and M08-T05 put inferred rows there (BLOCKS seats, SG90). In force:
  inferred rows enter `data/` when a design on record reads them, and the
  gate refuses them; packages/catalog/data/README.md says so.
- Step 4: which field names feed the gate is fixed in one table,
  `packages/catalog/src/fields.ts` (pads, envelope, mountHoles, keepouts,
  mout and every `dims.*` geometry; pins connectivity; vil, vih, pullup,
  strapping, bootActivity and every `dyn.*` checks only). An unknown name
  fails closed at the gate and is refused at load.
- Files list: CHK-BRD-06 lives at `packages/checks/src/defs/brd/CHK-BRD-06.ts`
  (the registry's layout), not `packages/checks/src/brd/chk-brd-06.ts`.
- Step 9, SPINDLE R1 audit result (reference/boards/spindle-r1/parts.audit.json,
  KiCad v5 mirror at 7ebfa6b2, 2020-10-02): J1, J2 and J4 equal
  PinHeader_1x06/1x02 within 0.01 mm (community); J3, J5, J6, Q1, R2, R3, R4,
  C1, C2 and JP1 differ (pad sizes 0.05 to 0.4 mm, C1 pitch 5.08 against the
  library's 2.50, no TerminalBlock_P5.08mm_2pol or CP_Radial_D6.3mm_P5.08mm in
  the library) and stay inferred: SPINDLE R1 gerbers return exit 4 until a
  person fixes those rows. SHUNT: 25 community, J1, J2 and SW1 inferred.
- Step 10: the BuildWarning comes from `fabHouseWarnings` in profile; the
  board build that calls it is M08-T06's (packages/board), not run here.
- Acceptance 5 (`check.run reference/boards/lug-hat`): not run, the
  reference lands with M08-T10.

---

## M08-T04 Per-MCU pin rows and module pad maps

Goal: `catalog.pins` returns every pin of the shop's MCUs and modules with
role, strapping and boot activity, and the threshold rows M05 added are
reused as M05 wrote them.

Inputs:
- the M05 per-MCU rows (RP2040 pullup 50 to 80 kohm, VIL max 0.8 V, VIH min 2.0 V at 3.3 V, RP2040 datasheet pp. 616 to 617, vendor; Pico inherits, inferred; ESP32-C3 pullup 45 kohm typical, VIL max 0.825 V, VIH min 2.475 V, datasheet v2.4 p. 55, vendor) per D-076 and C-02
- `fab-work-directory:benches/spindle/outputs/spindle/parts/supermini.kicad_mod` (16 pads, counted) and `supermini.kicad_sym`, from `mrtnvgr/KiCad_ESP32-C3-SuperMini`
- `fab-work-directory:benches/spindle/outputs/spindle/README.md` (column order, strapping, U0TXD)
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/board-pcb.md` "Boot-safety rules"
- `fab-knowledge:sources/benches/benches-copper-pcb-b.md` section 3 (TRUNNION: "Only IO0, IO1, IO3 and IO10 are unconditionally safe as outputs"; IO4 to IO7 JTAG)
- packages/profile/seed/profile.seed.json `esp32c3.supermini.padCentres` 8.75 (seeded as verified; D-096 sets vendor)
- plan-deltas R70 (BLOCKS BOARDS pad maps c3mini rowX 8.75, pico 8.89, teensy40 7.62 cite no drawing)
- BUCK 2026-10-06 (`fab-knowledge:originals/buck/RECORD.md` sections 2 and 5.8): ESP32-S3 boards SuperMini 22.6 x 18.0, Waveshare S3-Zero 23.5 x 18.0, Seeed XIAO ESP32S3 21.0 x 17.8, Adafruit QT Py ESP32-S3 22.8 x 17.8 (inferred, bench code, no drawing); wiring servo GPIO 7, I2S GPIO 5, 6, 4; strapping pins 0, 3, 45, 46 as the bench text states them (inferred, no datasheet cited)

Steps:
1. Extend, do not copy, the M05 MCU rows: add `pins: PinDef[]` with `n`,
   `name`, `role`, `strapping`, `bootActivity`, and a provenance per pin
   group. ESP32-C3 entries from the evidence: GPIO2, GPIO8, GPIO9 strapping;
   GPIO21 U0TXD, "ROM boot log at every reset"; GPIO20 U0RXD, "not driven at
   boot"; GPIO4 to GPIO7 JTAG. Record the datasheet v2.4 section and page for
   the strapping table when the builder reads it; until then those fields
   are tier inferred, which reaches checks only (M08-T03 step 4).
2. Module rows: `esp32c3-supermini` parses pads and names at load from the
   committed `supermini.kicad_mod` and `supermini.kicad_sym` with an
   assertion of 16 of each (the SPINDLE `gen_board.py` pattern); body
   22.52 x 18 mm, 2 rows of 8 at 2.54 mm, rows 15.24 mm apart, column order
   right `5V GND 3V3 GPIO4 GPIO3 GPIO2 GPIO1 GPIO0`, left `GPIO5 GPIO6 GPIO7
   GPIO8 GPIO9 GPIO10 GPIO20 GPIO21` (USB at top). Tier vendor (D-096); the
   profile constant `esp32c3.supermini.padCentres` moves to this row at
   vendor tier and the profile seed entry is retired with a pointer.
3. BLOCKS seat rows `c3mini` (rowX 8.75), `pico` (8.89), `teensy40` (7.62):
   tier inferred, method "derived", source the BLOCKS bench, until a drawing
   is cited (R70).
4. `catalog.pins <part>` returns `{pins, provenance}` per the spec command
   type; an unknown part is E_REF with up to 3 `didYouMean`.
5. CHK-BRD-04 becomes runnable: for each net touching an MCU pin, it reads
   `strapping` and `bootActivity` and fails when a strapping pin is held to
   the wrong level at reset by a declared part, or when a pin with boot
   activity drives a load-switch gate without a declared pulldown on that
   gate.
6. ESP32-S3 joins the shop's MCU shelf beside RP2040 and ESP32-C3 as
   `packages/catalog/data/mcu/esp32s3.json`, pending a vendor datasheet
   citation: the row enters only with the Espressif ESP32-S3 datasheet
   version, section and page recorded for the strapping table (BUCK names
   GPIO 0, 3, 45 and 46) and for the input thresholds, at tier vendor.
   Until that page is cited the row stays out of the data tree, the
   `"vil"` count in Verify stays 2, and no S3 module row (SuperMini,
   S3-Zero, XIAO, QT Py) is written; the BUCK board sizes stay inferred
   in the design record.

Files to create:
- packages/catalog/data/mcu/{rp2040,esp32c3}.json (pins added to the M05 rows)
- packages/catalog/data/modules/esp32c3-supermini/{row.json,supermini.kicad_mod,supermini.kicad_sym}
- packages/catalog/data/modules/{c3mini,pico,teensy40}.json
- packages/catalog/src/kicad-mod.ts (pad table parser for v5 `module` and v6+ `footprint`; kicadts `parseKicadMod`)
- packages/checks/src/brd/chk-brd-04.ts
- core/src/commands/catalog-pins.ts

Acceptance:
- `npx --no-install hbf catalog.pins esp32c3-supermini --json` -> exit 0; 16 pins; `GPIO21.bootActivity` names U0TXD; tier vendor
- `npx --no-install hbf catalog.pins esp32c3 --json` -> exit 0; VIL and VIH equal the M05 row values (no second copy in the data tree: `grep -rl '"vil"' packages/catalog/data | wc -l` prints 2, one per MCU)
- `npx --no-install hbf catalog.pins supermni --json` -> exit 2 with E_REF and `didYouMean` containing `esp32c3-supermini`
- `npm test -w packages/checks -- chk-brd-04` -> exit 0: the SPINDLE R1 record passes; the same record with the laser gate moved from GPIO20 to GPIO21 fails naming U0TXD; the record with R4 removed fails on GPIO2

Done when: a board check reads strapping and boot behaviour from rows with a
source.

Card defects found while building (2026-10-09):
- Step 1 records the datasheet section and page "when the builder reads it". Read
  2026-10-09 from espressif.com: ESP32-C3 datasheet v2.4 (sha256 833fc000...,
  the version M05 cites) section 3, Table 3-1 p. 30 and Table 3-3 p. 31
  (strapping GPIO2, GPIO8, GPIO9), Table 2-4 p. 20 and section 2.3.3 p. 23
  (GPIO21 U0TXD, GPIO20 U0RXD, GPIO4 to GPIO7 JTAG), Table 3-4 p. 32 (UART0
  ROM printing on by default). The strapping and boot fields are vendor.
- Step 6 is met: ESP32-S3 datasheet v2.2 (sha256 2d5a7cb7...) section 3,
  Table 3-1 p. 32 (strapping GPIO0, GPIO3, GPIO45, GPIO46), Table 5-4 p. 65
  (VIL 0.25 VDD, VIH 0.75 VDD, pullup 45 kohm typical, CIN 2 pF, IIH and IIL
  50 nA). The esp32-s3 row entered mcu-pins.json and data/mcu at vendor; no
  S3 module row was written (the corpus holds outlines only, no pad table).
- Acceptance 2 greps `'"vil"'`; the M05 field is `vilMaxV`, and the
  thresholds stay in `mcu-pins.json` (one file, now four vendor rows), so the
  invariant is "one file holds `vilMaxV`" (packages/catalog/test/pins.test.ts).
  The M05 ids are `esp32-c3` and `pico`; `catalog.pins esp32c3` is E_REF with
  `esp32-c3` first in `didYouMean`.
- Files list: rows are `data/mcu/{rp2040,esp32-c3,esp32-s3}.json` pointing at
  the threshold ids, and `kicad-mod.ts` is a small s-expression reader:
  kicadts 0.0.58 `parseKicadMod` throws on a v5 `module` file ("model
  encountered unsupported child token at", measured on the v5
  R_0805_2012Metric.kicad_mod).
- Step 5, CHK-BRD-04: a gate pulldown guards a pin that floats through reset;
  it does not stop U0TXD, which drives the ROM log. The check fails a pin
  with driving boot activity on any load gate, with or without the pulldown,
  and any pin on a gate without one; the card's sentence read literally
  would pass SPINDLE with the gate moved to GPIO21 (R3 stays). CHK-BRD-04 is
  seeded at level net; board records reach it only when the board build
  emits net targets (M08-T06), so the kernel (packages/checks/src/brd/strap.ts)
  is tested on SPINDLE R1 connectivity ported from pcb.py.
- Step 2 moves `esp32c3.supermini.padCentres` to the row: it is
  `dims.hybridPadCentre` on esp32c3-supermini, and the profile pointer names it.

---

## M08-T05 Actuator rows

Goal: servos and geared steppers share one row type with the output shaft
separate from the anatomical axis and provenance on every field.

Inputs:
- spec/catalog.ts ActuatorRow; DECISIONS.md D-104; plan-deltas R70, R71
- `fab-work-directory:benches/pawl/outputs/pawl.html` line 224 `const ACT`, and `fab-knowledge:sources/benches/benches-robots-a.md` lines 380 to 395
- `fab-work-directory:benches/washer/outputs/laser-rig.html` line 3453 `const SERVOS`, and `fab-knowledge:sources/benches/benches-machines.md` lines 556 to 586
- packages/profile/seed/profile.seed.json `sg90.*`, `28byj48.halfStepsPerRev`

Steps:
1. Row fields: `id`, `kind` (servo, gearedStepper), `mout` (physical shaft
   direction in the part frame), `can` (body envelope), `shaft` (form,
   diameter, flat, length), `ratio`, `stallTorque` N m, `holdingTorque`
   N m, `slew` deg/s, `accel` deg/s2, `reflectedInertia` kg m2, servo
   control fields (`deadband` us, `frameHz`, `lash` deg, `band` deg,
   `pulse` us range), each with its own provenance (D-099). The anatomical
   axis belongs to the design.
2. PAWL 15BY-GM12 fixture rows at three ratios (inferred, source pawl.html
   `ACT`; "no vendor publishes a dimensioned drawing for the worm variant",
   PAWL pack.py note):

   | ratio | stall N m | slew deg/s | reflected inertia |
   |---|---|---|---|
   | 1:150 | 0.186 | 120 | 1.6e-8 x 150^2 |
   | 1:100 | 0.132 | 180 | 1.6e-8 x 100^2 |
   | 1:50 | 0.069 | 360 | 1.6e-8 x 50^2 |

   Envelope (inferred): gearbox 12 x 14 x 13, worm housing D9.5 x 10, can
   D15 x 11, boss D6 x 2, D shaft 3 x 10 with the flat at 2.5 mm. The unit
   of the inertia constant is not stated in the source; record it as
   unknown until read from the code that consumes it.
3. WASHER servo fixture rows (inferred, source laser-rig.html `SERVOS`):

   | preset | slew deg/s | accel deg/s2 | deadband us | frame Hz | lash deg | band deg |
   |---|---|---|---|---|---|---|
   | micro9g (SG90, MG90S) | 240 | 1800 | 8 | 50 | 0.55 | 6.0 |
   | micro9gm (MG90S metal) | 300 | 2600 | 6 | 50 | 0.30 | 5.0 |
   | standard metal gear | 420 | 5000 | 4 | 50 | 0.18 | 3.5 |
   | digital high speed | 700 | 9000 | 2 | 200 | 0.08 | 1.6 |

4. SG90 row: vendor fields from the profile seed (flange span 32.2, body
   22.8 x 12.2 x 22.5, shaft from end 6.1, "published; not a measured
   unit"); the fields the benches disagree on stay inferred with every
   value listed: shaft offset 5.4 (DAVIT), 5.3 (JIB), 5.9 (PINTLE), 5.9
   (WASHER proxy); width 12.4 vs 12.2; tab span 32.4 vs 32.2; hole pitch
   28.0 vs 27.8 mm (R70). The SG90 caliper session is on the D-082 list.
5. 28BYJ-48 row: half steps per revolution 4075.7728, measured (DETENT,
   SLUG; profile seed), moved from the profile constant with a pointer.
6. The profile constants `sg90.*` and `28byj48.halfStepsPerRev` are retired
   to pointers at these rows so one number has one home.

Files to create:
- packages/catalog/data/actuators/{28byj48.json,sg90.json}
- packages/catalog/test/fixtures/actuators/{15by-gm12-r150.json,15by-gm12-r100.json,15by-gm12-r50.json,washer-servos.json}
- packages/catalog/src/actuator.ts
- packages/catalog/test/actuator.test.ts

Acceptance:
- `npm test -w packages/catalog -- actuator` -> exit 0: every field of every fixture row has a provenance; an SG90 read of `shaftOffset` reports tier inferred and the four bench values; `mout` and an anatomical axis cannot be stored on the same field (type test with `@ts-expect-error`)
- `npx --no-install hbf catalog.find sg90 --json` -> exit 0; the hit tier is inferred (weakest geometry field)

Done when: a design that places a servo reads the shaft from a row that says
which bench each number came from.

Card defects found while building (2026-10-09):
- Step 2: the unit of the PAWL inertia constant is stated, kg.m^2, at
  benches/pawl/outputs/pawl.html line 223 (and torque N.m at line 221). The
  bench file is the v1 page (byte-identical to originals/pawl/files/v1/pawl-v1.html);
  the canonical ACT is originals/pawl/files/src/core.mjs lines 10 to 12, same
  numbers. Blockers row "reflected inertia unit" is closed.
- Step 4 lists SG90 flange span, body and shaft from end as vendor fields
  while PROFILE.md 2.4 and D-104 make the conflicted ones inferred; every
  one of them conflicts across benches (12.2 against 12.4, 32.2 against 32.4,
  shaft 5.3 to 6.1), so all are inferred with every bench value listed.
- Step 4's "shaft offset 5.4 (DAVIT), 5.3 (JIB), 5.9 (PINTLE), 5.9 (WASHER)"
  mixes faces: DAVIT measures from the case centre, PINTLE and WASHER from
  the shaft-end face; each conflict entry names its face.
- Step 5 says the 28BYJ-48 steps are measured; PROFILE.md 2.4 gives vendor,
  derived (no coupon), which the row keeps. Step 6 (retire the profile
  constant) is deferred: packages/motion and packages/mechanisms read
  `profile.constant("28byj48.halfStepsPerRev")`, and the mechanisms lane is
  active. The row field `dyn.stepsPerRev` reads the constant through a
  `profile-constant` resolver, so the number keeps one home.
- Scope added by the lead: N20, MG90S, MG996R and GH-S37D rows (inferred
  except N20 seller dimensions, vendor by D-102); displays MPI3501 and MHS40
  (lcdwiki read 2026-10-09: board and active area vendor), Waveshare 5 inch
  round HDMI and 4 inch round DSI (C) (factory STEP as CASK measured it,
  vendor), GC9A01 (retailer figures vendor, ear holes inferred), RP2040-Zero
  (PIP pad centres, inferred, inset 1.38 against GUDGEON 1.27). No TT motor
  or NEMA 17 row: the corpus holds no number for either.
- lcdwiki gives the MHS-4.0 Display-B active area as 83.52 x 55.68; LOCKET
  build.py line 29 and COAMING coaming.html line 1815 carry 84.60 x 56.40.

---

## M08-T06 Direct-emit backend

Goal: the gated Python route builds SPINDLE R1 and SHUNT R1 from their ported
generators, writes a BoardRecord and the fab set, writes nothing when a gate
fails, and writes the same bytes twice under one SOURCE_DATE_EPOCH.

Inputs:
- `fab-work-directory:benches/spindle/outputs/spindle/pcb.py` and `kicad_out.py`
- `fab-work-directory:benches/shunt/outputs/shunt-r1/{gen_board.py,gen_fab.py,textpoly.py,board.json,fonts/,parts/}`
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/knowledge/kernels/board-pcb.md` (ring indexing, largest first, antenna-only pour keepout, both-side rings, `hole_dx` in every consumer)
- `fab-knowledge:sources/benches/benches-copper-pcb-a.md` lines 107 to 200 (SHUNT kernels) and failure table fixes 12 to 16
- core/src/epoch.ts (M00)

Steps:
1. Library `tools/py/board/direct/`: `pad()` with `hole_dx` (every
   consumer uses it: drill, ring, mask, Excellon, KiCad offset), net
   geometry by shapely buffers, pour synthesis (inset outline, minus
   isolated rings, minus bottom tracks, plus rings and tracks, minus the
   antenna keepout only), Gerber region writer (indexed rings, `%LPD%` then
   `%LPC%`, largest area first, integer nanometre coordinates, X2
   attributes `TF.FileFunction`, `TF.GenerationSoftware,hack.build,hbf,<version>`),
   Excellon (`M48`, `METRIC,TZ`, `FMAT,2`, tools sorted, `G90` and `G05`
   inside the header), textpoly (odd containment depth, legacy `kern`, glyph
   mirror inside the ink box), layer pads rule (other-side through-hole
   pads on Cu and Mask), BOM, CPL (two dialects, M08-T12), netlist text.
2. No timestamps from the clock: `%TF.CreationDate` and zip member mtimes
   come from SOURCE_DATE_EPOCH (M00 rule, passed as `--epoch`); zip entries
   sorted, no directory entries, fixed deflate level (the D-052 rules
   applied to the fab zip).
3. Fonts ship in the repo: copy SHUNT's `fonts/` (IBM Plex Mono 400, 600,
   700; Permanent Marker 400; Special Elite 400; fontsource woff2) to
   `tools/py/board/fonts/` with their OFL licence files. No absolute font
   path anywhere (the `/home/claude/fonts/` path in pcb.py is the failure
   this removes).
4. Port SPINDLE R1 to `reference/boards/spindle-r1/gen.py` on the library.
   Keep its numbers: board 46 x 46, corner 2.0, 1.6 FR4, 1 oz; trace 0.35,
   power 0.80, lanes 0.30; clearance 0.25, edge 0.40, pour 0.35, annular
   0.30, mask expansion 0.05, hole to hole 0.30; vias 0.4 drill, 0.8 pad;
   module hybrid pads 6.30 to 11.20 off centre with drill 1.05 offset
   inboard by `hole_dx = side*7.62 - (pad_cx - MCX)`; antenna keepout box
   `MCX +/- 4.6`, `MCY - MOD_L/2 - 0.4` to `+5.6`. Its DRC gates become the
   board checks of M08-T12 and run on the record after emission as well.
5. Port SHUNT R1 to `reference/boards/shunt-art/gen.py` reading its
   committed `board.json`; gates G1 to G6 run before emission and G7 moves to
   the chase `expect` set (M08-T09).
6. Adapter `packages/board/src/backends/direct.ts`: runs `uv run --project
   tools/py <gen.py> --out <dir> --epoch <n>`, reads `record.json` and the
   fab files, validates the record (M08-T02), stores artifacts in
   `.hbf/store`. A non-zero generator exit returns its gate lines as
   findings and writes nothing to the store.
7. Generator gate output keeps the legacy pass line so the goldens can
   compare it: `DRC OK  19 nets | 70 pads | 57 holes | tightest 0.32mm (rule 0.25) | 46x46mm`.
   The legacy failure line opens with three exclamation marks, which the
   language rules ban; the port prints `DRC failed: N violations. Nothing written.` and
   SHUNT's `gates failed: N. Nothing written.` stays as it is.

Files to create:
- tools/py/board/direct/{__init__.py,pad.py,pour.py,gerber.py,excellon.py,textpoly.py,fab.py,record.py}
- tools/py/board/fonts/ (five woff2 plus OFL texts)
- tools/py/board/test/test_direct.py
- reference/boards/spindle-r1/{gen.py,chase.ts,build.ts,README.md}
- reference/boards/shunt-art/{gen.py,board.json,parts/,chase.ts,build.ts,README.md}
- packages/board/src/backends/direct.ts
- packages/board/test/direct.test.ts

Acceptance:
- `npx --no-install hbf part.build reference/boards/spindle-r1 --json` -> exit 0; `result.metrics.board` is `{nets: 19, pads: 70, holes: 57, tightest: 0.32}` (computed, scratch run)
- `SOURCE_DATE_EPOCH=315532800 npx --no-install hbf part.build reference/boards/spindle-r1 --json` twice -> the two fab zips have one sha256
- `uv run --project tools/py pytest tools/py/board/test/test_direct.py` -> exit 0; a copy of spindle-r1 with `CLR = 0.40` exits 1 printing `DRC failed:` and writes no file
- `grep -rn "/home/claude" tools/py reference/boards` -> no output
- `uv run --project tools/py python -W error::SyntaxWarning -c "from gerbonara import ExcellonFile as E; E.open('.hbf/out/spindle-r1/spindle-PTH.drl')"` -> exit 0 (no header warning)

Done when: SPINDLE R1 and SHUNT R1 build from the repo with no path outside
it and no file written by a failing gate.

Card defects found while building (2026-10-09):
- Step 6: packages compile with `types: []` (tsconfig.base.json), so no
  package can spawn a process. `packages/board/src/backends/direct.ts`
  holds the uv argument list, the gate-line failure and the record read
  (withHash, then parseBoardRecord); `core/src/board.ts` spawns uv, reads
  `.hbf/out/<design>/` and builds the body-less board Part. build.ts of a
  board chase returns `{ backend: "direct", generator: "./gen.py" }`
  (packages/board BoardDraft), run in the build sandbox like any build.
- A generator that refuses has no CheckDef to carry its gate lines until
  M08-T12 registers the DRC as checks, so part.build returns them as one
  E_KERNEL error (exit 1, `got` the lines) and stores nothing.
- Acceptance 1: `result.metrics` is the Metric list of M08-T02, ids
  `board.nets`, `board.pads`, `board.holes`, `board.vias`, `board.npth`
  and `board.tightest`; the values are 19, 70, 57, 15, 4 and 0.32 mm
  (computed), equal to the Records table. The DRC pass line is the
  legacy's byte for byte.
- defHash covers chase.ts and build.ts (D-178) plus gen.py, board.json,
  the direct library, its fonts and the shapely, fonttools and brotli pins,
  so an edit to any of them moves buildHash. recordHash stays out of
  BuildInputs (M08-T02 defect) and sits in the parity build.json golden.
  `hbf parity` gained a board branch: build.json (buildHash, inputs,
  recordHash, metrics), report.json and artifacts.json (the fab zip
  sha256); a board chase has no params, so no edit.json.
- Step 3: Permanent Marker and Special Elite are Apache-2.0 by their
  @fontsource 5.3.0 LICENSE files, never OFL; the woff2 files are byte
  equal to those packages' (sha256 measured). The Apache texts sit beside
  them, rows in tools/licences.json, and a lint-voice allow row covers the
  licence's own exclaim on line 183.
- SHUNT board.json carries nets per part (`parts[].nets`, `nets`), never
  per pad, and RecordPad needs a pad net; the SHUNT record writes every
  pad on "" and holds no nets. Its 24 vias carry no net and RecordVia
  requires one, so they stay out of the record (the fab set holds them).
  KiCad repeats a pad number for two pads of one pin (SW_PUSH_6mm 1, 2, 1,
  2) while the record keys pads by unique `ref.pin`, so the k-th repeat is
  written `<n>/<k>`. Owner or M08-T12 question: a part-level net field, or
  pad nets the generator derives from copper.
- pcb.py declares no body envelope except U1 (18 x 22.52 mm, no height).
  The SPINDLE record gives every other part its pad bounding box, height 0,
  with `<ref>.body` read rows at tier inferred, and every part tier
  inferred (hand pads, M08-T03). Catalog ids are provisional:
  `esp32c3-supermini` for U1, `kicad:<footprint>` from kicad_out.py lines
  83 to 98 for the rest. SHUNT parts take `kicad:<fp>` at community for
  their pads, stand-ins inferred, and every body inferred (no height in
  board.json).
- Files to create lists `reference/boards/shunt-art/parts/`; KiCad
  library files may be copied only under `packages/catalog/data/kicad/`
  with KiCad's licence beside them (M08-T01 step 5), and gen.py reads none,
  so none were copied. M08-T09's lead landing needs the ten .wrl models
  there.
- SHUNT headers: the legacy wrote `TF.FilePolarity,positive` and no
  CreationDate; the port writes `Positive` and the epoch's date. It keeps
  `TA.AperFunction,Other,art` on every SHUNT layer, copper included, as
  gen_fab.py line 50 wrote it; the art layer row of M08-T12 decides where
  that attribute belongs.
- The SPINDLE CPL keeps the legacy pad-centroid dialect (pcb.py lines 473
  to 481) until M08-T12; the SHUNT BOM note splits at ". " (shunt record
  failure 17). The UV art and preview SVGs of gen_fab.py are not written.
- The first mutation run found that no test read the drilled position: a
  pad() with `hx = x` passed both suites. test_direct.py now compares every
  PTH and NPTH hit with the shipped `fab/spindle-*.drl` at 1 um.
- reference/test/readme-verified.test.ts lists the references by name; the
  two boards joined its list.

---

## M08-T07 SPINDLE R1 reparse on gerbonara and pygerber

Goal: CHK-BRD-01 reparses every emitted gerber and drill file with two
independent parsers and proves pads, holes, rings and pour against the
record; SPINDLE R1 shows 55 of 55 pads.

Inputs:
- the fab set M08-T06 writes; the legacy fab set in `spindle-r1-gerbers.zip` (sha256 above)
- the scratch scripts' method (Records section): gerbonara Region outlines folded in file order by polarity into shapely; pygerber `GerberFile.from_file(...).parse().render_raster(dpmm=40, ColorScheme.DEFAULT_GRAYSCALE)` against the source drawn on the same grid
- `fab-knowledge:evidence/x/plan-to-refine/handoff/hbf/seed/references/board-forge/tscircuit-pipeline.md` lines 149 to 162 (pygerber cleared regions grey 131 trap)
- SHUNT `check_fab.py` (sha256 above) for the drill, both-side ring, slot, mount and silk assertions
- the R1 `pcb.py` and its `spindle-r1-gerbers.zip` from Downloads (sha256 above) as a negative fixture

Steps:
1. `tools/py/board/reparse.py <fab dir> --record record.json [--legacy <zip>]`
   runs gerbonara over every layer and drill file. It fails on any parse
   warning (`-W error`).
2. Vector compare per layer (F_Cu, B_Cu, F_Mask, B_Mask, F_Paste, silk):
   parsed area, source area, symmetric difference. Gate: symmetric
   difference at most 1e-3 mm2 per layer (the scratch run gave at most
   0.000087 mm2, computed).
3. Record assertions: every record pad inside its side's copper (through
   pads on both sides); every drilled pad has a ring on the bottom copper;
   every record drill has an Excellon hit within 1 um and diameter within
   1 um; every non-GND hole clear of every pour piece over 50 mm2; every
   GND hole on a pour piece; NPTH count equals record holes.
4. Silk: vertex sets in integer nanometres equal the textpoly output with
   zero missing and zero unexpected, and the opposite mirror flag must not
   match 98 percent or more (SHUNT method, so the test can see a mirror);
   back silk ink box inside the board width.
5. Second parser: pygerber raster at 40 px/mm. Gate: zero disagreeing
   pixels outside a 2 px (0.05 mm) band around the source edges. The raw
   agreement percentages are printed as informational metrics (D-075) and
   never gated, because they move with grid alignment (93.04 to 96.91
   percent for F_Cu at 20 px/mm by a 1 px shift, computed).
6. Legacy parity with `--legacy`: the same vector compare between the
   legacy zip and the new fab set. Byte equality is not required: under
   shapely 2.1.2 the regenerated copper differs in bytes from the shipped
   files while the geometry difference is at most 0.000087 mm2 (computed).
7. CHK-BRD-01 in `packages/checks/src/brd/chk-brd-01.ts` runs the reparse script
   through `uv run` on `check.run --artifact <zip>` and after every
   gerbers export; its CheckResult carries `measured` as the worst layer
   symmetric difference, `legal` interval 0 to 0.001 mm2, origin
   `hbf://check/CHK-BRD-01`.
8. Every gerbers export also writes `gerber-front.png` and
   `gerber-back.png` drawn from the parsed objects only (SHUNT
   `render_fab.py` method) and attaches them to the export prompt so a
   person looks at what the fab will image.

Files to create:
- tools/py/board/reparse.py
- tools/py/board/render_parsed.py
- tools/py/board/test/test_reparse.py
- packages/checks/src/brd/chk-brd-01.ts
- reference/boards/spindle-r1/expected/{reparse.json,artifacts.json}

Acceptance:
- `uv run --project tools/py tools/py/board/reparse.py .hbf/out/spindle-r1 --record .hbf/out/spindle-r1/record.json --legacy fab-work-directory:benches/spindle/outputs/spindle/spindle-r1-gerbers.zip` -> exit 0 printing `pads 55 of 55`, `drilled pads with bottom ring 57 of 57`, `drills 57 of 57 within 1 um, worst 0.0000`, `non-GND holes isolated 35 of 35`, `GND holes bonded 22 of 22`, `raster: 0 px outside edge band` on F_Cu and B_Cu (computed, scratch run)
- `uv run --project tools/py pytest tools/py/board/test/test_reparse.py` -> exit 0; fixtures: a fab set whose interior rings are written by an identity test (every hole filled) fails with the non-GND isolation assertion; a set with islands written before the pour fails the pad assertion; a set with a back silk glyph mirrored by pen position fails the ink box assertion; the R1 fab set (`fab-knowledge:evidence/x/downloads/dl-boards-tools/spindle/files (33)/spindle-r1-gerbers.zip`) reparses equal to its own source (`pcb.py` sha256 97e05388...) and still fails CHK-BRD-02 and the pin landing
- `npx --no-install hbf check.run --artifact .hbf/out/spindle-r1/spindle-r1-gerbers.zip --only CHK-BRD-01 --json` -> exit 0

Done when: no gerbers leave the build unread by two parsers.

Card defects found while building (2026-10-09):
- SPINDLE R1 as shipped shorts 5V to GND on B_Cu. The 5V bottom trace from
  (2.40, 20.00) to (43.60, 20.00) (pcb.py lines 184 to 185) runs through
  four GND vias at (9.80, 20.00), (16.00, 20.00), (30.60, 20.00) and
  (36.20, 20.00) (pcb.py lines 197 to 200): their rings and the trace are
  one bottom piece of 34.15 mm2 holding both 5V vias and those four GND
  vias (computed, on the port and on the shipped gerbers, whose layers
  equal the port's to 0.000001 mm2). The legacy DRC never saw it: its GND
  island test unions the uncleared pour, and no rule reads bottom copper
  between nets. The Records row "22 of 22 GND holes on a pour piece" counted
  that piece as pour. The reparse now names the piece and the nets, counts
  a piece over 50 mm2 or any piece landing a pour-net hole as pour, and
  gives non-GND holes isolated 33 of 35 and GND holes bonded 18 of 22, so
  acceptance 1 and 3 exit 1 on SPINDLE R1 and M08-T06 acceptance 1 now
  exits 1 through CHK-BRD-01. Owner question: move the four vias or route
  5V around them; the reference keeps the shipped design and fails.
- Every other line holds and equals the Records table: F_Cu 369.706 mm2
  symmetric difference 0.000041, B_Cu 1883.166 and 0.000087, F_Mask 259.997
  and 0.000026, B_Mask 114.681 and 0.000053, F_Paste 19.120 and 0.000000,
  silk 51.535 and 0.000045; pads 55 of 55; bottom rings 57 of 57; drills
  57 of 57 within 1 um, worst 0.0000; raster 0 px outside the band on F_Cu
  and B_Cu (agreement 98.80 and 99.83 percent, informational, computed).
- The source geometry is not in the record. The direct generators write
  `source/<layer>.wkb` (and SHUNT `source/silk.json`) beside the fab set;
  the reparse reads them, gates.json (pour net, netless vias, slots) and
  record.json from the folder of the zip. A bare zip with a record runs
  the record assertions only.
- The record carries no annular ring, so "a ring on the bottom copper"
  is copper over the drill disc grown by 1 um, the land at the barrel.
- Step 7: the seed declares CHK-BRD-01 legal kind boolean, so the finding
  is boolean; the worst symmetric difference (gated at 1e-3 mm2 in the
  script) rides in the constraint and `extra.worstSymdiffMm2`. The checks
  package compiles without Node, so core runs the script and hands the
  report in through `views.board.reparse` (packages/checks views.ts).
- pygerber 2.4.3's v2 API paints clears as background under
  DEFAULT_GRAYSCALE (0 and 255 only, measured on B_Cu); the grey 131 trap
  of the older API did not appear. The raster threshold is 200.
- The first strict parse failed the port's own Edge_Cuts: the aperture
  was defined before %MOMM%, so gerbonara had no unit for it. The writer
  now defines it after the unit (an M08-T06 fault this card found).
- Step 8: render_parsed.py writes gerber-front.png and gerber-back.png;
  attaching them to the export prompt waits for the gerbers exporter
  (M08-T14). SHUNT's render_fab.py drew copper regions dark whatever their
  polarity; the port honours polarity on every layer.
- The pre-hybrid R1 fixture: Downloads pcb.py (sha256 97e05388...) reruns
  with the repo's Plex Mono 700 woff2 and reparses equal to its own zip;
  its 16 module drills sit at x 14.25 and 31.75 (17.5 mm row) against
  15.38 and 30.62, each more than 0.05 mm off (computed). The CHK-BRD-02
  half of that acceptance belongs to M08-T12.
- Board parity keeps a fourth golden, reparse.json, the report CHK-BRD-01
  ran on; the legacy compare stays a CLI flag since its zip lives outside
  the repo.

---

## M08-T08 KiCad writer and readback on kicadts

Goal: both backends write a KiCad board with kicadts, and CHK-BRD-09 reads
it back to the record: SPINDLE R1 shows 55 of 55 pads.

Inputs:
- kicadts 0.0.58 (`parseKicadPcb`, `KicadPcb`, `Footprint`, `FootprintPad`, `PadDrill.offset`, `Via`, `Zone`, `GrArc`, `GrText`, `getString()`)
- `fab-work-directory:benches/spindle/outputs/spindle/kicad_out.py` and `kicad/spindle-r1.kicad_pcb` (KiCad 7, version 20221018)
- board-pcb.md "KiCad output" (gr_text silk, true gr_arc corners, GND zone, antenna rule area, only real-board content) and the kiutils gotchas (drill offset location, via net as an integer id)
- docs/plan/DECISIONS.md D-090

Steps:
1. Writer `packages/board/src/writers/kicad.ts` builds a `KicadPcb` from
   the record: net table sorted, net 0 empty; footprints per ref at the
   part body centre with pads relative to it and KiCad y down (`ky = H -
   y`); through pads with `(drill d (offset dx 0))` from `holeDx`; SMD pads
   on F.Cu, F.Paste, F.Mask; NPTH mounts as footprints with
   `exclude_from_pos_files exclude_from_bom`; segments per layer; vias;
   Edge.Cuts as lines plus true arcs; silk as editable `gr_text`; zones from
   the record pour; an antenna rule area (tracks, vias, copperpour not
   allowed). Guide stickers, vinyl masks and backers never enter the file.
2. Readback CHK-BRD-09 in `packages/checks/src/brd/chk-brd-09.ts`:
   `parseKicadPcb`, absolute pad positions from footprint position, angle
   and pad offset; compare each record pad by `ref.pin` on position, size
   (orientation-free), net name, drill and drill offset at 1e-3 mm; vias on
   position, drill and net (net ids looked up in the net table); every net's
   member set equal to the record's; each net one connected island across
   layers when tracks and zones are rebuilt.
3. Write round trip: parse, `getString()`, parse; element counts equal and a
   second write equals the first (kicadts is the only parser, so the
   fixed point is the check that the writer and parser agree).
4. Legacy parity: run the readback on the legacy `spindle-r1.kicad_pcb`
   against the SPINDLE record; it must give the same 55 of 55 as the new
   file.
5. KiCad 11 headless IPC through kicad-cli is a revisit item for a later
   milestone (D-090).

Files to create:
- packages/board/src/writers/kicad.ts
- packages/checks/src/brd/chk-brd-09.ts
- packages/board/test/kicad.test.ts
- reference/boards/spindle-r1/expected/kicad.json

Acceptance:
- `npx --no-install hbf export.run reference/boards/spindle-r1 --kind kicad --json` -> exit 0 (kicad is not a fabrication exporter, so no prompt) with one artifact `.kicad_pcb`
- `npx --no-install hbf check.run --artifact .hbf/out/spindle-r1/spindle-r1.kicad_pcb --only CHK-BRD-09 --json` -> exit 0; `measured` 55, `legal` set {55}; vias 15 of 15; 19 nets one island each (computed, scratch run on the legacy file)
- `npm test -w packages/board -- kicad` -> exit 0: the legacy file reads back 55 of 55; the round trip keeps 18 footprints, 59 pads, 59 segments, 15 vias, 20 nets, 2 zones, 4 gr_arc, 8 gr_line, 54 gr_text (counted, scratch run) and the second write equals the first; a copy with one drill offset negated fails naming the pad

Done when: a KiCad file leaves only after kicadts reads it back to the
record.

Card defects found while building (2026-10-09):
- The readback check needs an id CHECKS.md does not hold: CHECKS.md 9.5
  gives CHK-BRD-09 to nodes without a component. It is CHK-BRD-22 (seed
  row entered M08-T08, legal kind set, measured the count of matching
  pads), leaving CHK-BRD-21 to M08-T12's island and bridge check.
- Step 1: the writer ports kicad_out.py's text and kicadts parses it; its
  getString() is the file, so the bytes are kicadts' form and a second
  parse and write is the fixed point of step 3. Building the KicadPcb
  through kicadts constructors node by node would be a second writer with
  no legacy to port from.
- Footprints sit at the part body centre, written at angle 0 with each
  pad's own angle, since record pads are in the board frame; tstamps are
  digests of recordHash and a counter where kicad_out.py used uuid4, so one
  record writes one file. The silk text, its lines, the corner radius, the
  zones and the mask expansion come from the generator's gates.json: the
  record holds none of them (the M08-T12 namespace adds silk, keepouts).
- Step 2's island test rebuilds connectivity from pad, segment and via
  shapes and lets a zone join its net's items inside it and outside every
  keepout, standing for KiCad's fill: the legacy zone carries no filled
  polygon. It finds no short: the 5V and GND join on B_Cu that the M08-T07
  reparse names is outside this check's scope (M08-T12, no copper joining
  two nets), so SPINDLE R1 passes here with 19 nets one island each.
- Acceptance 1 lands ahead of M08-T14: `export.run --kind kicad` builds
  the board, writes `.hbf/out/<design>/<design>.kicad_pcb`, runs
  CHK-BRD-22 on it and deletes it on a fail; it asks no person
  (fabrication false). core/src/exporters/kicad.ts is the file M08-T14
  names; the exporter registry entry waits for that card.
- packages/checks now depends on @hackbuild/board for readbackKicad (the
  one implementation); package-lock.json was refreshed with
  `npm install --package-lock-only`, which also took the workspace
  dependency edits of the other M08 and M06 lanes then on disk.

---

## M08-T09 SHUNT art board: fab parity, lead landings, expect sets

Goal: SHUNT R1 builds through the direct route with its fab set reparsing as
it did, its 55 lead landings at 0.000 mm proven by a registry check, and its
deliberate defects declared and counted.

Inputs:
- reference/boards/shunt-art (M08-T06)
- `fab-work-directory:benches/shunt/outputs/shunt-r1/{check_fab.py,check3d_shunt.mjs,probe.mjs,sim.html,README.md,REVIEW.md}`
- packages/board/seed/check3d.mjs and fixtures from M-1-T10 (allowance `SW2 <= 0.12 mm`, "the SW_PUSH_6mm .wrl models formed leads at x -0.088 / 6.388 while the footprint pads are at 0 / 6.5; a 0.11 mm lead bend")
- `fab-knowledge:sources/benches/benches-copper-pcb-a.md` lines 201 to 225 (gates G1 to G7, the G7 contract)
- DECISIONS.md D-074

Steps:
1. Fab parity: the reparse script (M08-T07) on the SHUNT fab set gives the
   `check_fab.py` numbers in the Records section: 9 gerber layers and 2
   drill files, drill worst 0.0000 mm over 83, F_Cu 101 pads, B_Cu 61 (2
   own, 59 through), F silk 164453 vertices with 0 missing and 0
   unexpected and 2030 shared with the mirrored variant, B silk 40241 with
   978 shared with the unmirrored variant, back silk ink box 8.04 to 145.95
   mm, slot 104 contour points at (77, 104), 4 NPTH at 3.20 mm (computed,
   scratch run).
2. CHK-BRD-08 lead landing in `packages/checks/src/brd/chk-brd-08.ts`:
   models from `tools/py/board/wrl.py` (scale 2.54, geometry before
   material, leads clustered below the board plane) cached as JSON; the
   transform is re-derived in the check (board y = world -Z, model z =
   +footprint y, `rotation.y = +rot`; board point `(px + fx*c + fy*s, py +
   fx*s - fy*c)`); every recovered lead within 0.01 mm of a record through
   pad, or within a declared allowance `{ref: [mm, reason]}` stored in the
   chase; recovered lead count equals the part's through pads; a part with
   no model must be a declared stand-in.
3. Expect sets (D-074) in `reference/boards/shunt-art/chase.ts`: CHK-BRD-12
   expects exactly 5 shorts (P8V/N8V via the gold bar; BOOT to BOOT across
   SW2; Q1 C, B, E on ANALOG; both EC11 phases on ENC; 30 header pins on
   NANO) and CHK-BRD-11 expects exactly 5 floating nets (VIBES, MAGIC,
   `GND?`, PROBE, MATRIX). Each declared short is also a `RecordBridge` with
   its reason, so the island gate and the netlist audit agree by
   construction. Drift in either direction fails.
4. Viewer probe deferred from M-1-T10 step 6: run SHUNT `probe.mjs` checks
   A2 (two different-colour splats at mirror-image x on one y, both faces
   register +1), A3 (L fiducial: front advance +x, back advance -x, up +y)
   and D (readability sign at TOP, ISO, BACK) against
   `packages/board/seed/sim-template.html` under Playwright 1.63.0 with
   swiftshader, on the SHUNT fixture data. A failure is a seed defect
   fixed in this card, never waived.
5. Electrical gates stay off for this reference by declaration: the chase
   `status` chip says "non-functional by design; ships with no cell in BT1
   and DO NOT APPLY POWER on silk" (README).

Files to create:
- packages/checks/src/brd/chk-brd-08.ts
- packages/board/test/probe.spec.ts (Playwright)
- reference/boards/shunt-art/expected/{build.json,report.json,reparse.json,artifacts.json}
- reference/boards/shunt-art/allow.json

Acceptance:
- `npx --no-install hbf check.run reference/boards/shunt-art --only CHK-BRD-08 --json` -> exit 0; `measured` lead landings 55 at 0.000 mm, 4 within the declared allowance, 3 declared stand-ins, 28 parts, 10 real models (computed by check3d_shunt.mjs on the same data, M-1-T10)
- the same command on a copy with one through-hole part rotated by 90 degrees -> exit 1 naming the part and the landing distance
- `npx --no-install hbf check.run reference/boards/shunt-art --only CHK-BRD-11,CHK-BRD-12 --json` -> exit 0 with `expect` satisfied (5 and 5); removing one declared short from the expect set -> exit 1
- `uv run --project tools/py tools/py/board/reparse.py .hbf/out/shunt-art --record .hbf/out/shunt-art/record.json` -> exit 0 with the step 1 numbers
- `npx playwright test packages/board/test/probe.spec.ts` -> exit 0

Done when: the joke board can only drift by changing its declared defects.

Card defects found while building (2026-10-09):
- Step 1 holds: the reparse on the port's SHUNT fab set gives every
  check_fab.py number of the Records table (9 gerber layers and 2 drill
  files, F_Cu 101 pads, B_Cu 61 with 2 own and 59 through, drills 83 of 83
  worst 0.0000 mm, F silk 164453 vertices 0 missing 0 unexpected 2030
  shared, B silk 40241 with 978 shared, back ink box 8.04 to 145.95 mm,
  slot 104 points at (77, 104), 4 NPTH at 3.20 mm; computed).
- Step 2's id is CHK-BRD-19 (CHECKS.md 9.5 gives CHK-BRD-08 to pin
  completeness). Its seed row loses `pending: M08` now its run lands. The
  seed puts it at assembly level, so core hands the board in as a one-part
  Assembly beside its Part.
- The record holds body centres, and the transform needs each footprint's
  origin and rotation: gen.py writes `placements` {ref: x, y, rot, model}
  into gates.json from board.json, and core's board view reads it with the
  reference's models.json and allow.json. The allowance sits in allow.json
  (the card's file list), not in the chase, which has no field for it.
- The .wrl models stay outside the repo (KiCad library files only under
  packages/catalog/data/kicad, M08-T01 step 5); models.json keeps numbers
  only: per model its bounds and its leads in the footprint frame, written
  by tools/py/board/model_leads.py through wrl.py, with each model's
  sha256. Those leads equal the ones SHUNT build_sim.py inlined into
  packages/board/seed/fixtures/shunt-r1-sim.html (computed). The file
  falls under the reference path row (CC-BY-SA-4.0, the KiCad library's
  licence); owner question whether numbers read from the models need a row
  of their own.
- Acceptance 1 holds: 55 at 0.000 mm, 4 within the allowance, 3 stand-ins,
  28 parts, 10 real models (computed). Acceptance 2 holds on a scratch
  copy with U1 at 90 degrees: exit 1, "U1: lead lands 7.620 mm from the
  nearest through pad". The SW2 allowance covers leads at 0.088 and 0.112
  mm from their pads (computed).
- Step 3 not run: the expect sets need the checks that measure deliberate
  shorts and floating nets, which M08-T12 registers (the card's
  provisional CHK-BRD-11 and CHK-BRD-12 are, in CHECKS.md, port-type
  voltage and the feedback divider). The SHUNT record also holds no pad
  nets (M08-T06 defect), so the measured sets come from board.json part
  nets until the record carries them. Acceptance 3 is not run.
- Step 4 not run: probe.mjs drives jsdom with a stubbed renderer, and a
  Playwright 1.63 run with `executablePath` on the system Chrome (HANDOFF
  section 5; the M03 art board smoke ran that way) was not attempted;
  Playwright 1.63 ships no Chromium build for mac12-arm64 (measured at
  M-1-T10). Acceptance 5 is not run.
- Step 5: the status chip belongs to bench.ts (spec/chase.ts keeps layout
  out of the chase, D-174), and no board bench exists before M09; the
  chase and README carry the line.

---

## M08-T10 tscircuit backend

Goal: a tscircuit board renders headless on the pinned version, its Circuit
JSON becomes the same record, and every CHK-BRD check runs on it; a board
with routing errors refuses to emit.

Inputs:
- `fab-work-directory:benches/round-pi-board/outputs/{lug.tsx,lug.circuit.json,lug-netlist.txt,lug-pnp.csv,drc-report.txt,README.md}`
- `fab-work-directory:benches/ghost-pcb-auger/outputs/auger/out/auger.circuit.json` and `outputs/auger/tools/clean-traces.ts`
- `knowledge/references/board-forge/tscircuit-pipeline.md` lines 34 to 116 (sucrase transform, `RootCircuit.renderUntilSettled()`, `placementDrcChecksDisabled` for castellations, known sharp edges)
- `fab-knowledge:sources/benches/benches-copper-pcb-b.md` sections 1 and 2

Steps:
1. Adapter `packages/board/src/backends/tscircuit.ts`: transpile `.tsx`
   with sucrase (transforms typescript and jsx, pragma `createElement`,
   fragment `Fragment`, prepend the import from @tscircuit/core), render
   with `RootCircuit`, `await renderUntilSettled()`, take
   `getCircuitJson()`. Each sharp edge in the reference file is probed on
   the pinned version first and patched only if it still exists; the probe
   result is written to `packages/board/test/tscircuit-edges.json`.
2. Record extraction `packages/board/src/backends/cj-to-record.ts`:
   `pcb_smtpad` and `pcb_plated_hole` to pads through `pcb_port` and
   `source_port` to `ref.pin`; `hole_offset_x` to `holeDx`; nets from
   source traces and named `source_net` with a connectivity map; `pcb_via`,
   `pcb_hole`, `pcb_trace` route points (wire width and layer) to tracks;
   `pcb_board` outline; part body centre from `pcb_component` with the
   AUGER silk-extent fallback when pads misplace the body; coordinates moved
   to the record frame.
3. DRC elements to findings: every element whose type ends in `_error` is a
   fail finding; the four clearance errors become CHK-BRD-13 results with
   `measured = actual_clearance`, `legal = {kind: interval, lo:
   minimum_clearance}` (D-091 field names, verified-claims C9).
4. CHK-BRD-07 routing complete (both backends): zero unrouted connections
   (`pcb_trace_missing_error`, `pcb_port_not_connected_error`, or record
   nets with more than one island), every routed vertex inside the outline,
   every routed width at least the declared width. `clean-traces.ts`
   is offered in `next` as the remedy; the gate stays CHK-BRD-07 ("An unrouted net is
   honest; a trace running through air is not.").
5. Gerbers for this backend through circuit-json-to-gerber
   (`convertSoupToGerberCommands`, `stringifyGerberCommandLayers`,
   `convertSoupToExcellonDrillCommands`), then the same reparse script
   (M08-T07). The 4-layer `getGerberLayerName` throw is probed (step 1).
6. Reference `reference/boards/lug-hat/`: `lug.tsx` copied with its sha256
   and lineage README. Parity covers placement and connectivity:
   37 parts, 141 SMD pads, 67 plated-hole pads, 4 NPTH holes, 15 named nets
   with member sets equal to `lug-netlist.txt` (counted from the shipped
   files). Trace and via counts (131, 70 in the shipped file) are
   informational: the autorouter on the pinned version may differ; zero
   error elements is gated.
7. Known-bad fixture: `auger.circuit.json` through record extraction and
   CHK-BRD-07 and CHK-BRD-13 fails with the counts in the Records section;
   `export.run --kind gerbers` on it returns exit 1 with those findings and
   no prompt.
8. Provenance: LUG's U1 to U6 read the inferred fixture rows (M08-T03
   step 8), so `export.run reference/boards/lug-hat --kind gerbers` returns
   E_PROVENANCE, exit 4, before checks and before the TTY gate.

Files to create:
- packages/board/src/backends/{tscircuit.ts,cj-to-record.ts}
- packages/board/test/{tscircuit.test.ts,tscircuit-edges.json}
- packages/checks/src/brd/{chk-brd-07.ts,chk-brd-13.ts}
- reference/boards/lug-hat/{lug.tsx,chase.ts,build.ts,README.md,legacy/README.md,expected/}
- tools/corpus/board/known-bad/auger.circuit.json (copied, sha256 above)

Acceptance:
- `npx --no-install hbf part.build reference/boards/lug-hat --json` -> exit 0; `result.metrics.board` parts 37, smdPads 141, platedPads 67, holes 4, namedNets 15; zero error elements
- `npm test -w packages/board -- tscircuit` -> exit 0: record named nets equal `lug-netlist.txt` member sets for all 15 nets (VBUS 5, VBAT 12, V5V 23, V3V3 4, GND 51, and the rest as the file lists)
- `npx --no-install hbf check.run --artifact tools/corpus/board/known-bad/auger.circuit.json --only CHK-BRD-07,CHK-BRD-13 --json` -> exit 1; findings include 21 missing traces, 21 unconnected ports, 6 pad-trace clearance with `actual_clearance` and `minimum_clearance` as measured and legal (counted from the file)
- `npx --no-install hbf export.run reference/boards/lug-hat --kind gerbers < /dev/null` -> exit 4 with E_PROVENANCE naming U1 to U6 (not exit 3: the provenance gate runs before the TTY gate)

Done when: a tscircuit board and a Python board go through the same checks
and the same refusal.

---

## M08-T11 Circuit JSON emission and tscircuit enclosure reads

Goal: fab emits printed parts into Circuit JSON that the circuit-json schema
accepts, and reads tscircuit's printed-part and enclosure declarations into
fab features.

Inputs:
- circuit-json 0.0.516 types (Records section); @tscircuit/props 0.0.687 (`AssemblyPrintedPartProps`, `EnclosureFdmBoxProps`, `CutoutApertureProps`, `insertionDirection`)
- DECISIONS.md D-091; verified-claims C9 rows on Circuit JSON and tscircuit
- spec/features.ts (`port`, `pocket`), reference/exports/orca-3mf-roundtrip (M00) as the printed part

Steps:
1. Writer `packages/board/src/writers/circuit-json.ts`: the board record
   to Circuit JSON elements (`pcb_board`, `source_component`,
   `pcb_component`, `pcb_smtpad`, `pcb_plated_hole` with
   `circular_hole_with_rect_pad` and `hole_offset_x` for castellated seats,
   `pcb_via`, `pcb_hole`, `pcb_trace`, `pcb_keepout`, `pcb_cutout`,
   `pcb_soldermask_opening`, `source_component_internal_connection` for
   declared bridges). Solder jumpers have no element in 0.0.516: emit a
   two-pad `source_component` and, when the default is closed, an internal
   connection.
2. Printed parts: each printed part of a fab assembly becomes a
   `source_component` with `ftype: "printedpart"` (`source_printed_part`)
   plus a `cad_component` whose `model_3mf_url` points at the exported 3MF
   artifact (`hbf://artifact/<hash>` inside the workspace, a relative file
   path in an exported bundle).
3. Validation: every emitted element parses with circuit-json's own zod
   schema (`any_circuit_element.parse`); a test asserts it.
4. Reads: `reference/interop/tscircuit-enclosure/enclosure.tsx`, authored
   for this test, holds a small board with a USB-C part carrying
   `insertionDirection`, an `enclosure` FDM box (`boardRef`,
   `wallThickness`, `boardClearance`, `standoffHeight`) and one
   `cutoutaperture`. The reader maps the box to a fab pocket feature sized
   from the board and clearances, and the aperture to a `port` feature on
   the wall the insertion axis hits, with margin and the two dimension
   offsets carried through.
5. The exporter registry id is `circuit-json`, `fabrication: false`.

Files to create:
- packages/board/src/writers/circuit-json.ts
- packages/board/src/readers/tscircuit-enclosure.ts
- packages/board/test/circuit-json.test.ts
- reference/interop/circuit-json-printed/{chase.ts,build.ts,README.md,expected/}
- reference/interop/tscircuit-enclosure/{enclosure.tsx,chase.ts,build.ts,README.md,expected/}

Acceptance:
- `npx --no-install hbf export.run reference/interop/circuit-json-printed --kind circuit-json --json` -> exit 0; the artifact contains one element with `ftype` `printedpart` and a `cad_component` with `model_3mf_url`
- `npm test -w packages/board -- circuit-json` -> exit 0: every element passes `any_circuit_element.parse`; the SPINDLE R1 record round-trips writer to `cj-to-record` with an equal `recordHash`
- `npx --no-install hbf part.build reference/interop/tscircuit-enclosure --json` -> exit 0; Part IR holds one `pocket` and one `port` whose wall matches the insertion direction

Done when: a tscircuit user can see a fab printed body around their board,
and a fab design can take a tscircuit enclosure's openings as features.

---

## M08-T12 Board feature namespace and the remaining CHK-BRD checks

Goal: each of the 14 board features of D-061 has a record field, a writer
path in every format and a check, and the seeded CHK-BRD-02, 03 and 05 run.

Inputs:
- spec/board-features.ts (D-061); DECISIONS.md D-088 (owner, normally open in force)
- `fab-knowledge:sources/benches/benches-copper-pcb-b.md` section 7 gap row and section 3 (SJ1, JP1, SPLICE-C JMP)
- benches-copper-pcb-a.md "CPL dialects" (SHUNT `Designator, Mid X, Mid Y, Rotation, Layer`, body centre; ARMATURE `Designator, Mid X, Mid Y, Layer, Rotation` with `mm` suffix, `fab-work-directory:benches/armature/outputs/ARMATURE-R1_CPL.csv`)
- board-pcb.md "Footprint and chirality" and "Board-level gates that earn their keep"

Steps:
1. Implement the namespace across the record and the writers:

   | feature | record field | gerber | KiCad | Circuit JSON | check | evidence |
   |---|---|---|---|---|---|---|
   | outline | `board.outline` | Edge_Cuts stroke | gr_line and gr_arc on Edge.Cuts | `pcb_board` outline | CHK-BRD-07 vertices inside | SPINDLE, SHUNT, AUGER |
   | routed slot | `slots[]` | Edge_Cuts contour | Edge.Cuts contour | `pcb_cutout` | slot keepout (SHUNT G2b) | SHUNT lanyard 14.0 x 3.5 r 1.75 |
   | NPTH mount | `holes[]` role mount | NPTH drill | np_thru_hole footprint, excluded from pos and BOM | `pcb_hole` | mount keepout | SPINDLE 4 x 2.70, SHUNT 4 x 3.20 |
   | keepout | `keepouts[]` | none | zone keepout | `pcb_keepout` | copper inside keepout | AUGER 4 keepouts |
   | antenna keepout | `keepouts[]` kind antenna | pour subtraction | rule area | `pcb_keepout` | copper inside keepout | SPINDLE ANT_KEEP |
   | silk string | `silk[]` | Silkscreen regions | gr_text | `pcb_silkscreen_text` | silk vs mask, exact-metric clearance 0.4, mirror (CHK-BRD-01 silk) | SHUNT textpoly |
   | art layer | `art[]` | X2 `TA.AperFunction,Other,art` | user layer | silkscreen graphic | back art vs through rings (SHUNT G2c) | SHUNT data matrix |
   | registration mark | `marks[]` | fab layer | user layer | fabrication note | none (copper builds) | SPINDLE v5 REGISTER |
   | castellated seat | `pads[].holeDx` | drill offset, ring at hole | `(drill d (offset dx 0))` | `hole_offset_x` | CHK-BRD-02 | SPINDLE U1 |
   | solder jumper with default | `jumpers[]` | pads, bridged copper when closed | footprint pads | two-pad component plus internal connection when closed | CHK-BRD-10 | TRUNNION SJ1, SPINDLE JP1 |
   | mask opening | `maskOpenings[]` | Mask layer | mask layer polygon | `pcb_soldermask_opening` | none | TACK mask art |
   | thermal slot | `slots[]` kind thermal | Edge_Cuts | Edge.Cuts | `pcb_cutout` | slot keepout | AUGER NTC cutouts 1.4 x 12, 8 x 1.4 |
   | bare lead | `bareLeads[]` | none | none | none | bare-lead clearance in CHK-BRD-13 | SHIM |
   | declared bridge | `bridges[]` | none | none | internal connection | CHK-BRD-12 agrees by construction | SHIM switch, SHUNT gold bar |

2. CHK-BRD-02 drill inside its own pad with margin:
   `pad_poly.buffer(-drill/2 - 0.15).contains(hole)` (SPINDLE), on the
   hole centre `x + holeDx`; and the pin landing: every hole of a catalog
   module within 0.05 mm of its catalog pin position. Fixture: SPINDLE U1
   drilled at pad centre (the Downloads R1 `pcb.py`, sha256 above) keeps
   each hole inside its pad and gives 17.5 mm row spacing instead of 15.24,
   so it fails on the pin landing.
3. CHK-BRD-03 chirality: every back-mounted asymmetric part has its
   footprint mirrored; SOT-23 G, S, D order checked from the catalog row
   (`1=G 2=S 3=D` for both polarities, board-pcb.md); symmetric two-pad
   parts pass by declaration (SHUNT BT1 pads at x +/-14.68, checked).
4. CHK-BRD-05 BOM, CPL and netlist cross-checked by designator: every
   designator in all three or the build fails; values, footprints and side
   agree with the record.
5. CPL writers by dialect: `cpl/body-centre` (SHUNT header, body centre,
   rotation as placed) and `cpl/mm-suffix` (ARMATURE header and units).
   Which assembler wants which dialect is not recorded in the evidence; the
   exporter takes `--dialect` with `body-centre` as default and the README
   says the mapping is unconfirmed. SPINDLE's legacy CPL used pad centroids
   (`pcb.py` CPL block); the new CPL uses body centres, and the expected
   delta for Q1 (three-pad SOT-23) is written into the golden.
6. CHK-BRD-10 jumper default: with every jumper at its declared default, no
   two supply nets meet. SuperMini dual supply: default normally open per
   the D-088 default in force (SPINDLE JP1 and v5 5 LINK open; TRUNNION SJ1
   closed); a closed default joining `5V_MOD` and `5V` while a second
   source feeds `5V` fails with "never feed J5 while the SJ1 bridge is intact
   and USB is plugged in" as the origin text.
7. CHK-BRD-11 pin completeness: every pin of a two-terminal part on a net;
   every net with at least two members unless declared a test point; every
   member ref present among the parts (ARMATURE D11 K floating, origin
   2026-08). CHK-BRD-12 one island per net across layers and no copper
   joining two nets unless declared a bridge; the named connection count
   equals `required` (SPINDLE v5 audit: 21).
8. Register CHK-BRD-07 to CHK-BRD-13 with version 1.0.0, origin records
   (design, date, failure, numbers), legal kind and `drivenBy`, under the
   ids CHECKS.md assigns; the ids in this file are provisional (see Blockers).

Files to create:
- packages/board/src/features/*.ts (one per row of the table)
- packages/board/src/writers/{bom.ts,cpl.ts,netlist.ts}
- packages/checks/src/brd/{chk-brd-02.ts,chk-brd-03.ts,chk-brd-05.ts,chk-brd-10.ts,chk-brd-11.ts,chk-brd-12.ts}
- packages/checks/seed/checks.seed.json (rows for the new ids with origins)
- packages/board/test/{features.test.ts,cpl.test.ts}

Acceptance:
- `npm test -w packages/checks -- brd` -> exit 0 with one passing and one failing fixture per check
- `npx --no-install hbf check.run reference/boards/spindle-r1 --json` -> every CHK-BRD id present; all pass except CHK-BRD-06, whose verdict is the one `expected/report.json` records after the M08-T03 row audit (exit 0 when it passes, exit 1 when a hand pad stays inferred); the record reports tightest clearance 0.32 mm against 0.25 (computed)
- `npm test -w packages/board -- cpl` -> exit 0: `body-centre` writes the header `Designator,Mid X,Mid Y,Rotation,Layer` and SHUNT's 28 rows at body centres; `mm-suffix` writes `Designator,Mid X,Mid Y,Layer,Rotation` with `mm` on every coordinate; a part whose pads are asymmetric (SPINDLE Q1) gets its body centre, and the delta from the legacy pad-centroid CPL is the value in the golden
- coverage: every row of the step 1 table names a reference that exercises it (`npm test -w packages/reference -- coverage-board`)

Done when: no board feature from the corpus lacks a declaration, a writer path
and a check.

Card defects found while building (2026-10-09):
- Step 8's provisional ids collide with CHECKS.md section 9.5: there
  CHK-BRD-07 is routing complete with the outline clause, -08 pin
  completeness, -09 single-node nets, -10 duplicate supplier codes, -11 port
  voltage, -12 regulator divider, -13 GPIO above VDDIO, -19 the SHUNT lead
  landing. Mapped: the card's -11 is CHECKS.md -08 and -09; the card's
  jumper default (-10) entered as CHK-BRD-20 (seed row and CHECKS.md row,
  origin TRUNNION SJ1 2026-08-01); the card's one island per net and
  declared bridges (-12) and bare-lead clearance (-13) have no id yet.
- One island per net cannot be judged on the record: BoardRecord carries
  tracks, vias and pads and no copper zones, so a poured net (the SPINDLE
  B_Cu GND) reads as many islands. It waits for the zones in the record or
  the KiCad readback (M08-T08). CHK-BRD-07's unrouted and routed-width
  clauses wait on the route the backend reports (M08-T06, M08-T10); its
  outline clause runs.
- SPINDLE R1 pcb.py names nets GPIO8 and GPIO9 with one member each (the
  19 nets of the DRC line count them); CHK-BRD-09 fails them unless the
  record declares unused module pins no-connect (net ""). The M08-T06
  record decides which; the test runs both.
- CHK-BRD-02 is seeded at level feature (kind pad) and CHK-BRD-03 at level
  assembly; a board part emits neither target yet, so both stay pending in
  the registry with their kernels (packages/checks/src/brd/board.ts brd02,
  brd03) tested on the SPINDLE R1 pads and on the Downloads R1 (holes at
  pad centre: each misses its catalog pin by 1.13 mm, computed).
- Steps 1, 4 and 5 (the feature files, BOM, CPL and netlist writers in
  packages/board, CHK-BRD-05, the CPL dialects and the coverage test) are
  in the board lane's package and wait on M08-T06 to M08-T09; not built here.

Build notes, 2026-10-09 (second pass, M08 close):
- Island and short check: CHK-BRD-21 (seed row and CHECKS.md section 9
  row, enteredBy M08-T12, origin SPINDLE R1 2026-08-01, the 5V to GND
  short). Connectivity moved out of the KiCad reader into
  packages/board/src/connect.ts, the one kernel CHK-BRD-21 and CHK-BRD-22
  share. It flags the shipped SPINDLE R1: "5V and GND shorted on B.Cu: via
  GND at (36.20, 20.00) touches track 5V B.Cu (2.40, 20.00) to (43.60,
  20.00), gap -0.800 mm" (computed); the correction is DECISIONS.md D-249
  and PLAN.md Appendix A C-21. With the pour in the record the GND net is
  one island.
- Zones for island checks: BoardRecord gains optional `zones`, `keepouts`,
  `slots` and `silk` (spec/board-features.ts, record.zod.ts, the hash's
  set and length keys) and RecordPart `mpn` and `note`. SPINDLE writes its
  B.Cu GND pour, the antenna keepout and the silk strings into the record;
  gates.json no longer carries zones or silk, and the KiCad writer reads
  them from the record (`kicadExtrasOf`). The reparse reads the pour and
  the slots from the record first.
- Pad-level nets for SHUNT: gen.py derives them by one stated rule from
  board.json part nets (a one-net list names every pin; otherwise the k-th
  pin in KiCad number order takes the k-th net; a pin past the list is a
  no-connect). U1 (8 pins, 3 nets) and U2 (16 pins, 3 nets) leave pins 4
  and up unconnected, which board.json neither states nor denies. All 14
  board.json nets are record nets, three with no member (ENC, PROBE, VBUS:
  their parts are pad-less stand-ins), and the five defects are declared
  bridges with their reasons (`through` GOLD, SW2, Q1, SW1, "J3, J4").
- Check ids for the expect sets: shorts on CHK-BRD-21, floating nets on
  CHK-BRD-09. The registry hands a check the chase `expect` entries naming
  it (RegistryRun.expect into CheckCtx.expect) and stamps their exactSet
  finding (D-074). SHUNT run: the shorts set passes, measured ANALOG, BOOT,
  ENC, N8V|P8V, NANO, exactly the five declared (computed). The floating
  set fails: CHK-BRD-09 measures nets with fewer than two members (ENC,
  MAGIC, PROBE, RF_OUT, VBUS) against the declared GND?, MAGIC, MATRIX,
  PROBE, VIBES. SHUNT's "floating" means no source drives the net
  (gen_board.py lines 705 to 709 typed the list by hand), which no
  registered check measures; LED_CHAIN, ANALOG, BOOT and RF_OUT carry no
  source either and are not in the list, so no rule on the record gives
  the hand list. Owner question: a "net with no source" check whose
  measured set the declaration matches, or the declared set rewritten to
  CHK-BRD-09's meaning. The declared set stays the legacy one and the
  expect fails until then.
- Steps 4 and 5: packages/board/src/writers/assembly.ts holds the BOM,
  both CPL dialects and the netlist, and their readers, in one file (the
  card listed three). The generators no longer write BOM, CPL or netlist;
  core writes them from the record (`assemblyFiles`) for check.run and the
  bom and cpl exporters. CHK-BRD-05 (packages/checks/src/brd/assembly.ts)
  holds each file to the record by designator, value, footprint, side and
  body centre. The body-centre CPL on SHUNT equals the shipped
  shunt-CPL.csv line for line (the legacy ends lines CRLF, the port LF);
  the mm-suffix header equals ARMATURE-R1_CPL.csv's. On SPINDLE only Q1
  moves from the legacy pad-centroid CPL, by 0.367 mm in y, to (34.500,
  4.000) (computed, reference/boards/spindle-r1/expected/cpl.json). The
  BOM columns are SPINDLE's Designator, Qty and MPN with SHUNT's value,
  footprint, side and note; SHUNT's BB1 breadboard row is no placed part
  and drops out.
- CHK-BRD-02 and -03 targets: core gives a board Part one pad feature per
  drilled record pad (`pad.<ref>.<pin>`) and runs CHK-BRD-02 on each
  (`brd02Pad`); CHK-BRD-03 runs on the board as an assembly. Without a
  catalog land pattern a back part whose pads map onto themselves under
  the mirror passes by declaration (SHUNT BT1), and an asymmetric one
  skips naming the missing row. core also hands check.run the net targets
  (CHK-BRD-04) and the project target with views.part and views.catalog,
  so CHK-BRD-06 to -09, -20 and -21 run on a board build.
- Step 1, the namespace: packages/board/src/features.ts is the table, one
  row per kind (one file, not fourteen); packages/board/test/features.test.ts
  holds every named field, writer, check and reference to the tree. End
  to end (record field, a writer, a check, a reference): 7 of 14 (computed
  by the test). Gaps, each stated in its row: keepout, registration mark,
  mask opening and thermal slot have no ported board; art layer and bare
  lead have no record field; a declared bridge has no writer of its own (it
  is copper or a part already drawn). Circuit JSON is M08-T11 for every row.
- CHK-BRD-22 seed tests: its origin project now carries its date
  (2026-08-01), and the entered test knows M08-T08 entered it and that
  CHK-BRD-19 and -22 run.
- SPINDLE check.run (acceptance 2) exits 1: CHK-BRD-01 and CHK-BRD-21 on
  the short, CHK-BRD-06 on 28 inferred hand-pad and body reads, CHK-BRD-09
  on GPIO8 and GPIO9 (one member each, as pcb.py names them); every other
  CHK-BRD id passes or skips; tightest 0.32 mm against 0.25 (computed).
  Acceptance 1 (`npm test -w packages/checks -- brd`) passes; acceptance
  4's `packages/reference -- coverage-board` is packages/board's
  features.test.ts.
- Mutations (scratch copy, evidence/m08-close/MUTATIONS-T12-T14.json):
  connect.ts recording no short fails the SPINDLE short test; CHK-BRD-05
  without the BOM designator compare fails the stale-BOM test.

---

## M08-T13 Wiring package

Goal: `wiring` turns a pin map and real pad geometry into a diagram, with a
contract and tests, and its parity target is reported as not run until the
owner picks one.

Inputs:
- MILESTONES.md 1.4 row "wiring parity target (M08)"
- `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/tang/tang_r5_wiring.html` (TANG R5 wiring: Teensy 4.0, sensor island tails SNS to pin 14 (A0) with 47k to 3V3 and 1 nF to GND, P1 to P6 to pins 0 to 5, MAX98357A on I2S, three pots on A2 to A4, SF23-600 film panels A and B; sha256 above)
- `fab-knowledge:evidence/x/downloads/dl-gudgeon-tang-keyway/unzipped/tang_r5_circuit_files/DIMENSIONS.txt` (island pad centres and the same pin assignment in text)
- `fab-knowledge:evidence/x/pip-controller/bench/part2.js` lines 352 to 405 (`wiringSvg()`: board top view at 9 px/mm, used pads pink, unused pads gold, cups at print positions, colour by net GND, 3V3, signal) and `print/pip-wiring.svg` (14776 bytes, sha256 61f61bdfa53cfc12dfc483dbc08796c993026cf12003c98fda1f9807df1bc4ef)
- `fab-knowledge:evidence/x/sparger-w/sparger-w/sparger-w-bench.html` (wiring tab: supply to switch, switch to both red leads through XH sockets)

Steps:
1. Contract: `WiringInput {board: catalogId, used: {pin, function}[],
   ends: {id, x, y, net, label}[], scale}`; output an SVG string and a
   `WiringReport {used, unused, ends, unmatched}`. Pads come from the
   catalog row through `catalog.pins` and the pad table.
2. Renderer in `packages/wiring/src/svg.ts` with the PIP drawing rules as
   defaults; colours are tokens so M09 maps them.
3. Exporter `wiring` (svg, `fabrication: false`).
4. Parity: three candidates; the owner picked TANG R5 (D-253, MILESTONES.md 1.4). TANG R5
   parity is the pin-to-net table and label set: from a Teensy 4.0 catalog
   row, the WiringReport must list the same pin, net and label pairs as the
   TANG R5 net list, and the SVG must carry the same labels. It needs a
   Teensy 4.0 catalog row at vendor tier, which this card writes (PJRC
   pinout card, vendor) when the owner picks TANG R5. PIP needs the
   PIP layout (pads and cups from
   `fab-knowledge:evidence/x/pip-controller/src/layout.js`),
   which arrives with the PIP chase at M10. SPARGER W's wiring tab is a
   bench panel with no generator behind it. Until the pick, the exit
   records "wiring parity: not run (target unpicked)".

Files to create:
- packages/wiring/src/{index.ts,input.ts,svg.ts,report.ts}
- packages/wiring/test/wiring.test.ts
- reference/boards/wiring-supermini/{chase.ts,build.ts,README.md,expected/} (the SPINDLE R1 module and its 14 used pads; covers the `wiring` exporter)

Acceptance:
- `npm test -w packages/wiring` -> exit 0: unused pads drawn, every used pin labelled with its function, an `ends` entry on an unknown net lands in `unmatched`
- `npx --no-install hbf export.run reference/boards/wiring-supermini --kind wiring --json` -> exit 0 with one SVG artifact
- the exit table row for wiring parity reads "not run" with the reason

Done when: a design can export a wiring drawing from catalog geometry, and the
parity question sits in the owner queue with its default.

Card defects found while building (2026-10-09):
- Tiers give wiring spec, board and circuit, not catalog, so the input
  carries the pins catalog.pins returned (`WiringInput.pins`) and the board
  outline and tier (`WiringInput.board`) instead of a bare catalog id; the
  caller resolves them. The tests read a committed `hbf catalog.pins
  esp32c3-supermini --json` answer.
- Steps 3 and the reference `reference/boards/wiring-supermini` need a board
  kind build and the export.run board kinds (M08-T06, M08-T14); not built.
  Acceptance 2 is not run.
- Wiring parity: not run (target unpicked). No Teensy 4.0 catalog row was
  written at vendor tier (the BLOCKS seat row teensy40 is inferred); the corpus pin maps (BLOCKS parts.js, TANG R6 04_design.js) cite
  no PJRC card.

Build notes, 2026-10-09 (second pass, owner picked TANG R5):
- packages/wiring gains `WiringDraft` (what a wiring build.ts returns: the
  catalog id, used pins with functions, wire ends). core/src/exporters/wiring.ts
  holds `isWiringDesign` (a board chase whose only export is wiring),
  `wiringDraft` (build.ts in the sandbox), `wiringInputOf` (board and pins
  through catalog.pins), `runWiringExport` (writes
  `.hbf/out/<dir>/<dir>-wiring.svg`, stores it, one artifact kind wiring,
  image/svg+xml, no gate) and `WIRING_EXPORTER` (fabrication false). The
  export.run dispatch and the exporter registry entry belong to M08-T14.
  `hbf parity` gained a wiring branch: build.json (buildHash over the chase,
  the draft and the resolved WiringInput, the board, its tier, the
  WiringReport) and artifacts.json (the SVG sha256); no params, no checks,
  so no edit.json or report.json.
- reference/boards/wiring-supermini (SPINDLE R1 module, 14 used pads from
  the SPINDLE README pin map, no wire ends) and reference/boards/wiring-tang-r5;
  parity exits 0 at 92f576..99 and fdadd6..da on goldens the builder
  accepted, a person accepts them at M08-T15.
- PJRC fetch, required by step 4 and recorded: teensy40.html,
  teensy40_card10a_rev2.png (sha256 6a9408e9...5104e), dimensions.html and
  dimensions_teensy40.png (sha256 29e54a9d...036a) from pjrc.com on
  2026-10-09 19:35 PDT, kept with FETCH.txt under
  fab-knowledge:evidence/m08-close/pjrc/.
  Row `teensy40-pjrc` at vendor: names and order from the card, board 35.56
  x 17.78, pitch 2.54 and the 1.27 row inset from the drawing (rows 7.62 off
  the centreline, computed). The drawing does not dimension the pin array's
  offset along the board nor the end pad pitch: the outline is drawn
  centred (inferred, drawing only, said in the row note) and the five end
  pads are left out. The BLOCKS `teensy40` seat row stays inferred.
- Wiring parity: run, passes. core/test/wiring-export.test.ts reads
  tang_r5_wiring.html itself: its net list rows and pot labels give 15
  Teensy pin and net pairs (counted), equal to the WiringReport's with the
  3.3V rail beside them; no end unmatched; the original's two Teensy pin
  columns equal the drawing's in names, side and order from the USB end;
  every Teensy-side net label of the original is on the drawing. The film
  (SF23-600) is left out: panel A or B is a person's pick after a meter
  reading.
- The column test found a renderer defect: wiringSvg placed pads by name,
  so Teensy 4.0's two GND pads were both drawn on the right column. Pads
  are placed by index now; an end still lands on the first pin of its
  name, as the report resolves it. The footer counts used entries, so with
  a used GND the drawing shows 17 pink pads against "16 used".
- Mutations (scratch copy, evidence/m08-close/t13-mutations/RESULT.txt):
  the pad label without its function fails 2 tests; the row with pins 14
  and 15 swapped fails the column test; restored, 16 of 16 pass.
- Not run: export.run --kind wiring through the CLI (waits on M08-T14's
  dispatch); a person looking at the drawings at 390 px (rendered at 560 px
  in headless Chrome by the builder only).

---

## M08-T14 Commands and the export path

Goal: catalog.find and catalog.pins return CommandResult, and export.run
runs build, provenance gate, checks, then the TTY gate for every board kind.

Inputs:
- spec/commands.ts (`catalog.find`, `catalog.pins` argument and result types), spec/errors.ts (EXIT_CODES)
- `fab-knowledge:synthesis/api-library-ai-design.md` 5.1, 5.2 row 2 (`catalog_search` covers both commands at M12), 6.2 (E_PROVENANCE: isError, exit 4, HTTP 409)
- core/src/commands/export-run.ts (M00)

Steps:
1. `catalog.find <query> [--process] [--tier] [--fetch kicad]`: searches
   committed rows and the `.hbf` cache offline; `--fetch kicad` runs
   `kicad_fetch.py search` and writes cache rows at community tier with
   method "listing" and the repo path as source (D-103). Results are
   CatalogHit rows with tier and source.
2. `catalog.pins` as M08-T04.
3. Exporter registry entries: `gerbers` (fabrication true; zip with Gerber
   layers and Excellon, reparse PNGs attached), `bom` (true), `cpl` (true),
   `kicad` (false), `circuit-json` (false), `wiring` (false). Fabrication
   status comes from `ExporterDef.fabrication` (api-library-ai-design.md 8.4).
4. export.run order for every fabrication kind: build; provenance gate
   (E_PROVENANCE, exit 4, no prompt, no stdin read); checks (any fail: exit
   1 with findings, no prompt); TTY gate (no TTY: E_GATE_UNAVAILABLE, exit
   3); write; post-write reparse (CHK-BRD-01, CHK-BRD-09 where the kind
   applies). A post-write check failure deletes the written files and
   returns exit 1.
5. Pin the command count in `core/test/surface.test.ts` to the cumulative
   MILESTONES.md 1.3 total at M08 exit.

Files to create:
- core/src/commands/{catalog-find.ts,catalog-pins.ts}
- core/src/exporters/{gerbers.ts,bom.ts,cpl.ts,kicad.ts,circuit-json.ts,wiring.ts}
- core/test/{catalog-commands.test.ts,export-board.test.ts,surface.test.ts}

Acceptance:
- `npx --no-install hbf catalog.find supermini --json` -> exit 0 with `esp32c3-supermini` at tier vendor first
- `npx --no-install hbf export.run reference/boards/lug-hat --kind gerbers < /dev/null` -> exit 4, E_PROVENANCE; stdout never contains the approval prompt text
- `npx --no-install hbf export.run reference/boards/spindle-r1 --kind gerbers < /dev/null` -> exit 3, E_GATE_UNAVAILABLE naming the CLI line, or exit 4 if any SPINDLE row is inferred (see Blockers); the result says which
- `export-board.test.ts` drives the TTY path with `script -qec "<cmd>" /dev/null`: yes writes the zip and the reparse PNGs; no writes nothing; a fab set that fails the post-write reparse is removed
- `npm test -w core -- surface` -> exit 0

Done when: no board file reaches a fab without its parts' provenance, its
checks and a person's yes, in that order.

Build notes, 2026-10-09:
- Step 1: `catalog.find --fetch kicad` (spec input `fetch`, CLI `--fetch`)
  lists the KiCad footprint mirror through `kicad_fetch.py list
  kicad-footprints <query>` and fetches each match with `get`, writing a
  cache row beside the file under `.hbf/cache/catalog/modules/<id>/`:
  tier community, method listing, the repo path and commit as source; the
  pads come from the file through the catalog's own KiCad resolver.
  Defect: the card names `search`, which clones eight repositories, vendor
  libraries among them; `--fetch kicad` names the KiCad libraries, so it
  lists that mirror alone. One recorded run (FETCH-KICAD.txt under
  evidence/m08-close): exit 0, three community rows for
  PinHeader_1x02_P2.54mm_Vertical; whether it touched the network is
  unknown, the blobless clone already held the blobs. The test reads the
  recorded listing and the local clone, so it needs no network.
- Step 3: core/src/exporters/{gerbers,bom,cpl,kicad,circuit-json}.ts and
  board-exporters.ts register the board kinds; wiring.ts registers wiring.
  circuit-json is registered with fabrication false and no writer, and
  export.run names M08-T11. export.run reads EXPORT_KINDS from the
  registries and switches on no kind.
- Step 4: core/src/exporters/board-export.ts runs the order. SPINDLE R1
  gerbers < /dev/null exits 4 with one E_PROVENANCE error per inferred
  read (28, record CHK-BRD-06) and no prompt (acceptance 3: exit 4, since
  every SPINDLE row is inferred). Gerbers renders gerber-front.png and
  gerber-back.png from the parsed layers into `.hbf/out/<design>/render/`
  before the prompt, names them in it, and writes them beside the zip.
  `--out` names a folder for board kinds; the default is `<design>/out/`
  for fabrication kinds and `.hbf/out/<design>/` for kicad, beside
  record.json. Post-write: CHK-BRD-01 on the written zip, CHK-BRD-05 on a
  BOM or CPL, CHK-BRD-22 on a KiCad file.
- core/test/export-board.test.ts drives the TTY path with `script` (BSD
  form on this host) on a test fixture, core/test/fixtures/boards/pair,
  whose reads are community and which passes every board check: no TTY
  gives E_GATE_UNAVAILABLE naming the line, y writes the zip and both PNGs,
  n writes nothing; a reparse that fails after the write (an injected
  reparse view) removes the files. No reference reaches the gate: SPINDLE
  and SHUNT read inferred rows.
- Acceptance 1 (`catalog.find supermini`) passes; acceptance 2 (lug-hat)
  is not run, the reference lands with M08-T10 (D-250). Step 5: the
  surface test already reads the cumulative MILESTONES.md 1.3 rows through
  M08 and passes; M08 adds no command beyond catalog.find and catalog.pins.
- M08-T13 acceptance 2 now runs: `export.run reference/boards/wiring-supermini
  --kind wiring` exits 0 with one SVG artifact, no gate.
- Mutations (scratch copy, evidence/m08-close/MUTATIONS-T12-T14.json): a
  gate fed no reads lets SPINDLE past the provenance stop and fails the
  exit 4 test; dropping the post-write delete fails the removal test.

Build notes, 2026-10-10 (finish pass):
- The stall was the command contract: with `--dialect` and the board kinds
  in it, the export.run description ran to 135 words against the 120 of
  AGENT-SURFACE.md 5.4 and core/test/contract.test.ts failed. The first
  sentence is shorter now (export.run names the board kinds and the
  provenance gate, and leaves the CHK-SHT ids to the sheet card). export.run
  gains two board examples (spindle-r1 gerbers, stopping at E_PROVENANCE;
  shunt-art cpl in mm-suffix as a dry run) and catalog.find one `--fetch
  kicad` example; the stale "lands with M08-T14" comment is gone. Spec
  (`fetch`, `dialect`), the zod inputs and the CLI flag rows were already in
  place; no half-written export was left.
- Defect: the CLI flag is `--dry-run`; `--dryRun` returns E_SCHEMA with
  `--dry-run` as its first suggestion. `--dialect` on a kind other than cpl
  returns E_SCHEMA naming the kind (run on spindle-r1 gerbers, exit 2).
- Open for M12, resolved: catalog_search carries READ annotations
  (openWorldHint false), while `--fetch kicad` reaches the network and
  writes .hbf cache rows. spec CLI_ONLY_FIELDS settles it: `fetch` is CLI
  only, the MCP projection drops it and answers it as an unknown key with
  E_SCHEMA, catalog_search stays READ, and catalog.find registers writes
  "network".
- The board references broke two shared harnesses that list every
  reference: tools/determinism/hashes.mjs called buildPart on a board chase
  (E_KERNEL "part.build builds one PartDraft") and the cold-rebuild test
  asked every reference for mesh hashes and a report.json, which a board
  and a wiring board do not have. hashes.mjs gains `boardReferences()`
  (core isBoardDesign over every reference) and builds a board through
  `runParity`, giving its `build:` id; tools/cold-rebuild.mjs rebuilds a
  board with `hbf parity` and prints `<ref> <pass> parity ok` or the goldens
  that differ (`parityLine`, `boardExpectedOf`). The four board references
  give parity ok through that path (computed, 2026-10-10). The cold and warm
  passes themselves were not run (the warm pass removes the shared .hbf
  store while another lane works in it).
- Mutations (scratch copy, evidence/m08-finish/MUTATIONS.txt):
  boardReferences adding nothing, parityLine trusting `ok` alone, and
  boardExpectedOf dropping the artifact hashes each fail
  tools/test/cold-rebuild.test.mjs; restored, the board lines pass.
- Defect, not fixed: reference/boards/spindle-r1/gen.py writes every
  `<ref>.pads` read at tier inferred, while parts.audit.json (M08-T03 step
  9) finds J1, J2 and J4 equal to the KiCad library within 0.01 mm
  (community). The generator's hashed inputs exclude the audit
  (core/src/board.ts `generatorInputs`), so reading it from gen.py would
  move the build without moving its hash. The verdict holds either way:
  every body read is inferred (no height declared), so spindle-r1 gerbers
  stop at exit 4; the error count would fall from 28 to 25 (computed). The
  fix (audit file among the generator inputs, or the tier moved into the
  catalog rows) and the re-accept of the SPINDLE goldens wait for the M08
  golden acceptance. The E_PROVENANCE hint on U1.pads ("pick a vendor row;
  catalog.find esp32c3-supermini --tier vendor") names a row that is
  already vendor: pcb.py's U1 pads were never compared with it.

---

## M08-T15 Close the milestone

Goal: pins re-dated, goldens accepted by a person, counts regenerated, and
the hand-off written.

Inputs:
- MILESTONES.md Part 3 rules 8 to 16
- every card above

Steps:
1. Re-date the D-040 pins in PLAN.md 16 and PACKAGES.md: tscircuit,
   circuit-json and the tscircuit family at their exact M08 versions, kicadts,
   gerbonara, pygerber, shapely, fonttools; list the `overrides` entries
   beside them.
2. `npx --no-install hbf parity reference/boards/<id>` for spindle-r1, shunt-art,
   lug-hat, wiring-supermini and both interop references; goldens written
   with `--accept` by a person, never by CI (D-152).
3. Visual review (D-154): before and after renders of the board viewer for
   spindle-r1 and shunt-art, plus the parsed gerber PNGs, at desktop and 390
   px; the PR checkbox "I looked at the renders".
4. `node tools/counts.mjs && git status --porcelain` clean: checks count
   rises by the CHK-BRD rows added; catalog row counts by tier generated
   into PACKAGES.md.
5. README verified blocks (D-008) for every reference: verified on this
   machine with date, measured on a printed body (none for boards), checked
   by machine on geometry, not verified by anything (vendor viewer load,
   CPL rotations against an assembler library, pad tables against vendor
   land patterns: SHUNT's own open list).
6. Stage the work and report; commits happen when the owner asks (D-006).

Files to create:
- docs/plan/PLAN.md section 16 (pins re-dated), PACKAGES.md board rows
- reference/boards/*/README.md verified blocks
- counts.json (regenerated)

Acceptance:
- `npm ci && npx tsc -b && npm test` -> exit 0
- `node tools/lint-voice.mjs` -> exit 0; `node tools/tiers.mjs` -> exit 0; `node tools/pins-exact.mjs` -> exit 0
- CI jobs house-rules, typecheck, derived, tiers, seed, unit, contract, parity, determinism green on the PR

Done when: the owner can read one PR and see which boards may be fabbed and
why the others may not.

Close notes, 2026-10-09:
- Step 1: PLAN.md section 16 and the PACKAGES.md board row re-date the
  installed board pins without a new registry read; the tscircuit family
  stays recorded and uninstalled under D-250 (owner, default Node 24.11 as
  the dev floor).
- Step 2: parity exits 0 on spindle-r1, shunt-art, wiring-supermini and
  wiring-tang-r5 against goldens the builders accepted; acceptance by a
  person (D-152) is not run. lug-hat and the two interop references are
  not run: they are M08-T10 and M08-T11, which wait on D-250.
- Step 3: not run. The board viewer renders and the 390 px look are a
  person's (D-154); the parsed-gerber PNGs exist for the pair fixture
  only, since no reference passes the provenance gate.
- Step 4: counts.json and the check pages regenerated with CHK-BRD-21.
  Catalog row counts by tier are not generated into PACKAGES.md: the tier
  rule lives in packages/catalog/src/fields.ts, and counts.mjs would hold
  a second copy of it; left to the integration pass.
- Step 5: the spindle-r1 and shunt-art README verified blocks carry the
  M08-T12 to T14 runs; vendor viewer load, CPL rotations against an
  assembler library and pad tables against vendor land patterns stay not
  verified.
- Owner entries: D-249 (the SPINDLE R1 short, correction, owner decides
  the fix) and D-250 (Node 24). The SHUNT floating-nets expect set is
  D-254 (owner, entered 2026-10-11 by the third audit); CHK-BRD-09's GPIO8
  and GPIO9 on SPINDLE stay a card question above.

Close notes, 2026-10-10 (finish pass):
- The board READMEs' verified blocks used `### Checked by machine` and
  `### Not verified`, which the DOCS.md 9.3 prefix rule does not map; they
  read `### Checked by machine on geometry` and `### Not verified by
  anything` now. The same two headings remain in twelve READMEs of other
  lanes (buttons, sensors, sticks, conductors, sheet), so
  tools/test/plan-drift.test.mjs still fails on them.
- CHECKS.md section 5: the entered column was typed by hand and summed to
  71 against a total row of 79; it reads SHT 4, NET 32, BRD 16 and total 83
  now, the section 9 rows counted by tools/counts.mjs's own rule (computed,
  2026-10-10). The column stays hand-typed; counts.mjs writing it is the
  integration pass's.
- HANDOFF.md row M08 reads `in progress`: T10 and T11 (D-250) and the
  person's golden acceptance and render look are not run, and "closed" is
  no status value tools/test/notes-status.test.mjs accepts.
- Two core tests that build every reference also called buildPart on the
  board chases and failed with E_KERNEL. core/test/message-numbers.test.ts
  now reports a board as not run (its numbers come from the record, which
  the trace does not read). core/test/metric-record.test.ts builds a board
  through buildBoard (its metrics, every one `informational`) and records a
  wiring board with no metric. The committed record
  (packages/checks/test/metric-gates/builds.json) is not re-accepted: it
  also lacks the M06 lane's buttons, conductors, sensors and sticks, and
  that run stops on reference/sticks/tilt-stick-4 (E_REF, candidate
  archetype), so the accept belongs to the integration pass. Until then
  metric-record and metric-gates fail.
- Test runs, 2026-10-10: npx tsc -b exit 0; npx tsc -p tsconfig.tests.json
  fails only on packages/checks/test/prt04-bands.test.ts (another lane's
  new file); packages/board 48 of 48, packages/catalog 73 of 73,
  packages/wiring 8 of 8; packages/checks 514 of 516 (metric-gates above,
  origin.test.ts on the CHK-PRT-03 page version, another lane); core board,
  catalog, wiring, surface and contract tests 88 of 88; tools/py/board 21
  passed; lint-voice 0 block. The full core run fails 49 tests, none in the
  board files after this pass: flex-pair and orca parity, artifact rebuild,
  build-inputs coverage, project-graph and the message-number cases of
  non-board references, all outside M08's files and not diagnosed here.

---

## Exit

| exit number | qualifier | card | command |
|---|---|---|---|
| SPINDLE R1 reparse: 55 of 55 pads on F_Cu; 57 of 57 bottom rings; 57 of 57 drills within 1 um, worst 0.0000 mm; 35 of 35 non-GND holes isolated; 22 of 22 GND holes bonded. Run: every line holds except isolation 33 of 35 and bonded 18 of 22, the 5V to GND short (D-249, C-21); exit 1. R1 stays the expect-fail fixture and spindle-r2 drops the four GND vias: isolated 35 of 35, bonded 18 of 18, drills 53 of 53 (D-276) | computed | T07 | `uv run --project tools/py tools/py/board/reparse.py .hbf/out/spindle-r1 --record .hbf/out/spindle-r1/record.json --legacy <zip>` |
| SPINDLE R1 vector compare: every layer symmetric difference at most 1e-3 mm2 (scratch: at most 0.000087) | computed | T07 | same |
| SPINDLE R1 raster: 0 px outside the 0.05 mm edge band on F_Cu and B_Cu | computed | T07 | same |
| SPINDLE R1 DRC: 19 nets, 70 pads, 57 holes, tightest 0.32 mm against 0.25. Run (D-276): part.build exits 1 on exactly CHK-BRD-01, CHK-BRD-06 and CHK-BRD-09; CHK-BRD-21 passes on its expect set 5V\|GND | computed | T06, T12 | `npx --no-install hbf part.build reference/boards/spindle-r1 --json` |
| SPINDLE R2 (D-276): CHK-BRD-01 and CHK-BRD-21 pass, 19 nets one island each; DRC 19 nets, 66 pads, 53 holes, tightest 0.32 mm; part.build exits 1 on CHK-BRD-06 and CHK-BRD-09 only | computed | T07, T12 | `npx --no-install hbf check.run reference/boards/spindle-r2 --only CHK-BRD-01,CHK-BRD-21 --json` |
| kicadts readback: 55 of 55 pads, 15 of 15 vias, 19 nets one island each, on the new and the legacy file (the legacy file needs record.json beside it) | computed | T08 | `npx --no-install hbf check.run --artifact <kicad_pcb> --only CHK-BRD-22 --json` (was CHK-BRD-09, which skips on an artifact; the readback id is CHK-BRD-22, integration 2026-10-11) |
| SHUNT lead landings: 55 at 0.000 mm, 4 within the declared allowance, 3 declared stand-ins | computed | T09 | `npx --no-install hbf check.run reference/boards/shunt-art --only CHK-BRD-19 --json` (was CHK-BRD-08, pin completeness; the landing id is CHK-BRD-19, integration 2026-10-11) |
| SHUNT expect sets: 5 shorts, 5 floating nets, exact. Run: both exact; CHK-BRD-09 declares its measured ENC, MAGIC, PROBE, RF_OUT, VBUS in place of the legacy GND?, MAGIC, MATRIX, PROBE, VIBES (D-277) | computed | T09, T12 | `npx --no-install hbf check.run reference/boards/shunt-art --only CHK-BRD-09,CHK-BRD-21 --json` |
| SHUNT fab parity: drill worst 0.0000 mm over 83; silk 0 missing, 0 unexpected on both faces | computed | T09 | reparse script on shunt-art |
| inferred part on export.run returns E_PROVENANCE, exit 4, before the TTY gate. Run on spindle-r1 gerbers: exit 4, 28 errors, no prompt; lug-hat not run (T10, D-250) | computed | T03, T10, T14 | `npx --no-install hbf export.run reference/boards/spindle-r1 --kind gerbers < /dev/null` |
| LUG on the tscircuit backend: 37 parts, 141 SMD pads, 67 plated pads, 15 named nets equal to lug-netlist.txt, 0 error elements | counted from shipped files; rebuilt result recorded; not run at the M08 close: T10 and T11 wait on D-250 (Node 24) | T10 | `npx --no-install hbf part.build reference/boards/lug-hat --json` |
| AUGER refused: CHK-BRD-07 and CHK-BRD-13 fail with the counted errors | counted from the file; not run at the M08 close: T10 and T11 wait on D-250 (Node 24) | T10 | `npx --no-install hbf check.run --artifact tools/corpus/board/known-bad/auger.circuit.json --json` |
| Circuit JSON emitted per D-091; every element passes circuit-json's schema | computed; not run at the M08 close: T10 and T11 wait on D-250 (Node 24) | T11 | `npm test -w packages/board -- circuit-json` |
| tscircuit, @tscircuit/core and circuit-json pinned exactly; `npm ci` clean with typescript 7.0.2 | computed; not run at the M08 close: T10 and T11 wait on D-250 (Node 24) | T01 | `node tools/pins-exact.mjs`, `npm ci` |
| per-MCU pin rows and SuperMini pads at vendor tier served by catalog.pins | computed | T04 | `npx --no-install hbf catalog.pins esp32c3-supermini --json` |
| actuator rows with per-field provenance; SG90 conflicted fields inferred | computed | T05 | `npm test -w packages/catalog -- actuator` |
| board feature namespace: 14 features each with field, writer path and check. Run: 7 of 14 end to end, the 7 gaps stated per row | computed | T12 | `npm test -w packages/board -- features` |
| wiring parity: TANG R5 pin, net and label pairs equal the original's net list (15 pairs) | run, passes (owner picked TANG R5) | T13 | `npx vitest run core/test/wiring-export.test.ts` |

## Blockers and owner questions

| item | state | default in force |
|---|---|---|
| wiring parity target | closed 2026-10-09: the owner picked TANG R5; teensy40-pjrc row at vendor from the PJRC card (M08-T13 notes) | none |
| SPINDLE R1 part rows | pcb.py hand-codes pads for Q1, JP1, R2 to R4, C1, C2, J1 to J6; each must equal a library footprint within 0.01 mm to reach community tier | T03: a hand pad that matches no library footprint stays inferred and SPINDLE R1 gerbers return exit 4 until a person fixes the row; the golden records which |
| SG90 and other inferred bought-part envelopes | the gate refuses fabrication exports that read inferred geometry fields; DAVIT, JIB, PINTLE and WASHER read SG90 fields | no bypass flag exists (D-109); the caliper session on the D-082 list unblocks them |
| new CHK-BRD ids | closed at exit: the card's -08 is CHK-BRD-19, -09 is CHK-BRD-22, -10 is CHK-BRD-20, -11 is CHK-BRD-08 and -09, -12 is CHK-BRD-21; CHK-BRD-07 keeps its id; bare-lead clearance (-13) has no id | none |
| check-only fields and the gate | this file applies E_PROVENANCE to geometry and connectivity fields only and reports thresholds and strapping tiers inside checks; D-102 does not spell out the split | in force as written; listed for DECISIONS.md "Gaps found while writing" |
| exporter id `circuit-json` | api-library-ai-design.md 8.4 lists exporter ids without one for Circuit JSON | `circuit-json`, fabrication false |
| `kicad` fabrication flag | KiCad files are design files a person may send to a fab | fabrication false; CHK-BRD-06 findings still appear in its report |
| CPL dialect per assembler | evidence has two dialects and no assembler mapping | `body-centre` default; mapping marked unconfirmed in the README |
| reflected inertia unit in PAWL `ACT` | closed 2026-10-09: kg.m^2, stated at benches/pawl/outputs/pawl.html line 223 | none |
| ESP32-C3 strapping table page | closed 2026-10-09: datasheet v2.4 section 3, Table 3-1 p. 30, Table 3-3 p. 31 | strapping and boot fields vendor |
| ESP32-S3 shelf row | closed 2026-10-09: datasheet v2.2 Table 3-1 p. 32 and Table 5-4 p. 65 read; the MCU row entered at vendor | S3 module rows (SuperMini, S3-Zero, XIAO, QT Py) wait for a pad table; their outlines stay inferred in the BUCK record |
| easyeda2kicad | AGPL-3.0 on PyPI | excluded (D-043); LCSC lookups go through distributor pages or KiCad libraries |
| SuperMini dual-supply jumper | D-088 owner | normally open |
| SPINDLE R1 5V to GND short on B.Cu | D-249, answered by D-276 | R1 keeps the shipped design with a CHK-BRD-21 expect set; spindle-r2 drops the four GND vias |
| Node 24 for the tscircuit family | D-250 owner | Node 24.11 as the dev floor; until answered nothing installs and T10 and T11 do not run |
| SHUNT floating nets expect set | D-254, answered by D-277 | the expect set is CHK-BRD-09's measured set; the legacy list stays in board.json |
| npm scope and publish | D-037 owner | nothing publishes at M08 |

## Hands off to

M09 binds the board viewer (layer stack, face textures on the SHUNT
convention, net click with routed length, parsed-gerber PNGs) into ui-core
and runs hook conformance on the board benches. M10 writes SPINDLE, SHUNT
and LUG as CHASE (working name) documents on the `board` kind and builds the
PIP chase whose layout gives the wiring candidate its input. M11 counts the
board references toward coverage. M12 projects catalog.find and catalog.pins
as the `catalog_search` MCP tool and gates `export_run` for the board kinds.
M13 reads the actuator rows for live servo and stepper drivers. RISKS.md
R-07 (tscircuit cadence) and R-22 (unmeasured catalog dimensions) take this
milestone's records as their evidence.
