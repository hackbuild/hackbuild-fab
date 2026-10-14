// Ratio sliders of the capacitive boards (M05-T15): a wedge pair read as
// a / (a + b), the plate area of each wedge inside a sampling window,
// over vinyl.sliderSamples windows along the travel (gen_vernier.py lines
// 237 to 251, gen_quadrant.py lines 234 to 249, gen_spline.py lines 250
// to 276, gen_tessera.py lines 301 to 324, gen_fret.py lines 350 to 372,
// gen_stave.py lines 228 to 241). The ratio is monotone within
// vinyl.ratioMonotoneTol and stays off both rails, inside
// vinyl.spanRailMin to vinyl.spanRailMax (CHK-NET-15). Travel and sweep
// are the board's declared values against its own range, and slider
// bodies lie inside the copper keepout (CHK-NET-08).

import type { Section } from "@hackbuild/geom";
import type { GateStep, SampleWindow } from "@hackbuild/copper";
import { contains, overlapArea } from "@hackbuild/copper";
import { boolGate, f, fill, intervalGate, k, netTarget, sheetTarget, type Gate, type GateCtx } from "./gate.js";

type Step<K extends GateStep["kind"]> = Extract<GateStep, { kind: K }>;

/** The sampling window at position t along the travel. */
function windowAt(ctx: GateCtx, w: SampleWindow, t: number): Section {
  const v = ctx.v;
  switch (w.kind) {
    case "column":
      return v.box(t - w.half, w.y0, t + w.half, w.y1);
    case "row":
      return v.box(w.x0, t - w.half, w.x1, t + w.half);
    case "sector":
      return v.annulus(w.c, w.rIn, w.rOut, t - w.half, t + w.half, { n: w.n });
  }
}

/** a / (a + b) at each window, 0 where neither wedge reaches it. */
export function sampleRatio(ctx: GateCtx, s: Step<"ratio">): number[] {
  const n = k(ctx, "vinyl.sliderSamples");
  const A = ctx.board.nets.get(s.a), B = ctx.board.nets.get(s.b);
  if (A === undefined || B === undefined) return [];
  const { from, to } = s.window;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const win = windowAt(ctx, s.window, from + (i * (to - from)) / (n - 1));
    const a = overlapArea(A, win), b = overlapArea(B, win);
    out.push(a + b > 0 ? a / (a + b) : 0);
  }
  return out;
}

export function ratioSlider(ctx: GateCtx, s: Step<"ratio">): Gate[] {
  const rat = sampleRatio(ctx, s);
  const tol = k(ctx, "vinyl.ratioMonotoneTol");
  const mono = rat.length > 1 && rat.every((x, i) => i === 0 || (s.dir === "down" ? rat[i - 1]! > x - tol : rat[i - 1]! < x + tol));
  const lo = k(ctx, "vinyl.spanRailMin"), hi = k(ctx, "vinyl.spanRailMax");
  const min = Math.min(...rat), max = Math.max(...rat);
  const target = netTarget(ctx, s.a);
  const extra = { b: s.b, spanMin: Number(min.toFixed(6)), spanMax: Number(max.toFixed(6)) };
  return [
    boolGate("CHK-NET-15", mono, s.monoMsg, target, `ratio ${s.a} / (${s.a} + ${s.b}) monotone ${s.dir === "down" ? "falling" : "rising"} over ${rat.length} windows within ${tol}`, extra),
    boolGate("CHK-NET-15", rat.length > 0 && lo < min && max < hi, fill(s.spanMsg, { min, max }), target,
      `ratio span inside ${f(lo, 2)} to ${f(hi, 2)}, so the slider never pins to a rail`, extra),
  ];
}

export function travel(ctx: GateCtx, s: Step<"travel">): Gate[] {
  const vals = s.values.map((x) => (s.abs === true ? Math.abs(x) : x));
  const ok = vals.length > 0 && vals.every((x) => (s.gt === undefined || x > s.gt) && (s.ge === undefined || x >= s.ge) && (s.lt === undefined || x < s.lt));
  const slots: Record<string, number> = { v: s.values[0] ?? Number.NaN };
  s.values.forEach((x, i) => (slots[`v${i}`] = x));
  const lo = s.gt ?? s.ge ?? null;
  const least = Math.min(...vals);
  return [intervalGate("CHK-NET-41", ok, fill(s.msg, slots), sheetTarget(ctx, "copper"), least, lo, s.lt ?? null, "mm",
    `slider travel inside the board's range${lo === null ? "" : `, above ${lo}`}${s.lt === undefined ? "" : `, under ${s.lt}`} mm`, { values: vals.map((x) => f(x, 3)).join(" ") })];
}

export function sliderKeepout(ctx: GateCtx, s: Step<"sliderKeepout">): Gate[] {
  const ok = contains(ctx.board.keepout, ctx.board.shape(s.region));
  return [boolGate("CHK-NET-08", ok, s.msg, sheetTarget(ctx, "copper"), `every slider body at least ${f(ctx.board.draft.edgeKeep, 1)} mm inside the cut outline, set by the board's edge keep`)];
}
