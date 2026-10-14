"""Pads, nets, traces and vias, ported from SPINDLE R1 pcb.py lines 34 to
54 and 156 to 160 (lineage spindle.pcb/r1).

hole_dx: the hole does not have to sit at the pad centre. A hybrid pad that
spans a castellation and a 0.6 in hole row drills on the row, so every
consumer (drill list, ring, mask, Excellon, the KiCad drill offset) reads
the hole centre hx, hy and never the pad centre (board-pcb.md, "Drill
position is not pad centre").
"""
from shapely.geometry import Point, box


class Board:
    """The nets, pads and bottom traces one generator declares."""

    def __init__(self):
        self.nets = {}        # name -> {"pads": [...], "traces": [(pts, w)]}
        self.pads = []        # every pad, vias included (is_via)
        self.bot_traces = []  # (net, pts, w) on B.Cu

    def net(self, n):
        return self.nets.setdefault(n, {"pads": [], "traces": []})

    def trace(self, n, pts, w):
        """A top-copper trace, width w mm."""
        self.net(n)["traces"].append(([tuple(p) for p in pts], w))

    def btrace(self, n, pts, w):
        """A bottom-copper trace, width w mm."""
        self.bot_traces.append((n, [tuple(p) for p in pts], w))
        self.net(n)

    def pad(self, net, x, y, w, h, drill=None, shape="rect", ref="", pin="",
            smd=False, hole_dx=0.0, is_via=False):
        p = dict(net=net, x=x, y=y, w=w, h=h, drill=drill, shape=shape,
                 ref=ref, pin=pin, smd=smd, is_via=is_via,
                 hx=x + hole_dx, hy=y, hole_dx=hole_dx)
        self.pads.append(p)
        self.net(net)["pads"].append(p)
        return (x, y)

    def via(self, n, x, y, drill, pad):
        return self.pad(n, x, y, pad, pad, drill=drill, shape="circle", is_via=True)

    def drills(self):
        """Plated holes as (hx, hy, drill), pads and vias, in declaration order."""
        return [(p["hx"], p["hy"], p["drill"]) for p in self.pads if p["drill"]]


def pad_poly(p, grow=0.0):
    if p["shape"] == "circle":
        return Point(p["x"], p["y"]).buffer(p["w"] / 2 + grow, resolution=32)
    return box(p["x"] - p["w"] / 2 - grow, p["y"] - p["h"] / 2 - grow,
               p["x"] + p["w"] / 2 + grow, p["y"] + p["h"] / 2 + grow)


def ring(p, annular):
    """The annular ring around a plated hole, centred on the hole, not the pad."""
    return Point(p["hx"], p["hy"]).buffer(p["drill"] / 2 + annular, resolution=32)
