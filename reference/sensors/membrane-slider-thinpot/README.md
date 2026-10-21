# sensors/membrane-slider-thinpot

The membrane-slider-thinpot archetype (M06-T09) at the THINPOT original's
defaults, placed by `build.ts` through `Author.arch` on the bed: a 100 x 12
mm printed membrane potentiometer, its membrane and collector strip in the
original's print pose beside the base. Original of record:
`originals/thinpot/files/feeler_thinpot.html` archetype `thinpot` (lines
4022 to 4210, thinpot.md 4.5).

## Made the way the original makes it

| rule (thinpot.md 4.5) | where it lands | test |
|---|---|---|
| track width profile wAt(u), 48 segments, R integrated per segment | `packages/archetypes/src/thinpot/strip.ts` thinpotBuild | thinpot.parity: R end to end, per mm and at 25, 50, 75 percent equal the page's readouts (linear and log, collector and cTPU sheet) |
| terminals at the near end in one row: T1 down the lane, T3 round the +X side, T2 a boss at rim height | thinpotBuild | per-part track volume within 1e-3 mm3 of the page's union |
| base, full-height side rails, end rails split around the trace gap and bridged by an upper slab | thinpotBuild | per-part base volume within 1e-3 mm3, bounding box within 1e-6 mm |
| membrane in 40 segments with the tail over the boss, collector strip flush in its underside, posed flipped beside the base | thinpotBuild, src/thinpot/parts.ts (pose as posedMesh) | membrane and collector strip volumes and posed boxes |
| contact model, patch area pi (1.5 sqrt(F / 2))^2 | thinpotBuild on the profile cTPU row | the page's "contact R at 2 N" readout at its own rhoZ |
| fits: membrane travel 0.2 to 3, tail over the boss 2 to 20 | thinpotBuild | both rows equal by name, value and ok |

## Deviations, each named

- Resistances read the profile rows (cPLA along, cTPU bulk; D-098), not the
  page's materials table (cPLA 15, CTPU rhoZ 3500 ohm cm); the parity test
  passes the page's values in memory and the reference test scales back.
- The layer is the ffc5p preset's 0.24 mm; the page prints at 0.2. The
  legacy record evaluates the page at both; the reference is held to 0.24.
- apply() emits bodies and readouts; no conductor, contact or port features
  yet, so no net check runs on this reference.
- Volumes are compared before the kernel's D-054 snap and D-070 inset.

## Virtual print (computed, not printed)

Sliced 2026-10-10 by `tools/slice/slice.mjs --design reference/sensors/membrane-slider-thinpot`
(Orca-Flashforge 2.3.2, fresh datadir, TPU slots on Generic TPU-95A @FF C5P,
an inferred stand-in) and read by `tools/py/gcode/analyze.py`: 0 regions
printed by another tool, 0 deposits in air, 0 cPLA components joining two
nets, 0 features dropped; 13 layers, 10 tool changes, 37 m 56 s and 14.8 g by
the slicer's estimate. The lead-reach row reads no because the analyzer keys
on flex-pair's contact ids. Evidence: `fab-knowledge:evidence/m06-arch2/thinpot/vprint-membrane-slider-thinpot/`.
A person has not looked at the render yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/sensors/membrane-slider-thinpot`
  exits 0 at build 4bcb9d..a2 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/sensors/membrane-slider-thinpot`
  exits 0 at build 2c64a8..d5 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-10 (M06-T09): `npx --no-install hbf parity reference/sensors/membrane-slider-thinpot`
  exits 0 at build f71bdf..08 against the goldens in `expected/` (computed).
- 2026-10-10: `npx --no-install hbf check.run reference/sensors/membrane-slider-thinpot`
  exits 0: 13 pass, 1 warn (CHK-PRT-05, the page's 0.6 mm slabs off the 0.25
  first layer grid), 0 fail; CHK-PRT-01, -03, -13 and CHK-3MF-06, -07 pass (computed).
- 2026-10-10: `npx vitest run reference/sensors/membrane-slider-thinpot`
  and `npm test -w packages/archetypes -- thinpot.parity` exit 0 (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- No print. Track resistance, contact resistance and feel: unknown.
- The meshes have not been rendered and looked at by a person.
