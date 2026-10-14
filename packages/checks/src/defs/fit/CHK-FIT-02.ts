// CHK-FIT-02, snap fit passes catch AND closure (OGEE R16-P 2026-08: the
// barb had to close 1.4 to pass a 1.0 slot; could not go in). Catch: the
// barb is drawn over its bore, interference per side above 0, with a lead-in
// between 0 and 90 deg. Closure: to pass the bore the legs give up both
// sides of that interference, 2 x interferencePerSide, and the slit between
// them (closure.slotWidth) has to take it, as must the closure the
// declaration allows (mustCloseBy). OGEE's barb needed 1.4 against a 1.0
// slit. The strain of the legs is CHK-FIT-06 (CHECKS.md 7.6).

import type { Finding, SnapFeature } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, featureTarget, fmt, need } from "../common.js";

export const check = defineCheck<"feature", "snap">({
  id: "CHK-FIT-02",
  level: "feature",
  run: (t): readonly Finding[] => {
    const f: SnapFeature = t.feature;
    const base = `/features/${f.id}`;
    const i = need(f.catch?.interferencePerSide, `${base}/catch/interferencePerSide`, `snap ${f.id} declares no catch interference`);
    const lead = need(f.catch?.leadInAngleDeg, `${base}/catch/leadInAngleDeg`, `snap ${f.id} declares no lead-in angle`);
    const slot = need(f.closure?.slotWidth, `${base}/closure/slotWidth`, `snap ${f.id} declares no slot width`);
    const by = need(f.closure?.mustCloseBy, `${base}/closure/mustCloseBy`, `snap ${f.id} declares no closure travel`);
    const catches = i > 0 && lead > 0 && lead < 90;
    const need2 = 2 * i;
    const closes = need2 <= slot && need2 <= by;
    return [boolFinding(featureTarget(t.part, f), catches && closes,
      `a snap must catch (interference over 0 with a lead-in) and close (2 x ${fmt(i)} = ${fmt(need2)} mm within slit ${fmt(slot)} and declared ${fmt(by)} mm)`,
      { catch: catches ? "yes" : "no", closure: closes ? "yes" : "no", closeNeedMm: need2, slotMm: slot, mustCloseByMm: by, legWidthMm: f.closure.legWidth })];
  },
});
