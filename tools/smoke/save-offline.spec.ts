// Save offline (plan v11.1 3.6). The CDN fixture page is pointed at jsDelivr
// release urls; a route stands in for jsDelivr and answers each url from this
// checkout, so no network is used. The page builds the toggle design at its
// default hash, the export step's "save offline" writes one html file with the
// classic library builds and the design inlined, and that file opens from
// file:// with every request outside the file refused: BENCH builds to the
// hash in designs/toggle/expected/build.json. check-page passes on the file.
// A page that is already offline disables the action and says why.
// Needs build:lib, pack:lib and build:design -- designs/toggle.
// Run: npx playwright test -c tools/smoke/playwright.config.ts save-offline.spec.ts --project desktop

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { expectedHash, ORIGIN, settledHash } from "./hosts.ts";
import { ROOT } from "./measure.ts";
import { checkPage } from "../skill-kit/check-page.mjs";
import { pointAtRelease, releaseFileFor } from "../skill-kit/release-page.mjs";

const TYPES: Record<string, string> = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json" };
const OUT = path.join(ROOT, "out/smoke/offline");

test.describe.configure({ timeout: 300_000 });

test("save offline writes a file that opens from file:// and builds the same hash", async ({ page, context }) => {
  test.skip(!existsSync(path.join(ROOT, "out/design/toggle/design.json")) || !existsSync(path.join(ROOT, "out/publish/index.json")), "not run: out/publish or out/design/toggle is absent; run build:lib, pack:lib and build:design");
  const stood: string[] = [];
  await context.route("https://cdn.jsdelivr.net/**", async (route) => {
    const url = route.request().url();
    const file = releaseFileFor(url);
    if (file === null) return route.fulfill({ status: 404, body: `no release file for ${url}` });
    stood.push(url);
    await route.fulfill({ status: 200, headers: { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "access-control-allow-origin": "*" }, body: readFileSync(file) });
  });
  const release = pointAtRelease(readFileSync(path.join(ROOT, "tools/fixtures/cdn/index.html"), "utf8"));
  await context.route(`${ORIGIN}/tools/fixtures/cdn/release.html*`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: release }));

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/tools/fixtures/cdn/release.html?design=toggle`);
  expect(await settledHash(page, "globalThis.hbfCdn")).toBe(expectedHash("toggle"));
  expect(stood.some((u) => u.includes("/packages/bench/dist/cdn/bench.js"))).toBe(true);

  // the export step holds the action; it is enabled on a cdn page that names its design folder
  await page.locator('[data-hb="steps"] [role="tab"]').last().click();
  const dismiss = page.locator('[data-hb="welcome-dismiss"]');
  if (await dismiss.isVisible()) await dismiss.click();
  const save = page.locator('[data-hb="save-offline"]');
  await expect(save).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), save.click()]);
  mkdirSync(OUT, { recursive: true });
  const saved = path.join(OUT, download.suggestedFilename());
  await download.saveAs(saved);
  expect(download.suggestedFilename()).toBe("toggle-offline.html");
  await expect(page.locator('[data-hb="offline-why"]')).toContainText("saved toggle-offline.html");

  const html = readFileSync(saved, "utf8");
  expect(html).not.toMatch(/<script[^>]+\bsrc=/i);
  expect(html).not.toMatch(/<script[^>]*type="importmap"/);
  const checks = checkPage(html);
  expect(checks.filter((c: { ok: boolean }) => !c.ok)).toEqual([]);

  // open from file:// with every request outside the file refused
  const offline = await context.newPage();
  const outside: string[] = [];
  const failures: string[] = [];
  await offline.route(/^(?!file:|data:|blob:)/, (route) => { outside.push(route.request().url()); return route.abort(); });
  offline.on("pageerror", (e) => failures.push(e.message));
  await offline.goto(pathToFileURL(saved).href);
  expect(await settledHash(offline, "globalThis.hbfOffline")).toBe(expectedHash("toggle"));
  expect(await offline.evaluate(() => (globalThis as unknown as { BENCH?: { ready: boolean } }).BENCH?.ready)).toBe(true);
  expect(outside).toEqual([]);
  expect(failures).toEqual([]);

  // already offline: the action is disabled and says why
  await offline.locator('[data-hb="steps"] [role="tab"]').last().click();
  const d2 = offline.locator('[data-hb="welcome-dismiss"]');
  if (await d2.isVisible()) await d2.click();
  await expect(offline.locator('[data-hb="save-offline"]')).toBeDisabled();
  await expect(offline.locator('[data-hb="offline-why"]')).toContainText("already runs from a file");
  expect(errors).toEqual([]);
});
