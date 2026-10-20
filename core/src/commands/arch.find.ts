// arch.find (M06-T11 step 3): hits from the archetypes registry matched on
// senses, family and emits, narrowed by process and by the read channels
// available, each with status, channels, senses, emits, read model, tier,
// the resistances computed at load with the tier of each row (D-098),
// provenance, reference ids and original. Proven entries rank first.

import type { ArchetypeDef, CanonHit, CommandInput, CommandOutput, Process } from "@hackbuild/spec";
import { resistances } from "@hackbuild/archetypes";
import { createProfileLookup } from "@hackbuild/profile";
import { archetypes } from "../canon.js";
import { fullProfile } from "../load-build.js";
import type { CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { ZERO, capped, rank, type Scored } from "./canon-hits.js";

/**
 * The processes an archetype family is made by: printed parts print,
 * copper is cut on vinyl or laser, a board is a pcb. The family is the
 * only process fact an ArchetypeDef states (spec/canon.ts).
 */
const FAMILY_PROCESS: Readonly<Record<ArchetypeDef["family"], readonly Process[]>> = {
  printed: ["fdm"],
  copper: ["vinyl", "laser"],
  board: ["pcb"],
  "printed-or-copper": ["fdm", "vinyl", "laser"],
  // The M06-T14 entry kinds (CANONS.md 11.3) name no process of their own.
  check: [], constraint: [], construction: [], coupon: [], "design-rule": [], firmware: [], kernel: [], "read-model": [], system: [], tool: [],
};

export function archetypeHit(def: ArchetypeDef, profile = createProfileLookup(fullProfile())): CanonHit {
  return {
    id: def.id, canon: "archetypes", family: def.family,
    summary: def.limits[0] ?? def.statusReason ?? def.provenance,
    processes: [...FAMILY_PROCESS[def.family]],
    tier: def.tier,
    status: def.status,
    ...(def.statusReason === undefined ? {} : { statusReason: def.statusReason }),
    channels: def.channels, senses: [...def.senses], emits: [...def.emits], read: def.read,
    resistances: resistances(def.sections ?? [], profile).map((r) => ({ id: r.id, material: r.material, ohm: r.ohm, tier: r.tier, rowId: r.rowId })),
    provenance: def.provenance, reference: [...def.reference],
    ...(def.original === undefined ? {} : { original: def.original }),
    uri: `hbf://archetype/${def.id}`,
  };
}

interface Entry extends Scored {
  readonly def: ArchetypeDef;
}

export function runArchFind(input: CommandInput<"arch.find">, ctx: CoreCtx): CommandOut<CommandOutput<"arch.find">> {
  const profile = createProfileLookup(fullProfile());
  const entries: Entry[] = archetypes.entries
    .map((e) => e.def)
    .filter((d) => input.process === undefined || FAMILY_PROCESS[d.family].includes(input.process))
    .filter((d) => input.channels === undefined || d.channels === null || d.channels <= input.channels)
    .map((d) => ({ id: d.id, family: d.family, text: [...d.senses, ...d.emits], runs: d.status === "proven", def: d }));
  const { hits, truncated } = capped(rank(entries, input.behaviour).map((e) => archetypeHit(e.def, profile)));
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash, result: { hits }, findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [],
    ...(truncated === undefined ? {} : { truncated }),
  };
}
