// CHK-NET-29 (M05-T19 step 4 and Acceptance, CHECKS.md 9.4): the
// charge-release path settles inside the wait. The expected numbers are the
// card's goldens, recomputed here from the closed form wait / (taus x C)
// (pip-controller src/model.js lines 421 to 428) and checked against the
// card's rounded figures.

import { describe, expect, test } from "vitest";
import { ran, runFixture } from "./button-run";

const reject = (waitUs: number, taus: number, cPf: number): number => (waitUs * 1e-6) / (taus * cPf * 1e-12);

describe("CHK-NET-29 charge-release settle", () => {
  test("PIP A key, R 1687980 ohm, C 9.200 pF, wait 3500 us: legal 0 to 76086957 ohm, warn (wait and resistivity inferred)", async () => {
    const rs = ran(await runFixture("CHK-NET-29", "pass"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect(r.verdict).toBe("warn");
    expect(r.measured).toBe(1687980);
    if (r.legal.kind !== "interval") throw new Error("interval expected");
    expect(Math.round(r.legal.hi!)).toBe(76086957);
    expect(r.legal.hi).toBeCloseTo(reject(3500, 5, 9.2), 3);
    expect(r.extra).toMatchObject({ waitUs: 3500, waitSource: "default", waitQualifier: "inferred", settleTaus: 5, tier: "inferred", gates: "read.rejectOhm", readFrom: "circuit.solve" });
    expect(r.extra?.["cPf"] as number).toBeCloseTo(9.2, 9);
    expect(r.extra?.["waitFrom"]).toBe("pip-controller firmware/pip_stick/pip_stick.ino:25 (D-079)");
    expect(r.constraint).toBe("charge-release path 1687980 ohm, legal 0 to 76086957 ohm, set by wait 3500 us over 5 tau at 9.2 pF (key; wait inferred; path rows inferred)");
  });

  test("PIP START touch at 200 us: 20910897 ohm, legal 0 to 7848677 ohm, fail; fix wait 533 us predicts legal 0 to 20916726 ohm, warn", async () => {
    const rs = ran(await runFixture("CHK-NET-29", "fail"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect(r.verdict).toBe("fail");
    expect(r.measured).toBe(910897 + 20_000_000);
    if (r.legal.kind !== "interval") throw new Error("interval expected");
    expect(Math.round(r.legal.hi!)).toBe(7848677);
    expect(r.legal.hi).toBeCloseTo(reject(200, 3, 8.494), 3);
    expect(r.extra).toMatchObject({ settleTaus: 3, skinOhm: 20_000_000, fixWaitUs: 533, fixVerdict: "warn" });
    expect(Math.round(r.extra?.["fixRejectOhm"] as number)).toBe(20916726);
    expect(Math.ceil((910897 + 20_000_000) * 3 * 8.494e-6)).toBe(533);
    expect(r.constraint).toBe(
      "charge-release path 20910897 ohm, legal 0 to 7848677 ohm, set by wait 200 us over 3 tau at 8.494 pF (touch, skin 20 Mohm inferred; wait inferred; path rows inferred)"
      + "; fix: set hookup port.START read.waitUs = 533, predicts legal 0 to 20916726 ohm, warn",
    );
  });
});
