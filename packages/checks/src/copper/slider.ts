// Wedge pair sliders (gen_keyway.py lines 239 to 249): vinyl.sliderSamples
// vertical cuts across the travel; at each, the copper length of wedge a
// and wedge b. Both wedges keep at least vinyl.wedgeCopperMin of copper at
// every cut (CHK-NET-33), and the ratio a / (a + b) is strictly monotone
// over the cuts (CHK-NET-15).

import { cutLength } from "@hackbuild/copper";
import type { SliderDecl } from "@hackbuild/copper";
import { boolGate, f, intervalGate, k, netTarget, type Gate, type GateCtx } from "./gate.js";

export interface SliderSamples {
  readonly a: readonly number[];
  readonly b: readonly number[];
  readonly span: readonly number[];
  readonly travel: number;
}

/** The cuts of one slider. */
export function sampleSlider(ctx: GateCtx, s: SliderDecl): SliderSamples {
  const n = k(ctx, "vinyl.sliderSamples");
  const A = ctx.board.nets.get(s.a), B = ctx.board.nets.get(s.b);
  if (A === undefined || B === undefined) return { a: [], b: [], span: [], travel: 0 };
  const [x0, x1] = s.travel;
  const [y0, y1] = s.band;
  const a: number[] = [], b: number[] = [], span: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + (i * (x1 - x0)) / (n - 1);
    const la = cutLength(A, x, y0 - 1, y1 + 1);
    const lb = cutLength(B, x, y0 - 1, y1 + 1);
    a.push(la);
    b.push(lb);
    span.push(la / (la + lb));
  }
  return { a, b, span, travel: x1 - x0 };
}

export function sliderGates(ctx: GateCtx, s: SliderDecl): Gate[] {
  const sm = sampleSlider(ctx, s);
  const min = k(ctx, "vinyl.wedgeCopperMin");
  const least = sm.a.length === 0 ? 0 : Math.min(...sm.a.map((x, i) => Math.min(x, sm.b[i]!)));
  const width = intervalGate("CHK-NET-33", sm.a.length > 0 && least >= min, `slider wedges keep >= ${f(min, 1)} mm of copper across full travel`,
    netTarget(ctx, s.a), least, min, null, "mm", `both wedges at least ${f(min, 1)} mm of copper at every one of ${sm.a.length} cuts`, { b: s.b });
  const sp = sm.span;
  const down = sp.every((x, i) => i === 0 || sp[i - 1]! > x);
  const up = sp.every((x, i) => i === 0 || sp[i - 1]! < x);
  const first = sp[0] ?? Number.NaN, last = sp[sp.length - 1] ?? Number.NaN;
  const mono = boolGate("CHK-NET-15", sp.length > 1 && (down || up),
    `slider ratio monotone ${f(first, 2)} -> ${f(last, 2)} over ${f(sm.travel, 1)} mm of travel`,
    netTarget(ctx, s.a), `ratio ${s.a} / (${s.a} + ${s.b}) strictly monotone over ${sp.length} cuts`,
    { spanFirst: Number(first.toFixed(6)), spanLast: Number(last.toFixed(6)), travelMm: Number(sm.travel.toFixed(6)) });
  return [width, mono];
}
