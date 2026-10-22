# sensors/membrane-slider

The membrane-slider-wall archetype (M06-T09) at TANG R6 defaults: the whole
neck of TANG R6, placed by `build.ts` through `Author.arch` on the bed and
printed on its side, as the original prints it, so the 0.6 mm air gap
between the conductive TPU strip and the deck wiper is an in-plane distance
with no bridge. Original of record:
`originals/tang-r6/files/src/05_design.js` D.buildNeck (lines 38 to 94)
with its box engine boxParts (lines 12 to 35), r6_4 (tang-r6.md 4.5).

## Made the way the original makes it

| rule (tang-r6.md 4.5) | where it lands | test |
|---|---|---|
| tenon 18 long and H + foot deep, waist 2 each side, beam 240 x 12 x 30 | `packages/archetypes/src/tang/neck.ts` neckBoxes | tang.parity: PLA volume and bbox within 1e-3 mm3 and 1e-6 mm |
| TPU rails 6 wide with a 0.4 key, root and tip walls 1.2 | neckBoxes | tang.parity: TPU slot |
| membrane: TPU skin 0.8, TPU edges, cTPU strip 0.8 x 11 centred, air gap 0.6, cavity from tenon + 3 to L - 3 | neckBoxes | tang.parity: TPU and cTPU slots |
| cTPU feet 2 mm long onto the 3V3 pad (root, lower edge) and the GND pad (tip, upper edge) | neckBoxes | tang.parity: cTPU slot |
| deck cPLA: 3V3 pad and lead, GND pad and return 1.5 x 1.2, wiper strip 6.8 biased 0.6 and 0.2 | neckBoxes, neckApply (one conductor region per net per band) | tang.parity: cPLA slot; check.run CHK-NET-02, -13 |
| three cPLA lands 10 x 6 x 6 at 9 pitch, each with a 3.2 socket 4.6 deep | neckBoxes; the cut boxes cut every slot | tang.parity: cPLA and PLA slots |
| later boxes overwrite earlier ones (boxParts) | neckApply cuts each slot body by the slots ahead of it | tang.parity per slot |
| widths snapped to the layer (zc, zw, rails) | tangSnap on the machine preset layer, 0.24 | tang.parity: track length 210, xm0 23, xm1 237 |
| track 357955 ohm, leads 1500 and 37167, wiper 9292, about 2.2 N press | neckReadouts through profile sectionResistance | tang.parity readouts (original rows in memory); test/reference.test.ts (shipped rows) |

## Deviations, each named

- Volumes are compared before the kernel's D-054 snap and D-070 inset; the
  built bodies carry both.
- The deck conductors are declared per net and per z band as the union of
  that net's boxes, with a foot welding each band to the next (the
  original's meshPart foot, 02_kernel.js lines 212 to 216), instead of one
  overlapping prism per box: three overlapping boxes of one net (GND land,
  return and pad) failed the stage 8 union audit (E_KERNEL, degenerate
  triangles) once inset (finding, M06-T09 build notes).
- Each slot body is cut by the boxes of the slots ahead of it, so the
  kernel partitions nothing: the PLA partition union of the full-size
  deck failed the same audit.
- The shipped profile prices the strip at the cTPU working row, not TANG's
  1500 ohm cm, and the press force at the profile TPU 95A modulus, not
  TANG's 30 MPa; tang.parity holds both to the original with the
  original's rows in memory.
- CHK-PRT-05 warns: the neck stands 30 mm on the ffc5p grid (first layer
  0.25), as other references do.

## Virtual print (computed, not printed)

Sliced 2026-10-09 by `tools/slice/slice.mjs --design reference/sensors/membrane-slider`
(Orca-Flashforge 2.3.2, fresh datadir, both TPU slots on Generic TPU-95A
@FF C5P, inferred stand-in) and read by `tools/py/gcode/analyze.py`: 0
regions printed by another tool, 0 deposits in air, 0 cPLA components
joining two nets, 0 features dropped; 125 layers, 261 tool changes,
4 h 12 m 57 s and 70.41 g by the slicer's estimate. Evidence:
`fab-knowledge:evidence/m06-arch2/tang/vprint-membrane-slider/`.
A person has not looked at the render yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/sensors/membrane-slider`
  exits 0 at build 5e05dc..b2 against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/sensors/membrane-slider`
  exits 0 at build 3f9f9e..7b against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/sensors/membrane-slider`
  exits 0 at build 1010e4..4f against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T09): `npx --no-install hbf parity reference/sensors/membrane-slider`
  exits 0 at build 523102..f9 against the goldens in `expected/`, accepted
  at SOURCE_DATE_EPOCH 315532800 (computed).
- 2026-10-09: `npx --no-install hbf check.run reference/sensors/membrane-slider`
  exits 0: 0 fail, 1 warn (CHK-PRT-05); CHK-NET-02, CHK-NET-13 and
  CHK-PRT-03 pass (computed).
- 2026-10-09: `npx vitest run packages/archetypes/test/tang.parity.test.ts`
  and `reference/sensors/membrane-slider` exit 0 (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- No print. Press force, swing and contact resistance of a printed neck: unknown.
- The neck meshes have not been rendered and looked at by a person.
