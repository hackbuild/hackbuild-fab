// CHK-FIT-05, a bore that is a bearing has land L/D >= 0.8 (OGEE R16-P
// 2026-08: a 3 mm plate bearing, L/D 0.375, shaft walked 29 mm). OGEE16's
// fix took the knob hub from 3/8 to 8/8, L/D 0.375 to 1.00 (computed;
// knowledge/designs/ogee16.md line 125, printed.scad knob_hub lines 285 to
// 328). A bore is a bearing when its fit class moves
// (motion slide or rotate in the profile fit table). L is the declared
// depth, or for a through bore the body's extent along the axis (its
// MeshRef bounds); D is the bore diameter.

import type { BoreFeature, Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { norm3 } from "../../solid/mesh.js";
import { bodyOf, featureTarget, fmt, intervalFinding, skip } from "../common.js";

/** The floor the title names, ratio. */
export const LD_MIN = 0.8;

export const check = defineCheck<"feature", "bore">({
  id: "CHK-FIT-05",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: BoreFeature = t.feature;
    const at = featureTarget(t.part, f);
    const motion = ctx.profile.fit(f.fit.class).motion;
    if (motion !== "slide" && motion !== "rotate") {
      return [skip(at, "not run", `bore ${f.id} is class ${f.fit.class} (${motion}); only a moving fit is a bearing`)];
    }
    let land: number;
    if (f.depth === "through") {
      const [lo, hi] = bodyOf(t.part, f).mesh.bbox;
      const d = norm3(f.axis.dir);
      land = Math.abs(d[0]) * (hi[0] - lo[0]) + Math.abs(d[1]) * (hi[1] - lo[1]) + Math.abs(d[2]) * (hi[2] - lo[2]);
    } else {
      land = f.depth;
    }
    const ratio = Number((land / f.d).toFixed(4));
    return [intervalFinding(at, ratio, LD_MIN, null, "ratio",
      `a ${motion} bore shorter than ${LD_MIN} of its diameter lets the shaft walk; land ${fmt(land)} mm on d ${fmt(f.d)} mm`,
      { landMm: Number(land.toFixed(4)), dMm: f.d })];
  },
});
