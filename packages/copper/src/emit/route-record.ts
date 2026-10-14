// What a route leaves in Part IR (M05-T08 step 6, M05-T10, D-049): the
// conflict and unrouted counts, per net the terminals left unconnected and
// the conflicted cells, and the router's own warnings. A design's build
// writes these as gated metrics (CHK-NET-12) beside the router's UNROUTED
// and ROUTE_CONFLICT warnings, and CHK-NET-12 reads them back here, so the
// metric ids have one writer and one reader. The verdict reads conflicts
// and unrouted, never iters (PIP's iters is a count it keeps for parity,
// router.js line 259).
//
// Trace feature ids are part of the same contract: a buried stack build
// names each emitted layer region and post with traceFeatureId, and
// CHK-NET-11 tells posts from layer regions with parseTraceFeatureId.

import type { BuildWarning, Metric } from "@hackbuild/spec";
import type { HotCell, RouteResult } from "../route/negotiated.js";

/** The route of one part as Part IR keeps it. */
export interface RouteRecord {
  /** Conflicted cells after the last iteration. */
  readonly conflicts: number;
  /** Terminals left unconnected over every net. */
  readonly unrouted: number;
  /** PIP's iteration count (informational). */
  readonly iters: number;
  readonly nets: readonly {
    readonly name: string;
    /** Terminals this net failed to connect. */
    readonly fails: number;
    /** Conflicted cells this net still sits in, at most HOT_LIST of them listed in `at`. */
    readonly hot: number;
    readonly at: readonly { readonly l: 0 | 1; readonly x: number; readonly y: number }[];
    /** Routed length over both layers, stubs excluded, mm (computed). */
    readonly lenMm: number;
  }[];
  readonly warnings: readonly BuildWarning[];
}

/** Hot cells a net's metric note lists, the rest counted. */
export const HOT_LIST = 8;

const ROUTE = "route";

/** The record of a route result, nets in route order. */
export function routeRecord(r: Pick<RouteResult, "nets" | "conflicts" | "unrouted" | "iters" | "hot" | "warnings">): RouteRecord {
  const hotOf = (net: string): HotCell[] => r.hot.filter((h) => h.net === net);
  return {
    conflicts: r.conflicts, unrouted: r.unrouted, iters: r.iters,
    nets: r.nets.map((n) => {
      const hot = hotOf(n.name);
      return { name: n.name, fails: n.fails, hot: hot.length, at: hot.slice(0, HOT_LIST).map((h) => ({ l: h.l, x: h.x, y: h.y })), lenMm: n.len };
    }),
    warnings: r.warnings,
  };
}

const at = (h: { readonly l: 0 | 1; readonly x: number; readonly y: number }): string => `layer ${h.l + 1} at (${h.x.toFixed(2)}, ${h.y.toFixed(2)}) mm`;

/**
 * Gated metrics of a record: route.conflicts and route.unrouted (CHK-NET-12),
 * route.iters (informational), and per net route.net.<name>.fails and
 * .hot (CHK-NET-12) with the hot cells in the note, and .length
 * (informational). Every value is computed by the router.
 */
export function routeMetrics(rec: RouteRecord): Metric[] {
  const q = { qualifier: "computed", basis: null } as const;
  const out: Metric[] = [
    { id: `${ROUTE}.conflicts`, value: rec.conflicts, unit: "cells", ...q, note: "conflicted cells after the last negotiation iteration", gate: "CHK-NET-12", group: ROUTE },
    { id: `${ROUTE}.unrouted`, value: rec.unrouted, unit: "terminals", ...q, note: "terminals left unconnected over every net", gate: "CHK-NET-12", group: ROUTE },
    { id: `${ROUTE}.iters`, value: rec.iters, unit: "iterations", ...q, note: "the router's count: the converging iteration plus one, or the cap plus one", gate: "informational", group: ROUTE },
  ];
  for (const n of rec.nets) {
    const listed = n.at.map(at).join(", ");
    out.push(
      { id: `${ROUTE}.net.${n.name}.fails`, value: n.fails, unit: "terminals", ...q, note: `net ${n.name}: terminals left unconnected`, gate: "CHK-NET-12", group: ROUTE },
      { id: `${ROUTE}.net.${n.name}.hot`, value: n.hot, unit: "cells", ...q,
        note: n.hot === 0 ? `net ${n.name}: no conflicted cell` : `net ${n.name}: conflicted cells at ${listed}${n.hot > n.at.length ? ` and ${n.hot - n.at.length} more` : ""}`,
        gate: "CHK-NET-12", group: ROUTE },
      { id: `${ROUTE}.net.${n.name}.length`, value: Number(n.lenMm.toFixed(3)), unit: "mm", ...q, note: `net ${n.name}: routed length over both layers, stubs excluded`, gate: "informational", group: ROUTE },
    );
  }
  return out;
}

/** What CHK-NET-12 reads back from Part IR metrics; null when the part carries no route. */
export interface RouteMetricsView {
  readonly conflicts: number;
  readonly unrouted: number;
  readonly nets: readonly { readonly name: string; readonly fails: number; readonly hot: number; readonly note: string }[];
}

/** The route counts in a part's metrics, nets in metric order; null when route.conflicts or route.unrouted is absent. */
export function readRouteMetrics(metrics: readonly Pick<Metric, "id" | "value" | "note">[]): RouteMetricsView | null {
  const num = (id: string): number | undefined => {
    const m = metrics.find((x) => x.id === id);
    return m !== undefined && typeof m.value === "number" ? m.value : undefined;
  };
  const conflicts = num(`${ROUTE}.conflicts`), unrouted = num(`${ROUTE}.unrouted`);
  if (conflicts === undefined || unrouted === undefined) return null;
  const names: string[] = [];
  const re = /^route\.net\.(.+)\.fails$/;
  for (const m of metrics) {
    const hit = re.exec(m.id);
    if (hit !== null && !names.includes(hit[1]!)) names.push(hit[1]!);
  }
  return {
    conflicts, unrouted,
    nets: names.map((name) => ({
      name, fails: num(`${ROUTE}.net.${name}.fails`) ?? 0, hot: num(`${ROUTE}.net.${name}.hot`) ?? 0,
      note: metrics.find((x) => x.id === `${ROUTE}.net.${name}.hot`)?.note ?? "",
    })),
  };
}

/** What an emitted trace feature is. */
export type TraceFeature =
  | { readonly kind: "layer"; readonly net: string; readonly layer: 0 | 1; readonly index: number }
  | { readonly kind: "post" | "via"; readonly net: string; readonly index: number };

/** The conductor feature id of an emitted layer region or post: trace.<net>.l1.<i>, post.<net>.<i>, via.<net>.<i>. */
export function traceFeatureId(f: TraceFeature): string {
  return f.kind === "layer" ? `trace.${f.net}.l${f.layer + 1}.${f.index}` : `${f.kind}.${f.net}.${f.index}`;
}

/** The inverse of traceFeatureId; null for any other id. */
export function parseTraceFeatureId(id: string): TraceFeature | null {
  const layer = /^trace\.(.+)\.l([12])\.(\d+)$/.exec(id);
  if (layer !== null) return { kind: "layer", net: layer[1]!, layer: (Number(layer[2]) - 1) as 0 | 1, index: Number(layer[3]) };
  const post = /^(post|via)\.(.+)\.(\d+)$/.exec(id);
  if (post !== null) return { kind: post[1] as "post" | "via", net: post[2]!, index: Number(post[3]) };
  return null;
}
