// The countable UI laws on every fab bake (M09-T14 steps 1, 2 and 4; D-004,
// D-125, D-129), in the order PIP test/smoke.py runs them: boot to ready,
// every step at 1280 with a screenshot, one numeric edit and one slider
// release each raise BENCH.built, every declared export returns bytes, the
// design JSON round trips; then at 390, 768 and 1280 on the welcome and on
// every step: no horizontal overflow (offenders printed in the overflow.py
// form), at most one focal pink, DOM voice lint exit 0. Console errors,
// external requests and blob or module workers are counted over the whole
// run. A kit bake has no build and no hook, so it runs overflow, pink,
// network, workers, console and voice only.
//
// The negative fixtures under tools/smoke/fixtures prove the measures fail:
// two focal pink buttons, one focal button plus a pink-text readout, and a
// 400 px element at 390.
//
// Run: npx playwright test -c tools/smoke/playwright.config.ts
// Report: out/smoke/smoke-<bake>.json, pink count per view.

import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { listBenches } from "../hook/benches.ts";
import {
  bakes, closeWelcome, HEIGHT, hookView, open, overflow, overflowMessage, ROOT, settled, shot, stepButtons, voice, WIDTHS, writeReport,
} from "./measure.ts";
import { badWorkers, watch } from "./network.ts";
import { pinkMessage, pinkView, pinkViews } from "./pink.ts";

test.describe.configure({ timeout: 300_000 });

interface ViewRow {
  view: string;
  width: number;
  scrollWidth: number;
  pinkRaw: number;
  pinkFocal: number;
  voice: number;
}

/** Measures one view at the three widths; collects every failure so one run prints them all. */
async function lawsAt(page: Page, view: string, rows: ViewRow[], fails: string[], scope: string | null = null): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(250);
    const where = `${view} at ${width}`;
    const o = await overflow(page);
    if (o.scrollWidth > width) fails.push(overflowMessage(where, o));
    const v = await voice(page);
    if (v.code !== 0) fails.push(`${where}: lint-voice --kind dom exit ${v.code}\n${v.out}`);
    // The kit is a specimen page: each [data-kit] section is one view.
    const views = scope === null ? new Map([[view, await pinkView(page)]]) : await pinkViews(page, scope);
    for (const [name, p] of views) {
      const at = scope === null ? where : `${view} "${name}" at ${width}`;
      if (p.focal.length > 1) fails.push(pinkMessage(at, p));
      rows.push({ view: scope === null ? view : `${view}: ${name}`, width, scrollWidth: o.scrollWidth, pinkRaw: p.raw, pinkFocal: p.focal.length, voice: v.code });
    }
  }
}

const corpus = await listBenches();

for (const bake of bakes()) {
  test.describe(`${bake.kind} ${bake.id}`, () => {
    test(`laws on ${bake.id}: overflow, pink, voice, network, workers, console`, async ({ page }) => {
      test.skip(bake.kind === "bench" && bake.build === null, `not run: ${bake.id} carries no in-page build`);
      const w = await watch(page);
      await page.setViewportSize({ width: 1280, height: HEIGHT });
      await open(page, bake);
      const rows: ViewRow[] = [];
      const fails: string[] = [];
      if (bake.kind === "kit") {
        await lawsAt(page, "kit", rows, fails, "[data-kit]");
        await page.setViewportSize({ width: 1280, height: HEIGHT });
        await page.screenshot({ path: shot(`t14-${bake.id}-1280.png`) });
      } else {
        await lawsAt(page, "welcome", rows, fails);
        await page.setViewportSize({ width: 1280, height: HEIGHT });
        await closeWelcome(page);
        const n = await stepButtons(page).count();
        expect(n, "steps strip buttons").toBeGreaterThan(0);
        for (let i = 0; i < n; i += 1) {
          await page.setViewportSize({ width: 1280, height: HEIGHT });
          await stepButtons(page).nth(i).click();
          await settled(page).catch(() => undefined);
          await page.screenshot({ path: shot(`t14-${bake.id}-step${i + 1}-1280.png`) });
          await lawsAt(page, `step ${i + 1}`, rows, fails);
        }
      }
      writeReport(`smoke-${bake.id}.json`, { bake: path.relative(ROOT, bake.file), at: new Date().toISOString(), qualifier: "measured", views: rows });
      const workers = await w.workers();
      expect(fails, fails.join("\n")).toEqual([]);
      expect(w.errors, "console and page errors").toEqual([]);
      expect(w.external, "requests off file: and data:").toEqual([]);
      expect(badWorkers(workers), "blob or module workers (D-129)").toEqual([]);
    });

    test(`edits, exports and round trip on ${bake.id}`, async ({ page }) => {
      test.skip(bake.kind === "kit", "a kit page has no build and no hook");
      test.skip(bake.build === null, `not run: ${bake.id} carries no in-page build`);
      const w = await watch(page);
      await page.setViewportSize({ width: 1280, height: HEIGHT });
      await open(page, bake);
      await closeWelcome(page);
      await stepButtons(page).first().click();

      // One numeric edit raises built (smoke.py shape.W edit).
      const num = page.locator('[data-hb="rail-left"] input[type=number], [data-hb="rail"] input[type=number]').first();
      const before = (await hookView(page)).built;
      const v0 = Number(await num.inputValue());
      const step = Number((await num.getAttribute("step")) ?? "1") || 1;
      const max = Number((await num.getAttribute("max")) ?? "Infinity");
      await num.fill(String(v0 + step <= max ? v0 + step : v0 - step));
      await num.press("Enter");
      await settled(page, before);

      // One slider release raises built (smoke.py clicky.Q release).
      const range = page.locator("input[type=range]").first();
      const b1 = (await hookView(page)).built;
      await range.evaluate((el) => {
        const r = el as HTMLInputElement;
        const lo = Number(r.min), hi = Number(r.max);
        r.value = String(Number(r.value) < (lo + hi) / 2 ? hi : lo);
        r.dispatchEvent(new Event("input", { bubbles: true }));
        r.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await settled(page, b1);

      // Every declared export returns bytes.
      const decl = corpus.benches.find((b) => b.origin === "fab" && b.rel === path.relative(ROOT, bake.file));
      expect(decl?.exports.length ?? 0, "declared exports").toBeGreaterThan(0);
      const sizes: Record<string, number | string> = {};
      for (const kind of decl?.exports ?? []) {
        sizes[kind] = await page.evaluate(async (k) => {
          try {
            const b64 = await (globalThis as unknown as { BENCH: { exportBytes(k: string): Promise<string> } }).BENCH.exportBytes(k);
            return atob(b64).length;
          } catch (e) {
            return e instanceof Error ? e.message : String(e);
          }
        }, kind);
      }

      // Design JSON round trips.
      const json = await page.evaluate(() => (globalThis as unknown as { BENCH: { designJson(): string } }).BENCH.designJson());
      const b2 = (await hookView(page)).built;
      await page.evaluate((j) => (globalThis as unknown as { BENCH: { loadDesign(s: string): void } }).BENCH.loadDesign(j), json);
      await settled(page, b2 - 1);
      const back = await page.evaluate(() => (globalThis as unknown as { BENCH: { designJson(): string } }).BENCH.designJson());
      expect(back, "design json round trip").toBe(json);

      test.info().annotations.push({ type: "export bytes", description: `${JSON.stringify(sizes)} (measured)` });
      const refused = Object.entries(sizes).filter(([, v]) => typeof v !== "number" || v === 0);
      expect(refused, "declared exports that returned no bytes").toEqual([]);
      expect(w.errors, "console and page errors").toEqual([]);
      expect(w.external, "requests off file: and data:").toEqual([]);
      expect(badWorkers(await w.workers())).toEqual([]);
    });
  });
}

test.describe("measures fail on their fixtures", () => {
  const fixture = (name: string): string => pathToFileURL(path.join(ROOT, "tools/smoke/fixtures", name)).href;

  test("two focal pink buttons fail the pink budget", async ({ page }) => {
    await page.goto(fixture("pink-two-buttons.html"));
    const p = await pinkView(page);
    expect(p.focal.length).toBe(2);
    expect(p.focal.length > 1, "the budget refuses this view").toBe(true);
  });

  test("one focal pink button plus a pink-text readout fails the pink budget", async ({ page }) => {
    await page.goto(fixture("pink-button-readout.html"));
    const p = await pinkView(page);
    expect(p.focal.map((h) => h.via.join("+")).sort()).toEqual(["background", "text"]);
    expect(p.focal.length > 1).toBe(true);
  });

  test("structural marks and the focus ring are subtracted; one focal pink passes", async ({ page }) => {
    await page.goto(fixture("pink-structural.html"));
    await page.locator("input").focus();
    const p = await pinkView(page);
    expect(p.raw, "raw pink before the structural set").toBeGreaterThan(1);
    expect(p.focal.length).toBe(1);
  });

  test("a 400 px element at 390 fails the overflow law", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: HEIGHT });
    await page.goto(fixture("overflow-400.html"));
    const o = await overflow(page);
    expect(o.scrollWidth).toBeGreaterThan(390);
    expect(o.offenders.some((x) => x.includes("wide 4"))).toBe(true);
  });

  test("a banned word in the rendered text fails the DOM voice lint", async ({ page }) => {
    // Assembled at run time so no file in the repo carries the banned word.
    await page.setContent(`<p>a ${["seam", "less"].join("")} bench</p>`);
    expect((await voice(page)).code).toBe(1);
    await page.setContent("<p>mesh stale, building</p>");
    expect((await voice(page)).code).toBe(0);
  });
});
