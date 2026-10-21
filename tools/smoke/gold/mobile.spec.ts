// Gold rules, mobile (TESTING.md 8.5): G-52 (touch), G-53, G-54, all
// bench-layer. At 390 x 844.
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { expect, type Page } from "@playwright/test";
import { HEIGHT, overflow, smallTargets } from "../measure.ts";
import { hookSettled, notRun, openGold, rule } from "./gold.ts";

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** The area of a that lies over b, px squared. */
const over = (a: Box, b: Box): number =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

async function boxes(page: Page, sel: string): Promise<Box[]> {
  return (await page.locator(sel).evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => {
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }))).filter((b) => b.width > 0 && b.height > 0);
}

// The share counts the stage only: the part of the pad over the stage. A
// pad docked below the stage (D-630, more than four keys) covers none of it.
rule("G-52", "touch-only: at 390 the pad is at most a quarter of the stage and every key is 44 x 44", async ({ page, bench }) => {
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await openGold(page, bench);
  const pad = (await boxes(page, bench.dom.pad))[0];
  const stage = (await boxes(page, bench.dom.stage))[0];
  if (pad === undefined) notRun(`${bench.id}: no drive pad on screen at 390`);
  if (stage === undefined) throw new Error("no stage box");
  const share = over(pad, stage) / (stage.width * stage.height);
  expect(share, `pad ${Math.round(pad.width)} x ${Math.round(pad.height)} px, ${Math.round(over(pad, stage))} px2 of it over a ${Math.round(stage.width)} x ${Math.round(stage.height)} px stage (measured)`).toBeLessThanOrEqual(0.25);
  const keys = await boxes(page, bench.dom.padKey);
  const small = keys.filter((k) => k.width + 0.5 < 44 || k.height + 0.5 < 44).map((k) => `${Math.round(k.width)} x ${Math.round(k.height)}`);
  expect(small, "drive keys under 44 x 44 px").toEqual([]);
}, { touch: true });

rule("G-53", "at 390 the step's focal derived value is on screen", async ({ page, bench }) => {
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await openGold(page, bench);
  if (bench.origin === "legacy") notRun(`${bench.id}: the legacy page declares no step focus`);
  if (bench.focus.every((f) => f === null)) notRun(`${bench.id}: no step declares a focus`);
  const steps = page.locator(bench.dom.steps);
  const off: string[] = [];
  for (const [i, focus] of bench.focus.entries()) {
    if (focus === null) continue;
    await steps.nth(i).click();
    await hookSettled(page);
    const sel = focus === "export" ? '[data-hb="exports"]' : `[data-hb="param"][data-field="${focus}"], [data-hb="derived"][data-field="${focus}"]`;
    const b = (await boxes(page, sel))[0];
    if (b === undefined) off.push(`step ${i + 1}: focal ${focus} has no box at 390`);
  }
  expect(off, off.join("\n")).toEqual([]);
});

rule("G-54", "at 390 no sideways scroll, 44 px targets, welcome clear of the header, legend clear of the cams", async ({ page, bench }) => {
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await openGold(page, bench, { welcome: true });
  const bad: string[] = [];
  const o = await overflow(page);
  if (o.scrollWidth > 390) bad.push(`scrollWidth ${o.scrollWidth} at 390: ${o.offenders.join(", ")}`);
  const header = (await boxes(page, bench.dom.header))[0];
  const welcome = (await boxes(page, bench.dom.welcome))[0];
  if (header !== undefined && welcome !== undefined && meets(header, welcome)) bad.push("the welcome meets the header");
  if (bench.origin === "fab") await page.locator('[data-hb="welcome-dismiss"]').click();
  const steps = page.locator(bench.dom.steps);
  for (let i = 0; i < (await steps.count()); i += 1) {
    await steps.nth(i).click();
    await hookSettled(page);
    for (const t of await smallTargets(page)) bad.push(`step ${i + 1}: ${t.el} ${t.w} x ${t.h} px`);
    const legend = await boxes(page, bench.dom.legend);
    const cams = await boxes(page, bench.dom.cams);
    if (legend.some((l) => cams.some((c) => meets(l, c)))) bad.push(`step ${i + 1}: the legend meets a cam button`);
    const o2 = await overflow(page);
    if (o2.scrollWidth > 390) bad.push(`step ${i + 1}: scrollWidth ${o2.scrollWidth} at 390`);
  }
  expect(bad, bad.join("\n")).toEqual([]);
});
