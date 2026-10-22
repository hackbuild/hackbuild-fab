# seats/rp2040-zero-pressfit

The rp2040-zero-seat archetype (M06-T09) in press mode with bump contacts at
PIP defaults, placed by `build.ts` through `Author.arch` on a 30 x 34 mm PETG
body with PIP's buried stack, the body's +y edge at the cable edge (usbOver
0.8 mm past the board's USB end) and its top at PIP's default 13.68 mm.
Original of record: `originals/pip/files/haft-src/src/model.js` lines 180 to
248 and `layout.js` zeroPads (lines 10 to 21), the board placement (177 to
184) and the used pins (393 to 417), pip.md 5.7.

## Made the way the original makes it

| rule (pip.md 5.7) | where it lands | test |
|---|---|---|
| 23 castellations on one 2.54 grid inset 1.38 (zeroPads) | `packages/archetypes/src/pip/seat.ts` zeroPads | pip-seat.parity: names, edges, numbers and centres equal the original's and the catalog module's |
| used pads are PIP's pin map plus GND and 3V3 | usedPads | pip-seat.parity: nets and bump centres equal the original's 12 bumps |
| stand bumpH, or pinLen + headerT for sockets; pocket need snapped up a layer | seatZ | pip-seat.parity: board rows at tops 13.68, 14.64 and 14.88 |
| pocket board + clr each side, past the cable edge, from the floor | seatApply | PETG in both boxes within 1e-3 mm3 |
| back window two layers into the floor, 1.3 in from the pad rows | seatApply | PETG in both boxes within 1e-3 mm3 (windowEnd 0.4) |
| USB notch 12.5 wide from max(pad layer + layer, USB centre less 3.6) | seatApply | the USB opening rows 9.36, 10.32 and 7.20 mm |
| one bump per used pad, (bumpW + 0.2 - bleed) / 2, floor to floor + bumpH, over a routed terminal | seatApply | cPLA in both boxes within 1e-3 mm3 at bleed 0 and 0.15 |
| or a socket per used pad, bored from floor + 0.72 | seatApply | cPLA in both boxes within 1e-3 mm3, socket at bleed 0 and 0.15 |
| anti-smear slot between neighbouring used contacts on one edge | seatApply | PETG in both boxes |
| datum packers and the grip ledge, added after the pocket | seatApply | PETG in both boxes |
| the board fits rows | seatFits | pip-seat.parity and test/reference.test.ts, by name, value and ok |

## Deviations, each named

- The back window stops at the USB notch (windowEnd 0.3). PIP stops it 0.1
  mm short (model.js line 194 against line 197), leaving a PETG fin 0.1 mm
  thick and 0.48 mm tall across the notch below the floor that no slicer
  prints (computed). windowEnd 0.4 regenerates the original; the parity test
  runs there and checks the fix removes exactly 0.1 x 12.64 x 0.48 mm.
- The bezel's press ribs (model.js lines 313 to 319) belong to the bezel,
  which stays with the PIP design (M10); only the squeeze is a fits row.
- Wire mode and its cups are not ported (the cup claim is retired, D-096).

## Virtual print (computed, not printed)

Sliced 2026-10-10 by `tools/slice/slice.mjs --design reference/seats/rp2040-zero-pressfit`
(Orca-Flashforge 2.3.2, fresh datadir) and read by
`tools/py/gcode/analyze.py`: 0 regions of a body printed by another tool, 0
deposits in air, 0 cPLA components joining two nets, 0 regions touching two
nets in a layer, every lead reaches its bump through deposited cPLA, 0
features dropped; 57 layers, 20 tool changes, 22 m 33 s and 7.73 g by the
slicer's estimate. Evidence:
`fab-knowledge:evidence/m06-unblock/vprint-seats-rp2040-zero-pressfit/`.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/seats/rp2040-zero-pressfit`
  exits 0 at build f88493..61 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/seats/rp2040-zero-pressfit`
  exits 0 at build 7ea745..d2 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/seats/rp2040-zero-pressfit`
  exits 0 at build 8388e3..44 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-10 (M06-T09): `npx --no-install hbf parity reference/seats/rp2040-zero-pressfit`
  exits 0 against the goldens in `expected/`, build 5bd2f8..06, accepted at
  SOURCE_DATE_EPOCH 315532800 and rerun equal at 1000000000 (computed).
- 2026-10-10: `npx --no-install hbf check.run reference/seats/rp2040-zero-pressfit`
  exits 0: 134 pass, 1 warn (CHK-PRT-05, PIP's 0.72 slabs off the 0.25
  first layer grid), 0 fail, 105 skip (computed). CHK-PRT-04 2.0.0 measures
  walls per z band: the back window opens onto the cable edge through the
  USB notch it touches, and the anti-smear slots join the board pocket over
  the 0.1 mm they share, so neither is a wall.
- 2026-10-10: `npx vitest run reference/seats/rp2040-zero-pressfit` exits 0
  (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- `packages/archetypes/test/pip-seat.parity.test.ts` holds the pad table,
  used pads, fits rows and the PETG and cPLA volumes about the pocket to
  the original's record (`test/legacy/pip-seat.json`) within 1e-3 mm3.

### Not verified by anything

- No print. Press fit, bump contact and the USB plug clearance on a printed
  seat: unknown.
- The meshes have not been rendered and looked at by a person.
