// command mech.find, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CanonHit } from "../commands.js";
import type { Process } from "../ids.js";

export interface MechFindIO {
  /** family and process narrow the hits (M06-T11 step 1); added at M06-T11. */
  input: { behaviour: string; family?: string; process?: Process };
  output: { hits: readonly CanonHit[] };
}
