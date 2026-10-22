# sensors/rotary-pot

The printed-rotary-pot archetype (M06-T09) at TANG R6 defaults: one pot's
tracks on the underside of a PLA plate one TANG face thick (13 layers),
printed pad side down as the original prints its face, so the tracks lie in
the top three layers and the stop block stands on top; the conductive TPU
rotor prints flat beside the plate. Originals of record:
`originals/tang-r6/files/src/04_design.js` lines 194 to 231 (tracks), 369
to 374 (stop) and 413 to 420 (L1 split), and `05_design.js` D.buildRotor
(lines 97 to 121), r6_4 (tang-r6.md 4.4).

## Made the way the original makes it

| rule (tang-r6.md 4.4) | where it lands | test |
|---|---|---|
| arc gap centred south, arc 300 deg of r 6.5, 1.0 wide, 64 segments | `packages/archetypes/src/tang/pot.ts` potGeometry (arcBand) | tang.parity: cTPU slot volume and bbox |
| collector r 9.5, 2.0 wide, 270 deg | potGeometry | tang.parity: cPLA slot |
| end stubs radial from inside the arc to the 3V3 and GND buses, square ends | potGeometry (strokeSquare, Clipper rounding) | tang.parity: cPLA slot |
| arc ends: lower two layers arc material, upper layer a cPLA pad on the bus net | potApply: the arc less the stubs over the upper layer; the stub over all three, cut by the arc's role priority | tang.parity: cPLA and cTPU slots |
| wiper lead north, 3 mm past the collector | potGeometry | tang.parity: cPLA slot |
| stop block r 11.9 to 13.9 over 98 deg, 2.4 deep | potGeometry | tang.parity: stop |
| rotor: spider of a 32-gon hub and three arms, core square out, four bumps, PLA core, hub and D shaft | potGeometry, unionRings (Clipper's micron rounding) | tang.parity: rotor cTPU and PLA |
| preload = bump top less hub top, 0.48 | potReadouts | tang.parity; test/reference.test.ts |
| arc 709040 ohm at 1500 ohm cm; leaf about 0.49 N; bump margins 0.50 and 1.00 | potReadouts | tang.parity (original rows in memory) |

## Deviations, each named

- Volumes are compared before the kernel's D-054 snap and D-070 inset.
- The knurled cap (D.buildCap) is TANG's knob, outside the canon row, and is
  not ported: its twelve Clipper differences round their crossings in a way
  this port does not reproduce (0.0145 mm3 off, computed).
- The shipped profile prices the arc at the cTPU working row and the leaf at
  the profile TPU 95A modulus; tang.parity holds both to TANG's 1500 ohm cm
  and 30 MPa with those rows in memory.
- No lead runs from a stub to the plate edge: a lead overlapping the 3V3
  stub's square end at its 60 deg angle, with the stop block or the arc on
  the plate, failed the stage 8 union audit (E_KERNEL, degenerate triangles,
  finding). The clip pads sit at the stub and wiper ends, where the
  original's buses meet them.
- CHK-PRT-05 warns: off the 0.25 first layer grid, as other references do.

## Virtual print (computed, not printed)

Sliced 2026-10-09 by `tools/slice/slice.mjs --design reference/sensors/rotary-pot`
(Orca-Flashforge 2.3.2, fresh datadir, both TPU slots on Generic TPU-95A
@FF C5P, inferred stand-in) and read by `tools/py/gcode/analyze.py`: 0
regions printed by another tool, 0 deposits in air, 0 cPLA components
joining two nets, 0 features dropped; 59 layers, 18 tool changes, 23 m 46 s
and 6.42 g by the slicer's estimate. Evidence:
`fab-knowledge:evidence/m06-arch2/tang/vprint-rotary-pot/`.
A person has not looked at the render yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/sensors/rotary-pot`
  exits 0 at build d0bec9..6a against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/sensors/rotary-pot`
  exits 0 at build 3290a8..ee against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/sensors/rotary-pot`
  exits 0 at build 299b38..cd against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T09): `npx --no-install hbf parity reference/sensors/rotary-pot`
  exits 0 at build 076d9a..2d against the goldens in `expected/`, accepted
  at SOURCE_DATE_EPOCH 315532800 (computed).
- 2026-10-09: `npx --no-install hbf check.run reference/sensors/rotary-pot`
  exits 0: 0 fail, 1 warn (CHK-PRT-05); CHK-NET-02, CHK-NET-13 and
  CHK-PRT-03 pass (computed).
- 2026-10-09: `npx vitest run packages/archetypes/test/tang.parity.test.ts`
  and `reference/sensors/rotary-pot` exit 0 (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- No print. Wiper travel, contact and leaf force of a printed rotor: unknown.
- The plate and rotor meshes have not been rendered and looked at by a person.
