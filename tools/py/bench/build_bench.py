#!/usr/bin/env python3
"""
build_bench.py: assemble a single file bench from parts.

    python3 build_bench.py <parts_dir> <out.html> [--vendor node_modules_dir] [--fonts]

parts_dir holds part1.html (markup + CSS, ends with the CDN script tags), then any
number of .js parts assembled in this order: the skill kernels (rastermesh.js,
orca3mf.js from ../assets), then part2.js, part3.js ... in name order. The output is
one HTML file that runs from file:// with no server.

--vendor DIR    inline three.min.js and jszip.min.js from a node_modules dir instead of
                loading them from cdnjs (offline determinism; what COAMING shipped).
                npm install three@0.128.0 jszip@3.10.1 first.
--fonts         embed the four brand fonts as base64 @font-face from @fontsource
                packages in the vendor dir (npm install @fontsource/permanent-marker
                @fontsource/special-elite @fontsource/vt323 @fontsource/ibm-plex-mono).
                Without this the page uses the Google Fonts link and needs the network.

Ship the built file, keep the parts as the source (zip them alongside, like *-src.zip).
"""
import os, sys, re, glob, base64, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))

FONTS = [  # (family, fontsource package, file glob, weight)
    ("Permanent Marker", "permanent-marker", "files/permanent-marker-latin-400-normal.woff2", 400),
    ("Special Elite", "special-elite", "files/special-elite-latin-400-normal.woff2", 400),
    ("VT323", "vt323", "files/vt323-latin-400-normal.woff2", 400),
    ("IBM Plex Mono", "ibm-plex-mono", "files/ibm-plex-mono-latin-400-normal.woff2", 400),
    ("IBM Plex Mono", "ibm-plex-mono", "files/ibm-plex-mono-latin-600-normal.woff2", 600),
]


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("parts")
    ap.add_argument("out")
    ap.add_argument("--vendor")
    ap.add_argument("--fonts", action="store_true")
    a = ap.parse_args(argv)

    html = open(os.path.join(a.parts, "part1.html"), encoding="utf-8").read()
    if a.vendor:
        for lib, path in [("three.min.js", "three/build/three.min.js"), ("jszip.min.js", "jszip/dist/jszip.min.js")]:
            src = open(os.path.join(a.vendor, path), encoding="utf-8").read()
            html, n = re.subn(r'<script src="https://cdnjs[^"]*' + re.escape(lib) + r'"></script>',
                              lambda m: "<script>/* inlined " + lib + " */\n" + src + "\n</script>", html)
            if not n:
                print("warning: no CDN tag found for", lib)
    if a.fonts:
        if not a.vendor:
            sys.exit("--fonts needs --vendor")
        css = []
        for fam, pkg, rel, w in FONTS:
            p = os.path.join(a.vendor, "@fontsource", pkg, rel)
            if not os.path.exists(p):
                print("warning: missing", p)
                continue
            b64 = base64.b64encode(open(p, "rb").read()).decode()
            css.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:block;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, w, b64))
        html = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>', "", html)
        html = re.sub(r'<link rel="preconnect"[^>]*>', "", html)
        html = html.replace("<style>", "<style>\n" + "\n".join(css) + "\n", 1)

    scripts = [os.path.join(ASSETS, "rastermesh.js"), os.path.join(ASSETS, "orca3mf.js")]
    scripts += sorted(glob.glob(os.path.join(a.parts, "part*.js")))
    body = []
    for s in scripts:
        body.append("<script>/* %s */\n%s\n</script>" % (os.path.basename(s), open(s, encoding="utf-8").read()))
    out = html + "\n" + "\n".join(body) + "\n</body>\n</html>\n"
    open(a.out, "w", encoding="utf-8").write(out)
    print("wrote", a.out, len(out) // 1024, "KB from", len(scripts), "scripts")


if __name__ == "__main__":
    main(sys.argv[1:])
