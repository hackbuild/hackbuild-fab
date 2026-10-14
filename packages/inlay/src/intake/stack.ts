// Reject glare across aligned shots (M03-T02 step 3). Port of
// badge-replicator src/lib/stack.ts (lineage inlay.intake-stack/badge-replicator);
// the default options are src/stores/capture.ts line 34 (lineage
// inlay.intake-stack-defaults/badge-replicator).

import { commandError } from "@hackbuild/spec";
import { at, checkImage, clamp, row, type StackOptions } from "./image.js";

/** Reduces one channel across the stack to a single value. Sorts `values` in place. */
export type Reducer = (values: Float64Array, count: number) => number;

export function defaultStack(): StackOptions {
  return { method: "median", percentile: 25, trim: 0.25 };
}

/**
 * The rejection rule. Glare moves between shots and print does not, so each
 * method picks the value that repeats.
 */
export function createReducer(options: StackOptions): Reducer {
  switch (options.method) {
    case "min":
      return (values, count) => {
        let v = at(values, 0);
        for (let i = 1; i < count; i++) if (at(values, i) < v) v = at(values, i);
        return v;
      };
    case "mean":
      return (values, count) => {
        let sum = 0;
        for (let i = 0; i < count; i++) sum += at(values, i);
        return sum / count;
      };
    case "percentile": {
      const p = clamp(options.percentile, 1, 50) / 100;
      return (values, count) => {
        const sorted = sortSlice(values, count);
        return at(sorted, clamp(Math.round(p * (count - 1)), 0, count - 1));
      };
    }
    case "trimmed": {
      const fraction = clamp(options.trim, 0, 0.45);
      return (values, count) => {
        const sorted = sortSlice(values, count);
        const cut = Math.floor(count * fraction);
        const low = cut;
        const high = count - cut;
        if (high - low < 1) return at(sorted, count >> 1);
        let sum = 0;
        for (let i = low; i < high; i++) sum += at(sorted, i);
        return sum / (high - low);
      };
    }
    case "median":
    default:
      return (values, count) => {
        const sorted = sortSlice(values, count);
        const mid = count >> 1;
        return count & 1 ? at(sorted, mid) : (at(sorted, mid - 1) + at(sorted, mid)) / 2;
      };
  }
}

/** Insertion sort of the first `count` entries. Stacks are small. */
function sortSlice(values: Float64Array, count: number): Float64Array {
  for (let i = 1; i < count; i++) {
    const v = at(values, i);
    let j = i - 1;
    while (j >= 0 && at(values, j) > v) {
      values[j + 1] = at(values, j);
      j--;
    }
    values[j + 1] = v;
  }
  return values;
}

/**
 * Combine aligned RGBA layers pixel by pixel, alpha 255. Yields to the host
 * between chunks of max(1, floor(40000 / width)) rows so a caller on the main
 * thread can still paint, and reports progress 0 to 1 after each chunk.
 */
export async function stackLayers(
  layers: readonly Uint8ClampedArray[],
  width: number,
  height: number,
  reduce: Reducer,
  onProgress?: (value: number) => void,
): Promise<Uint8ClampedArray> {
  const count = layers.length;
  if (count === 0) {
    throw commandError({ code: "E_SCHEMA", path: "/shots", got: 0, expected: "at least 1 shot", hint: "load at least one shot; there is nothing to composite" });
  }
  layers.forEach((data, k) => checkImage({ width, height, data }, `/shots/${k}`));

  const out = new Uint8ClampedArray(width * height * 4);
  const r = new Float64Array(count);
  const g = new Float64Array(count);
  const b = new Float64Array(count);
  const rowsPerChunk = Math.max(1, Math.floor(40000 / width));

  for (let y0 = 0; y0 < height; y0 += rowsPerChunk) {
    const y1 = Math.min(height, y0 + rowsPerChunk);
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        for (let k = 0; k < count; k++) {
          const layer = row(layers, k);
          r[k] = at(layer, o);
          g[k] = at(layer, o + 1);
          b[k] = at(layer, o + 2);
        }
        out[o] = reduce(r, count);
        out[o + 1] = reduce(g, count);
        out[o + 2] = reduce(b, count);
        out[o + 3] = 255;
      }
    }
    onProgress?.(y1 / height);
    await yieldToHost();
  }
  return out;
}

// ES2023 declares no timer; node and every browser define setTimeout on globalThis.
const host = globalThis as unknown as { setTimeout(fn: () => void, ms: number): unknown };

function yieldToHost(): Promise<void> {
  return new Promise((resolve) => host.setTimeout(resolve, 0));
}

export const STACK_METHOD_LABELS: Readonly<Record<StackOptions["method"], string>> = {
  median: "median",
  percentile: "percentile",
  min: "darken",
  mean: "mean",
  trimmed: "trimmed mean",
};
