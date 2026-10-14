# SPLINE legacy generator

The SPLINE rev A vinyl copper generator from the KEYWAY family
(`knowledge/designs/spline.md`), copied byte identical from the
cricut-midi-seven bench (D-142, D-149). It is the oracle the
packages/copper port is held to (M05-T13); nothing here is edited, and
`git diff --stat reference/copper/*/legacy` stays empty after a run.

| file | copied from | sha256 | lineage.json rows |
|---|---|---|---|
| `gen_spline.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/spline/gen_spline.py` | 62491f4eec5699880bcc1b1d1529b936ec5e31e1c24788880898d9b7cc4bc3d6 | spline.generator/rev-a, spline.generator/bench |
| `svgpath.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/spline/svgpath.py` | 5d568680fe0cd68d55269994d5cbbb04b3b38ff20a41629188795a6180857864 | svgpath/spline-bench |
| `spline_geometry.json` | `fab-work-directory:benches/cricut-midi-seven/outputs/spline/spline_geometry.json` | 6134d155aa6d378a3eab246409dd182d921ab9ac7b0c63a893dc3f7d3ca0981a | spline.geometry/rev-a, spline.geometry/bench |
| `run-2026-10-04.txt` | `fab-knowledge:originals/spline/files/rerun/run-2026-10-04.txt` | 2a6dfba905a784fa81fd2eec0df9c59a6591e8ddf01c6b32c2d0b703b5e8b8a9 | spline.rerun/2026-10-04 |

`run-2026-10-04.txt` is the stdout of the 2026-10-04 rerun of the shipped
generator (computed, Python 3.14.6, shapely 2.1.2), kept as the record of
its gate list.

The generator reads three IBM Plex Mono woff2 files beside itself and the
owner's mark at `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`;
the bench folder shipped neither. Both are in `reference/copper/_inputs/`,
and `tools/py/copper/run_legacy_gen.py` runs the generator against them
without touching this folder:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py spline --out <dir>

`uv run --project tools/py tools/py/copper/test_oracle.py` runs all seven and
compares gates, min clearance, the gate list and the geometry JSON params
and stats to this folder.
