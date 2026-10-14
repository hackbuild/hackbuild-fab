# STAVE legacy generator

The STAVE rev A vinyl copper generator from the KEYWAY family
(`knowledge/designs/stave.md`), copied byte identical from the
cricut-midi-seven bench (D-142, D-149). It is the oracle the
packages/copper port is held to (M05-T13); nothing here is edited, and
`git diff --stat reference/copper/*/legacy` stays empty after a run.

| file | copied from | sha256 | lineage.json rows |
|---|---|---|---|
| `gen_stave.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/stave/gen_stave.py` | 0d7a79321b8069a518ce57e362665b2a719368525838a729eb27db1fcda12100 | stave.generator/rev-a, stave.generator/bench |
| `svgpath.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/stave/svgpath.py` | 5d568680fe0cd68d55269994d5cbbb04b3b38ff20a41629188795a6180857864 | svgpath/stave-bench |
| `stave_geometry.json` | `fab-work-directory:benches/cricut-midi-seven/outputs/stave/stave_geometry.json` | a3743c6dd3536524eaf07b28a9a1312b31fb43fb5f71d6c91e536a8a7711818d | stave.geometry/rev-a, stave.geometry/bench |
| `run-2026-10-04.txt` | `fab-knowledge:originals/stave/files/rerun/run-2026-10-04.txt` | f6d9c9468933986dc2f47dbacc11cdaf23338e7796b61c7ef606a93d841342a9 | stave.rerun/2026-10-04 |

`run-2026-10-04.txt` is the stdout of the 2026-10-04 rerun of the shipped
generator (computed, Python 3.14.6, shapely 2.1.2), kept as the record of
its gate list.

The generator reads three IBM Plex Mono woff2 files beside itself and the
owner's mark at `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`;
the bench folder shipped neither. Both are in `reference/copper/_inputs/`,
and `tools/py/copper/run_legacy_gen.py` runs the generator against them
without touching this folder:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py stave --out <dir>

`uv run --project tools/py tools/py/copper/test_oracle.py` runs all seven and
compares gates, min clearance, the gate list and the geometry JSON params
and stats to this folder.
