"""SPLICE rev C cut file figures with shapely (M05-T14).

Run from the repo root:

    uv run --project tools/py tools/py/copper/dump_splice.py > reference/copper/splice-ladder/expected/oracle-shapely.json

Reads reference/copper/splice-ladder/legacy/splice-copper.svg (lineage
splice.copper/rev-c), one closed evenodd path per net in file order,
through the KEYWAY family's svgpath.py (reference/copper/keyway/legacy),
and writes each net's area, the least gap between nets with its pair,
and each net's piece count after eroding by 0.75 mm (the SPLICE README's
weedability statement) and by 0.80 mm (the margin probe of M05-T14). Net
names follow the key order of the bench's splice3d.json. The port in
packages/copper is held to these numbers by
reference/copper/splice-ladder/test/parity.test.ts.
"""
import json
import os
import re
import sys

sys.dont_write_bytecode = True
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "reference", "copper", "keyway", "legacy"))
import svgpath  # noqa: E402

NAMES = ("SIGA", "5V", "GND", "SIGB", "BASE1", "BASE2", "COL")


def pieces(g):
    return 0 if g.is_empty else (1 if g.geom_type == "Polygon" else len(g.geoms))


def main():
    with open(os.path.join(ROOT, "reference", "copper", "splice-ladder", "legacy", "splice-copper.svg"), encoding="utf-8") as f:
        text = f.read()
    ds = re.findall(r'<path d="([^"]+)"', text)
    if len(ds) != len(NAMES):
        raise SystemExit("dump_splice: %d paths, expected %d" % (len(ds), len(NAMES)))
    nets = [(n, svgpath.path_geom(d)) for n, d in zip(NAMES, ds)]
    gap, pair = 99.0, ""
    for i in range(len(nets)):
        for j in range(i + 1, len(nets)):
            d = nets[i][1].distance(nets[j][1])
            if d < gap:
                gap, pair = d, "%s/%s" % (nets[i][0], nets[j][0])
    json.dump(dict(
        note="SPLICE rev C copper figures computed by tools/py/copper/dump_splice.py with shapely 2.1.2 on the shipped SVG. Do not edit.",
        nets={n: round(g.area, 4) for n, g in nets},
        islands={n: pieces(g) for n, g in nets},
        min_gap=gap,
        pair=pair,
        erode={"0.75": {n: pieces(g.buffer(-0.75)) for n, g in nets}, "0.80": {n: pieces(g.buffer(-0.80)) for n, g in nets}},
    ), sys.stdout, indent=1)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
