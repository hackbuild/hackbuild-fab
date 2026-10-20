// arch.apply (M06-T12 step 2, spec/commands.ts CommandIO "arch.apply"):
// resolve the id through the alias table and refuse stub, candidate and
// unproven entries with E_REF; build the chase to get the host PartDraft;
// turn the face into a FaceRef on a declared face; validate the params,
// where a missing value with no default (D-087's BLOCKS standard) comes
// back as E_PARAM_MISSING listing the options; place the archetype through
// the same path the applied merge uses, with every slot it needs that the
// chase lacks added after the chase's own; and return the emitted feature
// ids, the port ids, the applied record, the slots added and the kernels
// the emitted kinds need that the chase does not list.
//
// The entry, the slots added and the kernels added go to chase.ts as one
// patch on hbf/<chase> through the chase.patch writer (D-115, M10-T05 step
// 4). The writer takes designs/<name> in a git work tree only; for a
// reference or a fixture, or when the patch would add a validation error,
// the result carries written false and notWritten names the reason.

import { isThrownCommandError, type AppliedArchetype, type ArchetypeDef, type Chase, type CommandInput, type CommandOutput, type FaceDecl, type FaceFrame, type FaceRef, type MaterialSlot, type PatchEdit, type Vec3 } from "@hackbuild/spec";
import { placeArchetype } from "@hackbuild/archetypes";
import { cross } from "@hackbuild/geom";
import { createProfileLookup } from "@hackbuild/profile";
import { archetypes } from "../canon.js";
import { cmdError, didYouMean } from "../errors.js";
import { resolveFace } from "../face-frame.js";
import type { CommandOut } from "../result.js";
import type { CoreCtx } from "../ctx.js";
import { buildTarget } from "./part-build.js";
import { writeChasePatch } from "./chase-patch.js";
import { ZERO } from "./canon-hits.js";
import { PACKAGE_KINDS } from "../kinds.js";

type Input = CommandInput<"arch.apply">;

/**
 * The chase.patch edits that record a placement: the applied entry (the
 * applied list added when the chase has none), then each slot and kernel
 * appended.
 */
export function appliedEdits(chase: Chase, applied: AppliedArchetype, slotsAdded: readonly MaterialSlot[], kernelsAdded: readonly string[]): PatchEdit[] {
  return [
    chase.applied === undefined ? { pointer: "/applied", set: [applied] } : { pointer: "/applied/-", set: applied },
    ...slotsAdded.map((s) => ({ pointer: "/materials/-", set: s })),
    ...kernelsAdded.map((k) => ({ pointer: "/meta/kernels/-", set: k })),
  ];
}

/** Write the placement through chase.patch; written false with the reason when the writer refuses. */
async function write(ctx: CoreCtx, dir: string, edits: readonly PatchEdit[]): Promise<{ readonly written: boolean; readonly notWritten?: string }> {
  let w: Awaited<ReturnType<typeof writeChasePatch>>;
  try {
    w = await writeChasePatch(ctx, dir, "chase.ts", edits, { addMembers: true });
  } catch (e) {
    if (!isThrownCommandError(e)) throw e;
    w = { errors: [e.hbf] };
  }
  if (!("errors" in w)) return { written: true };
  const why = w.errors.map((e) => `${e.code}${e.path === undefined ? "" : ` ${e.path}`} ${e.hint}`).join("; ");
  return { written: false, notWritten: `not written, chase.patch refused the patch for hbf/<chase> (D-115): ${why}` };
}

const TOL = 1e-9;
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const same = (a: Vec3, b: Vec3): boolean => Math.abs(a[0] - b[0]) < TOL && Math.abs(a[1] - b[1]) < TOL && Math.abs(a[2] - b[2]) < TOL;

/**
 * A FaceFrame as a FaceRef: the declared face with the same normal and u
 * whose plane holds the frame's origin, the origin as uv on it, rotDeg 0.
 * The FaceRef is what chase.applied stores, so the placement follows the
 * face when a param moves it (spec/chase.ts AppliedArchetype).
 */
export function faceRefOf(face: FaceRef | FaceFrame, faces: readonly FaceDecl[]): FaceRef {
  if ("ref" in face) {
    resolveFace(face, faces, "/face/ref");
    return face;
  }
  if (faces.length === 0) {
    throw cmdError({ code: "E_REF", path: "/face", got: "a face frame", expected: "a face the part declares", hint: "this part declares no faces; declare one with Author.face in build.ts" });
  }
  for (const f of faces) {
    const { origin, normal, u } = f.frame;
    const d = sub(face.origin, origin);
    if (!same(face.normal, normal) || !same(face.u, u) || Math.abs(dot(d, normal)) > TOL) continue;
    return { ref: f.id, uv: [dot(d, u), dot(d, cross(normal, u))], rotDeg: 0 };
  }
  throw cmdError({
    code: "E_REF", path: "/face", got: `origin ${face.origin.join(" ")} normal ${face.normal.join(" ")}`, expected: "a frame on a declared face, same normal and u",
    didYouMean: didYouMean("", faces.map((f) => f.id)), hint: "pass a face ref the part declares, or a frame that lies on one",
  });
}

/** The refusal of a stub, candidate or unproven entry: "archetype <id> is <status>: <reason>". */
function refuse(def: ArchetypeDef): never {
  const o = def.original?.[0];
  throw cmdError({
    code: "E_REF", path: "/id", got: def.id,
    expected: o === undefined ? "a proven archetype" : `a proven archetype; ${def.id} ports from originals/${o.slug}/${o.file}${o.lines === undefined ? "" : ` lines ${o.lines}`}`,
    hint: `archetype ${def.id} is ${def.status}: ${def.statusReason ?? "no reason recorded"}`,
  });
}

interface Issue { readonly message: string; readonly path?: readonly unknown[] }

/**
 * Validated params, or a typed question: a key the archetype needs that the
 * call left out and the schema gives no default for is E_PARAM_MISSING
 * naming it, with the schema's own message listing the options.
 */
function params(def: ArchetypeDef, given: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const r = def.params["~standard"].validate(given) as { readonly value?: unknown; readonly issues?: readonly Issue[] } | Promise<unknown>;
  if (r instanceof Promise) throw cmdError({ code: "E_KERNEL", path: "/params", got: def.id, hint: `archetype ${def.id} validates its params asynchronously; arch.apply needs a synchronous schema`, record: "agent-capability" });
  const issue = r.issues?.[0];
  if (issue === undefined) return r.value as Readonly<Record<string, unknown>>;
  const key = (issue.path ?? []).map((k) => String(typeof k === "object" && k !== null && "key" in k ? (k as { key: unknown }).key : k)).join("/");
  if (key !== "" && !key.includes("/") && given[key] === undefined) {
    throw cmdError({ code: "E_PARAM_MISSING", path: `/params/${key}`, expected: issue.message, hint: `${def.id} needs ${key} and has no default; pick one and pass --params ${key}=<value>` });
  }
  throw cmdError({ code: "E_SCHEMA", path: `/params${key === "" ? "" : `/${key}`}`, got: def.id, expected: issue.message, hint: `fix the params for ${def.id}: ${issue.message}` });
}

export async function runArchApply(input: Input, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"arch.apply">>> {
  const entry = archetypes.resolve(input.id);
  const def = entry.def;
  if (def.status !== "proven") refuse(def);
  const given = (input.params ?? {}) as Readonly<Record<string, unknown>>;
  const values = params(def, given);
  const chaseDir = input.chase ?? (() => { throw cmdError({ code: "E_PARAM_MISSING", path: "/chase", expected: "a design or reference directory", hint: "name the chase the part comes from, for example hbf arch.apply reference/conductors/blocks-stud-applied --part body" }); })();
  const built = await buildTarget(chaseDir, ctx, undefined, undefined);
  const draft = built.draft;
  if (draft.id !== input.part) {
    throw cmdError({ code: "E_REF", path: "/part", got: input.part, expected: "a part id the build returns", didYouMean: didYouMean(input.part, [draft.id]), hint: `the build returns part ${draft.id}` });
  }
  const chase = built.design.chase;
  const ref = faceRefOf(input.face as FaceRef | FaceFrame, draft.faces ?? []);
  const frame = resolveFace(ref, draft.faces ?? [], "/face");
  const profile = createProfileLookup(built.design.ws.tables);

  // The slots apply() names that the chase lacks, numbered after the chase's highest slot.
  const raw = def.apply({ draft, face: frame, params: values, profile });
  const slotsAdded: MaterialSlot[] = [];
  let next = Math.max(0, ...chase.materials.map((m) => m.slot));
  for (const s of raw.slots) {
    const has = [...chase.materials, ...slotsAdded].some((m) => m.material === s.material && m.role === s.role);
    if (!has) slotsAdded.push({ ...s, slot: (next += 1) });
  }
  const prior = (chase.applied ?? []).filter((a) => a.part === draft.id && archetypes.resolve(a.archetype).id === entry.id).length;
  const placed = placeArchetype(archetypes, { id: entry.id, face: frame, params: values, draft, profile, index: prior, materials: [...chase.materials, ...slotsAdded] });
  // The kernels whose kinds the placement emits, in the order the kind table lists them.
  const kinds = new Set(placed.features.map((f) => f.kind as string));
  const kernelsAdded = Object.entries(PACKAGE_KINDS)
    .filter(([, k]) => [...(k?.kinds ?? []), ...(k?.onUse ?? [])].some((d) => kinds.has(d.kind)))
    .map(([id]) => id)
    .filter((id) => !(chase.meta.kernels as readonly string[]).includes(id));
  const applied: AppliedArchetype = { archetype: entry.id, part: draft.id, face: ref, ...(input.params === undefined ? {} : { params: input.params }) };
  const written = await write(ctx, built.design.dir, appliedEdits(chase, applied, slotsAdded, kernelsAdded));
  return {
    verdict: "pass", stage: "done", inputsHash: ctx.inputsHash, buildHash: built.part.buildHash,
    result: {
      emitted: placed.features.map((f) => f.id), ports: [...placed.ports], applied, slotsAdded, kernelsAdded,
      branch: `hbf/${chase.meta.id}`, ...written,
    },
    findings: [], counts: { ...ZERO }, errors: [], artifacts: [], next: [],
  };
}
