// R1-flagship-access-switch-03: the click spring's force curve as metrics,
// so a ContactFn and plot.curve can read it. The curve is the original's:
// test/legacy/pip-fits.json holds PIP's own SNAPFE load steps at its
// defaults (scripts/pip-legacy.mjs), registered here as the solver, since
// this tier may not import packages/sim. Peak 2.527 N is RECORD 5.2
// (computed by the original).

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { Metric } from "@hackbuild/spec";
import { CLICK_DEFAULTS, clickApply, pipStack, provideClickSolver, shippedProfile, type ClickCurve } from "@hackbuild/archetypes";

interface Pt { d: number; F: number; e: number }
interface Variant {
  z: { top: number };
  mech: Record<string, Record<string, number | boolean>>;
  fe: { peak: number; valley: number; drop: number; dPeak: number; dValley: number; bistable: boolean; snap: boolean; ok: boolean; pts: Pt[] };
}
const LEG = JSON.parse(readFileSync(new URL("legacy/pip-fits.json", import.meta.url), "utf8")) as { variants: Record<string, Variant> };
const V = LEG.variants["haft.defaults"]!;
const RECORD_PEAK_N = 2.527;

function legacyCurve(v: Variant): ClickCurve {
  const fe = v.fe, c = v.mech["click"]!;
  return {
    peakN: fe.peak, peakAtMm: fe.dPeak, valleyN: fe.valley, valleyAtMm: fe.dValley, drop: fe.drop,
    contactMm: c["cg"] as number, eStop: c["eStop"] as number, snaps: fe.snap, bistable: fe.bistable, ok: fe.ok,
    pts: fe.pts.map((p) => ({ d: p.d, F: p.F })),
  };
}

const draft = { id: "body", name: "body", process: "fdm" as const, machine: "ffc5p", frame: { originOnAxis: false, carriesOffset: false, pose: "print" as const }, bodies: [], features: [] };

function run(curveSamples: number): Metric[] {
  const p = shippedProfile();
  provideClickSolver(() => legacyCurve(V));
  const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });
  const face = { origin: [0, 0, s.z.floor] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };
  return [...clickApply({ draft, face, profile: p, params: { ...CLICK_DEFAULTS, top: V.z.top, curveSamples } }, "click-spring-key").metrics];
}

const num = (ms: Metric[], id: string): number => {
  const m = ms.find((x) => x.id === id);
  if (m === undefined || typeof m.value !== "number") throw new Error(`no numeric metric ${id}`);
  return m.value;
};

describe("click spring force curve metrics", () => {
  test("16 samples at PIP defaults: the largest force is within 2 percent of the record peak, travel rises to cg + stop overtravel", () => {
    const ms = run(16);
    expect(num(ms, "spring.curve.n")).toBe(16);
    const d = Array.from({ length: 16 }, (_, i) => num(ms, `spring.curve.d${i}`));
    const F = Array.from({ length: 16 }, (_, i) => num(ms, `spring.curve.F${i}`));
    expect(d[0]).toBe(0);
    for (let i = 1; i < 16; i++) expect(d[i]!, `d${i}`).toBeGreaterThan(d[i - 1]!);
    // The stop: the record's contact travel plus the 0.3 mm overtravel row (layout.js line 95).
    expect(d[15]!).toBeCloseTo((V.mech["click"]!["cg"] as number) + 0.3, 6);
    expect(Math.abs(Math.max(...F) - RECORD_PEAK_N) / RECORD_PEAK_N).toBeLessThanOrEqual(0.02);
    expect(F[0]).toBe(0);
    // Each sample sits on the original's curve: between the two load steps around it.
    for (let i = 0; i < 16; i++) {
      const k = V.fe.pts.findIndex((p) => p.d >= d[i]! - 1e-9);
      const a = V.fe.pts[Math.max(0, k - 1)]!, b = V.fe.pts[k]!;
      expect(F[i]!, `F${i}`).toBeGreaterThanOrEqual(Math.min(a.F, b.F) - 1e-9);
      expect(F[i]!, `F${i}`).toBeLessThanOrEqual(Math.max(a.F, b.F) + 1e-9);
    }
    const m = ms.find((x) => x.id === "spring.curve.F3")!;
    expect(m.gate).toBe("CHK-KEY-04");
    expect(m.note).toMatch(/computed, SNAPFE/);
  });

  test("curveSamples 0 emits no spring.curve metric", () => {
    expect(run(0).filter((m) => m.id.startsWith("spring.curve")).map((m) => m.id)).toEqual([]);
  });

  test("a solver with no load steps refuses with E_KERNEL when samples are asked", () => {
    const p = shippedProfile();
    provideClickSolver(() => ({ ...legacyCurve(V), pts: undefined }));
    const s = pipStack(p, "ffc5p", { body: "petg", trace: "cpla" });
    const face = { origin: [0, 0, s.z.floor] as [number, number, number], normal: [0, 0, 1] as [number, number, number], u: [1, 0, 0] as [number, number, number] };
    expect(() => clickApply({ draft, face, profile: p, params: { ...CLICK_DEFAULTS, top: V.z.top, curveSamples: 4 } }, "click-spring-key")).toThrow(/E_KERNEL \/params\/curveSamples/);
  });
});
