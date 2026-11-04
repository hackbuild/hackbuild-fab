# seats pico-pressfit

The reference for the `pico-seat` archetype (D-667): PIP's press seat with
bump contacts holding a Raspberry Pi Pico, in a PETG body with the PIP buried
stack.

The seat is the same code as `rp2040-zero-seat` (pip.md 5.7, src/pip/seat.ts).
The board sits component side up over conductive PLA bumps under its used
castellations, USB toward the notch in the cable edge; every other castellation
lands on bare PETG. The pads are the catalog row's KiCad footprint
(`packages/catalog/data/modules/pico/pins.json`, resolved from
`RaspberryPi_Pico_Common_THT` by `tools/catalog/resolve-pins.mjs`), 20 a
column at 17.78 mm. The body is 32 by 62 mm; its top is left to the seat
(9.6 mm, the pocket need snapped up a layer, computed).

covers: ['archetype:pico-seat']

| file | what it holds |
|---|---|
| `chase.ts` | the literal: body width, depth and top (0 leaves the top to the seat) |
| `build.ts` | the seat through `Author.arch`, the body standing on its cable edge up to the seat's host top, the seat's warnings passed on |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/seats/pico-pressfit --accept` at SOURCE_DATE_EPOCH 315532800; `edit.json` was written once by hand (no param carries a constraintDim) with the edit W 32 to 36 |

## Goldens

- Used pads: GND (pad 3), GPIO2 to GPIO5 (pads 4 to 7) and 3V3 (pad 36), the
  archetype's default map; a slot is cut between neighbouring used pads on one
  column, as PIP cuts them.
- Host top 9.6 mm, board underside 5.28 mm, cable edge 26.5 mm from the board
  centre (computed): the board's USB end at 25.5 plus the 1.0 mm overhang.
- One warn, CHK-PRT-05: 14 faces at 7.080078 mm, off the layer grid by 0.11
  mm. The RP2040-Zero reference carries the same finding at the same height,
  so it is the seat's stack, not the Pico.
- The build warns USB_INFERRED: the micro-USB height (3.0 mm) and overhang
  (1.0 mm) are inferred.

## What is verified, and what is not

### Verified on this machine

- 2026-11-03: `npx --no-install hbf parity reference/seats/pico-pressfit`
  exits 0 at build 15334c..27 against the goldens written that day (the first
  goldens of this reference). The RP2040-Zero seat's references hold parity
  after the seat took a board descriptor (rp2040-zero-pressfit f88493..61,
  midi-pad 23ed1b..45, computed).

### Measured on a printed body

Nothing. The seat has not been printed and no Pico has been pressed into it.

### Checked by machine on geometry

- The pad centres equal the KiCad footprint's
  (`packages/catalog/test/resolved-pins.test.ts`); pad 1 at (-8.89, 24.13) and
  pad 40 at (8.89, 24.13) mm, USB toward +y.
- A top and an iso render looked at by an agent: five bumps on the left column,
  one on the right level with pad 5, the notch at the USB end. That is an
  agent's look, not a person's (D-154).

### Not verified by anything

- The micro-USB height and overhang, which set the pocket depth and the cable
  edge: inferred, with no Pico drawing or STEP in the repo. Measure one board.
- Whether a Pico's castellations seat on 0.48 mm bumps and conduct through
  the cPLA path: the RP2040-Zero seat's path is the evidence, not this
  board.
- A slice, a print and a person looking at the render.
