"""OGEE R16 lasercut connectivity record (M07-T04, the oracle of
packages/nest/test/connect.test.ts).

Runs ../source/cutfiles.py's own functions on the shipped per-part DXFs in
../out/dxf/: rings_from_dxf gives each part's raw rings, polygon_from_rings
builds the profile, compensate buffers it at KERF 0.18 (inferred: the
script's default, "Set this from the test coupon", never measured), and
check_connected runs over the whole BOM as main() runs it. For every part
the record keeps the raw rings (the input nest's port classifies), the
hole count of the uncompensated profile, and the piece count, hole count
and bounds of the compensated one.

    uv run --project tools/py designs/ogee16/legacy/tools/connect-record.py [--write]

Writes packages/nest/records/ogee16-connect.json. Exit 1 when an input is
not the pinned copy, a count moved, or the result differs from the
committed record.
"""
import io, os, re, sys, contextlib

HERE = os.path.dirname(os.path.abspath(__file__))
LEGACY = os.path.abspath(os.path.join(HERE, ".."))
SRC = os.path.join(LEGACY, "source")
ROOT = os.path.abspath(os.path.join(LEGACY, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "py"))
sys.path.insert(0, SRC)

from legacy_record import Asserts, finish, read_pinned  # noqa: E402

PINS = {
    os.path.join(SRC, "cutfiles.py"): "ef535caca27def1a7b8a91e4c6273dfb1e85617c6087b93e4924debf3fb98800",
    os.path.join(SRC, "kin.py"): "d2d5a3250c438666179a511d7e87f0c1da9630c1c672eb570382c22f822c1de2",
    os.path.join(SRC, "params.scad"): "1c0a4b898b4977d87d435273a04857111fab5d43324bee591c2a6ad641591d6d",
}


def dxf_pins():
    """Pins of the unzipped out/dxf files, from ../SHA256SUMS."""
    pins = {}
    for line in open(os.path.join(LEGACY, "SHA256SUMS")):
        m = re.match(r"^([0-9a-f]{64})  (out/dxf/.+)$", line.rstrip("\n"))
        if m:
            pins[os.path.join(LEGACY, m.group(2))] = m.group(1)
    return pins


def main():
    import cutfiles
    import ezdxf
    import shapely
    from shapely.geometry import MultiPolygon
    pins = {**PINS, **dxf_pins()}
    if len(pins) != len(PINS) + 33:
        raise SystemExit("SHA256SUMS does not pin the 33 per-part DXFs")
    for p, s in pins.items():
        read_pinned(p, s)
    dxf_dir = os.path.join(LEGACY, "out", "dxf")
    geoms = lambda g: list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    parts, profiles = [], {}
    for name, qty in cutfiles.BOM:
        rings = cutfiles.rings_from_dxf(os.path.join(dxf_dir, name + ".dxf"))
        g = cutfiles.polygon_from_rings(rings)
        c = cutfiles.compensate(g, cutfiles.KERF)
        profiles[name] = c
        x0, y0, x1, y1 = c.bounds
        parts.append({
            "id": name, "qty": qty,
            "rings": [[list(p) for p in r] for r in rings],
            "holes": sum(len(p.interiors) for p in geoms(g)),
            "compensated": {
                "pieces": len(geoms(c)),
                "holes": sum(len(p.interiors) for p in geoms(c)),
                "x0": x0, "y0": y0, "w": x1 - x0, "h": y1 - y0,
            },
        })
    with contextlib.redirect_stdout(io.StringIO()):
        bad = cutfiles.check_connected(profiles)
    result = {
        "params": {"kerf": cutfiles.KERF, "kerfProvenance": "inferred (cutfiles.py default, never measured)"},
        "parts": parts,
        "distinctParts": len(parts),
        "rings": sum(len(p["rings"]) for p in parts),
        "severed": [[n, k] for n, k in bad],
    }
    a = Asserts()
    # The M07 Records table (computed): 27 distinct parts; main() nested them, so none was severed.
    a.eq("distinct parts", result["distinctParts"], 27)
    a.eq("severed", result["severed"], [])
    a.ok("every compensated part is one piece", all(p["compensated"]["pieces"] == 1 for p in parts))
    finish({
        "record": "ogee16-connect",
        "card": "M07-T04",
        "out": "packages/nest/records/ogee16-connect.json",
        "command": "uv run --project tools/py designs/ogee16/legacy/tools/connect-record.py",
        "qualifier": "computed: cutfiles.py rings_from_dxf, polygon_from_rings, compensate at KERF 0.18 and check_connected on the shipped per-part DXFs; counts and bounds by shapely",
        "inputs": pins,
        "versions": {"ezdxf": ezdxf.__version__, "shapely": shapely.__version__},
    }, result, a)
    print(f"{result['distinctParts']} distinct parts, {result['rings']} rings, {len(result['severed'])} severed")


if __name__ == "__main__":
    main()
