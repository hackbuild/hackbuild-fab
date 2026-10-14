"""The pair fixture with a short (core/test/fixtures/boards/pair/gen.py,
main(short=True)): one net A track at x 10 runs across the net B trace, so
CHK-BRD-21 fails and a gerbers export stops at its check stage. A test
fixture, never a reference.

Run: uv run --project tools/py core/test/fixtures/boards/pair-short/gen.py --out <dir> --epoch <s>
"""
import importlib.util
import os

PAIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pair", "gen.py")

if __name__ == "__main__":
    spec = importlib.util.spec_from_file_location("pair_gen", PAIR)
    pair = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pair)
    pair.main(short=True)
