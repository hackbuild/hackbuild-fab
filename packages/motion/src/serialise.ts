// Serialisers for the two planners. Text and segment lists only: no
// transport, no codec, no credit window (M13 takes these into link).
//
// DETENT: the `S x,y,l[,iv] ...` batch lines of detent-plot.html
// streamCmds (lines 1768 to 1793, canonical row detent.plot/beam), at most
// batchMax points a line to stay under the BLE MTU.
//
// WASHER: the segment emitter of laser-rig.html emitSegments (lines 5303
// to 5409, canonical row washer.app/laserriggg) on its linear playback
// path (SEGHERM off), with the timeline helpers withGates (4415), nextGate
// (4435) and sampleAt (4446) for one planned chain, uOfWall (5243) and
// playbackError (5273). A segment never straddles a gate change, is halved
// up to 8 times until the played line tracks the plan within the path
// tolerance in space and time and covers at most mergeMaxMm, and lands on
// whole pulse microseconds. Durations go on the wire as whole milliseconds
// with the rounding residual carried, so the stream stays locked to the
// plan: rounding each segment alone drifted the beam gate by up to 15 ms a
// job (the comment at lines 5366 to 5372). A segment on the same
// pulse pair and gate as the last merges into it up to mergeMaxMs.

import type { ProfileLookup } from "@hackbuild/spec";
import { type WasherRig, degToUs, degToUsF, fk, usToDeg, wallToAngles } from "./kinematics/washer.js";
import type { DetentCmd } from "./planners/detent-steps.js";
import type { WasherChain, WasherCtx } from "./planners/washer-mm.js";

/** DETENT batch lines: `S ` then up to batchMax tokens `x,y,l` with `,iv` when the point has an interval. */
export function detentBatchLines(cmds: readonly DetentCmd[], iv: readonly number[], batchMax: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < cmds.length;) {
    const chunk: string[] = [];
    for (let k = 0; k < batchMax && i < cmds.length; k++, i++) {
      const c = cmds[i]!, w = iv[i];
      chunk.push(`${c.x},${c.y},${c.l}${w ? `,${w}` : ""}`);
    }
    lines.push(`S ${chunk.join(" ")}`);
  }
  return lines;
}

/** Points per DETENT batch line, from profile. */
export const detentBatchMax = (profile: Pick<ProfileLookup, "constant">): number => profile.constant("detent.batchMax").value;

/** The WASHER emitter limits, from profile (washerStream). */
export interface WasherStream {
  /** Shortest segment, ms (SEG_MIN_MS). */
  readonly segMinMs: number;
  /** Longest segment on linear playback, ms (SEG_MAX_MS). */
  readonly segMaxMs: number;
  /** Longest merged segment, ms (MERGE_MAX_MS). */
  readonly mergeMaxMs: number;
  /** Most target a segment may cover, mm (MERGE_MAX_MM). */
  readonly mergeMaxMm: number;
}

export function washerStream(profile: Pick<ProfileLookup, "constant">): WasherStream {
  const c = (id: string): number => profile.constant(id).value;
  return { segMinMs: c("washer.segMinMs"), segMaxMs: c("washer.segMaxMs"), mergeMaxMs: c("washer.mergeMaxMs"), mergeMaxMm: c("washer.mergeMaxMm") };
}

/** One WASHER segment: the aim the board reaches at its end, the gate held across it, and its length. */
export interface WasherSegment {
  /** Pan pulse, us. */
  readonly pan: number;
  /** Tilt pulse, us. */
  readonly tilt: number;
  readonly laser: 0 | 1;
  /** Duration on the wire, whole ms. */
  readonly dur: number;
}

export interface WasherSegments {
  readonly segments: readonly WasherSegment[];
  /** Rounding residual left after the last segment, ms; the wire total plus this equals the plan. */
  readonly residualMs: number;
  /** Segments merged into the one before. */
  readonly merged: number;
}

interface Sample { readonly wx: number; readonly wy: number; readonly laser: boolean; readonly v: number }

/** Every instant the beam changes state, from the chain itself (withGates for one move). */
export function chainGates(c: WasherChain): number[] {
  const gates: number[] = [];
  let prev: boolean | null = null;
  for (let i = 0; i < c.pen.length; i++) {
    const s = !!c.pen[i];
    if (prev !== null && s !== prev) gates.push(c.t[i]!);
    prev = s;
  }
  return gates;
}

/** The first gate strictly after T, or Infinity (nextGate). */
function nextGate(g: readonly number[], T: number): number {
  if (!g.length) return Infinity;
  let lo = 0, hi = g.length - 1, ans = Infinity;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (g[m]! > T + 1e-9) { ans = g[m]!; hi = m - 1; } else lo = m + 1;
  }
  return ans;
}

/** Position, gate and speed on the chain at time T, s (sampleAt for one move at t0 0). */
export function sampleChain(c: WasherChain, T: number): Sample {
  const t = c.t;
  let a = 0, b = t.length - 1, i = 0;
  while (a <= b) { const m = (a + b) >> 1; if (t[m]! <= T) { i = m; a = m + 1; } else b = m - 1; }
  if (i >= t.length - 1) {
    const p = c.pts[t.length - 1]!;
    return { wx: p[0], wy: p[1], laser: !!c.pen[c.pen.length - 1], v: 0 };
  }
  const span = t[i + 1]! - t[i]!;
  const f = span > 1e-12 ? (T - t[i]!) / span : 0;
  const p0 = c.pts[i]!, p1 = c.pts[i + 1]!;
  return {
    wx: p0[0] + (p1[0] - p0[0]) * f,
    wy: p0[1] + (p1[1] - p0[1]) * f,
    laser: !!c.pen[i],
    v: c.v[i]! + (c.v[i + 1]! - c.v[i]!) * f,
  };
}

const uOfWall = (ctx: WasherCtx, wx: number, wy: number): { pu: number; tu: number } => {
  const g = wallToAngles(ctx.rig, wx, wy, ctx.calib);
  return { pu: degToUsF(ctx.rig, g.pan), tu: degToUsF(ctx.rig, g.tilt) };
};

/** Plan position against the played cubic at 0.25, 0.5 and 0.75 of the span, mm; Infinity across a gate change. */
function playbackError(
  ctx: WasherCtx, c: WasherChain, t0: number, t1: number, a: Sample, b: Sample, v0p: number, v0t: number, v1p: number, v1t: number,
): number {
  if (a.laser !== b.laser) return Infinity;
  const r: WasherRig = ctx.rig;
  const A = uOfWall(ctx, a.wx, a.wy), B = uOfWall(ctx, b.wx, b.wy);
  const D = ((t1 - t0) * 1000) / ctx.plan.speed;
  let worst = 0;
  for (const T of [0.25, 0.5, 0.75]) {
    const m = sampleChain(c, t0 + (t1 - t0) * T);
    if (m.laser !== a.laser) return Infinity;
    const h00 = (2 * T - 3) * T * T + 1, h10 = ((T - 2) * T + 1) * T;
    const h01 = (3 - 2 * T) * T * T, h11 = (T - 1) * T * T;
    const pu = h00 * A.pu + h10 * D * v0p + h01 * B.pu + h11 * D * v1p;
    const tu = h00 * A.tu + h10 * D * v0t + h01 * B.tu + h11 * D * v1t;
    const w = fk(r, usToDeg(r, pu), usToDeg(r, tu), ctx.calib);
    const d = Math.hypot(w.wx - m.wx, w.wy - m.wy);
    if (d > worst) worst = d;
  }
  return worst;
}

/** Emit the whole chain as segments (emitSegments on linear playback, run to the end of the plan). */
export function washerSegments(ctx: WasherCtx, c: WasherChain, s: WasherStream): WasherSegments {
  const speed = ctx.plan.speed;
  const gates = chainGates(c);
  const out: { pan: number; tilt: number; laser: 0 | 1; dur: number }[] = [];
  let emitT = 0, durResidual = 0, merged = 0;
  while (emitT < c.dur) {
    const a = sampleChain(c, emitT);
    let maxS = Math.min((s.segMaxMs / 1000) * speed, c.dur - emitT);
    const gate = nextGate(gates, emitT);
    if (gate < emitT + maxS) maxS = Math.max(gate - emitT, 1e-6);
    const minS = Math.min((s.segMinMs / 1000) * speed, maxS);
    let span = maxS, b = sampleChain(c, emitT + span);
    for (let i = 0; i < 8 && span > minS; i++) {
      const D = (span * 1000) / speed;
      const A = uOfWall(ctx, a.wx, a.wy), B = uOfWall(ctx, b.wx, b.wy);
      const vp = (B.pu - A.pu) / D, vt = (B.tu - A.tu) / D;
      const err = playbackError(ctx, c, emitT, emitT + span, a, b, vp, vt, vp, vt);
      const mm = Math.hypot(b.wx - a.wx, b.wy - a.wy);
      if (err <= ctx.plan.tol && mm <= s.mergeMaxMm) break;
      span = Math.max(minS, span / 2);
      b = sampleChain(c, emitT + span);
    }
    const nextT = Math.min(emitT + span, c.dur);
    const eg = wallToAngles(ctx.rig, b.wx, b.wy, ctx.calib);
    const pan = degToUs(ctx.rig, eg.pan), tilt = degToUs(ctx.rig, eg.tilt);
    // the gate across a segment is the one at its start: the board holds it for the whole segment
    const laser: 0 | 1 = a.laser ? 1 : 0;
    const exactMs = ((nextT - emitT) * 1000) / speed + durResidual;
    const dur = Math.max(1, Math.round(exactMs));
    durResidual = exactMs - dur;
    const last = out.length ? out[out.length - 1]! : null;
    if (last && last.pan === pan && last.tilt === tilt && last.laser === laser && last.dur + dur <= s.mergeMaxMs) {
      last.dur += dur;
      merged++;
    } else {
      out.push({ pan, tilt, laser, dur });
    }
    emitT = nextT;
  }
  return { segments: out, residualMs: durResidual, merged };
}
