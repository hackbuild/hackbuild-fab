// The command registry (D-106, AGENT-SURFACE.md 5.3): the binder. Each
// command's spec (name, group, description, zod 4 input schema, examples,
// CLI form) lives in packages/commands; this file maps each name to its run
// body and binds the two at load, where a spec with no run body or a run
// body with no spec stops with E_KERNEL. Utility verbs carry no verdict and
// no CommandDef (spec/commands.ts UTILITY_VERBS).

import { bind, CLI_FORM, SPECS, VERBS, type Runs } from "@hackbuild/commands";
import type { AnyCommandDef, CommandDef, CommandName, UtilityVerb } from "@hackbuild/spec";
import type { CoreCtx } from "./ctx.js";
import { runPartBuild } from "./commands/part-build.js";
import { runPartInspect } from "./commands/part-inspect.js";
import { runCheckRun } from "./commands/check-run.js";
import { runExportRun } from "./commands/export-run.js";
import { runViewRender } from "./commands/view-render.js";
import { runConstraintsQuery } from "./commands/constraints-query.js";
import { runFitsTable } from "./commands/fits-table.js";
import { runCatalogFind, runCatalogPins } from "./commands/catalog.js";
import { runSimRun, type SimRunInput } from "./commands/sim.run.js";
import { runSimSweep, type SimSweepInput } from "./commands/sim.sweep.js";
import { runAsmSolve, type AsmSolveInput } from "./commands/asm.solve.js";
import { runPartProbe, type PartProbeInput } from "./commands/part.probe.js";
import { runProjectGraph, type ProjectGraphInput } from "./commands/project-graph.js";
import { runRulesAudit } from "./commands/rules-audit.js";
import { runCircuitSolve } from "./commands/circuit-solve.js";
import { runNestPack, type NestPackInput } from "./commands/nest.pack.js";
import { PROGRAM_IDS, runMotionRun, type MotionRunInput } from "./commands/motion.run.js";
import type { ExportInput } from "./exporters/scene-export.js";
import { runMechFind } from "./commands/mech.find.js";
import { runMechDerive } from "./commands/mech.derive.js";
import { runArchFind } from "./commands/arch.find.js";
import { runArchApply } from "./commands/arch.apply.js";
import { runChaseValidate } from "./commands/chase-validate.js";
import { runChasePatch } from "./commands/chase-patch.js";
import { runChaseDiff } from "./commands/chase-diff.js";
import { runChaseScaffold } from "./commands/chase-scaffold.js";
import { runChaseBake } from "./commands/chase-bake.js";

export type { CliForm, FlagKind } from "@hackbuild/commands";
export { CLI_FORM, VERBS };

// The CLI input layer (D-107): a command whose CLI form widens the spec
// input (--scene and the M10 fields) runs on that widened input. cliRun and
// the example helper in packages/commands are the one place the widened
// input meets CommandDef; the layer comes out at M10, when the chase
// declares scenes and spec carries the fields.

/** A run body over the widened CLI input I and the core context, as the CommandDef run of N; its output is checked against N. */
const cliRun = <N extends CommandName, I>(run: (input: I, ctx: CoreCtx) => ReturnType<CommandDef<N>["run"]>): CommandDef<N>["run"] =>
  ((input, ctx) => run(input as unknown as I, ctx as CoreCtx)) as CommandDef<N>["run"];

/** The run body of every registered command, by name. */
export const RUNS: Runs = {
  "part.build": (i, ctx) => runPartBuild(i, ctx as CoreCtx),
  "part.inspect": (i, ctx) => runPartInspect(i, ctx as CoreCtx),
  "check.run": (i, ctx) => runCheckRun(i, ctx as CoreCtx),
  "export.run": cliRun<"export.run", ExportInput>(runExportRun),
  "view.render": (i, ctx) => runViewRender(i, ctx as CoreCtx),
  "constraints.query": (i, ctx) => runConstraintsQuery(i, ctx as CoreCtx),
  "fits.table": (i, ctx) => runFitsTable(i, ctx as CoreCtx),
  "sim.run": cliRun<"sim.run", SimRunInput>(runSimRun),
  "sim.sweep": cliRun<"sim.sweep", SimSweepInput>(runSimSweep),
  "asm.solve": cliRun<"asm.solve", AsmSolveInput>(runAsmSolve),
  "part.probe": cliRun<"part.probe", PartProbeInput>(runPartProbe),
  "project.graph": (i, ctx) => runProjectGraph(i as ProjectGraphInput, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"project.graph">["run"]>,
  "rules.audit": (i, ctx) => runRulesAudit(i, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"rules.audit">["run"]>,
  "circuit.solve": (i, ctx) => runCircuitSolve(i, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"circuit.solve">["run"]>,
  "motion.run": (i, ctx) => runMotionRun(i as unknown as MotionRunInput, ctx as CoreCtx) as unknown as ReturnType<CommandDef<"motion.run">["run"]>,
  "nest.pack": cliRun<"nest.pack", NestPackInput>(runNestPack),
  "catalog.find": (i, ctx) => Promise.resolve(runCatalogFind(i, ctx as CoreCtx)),
  "catalog.pins": (i, ctx) => Promise.resolve(runCatalogPins(i, ctx as CoreCtx)),
  "mech.find": (i, ctx) => Promise.resolve(runMechFind(i, ctx as CoreCtx)),
  "mech.derive": (i, ctx) => Promise.resolve(runMechDerive(i, ctx as CoreCtx)),
  "arch.find": (i, ctx) => Promise.resolve(runArchFind(i, ctx as CoreCtx)),
  "arch.apply": (i, ctx) => runArchApply(i, ctx as CoreCtx),
  "chase.validate": (i, ctx) => runChaseValidate(i, ctx as CoreCtx),
  "chase.diff": (i, ctx) => runChaseDiff(i, ctx as CoreCtx),
  "chase.patch": (i, ctx) => runChasePatch(i, ctx as CoreCtx),
  "chase.scaffold": (i, ctx) => runChaseScaffold(i, ctx as CoreCtx),
  "chase.bake": (i, ctx) => runChaseBake(i, ctx as CoreCtx),
};

/** Every CommandDef hbf registers, in COMMAND_NAMES order. */
export const COMMANDS: readonly AnyCommandDef[] = bind(SPECS, RUNS, { programIds: PROGRAM_IDS });

export function commandOf(name: string): AnyCommandDef | undefined {
  return COMMANDS.find((c) => c.name === name);
}

export type { UtilityVerb };
