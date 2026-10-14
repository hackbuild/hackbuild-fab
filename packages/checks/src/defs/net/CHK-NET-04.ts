// CHK-NET-04, every landing conductor has an explicit containment
// constraint (STYLUS 2026-08: a collector post overlapped the body frame
// by the post area times EZ). A conductor lands on a host body and is
// clipped to its outline (spec/features.ts ConductorFeature: a centreline
// trace is "clipped to the body outline"). The check proves the clip: in
// plan, every point of the conductor's footprint (a path's ring, or a
// centreline swept at half its width) lies inside the host body's outline.
// The host is the body the feature names unless that is a conductor body,
// else the part's first body or structure body.

import type { ConductorFeature, Finding, Part } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { depthInside } from "../../solid/plan.js";
import { footprint } from "../../skeleton/plan.js";
import { boolFinding, featureTarget, fmt, skip } from "../common.js";

const hostOf = (part: Part, f: ConductorFeature) => {
  const named = f.body === undefined ? undefined : part.bodies.find((b) => b.id === f.body);
  if (named !== undefined && named.role !== "conductor" && named.role !== "flex-conductor") return named;
  return part.bodies.find((b) => b.role === "body" || b.role === "structure");
};

export const check = defineCheck<"feature", "conductor">({
  id: "CHK-NET-04",
  level: "feature",
  run: (t): readonly Finding[] => {
    const f: ConductorFeature = t.feature;
    const at = featureTarget(t.part, f);
    const host = hostOf(t.part, f);
    if (host === undefined) return [skip(at, "not run", `part ${t.part.id} has no body or structure body for conductor ${f.id} to land on`)];
    if (host.outline === undefined || host.outline.length === 0) return [skip(at, "not run", `host body ${host.id} carries no plan outline (filled for prism and stack routes, D-224)`)];
    const fp = footprint(f);
    const pts = fp.edges.flatMap(([a, b]) => [a, b]);
    const depth = Math.min(...pts.map((p) => depthInside(p, host.outline!))) - fp.half;
    return [boolFinding(at, depth >= 0,
      `conductor ${f.id} lies inside host body ${host.id}'s outline${fp.half > 0 ? `, swept at half width ${fmt(fp.half)} mm` : ""}`,
      { host: host.id, minDepthMm: Number(depth.toFixed(4)) })];
  },
});
