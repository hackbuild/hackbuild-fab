import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={"width": 390, "height": 820})
    pg.goto("file://" + os.path.abspath("out/pip.html"))
    pg.wait_for_function("typeof BENCH !== 'undefined' && BENCH.ready", timeout=60000)
    for step in range(4):
        pg.evaluate("UI.go(%d)" % step)
        r = pg.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 0.5 && r.width > 0; }).slice(0, 8).map(e => e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right))""")
        print(step, pg.evaluate("document.documentElement.scrollWidth"), r)
    b.close()
