// A bench page the way the hack fab skill writes one (tools/fixtures/skill-page):
// one html file, an import map to release urls, the art-layers chase and
// build inline, createBench with the page build from @hackbuild/engine. A
// route stands in for jsDelivr and answers each release url from this
// checkout (tools/skill-kit/release-page.mjs), so no network is used.
//   - the stage has geometry, and every body's mesh hash and volume equal
//     reference/cosmetic/art-layers/expected/build.json for the same params
//   - checks ran with no fail
//   - a 3mf export passes the library self-check, and validate_3mf.py
//     --overlap passes on the downloaded file
//   - check-page passes on the page
//   - save offline writes a page that opens from file:// with every request
//     outside the file refused and builds the same mesh hashes
// The buildHash differs from the golden by design: defHash covers the page's
// own script text (packages/engine/src/facts.ts).
// Needs build:lib. Run: npx playwright test -c tools/smoke/playwright.config.ts skill-page.spec.ts --project desktop

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { ORIGIN, settledHash } from "./hosts.ts";
import { ROOT } from "./measure.ts";
import { checkPage } from "../skill-kit/check-page.mjs";
import { releaseFileFor } from "../skill-kit/release-page.mjs";

const TYPES: Record<string, string> = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" };
const OUT = path.join(ROOT, "out/smoke/skill-page");
const FIXTURE = "tools/fixtures/skill-page/index.html";
const GOLD = JSON.parse(readFileSync(path.join(ROOT, "reference/cosmetic/art-layers/expected/build.json"), "utf8")) as { meshHashes: Record<string, string>; volumes: Record<string, number> };
const tidy = (v: number): number => Number(v.toFixed(9));

test.describe.configure({ timeout: 300_000 });

/** Body id to [mesh hash, volume] of the settled build of a controller expression. */
async function bodies(page: Page, expr: string): Promise<Record<string, [string, number]>> {
  return page.evaluate((e) => {
    const c = (new Function(`return ${e}`)() as { core: { result: { part: { part: { bodies: { id: string; mesh: { hash: string; volumeMm3: number } }[] } } } } }).core;
    return Object.fromEntries(c.result.part.part.bodies.map((b) => [b.id, [b.mesh.hash, b.mesh.volumeMm3]]));
  }, expr);
}

function expectGold(got: Record<string, [string, number]>): void {
  expect(Object.fromEntries(Object.entries(got).map(([id, v]) => [id, v[0]]))).toEqual(GOLD.meshHashes);
  expect(Object.fromEntries(Object.entries(got).map(([id, v]) => [id, tidy(v[1])]))).toEqual(GOLD.volumes);
}

test("a skill-style page builds, checks, exports and saves offline", async ({ page, context }) => {
  test.skip(!existsSync(path.join(ROOT, "packages/engine/dist/iife/engine.js")), "not run: packages/engine/dist is absent; run build:lib");
  const stood: string[] = [];
  await context.route("https://cdn.jsdelivr.net/**", async (route) => {
    const url = route.request().url();
    const file = releaseFileFor(url);
    if (file === null) return route.fulfill({ status: 404, body: `no release file for ${url}` });
    stood.push(url);
    await route.fulfill({ status: 200, headers: { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "access-control-allow-origin": "*" }, body: readFileSync(file) });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/${FIXTURE}`);

  // geometry and the golden
  await settledHash(page, "globalThis.hbfSkill");
  expectGold(await bodies(page, "globalThis.hbfSkill"));
  expect(stood.some((u) => u.includes("/packages/engine/dist/cdn/engine.js"))).toBe(true);
  expect(stood.some((u) => u.endsWith("/manifold-3d@3.5.4/manifold.wasm"))).toBe(true);
  const report = await page.evaluate(() => {
    const r = (globalThis as unknown as { hbfSkill: { core: { result: { report: { tris: number; results: { id: string; verdict: string }[] } } } } }).hbfSkill.core.result.report;
    return { tris: r.tris, results: r.results.map((x) => [x.id, x.verdict]) };
  });
  expect(report.tris).toBeGreaterThan(0);
  expect(report.results.length).toBeGreaterThan(0);
  expect(report.results.filter((r) => r[1] === "fail")).toEqual([]);
  await expect(page.locator("canvas").first()).toBeVisible();

  // check-page on the page as written
  const html = readFileSync(path.join(ROOT, FIXTURE), "utf8");
  expect(checkPage(html).filter((c: { ok: boolean }) => !c.ok)).toEqual([]);

  // a 3mf export through the library: the self-check runs before the download
  await page.locator('[data-hb="steps"] [role="tab"]').last().click();
  const dismiss = page.locator('[data-hb="welcome-dismiss"]');
  if (await dismiss.isVisible()) await dismiss.click();
  mkdirSync(OUT, { recursive: true });
  const [dl3] = await Promise.all([page.waitForEvent("download"), page.locator('[data-hb="export"][data-kind="3mf"]').click()]);
  const threeMf = path.join(OUT, dl3.suggestedFilename());
  await dl3.saveAs(threeMf);
  expect(dl3.suggestedFilename()).toBe("art-layers.3mf");
  const valid = spawnSync("uv", ["run", "--project", "tools/py", "tools/py/validate_3mf.py", "--overlap", threeMf], { cwd: ROOT, encoding: "utf8" });
  expect(valid.error, "uv runs tools/py; install it (CI: astral-sh/setup-uv)").toBeUndefined();
  expect(valid.status, `${valid.stdout}${valid.stderr}`).toBe(0);

  // save offline: one file, no script src, no import map, same meshes from file://
  const save = page.locator('[data-hb="save-offline"]');
  await expect(save).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), save.click()]);
  const saved = path.join(OUT, download.suggestedFilename());
  await download.saveAs(saved);
  expect(download.suggestedFilename()).toBe("skill-page-offline.html");
  const offlineHtml = readFileSync(saved, "utf8");
  expect(offlineHtml).not.toMatch(/<script[^>]+\bsrc=/i);
  expect(offlineHtml).not.toMatch(/<script[^>]*type="importmap"/);
  expect(checkPage(offlineHtml).filter((c: { ok: boolean }) => !c.ok)).toEqual([]);

  const offline = await context.newPage();
  const outside: string[] = [];
  const failures: string[] = [];
  await offline.route(/^(?!file:|data:|blob:)/, (route) => { outside.push(route.request().url()); return route.abort(); });
  offline.on("pageerror", (e) => failures.push(e.message));
  await offline.goto(pathToFileURL(saved).href);
  await settledHash(offline, "globalThis.hbfSkill");
  expectGold(await bodies(offline, "globalThis.hbfSkill"));
  expect(await offline.evaluate(() => (globalThis as unknown as { BENCH?: { ready: boolean } }).BENCH?.ready)).toBe(true);
  expect(outside).toEqual([]);
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});
