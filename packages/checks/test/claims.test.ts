// R1-engine-11: the claim function registry and CHK-CLAIM-01. The spring
// metrics come from the click-spring-key archetype's own metric lines at
// the click-spring-window reference defaults (its chase.ts), with sim's
// SNAPFE as the solver. The FE summary peak is read straight off
// clickRigid, independently of the archetype and the claim function.

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CheckLevel, ClaimDecl, ContactFn, KernelId, Metric, Part } from "@hackbuild/spec";
import { CLICK_DEFAULTS, clickApply, pipStack, provideClickSolver, shippedProfile, type ClickSpringIn } from "@hackbuild/archetypes";
import { clickReadout, clickRigid, clickRules } from "@hackbuild/sim";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import {
  CHECK_MODULES, CLAIM_SKIP, checkClaim, claimFn, claimFnIds, forceAt, registerChecks, registerClaimFn, runRegistry, springCurve,
} from "../src/index";
import { chase } from "../../../reference/keys/click-spring-window/chase";

const profile = shippedProfile();
const field = (id: string): number => {
  const f = chase.params[0].fields.find((x) => x.id === id);
  if (f === undefined || typeof f.default !== "number") throw new Error(`click-spring-window declares no ${id}`);
  return f.default;
};
// The reference's spring: l, t, Q, w, sw from its chase; E is the archetype default, the petg row the chase cites.
const REF = { l: field("l"), t: field("t"), Q: field("Q"), w: field("w"), sw: field("sw"), E: CLICK_DEFAULTS.E };
const SAMPLES = 16;

/** sim's SNAPFE summary at the reference spring, untouched by the archetype. */
const fe = clickRigid(REF, clickRules(profile));

function metricsAt(curveSamples: number): Metric[] {
  const rules = clickRules(profile);
  provideClickSolver((s: ClickSpringIn) => {
    const f = clickRigid(s, rules);
    const r = clickReadout(f, rules);
    return {
      peakN: f.peak, peakAtMm: f.dPeak, valleyN: f.valley, valleyAtMm: f.dValley, drop: f.drop,
      contactMm: r.contactMm, eStop: r.eStopPct / 100, snaps: f.snap, bistable: f.bistable, ok: f.ok, pts: f.pts.map((p) => ({ d: p.d, F: p.F })),
    };
  });
  const st = pipStack(profile, "ffc5p", { body: "petg", trace: "cpla" });
  const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };
  const face = { origin: [0, 0, st.z.floor] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };
  const out = clickApply({ draft, face, profile, params: { ...CLICK_DEFAULTS, l: REF.l, t: REF.t, Q: REF.Q, w: REF.w, sw: REF.sw, curveSamples } }, "click-spring-key");
  return [...(out.metrics ?? [])];
}

const metrics = metricsAt(SAMPLES);
const num = (id: string): number => metrics.find((m) => m.id === id)!.value as number;
const claim = (fn: string, lo: number, hi: number, unit = "N", args?: ClaimDecl["args"]): ClaimDecl => ({
  id: "press", fn, ...(args === undefined ? {} : { args }), want: { nominal: (lo + hi) / 2, lo, hi, unit }, why: "the press band",
});

// The registry run: CHK-CLAIM-01 alone on one part carrying the metrics.
const seed = JSON.parse(readFileSync(new URL("../seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const def = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-CLAIM-01")!;
const part = { id: "spring", bodies: [], features: [], assertions: [], metrics } as unknown as Part;
async function runClaims(decls?: readonly ClaimDecl[], ms: readonly Metric[] = metrics) {
  const p = { ...part, metrics: ms } as Part;
  return (await runRegistry([def], {
    kernels: new Set<KernelId>(["geom", "mesh", "profile"]), produced: new Set<CheckLevel>(["part"]), targets: { parts: [p] },
    ctx: { profile: createProfileLookup(loadProfile()), machine: "ffc5p", whitelist: new Map() },
    ...(decls === undefined ? {} : { claims: { decls } }),
  })).results;
}

describe("claim function registry", () => {
  test("the first functions are registered and an unknown id is E_REF", () => {
    expect(claimFnIds()).toEqual(["bail.channelClear", "bail.clipFit", "bail.tipBore", "contact.at", "key.printedTravel", "spring.contactTravel", "spring.forceAt", "spring.peak"]);
    expect(() => claimFn("spring.peek")).toThrow(/E_REF \/fn/);
    expect(() => registerClaimFn("spring.peak", claimFn("spring.peak"))).toThrow(/registered twice/);
  });

  test("on click-spring-window, spring.peak equals the FE summary peak to 1e-9 (computed, SNAPFE)", () => {
    expect(fe.snap).toBe(true);
    const r = checkClaim(claim("spring.peak", 0, 10), metrics);
    expect(Math.abs(r.value - fe.peak)).toBeLessThanOrEqual(1e-9);
    console.info(`click-spring-window spring.peak ${r.value.toFixed(4)} N, SNAPFE ${fe.peak.toFixed(4)} N (computed)`);
  });

  test("spring.contactTravel reads spring.cg; spring.forceAt lands on the samples and interpolates between them", () => {
    expect(checkClaim(claim("spring.contactTravel", 0, 10, "mm"), metrics).value).toBe(num("spring.cg"));
    const curve = springCurve(metrics, {});
    expect(curve.length).toBe(SAMPLES);
    const [a, b] = [curve[5]!, curve[6]!];
    expect(checkClaim(claim("spring.forceAt", -10, 10, "N", { travelMm: a.x }), metrics).value).toBe(a.y);
    expect(forceAt(curve, (a.x + b.x) / 2)).toBeCloseTo((a.y + b.y) / 2, 12);
    expect(() => forceAt(curve, curve[SAMPLES - 1]!.x + 0.01)).toThrow(/E_SCHEMA \/args\/travelMm/);
    expect(() => checkClaim(claim("spring.forceAt", 0, 10, "N", { travelMm: 0.5 }), metricsAt(0))).toThrow(/E_PARAM_MISSING \/metrics\/spring\.curve\.n/);
  });

  test("key.printedTravel reads keys.<n>.printedTravel under at and refuses a key the build does not place", () => {
    // Values from the reference/keys/flex-pair default build (computed): key 1 travel 1.84 mm, printed 1.92 mm.
    const keyMetric = (id: string, value: number): Metric => ({ id, value, unit: "mm", note: "test", gate: "informational", qualifier: "computed", basis: null });
    const ms = [keyMetric("keys.1.travel", 1.84), keyMetric("keys.1.printedTravel", 1.92), keyMetric("keys.2.printedTravel", 1.9)];
    const d = (at: string, lo: number, hi: number): ClaimDecl => ({ id: "travel", fn: "key.printedTravel", args: { at }, want: { nominal: 1.84, lo, hi, unit: "mm" }, why: "the key band" });
    const one = checkClaim(d("keys.1", 1.428, 2.04), ms);
    expect([one.value, one.verdict, one.qualification]).toEqual([1.92, "pass", { qualifier: "computed", basis: null }]);
    expect(checkClaim(d("keys.2", 1.428, 2.04), ms).value).toBe(1.9);
    expect(checkClaim(d("keys.1", 1.428, 1.9), ms).verdict).toBe("fail");
    expect(() => checkClaim(d("keys.3", 1.428, 2.04), ms)).toThrow(/E_PARAM_MISSING \/metrics\/keys\.3\.printedTravel/);
    expect(() => checkClaim({ ...d("keys.1", 1, 3), want: { nominal: 2, lo: 1, hi: 3, unit: "N" } }, ms)).toThrow(/E_SCHEMA \/claims\/0\/want\/unit/);
  });

  test("the bail claims read the bail.* metrics and refuse a build that lacks them", () => {
    // Values from the designs/bail twin bridge defaults (computed from inferred params): cord 4 mm, clearance 0.5 mm, bore clearance 0.3 mm, recess 0.4 mm over the plate.
    const bm = (id: string, value: number): Metric => ({ id, value, unit: "mm", note: "test", gate: "informational", qualifier: "computed", basis: "inferred" });
    const ms = [bm("bail.channel.clearWidth", 4.5), bm("bail.tip.bore", 4.3), bm("bail.clip.recessClearance", 0.4)];
    const d = (fn: string, nominal: number, lo: number, hi: number): ClaimDecl => ({ id: "bail", fn, args: {}, want: { nominal, lo, hi, unit: "mm" }, why: "test band" });
    const ch = checkClaim(d("bail.channelClear", 4.5, 4.25, 5), ms);
    // An inferred basis reads inferred and a band hit on it is a warn, not a pass.
    expect([ch.value, ch.verdict, ch.qualification]).toEqual([4.5, "warn", { qualifier: "inferred", basis: "inferred" }]);
    expect(checkClaim(d("bail.tipBore", 4.3, 4, 4.8), ms).value).toBe(4.3);
    expect(checkClaim(d("bail.clipFit", 0.4, 0.2, 0.6), ms).value).toBe(0.4);
    expect(checkClaim(d("bail.tipBore", 4.3, 4.4, 4.8), ms).verdict).toBe("fail");
    expect(() => checkClaim(d("bail.channelClear", 4.5, 4.25, 5), [ms[1]!])).toThrow(/E_PARAM_MISSING \/metrics\/bail\.channel\.clearWidth/);
    expect(() => checkClaim(d("bail.clipFit", 0.4, 0.2, 0.6), [ms[0]!])).toThrow(/E_PARAM_MISSING \/metrics\/bail\.clip\.recessClearance/);
  });

  test("contact.at returns the design contact function's force and refuses without one", () => {
    const contact: ContactFn = (ms, _target, s) => ({ closed: [], forceN: forceAt(springCurve(ms, {}), s as number) });
    const d = claim("contact.at", 0, 10, "N", { target: "key", travelMm: 0.4 });
    expect(checkClaim(d, metrics, { contact }).value).toBe(forceAt(springCurve(metrics, {}), 0.4));
    expect(() => checkClaim(d, metrics)).toThrow(/E_PARAM_MISSING \/contact/);
  });

  test("a band in the wrong unit or an argument the function does not take is E_SCHEMA", () => {
    expect(() => checkClaim(claim("spring.peak", 0, 10, "mm"), metrics)).toThrow(/E_SCHEMA \/claims\/0\/want\/unit/);
    expect(() => checkClaim(claim("spring.peak", 0, 10, "N", { travelMm: 1 }), metrics)).toThrow(/E_SCHEMA \/claims\/0\/args\/travelMm/);
  });
});

describe("CHK-CLAIM-01", () => {
  test("passes for a band that contains the peak and fails for one 0.1 N above it", async () => {
    const peak = fe.peak;
    const [inside] = await runClaims([claim("spring.peak", peak - 0.2, peak + 0.2)]);
    expect([inside!.verdict, inside!.measured, inside!.extra?.["qualifier"]]).toEqual(["pass", num("spring.peakN"), "computed"]);
    const [above] = await runClaims([claim("spring.peak", peak + 0.1, peak + 0.3)]);
    expect(above!.verdict).toBe("fail");
    expect(above!.legal).toEqual({ kind: "interval", lo: peak + 0.1, hi: peak + 0.3, unit: "N", nearest: peak + 0.1 });
    expect(above!.constraint).toMatch(/^claim press spring\.peak .* N \(computed\), legal .* set by the press band$/);
    const [below] = await runClaims([claim("spring.peak", peak - 0.3, peak - 0.1)]);
    expect(below!.verdict).toBe("fail");
  });

  test("an inferred basis with no evidence warns and reads inferred; evidence makes it a computed pass", () => {
    const inferred = metrics.map((m) => (m.id === "spring.peakN" ? { ...m, qualifier: "computed", basis: "inferred" } as Metric : m));
    const d = claim("spring.peak", 0, 10);
    const bare = checkClaim(d, inferred);
    expect([bare.verdict, bare.qualification]).toEqual(["warn", { qualifier: "inferred", basis: "inferred" }]);
    const backed = checkClaim(d, inferred, { evidence: { press: [{ kind: "coupon", ref: "access-press-01" }] } });
    expect([backed.verdict, backed.qualification]).toEqual(["pass", { qualifier: "computed", basis: "inferred" }]);
    // Out of band fails whatever the basis.
    expect(checkClaim(claim("spring.peak", 9, 10), inferred).verdict).toBe("fail");
  });

  test("a run with no claims skips with the reason", async () => {
    const [r] = await runClaims();
    expect([r!.verdict, r!.constraint]).toEqual(["skip", CLAIM_SKIP]);
  });
});
