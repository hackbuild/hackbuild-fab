# exports orca-3mf-roundtrip

The first export reference (M00-T11, D-105): the COLLAR coin
(`designs/collar`) at its legacy defaults, built through the raster route
and written by the Orca dialect writer of `packages/3mf` with one filament
per slot on the ffc5p machine preset. It holds the writer to the gold
round trip: 127 per-filament keys, printer and process names only, the
build plate from the preset.

covers: [export:3mf, CHK-3MF-01, CHK-3MF-02, CHK-3MF-03, CHK-3MF-06, CHK-3MF-07, CHK-PRT-01, CHK-PRT-03, route:raster]

| file | what it holds |
|---|---|
| `chase.ts` | the COLLAR chase literal with layer 0.24 mm |
| `build.ts` | the COLLAR build on this chase and its raster masks |
| `expected/` | parity goldens written by `npx --no-install hbf parity reference/exports/orca-3mf-roundtrip --accept`, and `section.png` from `hbf view.render --mode section` |

## Change from the legacy defaults

The legacy bench writes layer 0.2 mm under the `0.24mm Standard @FF C5`
process (collar.html lines 644 and 647; plan-deltas R54). This reference
sets layer 0.24 mm so the slab grid and the named process agree. The
legacy slab grid has no first layer: the ffc5p preset prints its first
layer at 0.25 mm (vendor), so the chamfer breaks at 0.24, 0.48 and 0.72 mm
(computed) sit 0.01 mm off the sliced layer tops. The parity run against
the legacy keeps 0.2 (`tools/parity/collar.test.ts`).

## Goldens

At defaults (computed): body `black` slot 1, 4432.621028423 mm3; rim
`pink` slot 3, 719.150523186 mm3. `expected/edit.json` moves `/rim/w` from
2.2 to 3.0 mm, and both bodies change, the body slot and the rim slot.

`expected/report.json` holds what `hbf parity` runs at M00: CHK-3MF-06,
CHK-3MF-07, CHK-PRT-01 and CHK-PRT-03 pass; CHK-3MF-04 and CHK-PRT-04
skip. CHK-3MF-01 to CHK-3MF-03 run in the seed validator, below, and have
no core check run yet.

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/exports/orca-3mf-roundtrip`
  exits 0 at build c26d5c..ee against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/exports/orca-3mf-roundtrip`
  exits 0 at build 84754a..66 against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/exports/orca-3mf-roundtrip`
  exits 0 at build 4beace..12 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T02 to M06-T06): `npx --no-install hbf parity
  reference/exports/orca-3mf-roundtrip` exits 0 at build 1b600c..0b against the goldens
  re-accepted when CHK-SHT-11 and the mechanisms ConstraintDefs joined the
  registry: in build.json only registryHash moved, the report gains
  CHK-SHT-11 as a skip row, the 3MF and solve hashes follow buildHash, and
  every mesh hash and volume is unchanged (computed).
- 2026-10-09 (M05-T17): `npx --no-install hbf parity
  reference/exports/orca-3mf-roundtrip` exits 0 at build 90f69f..f7
  against the goldens re-accepted once at the M05 exit, when the page
  milestone moved to M05 (circuit, copper and the net level registered;
  packages/checks PAGE_MILESTONE). report.json moves only the reasons of
  the circuit checks that skip (the kernel is registered, so each skips
  on its own reason); the reportHash, build.json, edit.json and
  artifacts.json are unchanged (computed). CHK-NET-40 to -45, entered at
  the same exit, are sheet level and enter no build registry, so
  registryHash is unchanged.
- 2026-10-08 (M05-T12): `npx --no-install hbf parity
  reference/exports/orca-3mf-roundtrip` exits 0 at build 90f69f..f7 against the goldens
  re-accepted after the constraint def circuit/capacitive-path-ceiling
  joined the registry: in build.json only registryHash moved, and every
  mesh hash and volume is unchanged (computed).
- 2026-10-08 (M05-T14): `npx --no-install hbf parity
  reference/exports/orca-3mf-roundtrip` exits 0 at build 505322..0d
  against the goldens re-accepted for the eight KEYWAY gate rows M05-T14
  entered, CHK-NET-31 to -38: in build.json only registryHash moved, the
  report gains CHK-NET-31 as a pending skip on the part, and every mesh
  hash and volume is unchanged (computed).
- 2026-10-08 (audit fixer round): `npx --no-install hbf parity
  reference/exports/orca-3mf-roundtrip` exits 0 at build c2b1ec..fb
  against the goldens regenerated once for the registry checks in the
  report, the spec registryHash and the check version bumps (D-241 to
  D-243); every mesh hash and volume is unchanged (computed).
- 2026-10-08 (the audit after M04): `npx --no-install hbf parity
  reference/exports/orca-3mf-roundtrip` exits 0 at build 0e8dcd..77
  against the goldens in `expected/`.

### Measured on a printed body

None.

### Checked by machine on geometry

- 2026-10-05: the export from `hbf export.run reference/exports/orca-3mf-roundtrip
  --kind 3mf --machine ffc5p` (answered at a terminal; 880010 bytes,
  artifact hash `710f3830c5b37c0d51f21c5fae52bc4d5cdf410d9a54e0899964054f04079c94`,
  equal to `expected/artifacts.json`) passes `uv run --project tools/py
  tools/py/validate_3mf.py --export --overlap`: CHK-3MF-01, 02, 03, 06, 07,
  CHK-PRT-01 and 03, export completeness; 12 checks, 0 failed; 127 of 127
  template keys; plate Textured PEI Plate (computed).

### Not verified by anything

- No slicer run of this export. Nobody has opened it in Flash Studio,
  OrcaSlicer or Bambu Studio.
- `expected/section.png` has not been read by a person. The section shows
  pink specks across the black core, which looks like a depth tie in the
  core renderer (inferred, not traced).
- defHash hashes this `build.ts` only; an edit to `designs/collar/build.ts`
  moves the mesh hashes in `build.json`, not defHash.
