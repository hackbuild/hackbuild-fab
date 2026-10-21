// command chase.bake, group make.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids";


export interface ChaseBakeIO {
  input: {
    chase: string;
    /**
     * page (default) bakes the release page. draft bakes the DRAFT page of
     * a draft directory (one holding draft.json, R1-engine-24): checks show
     * as warnings, exports carry DRAFT, the sources ride in the page. A
     * draft directory bakes only as draft (E_DRAFT); page on it refuses.
     */
    mode?: "page" | "draft";
  };
  output: {
    file: string;
    /** Baked file size, bytes; at most 16 MB (D-129). */
    bytes: number;
    hash: Hash;
  };
}
