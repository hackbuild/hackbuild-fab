"""Net geometry and the bottom pour, ported from SPINDLE R1 pcb.py lines 211
to 244 (lineage spindle.pcb/r1).

Pour synthesis: the outline inset by the edge clearance, minus the
isolation around every hole not on the pour net, minus the bottom traces
grown by the pour clearance, plus every hole's ring and the bottom traces,
minus the keepout. The keepout is the antenna zone only: clearing the whole
module body would also strip the bottom rings off the module's own holes
(board-pcb.md, "Pour rules").
"""
from shapely.geometry import LineString, box
from shapely.ops import unary_union

from .pad import pad_poly, ring


def outline_poly(w, h, corner, inset=0.0):
    r = max(0.05, corner - inset)
    return box(inset + r, inset + r, w - inset - r, h - inset - r).buffer(r, resolution=32)


def trace_poly(pts, w, join=True):
    if join:
        return LineString(pts).buffer(w / 2, resolution=16, cap_style=1, join_style=1)
    return LineString(pts).buffer(w / 2, resolution=16, cap_style=1)


def net_top(board, n):
    e = board.nets[n]
    g = [pad_poly(p) for p in e["pads"]]
    g += [trace_poly(pts, w) for pts, w in e["traces"]]
    return unary_union(g)


def bottom_traces(board):
    if not board.bot_traces:
        return None
    return unary_union([trace_poly(pts, w, join=False) for _, pts, w in board.bot_traces])


def bottom_pour(board, pour, pour_net, pour_clr, annular, keepout):
    """The bottom copper: pour, isolated rings, bottom traces, keepout cleared."""
    off = [p for p in board.pads if p["drill"] and p["net"] != pour_net]
    iso = unary_union([ring(p, annular).buffer(pour_clr) for p in off]) if off else None
    bot = pour.difference(iso) if iso is not None else pour
    bt = bottom_traces(board)
    if bt is not None:
        bot = bot.difference(bt.buffer(pour_clr))
    bot = unary_union([bot] + [ring(p, annular) for p in board.pads if p["drill"]])
    if bt is not None:
        bot = unary_union([bot, bt])
    if keepout is not None:
        bot = bot.difference(keepout)
    return bot
