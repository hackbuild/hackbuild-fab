# conductors/blocks-wire

The blocks-wire archetype (M06-T09) at the BLOCKS defaults, placed by
`build.ts` through `Author.arch` on the bed: a straight 80 mm wire, cTPU core
1.2 mm wide in a 3.2 mm TPU sheath, a peg cap with socket and stud at each
end. Original of record: `originals/blocks/files/src-extracted/parts.js`
wirePath, trimPath and wire (lines 565 to 710), on the blocks-html standard
(`blocks.js` lines 14 to 44); record `knowledge/designs/blocks.md` 5.10.

## Made the way the original makes it

| rule (blocks.md 5.10) | where it lands | test |
|---|---|---|
| five path shapes, spiral inner end outside the next turn | `packages/archetypes/src/blocks/wire.ts` wirePath | blocks.parity: len, chord, spans and point count equal the original for straight, arc, spiral 200, zigzag and S (computed) |
| bare ends trim the sheath 5 mm | trimPath, wireBodies | blocks.parity zigzag bare A: TPU and cTPU within 1e-3 mm3 |
| run and caps unioned into one TPU region before any cut | wireBodies (csg union of the stroke pieces and the 7.6 mm cap squares) | blocks.parity: TPU volume and bbox per case |
| sheath sandwich 0 to 0.5, holed 0.48 to 1.12, full 1.1 to 1.6; caps to 3.2 | wireBodies | blocks.parity: TPU within 1e-3 mm3, bbox within 1e-6 mm |
| cap conductor: ring and flange for a socket, pad otherwise, post, stud | wireBodies | blocks.parity: cTPU per case, including socket only and stud only ends |
| core stroke cut inside the ring (cTPU) or outside the flange (cPLA) | wireBodies | blocks.parity: cTPU and cPLA cores |
| R = rho len / (coreW x 0.6) and the read verdict | wireR, wireVerdict | blocks.parity: R at the original's slot rho equals its readout (1.67 Mohm, 33.3 kohm, 4.19 Mohm, computed) |
| sheath wall each side at least 0.6 | wireApply fit metric | test/reference.test.ts: 1.00 mm, ok |

## Deviations, each named

- Volumes are compared before the kernel's D-054 snap and D-070 inset and
  against the original with its own 1 um shrink held off (the record keeps
  both); the built bodies carry the kernel's.
- The 2D booleans the original does with polygon-clipping are csg unions
  and differences of the same outlines on the prism route.
- Readouts price the core at the D-081 working rows (cTPU 400 ohm cm,
  inferred), so the built R is 444,444 ohm at 80 mm (computed); the
  original's slot (1500 ohm cm) gives 1.67 Mohm, asserted in blocks.parity.
- The kernel partitions cTPU over TPU; the original leaves the cap TPU and
  the cTPU flange sharing 5.93 mm3 per socket cap (computed, finding).

## Findings in the original (computed from parts.js)

- The cap's upper TPU band starts at zMid 2.6 while the flange runs to
  2.8, so TPU and cTPU share 5.93 mm3 per socket cap (lines 662 to 674);
  the wire is built outside Body, so the overlap check of blocks.js lines
  80 to 86 never sees it.
- A cPLA core is cut at the flange radius plus 0.3 (line 685) while the
  sheath's core band is cut by the whole core stroke, so a cPLA core ends
  0.30 mm short of its cap ring on its centreline (3.583 against 3.284 mm, computed from the two 32 point circles) with nothing between: the cPLA wire
  is open between core and caps.

## Virtual print (computed, not printed)

Sliced 2026-10-10 by `tools/slice/slice.mjs --design reference/conductors/blocks-wire`
(Orca-Flashforge 2.3.2, fresh datadir, TPU slots mapped to Generic TPU-95A
@FF C5P, inferred stand-in) and read by `tools/py/gcode/analyze.py`: 0 foreign
deposits, 0 deposits in air, 0 cPLA components joining two nets, 0 features
dropped; cTPU cap first layer widest unsupported span 4.518 mm (the flange
over the socket); 21 layers, 13 tool changes, 14 m 27 s and 1.73 g by the
slicer's estimate. The lead to column table is empty because analyze.py keys
on flex-pair's leads. Evidence:
`fab-knowledge:evidence/m06-arch2/blocks/vprint-blocks-wire/`.
A person has not looked at the render yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/conductors/blocks-wire`
  exits 0 at build 03766e..65 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (M06 and M08 integration): `npx --no-install hbf parity
  reference/conductors/blocks-wire` exits 0 at build e71015..32 against the goldens in
  `expected/` (computed). A person accepts them (D-152); not run.

- 2026-10-10 (M06-T09): `npx --no-install hbf parity reference/conductors/blocks-wire`
  exits 0 against the goldens in `expected/` (computed).
- 2026-10-10 (M06-T09): `npx --no-install hbf check.run reference/conductors/blocks-wire`
  exits 0: 14 pass, 1 warn (CHK-PRT-05, the 0.5 and 1.1 core band faces off
  the 0.25 first layer grid), 0 fail, 45 skip (computed).
- 2026-10-10: `npx vitest run reference/conductors/blocks-wire` exits 0
  (computed).

### Measured on a printed body

- None. Nothing here has been printed.

### Checked by machine

- None.

### Not verified by anything

- No print. Flex life, cap clutch and core resistance of a printed wire: unknown.
- The wire mesh has not been rendered and looked at by a person.
