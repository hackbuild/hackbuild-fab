# DERRICK legacy copy

The DERRICK R3 arm build, its forward kinematics golden and the viewer
smoke script, kept byte identical as the inputs of the M07-T10 kinematics
port (D-142, D-156). Nothing here is edited; `shasum -a 256 -c SHA256SUMS`
checks this folder and `cd capture && shasum -a 256 -c SHA256SUMS` checks
`capture/` (M04-T06).

| field | value |
|---|---|
| record | `knowledge/designs/derrick.md` (sections 1.2, 5.1, 5.5) |
| copied from | `fab-knowledge:originals/derrick/files/src/` (`arm_build.py`, `arm_ref.json`, `smoke_arm.js`), byte identical to `fab-work-directory:benches/pintle-derrick/outputs/derrick/src/`; `arm_ref_regenerated_2026-10-05.json` from `originals/derrick/files/records/` |
| lineage rows | `derrick.build/r3` (canonical, `arm_build.py`) |
| read by | `packages/motion/scripts/derrick_fk_golden.py` (runs the canonical `arm_build.py` from `originals/`, checked against the sha256 here), `packages/motion/test/derrick-fk.test.ts` |

## The two arm_ref.json files

`arm_ref.json` is the golden `smoke_arm.js` compares the viewer against at
0.0005 mm and 0.00005 kg cm. It was written at 18:18 on 2026-08-10 by R1
and is stale against the shipped `arm_build.py`: the home tool sits at
(55.55, 23.279, 186.605) by the shipped source and viewer, and at (48.75,
18.017, 181.49) in this file (computed, `knowledge/designs/derrick.md`
1.2). `arm_ref_regenerated_2026-10-05.json` is `arm_build.py` rerun from
the canonical source; the port is held to it, and the test asserts the
stale file still differs, so a regenerated copy that replaced it would be
seen.

`smoke_arm.js` is kept as the record of the legacy tolerances; it needs
jsdom and the built viewer page and is not run here (not run).
