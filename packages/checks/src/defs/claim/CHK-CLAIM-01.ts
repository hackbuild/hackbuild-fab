// CHK-CLAIM-01, each function claim's value lies in its band (R1-engine-11,
// access switch 2026-10-20: the 150 g press band was held to the drawn
// spring peak only by a design-local test, reference/keys/access-switch
// claim.ts; fab-knowledge:plan-v5/old-skills-scenarios.md item d). One
// finding per claim on the part whose metrics the claim reads; the rule is
// claims/check.ts, and the evidence rows it reads are claims/evidence.ts.

import { defineCheck } from "../../registry.js";
import { partTarget, skip } from "../common.js";
import { checkClaim, claimFinding } from "../../claims/check.js";
import { CLAIM_SKIP } from "../../claims/scope.js";
import type { RegistryCtx } from "../../views.js";

export const check = defineCheck({
  id: "CHK-CLAIM-01",
  level: "part",
  run: (t, ctx) => {
    const claims = (ctx as RegistryCtx).claims;
    const target = partTarget(t.part);
    if (claims === undefined || claims.decls.length === 0) return [skip(target, "not run", CLAIM_SKIP)];
    return claims.decls.map((d, i) => claimFinding(target, d, checkClaim(d, t.part.metrics, claims, `/claims/${i}`), claims.rows));
  },
});
