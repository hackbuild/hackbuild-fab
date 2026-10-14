"""Gerber X2 writers for the direct route.

Two writers share one header:
- write_regions and write_stroke, ported from SPINDLE R1 pcb.py lines 290
  to 331: shapely geometry as G36/G37 regions, %LPD% for an exterior and
  %LPC% for each interior, polygons largest area first.
- FlashGerber, ported from SHUNT R1 gen_fab.py lines 36 to 100: flashed
  apertures, regions and stroked paths.

Two rules from board-pcb.md hold the region writer:
1. Rings are taken by index. shapely hands back a new ring object on every
   .exterior access, so an identity test never matches and writes every
   interior as filled copper, which shorts every isolated hole to the pour.
2. Polygons go out largest area first: an island inside another polygon's
   cleared interior must be drawn after that clear or the clear wipes it.

Region geometry goes through snap before it is written. Shapely's arcs
take their sines from the platform libm, and macOS libm and glibc differ
in the last bit; GEOS overlay turns those bits into another ring start, a
vertex repeated within 1 nm, or another order among polygons of equal
area, and it orders its output parts differently by platform even on
equal input. The bytes moved between macOS and Linux while the copper did
not. snap rounds every vertex to the 1 nm grid the file carries, drops
repeats and puts rings and polygons in normal form, and draw order ties
break on an exact integer area, so one geometry writes one file on every
platform.

Coordinates are integer nanometres (%FSLAX46Y46%, %MOMM%). The header
carries TF.GenerationSoftware hack.build,hbf,<version> and a
TF.CreationDate from the epoch the caller passes, never the clock.
"""
import datetime

import numpy
import shapely


def iso_date(epoch):
    """SOURCE_DATE_EPOCH as an ISO 8601 UTC timestamp."""
    return datetime.datetime.fromtimestamp(int(epoch), tz=datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")


def nm(v):
    return str(int(round(v * 1e6)))


def header(function, epoch, version, polarity=None, extra=()):
    o = [f"%TF.GenerationSoftware,hack.build,hbf,{version}*%",
         f"%TF.CreationDate,{iso_date(epoch)}*%",
         f"%TF.FileFunction,{function}*%"]
    if polarity is not None:
        o.append(f"%TF.FilePolarity,{polarity}*%")
    o += ["%TF.Part,Single*%", *extra, "%FSLAX46Y46*%", "%MOMM*%", "G01*", "%LPD*%"]
    return o


def polygons_of(geom):
    if geom.is_empty:
        return []
    if geom.geom_type == "Polygon":
        return [geom]
    if geom.geom_type == "MultiPolygon":
        return list(geom.geoms)
    if geom.geom_type == "GeometryCollection":
        return [g for sub in geom.geoms for g in polygons_of(sub)]
    return []


def snap(geom):
    """geom on the 1 nm grid in normal form: each vertex rounded as nm()
    rounds it (half to even, which GEOS set_precision does not do), repeats
    dropped, each ring started at its least vertex, polygons in GEOS normal
    order. No vertex moves off the place nm() would have written it."""
    on = shapely.transform(geom, lambda c: numpy.round(c * 1e6) / 1e6)
    return shapely.normalize(shapely.remove_repeated_points(on, 0.0))


def ring_area2(ring):
    """Twice the ring's area in nm2, exact: the integer shoelace."""
    cs = [(int(nm(x)), int(nm(y))) for x, y in ring.coords]
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(cs, cs[1:])))


def nm_area(poly):
    """Twice the polygon's area in nm2, holes taken out, exact on every platform."""
    return ring_area2(poly.exterior) - sum(ring_area2(r) for r in poly.interiors)


def emit_regions(out, geom):
    polys = polygons_of(snap(geom))
    # a stable sort on an exact key keeps normal order among equal areas
    polys.sort(key=nm_area, reverse=True)
    for p in polys:
        if p.is_empty:
            continue
        rings = [p.exterior] + list(p.interiors)
        for idx, ringc in enumerate(rings):
            out.append("%LPD*%" if idx == 0 else "%LPC*%")
            cs = list(ringc.coords)
            out.append("G36*")
            out.append(f"X{nm(cs[0][0])}Y{nm(cs[0][1])}D02*")
            for x, y in cs[1:]:
                out.append(f"X{nm(x)}Y{nm(y)}D01*")
            out.append("G37*")
        out.append("%LPD*%")


def emit_stroke(out, geom):
    lines = list(geom.geoms) if hasattr(geom, "geoms") else [geom]
    for ln in lines:
        cs = list(ln.coords)
        out.append(f"X{nm(cs[0][0])}Y{nm(cs[0][1])}D02*")
        for x, y in cs[1:]:
            out.append(f"X{nm(x)}Y{nm(y)}D01*")


def write_regions(path, geom, function, epoch, version):
    o = header(function, epoch, version, "Positive")
    emit_regions(o, geom)
    o.append("M02*")
    with open(path, "w", newline="\n") as f:
        f.write("\n".join(o) + "\n")


def write_stroke(path, geom, function, epoch, version, width=0.1):
    """Board profile as a stroked path, which is what a fab expects."""
    # the aperture follows %MOMM%: defined before the unit, a reader has no unit to scale it by
    o = header(function, epoch, version) + [f"%ADD10C,{width:.6f}*%", "D10*"]
    emit_stroke(o, geom)
    o.append("M02*")
    with open(path, "w", newline="\n") as f:
        f.write("\n".join(o) + "\n")


class FlashGerber:
    """Flashed apertures, regions and stroked paths in one file (SHUNT gen_fab.py Gerber)."""

    def __init__(self, path, function, epoch, version, polarity="Positive", extra=()):
        self.f = open(path, "w", newline="\n")
        self.aps = {}
        self.next = 10
        self.cur = None
        self.f.write("\n".join(header(function, epoch, version, polarity, extra)) + "\n")

    def aperture(self, kind, *dims):
        key = (kind, tuple(round(d, 4) for d in dims))
        if key not in self.aps:
            code = self.next
            self.next += 1
            self.aps[key] = code
            self.f.write("%%ADD%d%s,%s*%%\n" % (code, kind, "X".join("%.4f" % d for d in dims)))
        return self.aps[key]

    def select(self, code):
        if self.cur != code:
            self.f.write("D%d*\n" % code)
            self.cur = code

    def flash(self, code, x, y):
        self.select(code)
        self.f.write("X%sY%sD03*\n" % (nm(x), nm(y)))

    def polarity(self, dark=True):
        self.f.write("%%LP%s*%%\n" % ("D" if dark else "C"))

    def region(self, pts):
        if len(pts) < 3:
            return
        self.f.write("G36*\n")
        x0, y0 = pts[0]
        self.f.write("X%sY%sD02*\n" % (nm(x0), nm(y0)))
        for x, y in pts[1:]:
            self.f.write("X%sY%sD01*\n" % (nm(x), nm(y)))
        self.f.write("X%sY%sD01*\nG37*\n" % (nm(x0), nm(y0)))

    def path(self, pts, width, closed=True):
        code = self.aperture("C", width)
        self.select(code)
        x0, y0 = pts[0]
        self.f.write("X%sY%sD02*\n" % (nm(x0), nm(y0)))
        for x, y in pts[1:]:
            self.f.write("X%sY%sD01*\n" % (nm(x), nm(y)))
        if closed:
            self.f.write("X%sY%sD01*\n" % (nm(x0), nm(y0)))

    def close(self):
        self.f.write("M02*\n")
        self.f.close()
