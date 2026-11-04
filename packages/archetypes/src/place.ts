// One placement of an archetype on a draft (D-165): resolve the id, refuse
// what does not run, validate and default the params, call apply(), map
// its local slots onto the chase's material slots by material and role, and
// prefix every local id with `<archetype id>.<index>.`. Author.arch calls
// this from a build; the kernel's applied merge (M06-T12) reuses it.

import {
  commandError,
  type ApplyOut, type DerivedValue, type FaceFrame, type Feature, type MaterialSlot, type PartDraft, type ProfileLookup,
} from "@hackbuild/spec";
import type { ArchetypeRegistry } from "./registry.js";
import { candidateBuildApply } from "./def.js";

export interface PlaceArgs {
  readonly id: string;
  readonly face: FaceFrame;
  readonly params: Readonly<Record<string, unknown>>;
  readonly draft: PartDraft;
  readonly profile: ProfileLookup;
  /** The call's index among placements of this archetype on the part. */
  readonly index: number;
  /** The chase's material slots. */
  readonly materials: readonly MaterialSlot[];
}

/** Rename local ids; ids outside the archetype's own bodies and features (the host's) stay. */
export function prefixApplyOut(out: ApplyOut, prefix: string): ApplyOut {
  const bodies = new Set(out.bodies.map((b) => b.id));
  const feats = new Set(out.features.map((f) => f.id));
  const b = (id: string): string => (bodies.has(id) ? prefix + id : id);
  const f = (id: string): string => (feats.has(id) ? prefix + id : id);
  const feature = (x: Feature): Feature => {
    const base = { ...x, id: prefix + x.id, ...(x.body === undefined ? {} : { body: b(x.body) }) } as Feature;
    if (base.kind === "contact") return { ...base, a: f(base.a), b: f(base.b), ...(base.actuator === undefined ? {} : { actuator: b(base.actuator) }) };
    if (base.kind === "port" && base.tap !== undefined) {
      const t = base.tap;
      return { ...base, tap: { ...t, conductor: f(t.conductor), ...(t.clamp === undefined ? {} : { clamp: b(t.clamp) }) } };
    }
    return base;
  };
  return {
    ...out,
    bodies: out.bodies.map((x) => ({ ...x, id: prefix + x.id })),
    features: out.features.map(feature),
    ports: out.ports.map(f),
    ...(out.metrics === undefined ? {} : { metrics: out.metrics.map((m) => ({ ...m, id: prefix + m.id })) }),
  };
}

/** The resolved entry and its validated, default-filled params; a stub or unproven entry is E_REF, bad params E_SCHEMA. */
function validated(reg: ArchetypeRegistry, id: string, params: unknown) {
  const e = reg.resolve(id);
  const def = e.def;
  if (def.status === "stub" || def.status === "unproven") {
    throw commandError({ code: "E_REF", path: "/id", got: id, expected: "a proven or candidate archetype", hint: `archetype ${e.id} is ${def.status}: ${def.statusReason ?? ""}` });
  }
  const r = def.params["~standard"].validate(params);
  if (r instanceof Promise) throw commandError({ code: "E_KERNEL", path: "/params", got: e.id, expected: "a synchronous params schema", hint: `archetype ${e.id} declares an async params schema; make it synchronous`, record: "agent-capability" });
  if (r.issues !== undefined) {
    const issue = r.issues[0];
    const at = (issue?.path ?? []).map((k) => String(typeof k === "object" && k !== null ? (k as { key: PropertyKey }).key : k)).join("/");
    throw commandError({ code: "E_SCHEMA", path: `/params${at === "" ? "" : `/${at}`}`, got: id, expected: issue?.message ?? "params the archetype declares", hint: `fix the params for ${e.id}: ${issue?.message ?? "invalid"}` });
  }
  return { e, def, value: r.value as Readonly<Record<string, unknown>> };
}

/** An archetype's derived values at params, placing nothing: a build reads a size before it lays out the part (Author.archDerive). */
export function deriveArchetype(reg: ArchetypeRegistry, id: string, params: unknown, profile: ProfileLookup): Readonly<Record<string, DerivedValue>> {
  const { def, value } = validated(reg, id, params);
  return def.derive(value, profile);
}

export function placeArchetype(reg: ArchetypeRegistry, a: PlaceArgs): ApplyOut {
  const { e, def, value } = validated(reg, a.id, a.params);
  const r = { value };
  // a candidate with a build apply builds here; its def.apply refuses every other caller
  const apply = def.status === "candidate" ? candidateBuildApply(e.id) ?? def.apply : def.apply;
  const out = apply({ draft: a.draft, face: a.face, params: r.value as Readonly<Record<string, unknown>>, profile: a.profile });
  const slotOf = new Map<number, number>();
  for (const s of out.slots) {
    const hit = a.materials.find((m) => m.material === s.material && m.role === s.role);
    if (hit === undefined) {
      throw commandError({ code: "E_SCHEMA", path: "/materials", got: `${s.material} ${s.role}`, expected: `a chase slot of ${s.material} as ${s.role}`, hint: `add a ${s.role} slot of ${s.material} to the chase materials; ${e.id} needs it` });
    }
    slotOf.set(s.slot, hit.slot);
  }
  const mapped: ApplyOut = { ...out, bodies: out.bodies.map((x) => ({ ...x, slot: slotOf.get(x.slot) ?? x.slot })) };
  return prefixApplyOut(mapped, `${e.id}.${a.index}.`);
}
