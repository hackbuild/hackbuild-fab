// CHK-SHT-06, living hinge rows at or under 13 degrees each (TUMBLER
// 2026-08; no failed hinge is on record, the TUMBLER living hinge module
// flags rows over 13 degrees as a bench rule). The ceiling is the profile
// constant livingHinge.maxDegPerRow.

import type { FlexCutFeature, Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { featureTarget, fmt, intervalFinding } from "../common.js";

export const check = defineCheck<"feature", "flexCut">({
  id: "CHK-SHT-06",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: FlexCutFeature = t.feature;
    const c = ctx.profile.constant("livingHinge.maxDegPerRow");
    return [intervalFinding(featureTarget(t.part, f), f.degPerRow, 0, c.value, "deg",
      `each living hinge row bends at most ${fmt(c.value)} deg (profile livingHinge.maxDegPerRow, ${c.provenance.tier})`,
      { rows: f.rows, totalDeg: Number((f.rows * f.degPerRow).toFixed(3)) })];
  },
  drivenBy: (t) => (t.feature.drivenBy?.["degPerRow"] === undefined ? [] : [t.feature.drivenBy["degPerRow"]]),
});
