// The touch-only pass (M09-T14 step 3, D-125 touch parity at 390): project
// touch-390 (hasTouch, isMobile, 390 x 844), no mouse calls. Every step is
// reached by tap; a numeric field is set by tap and typing; a range is
// dragged with touch points; a drive pad key is held with a touch point;
// the stage is pinch-zoomed and two-finger panned through CDP
// Input.dispatchTouchEvent with two touch points; an export runs by tap.
// Any part that cannot be completed fails the pass.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --project touch-390

import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
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

/**
 * A point on the stage where the viewer receives the touches: the points
 * x +- half at y and at y + drop all resolve to hb-viewer, not to an overlay
 * (a bench with a camera strip covers the middle of the stage at 390).
 */
async function freePoint(page: Page, half: number, drop: number): Promise<Pt> {
  const p = await page.evaluate(([h, d]) => {
    const r = document.querySelector("hb-viewer")!.getBoundingClientRect();
    const hit = (x: number, y: number): boolean => document.elementFromPoint(x, y)?.tagName === "HB-VIEWER";
    const top = Math.max(r.y, 0);
    const bottom = Math.min(r.y + r.height, innerHeight);
    for (let y = bottom - (d as number) - 2; y >= top; y -= 4) {
      for (let x = r.x + r.width / 2, k = 0; k < r.width / 2 - (h as number); k += 6) {
        for (const cx of k === 0 ? [x] : [x - k, x + k]) {
          if ([-1, 1].every((s) => hit(cx + s * (h as number), y) && hit(cx + s * (h as number), y + (d as number)))) return { x: cx, y };
        }
      }
    }
    return null;
  }, [half, drop]);
  if (p === null) throw new Error("no free point on the stage for two touch points");
  return p;
}

interface Cam { dist: number; target: number[] }
const cam = (page: Page): Promise<Cam> =>
  page.evaluate(() => {
    const v = document.querySelector("hb-viewer") as unknown as { viewState(): { cam: Cam } } | null;
    if (v === null) throw new Error("no hb-viewer on the stage");
    const c = v.viewState().cam;
    return { dist: c.dist, target: [...c.target] };
  });

for (const bake of bakes().filter((b) => b.kind === "bench")) {
  test(`touch-only pass on ${bake.id}`, async ({ page, browserName }) => {
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

      // A drive pad key held by a touch point. A bench declares its drive pad by
      // rendering the pad; a bench with none has no key to hold.
      const key = page.locator('[data-hb="drive-key"]').first();
      if ((await page.locator('[data-hb="drive-key"]').count()) === 0) {
        done.push(`drive key skipped: ${bake.id} declares no drive pad`);
      } else {
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
      const stage = page.locator('[data-hb="stage"] hb-viewer');
      const c = await freePoint(page, 90, 24);
      const c0 = await cam(page);
      await glide(cdp, [{ x: c.x - 30, y: c.y }, { x: c.x + 30, y: c.y }], [{ x: c.x - 90, y: c.y }, { x: c.x + 90, y: c.y }]);
      const c1 = await cam(page);
      expect(c1.dist, "pinch out moves the camera in").toBeLessThan(c0.dist);
      await glide(cdp, [{ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }], [{ x: c.x - 40, y: c.y + 24 }, { x: c.x + 40, y: c.y + 24 }]);
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

      await page.screenshot({ path: shot(`t14-${bake.id}-touch-390.png`) });
      expect(w.errors, "console and page errors").toEqual([]);
      expect(w.external).toEqual([]);
      expect(badWorkers(await w.workers())).toEqual([]);
    } finally {
      test.info().annotations.push({ type: "completed", description: done.join("; ") });
    }
  });
}
