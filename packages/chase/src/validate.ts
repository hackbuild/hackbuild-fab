// One verdict on a chase value (D-131, D-132): the strict document schema,
// the build path and id rules of the source reader, CHASE_PARAM_RULES, and
// the registry references when registries are given. validateDocument is
// chase.validate (M10-T04) over values already read: migration, these
// errors, the build function, the kind rules over the chase and its bench,
// then the question audit, which never fails.

import { didYouMean, isThrownCommandError, type Chase, type CommandError, type ValidateQuestion } from "@hackbuild/spec";
import { claimRuleErrors, paramRuleErrors, shapeErrors } from "./schema.js";
import { resolveBenchRefs, resolveRefs, type ChaseRegistries } from "./resolve.js";
import { buildPathProblem } from "./source.js";
import { migrateChase, type MigrationReport } from "./migrate/index.js";
import { chaseQuestions, type QuestionFacts } from "./questions.js";

/** Every error of the chase value; [] when it validates. Shape errors stop the later rules, which read the shape. */
export function validateChase(value: unknown, reg?: ChaseRegistries): CommandError[] {
  const shape = shapeErrors(value);
  if (shape.length > 0) return shape;
  const chase = value as Chase;
  const out: CommandError[] = [];
  const problem = buildPathProblem(chase.build.module);
  if (problem !== undefined) {
    out.push({ code: "E_SCHEMA", path: "/build/module", got: chase.build.module, expected: "./<file>.ts inside the design directory", hint: problem, record: "chase-source/build-path" });
  }
  out.push(...paramRuleErrors(chase));
  out.push(...claimRuleErrors(chase));
  if (reg !== undefined) out.push(...resolveRefs(chase, reg));
  return out;
}

/** The kind rules of M10-T04 step 2, record "chase-kind/<rule>". */
export const KIND_RULES = ["rail-end", "surface-rail", "drive-decl", "catalog-items"] as const;
export type KindRule = (typeof KIND_RULES)[number];

/** D-125: the last rail step is the export step, print for one process or make for a kit. */
export const EXPORT_STEPS: readonly string[] = ["print", "make"];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Kind rule errors over the chase and the bench.ts value beside it.
 * Pointers into the bench start at its literal (/rail/3/step) and the
 * hint names bench.ts. The bench is read as data, so each field is
 * guarded before it is read.
 */
export function kindRuleErrors(chase: Chase, bench?: unknown): CommandError[] {
  const out: CommandError[] = [];
  const kind = chase.meta.kind;
  if (kind === "catalog" && (chase.items ?? []).length === 0) {
    out.push({ code: "E_SCHEMA", path: "/items", got: chase.items ?? null, expected: "the chase ids this catalog lists", hint: "list the catalog's chases in items", record: "chase-kind/catalog-items" });
  }
  if (!isRecord(bench)) return out;
  const rail = Array.isArray(bench["rail"]) ? (bench["rail"] as unknown[]) : undefined;
  if (rail !== undefined && kind === "surface") {
    out.push({ code: "E_SCHEMA", path: "/rail", got: rail.length, expected: "no rail on a surface bench", hint: "bench.ts: remove the rail; a surface bench has none", record: "chase-kind/surface-rail" });
  }
  if (rail !== undefined && rail.length > 0 && (kind === "single" || kind === "composer")) {
    const last = rail.length - 1;
    const step = isRecord(rail[last]) ? rail[last]["step"] : undefined;
    if (typeof step !== "string" || !EXPORT_STEPS.includes(step)) {
      out.push({
        code: "E_SCHEMA", path: `/rail/${last}/step`, got: step ?? null, expected: "print or make",
        hint: `bench.ts: end the rail on the export step, print for one process or make for a kit (D-125)`, record: "chase-kind/rail-end",
      });
    }
  }
  const views = isRecord(bench["views"]) ? bench["views"] : undefined;
  const overlays = Array.isArray(views?.["overlays"]) ? (views["overlays"] as unknown[]) : [];
  if (overlays.includes("drive") && views?.["drive"] === undefined) {
    out.push({ code: "E_SCHEMA", path: "/views/drive", got: null, expected: "a drive declaration", hint: "bench.ts: declare views.drive or drop the drive overlay", record: "chase-kind/drive-decl" });
  }
  return out;
}

/** Names a build.ts exports, read from its text without running it: export function, export const and export { a, b as c }. */
export function buildExports(source: string): string[] {
  const out = new Set<string>();
  for (const m of source.matchAll(/^\s*export\s+(?:async\s+)?(?:function\s*\*?|const|let)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]!);
  for (const m of source.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name !== undefined && name !== "" && !name.startsWith("type ")) out.add(name);
    }
  }
  return [...out].sort();
}

/** E_REF when the build module is absent or does not export build.fn. */
export function buildFnErrors(chase: Chase, buildSource: string | undefined): CommandError[] {
  if (buildSource === undefined) {
    return [{ code: "E_REF", path: "/build/module", got: chase.build.module, hint: `add ${chase.build.module} beside chase.ts or name the module that exists`, record: "chase-ref/build-module" }];
  }
  const names = buildExports(buildSource);
  if (names.includes(chase.build.fn)) return [];
  return [{ code: "E_REF", path: "/build/fn", got: chase.build.fn, didYouMean: didYouMean(chase.build.fn, names), hint: `export ${chase.build.fn} from ${chase.build.module} or name an exported function`, record: "chase-ref/build-fn" }];
}

export interface ValidateInputs {
  /** The chase value as read from chase.ts or a stored document. */
  readonly chase: unknown;
  /** The bench.ts value beside the chase, read as data; absent when there is none. */
  readonly bench?: unknown;
  /** The build module text; undefined when the file is absent. Absent key skips the build rule. */
  readonly buildSource?: string | undefined;
  readonly registries?: ChaseRegistries;
  readonly facts?: QuestionFacts;
}

export interface Validation {
  readonly errors: readonly CommandError[];
  readonly questions: readonly ValidateQuestion[];
  /** The migration applied on load; from equals to when none ran. */
  readonly migration: MigrationReport | null;
  /** The chase after migration; null when migration or the shape failed. */
  readonly chase: Chase | null;
}

/** chase.validate over values: errors in step order, then questions when the chase reads. */
export function validateDocument(inputs: ValidateInputs): Validation {
  let migrated: { readonly chase: unknown; readonly report: MigrationReport };
  try {
    migrated = migrateChase(inputs.chase);
  } catch (e) {
    if (isThrownCommandError(e)) return { errors: [e.hbf], questions: [], migration: null, chase: null };
    throw e;
  }
  const errors = validateChase(migrated.chase, inputs.registries);
  if (shapeErrors(migrated.chase).length > 0) return { errors, questions: [], migration: migrated.report, chase: null };
  const chase = migrated.chase as Chase;
  const all = [
    ...errors,
    ...("buildSource" in inputs ? buildFnErrors(chase, inputs.buildSource) : []),
    ...kindRuleErrors(chase, inputs.bench),
    ...(inputs.registries === undefined || inputs.bench === undefined ? [] : resolveBenchRefs(inputs.bench, inputs.registries)),
  ];
  return { errors: all, questions: chaseQuestions(chase, inputs.facts), migration: migrated.report, chase };
}
