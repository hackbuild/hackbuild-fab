// command mech.derive, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { DerivedValue } from "../canon.js";
import type { HbfUri } from "../ids.js";

export interface MechDeriveIO {
  /** params: values in the units the mechanism's schema states; absent fills every default. */
  input: { id: string; params?: Readonly<Record<string, number>> };
  /** inputs: the default-filled params derive() ran on; origin hbf://mechanism/<id> (M06-T11 step 2). */
  output: { derived: Readonly<Record<string, DerivedValue>>; inputs: Readonly<Record<string, number>>; origin: HbfUri };
}
