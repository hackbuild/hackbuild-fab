// command arch.find, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CanonHit } from "../commands.js";
import type { Process } from "../ids.js";

export interface ArchFindIO {
  input: {
    behaviour: string;
    process?: Process;
    /** Read channels available, count. */
    channels?: number;
  };
  output: { hits: readonly CanonHit[] };
}
