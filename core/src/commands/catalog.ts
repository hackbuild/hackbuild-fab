// catalog.find and catalog.pins (M08-T04 step 4, M08-T14 steps 1 and 2):
// offline reads of the committed rows and the .hbf cache; --fetch kicad
// first writes cache rows from the KiCad mirror (catalog-fetch.ts), the one
// network path. Neither carries a verdict beyond pass. An unknown part is E_REF with up
// to three ids by edit distance.

import type { CommandInput, CommandOutput } from "@hackbuild/spec";
import { catalogFind, catalogPins } from "@hackbuild/catalog";
import { workspaceCatalog } from "../catalog-files.js";
import { fetchKicadRows, networkKicadSource, type KicadSource } from "../catalog-fetch.js";
import type { CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";

const ZERO = { pass: 0, warn: 0, fail: 0, skip: 0 } as const;

/**
 * The KiCad source --fetch kicad reads, and the date its rows carry; tests
 * hand in a recorded source so no test needs the network.
 */
export interface FetchDeps {
  readonly kicad: KicadSource;
  readonly date: string;
}

export function runCatalogFind(input: CommandInput<"catalog.find">, ctx: CoreCtx, deps?: FetchDeps): CommandOut<CommandOutput<"catalog.find">> {
  if (input.fetch === "kicad") {
    const d = deps ?? { kicad: networkKicadSource(ctx.workspace), date: new Date().toISOString().slice(0, 10) };
    fetchKicadRows(ctx.workspace, input.query, d.kicad, d.date);
  }
  const hits = catalogFind(workspaceCatalog(ctx.workspace), input.query, input.tier);
  return { verdict: "pass", stage: "done", inputsHash: ctx.inputsHash, result: { hits }, findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [] };
}

export function runCatalogPins(input: CommandInput<"catalog.pins">, ctx: CoreCtx): CommandOut<CommandOutput<"catalog.pins">> {
  const out = catalogPins(workspaceCatalog(ctx.workspace), input.part);
  return { verdict: "pass", stage: "done", inputsHash: ctx.inputsHash, result: out, findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [] };
}
