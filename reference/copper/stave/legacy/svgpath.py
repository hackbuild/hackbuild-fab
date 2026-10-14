"""Minimal SVG path parser -> shapely geometry, plus IBM Plex Mono text outlining.

Supports M m L l H h V v C c Q q S s T t Z z; beziers flattened to segments.
Used for (a) the canonical hack.build mark (pure polyline paths) and
(b) glyph outlines pulled from real font files, so no output depends on an
installed font.
"""
import re
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union

NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
CMD = re.compile(r'([MmLlHhVvCcQqSsTtZzAa])')


def _bez3(p0, p1, p2, p3, n=12):
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        out.append((u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1]))
    return out


def _bez2(p0, p1, p2, n=10):
    out = []
    for i in range(1, n + 1):
        t = i / n
        u = 1 - t
        out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
    return out


def path_to_rings(d):
    """Return list of point-lists (closed subpaths) in path user units."""
    toks = [t for t in CMD.split(d) if t.strip()]
    rings, cur = [], []
    pos = (0.0, 0.0)
    start = (0.0, 0.0)
    prev_c2 = None
    prev_q1 = None
    i = 0
    while i < len(toks):
        cmd = toks[i]
        i += 1
        args = []
        while i < len(toks) and not CMD.fullmatch(toks[i]):
            args += [float(x) for x in NUM.findall(toks[i])]
            i += 1
        rel = cmd.islower()
        c = cmd.upper()
        if c == 'M':
            for k in range(0, len(args), 2):
                x, y = args[k], args[k + 1]
                if rel:
                    x, y = pos[0] + x, pos[1] + y
                if k == 0:
                    if len(cur) > 2:
                        rings.append(cur)
                    cur = [(x, y)]
                    start = (x, y)
                else:
                    cur.append((x, y))
                pos = (x, y)
            prev_c2 = prev_q1 = None
        elif c == 'L':
            for k in range(0, len(args), 2):
                x, y = args[k], args[k + 1]
                if rel:
                    x, y = pos[0] + x, pos[1] + y
                cur.append((x, y)); pos = (x, y)
            prev_c2 = prev_q1 = None
        elif c == 'H':
            for a in args:
                x = pos[0] + a if rel else a
                cur.append((x, pos[1])); pos = (x, pos[1])
            prev_c2 = prev_q1 = None
        elif c == 'V':
            for a in args:
                y = pos[1] + a if rel else a
                cur.append((pos[0], y)); pos = (pos[0], y)
            prev_c2 = prev_q1 = None
        elif c == 'C':
            for k in range(0, len(args), 6):
                p1 = (args[k], args[k + 1]); p2 = (args[k + 2], args[k + 3]); p3 = (args[k + 4], args[k + 5])
                if rel:
                    p1 = (pos[0] + p1[0], pos[1] + p1[1]); p2 = (pos[0] + p2[0], pos[1] + p2[1]); p3 = (pos[0] + p3[0], pos[1] + p3[1])
                cur += _bez3(pos, p1, p2, p3); prev_c2 = p2; pos = p3
            prev_q1 = None
        elif c == 'S':
            for k in range(0, len(args), 4):
                p2 = (args[k], args[k + 1]); p3 = (args[k + 2], args[k + 3])
                if rel:
                    p2 = (pos[0] + p2[0], pos[1] + p2[1]); p3 = (pos[0] + p3[0], pos[1] + p3[1])
                p1 = (2 * pos[0] - prev_c2[0], 2 * pos[1] - prev_c2[1]) if prev_c2 else pos
                cur += _bez3(pos, p1, p2, p3); prev_c2 = p2; pos = p3
            prev_q1 = None
        elif c == 'Q':
            for k in range(0, len(args), 4):
                p1 = (args[k], args[k + 1]); p2 = (args[k + 2], args[k + 3])
                if rel:
                    p1 = (pos[0] + p1[0], pos[1] + p1[1]); p2 = (pos[0] + p2[0], pos[1] + p2[1])
                cur += _bez2(pos, p1, p2); prev_q1 = p1; pos = p2
            prev_c2 = None
        elif c == 'T':
            for k in range(0, len(args), 2):
                p2 = (args[k], args[k + 1])
                if rel:
                    p2 = (pos[0] + p2[0], pos[1] + p2[1])
                p1 = (2 * pos[0] - prev_q1[0], 2 * pos[1] - prev_q1[1]) if prev_q1 else pos
                cur += _bez2(pos, p1, p2); prev_q1 = p1; pos = p2
            prev_c2 = None
        elif c == 'Z':
            if len(cur) > 2:
                rings.append(cur)
            cur = []
            pos = start
            prev_c2 = prev_q1 = None
        else:
            raise ValueError('unsupported path command ' + cmd)
    if len(cur) > 2:
        rings.append(cur)
    return rings


def rings_to_geom(rings):
    """Even-odd fill: build polygons, subtract any ring fully inside another."""
    polys = [Polygon(r).buffer(0) for r in rings if len(r) > 2]
    polys = [p for p in polys if not p.is_empty and p.area > 0]
    polys.sort(key=lambda p: -p.area)
    out = []
    for p in polys:
        placed = False
        for j, o in enumerate(out):
            if o.contains(p.representative_point()):
                out[j] = o.difference(p)
                placed = True
                break
        if not placed:
            out.append(p)
    return unary_union(out)


def path_geom(d, scale=1.0, dx=0.0, dy=0.0, flip_y=False):
    from shapely.affinity import affine_transform
    g = rings_to_geom(path_to_rings(d))
    sy = -scale if flip_y else scale
    return affine_transform(g, [scale, 0, 0, sy, dx, dy])


# ---------------------------------------------------------------- text
class _Pen:
    def __init__(self):
        self.d = []

    def moveTo(self, p): self.d.append('M %f %f' % p)
    def lineTo(self, p): self.d.append('L %f %f' % p)
    def qCurveTo(self, *pts):
        # fontTools may pass implied on-curve None as last point
        pts = list(pts)
        if pts[-1] is None:
            pts = pts[:-1]
            # implied final on-curve: midpoint of last two off-curves
            impl = ((pts[-1][0] + pts[-2][0]) / 2.0, (pts[-1][1] + pts[-2][1]) / 2.0) if len(pts) > 1 else pts[-1]
            for k in range(len(pts) - 1):
                mid = ((pts[k][0] + pts[k + 1][0]) / 2.0, (pts[k][1] + pts[k + 1][1]) / 2.0)
                self.d.append('Q %f %f %f %f' % (pts[k][0], pts[k][1], mid[0], mid[1]))
            self.d.append('Q %f %f %f %f' % (pts[-1][0], pts[-1][1], impl[0], impl[1]))
            return
        if len(pts) == 2:
            self.d.append('Q %f %f %f %f' % (pts[0][0], pts[0][1], pts[1][0], pts[1][1]))
        else:
            for k in range(len(pts) - 2):
                mid = ((pts[k][0] + pts[k + 1][0]) / 2.0, (pts[k][1] + pts[k + 1][1]) / 2.0)
                self.d.append('Q %f %f %f %f' % (pts[k][0], pts[k][1], mid[0], mid[1]))
            self.d.append('Q %f %f %f %f' % (pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1]))
    def curveTo(self, *pts):
        self.d.append('C %f %f %f %f %f %f' % (pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]))
    def closePath(self): self.d.append('Z')
    def endPath(self): self.d.append('Z')
    def addComponent(self, name, tr): pass


_FONTS = {}


def _font(path):
    if path not in _FONTS:
        from fontTools.ttLib import TTFont
        _FONTS[path] = TTFont(path)
    return _FONTS[path]


def text_geom(s, font_path, cap_mm, x, y, tracking=0.0, anchor='l'):
    """Outline text. cap_mm = cap height in mm. y = baseline, y up.
    Returns (geometry, advance_width_mm)."""
    f = _font(font_path)
    upm = f['head'].unitsPerEm
    cap = f['OS/2'].sCapHeight if hasattr(f['OS/2'], 'sCapHeight') and f['OS/2'].sCapHeight else 698
    scale = cap_mm / cap
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    pen_x = 0.0
    parts = []
    for ch in s:
        gn = cmap.get(ord(ch))
        if gn is None:
            pen_x += 600 * scale + tracking
            continue
        p = _Pen()
        from fontTools.pens.transformPen import TransformPen
        gs[gn].draw(TransformPen(p, (1, 0, 0, 1, 0, 0)))
        d = ' '.join(p.d)
        adv = gs[gn].width * scale
        if d.strip():
            g = path_geom(d, scale=scale, dx=pen_x, dy=0.0)
            if not g.is_empty:
                parts.append(g)
        pen_x += adv + tracking
    total = pen_x - (tracking if s else 0.0)
    off = 0.0
    if anchor == 'c':
        off = -total / 2.0
    elif anchor == 'r':
        off = -total
    from shapely.affinity import translate
    g = unary_union(parts) if parts else MultiPolygon()
    return translate(g, x + off, y), total
