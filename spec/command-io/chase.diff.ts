// command chase.diff, group author.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ChaseChange, ChaseMigrations, ChaseVerdictChange } from "../commands";
import type { Hash } from "../ids";

export interface ChaseDiffIO {
  /**
   * against is a path to a chase.ts (or the directory holding one) or a
   * git ref; absent means HEAD. build true builds both sides and lists
   * verdict changes; absent or false skips the build.
   */
  input: { chase: string; against?: string; build?: boolean };
  output: {
    /** From against to chase, both migrated. */
    changes: readonly ChaseChange[];
    migrations: { readonly against: ChaseMigrations; readonly chase: ChaseMigrations };
    /** defHash of the against side. */
    defHashBefore: Hash;
    /** defHash of the chase side. */
    defHashAfter: Hash;
    /** verdictChanges is null when build was not requested. */
    verdictChanges: readonly ChaseVerdictChange[] | null;
  };
}
