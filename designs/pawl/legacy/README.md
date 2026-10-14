# PAWL legacy copy

The PAWL Rapier trial suite and its sim core, kept byte identical as the
inputs of M02-T03 (D-142, D-156), with the M02 run records beside them.
Nothing here is edited; `shasum -a 256 -c SHA256SUMS` checks it.

| field | value |
|---|---|
| record | `knowledge/designs/pawl.md` |
| phase | 1, viewers over generators (2026-07-30; `syn/patterns-and-lineage.md` section 1) |
| copied from | `fab-work-directory:benches/pawl/outputs/pawl/` (`final.mjs`, `core.mjs`; both byte identical to `originals/pawl/files/src/`) |
| records | `records/` from `fab-knowledge:evidence/x/pawlrun/`: `run1.txt` and `run2.txt` (rapier3d-compat 0.14.0), `det1.txt` and `det2.txt` with `final_det.mjs` (rapier3d-deterministic-compat 0.21.0), `snap.mjs` (the snapshot hash record), `v21/c21.txt` (rapier3d-compat 0.21.0) |
| lineage rows | `pawl.core/final` (canonical), `pawl.core/bench` (this copy's source) |

## Kernels

Consumed: `@dimforge/rapier3d-compat` 0.14.0 (the page's import map),
three.js 0.160.0 in the page.

Introduced: the Rapier world, PD actuator with slew and reflected inertia,
closed form leg IK and the 17-trial suite (`core.mjs`, `final.mjs`).

## Known unfixed defects

- The open loop trial is labelled "should fail" and passes on 0.14.0, and
  `final.mjs` exits 0 whatever happens, so its labels are prose (D-153).
- On 0.21.0 the suite passes 9 of 17 against 15 of 17 on 0.14.0 (computed,
  one machine, M02 records); the drop follows the version change.
- Notes that say 16 trials miscount; `final.mjs` runs 17.
