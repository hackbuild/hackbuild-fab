"""The direct route's DRC, ported from SPINDLE R1 pcb.py lines 246 to 288
(lineage spindle.pcb/r1). It runs before anything is written; a generator
that gets a non-empty failure list prints it and exits 1.

rules keys, mm: clr (top copper to copper), edge_clr (copper to the board
edge), hole_gap (drill wall to drill wall), drill_margin (drill wall inside
its own pad), mount_keep (copper keepout beyond a mount hole's radius).
"""
import math

from shapely.geometry import MultiPolygon, Point
from shapely.ops import unary_union

from .pad import pad_poly, ring
from .pour import trace_poly


def tightest(top):
    """Least distance between two top-copper nets, mm, over every pair."""
    names = sorted(top)
    return min(top[names[i]].distance(top[names[j]])
               for i in range(len(names)) for j in range(i + 1, len(names)))


def drc(board, top, outline, pour, pour_net, mounts, mount_d, annular, rules):
    """Return [(what, distance mm, rule)] in pcb.py's order; empty when clean."""
    fail = []
    names = sorted(top)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            d = top[names[i]].distance(top[names[j]])
            if d < rules["clr"]:
                fail.append((f"{names[i]} / {names[j]}", d, "top clearance"))
    botn = {}
    for n, pts, w in board.bot_traces:
        botn.setdefault(n, []).append(trace_poly(pts, w, join=False))
    for n in board.nets:
        parts = [top[n]] + botn.get(n, [])
        if n == pour_net:
            parts.append(pour)
        parts += [ring(p, annular) for p in board.nets[n]["pads"] if p["drill"]]
        whole = unary_union(parts)
        if isinstance(whole, MultiPolygon) and len(whole.geoms) > 1:
            fail.append((n, 0.0, f"net in {len(whole.geoms)} islands across both layers"))
    for n, g in top.items():
        if not outline.buffer(-rules["edge_clr"] + 0.001).contains(g):
            fail.append((n, 0.0, "closer than %.2f mm to the board edge" % rules["edge_clr"]))
    for p in board.pads:
        if p["drill"] and not pad_poly(p).buffer(-p["drill"] / 2 - rules["drill_margin"]).contains(Point(p["hx"], p["hy"])):
            fail.append((f'{p["ref"]}.{p["pin"]}', 0.0, "drill breaks out of its pad"))
    drills = board.drills()
    for a in range(len(drills)):
        for b in range(a + 1, len(drills)):
            x1, y1, d1 = drills[a]
            x2, y2, d2 = drills[b]
            gap = math.hypot(x2 - x1, y2 - y1) - d1 / 2 - d2 / 2
            if gap < rules["hole_gap"]:
                fail.append((f"holes {a}/{b}", gap, "hole-to-hole"))
    for mx, my in mounts:
        k = Point(mx, my).buffer(mount_d / 2 + rules["mount_keep"])
        for n, g in top.items():
            if g.intersects(k):
                fail.append((n, 0.0, "copper inside a mounting hole keepout"))
    return fail


def report_failure(fail):
    """The failure block: the legacy listing under the port's first line (M08-T06 step 7)."""
    lines = [f"DRC failed: {len(fail)} violations. Nothing written."]
    for a, d, w in sorted(fail, key=lambda t: t[1])[:25]:
        lines.append(f"    {w:<38} {a}  {d:.3f}mm")
    return "\n".join(lines)
