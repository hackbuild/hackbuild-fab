"""Drive the cloth sim in real chromium and shoot it. Asserts the skin actually
deforms: a settled sheet that never moves looks identical to a broken solver."""
import asyncio, os
from playwright.async_api import async_playwright
OUT=os.path.join(os.path.dirname(__file__),"..","out","img")
URL="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","out","ogee16c.html"))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(args=["--enable-unsafe-swiftshader","--use-gl=swiftshader"])
        pg=await b.new_page(viewport={"width":1480,"height":940})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
        await pg.goto(URL); await pg.wait_for_timeout(4000)
        flat=await pg.evaluate("""() => { const c=__ogeepc.cloth; let lo=1e9,hi=-1e9;
          for(let k=0;k<c.N;k++){const z=c.pos[k*3+2]; if(z<lo)lo=z; if(z>hi)hi=z;}
          return hi-lo; }""")
        await pg.evaluate("__ogeep.setMode('solid');"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=f"{OUT}/cloth-flat.png")
        await pg.evaluate("""
          for (const [i,j] of [[0,0],[0,2],[1,1],[1,3],[2,0],[2,2],[3,1],[3,3]])
            __ogeep.drive(i,j);""")
        await pg.wait_for_timeout(2600)
        n=await pg.evaluate("__ogeep.latched.flat().reduce((a,b)=>a+b,0)")
        bump=await pg.evaluate("""() => { const c=__ogeepc.cloth; let lo=1e9,hi=-1e9;
          for(let k=0;k<c.N;k++){const z=c.pos[k*3+2]; if(z<lo)lo=z; if(z>hi)hi=z;}
          return hi-lo; }""")
        await pg.screenshot(path=f"{OUT}/cloth-solid.png")
        await pg.evaluate("__ogeep.setMode('ghost body');"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=f"{OUT}/cloth-ghost.png")
        await pg.evaluate("document.getElementById('bWire').click();")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f"{OUT}/cloth-wire.png")
        sc=await pg.evaluate("document.body.scrollWidth>window.innerWidth")
        chk=await pg.evaluate("document.getElementById('chk').innerText")
        await b.close()
        print(f"skin height flat {flat:.2f} mm, with 8 set {bump:.2f} mm "
              f"(a set pin lifts 7.60)")
        print("checker latched:", n, "of 8", "OK" if n==8 else "FAIL")
        print("deforms:", "OK" if bump-flat > 6.5 else "FAIL")
        print("h-scroll:", sc, " errors:", errs or "none")
        print([l for l in chk.splitlines() if "self check" in l.lower()])
asyncio.run(main())
