// Claim functions and the claim check (R1-engine-11). Importing this module
// registers the first functions (fns.ts).

export {
  claimFn, claimFnIds, metricId, metricNum, registerClaimFn,
  type ClaimArgs, type ClaimCtx, type ClaimFnDef, type ClaimInput, type RegisteredClaimFn,
} from "./registry.js";
export { forceAt, springCurve } from "./fns.js";
export { checkClaim, checkClaims, claimFinding, claimQualification, inBand, type ClaimRun } from "./check.js";
export {
  EVIDENCE_DIRECTIONS, EVIDENCE_KINDS, EVIDENCE_UNITS, STANDARD_GRAVITY, convertUnit, directionOf, evidenceRef, measuredOf, measuredValues, parseEvidence,
  type EvidenceDirection, type EvidenceKind, type EvidenceRow,
} from "./evidence.js";
export { CLAIM_CHECKS, CLAIM_SKIP, type ClaimsInput } from "./scope.js";
