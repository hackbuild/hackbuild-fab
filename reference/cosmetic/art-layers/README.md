# cosmetic art-layers

The reference for the layer kinds BAIL adds to the inlay kind (plan v11
section 4.3 step a, the owner's BAIL bench): shape in all 13 kinds, scope,
circuit, logo, and text with letter spacing and an arc. It rides the `inlay`
feature kind and its four checks, as `cosmetic/coin-inlay` does, with the
art laid out on a plate: 100 by 64 mm, 3.61 mm thick, on the ffc5p 0.24 mm
preset, a black body in slot 1 and two art slots, pink (2) and cream (3).
Inlay depth 1.2 mm is 5 layers of 0.24 mm (computed).

covers: ['feature:inlay', 'CHK-INL-01', 'CHK-INL-02', 'CHK-INL-03', 'CHK-INL-04']

| file | what it holds |
|---|---|
| `chase.ts` | the literal: plate size, inlay depth and hygiene, grid, shape size, stroke and the circuit seed |
| `build.ts` | the prism blank and one `inlay` feature per art slot, each carrying the whole art under its content address `hbf://art/<sha256>`; the painter layers are written as data |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/cosmetic/art-layers --accept` at SOURCE_DATE_EPOCH 315532800; `edit.json` was started by hand with the pointer, `from` and `to`, as parity asks of a chase with no constraintDim |
| `packages/inlay/test/art-layers.test.ts` | the same art as an art document (`spec/art.ts`), lowered by `packages/inlay/src/art-lower.ts` and held equal to the layers in `build.ts`, plus the goldens |

The kinds and the painters live in `packages/inlay` (`src/layers/shapes.ts`,
`scope.ts`, `circuit.ts`, `logo.ts`, `text.ts`, `src/marks.ts`); the kind and
its checks are the ones `cosmetic/coin-inlay` proves. Lineage rows are
`bail.bench/*`.

## The art

Front, as read in hand, three rows of six cells 16 mm across and 20 mm apart:

| row | cells |
|---|---|
| 1 | ring, rect, ellipse, frame, diamond, chevrons |
| 2 | grid, sun, saguaro, mesa, zigzag, steps |
| 3 | arrow, scope 3 by 2, circuit seed 7, the hack.build mark, the line "hack.build" across the last two cells in two slots with a split gap |

Back, as read in hand: "MAKE THINGS" on a top arc of radius 24 mm and "BREAK
THINGS" on a bottom arc of radius -24 mm, each with 0.6 mm letter spacing,
"REPEAT" with 0.5 mm letter spacing, and an arrow. The slots alternate along
each row, so every kind paints at least once, both art slots have islands on
both faces, and the back art differs from its mirror.

## Choices

- Thickness 3.61 mm, a layer top (0.25 mm first layer plus 14 layers of 0.24
  mm), so the front face and the inlay floor 1.2 mm under it sit on the
  grid. CHK-PRT-05 still warns once: the back inlay tops out at 1.2 mm and
  the grid has 1.21 (measured offMm 0.0098), as it does on coin-inlay.
- Hygiene is the print-forge recipe, for the reason coin-inlay gives: collar-v5
  has no open step, and CHK-INL-01 measures what an open would remove.
- Text is IBM Plex Mono bold, the one face the node text route sets. BAIL
  sets its `plexb` key at weight 600; the node table holds 400 and 700.
- The shape layers keep BAIL's own extents: the ellipse is 0.7 and the arrow
  0.55 of the shape size tall, the saguaro 0.86 wide, the sun gap scale 1.4
  and the grid stroke 0.8 mm, so no gap or stroke is under the 0.6 mm floor.
- The circuit's drills take the host colour: the body label 0 of an inlay
  face, which is what BAIL paints with ST.colour.body.
- build.ts may import only spec, so it cannot call the lowering; it holds
  the lowered layers as data and the test holds them equal to the document.

## Goldens

At defaults (computed from the 3MF the build exports): `plate` slot 1,
20,859.949 mm3, 59,898 triangles; `inlay.pink` slot 2, 1,017.091 mm3, 31,032
triangles; `inlay.cream` slot 3, 1,216.529 mm3, 36,352 triangles. The build is
0cb09a..d4 at the epoch.

`expected/report.json`: CHK-INL-01 (both features, 0 mm2, open radius 2 cells
of 0.125 mm), CHK-INL-02 (smallest island 0.9375 mm2, 60 cells, against
0.09896 mm2), CHK-INL-03 (both features, 1.2 mm against 1.2,
opacity.lightOverDark), CHK-INL-04 (17,909 back cells, differ from their
mirror), CHK-3MF-06, CHK-3MF-07, CHK-PRT-01, -03, -06, -07, -09, -12, -13,
-15 and -16 pass, CHK-PRT-05 warns and 40 skip.

`expected/edit.json` moves `/depth` from 1.2 to 0.72 mm: all three bodies
change, and both CHK-INL-03 results fail with measured 0.72 mm, legal at
least 1.2 mm, fix `/depth` to 1.2 predicting pass.

## What is verified, and what is not

### Verified on this machine

- 2026-10-30: the first goldens were accepted at build 0cb09a..d4 (a new
  reference, no earlier golden moved); `npx --no-install hbf parity
  reference/cosmetic/art-layers` then exits 0 with all four files equal.
  `part.build` took 8.1 s wall at the CLI, 19 pass, 1 warn, 0 fail, 40 skip
  (measured).
- 2026-10-30: `npx vitest run packages/inlay/test/art-layers.test.ts` holds
  the document equal to the layers, the kinds covered, the goldens and the
  parity.

### Measured on a printed body

None. No body from this reference has been printed.

### Checked by machine on geometry

- 2026-10-30: the 3MF that `buildPart` and `export3mf` write, saved to a
  scratch file, passes `uv run --project tools/py tools/py/validate_3mf.py
  --overlap`: 13 checks, 1 skipped (CHK-3MF-08, no conductor record), 0
  failed, 127 of 127 template keys, 0 non manifold vertices (computed).

### Not verified by anything

- `hbf export.run reference/cosmetic/art-layers --kind 3mf` at a terminal:
  not run. The gate needs a person at a TTY.
- No slicer run. Nobody has opened the 3MF in Flash Studio, OrcaSlicer or
  Bambu Studio, and nothing has been printed.
- A person has not looked at the plate. The builder drew both faces' label
  grids to PNG after hygiene and read them (all 13 shapes, the scope trace,
  the circuit with its drills, the mark, the text and both arcs are where the
  art puts them, and the arrow has a hairline gap where its tail feathers
  cross the shaft, as BAIL's nonzero fill leaves it); no render of the
  meshes was read. `view.render` shows the top face only.
- The painters against a browser canvas surface: this reference builds in
  node, where text and logos go through the vector surface. The cells of
  BAIL's own canvas are compared in `packages/inlay/test/bail-layers.test.ts`.
- The node `middle` text baseline sits 0.075 em lower than Chrome's (measured
  against BAIL's canvas, 0.38 mm at 5 mm). The reference text is placed on the
  node baseline; nothing here moves it.
- The opacity floors and the 0.6 mm min feature are inferred from failed
  prints; no coupon has measured them (D-082, D-083).
