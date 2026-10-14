"""Screenshot the built sim in real chromium. Playwright caught a latching bug
that node stubs, the mesh audit and the placement diff all missed, so the sim is
always exercised here before it ships."""
import asyncio, os, sys
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(__file__), "..", "out", "img")
URL = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "out", "ogee16.html"))

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=["--enable-unsafe-swiftshader","--use-gl=swiftshader"])
        pg = await b.new_page(viewport={"width":1480,"height":940})
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        await pg.evaluate("__ogee.setMode('solid'); __ogee.apply();")
        await pg.wait_for_timeout(400); await pg.screenshot(path=f"{OUT}/sim-solid.png")
        # write a checker and confirm the machine actually latched
        await pg.evaluate("""
            for (const [i,j] of [[0,0],[0,2],[1,1],[1,3],[2,0],[2,2],[3,1],[3,3]])
                __ogee.drive(i,j);
        """)
        await pg.wait_for_timeout(1200)
        n = await pg.evaluate("__ogee.latched.flat().reduce((a,b)=>a+b,0)")
        await pg.screenshot(path=f"{OUT}/sim-checker.png")
        await pg.evaluate("__ogee.setMode('x-ray'); __ogee.apply();")
        await pg.wait_for_timeout(400); await pg.screenshot(path=f"{OUT}/sim-xray.png")
        fails = await pg.evaluate("document.getElementById('chk').innerText")
        sc = await pg.evaluate("document.body.scrollWidth > window.innerWidth")
        await b.close()
        print("checker pattern latched:", n, "of 8", "OK" if n == 8 else "FAIL")
        print("horizontal scroll:", sc)
        print("console errors:", errs or "none")
        print("self check line:", [l for l in fails.splitlines() if "self check" in l.lower()])
asyncio.run(main())
