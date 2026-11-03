// The image layer's route: a PNG data uri decodes with no host decoder,
// thresholds to a mask, traces into a path layer the vector surface fills
// even-odd. The PNGs are written here with node zlib, so every expected
// number follows from the pixels the test sets.

import { deflateSync } from "node:zlib";
import { describe, expect, test } from "vitest";
import { flattenSvgPath, ringArea2 } from "@hackbuild/geom";
import { artLayer, type ArtLayer } from "@hackbuild/spec";
import { imageToPath, lowerArtLayer, lowerArtLayerWith } from "../src/art-lower.js";
import { dataUriBytes, decodePng } from "../src/png.js";

/** A PNG of w x h pixels, colour type 6 (RGBA) or 0 (grey), every row with the given filter byte. */
function png(w: number, h: number, px: (x: number, y: number) => readonly number[], type: 6 | 0 = 6, filter = 1): Uint8Array {
  const ch = type === 6 ? 4 : 1;
  const raw: number[] = [];
  for (let y = 0; y < h; y += 1) {
    raw.push(filter);
    const row: number[] = [];
    for (let x = 0; x < w; x += 1) row.push(...px(x, y).slice(0, ch));
    // filter 1 (sub): each byte minus the byte one pixel left
    raw.push(...row.map((v, i) => (filter === 1 ? (v - (i >= ch ? row[i - ch]! : 0)) & 0xff : v)));
  }
  const chunk = (kind: string, body: Uint8Array): Buffer => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    return Buffer.concat([len, Buffer.from(kind, "latin1"), Buffer.from(body), Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = type;
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from(raw))), chunk("IEND", new Uint8Array(0))]));
}

const uri = (b: Uint8Array): string => `data:image/png;base64,${Buffer.from(b).toString("base64")}`;
/** A 10 x 10 white image with a black 4 x 4 square at x 3 to 6, y 3 to 6. */
const square = (x: number, y: number): number[] => (x >= 3 && x < 7 && y >= 3 && y < 7 ? [0, 0, 0, 255] : [255, 255, 255, 255]);
const imageLayer = (src: string, extra: Partial<Record<string, unknown>> = {}): ArtLayer => ({ ...artLayer("image", "img"), src, w: 20, slot: 2, ...extra } as ArtLayer);

describe("decodePng", () => {
  test("reads RGBA through the sub filter, and grey to equal RGB", () => {
    const rgba = decodePng(png(10, 10, square));
    expect([rgba.width, rgba.height]).toEqual([10, 10]);
    expect([...rgba.data.subarray((3 * 10 + 3) * 4, (3 * 10 + 3) * 4 + 4)]).toEqual([0, 0, 0, 255]);
    expect([...rgba.data.subarray(0, 4)]).toEqual([255, 255, 255, 255]);
    const grey = decodePng(png(4, 1, (x) => [x * 60], 0, 0));
    expect([...grey.data.subarray(4, 8)]).toEqual([60, 60, 60, 255]);
  });

  test("refuses bytes that are not a PNG, and a src that is not a PNG data uri", () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow(/not a PNG/);
    expect(() => dataUriBytes("hbf://source/abc")).toThrow(/data uri/);
  });
});

describe("the image layer", () => {
  test("a black square in mono traces to one 16 px2 loop and lowers to a 64 mm2 path at 20 mm across 10 px", () => {
    const src = uri(png(10, 10, square));
    const t = imageToPath(imageLayer(src) as never);
    expect([t.width, t.height]).toEqual([10, 10]);
    const rings = flattenSvgPath(t.d, [1, 0, 0, 1, 0, 0]);
    expect(rings).toHaveLength(1);
    expect(Math.abs(ringArea2(rings[0]!)) / 2).toBeCloseTo(16, 6);
    const p = lowerArtLayer(imageLayer(src)) as unknown as { kind: string; d: string; transform: number[]; slot: number };
    expect(p).toMatchObject({ kind: "path", slot: 2 });
    const mm = flattenSvgPath(p.d, p.transform as never);
    expect(Math.abs(ringArea2(mm[0]!)) / 2).toBeCloseTo(16 * 4, 6);
  });

  test("silhouette takes the alpha, and invert in mono traces the white", () => {
    const alphaSquare = (x: number, y: number): number[] => (x >= 3 && x < 7 && y >= 3 && y < 7 ? [255, 0, 0, 255] : [0, 0, 0, 0]);
    const sil = imageToPath(imageLayer(uri(png(10, 10, alphaSquare)), { mode: "silhouette" }) as never);
    expect(Math.abs(ringArea2(flattenSvgPath(sil.d, [1, 0, 0, 1, 0, 0])[0]!)) / 2).toBeCloseTo(16, 6);
    const inv = imageToPath(imageLayer(uri(png(10, 10, square)), { invert: true }) as never);
    const r = flattenSvgPath(inv.d, [1, 0, 0, 1, 0, 0]).map((x) => Math.abs(ringArea2(x)) / 2).sort((a, b) => b - a);
    expect(r).toEqual([100, 16]);
  });

  test("a palette image is refused with a fix, and skipped with a warning under the skip policy", () => {
    const L = imageLayer(uri(png(10, 10, square)), { mode: "palette" });
    expect(() => lowerArtLayer(L)).toThrow(/palette/);
    const r = lowerArtLayerWith(L, "", { unsupported: "skip" });
    expect(r.layer).toBeNull();
    expect(r.warnings.map((w) => w.code)).toEqual(["LAYER_SKIPPED"]);
  });
});
