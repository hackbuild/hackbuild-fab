// file:// on three browsers (plan v10 3.4, 3.5, Phase 1 step 4). Each baked
// bench opens from file:// in chromium, firefox and webkit: the kernel is
// ready, the first build settles, the buildHash equals expected/build.json
// and nothing logs a console error. A probe page records which Worker kinds
// start and answer under file:// in each browser (measured), into
// out/smoke/file-probe-<project>.json, one file per project since the
// projects run in parallel workers; the spec asserts only that the probe ran
// and prints the table. The owner decides the RULES.md worker rule from it.
// The bench list is derived from the bake manifests (file-url-benches.mjs): every
// ui manifest with a build entry and an expected/build.json. A page that is
// absent reports not run with its bake command; a manifest with a build and no
// golden fails with a line naming it.
// Needs the bakes in dist (npm run bake:all).
// Run: npx playwright test -c tools/smoke/playwright.config.ts file-url.spec.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, firefox, test, webkit } from "@playwright/test";
import { fileUrlBenches } from "./file-url-benches.mjs";
import { ROOT } from "./measure.ts";

interface Bench { id: string; dir: string; manifest: string; page: string; golden: string; bake: string }
const { benches: BENCHES, problems: PROBLEMS } = fileUrlBenches(ROOT) as { benches: Bench[]; problems: string[] };
const PROBE = path.join(ROOT, "tools/fixtures/file-probe/index.html");
const ENGINES = { firefox, webkit } as const;

interface Hook { ready: boolean; buildHash: string | null; settled(ms?: number): Promise<void> }
interface Row { kind: string; started: boolean; answered: boolean; error: string }

// Off CI, a project whose browser Playwright has not installed reports not run
// (Playwright ships no firefox or webkit build for macOS 12). CI installs all three.
test.skip(({ browserName }) => process.env["CI"] === undefined && browserName !== "chromium" && !existsSync(ENGINES[browserName].executablePath()), "not run: playwright has no installed build of this browser on this host");

test("every ui manifest with a build keeps its golden", () => {
  expect(PROBLEMS.join("\n")).toBe("");
  expect(BENCHES.length, "no ui manifest with a build and a golden found").toBeGreaterThan(0);
});

for (const { id, page: pageFile, golden, bake } of BENCHES) {
  test(`${id} bake opens from file:// and builds to expected/build.json`, async ({ page, browserName }, info) => {
    const file = path.join(ROOT, pageFile);
    const absent = !existsSync(file);
    const why = `not run: ${pageFile} is absent; bake it first: ${bake}`;
    if (absent) console.log(`${info.project.name} ${id} ${why}`);
    test.skip(absent, why);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    const t0 = Date.now();
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => (globalThis as unknown as { BENCH?: Hook }).BENCH !== undefined, undefined, { timeout: 120_000 });
    await page.evaluate(() => (globalThis as unknown as { BENCH: Hook }).BENCH.settled(120_000));
    const ms = Date.now() - t0;
    expect(await page.evaluate(() => document.documentElement.dataset["kernel"])).toBe("ready");
    const hash = await page.evaluate(() => (globalThis as unknown as { BENCH: Hook }).BENCH.buildHash);
    const expected = (JSON.parse(readFileSync(path.join(ROOT, golden), "utf8")) as { buildHash: string }).buildHash;
    expect(hash, `${info.project.name} ${id}`).toBe(expected);
    console.log(`file:// ${info.project.name} ${id} buildHash ${expected.slice(0, 8)} equals expected, ${ms} ms to first settled build (measured)`);
    // The hosted runner has no GL driver for firefox or webkit (CI run 41014308781,
    // FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS); chromium has swiftshader. There the
    // stage is reported not run, and every other console error still fails. The
    // viewer marks data-webgl="none" when it made no renderer and then logs nothing,
    // so the marker counts as not run too.
    const gl = browserName === "chromium" ? [] : errors.filter((e) => /WebGL/.test(e));
    const noRenderer = await page.locator('hb-viewer[data-webgl="none"]').count();
    if (gl.length > 0 || noRenderer > 0) {
      const seen = `${gl.length} console lines, ${noRenderer} viewer marked data-webgl none`;
      info.annotations.push({ type: "not run", description: `3D stage: no WebGL context in ${info.project.name} on this host (${seen})` });
      console.log(`not run: ${info.project.name} ${id} 3D stage, no WebGL context on this host (${seen})`);
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
