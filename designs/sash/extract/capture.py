"""Capture the inputs and outputs of SASH runCheck as fixtures (M02-T10).

Run from the repo root:

    uv run --project tools/py --extra bench python designs/sash/extract/capture.py [--out DIR] [--only SLUG]

The bench `fab-knowledge:originals/sash/files/sash.html` (lineage
sash.bench/r2, read through tools/py/hbf_archives.py) is never edited. A copy is
written to a temporary directory with one line added before the call
`MODEL.check = runCheck(G, front, wall, slideGrids);` that keeps the call's
inputs on MODEL. The bench's part2 block equals `src/part2.js` of the source
zip after trailing whitespace (knowledge/designs/sash.md section 1), so the
patched copy is the source with that one line, already baked.

The cases are read from `sweep.py` inside `originals/sash/files/sash-src.zip`
(its `cases` list, 21 entries) plus the battery preset as it loads, so the
list is never typed here. Each case is driven exactly as `sweep.py` drives
it: `ST = BENCH.presets.battery.make(); ST.sim.k=[0,0]; <case js>
UI.refreshAll(); commit();`, then wait until the model settles.

Each fixture holds the runCheck inputs (front grid frame, wall raster, per
lane N, p, Ls, Ws, slideY, dir, xLeft(k) at every half step and the slide
raster), and the bench's own `BENCH.check().lanes`. Rasters are run-length
encoded as a flat list of value, count pairs. The battery preset fixture
also carries the bench's runCheck on its wall raster shifted by 1 to 4 cells
toward the slide body (lane 0 `dir`), so the negative fixture the test
builds has an oracle in the original code.

Driver: Playwright 1.63.0 (the bench extra). The browser is HBF_CHROMIUM
when set, else system Chrome on macOS, else Playwright's own Chromium; the
flags are the ones `sweep.py` launches with.
"""

import argparse
import ast
import hashlib
import json
import os
import re
import sys
import tempfile
import time
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "py"))
from hbf_archives import local_source  # noqa: E402

# Each original and the lineage row whose sha256 it must have.
ORIGINALS = {
    "sash.html": "fab-knowledge:originals/sash/files/sash.html",
    "sash-src.zip": "fab-knowledge:originals/sash/files/sash-src.zip",
}
ROWS = {"sash.html": "sash.bench/r2", "sash-src.zip": "sash.run-check/bench-src-zip"}
ANCHOR = "  MODEL.check = runCheck(G, front, wall, slideGrids);\n"
PATCH = "  MODEL.capture = { G, front, wall, slideGrids };\n"
SETTLED = "BENCH.model().parts && !BENCH.model().dirty && !BENCH.model().building"
NEGATIVE_SHIFTS = [1, 2, 3, 4]
FLAGS = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CAPTURE_JS = """() => {
  const c = BENCH.model().capture, G = c.G, f = c.front;
  const rle = a => { const out = []; let v = a[0], n = 0;
    for (let i = 0; i < a.length; i++) { if (a[i] === v) n++; else { out.push(v, n); v = a[i]; n = 1; } }
    out.push(v, n); return out; };
  const lanes = G.lanes.map(g => {
    const sg = c.slideGrids['slide' + g.i], ks = [];
    for (let k = 0; k <= g.N - 1; k += 0.5) ks.push([k, g.xLeft(k)]);
    return { i: g.i, N: g.N, p: g.p, Ls: g.Ls, Ws: g.Ws, slideY: g.slideY, dir: g.dir, xLeft: ks,
      slide: { W: sg.W, H: sg.H, px: sg.px, x0: sg.x0, y0: sg.y0, meta: rle(sg.meta) } };
  });
  return { res: ST.print.res, fit: ST.fit,
    front: { W: f.W, H: f.H, px: f.px, x0: f.x0, y0: f.y0 }, wall: rle(c.wall), lanes,
    check: BENCH.check().lanes };
}"""

NEGATIVE_JS = """(s) => {
  const c = BENCH.model().capture, f = c.front, W = f.W, H = f.H, d = s * c.G.lanes[0].dir;
  const sh = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) { const js = j - d; if (js < 0 || js >= H) continue;
    for (let i = 0; i < W; i++) sh[j * W + i] = c.wall[js * W + i]; }
  return runCheck(c.G, f, sh, c.slideGrids).lanes.map(l => ({ i: l.i, overlapCells: l.overlapCells, overlapK: l.overlapK }));
}"""


def sha256(path):
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def check_sums():
    with open(os.path.join(ROOT, "lineage.json")) as fh:
        rows = json.load(fh)
    for name, source in ORIGINALS.items():
        want = next((r["sha256"] for r in rows if r["id"] == ROWS[name]), None)
        got = sha256(local_source(source))
        if got != want:
            sys.exit("%s sha256 %s, lineage %s records %s" % (name, got, ROWS[name], want))


def sweep_cases():
    with zipfile.ZipFile(local_source(ORIGINALS["sash-src.zip"])) as z:
        src = z.read("sweep.py").decode("utf-8")
    for node in ast.parse(src).body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "cases" for t in node.targets):
            return [tuple(c) for c in ast.literal_eval(node.value)]
    sys.exit("sweep.py has no cases list")


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def patched_bench(tmp):
    with open(local_source(ORIGINALS["sash.html"]), encoding="utf-8") as fh:
        text = fh.read()
    if text.count(ANCHOR) != 1:
        sys.exit("runCheck call line found %d times in sash.html, expected 1" % text.count(ANCHOR))
    out = os.path.join(tmp, "sash-capture.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(text.replace(ANCHOR, PATCH + ANCHOR))
    return out


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(HERE, "fixtures"))
    ap.add_argument("--only", default=None)
    a = ap.parse_args(argv)
    check_sums()
    cases = [("battery default", "")] + sweep_cases()
    if len(cases) != 22:
        sys.exit("expected 22 cases (battery plus the 21 of sweep.py), read %d" % len(cases))
    os.makedirs(a.out, exist_ok=True)
    from playwright.sync_api import sync_playwright

    fails = []
    t_all = time.time()
    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        url = "file://" + patched_bench(tmp)
        exe = os.environ.get("HBF_CHROMIUM") or (MAC_CHROME if os.path.exists(MAC_CHROME) else None)
        b = p.chromium.launch(args=FLAGS, **({"executable_path": exe} if exe else {}))
        pg = b.new_page(viewport={"width": 1280, "height": 800})
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(url)
        pg.wait_for_function("typeof BENCH !== 'undefined' && BENCH.ready", timeout=60000)
        for name, js in cases:
            if a.only and slug(name) != a.only:
                continue
            t0 = time.time()
            pg.evaluate("ST = BENCH.presets.battery.make(); ST.sim.k=[0,0]; " + js + " UI.refreshAll(); commit();")
            pg.wait_for_function(SETTLED, timeout=180000)
            cap = pg.evaluate(CAPTURE_JS)
            doc = {"case": name, "js": js, "source": "sweep.py in designs/sash/legacy/sash-src.zip" if js else "BENCH.presets.battery.make()"}
            doc.update(cap)
            if not js:
                doc["negative"] = [{"shiftCells": s, "lanes": pg.evaluate(NEGATIVE_JS, s)} for s in NEGATIVE_SHIFTS]
            if errs:
                fails.append("%s: console %s" % (name, errs))
                errs.clear()
            path = os.path.join(a.out, slug(name) + ".json")
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(doc, fh, separators=(",", ":"), sort_keys=True)
                fh.write("\n")
            ov = [(l["overlapCells"], l["overlapK"]) for l in cap["check"]]
            print("%-24s lanes %d overlap %s  %.1f s" % (name, len(cap["lanes"]), ov, time.time() - t0))
        b.close()
    print("wall %.1f s" % (time.time() - t_all))
    if fails:
        print("FAILS", fails)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
