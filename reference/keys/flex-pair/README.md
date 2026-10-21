# keys flex-pair

A PETG pad with buried cPLA traces, TPU 95A flex cones and cTPU caps, each
material on its own slot of the four-toolhead ffc5p as PIP prints them,
with one or two keys read by charge-release on an rp2040. It is the
reference the M-S walking skeleton runs from chase.ts to a printed body
(D-179, `docs/plan/milestones/M-S-walking-skeleton.md`), admitted with
its goldens at M05-T18 (D-105) for M09, M10, M12 and the first printed
circuit tutorial to read.

covers: [CHK-3MF-08, CHK-KEY-01, CHK-KEY-02, CHK-KEY-03, CHK-NET-02, CHK-NET-05, CHK-NET-13, CHK-NET-26, CHK-NET-27, CHK-NET-29, command:circuit.solve, read:charge-release]

| file | what it holds |
|---|---|
| `chase.ts` | the design: meta, materials, params, presets, exports, hookup (D-174, D-178) |
| `build.ts` | the reduced build and the drive pad contact function; its bytes enter defHash |
| `bench.ts` | the bench layout; outside defHash |
| `skeleton-kinds.ts` | draft pocket, conductor, contact and port defs for this reference only (M-S-T04) |
| `queries.json` | the circuit.solve call whose CommandResult `expected/query-solve.json` holds (M05-T18) |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/keys/flex-pair --accept` (build, report, edit, artifacts and query-solve), and the key sections written by `HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair` (D-227) |
| `out/` | exports; regenerated, never edited |

Every `npx --no-install hbf` line here runs the compiled `core/dist`, which
is gitignored; in a fresh clone run `npx tsc -b` from the repo root once first.

Each key is PIP's flex cone key (`knowledge/designs/pip.md` 5.1, D-085,
D-223), ported from pip-controller `src/layout.js` flexDims and
`src/model.js` lines 61 to 88:

- a TPU 95A cone, wall 0.6 mm at 40 degrees, and its foot ring as one
  revolved profile, buried one layer into the pad, kink points inset
  0.02 mm inside the well (CHK-KEY-06);
- a cTPU cap disc, radius 2.88 mm and 0.72 mm thick, bridging the 3.6 mm
  hole at the cone top;
- a TPU key top (collar, 45 degree flare, 10 mm face) standing 5.057 mm
  above the 6.01 mm pad top: the pad top is PIP's body top, its flex need
  less the bezel 2.4 mm (`src/layout.js` lines 223 and 231, D-236), so the
  cap and key top stand above the pad as they stand above PIP's printed
  body, outside the pad's top shells;
- a split cPLA column, radius 1.6 mm with 40 sides as PIP draws it
  (`model.js:65`), halves 0.8 mm apart, from the trace band to colTop
  4.65 mm, 1.84 mm under the cap;
- a well of radius 6.61 mm around the cone base.

All figures at defaults, computed. One half of the column carries the key
net, the other GND. A press closes the travel gap and the cap bridges the
halves. The cone top snaps to a layer top, so the default cone 4.0 mm
builds 4.08 mm, and the travel default 1.84 mm is PIP's 45 percent of it.

The travel CHK-KEY-01 measures is the drawn gap. colTop 4.65 mm is not a
layer top: it lies under the 4.69 mm mid-height of the layer from 4.57 to
4.81 mm, so a slicer ends the column at 4.57 mm and the printed travel is
1.92 mm, 47 percent (computed; mid-layer slicing inferred). The build
reports it as the informational metric `keys.<n>.printedTravel`. A travel
that is a whole number of 0.24 mm layers prints as drawn; changing the
default is an owner decision, since D-223 names 1.84 mm. PIP's feel
readout (wall across 0.783 mm over the cone 4.0 mm, 0.196) reads medium
(`keys.<n>.feel`, computed).

The split is drawn at colGap with no print bleed. Bleed is a profile field
applied once at emit, default 0 (D-084); haft (9) `model.js` adds it to the
split in the model (lineage row pip.model/haft-9), which equals this build
at bleed 0.

## Goldens

At the defaults (preset "one", one key; all computed):

- `expected/report.json`: CHK-KEY-01 on `contact.key1` measures the
  travel 1.84 mm against legal 1.428 to 2.04 mm, 35 to 50 percent of the
  built cone 4.08 mm with the 1.2 mm floor (D-241), pass. CHK-KEY-02 and
  CHK-KEY-03 pass, CHK-NET-02 passes at 0.7559 mm against the 0.60 mm
  floor (D-085), and no covered check fails.
- `expected/edit.json`: the chase default pointer
  `/params/1/fields/0/item/3/default`, the travel M10's chase.patch
  edits, moved from 1.84 to 2.15 mm. Both column halves change and every
  other mesh is unchanged; CHK-KEY-01 flips pass to fail, measured 2.15
  mm, legal 1.428 to 2.04 mm, fix `set` 2.04 on `/keys/0/gap`, predicted
  pass (D-064).
- `expected/report.json` also holds CHK-3MF-08 pass on flex-pair.3mf: the
  one object, which holds cap1 and the five conductor parts, has
  `interlocking_beam` 0 from the writer (D-246).
- `expected/query-solve.json`: `circuit.solve` finds nets GND and K1, each
  with its port and clip pad as terminals. The K1 along segment, 15.0 mm
  of 1.4 x 0.72 mm cpla at 500 ohm cm along (pip-controller
  `src/layout.js:46`, tier inferred, D-081), is 74404.8 ohm. One
  charge-release read on K1 settles in 5 tau inside the 3500 us wait
  (inferred, D-079); totalOhm and tau per net are in the golden. Each net
  reads unknown because its clip pad contact has no profile row and is
  unpriced. CHK-NET-05 version 2 targets pullup ports, so on port.key1 it
  skips with "no port with read model pullup"; the pass and fail branches
  are covered by reference/electrical/blocks-pullup-band (M05-T07). The
  button path checks run there too (M05-T19): CHK-NET-13 on each
  conductor, CHK-NET-26 on K1 with cap1 cut, CHK-NET-27 on contact.key1
  and CHK-NET-29 on K1; the history below gives their numbers.

At preset "two" the GND bus runs 44.0 mm and its along segment is
218254.0 ohm (computed, tier inferred); `test/solve.test.ts` holds both
along segments to 0.1 percent.

Each net ends in a clip pad, `pad.key<n>` and `pad.gnd`, 3 x 3 mm (inferred,
M05-T18 step 3). PadFeature carries no position, so the pad has no solid;
its note names where the trace meets the pad edge. Wire cups get no pad
and keep the LEADS warning (D-096).

Not covered yet: CHK-NET-01 and CHK-NET-11 target nets, and `check.run`
runs the part, body and feature levels only, so neither reaches
`expected/report.json`; CHK-NET-11's run body lands with M05-T10.

## Key sections

`expected/section-key1.png` and `expected/section-key2.png` cut preset
"two" by the plane y = 0 through both key centres. Pink is the key net
(its column half and the start of its trace), ink the GND net, grey the
cTPU cap, white the TPU cone and key top, tan the PETG pad. The test
`test/reference.test.ts` reads the same section and holds that both halves
run from the trace band floor to colTop and that the cap underside sits one
declared gap above colTop, to 1/1024 mm (computed). It also holds the SVG
beside each PNG equal to the build; the SVG is the compared golden and the
PNG its rendering. `HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair`
is the only writer of both and of the generated blocks below; `hbf parity
--accept` writes only the four JSON goldens (D-227). A person runs it and
reads the PNGs before they land; CI never sets HBF_ACCEPT.

## Print card

For the owner's print in M-S-T10. Generated from the build, the 3MF bytes
and the chase; never edit between the markers.

<!-- generated: print card; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair -->

- design: keys-flex-pair, preset two, machine ffc5p
- file: out/flex-pair-two.3mf, 65701 bytes, sha256 e91d8a382579e57db26baf1d2c6001c205fe9965330443f86125dc669fb20f86
- artifact hash (hbf): a52f8da2a676672700af433ed8297f41de0c318dcb04bc7aba7bc37573dccef1
- write it: `SOURCE_DATE_EPOCH=315532800 npx --no-install hbf export.run reference/keys/flex-pair --kind 3mf --preset two --out reference/keys/flex-pair/out/flex-pair-two.3mf` (the epoch is pinned; unset, it follows the HEAD commit time and the bytes move)
- build: d94d40d602ec8ec5daa0483295ab52daf26996923368ec8e4626df5bab9319e6
- slicer: Flashforge Creator 5 Pro 0.4 nozzle, process 0.24mm Standard @FF C5
- plate: Textured PEI Plate
- layer grid: ffc5p_20260819, first layer 0.25 mm, then 0.24 mm (profile)
- pause: none (the 3mf carries no custom_gcode_per_layer entry)
- per-object settings in the file (M05-T20): object flex-pair interlocking_beam 0; sparse_infill_density 100% on caps cap1, caps cap2, traces conductor.gnd, traces conductor.key1col, traces conductor.gnd1col, traces conductor.key1, traces conductor.gnd1stub, traces conductor.key2col, traces conductor.gnd2col, traces conductor.key2, traces conductor.gnd2stub; the Flash Studio CLI applies both keys from model_settings.config (computed, M05-T20 headless probes), the GUI is not run, so confirm each in the slicer object list before slicing
- trace band: 0.73 to 1.45 mm (computed); leads are cPLA at the pad edge in that band
- after peeling: work each key a few times to free the cone and its cap (PIP assembly step 1, bench/part2.js line 148)

| slot | material | role | label | slicer type | slicer filament | colour |
|---|---|---|---|---|---|---|
| 1 | petg | body | pad | PETG | Generic PETG @FF C5P | #F4F1EA |
| 2 | cpla | conductor | traces | PLA | Generic PLA @FF C5P | #1A1A1A |
| 3 | tpu95 | flex | cones | TPU | Generic TPU @FF C5P | #FE0386 |
| 4 | ctpu | flex-conductor | caps | TPU | Generic TPU @FF C5P | #6E6E6E |

| net | port | probe pin | lead |
|---|---|---|---|
| GND | port.gnd | pico GND | trace meets the pad edge at x 30, y 3 mm (computed) |
| K1 | port.key1 | rp2040 GP2, charge-release, drive high 30 us, wait 3500 us (inferred default) | trace meets the pad edge at x -12.9, y -15 mm (computed) |
| K2 | port.key2 | rp2040 GP3, charge-release, drive high 30 us, wait 3500 us (inferred default) | trace meets the pad edge at x 15.1, y -15 mm (computed) |

<!-- end generated: print card -->

Read each key as the FLOAT US column of pip_probe does: drive the pin high,
release it to input, time the fall below the logic threshold. A press reads
shorter than a release. Run 50 presses per key (inferred plan budget).

The owner's checklist for exit B, from the export line to the block
pasted back below, is [EXIT-B.md](EXIT-B.md). The probe is
`tools/skeleton/flexpair_probe/flexpair_probe.ino`; K1 reads on GP2 and K2
on GP3, as the hookup in `chase.ts` names them.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/keys/flex-pair`
  exits 0 at build d26226..80 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-14 (coupon export dropped, D-271): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build b22ba3..54 against the goldens
  re-accepted when chase.ts dropped its `coupon` export: in build.json only
  defHash and buildHash moved, registryHash and every mesh hash and volume
  are unchanged, `query-solve.json` moves the same two hashes and
  `artifacts.json` its 3MF hash, whose metadata carries the buildHash
  (computed).
- 2026-10-14 (coupon export dropped): the preset "two" writer 3MF of that
  build (65702 bytes, sha256 f20da97e...4784, the print card's file at
  build c1cbf8..c6) passes `uv run --project tools/py
  tools/py/validate_3mf.py --overlap`: 27 checks ran, 0 skipped, 0 failed
  (export, target bbs). Evidence: `fab-knowledge:evals/2026-10-14/flex-pair-slice/`.
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/keys/flex-pair`
  exits 0 at build e00fb0..6e against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 3e774f..11 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 724252..e2 against the
  goldens re-accepted once at the M05 exit, when the page milestone
  moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). The build registry now runs
  CHK-NET-13 on the five conductors (pass, 0 deg) and CHK-NET-27 on
  contact.key1 (pass, cap1 moved 1.84 mm touches both column halves),
  both computed, so report.json moves its reportHash to d38a52..ab with
  no new warn or fail; build.json, edit.json, artifacts.json, the 3MF
  and every mesh hash are unchanged, so the print card and EXIT-B.md
  stand. CHK-NET-40 to -45 are sheet level and leave registryHash as it
  was.
- 2026-10-09 (M05-T20): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 724252..e2 against the
  goldens re-accepted once for CHK-3MF-08, which the circuit kernel the
  chase lists now resolves (D-246): in build.json only registryHash and
  buildHash moved, every mesh hash and volume is unchanged, and
  report.json gains CHK-3MF-08 pass on flex-pair.3mf (computed). The
  writer 3MF carries `interlocking_beam` 0 on the flex-pair object,
  `sparse_infill_density` 100% on the cap and the five conductor parts,
  and the conductor record in `Metadata/hackbuild_chase.json`.
- 2026-10-09 (M05-T20): the preset "two" writer 3MF of that build (65701
  bytes, sha256 ea0dd4f7...dc63, the print card's file at build
  00cd83..6a) passes `uv run --project tools/py
  tools/py/validate_3mf.py --overlap`: 27 checks ran, 0 skipped, 0
  failed (export, target bbs), CHK-3MF-08 among them.
- 2026-10-09 (M05-T19): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 2ccfa0..82 against the
  goldens accepted once for the four net checks: build.ts declares one
  `apartExcept { nets: ["K<n>", "GND"], cut: "cap<n>" }` per key and each
  contact names its actuator `cap<n>` and press axis [0, 0, -1]. In
  build.json defHash and buildHash moved, registryHash and every mesh hash
  and volume are unchanged (computed). `query-solve.json` now carries
  CHK-NET-13 pass on the five conductors (0 deg, all on the trace face),
  CHK-NET-26 pass on K1 (cap1 pressed 1.84 mm joins K1 to GND, removed
  they fall apart), CHK-NET-27 pass on contact.key1 (cap1 moved 1.84 mm
  down touches both column halves) and CHK-NET-29 warn on K1 (295309 ohm,
  legal 0 to 84337349 ohm at 3500 us over 5 tau at 8.3 pF; wait and path
  rows inferred, three contacts unpriced), all computed. report.json moves
  the CHK-NET-29 line the skeleton prints from the same run body.
- 2026-10-08 (M05-T10): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 111aab..98 against the
  goldens re-accepted after the draft conductor def became the
  packages/circuit one (skeleton-kinds.ts delegates to it): in build.json
  defHash, registryHash and buildHash moved, report.json and edit.json
  are equal, and every mesh hash and volume is unchanged (computed).
  `query-solve.json` moves the same three hashes and `artifacts.json` its
  3MF hash, whose metadata carries the buildHash.
- 2026-10-08 (M05-T18): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 521420..ed against the
  goldens accepted once for the clip pads, the edit of the chase default
  travel and the circuit.solve query: in build.json defHash, registryHash
  and buildHash moved, and every mesh hash and volume is unchanged
  (computed). `npx --no-install hbf circuit.solve reference/keys/flex-pair
  --json` exits 0 with nets GND and K1 and one read on K1, settleTaus 5,
  wait 3500 us inferred, ok true. `test/solve.test.ts` and
  `test/reference.test.ts` pass.
- 2026-10-08 (M05-T18): the preset "two" writer 3MF of that build (65345
  bytes, sha256 671595b4...d7c3, the print card's file at build
  46b1e4..57) passes `uv run --project tools/py
  tools/py/validate_3mf.py --overlap`: 26 checks ran, 0 skipped, 0
  failed (export, target bbs). The same file sliced headless by Flash
  Studio gives G-code equal to M05-T12's but for its generated-at line
  (simulated block below).
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 76bade..06 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M05-T12): the preset "two" writer 3MF of that build (65345
  bytes, sha256 60511707...1e34, the print card's file) passes `uv run
  --project tools/py tools/py/validate_3mf.py --overlap`: 26 checks ran,
  0 skipped, 0 failed (export, target bbs).
- 2026-10-08 (M05-T14): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 6cd21a..89 against the
  goldens re-accepted for the eight KEYWAY gate rows M05-T14 entered,
  CHK-NET-31 to -38: in build.json only registryHash moved, the report
  gains CHK-NET-31 as a pending skip on the part, and every mesh hash and
  volume is unchanged (computed).
- 2026-10-08 (M05-T14): the preset "two" writer 3MF of that build (65343
  bytes, sha256 6f6e9af8...bda7, the print card's file at build
  6cd21a..89) passes `uv run
  --project tools/py tools/py/validate_3mf.py --overlap`: 26 checks ran,
  0 skipped, 0 failed (export, target bbs).
- 2026-10-08 (audit fixer round): `npx --no-install hbf parity
  reference/keys/flex-pair` exits 0 at build 8bd01e..c7 against the
  goldens regenerated once for the registry checks in the report, the
  spec registryHash and the check version bumps (D-241 to D-243); every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M04 verifier, the audit after it): `npx --no-install hbf
  parity reference/keys/flex-pair` exits 0 at build 26a969..75 against
  the goldens in `expected/`.
- 2026-10-08 (audit fixer round): the preset "two" writer 3MF (65345
  bytes, sha256 64f25341...cd92, the print card's file at build
  8bd01e..c7) passes `uv run
  --project tools/py tools/py/validate_3mf.py --overlap`: 26 checks ran,
  0 skipped, 0 failed (export, target bbs). The M04 file (sha256
  823fddb9...d018) passed the same run earlier on 2026-10-08.
- 2026-10-08: `test/reference.test.ts` passes on the key sections above.

### Measured on a printed body

None yet. M-S-T10: the owner prints preset "two" on ffc5p, opens it in
Flash Studio, reads both keys on a Pico and writes date, machine, preset,
presses read, and crossing times released and pressed (measured) here,
in the format of [EXIT-B.md](EXIT-B.md) section 7.

### Simulated: virtual exit B, nothing printed

2026-10-07, on the owner's instruction (D-234). Every figure in this block
is computed by a simulation unless it says measured; none is measured on a
printed body, and none meets M-S-T10. Full record:
`fab-knowledge:evidence/virtual-print/VIRTUAL-EXIT-B.md`.

- Slice: the preset "two" 3MF written in process at SOURCE_DATE_EPOCH
  315532800 after the D-236 pad top, 65344 bytes, sha256 823fddb9...d018
  (the first run, before D-236, sliced 64865 bytes, sha256
  72fd08b9...75ae8), equal to the print card of 2026-10-07 (computed in
  process), sliced headless by Flash Studio 1.7.14 (CLI
  Orca-Flashforge 2.3.2) through `tools/slice/slice.mjs` with the project completed from
  the bundled presets (D-237) and slots 3 and 4 mapped to
  `Generic TPU-95A @FF C5P` (inferred stand-in, D-238): exit 0, 3415 ms
  wall (measured), 46 layers.
- Reruns 2026-10-08 (M04-T15, M04 verifier, M04 fixer): the M04 build's
  writer 3MF, sha256 823fddb9...d018, each time; G-code 686412 bytes each time,
  sha256 differing by run only in its generated-at line (computed).
- Rerun 2026-10-08 by the audit fixer round on build 8bd01e..c7: writer
  3MF sha256 64f25341...cd92 (65345 bytes), only `Metadata/hackbuild_chase.json`
  (the build hash) differing from the M04 file; completed 3MF sha256
  3e7c5ffe...6f6e on two runs, its zip dates pinned; slicer exit 0, 1361
  and 1146 ms wall (measured); G-code body equal to the M04 runs and the
  analysis below equal on every figure (computed).
  Evidence: `fab-knowledge:evidence/virtual-print/audit3-fixer/`.
- Rerun 2026-10-08 by M05-T14 on build 6cd21a..89, the registry moved by
  CHK-NET-31 to -38: writer 3MF sha256 6f6e9af8...bda7 (65343 bytes), only
  `Metadata/hackbuild_chase.json` (the build hash) differing from the audit
  fixer round's file; completed 3MF sha256 3fa2c002...b0a1; slicer exit 0,
  2832 ms wall (measured); G-code 686412 bytes, equal to the audit fixer
  round's but for its generated-at line, and the analysis equal on every
  figure from its summary on (computed); `validate_3mf.py --overlap` on the
  writer 3MF: 26 checks ran, 0 skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evidence/virtual-print/m05-t14/`.
- Rerun 2026-10-08 by M05-T12 on build 76bade..06, the registry moved by
  the constraint def circuit/capacitive-path-ceiling: writer 3MF sha256
  60511707...1e34 (65345 bytes), only `Metadata/hackbuild_chase.json` (the
  build hash) differing from M05-T14's file; completed 3MF sha256
  4506ad3a...a065; slicer exit 0, 3295 ms wall (measured); G-code 686412
  bytes, equal to M05-T14's but for its generated-at line, and the
  analysis equal on every figure from its summary on (computed);
  `validate_3mf.py --overlap` on the writer 3MF: 26 checks ran, 0
  skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evidence/virtual-print/m05-t12/`.
- Rerun 2026-10-08 by M05-T18 on build 521420..ed (preset "two" build
  46b1e4..57), the clip pads and the pad draft kind moving defHash and
  registryHash: writer 3MF sha256 671595b4...d7c3 (65345 bytes); completed
  3MF sha256 cbc14a6b...ec1b; slicer exit 0, 2028 ms wall (measured);
  G-code 686412 bytes, equal to M05-T12's but for its generated-at line,
  and the analysis equal on every figure from its summary on (computed);
  `validate_3mf.py --overlap` on the writer 3MF: 26 checks ran, 0
  skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evidence/virtual-print/m05-t18/`.
- Rerun 2026-10-08 by M05-T10 on build 111aab..98 (preset "two" build
  392594..46), the draft conductor def becoming packages/circuit's
  conductor kind moving defHash and registryHash: writer 3MF sha256
  af9c438b...b95c (65345 bytes), only `Metadata/hackbuild_chase.json` (the build
  hash) differing from M05-T18's file; completed 3MF sha256
  9a803c23...080f; slicer exit 0, 1438 ms wall (measured); G-code 686412
  bytes, equal to M05-T18's but for its generated-at line, and the
  analysis summary equal on every figure (computed); `validate_3mf.py
  --overlap` on the writer 3MF: 26 checks ran, 0 skipped, 0 failed
  (export, target bbs).
  Evidence: `fab-knowledge:evidence/virtual-print/m05-t10/`.
- Rerun 2026-10-09 by M05-T20 on build 724252..e2 (preset "two" build
  00cd83..6a), CHK-3MF-08 moving registryHash and the writer adding the
  conductor overrides: writer 3MF sha256 ea0dd4f7...dc63 (65701 bytes);
  completed 3MF sha256 67832d68...5cb6; slicer exit 0, 1166 ms wall
  (measured); G-code 686412 bytes, equal to M05-T18's but for its
  generated-at line, and the analysis summary equal on every figure
  (computed): the conductor parts are already filled by their two walls
  and beams are off by default, so the overrides move no toolpath here.
  Two probe slices of the same file show the CLI reads both keys from
  `model_settings.config`: `interlocking_beam` 1 on the object changes
  the toolpaths (G-code 685544 bytes), and `sparse_infill_density` 100%
  on the pad part takes its sparse infill sections from 47 to 12
  (computed; the GUI is not run). `validate_3mf.py --overlap` on the
  writer 3MF: 27 checks ran, 0 skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evidence/virtual-print/m05-t20/`.
- Rerun 2026-10-10 by the integration pass after M06 and M08 on build
  17d1ed..9e (preset "two" build 18de2f..bc), CHK-KEY-01 2.1.0, CHK-KEY-02
  2.0.0, CHK-PRT-03 2.0.0 and CHK-PRT-04 2.0.0 moving registryHash, every
  mesh hash and volume unchanged: writer 3MF sha256 e05c210a...5016
  (65701 bytes); completed 3MF sha256 a9139043...5c34; slicer exit 0,
  1315 ms wall (measured); G-code 686412 bytes, equal to M05-T20's but for
  its generated-at line, and the analysis equal on every figure from its
  summary on (computed); `validate_3mf.py --overlap` on the writer 3MF: 27
  checks ran, 0 skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evidence/integration-m06-m08/flex-pair-slice/`.
- Rerun 2026-10-11 by the integration pass after M06 and M08 on build
  e00fb0..6e (preset "two" build c66fdd..85), CHK-KEY-04 2.0.1, CHK-SHT-04
  2.0.1 and CHK-SHT-11 1.0.1 moving registryHash, every mesh hash and volume
  unchanged: writer 3MF 65703 bytes, sha256 4419e5df...0eeb; completed 3MF
  sha256 7814151f...0d4c; slicer exit 0, 2048 ms wall (measured); G-code
  686412 bytes, equal to the 2026-10-10 rerun's but for its generated-at
  line, and the analysis equal on every figure from its summary on
  (computed); `validate_3mf.py --overlap` on the writer 3MF: 27 checks ran,
  0 skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evidence/integration-m06-m08/flex-pair-slice-2026-10-11/`.
- Rerun 2026-10-14 by the reference fixer on build b22ba3..54 (preset
  "two" build c1cbf8..c6), chase.ts dropping its `coupon` export moving
  defHash, registryHash and every mesh hash and volume unchanged: writer
  3MF 65702 bytes, sha256 f20da97e...4784; completed 3MF sha256
  1ee37b04...119c; slicer exit 0, 1532 ms wall (measured); G-code 686412
  bytes, equal to the 2026-10-11 rerun's but for its generated-at line,
  and the analysis equal on every figure from its summary on (computed);
  `validate_3mf.py --overlap` on the writer 3MF: 27 checks ran, 0
  skipped, 0 failed (export, target bbs).
  Evidence: `fab-knowledge:evals/2026-10-14/flex-pair-slice/`.
- Rerun 2026-10-21 by R1-fix-19 on build d26226..80 (preset "two" build
  d94d40..e6), CHK-KEY-05 2.0.0 moving registryHash, every mesh hash and
  volume unchanged: writer 3MF 65701 bytes, sha256 e91d8a38...0f86
  (computed in process, no export run). The slicer and validate_3mf.py
  were not run on it.
- Analyzer missing areas (at least 0.02 mm2 after a 0.10 mm opening): 78
  (computed). The largest are on both key tops (cones top1 and top2, T2)
  at layers 41 to 44, up to 1.538 mm2 at layer 41 (computed). By body:
  pad 38, the four conductor columns 14, each key top 13 (computed).
  Their effect on the printed key top is unknown.
- G-code read back by `tools/py/gcode/analyze.py` (TESTING.md 2.7): 0
  regions of a body printed by another tool (before D-236: PETG internal
  bridge across both key tops at layer 30, 8.653 and 8.635 mm2); 0
  deposited cPLA regions touching two nets; three cPLA components, one per
  net K1, K2 and GND; every lead reaches its column tops; both halves
  deposited in 16 layers with a 0.8 mm minimum split; each cap one cTPU
  component touching no cPLA at rest.
- Printed contact gap 1.92 mm for both keys against 1.84 mm declared (the
  printedTravel metric). The cap's first layer bridges the 3.6 mm hole as a
  slicer Bridge, widest unsupported span 3.744 mm; its sag is unknown.
- TPU overhangs: the 40 degree cone walls in layers 11 to 26 and the key
  top flare in layers 32 to 40 overhang about 0.42 to 0.54 mm per layer,
  printed as walls, not bridges; how TPU 95A prints them is unknown.
- Slicer estimates: 33 m 32 s, 10.29 g of filament (PETG 7.93, cPLA 0.95,
  TPU 1.21, cTPU 0.20 g), 35 tool changes, prime tower 35 mm.
- Key path from the Part IR on the inferred resistivity rows: 364.8 kohm
  per key, 370.4 kohm with the cap bridge; pressed with PIP's 10 to 30
  times contact factor (inferred) 3.70 to 11.11 Mohm, above the declared
  contact.maxOhm 2 Mohm (a finding; presses still read because WAIT_US
  accepts paths up to 87.3 Mohm, computed); 28.3 pF on the pin: 7 pin, 1.3
  trace and a 20 pF probe lead (all inferred, profile `electrical.*`).
- `flexpair_probe.ino`, unchanged, on a host shim: nominal presses K1 50
  of 50 and K2 50 of 50 read given every press closes, 0 spurious,
  pressed crossings 149 to 446 us at 28.3 pF; with PIP's measured stick
  crossings transferred (113 to 2431 us) 50 of 50 each; fast taps 30 to
  120 ms K1 50 of 50, K2 44 of 50 with the 20 pF key lead (47 of 50
  before the lead was priced); travel gated at the printed gap, a press
  closing only when a drawn 0.4 to 0.6 of the cone height reaches 1.92 mm,
  K1 26 of 50 and K2 32 of 50; injected
  faults read as expected (a split short or open lead kills one key, GND
  open both, a 1 Mohm hand mid-session reads as one press); interrupts
  off at most 2001.3 us.

What it cannot show: contact resistance, press force, cap sag, the TPU to
cTPU bond, whether the GUI slices as the CLI does, and any measured
crossing. Those wait on M-S-T10.

### Checked by machine on geometry

<!-- generated: checks; rewrite with HBF_ACCEPT=1 npx vitest run reference/keys/flex-pair -->

Defaults, from `expected/report.json` (computed by the checks, not measured):

| check | verdict | target |
|---|---|---|
| CHK-3MF-04 | skip | part pad |
| CHK-3MF-05 | skip | part pad |
| CHK-3MF-06 | pass | flex-pair.3mf |
| CHK-3MF-07 | pass | flex-pair.3mf |
| CHK-3MF-08 | pass | flex-pair.3mf |
| CHK-ASM-01 | skip |  |
| CHK-ASM-03 | skip |  |
| CHK-ASM-08 | skip | part pad |
| CHK-BRD-02 | skip |  |
| CHK-FIT-02 | skip |  |
| CHK-FIT-03 | skip |  |
| CHK-FIT-05 | skip |  |
| CHK-FIT-06 | skip |  |
| CHK-FIT-07 | skip |  |
| CHK-INL-01 | skip |  |
| CHK-INL-02 | skip |  |
| CHK-INL-03 | skip |  |
| CHK-INL-04 | skip |  |
| CHK-KEY-01 | pass | contact.key1 |
| CHK-KEY-02 | pass | pocket.key1 |
| CHK-KEY-03 | pass | contact.key1 |
| CHK-KEY-04 | skip |  |
| CHK-KEY-05 | skip | contact.key1 |
| CHK-KEY-06 | skip | part pad |
| CHK-MOT-05 | skip |  |
| CHK-NET-02 | pass | net GND and net K1 |
| CHK-NET-03 | pass | contact.key1 |
| CHK-NET-04 | skip | conductor.gnd |
| CHK-NET-04 | skip | conductor.gnd1col |
| CHK-NET-04 | skip | conductor.gnd1stub |
| CHK-NET-04 | skip | conductor.key1 |
| CHK-NET-04 | skip | conductor.key1col |
| CHK-NET-05 | skip | port.gnd |
| CHK-NET-05 | skip | port.key1 |
| CHK-NET-10 | skip |  |
| CHK-NET-13 | pass | conductor.gnd1col |
| CHK-NET-13 | pass | conductor.gnd1stub |
| CHK-NET-13 | pass | conductor.key1col |
| CHK-NET-13 | pass | conductor.key1 |
| CHK-NET-13 | pass | conductor.gnd |
| CHK-NET-25 | skip |  |
| CHK-NET-27 | pass | contact.key1 |
| CHK-NET-29 | warn | net K1 |
| CHK-NET-31 | skip |  |
| CHK-PRT-01 | pass | part pad |
| CHK-PRT-02 | skip | part pad |
| CHK-PRT-03 | pass | part pad |
| CHK-PRT-04 | skip | part pad |
| CHK-PRT-05 | warn | part pad |
| CHK-PRT-06 | pass | part pad |
| CHK-PRT-07 | pass | part pad |
| CHK-PRT-08 | skip |  |
| CHK-PRT-09 | pass | part pad |
| CHK-PRT-10 | skip |  |
| CHK-PRT-11 | skip | part pad |
| CHK-PRT-12 | pass | part pad |
| CHK-PRT-13 | pass | part pad |
| CHK-PRT-14 | skip |  |
| CHK-PRT-15 | pass | part pad |
| CHK-PRT-16 | pass | part pad |
| CHK-PRT-16 | pass | part pad |
| CHK-PRT-16 | pass | part pad |
| CHK-SHP-01 | skip |  |
| CHK-SHP-02 | skip |  |
| CHK-SHP-03 | skip |  |
| CHK-SHP-04 | skip |  |
| CHK-SHP-05 | skip | part pad |
| CHK-SHT-05 | skip | part pad |
| CHK-SHT-06 | skip |  |
| CHK-SHT-09 | skip |  |
| CHK-SHT-11 | skip |  |

<!-- end generated: checks -->

### Not verified by anything

Every export of this reference carries the CHK-NET-29 warn that names the
inferred path rows until a coupon is measured (D-081, D-082).

- The cpla and ctpu resistivity on the shop's spools: the rows read are
  PIP's preset, inferred (D-081); no coupon is measured (D-082).
- The 3500 us wait on a printed pair (D-079, D-082).
- The clip pad contact: no profile contact row exists, so each pad is an
  unpriced contact and each net's resistance reads unknown.
- That the cap bridges the halves under a finger press: CHK-NET-27 moves
  the built cap rigidly down by the declared travel and finds it touching
  both column halves (computed); the cone's deformation under a finger, the
  force it takes and the contact resistance are not simulated, and no print
  has shown the press.
- Whether Flash Studio loads four filaments on slots 1 to 4 (D-150), and
  the TPU slots: the writer borrows the PETG preset column for
  `Generic TPU @FF C5P` until a slicer save holds it (inferred).
- Print quality on ffc5p of the 0.8 mm column split, the 3.6 mm cap
  bridge and the TPU cone (source values; PIP has no recorded flex key
  force or contact resistance, unknown). The virtual print above slices
  them as drawn; it does not print them.
