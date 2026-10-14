"""Build the SHEET nesting page.

The internals are being printed: bars, lugs, links, rods, caps, pins, knobs,
cranks. What is left is everything that wants to be a flat sheet part anyway, and
it is exactly the parts whose whole job is to be flat: the box, the deck, the two
face layers, the slider, and the servo mounts.

This pulls their real outlines out of the DXFs render.py already writes, embeds
them as polygons, and hands them to a page that nests them on a sheet you size
yourself and writes DXF back out.
"""
import json, os
import ezdxf

OUT = os.path.join(os.path.dirname(__file__), "..", "out")

# quantity for one machine. Everything not here is being printed.
SHEET = [
    ("base",          1, "base plate"),
    ("wallx",         2, "X wall"),
    ("wally",         2, "Y wall"),
    ("deck",          1, "guide deck"),
    ("face",          1, "face, lower layer"),
    ("face2_circle",  1, "face, upper layer"),
    ("latch",         1, "slider plate"),
    ("rail",          2, "slider rail"),
    ("svbracket_row", 1, "row servo bracket"),
    ("svbracket_col", 1, "column servo bracket"),
    ("latchbracket",  1, "slider servo shelf"),
    ("latchrib",      2, "slider servo rib"),
    ("coupon",        1, "fit coupon, cut this first"),
]

def rings(name):
    """Every closed outline in a part's DXF.

    OpenSCAD writes DXF as loose LINE segments, not polylines, so they have to be
    stitched: index every endpoint, then walk from one segment to the next until
    the loop closes. Endpoints are keyed on a rounded coordinate because the
    writer emits them at full float precision and the same corner appears twice.
    """
    doc = ezdxf.readfile(os.path.join(OUT, "dxf", name + ".dxf"))
    K = lambda p: (round(p[0], 3), round(p[1], 3))
    segs, adj = [], {}
    for e in doc.modelspace():
        if e.dxftype() != "LINE":
            continue
        a, b = K(e.dxf.start), K(e.dxf.end)
        if a == b:
            continue
        i = len(segs); segs.append((a, b))
        adj.setdefault(a, []).append(i); adj.setdefault(b, []).append(i)
    used = [False] * len(segs)
    out = []
    for i0 in range(len(segs)):
        if used[i0]:
            continue
        used[i0] = True
        start, cur = segs[i0]
        loop = [start, cur]
        while cur != start:
            nxt = None
            for j in adj.get(cur, ()):
                if used[j]:
                    continue
                a, b = segs[j]
                nxt = (j, b if a == cur else a); break
            if nxt is None:
                break                      # open chain, not a cuttable outline
            used[nxt[0]] = True
            cur = nxt[1]
            if cur != start:
                loop.append(cur)
        if cur == start and len(loop) >= 3:
            out.append([[p[0], p[1]] for p in loop])
    return out

def main():
    parts = []
    for name, qty, label in SHEET:
        rs = rings(name)
        xs = [p[0] for r in rs for p in r]
        ys = [p[1] for r in rs for p in r]
        x0, y0 = min(xs), min(ys)
        # normalise to the origin so nesting only has to place a corner
        rs = [[[round(p[0]-x0, 4), round(p[1]-y0, 4)] for p in r] for r in rs]
        parts.append({"id": name, "label": label, "qty": qty,
                      "w": round(max(xs)-x0, 2), "h": round(max(ys)-y0, 2),
                      "rings": rs, "n": len(rs)})
    tpl = open(os.path.join(os.path.dirname(__file__), "sheet_template.html")).read()
    html = tpl.replace("/*PARTS*/", json.dumps(parts))
    path = os.path.join(OUT, "ogee16-sheets.html")
    open(path, "w").write(html)
    tot = sum(p["qty"] for p in parts)
    print(f"ogee16-sheets.html  {len(html)/1024:.0f} KB   "
          f"{len(parts)} distinct, {tot} pieces, "
          f"{sum(p['n'] for p in parts)} outlines")
    print("unsubstituted:", "/*PARTS*/" in html)
    for p in parts:
        print(f"   {p['id']:16s} x{p['qty']:<2d} {p['w']:7.1f} x {p['h']:6.1f}  "
              f"{p['n']:3d} outlines")

if __name__ == "__main__":
    main()
