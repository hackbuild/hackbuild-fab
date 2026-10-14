// reference/keys/flex-pair/skeleton-kinds.ts
// Draft feature-kind defs for the M-S walking skeleton (D-179, M-S-T04):
// pocket, conductor, contact and port, typed as FeatureKindDef and
// registered here, on this reference only, and pad (M05-T18 step 3). They
// stay out of every package registry and out of FeatureKindRegistryAt;
// FEATURE_KIND_ADMISSION does not move (pocket admits at M03, the other
// four at M05). The conductor def is packages/circuit's since M05-T10.
//
// Generators are pure and emit ShapeDecls only. The skeleton meshes the
// prism and stack routes; a centreline conductor is emitted as a csg
// intersection with its host body so a round end never leaves the part
// (spec/features.ts ConductorFeature). Places where the spec types fought
// this geometry are in tools/reports/skeleton-findings.md.

import {
  commandError,
  type CheckId, type CommandError, type FaceFrame, type FeatureKind, type FeatureKindDef, type FeatureOf,
  type GeneratedGeometry, type KernelCtx, type Mm, type NonEmpty, type SchemaLike, type SchemaResult,
  type ShapeDecl, type ThrownCommandError, type Vec2,
} from "@hackbuild/spec";
import { conductorKind } from "@hackbuild/circuit";
import { chase } from "./chase";

export { strokeSegment } from "@hackbuild/circuit";

/** Material id to slot from this reference's chase, for a KernelCtx built without slots. */
const CHASE_SLOTS: Readonly<Record<string, number>> = Object.fromEntries(chase.materials.map((m) => [m.material, m.slot]));

/** The one reference these drafts generate for. */
export const SKELETON_REFERENCE = "keys/flex-pair";
const REFERENCE: NonEmpty<string> = [SKELETON_REFERENCE];
const VERSION = "0.1.0-draft.0";

/** Kinds the skeleton runs, in stage order of first use. */
export const SKELETON_KIND_IDS = ["pocket", "conductor", "contact", "port", "pad"] as const;
export type SkeletonKind = (typeof SKELETON_KIND_IDS)[number];

const kindError: (hbf: CommandError) => ThrownCommandError = commandError;

/** Face-frame point to part xy; the skeleton reads horizontal faces only. */
function toPart(face: FaceFrame, [x, y]: Vec2): Vec2 {
  const [ux, uy] = face.u;
  const [nx, ny, nz] = face.normal;
  // v = normal x u, the in-face second axis.
  const vx = ny * face.u[2] - nz * uy;
  const vy = nz * ux - nx * face.u[2];
  return [face.origin[0] + x * ux + y * vx, face.origin[1] + x * uy + y * vy];
}

function horizontal(face: FaceFrame, path: string): Mm {
  const [nx, ny, nz] = face.normal;
  if (nx !== 0 || ny !== 0 || nz !== 1 || face.u[2] !== 0) {
    throw kindError({
      code: "E_KERNEL", path, got: face.normal, expected: "normal [0, 0, 1] with u in the xy plane",
      hint: "the skeleton draft generates on upward horizontal faces only; other faces arrive with the M03 and M05 defs",
      record: "skeleton-kinds",
    });
  }
  return face.origin[2];
}



const EMPTY: Omit<GeneratedGeometry, "owns"> = { preUnionCutters: [], positives: [], postUnionCutters: [], bodies: [] };

/**
 * A Standard Schema v1 validator that checks the kind tag and the fields a
 * generator reads. The M03 and M05 defs replace it with the derived zod
 * schemas.
 */
function draftSchema<K extends SkeletonKind>(kind: K, fields: readonly string[]): SchemaLike<unknown, FeatureOf<K>> {
  const validate = (value: unknown): SchemaResult<FeatureOf<K>> => {
    if (typeof value !== "object" || value === null) return { issues: [{ message: `expected a ${kind} feature object` }] };
    const rec = value as Record<string, unknown>;
    if (rec["kind"] !== kind) return { issues: [{ message: `kind ${String(rec["kind"])}, expected ${kind}`, path: ["kind"] }] };
    const missing = ["id", ...fields].filter((f) => rec[f] === undefined);
    if (missing.length > 0) return { issues: missing.map((f) => ({ message: `${kind} needs ${f}`, path: [f] })) };
    return { value: value as FeatureOf<K> };
  };
  return { "~standard": { version: 1, vendor: "hackbuild-skeleton", validate } };
}

const one = (id: CheckId): NonEmpty<CheckId> => [id];

/** Pocket: one cutter from the face down to the floor, cut after union (stage 4). */
export const pocketDef: FeatureKindDef<"pocket"> = {
  kind: "pocket",
  version: VERSION,
  schema: draftSchema("pocket", ["outline", "face", "depth", "floor", "fit"]),
  generate(f, ctx) {
    const top = horizontal(f.face, `/features/${f.id}/face`);
    // The cutter rises one layer past the face so no cut face is coplanar with the top.
    const cutter: ShapeDecl = {
      route: "prism", outline: [f.outline.map((pt) => toPart(f.face, pt))], z: [top - f.depth, top + ctx.machineView.layerHeight],
    };
    return { ...EMPTY, postUnionCutters: [cutter], owns: { faces: [`${f.id}.floor`, `${f.id}.wall`] } };
  },
  checks: one("CHK-PRT-04"),
  fit: (f) => f.fit.class,
  reference: REFERENCE,
  routes: ["prism", "stack"],
};

/**
 * Conductor: the package def (packages/circuit/src/kinds/conductor.ts,
 * M05-T10), one implementation on the stage path and here. It reads the
 * slot from KernelCtx.slots; a context without them (the skeleton tests)
 * gets this reference's chase slots. The reference it names here is this
 * one; the package def names reference/electrical/pip-buried-route.
 */
export const conductorDef: FeatureKindDef<"conductor"> = {
  ...conductorKind,
  reference: REFERENCE,
  generate: (f, ctx) => conductorKind.generate(f, ctx.slots === undefined ? { ...ctx, slots: CHASE_SLOTS } : ctx),
};

/**
 * Contact: a relation between two conductors. Its geometry is the cap body
 * and the two column conductors build.ts declares; ContactFeature carries no
 * position, so the draft generates no solid (skeleton-findings.md, F-04).
 */
export const contactDef: FeatureKindDef<"contact"> = {
  kind: "contact",
  version: VERSION,
  schema: draftSchema("contact", ["a", "b", "forceMinN", "maxOhm"]),
  generate(f) {
    return { ...EMPTY, owns: { faces: [`${f.a}.top`, `${f.b}.top`] } };
  },
  checks: one("CHK-KEY-01"),
  fit: (f) => f.fit?.class ?? null,
  reference: REFERENCE,
};

/** Port: a net terminal for composition and hookup; no solid until the lead kinds land. */
export const portDef: FeatureKindDef<"port"> = {
  kind: "port",
  version: VERSION,
  schema: draftSchema("port", ["net", "type", "interface"]),
  generate() {
    return { ...EMPTY, owns: {} };
  },
  checks: one("CHK-NET-29"),
  fit: "none",
  reference: REFERENCE,
};

/**
 * Pad: a lead terminal of a net (M05-T18 step 3). PadFeature carries a net,
 * a size and what it is for, and no position, so the draft generates no
 * solid; circuit extraction reads it as a terminal and prices its contact
 * by `for` (packages/circuit extract/resistance.ts).
 */
export const padDef: FeatureKindDef<"pad"> = {
  kind: "pad",
  version: VERSION,
  schema: draftSchema("pad", ["net", "size", "for"]),
  generate() {
    return { ...EMPTY, owns: {} };
  },
  checks: one("CHK-NET-29"),
  fit: "none",
  reference: REFERENCE,
};

/** The draft registry for keys flex-pair only. Never imported by a package. */
export const SKELETON_KINDS: { readonly [K in SkeletonKind]: FeatureKindDef<K> } = {
  pocket: pocketDef,
  conductor: conductorDef,
  contact: contactDef,
  port: portDef,
  pad: padDef,
};

/** Run the draft generator for one feature; any other kind is refused with the milestone that admits it. */
export function generateSkeleton(f: FeatureOf<FeatureKind>, ctx: KernelCtx): GeneratedGeometry {
  const kind = f.kind as SkeletonKind;
  if (!(SKELETON_KIND_IDS as readonly string[]).includes(kind)) {
    throw kindError({
      code: "E_SCHEMA", path: `/features/${f.id}/kind`, got: f.kind, expected: SKELETON_KIND_IDS.join(", "),
      hint: "the M-S skeleton generates pocket, conductor, contact, port and pad only", record: "skeleton-kinds",
    });
  }
  const def = SKELETON_KINDS[kind] as FeatureKindDef<SkeletonKind>;
  return (def.generate as (feature: FeatureOf<SkeletonKind>, c: KernelCtx) => GeneratedGeometry)(f as FeatureOf<SkeletonKind>, ctx);
}
