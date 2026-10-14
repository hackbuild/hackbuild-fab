// CHK-NET-26 (M05-T19 step 2 and Acceptance): apartExcept on the built
// bodies. The flex key fixture joins K1 to GND only through cap1 when
// pressed; the variant whose GND bus runs under key 1's lead stays joined
// without the cap and fails naming conductor.gnd and conductor.key1.

import { describe, expect, test } from "vitest";
import { ran, runFixture } from "./button-run";

describe("CHK-NET-26 apartExcept", () => {
  test("flex-pair, cap1 cut: K1 and GND joined, then apart: pass", async () => {
    const rs = ran(await runFixture("CHK-NET-26", "pass"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect([r.verdict, r.measured, r.target]).toEqual(["pass", true, { level: "net", part: "pad", net: "K1" }]);
    expect(r.extra).toMatchObject({ joinedActuated: "yes", apartWithoutCut: "yes", cut: "cap1", pressed: "contact.key1" });
  }, 60_000);

  test("GND bus under key 1: fail naming conductor.gnd and conductor.key1", async () => {
    const rs = ran(await runFixture("CHK-NET-26", "fail"));
    expect(rs).toHaveLength(1);
    const r = rs[0]!;
    expect([r.verdict, r.measured]).toEqual(["fail", false]);
    expect(r.extra?.["joiningBodies"]).toBe("conductor.gnd+conductor.key1");
    expect(r.constraint).toContain("conductor.gnd and conductor.key1 still join them");
  }, 60_000);

  test("the GND net heads no assertion and says so", async () => {
    const rs = await runFixture("CHK-NET-26", "pass");
    expect(rs.find((r) => (r.target as { net?: string }).net === "GND")).toMatchObject({ verdict: "skip", constraint: "net GND heads no apartExcept assertion" });
  }, 60_000);
});
