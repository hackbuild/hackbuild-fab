# sensors/membrane-slider-gib

The membrane-slider-gib archetype (M06-T09) at the GIB original's blank state with sense
membrane, placed by `build.ts` through `Author.arch` on the bed, each GIB
part one body, objects placed as the GIB export places them (part3.js lines
268 to 279). Original of record: `originals/gib/files/src/src/part2.js`
buildMembrane, physicsMembrane (lines 245 to 337 and 517 to 550, gib.md 4.5); canonical page `gib_4.html`.

## Made the way the original makes it

| rule (gib.md 4.1, 4.2, 4.4, 4.5) | where it lands | test |
|---|---|---|
| footprint contract: corner radius limited by the margin, thickness rounded to layers, the floor takes the rest | `packages/archetypes/src/gib/gib.ts` gibBuild | gib.parity: T and every warning equal the page's, including the narrowing warnings |
| three pads stacked across the near end, each on its own lane; A, track, far bar, return and B one conductor | gibBuild | per-part conductor volume within 1e-3 mm3, box within 1e-6 mm |
| holes jittered sub-micron so earcut never bridges on one y line (jit) | gibBuild | the recorded cases nudge 0 times; the test fails if one ever does |
| body: floor, band round the conductors 0.02 past T, pockets | gibBuild | per-part body volume and box |
| physics rows (track, return, bus or end resistance, source R, cap or press force, divider current) | gibBuild on the profile conductor row | every row equal as the page prints it at its own rho |
| membrane object flipped about its long axis and laid 8 mm past the body | gibApply | membrane and wiper boxes after the page's own moves |

## Deviations, each named

- Resistances read the profile conductor row (cTPU bulk 400 ohm cm,
  inferred) where the page reads the rho in its state (1500 ohm cm); the
  parity test passes the page's value in memory, the reference test scales.
- apply() emits bodies and readouts; no conductor, pad or port features yet.
- Volumes are compared before the kernel's D-054 snap and D-070 inset.

## Virtual print (computed, not printed)

Sliced 2026-10-10 by `tools/slice/slice.mjs --design reference/sensors/membrane-slider-gib`
(Orca-Flashforge 2.3.2, fresh datadir, both TPU slots on Generic TPU-95A @FF
C5P, an inferred stand-in for the conductive TPU too) and read by
`tools/py/gcode/analyze.py`: 0 regions printed by another tool, 0 deposits in
air, 0 conductor components joining two nets, 0 features dropped; 9 layers, 4 tool changes, 12 m 36 s and 2.27 g by the
slicer's estimate. Evidence: `fab-knowledge:evidence/m06-arch2/thinpot/vprint-membrane-slider-gib/`. A person has not looked at the
render yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/sensors/membrane-slider-gib`
  exits 0 at build 413dbf..0d against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (audit3 fixer round): `npx --no-install hbf parity reference/sensors/membrane-slider-gib`
  exits 0 at build 5cb41c..66 against goldens re-accepted after the GIB modulus fix put profile
  tpu95 into the read set: build.json moved profileHash and buildHash only and artifacts.json
  the 3mf hash; every mesh hash and volume and report.json and edit.json are unchanged
  (computed). The press to close readout is now 0.56 N, the page's 1.51 N scaled by tpu95's
  9.2 MPa over the page's 25 MPa (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/sensors/membrane-slider-gib`
  exits 0 at build 02e666..d5 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-10 (M06-T09): `npx --no-install hbf parity reference/sensors/membrane-slider-gib`
  exits 0 at build ff03b3..ed against the goldens in `expected/` (computed).
- 2026-10-10: `npx --no-install hbf check.run reference/sensors/membrane-slider-gib` exits
  0: 13 pass, 1 warn (CHK-PRT-05, GIB's 0.02 mm laps off the layer grid),
  0 fail; CHK-PRT-01, -03, -13 and CHK-3MF-06, -07 pass (computed).
- 2026-10-10: `npx vitest run reference/sensors/membrane-slider-gib` and
  `npm test -w packages/archetypes -- gib.parity` exit 0 (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- No print. Resistances, skin contact and press force: unknown.
- The meshes have not been rendered and looked at by a person.
