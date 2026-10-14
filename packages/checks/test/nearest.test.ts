// M04-T04 step 2: nearest legal values over the five golden rows of step 5.
// Each row's numbers are read from its committed expected.json (fixtures
// beside fix.test.ts) or, for the coin row, from the card table copied
// below; none is computed by the code under test. A load-bearing rounding
// direction, tie order or grid origin that moves fails a row here.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { gridInterval, nearestInterval, nearestMultiple, nearestSet } from "../src/index";

const golden = <T>(rel: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${rel}/expected.json`, import.meta.url), "utf8")) as T;

interface IntervalRow { measured: number; legal: [number, number]; nearest: number; fix: { set: number } }
const key04 = golden<IntervalRow>("CHK-KEY-04/fix-q-2.40");
const key01 = golden<IntervalRow>("CHK-KEY-01/fix-gap-2.15");
const prt04 = golden<{ measured: number; lineWidth: number; nearest: [number, number]; tieMm: number }>("CHK-PRT-04/fix-wall-1.05");
const prt09 = golden<{ measured: number; legal: [number, number]; fix: null }>("CHK-PRT-09/no-fix");

// Card row CHK-INL-03 (M04-T04 step 5): depth 0.8 against at least 1.2 mm,
// nearest 1.2. The coin-inlay depth field is range 0.48 to 1.68, step 0.24
// (reference/cosmetic/coin-inlay/chase.ts).
const INL03 = { measured: 0.8, lo: 1.2, nearest: 1.2, step: 0.24, origin: 0.48 } as const;

describe("the five golden rows", () => {
  test(`CHK-KEY-04: Q ${key04.measured} over ${key04.legal[0]} to ${key04.legal[1]} clamps down to ${key04.nearest} on the 0.01 grid`, () => {
    expect(nearestInterval(key04.legal[0], key04.legal[1], key04.measured, 0.01, 1)).toBe(key04.nearest);
    expect(key04.fix.set).toBe(key04.nearest);
  });

  test(`CHK-INL-03: depth ${INL03.measured} under the open interval from ${INL03.lo} rounds up to ${INL03.nearest} on the 0.24 grid from 0.48`, () => {
    expect(nearestInterval(INL03.lo, null, INL03.measured, INL03.step, INL03.origin)).toBe(INL03.nearest);
  });

  test(`CHK-KEY-01: gap ${key01.measured} over ${key01.legal[0]} to ${key01.legal[1]} gives ${key01.nearest}, the closest legal value (D-064), not the 45 percent target`, () => {
    expect(nearestInterval(key01.legal[0], key01.legal[1], key01.measured, 0.02, 0.8)).toBe(key01.nearest);
    expect(key01.nearest).not.toBe(1.44);
  });

  test(`CHK-PRT-04: wall ${prt04.measured} on a ${prt04.lineWidth} line has both neighbours, ${prt04.tieMm} each side`, () => {
    const [lo, hi] = nearestMultiple(prt04.lineWidth, prt04.measured);
    expect([lo, hi]).toEqual(prt04.nearest);
    expect(Math.round((prt04.measured - lo) * 1e9) / 1e9).toBe(prt04.tieMm);
    expect(Math.round((hi - prt04.measured) * 1e9) / 1e9).toBe(prt04.tieMm);
    // The card's own row at a 0.40 line, which no preset carries: the same rule.
    expect(nearestMultiple(0.4, 1.0)).toEqual([0.8, 1.2]);
  });

  test(`CHK-PRT-09: span ${prt09.measured} over ${prt09.legal[1]} has the check's nearest ${prt09.legal[1]} and no fix value`, () => {
    expect(nearestInterval(prt09.legal[0], prt09.legal[1], prt09.measured, 0.5, 4)).toBe(prt09.legal[1]);
    expect(prt09.fix).toBeNull();
  });
});

describe("nearest rules", () => {
  test("an interval rounds toward the inside; inside, the closest grid value that stays inside", () => {
    expect(nearestInterval(1.632, 2.04, 1.0, 0.02, 0.8)).toBe(1.64);
    expect(nearestInterval(1.632, 2.04, 2.5, 0.02, 0.8)).toBe(2.04);
    expect(nearestInterval(1.55, 1.6, 1.59, 0.25, 0)).toBeNull();
    expect(nearestInterval(1.2, 1.9, 1.33, 0.25, 0)).toBe(1.25);
    expect(nearestInterval(1.3, 1.9, 1.33, 0.25, 0)).toBe(1.5);
  });

  test("float noise clears: 3 x 0.4 is 1.2", () => {
    expect(nearestMultiple(0.4, 1.2)).toEqual([1.2, 1.2]);
    expect(nearestMultiple(0.24, 1.0, 0.25)).toEqual([0.97, 1.21]);
  });

  test("an empty interval is the solver's E_UNSAT and never reaches nearest", () => {
    expect(() => gridInterval(2, 1, 0.1)).toThrow(/E_UNSAT/);
  });

  test("a set gives the closest member; a word matches itself", () => {
    expect(nearestSet([0.4, 0.6, 0.8], 0.67)).toBe(0.6);
    expect(nearestSet(["clip", "cup"], "cup")).toBe("cup");
  });
});
