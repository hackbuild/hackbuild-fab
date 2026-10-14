#!/usr/bin/env python3
"""reparse.py, read an emitted fab set back with two independent parsers and
hold it against the BoardRecord (M08-T07, CHK-BRD-01).

    uv run --project tools/py tools/py/board/reparse.py <fab dir> --record <record.json>
        [--legacy <zip>] [--json <report.json>]

Written for M08 (D-180: the SPINDLE reparse scripts were never harvested);
the method is the M08 card's Records section and SHUNT check_fab.py
(lineage shunt.check-fab/r1). Exit 0 when every assertion holds, 1 when one
fails, printing what failed.

1. gerbonara parses every gerber and drill file with warnings as errors.
2. Vector compare: each layer the generator wrote a source for
   (source/<layer>.wkb) is folded from its parsed objects in file order by
   polarity and compared with the source: symmetric difference at most
   1e-3 mm2 per layer.
3. Record: each pad is covered by its own side's copper; each through pad
   and via has land at its hole on the other side; each drill has an
   Excellon hit within 1 um and a diameter within 1 um; non-plated holes
   equal the record's; with a pour net (gates.json zones.pour), every hole
   off that net lies clear of every bottom copper piece over 50 mm2 and
   every hole on it lies on one.
4. Silk (source/silk.json): parsed region vertices in integer nanometres
   equal textpoly's with the declared mirror flag, the other flag shares
   under 98 percent of them, and the back ink box lies on the board.
5. pygerber rasterises F_Cu and B_Cu at 40 px/mm against the source drawn
   on the same grid: no disagreeing pixel outside a 2 px band around the
   source edges. The raw agreement percentage is printed, never gated: it
   moves with grid alignment (M08 Records, D-075).
6. --legacy: the legacy zip's layers against the new fab set by the same
   vector compare; bytes may differ.
"""
import argparse
import json
import math
import os
import sys
import tempfile
import warnings
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

SYMDIFF_MM2 = 1e-3       # step 2 gate, mm2 per layer
DRILL_TOL_MM = 1e-3      # step 3: 1 um position and diameter
LAND_MM = 1e-3           # land at a hole: copper over the drill disc grown by 1 um
POUR_PIECE_MM2 = 50.0    # step 3: a bottom copper piece over 50 mm2 counts as pour
MIRROR_SHARE = 0.98      # step 4
INK_MARGIN_MM = 0.3      # check_fab.py line 200
DPMM = 40                # step 5 raster grid, px/mm
BAND_PX = 2              # step 5 edge band, px
LAYERS = ["F_Cu", "B_Cu", "F_Mask", "B_Mask", "F_Paste", "B_Paste", "F_Silkscreen", "B_Silkscreen", "Edge_Cuts"]


class Report:
    def __init__(self):
        self.lines = []
        self.fails = []
        self.data = {}

    def note(self, s):
        self.lines.append(s)
        print("  " + s)

    def fail(self, s):
        self.fails.append(s)
        print("  FAIL " + s)


# ------------------------------------------------------------------ parsing
def layer_files(fab):
    """{layer: path} for every gerber in the folder, by its _<Layer>.gbr suffix."""
    out = {}
    for fn in sorted(os.listdir(fab)):
        if not fn.endswith(".gbr"):
            continue
        for name in LAYERS:
            if fn.endswith(f"-{name}.gbr"):
                out[name] = os.path.join(fab, fn)
    return out


def drill_files(fab):
    out = {}
    for fn in sorted(os.listdir(fab)):
        if fn.endswith("-PTH.drl"):
            out["PTH"] = os.path.join(fab, fn)
        elif fn.endswith("-NPTH.drl"):
            out["NPTH"] = os.path.join(fab, fn)
    return out


def open_strict(cls, path):
    """Parse with every warning raised, so a header fault fails the read (step 1)."""
    with warnings.catch_warnings():
        warnings.simplefilter("error")
        return cls.open(path)


def shape_of(o):
    """One parsed gerbonara object as shapely geometry, mm; None for an object with no area."""
    from shapely.geometry import LineString, Point, Polygon, box
    kind = type(o).__name__
    if kind == "Region":
        pts = [(float(p[0]), float(p[1])) for p in o.outline]
        if len(pts) < 3:
            return None
        g = Polygon(pts)
        return g if g.is_valid else g.buffer(0)
    if kind == "Flash":
        ap = o.aperture
        x, y = float(o.x), float(o.y)
        an = type(ap).__name__
        if an == "CircleAperture":
            return Point(x, y).buffer(float(ap.diameter) / 2, resolution=32)
        if an in ("RectangleAperture", "ObroundAperture"):
            w, h = float(ap.w), float(ap.h)
            if an == "ObroundAperture":
                r = min(w, h) / 2
                return box(x - w / 2 + r, y - h / 2 + r, x + w / 2 - r, y + h / 2 - r).buffer(r, resolution=32)
            return box(x - w / 2, y - h / 2, x + w / 2, y + h / 2)
        return None
    if kind == "Line":
        d = float(getattr(o.aperture, "diameter", 0.0))
        return LineString([(float(o.x1), float(o.y1)), (float(o.x2), float(o.y2))]).buffer(d / 2, resolution=16)
    return None


def fold(g):
    """Fold the objects in file order by polarity: runs of one polarity are unioned, then added or cleared."""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    acc = Polygon()
    run, dark = [], True
    for o in g.objects:
        s = shape_of(o)
        if s is None:
            continue
        d = bool(getattr(o, "polarity_dark", True))
        if d != dark and run:
            u = unary_union(run)
            acc = acc.union(u) if dark else acc.difference(u)
            run = []
        dark = d
        run.append(s)
    if run:
        u = unary_union(run)
        acc = acc.union(u) if dark else acc.difference(u)
    return acc


def parse_all(fab, rep):
    from gerbonara import ExcellonFile, GerberFile
    files, folded = {}, {}
    for name, path in layer_files(fab).items():
        try:
            files[name] = open_strict(GerberFile, path)
        except Exception as e:  # a parse warning raised as an error fails the read
            rep.fail(f"{name} did not parse: {e}")
            continue
    drills = {}
    for name, path in drill_files(fab).items():
        try:
            e = open_strict(ExcellonFile, path)
        except Exception as ex:
            rep.fail(f"{name} did not parse: {ex}")
            continue
        drills[name] = [(float(o.x), float(o.y), float(o.tool.diameter)) for o in e.objects if getattr(o, "tool", None) is not None]
    rep.note(f"parsed {len(files)} gerber layers and {len(drills)} drill files")
    return files, drills, folded


def folded_layer(files, folded, name):
    if name not in folded and name in files:
        folded[name] = fold(files[name])
    return folded.get(name)


# ------------------------------------------------------------------ step 2
def vector_compare(fab, files, folded, rep):
    from shapely import wkb
    src_dir = os.path.join(fab, "source")
    out = {}
    if not os.path.isdir(src_dir):
        return out
    for fn in sorted(os.listdir(src_dir)):
        if not fn.endswith(".wkb"):
            continue
        name = fn[:-4]
        with open(os.path.join(src_dir, fn), "rb") as f:
            src = wkb.loads(f.read())
        got = folded_layer(files, folded, name)
        if got is None:
            rep.fail(f"{name}: no parsed layer to compare with its source")
            continue
        sd = got.symmetric_difference(src).area
        out[name] = {"parsed": got.area, "source": src.area, "symdiff": sd}
        rep.note(f"{name:<13} parsed {got.area:10.3f} mm2, source {src.area:10.3f} mm2, symmetric difference {sd:.6f} mm2")
        if sd > SYMDIFF_MM2:
            rep.fail(f"{name} symmetric difference {sd:.6f} mm2, legal 0 to {SYMDIFF_MM2}, set by the vector gate")
    rep.data["vector"] = out
    return out


# ------------------------------------------------------------------ step 3
def pad_poly(p):
    from shapely import affinity
    from shapely.geometry import Point, box
    if p["shape"] == "circle":
        g = Point(p["x"], p["y"]).buffer(p["w"] / 2, resolution=32)
    elif p["shape"] == "oval":
        r = min(p["w"], p["h"]) / 2
        g = box(p["x"] - p["w"] / 2 + r, p["y"] - p["h"] / 2 + r, p["x"] + p["w"] / 2 - r, p["y"] + p["h"] / 2 - r).buffer(r, resolution=32)
    else:
        g = box(p["x"] - p["w"] / 2, p["y"] - p["h"] / 2, p["x"] + p["w"] / 2, p["y"] + p["h"] / 2)
    return affinity.rotate(g, p.get("rot", 0), origin=(p["x"], p["y"])) if p.get("rot", 0) else g


def hole_of(p):
    """Hole centre of a drilled pad: holeDx along the pad's own x."""
    dx = p.get("holeDx", 0.0)
    a = math.radians(p.get("rot", 0))
    return (p["x"] + dx * math.cos(a), p["y"] + dx * math.sin(a))


def has_land(copper, x, y, drill):
    from shapely.geometry import Point
    return copper.buffer(1e-6).contains(Point(x, y).buffer(drill / 2 + LAND_MM, resolution=32))


def record_checks(rec, gates, files, folded, drills, rep):
    side_layer = {"top": "F_Cu", "bottom": "B_Cu"}
    other = {"top": "bottom", "bottom": "top"}
    pads = rec["pads"]
    vias = [{"x": v["x"], "y": v["y"], "drill": v["drill"]} for v in rec["vias"]]
    netless = [{"x": x, "y": y, "drill": d} for x, y, d in gates.get("netlessVias", [])]
    for side in ("top", "bottom"):
        cu = folded_layer(files, folded, side_layer[side])
        own = [p for p in pads if p["side"] == side]
        through = [p for p in pads if p["side"] == other[side] and p["through"]]
        if cu is None:
            if own or through:
                rep.fail(f"{side_layer[side]} missing, {len(own) + len(through)} pads expected on it")
            continue
        grown = cu.buffer(1e-6)
        miss_own = [f'{p["ref"]}.{p["pin"]}' for p in own if not grown.contains(pad_poly(p))]
        miss_thru = [f'{p["ref"]}.{p["pin"]}' for p in through if not has_land(cu, *hole_of(p), p["drill"])]
        n_ok = len(own) + len(through) - len(miss_own) - len(miss_thru)
        rep.note(f"{side_layer[side]} pads {n_ok} of {len(own) + len(through)} ({len(own)} own, {len(through)} through)")
        if miss_own or miss_thru:
            rep.fail(f"{side_layer[side]} lacks {len(miss_own) + len(miss_thru)} pads: {', '.join((miss_own + miss_thru)[:8])}")
    bot = folded_layer(files, folded, "B_Cu")
    drilled = [p for p in pads if p.get("drill")]
    holes = [(hole_of(p), p["drill"], f'{p["ref"]}.{p["pin"]}', p["net"]) for p in drilled]
    holes += [((v["x"], v["y"]), v["drill"], "via", v.get("net", "")) for v in rec["vias"]]
    if bot is not None:
        ring_ok = sum(1 for (x, y), d, _, _ in holes if has_land(bot, x, y, d))
        rep.note(f"drilled pads with bottom ring {ring_ok} of {len(holes)}")
        if ring_ok != len(holes):
            rep.fail(f"{len(holes) - ring_ok} drilled pads have no bottom ring")
    # drills
    want = [(x, y, d, k) for (x, y), d, k, _ in holes] + [(v["x"], v["y"], v["drill"], "via") for v in netless]
    got = drills.get("PTH", [])
    worst = 0.0
    ok = 0
    for x, y, d, k in want:
        best = min(got, key=lambda h: math.hypot(h[0] - x, h[1] - y), default=None)
        dist = math.inf if best is None else math.hypot(best[0] - x, best[1] - y)
        worst = max(worst, dist)
        if dist <= DRILL_TOL_MM and abs(best[2] - d) <= DRILL_TOL_MM:
            ok += 1
        else:
            rep.fail(f"{k} hole at ({x:.3f}, {y:.3f}) has no drill within 1 um of {d:.3f} mm (nearest {dist:.4f} mm)")
    rep.note(f"drills {ok} of {len(want)} within 1 um, worst {worst:.4f}")
    if len(got) != len(want):
        rep.fail(f"PTH holds {len(got)} hits, the record declares {len(want)}")
    rep.data["drills"] = {"matched": ok, "declared": len(want), "worst": worst}
    npth = drills.get("NPTH", [])
    nh = rec["holes"]
    n_ok = sum(1 for h in nh if any(math.hypot(a - h["x"], b - h["y"]) <= DRILL_TOL_MM and abs(c - h["drill"]) <= DRILL_TOL_MM for a, b, c in npth))
    sizes = ", ".join(sorted({"%.2f" % h["drill"] for h in nh}))
    rep.note(f"npth {n_ok} of {len(nh)} at {sizes} mm")
    if n_ok != len(nh) or len(npth) != len(nh):
        rep.fail(f"NPTH holds {len(npth)} hits, {n_ok} match the record's {len(nh)} holes")
    # pour isolation
    # The pour lives in the record (zones, M08-T12); gates.json carried it before.
    pour = next(iter(rec.get("zones") or []), None) or (gates.get("zones") or {}).get("pour")
    if pour is not None and bot is not None:
        from shapely.geometry import Point
        pieces = list(bot.geoms) if bot.geom_type == "MultiPolygon" else [bot]
        big = [g for g in pieces if g.area > POUR_PIECE_MM2]
        on_net = [h for h in holes if h[3] == pour["net"]]
        off_net = [h for h in holes if h[3] != pour["net"]]
        # A pour piece is a piece over 50 mm2 or any piece that lands a hole on the pour net: a hole
        # off the net that shares copper with one is shorted to it, whatever the piece's size.
        poured = [g for g in pieces if g.area > POUR_PIECE_MM2 or any(g.contains(Point(*h[0])) for h in on_net)]
        iso = [h for h in off_net if not any(g.intersects(Point(*h[0]).buffer(h[1] / 2)) for g in poured)]
        bonded = [h for h in on_net if any(g.contains(Point(*h[0])) for g in big)]
        rep.note(f"bottom copper pieces {len(pieces)}, over {POUR_PIECE_MM2:.0f} mm2: {', '.join('%.1f' % g.area for g in sorted(big, key=lambda g: -g.area))}")
        for g in pieces:
            nets = sorted({h[3] for h in holes if g.contains(Point(*h[0]))})
            if len(nets) > 1:
                at = [f"({h[0][0]:.2f}, {h[0][1]:.2f})" for h in holes if g.contains(Point(*h[0]))]
                rep.fail(f"B_Cu piece of {g.area:.2f} mm2 joins nets {', '.join(nets)} through holes at {', '.join(at)}")
        rep.note(f"non-{pour['net']} holes isolated {len(iso)} of {len(off_net)}")
        rep.note(f"{pour['net']} holes bonded {len(bonded)} of {len(on_net)}")
        if len(iso) != len(off_net):
            bad = [h[2] for h in off_net if h not in iso]
            rep.fail(f"{len(off_net) - len(iso)} holes off {pour['net']} touch the pour: {', '.join(bad[:8])}")
        if len(bonded) != len(on_net):
            rep.fail(f"{len(on_net) - len(bonded)} {pour['net']} holes sit off the pour")
        rep.data["pour"] = {"isolated": len(iso), "offNet": len(off_net), "bonded": len(bonded), "onNet": len(on_net)}


# ------------------------------------------------------------------ step 4
def silk_checks(fab, files, gates, rep):
    path = os.path.join(fab, "source", "silk.json")
    if not os.path.exists(path):
        return
    from direct import textpoly
    specs = json.load(open(path))

    def expected(side, mirror):
        v = set()
        for s in specs[side]:
            for pts, _ in textpoly.text_polys(s["t"], s["f"], s["wt"], s["s"], s["x"], s["y"], s["a"], s["rot"], mirror=mirror):
                for x, y in pts:
                    v.add((round(x * 1e6), round(y * 1e6)))
        return v

    def parsed(layer):
        v = set()
        for o in files[layer].objects:
            if type(o).__name__ == "Region":
                for p in o.outline:
                    v.add((round(float(p[0]) * 1e6), round(float(p[1]) * 1e6)))
        return v

    for side, layer in (("F", "F_Silkscreen"), ("B", "B_Silkscreen")):
        if layer not in files or not specs.get(side):
            continue
        want_mirror = bool(specs[side][0].get("mirror", side == "B"))
        got = parsed(layer)
        exp = expected(side, want_mirror)
        oth = expected(side, not want_mirror)
        miss, extra, shared = len(exp - got), len(got - exp), len(oth & got)
        rep.note(f"{layer} {len(got)} vertices, {miss} missing, {extra} unexpected; the {'unmirrored' if want_mirror else 'mirrored'} variant would share {shared}")
        if miss or extra:
            rep.fail(f"{layer} does not equal textpoly(mirror={want_mirror}) vertex for vertex")
        if shared >= len(got) * MIRROR_SHARE:
            rep.fail(f"{layer} is indistinguishable from its mirror image")
    if "B_Silkscreen" in files and specs.get("B"):
        (bx0, _), (bx1, _) = files["B_Silkscreen"].bounding_box(unit=_mm())
        w = gates.get("w")
        rep.note(f"B_Silkscreen ink box {bx0:.2f} to {bx1:.2f} mm, inside the {w:g} mm width")
        if bx0 < INK_MARGIN_MM or bx1 > w - INK_MARGIN_MM:
            rep.fail(f"B_Silkscreen ink box {bx0:.2f} to {bx1:.2f} mm runs off the {w:g} mm board")


def _mm():
    from gerbonara.utils import MM
    return MM


def slot_checks(files, gates, rec, rep):
    slots = rec.get("slots") or gates.get("slots") or []
    if not slots or "Edge_Cuts" not in files:
        return
    pts = []
    for o in files["Edge_Cuts"].objects:
        for attr in ("x1", "x2"):
            if hasattr(o, attr):
                pts.append((float(getattr(o, attr)), float(getattr(o, attr.replace("x", "y")))))
    for sl in slots:
        near = [p for p in pts if abs(p[1] - sl["y"]) < sl["h"] and abs(p[0] - sl["x"]) < sl["w"]]
        rep.note(f"slot {len(near)} contour points at ({sl['x']:g}, {sl['y']:g})")
        if len(near) < 8:
            rep.fail(f"slot contour at ({sl['x']:g}, {sl['y']:g}) not found in Edge_Cuts ({len(near)} points near it)")


# ------------------------------------------------------------------ step 5
def raster_compare(fab, rep):
    import numpy as np
    from PIL import Image, ImageDraw
    from scipy import ndimage
    from shapely import wkb
    from pygerber.gerberx3.api.v2 import ColorScheme, GerberFile as PGerber
    out = {}
    src_dir = os.path.join(fab, "source")
    for name in ("F_Cu", "B_Cu"):
        sp = os.path.join(src_dir, f"{name}.wkb")
        gp = layer_files(fab).get(name)
        if not os.path.exists(sp) or gp is None:
            continue
        parsed = PGerber.from_file(gp).parse()
        info = parsed.get_info()
        x0, y1 = float(info.min_x_mm), float(info.max_y_mm)
        with tempfile.TemporaryDirectory() as td:
            png = os.path.join(td, "r.png")
            parsed.render_raster(png, dpmm=DPMM, color_scheme=ColorScheme.DEFAULT_GRAYSCALE)
            img = np.array(Image.open(png).convert("L"))
        # pygerber paints copper 255 and background 0; a cleared region is not copper whatever its grey (tscircuit-pipeline.md lines 149 to 162).
        cu = img >= 200
        src = Image.new("L", (img.shape[1], img.shape[0]), 0)
        dr = ImageDraw.Draw(src)
        geom = wkb.loads(open(sp, "rb").read())
        polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
        to_px = lambda c: [((x - x0) * DPMM, (y1 - y) * DPMM) for x, y in c]  # noqa: E731
        for p in sorted(polys, key=lambda q: -q.area):
            dr.polygon(to_px(p.exterior.coords), fill=255)
            for r in p.interiors:
                dr.polygon(to_px(r.coords), fill=0)
        s = np.array(src) >= 128
        band = ndimage.binary_dilation(s, iterations=BAND_PX) & ~ndimage.binary_erosion(s, iterations=BAND_PX)
        diff = (cu != s) & ~band
        agree = float((cu & s).sum()) / max(1, int(s.sum())) * 100
        out[name] = {"outside": int(diff.sum()), "agreePct": agree}
        rep.note(f"{name} raster: {int(diff.sum())} px outside edge band; agrees on {agree:.2f} percent of source copper pixels (informational)")
        if diff.sum() != 0:
            rep.fail(f"{name} raster: {int(diff.sum())} px disagree outside the {BAND_PX} px band")
    rep.data["raster"] = out


# ------------------------------------------------------------------ step 6
def legacy_compare(zip_path, files, folded, rep):
    from gerbonara import GerberFile
    out = {}
    with tempfile.TemporaryDirectory() as td:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(td)
        old = layer_files(td)
        for name in sorted(old):
            if name == "Edge_Cuts" or name not in files:
                continue
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                g = fold(GerberFile.open(old[name]))
            new = folded_layer(files, folded, name)
            sd = new.symmetric_difference(g).area
            out[name] = sd
            rep.note(f"legacy {name:<13} symmetric difference {sd:.6f} mm2")
            if sd > SYMDIFF_MM2:
                rep.fail(f"legacy {name} symmetric difference {sd:.6f} mm2, legal 0 to {SYMDIFF_MM2}")
    rep.data["legacy"] = out


def main():
    ap = argparse.ArgumentParser(description="reparse a fab set against its BoardRecord")
    ap.add_argument("fab")
    ap.add_argument("--record", required=True)
    ap.add_argument("--legacy")
    ap.add_argument("--json")
    ap.add_argument("--no-raster", action="store_true", help="skip the pygerber raster (step 5)")
    a = ap.parse_args()
    rep = Report()
    rec = json.load(open(a.record))
    gp = os.path.join(os.path.dirname(os.path.abspath(a.record)), "gates.json")
    gates = json.load(open(gp)) if os.path.exists(gp) else {}
    files, drills, folded = parse_all(a.fab, rep)
    vector_compare(a.fab, files, folded, rep)
    record_checks(rec, gates, files, folded, drills, rep)
    silk_checks(a.fab, files, gates, rep)
    slot_checks(files, gates, rec, rep)
    if not a.no_raster:
        raster_compare(a.fab, rep)
    if a.legacy:
        legacy_compare(a.legacy, files, folded, rep)
    worst = max([v["symdiff"] for v in rep.data.get("vector", {}).values()] + list(rep.data.get("legacy", {}).values()) + [0.0])
    rep.data.update({"ok": not rep.fails, "fails": rep.fails, "lines": rep.lines, "worstSymdiff": worst})
    if a.json:
        with open(a.json, "w") as f:
            json.dump(rep.data, f, indent=1, sort_keys=True)
    if rep.fails:
        print(f"\nreparse: {len(rep.fails)} failure(s)")
        sys.exit(1)
    print(f"\nreparse OK: worst symmetric difference {worst:.6f} mm2")


if __name__ == "__main__":
    main()
