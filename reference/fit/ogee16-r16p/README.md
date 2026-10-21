# ogee16-r16p

The reference for `fits.table` and `profile/fit-band` (M01-T09, D-099,
D-100). The OGEE R16-P fits table reproduces from the registry: 18 mating
pairs, each a drawn clearance across the joint against its fit class band,
all 18 in band (computed), with the bounds, classes and verdicts the bench's
`fits.py` printed.

| part | where |
|---|---|
| the params fits.py reads, declared once | `chase.ts` |
| the 18 rows as Part IR metrics `fits.<nn>.hole`, `.shaft`, `.drawn`, `.class`, and `fits.model` | `build.ts` |
| the legacy fit model `ogee16-fits-v1`: bands, flat loss 0.25 mm, edge tolerance 1e-9 mm | `packages/profile/src/fits/ogee16-fits-v1.ts` |
| the bound on `fit.drawn` and `fit.hole` | `packages/profile/src/constraints/fit-band.ts` |
| the command | `core/src/commands/fits-table.ts` |

## Model

Bands are drawn clearance across the joint, mm, as fits.py drew them:
SLIDE 0.70 to 0.90 (method felt: raised 0.20 after the parts "still feel
tight"), PSLIP 0.45 to 0.70, SNAP -1.30 to -0.15, LOCATE 0.25 to 0.40,
PRESS 0.00 to 0.16 (method derived, fits.py lines 38 to 40). PSLIDE is the
bench name of PSLIP (D-100); each row keeps it as `legacyClass`. The real
column subtracts the flat 0.25 mm loss, except for PSLIP and SNAP, whose
bands are already the real gap.

The D-100 loss table runs beside the legacy model: `unifiedReal` is
`realGap` on the same drawn clearance over the class's petg loss row on
ffc5p at the default layer pick, per side and doubled to the joint, and
`lossDelta` is real minus unifiedReal, informational (D-075). At the
shipped params it reads 0.15 mm on every row except the pivot barb, 0.40 mm
(computed). The petg layer 0.24 hole row takes 0.40 across the joint where
fits.py took 0.25, as `notes/TIMES.md` states for PETG at 0.24 layers; the
laser and fdm row takes 0.15 on a PSLIP row where fits.py took none; on the
SNAP row fits.py took none and the hole row takes 0.40. The reference test
checks unifiedReal against the PROFILE.md 7.1 rows, typed as its golden.

## Files

- `extract/fits.stdout.txt`: fits.py's stdout at the shipped params, exit 0,
  with the zip and member sha256 in its header.
- `extract/fits-slide055.stdout.txt`: the same with fits.py line 46 set to
  `FIT_SLIDE_ = 0.55`, exit 1, five rows out of band.
- `legacy/fits_golden.py`: the one writer of `expected/fits.json`. It imports
  fits.py from an unzipped `ogee16-source.zip` and records every row as
  fits.py computes it, so the golden is independent of the port.
- `expected/build.json`, `report.json`, `edit.json`, `artifacts.json`: parity
  goldens pinned to SOURCE_DATE_EPOCH 315532800; `hbf parity --accept` is
  their only writer (D-227).
- `test/reference.test.ts`: fits.table against both stdout files and
  fits.json, the FIT_SLIDE 0.55 edit in a test copy of the chase, the fit
  dims through constraints.query, and parity without accept.

The coupon is the first row as two bodies on the prism route: the 8.00 mm
shaft standing in its 8.75 mm bore, both 3 mm tall, inside a 2 mm wall.
Its circles are the committed unit-circle polygons, so the printed bore
sits slightly inside the drawn circle (shaft volume 150.54 mm3 against
150.80 mm3 for the true circle, computed).

## Run

```
npx --no-install hbf fits.table reference/fit/ogee16-r16p --json
npx --no-install hbf parity reference/fit/ogee16-r16p
npx --no-install hbf constraints.query fit.drawn --material petg --facts fitClass=SLIDE,fitModel=ogee16-fits-v1
```

To rewrite `expected/fits.json` from the bench:

```
unzip -o -q fab-work-directory:benches/ogee16/outputs/ogee16-source.zip -d <tmp>
uv run --project tools/py python reference/fit/ogee16-r16p/legacy/fits_golden.py <tmp>/source
```

## What is verified, and what is not

### Verified on this machine

- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/fit/ogee16-r16p`
  exits 0 at build 68ff45..75 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/fit/ogee16-r16p` exits 0 at build a87048..24 against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/fit/ogee16-r16p` exits 0 at build f5997d..51 against the
  goldens re-accepted once at the M05 exit, when the page milestone
  moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/fit/ogee16-r16p` exits 0 at build f5997d..51 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M05-T14): `npx --no-install hbf parity
  reference/fit/ogee16-r16p` exits 0 at build c4da53..9d against the
  goldens re-accepted for the eight KEYWAY gate rows M05-T14 entered,
  CHK-NET-31 to -38: in build.json only registryHash moved, the report
  gains CHK-NET-31 as a pending skip on the part, and every mesh hash and
  volume is unchanged (computed).
- 2026-10-08 (audit fixer round): `npx --no-install hbf parity
  reference/fit/ogee16-r16p` exits 0 at build 257ebc..67 against the
  goldens regenerated once for the registry checks in the report, the
  spec registryHash and the check version bumps (D-241 to D-243); every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M04 verifier, the audit after it): `npx --no-install hbf
  parity reference/fit/ogee16-r16p` exits 0 at build d01248..64 against
  the goldens in `expected/`.
- 2026-10-08: `test/reference.test.ts` passes: fits.table against both
  fits.py stdout files and `expected/fits.json`, the FIT_SLIDE 0.55 edit,
  the fit dims through constraints.query, and parity without accept.

### Measured on a printed body

None. No coupon of this reference has been printed.

### Checked by machine on geometry

- fits.table: 18 rows, all 18 in band at the shipped params; with
  FIT_SLIDE 0.55 the five rows fits.py names fall out of band, exit 1
  (computed, against fits.py's own stdout).
- constraints.query `fit.drawn` for SLIDE on `ogee16-fits-v1` gives 0.70
  to 0.90 mm; `fit.hole` without shaftMm is E_PARAM_MISSING at
  `/facts/shaftMm` (computed).

### Not verified by anything

- The SLIDE band 0.70 to 0.90 mm is method felt: fits.py raised it 0.20
  after the parts "still feel tight". No printed coupon backs it.
- The D-100 loss table (`unifiedReal`, `lossDelta`) is informational and
  has no printed coupon behind any row.
