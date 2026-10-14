# boards wiring-tang-r5

TANG R5's wiring on a Teensy 4.0, the M08 wiring parity target the owner
picked (MILESTONES.md 1.4; knowledge/designs/tang-r5.md section 4.9a). The
original is `tang_r5_wiring.html` (2026-08-21, sha256 1b4f1347...3cf3331,
copy at `fab-knowledge:originals/tang-r5/files/tang_r5_wiring.html`).
build.ts declares the pin map its net list states; core draws it from the
`teensy40-pjrc` catalog row with packages/wiring.

## Scope

- Module `teensy40-pjrc`, tier vendor: pin names and order from the PJRC
  Teensy 4.0 pinout card (front, rev 2), board 35.56 x 17.78 mm, pitch
  2.54 and the 1.27 row inset from the PJRC dimension drawing, both fetched
  2026-10-09 and kept with their sha256 under
  `fab-knowledge:evidence/m08-close/pjrc/`.
  The board outline is drawn centred on the pin array; the drawing does
  not dimension that offset (inferred, drawing only). The five end pads
  and the bottom pads are not in the row.
- Pin map: SNS on 14 (A0); P1 to P6 on 0 to 5; MODE, TUNE and LEVEL on
  16, 17, 18 (A2 to A4); MAX98357A DIN on 7, LRC on 20, BCLK on 21, VIN on
  Vin, GND on GND; 3V3 from 3.3V for the 47k on SNS and the pot legs.
- Left out: the SF23-600 film. Its pins depend on panel A or B, which a
  person picks after one meter reading (the original's own instruction).
- Wire ends are drawing layout in mm of the module frame, not positions
  on a board: the original lays its parts out on the page.

## What is in this folder

| file | what |
|---|---|
| `chase.ts` | the chase: kind board, one export, wiring |
| `build.ts` | the WiringDraft: catalog id, 16 used pins, 16 wire ends |
| `expected/` | parity goldens: build.json and artifacts.json, as for wiring-supermini |

## What is verified, and what is not

### Verified on this machine

- 2026-10-13 (D-185): chase.ts declares CERN-OHL-W-2.0, was CC-BY-SA-4.0.
  `npx --no-install hbf parity reference/boards/wiring-tang-r5 --accept` re-recorded
  the goldens at build 99094b..d7 (was fdadd6..da). Only build.json (buildHash only) moved;
  every other golden is byte equal, so no mesh hash or volume moved
  (computed). A person accepts them (D-152); not run.

- 2026-10-09 (M08-T13): `npx --no-install hbf parity
  reference/boards/wiring-tang-r5` exits 0 at build fdadd6..da against
  the goldens the builder accepted for that card; a person accepts them at
  M08-T15 (D-152). The drawing was rendered in headless Chrome and looked
  at: 28 pads, 16 pink, every end reaches its pad. The first render drew
  both GND pads on the right column (the renderer placed pads by name);
  the pin column test caught it and pads are now placed by index, which
  moved artifacts.json and nothing else.

### Measured on a printed body

- None. The drawing is a document; nothing is printed.

### Checked by machine on geometry

- `core/test/wiring-export.test.ts`, parity with the original: the 15
  Teensy pin and net pairs its net list and its pot labels state (counted
  from the html, never from build.ts) equal the WiringReport's, with the
  3.3V rail beside them; no end unmatched; the original's 28 Teensy pin
  labels equal the catalog row's pin names; every net label of the
  original's Teensy side appears on the drawing; the drawing prints the
  row tier vendor.

### Not verified by anything

- The pin positions against a Teensy 4.0 on the bench, the film wiring
  of either panel, and the colours against the design system (M09).
