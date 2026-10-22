// The touch-only pass (M09-T14 step 3, D-125 touch parity at 390): project
// touch-390 (hasTouch, isMobile), run at 390 and at 1280 wide, 844 high, no
// mouse calls. Every step is
// reached by tap; a numeric field is set by tap and typing; a range is
// dragged with touch points; a drive pad key is held with a touch point;
// the stage is pinch-zoomed and two-finger panned through CDP
// Input.dispatchTouchEvent with two touch points; an export runs by tap.
// Any part that cannot be completed fails the pass.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --project touch-390

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { findManifests } from "../bake/bake.mjs";
import { bakes, closeWelcome, hookView, open, settled, shot, stepButtons } from "./measure.ts";
import { badWorkers, watch } from "./network.ts";

test.describe.configure({ timeout: 300_000 });

type Pt = { x: number; y: number };

async function touch(cdp: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", pts: Pt[]): Promise<void> {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map((p, id) => ({ x: p.x, y: p.y, id, radiusX: 4, radiusY: 4, force: 1 })) });
}

/** Moves the touch points from `from` to `to` in `n` steps. */
async function glide(cdp: CDPSession, from: Pt[], to: Pt[], n = 8): Promise<void> {
  await touch(cdp, "touchStart", from);
  for (let i = 1; i <= n; i += 1) {
    await touch(cdp, "touchMove", from.map((p, k) => ({ x: p.x + ((to[k] as Pt).x - p.x) * (i / n), y: p.y + ((to[k] as Pt).y - p.y) * (i / n) })));
  }
  await touch(cdp, "touchEnd", []);
}

async function centre(l: Locator): Promise<Pt> {
  const b = await l.boundingBox();
  if (b === null) throw new Error("no box to touch");
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

const VIEWER = '[data-hb="stage"] hb-viewer';

/**
 * The overlays a bake's bench declares: views.overlays of the bench.ts
 * beside the bake.json that carries the bake id.
 */
async function overlays(id: string): Promise<readonly string[]> {
  const file = (findManifests() as string[]).find((f) => (JSON.parse(readFileSync(f, "utf8")) as { id: string }).id === id);
  if (file === undefined) throw new Error(`no bake.json carries the id ${id}`);
  const mod = (await import(pathToFileURL(path.join(path.dirname(file), "bench.ts")).href)) as { bench?: { views: { overlays: readonly string[] } } };
  if (mod.bench === undefined) throw new Error(`${id}: bench.ts exports no bench`);
  return mod.bench.views.overlays;
}

/**
 * A point c on the stage where the viewer receives every touch the glides
 * start or end at: each c + offset resolves to the stage viewer, never to an
 * overlay (a bench with a camera strip covers the middle of the stage at 390).
 */
async function freePoint(page: Page, offsets: readonly Pt[]): Promise<Pt> {
  const p = await page.evaluate(([sel, offs]) => {
    const v = document.querySelector(sel as string);
    if (v === null) return null;
    const r = v.getBoundingClientRect();
    const os = offs as Pt[];
    const hit = (x: number, y: number): boolean => document.elementFromPoint(x, y) === v;
    const top = Math.max(r.y, 0) - Math.min(...os.map((o) => o.y));
    const bottom = Math.min(r.y + r.height, innerHeight) - Math.max(...os.map((o) => o.y)) - 2;
    const reach = r.width / 2 - Math.max(...os.map((o) => Math.abs(o.x)));
    for (let y = bottom; y >= top; y -= 4) {
      for (let k = 0; k < reach; k += 6) {
        for (const x of k === 0 ? [r.x + r.width / 2] : [r.x + r.width / 2 - k, r.x + r.width / 2 + k]) {
          if (os.every((o) => hit(x + o.x, y + o.y))) return { x, y };
        }
      }
    }
    return null;
  }, [VIEWER, offsets] as const);
  if (p === null) throw new Error("no free point on the stage for the two-finger glides");
  return p;
}

interface Cam { dist: number; target: number[] }
const cam = (page: Page): Promise<Cam> =>
  page.evaluate((sel) => {
    const v = document.querySelector(sel) as unknown as { viewState(): { cam: Cam } } | null;
    if (v === null) throw new Error("no hb-viewer on the stage");
    const c = v.viewState().cam;
    return { dist: c.dist, target: [...c.target] };
  }, VIEWER);

/** The two glides on the stage, as offsets from the free point: start and end of each finger. */
const PINCH = { from: [{ x: -30, y: 0 }, { x: 30, y: 0 }], to: [{ x: -90, y: 0 }, { x: 90, y: 0 }] };
const PAN = { from: [{ x: -40, y: 0 }, { x: 40, y: 0 }], to: [{ x: -40, y: 24 }, { x: 40, y: 24 }] };
const at = (c: Pt, os: readonly Pt[]): Pt[] => os.map((o) => ({ x: c.x + o.x, y: c.y + o.y }));

for (const width of [390, 1280] as const) test.describe(`at ${width}`, () => {
  test.use({ viewport: { width, height: 844 } });
  for (const bake of bakes().filter((b) => b.kind === "bench")) {
    test(`touch-only pass on ${bake.id} at ${width}`, async ({ page, browserName }) => {
      test.skip(browserName !== "chromium", "CDP touch events need chromium");
      test.skip(bake.build === null, `not run: ${bake.id} carries no in-page build`);
      const done: string[] = [];
      try {
        const w = await watch(page);
        await open(page, bake);
        const cdp = await page.context().newCDPSession(page);
        await closeWelcome(page, true);

        // Every step by tap.
        const steps = stepButtons(page);
        const n = await steps.count();
        for (let i = 0; i < n; i += 1) {
          await steps.nth(i).tap();
          await expect(page.locator('[data-hb="guide-strip"] .hb-guide-step')).toContainText(`step ${i + 1}`);
        }
        done.push(`${n} steps by tap`);

        // A numeric field by tap and typing.
        await steps.first().tap();
        const num = page.locator("input[type=number]:visible").first();
        const b0 = (await hookView(page)).built;
        const v0 = Number(await num.inputValue());
        const step = Number((await num.getAttribute("step")) ?? "1") || 1;
        const max = Number((await num.getAttribute("max")) ?? "Infinity");
        await num.tap();
        await num.press("ControlOrMeta+a");
        await page.keyboard.type(String(v0 + step <= max ? v0 + step : v0 - step));
        await page.keyboard.press("Enter");
        await settled(page, b0);
        done.push("numeric field by tap and typing");

        // A range dragged by one touch point, end to end.
        const range = page.locator("input[type=range]:visible").first();
        await range.scrollIntoViewIfNeeded();
        const rb = await range.boundingBox();
        if (rb === null) throw new Error("no visible range");
        const frac = await range.evaluate((el) => {
          const r = el as HTMLInputElement;
          return (Number(r.value) - Number(r.min)) / (Number(r.max) - Number(r.min));
        });
        const y = rb.y + rb.height / 2;
        const from = { x: rb.x + 8 + frac * (rb.width - 16), y };
        const to = { x: frac < 0.5 ? rb.x + rb.width - 2 : rb.x + 2, y };
        const r0 = await range.inputValue();
        const b1 = (await hookView(page)).built;
        await glide(cdp, [from], [to]);
        await settled(page, b1);
        expect(await range.inputValue(), "range value after the drag").not.toBe(r0);
        done.push("range by touch drag");

        // A drive pad key held by a touch point. The bench's declared overlays
        // say whether it has a pad; a declared pad must render.
        if (!(await overlays(bake.id)).includes("drive")) {
          done.push(`drive key skipped: ${bake.id} declares no drive overlay`);
        } else {
          const key = page.locator('[data-hb="drive-key"]').first();
          await expect(key, `${bake.id} declares a drive pad`).toBeVisible();
          const read = page.locator('[data-hb="drive-read"]');
          const idle = await read.innerText();
          const kp = await centre(key);
          await touch(cdp, "touchStart", [kp]);
          await expect(read).not.toHaveText(idle);
          await expect(key).toHaveClass(/is-on/);
          await touch(cdp, "touchEnd", []);
          await expect(read).toHaveText(idle, { timeout: 400 });
          done.push("drive key held by touch");
        }

        // Pinch zoom, then a two-finger pan, on the stage.
        const c = await freePoint(page, [...PINCH.from, ...PINCH.to, ...PAN.from, ...PAN.to]);
        const c0 = await cam(page);
        await glide(cdp, at(c, PINCH.from), at(c, PINCH.to));
        const c1 = await cam(page);
        expect(c1.dist, "pinch out moves the camera in").toBeLessThan(c0.dist);
        await glide(cdp, at(c, PAN.from), at(c, PAN.to));
        const c2 = await cam(page);
        expect(c2.target, "two-finger pan moves the target").not.toEqual(c1.target);
        done.push("pinch and two-finger pan");

        // An export by tap on the export step.
        await steps.nth(n - 1).tap();
        await settled(page).catch(() => undefined);
        const json = page.locator('[data-hb="export"][data-kind="json"]');
        const dl = page.waitForEvent("download");
        await json.tap();
        expect((await dl).suggestedFilename(), "the design file download").toMatch(/\.json$/);
        done.push("json export by tap");

        await page.screenshot({ path: shot(`t14-${bake.id}-touch-${width}.png`) });
        expect(w.errors, "console and page errors").toEqual([]);
        expect(w.external).toEqual([]);
        expect(badWorkers(await w.workers())).toEqual([]);
      } finally {
        test.info().annotations.push({ type: "completed", description: done.join("; ") });
      }
    });
  }
});
