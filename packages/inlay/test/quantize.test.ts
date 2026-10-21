// M03-T03 acceptance. Card rows are asserted as the card states them
// (computed from the COLLAR and SPRUE rules); the fixture outputs are held
// against quantize-golden.json, which scripts/quantize-golden.mjs wrote by
// running the cases through the original COLLAR and SPRUE code.

import { existsSync, readFileSync } from "node:fs";
import { sourcePath } from "../../../tools/test-support/originals-root.js";
import { fileURLToPath } from "node:url";
import { sha256Hex } from "@hackbuild/spec";
import { describe, expect, test } from "vitest";
import { hexToRgb, otsu, otsuSize, quantize, type RgbaImage } from "../src/index.js";
import { blank, cardPalettePixels, otsuCases, otsuHalves, put, quantizeCases } from "./fixtures/quantize-cases.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pkg = fileURLToPath(new URL("../", import.meta.url));
const golden = JSON.parse(readFileSync(pkg + "test/fixtures/quantize-golden.json", "utf8")) as {
  sources: Record<string, { id: string; sha256: string }>;
  cases: Record<string, { sha256?: string; thr?: number; invert?: boolean }>;
};
const rows = JSON.parse(readFileSync(root + "lineage.json", "utf8")) as { id: string; kind: string; sha256: string; source: string; dest: string | null }[];

const SLOTS = ["#1A1A1A", "#F5F0E6", "#FE0386"];
const label = (labels: Uint8Array, img: RgbaImage, x: number, y: number): number => labels[y * img.width + x] ?? -1;
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as { hbf?: { code: string } }).hbf?.code;
  }
  return undefined;
};

describe("palette (card acceptance, COLLAR collar.html:1088 to 1103)", () => {
  const img = cardPalettePixels();
  const g = quantize(img, "palette", { res: 8, slots: SLOTS, body: 1 });
  test("(250, 10, 130) maps to slot 3", () => expect(label(g.labels, img, 0, 0)).toBe(3));
  test("(240, 236, 226) maps to slot 2", () => expect(label(g.labels, img, 1, 0)).toBe(2));
  test("(30, 30, 30) is nearest the body slot and stays 0", () => expect(label(g.labels, img, 2, 0)).toBe(0));
  test("alpha 119 stays 0, alpha 120 is read", () => {
    expect(label(g.labels, img, 3, 0)).toBe(0);
    expect(label(g.labels, img, 4, 0)).toBe(3);
  });
  test("the grid keeps the read's size and res", () => expect([g.w, g.h, g.res, g.labels.length]).toEqual([8, 8, 8, 64]));
  test("an equal-distance tie goes to the lower slot", () => {
    const one = blank(1, 1);
    put(one, 0, 0, [9, 9, 9, 255]);
    expect(quantize(one, "palette", { res: 1, slots: ["#000", "#000"], body: 0 }).labels[0]).toBe(1);
  });
  test("weights 0.30, 0.59, 0.11 decide where unweighted distance would not", () => {
    const one = blank(1, 1);
    // pixel (100, 80, 0): slot 1 (0, 80, 0) is 0.30 * 100^2 = 3000, slot 2 (100, 0, 0) is 0.59 * 80^2 = 3776
    put(one, 0, 0, [100, 80, 0, 255]);
    expect(quantize(one, "palette", { res: 1, slots: ["#005000", "#640000"], body: 0 }).labels[0]).toBe(1);
    // pixel (95, 0, 150): slot 1 (95, 0, 0) is 0.11 * 150^2 = 2475, slot 2 (0, 0, 150) is 0.30 * 95^2 = 2707.5
    put(one, 0, 0, [95, 0, 150, 255]);
    expect(quantize(one, "palette", { res: 1, slots: ["#5f0000", "#000096"], body: 0 }).labels[0]).toBe(1);
  });
});

describe("mono and alpha (card acceptance, collar.html:1104 to 1116)", () => {
  // (4, 210, 31) has luminance exactly 128 in double precision (computed);
  // grey (129, 129, 129) is exactly 129; grey 128 computes to
  // 127.99999999999999, so it is a hit either side of thr 128 without invert
  // and never with it, as in the source.
  const img = blank(4, 1);
  put(img, 0, 0, [4, 210, 31, 255]);
  put(img, 1, 0, [129, 129, 129, 255]);
  put(img, 2, 0, [0, 0, 0, 119]);
  put(img, 3, 0, [128, 128, 128, 255]);
  test("thr 128: luminance 128 is a hit, 129 is not", () => {
    expect(Array.from(quantize(img, "mono", { res: 1, slot: 2 }).labels)).toEqual([2, 0, 0, 2]);
  });
  test("invert reverses: luminance 128 and 129 hit at or over 128, 127.99999999999999 does not", () => {
    expect(Array.from(quantize(img, "mono", { res: 1, slot: 2, thr: 128, invert: true }).labels)).toEqual([2, 2, 0, 0]);
  });
  test("alpha under 120 is never a hit, in mono or alpha mode", () => {
    expect(quantize(img, "mono", { res: 1, slot: 1, thr: 255 }).labels[2]).toBe(0);
    expect(Array.from(quantize(img, "alpha", { res: 1, slot: 4 }).labels)).toEqual([4, 4, 0, 4]);
  });
  test("luminance weights 0.299, 0.587, 0.114", () => {
    const one = blank(1, 1);
    put(one, 0, 0, [255, 100, 0, 255]); // 76.245 + 58.7 = 134.945
    expect(quantize(one, "mono", { res: 1, slot: 1, thr: 135 }).labels[0]).toBe(1);
    expect(quantize(one, "mono", { res: 1, slot: 1, thr: 134 }).labels[0]).toBe(0);
    put(one, 0, 0, [0, 0, 255, 255]); // 29.07
    expect(quantize(one, "mono", { res: 1, slot: 1, thr: 30 }).labels[0]).toBe(1);
    expect(quantize(one, "mono", { res: 1, slot: 1, thr: 29 }).labels[0]).toBe(0);
  });
  test("row order is the read's: no flip in quantize (card step 6)", () => {
    const tall = blank(1, 2);
    put(tall, 0, 0, [0, 0, 0, 255]);
    expect(Array.from(quantize(tall, "alpha", { res: 1, slot: 1 }).labels)).toEqual([1, 0]);
  });
});

describe("otsu (card acceptance, SPRUE sprue.html:1517 to 1538)", () => {
  test("256 x 256 split 50/50 between luminance 40 and 210: thr in 41 to 210, invert false", () => {
    const r = otsu(otsuHalves(null));
    expect(r.thr).toBeGreaterThanOrEqual(41);
    expect(r.thr).toBeLessThanOrEqual(210);
    expect(r.invert).toBe(false);
  });
  test("the same fixture with a luminance-40 border: invert true", () => {
    expect(otsu(otsuHalves(40)).invert).toBe(true);
  });
  test("zero variance gives 128", () => {
    const flat = blank(8, 8);
    for (let p = 0; p < 64; p++) flat.data.set([40, 40, 40, 255], p * 4);
    expect(otsu(flat)).toEqual({ thr: 128, invert: true });
  });
  test("otsuSize is the source canvas size: long side 256, short side at least 8", () => {
    expect(otsuSize(1600, 800)).toEqual({ width: 256, height: 128 });
    expect(otsuSize(300, 10)).toEqual({ width: 256, height: 9 });
    expect(otsuSize(4, 100)).toEqual({ width: 8, height: 100 });
    expect(otsuSize(256, 256)).toEqual({ width: 256, height: 256 });
  });
  test("an image the source would resample is refused", () => {
    expect(code(() => otsu(blank(257, 10)))).toBe("E_SCHEMA");
    expect(code(() => otsu(blank(7, 7)))).toBe("E_SCHEMA");
    expect(code(() => otsu(blank(8, 8)))).toBeUndefined();
  });
});

describe("port against the originals (quantize-golden.json)", () => {
  test("the golden was made from the lineage rows this port starts from", () => {
    for (const s of Object.values(golden.sources)) {
      const row = rows.find((r) => r.id === s.id);
      expect(row?.sha256, s.id).toBe(s.sha256);
    }
    expect(rows.find((r) => r.id === "collar.bench/inlay-quantize")?.dest).toBe("packages/inlay/src/quantize.ts");
    expect(rows.find((r) => r.id === "sprue.bench/inlay-otsu")?.dest).toBe("packages/inlay/src/otsu.ts");
    const canon = rows.filter((r) => r.kind === "canonical" && (r.sha256 === golden.sources.quantize?.sha256 || r.sha256 === golden.sources.otsu?.sha256));
    expect(canon.map((r) => r.id).sort()).toEqual(["collar.bench/collar-7", "sprue.bench/sprue-html"]);
  });

  test("the golden sources match the files on disk when they are on this machine", (ctx) => {
    let n = 0;
    for (const s of Object.values(golden.sources)) {
      const row = rows.find((r) => r.id === s.id);
      const src = row === undefined ? "" : sourcePath(row.source);
      if (src === "" || !existsSync(src)) continue;
      expect(sha256Hex(new Uint8Array(readFileSync(src))), s.id).toBe(s.sha256);
      n++;
    }
    if (n === 0) ctx.skip();
  });

  const qc = quantizeCases();
  test("every quantize case has a golden and every golden a case", () => {
    const ids = [...qc.map((c) => c.id), ...otsuCases().map((c) => `otsu-${c.id}`)].sort();
    expect(Object.keys(golden.cases).sort()).toEqual(ids);
  });
  test.each(qc.map((c) => [c.id, c] as const))("%s equals COLLAR cell for cell", (id, c) => {
    const g = quantize(c.img, c.mode, c.opts as never);
    expect(sha256Hex(g.labels)).toBe(golden.cases[id]?.sha256);
  });
  test.each(otsuCases().map((c) => [c.id, c] as const))("otsu %s equals SPRUE autoThreshold", (id, c) => {
    expect(otsu(c.img)).toEqual(golden.cases[`otsu-${id}`]);
  });
});

describe("refusals", () => {
  const img = blank(2, 2);
  test("a bad slot colour, an empty palette, a slot outside 1 to 255, a bad mode or res, a short buffer", () => {
    expect(code(() => quantize(img, "palette", { res: 1, slots: ["#12345"], body: 1 }))).toBe("E_SCHEMA");
    expect(code(() => quantize(img, "palette", { res: 1, slots: [], body: 1 }))).toBe("E_SCHEMA");
    expect(code(() => quantize(img, "mono", { res: 1, slot: 0 }))).toBe("E_SCHEMA");
    expect(code(() => quantize(img, "alpha", { res: 1, slot: 256 }))).toBe("E_SCHEMA");
    expect(code(() => quantize(img, "sepia" as never, { res: 1, slot: 1 } as never))).toBe("E_SCHEMA");
    expect(code(() => quantize(img, "alpha", { res: 0, slot: 1 }))).toBe("E_SCHEMA");
    expect(code(() => quantize({ width: 2, height: 2, data: new Uint8ClampedArray(15) }, "alpha", { res: 1, slot: 1 }))).toBe("E_SCHEMA");
  });
  test("hexToRgb reads #rgb and #rrggbb as COLLAR hex2rgb", () => {
    expect(hexToRgb("#FE0386")).toEqual([254, 3, 134]);
    expect(hexToRgb("0f8")).toEqual([0, 255, 136]);
  });
});
