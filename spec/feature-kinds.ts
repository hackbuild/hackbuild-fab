// spec/feature-kinds.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// The three-part contract as a type: a kind is a generator, a non-empty
// check set and a fit class (or "none"), plus at least one reference. A kind
// missing any of these does not type-check (D-058).
// Version 4, 2026-10-04. Carries D-047, D-053, D-058, D-059, D-165, D-177.
//
// The contract binds the Feature union through FeatureKindRegistryAt: the
// registry a kernel ships at milestone M must hold a complete def for every
// kind FEATURE_KIND_ADMISSION admits by M, so a kind cannot be usable in a
// build while nothing proves it. Gaps at 2026-10-04, which hold those kinds
// back to their admitting milestone: hinge, finger, lamination and bridge
// lack a check; boss, chamfer, round and snap lack a reference; round lacks
// a generator in harvested code. coupon left the union (D-177).

import type { CheckId } from "./checks.js";
import type { FeatureKind, FeatureOf, KindMilestone, KindsAdmittedBy } from "./features.js";
import type { FitClassId, MeshRoute, Plane, Process } from "./ids.js";
import type { BodyDraft, FaceDecl, MachineView, ShapeDecl } from "./build.js";
import type { BodyRole } from "./part-ir.js";
import type { ProfileLookup } from "./profile.js";
import type { SchemaLike } from "./schema.js";

/** Context a generator reads. */
export interface KernelCtx {
  readonly profile: ProfileLookup;
  /** Mesh route of the body the feature applies to. */
  readonly route: MeshRoute;
  readonly process: Process;
  /** Active machine preset: id, layer grid and line width, with the snapping the kernel uses (build.ts MachineView). */
  readonly machineView: MachineView;
  /** Host body the feature applies to, its base ShapeDecl included; route equals body.base.route. */
  readonly body: BodyDraft;
  /** Faces the PartDraft declares this build (D-165), for FaceRef and EdgeSelector resolution. */
  readonly faces: readonly FaceDecl[];
  /**
   * Material id to its 1-based slot, from the chase materials. A feature
   * that adds a material body names a material and no slot (ConductorFeature),
   * so its generator reads the slot here (M05-T10; skeleton-findings F-03).
   */
  readonly slots?: Readonly<Record<string, number>>;
}

/**
 * Declarations a generator emits, by stage (D-047). The kernel meshes each
 * ShapeDecl through its route (D-053) at stages 2 to 5; MeshRef exists only
 * in Part IR, assigned at stage 7 and 8. Only chamfer and round may emit
 * preUnionCutters; the kernel refuses any other kind that does.
 */
export interface GeneratedGeometry {
  /** Stage 2: cut from the base before union. */
  readonly preUnionCutters: readonly ShapeDecl[];
  /** Stage 3: unioned. */
  readonly positives: readonly ShapeDecl[];
  /** Stage 4: cut after union. */
  readonly postUnionCutters: readonly ShapeDecl[];
  /** Material regions this feature adds, partitioned at stage 5 (inlay, conductor). */
  readonly bodies: readonly { readonly role: BodyRole; readonly shape: ShapeDecl; /** 1-based */ readonly slot: number; readonly material: string }[];
  /** Faces and volume ids on the final solid this feature owns, for checks. */
  readonly owns: { readonly faces?: readonly string[]; readonly volume?: string };
}

/** A tuple with at least one element. */
export type NonEmpty<T> = readonly [T, ...T[]];

export interface FeatureKindDef<K extends FeatureKind = FeatureKind> {
  readonly kind: K;
  /** Semver; resolved versions hash into registryHash. */
  readonly version: string;
  readonly schema: SchemaLike<unknown, FeatureOf<K>>;
  /** Pure: same feature and ctx give the same declarations; no I/O, no store, no wasm. */
  generate(f: FeatureOf<K>, ctx: KernelCtx): GeneratedGeometry;
  /** At least one check id (D-058). */
  readonly checks: NonEmpty<CheckId>;
  /** The fit class this kind takes part in, or "none" stated outright. */
  readonly fit: ((f: FeatureOf<K>) => FitClassId | null) | "none";
  /** At least one reference id under reference/<area>/<id>/: the coverage rule as a type. */
  readonly reference: NonEmpty<string>;
  /** Sim model registry id. */
  readonly sim?: string;
  /** Sheet kinds declare the planes they are legal in. */
  readonly planes?: readonly Plane[];
  /** Routes this kind can generate on. */
  readonly routes?: readonly MeshRoute[];
}

/** Any registered feature kind, distributive so registries hold all of them. */
export type AnyFeatureKindDef = { [K in FeatureKind]: FeatureKindDef<K> }[FeatureKind];

/**
 * The feature-kind registry a kernel ships at milestone M: one complete def
 * per admitted kind, no more and no fewer. Admitting a kind in
 * FEATURE_KIND_ADMISSION without its def, or registering a def whose checks
 * or reference are empty, fails tsc in the package that builds the registry.
 */
export type FeatureKindRegistryAt<M extends KindMilestone> = {
  readonly [K in KindsAdmittedBy<M>]: FeatureKindDef<K>;
};
