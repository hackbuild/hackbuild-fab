// CHK-SHP-02, a round or edge profile on a printed edge is at least one
// line width deep (KNURL 2026-09: 64 reeds at 0.5 deep printed practically
// round; 40 at 1.0 deep read). A round's depth is its radius; an edge
// profile states its depth in its style params (params.depth, mm). The
// floor is the active preset's line width.

import type { EdgeProfileFeature, Finding, RoundFeature } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { featureTarget, fmt, intervalFinding, need, presetOf } from "../common.js";

export const check = defineCheck<"feature", "round" | "edgeProfile">({
  id: "CHK-SHP-02",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f = t.feature as RoundFeature | EdgeProfileFeature;
    const p = presetOf(ctx, t.part.machine);
    const depth = f.kind === "round"
      ? need(f.r, `/features/${f.id}/r`, `round ${f.id} declares no radius`)
      : need(f.params["depth"], `/features/${f.id}/params/depth`, `edge profile ${f.id} (${f.style}) states no depth in its params`);
    return [intervalFinding(featureTarget(t.part, f), depth, p.lineWidth, null, "mm",
      `a printed edge detail shallower than one line width ${fmt(p.lineWidth)} mm (preset ${p.id}) prints round`,
      { kind: f.kind })];
  },
  drivenBy: (t) => {
    const key = t.feature.kind === "round" ? "r" : "depth";
    const ptr = t.feature.drivenBy?.[key];
    return ptr === undefined ? [] : [ptr];
  },
});
