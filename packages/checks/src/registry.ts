// The check registry (M04-T01, D-064, D-065, D-173). Each check is one
// module under src/defs/<family>/<id>.ts exporting a run body and, where it
// applies, drivenBy; a check whose run lands later exports the milestone
// instead. Every other CheckDef field is read from the seed row, so the
// seed stays the single source for titles, versions and origins.
//
// runRegistry selects every registered check by appliesTo over the targets
// present (a chase cannot deselect one, D-173), applies the skip rule
// before calling run, and stamps id, version, severity and origin onto each
// finding. A NaN or missing measured value is E_PARAM_MISSING, never a fail
// verdict (D-064), and a finding whose legal kind disagrees with its seed
// row is E_SCHEMA. Every registered check returns at least one result, run
// or skip, and no skip lacks a reason.

import type {
  AnyCheckDef, ArtifactBytes, Assembly, CheckCtx, CheckDef, CheckId, CheckTarget, CheckLevel, CheckResult, CheckUri, FeatureKind,
  Finding, KernelId, MilestoneId, Net, PageSnapshot, Part, ProjectGraph, ResultTarget, Sheet, SourceFile, TargetOf,
} from "@hackbuild/spec";
import type { FilamentTemplate } from "@hackbuild/3mf";
import { loadSeed, type SeedCheck } from "./loader.js";
import { skipReason } from "./skip.js";
import { failedOn, failedPreconditions, gatedBy, partsOfTarget, preconditionIds, preconditionReason, runOrder, withSeverity } from "./severity.js";
import { checkError } from "./skeleton/common.js";
import type { KernelViews, RegistryCtx } from "./views.js";

/** What the module factories may read besides the target and the context. */
export interface CheckSources {
  /** Parsed packages/checks/seed/checks.seed.json. */
  readonly seed: unknown;
  /** packages/3mf/data/filament_template.json through filamentTemplate(); the 3MF artifact checks read it. */
  readonly filamentTemplate?: FilamentTemplate;
}

type RunOf<L extends CheckLevel, K extends FeatureKind> =
  (target: TargetOf<L, K>, ctx: CheckCtx, src: CheckSources) => readonly Finding[] | Promise<readonly Finding[]>;

/** One check module: a run body, or the milestone that lands it. */
export interface CheckModule<L extends CheckLevel = CheckLevel, K extends FeatureKind = FeatureKind> {
  readonly id: CheckId;
  /** Must equal the seed row's appliesTo.level; the loader refuses a mismatch. */
  readonly level: L;
  readonly run?: RunOf<L, K>;
  readonly drivenBy?: (target: TargetOf<L, K>) => readonly string[];
  /** Milestone that lands the run body; present exactly when run is absent. */
  readonly pending?: MilestoneId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyCheckModule = { [L in CheckLevel]: CheckModule<L, any> }[CheckLevel];

/** A module as written; refuses a module with both or neither of run and pending. */
export function defineCheck<L extends CheckLevel, K extends FeatureKind = FeatureKind>(m: CheckModule<L, K>): CheckModule<L, K> {
  if ((m.run === undefined) === (m.pending === undefined)) {
    throw checkError({
      code: "E_SCHEMA", path: `/defs/${m.id}`, got: m.run === undefined ? "neither" : "both", expected: "run or pending",
      hint: `check module ${m.id} exports a run body or the milestone that lands it, never both`, record: "verification",
    });
  }
  return m;
}

/** A registered check: the spec CheckDef plus the seed row it came from. */
export type RegisteredCheck = AnyCheckDef & { readonly seed: SeedCheck };

const uriOf = (id: CheckId): CheckUri => `hbf://check/${id}` as CheckUri;

const PROJECT: ResultTarget = { level: "project" };

/** Join the seed with the modules; every row needs one module and every module one row. */
export function registerChecks(src: CheckSources, modules: readonly AnyCheckModule[]): readonly RegisteredCheck[] {
  const rows = loadSeed(src.seed);
  const byId = new Map<string, AnyCheckModule>();
  modules.forEach((m, i) => {
    if (byId.has(m.id)) {
      throw checkError({ code: "E_SCHEMA", path: `/defs/${i}`, got: m.id, expected: "one module per check", hint: `two modules register ${m.id}`, record: "verification" });
    }
    byId.set(m.id, m);
  });
  const rowIds = new Set(rows.map((r) => r.id as string));
  for (const m of modules) {
    if (!rowIds.has(m.id)) {
      throw checkError({ code: "E_REF", path: `/defs/${m.id}`, got: m.id, hint: `module ${m.id} has no seed row; add the row before the run body`, record: "verification" });
    }
  }
  return rows.map((row, i) => {
    const m = byId.get(row.id);
    if (m === undefined) {
      throw checkError({ code: "E_REF", path: `/checks/${i}/id`, got: row.id, hint: `seed row ${row.id} has no module under packages/checks/src/defs`, record: "verification" });
    }
    if (m.level !== row.appliesTo.level) {
      throw checkError({
        code: "E_SCHEMA", path: `/checks/${i}/appliesTo/level`, got: row.appliesTo.level, expected: m.level,
        hint: `seed row ${row.id} applies to ${row.appliesTo.level}; its module reads ${m.level}`, record: "verification",
      });
    }
    const pending = m.pending ?? row.pending;
    const body = m.run;
    const pendingSkip: readonly Finding[] = [{ verdict: "skip", target: PROJECT, legal: { kind: "none" }, measured: "not run", constraint: `run lands ${pending ?? "unknown"}` }];
    const run = body === undefined
      ? (): readonly Finding[] => pendingSkip
      : (t: never, ctx: CheckCtx) => (body as RunOf<CheckLevel, FeatureKind>)(t, ctx, src);
    const def: CheckDef = {
      id: row.id, version: row.version, title: row.title, appliesTo: row.appliesTo, severity: row.severity,
      ...(row.precondition === true ? { precondition: true as const } : {}),
      origin: row.origin, needs: row.needs, legalKind: row.legalKind, status: row.status,
      ...(pending === undefined ? {} : { pending }),
      ...(row.constraint === undefined ? {} : { constraint: row.constraint }),
      ...(m.drivenBy === undefined ? {} : { drivenBy: m.drivenBy as NonNullable<CheckDef["drivenBy"]> }),
      run: run as CheckDef["run"],
    };
    return { ...(def as AnyCheckDef), seed: row } as RegisteredCheck;
  });
}

/** The targets of one registry run, by level. A level left undefined has no producer yet. */
export interface TargetSet {
  readonly parts?: readonly Part[];
  readonly assemblies?: readonly Assembly[];
  readonly sheets?: readonly { readonly sheet: Sheet; readonly parts: readonly Part[] }[];
  readonly nets?: readonly { readonly net: Net; readonly part: Part }[];
  readonly artifacts?: readonly ArtifactBytes[];
  readonly sources?: readonly SourceFile[];
  readonly pages?: readonly PageSnapshot[];
  readonly project?: ProjectGraph;
}

/** Levels whose producer is present in the set: parts give part, body and feature. */
export function producedLevels(t: TargetSet): ReadonlySet<CheckLevel> {
  const out = new Set<CheckLevel>();
  if (t.parts !== undefined) for (const l of ["part", "body", "feature"] as const) out.add(l);
  if (t.assemblies !== undefined) out.add("assembly");
  if (t.sheets !== undefined) out.add("sheet");
  if (t.nets !== undefined) out.add("net");
  if (t.artifacts !== undefined) out.add("artifact");
  if (t.sources !== undefined) out.add("source");
  if (t.pages !== undefined) out.add("page");
  if (t.project !== undefined) out.add("project");
  return out;
}

export interface RegistryRun {
  /** Kernels core registered into KernelCtx. */
  readonly kernels: ReadonlySet<KernelId>;
  /** Target levels a registered producer emits; producedLevels(targets) when absent. */
  readonly produced?: ReadonlySet<CheckLevel>;
  readonly targets: TargetSet;
  /** profile, machine, whitelist, sim and hookup; hookup reaches circuit checks only. */
  readonly ctx: CheckCtx;
  readonly views?: KernelViews;
  /**
   * The chase's expected-violation sets (D-074). Each def's run sees the
   * entries naming it in CheckCtx.expect, and its findings may then carry
   * the exactSet legal kind of an expect finding (expect.ts).
   */
  readonly expect?: readonly { readonly check: string; readonly target: string; readonly verdict: "fail" | "warn"; readonly set?: readonly string[] }[];
}

export interface RegistryReport {
  readonly results: readonly CheckResult[];
  /** Results with a verdict other than skip, count. */
  readonly ran: number;
  /** Skip results, count. */
  readonly skipped: number;
}

/** Every target of a def's level and selection in the set. */
export function targetsFor(def: AnyCheckDef, t: TargetSet): readonly unknown[] {
  const a = def.appliesTo;
  const kinds = a.kinds as readonly string[] | undefined;
  const joints = a.joints as readonly string[] | undefined;
  const asserts = a.assertions as readonly string[] | undefined;
  const assertOk = (list: readonly { readonly type: string }[]): boolean => asserts === undefined || list.some((x) => asserts.includes(x.type));
  const parts = t.parts ?? [];
  switch (a.level) {
    case "part":
      return parts.filter((p) => assertOk(p.assertions)).map((part) => ({ level: "part", part }));
    case "body":
      return parts.flatMap((part) => part.bodies.map((body) => ({ level: "body", part, body })));
    case "feature":
      return parts.flatMap((part) => part.features
        .filter((f) => kinds === undefined || kinds.includes(f.kind))
        .map((feature) => ({ level: "feature", part, feature })));
    case "assembly":
      return (t.assemblies ?? [])
        .filter((x) => (joints === undefined || x.joints.some((j) => joints.includes(j.kind))) && assertOk(x.assertions))
        .map((assembly) => ({ level: "assembly", assembly }));
    case "sheet":
      return (t.sheets ?? []).map((s) => ({ level: "sheet", sheet: s.sheet, parts: s.parts }));
    case "net":
      return (t.nets ?? []).map((n) => ({ level: "net", net: n.net, part: n.part }));
    case "artifact":
      return (t.artifacts ?? []).map((artifact) => ({ level: "artifact", artifact }));
    case "source":
      return (t.sources ?? []).map((source) => ({ level: "source", source }));
    case "page":
      return (t.pages ?? []).map((page) => ({ level: "page", page }));
    case "project":
      return t.project === undefined ? [] : [{ level: "project", project: t.project }];
  }
}

function skipResult(def: AnyCheckDef, reason: string, target: ResultTarget = PROJECT): CheckResult {
  return {
    id: def.id, version: def.version, severity: def.severity, origin: uriOf(def.id),
    verdict: "skip", target, legal: { kind: "none" }, measured: "not run", constraint: reason,
  };
}

/** The ResultTarget a gated check reports its skip on. */
function resultTargetOf(t: unknown): ResultTarget {
  const x = t as { level: CheckLevel; part?: Part; body?: { id: string }; feature?: { id: string }; assembly?: { id: string } };
  if (x.level === "body" && x.part !== undefined && x.body !== undefined) return { level: "body", part: x.part.id, body: x.body.id };
  if (x.level === "feature" && x.part !== undefined && x.feature !== undefined) return { level: "feature", part: x.part.id, feature: x.feature.id };
  if (x.level === "assembly" && x.assembly !== undefined) return { level: "assembly", assembly: x.assembly.id };
  if (x.part !== undefined) return { level: "part", part: x.part.id };
  return PROJECT;
}

/** Stamp a finding with its CheckDef; refuse a missing measured value or a legal kind the seed does not declare. */
export function stamp(def: AnyCheckDef, f: Finding, expecting = false): CheckResult {
  const m = (f as { measured?: unknown }).measured;
  if (m === undefined || m === null || (typeof m === "number" && !Number.isFinite(m))) {
    throw checkError({
      code: "E_PARAM_MISSING", path: `/checks/${def.id}/measured`, got: String(m),
      hint: `${def.id} produced no measured value; declare the value it reads and run again`, record: def.id,
    });
  }
  if (f.legal.kind !== def.legalKind && !(f.verdict === "skip" && f.legal.kind === "none") && !(f.legal.kind === "exactSet" && expecting)) {
    throw checkError({
      code: "E_SCHEMA", path: `/checks/${def.id}/legal/kind`, got: f.legal.kind, expected: def.legalKind,
      hint: `${def.id} returned legal kind ${f.legal.kind}; its seed row declares ${def.legalKind}`, record: def.id,
    });
  }
  return withSeverity({ ...f, id: def.id, version: def.version, severity: def.severity, origin: uriOf(def.id) } as CheckResult);
}

const runOf = (def: AnyCheckDef) => def.run as (t: unknown, c: CheckCtx) => readonly Finding[] | Promise<readonly Finding[]>;

/**
 * Run every def over the set: skip rule first, then each target. Precondition
 * checks run first (D-067); a check that reads the solid of a part a
 * precondition failed on returns skip naming it. Results keep def order.
 */
export async function runRegistry(defs: readonly AnyCheckDef[], input: RegistryRun): Promise<RegistryReport> {
  const produced = input.produced ?? producedLevels(input.targets);
  const order = preconditionIds(defs);
  const slots: CheckResult[][] = defs.map(() => []);
  for (const at of runOrder(defs)) {
    const def = defs[at]!;
    const results = slots[at]!;
    const reason = skipReason({ needs: def.needs, target: def.appliesTo.level, pending: def.pending ?? null }, input.kernels, produced);
    if (reason !== null) {
      results.push(skipResult(def, reason));
      continue;
    }
    const { hookup, ...base } = input.ctx;
    const expect = (input.expect ?? []).filter((e) => e.check === def.id).map(({ check: _c, ...e }) => e);
    const ctx: RegistryCtx = {
      ...base,
      ...(def.needs.includes("circuit") && hookup !== undefined ? { hookup } : {}),
      ...(input.views === undefined ? {} : { views: input.views }),
      ...(expect.length === 0 ? {} : { expect }),
    };
    const failed = failedPreconditions(slots.flat(), order);
    for (const target of targetsFor(def, input.targets)) {
      const gate = gatedBy(def, failedOn(failed, partsOfTarget(target as CheckTarget), order), order);
      if (gate !== null) {
        results.push(skipResult(def, preconditionReason(gate), resultTargetOf(target)));
        continue;
      }
      for (const f of await runOf(def)(target, ctx)) results.push(stamp(def, f, expect.length > 0));
    }
    if (results.length === 0) results.push(skipResult(def, `no ${def.appliesTo.level} target in this build`));
  }
  const results = slots.flat();
  const skipped = results.filter((r) => r.verdict === "skip").length;
  return { results, ran: results.length - skipped, skipped };
}
