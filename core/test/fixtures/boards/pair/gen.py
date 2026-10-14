"""A two-header test board on the direct-emit library, for the export.run
gate path (M08-T14): two PinHeader_1x02_P2.54mm_Vertical parts joined by two
top traces. It is a test fixture, never a reference: its one catalog read
names the KiCad v5 footprint at tier community because the SPINDLE R1 parts
audit found J4's pads equal to that library file within 0.01 mm
(reference/boards/spindle-r1/parts.audit.json), and the pad numbers below
are those of J4 (pcb.py lines 132 to 133: 1.7 mm pads, 1.0 mm drill, 2.54
mm pitch).

Run: uv run --project tools/py core/test/fixtures/boards/pair/gen.py --out <dir> --epoch <s>
main(short=True) adds one net A track across the net B trace, the short
core/test/fixtures/boards/pair-short runs so CHK-BRD-21 fails.
main(reads=False) writes the record with no catalog read, the board
core/test/fixtures/boards/pair-noreads runs so the provenance gate refuses
each placed part (partGaps).
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "..", "..", "tools", "py", "board"))

from shapely.geometry import LineString  # noqa: E402
from shapely.ops import unary_union  # noqa: E402

from direct import hbf_version  # noqa: E402
from direct.excellon import write_excellon  # noqa: E402
from direct.fab import fab_members, write_zip  # noqa: E402
from direct.gerber import write_regions, write_stroke  # noqa: E402
from direct.pad import Board, pad_poly, ring  # noqa: E402
from direct.pour import outline_poly  # noqa: E402
from direct.record import StagedOut, args, nets_of, outline_ring, provenance, write_json, write_sources  # noqa: E402

W, H, CORNER = 20.0, 12.0, 1.0
PAD, DRILL, PITCH = 1.7, 1.0, 2.54
ANNULAR, MASK_EXP, TRACE = 0.30, 0.05, 0.35
LIB = "KiCad v5 library PinHeader_1x02_P2.54mm_Vertical.kicad_mod (kicad-footprints mirror 7ebfa6b2, 2020-10-02)"

OUTLINE = outline_poly(W, H, CORNER, 0.0)


def layout(short):
    B = Board()
    for ref, x in (("J1", 4.0), ("J2", 16.0)):
        for k, net in enumerate(("A", "B")):
            B.pad(net, x, 4.73 + k * PITCH, PAD, PAD, drill=DRILL, shape="rect" if k == 0 else "circle", ref=ref, pin=str(k + 1))
    B.trace("A", [(4.0, 4.73), (16.0, 4.73)], TRACE)
    B.trace("B", [(4.0, 7.27), (16.0, 7.27)], TRACE)
    if short:
        B.trace("A", [(10.0, 4.73), (10.0, 7.27)], TRACE)
    return B


def record(B, with_reads=True):
    pads = [{"ref": p["ref"], "pin": p["pin"], "net": p["net"], "side": "top", "through": True, "shape": p["shape"],
             "x": p["x"], "y": p["y"], "w": p["w"], "h": p["h"], "rot": 0, "drill": p["drill"]} for p in B.pads]
    parts = [{"ref": ref, "value": "1x02 2.54 mm header", "catalogId": "kicad:PinHeader_1x02_P2.54mm_Vertical", "tier": "community",
              "side": "top", "x": x, "y": 6.0, "rot": 0, "body": {"w": 2.54, "h": 5.08, "z": 0}, "note": "test fixture"}
             for ref, x in (("J1", 4.0), ("J2", 16.0))]
    reads = [{"catalogId": "kicad:PinHeader_1x02_P2.54mm_Vertical", "field": f"{ref}.pads",
              "provenance": provenance("community", "listing", "2026-10-09", LIB)} for ref in ("J1", "J2")]
    tracks = [{"net": n, "layer": "F.Cu", "width": w, "pts": [list(q) for q in pts]} for n in B.nets for pts, w in B.nets[n]["traces"]]
    return {"schema": 1, "backend": "direct", "board": {"outline": outline_ring(OUTLINE), "thickness": 1.6, "copperLayers": 2},
            "parts": parts, "pads": pads, "nets": nets_of(pads), "vias": [], "holes": [], "tracks": tracks,
            "jumpers": [], "bridges": [], "reads": reads if with_reads else []}


def main(short=False, reads=True):
    a = args("two-header test board")
    ver = hbf_version()
    B = layout(short)
    TOP = unary_union([pad_poly(p) for p in B.pads] + [LineString(pts).buffer(w / 2) for n in B.nets for pts, w in B.nets[n]["traces"]])
    BOT = unary_union([ring(p, ANNULAR) for p in B.pads])
    MASK_T = unary_union([pad_poly(p, MASK_EXP) for p in B.pads])
    MASK_B = unary_union([ring(p, ANNULAR).buffer(MASK_EXP) for p in B.pads])
    out = StagedOut(a.out)
    out.open()
    write_regions(out.path("pair-F_Cu.gbr"), TOP, "Copper,L1,Top", a.epoch, ver)
    write_regions(out.path("pair-B_Cu.gbr"), BOT, "Copper,L2,Bot", a.epoch, ver)
    write_regions(out.path("pair-F_Mask.gbr"), MASK_T, "Soldermask,Top", a.epoch, ver)
    write_regions(out.path("pair-B_Mask.gbr"), MASK_B, "Soldermask,Bot", a.epoch, ver)
    write_stroke(out.path("pair-Edge_Cuts.gbr"), OUTLINE.exterior, "Profile,NP", a.epoch, ver)
    write_excellon(out.path("pair-PTH.drl"), B.drills(), True, "PAIR")
    write_zip(out.path("pair-gerbers.zip"), fab_members(out.dir), a.epoch)
    write_sources(out.path("source"), {"F_Cu": TOP, "B_Cu": BOT, "F_Mask": MASK_T, "B_Mask": MASK_B})
    write_json(out.path("record.json"), record(B, reads))
    write_json(out.path("gates.json"), {"line": "pair: no DRC, a test fixture", "w": W, "h": H})
    out.commit()
    print("pair written")


if __name__ == "__main__":
    main()
