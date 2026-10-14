// hashOf for core and the page build: sha256Hex(canonicalize(x)) from spec/jcs.ts, the one
// canonicalizer and sha256 of every tier (D-051, D-206). A value RFC 8785
// has no form for (NaN, Infinity, bigint) is E_PARAM_MISSING at its JSON
// pointer; an open interval end is null, never Infinity (CHECKS.md 7.1, D-225).

import { CanonicalizeError, canonicalize, commandError as cmdError, sha256Hex, type Hash } from "@hackbuild/spec";

/** Run a canonicalizing call; a CanonicalizeError becomes E_PARAM_MISSING at its pointer. */
export function canonicalOrMissing<T>(f: () => T): T {
  try {
    return f();
  } catch (e) {
    if (!(e instanceof CanonicalizeError)) throw e;
    throw cmdError({ code: "E_PARAM_MISSING", path: e.path, got: e.got, hint: "a hashed value is not a finite number", record: "agent-capability" });
  }
}

/** sha256 of the canonical JSON of a value. */
export function hashOf(value: unknown): Hash {
  return canonicalOrMissing(() => sha256Hex(canonicalize(value)) as Hash);
}
