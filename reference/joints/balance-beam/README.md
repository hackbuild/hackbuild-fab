# balance-beam

The reference for mechanism `pin-free-balance-beam` (M06-T06, D-105):
STIPPLE R17b's link, ported from the canonical original
`originals/stipple/files/stipple-r17b.html` (lineage `stipple.kin/r17b`,
sha256 `f4afad81c417...`). `build.ts` runs the mechanism's `apply()`
through `k.mech`, which declares the link as one prism body on the laser
machine `sheet600`, cut from 1.5 mm sheet (`DATA.P.T`). The page names no
sheet material; the slot reads `sheet15`, which no profile row backs, so
no check reads a number from it.

The page carries no outline generator (record section 1, "generator
source MISSING"): its 27 part outlines in `DATA.parts` (line 117) are the
only copy, and its body for the link is `geomOf("link")` (lines 186 to
194), the `DATA.parts.link` ring extruded to `T` by three.js. The port
declares the same ring at the same depth. The ring is drawn at NOSE_R 2,
BOSS_R 1.6, CROWN_R 6 and LINK_L 12; moving one of those params moves the
derived numbers and raises a `LINK_OUTLINE` build warning, because the
original cannot redraw the ring either.

At the page's `DATA.P` (computed by the original's `link()`, recorded in
`expected/legacy.json`): half select rise 2.500 mm, tilt 24.624 deg, crown
57.5 mm; full select rise 5.000 mm at tilt 0 deg.

## Files

- `chase.ts` declares the def's params at R17b's `DATA.P`, `t` included.
  A chase declares and never computes.
- `build.ts` calls `k.mech("pin-free-balance-beam", ...)` and returns the part.
- `expected/legacy.json` is the original's record, written by
  `packages/mechanisms/test/legacy/record-balance-beam.mjs`, which checks
  the file's sha256 against lineage.json, runs the page's own three.js
  r128 (line 115), `shapeOf` and `geomOf` under node with no DOM, and
  records the ring, the thickness, the mesh's volume (88.59896 mm3,
  computed) and bounding box, and `link()` (lines 125 to 171) at rest,
  half and full select for R17b and R17.
- `expected/build.json`, `report.json`, `edit.json`, `artifacts.json` are
  the parity goldens, pinned to SOURCE_DATE_EPOCH 315532800;
  `hbf parity --accept` is their only writer (D-227).
- The edit is `/t` from 1.5 to 1.6: the link body changes and nothing else.

## Made the way the original makes it

Each step is the record's (`knowledge/designs/stipple.md`), held by
`packages/mechanisms/test/balance-beam.body.test.ts`:

- The link is the `DATA.parts.link` ring, one outer, no holes, cut flat
  and extruded `T` (record 4.1, lines 175 to 194): the port's ring equals
  the original's vertex for vertex within 1e-6 mm, its depth is `T`, its
  bounding box equals the page mesh's within 1e-6 mm, and the build's
  meshed volume equals the page mesh's within 1e-3 mm3 (88.59822 against
  88.59896 mm3, computed; the gap is the D-175 snap grid), 188 triangles
  each.
- A cylinder end sits its radius above its floor at any tilt, so the
  crown is the mean of the two floors plus constants (record 4.1, `link()`
  lines 142 to 148): derive() regenerates the crown and tilt at rest, half
  and full select to 1e-12, and the half select rise prints 2.500 mm.
- R17 (STROKE 4.8) uses the same link ring (record 1.1): stroke 5.0 to
  4.8 regenerates R17's half select rise 2.400 mm and tilt 23.578 deg.

## What is verified, and what is not

### Verified on this machine

- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/joints/balance-beam`
  exits 0 at build d01764..6c against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T06): `npx --no-install hbf parity reference/joints/balance-beam`
  exits 0 at build df3700..e6 against the goldens in `expected/`.
- 2026-10-09: `npm test -w packages/mechanisms -- balance-beam` regenerates
  `expected/legacy.json` from the port, and fails on a vertex moved by
  2e-6 mm or a crown moved by 1e-9 mm.

### Measured on a printed body

None. No cut of the STIPPLE link is recorded; the record's shots are
renders of the original page.

### Checked by machine on geometry

- The part-level checks that apply pass (CHK-PRT-01, -03, -07, -12, -13,
  CHK-KEY-06); CHK-SHT-05 skips because the part declares no sheet
  thickness (the page states no sag margin) and the printer-layer checks
  skip on the laser machine.

### Not verified by anything

- Not verified by anything: cut behaviour, the nose sliding XDRIFT 1.09 mm
  on its floor, and the beam staying seated face down (record 4.1 limits).
- The ring follows no param: the original has no generator for it.
