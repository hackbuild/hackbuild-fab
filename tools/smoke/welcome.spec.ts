// M09-T04 acceptance in a real browser (D-125, D-166, D-167): the welcome
// shows on first load, stays closed after dismiss and a reload, Guide shows
// it again; with localStorage throwing on access the bench boots, shows the
// welcome and logs zero console errors; a share link opened at file:// with
// the context offline yields the designJson that was encoded.
//
// Two targets. The flex-pair bake (M09-T13) at WELCOME_BENCH, default
// dist/bench/flex-pair.html, where `node tools/bake/bake.mjs
// reference/keys/flex-pair/bake.json` writes it; it is skipped and reported
// not run while the file is absent. The ui-core fixture
// (packages/ui-core/test/bench/welcome.fixture.*) bundled here into one
// offline file. Both answer `BENCH` (ready, designJson, loadDesign) and the
// data-hb hooks welcome, welcome-dismiss and guide.
//
// Run: npx playwright test tools/smoke/welcome.spec.ts
// Screenshots at 390 and 1280 px go to SHOTS_DIR, default out/smoke/shots
// under the repo (SHOTS in tools/smoke/measure.ts).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { SHOTS } from "./measure.ts";
import { encodeShare } from "../../packages/ui-core/src/bench/share.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BAKE = path.resolve(ROOT, process.env["WELCOME_BENCH"] ?? "dist/bench/flex-pair.html");
const FIXTURE_DIR = path.join(ROOT, "packages/ui-core/test/bench");
/** meta.chase of the designs both targets carry (spec/chase.ts CHASE_SCHEMA_VERSION). */
const CHASE = 2;

test.use({ channel: "chrome" });

const THROWING_STORAGE = `Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new DOMException("access denied", "SecurityError"); } });`;

async function fixtureFile(outDir: string): Promise<string> {
  const { build } = await import("esbuild-wasm");
  const bundle = await build({
    entryPoints: [path.join(FIXTURE_DIR, "welcome.fixture.entry.ts")],
    resolveExtensions: [".ts", ".js", ".mjs", ".json"],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "warning",
  });
  const js = bundle.outputFiles[0]?.text ?? "";
  const html = readFileSync(path.join(FIXTURE_DIR, "welcome.fixture.html"), "utf8");
  const marker = "<script>/* fixture entry */</script>";
  if (html.split(marker).length !== 2) throw new Error("welcome.fixture.html must hold the entry marker exactly once");
  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, "welcome-fixture.html");
  writeFileSync(file, html.replace(marker, () => `<script>${js.replace(/<\/script/gi, "<\\/script")}</script>`));
  return file;
}

interface Watch {
  errors: string[];
  requests: string[];
}

function watch(page: Page): Watch {
  const w: Watch = { errors: [], requests: [] };
  page.on("console", (m) => {
    if (m.type() === "error") w.errors.push(m.text());
  });
  page.on("pageerror", (e) => w.errors.push(String(e)));
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith("file:") && !u.startsWith("data:")) w.requests.push(u);
  });
  return w;
}

async function ready(page: Page): Promise<void> {
  await page.waitForFunction(() => (globalThis as unknown as { BENCH?: { ready: boolean } }).BENCH?.ready === true, undefined, { timeout: 30_000 });
}

const welcomeCard = (page: Page) => page.locator('[data-hb="welcome"]');

function targets(): { name: string; file: () => Promise<string | null> }[] {
  return [
    { name: "flex-pair bake", file: async () => (existsSync(BAKE) ? BAKE : null) },
    { name: "ui-core fixture", file: async () => fixtureFile(test.info().outputPath("fixture")) },
  ];
}

for (const target of targets()) {
  test.describe(target.name, () => {
    let file: string | null = null;

    test.beforeAll(async () => {
      file = await target.file();
    });

    test.beforeEach(() => {
      test.skip(file === null, `not run: ${path.relative(ROOT, BAKE)} is absent until M09-T13 bakes it`);
    });

    test("first load shows the welcome; dismiss and reload hide it; Guide shows it", async ({ page }) => {
      const w = watch(page);
      const url = pathToFileURL(file as string).href;
      await page.goto(url);
      await ready(page);
      await expect(welcomeCard(page)).toBeVisible();
      await page.locator('[data-hb="welcome-dismiss"]').click();
      await expect(welcomeCard(page)).toBeHidden();
      await page.reload();
      await ready(page);
      await expect(welcomeCard(page)).toBeHidden();
      await page.locator('[data-hb="guide"]').click();
      await expect(welcomeCard(page)).toBeVisible();
      await page.reload();
      await ready(page);
      await expect(welcomeCard(page), "Guide reopened it without clearing the memory").toBeHidden();
      expect(w.errors).toEqual([]);
      expect(w.requests).toEqual([]);
    });

    test("localStorage throwing on access: the bench boots, shows the welcome, logs zero console errors", async ({ page }) => {
      await page.addInitScript(THROWING_STORAGE);
      const w = watch(page);
      await page.goto(pathToFileURL(file as string).href);
      await ready(page);
      expect(await page.evaluate(() => { try { void localStorage; return "readable"; } catch { return "throws"; } })).toBe("throws");
      await expect(welcomeCard(page)).toBeVisible();
      await page.locator('[data-hb="welcome-dismiss"]').click();
      await expect(welcomeCard(page)).toBeHidden();
      expect(w.errors).toEqual([]);
    });

    test("a share link opened offline at file:// yields the encoded designJson", async ({ browser }) => {
      const ctx: BrowserContext = await browser.newContext();
      try {
        const page = await ctx.newPage();
        const w = watch(page);
        const url = pathToFileURL(file as string).href;
        await page.goto(url);
        await ready(page);
        const blank = await page.evaluate(() => (globalThis as unknown as { BENCH: { designJson(): string } }).BENCH.designJson());
        const doc = JSON.parse(blank) as { state: Record<string, unknown> };
        const edited = await page.evaluate(([j]) => {
          const B = (globalThis as unknown as { BENCH: { designJson(): string; loadDesign(s: string): void } }).BENCH;
          const d = JSON.parse(j as string) as { state: Record<string, unknown> };
          // A first-level number nudged, so the link carries a design that differs from blank.
          const k = Object.keys(d.state).find((x) => typeof d.state[x] === "number") ?? null;
          const walk = (o: Record<string, unknown>): boolean => {
            for (const [key, v] of Object.entries(o)) {
              if (typeof v === "number") { o[key] = v + 1; return true; }
              if (v !== null && typeof v === "object" && !Array.isArray(v) && walk(v as Record<string, unknown>)) return true;
            }
            return false;
          };
          if (k === null) walk(d.state); else d.state[k] = (d.state[k] as number) + 1;
          B.loadDesign(JSON.stringify(d));
          return B.designJson();
        }, [JSON.stringify(doc)]);
        expect(edited).not.toBe(blank);
        const hash = await encodeShare(edited, CHASE);
        await ctx.setOffline(true);
        const fresh = await ctx.newPage();
        const w2 = watch(fresh);
        await fresh.goto(`${url}${hash}`);
        await ready(fresh);
        const got = await fresh.evaluate(() => (globalThis as unknown as { BENCH: { designJson(): string } }).BENCH.designJson());
        expect(got).toBe(edited);
        expect(w.errors.concat(w2.errors)).toEqual([]);
        expect(w2.requests).toEqual([]);
        test.info().annotations.push({ type: "share link", description: `${hash.length} characters, computed` });
      } finally {
        await ctx.close();
      }
    });

    test("a refused link boots blank and logs the rule", async ({ page }) => {
      const url = pathToFileURL(file as string).href;
      const hash = await encodeShare(JSON.stringify({ app: "x", v: 1, state: {} }), CHASE + 1);
      await page.goto(`${url}${hash}`);
      await ready(page);
      const log = await page.evaluate(() => (globalThis as unknown as { BENCH: { log: string[] } }).BENCH.log);
      expect(log.some((l) => l.startsWith("share link could not be read, opened blank: share-link/migrate"))).toBe(true);
    });

    test("screenshots at 390 and 1280 px with the welcome open", async ({ page }) => {
      test.skip(target.name !== "ui-core fixture" && process.env["SHOTS_BAKE"] === undefined, "bake shots belong to M09-T14");
      mkdirSync(SHOTS, { recursive: true });
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(pathToFileURL(file as string).href);
        await ready(page);
        await expect(welcomeCard(page)).toBeVisible();
        const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scroll, `horizontal scroll at ${width} px`).toBeLessThanOrEqual(width);
        await page.screenshot({ path: path.join(SHOTS, `t04-welcome-${target.name.replace(/\W+/g, "-")}-${width}.png`) });
      }
    });
  });
}
