// command catalog.find, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CatalogHit } from "../catalog";
import type { Process, Tier } from "../ids";

export interface CatalogFindIO {
  /**
   * fetch "kicad" (the KiCad library on gitlab) or "seeed" (Seeed OPL KiCad) lists that
   * footprint library through tools/py/board/kicad_fetch.py and writes cache rows first
   * (M08-T14, D-103, R1-designs-reach-04); the one network path. CLI only
   * (`--fetch kicad|seeed`): CLI_ONLY_FIELDS keeps it off catalog_search, so the MCP server
   * makes no network call (standard rule 10).
   */
  input: { query: string; process?: Process; tier?: Tier; fetch?: "kicad" | "seeed" };
  output: { hits: readonly CatalogHit[] };
}
