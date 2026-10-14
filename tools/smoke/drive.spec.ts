// M09-T10 acceptance in a real browser (D-076, D-078, D-079).
//
// The flex-pair bake (dist/bench/flex-pair.html, `node tools/bake/bake.mjs
// reference/keys/flex-pair/bake.json`) with the node build host as its
// build (tools/smoke/host-build.ts): BENCH.drive(<first key target>, true)
// resolves with the logic of the solve golden and the path of the report
// golden (reference/keys/flex-pair/expected); a touch hold on that pad key
// shows the same line; release returns the pad to the idle text.
//
// The PIP legacy page (designs/pip/legacy/pip.html, sha256 a1fa88bd...1263)
// through its BenchHook adapter (tools/hook/legacy-adapters.ts, M09-T12) at
// the worked example: A reads LOW at 1.69 Mohm, SELECT reads HIGH at 0.93
// Mohm, and the ten example keys read inside D-079's 1.5 to 1.72 Mohm for
// keys and 0.91 to 0.93 Mohm for touch. Those numbers are computed by the
// legacy bench; this spec measures what it prints.
//
// Run: npx playwright test tools/smoke/drive.spec.ts
// Screenshots at 390 and 1280 px go to SHOTS_DIR, default out/smoke/shots
// under the repo (SHOTS in tools/smoke/measure.ts).

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { SHOTS } from "./measure.ts";
import { startHost, useHostBuild, type Host } from "./host-build.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BAKE = path.resolve(ROOT, process.env["DRIVE_BENCH"] ?? "dist/bench/flex-pair.html");
const PIP = path.join(ROOT, "designs/pip/legacy/pip.html");
const EXPECTED = path.join(ROOT, "reference/keys/flex-pair/expected");

test.use({ channel: "chrome" });
test.describe.configure({ mode: "serial", timeout: 180_000 });

type Rec = Record<string, string | number | boolean>;
interface Finding { id: string; measured: unknown; target: { net?: string }; extra?: Record<string, unknown> }
interface Point { net: string; mcu: string; pressed: { state: string }[] }

const report = JSON.parse(readFileSync(path.join(EXPECTED, "report.json"), "utf8")) as { findings: Finding[] };
const solve = JSON.parse(readFileSync(path.join(EXPECTED, "query-solve.json"), "utf8")) as { result: { points: Point[] } };

const settled = (page: Page): Promise<unknown> =>
  page.waitForFunction(() => {
    const B = (globalThis as unknown as { BENCH: { ready: boolean; busy: boolean; built: number; rev: number } }).BENCH;
    return B.ready && !B.busy && B.built === B.rev;
  }, undefined, { timeout: 120_000 });

function shotsDir(): string {
  mkdirSync(SHOTS, { recursive: true });
  return SHOTS;
}

test.describe("flex-pair bake", () => {
  let host: Host | null = null;
  test.beforeAll(async () => {
    if (existsSync(BAKE)) host = await startHost();
  });
  test.afterAll(() => host?.close());
  test.beforeEach(() => {
    test.skip(!existsSync(BAKE), `not run: ${path.relative(ROOT, BAKE)} is absent; bake it first`);
  });

  async function open(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await useHostBuild(page, host as Host);
    await page.goto(pathToFileURL(BAKE).href);
    await settled(page);
    const dismiss = page.locator('[data-hb="welcome-dismiss"]');
    if (await dismiss.isVisible()) await dismiss.click();
    await expect(page.locator('[data-hb="drive-key"]').first()).toBeVisible();
    return errors;
  }

  const read = (page: Page): Promise<string> => page.locator('[data-hb="drive-read"]').innerText();

  for (const width of [1280, 390]) {
    test(`drive the first key at ${width} px: BENCH.drive, then a touch hold, then release`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, hasTouch: true, isMobile: width === 390 });
      const page = await ctx.newPage();
      try {
        const errors = await open(page);
        const key = page.locator('[data-hb="drive-key"]').first();
        const target = (await key.getAttribute("data-target")) ?? "";
        const idle = await read(page);
        expect(idle.startsWith("all pins idle")).toBe(true);

        const rec = await page.evaluate((t) => (globalThis as unknown as { BENCH: { drive(t: string, v: boolean): Promise<Rec> } }).BENCH.drive(t, true), target);
        const golden = report.findings.find((f) => f.id === "CHK-NET-29" && f.extra?.["pin"] === rec["pin"]);
        expect(golden, `CHK-NET-29 golden for ${String(rec["pin"])}`).toBeDefined();
        const point = solve.result.points.find((p) => p.net === golden?.target.net && p.mcu === rec["mcu"]);
        expect(rec["logic"]).toBe(point?.pressed[0]?.state);
        expect(rec["ohm"]).toBe(golden?.measured);
        expect(rec["waitUs"]).toBe(golden?.extra?.["waitUs"]);
        expect(rec["waitQualifier"]).toBe(golden?.extra?.["waitQualifier"]);
        expect(rec["calibrated"]).toBe(false);
        const heldLine = await read(page);
        expect(heldLine).toContain(`${target} ${String(rec["pin"])} reads ${String(rec["logic"])} on ${String(rec["mcu"])}, ${((rec["ohm"] as number) / 1e6).toFixed(2)} Mohm computed`);
        expect(heldLine).toContain(`wait ${String(rec["waitUs"])} us ${String(rec["waitQualifier"])} (pip_stick, uncalibrated)`);
        await expect(key).toHaveAttribute("aria-pressed", "true");
        await page.screenshot({ path: path.join(shotsDir(), `m09-t10-drive-held-${width}.png`) });
        await page.evaluate(() => (globalThis as unknown as { BENCH: { release(): Promise<void> } }).BENCH.release());
        await expect.poll(() => read(page)).toBe(idle);

        // A touch hold: the finger stays down while the readout is read.
        const box = await key.boundingBox();
        if (box === null) throw new Error("pad key has no box");
        const cdp = await ctx.newCDPSession(page);
        const at = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at });
        await expect.poll(() => read(page)).toBe(heldLine);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect.poll(() => read(page)).toBe(idle);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
      } finally {
        await ctx.close();
      }
    });
  }
});

test.describe("PIP legacy through its adapter", () => {
  test.beforeEach(() => {
    test.skip(!existsSync(PIP), `not run: ${path.relative(ROOT, PIP)} is absent`);
  });

  type G = { BENCH?: { ready?: boolean }; __HBF_ADAPTERS: Record<string, { adapt(g: unknown): Hook; example?(g: unknown): void; driveTargets(g: unknown): string[] }>; __hook: Hook };
  type Hook = { settled(ms?: number): Promise<void>; built: number; rev: number; drive(t: string, v: boolean): Promise<Rec>; release(t?: string): Promise<void> };

  async function bundleAdapters(): Promise<string> {
    const { build } = await import("esbuild-wasm");
    const out = await build({
      stdin: {
        contents: `import { ADAPTERS } from "./legacy-adapters.ts"; globalThis.__HBF_ADAPTERS = ADAPTERS;`,
        resolveDir: path.join(ROOT, "tools/hook"),
        sourcefile: "drive-adapters.entry.ts",
        loader: "ts",
      },
      resolveExtensions: [".ts", ".js", ".mjs", ".json"],
      bundle: true, format: "iife", platform: "browser", target: "es2022", write: false, logLevel: "warning",
    });
    const js = out.outputFiles[0]?.text ?? "";
    if (js === "") throw new Error("adapter bundle is empty");
    return js;
  }

  test("A reads LOW at 1.69 Mohm, SELECT HIGH at 0.93 Mohm, ten keys inside D-079", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(pathToFileURL(PIP).href);
    await page.waitForFunction(() => (globalThis as unknown as G).BENCH?.ready === true, undefined, { timeout: 60_000 });
    await page.addScriptTag({ content: await bundleAdapters() });
    const targets = await page.evaluate(async () => {
      const g = globalThis as unknown as G;
      const a = g.__HBF_ADAPTERS["pip"];
      if (!a) throw new Error("pip adapter missing");
      g.__hook = a.adapt(globalThis);
      await g.__hook.settled(60_000);
      const rev = g.__hook.rev;
      a.example?.(globalThis);
      await g.__hook.settled(60_000);
      if (g.__hook.built <= rev) throw new Error("the worked example did not build");
      return a.driveTargets(globalThis);
    });
    const drive = async (t: string): Promise<string> => {
      const r = await page.evaluate((k) => (globalThis as unknown as G).__hook.drive(k, true), t);
      await page.evaluate((k) => (globalThis as unknown as G).__hook.release(k), t);
      return String(r["readout"]);
    };
    const a = await drive("A");
    expect(a).toContain("reads LOW");
    expect(a).toContain("1.69 Mohm");
    const sel = await drive("SELECT");
    expect(sel).toContain("reads HIGH");
    expect(sel).toContain("0.93 Mohm");

    const rows = [];
    for (const t of targets) {
      const line = await drive(t);
      const m = /reads (LOW|HIGH) \(([\d.]+) Mohm/.exec(line);
      if (m === null) throw new Error(`${t}: no read in "${line}"`);
      rows.push({ t, logic: m[1], mohm: Number(m[2]) });
    }
    expect(rows.length).toBe(10);
    for (const r of rows) {
      const [lo, hi] = r.logic === "LOW" ? [1.5, 1.72] : [0.91, 0.93];
      expect(r.mohm, `${r.t} ${r.logic}`).toBeGreaterThanOrEqual(lo);
      expect(r.mohm, `${r.t} ${r.logic}`).toBeLessThanOrEqual(hi);
    }
    console.log(`pip legacy pad, measured ${new Date().toISOString().slice(0, 10)}: ${rows.map((r) => `${r.t} ${r.logic} ${r.mohm}`).join(", ")} Mohm (computed by the bench)`);
  });
});
