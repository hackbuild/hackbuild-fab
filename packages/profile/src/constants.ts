// Named constants with provenance (PROFILE.md 10). constant(id) returns the
// row; its shown qualifier is qualifyRow(provenance.tier). Seed constants
// that moved to the catalog stay listed so a lookup names where they went.

import type { Constant } from "@hackbuild/spec";
import { checkProvenance, refError, schemaError, type ProvenanceRules } from "./provenance.js";

/** A seed constant that left profile, and where it lives now. */
export interface MovedConstant {
  readonly id: string;
  readonly to: string;
}

export interface ConstantTable {
  readonly constants: readonly Constant[];
  readonly moved: readonly MovedConstant[];
}

/** Validate parsed constants.json. Ids are unique; values are finite numbers. */
export function loadConstants(raw: unknown, rules: ProvenanceRules = {}): ConstantTable {
  if (typeof raw !== "object" || raw === null) throw schemaError("/constants", "constants.json is not an object");
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r["constants"])) throw schemaError("/constants", "constants.json needs a constants array");
  const seen = new Set<string>();
  const constants = r["constants"].map((x: unknown, i): Constant => {
    const path = `/constants/${i}`;
    if (typeof x !== "object" || x === null) throw schemaError(path, "constant is not an object");
    const c = x as Record<string, unknown>;
    if (typeof c["id"] !== "string" || c["id"] === "") throw schemaError(`${path}/id`, "constant has no id");
    if (seen.has(c["id"])) throw schemaError(`${path}/id`, `constant ${c["id"]} listed twice`);
    seen.add(c["id"]);
    if (typeof c["value"] !== "number" || !Number.isFinite(c["value"])) {
      throw schemaError(`${path}/value`, `constant ${c["id"]} value must be a finite number`);
    }
    if (typeof c["unit"] !== "string" || c["unit"] === "") throw schemaError(`${path}/unit`, `constant ${c["id"]} has no unit`);
    checkProvenance(c["provenance"], `${path}/provenance`, rules);
    return c as unknown as Constant;
  });
  const moved = Array.isArray(r["moved"]) ? (r["moved"] as MovedConstant[]) : [];
  return { constants, moved };
}

/** The constant row; a moved id or an unknown id is E_REF. */
export function findConstant(t: ConstantTable, id: string): Constant {
  const c = t.constants.find((x) => x.id === id);
  if (c !== undefined) return c;
  const ids = t.constants.map((x) => x.id);
  const m = t.moved.find((x) => x.id === id);
  if (m !== undefined) throw refError("/constant", id, `constant ${id} moved to ${m.to}`, ids);
  const ends = ids.filter((x) => x.startsWith(`${id}.`));
  throw refError("/constant", id, `no constant ${id} in profile`, ids, ends);
}
