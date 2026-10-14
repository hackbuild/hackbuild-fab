"""
Turn the OpenSCAD 2D profiles into cut files.

OpenSCAD's DXF export is a soup of LINE segments. This walks them back into
closed rings, rebuilds polygons with holes, applies kerf compensation the right
way round (outer contours grow by kerf/2, holes shrink by kerf/2, so the
FINISHED part comes out at the drawn size), then shelf-nests the whole bill of
materials onto sheets and writes SVG and DXF.
"""
import os, math, ezdxf
from collections import defaultdict
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import kin
from kin import P

OUT = os.path.join(os.path.dirname(__file__), "..", "out")
KERF = 0.18            # measured beam width. Set this from the test coupon.
SHEET_W, SHEET_H = 600.0, 400.0
GAP = 4.0

BOM = [
    ("base", 1), ("face", 1), ("face2_circle", 1), ("deck", 1), ("latch", 1),
    ("wallx", 2), ("wally", 2), ("rail", 2),
    ("rowbar", 8), ("colbar", 8),
    ("rowlug", 16), ("collug", 16), ("link", 16), ("rod", 16), ("cap_circle", 16),
    ("rowdrive", 4), ("coldrive", 4), ("rowguide", 4), ("colguide", 8),
    ("svbracket_row", 1), ("svbracket_col", 1),
    ("latchbracket", 1), ("latchrib", 2),
    ("crank", 8), ("latchcrank", 1), ("washer", 41),
    ("coupon", 1),
]

def rings_from_dxf(path):
    doc = ezdxf.readfile(path)
    segs = []
    for e in doc.modelspace():
        if e.dxftype() == "LINE":
            a = (round(e.dxf.start.x, 5), round(e.dxf.start.y, 5))
            b = (round(e.dxf.end.x, 5), round(e.dxf.end.y, 5))
            if a != b:
                segs.append((a, b))
        elif e.dxftype() == "LWPOLYLINE":
            pts = [(round(x, 5), round(y, 5)) for x, y, *_ in e.get_points()]
            if e.closed: pts.append(pts[0])
            segs += list(zip(pts, pts[1:]))
    adj = defaultdict(list)
    for a, b in segs:
        adj[a].append(b); adj[b].append(a)
    used, rings = set(), []
    for a, b in segs:
        if (a, b) in used or (b, a) in used:
            continue
        ring, cur, prev = [a], b, a
        used.add((a, b))
        while cur != a:
            ring.append(cur)
            nxt = None
            for c in adj[cur]:
                if c != prev and (cur, c) not in used and (c, cur) not in used:
                    nxt = c; break
            if nxt is None:
                break
            used.add((cur, nxt)); prev, cur = cur, nxt
        if len(ring) >= 3:
            rings.append(ring)
    return rings

def polygon_from_rings(rings):
    raw = [Polygon(r) for r in rings if len(r) >= 3]
    polys = []
    for p in raw:
        q = p if p.is_valid else p.buffer(0)
        if q.is_empty: continue
        for part in (q.geoms if hasattr(q, "geoms") else [q]):
            if part.area > 1e-9:
                polys.append(Polygon(part.exterior.coords))
    polys.sort(key=lambda p: -p.area)
    out, consumed = [], set()
    for i, p in enumerate(polys):
        if i in consumed: continue
        holes = []
        for k in range(i + 1, len(polys)):
            if k in consumed: continue
            if p.contains(polys[k].representative_point()):
                inside_other = any(polys[m].contains(polys[k].representative_point())
                                   and m != i and m not in consumed
                                   for m in range(i + 1, k))
                if not inside_other:
                    holes.append(polys[k]); consumed.add(k)
        out.append(Polygon(p.exterior.coords,
                           [h.exterior.coords for h in holes]))
    return unary_union(out) if len(out) > 1 else out[0]

def compensate(geom, kerf):
    if kerf <= 0: return geom
    return geom.buffer(kerf / 2.0, join_style=2, mitre_limit=4.0)

def to_paths(geom):
    polys = geom.geoms if isinstance(geom, MultiPolygon) else [geom]
    paths = []
    for p in polys:
        paths.append(list(p.exterior.coords))
        for h in p.interiors:
            paths.append(list(h.coords))
    return paths


def check_connected(profiles):
    """A part that falls into two pieces is a part that does not exist. This has
    happened twice: the deck severed by its own column bar channels, and the
    keeper severed by two relief slits."""
    from shapely.geometry import MultiPolygon
    bad = []
    for name, g in profiles.items():
        n = len(g.geoms) if isinstance(g, MultiPolygon) else 1
        if n != 1:
            bad.append((name, n))
    for name, n in bad:
        print(f"   !! {name} cuts into {n} separate pieces")
    return bad

def main():
    profiles = {}
    for name, _ in BOM:
        g = polygon_from_rings(rings_from_dxf(os.path.join(OUT, "dxf", name + ".dxf")))
        profiles[name] = compensate(g, KERF)

    if check_connected(profiles):
        raise SystemExit("fix the severed profiles before nesting")

    items = []
    for name, qty in BOM:
        g = profiles[name]
        x0, y0, x1, y1 = g.bounds
        for k in range(qty):
            items.append([name, g, x1 - x0, y1 - y0, x0, y0])
    items.sort(key=lambda it: -it[3])

    sheets, cur, cx, cy, rowh = [], [], GAP, GAP, 0.0
    for it in items:
        name, g, w, h, ox, oy = it
        if w > SHEET_W - 2 * GAP or h > SHEET_H - 2 * GAP:
            raise SystemExit(f"{name} {w:.0f}x{h:.0f} does not fit the sheet")
        if cx + w > SHEET_W - GAP:
            cx = GAP; cy += rowh + GAP; rowh = 0.0
        if cy + h > SHEET_H - GAP:
            sheets.append(cur); cur = []; cx, cy, rowh = GAP, GAP, 0.0
        cur.append((name, g, cx - ox, cy - oy))
        cx += w + GAP; rowh = max(rowh, h)
    if cur: sheets.append(cur)

    os.makedirs(os.path.join(OUT, "cut"), exist_ok=True)
    for si, sheet in enumerate(sheets):
        svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{SHEET_W}mm" '
               f'height="{SHEET_H}mm" viewBox="0 0 {SHEET_W} {SHEET_H}">',
               f'<rect x="0" y="0" width="{SHEET_W}" height="{SHEET_H}" '
               'fill="none" stroke="#cccccc" stroke-width="0.2"/>']
        doc = ezdxf.new(); msp = doc.modelspace()
        for name, g, dx, dy in sheet:
            for path in to_paths(g):
                pts = [(x + dx, y + dy) for x, y in path]
                d = "M " + " L ".join(f"{x:.3f},{SHEET_H - y:.3f}" for x, y in pts) + " Z"
                svg.append(f'<path d="{d}" fill="none" stroke="#000000" '
                           'stroke-width="0.1"/>')
                msp.add_lwpolyline(pts, close=True)
        svg.append("</svg>")
        open(os.path.join(OUT, "cut", f"sheet{si+1}.svg"), "w").write("\n".join(svg))
        doc.saveas(os.path.join(OUT, "cut", f"sheet{si+1}.dxf"))
        print(f"sheet{si+1}: {len(sheet)} pieces")

    total = sum(q for _, q in BOM)
    area = sum(profiles[n].area * q for n, q in BOM)
    print(f"{len(BOM)} distinct parts, {total} pieces, {len(sheets)} sheets "
          f"of {SHEET_W:.0f}x{SHEET_H:.0f}, {area/100:.0f} cm2 of material")
    for n, q in BOM:
        b = profiles[n].bounds
        print(f"   {n:16s} x{q:<3d} {b[2]-b[0]:7.2f} x {b[3]-b[1]:7.2f} mm")

if __name__ == "__main__":
    main()
