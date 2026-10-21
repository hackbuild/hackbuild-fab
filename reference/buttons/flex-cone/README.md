# buttons/flex-cone

The flex-cone-key archetype (M06-T08, M06-T09) at PIP defaults, placed by
`build.ts` through `Author.arch` on a 30 x 30 mm PETG body with PIP's buried
stack, two leads on trace layer 1 to clip pads at the body edges. Original of
record: `originals/pip/files/haft-src/src/layout.js` flexDims (lines 149 to
160) and `model.js` lines 63 to 88 (pip.md 5.1); the keys flex-pair
reference ports the same lines (D-223).

## Made the way the original makes it

| rule (pip.md 5.1) | where it lands | test |
|---|---|---|
| flexDims: wall, cone base, gap, key height, column radius, well | `packages/archetypes/src/pip/flex.ts` flexDims | pip-buttons.parity: keyH 8.577, rsb 5.940, wallH 0.783 (computed) |
| key floor snapped so the face stands protrude above the bezel | flexZ | parity volumes at the original's body top 13.68 (computed) |
| split column halves, stubs, terminal posts and discs | flexApply | per-slot cPLA volume within 1e-3 mm3 (bleed 0 and 0.15) |
| cone and foot ring as one lathe, kinks EZ inside the well | flexApply | per-slot TPU volume within 1e-3 mm3 |
| cTPU cap disc rnt + 0.3, cap thickness | flexApply | per-slot cTPU volume within 1e-3 mm3; CHK-KEY-02 |
| six fits rows | flexFits | pip-buttons.parity and test/reference.test.ts, by name, value, ok |
| switch resistance through the cap | flexSwitch | equals the original's Rsw row (computed, inferred rows) |

## Deviations, each named

- Volumes are compared before the kernel's D-054 snap and D-070 inset; the
  built bodies carry both.
- The read is charge-release with KEY_WAIT_US 3500 (D-079), not pip.ino's 200
  (D-080); `expected/firmware.ino` holds the stub.
- CHK-PRT-05 warns: the stack keeps PIP's 0.72 mm slabs on the ffc5p grid
  (first layer 0.25), as reference/electrical/pip-buried-route does.

## Virtual print (computed, not printed)

Sliced 2026-10-09 by `tools/slice/slice.mjs --design reference/buttons/flex-cone`
(Orca-Flashforge 2.3.2, fresh datadir, TPU slots mapped to Generic TPU-95A
@FF C5P, inferred stand-in) and read by `tools/py/gcode/analyze.py`: 0 foreign
deposits, 0 deposits in air, 0 cPLA components joining two nets, both leads
reach their column tops, 0 features dropped; 56 layers, 45 tool changes,
31 m 5 s and 8.42 g by the slicer's estimate. Evidence:
`fab-knowledge:evidence/m06-arch/vprint-flex-cone/`.
A person has not looked at the render yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/buttons/flex-cone`
  exits 0 at build 5c94b4..49 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/buttons/flex-cone`
  exits 0 at build 372ea9..50 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T09): `npx --no-install hbf parity reference/buttons/flex-cone`
  exits 0 at build 51d7fa..6b against the goldens in `expected/` (computed).
- 2026-10-09 (M06-T09): `npx vitest run reference/buttons/flex-cone` exits 0:
  the six flex fits rows equal the original's by name, value and ok, the
  readouts 1.80, 8.577, 5.940 and 0.783 mm hold, and `expected/firmware.ino`
  carries KEY_WAIT_US 3500 and TOUCH_WAIT_US 1500 (computed).
- 2026-10-09: `npx --no-install hbf check.run reference/buttons/flex-cone`
  exits 0: 32 pass, 2 warn (CHK-PRT-05 off the 0.25 first layer grid,
  CHK-NET-29 with four contacts unpriced), 0 fail; CHK-KEY-01, -02, -03 and
  CHK-NET-27 pass (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- The virtual print above (computed from the slicer's G-code).

### Not verified by anything

- No print. Force, travel and contact resistance of a printed key: unknown.
- The cone and cap meshes have not been rendered and looked at by a person.
