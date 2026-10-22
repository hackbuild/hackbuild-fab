# boards spindle-r1

SPINDLE R1, the orderable 2-layer breakout for an ESP32-C3 SuperMini, two
28BYJ-48 steppers through their ULN2003 boards and a laser diode
(knowledge/designs/spindle.md section 4.6). It is the M08 reference for
the gated direct-emit route (D-089): `gen.py` ports the R1 generator
`pcb.py` onto `tools/py/board/direct`, keeps every number with the pcb.py
line it came from, and refuses to write anything when its DRC fails.

covers: [CHK-BRD-01, CHK-BRD-02, CHK-BRD-05, CHK-BRD-06, CHK-BRD-07, CHK-BRD-09, CHK-BRD-20, CHK-BRD-21, CHK-BRD-22, export:gerbers, export:kicad, export:bom, export:cpl]

## Scope

- 46 x 46 mm, corner 2.0, 1.6 mm FR4, 2 layer, bottom GND pour; trace
  0.35, power 0.80, lanes 0.30; clearance 0.25, edge 0.40, pour 0.35,
  annular 0.30, mask expansion 0.05, hole to hole 0.30; vias 0.4 drill on
  0.8 pads; module hybrid pads 6.30 to 11.20 mm off centre, drilled 1.05
  on the 15.24 mm row through `hole_dx` (declared, pcb.py lines 23 to 89).
- The fab set: F_Cu, B_Cu, F_Mask, B_Mask, F_Paste, F_Silkscreen,
  Edge_Cuts, PTH and NPTH Excellon and the gerber zip, written to
  `.hbf/out/spindle-r1/` with `record.json` (the BoardRecord, recordHash
  stamped by the Node adapter) and `gates.json`. The record also carries
  the B.Cu GND pour, the antenna keepout and the silk strings (M08-T12).
- The BOM, CPL and netlist come from packages/board's writers on the
  record (M08-T12), checked by designator by CHK-BRD-05. The CPL places
  each part at its body centre: Q1 moves 0.367 mm in y from the legacy
  pad-centroid row (pcb.py lines 473 to 481), the other 13 parts keep
  their legacy positions (computed, `expected/cpl.json`).
- As shipped the board shorts 5V to GND on B.Cu (the 5V trace at y 20.00
  through the GND vias at x 9.80, 16.00, 30.60 and 36.20, pcb.py lines 184
  to 200, D-249). The reference keeps the shipped design as the fixture
  that proves the board checks catch a real short. chase.ts declares the
  short as an expect set on CHK-BRD-21 (D-074): that finding passes only
  while the measured short set is exactly 5V|GND, so it fails if the short
  goes unseen or another pair appears. CHK-BRD-01 has no expect set and
  fails on the reparse lines the short moves; the exit-m06-m08 CI job
  requires that failure and its three lines. reference/boards/spindle-r2
  is the board with the four vias removed. GPIO8 and GPIO9 are nets of
  one member each, which CHK-BRD-09 fails.
- Every part's pads were typed by hand in pcb.py, and pcb.py declares no
  body except the module's 18 x 22.52 mm, so every part reads inferred and
  a gerbers export stops at E_PROVENANCE until the M08-T03 row audit lifts
  a row (M08 Blockers table).

## What is in this folder

| file | what |
|---|---|
| `chase.ts` | the board chase: kind board, kernel board, exports gerbers and kicad |
| `build.ts` | names the backend and the generator |
| `gen.py` | the SPINDLE R1 generator on the direct library |
| `expected/` | parity goldens: build.json (buildHash, inputs, recordHash, board metrics), report.json, artifacts.json (the fab zip's sha256), reparse.json (the CHK-BRD-01 reparse report); cpl.json, the body-centre move against the legacy CPL |

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/boards/spindle-r1`
  exits 0 at build bc3f39..38 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-rails-public-05): gen.py names pcb.py by archive prefix
  (`fab-work-directory:benches/spindle/outputs/spindle/pcb.py`), was a
  home path. `hbf parity --accept` re-recorded build.json (defHash,
  buildHash, recordHash) and report.json (the path inside the CHK-BRD-06
  messages) at build e2222c..57 (was 2d395a..ac); artifacts.json and reparse.json
  are byte equal, so no copper moved, and the board metrics are equal
  (computed). report.json equals the old one with only the path rewritten
  (computed). Accepted under owner delegation on the equal geometry rule
  (D-273); a person has not accepted them (D-152).

- 2026-10-14 (D-249 call): chase.ts gained the CHK-BRD-21 expect set
  `5V|GND`. `hbf check.run reference/boards/spindle-r1 --only CHK-BRD-21`
  exits 0, measured `5V|GND`, missing and extra empty (computed); `--only
  CHK-BRD-01` exits 1 with 3 failed lines: the B_Cu piece of 34.15 mm2
  joining 5V and GND through the holes at y 20.00, 2 holes off GND
  touching the pour, 4 GND holes off the pour (computed). `hbf part.build`
  exits 1 on CHK-BRD-01, CHK-BRD-06 and CHK-BRD-09 (computed). `hbf parity
  --accept` re-recorded build.json (defHash, buildHash) and report.json
  (the CHK-BRD-21 finding) at build 2d395a..ac; artifacts.json and
  reparse.json are byte equal, so no copper moved (computed). Accepted
  under owner delegation; a person has not accepted them (D-152).

- 2026-10-14 (CI parity on Linux): the ubuntu-24.04 run of 953cebd failed
  parity here (report.json, artifacts.json and reparse.json differ) while
  macOS passed. Cause: shapely's arcs take sin and cos from the platform
  libm, and macOS libm and glibc differ in the last bit (record.json
  outline and zone arcs, computed); GEOS overlay turns those bits into
  another ring start, a vertex repeated within 1 nm and another order
  among polygons of equal area, and orders its output parts by platform
  even on one input, so reparse areas summed in another order. Linux
  amd64 and Linux arm64 wrote equal bytes; macOS arm64 differed (docker,
  computed). Fix: tools/py/board/direct/gerber.py snap rounds every region
  vertex to the 1 nm grid half to even as nm() does, drops repeats and
  normalizes, draw order ties break on an exact integer area;
  write_sources writes the same snapped geometry; record rings go on the
  grid; reparse.py takes every area in normal form. After it, the fab
  zip, every gerber, record.json, gates.json, source/*.wkb and the reparse
  JSON are byte equal between macOS arm64 and Linux amd64 (docker,
  computed). Geometry did not move: every layer's ring set equals the old
  golden zip's up to ring start, direction and repeats, the parsed layers
  of the old and new zips differ by 0.0 mm2 symmetric difference and 0.0
  Hausdorff, recordHash and the board metrics are equal, and no mesh hash
  or volume exists for a board (computed). `hbf parity --accept`
  re-recorded the goldens at build c1e4e6..68 (was dd60cf..1c): build.json
  moved defHash and buildHash (the library source is in defHash), the zip
  sha256 moved to 465431..10, reparse.json layer symmetric differences
  moved to 0.000000 mm2 (was at most 0.000087) as the source is now the
  geometry the gerber carries, and the informational F_Cu raster
  agreement moved to 98.85 percent (was 98.80) with the source drawn from
  normalized rings; report.json moved worstSymdiffMm2 only. The 5V to GND
  short and every other reparse line hold. Accepted under owner
  delegation on the equal geometry rule (D-273).

- 2026-10-13 (D-185): chase.ts declares CERN-OHL-W-2.0, was CC-BY-SA-4.0.
  `npx --no-install hbf parity reference/boards/spindle-r1 --accept` re-recorded
  the goldens at build dd60cf..1c (was eed1e8..83). Only build.json (licence, defHash, buildHash) moved;
  every other golden is byte equal, so no mesh hash or volume moved
  (computed). A person accepts them (D-152); not run.

- 2026-10-11 (M06 and M08 integration): `npx --no-install hbf parity
  reference/boards/spindle-r1` exits 0 at build eed1e8..83 against the goldens in
  `expected/` (computed). A person accepts them (D-152); not run.

- 2026-10-09 (M08-T12 to T14): `npx --no-install hbf parity
  reference/boards/spindle-r1` exits 0 against the goldens the builder
  re-accepted when the record gained zones, keepouts, silk, MPN and note
  and CHK-BRD-02, -03, -05 and -21 began to run; the fab zip's sha256 did
  not move (artifacts.json equal). A person accepts them (D-152); not run.
  `hbf check.run reference/boards/spindle-r1` exits 1: CHK-BRD-01 and
  CHK-BRD-21 fail on the 5V to GND short (`5V and GND shorted on B.Cu`,
  gap -0.800 mm, computed), CHK-BRD-06 on the 28 inferred hand-pad and body
  reads, CHK-BRD-09 on GPIO8 and GPIO9; every other check passes or skips.
  `hbf export.run reference/boards/spindle-r1 --kind gerbers < /dev/null`
  exits 4 with one E_PROVENANCE error per inferred read and no prompt.

- 2026-10-09 (M08-T08): `npx --no-install hbf parity
  reference/boards/spindle-r1` exits 0 at build 94b49a..9d against the
  goldens the builder re-accepted when CHK-BRD-22 joined the board checks
  (registryHash moved; report.json gains its skip on the gerbers zip) and
  gen.py's gates.json gained the mask expansion; a person accepts them at
  M08-T15 (D-152). `hbf export.run reference/boards/spindle-r1 --kind
  kicad` exits 0 with one `.kicad_pcb`, and `hbf check.run --artifact
  .hbf/out/spindle-r1/spindle-r1.kicad_pcb --only CHK-BRD-22` exits 0:
  pads 55 of 55, vias 15 of 15, 19 nets one island each (computed). The
  legacy `kicad/spindle-r1.kicad_pcb` reads back the same against this
  record (packages/board/test/kicad.test.ts).
- 2026-10-09 (M08-T07): parity exited 0 at build f2f3ff..84 against the
  goldens the builder re-accepted when CHK-BRD-01 began to run and the
  Edge_Cuts aperture moved after %MOMM% (artifacts.json moved; reparse.json
  is new); a person accepts them at M08-T15 (D-152). CHK-BRD-01 fails: the
  reparse finds the bottom copper piece of 34.15 mm2 that carries the 5V
  trace at y 20.00 joining 5V and GND through the four GND vias at (9.80,
  20.00), (16.00, 20.00), (30.60, 20.00) and (36.20, 20.00), so non-GND
  holes isolated 33 of 35 and GND holes bonded 18 of 22 (computed). The
  shipped gerbers carry the same copper: their layers equal the port's to
  0.000001 mm2 or less (computed, `--legacy`). Every other reparse line
  holds: pads 55 of 55 on F_Cu, drilled pads with bottom ring 57 of 57,
  drills 57 of 57 within 1 um, worst 0.0000, layer symmetric differences
  at most 0.000087 mm2, and 0 px outside the edge band on F_Cu and B_Cu
  (computed).
- 2026-10-09 (M08-T06): parity exited 0 at build 48c984..b7 against the
  goldens the builder accepted for that card. `hbf part.build` prints the legacy DRC line `DRC OK  19
  nets | 70 pads | 57 holes | tightest 0.32mm (rule 0.25) | 46x46mm`,
  equal to the M08 Records table's scratch run of pcb.py (computed), and
  two builds under SOURCE_DATE_EPOCH=315532800 write one fab zip sha256
  (computed).

### Measured on a printed body

- None. No R1 board has been fabricated.

### Checked by machine on geometry

- `tools/py/board/test/test_direct.py`: the pass line, the zip bytes under
  one epoch, a copy with `CLR = 0.40` refusing with `DRC failed:` and
  writing no file, the Excellon header parsing under gerbonara with
  warnings as errors, and the region writer's ring indexing.
- `tools/py/board/test/test_reparse.py`: the reparse lines above, the
  ring identity fault (0 of 35 isolated), islands written before the pour
  (bottom rings lost), the pre-hybrid R1 fab set from Downloads reparsing
  equal to its own regenerated source while its module drills sit on the
  17.5 mm row, and the reported short.
- `packages/board/test/kicad.test.ts`: the written and the legacy KiCad
  files read back 55 of 55 pads; both keep 18 footprints, 59 pads, 59
  segments, 15 vias, 20 nets, 2 zones, 4 gr_arc, 8 gr_line, 54 gr_text
  (the Records table's counts); a second write equals the first; a negated
  drill offset fails naming U1.GPIO20; a cut net shows two islands.
- `packages/board/test/direct.test.ts`: the record validates and its
  counts equal the Records table (19 nets, 70 pads, 57 holes, tightest
  0.32 mm against 0.25, computed).

### Not verified by anything

- Fab viewer load of the gerbers, a KiCad session opening the file (the
  pour zone carries no filled polygon until KiCad refills it, as the
  legacy wrote it), CPL rotations
  against an assembler library, and the hand pads against vendor land
  patterns. The owner may fix R1 another way than spindle-r2 does (D-249).
