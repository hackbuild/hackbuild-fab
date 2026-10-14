// CHK-NET-27 (M05-T19 step 3 and Acceptance): makesContact executed. The
// cap is moved by the contact's gap along its declared axis and tested for
// touch against both column halves. At gap 1.44 over a built 1.44 it lands;
// with the cap built 1.92 above the columns it stops 0.48 mm short.

import { describe, expect, test } from "vitest";
import { ran, runFixture } from "./button-run";

describe("CHK-NET-27 actuated contact", () => {
  test("flex-pair at gap 1.44: touch on both terminals, pass", async () => {
    const rs = ran(await runFixture("CHK-NET-27", "pass"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect([r.verdict, r.measured]).toEqual(["pass", true]);
    expect(r.extra).toMatchObject({ actuator: "cap1", travelMm: 1.44, a: "conductor.key1col", b: "conductor.gnd1col" });
    expect(r.extra?.["closestMm"] as number).toBeLessThanOrEqual(r.extra?.["touchMm"] as number);
  }, 60_000);

  test("gap 0.48 short: fail, closest approach 0.48 mm in extra", async () => {
    const rs = ran(await runFixture("CHK-NET-27", "fail"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect([r.verdict, r.measured]).toEqual(["fail", false]);
    // The mesher snaps to the 1/1024 mm grid (D-054): the cap underside 4.92 builds at 4.919921875, so 0.479922 (computed).
    expect(r.extra?.["closestMm"] as number).toBeCloseTo(4.919921875 - 1.44 - 3, 5);
    expect(r.extra?.["closestMm"] as number).toBeCloseTo(0.48, 3);
    expect(r.extra?.["approachAMm"] as number).toBeCloseTo(0.48, 3);
    expect(r.extra?.["approachBMm"] as number).toBeCloseTo(0.48, 3);
    expect(r.constraint).toContain("closest approach 0.48 mm left open");
  }, 60_000);
});
