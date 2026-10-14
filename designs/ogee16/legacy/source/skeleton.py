"""Turn each frame part into the least material that still does its job.

The rule, applied to the profile itself rather than to a redrawn part: keep a band
around the OUTSIDE, keep a collar around EVERY HOLE, and keep a thin lattice on the
bar and pixel lines so it is all one piece. Open everything else.

Doing it from the profile's own geometry rather than from a list of features means
nothing can be forgotten. Every slot, bore and tab survives with material around
it, so a minimal part assembles exactly like the full one: same joints, same
guides, same fits. It is the same part with the middle of the empty areas removed.

Reads the DXFs render.py already wrote, writes skeleton DXFs that printed.scad
imports and extrudes.
"""
import math, os, sys
import ezdxf
import shapely.geometry as sg
import shapely.ops as so
import kin
from kin import P, N, px, py

OUT = os.path.join(os.path.dirname(__file__), "..", "out")
# Tuned by measuring, not by taste. At 4.5/5.0/3.5 the deck came out 67% solid,
# which is not a minimal anything. These open it up while every collar still has
# two extrusion widths of material each side of its slot.
RIB   = 2.6     # collar kept around every hole
BAND  = 4.0     # perimeter band
WEB   = 2.2     # lattice rib, half width
PITCH = P["PITCH"]

def rings(name):
    """Stitch OpenSCAD's loose LINE segments back into closed loops."""
    doc = ezdxf.readfile(os.path.join(OUT, "dxf", name + ".dxf"))
    K = lambda p: (round(p[0], 3), round(p[1], 3))
    segs, adj = [], {}
    for e in doc.modelspace():
        if e.dxftype() != "LINE":
            continue
        a, b = K(e.dxf.start), K(e.dxf.end)
        if a == b: continue
        i = len(segs); segs.append((a, b))
        adj.setdefault(a, []).append(i); adj.setdefault(b, []).append(i)
    used = [False]*len(segs); out = []
    for i0 in range(len(segs)):
        if used[i0]: continue
        used[i0] = True
        start, cur = segs[i0]; loop = [start, cur]
        while cur != start:
            nxt = None
            for j in adj.get(cur, ()):
                if used[j]: continue
                a, b = segs[j]; nxt = (j, b if a == cur else a); break
            if nxt is None: break
            used[nxt[0]] = True; cur = nxt[1]
            if cur != start: loop.append(cur)
        if cur == start and len(loop) >= 3: out.append(loop)
    return out

def polygon(name):
    """The part as one shapely polygon: biggest ring is the outline, rest holes."""
    rs = [sg.Polygon(r) for r in rings(name)]
    rs = [r.buffer(0) for r in rs]
    rs.sort(key=lambda r: -r.area)
    outer, holes = rs[0], rs[1:]
    p = outer
    for h in holes:
        p = p.difference(h)
    return p, outer, holes

def lattice(bounds, axes):
    """Thin webs on the bar and pixel lines, so the collars are all connected."""
    x0, y0, x1, y1 = bounds
    keep = []
    if "rows" in axes:
        for i in range(N):
            c = py(i) + P["ROW_BAR_Y"]
            keep.append(sg.box(x0, c-WEB, x1, c+WEB))
    if "cols" in axes:
        for j in range(N):
            c = px(j) + P["COL_BAR_X"]
            keep.append(sg.box(c-WEB, y0, c+WEB, y1))
    if "vert" in axes:               # walls: verticals at every bar station
        for j in range(N):
            keep.append(sg.box(px(j)-WEB, y0, px(j)+WEB, y1))
        keep.append(sg.box(x0, y0, x1, y0+2*WEB))
        keep.append(sg.box(x0, y1-2*WEB, x1, y1))
    return so.unary_union(keep) if keep else sg.Polygon()

# Some holes are not just holes. The knob bores carry a 16mm HUB on the other
# face, and a 2.6 collar only backs 66% of its footprint, so the hub's outer rim
# would be bonded to whatever lattice happened to cross it. These get a full pad
# instead, sized past the hub so it is entirely on solid plate.
PADS = {"wallx": [(py(i) + P["ROW_BAR_Y"], P["RSV_Z"], 11.0) for i in range(N)],
        "wally": [(px(j) + P["COL_BAR_X"], P["CSV_Z"], 11.0) for j in range(N)]}

def skeleton(name, axes):
    p, outer, holes = polygon(name)
    band = p.difference(outer.buffer(-BAND))
    collars = so.unary_union([h.buffer(RIB) for h in holes]) if holes else sg.Polygon()
    pads = so.unary_union([sg.Point(x, y).buffer(r) for x, y, r in PADS.get(name, [])]) \
        if PADS.get(name) else sg.Polygon()
    keep = so.unary_union([band, collars, pads, lattice(outer.bounds, axes)])
    out = p.intersection(keep)
    out = stitch(out, p)
    # A weld found by nearest_points can meet its neighbour at a TANGENCY: one
    # piece in 2D, but printed.scad's -0.05 shrink then pulls it apart and the
    # part comes out as six bodies. Close and reopen to turn every tangency into
    # real overlap before the shrink ever sees it.
    out = out.buffer(0.35).buffer(-0.35).intersection(p)
    out = stitch(out, p)
    return p, out

def stitch(geom, host, web=WEB):
    """Weld any loose islands back on.

    Choosing web positions by hand is guesswork: the lattice missed a corner of
    the base and a tab on each wall, and which corner is not obvious from the
    drawing. So instead, while the result is in pieces, take the smallest piece,
    find the shortest line from it to the rest, and lay a web along that line,
    clipped to the host profile so the weld can only add material the full part
    already had.
    """
    for _ in range(24):
        if geom.geom_type != "MultiPolygon":
            return geom
        parts = sorted(geom.geoms, key=lambda g: g.area)
        small, rest = parts[0], so.unary_union(parts[1:])
        line = so.nearest_points(small, rest)
        weld = sg.LineString(line).buffer(web, cap_style=2).intersection(host)
        geom = so.unary_union([geom, weld])
    return geom

def write_dxf(geom, path):
    doc = ezdxf.new(); ms = doc.modelspace()
    polys = geom.geoms if geom.geom_type == "MultiPolygon" else [geom]
    n = 0
    for poly in polys:
        for ring in [poly.exterior] + list(poly.interiors):
            pts = [(round(x, 4), round(y, 4)) for x, y in ring.coords]
            ms.add_lwpolyline(pts, close=True); n += 1
    doc.saveas(path); return n

PARTS = [("base",   ("rows", "cols")),
         ("deck",   ("rows", "cols")),
         ("face",   ("rows", "cols")),
         ("latch",  ("rows", "cols")),
         ("wallx",  ("vert",)),
         ("wally",  ("vert",)),
         ("rail",   ())]

def main():
    os.makedirs(os.path.join(OUT, "skel"), exist_ok=True)
    print(f"{'part':8s} {'full cm2':>9s} {'minimal':>9s} {'kept':>6s} {'pieces':>7s} {'rings':>6s}")
    bad = []
    for name, axes in PARTS:
        full, skel = skeleton(name, axes)
        n = len(skel.geoms) if skel.geom_type == "MultiPolygon" else 1
        rings_out = write_dxf(skel, os.path.join(OUT, "skel", name + ".dxf"))
        if n != 1: bad.append((name, n))
        print(f"{name:8s} {full.area/100:9.1f} {skel.area/100:9.1f} "
              f"{100*skel.area/full.area:5.0f}% {n:7d} {rings_out:6d}")
    print("\n" + ("every minimal part is ONE connected piece"
                  if not bad else f"{len(bad)} fell apart: {bad}"))
    return 1 if bad else 0

if __name__ == "__main__":
    sys.exit(main())
