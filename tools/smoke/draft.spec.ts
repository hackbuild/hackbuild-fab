// An hbf draft page offline (plan v9 3.1, R1-engine-24): the page hbf draft
// baked opens from file:// with no request off the file and no console
// error, builds, shows the DRAFT banner in the status strip, carries its
// sources in the application/hbf-draft+json block, and its in-page 3mf
// carries the model metadata hbf:draft = 1. The click spring chase declares
// 3mf only, so the card line is covered by packages/pipeline draft-mark.test.ts.
//
// Make the page, then run:
//   node core/bin/hbf.mjs draft "access switch" --from click-spring-window --json
//   npx playwright test -c tools/smoke/playwright.config.ts draft.spec.ts
// HBF_DRAFT_PAGE names another draft page.

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import { expect, test } from "@playwright/test";
import { DRAFT_BLOCK_TYPE, DRAFT_META_KEY, DRAFT_META_VALUE } from "../../spec/draft.ts";
import { ROOT } from "./measure.ts";
import { watch } from "./network.ts";

const PAGE = process.env["HBF_DRAFT_PAGE"] ?? path.join(ROOT, ".hbf/drafts/access-switch/access-switch.html");

test.describe.configure({ mode: "serial", timeout: 240_000 });

interface PageHook {
  BENCH: { settled(ms?: number): Promise<void>; buildHash: string | null; exportBytes(kind: string): Promise<string> };
}

test.beforeEach(() => {
  test.skip(!existsSync(PAGE), `not run: ${PAGE} is absent; run node core/bin/hbf.mjs draft "access switch" --from click-spring-window`);
});

test("the draft page opens offline, shows the banner, and marks its 3mf", async ({ page }) => {
  const w = await watch(page);
  await page.goto(pathToFileURL(PAGE).href);
  await page.evaluate(() => (globalThis as unknown as PageHook).BENCH.settled(120_000));
  expect(await page.evaluate(() => (globalThis as unknown as PageHook).BENCH.buildHash), "the page built").not.toBeNull();

  const banner = page.locator('[data-hb="draft-banner"]');
  await expect(banner, "draft banner in the status strip").toBeVisible();
  expect(await page.locator('[data-hb="status"] [data-hb="draft-banner"]').count(), "banner sits in the status strip").toBe(1);

  const block = await page.evaluate((t) => document.querySelector(`script[type="${t}"]`)?.textContent ?? null, DRAFT_BLOCK_TYPE);
  expect(block, "draft block").not.toBeNull();
  const parsed = JSON.parse(block as string) as { chase: string; build: string; defHash: string };
  expect(parsed.chase).toContain("defineChase");
  expect(parsed.defHash).toMatch(/^[0-9a-f]{64}$/);

  const b64 = await page.evaluate(() => (globalThis as unknown as PageHook).BENCH.exportBytes("3mf"));
  const zip = await JSZip.loadAsync(Buffer.from(b64, "base64"));
  const model = await zip.file("3D/3dmodel.model")?.async("string");
  expect(model, "3mf model part").toBeDefined();
  expect(model).toContain(`<metadata name="${DRAFT_META_KEY}">${DRAFT_META_VALUE}</metadata>`);

  expect(statSync(PAGE).size, "page bytes, at most 16 MB (D-129)").toBeLessThanOrEqual(16_777_216);
  expect(w.errors, "console and page errors").toEqual([]);
  expect(w.external, "requests off file: and data:").toEqual([]);
});
