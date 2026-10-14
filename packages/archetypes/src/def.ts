// The archetype def contract (M06-T01, D-095, D-165, D-098). A def file
// under src/defs/ builds its ArchetypeDef through refusedArchetype() until
// its port lands, so tsc refuses a def with a family outside the spec
// union, a feature kind outside the registry, a status that runs, or no
// original. The zod schema below checks the data fields of every def again
// at load, and its inferred type equals the spec data type in both
// directions.

import { z } from "zod";
import {
  FEATURE_KINDS, commandError,
  type ArchetypeDef, type ArchetypeStatus, type CanonOriginal, type ConductorSection, type FeatureKind, type ReadModelKind, type SchemaLike, type Tier,
} from "@hackbuild/spec";

export const ARCHETYPE_FAMILIES = [
  "printed", "copper", "board", "printed-or-copper",
  // The kinds of entry CANONS.md 11.3 registers from the originals (M06-T14, D-222).
  "check", "constraint", "construction", "coupon", "design-rule", "firmware", "kernel", "read-model", "system", "tool",
] as const;
export type ArchetypeFamily = (typeof ARCHETYPE_FAMILIES)[number];

/**
 * The seed family each spec family reads from. The seed's board-or-copper
 * sits outside the spec union; its three rows need the M08 board backend,
 * so they map to board (CANONS.md 4, M06-T01).
 */
export const SEED_FAMILY = {
  printed: "printed",
  copper: "copper",
  board: "board",
  "printed-or-copper": "printed-or-copper",
  "board-or-copper": "board",
} as const satisfies Record<string, ArchetypeFamily>;

/** D-078 read models plus none (CANONS.md 1.5). Typed against spec below. */
export const READS = ["pullup", "rc-time", "slide", "charge-release", "adc", "ratiometric", "column-scan", "ladder", "none"] as const;
type ReadsMatchSpec = [(typeof READS)[number]] extends [ReadModelKind | "none"] ? ([ReadModelKind | "none"] extends [(typeof READS)[number]] ? true : false) : false;
const readsMatchSpec: ReadsMatchSpec = true;
void readsMatchSpec;

/** Registry id: a lowercase slug. */
export const CANON_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const TIER_VALUES = ["verified", "measured", "vendor", "community", "inferred"] as const satisfies readonly Tier[];

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

export const sectionSchema = z.object({
  id: text,
  material: text,
  direction: z.enum(["along", "across", "through", "bulk"]),
  widthMm: z.number().positive(),
  thicknessMm: z.number().positive(),
  lengthMm: z.number().positive(),
  series: z.number().int().positive().exactOptional(),
  source: text,
}).strict().readonly();

/** The data fields of an ArchetypeDef; derive, apply and params are checked as functions and a schema. */
export const archetypeDataSchema = z.object({
  id: z.string().regex(CANON_ID),
  version: z.string().regex(SEMVER),
  family: z.enum(ARCHETYPE_FAMILIES),
  channels: z.number().int().nonnegative().nullable(),
  senses: texts,
  emits: z.array(z.enum(FEATURE_KINDS)).readonly(),
  read: z.enum(READS),
  limits: texts,
  tier: z.enum(TIER_VALUES),
  provenance: text,
  reference: texts,
  status: z.enum(["proven", "stub", "candidate", "unproven"]),
  statusReason: text.exactOptional(),
  original: z.array(originalSchema).readonly().exactOptional(),
  sections: z.array(sectionSchema).readonly().exactOptional(),
}).strict().superRefine((d, ctx) => {
  const runs = d.status === "proven";
  if (runs && d.statusReason !== undefined) ctx.addIssue({ code: "custom", path: ["statusReason"], message: "a proven entry carries no refusal reason" });
  if (!runs && d.statusReason === undefined) ctx.addIssue({ code: "custom", path: ["statusReason"], message: `a ${d.status} entry names why it is refused and the card that promotes it` });
  if (runs && d.reference.length === 0) ctx.addIssue({ code: "custom", path: ["reference"], message: "a proven entry names its reference" });
  if (runs && (d.original === undefined || d.original.length === 0)) ctx.addIssue({ code: "custom", path: ["original"], message: "a proven entry names the original it regenerates (D-222)" });
});

/** The spec data fields of an ArchetypeDef. */
export type ArchetypeData = Omit<ArchetypeDef, "derive" | "apply" | "params">;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// Both directions: a field added to spec or to the schema alone fails tsc here.
const dataMatchesSpec: Same<z.infer<typeof archetypeDataSchema>, ArchetypeData> = true;
const originalMatchesSpec: Same<z.infer<typeof originalSchema>, CanonOriginal> = true;
const sectionMatchesSpec: Same<z.infer<typeof sectionSchema>, ConductorSection> = true;
void dataMatchesSpec; void originalMatchesSpec; void sectionMatchesSpec;

/** No params: a refused entry declares none until its port types them with units. */
export type NoParams = Readonly<Record<string, never>>;
export const noParams = z.object({}).strict() as unknown as SchemaLike<unknown, NoParams>;

/** What a def file states for an entry that is registered and refused. */
export interface RefusedArchetype {
  readonly id: string;
  readonly family: ArchetypeFamily;
  readonly channels: number | null;
  readonly senses: readonly string[];
  readonly emits: readonly FeatureKind[];
  readonly read: ReadModelKind | "none";
  readonly limits: readonly string[];
  readonly provenance: string;
  readonly status: Exclude<ArchetypeStatus, "proven">;
  readonly statusReason: string;
  readonly original: readonly CanonOriginal[];
  /** Declared conductor paths, when the seed or the original states a section (M06-T07 step 3). */
  readonly sections?: readonly ConductorSection[];
}

/**
 * A registered entry whose derive() and apply() refuse with E_REF naming
 * the reason. Its tier is inferred, the lowest rung (D-083), until
 * resistances(profile) computes it from the rows the port reads (M06-T07).
 */
export function refusedArchetype(a: RefusedArchetype): ArchetypeDef<NoParams> {
  const refuse = (): never => {
    throw commandError({
      code: "E_REF",
      path: "/id",
      got: a.id,
      expected: "a proven archetype",
      hint: `archetype ${a.id} is ${a.status}: ${a.statusReason}`,
    });
  };
  return {
    ...a,
    version: "0.1.0",
    params: noParams,
    tier: "inferred",
    reference: [],
    derive: refuse,
    apply: refuse,
  };
}

/** What a def file states for an entry that runs: its data, params schema, derive and apply. */
export interface ProvenArchetype<P extends Readonly<Record<string, unknown>>> {
  readonly id: string;
  readonly version: string;
  readonly family: ArchetypeFamily;
  readonly channels: number | null;
  readonly senses: readonly string[];
  readonly emits: readonly FeatureKind[];
  readonly read: ReadModelKind | "none";
  readonly limits: readonly string[];
  readonly provenance: string;
  /** Stated in the def file so tools/counts.mjs reads it. */
  readonly status: "proven";
  readonly reference: readonly [string, ...string[]];
  readonly original: readonly [CanonOriginal, ...CanonOriginal[]];
  readonly sections?: readonly ConductorSection[];
  readonly params: SchemaLike<unknown, P>;
  derive: ArchetypeDef<P>["derive"];
  apply: ArchetypeDef<P>["apply"];
}

/**
 * An entry that runs: proven, with a reference and an original (the
 * originals rule). Its tier is inferred until the registry computes it from
 * the rows its sections read (M06-T07 step 3).
 */
export function provenArchetype<P extends Readonly<Record<string, unknown>>>(a: ProvenArchetype<P>): ArchetypeDef<P> {
  return { ...a, tier: "inferred" };
}

/** What a def file states for a candidate that declares its params (the STYLUS THINPOT entries, M06-T10). */
export interface CandidateArchetype<P extends Readonly<Record<string, unknown>>> extends Omit<RefusedArchetype, "status"> {
  readonly status: "candidate";
  readonly params: SchemaLike<unknown, P>;
}

/** A candidate with typed params: registered and refused like refusedArchetype, its params schema kept for promotion. */
export function candidateArchetype<P extends Readonly<Record<string, unknown>>>(a: CandidateArchetype<P>): ArchetypeDef<P> {
  const { params, ...rest } = a;
  return { ...(refusedArchetype(rest) as unknown as ArchetypeDef<P>), params };
}
