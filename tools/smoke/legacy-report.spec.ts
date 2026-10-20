// The legacy report (M09-T14 step 5, D-142): the overflow, pink and network
// measures of smoke.spec.ts on every legacy bench that installs BENCH
// (tools/hook/benches.ts lists them; M09 names PIP, TOGGLE, KNUCKLE, TENON
// and COTTER, M10-T01 adds BOSS, BLOCKS and HAFT), written to out/smoke/legacy-report.json. The measures never
// fail the job; the run fails only when a page cannot be measured or a
// legacy file changed a byte. Pink is counted raw, since legacy pages
// carry no structural marks: `pinkBgBorder` is the 2026-10-04 baseline's
// measure (PIP 10, 6, 6 and 7 on its four steps at 1280) and `pinkRaw`
// adds pink text.
// Run: npx playwright test -c tools/smoke/playwright.config.ts legacy-report.spec.ts

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { listBenches } from "../hook/benches.ts";
import { HEIGHT, overflow, ROOT, WIDTHS, writeReport } from "./measure.ts";
import { badWorkers, watch } from "./network.ts";
import { pinkView } from "./pink.ts";

/** The five legacy benches M09 names (M09-ui.md legacy sources). */
const NAMED = ["pip", "toggle", "knuckle", "tenon", "cotter"];
const READY_MS = 120_000;

const sha = (file: string): string => createHash("sha256").update(readFileSync(file)).digest("hex");

interface View {
  step: number;
  width: number;
  scrollWidth: number;
  offenders: string[];
  pinkRaw: number;
  pinkBgBorder: number;
}

interface Row {
  bench: string;
  rel: string;
  sha256: string;
  readyMs: number | null;
  steps: number;
  views: View[];
  external: number;
  workers: { url: string; type: string }[];
  badWorkers: number;
  consoleErrors: string[];
  problem: string | null;
}

async function measure(page: Page, rel: string): Promise<Omit<Row, "bench" | "rel" | "sha256">> {
  const w = await watch(page);
  await page.setViewportSize({ width: 1280, height: HEIGHT });
  const t0 = Date.now();
  await page.goto(pathToFileURL(path.join(ROOT, rel)).href);
  // BOSS and BLOCKS expose ready as a function (boss.html line 2855).
  await page.waitForFunction(() => {
    const r = (globalThis as unknown as { BENCH?: { ready?: unknown } }).BENCH?.ready;
    return r === true || (typeof r === "function" && (r as () => unknown)() === true);
  }, undefined, { timeout: READY_MS });
  const readyMs = Date.now() - t0;
  const steps = page.locator("#steps button");
  const n = await steps.count();
  const views: View[] = [];
  for (let i = 0; i < Math.max(n, 1); i += 1) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHT });
      if (n > 0) await steps.nth(i).click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
      const o = await overflow(page);
      const p = await pinkView(page);
      views.push({
        step: i + 1, width, scrollWidth: o.scrollWidth, offenders: o.offenders, pinkRaw: p.raw,
        pinkBgBorder: p.focal.filter((h) => h.via.includes("background") || h.via.includes("border")).length,
      });
    }
  }
  const workers = await w.workers();
  return { readyMs, steps: n, views, external: w.external.length, workers, badWorkers: badWorkers(workers).length, consoleErrors: w.errors, problem: null };
}

test("legacy report: overflow, pink and network on every legacy bench", async ({ browser }) => {
  test.setTimeout(540_000);
  const { benches } = await listBenches();
  // Pages an adapter reads through other globals (KNURL, STYLUS, KEYWAY, OGEE; M10-T01) have no BENCH to wait on.
  const legacy = benches.filter((b) => b.origin === "legacy" && b.rel.startsWith("designs") && b.installsBench);
  expect(legacy.map((b) => b.name), "the five named legacy benches are listed").toEqual(expect.arrayContaining(NAMED));
  const rows: Row[] = [];
  for (const b of legacy) {
    const before = sha(b.file);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    let row: Row;
    try {
      row = { bench: b.name, rel: b.rel, sha256: before, ...(await measure(page, b.rel)) };
    } catch (e) {
      row = { bench: b.name, rel: b.rel, sha256: before, readyMs: null, steps: 0, views: [], external: 0, workers: [], badWorkers: 0, consoleErrors: [], problem: e instanceof Error ? e.message.split("\n")[0] ?? "" : String(e) };
    } finally {
      await ctx.close();
    }
    expect(sha(b.file), `${b.rel} stays byte-identical (D-142)`).toBe(before);
    rows.push(row);
  }
  writeReport("legacy-report.json", { suite: "legacy report, M09-T14 step 5", at: new Date().toISOString(), qualifier: "measured", widths: WIDTHS, benches: rows });
  const unmeasured = rows.filter((r) => r.problem !== null).map((r) => `${r.bench}: ${r.problem}`);
  expect(unmeasured, "legacy pages that could not be measured").toEqual([]);
});
