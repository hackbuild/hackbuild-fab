// WASHER mm-space servo planner, ported from laser-rig.html (canonical
// lineage row washer.app/laserriggg):
// densify (lines 4096 to 4107), degPerMm (4119 to 4125), resolutionSlew
// (4143 to 4148), resolutionMM (4170 to 4176) and planChainPen (4179 to
// 4308). The harvested copy the M07 golden came from
// (designs/washer/legacy/laser-rig.zip) holds the same planChainPen, degPerMm, densify and
// resolutionMM; its resolutionSlew floors PLAN.steps at 1 where the
// canonical floors it at 0.25, which no PLAN.steps of 1 or more can tell
// apart.
//
// One velocity profile for the whole chain, bounded per segment by the
// servo's slew, its acceleration (ACC_SHARE of it to each of tangential and
// centripetal) and the deadband resolution ceiling on drawn segments, then
// by curvature (circumradius), junction deviation, the backward and forward
// acceleration sweeps, and the jerk smoothing: one windowed average that
// only lowers speed, then the sweeps again. Time is integrated per segment
// as 2 ds / (v0 + v1).
//
// The page reads CFG, PLAN and SERVO; here they are WasherRig, WasherPlan
// and ServoPreset, from profile (washerRig, washerPlan, servoPreset).
// Beside each speed the planner keeps the ceiling that set it, the readout
// the page's smoothReadout (line 4532) gives for the whole job: feed,
// slew, resolution, curvature, junction, floor (a forced stop or an end) or
// accel (a sweep, or the jerk smoothing that shapes acceleration). A
// lowering within 1e-9 relative keeps the earlier label, so float noise in
// the windowed average does not relabel a flat run.

import type { PathPoint, PlannedPoint, PlanResult, Planner, ProfileLookup } from "@hackbuild/spec";
import { type BilinearCorners, type WasherRig, clamp, wallToAngles } from "../kinematics/washer.js";
import type { Binding } from "./detent-steps.js";

/** The PLAN numbers the planner reads, from profile (washerPlan). */
export interface WasherPlan {
  /** Speed while the beam is on, mm/s. */
  readonly feed: number;
  /** Speed while the beam is off, mm/s. */
  readonly travel: number;
  /** Linear acceleration ceiling above the servo limit, mm/s2. */
  readonly accel: number;
  /** Junction deviation, mm. */
  readonly jd: number;
  /** Deadband steps the beam may advance per servo frame while drawing. */
  readonly steps: number;
  /** Time over which acceleration may build, s. */
  readonly jerk: number;
  /** Planner sample spacing (DENSE), mm. */
  readonly dense: number;
  /** Path tolerance, mm (the serialiser's split rule). */
  readonly tol: number;
  /** Live speed override, ratio. */
  readonly speed: number;
}

/** One SERVOS preset (lines 3832 to 3837): per axis, degrees. */
export interface ServoPreset {
  /** Slew, deg/s. */
  readonly slew: number;
  /** Angular acceleration, deg/s2. */
  readonly accel: number;
  /** Deadband, us. */
  readonly deadband: number;
  /** Position frames per second, Hz. */
  readonly frame: number;
  /** Gear lash, deg (sim only). */
  readonly lash: number;
  /** Proportional band, deg (sim only). */
  readonly band: number;
}

/** The four SERVOS presets, in page order. */
export const SERVO_PRESETS = ["micro9g", "micro9gm", "standard", "digital"] as const;
export type ServoPresetId = (typeof SERVO_PRESETS)[number];

/** Everything planChainPen reads: rig, plan, servo, and the corner map when calibration is on. */
export interface WasherCtx {
  readonly rig: WasherRig;
  readonly plan: WasherPlan;
  readonly servo: ServoPreset;
  readonly calib: BilinearCorners | null;
}

/** Of the servo's acceleration to each of tangential and centripetal, so their sum stays inside it (ACC_SHARE, line 3844). */
export const ACC_SHARE = 0.7;

/** A planned chain, the page's planChainPen result with the ceiling of every point. */
export interface WasherChain {
  readonly pts: readonly (readonly [number, number])[];
  /** Beam state of segment i, from pts[i] to pts[i + 1]. */
  readonly pen: readonly (0 | 1)[];
  /** Time at each point, s. */
  readonly t: Float64Array;
  /** Speed at each point, mm/s. */
  readonly v: Float64Array;
  readonly dur: number;
  readonly len: number;
  readonly drawLen: number;
  readonly travLen: number;
  /** Fastest beam-on point, mm/s. */
  readonly peak: number;
  /** Index of that point, -1 when nothing is drawn. */
  readonly peakIndex: number;
  readonly bindingAt: readonly Binding[];
}

export interface WasherPlanResult extends PlanResult {
  readonly space: "mm";
  readonly chain: WasherChain;
  readonly bindingAt: readonly Binding[];
  readonly peakMmS: number;
}

/** The rig of kinematics/washer.ts from profile. Inversion and trim stay at the page defaults, none (CFG lines 2176 to 2178). */
export function washerRig(profile: Pick<ProfileLookup, "constant">): WasherRig {
  const c = (id: string): number => profile.constant(id).value;
  return {
    dist: c("washer.dist"), wallW: c("washer.wallW"), wallH: c("washer.wallH"), mountH: c("washer.mountH"),
    minUs: c("washer.minUs"), maxUs: c("washer.maxUs"), homePan: c("washer.homePan"), homeTilt: c("washer.homeTilt"),
    invPan: false, invTilt: false, trimPan: 0, trimTilt: 0,
  };
}

/** The plan defaults from profile; speed is the live override at 1. */
export function washerPlan(profile: Pick<ProfileLookup, "constant">): WasherPlan {
  const c = (id: string): number => profile.constant(id).value;
  return {
    feed: c("washer.feed"), travel: c("washer.travel"), accel: c("washer.accel"), jd: c("washer.jd"),
    steps: c("washer.steps"), jerk: c("washer.jerk"), dense: c("washer.dense"), tol: c("washer.tol"), speed: 1,
  };
}

/** A SERVOS preset from profile rows servo.<id>.<field>. */
export function servoPreset(profile: Pick<ProfileLookup, "constant">, id: ServoPresetId = "micro9g"): ServoPreset {
  const c = (f: string): number => profile.constant(`servo.${id}.${f}`).value;
  return { slew: c("slew"), accel: c("accel"), deadband: c("deadband"), frame: c("frame"), lash: c("lash"), band: c("band") };
}

/** Resample a polyline every `step` mm or finer, lines 4096 to 4107. */
export function densify(pts: readonly (readonly [number, number])[], step: number): [number, number][] {
  if (pts.length < 2) return pts.map((p) => [p[0], p[1]]);
  const out: [number, number][] = [[pts[0]![0], pts[0]![1]]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!, b = pts[i]!;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 1e-7) continue;
    const n = Math.max(1, Math.ceil(L / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + (dx * k) / n, a[1] + (dy * k) / n]);
  }
  return out;
}

/** Degrees of servo travel per mm of target for the busier axis, lines 4119 to 4125. */
export function degPerMm(ctx: WasherCtx, a: readonly [number, number], b: readonly [number, number]): number {
  const ds = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (ds < 1e-9) return 0;
  const A = wallToAngles(ctx.rig, a[0], a[1], ctx.calib), B = wallToAngles(ctx.rig, b[0], b[1], ctx.calib);
  const dA = Math.max(Math.abs(B.pan - A.pan), Math.abs(B.tilt - A.tilt));
  return dA / ds;
}

/** The fastest smooth drawing rate, deg/s: deadband steps per frame times frames, lines 4143 to 4148. */
export function resolutionSlew(ctx: WasherCtx): number {
  const deadDeg = (ctx.servo.deadband * 180) / Math.max(1, ctx.rig.maxUs - ctx.rig.minUs);
  return Math.max(0.25, ctx.plan.steps) * deadDeg * (ctx.servo.frame || 50);
}

/** One deadband step on the target at its centre, mm, lines 4170 to 4176. */
export function resolutionMM(ctx: WasherCtx): number {
  const usPerDeg = (ctx.rig.maxUs - ctx.rig.minUs) / 180;
  const deg = ctx.servo.deadband / usPerDeg;
  const k = degPerMm(ctx, [0, 0], [1, 0]);
  return k > 1e-9 ? deg / k : 0;
}

const REL = 1e-9;

/** planChainPen, lines 4179 to 4308, with the ceiling of every point. */
export function planChainPen(
  ctx: WasherCtx, pts: readonly (readonly [number, number])[], pen: readonly (0 | 1)[], forceStop: readonly number[] | null = null,
): WasherChain {
  const { plan: PLAN, servo: SERVO } = ctx;
  const n = pts.length;
  const ds = new Float64Array(Math.max(0, n - 1));
  const v = new Float64Array(n);
  const bindingAt: Binding[] = new Array<Binding>(n).fill("feed");
  let len = 0, drawLen = 0, travLen = 0;
  const lower = (i: number, m: number, why: Binding): void => {
    if (m < v[i]! * (1 - REL)) bindingAt[i] = why;
    v[i] = m;
  };

  for (let i = 0; i < n - 1; i++) {
    ds[i] = Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1]);
    len += ds[i]!;
    if (pen[i]) drawLen += ds[i]!;
    else travLen += ds[i]!;
  }

  // per-segment ceilings, both from the servo rather than from wall geometry
  const cap = new Float64Array(Math.max(0, n - 1));
  const capWhy: Binding[] = [];
  const acc = new Float64Array(Math.max(0, n - 1));
  const rSlew = resolutionSlew(ctx);
  for (let i = 0; i < n - 1; i++) {
    const k = degPerMm(ctx, pts[i]!, pts[i + 1]!);
    const vLim = k > 1e-9 ? SERVO.slew / k : Infinity;
    const aLim = k > 1e-9 ? SERVO.accel / k : Infinity;
    // The resolution ceiling applies to drawn segments only; travel keeps the full slew limit.
    const rLim = pen[i] && k > 1e-9 ? rSlew / k : Infinity;
    const base = pen[i] ? PLAN.feed : PLAN.travel;
    cap[i] = Math.min(base, vLim, rLim);
    capWhy[i] = cap[i] === base ? "feed" : cap[i] === rLim ? "resolution" : "slew";
    acc[i] = Math.min(PLAN.accel, aLim * ACC_SHARE);
  }
  // a vertex can be no faster than either segment touching it
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? cap[i - 1]! : Infinity;
    const b = i < n - 1 ? cap[i]! : Infinity;
    v[i] = Math.min(a, b);
    bindingAt[i] = b < a ? capWhy[i]! : i > 0 ? capWhy[i - 1]! : "feed";
  }

  // Sustained curvature: limit the speed so an arc costs no more angular
  // acceleration than the servo has to give.
  for (let i = 1; i < n - 1; i++) {
    const a = pts[i - 1]!, b = pts[i]!, c = pts[i + 1]!;
    const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
    if (ab < 1e-9 || bc < 1e-9 || ca < 1e-9) continue;
    const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    if (cross < 1e-12) continue;
    const R = (ab * bc * ca) / (2 * cross);
    const k = degPerMm(ctx, a, c) || degPerMm(ctx, a, b);
    if (!(k > 1e-9)) continue;
    const vc = Math.sqrt((SERVO.accel * ACC_SHARE * R) / k);
    if (vc < v[i]!) lower(i, vc, "curvature");
  }

  // junction deviation: how fast may the beam round this corner while
  // straying no more than jd mm from the programmed vertex
  for (let i = 1; i < n - 1; i++) {
    const d1x = pts[i]![0] - pts[i - 1]![0], d1y = pts[i]![1] - pts[i - 1]![1];
    const d2x = pts[i + 1]![0] - pts[i]![0], d2y = pts[i + 1]![1] - pts[i]![1];
    const l1 = Math.hypot(d1x, d1y), l2 = Math.hypot(d2x, d2y);
    if (l1 < 1e-9 || l2 < 1e-9) continue;
    const cosT = clamp(-(d1x * d2x + d1y * d2y) / (l1 * l2), -1, 1);
    const sinH = Math.sqrt(0.5 * (1 - cosT));
    if (sinH > 0.9999) continue;
    const vj = Math.sqrt((PLAN.accel * PLAN.jd * sinH) / (1 - sinH));
    if (vj < v[i]!) lower(i, vj, "junction");
  }

  const stops = (): void => {
    v[0] = 0;
    v[n - 1] = 0;
    bindingAt[0] = "floor";
    bindingAt[n - 1] = "floor";
    if (forceStop) for (const i of forceStop) if (i > 0 && i < n - 1) { v[i] = 0; bindingAt[i] = "floor"; }
  };
  stops();

  const sweep = (): void => {
    for (let i = n - 2; i >= 0; i--) {
      const m = Math.sqrt(v[i + 1]! * v[i + 1]! + 2 * acc[i]! * ds[i]!);
      if (m < v[i]!) lower(i, m, "accel");
    }
    for (let i = 1; i < n; i++) {
      const m = Math.sqrt(v[i - 1]! * v[i - 1]! + 2 * acc[i - 1]! * ds[i - 1]!);
      if (m < v[i]!) lower(i, m, "accel");
    }
  };
  sweep();

  // jerk smoothing: a running average over the distance covered in the jerk
  // time, kept only where it is slower, then the sweeps again
  if (PLAN.jerk > 0 && n > 8) {
    const win = clamp(Math.round(((PLAN.jerk * PLAN.feed) / PLAN.dense) * 0.5), 2, 40);
    const env = Float64Array.from(v);
    const ps = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) ps[i + 1] = ps[i]! + env[i]!;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - win), b = Math.min(n - 1, i + win);
      const avg = (ps[b + 1]! - ps[a]!) / (b - a + 1);
      if (avg < v[i]!) lower(i, avg, "accel");
    }
    stops();
    sweep();
  }

  const t = new Float64Array(n);
  let peak = 0, peakIndex = -1;
  for (let i = 0; i < n - 1; i++) {
    const vs = v[i]! + v[i + 1]!;
    t[i + 1] = t[i]! + (vs > 1e-9 ? (2 * ds[i]!) / vs : 0);
    if (pen[i] && v[i]! > peak) { peak = v[i]!; peakIndex = i; }
  }
  return { pts, pen, t, v, dur: n > 0 ? t[n - 1]! : 0, len, drawLen, travLen, peak, peakIndex, bindingAt };
}

/**
 * Plan a path of target mm. PathPoint.on is the beam state on the move
 * into the point, so segment i (pts[i] to pts[i + 1]) carries path[i + 1].on.
 */
export function planWasher(path: readonly PathPoint[], ctx: WasherCtx): WasherPlanResult {
  const pts = path.map((q) => [q.x, q.y] as const);
  const pen = path.slice(1).map((q) => (q.on ? 1 : 0) as 0 | 1);
  const chain = planChainPen(ctx, pts, pen, null);
  const points: PlannedPoint[] = path.map((q, i) => ({ x: q.x, y: q.y, on: q.on, v: chain.v[i]! }));
  return {
    space: "mm", points, durationS: chain.dur,
    binding: chain.peakIndex < 0 ? "feed" : chain.bindingAt[chain.peakIndex]!,
    chain, bindingAt: chain.bindingAt, peakMmS: chain.peak,
  };
}

/** The WASHER planner behind the one Planner interface (D-139), its result carrying the chain and readout. */
export interface WasherPlanner extends Planner {
  readonly id: "washer-mm";
  plan(path: readonly PathPoint[]): WasherPlanResult;
}

export function washerPlanner(ctx: WasherCtx): WasherPlanner {
  return { id: "washer-mm", plan: (path) => planWasher(path, ctx) };
}
