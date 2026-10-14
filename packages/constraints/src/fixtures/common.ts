// Helpers the three M01-T10 fixture defs share. A fact a def needs is read
// through factMissingError so an absent fact names its own pointer before
// any arithmetic runs; every physical number comes from a profile constant
// row, read through ctx.profile.constant, never typed here.

import type { Interval, Severity, Verdict } from "@hackbuild/spec";

import { nearest } from "../solve.js";

export { factOrConstant, needFact, needNonNegative, tiersOf, type Overridable } from "@hackbuild/spec";

/**
 * What a measured value earns against a fixture interval: pass inside
 * legal, otherwise the verdict the def's severity maps to (D-067: block
 * stops export and reads fail, warn is shown and reads warn, note informs
 * and reads pass). An empty interval gives every value the severity verdict.
 */
export function verdictOf(interval: Interval, value: number, severity: Severity): Verdict {
  if (interval.legal !== null && nearest(interval, value) === value) return "pass";
  return severity === "block" ? "fail" : severity === "warn" ? "warn" : "pass";
}
