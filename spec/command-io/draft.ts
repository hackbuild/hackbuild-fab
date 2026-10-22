// command draft, group make, cli only.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids";

export interface DraftIO {
  input: {
    /** What the draft is for, in words; it names the draft when name is absent. */
    goal: string;
    /** The bench or design to start from: a reference or design id, or the reference:, design: and draft: forms chase.scaffold takes. */
    from?: string;
    /** Lowercase slug; becomes meta.id and the folder name. Absent, the goal as a slug. */
    name?: string;
    /** The folder to write, relative to the cwd; absent, <cwd>/<name>, as hbf init writes. */
    dir?: string;
  };
  output: {
    /** The draft directory, absolute. */
    dir: string;
    /** The files written into it, sorted. */
    files: readonly string[];
    /** The baked DRAFT page, its size in bytes (measured, at most 16 MB, D-129) and sha256. */
    page: { file: string; bytes: number; hash: Hash };
    /** The source the goal was routed to when from is absent: the reference, its score (computed, 0 to 1), the goal words it holds and the archetypes that name it. */
    match?: { from: string; score: number; words: readonly string[]; archetypes: readonly string[] };
  };
}
