// CHK-PRT-02, stacked prisms in one part z-overlap 0.01 to 0.02 (COAMING
// 2026-08: coincident rings fused into 4-face edges). The rule is the one
// the stack route already enforces at build (packages/mesh routes/stack.ts
// checkBandOverlaps): each band starts below the top of the band under it
// by the profile's stack.bandOverlap.lo to .hi, compared after the D-054
// snap with one grid step of slack. The bands are read through the kernel
// views because the Part IR does not record them (views.ts).

import type { Finding } from "@hackbuild/spec";
import { bandOverlap, snap } from "@hackbuild/mesh";
import { GRID } from "@hackbuild/geom";
import { defineCheck } from "../../registry.js";
import { viewsOf } from "../../views.js";
import { fmt, partTarget, skip } from "../common.js";

export const check = defineCheck({
  id: "CHK-PRT-02",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const shape = viewsOf(ctx).shape;
    if (shape === undefined) return [skip(at, "not run", "stack band declarations not supplied to the registry: the caller reads them from the build's body drafts")];
    const [lo, hi] = bandOverlap(ctx.profile);
    const joints: { readonly body: string; readonly band: number; readonly mm: number }[] = [];
    for (const b of t.part.bodies) {
      const s = shape(t.part.id, b.id);
      if (s?.route !== "stack") continue;
      s.bands.forEach((band, i) => {
        const below = s.bands[i - 1];
        if (below !== undefined) joints.push({ body: b.id, band: i, mm: snap(below.z[1]) - snap(band.z[0]) });
      });
    }
    if (joints.length === 0) return [skip(at, "not run", `no stacked prisms in part ${t.part.id}`)];
    // The worst joint: furthest outside the band, else the one nearest an edge of it.
    const off = (mm: number): number => (mm < lo ? lo - mm : mm > hi ? mm - hi : -Math.min(mm - lo, hi - mm));
    const worst = joints.reduce((m, j) => (off(j.mm) > off(m.mm) ? j : m));
    const inside = worst.mm >= lo - GRID && worst.mm <= hi + GRID;
    const nearest = worst.mm < lo ? lo : worst.mm > hi ? hi : worst.mm;
    return [{
      verdict: inside ? "pass" : "fail", target: at, measured: worst.mm,
      legal: { kind: "interval", lo, hi, unit: "mm", nearest },
      constraint: `consecutive stack bands overlap by profile stack.bandOverlap ${fmt(lo)} to ${fmt(hi)} mm, or coincident rings fuse into 4-face edges`,
      extra: { body: worst.body, band: worst.band, joints: joints.length, gridMm: GRID },
    }];
  },
});
