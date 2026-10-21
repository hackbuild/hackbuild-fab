// M03-T02 acceptance. Card numbers are asserted as the card states them
// (computed, exact rational solve, or computed from the source rules); the
// byte outputs are held against intake-golden.json, which
// scripts/intake-golden.mjs wrote by running the badge-replicator originals.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { sourcePath } from "../../../tools/test-support/originals-root.js";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  alphaFor, applyKnockout, contentBounds, createReducer, defaultKnockout, defaultStack, gaussianSolve, intake,
  knockoutEdges, knockoutKey, sampleBorder, solveHomography, stackLayers, suggestSize, warpToRect,
  type KnockoutOptions, type Point, type RgbaImage, type StackOptions,
} from "../src/index.js";
import { runCases, type IntakeApi } from "./fixtures/intake-cases.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pkg = fileURLToPath(new URL("../", import.meta.url));
const golden = JSON.parse(readFileSync(pkg + "test/fixtures/intake-golden.json", "utf8")) as {
  sources: Record<string, { id: string; sha256: string }>;
  cases: Record<string, unknown>;
};

const unit: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
const quad: Point[] = [{ x: 10, y: 20 }, { x: 110, y: 25 }, { x: 105, y: 130 }, { x: 5, y: 120 }];
const st = (method: StackOptions["method"], over: Partial<StackOptions> = {}): StackOptions => ({ ...defaultStack(), method, ...over });
const reduce = (o: StackOptions, v: number[]): number => createReducer(o)(Float64Array.from(v), v.length);

function solid(w: number, h: number, rgba: readonly number[]): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i % 4] ?? 0;
  return { width: w, height: h, data };
}
function put(img: RgbaImage, x: number, y: number, rgba: readonly number[]): void {
  const o = (y * img.width + x) * 4;
  for (let c = 0; c < 4; c++) img.data[o + c] = rgba[c] ?? 0;
}
const alphaAt = (img: RgbaImage, x: number, y: number): number => img.data[(y * img.width + x) * 4 + 3] ?? -1;

describe("homography (card acceptance, computed exact rational solve)", () => {
  test("unit square to the marked quad", () => {
    const h = solveHomography(unit, quad);
    const want = [94.78673, -5.011848, 10, 3.815166, 99.71564, 20, -0.047393, -0.00237];
    want.forEach((v, i) => expect(Math.abs((h[i] ?? NaN) - v), `h${i}`).toBeLessThanOrEqual(1e-6));
    expect(h[8]).toBe(1);
    const [h0, h1, h2, h3, h4, h5, h6, h7, h8] = h;
    const w = h6 * 0.5 + h7 * 0.5 + h8;
    expect(Math.abs((h0 * 0.5 + h1 * 0.5 + h2) / w - 56.287971)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs((h3 * 0.5 + h4 * 0.5 + h5) / w - 73.596598)).toBeLessThanOrEqual(1e-6);
  });

  test("three pairs throw E_SCHEMA", () => {
    expect(() => solveHomography(unit.slice(0, 3), quad.slice(0, 3))).toThrow(/E_SCHEMA/);
  });
});

describe("stack reducers (card acceptance, computed from the source rules)", () => {
  test("median, percentile, trimmed", () => {
    expect(reduce(st("median"), [10, 200, 12])).toBe(12);
    expect(reduce(st("median"), [10, 200, 12, 14])).toBe(13);
    expect(reduce(st("percentile", { percentile: 25 }), [1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(3);
    expect(reduce(st("trimmed", { trim: 0.25 }), [1, 2, 3, 100])).toBe(2.5);
  });
  test("defaults are capture.ts line 34", () => {
    expect(defaultStack()).toEqual({ method: "median", percentile: 25, trim: 0.25 });
  });
});

describe("knockout (card acceptance)", () => {
  test("defaultKnockout", () => {
    expect(defaultKnockout()).toEqual({ mode: "key", key: [255, 0, 255], tolerance: 70, softness: 30, trim: true });
  });
  test("alpha at distance 70, 85, 100 is 0, 128, 255 (computed round(15 / 30 x 255))", () => {
    expect(alphaFor(70, 70, 30)).toBe(0);
    expect(alphaFor(85, 70, 30)).toBe(128);
    expect(alphaFor(100, 70, 30)).toBe(255);
    // Through the kernel: green 85 away from magenta.
    const img = solid(1, 1, [255, 85, 255, 255]);
    expect(alphaAt(knockoutKey(img, defaultKnockout()), 0, 0)).toBe(128);
  });
  test("contentBounds alpha floor 8", () => {
    const img = solid(4, 4, [0, 0, 0, 0]);
    put(img, 2, 1, [9, 9, 9, 8]);
    expect(contentBounds(img)).toEqual({ x: 2, y: 1, width: 1, height: 1 });
    put(img, 2, 1, [9, 9, 9, 7]);
    expect(contentBounds(img)).toBeNull();
  });
  test("an enclosed key shape survives knockoutEdges and is cut by knockoutKey", () => {
    const img = solid(9, 9, [255, 0, 255, 255]);
    for (let y = 2; y <= 6; y++) for (let x = 2; x <= 6; x++) put(img, x, y, [20, 160, 40, 255]);
    put(img, 4, 4, [255, 0, 255, 255]);
    const ko = defaultKnockout();
    const edges = knockoutEdges(img, ko);
    expect(alphaAt(edges, 4, 4)).toBe(255);
    expect(alphaAt(edges, 0, 0)).toBe(0);
    expect(alphaAt(edges, 3, 3)).toBe(255);
    const key = knockoutKey(img, ko);
    expect(alphaAt(key, 4, 4)).toBe(0);
    expect(alphaAt(key, 0, 0)).toBe(0);
    expect(img.data[(4 * 9 + 4) * 4 + 3]).toBe(255);
  });
});

describe("byte parity with the badge-replicator originals (intake-golden.json)", () => {
  test("every case equals the golden", async () => {
    const api: IntakeApi = {
      solveHomography, gaussianSolve, warpToRect, suggestSize, createReducer, stackLayers,
      knockoutKey, knockoutEdges, sampleBorder, contentBounds, applyKnockout, defaultKnockout,
      compose: async (shots, corners, ko, s) => (await intake(shots, corners, { knockout: ko, stack: s })).image,
    };
    const got = await runCases(api);
    expect(Object.keys(got).sort()).toEqual(Object.keys(golden.cases).sort());
    for (const k of Object.keys(golden.cases)) expect(got[k], k).toEqual(golden.cases[k]);
  });

  test("the golden was written from the sources lineage.json records", () => {
    const rows = JSON.parse(readFileSync(root + "lineage.json", "utf8")) as { id: string; sha256: string }[];
    expect(Object.keys(golden.sources).length).toBe(5);
    for (const s of Object.values(golden.sources)) {
      expect(rows.find((r) => r.id === s.id)?.sha256, s.id).toBe(s.sha256);
    }
  });
});

describe("intake stage", () => {
  const plate = (): RgbaImage => {
    const img = solid(80, 70, [255, 0, 255, 255]);
    for (let y = 20; y < 40; y++) for (let x = 10; x < 50; x++) put(img, x, y, [20, 160, 40, 255]);
    return img;
  };

  test("a plate with no corners: no warp, no stack, key cut, trimmed to the art", async () => {
    const r = await intake([plate()], null);
    expect(r.steps.map((s) => [s.step, s.ran])).toEqual([["warp", false], ["stack", false], ["knockout", true], ["trim", true]]);
    expect([r.image.width, r.image.height]).toEqual([40, 20]);
    expect(alphaAt(r.image, 0, 0)).toBe(255);
  });

  test("knockout off skips trim; trim false keeps the frame", async () => {
    const off = await intake([plate()], null, { knockout: null });
    expect(off.steps.map((s) => s.ran)).toEqual([false, false, false, false]);
    expect(off.image.width).toBe(80);
    const keep: KnockoutOptions = { ...defaultKnockout(), trim: false };
    const k = await intake([plate()], null, { knockout: keep });
    expect(k.steps.map((s) => s.ran)).toEqual([false, false, true, false]);
    expect(k.image.width).toBe(80);
  });

  test("marked shots warp to the suggested size and stack", async () => {
    const corners: Point[] = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 70 }, { x: 0, y: 70 }];
    const r = await intake([plate(), plate(), plate()], [corners, corners, corners], { knockout: null });
    expect(r.steps.map((s) => s.ran)).toEqual([true, true, false, false]);
    expect([r.image.width, r.image.height]).toEqual([80, 70]);
  });

  test("an unmarked shot of the wrong size and two shots without stack options are refused", async () => {
    const corners: Point[] = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 70 }, { x: 0, y: 70 }];
    await expect(intake([plate(), solid(10, 10, [0, 0, 0, 255])], [corners, null])).rejects.toThrow(/E_SCHEMA \/shots\/1/);
    await expect(intake([plate(), plate()], null, { stack: null })).rejects.toThrow(/E_SCHEMA \/stack/);
    await expect(intake([], null)).rejects.toThrow(/E_SCHEMA \/shots/);
  });
});

describe("headless and lineage", () => {
  const files = readdirSync(pkg + "src", { recursive: true }).map(String).filter((f) => f.endsWith(".ts"));

  test("no DOM reference in packages/inlay/src (card grep)", () => {
    for (const f of files) {
      expect(readFileSync(pkg + "src/" + f, "utf8"), f).not.toMatch(/document|window|new ImageData/);
    }
  });

  test("every intake file is the dest of a canonical lineage row whose source matches its hash", () => {
    const rows = JSON.parse(readFileSync(root + "lineage.json", "utf8")) as { id: string; kind: string; source: string; sha256: string; dest: string | null }[];
    for (const f of files.filter((n) => n.startsWith("intake/"))) {
      const hits = rows.filter((r) => r.kind === "canonical" && r.dest === `packages/inlay/src/${f}`);
      expect(hits.length, f).toBeGreaterThan(0);
      for (const r of hits) {
        const src = sourcePath(r.source);
        if (!existsSync(src)) continue;
        expect(createHash("sha256").update(readFileSync(src)).digest("hex"), r.id).toBe(r.sha256);
      }
    }
  });
});
