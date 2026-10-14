# PAWL exports for CHK-PRT-12

Byte copies of three STL exports of record and the figures PAWL fdm.py
gives on them. CHK-PRT-12 ports fdm.py analyse(); test/overhang.test.ts
holds the check to these figures.

| file | source of record |
|---|---|
| foot.stl, thigh.stl, ankle_yoke.stl | `fab-knowledge:originals/pawl/files/exports/` |
| fdm-golden.json | written by fdm_golden.py from `fab-knowledge:originals/pawl/files/src/fdm.py` |

The sha256 of each copy and of fdm.py is in fdm-golden.json; the test
compares them with the originals when those are on the machine and says
not run when they are not.

Regenerate from the repo root:

    uv run --project tools/py python packages/checks/test/originals/pawl/fdm_golden.py

fdmPyPct is what fdm.py prints (computed). pastLimitPct is fdm.py with a
face within 1e-4 deg of 45 at the limit, the figure CHK-PRT-12 reports
(computed). They differ by the modelled 45 deg faces that fdm.py's float32
test counts by rounding: foot 1.9741 against 1.4284, thigh 2.9630 against
2.5394, ankle yoke 2.5748 against 2.1049.
