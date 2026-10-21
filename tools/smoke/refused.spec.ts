// A refused build keeps the last good model and says why (D-643, R1-fix-26).
// A bake opens from file://, a range end the kernel refuses is written
// through BENCH.state, and the page must keep drawing the last good model
// inside the stage, name the refusal under the guide, log one line naming
// field, value and range, and keep every export closed. The default is
// TOGGLE at minGap 0.8, whose union refuses (R1-fix-21 sweep, computed);
// HBF_REFUSED_BAKE, HBF_REFUSED_FIELD and HBF_REFUSED_VALUE pick another.
// TOGGLE has no committed bench.ts on main, so its bake is made for the run;
// without the page the test reports not run.
//
// Run: npx playwright test -c tools/smoke/playwright.config.ts refused.spec.ts

import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { closeWelcome, ROOT, settled } from "./measure.ts";

const BAKE = process.env["HBF_REFUSED_BAKE"] ?? path.join(ROOT, "dist/bench/toggle.html");
const FIELD = process.env["HBF_REFUSED_FIELD"] ?? "minGap";
const VALUE = Number(process.env["HBF_REFUSED_VALUE"] ?? "0.8");

interface Inspect { screen: [number, number, number, number] | null; width: number; height: number }
interface Hooked {
  BENCH: { state: Record<string, unknown>; busy: boolean; error: string | null; buildHash: string | null; log: string[]; exportBytes(kind: string): Promise<string> };
}

test("a refused range end keeps the last good model inside the stage and names the refusal", async ({ page }) => {
  test.skip(!existsSync(BAKE), `not run: ${path.relative(ROOT, BAKE)} is not baked`);
  test.setTimeout(240_000);
  await page.goto(pathToFileURL(BAKE).href);
  await page.waitForFunction(() => (globalThis as unknown as { BENCH?: { ready: boolean } }).BENCH?.ready === true, undefined, { timeout: 120_000 });
  await settled(page);
  await closeWelcome(page);

  const inspect = (): Promise<Inspect> => page.evaluate(() => (document.querySelector("hb-viewer") as unknown as { inspect(): Inspect }).inspect());
  const good = await page.evaluate(() => (globalThis as unknown as Hooked).BENCH.buildHash);
  expect(good, "a first build").not.toBeNull();
  const n0 = await page.evaluate(() => (globalThis as unknown as Hooked).BENCH.log.length);

  await page.evaluate(([f, v]) => {
    const h = (globalThis as unknown as Hooked).BENCH;
    h.state = { ...h.state, [f as string]: v };
  }, [FIELD, VALUE] as const);
  await page.waitForFunction(() => {
    const h = (globalThis as unknown as Hooked).BENCH;
    return !h.busy && h.error !== null;
  }, undefined, { timeout: 120_000 });
  await page.waitForTimeout(200);

  const after = await page.evaluate(() => {
    const h = (globalThis as unknown as Hooked).BENCH;
    return { hash: h.buildHash, error: h.error, log: h.log };
  });
  expect(after.hash, "the model drawn is the last good build").toBe(good);
  const v = await inspect();
  expect(v.screen, "something drawn").not.toBeNull();
  const [l, t, r, b] = v.screen as [number, number, number, number];
  expect(l >= -1 && t >= -1 && r <= v.width + 1 && b <= v.height + 1, `model box ${[l, t, r, b].map(Math.round).join(", ")} px inside ${v.width} x ${v.height} px`).toBe(true);

  const line = await page.locator('[data-hb="refused"]').textContent();
  expect(line ?? "").toMatch(new RegExp(`^build refused at ${FIELD} ${VALUE}: E_[A-Z_]+, .+\\. showing the last good model$`));
  const ranged = after.log.slice(n0).filter((x) => x.startsWith(`build refused at the range end ${FIELD} ${VALUE} (range `));
  expect(ranged, after.log.slice(n0).join("\n")).toHaveLength(1);

  const why = await page.evaluate(() => (globalThis as unknown as Hooked).BENCH.exportBytes("3mf").then(() => "exported", (e: Error) => e.message));
  expect(why).toBe(`export closed: the last build refused. change ${FIELD} until it builds, then export.`);
  await page.locator('[data-hb="steps"] .hb-tab').last().click();
  const buttons = page.locator('[data-hb="export"]');
  await expect(buttons.first()).toBeVisible();
  for (const d of await buttons.evaluateAll((els) => els.map((e) => (e as HTMLButtonElement).disabled))) expect(d).toBe(true);
  await expect(page.locator('[data-hb="export-why"]').first()).toHaveText(why);
  const shot = path.join(ROOT, "out/smoke/refused.png");
  await page.screenshot({ path: shot });
  test.info().annotations.push({ type: "shot", description: path.relative(ROOT, shot) });
});
