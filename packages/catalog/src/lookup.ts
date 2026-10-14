// Read tracking (M08-T03 step 3), the catalog twin of ProfileLookup: every
// field a build reads is recorded as {catalogId, field, provenance}. The
// list becomes BoardRecord.reads for a board and Part.catalogReads for a
// printed part that reads a bought-part envelope, and provenanceGate reads
// it at export.

import { commandError, didYouMean, type CatalogField, type PartRow, type RecordRead } from "@hackbuild/spec";
import type { Catalog } from "./load.js";

export interface CatalogLookup {
  /** The row, unrecorded; E_REF with up to three ids when absent. */
  row(id: string, path?: `/${string}`): PartRow;
  /** One field of a row, recorded as a read. */
  field<T = unknown>(id: string, name: string): CatalogField<T>;
  /** Reads so far, in read order, one entry per id and field. */
  reads(): readonly RecordRead[];
}

/**
 * Up to three row ids nearest to got by edit distance, where an id also
 * answers to each of its hyphen-separated words, so "supermni" finds
 * esp32c3-supermini through "supermini".
 */
export function nearIds(got: string, ids: readonly string[]): string[] {
  const alias = new Map<string, string[]>();
  for (const id of ids) for (const a of [id, ...id.split("-")]) alias.set(a, [...(alias.get(a) ?? []), id]);
  const out: string[] = [];
  for (const a of didYouMean(got.toLowerCase(), [...alias.keys()], alias.size)) {
    for (const id of alias.get(a) ?? []) if (!out.includes(id) && id !== got) out.push(id);
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

/** E_REF for an id the catalog lacks, with up to three ids by edit distance. */
export function unknownPart(id: string, ids: readonly string[], path: `/${string}` = "/part"): Error {
  const near = nearIds(id, ids);
  return commandError({
    code: "E_REF", path, got: id, expected: "a catalog row id",
    ...(near.length > 0 ? { didYouMean: near } : {}),
    hint: "no catalog row has this id; catalog.find lists rows by name",
  });
}

export function createCatalogLookup(catalog: Catalog): CatalogLookup {
  const log: RecordRead[] = [];
  const seen = new Set<string>();
  const ids = [...catalog.rows.keys()];
  const lookup: CatalogLookup = {
    row(id, path = "/part") {
      const r = catalog.rows.get(id);
      if (r === undefined) throw unknownPart(id, ids, path);
      return r;
    },
    field<T>(id: string, name: string): CatalogField<T> {
      const r = lookup.row(id);
      const f = r.fields[name];
      if (f === undefined) {
        const near = didYouMean(name, Object.keys(r.fields), 3);
        throw commandError({
          code: "E_REF", path: `/catalog/${id}/${name}`, got: name, expected: `a field of ${id}`,
          ...(near.length > 0 ? { didYouMean: near } : {}),
          hint: `row ${id} has no field ${name}`,
        });
      }
      const key = `${id}\u0000${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        log.push({ catalogId: id, field: name, provenance: f.provenance });
      }
      return f as CatalogField<T>;
    },
    reads: () => log.slice(),
  };
  return lookup;
}
