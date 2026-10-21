"""OGEE R16 lasercut footprints record (M07-T03, the input of the GUSSET
sort-order test, packages/nest/test/gusset-orders.test.ts).

Builds every BOM part of ../legacy/source/cutfiles.py with its own functions
(rings_from_dxf, polygon_from_rings, compensate at its KERF 0.18; inferred:
the script's default, "Set this from the test coupon", never measured) on
the shipped per-part DXFs in ../legacy/out/dxf/, and records each compensated
profile's bounds (x0, y0, w, h in mm, shapely bounds) with its BOM
quantity. These are the 183 pieces that cutfiles.py shelf-nests onto three
600 x 400 sheets (packages/nest/records/ogee16-cut-legacy.json); the nest
test packs the same footprints with GUSSET's nest() and with nest's port.

    uv run --project tools/py designs/ogee16/extract/footprint-record.py [--write]

Writes packages/nest/records/ogee16-cut-footprints.json. Exit 1 when an
input is not the pinned copy, a count moved, or the result differs from
the committed record.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "py"))

from legacy_record import Asserts, finish, legacy_dir, legacy_file, read_pinned  # noqa: E402

# The legacy copies are held in the originals (R1-rails-public-11); legacy_file
# finds each by its repo path, and the record keeps that path as its key.
LEGACY = "designs/ogee16/legacy"
SRC = legacy_dir(f"{LEGACY}/source")
sys.path.insert(0, SRC)

PINS = {
    legacy_file(f"{LEGACY}/source/cutfiles.py"): "ef535caca27def1a7b8a91e4c6273dfb1e85617c6087b93e4924debf3fb98800",
    legacy_file(f"{LEGACY}/source/kin.py"): "d2d5a3250c438666179a511d7e87f0c1da9630c1c672eb570382c22f822c1de2",
    legacy_file(f"{LEGACY}/source/params.scad"): "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d",
}


def dxf_pins():
    """Pins of the unzipped out/dxf files, from ../legacy/SHA256SUMS."""
    pins = {}
    for line in open(os.path.join(ROOT, LEGACY, "SHA256SUMS")):
        m = re.match(r"^([0-9a-f]{64})  (out/dxf/.+)$", line.rstrip("\n"))
        if m:
            pins[legacy_file(f"{LEGACY}/{m.group(2)}")] = m.group(1)
    return pins


def main():
    import cutfiles
    import ezdxf
    import shapely
    pins = {**PINS, **dxf_pins()}
    if len(pins) != len(PINS) + 33:
        raise SystemExit("SHA256SUMS does not pin the 33 per-part DXFs")
    for p, s in pins.items():
        read_pinned(p, s)
    dxf_dir = legacy_dir(f"{LEGACY}/out/dxf")
    parts = []
    for name, qty in cutfiles.BOM:
        g = cutfiles.compensate(cutfiles.polygon_from_rings(cutfiles.rings_from_dxf(os.path.join(dxf_dir, name + ".dxf"))), cutfiles.KERF)
        x0, y0, x1, y1 = g.bounds
        parts.append({"id": name, "qty": qty, "x0": x0, "y0": y0, "w": x1 - x0, "h": y1 - y0})
    result = {
        "params": {"kerf": cutfiles.KERF, "kerfProvenance": "inferred (cutfiles.py default, never measured)",
                   "sheetW": cutfiles.SHEET_W, "sheetH": cutfiles.SHEET_H, "gap": cutfiles.GAP},
        "parts": parts,
        "distinctParts": len(parts),
        "pieces": sum(p["qty"] for p in parts),
    }
    a = Asserts()
    # The M07 Records table (computed): 27 distinct parts, 183 pieces.
    a.eq("distinct parts", result["distinctParts"], 27)
    a.eq("pieces", result["pieces"], 183)
    a.ok("every footprint fits the 600 x 400 sheet in some turn",
         all((p["w"] <= 600 and p["h"] <= 400) or (p["h"] <= 600 and p["w"] <= 400) for p in parts))
    finish({
        "record": "ogee16-cut-footprints",
        "card": "M07-T03",
        "out": "packages/nest/records/ogee16-cut-footprints.json",
        "command": "uv run --project tools/py designs/ogee16/extract/footprint-record.py",
        "qualifier": "computed: cutfiles.py rings_from_dxf, polygon_from_rings and compensate at KERF 0.18 on the shipped per-part DXFs; bounds by shapely",
        "inputs": pins,
        "versions": {"ezdxf": ezdxf.__version__, "shapely": shapely.__version__},
    }, result, a)
    print(f"{result['distinctParts']} distinct parts, {result['pieces']} pieces")


if __name__ == "__main__":
    main()
