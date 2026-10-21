# cosmetic coin-inlay

The reference for the `inlay` feature kind (M03-T08, D-058, D-059, D-105)
and its four checks. A 44 mm coin 3.6 mm thick on the ffc5p 0.24 mm
preset: a black body in slot 1, the hack.build mark on the front face
(the wrench in pink, slot 2, and the arc in cream, slot 3, the two paths
of `hackbuild-mark.svg` verbatim), and one segmented ring on the back face
in cream. Inlay depth 1.2 mm, 5 layers of 0.24 mm (computed). The
`initials` param sets a line of text in pink inside the ring on the back
face (OK-01); its default is empty, which adds no layer.

covers: ['feature:inlay', 'CHK-INL-01', 'CHK-INL-02', 'CHK-INL-03', 'CHK-INL-04']

| file | what it holds |
|---|---|
| `chase.ts` | the literal: blank, inlay depth and hygiene settings, mark size, back ring, initials and their size |
| `build.ts` | the prism blank and one `inlay` feature per art slot, each carrying the whole art under its content address `hbf://art/<sha256>` |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/cosmetic/coin-inlay --accept` at SOURCE_DATE_EPOCH 315532800, and `section.png` from `npx --no-install hbf view.render reference/cosmetic/coin-inlay --mode section --out expected/section.png` |

The kind and its checks live in `packages/inlay` (`src/kind.ts`,
`src/checks/inl-01.ts` to `inl-04.ts`); the CheckDef fields come from the
seed rows in `packages/checks/seed/checks.seed.json`. A chase that lists
`inlay` in `meta.kernels` gets the kind and the checks (`core/src/kinds.ts`).

## Choices against the card

- Layer 0.24 mm, not 0.2: the ffc5p profile has no 0.2 mm preset, and the
  layer comes from the preset (benches-coins-inlay.md section 10 item 11).
  1.2 mm is 5 layers.
- The edit is depth 1.2 to 0.72 mm, not 0.8: 0.8 mm is not a whole number
  of 0.24 mm layers and build.ts refuses it with E_SCHEMA. 0.72 mm is 3
  layers, the grid value nearest 0.8 below the floor.
- Hygiene is the print-forge recipe. collar-v5 has no open step, so every
  convex corner of the mark leaves cells an open at the min feature would
  remove and CHK-INL-01 fails (`packages/inlay/test/checks.test.ts` shows it
  on a square: 4 corner cells, 0.25 mm2, computed).
- One feature per art slot, each with the whole art, so the coin has three
  bodies: one per slot across both faces, as COLLAR splits them.
- Initials are a COLLAR text layer (`packages/inlay/src/layers/text.ts`) in
  IBM Plex Mono bold, the face the node text route carries
  (`packages/geom/src/text`, read from the vendored OFL woff2). They sit on
  SPRUE's middle baseline so a line of capitals centres on the coin without
  a font number in build.ts, which may import only spec. They share slot 2
  with the wrench, so a text coin still has three bodies. Art wider than
  the blank is refused with E_SCHEMA by the inlay kind instead of leaving
  cells past the rim as a loose body.

## Goldens

At defaults (computed): `coin` slot 1, 4740.813494176 mm3; `inlay.pink`
slot 2, 175.492240191 mm3; `inlay.cream` slot 3, 548.254853487 mm3. Each
art volume equals its cells x cell area x 1.2 mm to 0.1 percent; the band
bounds snap to 1/1024 mm.

`expected/report.json`: CHK-INL-01 (both features, 0 mm2), CHK-INL-02
(smallest island 14.054138 mm2, one ring segment, against 0.09896 mm2),
CHK-INL-03 (both features, 1.2 mm against 1.2, opacity.lightOverDark),
CHK-INL-04 (the bottom slab is the ring as read, mirrored; the ring
differs from its mirror), CHK-3MF-06, CHK-3MF-07, CHK-PRT-01 and
CHK-PRT-03 pass; CHK-PRT-04 and CHK-3MF-04 skip.

`expected/edit.json` moves `/depth` from 1.2 to 0.72 mm: all three bodies
change. At 0.72 both CHK-INL-03 results fail with measured 0.72 mm, legal
at least 1.2 mm, constraint `opacity.lightOverDark`, and the fix sets
`/depth` to 1.2 and predicts pass; `part.build` and `check.run` exit 1.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/cosmetic/coin-inlay`
  exits 0 at build c137bf..cf against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-14 (V-08, TXT-04): `textSize` takes COLLAR's text size control,
  1 to 30 mm in 0.1 steps (collar.html line 2542), default 9 mm, the size
  of COLLAR's back face text (line 2891); the inlay kind goes to 2.0.0.
  `npx --no-install hbf parity reference/cosmetic/coin-inlay` exits 1:
  build.json moves buildHash, defHash, paramsHash and registryHash,
  artifacts.json moves the 3mf hash, and the 6 mesh hash and volume fields
  are unchanged (computed, diffed before the accept). Re-accepted at build
  8aa6bd..0e; the run after exits 0.
- 2026-10-14 (OK-01): `npx --no-install hbf parity reference/cosmetic/coin-inlay`
  exits 1 after `initials` and `textSize` joined the chase: build.json moves
  buildHash, defHash and paramsHash, artifacts.json moves the 3mf hash, and
  every mesh hash and volume is unchanged (computed, diffed before the
  accept). Re-accepted at build 2cf47f..eb; the run after exits 0.
  `packages/inlay/test/text-coin.test.ts` builds the 30 mm class coin with
  initials AB, JMK and LT through the CLI: 0 failing checks, one CHK-PRT-05
  warn each (the inlay floor at 1.68 mm off the 0.25 + n x 0.24 grid,
  computed), and
  `export.run --dry-run` stops at the gate with 0 failing checks.
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/cosmetic/coin-inlay`
  exits 0 at build bb1aa7..95 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/cosmetic/coin-inlay` exits 0 at build 954eff..b5 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/cosmetic/coin-inlay` exits 0 at build 466c3f..72 against the
  goldens re-accepted once at the M05 exit, when the page milestone
  moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-08 (M05-T18): `npx --no-install hbf parity
  reference/cosmetic/coin-inlay` exits 0 at build 466c3f..72 against the
  goldens re-accepted once after parity began recording verdict flips in
  `expected/edit.json`: only edit.json moved, gaining both CHK-INL-03
  results pass to fail at depth 0.72 mm, legal at least 1.2 mm, fix
  `/depth` 1.2 predicting pass, as the Goldens section states (computed).
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/cosmetic/coin-inlay` exits 0 at build 466c3f..72 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M05-T14): `npx --no-install hbf parity
  reference/cosmetic/coin-inlay` exits 0 at build e4d263..4c against the
  goldens re-accepted for the eight KEYWAY gate rows M05-T14 entered,
  CHK-NET-31 to -38: in build.json only registryHash moved, the report
  gains CHK-NET-31 as a pending skip on the part, and every mesh hash and
  volume is unchanged (computed).
- 2026-10-08 (audit fixer round): `npx --no-install hbf parity
  reference/cosmetic/coin-inlay` exits 0 at build acd790..08 against the
  goldens regenerated once for the registry checks in the report, the
  spec registryHash and the check version bumps (D-241 to D-243); every
  mesh hash and volume is unchanged (computed). The re-accept also takes
  the profileHash move of the corrected despeckle and PETG provenance
  text (D-051 hashes whole rows).
- 2026-10-06: `npx --no-install hbf parity reference/cosmetic/coin-inlay`
  exit 0 against the goldens then in `expected/`.
- 2026-10-08 (the audit after M04, on an export of the staged tree):
  `npx --no-install hbf parity reference/cosmetic/coin-inlay` exits 1
  against the goldens at build 60f061..55, re-accepted 2026-10-07. The
  fresh build be06e4..55 moves profileHash only; every mesh hash and
  volume is equal (computed). Rerun to a pass by the audit fixer round (first line above).
- 2026-10-06: `npm test -w packages/inlay -- checks` builds the reference
  through the CLI, reads the goldens and asserts the edit.

### Measured on a printed body

None.

### Checked by machine on geometry

- 2026-10-14: the 3MF of the 30 mm class coin with initials AB, JMK and LT
  (textSize 8), written to a scratch file by a harness that calls core's
  `export3mf`, passes `uv run --project tools/py tools/py/validate_3mf.py
  --overlap` for each: 13 checks, 1 skipped (CHK-3MF-08, no conductor
  record), 0 failed, 127 of 127 template keys (computed).
- 2026-10-06: the 3MF that `check.run` and `parity` build in memory
  (486495 bytes, artifact hash equal to `expected/artifacts.json`), written
  to a scratch file by a harness that calls core's `export3mf`, passes `uv
  run --project tools/py tools/py/validate_3mf.py --overlap`: 13 checks, 0
  failed, 127 of 127 template keys (computed).

### Not verified by anything

- `hbf export.run reference/cosmetic/coin-inlay --kind 3mf` at a terminal:
  not run. The gate needs a person at a TTY.
- No slicer run. Nobody has opened the 3MF in Flash Studio, OrcaSlicer or
  Bambu Studio.
- `expected/section.png` and the renders have not been read by a person.
- A text coin has not been sliced, printed, or looked at in a bench. The
  back face was looked at only as the label grid drawn to a PNG, not as a
  render of the meshes; `view.render` shows the top face only.
- The node text route against Chromium canvas text: the middle baseline is
  the hhea ascender and descender midpoint (computed), not measured against
  a browser.
- The opacity floors and the 0.6 mm min feature are inferred from failed
  prints; no coupon has measured them (D-082, D-083).
