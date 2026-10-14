"""IBM Plex Mono glyph outlines as the KEYWAY family draws them (M05-T14).

Run from the repo root:

    uv run --project tools/py tools/py/copper/dump_glyphs.py > packages/copper/test/fixtures/plex-glyphs.json

For each shipped woff2 in reference/copper/_inputs/ and every character
the family's boards print (outlined labels, titles, the wordmark), this
writes the SVG path svgpath.py's _Pen produces through fontTools and the
advance width, plus the font's unitsPerEm and OS/2 sCapHeight. The
TypeScript reader (packages/copper/src/vinyl/font.ts) must give the same
strings, byte for byte (packages/copper/test/font.test.ts).
"""
import json
import os
import sys

sys.dont_write_bytecode = True
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "reference", "copper", "keyway", "legacy"))
import svgpath  # noqa: E402
from fontTools.pens.transformPen import TransformPen  # noqa: E402

CHARS = "".join(chr(c) for c in range(0x20, 0x7F))


def main():
    out = {}
    for w in ("400", "600", "700"):
        f = svgpath._font(os.path.join(ROOT, "reference", "copper", "_inputs", "ibm-plex-mono-latin-%s-normal.woff2" % w))
        gs = f.getGlyphSet()
        cmap = f.getBestCmap()
        glyphs = {}
        for ch in CHARS:
            gn = cmap.get(ord(ch))
            if gn is None:
                glyphs[ch] = None
                continue
            p = svgpath._Pen()
            gs[gn].draw(TransformPen(p, (1, 0, 0, 1, 0, 0)))
            glyphs[ch] = [" ".join(p.d), gs[gn].width]
        out[w] = dict(unitsPerEm=f["head"].unitsPerEm, capHeight=f["OS/2"].sCapHeight, glyphs=glyphs)
    json.dump(dict(note="Plex Mono glyph paths through svgpath.py _Pen and fontTools 4.66.1, written by tools/py/copper/dump_glyphs.py. Do not edit.", fonts=out), sys.stdout, indent=1)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
