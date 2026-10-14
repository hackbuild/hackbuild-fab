// CHK-FIT-03, a mixed-process pair uses PSLIP/PGUIDE, not SLIP (OGEE R16
// sheets 2026-08: a printed lug in a cut slot had 0.25 real). A tab or slot
// whose two sides come from different processes takes one of the mixed
// classes the title names, whose loss falls on one side only (D-100). The
// pair is mixed when the declared class pairs two processes, or when this
// side's process is not the one the declared single-process class names
// (a printed lug declared SLIP, the laser class). A single-process pair
// whose class matches its process is in its own set.

import type { Finding, TabSlotFeature } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { featureTarget, setFinding } from "../common.js";

/** The mixed-process classes the check title names. */
export const MIXED_CLASSES = ["PSLIP", "PGUIDE"] as const;

export const check = defineCheck<"feature", "tabSlot">({
  id: "CHK-FIT-03",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: TabSlotFeature = t.feature;
    const band = ctx.profile.fit(f.fit.class);
    const mixed = band.processes[0] !== band.processes[1] || band.processes[0] !== f.process;
    const legal: readonly string[] = mixed ? MIXED_CLASSES : [f.fit.class];
    return [setFinding(featureTarget(t.part, f), f.fit.class, legal,
      mixed
        ? `a ${f.process} ${f.role} in a mixed-process pair loses gap on its printed side only; ${MIXED_CLASSES.join(" and ")} carry that loss (D-100)`
        : `a ${f.process} pair takes a ${f.process} class`,
      { process: f.process, classProcesses: band.processes.join("+"), ...(f.mate === undefined ? {} : { mate: f.mate }) }, "fit class")];
  },
});
