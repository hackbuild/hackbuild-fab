// spec/claims.ts
/**
 * Status: draft until the release 1 exit. MILESTONES.md 1.5, D-179.
 * Release 1 item R1-engine-11 is the first that runs this file (the claim
 * function registry and CHK-CLAIM-01 in packages/checks).
 */
// Function claims and toleranced values (PLAN.md section 6, engine row).
// A chase states what the part does as a number in a band: "press force
// 1.47 N, 1.2 to 1.8". The number comes from a registered claim function
// that reads build metrics; the band is the chase's own. Added by
// R1-engine-10; D-046 names no file for these types, so the PR lists this
// file as a spec change for the owner.
// Version 1, 2026-10-20.

import type { Qualification, Verdict } from "./ids";

/**
 * A nominal value with absolute bounds, all in `unit`: lo <= nominal <= hi.
 * Absolute, never a plus or minus offset, so a reader compares a value to
 * lo and hi with no arithmetic. chase.validate refuses lo above nominal or
 * nominal above hi with E_SCHEMA, record "chase-claim/range".
 */
export interface Toleranced {
  readonly nominal: number;
  readonly lo: number;
  readonly hi: number;
  /** Unit of nominal, lo and hi, for example "N", "mm"; non-empty. */
  readonly unit: string;
}

/**
 * One function claim of a chase. `fn` names a registered claim function
 * (packages/checks claim registry) whose output is one number in
 * `want.unit`; an unregistered id is E_REF with didYouMean at
 * chase.validate, record "chase-ref/claim-fn".
 */
export interface ClaimDecl {
  /** Unique within the chase (E_SCHEMA, record "chase-claim/id-unique"). */
  readonly id: string;
  /** Claim function registry id, for example "spring.peak". */
  readonly fn: string;
  /** Arguments the function reads beside the build metrics, units in the key suffix. */
  readonly args?: Readonly<Record<string, number | string>>;
  readonly want: Toleranced;
  /** Why the band is what it is, one line, non-empty. */
  readonly why: string;
  /** Coupon reference id whose measured result can back the claim (D-177). */
  readonly coupon?: string;
}

/**
 * What backs a claim value beyond the computation: a coupon result, a
 * profile or knowledge record, or a file on record. A claim with no
 * evidence and an inferred basis claims no proof.
 */
export interface EvidenceRef {
  readonly kind: "coupon" | "record" | "file";
  /** Coupon id, record id, or repo path. */
  readonly ref: string;
}

/** One claim evaluated on a build. `value` is in the claim's want.unit. */
export interface ClaimResult {
  /** ClaimDecl.id. */
  readonly id: string;
  readonly value: number;
  readonly qualification: Qualification;
  readonly verdict: Verdict;
  readonly evidence: readonly EvidenceRef[];
}
