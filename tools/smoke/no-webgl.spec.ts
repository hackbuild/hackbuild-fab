// A host with no WebGL (hosted Firefox and WebKit runners with no GL driver,
// FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS) opens a bench without an uncaught
// error. An init script makes getContext answer null for webgl and webgl2
// before any page script runs, on the toggle bake: the stage says the 3D
// view is off and what still works, the viewer is marked, BENCH builds to
// expected/build.json, the log carries the same line, the export step still
// writes the design file, and no page error or console error appears.
// Needs the bake in dist/bench (node tools/bake/bake.mjs designs/toggle/bake.json).
// Run: npx playwright test -c tools/smoke/playwright.config.ts no-webgl.spec.ts --project desktop

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { bakes, closeWelcome, open, ROOT, settled, shot, stepButtons } from "./measure.ts";

test.describe.configure({ timeout: 300_000 });

const ID = "toggle";
const DESIGN = "designs/toggle";

test(`@all-projects ${ID} bake with no webgl context says the 3d view is off and still builds`, async ({ page }, info) => {
  const bake = bakes().find((b) => b.kind === "bench" && b.id === ID);
  test.skip(bake === undefined || !existsSync(bake.file), `not run: dist/bench/${ID}.html is absent; bake it first`);
  if (bake === undefined) return;
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    for (const proto of [HTMLCanvasElement.prototype, typeof OffscreenCanvas === "undefined" ? null : OffscreenCanvas.prototype]) {
      if (proto === null) continue;
      const real = proto.getContext as (this: unknown, type: string, ...rest: unknown[]) => unknown;
      (proto as unknown as { getContext: unknown }).getContext = function (this: unknown, type: string, ...rest: unknown[]): unknown {
        return /^(experimental-)?webgl2?$/.test(type) ? null : real.call(this, type, ...rest);
      };
    }
  });
  await open(page, bake);
  await closeWelcome(page);

  const viewer = page.locator('[data-hb="stage"] hb-viewer');
  await expect(viewer, "the viewer is marked").toHaveAttribute("data-webgl", "none");
  const line = page.locator('[data-hb="stage"] [data-hb="no-webgl"]');
  await expect(line, "the stage line shows").toBeVisible();
  await expect(line).toContainText("no webgl");
  await expect(line).toContainText("build, checks and exports still run");
  expect(await viewer.evaluate((v) => (v as unknown as { webgl: boolean }).webgl), "viewer.webgl").toBe(false);

  const hash = await page.evaluate(() => (globalThis as unknown as { BENCH: { buildHash: string | null } }).BENCH.buildHash);
  const expected = (JSON.parse(readFileSync(path.join(ROOT, DESIGN, "expected/build.json"), "utf8")) as { buildHash: string }).buildHash;
  expect(hash, `${ID} buildHash with no webgl`).toBe(expected);

  await page.locator('[data-hb="log-toggle"]').click();
  await expect(page.locator('[data-hb="log-drawer"]'), "the log names the failure").toContainText("3d view off");
  await page.locator('[data-hb="log-toggle"]').click();

  // The checks and exports are the shell's: the export step opens and the design file downloads.
  const n = await stepButtons(page).count();
  await stepButtons(page).nth(n - 1).click();
  await settled(page).catch(() => undefined);
  const dl = page.waitForEvent("download");
  await page.locator('[data-hb="export"][data-kind="json"]').click();
  expect((await dl).suggestedFilename(), "the design file download").toMatch(/\.json$/);

  await page.screenshot({ path: shot(`no-webgl-${info.project.name}-${ID}.png`) });
  expect(errors, "console and page errors").toEqual([]);
});
