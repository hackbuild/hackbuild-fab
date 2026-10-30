#!/usr/bin/env python3
"""artboard_smoke.py: drive the art board fixture's handles in Chromium (M03-T12 step 5).

    uv run --project tools/py --extra bench tools/py/harness/artboard_smoke.py packages/bench-core/test/artboard/fixture.html out/artboard

Ported from the SASH smoke drive (sash-src/smoke.py lines 49 to 87, lineage
sash.smoke/sash-src): read UI.FE.handles, drag the centre 30 px right and
20 px up, drag the dot 40 px, drag a corner outward by half its offset from
the centre, and fail when the state did not change. The remaining rows of
the M03-T12 table live in artboard_rows.json, shared with artboard_drive.mjs
(the puppeteer-core twin for hosts Playwright refuses). Every row runs at
viewport widths 390, 768 and 1280, then the touch rows at 390 with pointer
events from touch only. A console error or horizontal overflow
(scrollWidth > innerWidth) fails the width. The fixture bundle is rebuilt
first so the run never reads a stale dist.
"""
import json, os, subprocess, sys, time

MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
WIDTHS = [390, 768, 1280]
HEIGHT = 900
POLL_S = 3.0


def build():
    for cmd in (["npx", "tsc", "-b", "packages/bench-core"], ["npm", "run", "fixture", "-w", "packages/bench-core"]):
        subprocess.run(cmd, cwd=ROOT, check=True)


def page_point(pg, expr):
    return pg.evaluate("(() => { const p = (%s); const r = H.cv().getBoundingClientRect(); return [r.left + p[0], r.top + p[1]]; })()" % expr)


def check(pg, expr):
    t = time.time()
    while True:
        msg = pg.evaluate(expr)
        if msg is None or time.time() - t > POLL_S:
            return msg
        time.sleep(0.05)


def hold(pg, keys, down):
    for k in (keys if down else reversed(keys)):
        (pg.keyboard.down if down else pg.keyboard.up)(k)


def run_step(pg, cdp, s):
    """One step; returns a failure message or None."""
    keys = s.get("hold") or (s.get("drag") or {}).get("hold") or []
    if "js" in s:
        pg.evaluate(s["js"])
    elif "check" in s:
        return check(pg, s["check"])
    elif "click" in s:
        x, y = page_point(pg, s["click"]); pg.mouse.click(x, y)
    elif "dblclick" in s:
        x, y = page_point(pg, s["dblclick"]); pg.mouse.dblclick(x, y)
    elif "drag" in s:
        d = s["drag"]; b = d.get("button", "left")
        a = page_point(pg, d["from"]); z = page_point(pg, d["to"])
        hold(pg, keys, True)
        pg.mouse.move(*a); pg.mouse.down(button=b); pg.mouse.move(*z, steps=5); pg.mouse.up(button=b)
        hold(pg, keys, False)
    elif "down" in s:
        x, y = page_point(pg, s["down"]); pg.mouse.move(x, y); pg.mouse.down()
    elif "move" in s:
        x, y = page_point(pg, s["move"])
        hold(pg, keys, True); pg.mouse.move(x, y, steps=5); hold(pg, keys, False)
    elif "up" in s:
        pg.mouse.up()
    elif "wheel" in s:
        x, y = page_point(pg, s["wheel"]["at"]); pg.mouse.move(x, y); pg.mouse.wheel(0, s["wheel"]["dy"])
    elif "press" in s:
        ks = s["press"]
        for k in ks[:-1]: pg.keyboard.down(k)
        pg.keyboard.press(ks[-1])
        for k in reversed(ks[:-1]): pg.keyboard.up(k)
    elif "tap" in s:
        x, y = page_point(pg, s["tap"])
        for t in ("touchStart", "touchEnd"):
            cdp.send("Input.dispatchTouchEvent", {"type": t, "touchPoints": [] if t == "touchEnd" else [{"x": x, "y": y}]})
    elif "swipe" in s:
        a = page_point(pg, s["swipe"]["from"]); z = page_point(pg, s["swipe"]["to"])
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": a[0], "y": a[1]}]})
        for i in range(1, 6):
            f = i / 5
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": a[0] + (z[0] - a[0]) * f, "y": a[1] + (z[1] - a[1]) * f}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    else:
        return "unknown step %s" % list(s)
    return None


def run_pass(browser, url, rows, prelude, width, touch, out, tag):
    ctx = browser.new_context(viewport={"width": width, "height": HEIGHT}, has_touch=touch, is_mobile=touch)
    pg = ctx.new_page()
    errors = []
    pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(url)
    pg.wait_for_function("globalThis.ARTBOARD && ARTBOARD.ready", timeout=30000)
    pg.evaluate(prelude)
    cdp = ctx.new_cdp_session(pg)
    results = []
    for r in rows:
        msg = None
        for s in r["steps"]:
            msg = run_step(pg, cdp, s)
            if msg:
                break
        results.append((r["row"], msg))
    over = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    pg.screenshot(path=os.path.join(out, "artboard-%s.png" % tag), full_page=True)
    ctx.close()
    results.append(("no horizontal overflow", None if over[0] <= over[1] else "scrollWidth %d > innerWidth %d" % tuple(over)))
    results.append(("zero console errors", "; ".join(errors) or None))
    return results


def main(argv):
    html, out = argv[0], argv[1]
    os.makedirs(out, exist_ok=True)
    build()
    spec = json.load(open(os.path.join(HERE, "artboard_rows.json")))
    from playwright.sync_api import sync_playwright
    url = "file://" + os.path.abspath(html)
    fails = 0
    with sync_playwright() as p:
        exe = os.environ.get("HBF_CHROMIUM") or (MAC_CHROME if os.path.exists(MAC_CHROME) else None)
        b = p.chromium.launch(**({"executable_path": exe} if exe else {}))
        passes = [(w, False, spec["mouse"], str(w)) for w in WIDTHS] + [(390, True, spec["touch"], "390-touch")]
        for w, touch, rows, tag in passes:
            for name, msg in run_pass(b, url, rows, spec["prelude"], w, touch, out, tag):
                print("%-10s %-34s %s" % (tag, name, "pass" if msg is None else "FAIL " + msg))
                fails += msg is not None
        b.close()
    print("artboard smoke: %d failed" % fails)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
