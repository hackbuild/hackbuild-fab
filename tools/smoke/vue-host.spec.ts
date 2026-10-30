// The Vue host fixture (tools/fixtures/vue-host, built from the staged
// tarballs by build.mjs) shows TOGGLE twice: createBench().mount(el) in a
// child's onMounted, and <BenchView>. Needs npm run build:lib, pack:lib,
// build:design and node tools/fixtures/vue-host/build.mjs.
// Run: npx playwright test -c tools/smoke/playwright.config.ts vue-host.spec.ts

import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { canvasSize, editParam, expectedHash, ORIGIN, settledHash, watchHost } from "./hosts.ts";
import { ROOT } from "./measure.ts";

test.describe.configure({ mode: "serial" });

test("the Vue host mounts TOGGLE twice from the tarballs with separate state and no BENCH global", async ({ page }) => {
  test.skip(!existsSync(path.join(ROOT, "out/fixtures/vue-host/index.html")), "not run: out/fixtures/vue-host is absent; run node tools/fixtures/vue-host/build.mjs");
  const w = watchHost(page);
  await page.goto(`${ORIGIN}/out/fixtures/vue-host/index.html`);
  const want = expectedHash("toggle");
  const regions = [["hbfHost.mount", "#region-mount"], ["hbfHost.view", "#region-view"]] as const;
  for (const [expr, sel] of regions) {
    expect(await settledHash(page, expr), `${sel} first build`).toBe(want);
    const size = await canvasSize(page.locator(sel));
    expect(size.width, `${sel} canvas width`).toBeGreaterThan(0);
    expect(size.height, `${sel} canvas height`).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => (globalThis as unknown as { BENCH?: unknown }).BENCH)).toBeUndefined();

  // An edit in one region leaves the other's state and buildHash as they were.
  const edited = await editParam(page, "hbfHost.mount", "capD", 1);
  expect(edited).not.toBe(want);
  expect(await settledHash(page, "hbfHost.view")).toBe(want);
  expect(await page.evaluate(() => (globalThis as unknown as { hbfHost: { view: { core: { state: Record<string, unknown> } } } }).hbfHost.view.core.state["capD"])).toBe(14);
  const edited2 = await editParam(page, "hbfHost.view", "neckD", 0.1);
  expect(edited2).not.toBe(want);
  expect(await settledHash(page, "hbfHost.mount")).toBe(edited);

  expect(w.outside).toEqual([]);
  expect(w.errors).toEqual([]);
});
