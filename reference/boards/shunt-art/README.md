# boards shunt-art

SHUNT R1, the KevinCon counterfeit Jumperless: a deliberately
non-functional art board whose fab set is real (knowledge/designs/shunt.md).
It is the M08 reference for the direct route on an art board and for the
expect sets of D-074. Non-functional by design; ships with no cell in BT1
and DO NOT APPLY POWER on silk.

covers: [CHK-BRD-01, CHK-BRD-02, CHK-BRD-03, CHK-BRD-05, CHK-BRD-09, CHK-BRD-19, CHK-BRD-21]

## Scope

- `gen.py` reads only the committed `board.json` (byte equal to the
  canonical SHUNT R1 file), runs the geometry gates G1 to G6 of
  gen_board.py and on a pass writes the fab set of gen_fab.py: 9 gerber
  layers, PTH and NPTH Excellon and the zip, into `.hbf/out/shunt-art/`
  with `record.json` and `gates.json`. The BOM and the CPL at body centres
  come from packages/board's writers on the record (M08-T12); the CPL
  equals the shipped shunt-CPL.csv line for line (LF where gen_fab.py
  wrote CRLF). The BOM drops the BB1 breadboard row, which is no placed
  part.
- The UV art and the fab preview SVGs of gen_fab.py are not written.
- board.json carries nets per part, never per pad. gen.py derives pad
  nets by one stated rule (a one-net list names every pin; otherwise the
  k-th pin takes the k-th net and pins past the list are no-connect), every
  net of board.json is a record net, and each deliberate short of
  board.json `defects` is a declared bridge with its reason. Its 24 vias
  carry no net and stay out of the record (the fab set holds them).
- G7, the inverted electrical gate, is two expect sets in chase.ts
  (D-074): CHK-BRD-21 expects the five shorts, CHK-BRD-09 the five
  floating nets.

## What is in this folder

| file | what |
|---|---|
| `chase.ts` | the board chase |
| `build.ts` | names the backend and the generator |
| `gen.py` | gates G1 to G6 and the fab writers on the direct library |
| `board.json` | the SHUNT R1 source of truth, 168560 bytes (counted) |
| `models.json` | lead positions and bounds of the ten KiCad .wrl models, numbers only, from tools/py/board/model_leads.py (the models stay outside the repo) |
| `allow.json` | the declared lead allowance: SW2 up to 0.12 mm, the formed leads of SW_PUSH_6mm |
| `expected/` | parity goldens: build.json, report.json, artifacts.json, reparse.json |

## What is verified, and what is not

### Verified on this machine

- 2026-10-13 (D-185): chase.ts declares CERN-OHL-W-2.0, was CC-BY-SA-4.0.
  `npx --no-install hbf parity reference/boards/shunt-art --accept` re-recorded
  the goldens at build 976f6a..7a (was 701b35..ea). Only build.json (licence, defHash, buildHash) moved;
  every other golden is byte equal, so no mesh hash or volume moved
  (computed). A person accepts them (D-152); not run.

- 2026-10-11 (M06 and M08 integration): `npx --no-install hbf parity
  reference/boards/shunt-art` exits 0 at build 701b35..ea against the goldens in
  `expected/` (computed). A person accepts them (D-152); not run.

- 2026-10-09 (M08-T12): parity exits 0 against the goldens the builder
  re-accepted when the record gained pad nets, nets, bridges, slots, silk,
  MPN and note (board.nets 0 to 14) and CHK-BRD-02, -03, -05 and -21 began
  to run; the fab zip's sha256 did not move. A person accepts them
  (D-152); not run. `hbf check.run reference/boards/shunt-art --only
  CHK-BRD-21` passes the shorts expect set: measured ANALOG, BOOT, ENC,
  N8V|P8V, NANO, exactly the declared five (computed). The floating-nets
  expect set fails: CHK-BRD-09 measures the nets with fewer than two
  members, ENC, MAGIC, PROBE, RF_OUT and VBUS, against the declared GND?,
  MAGIC, MATRIX, PROBE and VIBES (missing GND?, MATRIX, VIBES; extra ENC,
  RF_OUT, VBUS). SHUNT's floating means no source drives the net, which no
  registered check measures; the card records the owner question. BT1 on
  the back passes CHK-BRD-03 by declaration (pads at x +/-14.68 map onto
  themselves). The full check.run exits 1 on that set and on CHK-BRD-06
  (every body inferred).

- 2026-10-09 (M08-T09): `npx --no-install hbf parity
  reference/boards/shunt-art` exits 0 at build 85d2b3..74 against the
  goldens the builder re-accepted when gen.py began to write the
  placements and CHK-BRD-19 began to run; a person accepts them at M08-T15
  (D-152). `hbf check.run reference/boards/shunt-art --only CHK-BRD-19`
  exits 0: lead landings 55 at 0.000 mm, 4 within the declared allowance,
  3 declared stand-ins, 28 parts, 10 real models (computed), the
  check3d_shunt.mjs figures. A copy with U1 rotated 90 degrees exits 1:
  "U1: lead lands 7.620 mm from the nearest through pad (at 109.620,
  91.620), and 5 more" (computed, scratch copy).
- 2026-10-09 (M08-T08): parity exited 0 at build 0522f1..1e when
  CHK-BRD-22 joined the board checks.
- 2026-10-09 (M08-T07): parity exited 0 at build dfce4b..a8. The reparse gives the check_fab.py
  numbers of the M08 Records table: 9 gerber layers and 2 drill files, F_Cu
  pads 101 of 101, B_Cu 61 of 61 (2 own, 59 through), drills 83 of 83
  within 1 um, worst 0.0000, F silk 164453 vertices with 0 missing and 0
  unexpected and 2030 shared with the mirrored variant, B silk 40241 with
  978 shared, back ink box 8.04 to 145.95 mm, slot 104 contour points at
  (77, 104), 4 NPTH at 3.20 mm (computed).
- 2026-10-09 (M08-T06): parity exited 0 at build a1b80a..33; the gates
  print `geometry gates: PASS (0 warnings)`, as the legacy gate output did
  (computed).

### Measured on a printed body

- None at this repo. The owner's fab order is outside this record.

### Checked by machine on geometry

- `tools/py/board/test/test_reparse.py`: the check_fab.py numbers above.
- `packages/checks/test/brd19.test.ts`: the landing figures, a part
  rotated 90 degrees, the allowance removed (SW2 at 0.088 and 0.112 mm), a
  header missing a through pad and a model removed each fail.
- `tools/py/board/test/test_direct.py`: the gates pass on the committed
  board.json, and a copy with one via off the board fails G1 with
  `gates failed: 1. Nothing written.` and writes no file.

### Not verified by anything

- The floating-nets half of G7 (above). The viewer probe of
  M08-T09 step 4 did not run: it needs Playwright 1.63, which refuses
  macOS 12 on this machine. Pad tables against vendor land patterns, CPL
  rotations against an assembler library, and a fab's own viewer.
