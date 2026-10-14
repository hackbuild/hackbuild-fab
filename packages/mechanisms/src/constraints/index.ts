// The ConstraintDefs the mechanism canon owns, exported as constraintDefs
// for core to register at load (D-044, registration by inversion; core
// load/constraints.ts). mech/cascade-slop moved here unchanged from the
// constraints fixtures at M06-T02 and mech/hook-rule at M06-T03; the
// recorded rules of CANONS.md 3.2 and KNURL's detent bands are rules.ts
// (M06-T03, M06-T04).

import type { ConstraintDef } from "@hackbuild/spec";
import { cascadeSlop } from "./cascade-slop.js";
import { hookRuleDef } from "./hook-rule.js";
import { coincidenceRamp, crownFromRockerOrigin, detentBands, detentStripSeparate, pegIsCam, rigidTwoPinLink } from "./rules.js";

export * from "./cascade-slop.js";
export * from "./hook-rule.js";
export * from "./rules.js";

export const constraintDefs: readonly ConstraintDef[] = [
  cascadeSlop, hookRuleDef, rigidTwoPinLink, crownFromRockerOrigin, detentStripSeparate, pegIsCam, coincidenceRamp, detentBands,
];
