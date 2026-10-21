// chase.render (M10-T07 step 1, D-050, D-129) through the CLI on the flex
// pair, and the breach table on hand-made measures. The page artifact is
// checked against the M09 baker run on the committed
// reference/keys/flex-pair/bake.json in its own process, and the pngs are
// read back from the store. A design with no bake.json sits in a copy under
// .hbf/ (gitignored), so the checkout keeps its files. The browser is system
// Chrome; a machine without it fails the CLI case with render/browser.

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { breaches, PINK_BUDGET } from "../src/commands/chase-render.js";
import { Store } from "../src/store.js";
import { json, REF, ROOT } from "./hbf.js";

type View = { step: string; width: number; scrollWidth: number; pinkFocal: number };
type Rendered = { url: string; shots: string[]; views: View[]; consoleErrors: string[]; network: string[] };

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

const PNG = [0x89, 0x50, 0x4e, 0x47];
const idOf = (uri: string): string => uri.slice("hbf://artifact/".length);
/** The files of the flex-pair directory with their bytes, to show the render wrote nothing there. */
const snapshot = (): Record<string, string> =>
  Object.fromEntries(readdirSync(path.join(ROOT, REF), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => [e.name, readFileSync(path.join(ROOT, REF, e.name)).toString("base64")]));

describe("chase.render (M10-T07 step 1)", () => {
  it("renders the flex pair: 8 pngs (4 steps at 1280 and 390), no overflow, pink at most 1 per view, 0 console errors, 0 requests", async () => {
    const before = snapshot();
    const { code, r } = await json("chase.render", REF);
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as Rendered;
    expect(res.views.map((v) => v.width)).toEqual([1280, 390, 1280, 390, 1280, 390, 1280, 390]);
    expect(res.views.map((v) => v.step.split(" ")[0])).toEqual(["1", "1", "2", "2", "3", "3", "4", "4"]);
    for (const v of res.views) {
      expect(v.scrollWidth, `${v.step} at ${v.width}`).toBeLessThanOrEqual(v.width);
      expect(v.pinkFocal, `${v.step} at ${v.width}`).toBeLessThanOrEqual(1);
    }
    expect(res.consoleErrors).toEqual([]);
    expect(res.network).toEqual([]);
    expect(res.shots).toHaveLength(8);
    expect(new Set(res.shots).size, "each view is its own png").toBe(8);

    const store = new Store(ROOT);
    for (const s of res.shots) {
      const a = await store.artifact(idOf(s));
      expect(a.ext).toBe("png");
      expect([...a.bytes.slice(0, 4)]).toEqual(PNG);
    }
    // The page in the store is the M09 baker's page for the committed manifest.
    const m09 = mkdtempSync(path.join(ROOT, ".hbf", "render-test-"));
    made.push(m09);
    const line = execFileSync(process.execPath, [path.join(ROOT, "tools/bake/bake.mjs"), path.join(ROOT, REF, "bake.json"), "--out-root", m09], { cwd: ROOT, encoding: "utf8" });
    expect(idOf(res.url)).toBe(/sha256 ([0-9a-f]{64})/.exec(line)?.[1]);
    expect(r.artifacts.map((a) => a.kind)).toEqual(["html", ...Array(8).fill("png")]);
    expect(snapshot(), "chase.render writes nothing to the design directory").toEqual(before);
  }, 240_000);

  it("measures every view and stores no png with screenshots false", async () => {
    const { code, r } = await json("chase.render", REF, "--screenshots", "false");
    expect(code, JSON.stringify(r.errors)).toBe(0);
    const res = r.result as Rendered;
    expect(res.shots).toEqual([]);
    expect(res.views).toHaveLength(8);
    expect(r.artifacts.map((a) => a.kind)).toEqual(["html"]);
  }, 240_000);

  it("refuses a design with no bake.json with E_REF at /chase and writes nothing", async () => {
    mkdirSync(path.join(ROOT, ".hbf"), { recursive: true });
    const dir = path.join(mkdtempSync(path.join(ROOT, ".hbf", "render-test-")), "access-switch");
    made.push(path.dirname(dir));
    mkdirSync(dir);
    for (const f of ["chase.ts", "build.ts", "bench.ts", "claim.ts", "jack.ts"]) cpSync(path.join(ROOT, "reference/keys/access-switch", f), path.join(dir, f));
    const { code, r } = await json("chase.render", dir);
    expect(code).toBe(2);
    expect(r.errors[0]).toMatchObject({ code: "E_REF", path: "/chase" });
    expect(r.errors[0]!.hint).toContain("chase.bake");
    expect(readdirSync(dir).sort()).toEqual(["bench.ts", "build.ts", "chase.ts", "claim.ts", "jack.ts"]);
  });
});

describe("chase.render breaches (smoke laws, D-125, D-129)", () => {
  const ok: View = { step: "1 pad", width: 390, scrollWidth: 390, pinkFocal: PINK_BUDGET };
  const run = (views: View[], consoleErrors: string[] = [], network: string[] = []) => breaches({ views, consoleErrors, network });

  it("passes a view at its width with one focal pink", () => {
    expect(PINK_BUDGET).toBe(1);
    expect(run([ok, { ...ok, width: 1280, scrollWidth: 1280, pinkFocal: 0 }])).toEqual([]);
  });

  it("fails 400 px of scroll width at 390 as render/overflow", () => {
    const e = run([{ ...ok, scrollWidth: 400 }]);
    expect(e.map((x) => x.record)).toEqual(["render/overflow"]);
    expect(e[0]!.hint).toContain("scroll width 400 px over viewport 390 px (measured)");
  });

  it("fails 2 focal pink elements as render/pink", () => {
    const e = run([{ ...ok, pinkFocal: 2 }]);
    expect(e.map((x) => x.record)).toEqual(["render/pink"]);
    expect(e[0]!.hint).toContain("2 focal pink elements, budget 1 (measured)");
  });

  it("fails each console error and each request off the file", () => {
    const e = run([ok], ["TypeError: x"], ["https://example.invalid/a.png"]);
    expect(e.map((x) => [x.code, x.record, x.got])).toEqual([
      ["E_KERNEL", "render/console", "TypeError: x"],
      ["E_KERNEL", "render/network", "https://example.invalid/a.png"],
    ]);
  });
});
