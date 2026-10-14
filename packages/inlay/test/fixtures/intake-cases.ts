// Intake parity cases (M03-T02). One runner, two callers: the golden script
// (packages/inlay/scripts/intake-golden.mjs) runs it on the badge-replicator
// originals and writes intake-golden.json; test/intake.test.ts runs it on the
// port and compares. Inputs come from a fixed LCG, so the golden depends on
// the source functions only. Byte outputs are recorded as sha256 of the
// bytes plus a few sampled values, numbers as JSON doubles.

import { createHash } from "node:crypto";

export interface Pt { x: number; y: number }
export interface Img { width: number; height: number; data: Uint8ClampedArray }
export interface Ko { mode: "key" | "edges" | "none"; key: readonly [number, number, number]; tolerance: number; softness: number; trim: boolean }
export interface St { method: "median" | "percentile" | "min" | "mean" | "trimmed"; percentile: number; trim: number }

export interface IntakeApi {
  solveHomography(src: Pt[], dst: Pt[]): readonly number[];
  gaussianSolve(a: number[][], b: number[]): number[];
  warpToRect(source: Img, corners: Pt[], width: number, height: number): Uint8ClampedArray;
  suggestSize(corners: Pt[], cap?: number): { width: number; height: number };
  createReducer(o: St): (values: Float64Array, count: number) => number;
  stackLayers(layers: Uint8ClampedArray[], w: number, h: number, r: (v: Float64Array, c: number) => number, p?: (v: number) => void): Promise<Uint8ClampedArray>;
  knockoutKey(s: Img, o: Ko): Img;
  knockoutEdges(s: Img, o: Ko): Img;
  sampleBorder(s: Img): [number, number, number];
  contentBounds(s: Img, floor?: number): { x: number; y: number; width: number; height: number } | null;
  applyKnockout(s: Img, o: Ko): Img;
  defaultKnockout(): Ko;
  /** The stage: warp marked shots, stack two or more, knockout, trim. */
  compose(shots: Img[], corners: (Pt[] | null)[], ko: Ko | null, st: St): Promise<Img>;
}

const sha = (b: Uint8ClampedArray): string => createHash("sha256").update(b).digest("hex");
const bytes = (b: Uint8ClampedArray): { sha256: string; length: number; sample: number[] } => ({
  sha256: sha(b),
  length: b.length,
  sample: [0, 1, 2, 3, 401, 402, 403, 777, b.length - 1].filter((i) => i >= 0 && i < b.length).map((i) => b[i] ?? -1),
});
const img = (i: Img): { width: number; height: number; data: ReturnType<typeof bytes> } => ({ width: i.width, height: i.height, data: bytes(i.data) });

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function noise(w: number, h: number, seed: number, alpha = true): Img {
  const r = lcg(seed);
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(r() * 256);
  if (!alpha) for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { width: w, height: h, data };
}

/**
 * A magenta plate with an art block, a magenta island inside the block,
 * near-key pixels at known distances along row 1, and a few cut pixels.
 */
export function plate(w: number, h: number, seed: number): Img {
  const r = lcg(seed);
  const data = new Uint8ClampedArray(w * h * 4);
  const set = (x: number, y: number, c: readonly number[]): void => {
    const o = (y * w + x) * 4;
    data[o] = c[0] ?? 0; data[o + 1] = c[1] ?? 0; data[o + 2] = c[2] ?? 0; data[o + 3] = c[3] ?? 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, [255, Math.floor(r() * 12), 255 - Math.floor(r() * 12), 255]);
  const x0 = Math.floor(w / 4), x1 = Math.floor((3 * w) / 4), y0 = Math.floor(h / 4), y1 = Math.floor((3 * h) / 4);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, [Math.floor(r() * 120), 40 + Math.floor(r() * 200), Math.floor(r() * 160), 255]);
  const cx = Math.floor((x0 + x1) / 2), cy = Math.floor((y0 + y1) / 2);
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) set(x, y, [255, 0, 255, 255]);
  // Distances 60 to 110 from the key in the green channel, through the 70 to 100 ramp.
  for (let k = 0; k < Math.min(w, 11); k++) set(k, 1, [255, 60 + 5 * k, 255, 255]);
  set(w - 1, h - 1, [255, 0, 255, 0]);
  set(w - 2, h - 1, [10, 200, 30, 5]);
  set(x0, y0, [10, 200, 30, 140]);
  return { width: w, height: h, data };
}

/** A plate seen through glare: each shot brightens a different disc. */
function glared(base: Img, seed: number): Img {
  const r = lcg(seed);
  const data = new Uint8ClampedArray(base.data);
  const gx = r() * base.width, gy = r() * base.height, gr = 2 + r() * base.width / 4;
  for (let y = 0; y < base.height; y++) for (let x = 0; x < base.width; x++) {
    if (Math.hypot(x - gx, y - gy) > gr) continue;
    const o = (y * base.width + x) * 4;
    for (let c = 0; c < 3; c++) data[o + c] = Math.min(255, (data[o + c] ?? 0) + 90);
  }
  return { width: base.width, height: base.height, data };
}

export async function runCases(api: IntakeApi): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  const unit: Pt[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  const quad: Pt[] = [{ x: 10, y: 20 }, { x: 110, y: 25 }, { x: 105, y: 130 }, { x: 5, y: 120 }];
  out["homography.unit"] = [...api.solveHomography(unit, quad)];
  out["homography.rect"] = [...api.solveHomography(
    [{ x: 0, y: 0 }, { x: 24, y: 0 }, { x: 24, y: 18 }, { x: 0, y: 18 }],
    [{ x: 3.2, y: 1.5 }, { x: 33.7, y: 4.1 }, { x: 30.9, y: 27.3 }, { x: 1.1, y: 24.8 }])];
  out["gauss.zeroPivot"] = api.gaussianSolve([[0, 0], [0, 0]], [1, 2]);
  out["gauss.pivoting"] = api.gaussianSolve([[1e-9, 2, 3], [4, 5, 6], [7, 8, 10]], [1, 2, 3]);

  const src = noise(37, 29, 7, false);
  out["warp.inside"] = bytes(api.warpToRect(src, [{ x: 3.2, y: 1.5 }, { x: 33.7, y: 4.1 }, { x: 30.9, y: 27.3 }, { x: 1.1, y: 24.8 }], 24, 18));
  out["warp.overhang"] = bytes(api.warpToRect(src, [{ x: -3.5, y: 2.25 }, { x: 40.1, y: -1.7 }, { x: 33.3, y: 31.9 }, { x: 2.6, y: 26.4 }], 31, 22));
  out["size"] = [
    api.suggestSize(quad),
    api.suggestSize([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 20 }, { x: 0, y: 20 }]),
    api.suggestSize([{ x: 0, y: 0 }, { x: 4000, y: 100 }, { x: 3900, y: 2500 }, { x: 50, y: 2400 }]),
    api.suggestSize([{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 300 }, { x: 0, y: 300 }], 200),
  ];

  const sets = [[10, 200, 12], [10, 200, 12, 14], [1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 100], [42], [9, 1, 250, 7, 7, 3]];
  const opts: St[] = [
    { method: "median", percentile: 25, trim: 0.25 },
    { method: "percentile", percentile: 25, trim: 0.25 },
    { method: "percentile", percentile: 0, trim: 0.25 },
    { method: "percentile", percentile: 80, trim: 0.25 },
    { method: "min", percentile: 25, trim: 0.25 },
    { method: "mean", percentile: 25, trim: 0.25 },
    { method: "trimmed", percentile: 25, trim: 0.25 },
    { method: "trimmed", percentile: 25, trim: 0.9 },
    { method: "trimmed", percentile: 25, trim: -1 },
  ];
  out["reduce"] = opts.map((o) => sets.map((s) => api.createReducer(o)(Float64Array.from(s), s.length)));

  // 8192 wide, the D-166 raster cap the port enforces: max(1, floor(40000 / 8192)) = 4 rows per chunk, three chunks over 9 rows.
  const wide = [noise(8192, 9, 11), noise(8192, 9, 12), noise(8192, 9, 13)];
  const progress: number[] = [];
  out["stack.chunked"] = bytes(await api.stackLayers(wide.map((l) => l.data), 8192, 9, api.createReducer(opts[0] as St), (v) => progress.push(v)));
  out["stack.progress"] = progress;
  const five = [1, 2, 3, 4, 5].map((k) => noise(13, 11, 100 + k).data);
  out["stack.methods"] = await Promise.all(opts.map(async (o) => bytes(await api.stackLayers(five, 13, 11, api.createReducer(o)))));

  const p = plate(31, 23, 5);
  const ko = api.defaultKnockout();
  out["knockout.default"] = ko;
  const edgesKey: Ko = { ...ko };
  const edgesMode: Ko = { ...ko, mode: "edges" };
  const hard: Ko = { ...ko, softness: 0 };
  out["knockout.key"] = img(api.knockoutKey(p, ko));
  out["knockout.keyHard"] = img(api.knockoutKey(p, hard));
  out["knockout.edgesKey"] = img(api.knockoutEdges(p, edgesKey));
  out["knockout.edgesMode"] = img(api.knockoutEdges(p, edgesMode));
  out["knockout.applyNone"] = img(api.applyKnockout(p, { ...ko, mode: "none" }));
  out["knockout.border"] = [api.sampleBorder(p), api.sampleBorder({ width: 3, height: 3, data: new Uint8ClampedArray(36) })];
  out["bounds"] = [
    api.contentBounds(api.knockoutKey(p, ko)),
    api.contentBounds(api.knockoutEdges(p, edgesKey)),
    api.contentBounds(api.knockoutKey(p, ko), 200),
    api.contentBounds({ width: 2, height: 2, data: new Uint8ClampedArray(16) }),
  ];

  const card = plate(48, 36, 21);
  const shots = [31, 32, 33, 34].map((s) => glared(card, s));
  const corners: Pt[] = [{ x: 2.5, y: 1.25 }, { x: 46.0, y: 3.0 }, { x: 44.5, y: 34.75 }, { x: 0.5, y: 33.0 }];
  out["compose.stackKey"] = img(await api.compose(shots, shots.map(() => corners), ko, opts[0] as St));
  out["compose.stackEdgesTrimmed"] = img(await api.compose(shots, shots.map(() => corners), edgesMode, opts[6] as St));
  out["compose.plateEdges"] = img(await api.compose([p], [null], edgesMode, opts[0] as St));
  out["compose.noKnockout"] = img(await api.compose(shots.slice(0, 2), [corners, corners], null, opts[4] as St));
  return out;
}
