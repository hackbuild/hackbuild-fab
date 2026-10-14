#!/usr/bin/env python3
"""build_bench.py: assemble the PIP bench into one HTML file.

Reads a bench directory and writes a single self contained page.

  build_bench.py bench out/pip.html --vendor node_modules --fonts
  build_bench.py bench out/pip-cdn.html

Assembly order, top to bottom:

  1. bench/part1.html            the shell: head, style, markup, CDN script tags
  2. tools/rastermesh.js         raster kernel, lives next to this script
  3. tools/orca3mf.js            3MF writer, lives next to this script
  4. bench/partNN-*.js           numbered kernel parts, in numeric order
  5. bench/part2.js              state, commit model, build pipeline, exports
  6. bench/part3.js              viewer and UI
  7. </body></html>

Every JS file goes in as an inline <script> block labelled with its filename, so
a stack trace in the browser still tells you which source it came from.

--vendor DIR replaces the cdnjs <script src> tags in part1.html with the library
source read out of DIR, which is normally node_modules. --fonts drops the Google
Fonts <link> tags and writes @font-face rules with base64 woff2 payloads from the
@fontsource packages instead. With both flags the page opens from file:// with
the network off. Without them you get the CDN linked variant, which is smaller
and easier to diff.
"""

import argparse
import base64
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Kernel scripts that ship with the builder rather than with the bench. They are
# emitted ahead of the numbered parts because part2 and part3 call into both.
KERNEL = ["rastermesh.js", "orca3mf.js"]

# cdnjs library name -> (node_modules package, subdirectory holding the build)
VENDOR = {
    "three.js": ("three", "build"),
    "jszip": ("jszip", "dist"),
}

# family, weight, @fontsource package, woff2 subset. Order is the order the
# rules land in the stylesheet.
FONTS = [
    ("Permanent Marker", 400, "@fontsource/permanent-marker", "latin"),
    ("Special Elite", 400, "@fontsource/special-elite", "latin"),
    ("VT323", 400, "@fontsource/vt323", "latin"),
    ("IBM Plex Mono", 400, "@fontsource/ibm-plex-mono", "latin"),
    ("IBM Plex Mono", 600, "@fontsource/ibm-plex-mono", "latin"),
]

CDN_TAG = re.compile(
    r'<script src="https://cdnjs\.cloudflare\.com/ajax/libs/'
    r'([^/"]+)/([^/"]+)/([^"]+)"></script>'
)
# Matches both the preconnect hint and the stylesheet link.
FONT_LINK = re.compile(r'<link[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*>')


def die(msg):
    print("build_bench: " + msg, file=sys.stderr)
    sys.exit(1)


def warn(msg):
    print("build_bench: warning: " + msg, file=sys.stderr)


def read(path):
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        die("missing " + str(path))


def block(label, source):
    """One inline script block. The trailing newline is deliberate: it is what
    separates this block from the next one."""
    return "<script>/* " + label + " */\n" + source + "\n</script>\n"


def part_files(bench):
    """partNN-*.js in numeric order, then part2.js and part3.js."""
    numbered = []
    for p in bench.glob("part[0-9]*-*.js"):
        m = re.match(r"part(\d+)-", p.name)
        if m:
            numbered.append((int(m.group(1)), p.name, p))
    numbered.sort(key=lambda t: (t[0], t[1]))
    files = [p for _, _, p in numbered]
    for name in ("part2.js", "part3.js"):
        p = bench / name
        if not p.exists():
            die("missing " + str(p))
        files.append(p)
    return files


def pkg_version(root, package):
    meta = root / package / "package.json"
    if not meta.exists():
        return None
    try:
        return json.loads(meta.read_text(encoding="utf-8")).get("version")
    except ValueError:
        return None


def inline_vendor(html, modules):
    """Swap each cdnjs <script src> for the library source from node_modules."""
    root = Path(modules)
    if not root.is_dir():
        die("no such directory: " + str(root) + " (run npm install first)")

    def sub(m):
        lib, version, filename = m.group(1), m.group(2), m.group(3)
        if lib not in VENDOR:
            die("no node_modules mapping for cdnjs library " + lib)
        package, subdir = VENDOR[lib]
        path = root / package / subdir / filename
        if not path.exists():
            die("missing " + str(path) + " (run npm install first)")
        have = pkg_version(root, package)
        # cdnjs writes three as r128 and jszip as 3.10.1, so match either the
        # whole version or one dotted component of it.
        want = version.lstrip("r")
        if have and want and want != have and want not in have.split("."):
            warn(
                package + " is " + have + " but part1.html links " + version
                + ", the built page will not match the reference byte for byte"
            )
        return block("inlined " + filename, read(path)).rstrip("\n")

    html, n = CDN_TAG.subn(sub, html)
    if n == 0:
        warn("--vendor given but part1.html has no cdnjs script tags")
    return html


def font_face(family, weight, package, subset, modules):
    slug = package.split("/")[-1]
    path = Path(modules) / package / "files" / (
        slug + "-" + subset + "-" + str(weight) + "-normal.woff2"
    )
    if not path.exists():
        die("missing " + str(path) + " (run npm install first)")
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    return (
        "@font-face{font-family:'" + family + "';font-style:normal;font-weight:"
        + str(weight) + ";font-display:block;src:url(data:font/woff2;base64,"
        + b64 + ") format('woff2')}"
    )


def inline_fonts(html, modules):
    """Drop the Google Fonts links, open the stylesheet with @font-face rules."""
    if not Path(modules).is_dir():
        die("no such directory: " + str(modules) + " (run npm install first)")
    html = FONT_LINK.sub("", html)
    rules = "".join(
        font_face(family, weight, package, subset, modules) + "\n"
        for family, weight, package, subset in FONTS
    )
    if "<style>\n" not in html:
        die("part1.html has no <style> block to put the @font-face rules in")
    return html.replace("<style>\n", "<style>\n" + rules + "\n", 1)


def main():
    ap = argparse.ArgumentParser(description="assemble the PIP bench into one HTML file")
    ap.add_argument("bench", help="directory holding part1.html, partNN-*.js, part2.js, part3.js")
    ap.add_argument("out", help="HTML file to write")
    ap.add_argument("--vendor", metavar="DIR", help="inline the CDN libraries from DIR, normally node_modules")
    ap.add_argument("--fonts", action="store_true", help="inline the fonts as base64 woff2 from @fontsource")
    args = ap.parse_args()

    bench = Path(args.bench)
    if not bench.is_dir():
        die("no such directory: " + str(bench))

    html = read(bench / "part1.html")
    if args.vendor:
        html = inline_vendor(html, args.vendor)
    if args.fonts:
        html = inline_fonts(html, args.vendor or "node_modules")

    blocks = [block(name, read(HERE / name)) for name in KERNEL]
    for path in part_files(bench):
        blocks.append(block(path.name, read(path)))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html + "\n" + "".join(blocks) + "</body>\n</html>\n", encoding="utf-8")
    print("build_bench: " + str(out) + " " + str(out.stat().st_size) + " bytes, "
          + str(len(blocks)) + " script blocks")


if __name__ == "__main__":
    main()
