// What hbf://mechanism/<id> and hbf://archetype/<id> serve (M06-T11 step
// 5): the def's data fields, its find hit, and the text of its derive()
// function, so a model reads the equations a derived number came from.
// For a typed mechanism the outputs at its defaults follow, each with unit,
// equation and qualifier; a refused entry carries its reason instead.

import type { ArchetypeDef, MechanismDef } from "@hackbuild/spec";
import { mechanisms } from "@hackbuild/mechanisms";
import { createProfileLookup } from "@hackbuild/profile";
import { archetypes } from "../canon.js";
import { fullProfile } from "../load-build.js";
import { mechanismHit } from "./mech.find.js";
import { archetypeHit } from "./arch.find.js";
import { validated } from "./mech.derive.js";

export function mechanismView(id: string): unknown {
  const def: MechanismDef = mechanisms.resolve(id).def;
  const atDefaults = def.status === "typed" ? def.derive(validated(def, {}), createProfileLookup(fullProfile())) : null;
  return { ...mechanismHit(def), version: def.version, governs: def.governs, failureModes: def.failureModes, deriveSource: def.derive.toString(), atDefaults };
}

export function archetypeView(id: string): unknown {
  const def: ArchetypeDef = archetypes.resolve(id).def;
  return { ...archetypeHit(def), version: def.version, limits: def.limits, sections: def.sections ?? [], deriveSource: def.derive.toString(), applySource: def.apply.toString() };
}

/** The canon source of the hbf:// resolver. */
export const CANON_SOURCE = {
  mechanism: { ids: mechanisms.ids(), view: mechanismView },
  archetype: { ids: archetypes.ids(), view: archetypeView },
} as const;
