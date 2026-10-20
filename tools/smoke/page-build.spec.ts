// The flex-pair bake builds in its page from file:// with no injected
// build (D-264, M09 recheck F-01): the page reaches settled with a
// buildHash and meshes, writes 3mf, stl and card, and its 3mf bytes equal
// the CLI writer's (tools/smoke/cli-3mf.mjs) for the same values and the
// SOURCE_DATE_EPOCH the bake wrote into the page, at the defaults and at
// preset two. The page loads its constraint versions through the registry
// loader (packages/registry-loader pageFacts), so its registryHash equals
// the CLI's. Owned wasm objects are zero after the builds.
//
// Run: npx playwright test -c tools/smoke/playwright.config.ts page-build.spec.ts

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { chase } from "../../reference/keys/flex-pair/chase.ts";
import { ROOT } from "./measure.ts";
import { watch } from "./network.ts";

const BAKE = path.join(ROOT, "dist/bench/flex-pair.html");

test.describe.configure({ mode: "serial", timeout: 240_000 });

interface PageHook {
  BENCH: { state: Record<string, unknown>; buildHash: string | null; commit(): void; settled(ms?: number): Promise<void>; exportBytes(kind: string): Promise<string> };
  HbfPageBuild: { page: { facts: { epoch: number }; liveCount(): number; build(values: unknown): Promise<{ registryHash: string }> } };
}

function cli(values: unknown, epoch: number): { buildHash: string; registryHash: string; bytes: Buffer } {
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/smoke/cli-3mf.mjs"), JSON.stringify(values)], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, SOURCE_DATE_EPOCH: String(epoch) }, maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`cli-3mf exited ${String(r.status)}: ${r.stderr.slice(-400)}`);
  const out = JSON.parse(r.stdout) as { buildHash: string; registryHash: string; b64: string };
  return { buildHash: out.buildHash, registryHash: out.registryHash, bytes: Buffer.from(out.b64, "base64") };
}

async function pageExport(page: Page, kind: string): Promise<Buffer> {
  const b64 = await page.evaluate((k) => (globalThis as unknown as PageHook).BENCH.exportBytes(k), kind);
  return Buffer.from(b64, "base64");
}

test.beforeEach(() => {
  test.skip(!existsSync(BAKE), "not run: dist/bench/flex-pair.html is absent; run node tools/bake/bake.mjs reference/keys/flex-pair/bake.json");
});

test("the flex-pair bake builds, checks and exports in the page, and its 3mf equals the cli writer", async ({ page }) => {
  const w = await watch(page);
  await page.goto(pathToFileURL(BAKE).href);
  await page.evaluate(() => (globalThis as unknown as PageHook).BENCH.settled(120_000));
  const epoch = await page.evaluate(() => (globalThis as unknown as PageHook).HbfPageBuild.page.facts.epoch);
  const defaults = await page.evaluate(() => (globalThis as unknown as PageHook).BENCH.state);
  const two = chase.presets?.find((p) => p.id === "two");
  if (two === undefined) throw new Error("chase preset two is missing");
  const twoKeys = { ...defaults, ...structuredClone(two.params) };
  for (const values of [defaults, twoKeys]) {
    const hash = await page.evaluate(async (v) => {
      const B = (globalThis as unknown as PageHook).BENCH;
      B.state = v;
      B.commit();
      await B.settled(120_000);
      return B.buildHash;
    }, values);
    const state = await page.evaluate(() => (globalThis as unknown as PageHook).BENCH.state);
    const want = cli(state, epoch);
    const registryHash = await page.evaluate(async (v) => (await (globalThis as unknown as PageHook).HbfPageBuild.page.build(v)).registryHash, state);
    expect(registryHash, "page registryHash equals the cli build").toBe(want.registryHash);
    expect(hash, "page buildHash equals the cli build").toBe(want.buildHash);
    const got = await pageExport(page, "3mf");
    expect(got.length, "3mf bytes").toBe(want.bytes.length);
    expect(got.equals(want.bytes), "3mf bytes equal the cli writer").toBe(true);
    const stl = await pageExport(page, "stl");
    expect(stl.subarray(0, 2).toString("latin1"), "stl fallback is a zip").toBe("PK");
    const card = (await pageExport(page, "card")).toString("utf8");
    expect(card.startsWith("print card"), "print card text").toBe(true);
  }
  expect(await page.evaluate(() => (globalThis as unknown as PageHook).HbfPageBuild.page.liveCount()), "owned wasm objects after the builds").toBe(0);
  expect(w.errors, "console and page errors").toEqual([]);
  expect(w.external, "requests off file: and data:").toEqual([]);
});
