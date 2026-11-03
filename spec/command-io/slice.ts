// command slice, group make.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids.js";

export interface SliceIO {
  input: {
    /** A 3MF file, or a design or reference directory built at its preset (the in-process writer, no export gate). */
    target: string;
    /** Preset of a design target; absent, the build's defaults and the 3MF stem ends in "defaults". */
    preset?: string;
    /** Slicer id of tools/slice/orca-family.mjs; absent, flash-studio. */
    slicer?: string;
    /** Kill the slicer after this many seconds; absent, 600 (inferred: slice.mjs's own default). */
    timeLimitS?: number;
  };
  output: {
    status: "sliced" | "failed" | "not run";
    /** First line the driver printed, or why it did not run. */
    reason: string;
    /** Folder holding the 3MF, the G-code and slice-run.json; empty when not run. */
    outDir: string;
    /** The G-code of the virtual print, never sent to a printer; null unless sliced. */
    gcode: { readonly path: string; readonly bytes: number; readonly sha256: Hash } | null;
    /** The SLC profile check rows slice.mjs writes into slice-run.json. */
    profileChecks: readonly { readonly id: string; readonly verdict: string; readonly qualifier: string; readonly reason: string }[];
  };
}
