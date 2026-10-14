// The mechanism registry (M06-T01, D-095). Every def is checked against
// mechanismDataSchema before it registers; a refused def throws E_SCHEMA
// naming the field, so the registry never holds a def that does not type.

import { commandError, didYouMean, type MechanismDef, type RegistryEntry } from "@hackbuild/spec";
import { mechanismDataSchema } from "./def.js";
import { MECHANISM_DEFS } from "./defs/index.js";

/** The package version; load.test.ts reads package.json and fails when they differ (D-036). */
export const PACKAGE_VERSION = "0.0.0";

export interface MechanismRegistry {
  /** One entry per def, sorted by id. */
  readonly entries: readonly RegistryEntry<"mechanisms">[];
  ids(): readonly string[];
  get(id: string): RegistryEntry<"mechanisms"> | undefined;
  /** The entry, or E_REF with didYouMean over the registered ids. */
  resolve(id: string): RegistryEntry<"mechanisms">;
}

function check(def: MechanismDef): void {
  const { derive, apply, params, ...data } = def;
  const id = typeof data.id === "string" ? data.id : "?";
  const r = mechanismDataSchema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    const path = `/mechanisms/${id}/${(issue?.path ?? []).map(String).join("/")}`;
    throw commandError({ code: "E_SCHEMA", path, got: id, expected: issue?.message ?? "a MechanismDef", hint: `mechanism def ${id} does not type: ${issue?.message ?? "invalid"}; fix ${path}` });
  }
  if (typeof derive !== "function") throw commandError({ code: "E_SCHEMA", path: `/mechanisms/${id}/derive`, got: id, expected: "a function", hint: `mechanism def ${id} has no derive(); add one` });
  if (apply !== undefined && typeof apply !== "function") throw commandError({ code: "E_SCHEMA", path: `/mechanisms/${id}/apply`, got: id, expected: "a function or absent", hint: `mechanism def ${id} apply is not a function; remove it or make it one` });
  if (typeof params !== "object" || params === null || !("~standard" in params)) throw commandError({ code: "E_SCHEMA", path: `/mechanisms/${id}/params`, got: id, expected: "a Standard Schema v1 object", hint: `mechanism def ${id} has no params schema; add one` });
}

export function loadMechanisms(defs: readonly MechanismDef[]): MechanismRegistry {
  const byId = new Map<string, MechanismDef>();
  for (const def of defs) {
    check(def);
    if (byId.has(def.id)) throw commandError({ code: "E_SCHEMA", path: `/mechanisms/${def.id}/id`, got: def.id, expected: "an id no other def uses", hint: `mechanism id ${def.id} is registered twice; rename one def` });
    byId.set(def.id, def);
  }
  const ids = [...byId.keys()].sort();
  const manifest = { name: "@hackbuild/mechanisms", registry: "mechanisms" as const, version: PACKAGE_VERSION, provides: ids, license: "MIT" as const };
  const entries = ids.map((id): RegistryEntry<"mechanisms"> => {
    const def = byId.get(id) as MechanismDef;
    return { kind: "mechanisms", id, version: def.version, def, manifest };
  });
  const byKey = new Map(entries.map((e) => [e.id, e] as const));
  return {
    entries,
    ids: () => ids,
    get: (id) => byKey.get(id),
    resolve(id) {
      const e = byKey.get(id);
      if (e !== undefined) return e;
      throw commandError({ code: "E_REF", path: "/id", got: id, didYouMean: didYouMean(id, ids, 3, { segments: true }), hint: `no mechanism ${id}; pick a registered id` });
    },
  };
}

/** The registry the package ships. */
export const mechanisms: MechanismRegistry = loadMechanisms(MECHANISM_DEFS);
