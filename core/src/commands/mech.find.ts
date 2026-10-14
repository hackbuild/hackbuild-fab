// mech.find (M06-T11 step 1, AGENT-SURFACE.md 5.1): hits from the
// mechanisms registry ranked by id, family and governs text, each with its
// status, dof, processes, provenance, reference ids and original. Stub,
// candidate and unproven entries follow the typed ones with their status
// and the reason they are refused.

import type { CanonHit, CommandInput, CommandOutput, MechanismDef, Process } from "@hackbuild/spec";
import { mechanisms } from "@hackbuild/mechanisms";
import type { CommandOut } from "../result.js";
import type { CoreCtx } from "../registry.js";
import { ZERO, rank, type Scored } from "./canon-hits.js";

/** One mechanism as the hit list shows it. */
export function mechanismHit(def: MechanismDef): CanonHit {
  return {
    id: def.id, canon: "mechanisms", family: def.family,
    summary: def.governs[0] ?? def.statusReason ?? def.provenance,
    processes: [...def.processes],
    status: def.status,
    ...(def.statusReason === undefined ? {} : { statusReason: def.statusReason }),
    dof: def.dof, provenance: def.provenance, reference: [...def.reference],
    ...(def.original === undefined ? {} : { original: def.original }),
    uri: `hbf://mechanism/${def.id}`,
  };
}

interface Entry extends Scored {
  readonly def: MechanismDef;
}

export function runMechFind(input: CommandInput<"mech.find">, ctx: CoreCtx): CommandOut<CommandOutput<"mech.find">> {
  const family = input.family?.toLowerCase();
  const process = input.process as Process | undefined;
  const entries: Entry[] = mechanisms.entries
    .map((e) => e.def)
    .filter((d) => family === undefined || d.family === family)
    .filter((d) => process === undefined || d.processes.includes(process))
    .map((d) => ({ id: d.id, family: d.family, text: [...d.governs, ...d.failureModes, d.provenance], runs: d.status === "typed", def: d }));
  const hits = rank(entries, input.behaviour).map((e) => mechanismHit(e.def));
  return { verdict: "pass", stage: "done", inputsHash: ctx.inputsHash, result: { hits }, findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [] };
}
