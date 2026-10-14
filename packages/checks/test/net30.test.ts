// CHK-NET-30 (M05-T19 step 8): printed track swing, BAFFLE R3's rule
// (originals/baffle-r3/files/src/model.js lines 1005 to 1012): track over
// track plus drive traces, at least 30 percent. The expected swing is
// recomputed here with BAFFLE's own traceR, rho x 10 x L / (w t) (one
// material, so rho cancels), never from the run body.

import { describe, expect, test } from "vitest";
import { ran, runFixture, profile } from "./button-run";

const traceR = (lMm: number, wMm: number, tMm: number): number => (10 * lMm) / (wMm * tMm);
const swing = (trackW: number): number => {
  const track = traceR(60, trackW, 0.72);
  const leads = 2 * traceR(40, 1.4, 0.72);
  return (100 * track) / (track + leads);
};

describe("CHK-NET-30 track swing", () => {
  test("the line is profile constant read.swing.minPercent, 30 percent", () => {
    expect(profile.constant("read.swing.minPercent")).toMatchObject({ value: 30, unit: "percent" });
  });

  test("a 60 mm track 1.0 mm wide over two 40 mm leads swings over 30 percent: pass", async () => {
    const rs = ran(await runFixture("CHK-NET-30", "pass"));
    expect(rs).toHaveLength(1);
    expect(rs[0]!.verdict).toBe("pass");
    expect(rs[0]!.measured as number).toBeCloseTo(swing(1.0), 6);
    expect(rs[0]!.legal).toMatchObject({ kind: "interval", lo: 30, hi: 100, unit: "percent" });
  });

  test("the same track 3.0 mm wide swings under 30 percent: warn", async () => {
    const rs = ran(await runFixture("CHK-NET-30", "fail"));
    expect(rs).toHaveLength(1);
    expect(rs[0]!.verdict).toBe("warn");
    expect(rs[0]!.measured as number).toBeCloseTo(swing(3.0), 6);
    expect(swing(3.0)).toBeLessThan(30);
    expect(rs[0]!.extra).toMatchObject({ element: "conductor.track", leads: "conductor.leadA conductor.leadB", driveOhm: 0 });
  });
});
