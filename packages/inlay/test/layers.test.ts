// M03-T04 steps 3 and 4 against COLLAR v5 itself: ring cells, the art
// radius and the compose order are compared with the legacy renderLayer,
// R_ART and buildFace, run unchanged from designs/collar/legacy/collar.html
// (fixtures/collar-legacy.ts). buildFace runs with boost 0, despeckle off
// and gap 0, which leaves its compose and its art-radius clip; the port's
// compose gets the same clip here, since the clip is a hygiene recipe
// (M03-T05).

import type { ShapeKind } from "@hackbuild/geom";
import { describe, expect, test } from "vitest";
import { composeFace, renderLayer, type Layer } from "../src/face.js";
import { drawImageLayer, type ImageLayer } from "../src/layers/image.js";
import { renderRing, type RingLayer } from "../src/layers/ring.js";
import { artRadius, rimInnerRadius } from "../src/layers/shape.js";
import type { RasterGrid, Surface } from "../src/surface.js";
import { loadCollar } from "./fixtures/collar-legacy.js";

const RES = 160;
const gridOf = (dia: number, res = RES): RasterGrid => ({ w: res, h: res, res: res / dia });

const RINGS: RingLayer[] = [
  { kind: "ring", slot: 3, r0: 10, r1: 14 },
  { kind: "ring", slot: 2, r0: 17, r1: 3 },
  { kind: "ring", slot: 2, r0: 6, r1: 16, seg: 12, duty: 45 },
  { kind: "ring", slot: 4, r0: 0, r1: 20, seg: 7 },
  { kind: "ring", slot: 1, r0: 2, r1: 9, seg: 5.7, duty: 100 },
];

describe("ring layers equal COLLAR renderLayer cell for cell", () => {
  test.each(RINGS.map((r, i) => [i, r] as const))("ring %i", (_, L) => {
    const c = loadCollar();
    const want = c.renderLayer(L, RES) as { mask: Uint8Array; slot: number };
    const [got] = renderRing(L, gridOf(c.ST.dia));
    expect((got as { slot: number }).slot).toBe(want.slot);
    const g = (got as { mask: Uint8Array }).mask;
    expect(g.length).toBe(want.mask.length);
    let diff = 0;
    for (let p = 0; p < g.length; p++) if (g[p] !== want.mask[p]) diff++;
    expect(diff).toBe(0);
    expect(g.includes(1)).toBe(true);
  });

  test("a 12-segment ring is not symmetric top to bottom, so the row order is load-bearing", () => {
    const [r] = renderRing(RINGS[2]!, gridOf(44));
    const m = (r as { mask: Uint8Array }).mask;
    let asym = 0;
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) if (m[j * RES + i] !== m[(RES - 1 - j) * RES + i]) asym++;
    expect(asym).toBeGreaterThan(0);
  });
});

describe("art radius equals COLLAR R_ART", () => {
  const kinds: ShapeKind[] = ["round", "squircle", "rounded", "dogtag", "bar", "hex", "oct", "tri", "shield"];
  test.each(kinds)("%s, rim on and off, keep 1.4 and 30", (kind) => {
    const c = loadCollar();
    for (const [on, keep] of [[true, 1.4], [false, 1.4], [true, 30]] as const) {
      Object.assign(c.ST.shape, { kind, aspect: 0.72, corner: 0.3 });
      Object.assign(c.ST.rim, { on, w: 2.2 });
      c.ST.art.keep = keep;
      const frame = { dia: c.ST.dia, shape: { kind, aspect: 0.72, corner: 0.3 }, rim: { on, w: 2.2 }, keep };
      expect(rimInnerRadius(frame)).toBe(c.R_RIM_IN());
      expect(artRadius(frame)).toBe(c.R_ART());
    }
  });

  test("the floor is 2 mm", () => {
    expect(artRadius({ dia: 44, shape: { kind: "round", aspect: 0.72, corner: 0.3 }, rim: { on: true, w: 2.2 }, keep: 30 })).toBe(2);
  });
});

/** A surface that paints nothing; ring-only faces never call it. */
const idle: Surface = {
  measure: () => 0, fillText: () => {}, fillPath: () => {}, drawImage: () => {},
  readAlpha: (g) => new Uint8Array(g.w * g.h), readRgba: (g) => ({ width: g.w, height: g.h, data: new Uint8ClampedArray(g.w * g.h * 4) }), clear: () => {},
};

describe("compose order equals COLLAR buildFace", () => {
  const faces: [string, Layer[]][] = [
    ["later layers overwrite earlier ones", [RINGS[0]!, RINGS[2]!, RINGS[1]!]],
    ["the reverse order differs", [RINGS[1]!, RINGS[2]!, RINGS[0]!]],
    ["a muted layer is skipped", [RINGS[0]!, { ...RINGS[3]!, off: true }, RINGS[2]!]],
    ["a cut layer goes to holes, unclipped", [RINGS[0]!, { kind: "ring", slot: 2, r0: 0, r1: 3, cut: true }, { kind: "ring", slot: 2, r0: 19, r1: 21.5, cut: true }]],
  ];
  test.each(faces)("%s", (_, layers) => {
    const c = loadCollar();
    Object.assign(c.ST.art, { boost: 0, despeck: false, gap: 0 });
    c.ST.faces.front = layers;
    const want = c.buildFace("front", RES);
    const grid = gridOf(c.ST.dia);
    const got = composeFace(layers, { surface: idle, grid, rArt: c.R_ART() });
    const k = RES / c.ST.dia, rArt = c.R_ART();
    const art = got.art.labels.slice();
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = (i + 0.5 - RES / 2) / k, y = (j + 0.5 - RES / 2) / k;
      if (x * x + y * y > rArt * rArt) art[j * RES + i] = 0;
    }
    expect(Buffer.from(art).equals(Buffer.from(want.art))).toBe(true);
    expect(got.holes === null).toBe(want.holes === null);
    if (want.holes !== null) {
      expect(Buffer.from(got.holes!).equals(Buffer.from(want.holes))).toBe(true);
      // the outer cut ring sits past R_art and survives
      expect(got.holes!.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    }
  });

  test("the reverse order gives a different face", () => {
    const grid = gridOf(44);
    const a = composeFace(faces[0]![1], { surface: idle, grid, rArt: 18 }).art.labels;
    const b = composeFace(faces[1]![1], { surface: idle, grid, rArt: 18 }).art.labels;
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe("image layers", () => {
  class Rec implements Surface {
    calls: unknown[][] = [];
    measure(): number { return 0; }
    fillText(): void {}
    fillPath(): void {}
    drawImage(...a: unknown[]): void { this.calls.push(["drawImage", ...a]); }
    readAlpha(g: RasterGrid): Uint8Array { return new Uint8Array(g.w * g.h); }
    readRgba(g: RasterGrid) {
      this.calls.push(["readRgba"]);
      const data = new Uint8ClampedArray(g.w * g.h * 4);
      data[3] = 255;
      return { width: g.w, height: g.h, data };
    }
    clear(): void { this.calls.push(["clear"]); }
  }
  const img = { width: 40, height: 20, data: new Uint8ClampedArray(40 * 20 * 4) };
  const L: ImageLayer = { kind: "image", img, mode: "mono", slot: 2, scale: 0.5, dx: 1.5, dy: -2, rot: 30, mirror: true };

  test("drawn centred at dx, dy with the long side 2 R_art x scale, radians, mirror, after a clear", () => {
    const s = new Rec();
    const out = drawImageLayer(L, s, { w: 4, h: 4, res: 1 }, 18.4);
    expect(s.calls).toEqual([["clear"], ["drawImage", img, 1.5, -2, 2 * 18.4 * 0.5, (30 * Math.PI) / 180, true], ["readRgba"]]);
    expect(out?.data[3]).toBe(255);
  });

  test("scale defaults to 1, rot to 0, mirror to false", () => {
    const s = new Rec();
    drawImageLayer({ kind: "image", img, mode: "alpha", slot: 2, dx: 0, dy: 0 }, s, { w: 4, h: 4, res: 1 }, 10);
    expect(s.calls[1]).toEqual(["drawImage", img, 0, 0, 20, 0, false]);
  });

  test("no image or a zero-size image paints nothing", () => {
    const s = new Rec();
    expect(drawImageLayer({ ...L, img: null }, s, { w: 4, h: 4, res: 1 }, 10)).toBeNull();
    expect(drawImageLayer({ ...L, img: { width: 0, height: 5, native: null } }, s, { w: 4, h: 4, res: 1 }, 10)).toBeNull();
    expect(s.calls).toEqual([]);
  });

  test("colour modes go through quantize; non-zero cells overwrite earlier layers; palette needs slot colours", () => {
    const grid = { w: 4, h: 1, res: 1 };
    // black, pink, transparent, white, all as the surface read them back
    const px = [[26, 26, 26, 255], [254, 3, 134, 255], [254, 3, 134, 0], [245, 240, 230, 255]];
    const surface = new Rec();
    surface.readRgba = (g: RasterGrid) => ({ width: g.w, height: g.h, data: Uint8ClampedArray.from(px.flat()) });
    const first: RingLayer = { kind: "ring", slot: 1, r0: 0, r1: 99 };
    const palette = { slots: ["#1a1a1a", "#f5f0e6", "#fe0386"], body: 1 };
    const face = (over: Partial<ImageLayer>): number[] => [...composeFace([first, { ...L, ...over }], { surface, grid, rArt: 10, palette }).art.labels];
    expect(face({ mode: "palette" })).toEqual([1, 3, 1, 2]);
    expect(face({ mode: "mono", slot: 4 })).toEqual([4, 4, 1, 1]);
    expect(face({ mode: "mono", slot: 4, thr: 80 })).toEqual([4, 1, 1, 1]);
    expect(face({ mode: "mono", slot: 4, invert: true })).toEqual([1, 1, 1, 4]);
    expect(face({ mode: "alpha", slot: 5 })).toEqual([5, 5, 1, 5]);
    expect(() => renderLayer({ ...L, mode: "palette" }, { surface, grid, rArt: 10 })).toThrow(/E_SCHEMA \/palette/);
  });

});
