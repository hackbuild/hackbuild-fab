// Load-time provenance rules (D-099, D-083, PROFILE.md 2.1 and 2.2) and the
// CommandError the profile throws. A row without a tier fails E_SCHEMA; a
// measured row without machine, coupon, date and an existing coupon record
// fails E_PROVENANCE. Nothing here raises a tier.

import type { CommandError, Provenance, ProvenanceMethod, ThrownCommandError, Tier } from "@hackbuild/spec";
import { TIERS, commandError, didYouMean } from "@hackbuild/spec";

/** A CommandError thrown by a profile read or load (spec/errors.ts ThrownCommandError). */
export type ProfileError = ThrownCommandError;

/** Raise a profile CommandError through spec/errors.ts commandError. */
export const profileError: (hbf: CommandError) => ProfileError = commandError;

/** The value a load read and what it accepts, when it is in hand. */
export interface ErrorDetail {
  readonly got?: unknown;
  readonly expected?: string;
}

const detail = (extra: ErrorDetail): ErrorDetail => ({
  ...(extra.got !== undefined ? { got: extra.got } : {}),
  ...(extra.expected !== undefined ? { expected: extra.expected } : {}),
});

/** E_REF with up to three ids by edit distance (D-064, spec/errors.ts didYouMean). `first` ids lead the list. */
export function refError(
  path: string, got: string, hint: string, ids: readonly string[] = [], first: readonly string[] = [],
): ProfileError {
  const lead = first.filter((id) => id !== got);
  const ranked = didYouMean(got, ids.filter((id) => !lead.includes(id)), 3);
  const suggest = [...lead, ...ranked].slice(0, 3);
  return profileError({ code: "E_REF", path, got, hint, ...(suggest.length > 0 ? { didYouMean: suggest } : {}) });
}

export function schemaError(path: string, hint: string, extra: ErrorDetail = {}): ProfileError {
  return profileError({ code: "E_SCHEMA", path, ...detail(extra), hint });
}

export function provenanceError(path: string, hint: string, extra: ErrorDetail = {}): ProfileError {
  return profileError({ code: "E_PROVENANCE", path, ...detail(extra), hint });
}

export const PROVENANCE_METHODS: readonly ProvenanceMethod[] = [
  "datasheet", "coupon", "failure", "felt", "listing", "derived",
];

export interface ProvenanceRules {
  /** Coupon record ids that exist (packages/profile/coupons/). None exist as of 2026-10-05. */
  readonly coupons?: readonly string[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate one provenance record in place and return it typed. */
export function checkProvenance(x: unknown, path: string, rules: ProvenanceRules = {}): Provenance {
  if (typeof x !== "object" || x === null || Array.isArray(x)) throw schemaError(path, "row has no provenance");
  const p = x as Record<string, unknown>;
  if (!(TIERS as readonly unknown[]).includes(p["tier"])) {
    throw schemaError(`${path}/tier`, p["tier"] === undefined ? "row has no tier" : `unknown tier ${String(p["tier"])}`, {
      got: p["tier"], expected: TIERS.join(", "),
    });
  }
  if (!(PROVENANCE_METHODS as readonly unknown[]).includes(p["method"])) {
    throw schemaError(`${path}/method`, `unknown method ${String(p["method"])}`, {
      got: p["method"], expected: PROVENANCE_METHODS.join(", "),
    });
  }
  if (typeof p["date"] !== "string" || !ISO_DATE.test(p["date"])) throw schemaError(`${path}/date`, "date must be yyyy-mm-dd", { got: p["date"], expected: "yyyy-mm-dd" });
  if (typeof p["source"] !== "string" || p["source"].trim() === "") throw schemaError(`${path}/source`, "row has no source");
  if (p["tier"] === "measured") {
    for (const k of ["machine", "coupon"]) {
      if (typeof p[k] !== "string" || p[k] === "") {
        throw provenanceError(`${path}/${k}`, `a measured row needs ${k}; a person enters coupon results`);
      }
    }
    if (!(rules.coupons ?? []).includes(p["coupon"] as string)) {
      throw provenanceError(`${path}/coupon`, `coupon record ${String(p["coupon"])} does not exist`, {
        got: p["coupon"], expected: "a coupon record id under packages/profile/coupons/",
      });
    }
  }
  return p as unknown as Provenance;
}

/** Rank of a tier, 0 highest (TIERS order). */
export function tierRank(t: Tier): number {
  return TIERS.indexOf(t);
}
