import asyncio, json, subprocess
from playwright.async_api import async_playwright
CASES = [("seat",{"board":"c3mini","mount":"press"}),("seat",{"board":"c3mini","mount":"snap"}),("seat",{"board":"pico","mount":"press"}),("seat",{"board":"pico","mount":"snap"}),("seat",{"board":"teensy40","mount":"press"}),("seat",{"board":"teensy40","mount":"snap","hinge":"none"}),("seat",{"board":"custom","mount":"snap"}),
 ("plate",{"cols":8,"rows":8,"nets":[[[0,0],[7,0],[3,3]],[[0,7],[7,7]]]}),("wire",{"shape":"straight"}),("wire",{"shape":"spiral","len":200}),("wire",{"shape":"zigzag","len":120}),("wire",{"shape":"s","len":120}),("wire",{"shape":"arc","len":100}),
 ("jumper",{"n":2}),("jumper",{"n":4,"bus":True}),("touch",{}),("force",{}),("button",{}),("slider",{}),("lamp",{}),("resistor",{})]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width':1280,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('file:///home/claude/boss/out/boss.html'); await pg.wait_for_function('window.BENCH && window.BENCH.ready()', timeout=60000)
        bad = 0
        for pid, params in CASES:
            await pg.evaluate('window.BENCH.setPart(%s, %s)' % (json.dumps(pid), json.dumps(params))); await pg.wait_for_function('window.BENCH.ready()', timeout=120000)
            r = await pg.evaluate('(() => { const p = window.BENCH_PART.currentPart; return { name: p.name, tris: p.tris, warnings: p.warnings.filter(w => !w.startsWith("note")), fits: (p.fits||[]).filter(f=>!f.ok).length }; })()')
            data = await pg.evaluate('window.BENCH.exportBytes("3mf").then(b => Array.from(b))'); open('/home/claude/boss/out/bs.3mf','wb').write(bytes(data))
            v = subprocess.run(['python3','/mnt/skills/plugins/print-forge/scripts/validate_3mf.py','/home/claude/boss/out/bs.3mf','--overlap','--quiet'],capture_output=True,text=True)
            ok = 'passed' in v.stdout and not r['warnings'] and not r['fits']
            if not ok: bad += 1
            print(('ok  ' if ok else 'BAD ') + r['name'], r['tris'], r['warnings'], r['fits'], '' if 'passed' in v.stdout else v.stdout.strip().splitlines()[-1:])
        print('browser sweep bad:', bad, 'console errors:', len(errs))
        await b.close()
asyncio.run(main())
