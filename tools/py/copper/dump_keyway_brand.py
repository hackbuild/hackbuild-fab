"""KEYWAY's brand-in-copper figures from the legacy generator (M05-T14).

Run from the repo root:

    uv run --project tools/py tools/py/copper/dump_keyway_brand.py > reference/copper/keyway/expected/oracle-brand-stats.json

The bench shipped no geometry JSON for KEYWAY_BRAND=1, and the README's
brand figures (7533 mm2, +557 mm2, 13 islands, 9.73 mm from the nearest
net) are prose. This runs the pinned generator with the brand on, through
run_legacy_gen.py's inputs, and writes what it computes: its own stats,
the brand art's area and island count (the mark and the wordmark, ticks
excluded) and the brand art's distance to the nearest net, with that net.
packages/copper's port is held to these numbers by
reference/copper/keyway/test/parity.test.ts.
"""
import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dump_lanes  # noqa: E402


def main():
    g = dump_lanes.globals_after_run("keyway", brand=True)
    from shapely.ops import unary_union
    brand = unary_union(g["MARK"] + [g["wm1"], g["wm2"]])
    near = min(((k, brand.distance(v)) for k, v in g["NET"].items()), key=lambda kv: kv[1])
    copper = g["COPPER"]
    json.dump(dict(
        note="KEYWAY with KEYWAY_BRAND=1, computed by tools/py/copper/dump_keyway_brand.py from the pinned legacy generator (Python 3.14, shapely 2.1.2). Do not edit.",
        copper_area=round(copper.area, 4),
        brand_area=round(brand.area, 4),
        brand_islands=1 if brand.geom_type == "Polygon" else len(brand.geoms),
        brand_nearest_net=near[0],
        brand_nearest_mm=round(near[1], 4),
        art_islands=1 if g["ART"].geom_type == "Polygon" else len(g["ART"].geoms),
        min_clearance=g["worst"][0],
        tightest_pair=g["worst"][1],
    ), sys.stdout, indent=1)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
