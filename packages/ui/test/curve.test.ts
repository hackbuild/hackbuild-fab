// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The plot.curve panel (R1-flagship-access-switch-12): its data function
// and its mount. vue-tsc does not check .vue files, so curveView carries
// every number and this test holds it. The scales are PIP drawCurve's,
// read from the shipped part3.js (lineage pip.bench-part3), never typed
// here. The curve and contact function are a two-segment toy, so the
// expected contact travel and forces are hand-checkable: closed at 0.6 mm,
// force 2 N per mm to 0.5 mm, then 1 N flat.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import type { ContactFn, Metric, PlotDecl } from "@hackbuild/spec";
import CurvePanel from "../src/panels/CurvePanel.vue";
import { CONTACT_TOL_MM, CURVE_TOLERANCE, curveSvg, curveView, FRAME, sampled, type CurveEntry } from "../src/panels/curve.js";
import { curveEntry, resolvePanel, type PanelCtx } from "../src/bench/panels.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const part1 = readFileSync(path.join(ROOT, "designs/pip/legacy/bench/part1.html"), "utf8");
const part3 = readFileSync(path.join(ROOT, "designs/pip/legacy/bench/part3.js"), "utf8");

const m = (id: string, value: number): Metric => ({ id, value, unit: "", basis: "computed", tiers: [], qualifier: "computed", note: "", gate: "informational" } as unknown as Metric);
const CURVE: [number, number][] = [[0, 0], [0.5, 1], [1, 1]];
const METRICS: Metric[] = [
  m("k.0.curve.n", CURVE.length),
  ...CURVE.flatMap(([d, F], i) => [m(`k.0.curve.d${i}`, d), m(`k.0.curve.F${i}`, F)]),
  m("band.lo", 0.8), m("band.hi", 1.2),
];
const PLOT: PlotDecl = { metric: "k.0.curve", x: { label: "travel", unit: "mm" }, y: { label: "force", unit: "N" }, marks: ["contact", "peak"], band: { lo: "band.lo", hi: "band.hi" } };
const STOP = 0.9;
const fn: ContactFn = (_metrics, _target, s) => {
  const t = Math.min(Math.max(s === true ? STOP : typeof s === "number" ? s : 0, 0), STOP);
  return { closed: t >= 0.6 ? ["c"] : [], pose: { travelMm: t }, forceN: t <= 0.5 ? 2 * t : 1 };
};
const entry = (held = false, plot: PlotDecl | null = PLOT): CurveEntry =>
  ({ kind: "plot.curve", fn, inputs: { plotId: "press", plot, metrics: METRICS, target: "0", held }, outputs: ["travel", "force", "logic"], tolerance: CURVE_TOLERANCE });

describe("plot.curve data", () => {
  it("reads the sampled curve, the band and the peak from the metrics", () => {
    const v = curveView(entry(), null);
    expect(v.problem).toBeNull();
    expect(v.points).toEqual(CURVE.map(([d, F]) => ({ d, F })));
    expect(v.band).toEqual({ lo: 0.8, hi: 1.2 });
    expect(v.peak).toEqual({ d: 0.5, F: 1 });
    expect(v.measured).toEqual([]);
    expect(sampled(METRICS, "nothing")).toEqual([]);
  });

  it("finds the contact travel by calling the contact function", () => {
    const v = curveView(entry(), null);
    expect(Math.abs(v.contactMm! - 0.6)).toBeLessThanOrEqual(CONTACT_TOL_MM);
    expect(v.stopMm).toBe(STOP);
  });

  it("puts the cursor where the slider drags it, or at the hold", () => {
    expect(curveView(entry(), 0.25).cursor).toEqual({ travelMm: 0.25, forceN: 0.5, closed: false });
    expect(curveView(entry(), 0.7).cursor).toEqual({ travelMm: 0.7, forceN: 1, closed: true });
    expect(curveView(entry(false), null).cursor).toEqual({ travelMm: 0, forceN: 0, closed: false });
    expect(curveView(entry(true), null).cursor).toEqual({ travelMm: STOP, forceN: 1, closed: true });
  });

  it("names what is missing instead of drawing nothing", () => {
    expect(curveView(entry(false, null), null).problem).toBe("plot press is not declared in this bench");
    expect(curveView({ ...entry(), inputs: { ...entry().inputs, metrics: [] } }, null).problem).toBe("no force curve in this build. build the design first.");
    expect(curveView({ ...entry(), fn: null }, null).cursor).toBeNull();
  });

  it("scales as PIP drawCurve does", () => {
    expect(part3).toContain("const X = d => 34 + (w - 44) * d / dmax, Y = f => hh - 20 - (hh - 34) * (f - fmin) / (fmax - fmin);");
    expect(part3).toContain("fmax = Math.max(...pts.map(p => p[1])) * 1.15");
    expect(part1).toContain("canvas.curve{width:100%;height:150px");
    const v = curveView(entry(), null);
    const s = curveSvg(v);
    expect(FRAME.h).toBe(150);
    expect(s.x(0)).toBe(34);
    expect(s.x(1)).toBe(FRAME.w - 10);
    expect(s.y(0)).toBe(FRAME.h - 20);
    // fmax is 1.15 times the larger of the curve peak and the band top.
    expect(s.y(1.2 * 1.15)).toBeCloseTo(14, 9);
    expect(s.xTicks).toEqual([0, 0.5, 1]);
    expect(s.path.startsWith("M34.00 130.00 L")).toBe(true);
  });
});

describe("plot.curve panel registry", () => {
  const ctx = (held: string[]): PanelCtx => ({
    values: {}, results: [], metrics: [...METRICS, m("k.0.spring", 1)], envelope: null, part: null, exports: [], writable: [], fabrication: [],
    current: true, valueAt: () => undefined, log: [], notes: {},
    plots: { press: PLOT }, drive: { targets: "metrics.k", gesture: "hold", contact: "contact", readout: ["logic", "ohm", "travel", "force"], pickInView: false },
    contact: fn, held,
  });

  it("resolves plot.<id> to the curve panel with the registry entry shape", () => {
    const r = resolvePanel("plot.press", []);
    expect(r.kind).toBe("panel");
    const e = curveEntry("press", ctx(["0"]));
    expect(Object.keys(e)).toEqual(["kind", "fn", "inputs", "outputs", "tolerance"]);
    expect(e.kind).toBe("plot.curve");
    expect(e.fn).toBe(fn);
    expect(e.inputs.target).toBe("0");
    expect(e.inputs.held).toBe(true);
    expect(e.outputs).toEqual(["logic", "travel", "force"]);
    expect(e.tolerance).toBe(0.01);
    expect(curveEntry("press", ctx([])).inputs.held).toBe(false);
  });
});

describe("plot.curve panel mount", () => {
  it("draws the band, contact, curve, peak and cursor, and dragging moves the readout", async () => {
    const el = document.createElement("div");
    document.body.append(el);
    const app = createApp({ render: () => h(CurvePanel, { ...entry() }) });
    app.mount(el);
    await nextTick();
    for (const id of ["plot-band", "plot-contact", "plot-line", "plot-peak", "plot-cursor"]) expect(el.querySelector(`[data-hb="${id}"]`), id).not.toBeNull();
    expect(el.querySelectorAll('[data-hb="plot-measured"]').length).toBe(0);
    expect(el.querySelector('[data-hb="plot-measured-line"]')?.textContent?.trim()).toBe("no measured points. print the coupon and enter its readings.");
    expect(el.querySelector('[data-hb="plot-readout"]')?.textContent).toBe("travel 0 mm, force 0 N computed, open");
    const range = el.querySelector<HTMLInputElement>('[data-hb="plot-drive"] input[type="range"]')!;
    range.value = "0.7";
    range.dispatchEvent(new Event("input"));
    await nextTick();
    expect(el.querySelector('[data-hb="plot-readout"]')?.textContent).toBe("travel 0.7 mm, force 1 N computed, closed");
    app.unmount();
    el.remove();
  });
});
