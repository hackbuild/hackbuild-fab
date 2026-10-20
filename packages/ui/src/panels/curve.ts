// plot.curve (plan v9 section 3.2): force against travel for a "plot.<id>"
// rail panel (spec/bench.ts PlotDecl). The panel props take the widget
// registry entry shape { kind, fn, inputs, outputs, tolerance } so the
// registry can register this panel as it stands. The curve is the build's
// sampled metrics; every force at a travel, the contact travel and the
// cursor readout come from the design's ContactFn, the one the drive pad,
// the 3D pose and BENCH.drive call (G-20), so the panel and the pad agree.
// The axes, the dashed contact line, the curve and the peak dot are PIP's
// drawCurve (designs/pip/legacy/bench/part3.js lines 394 to 417, lineage
// pip.bench-part3) drawn as SVG paths.

import type { ContactFn, DriveReadout, Metric, PlotDecl } from "@hackbuild/spec";

/** What the panel reads; the registry entry's inputs. */
export interface CurveInputs {
  readonly plotId: string;
  readonly plot: PlotDecl | null;
  readonly metrics: readonly Metric[];
  /** The drive target the curve belongs to (its metric group index), or null with no drive. */
  readonly target: string | null;
  /** The pad holds the target: the cursor goes to the hold travel. */
  readonly held: boolean;
}

/** The widget registry entry shape (plan v9 section 3.2). */
export interface CurveEntry {
  readonly kind: "plot.curve";
  readonly fn: ContactFn | null;
  readonly inputs: CurveInputs;
  readonly outputs: readonly DriveReadout[];
  /** Agreement between this panel and the pad, in the y unit (G-20). */
  readonly tolerance: number;
}

export interface CurvePoint {
  readonly d: number;
  readonly F: number;
}

export interface CurveCursor {
  readonly travelMm: number;
  readonly forceN: number | null;
  readonly closed: boolean;
}

export interface CurveView {
  /** Why nothing draws; null when the curve draws. */
  readonly problem: string | null;
  readonly points: readonly CurvePoint[];
  readonly band: { readonly lo: number; readonly hi: number } | null;
  /** First travel at which fn closes a contact, mm, to `CONTACT_TOL_MM`; null when it never closes. */
  readonly contactMm: number | null;
  readonly peak: CurvePoint | null;
  /** The hold travel, the cursor's top end, mm. */
  readonly stopMm: number;
  readonly cursor: CurveCursor | null;
  /** Coupon points; empty until a person enters a coupon. */
  readonly measured: readonly CurvePoint[];
}

/** Bisection stop for the contact travel, mm; far under one curve sample step. */
export const CONTACT_TOL_MM = 1e-4;

/** G-20: the pad and every panel driven by the same fn agree to 0.01. */
export const CURVE_TOLERANCE = 0.01;

const numOf = (metrics: readonly Metric[], id: string): number | null => {
  const v = metrics.find((m) => m.id === id)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/** Sampled points `<prefix>.n`, `.d<i>`, `.F<i>` (spec/bench.ts PlotDecl.metric). */
export function sampled(metrics: readonly Metric[], prefix: string): CurvePoint[] {
  const n = numOf(metrics, `${prefix}.n`) ?? 0;
  const out: CurvePoint[] = [];
  for (let i = 0; i < n; i++) {
    const d = numOf(metrics, `${prefix}.d${i}`), F = numOf(metrics, `${prefix}.F${i}`);
    if (d === null || F === null) break;
    out.push({ d, F });
  }
  return out;
}

const EMPTY: Omit<CurveView, "problem"> = { points: [], band: null, contactMm: null, peak: null, stopMm: 0, cursor: null, measured: [] };

/**
 * The view of one curve panel at a dragged travel, or at the pad's hold
 * (travelMm null): held reads fn at its hold, released at zero.
 */
export function curveView(e: CurveEntry, travelMm: number | null): CurveView {
  const { plot, metrics, target } = e.inputs;
  if (plot === null) return { ...EMPTY, problem: `plot ${e.inputs.plotId} is not declared in this bench` };
  const points = sampled(metrics, plot.metric);
  if (points.length < 2) return { ...EMPTY, problem: "no force curve in this build. build the design first." };
  const lo = plot.band === undefined ? null : numOf(metrics, plot.band.lo);
  const hi = plot.band === undefined ? null : numOf(metrics, plot.band.hi);
  const band = lo !== null && hi !== null ? { lo, hi } : null;
  const peak = points.reduce((a, b) => (b.F > a.F ? b : a));
  const measured = plot.measured === undefined ? [] : sampled(metrics, plot.measured);
  const fn = e.fn;
  if (fn === null || target === null) {
    return { problem: null, points, band, contactMm: null, peak, stopMm: points[points.length - 1]!.d, cursor: null, measured };
  }
  const at = (s: boolean | number) => fn(metrics, target, s);
  const stopMm = at(true).pose?.travelMm ?? points[points.length - 1]!.d;
  let contactMm: number | null = null;
  if (at(stopMm).closed.length > 0) {
    let a = 0, b = stopMm;
    if (at(0).closed.length > 0) b = 0;
    while (b - a > CONTACT_TOL_MM) {
      const m = (a + b) / 2;
      if (at(m).closed.length > 0) b = m;
      else a = m;
    }
    contactMm = b;
  }
  const s = at(travelMm ?? e.inputs.held);
  const cursor = { travelMm: s.pose?.travelMm ?? 0, forceN: s.forceN ?? null, closed: s.closed.length > 0 };
  return { problem: null, points, band, contactMm, peak, stopMm, cursor, measured };
}

/** The SVG frame, in viewBox units; PIP's canvas is 150 px high with the margins below. */
export const FRAME = { w: 320, h: 150 } as const;

export interface CurveSvg {
  readonly x: (d: number) => number;
  readonly y: (F: number) => number;
  readonly path: string;
  readonly yTicks: readonly number[];
  readonly xTicks: readonly number[];
}

/**
 * PIP's scales: x 34 to w - 10 over 0 to the largest travel, y from
 * h - 20 up over min(0, F) to 1.15 the largest force; force grid every
 * max(0.5, round(fmax / 4)) N, travel ticks every 0.5 mm.
 */
export function curveSvg(v: CurveView, w: number = FRAME.w, h: number = FRAME.h): CurveSvg {
  const ds = v.points.map((p) => p.d), fs = v.points.map((p) => p.F);
  const dmax = Math.max(...ds, v.stopMm) || 1;
  const fmax = Math.max(...fs, v.band?.hi ?? 0) * 1.15 || 1;
  const fmin = Math.min(0, ...fs);
  const x = (d: number): number => 34 + ((w - 44) * d) / dmax;
  const y = (F: number): number => h - 20 - ((h - 34) * (F - fmin)) / (fmax - fmin);
  const path = v.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.d).toFixed(2)} ${y(p.F).toFixed(2)}`).join(" ");
  const fStep = Math.max(0.5, Math.round(fmax / 4));
  const yTicks: number[] = [];
  for (let f = 0; f <= fmax; f += fStep) yTicks.push(f);
  const xTicks: number[] = [];
  for (let d = 0; d <= dmax + 1e-9; d += 0.5) xTicks.push(d);
  return { x, y, path, yTicks, xTicks };
}
