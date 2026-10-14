// D-166 untrusted-input fuzz for raster intake (ARCHITECTURE.md 11.1,
// M03-T02). Every generated width, height and buffer length either passes
// the intake entries or is refused with E_SCHEMA naming the
// inlay-intake/raster-size rule; any other throw fails, the E_KERNEL read
// past the end of a buffer included. Declared sizes past the cap ride on
// tiny buffers, so a missing check shows as an allocation or an E_KERNEL.
//
// Push runs FC_RUNS=100, nightly FC_RUNS=2000; the seed prints on failure.
// Replay: FC_SEED=<s> FC_PATH=<p> npx vitest run packages/inlay/test/raster.fuzz.prop.test.ts

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isThrownCommandError } from "@hackbuild/spec";
import {
  applyKnockout, checkImage, createReducer, defaultKnockout, defaultStack, intake, knockoutEdges, knockoutKey,
  RASTER_MAX_SIDE, stackLayers, warpToRect, type Point, type RgbaImage,
} from "../src/index.js";

const FC_RUNS = Number(process.env["FC_RUNS"] ?? 100);
const SEED = Number(process.env["FC_SEED"] ?? 20261008);
const PATH = process.env["FC_PATH"];
const params = (numRuns: number): fc.Parameters<unknown> => ({ seed: SEED, numRuns, ...(PATH !== undefined ? { path: PATH, endOnFailure: true } : {}) });
const RULE = "inlay-intake/raster-size";

const side = fc.oneof(
  fc.integer({ min: -2, max: 16 }),
  fc.integer({ min: RASTER_MAX_SIDE - 2, max: RASTER_MAX_SIDE + 2 }),
  fc.integer({ min: 1, max: 1_000_000 }),
  fc.double({ min: -1, max: 9000, noNaN: false }),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);
const valid = (w: number, h: number): boolean => [w, h].every((n) => Number.isInteger(n) && n >= 1 && n <= RASTER_MAX_SIDE);

/** Passes, or is refused with the raster rule. Anything else rethrows and fails the property. */
function passOrRule(run: () => unknown): "pass" | "refused" {
  try {
    run();
    return "pass";
  } catch (e) {
    if (isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && e.hbf.record === RULE) return "refused";
    throw e;
  }
}
async function passOrRuleAsync(run: () => Promise<unknown>): Promise<"pass" | "refused"> {
  try {
    await run();
    return "pass";
  } catch (e) {
    if (isThrownCommandError(e) && e.hbf.code === "E_SCHEMA" && e.hbf.record === RULE) return "refused";
    throw e;
  }
}

describe("raster intake limit fuzz (D-166)", () => {
  it("checkImage refuses exactly the sizes and lengths outside the rule", () => {
    fc.assert(fc.property(side, side, fc.integer({ min: -8, max: 8 }), (w, h, delta) => {
      const want = valid(w, h) ? w * h * 4 + delta : 16;
      // Sizes only: checkImage reads data.length and never a pixel.
      const img = { width: w, height: h, data: { length: Math.max(0, want) } as unknown as Uint8ClampedArray };
      const ok = valid(w, h) && Math.max(0, want) === w * h * 4;
      expect(passOrRule(() => checkImage(img, "/img"))).toBe(ok ? "pass" : "refused");
    }), params(FC_RUNS));
  });

  it("every allocating entry passes a well-formed image and refuses a lying one before it reads", async () => {
    await fc.assert(fc.asyncProperty(
      fc.oneof(fc.integer({ min: 1, max: 12 }), fc.integer({ min: RASTER_MAX_SIDE + 1, max: 1_000_000 })),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: -8, max: 8 }),
      fc.boolean(),
      async (w, h, delta, wide) => {
        const [width, height] = wide ? [h, w] : [w, h];
        const fits = valid(width, height);
        const bytes = fits ? Math.max(0, width * height * 4 + delta) : 16;
        const img: RgbaImage = { width, height, data: new Uint8ClampedArray(bytes) };
        const ok = fits && bytes === width * height * 4;
        const want = ok ? "pass" : "refused";
        const ko = defaultKnockout();
        const corners: Point[] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }];
        expect(passOrRule(() => knockoutKey(img, ko))).toBe(want);
        expect(passOrRule(() => knockoutEdges(img, ko))).toBe(want);
        expect(passOrRule(() => applyKnockout(img, { ...ko, mode: "edges" }))).toBe(want);
        expect(passOrRule(() => warpToRect(img, corners, 4, 4))).toBe(want);
        // The output rectangle is checked like a source: the declared size, as the warp target.
        expect(passOrRule(() => warpToRect({ width: 4, height: 4, data: new Uint8ClampedArray(64) }, corners, width, height))).toBe(fits ? "pass" : "refused");
        expect(await passOrRuleAsync(() => stackLayers([img.data, img.data], width, height, createReducer(defaultStack())))).toBe(want);
        expect(await passOrRuleAsync(() => intake([img], null, { knockout: null }))).toBe(want);
      },
    ), params(FC_RUNS));
  });
});
