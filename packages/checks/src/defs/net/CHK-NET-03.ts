// CHK-NET-03, makesContact backed by fit() with real numbers (STYLUS
// 2026-08: the pot wiper arms sat beside the tracks and never touched;
// BAFFLE R3 2026-09: "neither mating interface is proven by geometry here
// ... continuity has to be measured on the assembly"). A declared contact
// is a claim until numbers back it (knowledge/kernels/verification.md: a
// declaration is not a test). A contact passes when its fit's real gap,
// converted through the loss table (ProfileLookup.realGap), lies in its
// class band, or when it is a flex key whose travel and cone height CHK-KEY-01
// proves. A contact with neither has no backing.

import type { ContactFeature, Finding } from "@hackbuild/spec";
import { sideOf } from "@hackbuild/profile";
import { defineCheck } from "../../registry.js";
import { bodyOf, boolFinding, featureTarget, fmt, skip } from "../common.js";

export const check = defineCheck<"feature", "contact">({
  id: "CHK-NET-03",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: ContactFeature = t.feature;
    const at = featureTarget(t.part, f);
    if (f.fit === undefined) {
      const flex = f.gap !== undefined && f.coneH !== undefined;
      return [boolFinding(at, flex,
        flex ? "a flex key contact is backed by its travel and cone height, which CHK-KEY-01 proves" : "a contact with no fit and no travel is a claim; declare fit or the flex key travel",
        { backing: flex ? "flex travel" : "none" })];
    }
    const band = ctx.profile.fit(f.fit.class);
    const side = sideOf(band);
    if (side === null) return [skip(at, "not run", `class ${f.fit.class} pairs ${band.processes.join(" and ")}; no loss side prices it`)];
    let real: number;
    try {
      real = ctx.profile.realGap(f.fit.drawnPerSide, side, t.part.machine, bodyOf(t.part, f).material);
    } catch {
      return [skip(at, "not run", `no loss row for ${band.processes.join("+")} on ${t.part.machine}; cut the fit-gauge coupon`)];
    }
    const ok = real >= band.realLoPerSide - 1e-9 && real <= band.realHiPerSide + 1e-9;
    return [boolFinding(at, ok,
      `contact fit ${f.fit.class}: drawn ${fmt(f.fit.drawnPerSide)} mm per side is real ${fmt(real)} mm after loss, band ${fmt(band.realLoPerSide)} to ${fmt(band.realHiPerSide)}`,
      { backing: "fit", realMm: Number(real.toFixed(4)), drawnMm: f.fit.drawnPerSide })];
  },
});
