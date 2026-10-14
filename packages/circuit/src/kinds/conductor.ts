// The conductor feature kind on the stage path (M05, D-058, PACKAGES.md:
// circuit owns the conductor FeatureKindDef). Ported from the M-S draft in
// reference/keys/flex-pair/skeleton-kinds.ts (conductorDef), which stays on
// that reference until it moves onto this def; the geometry is the same.
//
// A conductor is a material region partitioned at stage 5: a `path` region
// is one prism of its outline over the face, t thick; a `centreline` region
// is each segment swept at the width with round ends, clipped to the host
// body so a round end never leaves the part (spec/features.ts
// ConductorFeature). A meshHash region is refused until a kernel emits one.
// The body takes the slot the chase assigns to the conductor's material
// (KernelCtx.slots); a material no slot carries is E_REF.
//
// M05-T10 admits it so the PIP buried stack reference builds its emitted
// trace layers as conductor features (reference/electrical/pip-buried-route).

import { horizontalFrame, q, unitCircle } from "@hackbuild/geom";
import {
  commandError,
  type CheckId, type FeatureKindDef, type FeatureOf, type GeneratedGeometry, type KernelCtx, type Mm, type NonEmpty, type Ring,
  type SchemaLike, type SchemaResult, type ShapeDecl, type Vec2,
} from "@hackbuild/spec";

export const CONDUCTOR_KIND_VERSION = "1.0.0";

/** The reference that proves the kind on the stage path. */
export const CONDUCTOR_REFERENCE = "electrical/pip-buried-route";

/** Checks over the nets a conductor makes (CHECKS.md 7). */
export const CONDUCTOR_CHECK_IDS: NonEmpty<CheckId> = ["CHK-NET-01", "CHK-NET-02", "CHK-NET-11"];

/** Points on each round end of a swept centreline, from the committed unit-circle table (D-175), as the draft. */
const ARC_SEGMENTS = 32;

const EMPTY: Omit<GeneratedGeometry, "owns"> = { preUnionCutters: [], positives: [], postUnionCutters: [], bodies: [] };

const HORIZONTAL_HINT = "a conductor generates on an upward horizontal face; give its region a face frame with normal [0, 0, 1]";

/** One centreline segment swept at width w with round ends, counter-clockwise: half round b, then half round a. */
export function strokeSegment(a: Vec2, b: Vec2, w: Mm): Ring {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) throw commandError({ code: "E_SCHEMA", got: 0, expected: "a segment longer than 0 mm", hint: "remove the repeated centreline point" });
  const d: Vec2 = [dx / len, dy / len];
  const n: Vec2 = [-d[1], d[0]];
  const r = w / 2;
  const half = ARC_SEGMENTS / 2;
  const arc = (c: Vec2, from: number): Vec2[] =>
    Array.from({ length: half + 1 }, (_, i) => {
      const [cs, sn] = unitCircle(from + i, ARC_SEGMENTS);
      return [q(c[0] + r * (cs * d[0] + sn * n[0])), q(c[1] + r * (cs * d[1] + sn * n[1]))] as const;
    });
  return [...arc(b, (3 * ARC_SEGMENTS) / 4), ...arc(a, ARC_SEGMENTS / 4)];
}

function slotOf(material: string, ctx: KernelCtx, path: string): number {
  const slot = ctx.slots?.[material];
  if (slot === undefined) {
    throw commandError({
      code: "E_REF", path, got: material, didYouMean: Object.keys(ctx.slots ?? {}),
      hint: `assign material ${material} to a slot in the chase materials`, record: "copper-routing",
    });
  }
  return slot;
}

/** Standard Schema v1 over the kind tag and the fields the generator reads. */
const conductorSchema: SchemaLike<unknown, FeatureOf<"conductor">> = {
  "~standard": {
    version: 1,
    vendor: "hackbuild-circuit",
    validate(value: unknown): SchemaResult<FeatureOf<"conductor">> {
      if (typeof value !== "object" || value === null) return { issues: [{ message: "expected a conductor feature object" }] };
      const rec = value as Record<string, unknown>;
      if (rec["kind"] !== "conductor") return { issues: [{ message: `kind ${String(rec["kind"])}, expected conductor`, path: ["kind"] }] };
      const missing = ["id", "region", "material", "net", "width", "t"].filter((f) => rec[f] === undefined);
      if (missing.length > 0) return { issues: missing.map((f) => ({ message: `conductor needs ${f}`, path: [f] })) };
      for (const f of ["width", "t"]) {
        const v = rec[f];
        if (typeof v !== "number" || !(v > 0)) return { issues: [{ message: `conductor ${f} must be a positive length in mm`, path: [f] }] };
      }
      return { value: value as FeatureOf<"conductor"> };
    },
  },
};

export const conductorKind: FeatureKindDef<"conductor"> = {
  kind: "conductor",
  version: CONDUCTOR_KIND_VERSION,
  schema: conductorSchema,
  generate(f, ctx) {
    const region = f.region;
    if ("meshHash" in region) {
      throw commandError({
        code: "E_KERNEL", path: `/features/${f.id}/region`, got: "meshHash", expected: "path or centreline",
        hint: "declare the region as a path or a centreline; no kernel emits a meshHash conductor region yet", record: "copper-routing",
      });
    }
    const frame = horizontalFrame(region.face, `/features/${f.id}/region/face`, { code: "E_KERNEL", hint: HORIZONTAL_HINT, record: "copper-routing" });
    const z0 = frame.z0 as Mm;
    const z: readonly [Mm, Mm] = [z0, (z0 + f.t) as Mm];
    const slot = slotOf(f.material, ctx, `/features/${f.id}/material`);
    const shapes: ShapeDecl[] = "path" in region
      ? [{ route: "prism", outline: [region.path.map((pt) => frame.at(pt))], z }]
      : region.centreline.slice(1).map((b, i) => {
        const a = region.centreline[i] ?? b;
        return { route: "csg", op: "intersection", of: [{ route: "prism", outline: [strokeSegment(frame.at(a), frame.at(b), f.width)], z }, ctx.body.base] };
      });
    return { ...EMPTY, bodies: shapes.map((shape) => ({ role: "conductor" as const, shape, slot, material: f.material })), owns: { volume: f.id } };
  },
  checks: CONDUCTOR_CHECK_IDS,
  fit: "none",
  reference: [CONDUCTOR_REFERENCE],
  routes: ["prism", "stack"],
};
