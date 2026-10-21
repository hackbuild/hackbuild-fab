// CHK-KEY-05, click spring tip lands over each floor pad by at least 0.5
// past the snap (PIP 2026-09: pads split by 0.60; pip.md 5.2 fits,
// model.js lines 530 to 542: "tip over each pad over 0.5"). A click key's
// contact joins the conductive tip on the shuttle (a) and a floor pad (b);
// the shuttle drops straight down past the snap, so in plan the tip lands
// where it sits. The overlap of the two footprints, measured as islands.py
// measures a width (twice the largest inset that leaves it), must be 0.5
// mm or more. A contact that declares coneH is a flex key (spec/features.ts),
// which CHK-KEY-01 and -03 cover; the contact says so, since PIP holds flex
// and click keys in one part (D-624). A contact on a part with no click
// spring is a flex key too.

import type { ConductorFeature, ContactFeature, FaceFrame, Finding, Ring, Vec2 } from "@hackbuild/spec";
import { horizontalFrame } from "@hackbuild/geom";
import { defineCheck } from "../../registry.js";
import { fillRings, gridOverRings, regionWidth } from "../../solid/plan.js";
import { checkError, featureTarget, fmt, intervalFinding, skip } from "../common.js";

/** The floor PIP's fit row names, mm. */
export const TIP_OVER_PAD_MIN_MM = 0.5;
/** Raster cell, mm: a sampling choice a tenth of the floor. */
const CELL_MM = 0.05;

/** A horizontal face's point in part xy; the face may point up or down. */
function inPlan(face: FaceFrame, p: Vec2, path: string): Vec2 {
  return horizontalFrame(face, path, { allowDown: true, hint: "the tip and its pads lie on horizontal faces", record: "verification" }).at(p);
}

function ringOf(c: ConductorFeature): Ring {
  if (!("path" in c.region)) throw checkError({ code: "E_KERNEL", path: `/features/${c.id}/region`, got: "centreline or meshHash", expected: "a path region", hint: "a tip and a pad are filled regions; declare a path", record: "verification" });
  const face = c.region.face;
  return c.region.path.map((p) => inPlan(face, p, `/features/${c.id}/region/face`));
}

export const check = defineCheck<"feature", "contact">({
  id: "CHK-KEY-05",
  level: "feature",
  run: (t): readonly Finding[] => {
    const f: ContactFeature = t.feature;
    const at = featureTarget(t.part, f);
    if (f.coneH !== undefined) return [skip(at, "not run", `contact ${f.id} declares coneH, so it is a flex key, which CHK-KEY-01 and CHK-KEY-03 cover`, { coneMm: f.coneH })];
    if (!t.part.features.some((x) => x.kind === "spring")) return [skip(at, "not run", `part ${t.part.id} has no click spring; contact ${f.id} is a flex key`)];
    const get = (id: string, side: "a" | "b"): ConductorFeature => {
      const c = t.part.features.find((x): x is ConductorFeature => x.kind === "conductor" && x.id === id);
      if (c === undefined) throw checkError({ code: "E_REF", path: `/features/${f.id}/${side}`, got: id, hint: `contact ${f.id} names conductor ${id}, which part ${t.part.id} does not declare`, record: "verification" });
      return c;
    };
    const tip = ringOf(get(f.a, "a")), pad = ringOf(get(f.b, "b"));
    const g = gridOverRings([tip, pad], CELL_MM);
    const a = fillRings([tip], g), b = fillRings([pad], g);
    const both = a.map((v, i) => (v === 1 && b[i] === 1 ? 1 : 0));
    const over = Number(regionWidth(both, g).toFixed(3));
    return [intervalFinding(at, over, TIP_OVER_PAD_MIN_MM, null, "mm",
      `the tip lands across each pad by ${fmt(TIP_OVER_PAD_MIN_MM)} mm or more, so the click felt and the closure read are one event`,
      { tip: f.a, pad: f.b, gridMm: CELL_MM })];
  },
});
