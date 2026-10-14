# boards wiring-supermini

The wiring drawing of the SPINDLE R1 module: an ESP32-C3 SuperMini with its
14 used pads (M08-T13). It is the reference for the `wiring` exporter
(fabrication false): build.ts names the catalog row and the pin use from
the SPINDLE README pin map, core reads every pad position from the row
through `catalog.pins`, and packages/wiring draws it with the PIP drawing
rules (pip-controller bench/part2.js lines 352 to 405).

## Scope

- Module `esp32c3-supermini`, tier vendor (its pads parse from the
  committed `supermini.kicad_mod`, D-096); board 22.52 x 18 mm (vendor).
- Used: motor X on GPIO 0, 1, 3, 4 (J1 IN1 to IN4), motor Y on GPIO 5, 6,
  7, 10 (J2), the laser gate on GPIO20, the calibration sensor on GPIO2,
  the spare on GPIO21, and 5V, GND, 3V3. GPIO8 and GPIO9 are drawn unused.
  Source: `fab-work-directory:benches/spindle/outputs/spindle/README.md`,
  "Pin map (verified against the module silkscreen)".
- No wire ends: SPINDLE routes copper, so the drawing shows the module's
  pin use only.
- `hbf export.run reference/boards/wiring-supermini --kind wiring` writes
  `.hbf/out/wiring-supermini/wiring-supermini-wiring.svg` and stores it;
  no prompt (the export is a design document).

## What is in this folder

| file | what |
|---|---|
| `chase.ts` | the chase: kind board, one export, wiring |
| `build.ts` | the WiringDraft: catalog id and the 14 used pins with their functions |
| `expected/` | parity goldens: build.json (buildHash over the chase, the draft and the resolved pins; the board, its tier and the WiringReport) and artifacts.json (the drawing's sha256) |

## What is verified, and what is not

### Verified on this machine

- 2026-10-13 (D-185): chase.ts declares CERN-OHL-W-2.0, was CC-BY-SA-4.0.
  `npx --no-install hbf parity reference/boards/wiring-supermini --accept` re-recorded
  the goldens at build 794821..65 (was 92f576..99). Only build.json (buildHash only) moved;
  every other golden is byte equal, so no mesh hash or volume moved
  (computed). A person accepts them (D-152); not run.

- 2026-10-09 (M08-T13): `npx --no-install hbf parity
  reference/boards/wiring-supermini` exits 0 at build 92f576..99 against
  the goldens the builder accepted for that card; a person accepts them at
  M08-T15 (D-152). The drawing was rendered in headless Chrome and looked
  at: 16 pads, 14 pink with their functions, GPIO8 and GPIO9 gold.

### Measured on a printed body

- None. The drawing is a document; nothing is printed.

### Checked by machine on geometry

- `core/test/wiring-export.test.ts`: one SVG artifact, kind wiring, no
  gate; every GPIO of the SPINDLE README pin map (read from that README,
  not from build.ts) drawn pink and labelled with its function; GPIO8 and
  GPIO9 gold.
- `packages/wiring/test/wiring.test.ts`: the report and the drawing rules
  on the committed `catalog.pins` answer.

### Not verified by anything

- The drawing against the SuperMini silkscreen by a person holding one,
  and the colours against the design system (M09 maps the tokens).
