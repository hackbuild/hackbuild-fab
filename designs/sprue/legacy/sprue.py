#!/usr/bin/env python3
"""
SPRUE  -  batch plate generator for fast two-colour giveaways.

Makes flush-inlay coins and guitar picks (white body, black inlay on both
faces), packs them onto a 256 x 256 plate, and writes:

  plates/<name>.3mf            Orca / Flash Studio project, parts preassigned
                               to extruder 1 (white) and 2 (black), instanced
  plates/<name>_white.stl      whole plate, white parts merged
  plates/<name>_black.stl      whole plate, black parts merged
  parts/coin_white.stl ...     single objects per colour
  previews/*.png               faces and plate layout
  print-card.txt               volumes, layer counts, rough minutes

Built-in front art: a marching snare with crossed sticks on the coin, a
lightning bolt on the pick. Drop in your own with --coin-front / --coin-back /
--pick-front / --pick-back (PNG, JPG, WebP, SVG). Dark pixels become the black
inlay; add --invert to flip that.

Usage examples:
  python3 sprue.py                          three plates with the defaults
  python3 sprue.py --coins 8 --picks 16     custom mix
  python3 sprue.py --coin-front myart.png --back-arc "PHOENIX 2026"
  python3 sprue.py --material PLA --flow 11
"""

import argparse
import json
import math
import os
import zipfile
from functools import reduce

import numpy as np
from shapely.geometry import Polygon, MultiPolygon, Point, box
from shapely.ops import unary_union
from shapely import affinity
import manifold3d as m3d
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DEFAULT = os.path.join(HERE, "fonts", "BarlowCondensed-Bold.ttf")

# ----------------------------------------------------------------------------
# print constants
# ----------------------------------------------------------------------------
LAYER = 0.24            # layer height the whole design is quantised to
MIN_FEATURE = 0.62      # narrowest black or white feature that survives cleanup
BED = 256.0
BED_MARGIN = 8.0
GAP = 3.0

SPECS = {
    "coin": dict(d=36.0, thk=2.40, inlay_layers=3, break_layers=2, break_step=0.16,
                 ring_in=1.5, ring_w=0.8, art_margin=2.7, hole=None),
    "pick": dict(thk=1.20, inlay_layers=2, break_layers=1, break_step=0.30,
                 hole=3.5, hole_y=10.4),
}

EXTRUDER_WHITE = 1
EXTRUDER_BLACK = 2

MATERIALS = {
    # flow is a whole-plate average in mm3/s for small flat parts on a 0.4 nozzle
    "PLA":  dict(flow=11.0, density=1.24, nozzle=220, bed=55, max_vol=20),
    "PETG": dict(flow=8.5,  density=1.27, nozzle=245, bed=75, max_vol=12),
}


# ----------------------------------------------------------------------------
# 2D helpers
# ----------------------------------------------------------------------------
def disc(r, cx=0.0, cy=0.0, n=192):
    return Point(cx, cy).buffer(r, quad_segs=n // 4)


def ellipse(cx, cy, rx, ry, n=128):
    return affinity.scale(Point(cx, cy).buffer(1.0, quad_segs=n // 4), rx, ry, origin=(cx, cy))


def ring(r_in, r_out):
    return disc(r_out).difference(disc(r_in))


def rrect(x0, y0, x1, y1, r):
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, quad_segs=8)


def star(cx, cy, r_out, r_in, points=5, rot_deg=90.0):
    pts = []
    for i in range(points * 2):
        a = math.radians(rot_deg + i * 180.0 / points)
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return Polygon(pts)


def mirror_x(g):
    return affinity.scale(g, -1.0, 1.0, origin=(0, 0))


def empty():
    return Polygon()


def polys(g):
    """Iterate the polygons of any shapely geometry."""
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    if hasattr(g, "geoms"):
        out = []
        for sub in g.geoms:
            out.extend(polys(sub))
        return out
    return []


def clean(g, r=MIN_FEATURE / 2.0):
    """Morphological open then close: drops black slivers thinner than 2r and
    fills white gaps thinner than 2r. Keeps what the nozzle can actually lay."""
    if g is None or g.is_empty:
        return empty()
    g = g.buffer(0)
    g = g.buffer(-r, quad_segs=4).buffer(r, quad_segs=4)
    g = g.buffer(r, quad_segs=4).buffer(-r, quad_segs=4)
    return g.buffer(0).simplify(0.015)


def fit_into(g, w, h):
    """Uniformly scale and centre a geometry so its bbox fits w x h."""
    if g.is_empty:
        return g
    x0, y0, x1, y1 = g.bounds
    s = min(w / max(x1 - x0, 1e-6), h / max(y1 - y0, 1e-6))
    g = affinity.scale(g, s, s, origin=(0, 0))
    x0, y0, x1, y1 = g.bounds
    return affinity.translate(g, -(x0 + x1) / 2.0, -(y0 + y1) / 2.0)


# ----------------------------------------------------------------------------
# type
# ----------------------------------------------------------------------------
class Face:
    """Glyph outlines from a TTF as shapely geometry, sized by cap height."""

    def __init__(self, path):
        from fontTools.ttLib import TTFont
        self.font = TTFont(path)
        self.gs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.upem = self.font["head"].unitsPerEm
        os2 = self.font["OS/2"]
        self.cap_units = getattr(os2, "sCapHeight", 0) or int(self.upem * 0.7)
        self.cache = {}

    def _raw(self, ch):
        if ch in self.cache:
            return self.cache[ch]
        name = self.cmap.get(ord(ch))
        if name is None:
            self.cache[ch] = (empty(), 0.0)
            return self.cache[ch]
        from fontTools.pens.recordingPen import DecomposingRecordingPen
        pen = DecomposingRecordingPen(self.gs)
        self.gs[name].draw(pen)
        contours = self._flatten(pen.value)
        rings = [Polygon(c).buffer(0) for c in contours if len(c) >= 3]
        rings = [r for r in rings if not r.is_empty]
        geom = reduce(lambda a, b: a.symmetric_difference(b), rings, empty()) if rings else empty()
        adv = self.gs[name].width
        self.cache[ch] = (geom, adv)
        return self.cache[ch]

    @staticmethod
    def _flatten(ops, segs_q=8, segs_c=12):
        contours, cur, last = [], [], None

        def quad(p0, p1, p2):
            return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                     (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
                    for t in np.linspace(0, 1, segs_q + 1)[1:]]

        def cubic(p0, p1, p2, p3):
            out = []
            for t in np.linspace(0, 1, segs_c + 1)[1:]:
                u = 1 - t
                out.append((u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
            return out

        for op, args in ops:
            if op == "moveTo":
                if len(cur) >= 3:
                    contours.append(cur)
                cur = [args[0]]
                last = args[0]
            elif op == "lineTo":
                cur.append(args[0])
                last = args[0]
            elif op == "qCurveTo":
                pts = list(args)
                if pts[-1] is None:      # all off-curve contour
                    pts[-1] = ((pts[0][0] + pts[-2][0]) / 2, (pts[0][1] + pts[-2][1]) / 2)
                offs, end = pts[:-1], pts[-1]
                p0 = last
                for i, c in enumerate(offs):
                    if i < len(offs) - 1:
                        nxt = offs[i + 1]
                        mid = ((c[0] + nxt[0]) / 2, (c[1] + nxt[1]) / 2)
                    else:
                        mid = end
                    cur.extend(quad(p0, c, mid))
                    p0 = mid
                last = end
            elif op == "curveTo":
                p1, p2, p3 = args
                cur.extend(cubic(last, p1, p2, p3))
                last = p3
            elif op in ("closePath", "endPath"):
                if len(cur) >= 3:
                    contours.append(cur)
                cur = []
        if len(cur) >= 3:
            contours.append(cur)
        return contours

    def text(self, s, cap_h, tracking=0.0):
        """Straight text, centred on x=0, baseline on y=0."""
        k = cap_h / self.cap_units
        x, parts = 0.0, []
        for ch in s:
            g, adv = self._raw(ch)
            if not g.is_empty:
                parts.append(affinity.translate(affinity.scale(g, k, k, origin=(0, 0)), x, 0))
            x += adv * k + tracking
        if not parts:
            return empty()
        g = unary_union(parts)
        x0, _, x1, _ = g.bounds
        return affinity.translate(g, -(x0 + x1) / 2.0, 0)

    def arc(self, s, cap_h, r, top=True, tracking=0.3):
        """Text on a circle of radius r (baseline radius). top=True reads across
        the top of the coin, top=False along the bottom, both left to right."""
        k = cap_h / self.cap_units
        advs = [self._raw(ch)[1] * k + tracking for ch in s]
        total = sum(advs) - tracking
        pos, parts = 0.0, []
        for ch, adv in zip(s, advs):
            g, _ = self._raw(ch)
            centre = pos + (adv - tracking) / 2.0
            if top:
                phi = math.pi / 2 + (total / 2.0 - centre) / r
                rot = math.degrees(phi) - 90.0
                rr = r
            else:
                phi = -math.pi / 2 + (centre - total / 2.0) / r
                rot = math.degrees(phi) + 90.0
                rr = r + cap_h          # baseline sits outside on the bottom arc
            if not g.is_empty:
                g = affinity.scale(g, k, k, origin=(0, 0))
                g = affinity.translate(g, -(adv - tracking) / 2.0, 0)
                g = affinity.rotate(g, rot, origin=(0, 0))
                g = affinity.translate(g, rr * math.cos(phi), rr * math.sin(phi))
                parts.append(g)
            pos += adv
        return unary_union(parts) if parts else empty()


# ----------------------------------------------------------------------------
# built-in art
# ----------------------------------------------------------------------------
def motif_snare():
    """Marching snare, three quarter view from a little above, two sticks
    crossed behind it. Returns the black region as read on the front face."""
    rx, ry = 8.5, 2.5
    y_top, y_bot = 4.0, -5.5
    hoop_top = ellipse(0, y_top, rx, ry)
    head = ellipse(0, y_top, rx - 1.3, ry - 1.0)
    hoop_bot = ellipse(0, y_bot, rx, ry)
    body = unary_union([hoop_top, box(-rx, y_bot, rx, y_top), hoop_bot])

    # bottom rim is a crescent, the shell hides the back half of it
    band = hoop_bot.difference(affinity.translate(hoop_bot, 0, 1.15))
    shell_vis = body.difference(hoop_top).difference(band)

    # white detail: tension rods, and thin lines that lift both hoops off the shell
    rods = unary_union([box(x - 0.42, y_bot - ry, x + 0.42, y_top) for x in (-6.4, -3.4, 0.0, 3.4, 6.4)])
    rods = rods.intersection(shell_vis).difference(band.buffer(0.55)).difference(hoop_top.buffer(0.55))
    edge_top = hoop_top.exterior.buffer(0.34).intersection(shell_vis).intersection(box(-20, -20, 20, y_top))
    edge_band = affinity.translate(hoop_bot, 0, 1.15).exterior.buffer(0.34).intersection(shell_vis).intersection(box(-20, -20, 20, y_bot + 1.15))
    drum = body.difference(head).difference(rods).difference(edge_top).difference(edge_band)
    drum = affinity.rotate(drum, -8.0, origin=(0, 0))
    drum_gap = affinity.rotate(body, -8.0, origin=(0, 0)).buffer(0.8)

    def stick(angle, bead_end=1):
        L, w = 26.0, 1.7
        s = rrect(-L / 2, -w / 2, L / 2, w / 2, w / 2)
        bead = disc(1.25, bead_end * (L / 2 + 0.25), 0, n=32)
        s = unary_union([s, bead])
        return affinity.rotate(s, angle, origin=(0, 0))

    sticks = unary_union([stick(40.0), stick(140.0, -1)]).difference(drum_gap)
    return unary_union([drum, sticks])


def motif_bolt():
    """Lightning bolt sized for the pick."""
    pts = [(2.2, 7.6), (-3.6, -0.6), (-0.6, -0.6), (-2.6, -8.6), (4.1, 0.6), (1.1, 0.6), (3.2, 7.6)]
    return affinity.scale(Polygon(pts).buffer(0), 1.22, 1.18, origin=(0, 0))


def coin_back_default(face, arc_text, year):
    parts = []
    if arc_text:
        parts.append(face.arc(arc_text, 4.0, 10.3, top=True, tracking=0.25))
    if year:
        parts.append(affinity.translate(face.text(year, 7.4), 0, -6.6))
    for a in (248.0, 270.0, 292.0):
        parts.append(star(11.8 * math.cos(math.radians(a)), 11.8 * math.sin(math.radians(a)), 2.0, 0.95))
    return unary_union(parts) if parts else empty()


def pick_back_default(face, year):
    if not year:
        return empty()
    return affinity.translate(face.text(year, 5.8), 0, -4.9)


# ----------------------------------------------------------------------------
# user art
# ----------------------------------------------------------------------------
def art_from_file(path, w, h, invert=False, threshold=None):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".svg":
        g = _art_from_svg(path)
        if g is None:
            raise SystemExit("could not read that SVG here; export it as a PNG and pass that instead")
    else:
        g = _art_from_raster(path, threshold)
    if invert:
        x0, y0, x1, y1 = g.bounds
        g = box(x0, y0, x1, y1).difference(g)
    g = fit_into(g, w, h)
    return g


def _art_from_raster(path, threshold=None, target_px=640):
    import cv2
    from PIL import Image
    img = Image.open(path)
    if img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.alpha_composite(img.convert("RGBA"))
        img = bg
    img = img.convert("L")
    k = target_px / max(img.size)
    if k < 1.0:
        img = img.resize((max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k))), Image.LANCZOS)
    g = np.array(img)
    if threshold is None:
        threshold, _ = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    mask = (g < threshold).astype(np.uint8)
    return _mask_to_geom(mask)


def _mask_to_geom(mask):
    import cv2
    contours, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = []
    hgt = mask.shape[0]
    for c in contours:
        pts = c.reshape(-1, 2).astype(float)
        if len(pts) < 3:
            continue
        pts[:, 1] = hgt - pts[:, 1]            # image y down -> geometry y up
        p = Polygon(pts).buffer(0)
        if not p.is_empty:
            rings.append(p)
    if not rings:
        raise SystemExit("art came out empty after thresholding; try --invert or --threshold")
    return reduce(lambda a, b: a.symmetric_difference(b), rings, empty()).buffer(0)


def _art_from_svg(path):
    # first choice: rasterise (handles fills, strokes, transforms, everything)
    try:
        import cairosvg, io, cv2
        from PIL import Image
        png = cairosvg.svg2png(url=path, output_width=1200, background_color="white")
        img = Image.open(io.BytesIO(png)).convert("L")
        g = np.array(img)
        t, _ = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return _mask_to_geom((g < t).astype(np.uint8))
    except Exception:
        pass
    # fallback: path outlines only (fills, even-odd; strokes ignored)
    try:
        from svgpathtools import svg2paths
        paths, _ = svg2paths(path)
        rings = []
        for p in paths:
            for sub in p.continuous_subpaths():
                n = max(8, int(sub.length() / 2.0))
                pts = [(sub.point(t).real, -sub.point(t).imag) for t in np.linspace(0, 1, n, endpoint=False)]
                if len(pts) >= 3:
                    poly = Polygon(pts).buffer(0)
                    if not poly.is_empty:
                        rings.append(poly)
        if rings:
            return reduce(lambda a, b: a.symmetric_difference(b), rings, empty()).buffer(0)
    except Exception:
        pass
    return None


# ----------------------------------------------------------------------------
# blanks
# ----------------------------------------------------------------------------
def coin_blank(d):
    return disc(d / 2.0)


def catmull_rom_closed(pts, subdiv=12):
    """Closed Catmull-Rom spline through pts."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        for s in range(subdiv):
            t = s / subdiv
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    return Polygon(out).buffer(0)


def pick_blank():
    """351 style teardrop, about 25.8 wide by 30.7 tall, y up, tip at the bottom."""
    right = [(0.0, 15.35), (5.0, 14.9), (9.5, 12.6), (12.3, 8.6), (12.9, 4.0), (12.2, -1.2),
             (10.2, -6.2), (7.0, -10.6), (3.4, -13.9), (0.0, -15.35)]
    left = [(-x, y) for x, y in reversed(right[1:-1])]
    return catmull_rom_closed(right + left).simplify(0.01)


# ----------------------------------------------------------------------------
# object builder
# ----------------------------------------------------------------------------
def to_cs(g):
    contours = []
    for p in polys(g):
        ext = np.array(p.exterior.coords[:-1])
        if len(ext) >= 3:
            contours.append(ext)
        for h in p.interiors:
            hc = np.array(h.coords[:-1])
            if len(hc) >= 3:
                contours.append(hc)
    if not contours:
        return None
    return m3d.CrossSection(contours, fillrule=m3d.FillRule.EvenOdd)


def slab(g, z0, z1):
    cs = to_cs(g)
    if cs is None or z1 <= z0:
        return None
    return cs.extrude(z1 - z0).translate([0.0, 0.0, z0])


def union_all(ms):
    ms = [m for m in ms if m is not None]
    if not ms:
        return None
    try:
        return m3d.Manifold.batch_boolean(ms, m3d.OpType.Add)
    except Exception:
        return reduce(lambda a, b: a + b, ms)


def build_object(name, blank, front, back, holes, thk, inlay_layers, break_layers, break_step):
    """Returns dict with manifolds per colour, face regions for previews, stats."""
    n_layers = int(round(thk / LAYER))
    thk = n_layers * LAYER
    D = inlay_layers * LAYER
    inner = blank.buffer(-0.5)
    holes = holes.buffer(0) if holes is not None else empty()

    front = clean(front.intersection(inner)).difference(holes.buffer(0.5))
    back = clean(back.intersection(inner)).difference(holes.buffer(0.5))
    back_m = mirror_x(back)

    white, black = [], []

    # bottom inlay (bed side). Reads correctly once the part is flipped over.
    white.append(slab(blank.difference(back_m).difference(holes), 0.0, D))
    black.append(slab(back_m.difference(holes), 0.0, D))

    # core
    if thk - 2 * D > 1e-6:
        white.append(slab(blank.difference(holes), D, thk - D))

    # top inlay, with an edge break stepping in over the last layers
    for k in range(inlay_layers):
        z0 = thk - D + k * LAYER
        z1 = z0 + LAYER
        j = k - (inlay_layers - break_layers) + 1
        inset = break_step * j if j > 0 else 0.0
        bk = blank.buffer(-inset) if inset > 0 else blank
        white.append(slab(bk.difference(front).difference(holes), z0, z1))
        black.append(slab(front.intersection(bk).difference(holes), z0, z1))

    mw, mb = union_all(white), union_all(black)
    stats = dict(name=name, thk=thk, layers=n_layers, inlay_layers=inlay_layers,
                 white_vol=mw.volume() if mw else 0.0, black_vol=mb.volume() if mb else 0.0,
                 blank_vol=blank.difference(holes).area * thk, bbox=blank.bounds)
    faces = dict(front=dict(blank=blank, black=front.difference(holes), holes=holes),
                 back=dict(blank=blank, black=back.difference(holes), holes=holes))
    return dict(name=name, white=mw, black=mb, faces=faces, stats=stats, blank=blank)


def to_trimesh(man):
    if man is None:
        return None
    m = man.to_mesh()
    v = np.asarray(m.vert_properties)[:, :3]
    f = np.asarray(m.tri_verts)
    return trimesh.Trimesh(vertices=v, faces=f, process=False)


# ----------------------------------------------------------------------------
# plate packing
# ----------------------------------------------------------------------------
def pack(items, bed=BED, margin=BED_MARGIN, gap=GAP):
    """Shelf packing, rows centred on the plate. items: list of (kind, w, h).
    Returns [(kind, cx, cy)] or raises if the plate overflows."""
    usable = bed - 2 * margin
    rows, row, row_w = [], [], 0.0
    for kind, w, h in items:
        if row and row_w + gap + w > usable + 1e-6:
            rows.append(row)
            row, row_w = [], 0.0
        row.append((kind, w, h))
        row_w += (gap if row_w else 0.0) + w
    if row:
        rows.append(row)
    heights = [max(h for _, _, h in r) for r in rows]
    block_h = sum(heights) + gap * (len(rows) - 1)
    if block_h > usable + 1e-6:
        raise SystemExit("plate overflow: reduce --coins or --picks")
    placed = []
    y = (bed - block_h) / 2.0
    for r, h in zip(rows, heights):
        row_w = sum(w for _, w, _ in r) + gap * (len(r) - 1)
        x = (bed - row_w) / 2.0
        for kind, w, hh in r:
            placed.append((kind, x + w / 2.0, y + h / 2.0))
            x += w + gap
        y += h + gap
    return placed


# ----------------------------------------------------------------------------
# exports
# ----------------------------------------------------------------------------
def write_stl(mesh, path):
    mesh.export(path)


def merged_plate_mesh(objects, placed, colour):
    parts = []
    for kind, cx, cy in placed:
        m = objects[kind]["mesh_" + colour]
        if m is None:
            continue
        mm = m.copy()
        mm.apply_translation([cx, cy, 0.0])
        parts.append(mm)
    return trimesh.util.concatenate(parts) if parts else None


def _uuid(prefix_int, tail):
    return f"{prefix_int:08x}-{tail}"


TAILS = dict(obj="61cb-4c03-9d28-80fed5dfa1dc", sub="81cb-4c03-9d28-80fed5dfa1dc",
             comp="b206-40ff-9872-83e8017abed1", item="b1ec-4553-aec9-6006b5ede3f9")
BUILD_UUID = "2c7c17d8-22b5-4d84-8835-1976022ea369"
APP = "BambuStudio-01.10.01.50"


def mesh_xml(mesh, oid, name):
    v = mesh.vertices
    f = mesh.faces
    out = [f'  <object id="{oid}" p:UUID="{_uuid(oid, TAILS["sub"])}" type="model">',
           "   <mesh>", "    <vertices>"]
    out.extend(f'     <vertex x="{x:.5f}" y="{y:.5f}" z="{z:.5f}"/>' for x, y, z in v)
    out.append("    </vertices>")
    out.append("    <triangles>")
    out.extend(f'     <triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in f)
    out.append("    </triangles>")
    out.append("   </mesh>")
    out.append("  </object>")
    return "\n".join(out)


def write_3mf(path, objects, placed, material, presets, colours, title):
    """objects: dict kind -> {mesh_white, mesh_black, name}; placed: [(kind,cx,cy)]"""
    kinds = [k for k in objects if any(p[0] == k for p in placed)]
    ids, next_id = {}, 1
    for k in kinds:
        parts = []
        for colour, ext in (("white", EXTRUDER_WHITE), ("black", EXTRUDER_BLACK)):
            if objects[k]["mesh_" + colour] is not None:
                parts.append(dict(id=next_id, colour=colour, extruder=ext, mesh=objects[k]["mesh_" + colour]))
                next_id += 1
        ids[k] = dict(parts=parts, parent=next_id)
        next_id += 1

    z = zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED)
    z.writestr("[Content_Types].xml",
               '<?xml version="1.0" encoding="UTF-8"?>\n'
               '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
               ' <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
               ' <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n'
               ' <Default Extension="png" ContentType="image/png"/>\n'
               ' <Default Extension="gcode" ContentType="text/x.gcode"/>\n'
               '</Types>')
    z.writestr("_rels/.rels",
               '<?xml version="1.0" encoding="UTF-8"?>\n'
               '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
               ' <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n'
               '</Relationships>')

    rels = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
    model = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
             'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
             'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">',
             f' <metadata name="Application">{APP}</metadata>',
             ' <metadata name="OrcaSlicer">2.3.2</metadata>',
             ' <metadata name="BambuStudio:3mfVersion">1</metadata>',
             ' <metadata name="Copyright"></metadata>',
             ' <metadata name="CreationDate">2026-09-06</metadata>',
             ' <metadata name="Description">SPRUE giveaway plate</metadata>',
             ' <metadata name="Designer"></metadata>',
             ' <metadata name="DesignerCover"></metadata>',
             ' <metadata name="DesignerUserId"></metadata>',
             ' <metadata name="License"></metadata>',
             ' <metadata name="ModificationDate">2026-09-06</metadata>',
             ' <metadata name="Origin"></metadata>',
             f' <metadata name="Title">{title}</metadata>',
             ' <resources>']
    for i, k in enumerate(kinds):
        parent = ids[k]["parent"]
        sub = f"/3D/Objects/object_{parent}.model"
        rels.append(f' <Relationship Target="{sub}" Id="rel-{i + 1}" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>')
        submodel = ['<?xml version="1.0" encoding="UTF-8"?>',
                    '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" '
                    'xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" '
                    'xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">',
                    f' <metadata name="BambuStudio:3mfVersion">1</metadata>',
                    ' <resources>']
        for part in ids[k]["parts"]:
            submodel.append(mesh_xml(part["mesh"], part["id"], f'{k}_{part["colour"]}'))
        submodel.extend([' </resources>', ' <build/>', '</model>'])
        z.writestr(sub.lstrip("/"), "\n".join(submodel))

        model.append(f'  <object id="{parent}" p:UUID="{_uuid(parent, TAILS["obj"])}" type="model">')
        model.append('   <components>')
        for part in ids[k]["parts"]:
            model.append(f'    <component p:path="{sub}" objectid="{part["id"]}" p:UUID="{_uuid(part["id"], TAILS["comp"])}" '
                         'transform="1 0 0 0 1 0 0 0 1 0 0 0"/>')
        model.append('   </components>')
        model.append('  </object>')
    rels.append('</Relationships>')
    z.writestr("3D/_rels/3dmodel.model.rels", "\n".join(rels))

    model.append(' </resources>')
    model.append(f' <build p:UUID="{BUILD_UUID}">')
    instances = {k: [] for k in kinds}
    item_no = 1
    for kind, cx, cy in placed:
        parent = ids[kind]["parent"]
        model.append(f'  <item objectid="{parent}" p:UUID="{_uuid(item_no, TAILS["item"])}" '
                     f'transform="1 0 0 0 1 0 0 0 1 {cx:.4f} {cy:.4f} 0" printable="1"/>')
        instances[kind].append((cx, cy))
        item_no += 1
    model.append(' </build>')
    model.append('</model>')
    z.writestr("3D/3dmodel.model", "\n".join(model))

    # model_settings.config: extruder per part, instances per plate
    ms = ['<?xml version="1.0" encoding="UTF-8"?>', '<config>']
    for k in kinds:
        parent = ids[k]["parent"]
        ms.append(f'  <object id="{parent}">')
        ms.append(f'    <metadata key="name" value="{objects[k]["name"]}"/>')
        ms.append(f'    <metadata key="extruder" value="{EXTRUDER_WHITE}"/>')
        for part in ids[k]["parts"]:
            ms.append(f'    <part id="{part["id"]}" subtype="normal_part">')
            ms.append(f'      <metadata key="name" value="{k}_{part["colour"]}"/>')
            ms.append('      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>')
            ms.append(f'      <metadata key="source_file" value="{title}.3mf"/>')
            ms.append(f'      <metadata key="source_object_id" value="{parent}"/>')
            ms.append(f'      <metadata key="source_volume_id" value="{part["id"]}"/>')
            ms.append('      <metadata key="source_offset_x" value="0"/>')
            ms.append('      <metadata key="source_offset_y" value="0"/>')
            ms.append('      <metadata key="source_offset_z" value="0"/>')
            ms.append(f'      <metadata key="extruder" value="{part["extruder"]}"/>')
            ms.append(f'      <mesh_stat face_count="{len(part["mesh"].faces)}" edges_fixed="0" degenerate_facets="0" '
                      'facets_removed="0" facets_reversed="0" backwards_edges="0"/>')
            ms.append('    </part>')
        ms.append('  </object>')
    ms.append('  <plate>')
    ms.append('    <metadata key="plater_id" value="1"/>')
    ms.append('    <metadata key="plater_name" value=""/>')
    ms.append('    <metadata key="locked" value="false"/>')
    ident = 100
    for k in kinds:
        for i, _ in enumerate(instances[k]):
            ident += 1
            ms.append('    <model_instance>')
            ms.append(f'      <metadata key="object_id" value="{ids[k]["parent"]}"/>')
            ms.append(f'      <metadata key="instance_id" value="{i}"/>')
            ms.append(f'      <metadata key="identify_id" value="{ident}"/>')
            ms.append('    </model_instance>')
    ms.append('  </plate>')
    ms.append('  <assemble>')
    for k in kinds:
        for i, (cx, cy) in enumerate(instances[k]):
            ms.append(f'   <assemble_item object_id="{ids[k]["parent"]}" instance_id="{i}" '
                      f'transform="1 0 0 0 1 0 0 0 1 {cx:.4f} {cy:.4f} 0" offset="0 0 0"/>')
    ms.append('  </assemble>')
    ms.append('</config>')
    z.writestr("Metadata/model_settings.config", "\n".join(ms))

    # project_settings.config: two filaments declared, names only for printer and process
    mat = MATERIALS[material]
    n = 2
    ps = {
        "version": "01.10.01.50",
        "printer_settings_id": presets["printer"],
        "print_settings_id": presets["process"],
        "filament_settings_id": [presets["filament"].replace("{TYPE}", material)] * n,
        "filament_colour": [colours["white"], colours["black"]],
        "filament_type": [material] * n,
        "filament_vendor": ["Generic"] * n,
        "filament_diameter": ["1.75"] * n,
        "filament_density": [f"{mat['density']:.2f}"] * n,
        "filament_cost": ["20"] * n,
        "filament_is_support": ["0"] * n,
        "filament_soluble": ["0"] * n,
        "filament_flow_ratio": ["0.98"] * n,
        "filament_max_volumetric_speed": [str(mat["max_vol"])] * n,
        "nozzle_temperature": [str(mat["nozzle"])] * n,
        "nozzle_temperature_initial_layer": [str(mat["nozzle"])] * n,
        "hot_plate_temp": [str(mat["bed"])] * n,
        "hot_plate_temp_initial_layer": [str(mat["bed"])] * n,
        "cool_plate_temp": [str(mat["bed"])] * n,
        "cool_plate_temp_initial_layer": [str(mat["bed"])] * n,
        "eng_plate_temp": [str(mat["bed"])] * n,
        "eng_plate_temp_initial_layer": [str(mat["bed"])] * n,
        "textured_plate_temp": [str(mat["bed"])] * n,
        "textured_plate_temp_initial_layer": [str(mat["bed"])] * n,
    }
    z.writestr("Metadata/project_settings.config", json.dumps(ps, indent=4))
    z.writestr("Metadata/slice_info.config",
               '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <header>\n'
               '    <header_item key="X-BBL-Client-Type" value="slicer"/>\n'
               '    <header_item key="X-BBL-Client-Version" value="01.10.01.50"/>\n'
               '  </header>\n</config>')
    z.close()


# ----------------------------------------------------------------------------
# previews
# ----------------------------------------------------------------------------
def _add_geom(ax, g, colour, z=1):
    from matplotlib.patches import PathPatch
    from matplotlib.path import Path
    for p in polys(g):
        verts, codes = [], []
        for ringc in [p.exterior] + list(p.interiors):
            c = list(ringc.coords)
            verts.extend(c)
            codes.extend([Path.MOVETO] + [Path.LINETO] * (len(c) - 2) + [Path.CLOSEPOLY])
        ax.add_patch(PathPatch(Path(verts, codes), facecolor=colour, edgecolor="none", zorder=z))


def preview_faces(objects, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    kinds = list(objects)
    fig, axes = plt.subplots(1, 2 * len(kinds), figsize=(4 * 2 * len(kinds), 4.4), facecolor="#8a8a8a")
    axes = np.atleast_1d(axes)
    i = 0
    for k in kinds:
        for side in ("front", "back"):
            f = objects[k]["faces"][side]
            ax = axes[i]
            i += 1
            ax.set_facecolor("#8a8a8a")
            _add_geom(ax, f["blank"].difference(f["holes"]), "#f4f4f4", 1)
            _add_geom(ax, f["black"], "#111111", 2)
            x0, y0, x1, y1 = f["blank"].bounds
            ax.set_xlim(x0 - 2, x1 + 2)
            ax.set_ylim(y0 - 2, y1 + 2)
            ax.set_aspect("equal")
            ax.axis("off")
            ax.set_title(f"{k} {side} (as read)", color="white", fontsize=11)
    fig.tight_layout()
    fig.savefig(path, dpi=140, facecolor="#8a8a8a")
    plt.close(fig)


def preview_plate(objects, placed, path, title):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(7, 7), facecolor="#8a8a8a")
    ax.set_facecolor("#3a3a3a")
    ax.add_patch(plt.Rectangle((0, 0), BED, BED, facecolor="#2d2d2d", edgecolor="#777", zorder=0))
    for kind, cx, cy in placed:
        f = objects[kind]["faces"]["front"]
        _add_geom(ax, affinity.translate(f["blank"].difference(f["holes"]), cx, cy), "#f4f4f4", 1)
        _add_geom(ax, affinity.translate(f["black"], cx, cy), "#111111", 2)
    ax.set_xlim(-4, BED + 4)
    ax.set_ylim(-4, BED + 4)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(title, color="white")
    fig.tight_layout()
    fig.savefig(path, dpi=130, facecolor="#8a8a8a")
    plt.close(fig)


# ----------------------------------------------------------------------------
# main
# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="SPRUE giveaway plate generator")
    ap.add_argument("--out", default="out", help="output folder")
    ap.add_argument("--coins", type=int, default=6, help="coins on the mixed plate")
    ap.add_argument("--picks", type=int, default=20, help="picks on the mixed plate")
    ap.add_argument("--coin-d", type=float, default=SPECS["coin"]["d"], help="coin diameter mm")
    ap.add_argument("--coin-thk", type=float, default=SPECS["coin"]["thk"], help="coin thickness mm (snaps to layers)")
    ap.add_argument("--pick-thk", type=float, default=SPECS["pick"]["thk"], help="pick thickness mm (snaps to layers)")
    ap.add_argument("--no-ring", action="store_true", help="drop the black border ring on the coin")
    ap.add_argument("--no-pick-hole", action="store_true", help="no keyring hole in the pick")
    ap.add_argument("--coin-front", help="image or SVG for the coin front (dark = black)")
    ap.add_argument("--coin-back", help="image or SVG for the coin back")
    ap.add_argument("--pick-front", help="image or SVG for the pick front")
    ap.add_argument("--pick-back", help="image or SVG for the pick back")
    ap.add_argument("--invert", action="store_true", help="light pixels become the black inlay instead")
    ap.add_argument("--threshold", type=int, help="0..255 grey cut for raster art (default auto)")
    ap.add_argument("--back-arc", default="FOR THE FANS", help="arc text across the coin back, empty to drop")
    ap.add_argument("--year", default="2026", help="big text on the coin back and pick back, empty to drop")
    ap.add_argument("--font", default=FONT_DEFAULT, help="TTF for the text")
    ap.add_argument("--material", default="PETG", choices=list(MATERIALS))
    ap.add_argument("--flow", type=float, help="override average mm3/s used for the time estimate")
    ap.add_argument("--printer-preset", default="Flashforge Creator 5 Pro 0.4 nozzle")
    ap.add_argument("--process-preset", default="0.24mm Standard @FF C5")
    ap.add_argument("--filament-preset", default="Generic {TYPE} @FF C5P")
    ap.add_argument("--white", default="#FFFFFF")
    ap.add_argument("--black", default="#000000")
    ap.add_argument("--only", choices=["mix", "coins", "picks"], help="write just one plate")
    args = ap.parse_args()

    face = Face(args.font)
    out = args.out
    for sub in ("plates", "parts", "previews"):
        os.makedirs(os.path.join(out, sub), exist_ok=True)

    # ---- coin
    cs = SPECS["coin"]
    R = args.coin_d / 2.0
    ring_geom = ring(R - cs["ring_in"] - cs["ring_w"], R - cs["ring_in"]) if not args.no_ring else empty()
    art_disc = disc(R - 1.4) if args.no_ring else disc(R - cs["art_margin"])
    art_w = 2 * (R - cs["art_margin"]) * 0.98

    if args.coin_front:
        cf = art_from_file(args.coin_front, art_w, art_w, args.invert, args.threshold).intersection(art_disc)
    else:
        cf = motif_snare().intersection(art_disc)
    if args.coin_back:
        cb = art_from_file(args.coin_back, art_w, art_w, args.invert, args.threshold).intersection(art_disc)
    else:
        cb = coin_back_default(face, args.back_arc, args.year).intersection(art_disc)
    coin = build_object("coin", coin_blank(args.coin_d), unary_union([cf, ring_geom]), unary_union([cb, ring_geom]),
                        empty(), args.coin_thk, cs["inlay_layers"], cs["break_layers"], cs["break_step"])

    # ---- pick
    ps = SPECS["pick"]
    pb = pick_blank()
    holes = disc(ps["hole"] / 2.0, 0, ps["hole_y"], n=48) if not args.no_pick_hole else empty()
    art_zone = pb.buffer(-1.9).difference(holes.buffer(1.4))
    if args.pick_front:
        pf = art_from_file(args.pick_front, 15.5, 16.0, args.invert, args.threshold)
        pf = affinity.translate(pf, 0, -1.2).intersection(art_zone)
    else:
        pf = motif_bolt().intersection(art_zone)
    if args.pick_back:
        pk = art_from_file(args.pick_back, 15.5, 16.0, args.invert, args.threshold)
        pk = affinity.translate(pk, 0, -1.2).intersection(art_zone)
    else:
        pk = pick_back_default(face, args.year).intersection(art_zone)
    pick = build_object("pick", pb, pf, pk, holes, args.pick_thk, ps["inlay_layers"], ps["break_layers"], ps["break_step"])

    objects = {"coin": coin, "pick": pick}
    for k, o in objects.items():
        o["mesh_white"] = to_trimesh(o["white"])
        o["mesh_black"] = to_trimesh(o["black"])
        for colour in ("white", "black"):
            m = o["mesh_" + colour]
            if m is not None:
                write_stl(m, os.path.join(out, "parts", f"{k}_{colour}.stl"))
    preview_faces(objects, os.path.join(out, "previews", "faces.png"))

    # ---- plates
    mat = MATERIALS[args.material]
    flow = args.flow or mat["flow"]
    presets = dict(printer=args.printer_preset, process=args.process_preset, filament=args.filament_preset)
    colours = dict(white=args.white, black=args.black)

    def size(kind):
        x0, y0, x1, y1 = objects[kind]["blank"].bounds
        return x1 - x0, y1 - y0

    plates = {
        "mix": [("coin",) + size("coin")] * args.coins + [("pick",) + size("pick")] * args.picks,
        "coins": [("coin",) + size("coin")] * 12,
        "picks": [("pick",) + size("pick")] * 40,
    }
    if args.only:
        plates = {args.only: plates[args.only]}

    card = ["SPRUE print card", "=" * 60, f"material {args.material}, layer {LAYER} mm, estimate at {flow:.1f} mm3/s average", ""]
    for k, o in objects.items():
        s = o["stats"]
        wv, bv = s["white_vol"], s["black_vol"]
        card.append(f"{k}: {s['thk']:.2f} mm thick = {s['layers']} layers, inlay {s['inlay_layers']} layers each face")
        card.append(f"  white {wv:.0f} mm3, black {bv:.0f} mm3, total {wv + bv:.0f} mm3 "
                    f"(blank {s['blank_vol']:.0f} mm3), about {(wv + bv) / flow / 60:.1f} min each, "
                    f"{(wv + bv) * mat['density'] / 1000:.1f} g")
    card.append("")
    for name, items in plates.items():
        placed = pack(items)
        n_coin = sum(1 for p in placed if p[0] == "coin")
        n_pick = sum(1 for p in placed if p[0] == "pick")
        title = f"sprue_{name}"
        write_3mf(os.path.join(out, "plates", f"{title}.3mf"), objects, placed, args.material, presets, colours, title)
        for colour in ("white", "black"):
            mm = merged_plate_mesh(objects, placed, colour)
            if mm is not None:
                mm.export(os.path.join(out, "plates", f"{title}_{colour}.stl"))
        preview_plate(objects, placed, os.path.join(out, "previews", f"{title}.png"), f"{title}: {n_coin} coins, {n_pick} picks")
        vol = sum(objects[p[0]]["stats"]["white_vol"] + objects[p[0]]["stats"]["black_vol"] for p in placed)
        layers = max(objects[p[0]]["stats"]["layers"] for p in placed)
        two_colour_layers = 2 * max(objects[p[0]]["stats"]["inlay_layers"] for p in placed)
        est = vol / flow / 60.0 + 3.0 + two_colour_layers * 2 * 5 / 60.0
        card.append(f"{title}: {n_coin} coins + {n_pick} picks, {vol:.0f} mm3, {layers} layers, "
                    f"about {two_colour_layers * 2} tool swaps, rough estimate {est:.0f} min "
                    f"({vol * mat['density'] / 1000:.0f} g)")
    card.append("")
    card.append("The slicer's estimate is the real one. Tune with --coins / --picks and reslice.")
    card.append("Flash Studio: open the 3mf as a project. If the filament list shows one colour,")
    card.append("open both plate STLs together instead, say yes to one object with multiple parts,")
    card.append("and set the _black part to extruder 2.")
    with open(os.path.join(out, "print-card.txt"), "w") as fh:
        fh.write("\n".join(card) + "\n")
    print("\n".join(card))


if __name__ == "__main__":
    main()
