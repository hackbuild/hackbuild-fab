# TESSERA legacy generator

The TESSERA rev A vinyl copper generator from the KEYWAY family
(`knowledge/designs/tessera.md`), copied byte identical from the
cricut-midi-seven bench (D-142, D-149). It is the oracle the
packages/copper port is held to (M05-T13); nothing here is edited, and
`git diff --stat reference/copper/*/legacy` stays empty after a run.

| file | copied from | sha256 | lineage.json rows |
|---|---|---|---|
| `gen_tessera.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/tessera/gen_tessera.py` | 9eba22a9b6f862cf9fca24db15ffb4a2c1adec93eb2ce7745cf0957156f68f92 | tessera.generator/rev-a, tessera.generator/bench |
| `svgpath.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/tessera/svgpath.py` | 5d568680fe0cd68d55269994d5cbbb04b3b38ff20a41629188795a6180857864 | svgpath/tessera-bench |
| `tessera_geometry.json` | `fab-work-directory:benches/cricut-midi-seven/outputs/tessera/tessera_geometry.json` | 2d30108d2af19c4faf8816d57f02d4e379ec50106ace3284af82421328d0ffa5 | tessera.geometry/rev-a, tessera.geometry/bench |
| `run-2026-10-04.txt` | `fab-knowledge:originals/tessera/files/rerun/run-2026-10-04.txt` | e5d30cd0a2899fd5ae6eb7049159f155c5999b030442be513e496509c723b3c6 | tessera.rerun/2026-10-04 |

`run-2026-10-04.txt` is the stdout of the 2026-10-04 rerun of the shipped
generator (computed, Python 3.14.6, shapely 2.1.2), kept as the record of
its gate list.

The generator reads three IBM Plex Mono woff2 files beside itself and the
owner's mark at `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`;
the bench folder shipped neither. Both are in `reference/copper/_inputs/`,
and `tools/py/copper/run_legacy_gen.py` runs the generator against them
without touching this folder:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py tessera --out <dir>

`uv run --project tools/py tools/py/copper/test_oracle.py` runs all seven and
compares gates, min clearance, the gate list and the geometry JSON params
and stats to this folder.
