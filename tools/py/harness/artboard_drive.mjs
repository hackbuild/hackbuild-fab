#!/usr/bin/env node
// artboard_drive.mjs: the puppeteer-core twin of artboard_smoke.py, for a
// host where Playwright's Chromium will not start (macOS 12). It runs the
// same rows from artboard_rows.json the same way: widths 390, 768 and 1280,
// then the touch rows at 390 with pointer events from touch only, failing
// on a row, a console error or horizontal overflow.
//
//   node tools/py/harness/artboard_drive.mjs <fixture.html> <out dir> --chrome <chrome binary> --puppeteer <dir holding node_modules/puppeteer-core>

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const WIDTHS = [390, 768, 1280];
const HEIGHT = 900;
const POLL_MS = 3000;

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
const [html, out] = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
if (!html || !out || !flag('--chrome') || !flag('--puppeteer')) {
  console.log('usage: node tools/py/harness/artboard_drive.mjs <fixture.html> <out dir> --chrome <binary> --puppeteer <dir>');
  process.exit(2);
}
const puppeteer = createRequire(path.join(path.resolve(flag('--puppeteer')), 'node_modules') + '/')('puppeteer-core');

for (const cmd of [['npx', 'tsc', '-b', 'packages/bench-core'], ['npm', 'run', 'fixture', '-w', 'packages/bench-core']]) {
  execFileSync(cmd[0], cmd.slice(1), { cwd: root, stdio: 'inherit' });
}
mkdirSync(out, { recursive: true });
const spec = JSON.parse(readFileSync(path.join(here, 'artboard_rows.json'), 'utf8'));
const url = pathToFileURL(path.resolve(html)).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const point = (pg, expr) => pg.evaluate(`(() => { const p = (${expr}); const r = H.cv().getBoundingClientRect(); return [r.left + p[0], r.top + p[1]]; })()`);

async function check(pg, expr) {
  const t = Date.now();
  for (;;) {
    const msg = await pg.evaluate(expr);
    if (msg === null || Date.now() - t > POLL_MS) return msg;
    await sleep(50);
  }
}

async function hold(pg, keys, down) {
  for (const k of down ? keys : [...keys].reverse()) await (down ? pg.keyboard.down(k) : pg.keyboard.up(k));
}

async function touch(cdp, type, pts) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y })) });
}

async function step(pg, cdp, s) {
  const keys = s.hold ?? s.drag?.hold ?? [];
  if ('js' in s) await pg.evaluate(s.js);
  else if ('check' in s) return check(pg, s.check);
  else if ('click' in s) { const [x, y] = await point(pg, s.click); await pg.mouse.click(x, y); }
  else if ('dblclick' in s) { const [x, y] = await point(pg, s.dblclick); await pg.mouse.click(x, y, { count: 2 }); }
  else if ('drag' in s) {
    const b = s.drag.button ?? 'left';
    const a = await point(pg, s.drag.from), z = await point(pg, s.drag.to);
    await hold(pg, keys, true);
    await pg.mouse.move(...a); await pg.mouse.down({ button: b }); await pg.mouse.move(...z, { steps: 5 }); await pg.mouse.up({ button: b });
    await hold(pg, keys, false);
  } else if ('down' in s) { const [x, y] = await point(pg, s.down); await pg.mouse.move(x, y); await pg.mouse.down(); }
  else if ('move' in s) {
    const [x, y] = await point(pg, s.move);
    await hold(pg, keys, true); await pg.mouse.move(x, y, { steps: 5 }); await hold(pg, keys, false);
  } else if ('up' in s) await pg.mouse.up();
  else if ('wheel' in s) { const [x, y] = await point(pg, s.wheel.at); await pg.mouse.move(x, y); await pg.mouse.wheel({ deltaY: s.wheel.dy }); }
  else if ('press' in s) {
    const ks = s.press;
    for (const k of ks.slice(0, -1)) await pg.keyboard.down(k);
    await pg.keyboard.press(ks.at(-1));
    for (const k of ks.slice(0, -1).reverse()) await pg.keyboard.up(k);
  } else if ('tap' in s) { const p = await point(pg, s.tap); await touch(cdp, 'touchStart', [p]); await touch(cdp, 'touchEnd', []); }
  else if ('swipe' in s) {
    const a = await point(pg, s.swipe.from), z = await point(pg, s.swipe.to);
    await touch(cdp, 'touchStart', [a]);
    for (let i = 1; i <= 5; i++) await touch(cdp, 'touchMove', [[a[0] + (z[0] - a[0]) * i / 5, a[1] + (z[1] - a[1]) * i / 5]]);
    await touch(cdp, 'touchEnd', []);
  } else return `unknown step ${Object.keys(s)}`;
  return null;
}

async function pass(browser, rows, width, isTouch, tag) {
  const pg = await browser.newPage();
  await pg.setViewport({ width, height: HEIGHT, hasTouch: isTouch, isMobile: isTouch });
  const errors = [];
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  pg.on('pageerror', (e) => errors.push(String(e)));
  await pg.goto(url);
  await pg.waitForFunction('globalThis.ARTBOARD && ARTBOARD.ready', { timeout: 30000 });
  await pg.evaluate(spec.prelude);
  const cdp = await pg.createCDPSession();
  const results = [];
  for (const r of rows) {
    let msg = null;
    for (const s of r.steps) {
      msg = await step(pg, cdp, s);
      if (msg) break;
    }
    results.push([r.row, msg]);
  }
  const [sw, iw] = await pg.evaluate('[document.documentElement.scrollWidth, innerWidth]');
  await pg.screenshot({ path: path.join(out, `artboard-${tag}.png`), fullPage: true });
  await pg.close();
  results.push(['no horizontal overflow', sw <= iw ? null : `scrollWidth ${sw} > innerWidth ${iw}`]);
  results.push(['zero console errors', errors.join('; ') || null]);
  return results;
}

const browser = await puppeteer.launch({ executablePath: flag('--chrome'), headless: true });
let fails = 0;
const passes = [...WIDTHS.map((w) => [w, false, spec.mouse, String(w)]), [390, true, spec.touch, '390-touch']];
for (const [w, isTouch, rows, tag] of passes) {
  for (const [name, msg] of await pass(browser, rows, w, isTouch, tag)) {
    console.log(`${tag.padEnd(10)} ${name.padEnd(34)} ${msg === null ? 'pass' : `FAIL ${msg}`}`);
    fails += msg === null ? 0 : 1;
  }
}
await browser.close();
console.log(`artboard smoke: ${fails} failed`);
process.exit(fails ? 1 : 0);
