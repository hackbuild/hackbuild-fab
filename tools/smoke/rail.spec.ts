// M09-T08 acceptance in a real browser, on the flex-pair bake
// (dist/bench/flex-pair.html, `node tools/bake/bake.mjs
// reference/keys/flex-pair/bake.json`), opened as shipped: every commit
// runs the library build and checks in the page (D-264): a range drag touches on input and commits once on
// release (BENCH.rev rises by 1); adding a second key rebuilds with two
// caps; the reset mark on a changed row restores the default in one commit.
//
// Run: npx playwright test tools/smoke/rail.spec.ts
// Screenshots at 390 and 1280 px go to SHOTS_DIR, default out/smoke/shots
// under the repo (SHOTS in tools/smoke/measure.ts).

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { SHOTS } from "./measure.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BAKE = path.resolve(ROOT, process.env["RAIL_BENCH"] ?? "dist/bench/flex-pair.html");

test.use({ channel: "chrome", viewport: { width: 1280, height: 800 } });
test.describe.configure({ mode: "serial", timeout: 120_000 });

interface Hook { ready: boolean; rev: number; built: number; busy: boolean; state: Record<string, unknown>; model: { part: { bodies: { id: string }[] } } | null }

test.beforeEach(() => {
  test.skip(!existsSync(BAKE), `not run: ${path.relative(ROOT, BAKE)} is absent; bake it first`);
});

const hook = (page: Page): Promise<Hook> =>
  page.evaluate(() => {
    const B = (globalThis as unknown as { BENCH: Hook }).BENCH;
    return { ready: B.ready, rev: B.rev, built: B.built, busy: B.busy, state: B.state, model: B.model === null ? null : { part: { bodies: B.model.part.bodies.map((b) => ({ id: b.id })) } } };
  });

async function settled(page: Page): Promise<Hook> {
  await page.waitForFunction(() => {
    const B = (globalThis as unknown as { BENCH: Hook }).BENCH;
    return B.ready && !B.busy && B.built === B.rev;
  }, undefined, { timeout: 90_000 });
  return hook(page);
}

async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(BAKE).href);
  await settled(page);
  const dismiss = page.locator('[data-hb="welcome-dismiss"]');
  if (await dismiss.isVisible()) await dismiss.click();
  return errors;
}

test("a range drag touches on input and commits once on release", async ({ page }) => {
  const errors = await open(page);
  const before = await hook(page);
  const range = page.locator('[data-field="W"] input[type="range"]');
  const box = await range.boundingBox();
  if (box === null) throw new Error("width range has no box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.4, y);
  await page.mouse.down();
  for (const f of [0.5, 0.6, 0.7]) await page.mouse.move(box.x + box.width * f, y, { steps: 3 });
  const mid = await hook(page);
  expect(mid.rev, "input is touch: no rev while dragging").toBe(before.rev);
  expect(mid.state["W"]).not.toBe(before.state["W"]);
  await expect(page.locator('[data-hb="chip-mesh"]')).toHaveText("mesh stale");
  await page.mouse.up();
  const after = await settled(page);
  expect(after.rev, "release is one commit").toBe(before.rev + 1);
  expect(after.built).toBe(after.rev);
  await expect(page.locator('[data-hb="chip-mesh"]')).toHaveText("mesh current");
  expect(errors).toEqual([]);
});

test("adding a second key rebuilds with two caps", async ({ page }) => {
  const errors = await open(page);
  const caps = (h: Hook): number => h.model?.part.bodies.filter((b) => /^cap\d+$/.test(b.id)).length ?? -1;
  const before = await hook(page);
  expect(caps(before)).toBe(1);
  await page.locator(".hb-steps .hb-tab").nth(1).click();
  // A new key lands at the item defaults, x 0; key 1 moves off centre first,
  // as the chase's two-key preset places them (x -14 and 14), or the
  // build refuses cap2 as covered by cap1.
  const x1 = page.locator('[data-path="keys.0.x"] input[type="number"]');
  await x1.fill("-14");
  await x1.press("Enter");
  const moved = await settled(page);
  expect(moved.rev).toBe(before.rev + 1);
  await page.locator('[data-hb="instance-add"]').click();
  const after = await settled(page);
  expect(after.rev, "add is one commit").toBe(moved.rev + 1);
  expect((after.state["keys"] as unknown[]).length).toBe(2);
  expect(caps(after)).toBe(2);
  expect(errors).toEqual([]);
});

test("the reset mark restores the default in one commit", async ({ page }) => {
  const errors = await open(page);
  const num = page.locator('[data-field="W"] input[type="number"]');
  await num.fill("72");
  await num.press("Enter");
  await num.blur();
  const changed = await settled(page);
  expect(changed.state["W"]).toBe(72);
  const reset = page.locator('[data-field="W"] .hb-prow-reset');
  await expect(reset).toBeVisible();
  await reset.click();
  const after = await settled(page);
  expect(after.rev).toBe(changed.rev + 1);
  expect(after.state["W"]).toBe(60);
  await expect(reset).toBeHidden();
  expect(errors).toEqual([]);
});

test("screenshots at 390 and 1280 px with a built model", async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await open(page);
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll, `horizontal scroll at ${width} px`).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(SHOTS, `t08-flex-pair-rail-${width}.png`) });
    await page.close();
  }
});
