// The mechanism def contract (M06-T01, D-095, D-097). A def file under
// src/defs/ builds its MechanismDef through refusedMechanism() until its
// port lands, so tsc refuses a def with a family outside the canon, a
// status that runs, or no original. The zod schema below checks the data
// fields of every def again at load, and its inferred type equals the spec
// data type in both directions.

import { z } from "zod";
import { inputSchema, type InputParam } from "./derive/common.js";
import {
  PROCESSES, commandError,
  type CanonOriginal, type MechanismDef, type MechanismStatus, type Process, type SchemaLike,
} from "@hackbuild/spec";

/** Families of the seed, the D-096 snap family and the M06-T14 families (CANONS.md 2.1, 2.2, 11.3). */
export const MECHANISM_FAMILIES = [
  "logic", "memory", "intermittent", "gears", "motion", "kerf", "fluid", "linkage", "joint", "metering", "snap",
  // The families CANONS.md 11.3 gives the entries registered from the originals (M06-T14, D-222).
  "case", "constraint", "construction", "cosmetic", "device", "fit", "interface", "kind", "machine", "metamaterial", "sheet",
] as const;
export type MechanismFamily = (typeof MECHANISM_FAMILIES)[number];

/** Registry id: a lowercase slug. */
export const CANON_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;

const text = z.string().min(1);
const texts = z.array(text).readonly();

export const originalSchema = z.object({
  slug: z.string().regex(CANON_ID),
  file: z.string().regex(/^files\/[^\s]+$/),
  fn: text.exactOptional(),
  lines: text.exactOptional(),
  sha256: z.string().regex(SHA256),
  record: text,
}).strict().readonly();

/** The data fields of a MechanismDef; derive, apply and params are checked as functions and a schema. */
export const mechanismDataSchema = z.object({
  id: z.string().regex(CANON_ID),
  version: z.string().regex(SEMVER),
  family: z.string().refine((f) => (MECHANISM_FAMILIES as readonly string[]).includes(f), { message: `family is one of ${MECHANISM_FAMILIES.join(", ")}` }),
  dof: z.number().int().nonnegative().nullable(),
  governs: texts,
  failureModes: texts,
  processes: z.array(z.enum(PROCESSES)).readonly(),
  provenance: text,
  reference: texts,
  status: z.enum(["typed", "stub", "candidate", "unproven"]),
  statusReason: text.exactOptional(),
  original: z.array(originalSchema).readonly().exactOptional(),
}).strict().superRefine((d, ctx) => {
  const runs = d.status === "typed";
  if (runs && d.statusReason !== undefined) ctx.addIssue({ code: "custom", path: ["statusReason"], message: "a typed entry carries no refusal reason" });
  if (!runs && d.statusReason === undefined) ctx.addIssue({ code: "custom", path: ["statusReason"], message: `a ${d.status} entry names why it is refused and the card that promotes it` });
  if (runs && d.reference.length === 0) ctx.addIssue({ code: "custom", path: ["reference"], message: "a typed entry names its reference" });
  if (runs && (d.original === undefined || d.original.length === 0)) ctx.addIssue({ code: "custom", path: ["original"], message: "a typed entry names the original it regenerates (D-222)" });
});

/** The spec data fields of a MechanismDef. */
export type MechanismData = Omit<MechanismDef, "derive" | "apply" | "params">;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// Both directions: a field added to spec or to the schema alone fails tsc here.
const dataMatchesSpec: Same<z.infer<typeof mechanismDataSchema>, MechanismData> = true;
const originalMatchesSpec: Same<z.infer<typeof originalSchema>, CanonOriginal> = true;
void dataMatchesSpec; void originalMatchesSpec;

/** No params: a refused entry declares none until its port types them with units. */
export type NoParams = Readonly<Record<string, never>>;
export const noParams = z.object({}).strict() as unknown as SchemaLike<unknown, NoParams>;

/** What a def file states for an entry that is registered and refused. */
export interface RefusedMechanism {
  readonly id: string;
  readonly family: MechanismFamily;
  readonly dof: number | null;
  readonly governs: readonly string[];
  readonly failureModes: readonly string[];
  readonly processes: readonly Process[];
  readonly provenance: string;
  readonly status: Exclude<MechanismStatus, "typed">;
  readonly statusReason: string;
  readonly original: readonly CanonOriginal[];
  /**
   * The params a port has typed with units; derive() still refuses until the
   * entry is promoted, and the port's derive goldens run in the package
   * tests. Absent: no params until the port lands (M06-T01).
   */
  readonly params?: readonly InputParam[];
}

/** A registered entry whose derive() and apply() refuse with E_REF naming the reason. */
export function refusedMechanism(m: RefusedMechanism): MechanismDef<NoParams> {
  const refuse = (): never => {
    throw commandError({
      code: "E_REF",
      path: "/id",
      got: m.id,
      expected: "a typed mechanism",
      hint: `mechanism ${m.id} is ${m.status}: ${m.statusReason}`,
    });
  };
  const { params, ...data } = m;
  return {
    ...data,
    version: "0.1.0",
    params: params === undefined ? noParams : (inputSchema(params) as unknown as SchemaLike<unknown, NoParams>),
    reference: [],
    derive: refuse,
    apply: refuse,
  };
}
