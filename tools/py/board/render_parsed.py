#!/usr/bin/env python3
"""render_parsed.py, draw a fab set from its parsed gerber objects only
(M08-T07 step 8), ported from SHUNT R1 render_fab.py (lineage
board.render-parsed/shunt-r1).

    uv run --project tools/py tools/py/board/render_parsed.py <fab dir> --out <dir>

Writes gerber-front.png and gerber-back.png. Everything comes out of
gerbonara and nothing out of the generator, so this is a picture of what a
fab would image. Every layer honours polarity, so a cleared pour shows its
clears. Back layers are drawn in board coordinates, as the fab images them:
the back silk reads backwards on purpose, since its glyphs are mirrored to
read once the board is turned over.
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PPMM = 10   # render_fab.py line 18
# SHUNT render_fab.py line 20: mask, copper, gold (mask openings), silk, hole, background
MASK, COPPER, GOLD, SILK, HOLE, BG = ("#4E324E", "#7A4F72", "#E8C268", "#FFFFFF", "#141014", "#efe9db")


def main():
    from gerbonara import ExcellonFile, GerberFile
    from gerbonara.utils import MM
    from reparse import drill_files, layer_files
    ap = argparse.ArgumentParser(description="draw a fab set from its parsed gerbers")
    ap.add_argument("fab")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    layers = layer_files(a.fab)
    edge = GerberFile.open(layers["Edge_Cuts"])
    (x0, y0), (x1, y1) = edge.bounding_box(unit=MM)
    W, H = x1 - x0, y1 - y0

    def px(x, y):
        return ((x - x0) * PPMM, (y1 - y) * PPMM)

    def paint(target, path, fill_dark, fill_clear):
        g = GerberFile.open(path)
        n = 0
        for o in g.objects:
            kind = type(o).__name__
            fill = fill_dark if getattr(o, "polarity_dark", True) else fill_clear
            if kind == "Region":
                pts = [px(float(p[0]), float(p[1])) for p in o.outline]
                if len(pts) > 2:
                    target.polygon(pts, fill=fill)
                    n += 1
            elif kind == "Flash":
                ap_ = o.aperture
                x, y = float(o.x), float(o.y)
                if type(ap_).__name__ == "CircleAperture":
                    r = float(ap_.diameter) / 2
                    target.ellipse([px(x - r, y + r), px(x + r, y - r)], fill=fill)
                else:
                    w = float(getattr(ap_, "w", getattr(ap_, "diameter", 1)))
                    h = float(getattr(ap_, "h", w))
                    target.rectangle([px(x - w / 2, y + h / 2), px(x + w / 2, y - h / 2)], fill=fill)
                n += 1
            elif kind == "Line":
                wid = float(getattr(o.aperture, "diameter", 0.1)) * PPMM
                target.line([px(float(o.x1), float(o.y1)), px(float(o.x2), float(o.y2))], fill=fill, width=max(1, int(wid)))
                n += 1
        return n

    os.makedirs(a.out, exist_ok=True)
    for side, name in (("F", "gerber-front.png"), ("B", "gerber-back.png")):
        size = (int(round(W * PPMM)), int(round(H * PPMM)))
        img = Image.new("RGB", size, BG)
        dr = ImageDraw.Draw(img)
        dr.rectangle([px(x0, y1), px(x1, y0)], fill=MASK)
        counts = {}
        for layer, colour in ((f"{side}_Cu", COPPER), (f"{side}_Mask", GOLD), (f"{side}_Silkscreen", SILK)):
            if layer not in layers:
                continue
            m = Image.new("L", size, 0)
            counts[layer] = paint(ImageDraw.Draw(m), layers[layer], 255, 0)
            img.paste(Image.new("RGB", size, colour), (0, 0), m)
        for kind, path in drill_files(a.fab).items():
            e = ExcellonFile.open(path)
            for o in e.objects:
                if getattr(o, "tool", None) is None:
                    continue
                r = float(o.tool.diameter) / 2
                dr.ellipse([px(float(o.x) - r, float(o.y) + r), px(float(o.x) + r, float(o.y) - r)], fill=HOLE)
        counts["Edge_Cuts"] = paint(dr, layers["Edge_Cuts"], "#000000", "#000000")
        img.save(os.path.join(a.out, name))
        print("  %s  %s" % (name, "  ".join("%s %d" % kv for kv in counts.items())))


if __name__ == "__main__":
    main()
