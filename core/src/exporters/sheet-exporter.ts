// The sheet exporter shape (M07-T14 step 3): the fields of ExporterDef
// (spec/registry.ts) a sheet export reads, and the bytes of one cut sheet.
// ExporterDef.write takes a Part or Assembly IR, which a nest scene does
// not have until M10, so a sheet exporter writes from the sheet nest drew
// (CutSheet, packages/nest/src/scene.ts). Each binding is one file; the
// list in index.ts registers them.

import type { ExporterDef } from "@hackbuild/spec";
import type { CutSheet } from "@hackbuild/nest";

export interface SheetExporter extends Pick<ExporterDef, "id" | "version" | "fabrication" | "processes" | "mediaType" | "ext"> {
  /** The file bytes of one cut sheet, as nest's one writer gave them. */
  bytes(sheet: CutSheet): Uint8Array;
}
