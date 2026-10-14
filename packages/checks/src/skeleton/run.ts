// The skeleton registry (M-S-T06): selects every check by appliesTo over the
// targets present (D-173), runs it, stamps id, version, severity and origin
// from its CheckDef, and adds a one-param fix where the check measures its
// driving param (D-064). Nets come from the circuit slice fixture over the
// declared conductor graph. Waivers and expect sets join at M04.

import type {
  AnyCheckDef, ArtifactBytes, BuildWarning, CheckCtx, CheckResult, CheckTarget, ContactElement, Finding, HookupDecl,
  KernelId, McuPinSpec, Net, ParamGroup, Part, PartDraft, PortFeature, ProfileLookup, Ring, ShapeDecl,
} from "@hackbuild/spec";
import { conductorGraph, solveKeys } from "@hackbuild/circuit";
import { MEASURES_PARAM } from "./defs.js";
import { type NumericField } from "../driven-by.js";
import { proposeFix } from "../fix.js";
import { gridAt } from "../nearest.js";
import { withSeverity } from "../severity.js";

/** Kernels with package code the registry can run (inlay from M03-T08); a check needing another skips. */
export const SKELETON_KERNELS: readonly KernelId[] = ["profile", "geom", "mesh", "circuit", "3mf", "inlay"];

export interface SkeletonRunInput {
  /** The Part IR the checks target. */
  readonly part: Part;
  /**
   * The build output the part was meshed from. The circuit slice derives
   * nets from it, and withPlanOutlines fills Body.outline from it where the
   * emitter left it out. No check run body receives it (D-024).
   */
  readonly draft: PartDraft;
  readonly profile: ProfileLookup;
  readonly machine: string;
  /** Chase hookup; handed only to checks whose needs include circuit. */
  readonly hookup: readonly HookupDecl[];
  /** McuPinSpec by catalog id: the catalog mcuPinRow (M05-T02, D-076). */
  readonly mcu: (id: string) => McuPinSpec;
  /** Exported packages for the artifact-level checks. */
  readonly artifacts?: readonly ArtifactBytes[];
  /** Chase params, for the step and range of a fix param. */
  readonly params: readonly ParamGroup[];
  /** The param values this build ran with. */
  readonly values: Readonly<Record<string, unknown>>;
  /** Rebuild with other values, so a fix predicts by re-running the check. Without it no fix is offered. */
  readonly rebuild?: (values: Readonly<Record<string, unknown>>) => Promise<{ readonly part: Part; readonly draft: PartDraft }>;
}

/** Plan outline of a body shape, outer ring first: a prism's outline, a stack's bottom band. */
export function planOutlineOf(base: ShapeDecl): readonly Ring[] | undefined {
  if (base.route === "prism") return base.outline;
  if (base.route === "stack") return base.bands[0]?.outline;
  return undefined;
}

/**
 * The Part IR with Body.outline filled from the draft for every body the
 * emitter left without one (D-224). Stage 7 emit owns this field; until
 * the mesh and core emitters fill it, the registry completes it here, at
 * the kernel side of the check boundary, so check run bodies read the Part
 * IR only. A body that already carries an outline keeps it.
 */
export function withPlanOutlines(part: Part, draft: PartDraft): Part {
  if (part.bodies.every((b) => b.outline !== undefined)) return part;
  return {
    ...part,
    bodies: part.bodies.map((b) => {
      if (b.outline !== undefined) return b;
      const base = draft.bodies.find((d) => d.id === b.id)?.base;
      const outline = base === undefined ? undefined : planOutlineOf(base);
      return outline === undefined ? b : { ...b, outline };
    }),
  };
}

export interface SkeletonReport {
  readonly results: readonly CheckResult[];
  /** Results with a verdict other than skip, count. */
  readonly ran: number;
  /** Skip results, count. */
  readonly skipped: number;
  readonly nets: readonly Net[];
  readonly warnings: readonly BuildWarning[];
}

/**
 * One Net per declared net id, with the charge-release path where a hookup
 * entry reads it. Nets with no read path carry an empty resistance list and
 * a zero total; capacitance is the receiving pin's inputCap alone (trace
 * capacitance arrives at M05), so capMethod has no exact variant yet and
 * names the PIP model it is the first term of.
 */
export function skeletonNets(
  draft: PartDraft, hookup: readonly HookupDecl[], profile: ProfileLookup, mcu: (id: string) => McuPinSpec,
): { readonly nets: Net[]; readonly warnings: readonly BuildWarning[] } {
  const g = conductorGraph(draft);
  const { points, warnings } = solveKeys({ part: draft, hookup, profile, mcu });
  const ports = draft.features.filter((f): f is PortFeature => f.kind === "port");
  const sum = (cs: readonly ContactElement[], end: 0 | 1): number => cs.reduce((s, c) => s + (c.ohm?.[end] ?? 0), 0);
  const nets = [...g.nets].map(([id, conductors]): Net => {
    const pt = points.find((p) => p.net === id);
    const terminals = ports.filter((p) => p.net === id).map((p) => p.id);
    if (pt === undefined) {
      return {
        id, conductors, bodies: [], terminals, resistance: [], bulkOhm: 0, contacts: [], totalOhm: [0, 0],
        unpricedContacts: [], capToGndPf: 0, couplingPf: {}, capMethod: "pip-per-mm", tier: "inferred", qualifier: "unknown",
      };
    }
    const bulk = pt.path.preview.ohm;
    return {
      id, conductors, bodies: [], terminals, resistance: [pt.path], bulkOhm: bulk, contacts: pt.contacts,
      totalOhm: [bulk + sum(pt.contacts, 0), bulk + sum(pt.contacts, 1)],
      unpricedContacts: pt.unpricedContacts, capToGndPf: pt.pinPf.value, couplingPf: {}, capMethod: "pip-per-mm",
      tier: pt.pathOhm.basis ?? "inferred",
      qualifier: pt.read.qualifier,
    };
  });
  return { nets, warnings };
}

function targetsOf(def: AnyCheckDef, part: Part, nets: readonly Net[], artifacts: readonly ArtifactBytes[]): CheckTarget[] {
  const a = def.appliesTo;
  switch (a.level) {
    case "part":
      return [{ level: "part", part }];
    case "feature": {
      const kinds: readonly string[] | undefined = a.kinds;
      return part.features
        .filter((f) => kinds === undefined || kinds.includes(f.kind))
        .map((feature) => ({ level: "feature", part, feature }));
    }
    case "net":
      return nets.map((net) => ({ level: "net", net, part }));
    case "artifact":
      return artifacts.map((artifact) => ({ level: "artifact", artifact }));
    default:
      return [];
  }
}

const idOf = (t: CheckTarget): string =>
  t.level === "feature" ? t.feature.id : t.level === "net" ? t.net.id : t.level === "artifact" ? t.artifact.name : t.level === "part" ? t.part.id : t.level;

// The registry hands a run body only targets of its level and kinds, which keeps the narrowed target true.
const runOf = (def: AnyCheckDef) => def.run as (t: CheckTarget, c: CheckCtx) => readonly Finding[] | Promise<readonly Finding[]>;
const drivenOf = (def: AnyCheckDef) => def.drivenBy as ((t: CheckTarget) => readonly string[]) | undefined;

function stamp(def: AnyCheckDef, f: Finding): CheckResult {
  return withSeverity({ ...f, id: def.id, version: def.version, severity: def.severity, origin: `hbf://check/${def.id}` } as CheckResult);
}

/** The param interval inside [lo, hi] on the field's step grid, counted from range[0]. */
export function steppedInterval(field: NumericField, lo: number, hi: number): readonly [number, number] {
  const [r0, r1] = field.range;
  const a = Math.max(lo, r0);
  const b = Math.min(hi, r1);
  const step = field.step;
  if (step === undefined || step <= 0) return [a, b];
  return [gridAt(a, step, r0, "up"), gridAt(b, step, r0, "down")];
}

/** The one-param fix (fix.ts) for a check that measures its driving param; the skeleton has no solver, so no other check gets one. */
async function fixFor(def: AnyCheckDef, target: CheckTarget, f: Finding, input: SkeletonRunInput, ctx: CheckCtx): Promise<Finding> {
  const rebuild = input.rebuild;
  if (f.verdict !== "fail" || !MEASURES_PARAM.has(def.id) || rebuild === undefined) return f;
  const out = await proposeFix(f, {
    pointers: drivenOf(def)?.(target) ?? [], dims: [], params: input.params, values: input.values, measuresParam: true,
    predict: async (values) => {
      const rebuilt = await rebuild(values);
      const again = targetsOf(def, withPlanOutlines(rebuilt.part, rebuilt.draft), [], []).find((t) => idOf(t) === idOf(target));
      const predicted = again === undefined ? undefined : (await runOf(def)(again, ctx))[0];
      return predicted === undefined ? undefined : { finding: predicted, buildHash: rebuilt.part.buildHash };
    },
  });
  return out.finding;
}

/** Run every check by appliesTo over the part, its nets and the exported packages. */
export async function runSkeleton(defs: readonly AnyCheckDef[], input: SkeletonRunInput): Promise<SkeletonReport> {
  const { nets, warnings } = skeletonNets(input.draft, input.hookup, input.profile, input.mcu);
  const part = withPlanOutlines(input.part, input.draft);
  const results: CheckResult[] = [];
  for (const def of defs) {
    const missingKernel = def.needs.find((k) => !SKELETON_KERNELS.includes(k));
    const ctx: CheckCtx = {
      profile: input.profile, machine: input.machine, whitelist: new Map(),
      ...(def.needs.includes("circuit") ? { hookup: input.hookup } : {}),
    };
    for (const target of targetsOf(def, part, nets, input.artifacts ?? [])) {
      if (missingKernel !== undefined) {
        results.push(stamp(def, {
          verdict: "skip", target: { level: "part", part: part.id }, legal: { kind: "none" }, measured: 0,
          constraint: `kernel ${missingKernel} not registered in the m-s skeleton`,
        }));
        break;
      }
      for (const f of await runOf(def)(target, ctx)) {
        results.push(stamp(def, await fixFor(def, target, f, input, ctx)));
      }
    }
  }
  const skipped = results.filter((r) => r.verdict === "skip").length;
  return { results, ran: results.length - skipped, skipped, nets, warnings };
}

export interface ArtifactRunInput {
  /** Exported packages, each one artifact target. */
  readonly artifacts: readonly ArtifactBytes[];
  readonly profile: ProfileLookup;
  readonly machine: string;
}

/**
 * The artifact-level checks alone, on exported packages with no build
 * (check.run --artifact): no part, draft, nets or rebuild, so no fix is
 * proposed. A def of another level is not run.
 */
export async function runArtifactChecks(defs: readonly AnyCheckDef[], input: ArtifactRunInput): Promise<readonly CheckResult[]> {
  const results: CheckResult[] = [];
  const ctx: CheckCtx = { profile: input.profile, machine: input.machine, whitelist: new Map() };
  for (const def of defs.filter((d) => d.appliesTo.level === "artifact")) {
    const missingKernel = def.needs.find((k) => !SKELETON_KERNELS.includes(k));
    for (const artifact of input.artifacts) {
      if (missingKernel !== undefined) {
        results.push(stamp(def, {
          verdict: "skip", target: { level: "artifact", artifact: artifact.name }, legal: { kind: "none" }, measured: 0,
          constraint: `kernel ${missingKernel} not registered in the m-s skeleton`,
        }));
        continue;
      }
      for (const f of await runOf(def)({ level: "artifact", artifact }, ctx)) results.push(stamp(def, f));
    }
  }
  return results;
}
