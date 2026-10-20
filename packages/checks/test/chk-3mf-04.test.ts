// M00-T09 step 4: CHK-3MF-04 coincidence and pinch on outline fixtures,
// moved with the check from packages/3mf/test/validate.test.ts
// (R1-engine-03). The legal values come from the profile constants
// 3mf.coincidenceInset and 3mf.pinchInset.

import { describe, expect, it } from "vitest";
import { canonicalize } from "@hackbuild/spec";
import type { CheckResult, Ring } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { chk3mf04 } from "../src/index";

describe("CHK-3MF-04 coincidence and pinch (D-070)", () => {
  const profile = createProfileLookup(loadProfile());
  const sq = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const hole = (r: Ring): Ring => [...r].reverse();
  const rule = (rs: readonly CheckResult[], name: string): CheckResult => rs.find((r) => r.extra?.["rule"] === name)!;
  // A U-shaped inlay pocket in a 20 mm square structure body, rectilinear so a Miter inset is exact.
  const U: Ring = [[2, 2], [18, 2], [18, 18], [14, 18], [14, 6], [6, 6], [6, 18], [2, 18]];
  const uInset = (d: number): Ring => [[2 + d, 2 + d], [18 - d, 2 + d], [18 - d, 18 - d], [14 + d, 18 - d], [14 + d, 6 - d], [6 - d, 6 - d], [6 - d, 18 - d], [2 + d, 18 - d]];
  const structure = [{ body: "body", rings: [sq(0, 0, 20, 20), hole(U)] }];

  it("passes the COLLAR-style inlay with both insets applied", () => {
    const rs = chk3mf04({ part: "coin", structure, inserts: [{ body: "inlay", rings: [uInset(0.02)] }] }, profile);
    const c = rule(rs, "coincidence");
    expect(c.verdict).toBe("pass");
    expect(c.measured as number).toBeCloseTo(0.02, 9);
    expect(c.legal).toMatchObject({ kind: "interval", lo: 0.001, unit: "mm" });
    // The open end is null in memory, so the hashed result has one form (CHECKS.md 7.1, D-206).
    expect(c.legal.kind === "interval" && c.legal.hi).toBeNull();
    expect(canonicalize(c.legal)).toContain('"hi":null');
    expect(rule(rs, "pinch").verdict).toBe("skip");
  });

  it("fails a homothety about the centroid with rule coincidence", () => {
    const cx = 10, cy = 10, k = 0.98;
    const scaled: Ring = U.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k] as const);
    const c = rule(chk3mf04({ part: "coin", structure, inserts: [{ body: "inlay", rings: [scaled] }] }, profile), "coincidence");
    expect(c.verdict).toBe("fail");
    expect(c.measured as number).toBeLessThan(0);
    expect(c.extra).toMatchObject({ rule: "coincidence", bodies: "inlay,body" });
  });

  it("fails two QR modules touching at one corner with rule pinch", () => {
    const ci = 0.001;
    const a = sq(0 + ci, 0 + ci, 1, 1);
    const b = sq(1, 1, 2 - ci, 2 - ci);
    const p = rule(chk3mf04({ part: "tile", structure: [{ body: "base", rings: [sq(-5, -5, 7, 7), hole(sq(0, 0, 1, 1)), hole(sq(1, 1, 2, 2))] }],
      inserts: [{ body: "qr", rings: [a, b] }] }, profile), "pinch");
    expect(p.verdict).toBe("fail");
    expect((p.measured as number).toFixed(3)).toBe("0.000");
    expect(p.legal).toMatchObject({ lo: 0.02, nearest: 0.02 });
  });

  it("passes the QR modules once the pinch inset separates them", () => {
    const d = 0.02;
    const p = rule(chk3mf04({ part: "tile", structure: [{ body: "base", rings: [sq(-5, -5, 7, 7)] }],
      inserts: [{ body: "qr", rings: [sq(d, d, 1 - d, 1 - d), sq(1 + d, 1 + d, 2 - d, 2 - d)] }] }, profile), "pinch");
    expect(p.verdict).toBe("pass");
    expect(p.measured as number).toBeGreaterThanOrEqual(0.02);
  });
});
