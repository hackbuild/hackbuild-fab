# QUADRANT legacy generator

The QUADRANT rev A vinyl copper generator from the KEYWAY family
(`knowledge/designs/quadrant.md`), copied byte identical from the
cricut-midi-seven bench (D-142, D-149). It is the oracle the
packages/copper port is held to (M05-T13); nothing here is edited, and
`git diff --stat reference/copper/*/legacy` stays empty after a run.

| file | copied from | sha256 | lineage.json rows |
|---|---|---|---|
| `gen_quadrant.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/quadrant/gen_quadrant.py` | a6783b385d6c2e44732a072c9e9f31dd9e8aa65a2d6721ac75ddabff2efd5fcd | quadrant.generator/rev-a, quadrant.generator/bench |
| `svgpath.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/quadrant/svgpath.py` | 5d568680fe0cd68d55269994d5cbbb04b3b38ff20a41629188795a6180857864 | svgpath/quadrant-bench |
| `quadrant_geometry.json` | `fab-work-directory:benches/cricut-midi-seven/outputs/quadrant/quadrant_geometry.json` | a2a62e056688b1c29deed7c462016f4311e2fecb3ba60d82b71ee21c919093af | quadrant.geometry/rev-a, quadrant.geometry/bench |
| `run-2026-10-04.txt` | `fab-knowledge:originals/quadrant/files/rerun/run-2026-10-04.txt` | 50861e66467208781988f5bd745d93fa0a360283722e3b9d817c3f1dab84efc3 | quadrant.rerun/2026-10-04 |

`run-2026-10-04.txt` is the stdout of the 2026-10-04 rerun of the shipped
generator (computed, Python 3.14.6, shapely 2.1.2), kept as the record of
its gate list.

The generator reads three IBM Plex Mono woff2 files beside itself and the
owner's mark at `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`;
the bench folder shipped neither. Both are in `reference/copper/_inputs/`,
and `tools/py/copper/run_legacy_gen.py` runs the generator against them
without touching this folder:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py quadrant --out <dir>

`uv run --project tools/py tools/py/copper/test_oracle.py` runs all seven and
compares gates, min clearance, the gate list and the geometry JSON params
and stats to this folder.
