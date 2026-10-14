# VERNIER legacy generator

The VERNIER rev A vinyl copper generator from the KEYWAY family
(`knowledge/designs/vernier.md`), copied byte identical from the
cricut-midi-seven bench (D-142, D-149). It is the oracle the
packages/copper port is held to (M05-T13); nothing here is edited, and
`git diff --stat reference/copper/*/legacy` stays empty after a run.

| file | copied from | sha256 | lineage.json rows |
|---|---|---|---|
| `gen_vernier.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/vernier/gen_vernier.py` | ed2f18042496b51573e7d4e9542f6d328e980f3bebc2ea6315b7b76e70366ea7 | vernier.generator/rev-a, vernier.generator/bench |
| `svgpath.py` | `fab-work-directory:benches/cricut-midi-seven/outputs/vernier/svgpath.py` | 5d568680fe0cd68d55269994d5cbbb04b3b38ff20a41629188795a6180857864 | svgpath/vernier-bench |
| `vernier_geometry.json` | `fab-work-directory:benches/cricut-midi-seven/outputs/vernier/vernier_geometry.json` | 10f5fe1ee99c5979fd4f881eec5c165379b91821e1547c72182f3f0b037fba0b | vernier.geometry/rev-a, vernier.geometry/bench |
| `run-2026-10-04.txt` | `fab-knowledge:originals/vernier/files/rerun/run-2026-10-04.txt` | 25230f36d1f30d2fc31dfbe52625f4be756a41d19a3d3067698d5f5e02f3cc3b | vernier.rerun/2026-10-04 |

`run-2026-10-04.txt` is the stdout of the 2026-10-04 rerun of the shipped
generator (computed, Python 3.14.6, shapely 2.1.2), kept as the record of
its gate list.

The generator reads three IBM Plex Mono woff2 files beside itself and the
owner's mark at `/mnt/skills/user/board-forge/assets/hackbuild-logo.svg`;
the bench folder shipped neither. Both are in `reference/copper/_inputs/`,
and `tools/py/copper/run_legacy_gen.py` runs the generator against them
without touching this folder:

    uv run --project tools/py tools/py/copper/run_legacy_gen.py vernier --out <dir>

`uv run --project tools/py tools/py/copper/test_oracle.py` runs all seven and
compares gates, min clearance, the gate list and the geometry JSON params
and stats to this folder.
