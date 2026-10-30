// keys/access-switch bench (R1-flagship-access-switch-12): drive.press and
// plot.curve on the real build (core buildPart at the pinned epoch).
// Liveness: dragging the travel to the spring's contact travel cg flips
// the contact closed, and the force build.ts `contact` reports there
// equals the SNAPFE curve at cg within 0.01 N (G-20). The curve value is
// read from packages/sim clickRigid run here on the design's params and
// the profile modulus, an independent path from the archetype's sampled
// metrics. The plot.curve panel's data function (packages/bench curveView)
// reads the same contact function and must agree with the pad to 0.01.
// The bench declaration follows the flex-pair bench rules (gold-standard
// GOLD-10, GOLD-12, GOLD-13).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { createProfileLookup } from "@hackbuild/profile";
import { CLICK_DEFAULTS } from "@hackbuild/archetypes";
import { clickRigid, clickRules } from "@hackbuild/sim";
import { DRIVE_READOUTS, type Metric } from "@hackbuild/spec";
import { targetIds } from "../../../../packages/bench-core/src/drive/drive.js";
import { buildPart, loadDesign, resolveParams, type Built } from "../../../../core/src/commands/build.js";
import { CONTACT_TOL_MM, CURVE_TOLERANCE, curveView, type CurveEntry } from "../../../../packages/bench/src/panels/curve.js";
import { bench } from "../bench";
import { contact } from "../build";
import { chase } from "../chase";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");
const REF = "reference/keys/access-switch";
const KEY = "click-spring-key.0";
const WORKED = "default";

let built: Built;
let simAt: (d: number) => number;
beforeAll(async () => {
  const design = await loadDesign(REF, ROOT);
  const params = resolveParams(design.chase, undefined, undefined) as unknown as { l: number; t: number; Q: number; w: number };
  built = await buildPart(design, params as never, { epoch: 315532800 });
  const profile = createProfileLookup(design.ws.tables);
  const E = profile.material("petg").modulusMPa;
  if (E === undefined) throw new Error("profile material petg has no modulusMPa");
  const fe = clickRigid({ l: params.l, t: params.t, Q: params.Q, w: params.w, E, sw: CLICK_DEFAULTS.sw }, clickRules(profile));
  // The sim's load steps, linear between them, as the archetype samples them.
  simAt = (d) => {
    const pts = fe.pts;
    let j = 0;
    while (j < pts.length - 2 && pts[j + 1]!.d < d) j++;
    const a = pts[j]!, b = pts[j + 1]!;
    return a.F + (b.F - a.F) * Math.min(1, Math.max(0, (d - a.d) / (b.d - a.d)));
  };
}, 300_000);

const metrics = (): readonly Metric[] => built.part.metrics;
const num = (id: string): number => {
  const v = metrics().find((m) => m.id === id)?.value;
  if (typeof v !== "number") throw new Error(`no numeric metric ${id}`);
  return v;
};
const drive = bench.views.drive!;
const plot = bench.plots.press;
const entry = (held = false): CurveEntry => ({
  kind: "plot.curve", fn: contact,
  inputs: { plotId: "press", plot, metrics: metrics(), target: "0", held },
  outputs: ["travel", "force", "logic"], tolerance: CURVE_TOLERANCE,
});

describe("access switch drive.press", () => {
  it("the pad has one target, the placed key, and its readout carries force", () => {
    expect(targetIds(drive, metrics())).toEqual(["0"]);
    expect(drive.gesture).toBe("hold");
    expect(drive.contact).toBe("contact");
    expect(drive.readout).toEqual(["logic", "ohm", "travel", "force"]);
    for (const r of drive.readout) expect(DRIVE_READOUTS).toContain(r);
  });

  it("dragging travel to cg flips the contact closed", () => {
    const cg = num(`${KEY}.spring.cg`);
    expect(contact(metrics(), "0", 0).closed).toEqual([]);
    expect(contact(metrics(), "0", cg - 0.01).closed).toEqual([]);
    expect(contact(metrics(), "0", cg).closed).toEqual([`${KEY}.conductor.pad`, `${KEY}.conductor.padCommon`]);
    expect(contact(metrics(), "0", false).closed).toEqual([]);
  });

  it("the force at cg equals the SNAPFE curve at cg within 0.01 N", () => {
    const cg = num(`${KEY}.spring.cg`);
    const f = contact(metrics(), "0", cg).forceN;
    expect(f).toBeDefined();
    expect(Math.abs(f! - simAt(cg))).toBeLessThanOrEqual(CURVE_TOLERANCE);
    // Across the travel, not only at cg.
    for (const d of [0.1, 0.4, 0.8, num("paddle.travel")]) {
      expect(Math.abs(contact(metrics(), "0", d).forceN! - simAt(d)), `at ${d} mm`).toBeLessThanOrEqual(CURVE_TOLERANCE);
    }
  });

  it("a hold presses the paddle to its stop, past cg, and closes", () => {
    const s = contact(metrics(), "0", true);
    expect(s.pose?.travelMm).toBe(num("paddle.travel"));
    expect(s.pose!.travelMm!).toBeGreaterThan(num(`${KEY}.spring.cg`));
    expect(s.closed.length).toBe(2);
    expect(contact(metrics(), "0", 99).pose?.travelMm).toBe(num("paddle.travel"));
  });
});

describe("access switch plot.curve", () => {
  it("draws the build's sampled curve with the claim band", () => {
    const v = curveView(entry(), null);
    expect(v.problem).toBeNull();
    expect(v.points.length).toBe(num(`${KEY}.spring.curve.n`));
    expect(v.points.length).toBe(24);
    expect(v.band).toEqual({ lo: num("claim.press.lo"), hi: num("claim.press.hi") });
    expect(v.peak!.F).toBeCloseTo(num(`${KEY}.spring.peakN`), 1);
    expect(v.measured).toEqual([]);
  });

  it("puts the contact line at cg, read from the contact function", () => {
    const v = curveView(entry(), null);
    expect(Math.abs(v.contactMm! - num(`${KEY}.spring.cg`))).toBeLessThanOrEqual(CONTACT_TOL_MM);
  });

  it("agrees with the pad to 0.01 at a dragged travel and at the hold", () => {
    const cg = num(`${KEY}.spring.cg`);
    for (const d of [cg - 0.05, cg, cg + 0.05]) {
      const c = curveView(entry(), d).cursor!;
      const pad = contact(metrics(), "0", d);
      expect(Math.abs(c.forceN! - pad.forceN!)).toBeLessThanOrEqual(CURVE_TOLERANCE);
      expect(c.closed).toBe(pad.closed.length > 0);
    }
    expect(curveView(entry(false), null).cursor).toEqual({ travelMm: 0, forceN: contact(metrics(), "0", 0).forceN, closed: false });
    const held = curveView(entry(true), null).cursor!;
    expect(held.travelMm).toBe(num("paddle.travel"));
    expect(held.closed).toBe(true);
  });
});

describe("access switch bench", () => {
  const steps = bench.rail;

  it("each guide goal is one lowercase sentence of at least ten words", () => {
    for (const s of steps) {
      expect(s.goal, s.step).toMatch(/^[a-z]/);
      expect(s.goal.endsWith("."), s.step).toBe(true);
      expect(s.goal.slice(0, -1).includes(". "), s.step).toBe(false);
      expect(s.goal.split(/\s+/).length, s.step).toBeGreaterThanOrEqual(10);
    }
  });

  it("steps run spring, paddle, jack, print, and the press plot shows where the spring is tuned", () => {
    expect(steps.map((s) => s.step)).toEqual(["spring", "paddle", "jack", "print"]);
    expect(steps[0]!.panels).toContain("plot.press");
    expect(steps[1]!.panels).toContain("plot.press");
  });

  it("the welcome leads with the worked example", () => {
    expect(bench.welcome.presets[0]).toBe(WORKED);
    expect(bench.welcome.starts[0]!.preset).toBe(WORKED);
    expect(chase.presets.some((p) => p.id === WORKED)).toBe(true);
  });

  it("the print step opens plate, shows the filament slots and lists exports before checks", () => {
    const p = steps.at(-1)!;
    expect(p.step).toBe("print");
    expect(p.view).toBe("plate");
    expect(p.panels[0]).toBe("exports");
    expect(p.panels.indexOf("exports")).toBeLessThan(p.panels.indexOf("checks"));
    expect(p.panels).toContain("materials");
  });
});
