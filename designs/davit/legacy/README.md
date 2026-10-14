# DAVIT legacy copy

The DAVIT R3 page, generator and print STLs, and the R4 tree, kept byte
identical as the inputs of M02-T06 (D-142, D-156, D-188). Nothing here is
edited, except one run record (below). `shasum -a 256 -c SHA256SUMS` checks this folder and
`cd r4 && shasum -a 256 -c SHA256SUMS` checks `r4/`.

| field | value |
|---|---|
| record | `knowledge/designs/davit.md` |
| phase | 1, viewers over generators (2026-08-01; `syn/patterns-and-lineage.md` section 1) |
| copied from | `fab-work-directory:benches/davit/outputs/` (`davit.html`, `davit_stl.zip`, `parts.py`, `lib.py`, `assembly.py`; `README.md` copied as `README-R3.md`, byte identical to `originals/davit/files/README-R3.md`) |
| unzipped | `davit_stl.zip` into `stl/`: 15 STLs, all binary |
| R4 | `fab-knowledge:evidence/x/downloads/dl-robots-machines/unzipped/davit_r4/` into `r4/`, without its `parts.py`, `lib.py` and `assembly.py`, which are byte identical to the R3 copies here (sha256 e244f72a50c9cd27, 33d8ebe0f4aa6bcf, 8b7b5ce81fbfa501, computed); the loose `sim_r4.html` from `dl-robots-machines/` as `r4/sim_r4-loose.html`; the 2026-10-04 run records of `sweep.py` and `verify_sim.py` in `r4/records/`; the sweep record has its first four lines, two trimesh `RuntimeWarning` lines naming a local scratch folder, removed for publishing (sha256 as run 96d716e4baaaccb3, computed; `designs/README.md`) |
| lineage rows | `davit.collide/r4-page` and `davit.attempt/r4-page` (canonical, `r4/sim_r4.html`), `davit.collide/r3-page` and `davit.attempt/r3-page` (copies, `davit.html`, the R3 page the std hybrid fixture reads), `davit.collide/r4-page-loose` (copy), `davit.calib/r4` (`r4/pack_sim.py`), `davit.lib/r4`, `davit.parts/r4`, `davit.sweep/r4` |

## Kernels

Consumed: trimesh and manifold3d in Python with one difference per part
(`lib.py` `diff`, the same function PINTLE later grew batch-then-fold
union from), three.js in the page.

Introduced: two-level sphere proxy collision with calibrated masks
(`collide()` at `davit.html` line 541, `r4/sim_r4.html` line 552), the
offline pair sweep gate (`r4/sweep.py`, 43 pair sweeps) and the mask
calibration (`r4/pack_sim.py` `calib_pair`). M02-T06 ports `chain()` and
`collide()` from the R3 page, which carries both the standard and MINI
pair sets; R4 is MINI only, so `r4/` is the parity reference and is not
ported (D-180).

## Known unfixed defects

- `collide()` skips every pair on different sides ("arms cannot meet"), so
  left against right was never tested; M02-T06 step 2 removes the skip.
- Masks are calibrated on the right arm only, MINI meshes only (`pack_sim.py`
  `calib_pair`, inferred from the code).
- Legacy pose counts disagree: 416 in `README_R4.md`, 420 in `verify_sim.py`,
  402 and 532 in other notes (M02 Blockers table).
- `stl/davit_jaw_idle.stl` loses 6 of 780 triangles to the 1/1024 mm weld
  and is not watertight after it, although trimesh finds it watertight
  before the snap (computed 2026-10-06,
  `packages/mesh/test/fixtures/imported-oracle.json`). It imports with
  positive volume; the stage runner refuses it as a solid until it is
  re-exported.
- R3 carries the ten defects R4 fixed by mesh inspection, four of them
  fatal (`knowledge/designs/davit.md` section 1.2).
