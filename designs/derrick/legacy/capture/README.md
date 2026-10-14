# DERRICK capture fixture

The bodies and the 37 tests of PINTLE R6 `snap_check.py`, the capture
check DERRICK R3 ships with, written so the TypeScript capture assertions
(D-074, M04-T06) can run them on manifold-3d 3.5.4 and agree with the
Python run. `shasum -a 256 -c SHA256SUMS` checks this folder.

| field | value |
|---|---|
| record | `knowledge/designs/pintle.md` section 5 and the `snap_check.py` row; `knowledge/designs/derrick.md` |
| written by | `uv run --project tools/py tools/py/derrick/export_bodies.py` from the repo root |
| sources | `originals/pintle/files/src/pintle_parts.py` and `snap_check.py` (lineage `pintle.parts/r6`, `pintle.snap-check/r6`, canonical), `originals/derrick/files/src/arm_parts.py` (`derrick.parts/r3`, canonical); the script refuses a source whose sha256 differs |
| oracle | `snap_check_run_2026-10-05.txt`, a byte copy of `originals/pintle/files/records/snap_check_run_2026-10-05.txt`: the rerun of `snap_check.py` from the canonical source, FAILURES 0 (computed) |
| read by | `packages/checks/test/capture.test.ts` |

## Files

| file | what |
|---|---|
| `*.stl` | 14 binary STLs, mm, each body in the pose `snap_check.py` reads it before a test moves it: `tool_plate` raised to `D['z_top']`, `hinge_on_rotor` placed by the line 86 to 90 transform, the four tool paths (`lock_path`, `driver_path`, `shank_path`, `screw_head`) as built at lines 60, 75, 77 and 80 |
| `tests.json` | the 37 tests in `snap_check.py` order: label, `a`, `b`, `move`, `want` (`traps` or `clear`), and the `snap_check.py` line; the floor 1.0 mm3 from line 25 |
| `snap_check_run_2026-10-05.txt` | the oracle volumes, printed to 0.01 mm3 |

Each test is one normal form: the move applies to `a`, rotation about z
through the origin first, then translation, and the volume is the
intersection of the moved `a` with `b`. Where `snap_check.py` moves its
second argument (lines 39, 99 and 100) the exporter swaps the pair; an
intersection volume does not depend on argument order.

10 tests want traps (volume over 1.0 mm3) and 27 want clear (under
1.0 mm3), counted from `tests.json` and equal to the oracle record.
