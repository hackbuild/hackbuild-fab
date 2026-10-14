# snap-flexure

The reference for mechanism `snap-flexure` (M06-T06, D-105): TUMBLER's SNAP FLEXURE
module at its bench defaults, ported from the canonical original
`originals/tumbler/files/tumbler.html` (lineage `tumbler.bench/harvest`,
module from line 1036). `build.ts` runs the mechanism's `apply()`
through `k.mech`, which lays the module's 2 cut parts out the way
the original's cut file packs them (`packSheet`, 240 mm wide, gap 9) as
prism bodies on the laser machine `sheet600`, cut from the bench default
material strip, Delrin/POM 3 mm (t 3.0, kerf 0.22, fit 0.15, E 3100 MPa,
all inferred bench values, `MATS` line 193 and `G` line 203).

The bay prints at these defaults (computed by the original, recorded in
`expected/legacy.json`): h/t 5.00, snap est 4.49N, stable 2 states.

## Files

- `chase.ts` declares the module's sliders at the original's defaults and
  ranges, and the material strip. A chase declares and never computes.
- `build.ts` calls `k.mech("snap-flexure", ...)` and returns the part.
- `expected/` holds the parity goldens (`build.json`, `report.json`,
  `edit.json`, `artifacts.json`), pinned to SOURCE_DATE_EPOCH 315532800;
  `hbf parity --accept` is their only writer (D-227). `expected/legacy.json`
  is the original's record for this module on Delrin/POM 3 mm, cut from
  `packages/mechanisms/test/legacy/tumbler.json`, which
  `packages/mechanisms/test/legacy/record-tumbler.mjs` wrote by running the
  original's module library under node.
- The edit is `/rise` from 5 to 5.25.

## Made the way the original makes it

Each step is the record's (`knowledge/designs/tumbler.md`), held by a test:

- One closed outer loop per part, closed holes inside it, open score lines
  that are never cut (record 4.1, `part` line 336): the port's parts equal
  the original's vertex for vertex within 1e-6 mm, scores included, and
  the prism bodies carry only the outer and the holes
  (`packages/mechanisms/test/tumbler.parity.test.ts`,
  `test/originals.test.ts`).
- One material strip drives every dimension (record 4.3): the parity suite
  regenerates all 9 `MATS` rows, 162 module and material cases.
- The plan audit (record 4.1, `partWarnings` lines 339 to 348): a hole
  crossing the outline or thinner than 1.5 kerf; the port's `sheetAudit`
  returns the original's strings, and the build carries them as
  `SHEET_AUDIT` warnings. 0 at these defaults (computed).
- The cut file packs parts on a 240 mm shelf with a 9 mm gap (record 4.2,
  `packSheet` line 349): the body outlines equal the legacy parts at those
  placements within 1e-6 mm (`test/originals.test.ts`).
- The module's construction (record 4.5): rise over thickness over 2.31 for two states; Fs = 48 E I rise / span^3; the beam is the land left between two crescent holes. The parts and the
  readouts above regenerate from the port's plan and drive
  (`test/originals.test.ts`).

## What is verified, and what is not

### Verified on this machine

- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/mechanisms/snap-flexure`
  exits 0 at build 15290a..3d against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T06): `npx --no-install hbf parity reference/mechanisms/snap-flexure`
  exits 0 at build a5239e..85 against the goldens in `expected/`.
- 2026-10-09: `npm test -w packages/mechanisms -- originals` regenerates
  `expected/legacy.json` from the port: parts, readouts, warnings and the
  logic or state record, and the build's body outlines and volumes.

### Measured on a printed body

None. No cut or print of this module is recorded; the record's shots are
renders of the original page.

### Checked by machine on geometry

- No sheet check applies to these parts beyond the part-level set; CHK-SHT-05 skips because the part declares no sheet thickness (no sag margin is stated in the original) and the printer-layer checks skip on the laser machine.
- Every body volume equals the cut area (outer minus the union of the
  holes) times t within the D-175 snap grid's reach (computed).

### Not verified by anything

- Not verified by anything: printed or cut behaviour. No cut of the TUMBLER
  modules is recorded.
- The material strip values are the bench's declared values (inferred);
  the profile has no POM row, so the slot names `pom3` and no check reads
  a number from it.
- The output level `q` the logic record holds is the 2D stage's display
  value; the counting and sequencing verdicts come from derive().
