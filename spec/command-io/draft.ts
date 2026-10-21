// command draft, group make, cli only.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids";

export interface DraftIO {
  input: {
    /** What the draft is for, in words; it names the draft when name is absent. */
    goal: string;
    /** The bench or design to start from: a reference or design id, or the reference:, design: and draft: forms chase.scaffold takes. */
    from?: string;
    /** Lowercase slug; becomes meta.id and .hbf/drafts/<name>. Absent, the goal as a slug. */
    name?: string;
  };
  output: {
    /** The draft directory, relative to the git top: .hbf/drafts/<name>. */
    dir: string;
    /** The files written into it, sorted. */
    files: readonly string[];
    /** The baked DRAFT page, its size in bytes (measured, at most 16 MB, D-129) and sha256. */
    page: { file: string; bytes: number; hash: Hash };
  };
}
