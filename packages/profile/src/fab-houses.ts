// Fab-house rows (PROFILE.md 8.2, plan-deltas R61, M08-T03 step 10). One
// row per dated fact; a board declaration a row forbids gets a BuildWarning
// quoting the row and its checked date, never a refusal: the house may have
// changed its list since the row was checked.

import type { BuildWarning, IsoDate, Provenance } from "@hackbuild/spec";
import { checkProvenance, schemaError } from "./provenance.js";

export interface FabHouseRow {
  readonly id: string;
  readonly house: string;
  readonly fact: string;
  readonly checked: IsoDate;
  /** Board declarations the fact rules out, for example { mask: "pink" }. */
  readonly forbids: Readonly<Record<string, string>>;
  /** Declarations that lift the rule, for example { service: "advanced-pcb" }. */
  readonly unless?: Readonly<Record<string, string>>;
  readonly provenance: Provenance;
}

/** What a board chase declares to a house: its name and any of mask, finish, service. */
export interface FabDeclaration {
  readonly house: string;
  readonly [key: string]: string;
}

const strings = (x: unknown, path: string): Readonly<Record<string, string>> => {
  if (typeof x !== "object" || x === null || Array.isArray(x) || !Object.values(x).every((v) => typeof v === "string")) {
    throw schemaError(path, "expected an object of strings");
  }
  return x as Record<string, string>;
};

/** Validate parsed fab-houses.json: ids unique, vendor or better, a checked date on every row. */
export function loadFabHouses(raw: unknown): readonly FabHouseRow[] {
  const rows = (raw as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(rows)) throw schemaError("/rows", "fab-houses.json needs a rows array");
  const seen = new Set<string>();
  return rows.map((x: unknown, i): FabHouseRow => {
    const path = `/rows/${i}`;
    const r = x as Record<string, unknown>;
    for (const k of ["id", "house", "fact", "checked"]) if (typeof r[k] !== "string" || r[k] === "") throw schemaError(`${path}/${k}`, `fab-house row has no ${k}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r["checked"] as string)) throw schemaError(`${path}/checked`, "checked must be yyyy-mm-dd");
    if (seen.has(r["id"] as string)) throw schemaError(`${path}/id`, `fab-house row ${String(r["id"])} listed twice`);
    seen.add(r["id"] as string);
    const provenance = checkProvenance(r["provenance"], `${path}/provenance`);
    return {
      id: r["id"] as string, house: r["house"] as string, fact: r["fact"] as string, checked: r["checked"] as string,
      forbids: strings(r["forbids"], `${path}/forbids`),
      ...(r["unless"] === undefined ? {} : { unless: strings(r["unless"], `${path}/unless`) }),
      provenance,
    };
  });
}

/** One FAB_HOUSE warning per row the declaration runs into, quoting the row and its date. */
export function fabHouseWarnings(rows: readonly FabHouseRow[], decl: FabDeclaration): readonly BuildWarning[] {
  const house = decl.house.toLowerCase();
  return rows.filter((r) => r.house.toLowerCase() === house
    && Object.entries(r.forbids).every(([k, v]) => decl[k] === v)
    && !(r.unless !== undefined && Object.entries(r.unless).every(([k, v]) => decl[k] === v)))
    .map((r) => ({
      code: "FAB_HOUSE",
      text: `${r.house}: ${r.fact} (row ${r.id}, checked ${r.checked}, ${r.provenance.tier}); pick another house or confirm the service before ordering`,
    }));
}
