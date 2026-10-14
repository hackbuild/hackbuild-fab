#!/usr/bin/env python3
"""
demo_coin.py: the python route end to end (challenge coin / SPRUE lineage).
2D regions in shapely, extruded into slabs with manifold3d, booleans for the
pockets, three colour parts that sum exactly to the solid coin, written as an
Orca dialect 3MF plus per colour STLs, then audited.

    uv run --project tools/py tools/py/demo_coin.py out_dir [--dia 44] [--thk 3.6] [--inlay 1.2] [--rim 2.2] [--layer 0.24]

The writer resolves its data from the repo root, so this runs from any
working directory. Dates and zip mtimes come from SOURCE_DATE_EPOCH.

Design rules baked in:
  * flush inlay only, no relief: pockets in the body, filled by the inlay part
  * inlay depth quantised to whole layers and deep enough to hide the body colour
  * bed facing face art mirrored in X so it reads correctly once flipped
  * rim ring runs the full thickness so the edge is one colour
  * minimum feature 0.6 mm: nothing thinner than that survives a 0.4 nozzle
"""
import os, sys, math, argparse
import numpy as np
import shapely
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
from shapely.affinity import scale, rotate, translate
import manifold3d as m3d

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from orca3mf import Orca3MF, PrintObject, Part


# ------------------------------------------------------------ 2D helpers
def polygon_to_manifold(geom, z0, z1):
    """Extrude a shapely (Multi)Polygon between z0 and z1 into a Manifold."""
    if geom.is_empty:
        return m3d.Manifold()
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    rings = []
    for p in polys:
        ext = list(p.exterior.coords)[:-1]
        if Polygon(ext).exterior.is_ccw is False:
            ext = ext[::-1]
        rings.append(np.array(ext, dtype=np.float64))
        for hole in p.interiors:
            h = list(hole.coords)[:-1]
            if Polygon(h).exterior.is_ccw:
                h = h[::-1]
            rings.append(np.array(h, dtype=np.float64))
    cs = m3d.CrossSection(rings, m3d.FillRule.EvenOdd)
    return m3d.Manifold.extrude(cs, z1 - z0).translate([0, 0, z0])


def open_close(geom, r):
    """Morphological open then close: removes features thinner than 2r and heals gaps thinner than 2r."""
    g = geom.buffer(-r).buffer(r)
    g = g.buffer(r).buffer(-r)
    return g


def star(cx, cy, r_out, r_in, n=5, rot=0.0):
    pts = []
    for i in range(2 * n):
        r = r_out if i % 2 == 0 else r_in
        ang = rot + math.pi / 2 + i * math.pi / n
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return Polygon(pts)


def front_art(R):
    """Original motif: a wrench-ish ring and bar. Returns (accent_region, ink_region) in coin coords."""
    ring = Point(0, 0).buffer(R * 0.55).difference(Point(0, 0).buffer(R * 0.42))
    gap = rotate(box(-R * 0.08, R * 0.3, R * 0.08, R * 0.7), 35, origin=(0, 0))
    ring = ring.difference(gap)
    bar = rotate(box(-R * 0.06, -R * 0.62, R * 0.06, -R * 0.1), 35, origin=(0, 0))
    accent = unary_union([ring, bar])
    return accent, Polygon()


def back_art(R):
    """Arc text needs a font; the demo uses a geometric back: three stars on an arc and a centre bar."""
    stars = [star(R * 0.55 * math.cos(a), R * 0.55 * math.sin(a), R * 0.11, R * 0.045, rot=a - math.pi / 2)
             for a in (math.radians(60), math.radians(90), math.radians(120))]
    bar = box(-R * 0.45, -R * 0.12, R * 0.45, -R * 0.02)
    return unary_union(stars + [bar])


def to_part(name, man, slot):
    mesh = man.to_mesh()
    return Part(name, np.asarray(mesh.vert_properties)[:, :3], np.asarray(mesh.tri_verts), slot)


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--dia", type=float, default=44.0)
    ap.add_argument("--thk", type=float, default=3.6)
    ap.add_argument("--inlay", type=float, default=1.2, help="inlay depth, snapped to layers")
    ap.add_argument("--rim", type=float, default=2.2)
    ap.add_argument("--layer", type=float, default=0.24)
    ap.add_argument("--minf", type=float, default=0.6, help="minimum feature width (mm)")
    ap.add_argument("--count", type=int, default=1, help="instances on the plate")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)

    R = a.dia / 2
    layers_inlay = max(1, round(a.inlay / a.layer))
    inlay = layers_inlay * a.layer                       # whole layers only
    thk = round(a.thk / a.layer) * a.layer
    print("coin %.1f dia, %.2f thick (%d layers), inlay %.2f (%d layers), rim %.1f" %
          (a.dia, thk, round(thk / a.layer), inlay, layers_inlay, a.rim))

    disc = Point(0, 0).buffer(R, quad_segs=96)
    core = Point(0, 0).buffer(R - a.rim, quad_segs=96)
    rim2d = disc.difference(core)

    front_accent, _ = front_art(R)
    back_ink = back_art(R)
    # print reality: min feature clean up and stay clear of the rim by one line width
    field = core.buffer(-0.5)
    front_accent = open_close(front_accent.intersection(field), a.minf / 2)
    back_ink = open_close(back_ink.intersection(field), a.minf / 2)
    # bed facing face is read from the other side once the coin is flipped: mirror in X
    back_ink_bed = scale(back_ink, xfact=-1, yfact=1, origin=(0, 0))

    # solids: rim full height, inlays as slabs, body = core minus pockets
    rim = polygon_to_manifold(rim2d, 0, thk)
    front_inlay = polygon_to_manifold(front_accent, thk - inlay, thk)      # top face, pink
    back_inlay = polygon_to_manifold(back_ink_bed, 0, inlay)                # bed face, white
    body = polygon_to_manifold(core, 0, thk) - front_inlay - back_inlay
    solid = polygon_to_manifold(disc, 0, thk)

    parts = [to_part("body", body, 1), to_part("back-inlay", back_inlay, 2),
             to_part("front-inlay", front_inlay, 3), to_part("rim", rim, 3)]
    # rim and front inlay share a slot but must stay separate solids (no shared faces)
    vol_parts = sum(abs(p.signed_volume()) for p in parts)
    print("volume check: parts %.3f vs solid %.3f mm3" % (vol_parts, solid.volume()))
    assert abs(vol_parts - solid.volume()) < 1e-2 * solid.volume()

    w = Orca3MF([{"color": "#1A1A1A", "type": "PETG", "name": "black"},
                 {"color": "#FFFFFF", "type": "PETG", "name": "white"},
                 {"color": "#FE0386", "type": "PETG", "name": "pink"}], layer_height=a.layer, title="demo coin")
    # simple row layout for instances
    pitch = a.dia + 6
    cols = max(1, int(math.ceil(math.sqrt(a.count))))
    pos = [(128 + (i % cols - (cols - 1) / 2) * pitch, 128 + (i // cols - (math.ceil(a.count / cols) - 1) / 2) * pitch)
           for i in range(a.count)]
    w.add(PrintObject("coin", parts), pos)
    path = os.path.join(a.out, "demo-coin.3mf")
    w.write(path)
    for p in parts:
        with open(os.path.join(a.out, "demo-coin-%s.stl" % p.name), "wb") as fh:
            fh.write(p.stl_bytes())
    sm = solid.to_mesh()
    with open(os.path.join(a.out, "demo-coin-solid.stl"), "wb") as fh:
        fh.write(Part("solid", np.asarray(sm.vert_properties)[:, :3], np.asarray(sm.tri_verts), 1).stl_bytes())
    with open(os.path.join(a.out, "print-card.txt"), "w") as fh:
        fh.write(w.print_card())
    print("wrote", path)


if __name__ == "__main__":
    main(sys.argv[1:])
