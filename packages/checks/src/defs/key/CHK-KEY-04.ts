// CHK-KEY-04, click spring rise Q inside the FE-backed window: snaps, drop
// at least click.dropMin, strain at the stop within the bend-direction
// limit, not bistable (PIP 2026-09: a 0.6 beam reached 2.7 to 3.3 percent;
// CHECKS.md 7.4, D-071). The window is the sim's ConstraintDef
// sim/click-spring-window (M01-T07), queried on the declared beam: l, t, w
// and the shuttle width sw, the body's material modulus, and the bend
// direction. The measure is the declared riseQ, in units of t.

import type { Finding, SpringFeature } from "@hackbuild/spec";
import { createRegistry, solve, type ConstraintRegistry } from "@hackbuild/constraints";
import { SPRING_Q, SPRING_Q_UNIT, clickSpringWindow } from "@hackbuild/sim";
import { defineCheck } from "../../registry.js";
import { bodyOf, featureTarget, intervalFinding, missing } from "../common.js";

let reg: ConstraintRegistry | undefined;
const registry = (): ConstraintRegistry => (reg ??= createRegistry([clickSpringWindow]));

export const check = defineCheck<"feature", "spring">({
  id: "CHK-KEY-04",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: SpringFeature = t.feature;
    // spec SpringFeature carries no shuttle width; the FE needs it (card defect M04-T01).
    const sw = (f as SpringFeature & { readonly sw?: number }).sw;
    if (typeof sw !== "number" || !Number.isFinite(sw)) throw missing(`/features/${f.id}/sw`, `spring ${f.id} declares no shuttle width sw; the click-spring FE needs it`);
    const material = bodyOf(t.part, f).material;
    const q = solve(registry(), SPRING_Q, {
      profile: ctx.profile, machine: t.part.machine, material, part: t.part, feature: f,
      facts: { l: f.l, t: f.t, w: f.w, sw, bend: f.bend },
    });
    const iv = q.interval;
    const legal = iv.legal;
    const lo = legal === null ? null : legal[0];
    const hi = legal === null ? null : legal[1];
    const reasons = [...iv.lo.filter((_, i) => iv.binding.lo.includes(i)), ...iv.hi.filter((_, i) => iv.binding.hi.includes(i))].map((b) => b.reason);
    if (legal === null) {
      // E_UNSAT is an answer (CHECKS.md 2.3): the floor sits above the ceiling, both shown as the solver found them.
      const floor = Math.max(...iv.lo.map((b) => b.value));
      const ceiling = Math.min(...iv.hi.map((b) => b.value));
      return [{
        verdict: "fail", target: featureTarget(t.part, f), measured: f.riseQ,
        legal: { kind: "interval", lo: floor, hi: ceiling, unit: SPRING_Q_UNIT, nearest: floor },
        constraint: `sim/click-spring-window is empty for this beam, floor over ceiling: ${reasons.join("; ")}`,
        extra: { material, bend: f.bend, l: f.l, t: f.t, w: f.w, sw, unsat: "yes" },
      }];
    }
    return [intervalFinding(featureTarget(t.part, f), f.riseQ, lo, hi, SPRING_Q_UNIT,
      `sim/click-spring-window at l ${f.l} t ${f.t} w ${f.w} sw ${sw} ${material} ${f.bend}: ${reasons.join("; ")}`,
      // The beam the window was queried on rides in extra, so the constraint's l, t, w and sw trace to fields (M04-T05).
      { material, bend: f.bend, l: f.l, t: f.t, w: f.w, sw })];
  },
  drivenBy: (t) => (t.feature.drivenBy?.["riseQ"] === undefined ? [] : [t.feature.drivenBy["riseQ"]]),
});
