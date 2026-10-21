# boards spindle-r2

SPINDLE R2, SPINDLE R1 with its 5V to GND short removed (D-249). R1 as
shipped runs its 5V bottom trace at y 20.00 through four GND vias at x
9.80, 16.00, 30.60 and 36.20 (pcb.py lines 184 to 200). R2 drops those
four vias and changes nothing else on copper. The silk revision, the
Excellon headers and the zip name read R2. reference/boards/spindle-r1
keeps the shipped R1 and its short as the fixture CHK-BRD-21 and
CHK-BRD-01 must keep catching. The shipped R1 files stay as shipped in
the owner's archive (`fab-knowledge:originals/spindle/files/`).

No R2 board has been fabricated, and the owner has not released an R2;
this reference is the smallest change the R1 source supports that the
board checks pass.

covers: [CHK-BRD-01, CHK-BRD-02, CHK-BRD-05, CHK-BRD-06, CHK-BRD-07, CHK-BRD-09, CHK-BRD-20, CHK-BRD-21, CHK-BRD-22, export:gerbers, export:kicad, export:bom, export:cpl]

## Why these four vias and no other change

- No GND stub ends at any of the four. pcb.py line 192 says what a GND
  via is for, "short stubs into vias, the bottom pour carries it", and
  each of the other nine GND vias is the end of a stub (lines 201 to
  209). The four at y 20.00 are the end of nothing.
- They join no GND copper. The pour is cleared 0.35 mm around the 0.80 mm
  5V trace (pcb.py lines 234 to 237), so the clear reaches 0.75 mm from
  the trace centre line and a via ring reaches 0.50 mm (0.4 drill, 0.30
  annular): each ring touches the 5V trace and no pour. The R1 reparse
  counts them as the "4 GND holes sit off the pour" (GND holes bonded 18
  of 22, computed); R2 bonds 18 of 18 (computed). Removing them leaves
  every GND joint of R1 in place and takes out only the short.
- Moving the vias or rerouting 5V would place copper the R1 source does
  not declare. Deleting four declared items places none.

## Scope

As reference/boards/spindle-r1 (46 x 46 mm, 2 layer, bottom GND pour,
every rule of pcb.py lines 23 to 32), less four vias: 19 nets, 66 pads
(55 component pads plus 11 vias), 53 holes, tightest 0.32 mm against
0.25 (computed, the DRC line in gates.json). Every part's pads are the R1
hand pads, so every part reads inferred and a gerbers export stops at
E_PROVENANCE, as R1's does. GPIO8 and GPIO9 are nets of one member each,
as on R1, and CHK-BRD-09 fails on them; pcb.py's docstring names them
I2C, and no I2C header was placed, which is the owner's to settle.

## What is in this folder

| file | what |
|---|---|
| `chase.ts` | the board chase: kind board, kernel board, exports gerbers and kicad |
| `build.ts` | names the backend and the generator |
| `gen.py` | the R1 generator copy with the four vias gone and the R2 labels |
| `expected/` | parity goldens: build.json, report.json, artifacts.json (the fab zip's sha256), reparse.json (the CHK-BRD-01 reparse report) |

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-rails-public-05): gen.py names pcb.py by archive prefix
  (`fab-work-directory:benches/spindle/outputs/spindle/pcb.py`), was a
  home path. `hbf parity --accept` re-recorded build.json (defHash,
  buildHash, recordHash) and report.json (the path inside the CHK-BRD-06
  messages) at build 593326..bc (was b31992..a2); artifacts.json and reparse.json
  are byte equal, so no copper moved, and the board metrics are equal
  (computed). report.json equals the old one with only the path rewritten
  (computed). Accepted under owner delegation on the equal geometry rule
  (D-273); a person has not accepted them (D-152).

- 2026-10-14: `npx --no-install hbf check.run reference/boards/spindle-r2
  --only CHK-BRD-01,CHK-BRD-21 --json` exits 0. CHK-BRD-01: the zip reads
  back to its source and record, worst layer symmetric difference
  0.000000 mm2; pads 55 of 55 on F_Cu, drilled pads with bottom ring 53
  of 53, drills 53 of 53 within 1 um, non-GND holes isolated 35 of 35,
  GND holes bonded 18 of 18, 0 px outside the edge band (computed).
  CHK-BRD-21: 19 nets one island each, no copper joins two nets
  (computed).
- 2026-10-14: `npx --no-install hbf part.build reference/boards/spindle-r2
  --json` exits 1 on CHK-BRD-06 (28 inferred hand-pad and body reads) and
  CHK-BRD-09 (GPIO8, GPIO9) only (computed).
- 2026-10-14: `SOURCE_DATE_EPOCH=315532800 hbf parity
  reference/boards/spindle-r2 --accept` recorded the goldens at build
  b31992..a2, epoch 315532800 as every other board reference; the fab zip
  sha256 is a808f1..9d (computed). A first accept had pinned the commit
  time, 1791969993, at build 225cb4..5a; the gerbers of the two differ in
  their creation date line only and the reparse report is equal
  (computed). Accepted under owner delegation; a person has not accepted
  them (D-152).
- 2026-10-14: the parsed gerbers drawn by tools/py/board/render_parsed.py
  were looked at by an agent, not a person: the B.Cu 5V trace at y 20.00
  carries its two 5V vias and no other, the pour clear runs along it,
  and the pour runs on past both ends of the trace; the front
  silk reads "R2  hack.build".

### Measured on a printed body

- None. No R2 board has been fabricated.

### Checked by machine on geometry

- `npx --no-install hbf parity reference/boards/spindle-r2`: build.json,
  report.json, the fab zip sha256 in artifacts.json and the CHK-BRD-01
  reparse report equal the goldens in `expected/` (computed). The CI
  parity job runs it with every other reference (not yet run on a hosted
  runner).
- The exit-m06-m08 job in `.github/workflows/ci.yml`: part.build must exit
  1 failing CHK-BRD-06 and CHK-BRD-09 only, and `check.run --only
  CHK-BRD-01,CHK-BRD-21` must exit 0 (run locally, not yet run on a hosted
  runner).
- No vitest or pytest file reads R2. The board writer, reparse and KiCad
  tests run on reference/boards/spindle-r1, whose generator R2 copies.

### Not verified by anything

- Fab viewer load, a KiCad session opening the export, CPL rotations
  against an assembler library, and the hand pads against vendor land
  patterns, as for R1.
- The owner's acceptance of R2 as a revision; the owner may fix R1
  another way (D-249).
