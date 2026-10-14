"""The BoardRecord a direct-route generator writes (spec/board-features.ts
BoardRecord, M08-T02), and the generator's output folder.

record.json carries every field but recordHash: the Node adapter stamps
the hash with packages/board withHash, the one implementation of the RFC
8785 hash (D-051), then validates the record with parseBoardRecord.

Output folder: a generator writes into a fresh sibling folder and moves it
over --out only after every gate passed and every file is written, so a
failing gate leaves --out as it was and writes no file (M08-T06 step 6).
"""
import argparse
import json
import os
import shutil

from shapely.geometry.polygon import orient

ORIGIN_TOL_MM = 1e-6


def args(description):
    ap = argparse.ArgumentParser(description=description)
    ap.add_argument("--out", required=True, help="output folder for the record and the fab set")
    ap.add_argument("--epoch", required=True, type=int, help="SOURCE_DATE_EPOCH, seconds")
    return ap.parse_args()


def outline_ring(poly):
    """The outer ring counter-clockwise, first point not repeated, in the board frame."""
    pts = [(float(x), float(y)) for x, y in orient(poly, 1.0).exterior.coords][:-1]
    mx = min(p[0] for p in pts)
    my = min(p[1] for p in pts)
    if abs(mx) > ORIGIN_TOL_MM or abs(my) > ORIGIN_TOL_MM:
        raise SystemExit(f"outline minimum ({mx}, {my}) is off the board origin")
    return [[0.0 if abs(x) <= ORIGIN_TOL_MM else x, 0.0 if abs(y) <= ORIGIN_TOL_MM else y] for x, y in pts]


def provenance(tier, method, date, source):
    return {"tier": tier, "method": method, "date": date, "source": source}


def nets_of(pads):
    """RecordNet rows from record pads: every named net, members sorted."""
    by = {}
    for p in pads:
        if p["net"] != "":
            by.setdefault(p["net"], []).append(f'{p["ref"]}.{p["pin"]}')
    return [{"name": n, "members": sorted(m)} for n, m in sorted(by.items())]


def write_sources(folder, layers):
    """Each layer's source geometry as WKB, <folder>/<layer>.wkb, so the
    reparse compares the parsed gerber with what was drawn (M08-T07)."""
    from shapely import wkb
    os.makedirs(folder, exist_ok=True)
    for name, geom in sorted(layers.items()):
        with open(os.path.join(folder, f"{name}.wkb"), "wb") as f:
            f.write(wkb.dumps(geom))


def write_json(path, value):
    with open(path, "w", newline="\n") as f:
        json.dump(value, f, indent=1, sort_keys=True)
        f.write("\n")


class StagedOut:
    """Write into <out>.partial, then replace <out> with it on commit."""

    def __init__(self, out):
        self.out = os.path.abspath(out)
        self.dir = self.out + ".partial"
        if os.path.exists(self.dir):
            shutil.rmtree(self.dir)

    def open(self):
        os.makedirs(self.dir)
        return self.dir

    def path(self, *p):
        return os.path.join(self.dir, *p)

    def commit(self):
        if os.path.exists(self.out):
            shutil.rmtree(self.out)
        os.replace(self.dir, self.out)
