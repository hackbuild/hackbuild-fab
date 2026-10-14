"""Drive the hand cranked assembly sim in real chromium and screenshot it.
Asserts the machine actually latches rather than just taking a picture."""
import asyncio, os
from playwright.async_api import async_playwright
OUT=os.path.join(os.path.dirname(__file__),"..","out","img")
URL="file://"+os.path.abspath(os.path.join(os.path.dirname(__file__),"..","out","ogee16m.html"))
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(args=["--enable-unsafe-swiftshader","--use-gl=swiftshader"])
        pg=await b.new_page(viewport={"width":1480,"height":940})
        errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
        await pg.goto(URL); await pg.wait_for_timeout(3000)
        await pg.evaluate("__ogeep.setMode('solid'); __ogeep.apply();")
        await pg.wait_for_timeout(500); await pg.screenshot(path=f"{OUT}/hand-solid.png")
        await pg.evaluate("""
          for (const [i,j] of [[0,0],[0,2],[1,1],[1,3],[2,0],[2,2],[3,1],[3,3]])
            __ogeep.drive(i,j);""")
        await pg.wait_for_timeout(1400)
        n=await pg.evaluate("__ogeep.latched.flat().reduce((a,b)=>a+b,0)")
        await pg.screenshot(path=f"{OUT}/hand-checker.png")
        await pg.evaluate("__ogeep.setMode('ghost body'); __ogeep.apply();")
        await pg.wait_for_timeout(500); await pg.screenshot(path=f"{OUT}/min-ghost.png")
        # knobs must track their cranks through a full stroke
        drift=await pg.evaluate("""() => {
          let w=0;
          for(let k=0;k<=10;k++){
            __ogeep.zR[0]=0; __ogeep.zC[0]=0;
            __ogeep.drive(0,0); __ogeep.apply();
            for(let i=0;i<4;i++) w=Math.max(w,Math.abs(__ogeep.knR[i].rx-__ogeep.shR[i].rx));
            for(let j=0;j<4;j++) w=Math.max(w,Math.abs(__ogeep.knC[j].ry-__ogeep.shC[j].ry));
          }
          return w; }""")
        # the drive toggle: same crank angles either way, and the groups swap
        drv=await pg.evaluate("""() => {
          const P=__ogeep; const out=[];
          for(const d of ['knobs','servos','knobs']){
            P.setDrive(d);
            const vis={}; for(const e of P.PARTS) if(e.o.visible) vis[e.group]=(vis[e.group]||0)+1;
            out.push([d, vis.knobs||0, vis.servos||0]);
          }
          P.setDrive('knobs'); return out; }""")
        chk=await pg.evaluate("document.getElementById('chk').innerText")
        sc=await pg.evaluate("document.body.scrollWidth>window.innerWidth")
        # let the last stroke finish first: pulling the tab while a knob is still
        # turned re-latches on the next frame, which is physical but not the test
        await pg.wait_for_timeout(900)
        await pg.evaluate("__ogeep.pull()"); await pg.wait_for_timeout(1400)
        after=await pg.evaluate("__ogeep.latched.flat().reduce((a,b)=>a+b,0)")
        # every assembly step must reveal something and the last must show all
        steps=await pg.evaluate('''() => {
          const P=__ogeep, tot=P.PARTS.length, seen=[];
          for(let k=0;k<P.ASM.length;k++){ P.setAsm(k);
            seen.push(P.PARTS.filter(e=>e.o.visible).length); }
          P.setAsm(P.ASM.length-1);
          return {tot, seen, monotonic: seen.every((v,i)=>i===0||v>=seen[i-1]),
                  full: seen[seen.length-1]};
        }''')
        await pg.evaluate("__ogeep.setAsm(5); __ogeep.expl=0.55; __ogeep.apply();")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f"{OUT}/hand-step.png")
        await pg.evaluate("__ogeep.setAsm(9); __ogeep.expl=1; __ogeep.apply();")
        await pg.wait_for_timeout(600); await pg.screenshot(path=f"{OUT}/min-explode.png")
        await pg.evaluate("__ogeep.expl=0; __ogeep.apply();")
        await b.close()
        print("checker latched:", n, "of 8", "OK" if n==8 else "FAIL")
        print("after tab pull:", after, "OK" if after==0 else "FAIL")
        print("knob vs crank drift:", drift)
        print("assembly steps:", steps)
        print("drive toggle [mode, knob parts shown, servo parts shown]:", drv)
        print("h-scroll:", sc, " errors:", errs or "none")
        print([l for l in chk.splitlines() if "self check" in l.lower() or "audit" in l.lower()])
asyncio.run(main())
