// Feature kind spellings a seed row may carry in appliesTo.kinds (D-017,
// D-177). The camelCase union is FEATURE_KINDS in spec/features.ts; the two
// old spellings map through FEATURE_KIND_ALIASES for one minor version, and
// the four kinds that left the union are refused with the target spec names
// for them, so a v3 row migrates by hand once.

import {
  FEATURE_KINDS, FEATURE_KIND_ALIASES, MOVED_FEATURE_KINDS,
  type CheckId, type FeatureKind, type MovedFeatureKind,
} from "@hackbuild/spec";
import { COMPLETENESS_ALIAS, COMPLETENESS_ID } from "@hackbuild/3mf";
import { checkError } from "./skeleton/common.js";

const KINDS: ReadonlySet<string> = new Set(FEATURE_KINDS);

const own = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/** True when the spelling is an old alias that the loader still maps (D-017). */
export function isAlias(spelling: string): spelling is keyof typeof FEATURE_KIND_ALIASES {
  return own(FEATURE_KIND_ALIASES, spelling);
}

/**
 * The FeatureKind a seed spelling names. An alias maps to its camelCase
 * kind; a kind that left the union, or any other spelling, is E_SCHEMA at
 * `path` (the row's pointer).
 */
export function canonicalKind(spelling: string, path: string): FeatureKind {
  if (KINDS.has(spelling)) return spelling as FeatureKind;
  if (isAlias(spelling)) return FEATURE_KIND_ALIASES[spelling];
  if (own(MOVED_FEATURE_KINDS, spelling)) {
    throw checkError({
      code: "E_SCHEMA", path, got: spelling, expected: MOVED_FEATURE_KINDS[spelling as MovedFeatureKind],
      hint: `kind ${spelling} left the feature union (D-177); select the check by appliesTo.joints or appliesTo.assertions`,
      record: "verification",
    });
  }
  throw checkError({
    code: "E_SCHEMA", path, got: spelling, expected: `one of ${FEATURE_KINDS.join(", ")}`,
    hint: `kind ${spelling} is not a feature kind; spell it as spec/features.ts FEATURE_KINDS does`, record: "verification",
  });
}

/**
 * Old check names a caller may still pass where a check id goes, for one
 * minor version: CHK-ART-01 first ran under the name export-completeness
 * and is registered under its id since M04-T12. The pair is the 3mf writer's, so the
 * name exists once.
 */
export const CHECK_ID_ALIASES: Readonly<Record<string, CheckId>> = { [COMPLETENESS_ALIAS]: COMPLETENESS_ID };

/** The check id a name resolves to: an alias maps to its id, any other name is returned as given. */
export function resolveCheckId(name: string): string {
  return own(CHECK_ID_ALIASES, name) ? CHECK_ID_ALIASES[name]! : name;
}
