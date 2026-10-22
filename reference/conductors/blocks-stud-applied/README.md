# blocks-stud-applied

The fresh prism of M06-T12: one PETG body that never knew BLOCKS, a 32 x
24 mm rectangle (4 x 3 studs at BOSS's 8.0 mm pitch) extruded to BOSS's
brick height 9.6 mm (`originals/boss/files/boss-src/src/boss.js` line 12,
`P: 8.0`, `brickH: 9.6`, design values, inferred), with one declared face,
`body.top`, at the top face centre. No features and no applied entries.

`arch.apply` places an archetype on `body.top` and returns the
`chase.applied` record, the material slots and kernels the chase lacks and
the ids the next build merges. The card's archetype is `blocks-stud`, which
is a candidate at this tree (M06-T09 ports it), so `arch.apply` refuses it
with E_REF naming its status and reason; the merge itself is proven on the
proven flex-cone-key by `core/test/arch-apply.test.ts` and the fixtures in
`core/test/fixtures/arch-apply/`.

## Files

- `chase.ts` declares the prism's width, depth and height at the BOSS
  numbers above, one PETG slot, no applied entries.
- `build.ts` returns the prism and declares `body.top`, which moves with H.
- `expected/` holds the parity goldens (`build.json`, `report.json`,
  `edit.json`, `artifacts.json`), pinned to SOURCE_DATE_EPOCH 315532800;
  `hbf parity --accept` is their only writer (D-227). The edit is `/H` from
  9.6 to 9.61, which puts the top on a layer top and flips CHK-PRT-05 from
  warn to pass (computed).

## What is verified, and what is not

### Verified on this machine

- 2026-10-21 (R1-score-02): `npx --no-install hbf parity reference/conductors/blocks-stud-applied`
  exits 0 at build bfda77..aa against the goldens re-accepted when the
  key/flex-gap constraint def registered contact.gap and moved
  registryHash; every mesh hash and volume is unchanged and the report
  does not move (computed).
- 2026-10-21 (R1-fix-19): `npx --no-install hbf parity reference/conductors/blocks-stud-applied`
  exits 0 at build a03872..8a against the goldens re-accepted when CHK-KEY-05
  went to 2.0.0 and moved registryHash; every mesh hash and volume is
  unchanged and the report moves only by that check (computed).
- 2026-10-11 (integration after M06 and M08): `npx --no-install hbf parity reference/conductors/blocks-stud-applied`
  exits 0 at build 5ba088..d1 against the goldens re-accepted when CHK-KEY-01 2.1.0,
  CHK-KEY-02 2.0.0, CHK-PRT-03 2.0.0, CHK-PRT-04 2.0.0, CHK-KEY-04 2.0.1,
  CHK-SHT-04 2.0.1 and CHK-SHT-11 1.0.1 moved registryHash; every mesh hash
  and volume is unchanged and the report moves only by those checks (computed).
- 2026-10-09 (M06-T12): `npx --no-install hbf parity reference/conductors/blocks-stud-applied`
  exits 0 at build bc59d3..77 against the goldens in `expected/`.
- 2026-10-09: `npm test -w core -- arch-apply` runs arch.apply on the
  fixture host and holds the merged build to the authored one.

### Measured on a printed body

None. Nothing was printed.

### Checked by machine on geometry

- The registry checks of a plain PETG prism: CHK-PRT-05 warns at 9.60 mm,
  off the 0.24 mm layer grid over a 0.25 mm first layer (nearest 9.37 or
  9.61, computed); the rest pass or skip, as `expected/report.json` lists.

### Not verified by anything

- A BLOCKS stud on this prism: blocks-stud is a candidate, so neither the
  placement nor the conductor, contact and port checks on a stud ran here.
- The comparison against the BLOCKS baseline (reference/conductors/blocks-stud,
  M06-T09) waits for that reference.
