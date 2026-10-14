// The pocket feature kind (M03 admission, PACKAGES.md: mesh owns it),
// ported from the M-S draft in reference/keys/flex-pair/skeleton-kinds.ts
// (pocketDef), which stays on that reference: one cutter from the face down
// to the floor, cut after union (stage 4), rising one layer past the face
// so no cut face is coplanar with the top. Horizontal upward faces only;
// `sealed` pockets (D-062) are refused until a design needs one. Registered
// at M06-T08 for the PIP button archetypes' wells and slots.

import {
  commandError,
  type CheckId, type FeatureKindDef, type FeatureOf, type NonEmpty, type SchemaLike, type SchemaResult, type ShapeDecl, type Vec2,
} from "@hackbuild/spec";
import { horizontalFrame } from "@hackbuild/geom";

export const POCKET_KIND_VERSION = "1.0.0";
export const POCKET_CHECK_IDS: NonEmpty<CheckId> = ["CHK-PRT-04"];
export const POCKET_REFERENCE = "buttons/flex-cone";

/** Standard Schema v1 over the fields the generator reads. */
export function fieldsSchema<K extends FeatureOf<never>["kind"] | string>(kind: K, fields: readonly string[]): SchemaLike<unknown, never> {
  const validate = (value: unknown): SchemaResult<never> => {
    if (typeof value !== "object" || value === null) return { issues: [{ message: `expected a ${kind} feature object` }] };
    const rec = value as Record<string, unknown>;
    if (rec["kind"] !== kind) return { issues: [{ message: `kind ${String(rec["kind"])}, expected ${kind}`, path: ["kind"] }] };
    const missing = ["id", ...fields].filter((f) => rec[f] === undefined);
    if (missing.length > 0) return { issues: missing.map((f) => ({ message: `${kind} needs ${f}`, path: [f] })) };
    return { value: value as never };
  };
  return { "~standard": { version: 1, vendor: "hackbuild-mesh", validate } };
}

export const pocketKind: FeatureKindDef<"pocket"> = {
  kind: "pocket",
  version: POCKET_KIND_VERSION,
  schema: fieldsSchema("pocket", ["outline", "face", "depth", "floor", "fit"]) as SchemaLike<unknown, FeatureOf<"pocket">>,
  generate(f, ctx) {
    const frame = horizontalFrame(f.face, `/features/${f.id}/face`, { hint: "a pocket cuts down from an upward horizontal face", record: "mesh-kernel" });
    if (f.sealed !== undefined) {
      throw commandError({ code: "E_KERNEL", path: `/features/${f.id}/sealed`, got: "sealed", expected: "an open pocket", hint: "sealed pockets (D-062) land with the first design that needs a pause; open the pocket", record: "mesh-kernel" });
    }
    const top = frame.z0;
    const cutter: ShapeDecl = { route: "prism", outline: [f.outline.map((p) => frame.at(p))], z: [top - f.depth, top + ctx.machineView.layerHeight] };
    return { preUnionCutters: [], positives: [], postUnionCutters: [cutter], bodies: [], owns: { faces: [`${f.id}.floor`, `${f.id}.wall`] } };
  },
  checks: POCKET_CHECK_IDS,
  fit: (f) => f.fit.class,
  reference: [POCKET_REFERENCE],
  routes: ["prism", "stack", "csg", "revolve"],
};
