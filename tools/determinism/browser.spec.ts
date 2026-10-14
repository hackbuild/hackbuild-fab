// M00-T14 step 5 (D-175): the browser legs of the determinism job. The page
// baked by tools/determinism/bake.mjs loads from file:// in Playwright
// Chromium and WebKit, builds the M00-T05 route fixtures and the
// Author.ring.circle ring set at 3 to 256 segments, and this spec writes
// meshHashes.<engine>.json. determinism-compare then runs
// `compare.mjs --subset` against the node list, which fails on any
// difference.
//
// Run: npx playwright test tools/determinism/browser.spec.ts --browser=chromium
// (and --browser=webkit). DETERMINISM_OUT names the folder, default
// out/determinism. When DETERMINISM_NODE names a node meshHashes.json the
// spec also fails here on the first differing id.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { bakePage } from "./bake.mjs";

interface PageResult {
  readonly hashes?: Record<string, string>;
  readonly liveCount?: number;
  readonly error?: string;
}

// The revolve replay and the ring prisms take about 30 s in Chrome 150 on
// the owner machine (measured 2026-10-05); WebKit gets headroom.
test.setTimeout(10 * 60 * 1000);

test("route fixtures and ring set hash equal to node", async ({ page, browserName }, info) => {
  const html = info.outputPath("determinism.html");
  writeFileSync(html, await bakePage());
  const failed: string[] = [];
  page.on("requestfailed", (r) => failed.push(r.url()));
  page.on("pageerror", (e) => failed.push(String(e)));
  await page.goto(pathToFileURL(html).href);
  const r = (await page.evaluate(() => (globalThis as unknown as { DETERMINISM: Promise<unknown> }).DETERMINISM)) as PageResult;
  expect(r.error, "the page threw while building").toBeUndefined();
  expect(failed, "the page made a request or threw from file://").toEqual([]);
  expect(r.liveCount, "live wasm objects after the fixtures").toBe(0);
  const hashes = r.hashes ?? {};
  expect(Object.keys(hashes).length).toBeGreaterThan(0);

  const outDir = path.resolve(process.env["DETERMINISM_OUT"] ?? "out/determinism");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `meshHashes.${browserName}.json`), `${JSON.stringify(hashes, null, 2)}\n`);

  const nodeFile = process.env["DETERMINISM_NODE"];
  if (nodeFile !== undefined) {
    const node = JSON.parse(readFileSync(nodeFile, "utf8")) as Record<string, string>;
    const differs = Object.keys(hashes).sort().filter((id) => node[id] !== hashes[id]);
    expect(differs, `${browserName} ids whose hash differs from node`).toEqual([]);
  }
});
