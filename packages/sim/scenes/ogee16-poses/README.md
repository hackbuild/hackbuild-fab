# OGEE R16-P audit poses

The pose files the `ogee16-printed` and `ogee16-printed-negatives` scenes
read, and the oracle output the checks and motion tests hold them to. All
of it is computed; none of it is a copy of an original.

| file | what |
|---|---|
| `printed-4.json` | the four states of `audit_print.py` `__main__` (rest, full select 0,0, all bars up, clear pull): per body the label, the STL name and the 4x4 transform `audit_print.build()` applied, and what `audit()` measures per pair |
| `printed-negatives.json` | the two M04-T11 step 5 poses, row bar 0 and column bar 1 at STROKE plus 3 |
| `export-poses.txt` | the stdout of `tools/py/ogee16/export_poses.py` that wrote both |
| `audit-print.txt` | the stdout of `audit_print.py` run unedited (four poses, clashes 0, TOTAL 0) |

`tools/py/ogee16/export_poses.py` writes the two pose files from the
original source tree (`fab-knowledge:originals/ogee16/files/src/source`)
beside the `print/` members of the original `ogee16-print-stl.zip`:

    HBF_ORIGINALS=<originals> uv run --project tools/py python tools/py/ogee16/export_poses.py

A rerun on 2026-10-21 wrote both files byte for byte equal to the ones
committed on 2026-10-04 from the legacy copy (computed). The pose files
enter the scene declaration hash, so their `origin` field keeps the label
they were first written with. The STLs they hash are stored as
`../inputs/ogee16/print/<name>.stl`.
