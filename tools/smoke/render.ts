#!/usr/bin/env node
// tools/smoke/render.ts: one baked bench opened headless and offline as a
// person sees it (M10-T07 step 1). chase.render (core/src/commands/
// chase-render.ts) runs it in a child process, since playwright is a root
// dev dependency and must not load under core's resolve hook. The bench
// opens at 1280, waits for BENCH.settled (the first built rev), closes the
// welcome, then per rail step and per width (1280, then 390) takes the
// smoke measures of tools/smoke/measure.ts, pink.ts and network.ts: the
// overflow scroll width, the focal pink count, and over the whole run the
// console and page errors and the requests off file: and data:. A bench
// with no steps strip is measured as one view, "page".
//
//   node tools/smoke/render.ts <page.html> <shot dir|-> prints one JSON line
//
// With shot dir "-" it measures and takes no screenshot. System Chrome with
// swiftshader GL, as tools/smoke/playwright.config.ts launches it.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { closeWelcome, HEIGHT, open, overflow, settled, stepButtons } from "./measure.ts";
import { watch } from "./network.ts";
import { pinkView } from "./pink.ts";

/** The two widths chase.render shoots (M10-T07 step 1), px. */
export const RENDER_WIDTHS = [1280, 390] as const;
const GL = ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"];
/** Layout settle after a viewport change, ms, as smoke.spec.ts waits (inferred). */
const RESIZE_MS = 250;

export interface RenderView {
  step: string;
  width: number;
  /** Absolute png path, or null when no shot was asked. */
  png: string | null;
  scrollWidth: number;
  pinkFocal: number;
}

export interface RenderRun {
  views: RenderView[];
  consoleErrors: string[];
  network: string[];
}

export async function render(file: string, shots: string | null): Promise<RenderRun> {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: GL });
  try {
    const page = await browser.newPage({ viewport: { width: RENDER_WIDTHS[0], height: HEIGHT } });
    const w = await watch(page);
    await open(page, { id: path.basename(file, ".html"), file, kind: "bench", build: null });
    await closeWelcome(page);
    const n = await stepButtons(page).count();
    const steps = n === 0 ? ["page"] : await stepButtons(page).allInnerTexts();
    const views: RenderView[] = [];
    for (let i = 0; i < steps.length; i += 1) {
      await page.setViewportSize({ width: RENDER_WIDTHS[0], height: HEIGHT });
      if (n > 0) {
        await stepButtons(page).nth(i).click();
        await settled(page).catch(() => undefined);
      }
      for (const width of RENDER_WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        await page.waitForTimeout(RESIZE_MS);
        const o = await overflow(page);
        const p = await pinkView(page);
        const png = shots === null ? null : path.join(shots, `step${i + 1}-${width}.png`);
        if (png !== null) await page.screenshot({ path: png });
        views.push({ step: steps[i]!.replace(/\s+/g, " ").replace(/ ,/g, ",").trim().toLowerCase(), width, png, scrollWidth: o.scrollWidth, pinkFocal: p.focal.length });
      }
    }
    return { views, consoleErrors: w.errors, network: w.external };
  } finally {
    await browser.close();
  }
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, dir] = process.argv.slice(2);
  if (file === undefined || dir === undefined || process.argv.length !== 4) {
    console.error("usage: node tools/smoke/render.ts <page.html> <shot dir|->");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await render(path.resolve(file), dir === "-" ? null : path.resolve(dir))));
    } catch (e) {
      console.error(`render: ${(e as Error).message.split("\n")[0]}`);
      process.exitCode = 1;
    }
  }
}
