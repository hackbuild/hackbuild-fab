#!/usr/bin/env python3
"""PIP bench smoke: boot, examples, steps, sliders, drive pad, xray/section/plate, exports, round trip, widths."""
import base64, json, os, sys, time
from playwright.sync_api import sync_playwright
html, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
url = "file://" + os.path.abspath(html)
errors, fails = [], []
SETTLED = "BENCH.ready && !BENCH.busy && BENCH.built === BENCH.rev"
def shot(pg, n): pg.screenshot(path=os.path.join(out, n + ".png"))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 1280, "height": 820})
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    t = time.time()
    pg.goto(url)
    pg.wait_for_function("typeof BENCH !== 'undefined' && BENCH.ready", timeout=60000)
    print("boot %.1f s" % (time.time() - t))
    shot(pg, "00-welcome")
    pg.click("#wExample")
    pg.wait_for_function(SETTLED, timeout=120000)
    m = pg.evaluate("({ms: BENCH.model.ms, warn: BENCH.model.M.warn, objs: BENCH.model.M.objects.map(o => o.name)})")
    print("example:", json.dumps(m))
    if m["warn"]: fails.append("example warnings %s" % m["warn"])
    for s in range(4):
        pg.click('#steps button[data-step="%d"]' % s); time.sleep(0.4)
        shot(pg, "step-%d" % s)
    # numeric edit rebuilds
    pg.click('#steps button[data-step="0"]')
    r0 = pg.evaluate("BENCH.built")
    pg.fill('#rail input[type=number][data-p="shape.W"]', "160")
    pg.press('#rail input[type=number][data-p="shape.W"]', "Enter")
    pg.locator('#rail input[type=number][data-p="shape.W"]').dispatch_event("change")
    pg.wait_for_function(SETTLED + " && BENCH.built > %d" % r0, timeout=120000)
    w = pg.evaluate("BENCH.model.M.dims.W")
    print("width after edit:", w)
    if w != 160: fails.append("numeric edit did not rebuild")
    # slider release rebuilds (click spring beam)
    pg.click('#steps button[data-step="1"]')
    r0 = pg.evaluate("BENCH.built")
    pg.evaluate("""() => { const el = document.querySelector('#rail input[type=range][data-p="clicky.Q"]'); el.value = 2.1; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); }""")
    pg.wait_for_function(SETTLED + " && BENCH.built > %d" % r0, timeout=120000)
    q = pg.evaluate("BENCH.model.M.mech.click.drop")
    print("click drop after Q 2.1:", q)
    shot(pg, "click-curve")
    # group type chip
    pg.click('#steps button[data-step="0"]')
    r0 = pg.evaluate("BENCH.built")
    pg.click('#groups .grp:nth-child(3) [data-type2="flex"]')
    pg.wait_for_function(SETTLED + " && BENCH.built > %d" % r0, timeout=120000)
    print("menu type now:", pg.evaluate("BENCH.state.groups.menu.type"))
    # drive pad: hold A
    pg.evaluate("VIEW.preset('iso')")
    btn = pg.locator('#padKeys button[data-k="A"]')
    bb = btn.bounding_box()
    pg.mouse.move(bb["x"] + 5, bb["y"] + 5); pg.mouse.down(); time.sleep(0.3)
    rd = pg.inner_text("#padRead"); print("pad read:", rd)
    if "reads LOW" not in rd: fails.append("drive pad did not read")
    shot(pg, "drive-A")
    pg.mouse.up()
    # click a key in the view: top camera, pick the d-pad UP key
    pg.click('#cams [data-cam="top"]'); time.sleep(0.3)
    pos = pg.evaluate("""() => { const b = BENCH.model.L.btns.find(x => x.id === 'UP'); return [b.x, b.y, BENCH.model.M.z.bezelTop + 2]; }""")
    xy = pg.evaluate("""(p) => { const cv = document.querySelector('#stage canvas.three'); const r = cv.getBoundingClientRect();
      const V = VIEW; return null; }""", pos)
    for cam in ["xray", "section"]:
        pg.click('#cams [data-cam="%s"]' % cam); time.sleep(0.5); shot(pg, "view-" + cam)
        pg.click('#cams [data-cam="%s"]' % cam)
    pg.click('#cams [data-cam="plate"]'); time.sleep(0.5); shot(pg, "view-plate"); pg.click('#cams [data-cam="plate"]')
    pg.click('#cams [data-cam="explode"]'); pg.click('#cams [data-cam="iso"]'); time.sleep(0.5); shot(pg, "view-explode"); pg.click('#cams [data-cam="explode"]')
    # exports
    for kind, name in [("3mf", "export.3mf"), ("stl", "export-stl.zip"), ("json", "design.json"), ("card", "print-card.txt"), ("ino", "pip.ino"), ("svg", "wiring.svg")]:
        t = time.time()
        b64 = pg.evaluate("BENCH.exportBytes('%s')" % kind)
        open(os.path.join(out, name), "wb").write(base64.b64decode(b64))
        print("exported", name, len(b64) * 3 // 4, "bytes in %.1f s" % (time.time() - t))
    txt = open(os.path.join(out, "design.json")).read()
    pg.evaluate("t => BENCH.loadDesign(t)", txt)
    pg.wait_for_function(SETTLED, timeout=120000)
    same = json.loads(txt)["state"] == json.loads(pg.evaluate("BENCH.designJson()"))["state"]
    print("design json round trip identical:", same)
    if not same: fails.append("design json round trip")
    # stick example
    pg.click("#bGuide"); pg.click("#wStick")
    pg.wait_for_function(SETTLED, timeout=120000)
    print("stick warn:", pg.evaluate("BENCH.model.M.warn"))
    b64 = pg.evaluate("BENCH.exportBytes('3mf')"); open(os.path.join(out, "stick.3mf"), "wb").write(base64.b64decode(b64))
    pg.evaluate("VIEW.preset('iso')")
    btn = pg.locator('#padKeys button[data-k="UP"]'); bb = btn.bounding_box()
    pg.mouse.move(bb["x"] + 5, bb["y"] + 5); pg.mouse.down(); time.sleep(0.3); shot(pg, "stick-up"); pg.mouse.up()
    # blank
    pg.click("#bGuide"); pg.click("#wBlank")
    pg.wait_for_function(SETTLED, timeout=120000)
    b64 = pg.evaluate("BENCH.exportBytes('3mf')"); open(os.path.join(out, "blank.3mf"), "wb").write(base64.b64decode(b64))
    print("blank objects:", pg.evaluate("BENCH.model.M.objects.map(o => o.name)"))
    for w in [390, 768, 1280]:
        pg.set_viewport_size({"width": w, "height": 820}); time.sleep(0.4)
        sw = pg.evaluate("document.documentElement.scrollWidth")
        print("width", w, "scrollWidth", sw)
        if sw > w: fails.append("horizontal overflow at %d" % w)
        shot(pg, "w%d" % w)
    b.close()
print("console errors:", errors)
if errors: fails.append("console errors")
if fails:
    print("FAILURES"); [print("  -", f) for f in fails]; sys.exit(1)
print("smoke passed")
