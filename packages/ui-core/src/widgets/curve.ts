// plot.curve (plan v9 section 3.2: force or resistance against travel).
// The series is the claim function's own curve() (spring.forceAt reads
// the archetype's sampled SNAPFE curve), the band is the claim's want, the
// contact point is the first travel at which the design's ContactFn closes,
// and the cursor is the drive.press travel with the force the claim
// function gives there. CHK-CLAIM-01 calls the same function, so the plot,
// the press and the check agree to 0.01 (G-20). Measured points come from
// evidence rows (R1-engine-26) and stay empty until a person enters a
// coupon. The view shape and the contact search are the ones the
// `plot.<id>` rail panel (packages/ui panels/curve.ts) draws, kept here
// once so the panel and the widget find one contact travel.

import type { ContactFn, Metric, WidgetDecl } from "@hackbuild/spec";
import { liveOutputs } from "./live.js";
import { fmt } from "../bench/locate.js";
import { claimAt, claimBinding, claimTarget, pressTravel, TRAVEL_ARG } from "./press.js";
import type { WidgetBuild, WidgetEntry, WidgetModel } from "./registry.js";

export interface CurvePoint {
  /** Travel, mm. */
  readonly d: number;
  /** Force, N. */
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

/** Largest force of a curve, or null for none. */
export function curvePeak(points: readonly CurvePoint[]): CurvePoint | null {
  return points.length === 0 ? null : points.reduce((a, b) => (b.F > a.F ? b : a));
}

/**
 * First travel in 0 to stopMm at which fn closes a contact, by bisection to
 * CONTACT_TOL_MM; null when it stays open at the stop.
 */
export function contactTravel(fn: ContactFn, metrics: readonly Metric[], target: string, stopMm: number): number | null {
  const closed = (s: number): boolean => fn(metrics, target, s).closed.length > 0;
  if (!closed(stopMm)) return null;
  let a = 0, b = stopMm;
  if (closed(0)) b = 0;
  while (b - a > CONTACT_TOL_MM) {
    const m = (a + b) / 2;
    if (closed(m)) b = m;
    else a = m;
  }
  return b;
}

export interface PlotModel extends WidgetModel {
  readonly view: CurveView;
  /** Axis units: x the stimulus input's unit, y the claim function's. */
  readonly units: { readonly x: string; readonly y: string };
  /** The claim the band and the series read, or null. */
  readonly claim: string | null;
}

const EMPTY: Omit<CurveView, "problem"> = { points: [], band: null, contactMm: null, peak: null, stopMm: 0, cursor: null, measured: [] };

function refusal(decl: WidgetDecl, problem: string): PlotModel {
  return { id: decl.id, kind: decl.kind, outputs: {}, problem, view: { ...EMPTY, problem }, units: { x: "mm", y: "N" }, claim: null };
}

/** The plot.curve view of a claim on the current build, with the drive.press travel as its cursor. */
export const plotCurve: WidgetEntry<PlotModel> = {
  model(decl, build: WidgetBuild) {
    const b = claimBinding(decl, build);
    if (typeof b === "string") return refusal(decl, b);
    if (b.def.curve === undefined) return refusal(decl, `${decl.fn} has no curve to plot; pick a claim function that samples one`);
    const contact = build.drive === undefined ? undefined : build.contacts[build.drive.contact];
    let points: CurvePoint[];
    try {
      points = b.def.curve(build.metrics, b.claim.args ?? {}, contact === undefined ? {} : { contact }).map((p) => ({ d: p.x, F: p.y }));
    } catch (e) {
      return refusal(decl, e instanceof Error ? e.message : String(e));
    }
    if (points.length < 2) return refusal(decl, "no force curve in this build. build the design first.");
    const band = { lo: b.claim.want.lo, hi: b.claim.want.hi };
    const measured = build.measured?.[b.claim.id] ?? [];
    const target = build.drive === undefined ? null : claimTarget(build.drive, build.metrics, b.claim);
    let stopMm = points[points.length - 1]!.d;
    let contactMm: number | null = null;
    let cursor: CurveCursor | null = null;
    if (contact !== undefined && target !== null) {
      stopMm = contact(build.metrics, target, true).pose?.travelMm ?? stopMm;
      contactMm = contactTravel(contact, build.metrics, target, stopMm);
      const travelMm = pressTravel(decl, build, b.claim);
      const f = claimAt(b, build.metrics, travelMm, contact);
      cursor = { travelMm, forceN: typeof f === "number" ? f : null, closed: contact(build.metrics, target, travelMm).closed.length > 0 };
    }
    const view: CurveView = { problem: null, points, band, contactMm, peak: curvePeak(points), stopMm, cursor, measured };
    const outputs: Record<string, unknown> = {
      series: points, band, contactMm, measured, cursor, peak: view.peak,
    };
    return {
      id: decl.id, kind: decl.kind, outputs, problem: null, view,
      units: { x: b.def.inputs[TRAVEL_ARG]?.unit ?? "mm", y: b.def.unit }, claim: b.claim.id,
    };
  },
  liveness: liveOutputs,
};

/** The lines a plot.curve draws beside its view: heading, cursor readout and band, each number qualified. */
export function plotLines(m: PlotModel): { readonly heading: string; readonly readout: string; readonly bandLine: string | null } {
  const c = m.view.cursor;
  const { x, y } = m.units;
  const readout = c === null
    ? "no drive.press on this bench. the cursor needs the contact function."
    : `travel ${fmt(c.travelMm)} ${x}, ${c.forceN === null ? "force unknown" : `force ${fmt(c.forceN)} ${y} computed`}, ${c.closed ? "closed" : "open"}`;
  const b = m.view.band;
  const bandLine = b === null || m.claim === null ? null : `claim ${m.claim} band ${fmt(b.lo)} to ${fmt(b.hi)} ${y}, inferred until a coupon backs it`;
  return { heading: "force against travel", readout, bandLine };
}
