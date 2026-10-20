// The claim function registry (R1-engine-11, PLAN.md 3.2: the bench, the
// studio and the check call the same function). A claim function turns the
// metrics of one build into one number in its unit, pure and synchronous
// like ContactFn (spec/build.ts): no profile reads, no clock, nothing but
// the metrics, the claim's args and, for contact.at, the design's own
// ContactFn. CHK-CLAIM-01 holds that number to the chase's band
// (spec/claims.ts); core feeds the ids to ChaseRegistries.claimFns so a
// chase naming an unregistered function is E_REF at chase.validate.

import { commandError, type ContactFn, type Metric, type ThrownCommandError } from "@hackbuild/spec";

/** Claim arguments as a chase declares them (ClaimDecl.args); units in the key suffix. */
export type ClaimArgs = Readonly<Record<string, number | string>>;

/** One argument a claim function accepts. */
export interface ClaimInput {
  readonly type: "number" | "string";
  /** Unit of a number argument, for example "mm". */
  readonly unit?: string;
  /** True when the claim may leave it out. */
  readonly optional?: true;
  readonly help: string;
}

/** What a claim function may read besides the metrics: the design's contact function, for contact.at. */
export interface ClaimCtx {
  readonly contact?: ContactFn;
}

export interface ClaimFnDef {
  /** The arguments it accepts, by name; any other name is E_SCHEMA. */
  readonly inputs: Readonly<Record<string, ClaimInput>>;
  /** Unit of the number fn returns; a claim's want.unit must equal it. */
  readonly unit: string;
  /**
   * Metric names it reads, under the `at` prefix; a name ending in "." reads
   * every metric under it. The claim's qualification is taken over these.
   * Absent: every metric of the build.
   */
  readonly reads?: readonly string[];
  readonly fn: (metrics: readonly Metric[], args: ClaimArgs, ctx: ClaimCtx) => number;
  /** The curve behind the number, for plot.curve: x in the input's unit, y in `unit`. */
  readonly curve?: (metrics: readonly Metric[], args: ClaimArgs, ctx: ClaimCtx) => readonly { readonly x: number; readonly y: number }[];
}

export interface RegisteredClaimFn extends ClaimFnDef {
  readonly id: string;
}

const REGISTRY = new Map<string, RegisteredClaimFn>();

const ID_RE = /^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/;

/** Register one claim function. A malformed or second id is E_SCHEMA: one implementation of each. */
export function registerClaimFn(id: string, def: ClaimFnDef): void {
  if (!ID_RE.test(id)) {
    throw commandError({ code: "E_SCHEMA", path: `/claimFns/${id}`, got: id, expected: String(ID_RE), hint: "name a claim function family.name, for example spring.peak", record: "chase-claim/fn" });
  }
  if (REGISTRY.has(id)) {
    throw commandError({ code: "E_SCHEMA", path: `/claimFns/${id}`, got: id, expected: "an id not yet registered", hint: `claim function ${id} is registered twice; keep one`, record: "chase-claim/fn" });
  }
  REGISTRY.set(id, { id, ...def });
}

/** Registered claim function ids, sorted: ChaseRegistries.claimFns. */
export function claimFnIds(): readonly string[] {
  return [...REGISTRY.keys()].sort();
}

/** The registered function, or E_REF naming the ids there are. */
export function claimFn(id: string): RegisteredClaimFn {
  const def = REGISTRY.get(id);
  if (def === undefined) {
    throw commandError({ code: "E_REF", path: "/fn", got: id, expected: claimFnIds().join(", "), hint: `no claim function ${id} is registered`, record: "chase-ref/claim-fn" });
  }
  return def;
}

/** The metric id of `name` under the claim's `at` prefix (an archetype key, for example click-spring-key.0). */
export function metricId(args: ClaimArgs, name: string): string {
  const at = args["at"];
  return typeof at === "string" && at !== "" ? `${at}.${name}` : name;
}

/** E_PARAM_MISSING for a metric a claim function needs and the build does not carry. */
export function noMetric(id: string, hint: string): ThrownCommandError {
  return commandError({ code: "E_PARAM_MISSING", path: `/metrics/${id}`, hint, record: "chase-claim/metric" });
}

/** A numeric metric by full id; absent or not a number is E_PARAM_MISSING. */
export function metricNum(metrics: readonly Metric[], id: string, hint: string): number {
  const v = metrics.find((m) => m.id === id)?.value;
  if (typeof v !== "number" || !Number.isFinite(v)) throw noMetric(id, hint);
  return v;
}

/** A number argument; absent or not a finite number is E_PARAM_MISSING. */
export function numArg(args: ClaimArgs, name: string): number {
  const v = args[name];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw commandError({ code: "E_PARAM_MISSING", path: `/args/${name}`, hint: `the claim function needs a number ${name}`, record: "chase-claim/args" });
  }
  return v;
}
