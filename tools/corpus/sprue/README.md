# sprue corpus rows

SPRUE geometry parity (M00-T12, D-028). Both files are written by the tests,
never by hand.

| file | written by |
|---|---|
| `parity-ts.json` | `npx vitest run tools/parity/sprue.test.ts` (packages/3mf) |
| `parity-py.json` | `uv run --project tools/py pytest tools/py/test/test_sprue.py` (tools/py/orca3mf.py) |

Inputs are repo copies of the SPRUE harvest
(`fab-work-directory:benches/sprue/outputs/sprue/`),
byte-identical to it: the four plates in `tools/corpus/3mf/sprue/*.3mf`, read
through their `p:path` sub-models, and the four part STLs in `parts/*.stl`
here. Each is re-emitted with two PETG filaments on the ffc5p machine preset and read back.

Each file holds, per plate, SPRUE's project_settings key counts against the
writer's, per part the volume, bounding box and triangle deltas (computed),
and the `validate_3mf.py --overlap` failures of the re-emit beside those of
the source in `--legacy` mode. A re-emit carries the source geometry
unchanged, so it can fail only where its source fails;
`sprue_picks_phx_backonly.3mf` fails CHK-PRT-01 topology on its white part
in both.
