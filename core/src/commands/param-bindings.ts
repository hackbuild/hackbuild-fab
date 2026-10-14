// Param form of constraints.query (M01-T05 step 6): each pointer to its
// dim through ParamField.constraintDim, to the features whose drivenBy
// names it (written by build.ts through Author.bind), and the facts the
// built part declares. A pointer that cannot be bound lands in unbound
// with its reason; none is dropped.

import type { Chase, ParamBinding, ParamEnvelope, ParamPointer, Part } from "@hackbuild/spec";
import { dimOf, paramSlots as slotsOf, type ParamSlot } from "@hackbuild/checks";

type Why = ParamEnvelope["unbound"][number]["why"];

/** Every param pointer the chase declares at these values: `/<field>` and `/<list>/<i>/<item>` (packages/checks driven-by.ts). */
export function paramSlots(chase: Chase, values: Readonly<Record<string, unknown>>): ParamSlot[] {
  return slotsOf(chase.params, values);
}


/** Feature ids whose drivenBy maps some field to pointer, sorted. */
export function featuresDriving(part: Part, pointer: string): string[] {
  return part.features.filter((f) => Object.values(f.drivenBy ?? {}).includes(pointer)).map((f) => f.id).sort();
}

export interface PointerScan {
  /** Pointers with a dim and at least one feature, in pointer order. */
  readonly bindings: readonly ParamBinding[];
  readonly unbound: readonly { readonly param: ParamPointer; readonly why: Why }[];
}

/**
 * Bindings for the asked pointers, or for every pointer with a
 * constraintDim when none are asked. Asked pointers keep their order.
 */
export function bindPointers(chase: Chase, values: Readonly<Record<string, unknown>>, part: Part, asked?: readonly ParamPointer[]): PointerScan {
  const slots = paramSlots(chase, values);
  const byPointer = new Map(slots.map((s) => [s.pointer as string, s] as const));
  const pointers = asked ?? slots.filter((s) => dimOf(s.field) !== undefined).map((s) => s.pointer);
  const bindings: ParamBinding[] = [];
  const unbound: { param: ParamPointer; why: Why }[] = [];
  for (const p of pointers) {
    const slot = byPointer.get(p);
    const dim = slot === undefined ? undefined : dimOf(slot.field);
    if (slot === undefined) unbound.push({ param: p, why: "not-a-param" });
    else if (dim === undefined) unbound.push({ param: p, why: "no-constraint-dim" });
    else {
      const features = featuresDriving(part, p);
      if (features.length === 0) unbound.push({ param: p, why: "no-feature" });
      else bindings.push({ param: p, dim, features });
    }
  }
  return { bindings, unbound };
}

/**
 * Facts the built part declares: every scalar number or boolean param by
 * field id, then every scalar derived metric (`derived.<field>`, from
 * k.derive) by field id. The caller's facts override these key by key.
 */
export function partFacts(chase: Chase, values: Readonly<Record<string, unknown>>, part: Part): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  for (const s of paramSlots(chase, values)) {
    if (s.pointer.split("/").length !== 2) continue;
    const v = values[s.field.id];
    if ((typeof v === "number" && Number.isFinite(v)) || typeof v === "boolean") out[s.field.id] = v;
  }
  for (const m of part.metrics) {
    const key = /^derived\.([^.]+)$/.exec(m.id)?.[1];
    if (key !== undefined && typeof m.value === "number" && Number.isFinite(m.value)) out[key] = m.value;
  }
  return out;
}

/**
 * Profile material of a feature: the material it declares (a conductor names
 * its own, spec/features.ts ConductorFeature, while its body is the host it
 * is partitioned from, D-248), else its body's, else the part's first body's.
 */
export function featureMaterial(part: Part, featureId: string): string | undefined {
  const f = part.features.find((x) => x.id === featureId);
  const declared = f !== undefined && "material" in f && typeof f.material === "string" ? f.material : undefined;
  if (declared !== undefined) return declared;
  const body = f?.body === undefined ? part.bodies[0] : part.bodies.find((b) => b.id === f.body);
  return body?.material;
}
