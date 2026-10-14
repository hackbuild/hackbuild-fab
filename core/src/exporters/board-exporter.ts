// The board exporter shape (M08-T14 step 3): the fields of ExporterDef
// (spec/registry.ts) a board export reads, and the files one exporter
// writes from a built board. ExporterDef.write takes a Part or Assembly IR
// and returns one artifact; a board kind writes from the BoardRecord and the
// generator's fab set, and gerbers writes the zip with the two parsed-gerber
// PNGs beside it. Fabrication status comes from `fabrication`
// (api-library-ai-design.md 8.4), never from the kind's name. Each binding
// is one file; board-exporters.ts registers them.

import type { ExporterDef } from "@hackbuild/spec";
import type { CplDialect } from "@hackbuild/board";
import type { BoardBuilt } from "../board.js";

export interface BoardFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  /** The artifact kind the store and the checks see: "gerbers", "bom", "png". */
  readonly kind: string;
  readonly mediaType: string;
}

export interface BoardExporter extends Pick<ExporterDef, "id" | "version" | "fabrication" | "processes" | "mediaType" | "ext"> {
  /** The files written on approval, from the built board; absent while `pending` names the card that lands the writer. */
  readonly files?: (built: BoardBuilt, o: { readonly dialect: CplDialect; readonly root: string }) => readonly BoardFile[];
  /** Checks that read the written files back; a fail deletes them (M08-T14 step 4). */
  readonly postWrite: readonly string[];
  /** The card that lands this exporter's writer. */
  readonly pending?: string;
}
