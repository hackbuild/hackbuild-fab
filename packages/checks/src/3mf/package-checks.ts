// The CheckDefs a kernel lists for its exported packages (core/src/kinds.ts).
// Kept apart from the run bodies so the check modules never import the
// module list that holds them.

import type { AnyCheckDef } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE } from "@hackbuild/3mf";
import { registerChecks } from "../registry.js";
import { CHECK_MODULES } from "../defs/index.js";

/**
 * CHK-3MF-08 as a CheckDef from the seed row and its module. The circuit
 * kernel lists it (core/src/kinds.ts), since conductor bodies come with the
 * circuit kernel's conductor kind, and check.run --artifact runs it beside
 * the skeleton's artifact checks.
 */
export function conductorPackageChecks(src: { readonly seed: unknown }): readonly AnyCheckDef[] {
  return registerChecks({ seed: src.seed, filamentTemplate: DEFAULT_TEMPLATE }, CHECK_MODULES).filter((d) => d.id === "CHK-3MF-08");
}
