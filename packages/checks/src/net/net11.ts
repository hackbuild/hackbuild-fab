// CHK-NET-11 run body (M05-T10 step 4, CHECKS.md 7, PIP 2026-09): each
// trace layer of a net is built from one region, and every post and via
// radius stays more than route.postSep from half the trace width (PIP's
// sweep: a union of capsules left lumps, and a via radius at half the trace
// width broke traces). Measured on the Part IR: the net's layer regions and
// posts, named by packages/copper traceFeatureId. Regions of one net on one
// layer that overlap were not emitted as one region; a post ring whose
// radius lies within route.postSep of half the width (less one 1/1024 mm
// grid step for the snap) is the sliver case. A net with no emitted trace
// layer is not run.

import type { ConductorFeature, Finding, Mm, Ring, TargetOf } from "@hackbuild/spec";
import { GRID, loadGeom } from "@hackbuild/geom";
import { parseTraceFeatureId, TRACE_LAYER_CONSTANTS } from "@hackbuild/copper";
import type { RegistryCtx } from "../views.js";
import { boolFinding, fmt, skip } from "../defs/common.js";

/** Mean distance of a ring's points from their centroid, mm. */
function ringRadius(ring: Ring): Mm {
  const n = ring.length;
  const cx = ring.reduce((a, p) => a + p[0], 0) / n, cy = ring.reduce((a, p) => a + p[1], 0) / n;
  return ring.reduce((a, p) => a + Math.hypot(p[0] - cx, p[1] - cy), 0) / n;
}

export async function runNet11(t: TargetOf<"net">, ctx: RegistryCtx): Promise<readonly Finding[]> {
  const { part, net } = t;
  const target = { level: "net", part: part.id, net: net.id } as const;
  const mine = part.features.filter((f): f is ConductorFeature => f.kind === "conductor" && f.net === net.id)
    .flatMap((f) => {
      const id = parseTraceFeatureId(f.id);
      return id === null || id.net !== net.id || !("path" in f.region) ? [] : [{ f, id, ring: f.region.path }];
    });
  const layers = mine.filter((x) => x.id.kind === "layer");
  const posts = mine.filter((x) => x.id.kind !== "layer");
  if (layers.length === 0) return [skip(target, "not run", `net ${net.id} has no trace layer emitted by packages/copper emitTraceLayers`)];
  const w = layers[0]!.f.width;
  const sepRow = ctx.profile.constant(TRACE_LAYER_CONSTANTS.postSep);
  const sep = sepRow.value;
  const seps = posts.map((x) => ({ id: x.f.id, d: Math.abs(ringRadius(x.ring) - w / 2) }));
  const worst = seps.reduce<{ id: string; d: number } | null>((a, x) => (a === null || x.d < a.d ? x : a), null);
  const tooClose = seps.filter((x) => x.d <= sep - GRID);

  const geom = await loadGeom();
  const overlaps: string[] = [];
  let overlapMm2 = 0;
  for (const l of [0, 1] as const) {
    const on = layers.filter((x) => x.id.kind === "layer" && x.id.layer === l);
    if (on.length < 2) continue;
    const parts = on.map((x) => geom.fromOutline(x.ring));
    const sum = parts.reduce((a, s) => a + s.area(), 0);
    const over = sum - geom.union(parts).area();
    if (over > GRID * GRID) {
      overlapMm2 += over;
      overlaps.push(`layer ${l + 1} (${fmt(over, 4)} mm2 over ${on.length} regions)`);
    }
  }
  const ok = tooClose.length === 0 && overlaps.length === 0;
  const constraint = ok
    ? `net ${net.id}: ${layers.length} layer regions, none overlapping; ${posts.length} posts and vias, the nearest ${worst === null ? "none" : `${fmt(worst.d, 3)} mm`} from half the ${fmt(w, 2)} mm trace, clear of route.postSep ${fmt(sep, 2)} mm (${sepRow.provenance.tier})`
    : [
      ...(overlaps.length === 0 ? [] : [`net ${net.id} layer regions overlap on ${overlaps.join(", ")}: emit each layer as one region closed by route.regionClose`]),
      ...(tooClose.length === 0 ? [] : [`${tooClose.map((x) => `${x.id} ${fmt(x.d, 3)} mm`).join(", ")} from half the ${fmt(w, 2)} mm trace, within route.postSep ${fmt(sep, 2)} mm: move the radius to w/2 + ${fmt(sep, 2)}`]),
    ].join("; ");
  return [boolFinding(target, ok, constraint, {
    regions: layers.length, posts: posts.length, overlapMm2: Number(overlapMm2.toFixed(6)),
    ...(worst === null ? {} : { nearestPostMm: Number(worst.d.toFixed(6)), nearestPost: worst.id }),
  })];
}
