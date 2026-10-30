// The CDN fixture page (tools/fixtures/cdn) mounts a design bench from the
// staged dist/cdn files through one import map, over http. Needs
// npm run build:lib, pack:lib and build:design for each design.
// Run: npx playwright test -c tools/smoke/playwright.config.ts cdn.spec.ts

import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { canvasSize, editParam, expectedHash, ORIGIN, settledHash, watchHost } from "./hosts.ts";
import { ROOT } from "./measure.ts";

const DESIGNS: ReadonlyArray<{ id: string; param: string }> = [{ id: "toggle", param: "capD" }, { id: "flex-pair", param: "W" }];

for (const { id, param } of DESIGNS) {
  test(`cdn page mounts ${id} from dist/cdn: build at defaults, canvas, edit, BENCH hook`, async ({ page }) => {
    test.skip(!existsSync(path.join(ROOT, "out/design", id, "design.json")) || !existsSync(path.join(ROOT, "out/publish/index.json")), "not run: out/publish or out/design is absent; run build:lib, pack:lib and build:design");
    const w = watchHost(page);
    await page.goto(`${ORIGIN}/tools/fixtures/cdn/index.html?design=${id}`);
    const first = await settledHash(page, "globalThis.hbfCdn");
    expect(first).toBe(expectedHash(id));
    expect(await page.evaluate(() => (globalThis as unknown as { BENCH?: unknown }).BENCH !== undefined)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.dataset["kernel"] ?? "unset")).toBe("unset");
    const size = await canvasSize(page.locator("#app"));
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    if (param !== "") {
      const next = await editParam(page, "globalThis.hbfCdn", param, 1);
      expect(next).not.toBe(first);
      // BENCH reads the same build the controller holds.
      expect(await page.evaluate(() => (globalThis as unknown as { BENCH: { buildHash: string } }).BENCH.buildHash)).toBe(next);
    }
    expect(w.outside).toEqual([]);
    expect(w.errors).toEqual([]);
  });
}
