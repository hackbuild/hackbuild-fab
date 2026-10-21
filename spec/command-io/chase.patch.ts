// command chase.patch, group author.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { PatchEdit } from "../commands";
import type { Hash } from "../ids";

export interface ChasePatchIO {
  input: { file: string; edits: readonly PatchEdit[] };
  output: {
    /** Edits applied, count. */
    edits: number;
    branch: string;
    /** defHash of the design before the patch (M10-T05 step 3). */
    defHashBefore: Hash;
    /** defHash of the design after the patch. */
    defHash: Hash;
  };
}
