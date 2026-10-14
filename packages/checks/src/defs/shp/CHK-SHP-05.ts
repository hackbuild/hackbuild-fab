// CHK-SHP-05, an imported part with inferred provenance is refused at
// fabrication export (catalog rule 2026-09: the same gate as bought parts,
// D-102). An imported part's tier must be one the fabrication gate
// accepts: every Tier but inferred. A part the kernel built is not
// imported and the rule does not apply.

import { TIERS, type Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { partTarget, setFinding, skip } from "../common.js";

const ACCEPTED: readonly string[] = TIERS.filter((t) => t !== "inferred");

export const check = defineCheck({
  id: "CHK-SHP-05",
  level: "part",
  run: (t): readonly Finding[] => {
    const at = partTarget(t.part);
    const src = t.part.source;
    if (src.kind !== "imported") return [skip(at, "not run", `part ${t.part.id} is built by the ${src.kind} route, not imported`)];
    return [setFinding(at, src.tier, ACCEPTED,
      "fabrication export refuses an inferred row (D-102); an imported mesh carries the tier of its source",
      { format: src.format, uri: src.uri }, "tier")];
  },
});
