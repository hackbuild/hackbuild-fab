// R1-engine-13 acceptance: drive.press and plot.curve on the
// click-spring-window fixture. The spring metrics are the click-spring-key
// archetype's own lines at the reference's chase defaults with sim's
// SNAPFE as the solver (as packages/checks test/claims.test.ts builds
// them), placed under click-spring-key.0 as the kernel places an
// archetype. The press claim calls spring.forceAt; CHK-CLAIM-01 runs from
// the check registry on the same metrics, and both widgets must agree with
// its value to the G-20 tolerance (computed). The band is the access
// switch's press band from profile (access.pressTargetN and
// access.pressBandPct). The reference exports no ContactFn, so the test
// carries one: the tip closes at the spring's contact travel cg, the stop
// is the last curve sample.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CheckLevel, ClaimDecl, ContactFn, DriveDecl, KernelId, Metric, Part, WidgetDecl } from "@hackbuild/spec";
import { CLICK_DEFAULTS, clickApply, pipStack, provideClickSolver, shippedProfile, type ClickSpringIn } from "@hackbuild/archetypes";
import { clickReadout, clickRigid, clickRules } from "@hackbuild/sim";
import { createProfileLookup, loadProfile } from "@hackbuild/profile";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { CHECK_MODULES, claimFn, registerChecks, runRegistry } from "@hackbuild/checks";
import { chase } from "../../../reference/keys/click-spring-window/chase.js";
import { pressBand } from "../../../reference/keys/access-switch/claim.js";
import { widgetEntry, widgetKinds, widgetModel, widgetRecords, type WidgetBuild } from "../src/widgets/registry.js";
import { drivePress, pressLine, type PressModel } from "../src/widgets/press.js";
import { CONTACT_TOL_MM, CURVE_TOLERANCE, plotCurve, plotLines, type PlotModel } from "../src/widgets/curve.js";

const profile = shippedProfile();
const field = (id: string): number => {
  const f = chase.params[0].fields.find((x) => x.id === id);
  if (f === undefined || typeof f.default !== "number") throw new Error(`click-spring-window declares no ${id}`);
  return f.default;
};
const SAMPLES = 16;
const KEY = "click-spring-key.0";

function springMetrics(): Metric[] {
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
  const params = { ...CLICK_DEFAULTS, l: field("l"), t: field("t"), Q: field("Q"), w: field("w"), sw: field("sw"), curveSamples: SAMPLES };
  const out = clickApply({ draft, face, profile, params }, "click-spring-key");
  return (out.metrics ?? []).map((m) => ({ ...m, id: `${KEY}.${m.id}` }));
}

const metrics = springMetrics();
const num = (id: string): number => metrics.find((m) => m.id === id)!.value as number;
const cg = num(`${KEY}.spring.cg`);
const curve = Array.from({ length: num(`${KEY}.spring.curve.n`) }, (_, i) => ({ d: num(`${KEY}.spring.curve.d${i}`), F: num(`${KEY}.spring.curve.F${i}`) }));
const stop = curve[curve.length - 1]!.d;

const contact: ContactFn = (ms, target, s) => {
  const v = ms.find((m) => m.id === `click-spring-key.${target}.spring.cg`)?.value;
  const travel = Math.min(Math.max(s === true ? stop : typeof s === "number" ? s : 0, 0), stop);
  return { closed: typeof v === "number" && travel >= v ? [`click-spring-key.${target}.tip`] : [], pose: { travelMm: travel } };
};

// The claim travel: the middle of the curve segment where the force moves
// fastest, so a 0.1 mm cursor offset shows.
const steepest = curve.slice(0, -1).reduce((best, a, i) => {
  const b = curve[i + 1]!;
  const slope = Math.abs((b.F - a.F) / (b.d - a.d));
  return slope > best.slope ? { slope, at: (a.d + b.d) / 2 } : best;
}, { slope: 0, at: 0 });
const T = steepest.at;
const c = (id: string): number => profile.constant(id).value;
const band = pressBand(c("access.pressTargetN"), c("access.pressBandPct"));
const CLAIM: ClaimDecl = {
  id: "press", fn: "spring.forceAt", args: { at: KEY, travelMm: T },
  want: { nominal: band.targetN, lo: band.lo, hi: band.hi, unit: "N" }, why: "the access switch press band",
};

const drive: DriveDecl = { targets: "metrics.click-spring-key", gesture: "hold", contact: "contact", readout: ["logic", "travel", "force"], pickInView: false };
const PRESS: WidgetDecl = { id: "press", kind: "drive.press", fn: "spring.forceAt", inputs: {}, outputs: ["travel", "forceN", "contact"], tolerance: CURVE_TOLERANCE, region: "stage.overlay" };
const PLOT: WidgetDecl = { id: "press", kind: "plot.curve", fn: "spring.forceAt", inputs: {}, outputs: ["series", "band", "contactMm", "cursor", "measured"], tolerance: CURVE_TOLERANCE, region: "rail.after-params" };

const build = (over: Partial<WidgetBuild> = {}): WidgetBuild => ({
  features: [], metrics, results: [], hookup: [], contacts: { contact }, drive,
  claims: [CLAIM], claimFns: { "spring.forceAt": claimFn("spring.forceAt") }, ...over,
});

// CHK-CLAIM-01 from the check registry, on one part carrying the metrics.
const seed = JSON.parse(readFileSync(new URL("../../checks/seed/checks.seed.json", import.meta.url), "utf8")) as unknown;
const CHECK = registerChecks({ seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).find((d) => d.id === "CHK-CLAIM-01")!;
async function checkValue(): Promise<number> {
  const part = { id: "spring", bodies: [], features: [], assertions: [], metrics } as unknown as Part;
  const [r] = (await runRegistry([CHECK], {
    kernels: new Set<KernelId>(["geom", "mesh", "profile"]), produced: new Set<CheckLevel>(["part"]), targets: { parts: [part] },
    ctx: { profile: createProfileLookup(loadProfile()), machine: "ffc5p", whitelist: new Map() },
    claims: { decls: [CLAIM] },
  })).results;
  if (r === undefined || typeof r.measured !== "number") throw new Error("CHK-CLAIM-01 gave no value");
  return r.measured;
}

describe("drive.press and plot.curve agree with CHK-CLAIM-01", () => {
  it("the fixture snaps, and the claim travel sits on a flank steep enough to show a 0.1 mm offset", () => {
    expect(curve.length).toBe(SAMPLES);
    expect(T).toBeGreaterThan(0);
    expect(T).toBeLessThan(stop);
    expect(steepest.slope * 0.1).toBeGreaterThan(CURVE_TOLERANCE);
  });

  it("the press force at the claim travel equals CHK-CLAIM-01's value to 0.01 N (computed)", async () => {
    const want = await checkValue();
    const m = widgetModel(PRESS, build({ travelMm: T })) as PressModel;
    expect(m.problem).toBeNull();
    expect(m.target).toBe("0");
    expect(m.outputs["travel"]).toBe(T);
    expect(Math.abs((m.outputs["forceN"] as number) - want)).toBeLessThanOrEqual(CURVE_TOLERANCE);
    // With no host stimulus the press starts at the claim's own travel.
    expect((widgetModel(PRESS, build()) as PressModel).outputs["travel"]).toBe(T);
    console.info(`click-spring-window press at ${T.toFixed(4)} mm: ${(m.outputs["forceN"] as number).toFixed(4)} N, CHK-CLAIM-01 ${want.toFixed(4)} N (computed)`);
  });

  it("the plot cursor at the press travel reads the same force, and the band is the claim's lo and hi", async () => {
    const want = await checkValue();
    const p = widgetModel(PLOT, build({ travelMm: T })) as PlotModel;
    expect(p.problem).toBeNull();
    expect(p.view.band).toEqual({ lo: CLAIM.want.lo, hi: CLAIM.want.hi });
    expect(p.view.cursor?.travelMm).toBe(T);
    expect(Math.abs(p.view.cursor!.forceN! - want)).toBeLessThanOrEqual(CURVE_TOLERANCE);
    expect(p.units).toEqual({ x: "mm", y: "N" });
  });

  it("the series is the claim function's curve and the contact point is cg", () => {
    const p = widgetModel(PLOT, build()) as PlotModel;
    expect(p.view.points).toEqual(curve);
    expect(p.view.stopMm).toBe(stop);
    expect(Math.abs(p.view.contactMm! - cg)).toBeLessThanOrEqual(CONTACT_TOL_MM);
    expect(p.view.measured).toEqual([]);
    expect(p.view.peak).toEqual(curve.reduce((a, b) => (b.F > a.F ? b : a)));
  });
});

describe("drive.press liveness", () => {
  it("driving travel 0 to the contact changes the force and flips the contact once", () => {
    const steps = 40;
    const runs = Array.from({ length: steps + 1 }, (_, i) => (cg * i) / steps).map((t) => widgetModel(PRESS, build({ travelMm: t })) as PressModel);
    for (const r of runs) expect(r.problem).toBeNull();
    const forces = runs.map((r) => r.outputs["forceN"] as number);
    expect(new Set(forces.map((f) => f.toFixed(6))).size).toBeGreaterThan(steps / 2);
    const closed = runs.map((r) => r.outputs["contact"] as boolean);
    expect(closed[0]).toBe(false);
    expect(closed[steps]).toBe(true);
    expect(closed.filter((x, i) => i > 0 && x !== closed[i - 1]).length).toBe(1);
  });

  it("BENCH.widgets() records publish every declared output as live, measured points excepted until a coupon", () => {
    const [press, plot] = widgetRecords([PRESS, PLOT], build({ travelMm: cg }));
    expect(press?.problem).toBeNull();
    expect(press?.live).toEqual(["travel", "forceN", "contact"]);
    expect(press?.outputs["contact"]).toBe(true);
    expect(plot?.live).toEqual(["series", "band", "contactMm", "cursor"]);
  });

  it("the lines carry units and qualifiers", () => {
    const m = widgetModel(PRESS, build({ travelMm: 0 })) as PressModel;
    expect(pressLine(m)).toMatch(/^travel 0 mm, force [0-9.e-]+ N computed, open$/);
    const l = plotLines(widgetModel(PLOT, build()) as PlotModel);
    expect(l.bandLine).toMatch(/^claim press band [0-9.]+ to [0-9.]+ N, inferred until a coupon backs it$/);
    expect(l.readout).toMatch(/ N computed, (open|closed)$/);
  });
});

describe("drive.press and plot.curve refuse, naming why", () => {
  it("both kinds are registered", () => {
    expect(widgetKinds()).toEqual(expect.arrayContaining(["drive.press", "drive.tilt", "plot.curve"]));
    expect(widgetEntry("drive.press")).toBe(drivePress);
    expect(widgetEntry("plot.curve")).toBe(plotCurve);
  });

  it("no claim, no claim function, a wrong unit, a tilt pad and a missing contact each name the gap", () => {
    expect(widgetModel(PRESS, build({ claims: [] })).problem).toBe("no claim of this chase calls spring.forceAt; declare one in chase claims");
    expect(widgetModel(PLOT, build({ claimFns: {} })).problem).toContain("carries no claim function spring.forceAt");
    expect(widgetModel(PRESS, build({ claims: [{ ...CLAIM, want: { ...CLAIM.want, unit: "g" } }] })).problem).toBe("spring.forceAt returns N and claim press wants g");
    expect(widgetModel(PRESS, build({ drive: { ...drive, gesture: "tilt" } })).problem).toContain("is not hold");
    expect(widgetModel(PRESS, build({ contacts: {} })).problem).toContain("no contact function contact");
    expect(widgetModel(PRESS, build({ metrics: [] })).problem).toContain("no drive target");
    expect(widgetModel(PLOT, build({ metrics: [] })).problem).toContain("spring.curve.n");
  });

  it("a plot with no drive still draws the series and band, with no cursor", () => {
    const { drive: _d, ...noDrive } = build();
    const p = widgetModel(PLOT, noDrive) as PlotModel;
    expect(p.problem).toBeNull();
    expect(p.view.cursor).toBeNull();
    expect(p.view.contactMm).toBeNull();
    expect(plotLines(p).readout).toBe("no drive.press on this bench. the cursor needs the contact function.");
  });
});
