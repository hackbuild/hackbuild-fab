// command export.run, group make.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ArtifactUri } from "../ids.js";
import type { BuildWarning } from "../part-ir.js";
import type { Params } from "./_shared.js";

export interface ExportRunIO {
  /**
   * params and preset have part.build's meaning; the export builds exactly
   * those values, and they enter argsDigest (D-109). dryRun runs build,
   * checks and the gate preflight and writes nothing.
   */
  input: {
    chase: string; kind: string; machine?: string; params?: Params; preset?: string;
    /** outline applies +kerf/2 from the machine row; none draws at nominal and needs no kerf. Default outline. */
    kerfMode?: "outline" | "none";
    /** CPL dialect for kind cpl (M08-T12 step 5): body-centre (default) or mm-suffix; the assembler mapping is unconfirmed. */
    dialect?: "body-centre" | "mm-suffix";
    dryRun?: boolean; cursor?: string;
  };
  /**
   * warnings: the build's warnings and the package writer's, deduplicated
   * by code and text, on every return (dry run, gate, done). A TPU slot
   * raises PRESET_INFERRED: its preset row is inferred and its written
   * values may not reach the slice (PROFILE.md 8.1, D-187). A warning is
   * not a check verdict and never enters counts.
   */
  output: { artifacts: readonly ArtifactUri[]; warnings: readonly BuildWarning[] };
}
