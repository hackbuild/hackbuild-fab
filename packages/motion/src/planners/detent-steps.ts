// DETENT step-space speed planner, ported from detent-plot.html planSpeeds
// (lines 1104 to 1151, canonical lineage row detent.plot/beam). A trapezoidal profile with junction lookahead: each
// point gets its own tick interval, sent with the point, and the firmware
// executes it verbatim (TICKHZ must match firmware TICK_HZ, line 1102).
//
// The page reads its rates from the state object S and its acceleration
// from the mAccel field; here every number comes from profile (detentPlan).
// The arithmetic is the page's in the page's order on Float64 arrays, so
// the interval list equals the legacy run (packages/motion/records/
// detent-plan.json). The runtime estimate is the page's readout of lines
// 1347 to 1353: the sum over points of dominant-axis steps times interval,
// over the tick rate.
//
// Beside each speed the planner keeps the ceiling that set it, the readout
// D-139 asks for: feed (the segment rate), junction (the corner cap),
// floor (the pull-in rate at the ends) or accel (the forward or backward
// pass).

import type { PathPoint, PlannedPoint, PlanResult, Planner, ProfileLookup } from "@hackbuild/spec";
import type { DetentRig } from "../kinematics/detent.js";

/** The ceiling that sets a speed (PlanResult binding, spec/motion.ts). */
export type Binding = PlanResult["binding"];

/** The planner numbers, all from profile (detentPlan). Rates are half steps/s. */
export interface DetentPlan {
  /** Beam-on rate (page S.rate), half steps/s. */
  readonly rate: number;
  /** Beam-off rate (page S.travel), half steps/s. */
  readonly travel: number;
  /** Acceleration (page mAccel field), half steps/s2; the page floors it at 200 (line 1107). */
  readonly accel: number;
  /** Safe pull-in rate from standstill (line 1108), half steps/s. */
  readonly vFloor: number;
  /** Lowest rate an interval is computed from (line 1149), half steps/s. */
  readonly vMin: number;
  /** Firmware tick rate (TICKHZ, line 1102), Hz. */
  readonly tickHz: number;
}

/** One DETENT command: absolute half steps and the beam state on the move into it (the `S x,y,l` token). */
export interface DetentCmd {
  readonly x: number;
  readonly y: number;
  readonly l: 0 | 1;
}

export interface DetentPlanResult extends PlanResult {
  readonly space: "steps";
  /** Tick interval per point, 20 kHz ticks, clamped 1 to 65535. */
  readonly iv: readonly number[];
  /** The ceiling that set each point's speed. */
  readonly bindingAt: readonly Binding[];
  /** Index of the peak beam-on point, the one `binding` names. */
  readonly peakIndex: number;
}

/** The rig of kinematics/detent.ts from profile. */
export function detentRig(profile: Pick<ProfileLookup, "constant">): DetentRig {
  return {
    throw: profile.constant("detent.throw").value,
    sep: profile.constant("detent.sep").value,
    halfStepsPerRev: profile.constant("28byj48.halfStepsPerRev").value,
  };
}

/** The planner numbers from profile. */
export function detentPlan(profile: Pick<ProfileLookup, "constant">): DetentPlan {
  const c = (id: string): number => profile.constant(id).value;
  return {
    rate: c("detent.rate"), travel: c("detent.travel"), accel: c("detent.accel"),
    vFloor: c("detent.vFloor"), vMin: c("detent.vMin"), tickHz: c("detent.tickHz"),
  };
}

/** planSpeeds: the speed and the ceiling of every point, and its interval. */
export function planSpeeds(cmds: readonly DetentCmd[], p: DetentPlan): { v: Float64Array; iv: number[]; bindingAt: Binding[] } {
  const n = cmds.length;
  const v = new Float64Array(n);
  const bindingAt: Binding[] = new Array<Binding>(n).fill("feed");
  // The page returns before setting any interval (line 1106); no iv rides with the points.
  if (n < 2) return { v, iv: [], bindingAt };
  const A = Math.max(200, p.accel);
  const vFloor = p.vFloor;
  const dmaj = new Float64Array(n);
  const dx = new Float64Array(n), dy = new Float64Array(n);

  for (let i = 1; i < n; i++) {
    dx[i] = cmds[i]!.x - cmds[i - 1]!.x;
    dy[i] = cmds[i]!.y - cmds[i - 1]!.y;
    dmaj[i] = Math.max(Math.abs(dx[i]!), Math.abs(dy[i]!));
  }

  // Speed cap at each point: the segment's own rate, tightened at corners by
  // the turn angle; cos 1 keeps full speed, cos -1 drops to the floor.
  for (let i = 0; i < n; i++) {
    const vmax = cmds[i]!.l ? p.rate : p.travel;
    let cap = vmax;
    if (i > 0 && i < n - 1 && dmaj[i]! > 0 && dmaj[i + 1]! > 0) {
      const a2 = Math.hypot(dx[i]!, dy[i]!), b2 = Math.hypot(dx[i + 1]!, dy[i + 1]!);
      const cos = (dx[i]! * dx[i + 1]! + dy[i]! * dy[i + 1]!) / (a2 * b2 + 1e-9);
      const f = Math.pow(Math.max(0, (cos + 1) / 2), 1.5);
      cap = vFloor + (vmax - vFloor) * f;
      // the 1e-9 in the cosine leaves a straight a hair under vmax; that is not a corner
      if (cap < vmax * (1 - 1e-9)) bindingAt[i] = "junction";
    }
    v[i] = cap;
  }
  v[0] = vFloor;
  bindingAt[0] = "floor";
  if (vFloor < v[n - 1]!) bindingAt[n - 1] = "floor";
  v[n - 1] = Math.min(v[n - 1]!, vFloor);

  // forward pass: never accelerate faster than A
  for (let i = 1; i < n; i++) {
    if (dmaj[i] === 0) {
      if (v[i - 1]! < v[i]!) bindingAt[i] = bindingAt[i - 1]!;
      v[i] = Math.min(v[i]!, v[i - 1]!);
      continue;
    }
    const vr = Math.sqrt(v[i - 1]! * v[i - 1]! + 2 * A * dmaj[i]!);
    if (vr < v[i]!) {
      v[i] = vr;
      bindingAt[i] = "accel";
    }
  }
  // backward pass: never need to decelerate faster than A
  for (let i = n - 2; i >= 0; i--) {
    if (dmaj[i + 1] === 0) {
      if (v[i + 1]! < v[i]!) bindingAt[i] = bindingAt[i + 1]!;
      v[i] = Math.min(v[i]!, v[i + 1]!);
      continue;
    }
    const vr = Math.sqrt(v[i + 1]! * v[i + 1]! + 2 * A * dmaj[i + 1]!);
    if (vr < v[i]!) {
      v[i] = vr;
      bindingAt[i] = "accel";
    }
  }

  const iv: number[] = [];
  for (let i = 0; i < n; i++) iv.push(Math.max(1, Math.min(65535, Math.round(p.tickHz / Math.max(p.vMin, v[i]!)))));
  return { v, iv, bindingAt };
}

/** A PathPoint in half steps as a DETENT command. */
export const toDetentCmd = (q: PathPoint): DetentCmd => ({ x: q.x, y: q.y, l: q.on ? 1 : 0 });

/** Plan a path of whole half steps; durationS is the page's planned runtime readout. */
export function planDetent(path: readonly PathPoint[], p: DetentPlan): DetentPlanResult {
  const cmds = path.map(toDetentCmd);
  const { v, iv, bindingAt } = planSpeeds(cmds, p);
  let ticks = 0;
  for (let i = 1; i < cmds.length; i++) {
    const dm = Math.max(Math.abs(cmds[i]!.x - cmds[i - 1]!.x), Math.abs(cmds[i]!.y - cmds[i - 1]!.y));
    ticks += dm * (iv[i] || 1);
  }
  let peakIndex = -1, peak = -Infinity;
  for (let i = 0; i < cmds.length; i++) if (cmds[i]!.l && v[i]! > peak) { peak = v[i]!; peakIndex = i; }
  const points: PlannedPoint[] = path.map((q, i) => ({ x: q.x, y: q.y, on: q.on, v: v[i]! }));
  return {
    space: "steps", points, durationS: ticks / p.tickHz,
    binding: peakIndex < 0 ? "feed" : bindingAt[peakIndex]!,
    iv, bindingAt, peakIndex,
  };
}

/** The DETENT planner behind the one Planner interface (D-139), its result carrying the intervals and readout. */
export interface DetentPlanner extends Planner {
  readonly id: "detent-steps";
  plan(path: readonly PathPoint[]): DetentPlanResult;
}

export function detentPlanner(p: DetentPlan): DetentPlanner {
  return { id: "detent-steps", plan: (path) => planDetent(path, p) };
}
