// chase.validate (M10-T04 steps 1 to 3, D-131, D-132, D-133; group
// author). Reads chase.ts and the bench.ts beside it as data (D-178),
// never runs either, and hands packages/chase validateDocument the values,
// the build module's text, the registries core assembles and the facts
// the question audit reads: the resistivity row circuit.solve reads per
// material and the exporters whose fabrication flag is set. Errors exit 2
// through the transport table; questions never fail. Writes nothing.
//
// Not run here: the ParamsOf typecheck of build.ts (card step 1), which
// needs tsc, and the slot registry rule (step 2), which waits on the
// widget registry.

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  allFields, buildPathProblem, readBenchSource, readChaseSource, validateDocument,
  type ChaseRegistries, type QuestionFacts, type RowInForce, type ValidateInputs,
} from "@hackbuild/chase";
import { createProfileLookup } from "@hackbuild/profile";
import { isThrownCommandError, type Chase, type CommandError, type CommandInput, type CommandOutput, type ProfileLookup } from "@hackbuild/spec";
import { designsByChaseId } from "../artifact-rebuild.js";
import { chaseRegistries } from "../chase/registries.js";
import type { CoreCtx } from "../ctx.js";
import { cmdError } from "../errors.js";
import { SHEET_EXPORTERS } from "../exporters/index.js";
import { BOARD_EXPORTERS } from "../exporters/board-exporters.js";
import type { CommandOut } from "../result.js";
import { loadWorkspace, workspaceRoot } from "./build.js";

/** Exporters whose ExporterDef.fabrication is true; 3mf is gated (export-run.ts). */
export const FABRICATION_EXPORTS: readonly string[] = [
  "3mf", ...SHEET_EXPORTERS.filter((e) => e.fabrication).map((e) => e.id), ...BOARD_EXPORTERS.filter((e) => e.fabrication).map((e) => e.id),
];

/** The design directory a chase argument names: a directory holding chase.ts, a chase.ts path, or a chase meta.id. */
export function chaseDir(root: string, cwd: string, chase: string): string {
  const abs = path.resolve(cwd, chase);
  if (existsSync(path.join(abs, "chase.ts"))) return abs;
  if (path.basename(abs) === "chase.ts" && existsSync(abs)) return path.dirname(abs);
  const dirs = designsByChaseId(root, chase);
  if (dirs.length === 1) return path.join(root, dirs[0]!);
  throw cmdError({
    code: "E_REF", path: "/chase", got: chase,
    hint: dirs.length > 1 ? `chase id ${chase} names ${dirs.join(" and ")}; name the directory` : "name a design directory holding chase.ts, or a chase meta.id under reference/ or designs/",
  });
}

/** The resistivity row circuit.solve reads per material of the chase (circuit-solve.ts: along, printed, bulk fallback). */
function rowsInForce(chase: Chase, profile: ProfileLookup): Record<string, RowInForce> {
  const out: Record<string, RowInForce> = {};
  for (const m of chase.materials) {
    try {
      const row = profile.resistivity(m.material, "along", "printed");
      out[m.material] = { id: row.id, tier: row.provenance.tier, ohmCm: row.ohmCm };
    } catch {
      // no printed row: the material carries no resistivity the audit can name
    }
  }
  return out;
}

/** Check ids the chase names (expect, waive, row bindings) that resolve in the registry, aliases followed, sorted. */
function resolvedChecks(chase: Chase, reg: ChaseRegistries): string[] {
  const known = new Set(reg.checks.map((c) => c.id));
  const named = [
    ...(chase.expect ?? []).map((e) => e.check as string),
    ...(chase.waive ?? []).map((w) => w.check as string),
    ...allFields(chase).flatMap(([f]) => (f.checks ?? []).map((c) => c as string)),
  ];
  return [...new Set(named.map((id) => reg.checkAliases?.[id] ?? id).filter((id) => known.has(id)))].sort();
}

const rel = (root: string, abs: string): string => path.relative(root, abs).split(path.sep).join("/");

const failed = (ctx: CoreCtx, errors: readonly CommandError[]): CommandOut<CommandOutput<"chase.validate">> => ({
  verdict: "fail", stage: "input", inputsHash: ctx.inputsHash,
  findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors, artifacts: [], next: [],
  result: { questions: [], resolvedChecks: [] },
});

/**
 * The chase.patch validator for one design directory: the errors
 * chase.validate gives for a chase.ts text, with the bench.ts and build
 * module on disk beside it and the workspace registries.
 */
export async function chaseSourceErrors(ctx: CoreCtx, dir: string): Promise<(source: string) => readonly CommandError[]> {
  const root = workspaceRoot(ctx.workspace);
  const ws = await loadWorkspace(root);
  const registries = chaseRegistries(ws.checksSeed);
  const profile = createProfileLookup(ws.tables);
  const label = path.relative(root, dir).split(path.sep).join("/");
  return (text) => {
    const v = validateDir(dir, label, text, registries, profile);
    return "errors" in v ? v.errors : v.validation.errors;
  };
}

type DirValidation = { readonly errors: readonly CommandError[] } | { readonly validation: ReturnType<typeof validateDocument> };

/** chase.validate over one chase.ts text and the files beside it in dir. */
function validateDir(dir: string, label: string, text: string, registries: ChaseRegistries, profile: ProfileLookup): DirValidation {
  const read = <T>(f: () => T): T | CommandError => {
    try {
      return f();
    } catch (e) {
      if (isThrownCommandError(e)) return e.hbf;
      throw e;
    }
  };
  const source = read(() => readChaseSource(text, `${label}/chase.ts`));
  if ("code" in source) return { errors: [source] };
  const benchFile = path.join(dir, "bench.ts");
  let bench: unknown;
  if (existsSync(benchFile)) {
    const b = read(() => readBenchSource(readFileSync(benchFile, "utf8"), `${label}/bench.ts`));
    if ("code" in b) return { errors: [b] };
    bench = b.bench;
  }
  const chase = source.chase;
  const facts: QuestionFacts = { resistivity: rowsInForce(chase, profile), fabricationExports: FABRICATION_EXPORTS };
  let build: Pick<ValidateInputs, "buildSource"> = {};
  if (buildPathProblem(chase.build.module) === undefined) {
    const file = path.join(dir, chase.build.module);
    build = { buildSource: existsSync(file) && statSync(file).isFile() ? readFileSync(file, "utf8") : undefined };
  }
  return { validation: validateDocument({ chase, ...(bench === undefined ? {} : { bench }), ...build, registries, facts }) };
}

export async function runChaseValidate(input: CommandInput<"chase.validate">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"chase.validate">>> {
  const root = workspaceRoot(ctx.workspace);
  const dir = chaseDir(root, ctx.cwd, input.chase);
  const ws = await loadWorkspace(root);
  const registries = chaseRegistries(ws.checksSeed);
  const r = validateDir(dir, rel(root, dir), readFileSync(path.join(dir, "chase.ts"), "utf8"), registries, createProfileLookup(ws.tables));
  if ("errors" in r) return failed(ctx, r.errors);
  const v = r.validation;
  return {
    verdict: v.errors.length > 0 ? "fail" : "pass", stage: v.errors.length > 0 ? "input" : "done", inputsHash: ctx.inputsHash,
    findings: [], counts: { pass: 0, warn: 0, fail: 0, skip: 0 }, errors: v.errors, artifacts: [], next: [],
    result: { questions: v.questions, resolvedChecks: v.chase === null ? [] : resolvedChecks(v.chase, registries) },
  };
}
