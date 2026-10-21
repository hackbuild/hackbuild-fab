#!/usr/bin/env node
// Side-by-side grade shots (PLAN.md section 6, designs row: each design
// graded side by side with its original at 390 and 1280 px). Opens the fab
// bake and the legacy page from file:// in Playwright Chrome with every
// request off file answered by abort (an adapter's declared requests are
// answered locally, tools/hook/adapter-page.ts), and shoots three states at
// each width:
//
//   a-open  after load (a hook page: ready and the first settled build)
//   b-work  the legacy adapter's example, else the welcome's first start
//   c-last  the last step of the step strip
//
// It writes <id>-<w>-<state>-fab.png, <id>-<w>-<state>-legacy.png, the two
// joined as <id>-<w>-<state>.png, and side-by-side.json with the sha256 of
// every image and the scrollWidth of each page in each state (measured).
// Exit 1 when either page scrolls sideways at any width (scrollWidth over
// the viewport), 2 on a usage or run error. The shots are evidence for the
// person who grades; reading them is never the person look D-154 asks for.
//
//   node tools/gold/side-by-side.mjs --fab dist/bench/<id>.html \
//     --legacy designs/<id>/legacy/<file>.html --out <dir> [--id <id>]
//
// The output folder must resolve under the fab-knowledge evidence folder or
// the temp folder (tools/slice/slice.mjs assertOutDir).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
// slice.mjs registers the workspace resolve hook the .ts imports below need.
import { assertOutDir } from "../slice/slice.mjs";

const { closeWelcome, open, overflow } = await import("../smoke/measure.ts");
const { ADAPTERS } = await import("../hook/legacy-adapters.ts");
const { bundleAdapters, routeDeclared } = await import("../hook/adapter-page.ts");

/** The two widths of the PLAN.md section 6 grade; heights as the M09 shots. */
export const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];
export const STATES = ["a-open", "b-work", "c-last"];
const READY_MS = 120_000;
const GL = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"];
const STEPS = "nav[aria-label=steps] button, button[data-step]";
// The first start a welcome offers: the fab HbWelcome tiles, the legacy #welcome presets (TOGGLE, BOSS) or worked example (PIP).
const START = '[data-hb="welcome"] [role=group][aria-label=start] button, #welcome:not(.hide) [data-preset], #welcome:not(.hide) #wExample';

const sha256 = (b) => createHash("sha256").update(b).digest("hex");

/** Two frames, so a click's layout and paint land before the shot. */
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Waits on globalThis.__hbfHook (BENCH, or the adapter's hook) until built is current and past `after`. */
async function quiet(page, after) {
  const hooked = await page.evaluate(() => globalThis.__hbfHook !== undefined);
  if (hooked) {
    await page.waitForFunction((n) => {
      const h = globalThis.__hbfHook;
      return h.ready && !h.busy && h.built === h.rev && h.built > n;
    }, after, { timeout: READY_MS });
  }
  await frames(page);
}

const builtOf = (page) => page.evaluate(() => (globalThis.__hbfHook === undefined ? -1 : globalThis.__hbfHook.built));

/**
 * Opens one page. The fab bake goes through measure.ts open. A legacy file
 * whose sha256 an adapter names goes through that adapter; any other page
 * that installs BENCH is driven as a fab bake; a page without either is
 * shot as it loads, with b-work and c-last noted as not provided.
 */
async function openPage(browser, vp, role, file) {
  const bytes = readFileSync(file);
  const adapter = role === "legacy" ? Object.values(ADAPTERS).find((a) => a.sha256 === sha256(bytes)) ?? null : null;
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const blocked = [];
  await context.route(/^(?!file:|data:)/, (route) => {
    blocked.push(route.request().url());
    return route.abort();
  });
  await routeDeclared(context, adapter);
  const page = await context.newPage();
  if (role === "fab") {
    await open(page, { id: path.basename(file, ".html"), file, kind: "bench", build: null });
    await page.evaluate(() => { globalThis.__hbfHook = globalThis.BENCH; });
  } else {
    await page.goto(pathToFileURL(file).href);
    if (adapter !== null) {
      await page.addScriptTag({ content: await bundleAdapters() });
      await page.waitForFunction((id) => {
        const a = globalThis.__HBF_ADAPTERS[id];
        return a.isReady ? a.isReady(globalThis) === true : globalThis.BENCH?.ready === true;
      }, adapter.id, { timeout: READY_MS });
      await page.evaluate((id) => { globalThis.__hbfHook = globalThis.__HBF_ADAPTERS[id].adapt(globalThis); }, adapter.id);
      await quiet(page, -1);
    } else if (await page.evaluate(() => typeof globalThis.BENCH === "object")) {
      await page.waitForFunction(() => globalThis.BENCH.ready === true, undefined, { timeout: READY_MS });
      await page.evaluate(() => { globalThis.__hbfHook = globalThis.BENCH; });
      await quiet(page, -1);
    } else {
      await frames(page);
    }
  }
  return { context, page, adapter, blocked };
}

/** Closes a welcome still open the way the page closes it: HbWelcome dismiss, or a click on the legacy #welcome backdrop. */
async function dismiss(page) {
  if (await page.locator('[data-hb="welcome"]').isVisible().catch(() => false)) await closeWelcome(page);
  await page.evaluate(() => {
    const w = document.querySelector("#welcome:not(.hide)");
    if (w !== null) w.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

/** Moves a page to `state`; returns a note when the page has no way there. */
async function reach(p, state) {
  const { page, adapter } = p;
  if (state === "a-open") return null;
  const before = await builtOf(page);
  if (state === "b-work") {
    if (adapter?.example !== undefined) {
      await page.evaluate((id) => globalThis.__HBF_ADAPTERS[id].example(globalThis), adapter.id);
      await quiet(page, before);
      await dismiss(page);
      return null;
    }
    const start = page.locator(START).first();
    if (!(await start.isVisible().catch(() => false))) return "no welcome start shown";
    await start.click();
    await dismiss(page);
    await quiet(page, before - 1);
    return null;
  }
  await dismiss(page);
  const steps = page.locator(STEPS);
  const n = await steps.count();
  if (n === 0) return "no step strip";
  await steps.nth(n - 1).click();
  await quiet(page, before - 1);
  return null;
}

/** The two shots joined left to right on one page, shot at their own size. */
async function join(browser, vp, left, right, out) {
  const page = await browser.newPage({ viewport: { width: vp.width * 2 + 8, height: vp.height }, deviceScaleFactor: 1 });
  const img = (b) => `<img src="data:image/png;base64,${b.toString("base64")}" width="${vp.width}" height="${vp.height}">`;
  await page.setContent(`<body style="margin:0;display:flex;gap:8px;background:rgb(26, 26, 26)">${img(left)}${img(right)}</body>`);
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete));
  const bytes = await page.screenshot({ path: out });
  await page.close();
  return bytes;
}

export async function run({ fab, legacy, out, id }) {
  for (const f of [fab, legacy]) if (!existsSync(f)) throw new Error(`${f} missing`);
  assertOutDir(out);
  mkdirSync(out, { recursive: true });
  const { chromium } = await import("playwright");
  const exe = process.env["HBF_CHROMIUM"];
  // System Chrome as the smoke suite runs it (tools/smoke/playwright.config.ts); HBF_CHROMIUM names another binary.
  const browser = await chromium.launch({ args: GL, ...(exe ? { executablePath: exe } : { channel: "chrome" }) });
  const files = { fab, legacy };
  const record = {
    id,
    pages: Object.fromEntries(Object.entries(files).map(([r, f]) => [r, { file: path.relative(process.cwd(), f), sha256: sha256(readFileSync(f)), adapter: null, blocked: [] }])),
    shots: [],
    overflow: [],
  };
  try {
    for (const vp of VIEWPORTS) {
      const pages = {};
      for (const role of ["fab", "legacy"]) pages[role] = await openPage(browser, vp, role, files[role]);
      for (const role of ["fab", "legacy"]) record.pages[role].adapter = pages[role].adapter?.id ?? null;
      for (const state of STATES) {
        const row = { width: vp.width, height: vp.height, state };
        const bytes = {};
        for (const role of ["fab", "legacy"]) {
          const p = pages[role];
          const note = await reach(p, state);
          const name = `${id}-${vp.width}-${state}-${role}.png`;
          bytes[role] = await p.page.screenshot({ path: path.join(out, name) });
          const o = await overflow(p.page);
          row[role] = { image: name, sha256: sha256(bytes[role]), scrollWidth: o.scrollWidth, viewport: o.width, ...(note === null ? {} : { note: `${note} (not provided)` }) };
          if (o.scrollWidth > o.width) record.overflow.push({ role, width: vp.width, state, scrollWidth: o.scrollWidth, offenders: o.offenders });
        }
        const joined = `${id}-${vp.width}-${state}.png`;
        row.sideBySide = { image: joined, sha256: sha256(await join(browser, vp, bytes.fab, bytes.legacy, path.join(out, joined))) };
        record.shots.push(row);
      }
      for (const role of ["fab", "legacy"]) {
        record.pages[role].blocked.push(...pages[role].blocked);
        await pages[role].context.close();
      }
    }
  } finally {
    await browser.close();
  }
  writeFileSync(path.join(out, "side-by-side.json"), `${JSON.stringify(record, null, 1)}\n`);
  return record;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values: v } = parseArgs({ options: { fab: { type: "string" }, legacy: { type: "string" }, out: { type: "string" }, id: { type: "string" } } });
    if (!v.fab || !v.legacy || !v.out) throw new Error("usage: side-by-side.mjs --fab <bake.html> --legacy <page.html> --out <dir> [--id <id>]");
    const fab = path.resolve(v.fab);
    const r = await run({ fab, legacy: path.resolve(v.legacy), out: path.resolve(v.out), id: v.id ?? path.basename(fab, ".html") });
    console.log(`side-by-side: ${r.shots.length * 3} images in ${v.out}`);
    for (const o of r.overflow) console.log(`${o.role} at ${o.width} px, ${o.state}: scrollWidth ${o.scrollWidth} px over viewport (measured)\n  ${o.offenders.join("\n  ")}`);
    process.exit(r.overflow.length === 0 ? 0 : 1);
  } catch (e) {
    console.error(`side-by-side: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
  }
}
