// The archetype registry (M06-T01, D-095, D-014). Every def is checked
// against archetypeDataSchema before it registers; a refused def throws
// E_SCHEMA naming the field. Seed ids that D-096 split resolve through
// the alias table to exactly one id.

import { commandError, didYouMean, type ArchetypeDef, type ProfileLookup, type RegistryEntry } from "@hackbuild/spec";
import { archetypeTier, shippedProfile } from "./resistance.js";
import { archetypeDataSchema } from "./def.js";
import { ARCHETYPE_ALIASES, type ArchetypeAlias } from "./aliases.js";
import { ARCHETYPE_DEFS } from "./defs/index.js";

/** The package version; load.test.ts reads package.json and fails when they differ (D-036). */
export const PACKAGE_VERSION = "0.0.0";

export interface ArchetypeRegistry {
  /** One entry per def, sorted by id. */
  readonly entries: readonly RegistryEntry<"archetypes">[];
  ids(): readonly string[];
  /** The entry for an id or an alias. */
  get(idOrAlias: string): RegistryEntry<"archetypes"> | undefined;
  /** The entry, or E_REF with didYouMean over ids and aliases. */
  resolve(idOrAlias: string): RegistryEntry<"archetypes">;
  /** The registered id an alias names, or undefined when it is no alias. */
  aliasOf(alias: string): string | undefined;
}

function check(def: ArchetypeDef): void {
  const { derive, apply, params, ...data } = def;
  const id = typeof data.id === "string" ? data.id : "?";
  const r = archetypeDataSchema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    const path = `/archetypes/${id}/${(issue?.path ?? []).map(String).join("/")}`;
    throw commandError({ code: "E_SCHEMA", path, got: id, expected: issue?.message ?? "an ArchetypeDef", hint: `archetype def ${id} does not type: ${issue?.message ?? "invalid"}; fix ${path}` });
  }
  if (typeof derive !== "function") throw commandError({ code: "E_SCHEMA", path: `/archetypes/${id}/derive`, got: id, expected: "a function", hint: `archetype def ${id} has no derive(); add one` });
  if (typeof apply !== "function") throw commandError({ code: "E_SCHEMA", path: `/archetypes/${id}/apply`, got: id, expected: "a function", hint: `archetype def ${id} has no apply(); add one` });
  if (typeof params !== "object" || params === null || !("~standard" in params)) throw commandError({ code: "E_SCHEMA", path: `/archetypes/${id}/params`, got: id, expected: "a Standard Schema v1 object", hint: `archetype def ${id} has no params schema; add one` });
}

/**
 * The registry over `profile`: each def is checked, then its tier is set to
 * the lowest tier among the resistivity rows its sections read (D-098), so
 * one row change moves every dependent tier. The shipped registry reads the
 * shipped profile; a test passes its own lookup.
 */
export function loadArchetypes(defs: readonly ArchetypeDef[], aliases: readonly ArchetypeAlias[], profile: ProfileLookup = shippedProfile()): ArchetypeRegistry {
  const byId = new Map<string, ArchetypeDef>();
  for (const given of defs) {
    check(given);
    const def: ArchetypeDef = (given.sections ?? []).length === 0 ? given : { ...given, tier: archetypeTier(given, profile) };
    if (byId.has(def.id)) throw commandError({ code: "E_SCHEMA", path: `/archetypes/${def.id}/id`, got: def.id, expected: "an id no other def uses", hint: `archetype id ${def.id} is registered twice; rename one def` });
    byId.set(def.id, def);
  }
  const ids = [...byId.keys()].sort();
  const to = new Map<string, string>();
  for (const a of aliases) {
    if (byId.has(a.alias)) throw commandError({ code: "E_SCHEMA", path: `/aliases/${a.alias}`, got: a.alias, expected: "an alias no def uses as its id", hint: `alias ${a.alias} is also a registered id; drop one` });
    if (to.has(a.alias)) throw commandError({ code: "E_SCHEMA", path: `/aliases/${a.alias}`, got: a.alias, expected: "each alias once", hint: `alias ${a.alias} is listed twice; keep one row` });
    if (!byId.has(a.to)) throw commandError({ code: "E_SCHEMA", path: `/aliases/${a.alias}/to`, got: a.to, didYouMean: didYouMean(a.to, ids), expected: "a registered id", hint: `alias ${a.alias} names no registered archetype ${a.to}; fix the target` });
    to.set(a.alias, a.to);
  }
  const manifest = { name: "@hackbuild/archetypes", registry: "archetypes" as const, version: PACKAGE_VERSION, provides: ids, license: "MIT" as const };
  const entries = ids.map((id): RegistryEntry<"archetypes"> => {
    const def = byId.get(id) as ArchetypeDef;
    return { kind: "archetypes", id, version: def.version, def, manifest };
  });
  const byKey = new Map(entries.map((e) => [e.id, e] as const));
  const get = (k: string): RegistryEntry<"archetypes"> | undefined => byKey.get(to.get(k) ?? k);
  return {
    entries,
    ids: () => ids,
    get,
    aliasOf: (k) => to.get(k),
    resolve(k) {
      const e = get(k);
      if (e !== undefined) return e;
      throw commandError({ code: "E_REF", path: "/id", got: k, didYouMean: didYouMean(k, [...ids, ...to.keys()]), hint: `no archetype ${k}; pick a registered id or alias` });
    },
  };
}

/** The registry the package ships. */
export const archetypes: ArchetypeRegistry = loadArchetypes(ARCHETYPE_DEFS, ARCHETYPE_ALIASES);
