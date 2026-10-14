// Gold rules, performance (TESTING.md 8.3 and 8.5, D-213). G-57 is
// bench-layer: zero console errors and zero external requests across a
// drive of every step, an export and a design round trip. The runtime
// budgets test writes out/smoke/runtime.json, the `runtime` input of
// tools/gold/report.mjs (G-55) and the M09 Exit runtime row: first load,
// first build, commit to settled p90 over the liveness edits, export 3MF,
// the busy indicator and the slow-build line. A fab bake's build runs in
// the node build host here (tools/smoke/host-build.ts), so the build
// times are the host's, measured through the page. Each row carries the
// grade of tools/gold/report.mjs runtimeGrade: over target between the
// D-213 target and fail bound, fail past the bound; only fail fails the
// test. G-56 runs the same slow-build probe: until M10-T17 adds a heavy.json
// per design, the host holds one build 2.7 s, past build.slowMs 2500 (P-29).
// Run: npx playwright test -c tools/smoke/playwright.config.ts --grep @gold

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { runtimeGrade } from "../../gold/report.mjs";
import type { Host } from "../host-build.ts";
import { ROOT } from "../measure.ts";
import { badWorkers } from "../network.ts";
import { hook, hookSettled, notRun, numericFields, openGold, readField, rule, writeField, type GoldBench, type Opened } from "./gold.ts";

interface Row { measure: string; value: number | null; unit: string; target: string; failBound: string; failed: boolean; grade?: string; rules: string[]; qualifier: string; note?: string }

const RUNTIME = path.join(ROOT, "out/smoke/runtime.json");

function record(bench: string, rows: Row[]): void {
  mkdirSync(path.dirname(RUNTIME), { recursive: true });
  const all = existsSync(RUNTIME) ? (JSON.parse(readFileSync(RUNTIME, "utf8")) as Record<string, Row[]>) : {};
  all[bench] = rows;
  writeFileSync(RUNTIME, `${JSON.stringify(all, null, 1)}\n`);
}

const p90 = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)] as number;
};

rule("G-57", "zero console errors and zero external requests across the drive", async ({ page, bench, host }) => {
  const { watch } = await openGold(page, bench, host);
  const steps = page.locator(bench.dom.steps);
  for (let i = 0; i < (await steps.count()); i += 1) {
    await steps.nth(i).click({ force: true });
    await hookSettled(page);
  }
  const json = await hook(page, (h) => h.designJson());
  await page.evaluate((j) => (globalThis as unknown as { __hbfHook: { loadDesign(s: string): void } }).__hbfHook.loadDesign(j), json);
  await hookSettled(page);
  await page.evaluate(() => (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("json"));
  expect(watch.errors, "console and page errors").toEqual([]);
  expect(watch.external, "requests off file: and data:").toEqual([]);
  expect(badWorkers(await watch.workers()), "blob or module workers").toEqual([]);
});

/** Opens a fab bake on the node build host with a switch that holds the next build 2.7 s. */
async function openHeld(page: Page, bench: GoldBench, host: Host | null, opts: { welcome?: boolean } = {}): Promise<Opened> {
  let slowNext = false;
  await page.exposeFunction("hbfSlowNext", () => {
    slowNext = true;
  });
  await page.exposeFunction("hbfHostBuild", async (state: unknown) => {
    if (slowNext) {
      slowNext = false;
      await new Promise((r) => setTimeout(r, 2700));
    }
    return host?.build(state);
  });
  return openGold(page, { ...bench, host: false }, null, opts);
}

/** A build over 1 s shows building and takes a step click; over 2.5 s logs the param to lower. */
async function slowBuildRows(page: Page, bench: GoldBench): Promise<Row[]> {
  const f = (await numericFields(page, bench))[0];
  if (f === undefined) return [];
  await page.evaluate(() => (globalThis as unknown as { hbfSlowNext(): Promise<void> }).hbfSlowNext());
  const n0 = (await hook(page, (h) => h.log.length));
  const v0 = Number(await readField(page, f.path));
  await writeField(page, f.path, v0 + f.step <= f.max ? v0 + f.step : v0 - f.step);
  const b0 = Date.now();
  const shown = await page.locator('[data-hb="busy"], [data-hb="status-pill"]').filter({ hasText: "building" }).first().waitFor({ timeout: 1000 }).then(() => Date.now() - b0, () => null);
  const steps = page.locator(bench.dom.steps);
  await steps.nth(1).click({ timeout: 1000 }).catch(() => undefined);
  const moved = await steps.nth(1).getAttribute("aria-selected");
  const rows: Row[] = [];
  rows.push({ measure: "busy indicator", value: shown, unit: "ms", target: "1000", failBound: "no indicator or blocked input", failed: shown === null || moved !== "true", rules: ["G-56"], qualifier: "measured; build held 2.7 s in the host", note: `step click during the build ${moved === "true" ? "changed the step" : "did not change the step"}` });
  await hookSettled(page);
  const lines = (await hook(page, (h) => h.log)).slice(n0);
  const text = await page.locator("body").innerText();
  const slow = [...lines, text].some((l) => /build took .* lower \S+/.test(l));
  rows.push({ measure: "slow-build line", value: null, unit: "", target: "a line naming the param to lower", failBound: "no line", failed: !slow, rules: ["G-56"], qualifier: "measured", note: slow ? "line found" : "no build took ... lower <param> line in the log or on the page" });
  return rows;
}

const failures = (rows: Row[]): string[] => rows.filter((r) => r.failed).map((r) => `${r.measure}: ${r.value ?? "none"} ${r.unit} ${r.note ?? ""}`);

rule("G-56", "a build over 1 s shows building, takes a step click, logs the param to lower", async ({ page, bench, host }) => {
  if (bench.origin === "legacy") notRun(`${bench.id}: the slow-build probe holds a build in the node build host, which a legacy bake does not call; heavy.json arrives with M10-T17`);
  await openHeld(page, bench, host);
  const rows = await slowBuildRows(page, bench);
  if (rows.length === 0) notRun(`${bench.id}: no numeric rail field to commit`);
  const failed = failures(rows);
  expect(failed, failed.join("\n")).toEqual([]);
});

rule("runtime budgets", "TESTING.md 8.3 rows into out/smoke/runtime.json", async ({ page, bench, host }) => {
  if (bench.origin === "legacy") notRun(`${bench.id}: runtime rows are recorded for fab bakes; the legacy timings are in out/smoke/legacy-report.json`);
  const rows: Row[] = [];
  const q = "measured; build in the node build host";
  const t0 = Date.now();
  const opened = await openHeld(page, bench, host, { welcome: true });
  const firstBuild = Date.now() - t0 - opened.readyMs;
  rows.push({ measure: "first load", value: opened.readyMs, unit: "ms", target: "4000", failBound: "over 15000", failed: opened.readyMs > 15000, rules: ["G-55"], qualifier: q });
  rows.push({ measure: "first build", value: firstBuild, unit: "ms", target: "600", failBound: "over 2000", failed: firstBuild > 2000, rules: ["G-55"], qualifier: q, note: "ready to the first settled build" });
  await page.locator('[data-hb="welcome-dismiss"]').click();

  const times: number[] = [];
  for (const f of await numericFields(page, bench)) {
    const v0 = Number(await readField(page, f.path));
    for (const v of [f.max, f.min, v0]) {
      const ms = await page.evaluate(async ([p, val]) => {
        const h = (globalThis as unknown as { __hbfHook: { state: unknown; commit(): void; settled(ms?: number): Promise<void> } }).__hbfHook;
        const s = structuredClone(h.state) as Record<string | number, unknown>;
        let o = s;
        for (const k of (p as (string | number)[]).slice(0, -1)) o = o[k] as Record<string | number, unknown>;
        o[(p as (string | number)[]).at(-1) as string | number] = val;
        const t = performance.now();
        h.state = s;
        h.commit();
        await h.settled(60000);
        return performance.now() - t;
      }, [f.path, v] as [unknown, unknown]);
      times.push(ms);
    }
  }
  const c90 = times.length === 0 ? null : Math.round(p90(times));
  rows.push({ measure: "commit to settled p90", value: c90, unit: "ms", target: "2000", failBound: "over 4500", failed: c90 === null || c90 > 4500, rules: ["G-55"], qualifier: q, note: `${times.length} liveness edits` });

  const e0 = Date.now();
  const exp = await page.evaluate(async () => {
    try {
      await (globalThis as unknown as { __hbfHook: { exportBytes(k: string): Promise<string> } }).__hbfHook.exportBytes("3mf");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  });
  const ems = Date.now() - e0;
  rows.push({ measure: "export 3MF", value: exp === null ? ems : null, unit: "ms", target: "1000", failBound: "over 10000", failed: exp !== null || ems > 10000, rules: [], qualifier: "measured", ...(exp === null ? {} : { note: exp }) });

  rows.push(...(await slowBuildRows(page, bench)));
  for (const r of rows) r.grade = runtimeGrade(r);
  record(bench.id, rows);
  const over = rows.filter((r) => r.grade === "over target").map((r) => `${r.measure} ${r.value} ${r.unit} over target ${r.target}, under fail bound ${r.failBound}`);
  if (over.length > 0) test.info().annotations.push({ type: "over target", description: over.join("; ") });
  const failed = failures(rows);
  expect(failed, failed.join("\n")).toEqual([]);
}, { timeout: 420_000 });
