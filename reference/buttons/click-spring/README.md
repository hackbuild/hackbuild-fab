# buttons/click-spring

The click-spring-key archetype (M06-T08, M06-T09) at PIP defaults: the slot,
cap well, half pads and ribs in a 36 x 30 mm PETG body with PIP's buried
stack; the spring element (PETG, printed flat, cTPU tip in its dovetail) and
the TPU cap (flange down) printed beside the body, as PIP prints them.
Original of record: `originals/pip/files/haft-src/src/layout.js` clickerDims
(lines 81 to 97), `model.js` lines 89 to 112 and 366 to 390, `snapfe.js`
(pip.md 5.2). The FE curve comes from packages/sim through the solver core
registers (core/src/canon.ts).

## Made the way the original makes it

| rule (pip.md 5.2) | where it lands | test |
|---|---|---|
| SNAPFE_RIGID: lEff = max(4, l - sw / 2), nel 18, steps 56, dmax 2 | packages/sim clickRigid | reference test: peak 2.527 N, drop 0.765, cg 1.369 mm, eStop 0.0231 equal the original's record |
| contact cg = max(dPeak + 0.15, 0.85 dValley), strain to cg + 0.3 | packages/sim clickReadout | same |
| heights va, vb, stem, vTop; slot floor under the body top | clickerDims, clickZ | parity: vTop and slot floor equal the original's mech row |
| snug slot, relief over the arch, cap well of radius cap / 2 + flange + 0.4 | clickApply pockets | fits rows by name, value, ok |
| half pads split 0.6 + bleed | clickApply | per-slot cPLA volume in the cap well within 1e-3 mm3 |
| ribs under the end blocks | clickApply | PETG, not compared |
| eleven fits rows | clickFits | by name, value, ok |

## Deviations, each named

- No contact feature and no hookup row: the tip prints apart from the body,
  so no contact can name it in place (M06-T08 finding). The read is
  charge-release with KEY_WAIT_US 3500 in `expected/firmware.ino`.
- The spring and cap volumes are not compared with the original's print
  objects (not run).
- CHK-PRT-05 warns, as for buttons/flex-cone.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/buttons/click-spring`
  exits 0 at build f79925..aa against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/buttons/click-spring`
  exits 0 at build 9be099..77 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T09): `npx --no-install hbf parity reference/buttons/click-spring`
  exits 0 at build b584b1..93 against the goldens in `expected/` (computed).
- 2026-10-09 (M06-T09): `npx vitest run reference/buttons/click-spring` exits
  0: through the build and packages/sim the spring reads peak 2.527 N, drop
  0.765, contact 1.369 mm and eStop 0.0231, equal to the original's record,
  and the eleven click fits rows equal the original's (computed).
- 2026-10-09: `npx --no-install hbf check.run reference/buttons/click-spring`
  exits 0: 30 pass, 1 warn (CHK-PRT-05), 0 fail; CHK-KEY-04 passes at Q 2.0
  inside 1.72 to 2.19 (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- Not sliced. No print; no force has been on a gauge (unknown).
- The spring element and cap volumes against the original's print objects: not run.
