#!/usr/bin/env python3
"""
smoke_bench.py: headless Chromium harness for a shipped single file bench.

    python3 smoke_bench.py bench.html out_dir [--example-button #wExample] [--blank-button #wBlank]

Assumes the bench exposes the INLAY bench hooks (see assets/bench/part2.js):
  BENCH.ready, BENCH.model() -> {meshes, dirty, building, tris, ms, warnings, dims},
  BENCH.state(), BENCH.exportBytes(kind) -> base64 for '3mf' | 'stl' | 'json',
  designJson(), loadDesign(txt), a #steps bar with [data-step] buttons, a #face canvas.
Adapt the selectors for a bench that differs; keep the checks. Then audit the pulled 3MF:
    python3 validate_3mf.py out_dir/export.3mf --overlap
"""
import base64, json, os, sys, time, argparse


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("out")
    ap.add_argument("--example-button", default="#wExample")
    ap.add_argument("--blank-button", default="#wBlank")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    from playwright.sync_api import sync_playwright
    url = "file://" + os.path.abspath(a.html)
    errors, fails = [], []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
        pg = b.new_page(viewport={"width": 1280, "height": 800})
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.goto(url)
        pg.wait_for_function("typeof BENCH !== 'undefined' && BENCH.ready", timeout=30000)
        settled = "BENCH.model().meshes && !BENCH.model().dirty && !BENCH.model().building"
        pg.click(a.example_button)
        pg.wait_for_function(settled, timeout=90000)
        m = pg.evaluate("({tris:BENCH.model().tris, ms:BENCH.model().ms, warnings:BENCH.model().warnings, dims:BENCH.model().dims})")
        print("example build:", json.dumps(m))
        if m["warnings"]:
            fails.append("warnings on the worked example: %s" % m["warnings"])
        steps = pg.locator("#steps button").count()
        for s in range(steps):
            pg.click('#steps button[data-step="%d"]' % s); time.sleep(0.25)
            pg.screenshot(path=os.path.join(a.out, "step-%d.png" % s))
        pg.click('#steps button[data-step="0"]')
        # exports
        for kind, name in [("3mf", "export.3mf"), ("stl", "export-stl.zip"), ("json", "design.json")]:
            t = time.time()
            b64 = pg.evaluate("BENCH.exportBytes('%s')" % kind)
            open(os.path.join(a.out, name), "wb").write(base64.b64decode(b64))
            print("exported", name, len(b64) * 3 // 4, "bytes in %.1f s" % (time.time() - t))
            if time.time() - t > 20:
                fails.append("%s export took over 20 s (render loop not paused?)" % kind)
        txt = open(os.path.join(a.out, "design.json")).read()
        pg.evaluate("t => loadDesign(t)", txt)
        pg.wait_for_function(settled, timeout=90000)
        same = json.loads(txt)["state"] == json.loads(pg.evaluate("designJson()"))["state"]
        print("design json round trip identical:", same)
        if not same:
            fails.append("design JSON does not round trip")
        # blank start
        pg.click("#bGuide"); pg.click(a.blank_button)
        pg.wait_for_function(settled, timeout=90000)
        print("blank exports slots:", pg.evaluate("Object.keys(BENCH.model().meshes)"))
        # widths
        for w in [390, 768, 1280]:
            pg.set_viewport_size({"width": w, "height": 800}); time.sleep(0.3)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            print("width", w, "scrollWidth", sw)
            if sw > w:
                fails.append("horizontal overflow at %d" % w)
        b.close()
    print("console errors:", errors)
    if errors:
        fails.append("console errors")
    if fails:
        print("FAILURES"); [print("  -", f) for f in fails]; sys.exit(1)
    print("smoke passed; now run validate_3mf.py on", os.path.join(a.out, "export.3mf"))


if __name__ == "__main__":
    main(sys.argv[1:])
