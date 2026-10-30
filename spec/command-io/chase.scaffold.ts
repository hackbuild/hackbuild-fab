// command chase.scaffold, group author.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ChaseKind } from "../chase.js";


export interface ChaseScaffoldIO {
  /** M12-T01's zod schema carries the kind and from docs as `.describe()` text. */
  input: {
    /**
     * single: one part, or several printed together; composer: an
     * assembly of parts with poses, such as a laser tab-slot box; surface:
     * a sheet circuit on a backer; board: a PCB; machine: a motion
     * program; catalog: a list of items (D-126).
     */
    kind: ChaseKind;
    name: string;
    /**
     * reference:<area>/<id> (for example reference:keys/flex-pair),
     * reference:<meta.id> (keys-flex-pair), design:<id>, or draft:<dir>
     * (a draft directory, for adopt); any other form is E_REF with
     * didYouMean.
     */
    from?: string;
  };
  /**
   * benchTs is a default bench.ts generated from the params (one rail step
   * per param group, then the kind's export step); a model never needs to
   * edit it, and editing it moves no build hash (D-174).
   */
  output: { chaseTs: string; buildTs: string; benchTs: string; files: readonly string[] };
}
