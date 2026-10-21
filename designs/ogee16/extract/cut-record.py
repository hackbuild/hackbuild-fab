"""OGEE R16 lasercut rerun record (M07-T01, the cutfiles.py row of the M07
Records table).

Runs ../legacy/source/cutfiles.py main() unchanged on the shipped per-part DXFs in
../legacy/out/dxf/ (from ogee16-cut.zip) with its own KERF 0.18 (inferred: the
script's default, "Set this from the test coupon", never measured), sheet
600 x 400 and gap 4. cutfiles.OUT is pointed at a temporary folder that
links ../legacy/out/dxf, so the shipped ../legacy/out/cut/ is never overwritten. The
rerun sheets are compared with the shipped ../legacy/out/cut/sheet1.dxf to
sheet3.dxf ring by ring: LWPOLYLINE vertex lists read with ezdxf, in file
order and as a multiset.

    uv run --project tools/py designs/ogee16/extract/cut-record.py [--write]

Writes packages/nest/records/ogee16-cut-legacy.json. Exit 1 when an input
is not the pinned copy, a number of the M07 Records table moved, or the
result differs from the committed record.
"""
import contextlib, glob, hashlib, io, os, re, sys, tempfile

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
    legacy_file(f"{LEGACY}/ogee16-cut.zip"): "24f3af409b692f0d0aaecd8bc9f890b1b8c3834d42def2f50fa56e0e22f50b93",
}


def sums():
    """Pins of the unzipped out/cut and out/dxf files, from ../legacy/SHA256SUMS."""
    pins = {}
    for line in open(os.path.join(ROOT, LEGACY, "SHA256SUMS")):
        m = re.match(r"^([0-9a-f]{64})  (out/(?:cut|dxf)/.+)$", line.rstrip("\n"))
        if m:
            pins[legacy_file(f"{LEGACY}/{m.group(2)}")] = m.group(1)
    return pins


def rings(path):
    import ezdxf
    doc = ezdxf.readfile(path)
    return [[(x, y) for x, y, *_ in e.get_points()] for e in doc.modelspace() if e.dxftype() == "LWPOLYLINE"]


def main():
    import cutfiles
    import ezdxf
    pins = {**PINS, **sums()}
    for p, s in pins.items():
        read_pinned(p, s)
    if len([p for p in pins if "/out/dxf/" in p]) != 33 or len([p for p in pins if "/out/cut/" in p]) != 6:
        raise SystemExit("SHA256SUMS does not pin the 33 per-part DXFs and the 6 shipped sheet files")

    with tempfile.TemporaryDirectory() as d:
        os.symlink(legacy_dir(f"{LEGACY}/out/dxf"), os.path.join(d, "dxf"))
        cutfiles.OUT = d
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            cutfiles.main()
        text = buf.getvalue()
        per_sheet = [int(n) for n in re.findall(r"^sheet\d+: (\d+) pieces$", text, re.M)]
        m = re.search(r"^(\d+) distinct parts, (\d+) pieces, (\d+) sheets of (\d+)x(\d+), (\d+) cm2 of material$", text, re.M)
        sheets = []
        for k in range(1, len(per_sheet) + 1):
            mine = os.path.join(d, "cut", f"sheet{k}")
            ship = os.path.join(legacy_dir(f"{LEGACY}/out/cut"), f"sheet{k}")
            a, b = rings(mine + ".dxf"), rings(ship + ".dxf")
            key = lambda r: tuple((round(x, 6), round(y, 6)) for x, y in r)
            same_order = [len(r) for r in a] == [len(r) for r in b]
            in_order = max((max(abs(p[0] - q[0]), abs(p[1] - q[1])) for ra, rb in zip(a, b) for p, q in zip(ra, rb)), default=0.0) if same_order else None
            sheets.append({
                "sheet": k, "pieces": per_sheet[k - 1], "rings": len(a), "shippedRings": len(b),
                "ringVertexCountsInOrderEqual": same_order,
                "maxVertexDeltaInFileOrderMm": in_order,
                "ringMultisetEqual": sorted(map(key, a)) == sorted(map(key, b)),
                "ringsOutOfOrder": sum(1 for x, y in zip(map(key, a), map(key, b)) if x != y),
                "dxfBytesEqual": open(mine + ".dxf", "rb").read() == open(ship + ".dxf", "rb").read(),
                "svgBytesEqual": open(mine + ".svg", "rb").read() == open(ship + ".svg", "rb").read(),
                "svgSha256": hashlib.sha256(open(mine + ".svg", "rb").read()).hexdigest(),
            })
    result = {
        "params": {"kerf": cutfiles.KERF, "kerfProvenance": "inferred (cutfiles.py default, never measured)",
                   "sheetW": cutfiles.SHEET_W, "sheetH": cutfiles.SHEET_H, "gap": cutfiles.GAP},
        "bom": [[n, q] for n, q in cutfiles.BOM],
        "distinctParts": int(m.group(1)), "pieces": int(m.group(2)), "sheets": int(m.group(3)),
        "materialCm2": int(m.group(6)), "piecesPerSheet": per_sheet, "perSheet": sheets,
    }

    a = Asserts()
    # The M07 Records table, 2026-10-04 (computed), corrected 2026-10-08:
    # sheets 1 and 2 hold the shipped rings in another order, not swapped
    # placements; the 102 mm is the vertex delta in file order and the
    # Hausdorff distance between the two ring sets is 0.
    a.eq("distinct parts", result["distinctParts"], 27)
    a.eq("pieces", result["pieces"], 183)
    a.eq("sheets", result["sheets"], 3)
    a.eq("pieces per sheet", per_sheet, [2, 13, 168])
    a.eq("ring multiset equal to the shipped sheets", [s["ringMultisetEqual"] for s in sheets], [True, True, True])
    a.eq("ring vertex counts in order", [s["ringVertexCountsInOrderEqual"] for s in sheets], [True, True, True])
    a.ok("sheet 3 vertices in file order within 1e-6 mm", sheets[2]["maxVertexDeltaInFileOrderMm"] <= 1e-6, str(sheets[2]["maxVertexDeltaInFileOrderMm"]))
    a.eq("sheets 1 and 2 file order delta, mm", [round(s["maxVertexDeltaInFileOrderMm"]) for s in sheets[:2]], [102, 102])
    a.eq("dxf bytes differ", [s["dxfBytesEqual"] for s in sheets], [False, False, False])

    finish({
        "record": "ogee16-cut-legacy",
        "out": "packages/nest/records/ogee16-cut-legacy.json",
        "command": "uv run --project tools/py designs/ogee16/extract/cut-record.py",
        "qualifier": "computed: cutfiles.py main() rerun on the shipped per-part DXFs; compared with the shipped sheets through ezdxf",
        "inputs": pins,
        "versions": {"ezdxf": ezdxf.__version__},
    }, result, a)
    print(f"{result['distinctParts']} distinct parts, {result['pieces']} pieces, {result['sheets']} sheets "
          f"of 600 x 400 ({', '.join(map(str, per_sheet))} pieces); ring sets equal to the shipped sheets: "
          f"{[s['ringMultisetEqual'] for s in sheets]}")


if __name__ == "__main__":
    main()
