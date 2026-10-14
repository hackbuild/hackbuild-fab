// M03-T04 step 6 in node: COLLAR's renderLayer, run unchanged from
// designs/collar/legacy/collar.html, and the port (inlay layers painting
// through canvasSurface) each get a recording 2D context. Every paint must
// arrive with the same transform calls since the last setTransform, the
// same arguments bit for bit and the same font state, and every read must
// produce the same mask. A browser that receives the same calls paints the
// same pixels, so this is the cell-for-cell argument without a browser.

import { describe, expect, test } from "vitest";
import { drawImageLayer, renderText, type ImageLayer, type RasterGrid, type TextLayer } from "@hackbuild/inlay";
import { canvasSurface, cssFont, type Context2D } from "../src/surface/canvas-surface.js";
import { loadCollar } from "../../inlay/test/fixtures/collar-legacy.js";

type Op = readonly unknown[];

/** Records transform calls since the last setTransform, with save and restore, and every paint and read. */
class RecCtx implements Context2D {
  font = "10px sans-serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  fillStyle: unknown = "#000";
  events: Record<string, unknown>[] = [];
  #ops: Op[] = [];
  #stack: Op[][] = [];
  #reads = 0;
  constructor(readonly w: number, readonly h: number) {}
  #state() {
    return { ops: this.#ops.map((o) => [...o]), font: this.font, align: this.textAlign, baseline: this.textBaseline, fill: this.fillStyle };
  }
  save(): void { this.#stack.push(this.#ops.map((o) => [...o])); }
  restore(): void { this.#ops = this.#stack.pop() ?? []; }
  setTransform(...a: number[]): void { this.#ops = [["setTransform", ...a]]; }
  transform(...a: number[]): void { this.#ops.push(["transform", ...a]); }
  translate(...a: number[]): void { this.#ops.push(["translate", ...a]); }
  rotate(a: number): void { this.#ops.push(["rotate", a]); }
  scale(...a: number[]): void { this.#ops.push(["scale", ...a]); }
  clearRect(...a: number[]): void { this.events.push({ ev: "clear", a, ops: this.#state().ops }); }
  fillText(text: string, x: number, y: number): void { this.events.push({ ev: "fillText", text, x, y, ...this.#state() }); }
  measureText(text: string): { width: number } {
    const px = Number(/([\d.]+)px/.exec(this.font)![1]);
    return { width: [...text].reduce((s, ch) => s + px * (0.31 + (ch.codePointAt(0)! % 13) / 23), 0) * (this.font.startsWith("700") ? 1.07 : 1) };
  }
  drawImage(img: unknown, ...a: number[]): void { this.events.push({ ev: "drawImage", img, a, ops: this.#state().ops }); }
  getImageData(...a: number[]): { data: Uint8ClampedArray } {
    this.events.push({ ev: "read", a });
    const r = ++this.#reads;
    const data = new Uint8ClampedArray(this.w * this.h * 4);
    for (let q = 0; q < data.length; q++) data[q] = (q * 31 + r * 7 + (q >> 9)) % 256;
    return { data };
  }
  fill(path: unknown, rule: string): void { this.events.push({ ev: "fill", path, rule, ...this.#state() }); }
}

const paints = (c: RecCtx): Record<string, unknown>[] => c.events.filter((e) => e.ev !== "clear");

function legacyRun(L: unknown, res: number) {
  let ctx: RecCtx | null = null;
  const c = loadCollar(() => {
    const canvas = { width: 0, height: 0, getContext: () => (ctx ??= new RecCtx(canvas.width, canvas.height)) };
    return canvas;
  });
  const out = c.renderLayer(L, res);
  return { c, out, ctx: ctx! };
}

async function port(grid: RasterGrid, fonts: string[]) {
  const ctx = new RecCtx(grid.w, grid.h);
  const surface = canvasSurface(grid, { context: () => ctx, fonts: { load: async () => [{}] } });
  await surface.fontsReady(fonts);
  return { ctx, surface };
}

const RES = 96;
const textLayer = (over: Partial<TextLayer>): TextLayer => ({
  kind: "text", text: "hack|.build", slot: 2, accent: 3, font: "Permanent Marker", size: 7.5, mode: "straight",
  dx: 0, dy: 0, rot: 0, arcR: 16.4, arcDeg: 90, flip: false, track: 1.05, runGap: 0.6, caps: false, bold: false, ...over,
});

describe("text: the port issues COLLAR's canvas calls", () => {
  const cases: [string, Partial<TextLayer>][] = [
    ["hack|.build, the COLLAR new-layer default", {}],
    ["moved, rotated, two lines, caps and bold", { text: "make|.things\nbreak|it", dx: 3.25, dy: -2.1, rot: 25, caps: true, bold: true, runGap: 1.3 }],
    ["MAKE THINGS on the arc default", { text: "MAKE THINGS", mode: "arc", size: 4.2 }],
    ["arc flipped with a split and a gap", { text: "hack|.build", mode: "arc", flip: true, arcR: 12.5, arcDeg: -90, track: 1.3 }],
    ["arc with no gap and rot ignored", { text: "a b|c", mode: "arc", runGap: 0, rot: 40, arcDeg: 33 }],
  ];
  test.each(cases)("%s", async (_, over) => {
    const L = textLayer(over);
    const legacy = legacyRun(L, RES);
    const grid = { w: RES, h: RES, res: RES / legacy.c.ST.dia };
    const font = L.bold ? `700 ${L.font}` : L.font;
    const { ctx, surface } = await port(grid, [font]);
    const got = renderText(L, surface, grid);
    const want = legacy.out as { mask: Uint8Array; slot: number }[];
    expect(paints(ctx)).toEqual(paints(legacy.ctx));
    expect(paints(ctx).filter((e) => e.ev === "fillText").length).toBeGreaterThan(1);
    expect(got.map((r) => ("slot" in r ? r.slot : 0))).toEqual(want.map((r) => r.slot));
    got.forEach((r, i) => expect(Buffer.from((r as { mask: Uint8Array }).mask).equals(Buffer.from(want[i]!.mask))).toBe(true));
  });
});

describe("image: the port issues COLLAR's canvas calls and reads rows bottom first", () => {
  const native = { naturalWidth: 300, naturalHeight: 120, width: 300, height: 120 };
  const cases: [string, Partial<ImageLayer>][] = [
    ["mono, scaled, moved, rotated, mirrored", { scale: 0.6, dx: 2.5, dy: -4.75, rot: 30, mirror: true }],
    ["defaults", { scale: undefined as unknown as number, rot: undefined as unknown as number }],
  ];
  test.each(cases)("%s", async (_, over) => {
    const L = { kind: "image", mode: "mono", slot: 2, thr: 128, invert: false, scale: 1, dx: 0, dy: 0, rot: 0, mirror: false, ...over } as ImageLayer & { img: unknown };
    const legacy = legacyRun({ ...L, img: native }, RES);
    const grid = { w: RES, h: RES, res: RES / legacy.c.ST.dia };
    const { ctx, surface } = await port(grid, []);
    const img = drawImageLayer({ ...L, img: { width: 300, height: 120, native } }, surface, grid, legacy.c.R_ART());
    expect(paints(ctx)).toEqual(paints(legacy.ctx));
    // COLLAR's mono rule on the port's read gives COLLAR's mask (rows already flipped by the surface)
    const mask = new Uint8Array(RES * RES);
    for (let p = 0; p < RES * RES; p++) {
      const d = img!.data;
      if (d[p * 4 + 3]! < 120) continue;
      const lum = 0.299 * d[p * 4]! + 0.587 * d[p * 4 + 1]! + 0.114 * d[p * 4 + 2]!;
      if (lum <= 128) mask[p] = 1;
    }
    const want = (legacy.out as { mask: Uint8Array }).mask;
    expect(want.includes(1)).toBe(true);
    expect(Buffer.from(mask).equals(Buffer.from(want))).toBe(true);
  });

  test("an RGBA image goes through the bitmap factory", async () => {
    const grid = { w: 8, h: 8, res: 1 };
    const ctx = new RecCtx(8, 8);
    const rgba = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
    const s = canvasSurface(grid, { context: () => ctx, bitmap: (i) => ({ wrapped: i }) });
    s.drawImage(rgba, 0, 0, 4, 0, false);
    expect(ctx.events.at(-1)).toMatchObject({ ev: "drawImage", img: { wrapped: rgba }, a: [-2, -2, 4, 4] });
  });
});

describe("paths, reads and fonts", () => {
  test("fillPath maps path units to model mm with y up, even-odd", () => {
    const grid = { w: 20, h: 10, res: 2 };
    const ctx = new RecCtx(20, 10);
    const s = canvasSurface(grid, { context: () => ctx, path: (d) => ({ d }) });
    s.fillPath("M0 0H1V1Z", [1, 2, 3, 4, 5, 6]);
    expect(ctx.events[0]).toMatchObject({ ev: "fill", path: { d: "M0 0H1V1Z" }, rule: "evenodd", fill: "#000" });
    const [st, tr] = ctx.events[0]!.ops as number[][];
    expect(st).toEqual(["setTransform", 2, 0, 0, 2, 10, 5]);
    expect(tr).toEqual(["transform", 1, -2, 3, -4, 5, -6]);
    // computed: model (x, y) = (1 x + 3 y + 5, 2 x + 4 y + 6); path (1, 1) is model (9, 12), pixel (10 + 2 x 9, 5 - 2 x 12)
    const [, a, b, c, d, e, f] = tr as number[];
    const px = 2 * (a! * 1 + c! * 1 + e!) + 10, py = 2 * (b! * 1 + d! * 1 + f!) + 5;
    expect([px, py]).toEqual([28, -19]);
  });

  test("readAlpha and readRgba flip rows so row 0 is the bottom; a foreign grid is E_SCHEMA", () => {
    const grid = { w: 3, h: 2, res: 1 };
    const ctx = new RecCtx(3, 2);
    const s = canvasSurface(grid, { context: () => ctx });
    const a = s.readAlpha(grid);
    const top = ctx.getImageData().data;
    // RecCtx data depends on the read count: read 2 is `top`, read 1 was `a`
    const first = new Uint8ClampedArray(24).map((_, q) => (q * 31 + 7 + (q >> 9)) % 256);
    expect([...a]).toEqual([first[15], first[19], first[23], first[3], first[7], first[11]]);
    const rgba = s.readRgba(grid);
    const third = new Uint8ClampedArray(24).map((_, q) => (q * 31 + 21 + (q >> 9)) % 256);
    expect([...rgba.data]).toEqual([...third.subarray(12), ...third.subarray(0, 12)]);
    expect(top.length).toBe(24);
    expect(() => s.readAlpha({ w: 3, h: 2, res: 2 })).toThrow(/E_SCHEMA \/grid/);
  });

  test("text before fontsReady is E_KERNEL; a font with no face rejects; onFontsLoaded runs once after the load", async () => {
    const grid = { w: 4, h: 4, res: 1 };
    let cleared = 0;
    const loads: string[] = [];
    const s = canvasSurface(grid, {
      context: () => new RecCtx(4, 4),
      fonts: { load: async (spec) => (loads.push(spec), spec.includes("Missing") ? [] : [{}]) },
      onFontsLoaded: () => cleared++,
    });
    expect(() => s.measure("a", "Permanent Marker", 7.5)).toThrow(/E_KERNEL \/font/);
    expect(() => s.fillText("a", "Permanent Marker", 7.5, 0, 0, 0)).toThrow(/E_KERNEL \/font/);
    await expect(s.fontsReady(["Missing Face"])).rejects.toThrow(/E_KERNEL \/font.*no face for Missing Face/);
    expect(cleared).toBe(0);
    await s.fontsReady(["Permanent Marker", "700 IBM Plex Mono"]);
    expect(loads.slice(1)).toEqual(['16px "Permanent Marker"', '700 16px "IBM Plex Mono"']);
    expect(cleared).toBe(1);
    expect(s.measure("ab", "Permanent Marker", 7.5)).toBeGreaterThan(0);
    expect(() => s.measure("a", "700 Permanent Marker", 7.5)).toThrow(/E_KERNEL/);
  });

  test("cssFont builds COLLAR's font string", () => {
    expect(cssFont("Permanent Marker", 7.5)).toBe("7.5px Permanent Marker");
    expect(cssFont("700 Permanent Marker", 4.2)).toBe("700 4.2px Permanent Marker");
  });

  test("clear resets to identity and clears the whole canvas", () => {
    const ctx = new RecCtx(6, 5);
    canvasSurface({ w: 6, h: 5, res: 1 }, { context: () => ctx }).clear();
    expect(ctx.events).toEqual([{ ev: "clear", a: [0, 0, 6, 5], ops: [["setTransform", 1, 0, 0, 1, 0, 0]] }]);
  });
});
