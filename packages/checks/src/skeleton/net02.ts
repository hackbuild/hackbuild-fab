// CHK-NET-02, edge-level clearance between nets (TANG 2026-08: a triangle
// edge crossed an obstruction a vertex test missed). One finding per pair
// of nets, reported from the net that sorts first, targeting the pair. The
// floor is the 0.60 mm net-to-net floor of the buried stack (D-085,
// computed off the model by the net check). Distances are segment to
// segment over the declared conductor footprints, round ends included,
// with the z ranges of the trace band and the column halves.

import type { ConductorFeature, Finding, Mm, TargetOf } from "@hackbuild/spec";
import { fmt, intervalEvidence, passOr } from "./common.js";
import { clearance, footprint, type Clearance, type Footprint } from "./plan.js";

/**
 * Net-to-net floor, mm (D-085: computed off the model by the net check;
 * the v3 0.3 mm floor is retired). Profile carries no row for it yet; the
 * M05 run body reads it from the constraint the solver registers.
 */
export const NET_FLOOR_MM: Mm = 0.6;

export function runNet02(target: TargetOf<"net">): readonly Finding[] {
  const { part, net } = target;
  const prints = part.features
    .filter((f): f is ConductorFeature => f.kind === "conductor")
    .map(footprint);
  const mine = prints.filter((p) => p.net === net.id);
  const others = [...new Set(prints.map((p) => p.net))].filter((n) => n > net.id).sort();
  return others.flatMap((other): Finding[] => {
    let best: { c: Clearance; a: Footprint; b: Footprint } | undefined;
    for (const a of mine) {
      for (const b of prints) {
        if (b.net !== other) continue;
        const c = clearance(a, b);
        if (best === undefined || c.gap < best.c.gap) best = { c, a, b };
      }
    }
    if (best === undefined) return [];
    const ev = intervalEvidence(best.c.gap, NET_FLOOR_MM, null, "mm");
    return [{
      verdict: passOr(ev.inside),
      target: {
        level: "pair",
        a: { level: "net", part: part.id, net: net.id },
        b: { level: "net", part: part.id, net: other },
        at: best.c.at,
      },
      measured: ev.measured,
      legal: ev.legal,
      constraint: `net-to-net floor ${fmt(NET_FLOOR_MM, 2)} mm of the buried stack (D-085)`,
      extra: {
        a: best.a.id, b: best.b.id,
        planGapMm: Number(fmt(best.c.planGap, 4)), zGapMm: Number(fmt(best.c.zGap, 4)),
      },
    }];
  });
}
