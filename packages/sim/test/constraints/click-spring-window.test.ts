// sim/click-spring-window (M01-T07). Expected values come from the card,
// docs/plan/milestones/M01-constraints.md M01-T07 (the golden table at PIP
// defaults and the acrossLayers acceptance line), copied below as CARD_* at
// the precision the card states; none is a value this code wrote. The FE
// evidence at each bound is read from clickRigid and clickReadout, the M01-T02
// port the parity suite pins to the legacy stdout. Window logic that the PIP
// sweep cannot reach (a split run, no snap, a failed convergence) runs on a
// scripted ClickRun.
//
// sim may import spec, profile and mesh only (tools/tiers.json), so the
// floor-is-the-max and ceiling-is-the-min composition is done here by hand;
// core/test runs the same def through the solver and the CLI.

import { describe, expect, test } from "vitest";
import { isThrownCommandError, type Bound, type ConstraintCtx, type ProfileLookup } from "@hackbuild/spec";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import {
  CLICK_SPRING_WINDOW_ID, Q_STEP, SPRING_Q, SPRING_Q_UNIT, clickReadout, clickRigid, clickRules, clickSpringWindow, constraintDefs,
  createClickSpringWindow, type ClickReadout, type ClickRun,
} from "../../src/index.js";

const profile = (): ProfileLookup => createProfileLookup(loadProfile());

/** PIP defaults, layout.js line 36 `clicky`: mm, mm, mm, MPa, mm. */
const PIP = { l: 24, t: 0.55, w: 1.6, E: 1900, sw: 3 } as const;

const ctxOf = (facts: ConstraintCtx["facts"], p: ProfileLookup = profile()): ConstraintCtx => ({ profile: p, machine: "ffc5p", material: "petg", facts });

// Card golden, M01-T07, computed on the 0.01 grid at PIP defaults, petg in-plane.
const CARD_PIP = { snap: 1.16, drop: 1.72, strain: 2.19, bistable: 2.31, legal: [1.72, 2.19] } as const;
const CARD_EVIDENCE = {
  snapDrop: "0.000026", snapPeak: "0.917", // at 1.16
  dropAt: "0.509", dropBelow: "0.499", // at 1.72 and 1.71
  eStopAt: "2.495", eStopAbove: "2.504", // at 2.19 and 2.20, percent
} as const;
// Card finding text for Q 2.40: "strain 3.29 percent at 2.40; bistable from 2.32", fix "set Q = 2.19
// predicts strain 2.50 percent, drop 0.91". M04 renders the line; these are its numbers at 2 decimals.
const CARD_FINDING = { at: 2.4, strainAt: "3.29", bistableFrom: 2.32, fixQ: 2.19, fixStrain: "2.50", fixDrop: "0.91" } as const;
// Card acceptance: acrossLayers reads 1.5 percent; eStop at the drop floor 1.72 is 2.007 percent.
const CARD_ACROSS = { strainPct: 1.5, eStopAtDropFloor: "2.007" } as const;

const rules = clickRules(profile());
const fe = (Q: number, s: { l: number; t: number; w: number; E: number; sw: number } = PIP): ClickReadout => clickReadout(clickRigid({ ...s, Q }, rules), rules);

/** Bounds by name, from the first reason word the def writes. */
function named(bounds: readonly Bound[]): { snap: Bound; drop: Bound; strain: Bound; bistable: Bound } {
  const lo = bounds.filter((b) => b.side === "lo");
  const hi = bounds.filter((b) => b.side === "hi");
  return { snap: lo[0]!, drop: lo[1]!, strain: hi[0]!, bistable: hi[1]! };
}

const legal = (bounds: readonly Bound[]): readonly [number, number] | null => {
  const f = Math.max(...bounds.filter((b) => b.side === "lo").map((b) => b.value));
  const c = Math.min(...bounds.filter((b) => b.side === "hi").map((b) => b.value));
  return f > c ? null : [f, c];
};

describe("the def as registered", () => {
  test("id, dim, unit x t, step 0.01, kernels sim and profile, and sim exports it in constraintDefs", () => {
    expect(clickSpringWindow.id).toBe("sim/click-spring-window");
    expect(CLICK_SPRING_WINDOW_ID).toBe(clickSpringWindow.id);
    expect(clickSpringWindow.dims).toEqual(["spring.Q"]);
    expect(clickSpringWindow.units).toEqual({ "spring.Q": "x t" });
    expect(SPRING_Q_UNIT).toBe("x t");
    expect(clickSpringWindow.steps).toEqual({ "spring.Q": 0.01 });
    expect(Q_STEP).toBe(0.01);
    expect([...clickSpringWindow.kernels].sort()).toEqual(["profile", "sim"]);
    expect(constraintDefs).toEqual([clickSpringWindow]);
  });

  test("another dim gets no bounds", () => {
    expect(clickSpringWindow.bounds("conductor.width", ctxOf({ ...PIP, bend: "inPlane" }))).toEqual([]);
  });
});

describe("PIP defaults, petg in-plane (card golden)", () => {
  const bounds = clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...PIP, bend: "inPlane" }));
  const b = named(bounds);

  test(`floors snap ${CARD_PIP.snap} and drop ${CARD_PIP.drop}, ceilings strain ${CARD_PIP.strain} and bistable ${CARD_PIP.bistable} (computed)`, () => {
    expect(bounds).toHaveLength(4);
    expect([b.snap.value, b.drop.value, b.strain.value, b.bistable.value]).toEqual([CARD_PIP.snap, CARD_PIP.drop, CARD_PIP.strain, CARD_PIP.bistable]);
    expect(legal(bounds)).toEqual(CARD_PIP.legal);
  });

  test("drop binds the floor and strain the ceiling, and the PIP default Q 2.0 lies inside", () => {
    expect(b.drop.value).toBeGreaterThan(b.snap.value);
    expect(b.strain.value).toBeLessThan(b.bistable.value);
    expect(2).toBeGreaterThanOrEqual(CARD_PIP.legal[0]);
    expect(2).toBeLessThanOrEqual(CARD_PIP.legal[1]);
  });

  test("kernels, qualifiers and sources: strain is the profile bound, every bound computed from inferred rows", () => {
    expect([b.snap.kernel, b.drop.kernel, b.strain.kernel, b.bistable.kernel]).toEqual(["sim", "sim", "profile", "sim"]);
    for (const x of bounds) expect([x.qualifier, x.basis]).toEqual(["computed", "inferred"]);
    expect([b.drop.source, b.strain.source]).toEqual(["CHK-KEY-04", "CHK-KEY-04"]);
    expect(b.snap.source).toBeUndefined();
  });

  test("the FE evidence at each bound matches the card", () => {
    const at = (Q: number) => fe(Q);
    expect(at(1.15).snaps && at(1.15).drop > 0).toBe(false);
    expect(at(1.16).drop.toFixed(6)).toBe(CARD_EVIDENCE.snapDrop);
    expect(at(1.16).peakN.toFixed(3)).toBe(CARD_EVIDENCE.snapPeak);
    expect(at(1.72).drop.toFixed(3)).toBe(CARD_EVIDENCE.dropAt);
    expect(at(1.71).drop.toFixed(3)).toBe(CARD_EVIDENCE.dropBelow);
    expect(at(2.19).eStopPct.toFixed(3)).toBe(CARD_EVIDENCE.eStopAt);
    expect(at(2.2).eStopPct.toFixed(3)).toBe(CARD_EVIDENCE.eStopAbove);
    expect([at(2.31).bistable, at(2.32).bistable]).toEqual([false, true]);
  });

  test("the numbers of the card's Q 2.40 finding text recompute from the FE at 2 decimals", () => {
    expect(fe(CARD_FINDING.at).eStopPct.toFixed(2)).toBe(CARD_FINDING.strainAt);
    expect(fe(CARD_FINDING.at).bistable).toBe(true);
    expect(b.bistable.value + Q_STEP).toBeCloseTo(CARD_FINDING.bistableFrom, 9);
    expect(b.strain.value).toBe(CARD_FINDING.fixQ);
    expect(fe(CARD_FINDING.fixQ).eStopPct.toFixed(2)).toBe(CARD_FINDING.fixStrain);
    expect(fe(CARD_FINDING.fixQ).drop.toFixed(2)).toBe(CARD_FINDING.fixDrop);
  });

  test("reasons name the criteria and the profile limits, and print no FE evidence", () => {
    expect(b.drop.reason).toContain("click.dropMin 0.50");
    expect(b.strain.reason).toContain("2.50 percent, petg click bent in the layer plane");
    expect(b.snap.reason).toContain("snapfe at l 24 t 0.55 w 1.6 E 1900 sw 3");
    for (const x of bounds) for (const ev of Object.values(CARD_EVIDENCE)) expect(x.reason).not.toContain(ev);
  });
});

describe("bend across layers (card acceptance)", () => {
  const bounds = clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...PIP, bend: "acrossLayers" }));
  const b = named(bounds);

  test(`reads the ${CARD_ACROSS.strainPct} percent row; eStop ${CARD_ACROSS.eStopAtDropFloor} at the drop floor puts the strain ceiling under it, so the window is empty`, () => {
    expect(profile().strain("petg", "click", "acrossLayers").pct).toBe(CARD_ACROSS.strainPct);
    expect(fe(CARD_PIP.drop).eStopPct.toFixed(3)).toBe(CARD_ACROSS.eStopAtDropFloor);
    expect(b.drop.value).toBe(CARD_PIP.drop);
    expect(b.strain.value).toBe(1.71);
    expect(b.strain.reason).toContain("1.50 percent, petg click bent across layers");
    expect(legal(bounds)).toBeNull();
  });
});

describe("facts", () => {
  test("E comes from the material modulus row when the facts leave it out", () => {
    const { E: _e, ...noE } = PIP;
    const withE = clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...PIP, bend: "inPlane" }));
    const fromRow = clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...noE, bend: "inPlane" }));
    expect(profile().material("petg").modulusMPa).toBe(PIP.E);
    expect(fromRow.map((x) => x.value)).toEqual(withE.map((x) => x.value));
  });

  test("a declared E scales the force and leaves the window", () => {
    const soft = clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...PIP, E: 950, bend: "inPlane" }));
    // Strain and drop are ratios of a linear-elastic curve, so the window does not move with E; the force does.
    expect(soft.map((x) => x.value)).toEqual(clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...PIP, bend: "inPlane" })).map((x) => x.value));
    expect(fe(2, { ...PIP, E: 950 }).peakN).toBeCloseTo(fe(2).peakN / 2, 9);
  }, 60_000);

  test("a missing numeric fact gives a non-finite bound for the solver to name", () => {
    const { t: _t, ...noT } = PIP;
    const out = clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...noT, bend: "inPlane" }));
    expect(out.some((x) => !Number.isFinite(x.value))).toBe(true);
  });

  test("bend missing is E_PARAM_MISSING at /facts/bend; an unknown bend and a beam thickness of 0 are E_SCHEMA", () => {
    const code = (facts: ConstraintCtx["facts"]): [string, string | undefined] => {
      try {
        clickSpringWindow.bounds(SPRING_Q, ctxOf(facts));
      } catch (e) {
        if (isThrownCommandError(e)) return [e.hbf.code, e.hbf.path];
        throw e;
      }
      return ["none", undefined];
    };
    expect(code({ ...PIP })).toEqual(["E_PARAM_MISSING", "/facts/bend"]);
    expect(code({ ...PIP, bend: "sideways" })).toEqual(["E_SCHEMA", "/facts/bend"]);
    expect(code({ ...PIP, t: 0, bend: "inPlane" })).toEqual(["E_SCHEMA", "/facts/t"]);
  });

  test("click.dropMin from profile moves the drop floor to the first Q whose drop reaches it", () => {
    const base = profile();
    const p: ProfileLookup = new Proxy(base, {
      get(t, k, r) {
        if (k === "constant") return (id: string) => (id === "click.dropMin" ? { ...base.constant(id), value: 0.6 } : base.constant(id));
        return Reflect.get(t, k, r);
      },
    });
    const b = named(clickSpringWindow.bounds(SPRING_Q, ctxOf({ ...PIP, bend: "inPlane" }, p)));
    expect(b.drop.value).toBeGreaterThan(CARD_PIP.drop);
    expect(fe(b.drop.value).drop).toBeGreaterThanOrEqual(0.6);
    expect(fe(Number((b.drop.value - 0.01).toFixed(2))).drop).toBeLessThan(0.6);
    expect(b.drop.reason).toContain("click.dropMin 0.60");
  });
});

/** A scripted readout per Q, everything else a passing spring. */
function scripted(f: (Q: number) => Partial<ClickReadout>): ClickRun {
  return (p) => ({
    peakN: 1, peakAtMm: 0.5, drop: 0.7, contactMm: 1, eStopPct: 1, snaps: true, bistable: false, ok: true, warnings: [],
    ...f(p.Q),
  });
}

describe("window logic on a scripted run", () => {
  const facts = { ...PIP, bend: "inPlane" } as const;

  test("a grid point inside the run that fails a criterion splits it: split floor above split ceiling, E_UNSAT", () => {
    const def = createClickSpringWindow(scripted((Q) => ({
      drop: Q < 1.5 ? 0.1 : Q === 1.8 ? 0.4 : 0.7, eStopPct: Q > 2.2 ? 3 : 1, bistable: Q >= 2.4,
    })));
    const out = def.bounds(SPRING_Q, ctxOf(facts));
    const b = named(out);
    expect([b.snap.value, b.drop.value, b.strain.value, b.bistable.value]).toEqual([1, 1.5, 2.2, 2.39]);
    expect(out).toHaveLength(6);
    const split = out.slice(4);
    expect(split.map((x) => [x.side, x.value])).toEqual([["lo", 1.81], ["hi", 1.79]]);
    expect(split[0]!.reason).toContain("between 1.79 and 1.81");
    expect(legal(out)).toBeNull();
  });

  test("a grid point inside the run that does not snap splits it", () => {
    // drop stays 0.7 at Q 1.80, so only the snaps flag fails there.
    const def = createClickSpringWindow(scripted((Q) => ({ drop: Q < 1.5 ? 0.1 : 0.7, eStopPct: Q > 2.2 ? 3 : 1, snaps: Q !== 1.8 })));
    const out = def.bounds(SPRING_Q, ctxOf(facts));
    expect(out.slice(4).map((x) => [x.side, x.value])).toEqual([["lo", 1.81], ["hi", 1.79]]);
    expect(legal(out)).toBeNull();
  });

  test("a clean run has no split bounds", () => {
    const def = createClickSpringWindow(scripted((Q) => ({ drop: Q < 1.5 ? 0.1 : 0.7, eStopPct: Q > 2.2 ? 3 : 1 })));
    const out = def.bounds(SPRING_Q, ctxOf(facts));
    expect(out).toHaveLength(4);
    expect(legal(out)).toEqual([1.5, 2.2]);
  });

  test("no snap on the grid puts the snap floor one step over the grid; never bistable puts that ceiling at the grid top", () => {
    const def = createClickSpringWindow(scripted(() => ({ snaps: false, drop: 0 })));
    const b = named(def.bounds(SPRING_Q, ctxOf(facts)));
    expect([b.snap.value, b.drop.value, b.bistable.value]).toEqual([2.61, 2.61, 2.6]);
    expect(b.snap.reason).toContain("no Q on the search grid snaps");
  });

  test("a curve that did not converge is E_KERNEL naming the Q", () => {
    const def = createClickSpringWindow(scripted((Q) => ({ ok: Q !== 1.5 })));
    let err: unknown;
    try {
      def.bounds(SPRING_Q, ctxOf(facts));
    } catch (e) {
      err = e;
    }
    expect(isThrownCommandError(err) && [err.hbf.code, err.hbf.got]).toEqual(["E_KERNEL", "1.50"]);
  });

  test("the sweep is cached by the hash of its inputs: a second query runs the FE no more", () => {
    let calls = 0;
    const def = createClickSpringWindow((p, r) => {
      calls++;
      return scripted(() => ({}))(p, r);
    });
    def.bounds(SPRING_Q, ctxOf(facts));
    const first = calls;
    def.bounds(SPRING_Q, ctxOf(facts));
    expect(first).toBe(161);
    expect(calls).toBe(first);
    def.bounds(SPRING_Q, ctxOf({ ...facts, l: 22 }));
    expect(calls).toBe(2 * first);
  });
});
