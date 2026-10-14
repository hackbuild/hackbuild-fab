// CHK-SHP-01, chamfer half-spaces applied before union, never after
// (DETENT rev D 2026-07-30: an unbounded half-space cut a neighbouring
// sub-solid; CONTEXT.md lines 155 to 159, detent_parts.py line 495: "each
// piece is chamfered before the union, because a 45 degree half space is
// unbounded"). In this kernel a chamfer's generator emits preUnionCutters,
// which the stage runner applies to one body at stage 2 (D-047,
// PRE_UNION_KINDS), so a chamfer cuts only the body it names. On a part
// with more than one body the chamfer must name that body; one that names
// none, or a body the part lacks, would be the whole-part cut DETENT made.

import { PRE_UNION_KINDS, type ChamferFeature, type Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, featureTarget } from "../common.js";

export const check = defineCheck<"feature", "chamfer">({
  id: "CHK-SHP-01",
  level: "feature",
  run: (t): readonly Finding[] => {
    const f: ChamferFeature = t.feature;
    const preUnion = (PRE_UNION_KINDS as readonly string[]).includes(f.kind);
    const named = f.body === undefined ? undefined : t.part.bodies.find((b) => b.id === f.body);
    const single = t.part.bodies.length === 1;
    const ok = preUnion && (single || named !== undefined);
    return [boolFinding(featureTarget(t.part, f), ok,
      "a chamfer half-space is unbounded; it cuts one named sub-solid before the union (stage 2), never the united part",
      { bodies: t.part.bodies.length, body: f.body ?? "none", stage: preUnion ? "preUnionCutters" : "after union" })];
  },
});
