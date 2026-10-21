// command adopt, group make, cli only.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids";

export interface AdoptIO {
  input: {
    /** A DRAFT page (.html carrying the application/hbf-draft+json block) or a draft directory holding draft.json. */
    draft: string;
    /** Lowercase slug; becomes meta.id, designs/<name> and branch hbf/<name>. Absent, the draft's meta.id. */
    name?: string;
    /** A DRAFT_ 3MF the page wrote, stored as the golden; absent, the page's export is computed from the draft's sources at the state the page opens with. */
    export?: string;
    /** Slice the adopted 3MF through tools/slice/slice.mjs; absent or false, the slice is reported not run. */
    slice?: boolean;
  };
  output: {
    /** The design directory, relative to the git top: designs/<name>. */
    design: string;
    /** hbf/<name>; the files are staged on it, never committed. */
    branch: string;
    /** The files staged, relative to the git top, sorted. */
    files: readonly string[];
    defHash: Hash;
    buildHash: Hash;
    /** check.run on the adopted design: fails block its export as any design's do. */
    checks: { pass: number; warn: number; fail: number; skip: number };
    /** The release page chase.bake wrote: no draft block, no banner. */
    page: { file: string; bytes: number; hash: Hash };
    /**
     * expected/draft-export.3mf: the draft's export stored as the golden,
     * its sha256, where its bytes came from, and the 3MF part geometry
     * hash of it and of the adopted build. diff is empty when they match;
     * otherwise each line names a mesh that moved, for a person to accept.
     */
    golden: {
      file: string; sha256: string; source: "page export" | "computed";
      geometryHash: string; adoptedGeometryHash: string; diff: readonly string[];
    };
    /** The virtual slice: computed, never a print; not run carries the reason and is never a pass. */
    slice: { status: "sliced" | "failed" | "not run"; reason: string };
    /** designs/<name>/widgets/<file> holding the draft's inline widget as a candidate, or null. */
    widget: string | null;
  };
}
