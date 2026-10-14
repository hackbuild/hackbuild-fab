// Author.mech (spec/build.ts, D-177): run a typed mechanism's apply() from
// build.ts. The id resolves against the mechanisms registry (E_REF with
// didYouMean), a refused entry is E_REF naming its status and reason, the
// params are validated and default-filled by the def's schema, a FaceRef
// resolves against the draft's faces, and the result's ids are prefixed
// `<mechanism id>.<call index>.` as for archetypes (spec/canon.ts
// MechanismApplyOut). A body that names no material cuts from the chase
// slot it names, as Author.body fills it. The def's audit warnings go to
// the build's warning sink (Author.warn) and not into the returned value,
// so build.ts spreading the result cannot list them twice.

import type { BodyDraft, BuildWarning, Chase, FaceFrame, FaceRef, Feature, MechanismApplyOut, PartDraft, ProfileLookup } from "@hackbuild/spec";
import { mechanisms } from "@hackbuild/mechanisms";
import { commandError as cmdError } from "@hackbuild/spec";
import { resolveFace } from "./face-frame.js";

export interface MechCtx {
  readonly chase: Chase;
  readonly profile: ProfileLookup;
  readonly warnings: BuildWarning[];
  readonly machine: string;
  /** Calls so far per mechanism id, for the id prefix. */
  readonly calls: Map<string, number>;
}

/** Validated, default-filled params, or E_SCHEMA at the first refused key. */
function validated(id: string, schema: { readonly "~standard": { validate(v: unknown): unknown } }, params: unknown): Readonly<Record<string, number>> {
  const r = schema["~standard"].validate(params) as { readonly value?: unknown; readonly issues?: readonly { readonly message: string; readonly path?: readonly unknown[] }[] } | Promise<unknown>;
  if (r instanceof Promise) throw cmdError({ code: "E_KERNEL", path: "/author/mech/params", got: id, hint: `mechanism ${id} validates its params asynchronously; k.mech needs a synchronous schema`, record: "agent-capability" });
  if (r.issues !== undefined && r.issues.length > 0) {
    const issue = r.issues[0]!;
    const at = (issue.path ?? []).map((k) => String(typeof k === "object" && k !== null && "key" in k ? (k as { key: unknown }).key : k)).join("/");
    throw cmdError({ code: "E_SCHEMA", path: `/author/mech/params${at === "" ? "" : `/${at}`}`, got: id, expected: issue.message, hint: `k.mech("${id}") params: ${issue.message}; pass the def's numeric params` });
  }
  return r.value as Readonly<Record<string, number>>;
}

/** Feature id `<kind>.<rest>` with the call prefix after the kind, so the id keeps its kind. */
function prefixFeature(f: Feature, p: string, bodies: ReadonlyMap<string, string>): Feature {
  const dot = f.id.indexOf(".");
  const id = dot < 0 ? `${f.kind}.${p}${f.id}` : `${f.id.slice(0, dot)}.${p}${f.id.slice(dot + 1)}`;
  const body = "body" in f && typeof f.body === "string" ? { body: bodies.get(f.body) ?? f.body } : {};
  return { ...f, id, ...body } as Feature;
}

export function mechApply(id: string, face: FaceFrame | FaceRef, params: Readonly<Record<string, number>>, draft: PartDraft | undefined, ctx: MechCtx): MechanismApplyOut {
  const def = mechanisms.resolve(id).def;
  if (def.status !== "typed" || def.apply === undefined) {
    const why = def.status !== "typed" ? `mechanism ${id} is ${def.status}: ${def.statusReason ?? "no reason recorded"}` : `mechanism ${id} has no apply(); use mech.derive for its numbers`;
    throw cmdError({ code: "E_REF", path: "/author/mech/id", got: id, expected: "a typed mechanism with apply()", hint: why });
  }
  const host: PartDraft = draft ?? {
    id: "", name: "", process: "laser", machine: ctx.machine, frame: { originOnAxis: false, carriesOffset: false, pose: "print" }, bodies: [], features: [],
  };
  const out = def.apply({ draft: host, face: resolveFace(face, host.faces ?? [], "/author/mech/face"), params: validated(id, def.params, params), profile: ctx.profile });
  const n = ctx.calls.get(id) ?? 0;
  ctx.calls.set(id, n + 1);
  const p = `${id}.${n}.`;
  const bodyIds = new Map(out.bodies.map((b) => [b.id, `${p}${b.id}`] as const));
  const bodies = out.bodies.map((b): BodyDraft => ({
    ...b, id: bodyIds.get(b.id)!,
    material: b.material === "" ? ctx.chase.materials.find((m) => m.slot === b.slot)?.material ?? "" : b.material,
  }));
  ctx.warnings.push(...(out.warnings ?? []));
  return {
    bodies,
    features: out.features.map((f) => prefixFeature(f, p, bodyIds)),
    metrics: out.metrics.map((m) => ({ ...m, id: `${p}${m.id}` })),
    assertions: out.assertions,
  };
}
