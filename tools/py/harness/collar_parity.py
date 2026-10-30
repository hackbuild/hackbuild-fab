#!/usr/bin/env python3
"""
collar_parity.py: COLLAR v5 against @hackbuild/inlay in one Chromium (M03-T09).

    uv run --project tools/py --extra bench tools/py/harness/collar_parity.py \\
        designs/collar/legacy/collar.html designs/collar/test/parity.html [--res 512] [--out DIR]

1. Checks every input against its pin: the legacy page against
   designs/collar/legacy/sha256.txt; the two fonts, the brand mark svg and
   both COLLAR 3MF files against their lineage.json rows.
2. Bundles designs/collar/test/parity.entry.ts with tsdown 0.23.0 as one
   IIFE next to parity.html.
3. Opens both pages from file:// in one browser context. Every http(s)
   request goes through one route: the Google Fonts stylesheet gets an
   @font-face sheet for the two local TTFs, those TTF urls get the local
   bytes, every other font request is aborted, and anything else is
   aborted and counted. A counted request fails the run (D-129 posture).
4. Legacy: waits for the page to read ready and for document.fonts.load on
   Permanent Marker, runs applyPreset('hack.build coin', true), waits for
   the mark image, reads buildFace('front', res) and buildFace('back', res).
5. Package: COLLAR_PARITY.run({res, mark}) composes the same preset with
   the inlay package on the bench-core canvas surface.
6. Compares cell by cell. On any difference writes both grids and a diff
   PNG to the output folder and exits 1 (D-153).
7. Checks the legacy back grid against the M03-T05 capture
   (packages/inlay/test/fixtures/collar-512.legacy.json.gz, faces.back.post),
   which was made with fonts from Google Fonts: equal means the local TTF
   paints what that capture painted.
8. Prints the package per-slot volumes beside the print card inside the
   example 3MF (gate: equal at two decimals in cm3) and beside the Sep 19
   reeded coin card (informational, never fails).

Driver: Playwright 1.63.0 (the bench extra). The browser is HBF_CHROMIUM
when set, else system Chrome on macOS, else Playwright's own Chromium; the
flags are the seed smoke_bench.py flags.

exit 0 parity and volumes hold; 1 a difference, a volume miss, a counted
network request or a page error; 2 a missing input or a pin mismatch.
"""
import argparse
import base64
import hashlib
import io
import json
import os
import re
import struct
import subprocess
import sys
import zipfile
import zlib
import gzip

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"]
CSS_URL = re.compile(r"^https://fonts\.googleapis\.com/css2\?")
FONT_BASE = "https://fonts.gstatic.com/hbf-local/"
FONTS = {"Permanent Marker": "font.permanent-marker/collar-coin", "Special Elite": "font.special-elite/collar-coin"}
MARK_ROW = "brand.mark/seed-svg"
CARD_ROW = "collar.export/harvest"
SEP19_ROW = "collar.owner-export/download"
# Per-slot volume tolerance against COLLAR's own estimateVolume in the same run, mm3 (the M00 parity bound).
VOLUME_TOL_MM3 = 1e-3
T05_CAPTURE = os.path.join(ROOT, "packages", "inlay", "test", "fixtures", "collar-512.legacy.json.gz")


class Refused(Exception):
    pass


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def pinned(row_id):
    rows = json.load(open(os.path.join(ROOT, "lineage.json")))
    row = next((r for r in rows if r["id"] == row_id), None)
    if row is None:
        raise Refused("lineage.json has no row %s" % row_id)
    if not os.path.exists(row["source"]):
        raise Refused("%s source missing: %s" % (row_id, row["source"]))
    data = open(row["source"], "rb").read()
    if sha256(data) != row["sha256"]:
        raise Refused("%s sha256 %s, lineage says %s" % (row_id, sha256(data), row["sha256"]))
    return data


def mark_paths(svg):
    """The two paths of the seed mark: viewBox, then translate and d per path, arc first."""
    text = svg.decode("utf8")
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', text).group(1).split()]
    paths = re.findall(r'<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*\bd="([^"]+)"', text)
    if len(paths) != 2:
        raise Refused("the mark svg holds %d translated paths, expected the arc and the wrench" % len(paths))
    p = [{"at": [float(x), float(y)], "d": d} for x, y, d in paths]
    return {"viewBox": vb, "arc": p[0], "wrench": p[1]}


def card_volumes(three_mf):
    """slot -> cm3 from Metadata/collar_print_card.txt inside a COLLAR 3MF."""
    with zipfile.ZipFile(io.BytesIO(three_mf)) as z:
        card = z.read("Metadata/collar_print_card.txt").decode("utf8")
    vols = {}
    for m in re.finditer(r"^\s*slot (\d+)\s+#\w+.*?\s([\d.]+) cm3", card, re.M):
        vols[m.group(1)] = float(m.group(2))
    if not vols:
        raise Refused("no slot volumes in the print card")
    return vols


def png_diff(a, b, res, path):
    """Grey where equal and painted, white where equal and empty, pink where the grids differ; row 0 at the bottom."""
    rows = []
    for j in range(res - 1, -1, -1):
        row = bytearray([0])
        for i in range(res):
            p = j * res + i
            if a[p] != b[p]:
                row += b"\xfe\x03\x86"
            elif a[p]:
                row += b"\x80\x80\x80"
            else:
                row += b"\xff\xff\xff"
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)

    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", res, res, 8, 2, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", raw) + chunk(b"IEND", b""))


def bundle(parity_html):
    entry = os.path.join(os.path.dirname(parity_html), "parity.entry.ts")
    out = os.path.join(os.path.dirname(parity_html), "dist")
    cmd = ["npx", "--no-install", "tsdown", entry, "--no-config", "--format", "iife", "--platform", "browser",
           "--target", "es2022", "--out-dir", out, "--logLevel", "error", "--no-fail-on-warn"]
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    js = os.path.join(out, "parity.entry.iife.js")
    if r.returncode != 0 or not os.path.exists(js):
        raise Refused("tsdown failed: %s" % (r.stderr or r.stdout).strip()[-2000:])
    return js


LEGACY_READ = """async (res) => {
  const faces = await document.fonts.load('16px "Permanent Marker"');
  if (faces.length === 0) return { error: 'Permanent Marker has no face' };
  applyPreset('hack.build coin', true);
  const img = ST.faces.front[0].img;
  if (!img.complete || !img.naturalWidth) await img.decode();
  const b64 = (a) => { let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };
  const F = buildFace('front', res), B = buildFace('back', res);
  if (F.holes || B.holes) return { error: 'the preset has a through cut' };
  const vol = buildMesh().volume;
  return { front: b64(F.art), back: b64(B.art), rArt: R_ART(), volumes: vol, res: ST.res };
}"""


def run(a):
    legacy = os.path.abspath(a.legacy)
    parity = os.path.abspath(a.parity)
    want = open(os.path.join(ROOT, "designs", "collar", "legacy", "sha256.txt")).read().split()[0]
    if sha256(open(legacy, "rb").read()) != want:
        raise Refused("%s does not match designs/collar/legacy/sha256.txt" % legacy)
    fonts = {fam: pinned(row) for fam, row in FONTS.items()}
    mark = mark_paths(pinned(MARK_ROW))
    legacy_card = card_volumes(pinned(CARD_ROW))
    sep19_card = card_volumes(pinned(SEP19_ROW))
    bundle(parity)

    from playwright.sync_api import sync_playwright

    files = {fam: FONT_BASE + fam.replace(" ", "") + "-Regular.ttf" for fam in fonts}
    sheet = "".join("@font-face{font-family:'%s';font-style:normal;font-weight:400;src:url(%s) format('truetype');}\n" % (fam, url)
                    for fam, url in files.items())
    by_url = {url: fonts[fam] for fam, url in files.items()}
    served, aborted_fonts, counted, errors = [], [], [], []

    def route(r):
        req = r.request
        url = req.url
        if CSS_URL.match(url):
            served.append(url)
            return r.fulfill(status=200, content_type="text/css", body=sheet)
        if url in by_url:
            served.append(url)
            return r.fulfill(status=200, content_type="font/ttf", body=by_url[url])
        if req.resource_type == "font" or url.startswith("https://fonts.gstatic.com/"):
            aborted_fonts.append(url)
            return r.abort()
        counted.append(url)
        return r.abort()

    exe = os.environ.get("HBF_CHROMIUM") or (MAC_CHROME if os.path.exists(MAC_CHROME) else None)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=FLAGS, **({"executable_path": exe} if exe else {}))
        ctx = browser.new_context()
        ctx.route(re.compile(r"^https?://"), route)
        pages = []

        def page(url):
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append("%s: %s" % (os.path.basename(url), e)))
            pg.goto("file://" + url)
            pages.append(pg)
            return pg

        lg = page(legacy)
        lg.wait_for_function("/ready/.test(document.querySelector('#status')?.textContent ?? '')", timeout=30000)
        L = lg.evaluate(LEGACY_READ, a.res)
        if "error" in L:
            raise Refused("legacy page: %s" % L["error"])
        pk = page(parity)
        try:
            pk.wait_for_function("typeof COLLAR_PARITY !== 'undefined'", timeout=30000)
        except Exception:
            raise Refused("COLLAR_PARITY never appeared in %s; page errors: %s" % (parity, "; ".join(errors) or "none"))
        P = pk.evaluate("(x) => COLLAR_PARITY.run(x)", {"res": a.res, "mark": mark})
        version = browser.version
        browser.close()

    print("driver: playwright 1.63.0, chromium %s, flags %s" % (version, " ".join(FLAGS)))
    print("network: %d served by the route, %d other font requests aborted, %d counted" % (len(served), len(aborted_fonts), len(counted)))
    fails = []
    if counted:
        fails.append("requests not served by a route: %s" % ", ".join(sorted(set(counted))))
    if errors:
        fails.append("page errors: %s" % "; ".join(errors))

    n = a.res * a.res
    diffs = {}
    for face in ("front", "back"):
        lg_grid = base64.b64decode(L[face])
        pk_grid = base64.b64decode(P[face])
        if len(lg_grid) != n or len(pk_grid) != n:
            fails.append("%s grid sizes %d and %d, expected %d" % (face, len(lg_grid), len(pk_grid), n))
            continue
        diffs[face] = sum(1 for x, y in zip(lg_grid, pk_grid) if x != y)
        if diffs[face]:
            os.makedirs(a.out, exist_ok=True)
            open(os.path.join(a.out, "%s-legacy.labels.bin" % face), "wb").write(lg_grid)
            open(os.path.join(a.out, "%s-package.labels.bin" % face), "wb").write(pk_grid)
            png_diff(lg_grid, pk_grid, a.res, os.path.join(a.out, "%s-diff.png" % face))
    print("front %s differing cells, back %s differing cells" % (diffs.get("front", "n/a"), diffs.get("back", "n/a")))
    if any(diffs.values()):
        fails.append("grids differ; both grids and a diff png are in %s" % a.out)
    print("art radius: legacy %.6f mm, package %.6f mm (computed)" % (L["rArt"], P["rArt"]))
    print("despeckle.factor %s from profile (%s)" % (P["despeckle"]["value"], P["despeckle"]["tier"]))

    if a.res == 512:
        t05 = json.loads(gzip.decompress(open(T05_CAPTURE, "rb").read()))
        same = base64.b64decode(t05["faces"]["back"]["post"]) == base64.b64decode(L["back"])
        print("legacy back grid equals the M03-T05 capture (%s): %s" % (t05["source"]["driver"], "yes" if same else "no"))
        if not same:
            fails.append("the local Permanent Marker paints a back face other than the M03-T05 capture")

    print("per-slot volume, cm3: package (computed) | COLLAR v5 buildMesh in this run (computed, gate) | example 3MF card | Sep 19 card (both informational)")
    v5 = {k: v for k, v in L["volumes"].items()}
    for s in sorted(set(v5) | set(P["volumes"]), key=int):
        mine = P["volumes"].get(s, 0.0)
        ref = v5.get(s)
        ok = ref is not None and abs(mine - ref) <= VOLUME_TOL_MM3 and round(mine / 1000.0, 2) == round(ref / 1000.0, 2)
        cell = lambda d: "%.2f" % d[s] if s in d else "none"
        print("  slot %s  %.4f  %s  %s  %s  %s" % (s, mine / 1000.0, "%.4f" % (ref / 1000.0) if ref is not None else "none",
                                                cell(legacy_card), cell(sep19_card), "ok" if ok else "MISS"))
        if not ok:
            fails.append("slot %s volume %.6f mm3, COLLAR v5 in this run %s mm3 (tolerance %g mm3)" % (s, mine, ref, VOLUME_TOL_MM3))

    for f in fails:
        print("FAIL", f)
    return 1 if fails else 0


def main(argv):
    ap = argparse.ArgumentParser(description="COLLAR v5 browser parity against @hackbuild/inlay")
    ap.add_argument("legacy")
    ap.add_argument("parity")
    ap.add_argument("--res", type=int, default=512)
    ap.add_argument("--out", default=os.path.join(ROOT, ".hbf", "harness", "collar"))
    a = ap.parse_args(argv)
    try:
        import playwright  # noqa: F401
    except ImportError:
        print("playwright is not installed; run with uv run --project tools/py --extra bench", file=sys.stderr)
        return 2
    try:
        return run(a)
    except Refused as e:
        print("refused: %s" % e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
