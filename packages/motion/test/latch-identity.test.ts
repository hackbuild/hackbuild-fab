// M07-T11 step 5, the CHK-MOT-05 kernel: margin + overshoot against
// (full rise - half rise) - cam lift - LUG_TOT, every figure from the
// kinematics and the half rise measured. Expected values come from the
// legacy Python only: R16 from packages/motion/records/ogee16-kin.json
// (kin.py, M07-T01) and R17 and R17b from
// designs/stipple/legacy/derived/stipple_latch.json (the downloads reader's
// port of rodState(), rounded to 4 decimals). The origin is OGEE R17b.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { latchIdentity, ogeeKinematics, readScadParams, readStippleParams, stippleKinematics } from "@hackbuild/motion";

const root = new URL("../../../", import.meta.url);
const read = (p: string): string => readFileSync(new URL(p, root), "utf8");

const og = JSON.parse(read("packages/motion/records/ogee16-kin.json")) as {
  result: { printed: Record<string, number>; latchIdentity: { marginPlusOvershoot: number; seededForm: number; generalForm: number } };
};
interface StippleRow { STROKE: number; LUG_TOT: number; camlift: number; half_rise: number; full_rise: number; margin: number; overshoot: number; identity_lhs: number; identity_rhs_general: number; identity_rhs_stroke_half: number }
const st = JSON.parse(read("packages/motion/inputs/stipple/stipple_latch.json")) as Record<string, StippleRow>;

const R16 = latchIdentity(ogeeKinematics(readScadParams(read("designs/ogee16/legacy/source/params.scad"))).latch);
const R17 = latchIdentity(stippleKinematics(readStippleParams(read("packages/motion/inputs/stipple/stipple-r17-DATA.txt")), "stipple-r17").latch);
const R17b = latchIdentity(stippleKinematics(readStippleParams(read("packages/motion/inputs/stipple/stipple-r17b-DATA.txt")), "stipple-r17b").latch);

describe("general form equal within 1e-3 (computed)", () => {
  test("R16: 2.175 both sides, equal to kin.py's", () => {
    const p = og.result.printed, id = og.result.latchIdentity;
    expect(Math.abs(R16.marginMm - p.halfSelectMargin!)).toBeLessThan(1e-9);
    expect(Math.abs(R16.overshootMm - p.fullSelectOvershoot!)).toBeLessThan(1e-9);
    expect(Math.abs(R16.halfRiseMm - p.halfSelectRise!)).toBeLessThan(1e-9);
    expect(Math.abs(R16.lhsMm - id.marginPlusOvershoot)).toBeLessThan(1e-9);
    expect(Math.abs(R16.rhsMm - id.generalForm)).toBeLessThan(1e-9);
    expect(Math.abs(R16.lhsMm - R16.rhsMm)).toBeLessThan(1e-3);
    expect(R16.lhsMm.toFixed(3)).toBe("2.175");
  });

  test.each([["R17", R17, "stipple.html"], ["R17b", R17b, "stipple (1).html"]] as const)("%s: both sides equal stipple_latch.json", (_n, r, key) => {
    const row = st[key]!;
    const near = (a: number, b: number): void => expect(Math.abs(a - b)).toBeLessThanOrEqual(5e-5 + 1e-12);
    near(r.marginMm, row.margin);
    near(r.overshootMm, row.overshoot);
    near(r.camLiftMm, row.camlift);
    near(r.halfRiseMm, row.half_rise);
    near(r.fullRiseMm, row.full_rise);
    near(r.lhsMm, row.identity_lhs);
    near(r.rhsMm, row.identity_rhs_general);
    expect(Math.abs(r.lhsMm - r.rhsMm)).toBeLessThan(1e-3);
  });

  test("R17 1.1853 and R17b 1.2853", () => {
    expect([R17.lhsMm.toFixed(4), R17b.lhsMm.toFixed(4)]).toEqual(["1.1853", "1.2853"]);
  });
});

describe("the half rise is measured, never stroke/2", () => {
  test("on R16 the half rise is 4.249 of a 9.000 stroke, so the seeded stroke/2 form misses by 0.25", () => {
    expect(R16.halfRiseMm.toFixed(3)).toBe("4.249");
    expect(R16.strokeMm / 2 - R16.camLiftMm - R16.lugTotMm).toBeCloseTo(og.result.latchIdentity.seededForm, 9);
    expect(Math.abs(R16.lhsMm - (R16.strokeMm / 2 - R16.camLiftMm - R16.lugTotMm))).toBeGreaterThan(0.25);
  });

  test("on the pin-free beam the half rise is exactly stroke/2 and both forms agree", () => {
    for (const r of [R17, R17b]) {
      expect(Math.abs(r.halfRiseMm - r.strokeMm / 2)).toBeLessThan(1e-12);
      expect(Math.abs(r.rhsMm - (r.strokeMm / 2 - r.camLiftMm - r.lugTotMm))).toBeLessThan(1e-12);
    }
  });
});
