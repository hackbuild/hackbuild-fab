# capsule-rotor-cage

The reference for mechanism `capsule-pocket-rotor` (M06-T06, D-105): SLUG's
drum cage at the assignments of the canonical original
`originals/slug/files/slug.scad` (lineage `slug.scad/slug-12`, lines 20 to
68), cut from 3 mm ply. `build.ts` runs the mechanism's `apply()` through
`k.mech`, which draws every cut part of the drum (`rotor_gear_a`,
`rotor_gear_b`, `rotor_ring`, `rotor_top`, six `spacer_a`, six `spacer_b`,
the quantities of the page's `PART_QTY`) as prism bodies on the laser
machine `sheet600`, laid in one row along x, 4 mm apart (the page's part
gap, `slug.html` line 176). The row is the port's layout; the original
nests the same parts across its cut sheets, which
`reference/sheet/slug-sheets` covers.

audit.py prints at these defaults (computed by the original, recorded in
`expected/legacy.json`): rim between pocket and tooth root 13.4 mm, web
between adjacent pockets 5.2 mm, pocket clearance per side 5.6 mm, tab
slot 3.30 mm against 3.00 mm stock.

## Files

- `chase.ts` declares the pocket diameter and the slot slop. Their ranges
  are audit.py's thresholds (lines 52, 56 and 105, computed). Every other
  param takes the def's default, slug.scad's assignment.
- `build.ts` calls `k.mech("capsule-pocket-rotor", ...)` and returns the part.
- `expected/legacy.json` is the original's record, written by
  `packages/mechanisms/test/legacy/record-slug-rotor.mjs`: the scad
  assignments, the six parts' loops from `slug.html` `OUTLINES` (line 272,
  OpenSCAD's own render of slug.scad through `bake.py`, rounded to 0.1 mm),
  `PART_QTY` and audit.py's rows, each source checked against its
  lineage.json sha256.
- `expected/` also holds the parity goldens (`build.json`, `report.json`,
  `edit.json`, `artifacts.json`), pinned to SOURCE_DATE_EPOCH 315532800;
  `hbf parity --accept` is their only writer (D-227).
- The edit is `/pockD` from 62 to 60: the four discs move, the twelve
  spacers do not, and the web between pockets opens by 2 mm (computed).

## Made the way the original makes it

Each step is the record's (`knowledge/designs/slug.md` section 5), held by
`packages/mechanisms/test/capsule-rotor.body.test.ts`:

- `rotor_common` (record 5 step 1, slug.scad lines 196 to 202): the axle
  bore, four pockets on `pock_rc`, eight tie rod holes on the 45 degree
  diagonals at `tie_r` and `tie_r2`, and tangential mortises
  `[t + 2 slop, spc_w + 2 slop]` on `spc_r`.
- `rotor_gear` (step 2, line 203): `gear2d(2.5, 76)` minus `rotor_common`;
  the bottom disc takes no mortises. `gear2d` (record 6, lines 171 to 187)
  is the root disc unioned with 76 involute teeth sampled in 10 steps.
- `rotor_ring` and `rotor_top` (steps 3 and 4, lines 205 to 206): the root
  radius disc minus `rotor_common`, the ring with both tiers' mortises,
  the top with tier B's at 30 degrees.
- `spacer` (step 5, lines 207 to 212): the shoulder `[24, gap]` with a
  tenon `[18, t]` below and above; `spc_gap1` 13 and `spc_gap2` 29.
- Every baked loop of the six parts regenerates: the port's vertices,
  rounded the way bake.py rounds them, equal the baked ones vertex for
  vertex; the gear outline is 1844 points in both.

## What is verified, and what is not

### Verified on this machine

- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/sheet/capsule-rotor-cage`
  exits 0 at build d55639..dd against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T06): `npx --no-install hbf parity reference/sheet/capsule-rotor-cage`
  accepted at build 6de145..7e; `hbf part.build` exits 0, 5 checks pass and
  49 skip.
- 2026-10-09: `npm test -w packages/mechanisms -- capsule-rotor` holds the
  port to `expected/legacy.json`: 82 baked loops regenerate; a baked vertex
  moved by 0.1 mm fails.

### Measured on a printed body

None. The record names 126 of 128 vends across 8 trials (BUILD.md, owner
report), which this reference does not reproduce.

### Checked by machine on geometry

- Every body is closed and the parts do not overlap (CHK-PRT-01, -03).
- Every body volume equals cut area times t within the 1/1024 mm snap
  grid's reach (computed).

### Not verified by anything

- OpenSCAD did not run here. The geometry is held to the original's bake,
  whose 0.1 mm rounding is the tightest the record allows: the port is
  within 0.05 mm of every baked vertex, where the originals rule asks
  1e-6 mm. A port value on a 0.05 mm rounding boundary is accepted on
  either side; at these defaults those are the axis-aligned mortise
  corners at plus or minus 9.15 mm.
- The cut and glued cage, and the capsule physics of `slug.html`.
- The ply3 profile row's kerf is null; slug.scad cuts with kerf
  compensation off and no check reads the kerf here.
