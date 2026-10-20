// Where CHK-CLAIM-01 runs. The claims are the chase's, which Part IR does
// not carry, so the registered run reads them from RegistryRun.claims and
// skips without them. The build registry leaves the check out (pipeline
// registryDefs), so its version never enters the registryHash of a chase
// build, and the registry conformance run leaves it out, since no Part IR
// fixture carries claims (test/claims.test.ts feeds them).

import type { ClaimDecl } from "@hackbuild/spec";
import type { ClaimRun } from "./check.js";

/** Check ids the claim path runs and the build registry does not. */
export const CLAIM_CHECKS: readonly string[] = ["CHK-CLAIM-01"];

/** The skip reason of CHK-CLAIM-01 on a run that supplied no claims. */
export const CLAIM_SKIP = "runs where the chase claims are read: no claims supplied to this run";

/** The chase claims and what their functions read, for one registry run. */
export interface ClaimsInput extends ClaimRun {
  readonly decls: readonly ClaimDecl[];
}
