# FRET legacy generator

The FRET rev A vinyl copper generator from the KEYWAY family
(`knowledge/designs/fret.md`), copied byte identical from the
cricut-midi-seven bench (D-142, D-149). It is the oracle the
packages/copper port is held to (M05-T13); nothing here is edited, and
`git diff --stat reference/copper/*/legacy` stays empty after a run.

| file | copied from | sha256 | lineage.json rows |
|---|---|---|---|
| `gen_fret.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/fret/gen_fret.py` | 301f6ffc2529d7193cc57fd7406e5c6da01340d1064288253dad7fa5a5507481 | fret.generator/rev-a, fret.generator/bench |
| `svgpath.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/fret/svgpath.py` | 5d568680fe0cd68d55269994d5cbbb04b3b38ff20a41629188795a6180857864 | svgpath/fret-bench |
| `fret_geometry.json` | `fab-work-directory:benches/cricut-midi-seven/outputs/fret/fret_geometry.json` | 568bae8c2622e34215f64183dcc34c87f7d6e526f7eb74c4a889a3c4e42dbb84 | fret.geometry/rev-a, fret.geometry/bench |
| `run-2026-10-04.txt` | `fab-knowledge:originals/fret/files/rerun/run-2026-10-04.txt` | 7a17ad05d03be62cd962fb7c1d431bfdf85725ae8f2dd715c844c16f7d0d6387 | fret.rerun/2026-10-04 |

`run-2026-10-04.txt` is the stdout of the 2026-10-04 rerun of the shipped
generator (computed, Python 3.14.6, shapely 2.1.2), kept as the record of
its gate list.

The generator reads three IBM Plex Mono woff2 files beside itself and the
owner's mark at `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`;
the bench folder shipped neither. Both are in `reference/copper/_inputs/`,
and `tools/py/copper/run_legacy_gen.py` runs the generator against them
without touching this folder:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py fret --out <dir>

`uv run --project tools/py tools/py/copper/test_oracle.py` runs all seven and
compares gates, min clearance, the gate list and the geometry JSON params
and stats to this folder.
