// CHK-SHT-11, finger joint tab and recess one kerf off the pitch, measured
// on the cut outline (TUMBLER 2026-08; M06-T02 step 5 closes the gap
// PLAN.md 6.2 listed for the finger kind). TUMBLER's fingerEdgePts
// (originals/tumbler/files/tumbler.html lines 322 to 331) splits an edge of
// length L into 2n + 1 segments of pitch L / (2n + 1) and makes each
// outward segment one kerf wider and each other segment one kerf narrower,
// so the tab is pitch plus one kerf and the slot pitch minus one kerf. The
// check walks the body's outer ring along the feature's edge line, measures
// every segment that lies on it and every recess between two of them, and
// holds each to the pitch plus or minus the kerf (twice the burn), the two
// classes on opposite sides. The worst miss is the measured value; legal is
// at most one snap grid step (1/1024 mm, D-175).

import type { FingerFeature, Finding, Ring, Vec2 } from "@hackbuild/spec";
import { GRID } from "@hackbuild/geom";
import { defineCheck } from "../../registry.js";
import { viewsOf } from "../../views.js";
import { featureTarget, fmt, intervalFinding, skip } from "../common.js";

/** A vertex counts as on the edge line within this distance, mm (well under the snap grid). */
const ON_LINE = 1e-6;

/** Lengths along the edge of the outline's runs on the edge line and of the recesses between them, in order. */
export function edgeRuns(ring: readonly Vec2[], from: Vec2, to: Vec2): { readonly on: number[]; readonly off: number[] } {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const along = (p: Vec2): number => (p[0] - from[0]) * ux + (p[1] - from[1]) * uy;
  const dist = (p: Vec2): number => Math.abs((p[0] - from[0]) * uy - (p[1] - from[1]) * ux);
  const spans: [number, number][] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    if (dist(a) > ON_LINE || dist(b) > ON_LINE) continue;
    const s = [along(a), along(b)].sort((x, y) => x - y) as [number, number];
    if (s[1] - s[0] > ON_LINE && s[1] > -ON_LINE && s[0] < len + ON_LINE) spans.push(s);
  }
  spans.sort((x, y) => x[0] - y[0]);
  const on = spans.map((s) => s[1] - s[0]);
  const off = spans.slice(1).map((s, i) => s[0] - spans[i]![1]);
  return { on, off };
}

export const check = defineCheck<"feature", "finger">({
  id: "CHK-SHT-11",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: FingerFeature = t.feature;
    const at = featureTarget(t.part, f);
    if (f.edge === undefined) return [skip(at, "not run", `finger ${f.id} declares no edge line to measure along`)];
    if (f.burn === undefined) return [skip(at, "not run", `finger ${f.id} declares no burn, so the kerf it must hold is unknown`)];
    const shape = viewsOf(ctx).shape;
    if (shape === undefined) return [skip(at, "not run", "body outlines not supplied to the registry: the caller reads them from the build's body drafts")];
    const body = f.body ?? t.part.bodies[0]?.id ?? "";
    const s = shape(t.part.id, body);
    if (s?.route !== "prism") return [skip(at, "not run", `body ${body} is not a prism, so it has no cut outline`)];
    const outer: Ring | undefined = s.outline[0];
    if (outer === undefined) return [skip(at, "not run", `body ${body} has no outline`)];
    const { on, off } = edgeRuns(outer, f.edge.from, f.edge.to);
    const kerf = 2 * f.burn;
    const want = 2 * f.count + 1;
    if (on.length + off.length !== want) {
      return [{
        verdict: "fail", target: at, measured: on.length + off.length, legal: { kind: "interval", lo: want, hi: want, unit: "count", nearest: want },
        constraint: `a finger edge of ${f.count} fingers has ${want} segments of pitch ${fmt(f.width)} mm along its line (TUMBLER fingerEdgePts); the outline shows ${on.length} on the line and ${off.length} recesses`,
        extra: { pitch: f.width, count: f.count, onLine: on.length, recesses: off.length },
      }];
    }
    // The class on the line takes one sign of the kerf, the recesses the other (TUMBLER: EDGE A tabs out, EDGE B slots in).
    const sign = Math.sign(on.reduce((a, w) => a + (w - f.width), 0)) || 1;
    const miss = Math.max(...on.map((w) => Math.abs(w - (f.width + sign * kerf))), ...off.map((w) => Math.abs(w - (f.width - sign * kerf))));
    return [intervalFinding(at, Number(miss.toFixed(9)), 0, GRID, "mm",
      `each finger segment is the pitch ${fmt(f.width)} mm plus one kerf ${fmt(kerf)} mm and each recess the pitch minus one kerf, or the reverse (TUMBLER fingerEdgePts); worst miss at most one snap grid step`,
      // pitch and kerf ride in extra so every number the constraint prints traces to a field (M04-T05).
      { pitch: f.width, kerf: Number(kerf.toFixed(6)), tab: Number((f.width + kerf).toFixed(6)), slot: Number((f.width - kerf).toFixed(6)), onLine: on.length, recesses: off.length })];
  },
  drivenBy: (t) => ["width", "burn", "count"].flatMap((k) => (t.feature.drivenBy?.[k] === undefined ? [] : [t.feature.drivenBy[k]!])),
});
