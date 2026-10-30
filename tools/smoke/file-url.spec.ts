// file:// on three browsers (plan v10 3.4, 3.5, Phase 1 step 4). Each baked
// bench opens from file:// in chromium, firefox and webkit: the kernel is
// ready, the first build settles, the buildHash equals expected/build.json
// and nothing logs a console error. A probe page records which Worker kinds
// start and answer under file:// in each browser (measured), into
// out/smoke/file-probe-<project>.json, one file per project since the
// projects run in parallel workers; the spec asserts only that the probe ran
// and prints the table. The owner decides the RULES.md worker rule from it.
// Needs the bakes in dist/bench (node tools/bake/bake.mjs <bake.json>).
// Run: npx playwright test -c tools/smoke/playwright.config.ts file-url.spec.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, firefox, test, webkit } from "@playwright/test";
import { ROOT } from "./measure.ts";

const BENCHES: ReadonlyArray<[string, string]> = [["toggle", "designs/toggle"], ["flex-pair", "reference/keys/flex-pair"]];
const PROBE = path.join(ROOT, "tools/fixtures/file-probe/index.html");
const ENGINES = { firefox, webkit } as const;

interface Hook { ready: boolean; buildHash: string | null; settled(ms?: number): Promise<void> }
interface Row { kind: string; started: boolean; answered: boolean; error: string }

// Off CI, a project whose browser Playwright has not installed reports not run
// (Playwright ships no firefox or webkit build for macOS 12). CI installs all three.
test.skip(({ browserName }) => process.env["CI"] === undefined && browserName !== "chromium" && !existsSync(ENGINES[browserName].executablePath()), "not run: playwright has no installed build of this browser on this host");

for (const [id, dir] of BENCHES) {
  test(`${id} bake opens from file:// and builds to expected/build.json`, async ({ page, browserName }, info) => {
    const file = path.join(ROOT, "dist/bench", `${id}.html`);
    test.skip(!existsSync(file), `not run: ${file} is absent; bake it first`);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => (globalThis as unknown as { BENCH?: Hook }).BENCH !== undefined, undefined, { timeout: 60_000 });
    await page.evaluate(() => (globalThis as unknown as { BENCH: Hook }).BENCH.settled(120_000));
    expect(await page.evaluate(() => document.documentElement.dataset["kernel"])).toBe("ready");
    const hash = await page.evaluate(() => (globalThis as unknown as { BENCH: Hook }).BENCH.buildHash);
    const expected = (JSON.parse(readFileSync(path.join(ROOT, dir, "expected/build.json"), "utf8")) as { buildHash: string }).buildHash;
    expect(hash, `${info.project.name} ${id}`).toBe(expected);
    // The hosted runner has no GL driver for firefox or webkit (CI run 41014308781,
    // FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS); chromium has swiftshader. There the
    // stage is reported not run, and every other console error still fails.
    const gl = browserName === "chromium" ? [] : errors.filter((e) => /WebGL/.test(e));
    if (gl.length > 0) {
      info.annotations.push({ type: "not run", description: `3D stage: no WebGL context in ${info.project.name} on this host (${gl.length} console lines)` });
      console.log(`not run: ${info.project.name} ${id} 3D stage, no WebGL context on this host (${gl.length} console lines)`);
    }
    expect(errors.filter((e) => !gl.includes(e))).toEqual([]);
  });
}

test("worker probe from file://", async ({ page, browserName }, info) => {
  await page.goto(pathToFileURL(PROBE).href);
  const rows = (await page.evaluate(() => (globalThis as unknown as { hbfProbe: { done: Promise<Row[]> } }).hbfProbe.done)) as Row[];
  expect(rows.map((r) => r.kind)).toEqual(["classic blob", "data url", "module blob"]);
  const version = page.context().browser()?.version() ?? "unknown";
  const out = path.join(ROOT, "out/smoke", `file-probe-${info.project.name}.json`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ project: info.project.name, browser: browserName, version, measured: true, rows }, null, 2) + "\n");
  const cell = (r: Row): string => (r.answered ? "answers" : r.started ? "starts, no answer" : "refused");
  console.log(`worker probe ${browserName} ${version} (measured): ${rows.map((r) => `${r.kind} ${cell(r)}${r.error === "" ? "" : ` [${r.error}]`}`).join("; ")}`);
});
