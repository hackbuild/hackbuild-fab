// CHK-ASM-04, bought bodies (body AND flange) clash-checked in every pose
// (OGEE R16-P 2026-08: servos invisible to a part-only audit;
// check_servos.py put the bought bodies in the pairwise audit). Each bought
// envelope (body and flange, spec/part-ir.ts BoughtBody) is checked
// against every instance and every other bought body over the joint range;
// the sim's closest approach below zero is an interference. Pairs the
// whitelist excuses by mesh hash (intended squeezes) are left out. Legal is
// zero clashes.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { isSim, simOr, whitelisted } from "./sim.js";
import { skip } from "../common.js";

export const check = defineCheck({
  id: "CHK-ASM-04",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const a = t.assembly;
    const sim = simOr(ctx, a);
    if (!isSim(sim)) return [sim];
    const at = { level: "assembly" as const, assembly: a.id };
    if (a.bought.length === 0) return [skip(at, "not run", `assembly ${a.id} places no bought body`)];
    const others = [...a.instances.map((i) => i.id), ...a.bought.map((b) => b.id)];
    let clashes = 0;
    let worst: { a: string; b: string; mm: number; at: readonly [number, number, number] } | null = null;
    let pairs = 0;
    for (const b of a.bought) {
      for (const o of others) {
        if (o === b.id || (a.bought.some((x) => x.id === o) && o < b.id) || whitelisted(ctx, a, b.id, o)) continue;
        pairs += 1;
        const ca = sim.closestApproach(b.id, o, "range");
        if (ca.mm < 0) {
          clashes += 1;
          if (worst === null || ca.mm < worst.mm) worst = { a: b.id, b: o, mm: ca.mm, at: ca.at };
        }
      }
    }
    const w = worst as { a: string; b: string; mm: number; at: readonly [number, number, number] } | null;
    const target: Finding["target"] = w === null ? at
      : { level: "pair", a: { level: "assembly", assembly: a.id, part: w.a }, b: { level: "assembly", assembly: a.id, part: w.b }, at: w.at };
    return [{
      verdict: clashes === 0 ? "pass" : "fail", target, measured: clashes,
      legal: { kind: "interval", lo: 0, hi: 0, unit: "count", nearest: 0 },
      constraint: "a bought body and its flange take space in every pose; interference with any part or other bought body is a clash",
      extra: { pairs, ...(w === null ? {} : { worstDepthMm: Number((-w.mm).toFixed(3)) }) },
    }];
  },
});
