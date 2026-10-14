// CHK-KEY-03, split between contact halves at least 0.6 (PIP 2026-09: the
// split is exposed, and a string across it reads as a press; pip.md 5.1,
// model.js lines 521 to 529: "split at least 0.6"). The two conductors a
// contact joins, in plan, must keep an edge-level gap of 0.6 mm (the
// skeleton's segment to segment clearance, CHK-NET-02's TANG lesson).

import type { ConductorFeature, ContactFeature, Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { clearance, footprint } from "../../skeleton/plan.js";
import { checkError, featureTarget, fmt, intervalFinding } from "../common.js";

/** The floor PIP's rule names, mm. */
export const SPLIT_MIN_MM = 0.6;

export const check = defineCheck<"feature", "contact">({
  id: "CHK-KEY-03",
  level: "feature",
  run: (t): readonly Finding[] => {
    const f: ContactFeature = t.feature;
    const conductor = (id: string, side: "a" | "b"): ConductorFeature => {
      const c = t.part.features.find((x): x is ConductorFeature => x.kind === "conductor" && x.id === id);
      if (c === undefined) throw checkError({ code: "E_REF", path: `/features/${f.id}/${side}`, got: id, hint: `contact ${f.id} names conductor ${id}, which part ${t.part.id} does not declare`, record: "verification" });
      return c;
    };
    const c = clearance(footprint(conductor(f.a, "a")), footprint(conductor(f.b, "b")));
    return [intervalFinding({ ...featureTarget(t.part, f), at: c.at } as Finding["target"], Number(c.planGap.toFixed(4)), SPLIT_MIN_MM, null, "mm",
      `the exposed split between a contact's halves stays ${fmt(SPLIT_MIN_MM)} mm or wider; a string across it reads as a press`,
      { a: f.a, b: f.b })];
  },
});
