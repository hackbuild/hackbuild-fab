// D-166 raster intake limit (ARCHITECTURE.md 11.1 row "raster art | inlay
// intake | at most 8192 px per side"). The cap is read from the plan, not
// from the constant, so a changed constant fails here. Every intake entry
// that allocates from a declared size refuses an oversize side or a buffer
// whose length is not width * height * 4 with E_SCHEMA naming the rule and
// the limit, before it allocates.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { isThrownCommandError, type CommandError } from "@hackbuild/spec";
import {
  applyKnockout, checkImage, checkSide, createReducer, defaultKnockout, defaultStack, intake, knockoutEdges, knockoutKey,
  RASTER_MAX_SIDE, stackLayers, warpToRect, type Point, type RgbaImage,
} from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const RULE = "inlay-intake/raster-size";

/** The cap as the plan states it: ARCHITECTURE.md 11.1 and the D-166 decision text. */
function planCap(): number {
  const arch = readFileSync(root + "docs/plan/ARCHITECTURE.md", "utf8");
  const row = /^\| raster art \| inlay intake \| at most (\d+) px per side \| D-166 \|$/m.exec(arch);
  const decisions = readFileSync(root + "docs/plan/DECISIONS.md", "utf8");
  const d166 = /Raster intake decodes at most (\d+) px per side\./.exec(decisions);
  if (row?.[1] === undefined || d166?.[1] === undefined) throw new Error("the D-166 raster row is missing from ARCHITECTURE.md or DECISIONS.md");
  expect(row[1]).toBe(d166[1]);
  return Number(row[1]);
}

/** A declared size over a buffer of any length; no pixel is read before the check. */
const lying = (width: number, height: number, bytes = 16): RgbaImage => ({ width, height, data: new Uint8ClampedArray(bytes) });
const blank = (width: number, height: number): RgbaImage => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
const square = (w: number, h: number): Point[] => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

function refusal(run: () => unknown): CommandError {
  try {
    run();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("no refusal");
}
async function refusalAsync(run: () => Promise<unknown>): Promise<CommandError> {
  try {
    await run();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf;
    throw e;
  }
  throw new Error("no refusal");
}
function namesTheLimit(h: CommandError, path: string): void {
  expect(h.code).toBe("E_SCHEMA");
  expect(h.record).toBe(RULE);
  expect(h.path).toBe(path);
  expect(h.expected).toContain(String(planCap()));
}

describe("RASTER_MAX_SIDE (D-166, ARCHITECTURE.md 11.1)", () => {
  test("equals the plan budget", () => {
    expect(RASTER_MAX_SIDE).toBe(planCap());
  });

  test("checkImage passes the cap on either side and refuses one past it", () => {
    // Sizes only: checkImage reads data.length and never a pixel.
    const len = (n: number): Uint8ClampedArray => ({ length: n }) as unknown as Uint8ClampedArray;
    expect(() => checkImage({ width: 8192, height: 8192, data: len(8192 * 8192 * 4) }, "/img")).not.toThrow();
    namesTheLimit(refusal(() => checkImage({ width: 8193, height: 1, data: len(8193 * 4) }, "/img")), "/img");
    namesTheLimit(refusal(() => checkImage({ width: 1, height: 8193, data: len(8193 * 4) }, "/img")), "/img");
  });

  test("checkImage refuses a side that is not a positive integer and a buffer of the wrong length", () => {
    for (const [w, h] of [[0, 4], [4, 0], [-1, 4], [2.5, 4], [Number.NaN, 4], [4, Number.POSITIVE_INFINITY]] as const) {
      namesTheLimit(refusal(() => checkImage(lying(w, h, 0), "/img")), "/img");
    }
    const short = refusal(() => checkImage(lying(4, 4, 63), "/img"));
    namesTheLimit(short, "/img");
    expect(short.expected).toContain("64 bytes");
    expect(() => checkImage(blank(4, 4), "/img")).not.toThrow();
  });

  test("checkSide guards a requested output size the same way", () => {
    expect(() => checkSide(8192, 1, "/size")).not.toThrow();
    namesTheLimit(refusal(() => checkSide(8193, 1, "/size")), "/size");
    namesTheLimit(refusal(() => checkSide(1, 0, "/size")), "/size");
  });
});

describe("every allocating intake entry checks before it allocates", () => {
  test("intake refuses an oversize shot and a lying buffer by shot index", async () => {
    namesTheLimit(await refusalAsync(() => intake([lying(8193, 1, 8193 * 4)], null, { knockout: null })), "/shots/0");
    namesTheLimit(await refusalAsync(() => intake([blank(4, 4), lying(4, 4, 12)], null, { knockout: null })), "/shots/1");
  });

  test("intake passes a shot of 8192 px", async () => {
    const r = await intake([blank(8192, 1)], null, { knockout: null });
    expect([r.image.width, r.image.height]).toEqual([8192, 1]);
  });

  test("intake refuses an oversize output rectangle before the warp", async () => {
    namesTheLimit(await refusalAsync(() => intake([blank(4, 4)], [square(4, 4)], { width: 8193, height: 4, knockout: null })), "/size");
    // Unmarked: the requested size is refused for the limit, ahead of the size mismatch with the shot.
    namesTheLimit(await refusalAsync(() => intake([blank(4, 4)], null, { width: 8193, height: 4, knockout: null })), "/size");
  });

  test("knockout kernels refuse a declared 9000 x 9000 image over a 16-byte buffer", () => {
    const img = lying(9000, 9000);
    namesTheLimit(refusal(() => applyKnockout(img, { ...defaultKnockout(), mode: "edges" })), "/img");
    namesTheLimit(refusal(() => applyKnockout(img, defaultKnockout())), "/img");
    namesTheLimit(refusal(() => knockoutEdges(img, defaultKnockout())), "/img");
    namesTheLimit(refusal(() => knockoutKey(img, defaultKnockout())), "/img");
    // Mode none cuts nothing, yet a lying image is still refused rather than passed on.
    namesTheLimit(refusal(() => applyKnockout(img, { ...defaultKnockout(), mode: "none" })), "/img");
    // In range but short: still E_SCHEMA, never the E_KERNEL read past the end.
    namesTheLimit(refusal(() => knockoutEdges(lying(10, 10), defaultKnockout())), "/img");
  });

  test("stackLayers refuses an oversize side and a short layer", async () => {
    const reduce = createReducer(defaultStack());
    namesTheLimit(await refusalAsync(() => stackLayers([new Uint8ClampedArray(16)], 8193, 1, reduce)), "/shots/0");
    namesTheLimit(await refusalAsync(() => stackLayers([new Uint8ClampedArray(64), new Uint8ClampedArray(60)], 4, 4, reduce)), "/shots/1");
  });

  test("warpToRect refuses a lying source and an oversize output", () => {
    namesTheLimit(refusal(() => warpToRect(lying(9000, 9000), square(4, 4), 4, 4)), "/source");
    namesTheLimit(refusal(() => warpToRect(blank(4, 4), square(4, 4), 8193, 4)), "/size");
  });
});
