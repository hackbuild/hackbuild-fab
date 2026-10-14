// CHK-NET-13 (M05-T19 step 1 and Acceptance): conductor slope in print pose.
// Expected numbers are the card's: flex-pair traces on one face read 0.00
// deg and pass; a ramp rising 10 mm over a 5 mm run reads atan(10 / 5) =
// 63.43 deg against a 45 deg line and warns (seed severity warn).

import { describe, expect, test } from "vitest";
import { ran, runFixture, profile } from "./button-run";

describe("CHK-NET-13 conductor slope", () => {
  test("the line is profile constant conductor.maxSlopeDeg, 45 deg", () => {
    expect(profile.constant("conductor.maxSlopeDeg")).toMatchObject({ value: 45, unit: "deg" });
  });

  test("flex-pair traces on one face: 0.00 deg, pass, one result per conductor", async () => {
    const rs = ran(await runFixture("CHK-NET-13", "pass"));
    expect(rs.map((r) => r.target)).toMatchObject([{ feature: "conductor.gnd" }, { feature: "conductor.key1" }, { feature: "conductor.gnd1stub" }]);
    for (const r of rs) {
      expect(r.verdict).toBe("pass");
      expect(r.measured as number).toBeCloseTo(0, 9);
      expect(r.legal).toMatchObject({ kind: "interval", lo: 0, hi: 45, unit: "deg" });
    }
  });

  test("ramp 10 mm over 5 mm: 63.43 deg, legal 0 to 45, warn, located at the segment", async () => {
    const rs = ran(await runFixture("CHK-NET-13", "fail"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect(r.verdict).toBe("warn");
    expect(r.measured as number).toBeCloseTo((Math.atan2(10, 5) * 180) / Math.PI, 9);
    expect(Number((r.measured as number).toFixed(2))).toBe(63.43);
    expect(r.legal).toMatchObject({ kind: "interval", lo: 0, hi: 45, unit: "deg", nearest: 45 });
    expect(r.constraint).toMatch(/^conductor slope 63\.43 deg, legal 0 to 45, set by conductor\.maxSlopeDeg/);
    const at = (r.target as { at?: readonly number[] }).at!;
    expect([at[0]!, at[2]!].map((v) => Number(v.toFixed(6)))).toEqual([2.5, 5]);
  });
});
