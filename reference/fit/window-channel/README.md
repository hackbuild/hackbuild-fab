# fit window-channel

The reference for the `window` feature kind and CHK-SHP-03 (D-177, D-105). A
PETG block 30 by 24 mm, 6.01 mm thick, on the ffc5p 0.24 mm preset, with two
windows cut from the front edge through to the back edge. The channel is the
shape of BAIL's buried cord channel (bail.html 1720 to 1789): 4.5 mm wide, a
flat roof, floor and roof on the layer tops 1.21 and 4.09 mm. The gable is the
DAVIT and DETENT motif: 4 mm wide, upright to 2.65 mm, then a 45 degree roof to
its apex at 4.65 mm.

covers: ['feature:window', 'CHK-SHP-03']

| file | what it holds |
|---|---|
| `chase.ts` | the literal: block size, channel width, floor and height, gable width and wall |
| `build.ts` | the prism block and the two `window` features; the outlines in face coordinates, where face y is minus part z |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/fit/window-channel --accept` at SOURCE_DATE_EPOCH 315532800; `edit.json` was written once by hand (no param carries a constraintDim) with the edit chanW 4.5 to 9.5 |

The kind lives in `packages/mesh/src/kinds/window.ts`: a rectangle in a
vertical face cuts as a box prism (so the channel's floor and roof keep their
layer tops), any other outline as a sweep along the face normal, each across
the whole host. CHK-SHP-03 is `packages/checks/src/defs/shp/CHK-SHP-03.ts`. A
chase that lists `mesh` in `meta.kernels` gets the kind when a feature uses it
(`packages/pipeline/src/kinds.ts`, onUse).

## Goldens

- The block volume is 3781.72265625 mm3 (computed): 30 x 24 x 6.009765625
  less the channel 4.5 x 2.8798828125 x 24 and the gable 9.76171875 mm2 x 24,
  every z on the 1/1024 mm grid (D-054). The kind's box and sweep cutters give
  that number to the last digit.
- CHK-SHP-03 passes on both windows: the channel's flat roof spans 4.5 mm, the
  gable's roof stands at 45 degrees, the profile limit overhang.maxDeg 45
  (inferred).
- The edit widens the channel to 9.5 mm; CHK-SHP-03 on `window.channel` flips
  from pass to fail, a flat roof over the 9 mm ceiling.

## What is verified, and what is not

### Verified on this machine

- 2026-11-03: `npx --no-install hbf parity reference/fit/window-channel`
  exits 0 at build 925410..c4 against the goldens written that day (the first
  goldens of this reference); `hbf check.run --only CHK-SHP-03` passes both
  windows (computed).

### Measured on a printed body

Nothing. The block has not been printed.

### Checked by machine on geometry

- The volume above, against the hand computation on the snapped grid
  (computed).
- packages/mesh/test/window.test.ts: the box cutter's outline and z, the
  sweep's path, and the volumes the stage runner leaves for a box and a
  gabled window through a 20 by 30 by 5 block (computed).

### Not verified by anything

- Whether the 4.5 mm flat roof bridges cleanly in PETG on ffc5p, and whether
  the 45 degree gable prints without support: CHK-SHP-03 grades both from
  geometry and the inferred overhang limit only.
- A slice of the block, and a person looking at a render of it.
