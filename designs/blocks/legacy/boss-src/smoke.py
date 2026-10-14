import asyncio, sys, json, os, subprocess
from playwright.async_api import async_playwright
OUT = '/home/claude/boss/out'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        errors = []
        for width in (1280, 768, 390):
            pg = await b.new_page(viewport={'width': width, 'height': 900 if width > 400 else 800})
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            await pg.goto('file://' + OUT + '/boss.html')
            await pg.wait_for_function('window.BENCH && window.BENCH.ready()', timeout=60000)
            sw = await pg.evaluate('document.documentElement.scrollWidth'); cw = await pg.evaluate('document.documentElement.clientWidth')
            print(width, 'scrollWidth', sw, 'clientWidth', cw, 'OK' if sw <= cw else 'HORIZONTAL SCROLL')
            if width == 1280:
                await pg.click('#wBlank'); await pg.wait_for_timeout(300)
                await pg.screenshot(path=OUT + '/shot-step1.png')
                for step in (1, 2, 3):
                    await pg.evaluate('window.BENCH.goStep(%d)' % step); await pg.wait_for_timeout(500)
                    await pg.screenshot(path=OUT + '/shot-step%d.png' % (step + 1))
                # worked example
                await pg.evaluate('window.BENCH.example()'); await pg.wait_for_timeout(1500)
                await pg.screenshot(path=OUT + '/shot-example.png')
                res = await pg.evaluate('(() => { const r = window.BENCH.run(); return { ok: r.ok, reason: r.reason || "", contacts: r.contacts ? r.contacts.length : 0, leds: r.readings.leds.map(l => l.mA), pins: r.readings.pins.map(p => [p.pin, p.mode, +p.v.toFixed(2)]) }; })()')
                print('example run', json.dumps(res)[:400])
                # export the scene and a part through the hook
                for what, name in (('scene', 'scene'), ('part', 'part')):
                    await pg.evaluate('window.BENCH.state.printWhat = "%s"' % what)
                    data = await pg.evaluate('window.BENCH.exportBytes("3mf").then(b => Array.from(b))')
                    open(OUT + '/hook-%s.3mf' % name, 'wb').write(bytes(data))
                    r = subprocess.run(['python3', '/mnt/skills/plugins/print-forge/scripts/validate_3mf.py', OUT + '/hook-%s.3mf' % name, '--overlap', '--quiet'], capture_output=True, text=True)
                    print('validate hook', name, r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-300:])
                    data = await pg.evaluate('window.BENCH.exportBytes("stl").then(b => Array.from(b))')
                    open(OUT + '/hook-%s-stl.zip' % name, 'wb').write(bytes(data))
                # a few parts through setPart
                for pid, params in (('wire', {'shape': 'spiral', 'len': 200}), ('seat', {'board': 'pico', 'mount': 'snap'}), ('force', {})):
                    await pg.evaluate('window.BENCH.setPart(%s, %s)' % (json.dumps(pid), json.dumps(params)))
                    await pg.wait_for_function('window.BENCH.ready()', timeout=60000)
                    await pg.evaluate('window.BENCH.goStep(0)'); await pg.wait_for_timeout(300)
                    await pg.screenshot(path=OUT + '/shot-%s.png' % pid)
            else:
                await pg.screenshot(path=OUT + '/shot-%d.png' % width)
            await pg.close()
        await b.close()
        print('console errors:', len(errors)); [print('  ', e[:300]) for e in errors[:10]]
asyncio.run(main())
