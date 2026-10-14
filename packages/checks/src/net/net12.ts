// CHK-NET-12 run body (M05-T10 step 4, CHECKS.md 7, PIP 2026-09: routing
// problems were silent): a route that left an unrouted terminal, a
// conflicted cell, or two nets under the net-to-net floor is a fail naming
// the nets and the hot spots, so a route problem can never sit beside a
// pass. Counts come from the route metrics the build wrote
// (packages/copper routeMetrics), read back by readRouteMetrics; the net
// gaps from circuit.solve's extraction. iters is never read (PIP keeps it
// for parity, router.js line 259). Measured is the problem count:
// conflicted cells plus unrouted terminals plus pairs under the floor,
// legal 0 to 0.

import type { Finding, Mm, Part, TargetOf } from "@hackbuild/spec";
import type { NetGap } from "@hackbuild/circuit";
import { readRouteMetrics, type RouteMetricsView } from "@hackbuild/copper";
import type { RegistryCtx } from "../views.js";
import { NO_EXTRACTION, viewsOf } from "../views.js";
import { fmt, intervalEvidence, passOr, skip } from "../defs/common.js";
import { netFloor } from "./net02.js";

/** The verdict on one routed part: its route counts and its gaps under the floor. */
export function routeFinding(part: string, route: RouteMetricsView, gaps: readonly NetGap[], floorMm: Mm): Finding {
  const under = gaps.filter((g) => g.mm < floorMm - 1e-9);
  const count = route.conflicts + route.unrouted + under.length;
  const ev = intervalEvidence(count, 0, 0, "count");
  const failing = route.nets.filter((n) => n.fails > 0 || n.hot > 0);
  const parts = [
    ...(route.unrouted > 0 ? [`${route.unrouted} terminals unrouted (${failing.filter((n) => n.fails > 0).map((n) => `${n.name} ${n.fails}`).join(", ")})`] : []),
    ...(route.conflicts > 0 ? [`${route.conflicts} cells under the clearance: ${failing.filter((n) => n.hot > 0).map((n) => n.note).join("; ")}`] : []),
    ...(under.length > 0 ? [`${under.length} net pairs under the ${fmt(floorMm, 2)} mm floor: ${under.map((g) => `${g.a}/${g.b} ${fmt(g.mm, 3)} mm`).join(", ")}`] : []),
  ];
  return {
    verdict: passOr(ev.inside), target: { level: "part", part }, measured: ev.measured, legal: ev.legal,
    constraint: ev.inside
      ? `route of ${part} clean: 0 conflicted cells, 0 unrouted terminals, every net pair at least ${fmt(floorMm, 2)} mm apart`
      : `route of ${part} has ${parts.join("; ")}; raise iterations, widen the body or move groups apart`,
    extra: {
      conflicts: route.conflicts, unrouted: route.unrouted, underFloor: under.length,
      nets: [...new Set([...failing.map((n) => n.name), ...under.flatMap((g) => [g.a, g.b])])].join(" "),
    },
  };
}

export function runNet12(t: TargetOf<"project">, ctx: RegistryCtx): readonly Finding[] {
  const views = viewsOf(ctx);
  const parts = t.project.items.filter((i) => i.kind === "part").map((i) => views.part?.(i.id)).filter((p): p is Part => p !== undefined);
  const routed = parts.flatMap((p) => {
    const r = readRouteMetrics(p.metrics);
    return r === null ? [] : [{ p, r }];
  });
  if (routed.length === 0) return [skip({ level: "project" }, "not run", "no part in this run carries a route (route.conflicts and route.unrouted metrics)")];
  const floor = netFloor(ctx).mm;
  return routed.map(({ p, r }) => {
    const ex = views.extraction?.(p.id);
    if (ex === undefined || ex.gapSearch === null) return skip({ level: "part", part: p.id }, "not run", NO_EXTRACTION);
    return routeFinding(p.id, r, ex.gaps, floor);
  });
}
