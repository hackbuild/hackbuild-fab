// command nest.pack, group make.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CommandResult } from "../commands.js";
import type { Mm } from "../ids.js";
import type { KerfMode, NestMode, NestResult } from "../nest.js";
import type { Part } from "../part-ir.js";

export interface NestPackIO {
  /** Reconciled with spec/nest.ts by M07-T14. */
  input: {
    /** A build whose chase declares sheet items; none does before M10. */
    build?: string;
    /** Part ids to nest, one copy each; absent nests every item the build declares. */
    parts?: readonly string[];
    /** Sheet width and height, mm; absent takes the machine's sheet envelope. */
    sheet?: readonly [Mm, Mm];
    machine?: string;
    mode?: NestMode;
    /** Gap between parts, mm, or "auto" (2 to 16 mm). */
    gap?: Mm | "auto";
    /** Edge margin, mm. */
    margin?: Mm;
    partInPart?: boolean;
    /** Seed of the packer's draws, unitless integer. */
    seed?: number;
    /** outline applies +kerf/2 from the machine row; none draws at nominal and needs no kerf. Default outline. */
    kerfMode?: KerfMode;
  };
  /** Writes nothing; CHK-SHT-01, 02 and 07 travel in CommandResult.findings. */
  output: {
    /** The layout, fill in percent (D-075); null when a kernel refused a part before anything was placed. */
    layout: NestResult | null;
    /** Part ids whose cut profile a kernel refused. */
    refused: readonly string[];
  };
}
