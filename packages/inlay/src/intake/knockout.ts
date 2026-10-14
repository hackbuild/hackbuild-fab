// Background removal (M03-T02 step 4). Port of badge-replicator
// src/lib/knockout.ts (lineage inlay.intake-knockout/badge-replicator).
// A model returns art on a flat plate far more reliably than with real
// alpha, so the default asks for a key colour and cuts it here, exact and
// repeatable. The eyedropper and hex helpers stay in the ui (tier 3).

import { at, checkImage, type KnockoutOptions, type RgbaImage } from "./image.js";

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function distance(r: number, g: number, b: number, key: readonly number[]): number {
  const dr = r - at(key, 0);
  const dg = g - at(key, 1);
  const db = b - at(key, 2);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Alpha for one pixel: 0 at or inside the tolerance, 255 at tolerance plus
 * softness or past it (or when softness is 0), ramped between so edges do
 * not stair step.
 */
export function alphaFor(d: number, tolerance: number, softness: number): number {
  if (d <= tolerance) return 0;
  if (softness <= 0 || d >= tolerance + softness) return 255;
  return Math.round(((d - tolerance) / softness) * 255);
}

const copyOf = (source: RgbaImage): RgbaImage => ({ width: source.width, height: source.height, data: new Uint8ClampedArray(source.data) });

/** Cut every pixel close to the key colour, wherever it sits; alpha only falls. */
export function knockoutKey(source: RgbaImage, options: KnockoutOptions): RgbaImage {
  checkImage(source, "/img");
  const out = copyOf(source);
  const data = out.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const d = distance(at(data, i), at(data, i + 1), at(data, i + 2), options.key);
    const alpha = alphaFor(d, options.tolerance, options.softness);
    data[i + 3] = Math.min(at(data, i + 3), alpha);
  }
  return out;
}

/**
 * Cut only background 4-connected to the frame edge, joined within
 * tolerance plus softness. Keeps a key-coloured shape inside the art, which
 * the flat key pass would eat. Edges mode seeds from the border colour.
 */
export function knockoutEdges(source: RgbaImage, options: KnockoutOptions): RgbaImage {
  checkImage(source, "/img");
  const { width, height } = source;
  const out = copyOf(source);
  const data = out.data;
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;

  const seed = options.mode === "edges" ? sampleBorder(source) : options.key;

  const push = (index: number): void => {
    if (index < 0 || index >= width * height || seen[index]) return;
    const o = index * 4;
    const d = distance(at(data, o), at(data, o + 1), at(data, o + 2), seed);
    if (d > options.tolerance + options.softness) return;
    seen[index] = 1;
    stack[top++] = index;
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (top > 0) {
    const index = at(stack, --top);
    const o = index * 4;
    const d = distance(at(data, o), at(data, o + 1), at(data, o + 2), seed);
    data[o + 3] = Math.min(at(data, o + 3), alphaFor(d, options.tolerance, options.softness));

    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
  }
  return out;
}

interface Bucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

/**
 * The most common colour around the frame, which is almost always the
 * plate: a 15-bit histogram of border pixels at alpha 8 or more, the mean of
 * the fullest bucket, magenta when no border pixel counts.
 */
export function sampleBorder(source: RgbaImage): [number, number, number] {
  const { width, height, data } = source;
  const buckets = new Map<number, Bucket>();
  const add = (index: number): void => {
    const o = index * 4;
    if (at(data, o + 3) < 8) return;
    const key = ((at(data, o) >> 3) << 10) | ((at(data, o + 1) >> 3) << 5) | (at(data, o + 2) >> 3);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += at(data, o);
    bucket.g += at(data, o + 1);
    bucket.b += at(data, o + 2);
    buckets.set(key, bucket);
  };
  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    add(y * width);
    add(y * width + width - 1);
  }
  let best: Bucket = { count: 0, r: 0, g: 0, b: 0 };
  buckets.forEach((bucket) => {
    if (bucket.count > best.count) best = bucket;
  });
  if (!best.count) return [255, 0, 255];
  return [Math.round(best.r / best.count), Math.round(best.g / best.count), Math.round(best.b / best.count)];
}

/** The box holding every pixel at or above the alpha floor, or null when all are cut. */
export function contentBounds(source: RgbaImage, alphaFloor = 8): Bounds | null {
  const { width, height, data } = source;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (at(data, (y * width + x) * 4 + 3) < alphaFloor) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function applyKnockout(source: RgbaImage, options: KnockoutOptions): RgbaImage {
  checkImage(source, "/img");
  if (options.mode === "none") return source;
  if (options.mode === "edges") return knockoutEdges(source, options);
  return knockoutKey(source, options);
}

/**
 * Crop to the bounds, row by row (badge-replicator src/stores/extract.ts
 * lines 185 to 194, lineage inlay.intake-trim/badge-replicator).
 */
export function cropTo(source: RgbaImage, bounds: Bounds): RgbaImage {
  const data = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  for (let y = 0; y < bounds.height; y++) {
    const from = ((y + bounds.y) * source.width + bounds.x) * 4;
    data.set(source.data.subarray(from, from + bounds.width * 4), y * bounds.width * 4);
  }
  return { width: bounds.width, height: bounds.height, data };
}

export function defaultKnockout(): KnockoutOptions {
  return {
    mode: "key",
    // Pure magenta, the plate the extraction prompt asks the model to fill.
    key: [255, 0, 255],
    tolerance: 70,
    softness: 30,
    trim: true,
  };
}

