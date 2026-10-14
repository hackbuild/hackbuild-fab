// BenchHook error state, export refusals and range clamps in a real
// browser (M09-T11, D-214, gold-standard.md G-10, G-11, G-51). The
// flex-pair bake (dist/bench/flex-pair.html) runs as shipped with its
// in-page build (D-264); tools/smoke/page-build.ts armFaults wraps that
// build so one build can be made to throw. The wording checked below is typed from spec/hook.ts,
// never read from the bench: `build failed: <error>`, `unknown export
// kind: <k>`, `clamp <field>: <value> outside <lo> to <hi>, set <v>`.
//
// Run: npx playwright test -c tools/hook/playwright.config.ts --grep errors
// Screenshots at 390 and 1280 px go to SHOTS_DIR, default out/smoke/shots
// under the repo (SHOTS in tools/smoke/measure.ts).

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { SHOTS } from "../smoke/measure.ts";
import type { BenchHook } from "@hackbuild/spec";
import { armFaults, setFault } from "../smoke/page-build.ts";
import { ROOT } from "./benches.ts";

const BAKE = path.join(ROOT, "dist/bench/flex-pair.html");
/** D-214: a clamp is logged within this many ms of the write. */
const CLAMP_LOG_MS = 100;

type G = { BENCH: BenchHook };

test.describe.configure({ mode: "serial", timeout: 240_000 });

test.beforeEach(() => {
  test.skip(!existsSync(BAKE), "not run: dist/bench/flex-pair.html is absent; run node tools/bake/bake.mjs reference/keys/flex-pair/bake.json");
});

async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await armFaults(page, "HbfPageBuild");
  await page.goto(pathToFileURL(BAKE).href);
  await page.waitForFunction(() => (globalThis as unknown as G).BENCH?.ready === true, undefined, { timeout: 120_000 });
  await page.evaluate(() => (globalThis as unknown as G).BENCH.settled(120_000));
  const dismiss = page.locator('[data-hb="welcome-dismiss"]');
  if (await dismiss.isVisible()) await dismiss.click();
  return errors;
}

const setW = (page: Page, w: number): Promise<void> =>
  page.evaluate((v) => {
    const B = (globalThis as unknown as G).BENCH;
    B.state = { ...(B.state as Record<string, unknown>), W: v };
  }, w);

for (const width of [1280, 390]) {
  test(`a thrown build sets error and the chip, a valid commit clears both, at ${width} px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 } });
    const page = await ctx.newPage();
    try {
      const errors = await open(page);
      const hash = await page.evaluate(() => (globalThis as unknown as G).BENCH.buildHash);
      expect(hash).toMatch(/^[0-9a-f]{8,}/);

      await setFault(page, { throwNext: true });
      await setW(page, 61);
      const failed = await page.evaluate(() => (globalThis as unknown as G).BENCH.settled(120_000).then(() => "resolved", (e: unknown) => (e instanceof Error ? e.message : String(e))));
      expect(failed).toMatch(/^build failed: .*forced throw/);
      const after = await page.evaluate(() => {
        const B = (globalThis as unknown as G).BENCH;
        return { error: B.error, busy: B.busy, hash: B.buildHash };
      });
      expect(after.error).toContain("forced throw");
      expect(after.busy).toBe(false);
      expect(after.hash, "the last good build stays").toBe(hash);
      const chip = page.locator('[data-hb="status-error"]');
      await expect(chip).toContainText("forced throw");
      // A thrown build clears busy on the page as on the hook (D-214): no building pill or stage spinner.
      await expect(page.locator('[data-hb="busy"]')).toHaveCount(0);
      await expect(page.locator('[data-hb="status-pill"]')).not.toContainText("building");
      mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: path.join(SHOTS, `m09-t11-build-error-${width}.png`) });

      await setW(page, 62);
      await page.evaluate(() => (globalThis as unknown as G).BENCH.settled(120_000));
      const back = await page.evaluate(() => {
        const B = (globalThis as unknown as G).BENCH;
        return { error: B.error, w: (B.state as { W: number }).W, built: B.built, rev: B.rev };
      });
      expect(back).toEqual({ error: null, w: 62, built: back.rev, rev: back.rev });
      await expect(chip).toHaveCount(0);
      await expect(page.locator('[data-hb="busy"]')).toHaveCount(0);
      await expect(page.locator('[data-hb="status-pill"]')).toContainText("mesh current");
      expect(errors).toEqual([]);
    } finally {
      await ctx.close();
    }
  });
}

test("out-of-range state writes clamp and log within 100 ms; loadDesign clamps the same", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await open(page);
    const got = await page.evaluate(() => {
      const B = (globalThis as unknown as G).BENCH;
      const n = B.log.length;
      const t0 = performance.now();
      const s = B.state as { W: number; keys: { cone: number }[] };
      B.state = { ...s, W: 120, keys: s.keys.map((k, i) => (i === 0 ? { ...k, cone: 9 } : k)) };
      const lines = B.log.slice(n);
      return { ms: performance.now() - t0, lines, W: (B.state as { W: number }).W };
    });
    expect(got.lines).toContain("clamp W: 120 outside 40 to 90, set 90");
    expect(got.lines).toContain("clamp keys.0.cone: 9 outside 2.32 to 4.72, set 4.72");
    expect(got.ms).toBeLessThan(CLAMP_LOG_MS);
    expect(got.W).toBe(90);
    await page.evaluate(() => (globalThis as unknown as G).BENCH.settled(120_000));

    const loaded = await page.evaluate(() => {
      const B = (globalThis as unknown as G).BENCH;
      const doc = JSON.parse(B.designJson()) as { state: Record<string, unknown> };
      const n = B.log.length;
      B.loadDesign(JSON.stringify({ ...doc, state: { ...doc.state, H: 10 } }));
      return { lines: B.log.slice(n), H: (B.state as { H: number }).H };
    });
    expect(loaded.lines).toContain("clamp H: 10 outside 24 to 50, set 24");
    expect(loaded.H).toBe(24);
    await page.evaluate(() => (globalThis as unknown as G).BENCH.settled(120_000));

    const refused = await page.evaluate(() => {
      const B = (globalThis as unknown as G).BENCH;
      const before = B.designJson();
      B.loadDesign("not a design");
      return { error: B.error, same: B.designJson() === before };
    });
    expect(refused.error).toMatch(/^not a design/);
    expect(refused.same).toBe(true);
  } finally {
    await ctx.close();
  }
});

test("exportBytes: unknown kind message, aliases to the page writers, and a kind this bake cannot write", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await open(page);
    const r = await page.evaluate(async () => {
      const B = (globalThis as unknown as G).BENCH;
      const msg = (p: Promise<unknown>): Promise<string> => p.then(() => "resolved", (e: unknown) => (e instanceof TypeError ? "TypeError" : e instanceof Error ? e.message : String(e)));
      return {
        unknown: await msg(B.exportBytes("no-such-kind")),
        design: atob(await B.exportBytes("design")),
        json: B.designJson(),
        card: atob(await B.exportBytes("print-card")),
        stl: atob(await B.exportBytes("stlzip")).slice(0, 2),
        coupon: await msg(B.exportBytes("coupon")),
      };
    });
    expect(r.unknown).toBe("unknown export kind: no-such-kind");
    expect(r.design).toBe(r.json);
    // The aliases reach the page build's writers (D-264): the print card text and the stl fallback zip.
    expect(r.card.startsWith("print card")).toBe(true);
    expect(r.stl).toBe("PK");
    // coupon is declared by the chase and has no writer in core or the page; the refusal says so.
    expect(r.coupon).toBe("coupon export is not in this bake yet");
  } finally {
    await ctx.close();
  }
});
