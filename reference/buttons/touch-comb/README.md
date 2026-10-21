# buttons/touch-comb

The touch-comb-key archetype (M06-T08, M06-T09) at PIP defaults on a 30 x 30
mm PETG body with PIP's buried stack and two leads to edge clip pads.
Original of record: `originals/pip/files/haft-src/src/model.js` lines 113 to
136 and layout.js line 381 (pip.md 5.3).

## Made the way the original makes it

| rule (pip.md 5.3) | where it lands | test |
|---|---|---|
| PETG boss from the body top through the bezel | touchApply | PETG left out of parity (bodies differ) |
| comb disc rc = d / 2 - rim, finger drawn finger - bleed, pitch finger + gap | touchCombs | per-slot cPLA volume within 1e-3 mm3 (bleed 0 and 0.15) |
| a finger the disc would cut off its spine is left out | touchCombs | finger count equals the original's btnInfo (4, computed) |
| each comb one region: spine and fingers clipped by the disc | leftComb | per-slot cPLA volume |
| spine posts from the floor to the comb | touchApply | per-slot cPLA volume |
| three fits rows | touchFits | by name, value and ok |

## Deviations, each named

- No hookup row: circuit's pressed path needs a contact feature, and skin
  across the comb gap is no contact kind (M06-T08 finding). The read is
  charge-release with TOUCH_WAIT_US 1500 in `expected/firmware.ino`.
- CHK-PRT-05 warns, as for buttons/flex-cone.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/buttons/touch-comb`
  exits 0 at build 0cfb37..1d against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/buttons/touch-comb`
  exits 0 at build 2fef61..00 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T09): `npx --no-install hbf parity reference/buttons/touch-comb`
  exits 0 at build 8ca47b..a5 against the goldens in `expected/` (computed).
- 2026-10-09 (M06-T09): `npx vitest run reference/buttons/touch-comb` exits
  0: the three touch fits rows equal the original's and the comb keeps the
  original's 4 fingers (computed).
- 2026-10-09: `npx --no-install hbf check.run reference/buttons/touch-comb`
  exits 0: 27 pass, 1 warn (CHK-PRT-05), 0 fail (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- Not sliced. No print; skin resistance and the 1500 us wait are inferred.
- No hookup row, so circuit.solve prices no touch path here (see Deviations).
