// SNAPFE port (M01-T01). Expected numbers come from outside the port: the
// flat-arch theory 2 x 12 E I / (l/2)^3 with I = w t^3 / 12, the card's
// computed prints (docs/plan/milestones/M01-constraints.md, M01-T01
// acceptance), the PIP default readouts in synthesis/verified-claims.md line
// 13, and hand arithmetic on the clickerDims formulas (layout.js lines 86 and
// 95). No value here is written by the code under test.

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type Constant, type ProfileLookup } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { clickReadout, clickRigid, clickRules, curve, summarize, type Summary } from "../../src/fe/index.js";

const profile = createProfileLookup(loadProfile());

function codeOf(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (isThrownCommandError(e)) return e.hbf.code;
    throw e;
  }
  return "none";
}

describe("flat-arch stiffness (M01-T01 step 6)", () => {
  // l 24 mm, rise 0.001 mm, t 0.55 mm, w 1.6 mm, E 1900 MPa: a near-flat arch
  // in small travel is two clamped-guided half spans of l/2.
  const p = { l: 24, h: 0.001, t: 0.55, w: 1.6, E: 1900, nel: 18, steps: 56, dmax: 0.01 };

  test("k_fe 0.585396 and theory 0.585394 N/mm to 6 decimals, difference at most 3e-6 N/mm (computed)", () => {
    const r = curve(p);
    expect(r.ok).toBe(true);
    expect(r.pts).toHaveLength(57);
    const pt = r.pts[5]!;
    const kFe = pt.F / pt.d;
    const I = p.w * p.t ** 3 / 12;
    const kTheory = 2 * 12 * p.E * I / (p.l / 2) ** 3;
    console.log(`flat-arch stiffness: fe ${kFe.toFixed(6)} N/mm, theory ${kTheory.toFixed(6)} N/mm, difference ${(kFe - kTheory).toExponential(2)} N/mm (computed)`);
    expect(kFe.toFixed(6)).toBe("0.585396");
    expect(kTheory.toFixed(6)).toBe("0.585394");
    expect(Math.abs(kFe - kTheory)).toBeLessThanOrEqual(3e-6);
  });
});

describe("non-convergence (M01-T01 step 7)", () => {
  // A 10 mm rise on a 0.05 mm beam driven to 2 h in two steps does not
  // converge in 40 Newton iterations (computed with the source snapfe.js,
  // this card: ok false).
  const bad = { l: 22.5, h: 10, t: 0.05, w: 1.6, E: 1900, nel: 18, steps: 2, dmax: 2 };

  test("a load step that does not converge sets ok false", () => {
    expect(curve(bad).ok).toBe(false);
  });

  test("the readout carries it as a warning, never a silent pass", () => {
    const r = clickReadout(summarize({ ...bad, arches: 2 }), clickRules(profile));
    expect(r.ok).toBe(false);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/did not converge/);
  });

  test("a converged readout carries no warning", () => {
    const r = clickReadout(clickRigid({ l: 24, t: 0.55, Q: 2, w: 1.6, E: 1900, sw: 3 }, clickRules(profile)), clickRules(profile));
    expect([r.ok, r.warnings]).toEqual([true, []]);
  });
});

describe("clickRigid and clickReadout at PIP defaults (verified-claims.md line 13)", () => {
  test("l 24, t 0.55, w 1.6, Q 2.0, E 1900, sw 3: 2.527 N at 0.629 mm, drop 0.765, contact 1.369 mm, eStop 2.31 percent (computed)", () => {
    const r = clickReadout(clickRigid({ l: 24, t: 0.55, Q: 2, w: 1.6, E: 1900, sw: 3 }, clickRules(profile)), clickRules(profile));
    expect([r.peakN.toFixed(3), r.peakAtMm.toFixed(3), r.drop.toFixed(3), r.contactMm.toFixed(3), r.eStopPct.toFixed(2)])
      .toEqual(["2.527", "0.629", "0.765", "1.369", "2.31"]);
    expect([r.snaps, r.bistable]).toEqual([true, false]);
  });

  test("a span shorter than the shuttle leaves the 4 mm floor (layout.js line 110)", () => {
    const rules = clickRules(profile);
    const got = clickRigid({ l: 5, t: 0.55, Q: 2, w: 1.6, E: 1900, sw: 3 }, rules);
    const want = summarize({ l: 4, h: 1.1, t: 0.55, w: 1.6, E: 1900, nel: 18, steps: 56, dmax: 2, arches: 2 });
    expect(got.peak).toBe(want.peak);
    expect(got.pts.at(-1)).toEqual(want.pts.at(-1));
  });
});

describe("clickReadout formulas on a hand-made curve (layout.js lines 86 and 95)", () => {
  const fe = (dPeak: number, dValley: number, pts: Summary["pts"]): Summary => ({
    pts, ok: true, snap: true, peak: 2, dPeak, valley: 1, dValley, drop: 0.5, bistable: false, emax: 0.05,
  });
  const pts = [
    { d: 0.5, F: 1, e: 0.001 },
    { d: 1.45, F: 1, e: 0.01 },
    { d: 1.4501, F: 1, e: 0.02 },
  ];

  test("contact is 0.15 mm past the peak when that is later: cg 1.15, stop strain read up to 1.45 mm", () => {
    const r = clickReadout(fe(1, 1, pts), clickRules(profile));
    expect(r.contactMm).toBeCloseTo(1.15, 12);
    expect(r.eStopPct).toBeCloseTo(1, 12);
  });

  test("contact is 0.85 of the valley travel when that is later: dValley 2 gives cg 1.7", () => {
    const r = clickReadout(fe(1, 2, pts), clickRules(profile));
    expect(r.contactMm).toBeCloseTo(1.7, 12);
    expect(r.eStopPct).toBeCloseTo(2, 12);
  });
});

describe("inputs", () => {
  test("a zero element count is E_SCHEMA", () => {
    expect(codeOf(() => curve({ l: 24, h: 1.1, t: 0.55, w: 1.6, E: 1900, nel: 0, steps: 56, dmax: 2 }))).toBe("E_SCHEMA");
  });

  test("a click rule row in another unit is E_SCHEMA; a missing row is E_REF", () => {
    const rows = new Map(["click.rigidSpanMin", "click.contactPastPeak", "click.contactValleyFraction", "click.stopOvertravel"]
      .map((id) => [id, profile.constant(id)] as const));
    const fake = (patch: Partial<Constant> | null): Pick<ProfileLookup, "constant"> => ({
      constant: (id) => {
        if (id === "click.stopOvertravel" && patch === null) return profile.constant("click.noSuchRow");
        const c = rows.get(id)!;
        return id === "click.stopOvertravel" ? { ...c, ...patch } : c;
      },
    });
    expect(codeOf(() => clickRules(fake({ unit: "ratio" })))).toBe("E_SCHEMA");
    expect(codeOf(() => clickRules(fake({ value: 0 })))).toBe("E_SCHEMA");
    expect(codeOf(() => clickRules(fake(null)))).toBe("E_REF");
  });
});
