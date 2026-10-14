"""textpoly.py, text to filled polygons with the real display fonts.

Ported from SHUNT R1 textpoly.py (lineage shunt.textpoly/r1); the fonts
ship in the repo at tools/py/board/fonts/ (M08-T06 step 3), and two options
serve SPINDLE R1's silk (pcb.py lines 347 to 394): valign="baseline" puts
the anchor on the baseline, and text_geometry folds the contours into one
shapely geometry by symmetric difference, as pcb.py's glyph_polys did.

Silkscreen in a gerber is filled regions, not strings, so every glyph has to
become polygons. These are the same faces the sim loads from Google Fonts
(Permanent Marker, Special Elite, IBM Plex Mono), fetched as woff2 from
fontsource, so the fab output matches what the viewer shows.

Contour nesting is decided by point-in-polygon containment rather than winding
direction, because TrueType and CFF outlines wind opposite ways and this font
set contains both.
"""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTDIR = os.path.join(HERE, "..", "fonts")

# (family, weight) -> file. The sim asks for weights 400/600/700 of Plex Mono;
# the display faces ship one weight each, so heavier requests fall back.
FILES = {
    ("mono", 400): "ibm-plex-mono-latin-400-normal.woff2",
    ("mono", 500): "ibm-plex-mono-latin-400-normal.woff2",
    ("mono", 600): "ibm-plex-mono-latin-600-normal.woff2",
    ("mono", 700): "ibm-plex-mono-latin-700-normal.woff2",
    ("type", 400): "special-elite-latin-400-normal.woff2",
    ("marker", 400): "permanent-marker-latin-400-normal.woff2",
}
CURVE_STEPS = 8          # segments per quadratic or cubic; 8 is ~0.01 mm at 15 mm
_cache = {}


def _font(family, weight):
    key = (family, min(FILES_W[family], key=lambda w: abs(w - weight)))
    if key not in _cache:
        f = TTFont(os.path.join(FONTDIR, FILES[key]))
        _cache[key] = dict(font=f, upem=f["head"].unitsPerEm,
                           cmap=f.getBestCmap(), hmtx=f["hmtx"],
                           glyphs=f.getGlyphSet(),
                           asc=f["hhea"].ascent, desc=f["hhea"].descent,
                           kern=_kern_table(f))
    return _cache[key]


FILES_W = {}
for (fam, wt) in FILES:
    FILES_W.setdefault(fam, []).append(wt)


def _kern_table(f):
    """Legacy 'kern' pairs if present. GPOS kerning is not applied; the sim's
    browser layout does apply it, so long strings can come out a touch wider
    here than on screen."""
    try:
        return f["kern"].kernTables[0].kernTable
    except Exception:
        return {}


class _Flatten(BasePen):
    """Collects contours as flat point lists in font units."""

    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.contours = []
        self._c = []
        self._p = (0.0, 0.0)

    def _moveTo(self, p):
        self._flush()
        self._c = [p]
        self._p = p

    def _lineTo(self, p):
        self._c.append(p)
        self._p = p

    def _curveToOne(self, c1, c2, p):
        x0, y0 = self._p
        for i in range(1, CURVE_STEPS + 1):
            t = i / CURVE_STEPS
            u = 1 - t
            self._c.append((
                u ** 3 * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p[0],
                u ** 3 * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p[1]))
        self._p = p

    def _qCurveToOne(self, c, p):
        x0, y0 = self._p
        for i in range(1, CURVE_STEPS + 1):
            t = i / CURVE_STEPS
            u = 1 - t
            self._c.append((u * u * x0 + 2 * u * t * c[0] + t * t * p[0],
                            u * u * y0 + 2 * u * t * c[1] + t * t * p[1]))
        self._p = p

    def _closePath(self):
        self._flush()

    def _endPath(self):
        self._flush()

    def _flush(self):
        if len(self._c) > 2:
            self.contours.append(self._c)
        self._c = []


def _area(poly):
    a = 0.0
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        a += x0 * y1 - x1 * y0
    return a / 2.0


def _inside(pt, poly):
    x, y = pt
    n = len(poly)
    hit = False
    for i in range(n):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % n]
        if (y0 > y) != (y1 > y):
            if x < x0 + (y - y0) / (y1 - y0) * (x1 - x0):
                hit = not hit
    return hit


def text_polys(text, family, weight, size_mm, x, y, align="left", rot_deg=0.0,
               mirror=False, valign="middle"):
    """Polygons for one string, in board mm.

    Matches the sim's canvas layout: `size_mm` is the em size, the anchor is
    vertically centred like textBaseline 'middle', align is left/center/right,
    rot_deg is counter-clockwise. `mirror` flips the glyphs about the anchor's
    vertical axis, which is what back-side silkscreen needs so that it reads
    when the board is turned over.

    Returns [(points, is_hole)] with points as [(x, y), ...] in board mm.
    """
    F = _font(family, weight)
    upem, gs, cmap, hmtx = F["upem"], F["glyphs"], F["cmap"], F["hmtx"]
    sc = size_mm / upem

    names, adv = [], 0.0
    prev = None
    for ch in text:
        gn = cmap.get(ord(ch))
        if gn is None:
            gn = cmap.get(ord("?"), None)
        if gn is None:
            continue
        if prev is not None:
            adv += F["kern"].get((prev, gn), 0)
        names.append((gn, adv))
        adv += hmtx[gn][0]
        prev = gn
    width = adv * sc
    if not names:
        return []

    dx0 = {"left": 0.0, "center": -width / 2, "right": -width}[align]
    # canvas 'middle' baseline: halfway between hhea ascent and descent
    dy0 = 0.0 if valign == "baseline" else -(F["asc"] + F["desc"]) / 2 * sc

    r = math.radians(rot_deg)
    cos_r, sin_r = math.cos(r), math.sin(r)
    out = []
    for gn, pen_x in names:
        pen = _Flatten(gs)
        try:
            gs[gn].draw(pen)
        except Exception:
            continue
        cs = [[(px * sc, py * sc) for (px, py) in c] for c in pen.contours]
        # holes: odd containment depth, which works for both winding conventions
        flags = []
        for i, c in enumerate(cs):
            if abs(_area(c)) < 1e-9:
                flags.append(None)
                continue
            probe = c[0]
            depth = sum(1 for j, o in enumerate(cs)
                        if j != i and abs(_area(o)) > 1e-9 and _inside(probe, o))
            flags.append(depth % 2 == 1)
        for c, hole in zip(cs, flags):
            if hole is None:
                continue
            pts = []
            for (px, py) in c:
                # Alignment means the same thing on both faces: the ink box in
                # board coordinates is [x+dx0, x+dx0+width] either way. Only
                # the glyph shapes flip, mirrored within that box, which is
                # the rule the viewer's canvas painter follows too. Negating
                # the pen position instead pushes the whole string off the
                # board by its own width.
                adv = pen_x * sc + px
                lx = dx0 + (width - adv if mirror else adv)
                ly = py + dy0
                pts.append((x + lx * cos_r - ly * sin_r,
                            y + lx * sin_r + ly * cos_r))
            out.append((pts, hole))
    return out


def text_width(text, family, weight, size_mm):
    F = _font(family, weight)
    w, prev = 0.0, None
    for ch in text:
        gn = F["cmap"].get(ord(ch))
        if gn is None:
            continue
        if prev is not None:
            w += F["kern"].get((prev, gn), 0)
        w += F["hmtx"][gn][0]
        prev = gn
    return w * size_mm / F["upem"]


def text_geometry(text, family, weight, size_mm, x, y, align="left", rot_deg=0.0,
                  mirror=False, valign="middle"):
    """One string as shapely geometry: every contour folded in by symmetric
    difference, so a counter becomes a hole whatever the winding (pcb.py
    glyph_polys lines 376 to 385)."""
    from shapely.geometry import Polygon
    res = None
    for pts, _hole in text_polys(text, family, weight, size_mm, x, y, align, rot_deg, mirror, valign):
        try:
            pg = Polygon(pts)
        except Exception:
            continue
        if not pg.is_valid or pg.area <= 0:
            continue
        res = pg if res is None else res.symmetric_difference(pg)
    return res
