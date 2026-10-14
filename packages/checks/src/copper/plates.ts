// Electrode plates of the capacitive boards (M05-T15). A plate is solid
// when its smoothed net holds the plate inset by the board's margin
// (gen_vernier.py lines 232 to 234: test a rounded plate against
// pad_rr.buffer(-0.6), since an inset box pokes its corners outside the
// rounding and fails a good plate); the plates are at least the board's
// smallest area and, where the board says so, all one size
// (gen_spline.py lines 246 to 247, gen_stave.py lines 219 to 221); the
// board has as many plates as it declares (gen_tessera.py line 290); each
// plate is one polygon (gen_tessera.py line 289, CHK-NET-01); seams and
// slider bodies keep the clearance gate to the plates (gen_stave.py lines
// 223 to 226, gen_fret.py lines 379 to 381, CHK-NET-02).

import type { GateStep } from "@hackbuild/copper";
import { contains, distance, islands } from "@hackbuild/copper";
import { boolGate, fill, intervalGate, netTarget, sheetTarget, type Gate, type GateCtx } from "./gate.js";

type Step<K extends GateStep["kind"]> = Extract<GateStep, { kind: K }>;

export function solidPlate(ctx: GateCtx, s: Step<"solid">): Gate[] {
  const net = ctx.board.nets.get(s.net);
  const ok = net !== undefined && contains(net, ctx.board.shape(s.region));
  return [boolGate("CHK-NET-40", ok, s.msg, netTarget(ctx, s.net), `net ${s.net} holds its plate inset by the board's margin: the plate is solid copper`)];
}

export function plateArea(ctx: GateCtx, s: Step<"plateArea">): Gate[] {
  const areas = s.regions.map((r) => ctx.board.shape(r).area());
  const min = Math.min(...areas), max = Math.max(...areas), spread = max - min;
  const okMin = s.gt === undefined || min > s.gt;
  const okSpread = s.lt === undefined || spread < s.lt;
  const msg = fill(s.msg, { min, max, spread, ...(s.vars ?? {}) });
  const target = sheetTarget(ctx, "copper");
  if (s.lt !== undefined) {
    return [intervalGate("CHK-NET-40", okMin && okSpread, msg, target, spread, 0, s.lt, "mm2",
      `the ${areas.length} plates are one size: largest less smallest under ${s.lt} mm2`, { minMm2: round(min), maxMm2: round(max) })];
  }
  return [intervalGate("CHK-NET-40", okMin && okSpread, msg, target, min, s.gt ?? null, null, "mm2",
    `the smallest of ${areas.length} plates over ${s.gt} mm2, set by the board's plate floor`, { minMm2: round(min), maxMm2: round(max) })];
}

export function plateCount(ctx: GateCtx, s: Step<"plateCount">): Gate[] {
  const n = s.regions.length;
  const ok = s.want.every((w) => w === n);
  return [boolGate("CHK-NET-40", ok, fill(s.msg, { n }), sheetTarget(ctx, "copper"), `the board declares ${s.want.join(" and ")} plates and draws ${n}`, { plates: n })];
}

export function plateIslands(ctx: GateCtx, s: Step<"plateIslands">): Gate[] {
  const counts = s.regions.map((r) => islands(ctx.board.shape(r)));
  const ok = counts.every((c) => c === 1);
  return [boolGate("CHK-NET-01", ok, s.msg, sheetTarget(ctx, "copper"), "every plate is one connected piece before the nets are smoothed", { pieces: counts.join(" ") })];
}

export function plateGap(ctx: GateCtx, s: Step<"gap">): Gate[] {
  const d = Math.min(...s.pairs.map(([a, b]) => distance(ctx.board.shape(a), ctx.board.shape(b))));
  return [intervalGate("CHK-NET-02", d >= s.min, fill(s.msg, { d }), sheetTarget(ctx, "copper"), d, s.min, null, "mm",
    `copper to copper between plates and slider bodies, gate ${s.min} set by the board's clr`)];
}

const round = (v: number): number => Number(v.toFixed(3));
