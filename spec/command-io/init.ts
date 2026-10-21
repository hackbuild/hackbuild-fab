// command init, group author, cli only.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids";

export interface InitIO {
  input: {
    /** Lowercase slug; becomes meta.id, the folder name and the page <name>.html. */
    name: string;
    /** The design or reference to start from: an id, or the reference: and design: forms chase.scaffold takes. Absent, the minimal single chase. */
    from?: string;
    /** The folder to write, relative to the cwd. Absent, <cwd>/<name>. It must be absent or empty (E_EXISTS). */
    dir?: string;
  };
  output: {
    /** The maker folder, absolute. */
    dir: string;
    /** The files written into it, sorted. */
    files: readonly string[];
    /** The baked page <name>.html in the folder, its size in bytes (measured, at most 16 MB, D-129) and sha256 of the bytes on disk. */
    page: { file: string; bytes: number; hash: Hash };
  };
}
