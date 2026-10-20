// constraints.query (M01-T05, D-106, spec/commands.ts CommandIO). Dim form:
// the raw interval on one dim from the facts given, for canon and
// reference work. Param form: build the chase, bind each pointer to its
// dim and features, and answer a ParamEnvelope. An empty interval is the
// answer, verdict fail with E_UNSAT in errors (spec/errors.ts
// ERROR_TRANSPORT); next names the dim that moves the binding floor when
// that query runs as written.

import type {
  CommandError, CommandInput, ConstraintCtx, ConstraintDim, Interval, NextCall, ParamEnvelope, ParamPointer, Part, ProfileLookup,
} from "@hackbuild/spec";
import { forParams, solve, unknownDimError, type CeilingText, type ConstraintRegistry, type QueryResult } from "@hackbuild/constraints";
import { SLICE, createProfileLookup } from "@hackbuild/profile";
import { cmdError, didYouMean } from "../errors.js";
import { fmtIn } from "../text/fmt.js";
import { fullProfile } from "../load-build.js";
import { loadConstraints } from "../load/constraints.js";
import type { CoreCtx } from "../ctx.js";
import type { CommandOut } from "../result.js";
import type { Built, Values } from "./build.js";
import { buildTarget } from "./part-build.js";
import { bindPointers, featureMaterial, partFacts } from "./param-bindings.js";

type Input = CommandInput<"constraints.query">;
type Facts = Readonly<Record<string, number | string | boolean>>;
export type QueryOutput = Interval | ParamEnvelope;

/** The machine a query reads when neither the input nor a chase names one: the profile slice's machine (ffc5p). */
export const DEFAULT_MACHINE: string = SLICE.machines[0];

let loaded: ConstraintRegistry | undefined;

/** Every def core collects at load (D-044), registered once per process. */
export function constraintRegistry(): ConstraintRegistry {
  loaded ??= loadConstraints();
  return loaded;
}

const ZERO = { pass: 0, warn: 0, fail: 0, skip: 0 } as const;

/** The ceiling in a solver-worded E_UNSAT expected line, as a ceiling prints: rounded down at the unit's precision. */
const CEILING_TEXT: CeilingText = (v, unit) => fmtIn(unit, v, "down");

/** Dim form refuses the param-form fields (spec CommandIO). */
const PARAM_ONLY = ["pointers", "params", "preset"] as const;

function missing(path: string, expected: string, hint: string): never {
  throw cmdError({ code: "E_PARAM_MISSING", path, expected, hint });
}

/** A profile lookup that has proved material (when one is named) and machine exist; E_REF with didYouMean otherwise. */
function lookupFor(material: string, machine: string): ProfileLookup {
  const profile = createProfileLookup(fullProfile());
  if (material !== "") profile.material(material);
  profile.machine(machine);
  return profile;
}

/**
 * The next call on E_UNSAT: the same query on the dim that moves the
 * binding floor. Withheld unless that query runs as written (a NextCall
 * never returns E_REF or E_PARAM_MISSING, spec/commands.ts NextCall).
 */
function nextFor(reg: ConstraintRegistry, r: QueryResult, ctx: ConstraintCtx, args: Readonly<Record<string, unknown>>): NextCall[] {
  if (r.unsat === null || r.nextDim === null || r.nextDim === r.interval.dim) return [];
  try {
    solve(reg, r.nextDim, ctx);
  } catch {
    return [];
  }
  return [{ command: "constraints.query", args: { ...args, dim: r.nextDim }, why: `${r.nextDim} moves the binding floor of ${r.interval.dim}` }];
}

interface FromChase {
  readonly chase: string;
  readonly built: Built;
  readonly part: Part;
  /** Facts the part declares, overridden key by key by the input's. */
  readonly facts: Facts;
}

async function chaseFacts(input: Input, ctx: CoreCtx): Promise<FromChase> {
  const chase = input.chase ?? missing("/chase", "a design or reference directory, or a chase id", "the param form builds a chase; pass --chase <id>, or give a dim");
  const built = await buildTarget(chase, ctx, input.params as Values | undefined, input.preset);
  return { chase, built, part: built.part, facts: { ...partFacts(built.design.chase, built.values, built.part), ...input.facts } };
}

async function dimForm(input: Input, dim: ConstraintDim, ctx: CoreCtx, reg: ConstraintRegistry): Promise<CommandOut<QueryOutput>> {
  for (const k of PARAM_ONLY) {
    if (input[k] !== undefined) {
      throw cmdError({ code: "E_SCHEMA", path: `/${k}`, got: input[k], expected: "absent when dim is set", hint: `drop ${k}; the dim form reads facts only, and the param form takes no dim` });
    }
  }
  if (reg.defsFor(dim).length === 0) throw unknownDimError(dim, reg.dims());

  let from: FromChase | undefined;
  if (input.chase !== undefined) from = await chaseFacts(input, ctx);
  else if (input.feature !== undefined) missing("/chase", "a chase the feature belongs to", "a feature is read from a built chase; pass --chase <id>");

  let feature: Part["features"][number] | undefined;
  if (from !== undefined && input.feature !== undefined) {
    const ids = from.part.features.map((f) => f.id);
    feature = from.part.features.find((f) => f.id === input.feature);
    if (feature === undefined) throw cmdError({ code: "E_REF", path: "/feature", got: input.feature, expected: "a feature id of the built part", didYouMean: didYouMean(input.feature, ids), hint: "unknown feature; name one the chase builds" });
  }
  // A dim whose defs list no profile kernel reads no material row (port.pullup reads the catalog pin row), so it needs no material.
  const readsProfile = reg.defsFor(dim).some((d) => d.kernels.includes("profile"));
  const material = input.material
    ?? (from === undefined ? undefined : featureMaterial(from.part, feature?.id ?? ""))
    ?? (readsProfile ? missing("/material", "a profile material id", "the query reads material rows; pass --material <id>") : "");
  const machine = input.machine ?? from?.part.machine ?? DEFAULT_MACHINE;
  const facts: Facts = from?.facts ?? input.facts ?? {};

  const qctx: ConstraintCtx = {
    profile: lookupFor(material, machine), machine, material, facts,
    ...(from === undefined ? {} : { part: from.part }), ...(feature === undefined ? {} : { feature }),
  };
  const r = solve(reg, dim, qctx, CEILING_TEXT);
  const args = {
    ...(material === "" ? {} : { material }), machine, facts,
    ...(from === undefined ? {} : { chase: from.chase }), ...(input.feature === undefined ? {} : { feature: input.feature }),
  };
  return {
    verdict: r.unsat === null ? "pass" : "fail",
    stage: r.unsat === null ? "done" : "check",
    inputsHash: ctx.inputsHash,
    ...(from === undefined ? {} : { buildHash: from.part.buildHash }),
    result: r.interval,
    findings: [], counts: { ...ZERO }, errors: r.unsat === null ? [] : [r.unsat], artifacts: [],
    next: nextFor(reg, r, qctx, args),
  };
}

async function paramForm(input: Input, ctx: CoreCtx, reg: ConstraintRegistry): Promise<CommandOut<QueryOutput>> {
  const from = await chaseFacts(input, ctx);
  const built = from.part;
  const scan = bindPointers(from.built.design.chase, from.built.values, built, input.pointers as readonly ParamPointer[] | undefined);
  const params: Record<ParamPointer, Interval> = {};
  const errors: CommandError[] = [];
  const next: NextCall[] = [];
  for (const b of scan.bindings) {
    if (reg.defsFor(b.dim).length === 0) {
      const e = unknownDimError(b.dim, reg.dims()).hbf;
      throw cmdError({ ...e, path: b.param, hint: `param ${b.param} declares constraintDim ${b.dim}, which no registered constraint names; fix the chase or register a def` });
    }
    const material = input.material ?? featureMaterial(built, b.features[0]!)
      ?? missing("/material", "a profile material id", `no body material for ${b.param}; pass --material <id>`);
    const machine = input.machine ?? built.machine;
    const qctx: ConstraintCtx = { profile: lookupFor(material, machine), machine, material, facts: from.facts, part: built };
    const s = forParams(reg, built, [b], qctx, CEILING_TEXT);
    Object.assign(params, s.envelope.params);
    for (const u of s.unsat) {
      errors.push(u.error);
      const r: QueryResult = { interval: params[u.param]!, owners: { lo: [], hi: [] }, unsat: u.error, nextDim: u.nextDim };
      // The next call is a dim-form query, so it is tried as one: no part, no feature.
      next.push(...nextFor(reg, r, { profile: qctx.profile, machine, material, facts: from.facts }, { material, machine, facts: from.facts }));
    }
  }
  const envelope: ParamEnvelope = { buildHash: built.buildHash, params, unbound: scan.unbound };
  return {
    verdict: errors.length === 0 ? "pass" : "fail",
    stage: errors.length === 0 ? "done" : "check",
    inputsHash: ctx.inputsHash, buildHash: built.buildHash,
    result: envelope,
    findings: [], counts: { ...ZERO }, errors, artifacts: [], next,
  };
}

/** constraints.query against a registry; the CLI passes the one core loads. */
export async function runConstraintsQuery(input: Input, ctx: CoreCtx, reg: ConstraintRegistry = constraintRegistry()): Promise<CommandOut<QueryOutput>> {
  return input.dim === undefined ? paramForm(input, ctx, reg) : dimForm(input, input.dim, ctx, reg);
}
