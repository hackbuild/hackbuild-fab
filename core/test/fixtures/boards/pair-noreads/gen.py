"""The pair fixture with no catalog read in its record
(core/test/fixtures/boards/pair/gen.py, main(reads=False)): both headers are
placed and nothing accounts for their pads, so a fabrication export stops
at the provenance gate with one E_PROVENANCE per part. A test fixture,
never a reference.

Run: uv run --project tools/py core/test/fixtures/boards/pair-noreads/gen.py --out <dir> --epoch <s>
"""
import importlib.util
import os

PAIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pair", "gen.py")

if __name__ == "__main__":
    spec = importlib.util.spec_from_file_location("pair_gen", PAIR)
    pair = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pair)
    pair.main(reads=False)
