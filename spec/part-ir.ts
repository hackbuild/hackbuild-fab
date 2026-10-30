// spec/part-ir.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// The thing every kernel produces and every check reads. Contract only: no
// DOM, no kernel import. Kernels import this file; it imports no kernel.
// Version 4, 2026-10-04. Carries D-047, D-048, D-049, D-050, D-051, D-053,
// D-063, D-074, D-075, D-102, D-177, D-224.

import type {
  BuildHash, FaceFrame, Mm, MeshHash, MeshRoute, MeshUri, Plane, Process, Quat, Qualification,
  Ring, Tier, Vec3, Axis,
} from "./ids.js";
import type { Feature } from "./features.js";
import type { BoardRecord, RecordRead } from "./board-features.js";
import type { Bound } from "./constraints.js";
import type { CheckId } from "./checks.js";

/** Content-addressed mesh handle. Bytes live in the store; IR holds the uri (D-050). */
export interface MeshRef {
  /** hbf://mesh/<meshHash>. */
  readonly uri: MeshUri;
  readonly hash: MeshHash;
  /** Triangle count. */
  readonly triangles: number;
  /** Axis-aligned bounds, min then max, mm. */
  readonly bbox: readonly [Vec3, Vec3];
  /** Enclosed volume, mm3. */
  readonly volumeMm3: number;
  readonly watertight: boolean;
}

/**
 * Body roles. Partition priority at stage 5 (D-047) is flex-conductor,
 * flex, conductor, art, body, so 3MF parts never overlap.
 */
export type BodyRole =
  | "body" | "structure" | "conductor" | "flex" | "flex-conductor" | "art" | "backer" | "mask" | "sheet";

/** Stage 5 partition order, highest priority first (D-047). */
export const PARTITION_PRIORITY = ["flex-conductor", "flex", "conductor", "art", "body"] as const satisfies readonly BodyRole[];

/** One material region of a part (D-048). */
export interface Body {
  readonly id: string;
  readonly mesh: MeshRef;
  /** Profile material id. */
  readonly material: string;
  /** Filament or sheet slot, 1-based. Colours belong to the slicer. */
  readonly slot: number;
  readonly role: BodyRole;
  /**
   * Plan outline of the body in the part frame, mm, xy: the outer ring
   * first, then holes. A prism body carries its outline and a stack body
   * the outline of its bottom band; any other route leaves it absent.
   * Filled at emit (stage 7) so a check that measures a wall in plan, such
   * as CHK-PRT-04, reads it from the Part IR and never from the draft (D-024,
   * D-224).
   */
  readonly outline?: readonly Ring[];
}

/**
 * Two bodies of one part that share a coincident face after stage 5
 * partition, with the shared area (M05-T20 step 1). Computed at stage 8 as
 * half the surface the union of the pair loses, (area a + area b - area of
 * a union b) / 2, on the emitted meshes; a pair whose area is at most one
 * grid cell squared (1 / MESH_GRID_PER_MM squared) is no row. Rows are in
 * body order, `a` before `b`, and hash with the part (D-049). The 3MF writer
 * reads them for the per-object overrides and CHK-3MF-08 (D-159).
 */
export interface BodyAdjacency {
  /** Body id, the earlier of the pair in Part.bodies order. */
  readonly a: string;
  readonly b: string;
  /** Shared face area, mm2, rounded to 1e-6 (computed). */
  readonly areaMm2: number;
}

/**
 * Frame rules F1 to F4, enforced at emit (stage 7, D-047). A part cannot be
 * emitted with an undeclared offset.
 */
export interface FrameDecl {
  /** F1: for a part with a rotational DOF, the mesh origin lies on the axis. */
  readonly originOnAxis: boolean;
  /** F2: whether the emitted mesh already carries its world offset. */
  readonly carriesOffset: boolean;
  /** F3: poses are immutable once emitted; a new pose is a new mesh hash. */
  readonly pose: "assembly" | "print" | "sheet";
  /** F4: a print pose is a reorientation of the assembly part; volumes must match. */
  readonly assemblyTwin?: MeshHash;
}

/**
 * A sub part printed or cut in another orientation (D-063). Declaring a pose
 * adds a volumeParity assertion against the assembly twin.
 */
export interface Pose {
  readonly frame: "assembly" | "print" | "sheet";
  /** Translation, mm. */
  readonly pos: Vec3;
  /** Rotation, unit quaternion. */
  readonly rot: Quat;
}

/** Cut-sheet sensor stack layer (D-063), so KEYWAY gates run on any surface. */
export interface StackLayer {
  readonly role: "conductor" | "resistive" | "spacer" | "backer" | "mask" | "face";
  /** Profile material id. */
  readonly material: string;
  /** Layer thickness, mm. */
  readonly t: Mm;
  /** Id of the outline this layer registers to. */
  readonly registration: string;
  /** Openings through this layer, rings in the stack face frame, mm. */
  readonly windows?: readonly Ring[];
}

export interface StackDecl {
  readonly face: FaceFrame;
  /** Bottom first. */
  readonly layers: readonly StackLayer[];
}

/**
 * A build-time number with a gate or an informational label (D-049, D-075).
 * FITS rows, spring curves, drive readouts and print time live here and hash
 * with the build, so a FITS row can never lag its geometry. qualifier and
 * basis come from qualify() or qualifyRow() in profile.ts: a travel taken
 * from a param is qualify([]), computed with basis null.
 */
export type Metric = MetricBase & Qualification;

interface MetricBase {
  /** Dotted id, for example "keys.1.travel", "spring.peakN". */
  readonly id: string;
  /** Value in `unit`; strings only for labels such as a verdict word. */
  readonly value: number | string;
  /** Unit, for example "mm", "N", "percent", "ohm", "us". */
  readonly unit?: string;
  /** One line a person reads: "45 percent of the cone". */
  readonly note: string;
  /** JSON pointers into params that move this value. */
  readonly drivenBy?: readonly string[];
  /**
   * The check id that gates this metric, or "informational" (D-075).
   * CheckId catches prefix and area typos such as "CHK-KYE-01". Suffix typos
   * are caught at registry lookup, not by the type.
   */
  readonly gate: CheckId | "informational";
  /** FITS panel grouping, for example "keys". */
  readonly group?: string;
}

/** A clamp with its reason, an unrouted net, or another non-fatal build fact. */
export interface BuildWarning {
  /** Upper snake code, for example "CLAMP", "UNROUTED". */
  readonly code: string;
  /** One line, lowercase: "knuckle radius raised to boreR x sqrt2 + 0.8". */
  readonly text: string;
  /** JSON pointer into params the warning concerns. */
  readonly param?: string;
  /** The bound that forced a clamp. */
  readonly bound?: Bound;
}

/** Where a part's geometry came from. */
export type PartSource =
  | { readonly kind: "kernel"; readonly routes: readonly MeshRoute[] }
  /** Imported meshes are placeable and checkable, never parametrised; winding is checked (D-102). */
  | { readonly kind: "imported"; readonly format: "stl" | "glb" | "step" | "wrl" | "scad"; readonly tier: Tier; readonly uri: string }
  /** Opt-in lazy replicad route, M14 only, never a model's default (D-024). */
  | { readonly kind: "brep"; readonly step?: string; readonly ops: readonly string[] };

/** The part as built: solid, bodies, typed features, frame, metrics and hash. */
export interface Part {
  /** Lowercase slug, unique in the chase. */
  readonly id: string;
  readonly name: string;
  readonly process: Process;
  /** Machine profile id; per part, since SLUG and OGEE mix laser and fdm. */
  readonly machine: string;
  /** Union of bodies. */
  readonly solid: MeshRef;
  /**
   * Volume of the union of the body meshes as the kernel computed it,
   * before the D-054 snap of the union's own crossing vertices, mm3
   * (computed). solid.volumeMm3 is the snapped mesh's; CHK-PRT-03 measures
   * overlap against this one. Absent where no union verified (an import
   * whose parts fail the audit).
   */
  readonly unionVolumeMm3?: number;
  readonly bodies: readonly Body[];
  /**
   * Body pairs with a coincident face (M05-T20). The stage runner fills it
   * for every built part, empty when no two bodies touch; a part from
   * imported files leaves it absent, since the importer only audits.
   */
  readonly bodyAdjacency?: readonly BodyAdjacency[];
  readonly features: readonly Feature[];
  readonly frame: FrameDecl;
  readonly pose?: Pose;
  readonly source: PartSource;
  /** Sheet parts only. */
  readonly plane?: Plane;
  /** Sheet thickness, mm. Sheet parts only. */
  readonly thickness?: Mm;
  readonly stack?: StackDecl;
  /** Board parts only (D-061, D-089). */
  readonly board?: BoardRecord;
  /** Catalog fields the build read, for printed parts that read bought-part envelopes and for the export gate (D-102, M08-T03 step 3). */
  readonly catalogReads?: readonly RecordRead[];
  readonly metrics: readonly Metric[];
  readonly warnings: readonly BuildWarning[];
  /** chase.assertions merged with PartDraft.assertions; what the checks prove. */
  readonly assertions: readonly Assertion[];
  /** sha256 over the RFC 8785 canonical BuildInputs (spec/ids.ts BuildHash, D-051); assigned only by core. */
  readonly buildHash: BuildHash;
}

/**
 * A joint between two instances. Relations between parts live here, never
 * in a part's features (D-177). A sheet pivot is kind revolute with `via`
 * naming the two bores and `stock` naming the bought rod or screw; between
 * two sheet parts a revolute joint without stock fails its check. A pin in
 * a slot is kind prismatic (or planar when it also turns) with `via` naming
 * the pin (a boss or bore) and the slot (a window or pocket), `range` the
 * travel, plus a contact assertion over range on the same pair, so the
 * pair is checked for clearance through travel instead of clash.
 */
export interface JointDecl {
  readonly id: string;
  readonly kind: "revolute" | "prismatic" | "cylindrical" | "spherical" | "planar" | "fixed";
  /** Instance id. */
  readonly a: string;
  /** Instance id. */
  readonly b: string;
  readonly axis?: Axis;
  /** Travel limits: degrees for revolute, mm for prismatic. */
  readonly range?: { /** degrees or mm by joint kind */ readonly min: number; /** degrees or mm by joint kind */ readonly max: number };
  /** Feature pair realising the joint; selects which check runs. */
  readonly via?: { readonly featureA: string; readonly featureB: string };
  /** Bought round stock carrying a revolute joint; diameter in mm, catalog row id. */
  readonly stock?: { readonly kind: "rod" | "screw"; /** mm */ readonly d: Mm; readonly catalogId: string };
}

/** A bought part placed in an assembly. Bought is a sourcing state; Process has no bought value. */
export interface BoughtBody {
  readonly id: string;
  readonly catalogId: string;
  /** Catalog row tier; inferred is usable in sim and refused at fabrication export (D-102). */
  readonly tier: Tier;
  /** Body and flange envelope. */
  readonly envelope: MeshRef;
  readonly pose: Pose;
}

/** One placed copy of a part in an assembly. */
export interface Instance {
  readonly id: string;
  /** Part id within the assembly's parts. */
  readonly part: string;
  readonly pose: Pose;
}

/** A port-to-port link between instances; incompatible port interfaces refuse. */
export interface Connection {
  readonly id: string;
  readonly a: { readonly instance: string; readonly port: string };
  readonly b: { readonly instance: string; readonly port: string };
  /** Net the connection joins, when it carries one. */
  readonly net?: string;
}

/** Declared relations the build must satisfy. */
export type Assertion =
  | { readonly type: "clearance"; readonly a: string; readonly b: string; /** mm */ readonly minMm: Mm; readonly over: "rest" | "range" | "cycle" }
  | { readonly type: "contact"; readonly a: string; readonly b: string; readonly over: "rest" | "range" }
  | { readonly type: "joined"; readonly nets: readonly string[] }
  | { readonly type: "apart"; readonly nets: readonly string[] }
  | { readonly type: "apartExcept"; readonly nets: readonly string[]; readonly cut: string }
  | { readonly type: "reach"; readonly screw: string }
  | { readonly type: "insertable"; readonly part: string; readonly into: string }
  | { readonly type: "travel"; readonly joint: string; /** degrees or mm by joint kind */ readonly minRange: number }
  | { readonly type: "volumeParity"; readonly part: string }
  /** A mechanism's governing identity holds on the built geometry; `mechanism` is the applied mechanism id (D-177). */
  | { readonly type: "identity"; readonly mechanism: string }
  /** Face-down art and keyed features on flipped parts (D-063). */
  | { readonly type: "mirrorOnFlip"; readonly part: string; readonly features: readonly string[] }
  /** Passes when interference exceeds the floor (D-074); DERRICK 33.4 mm3. */
  | { readonly type: "capture"; readonly a: string; readonly b: string; /** mm3 */ readonly minInterferenceMm3: number };

export type AssertionType = Assertion["type"];

export interface Assembly {
  readonly id: string;
  readonly parts: readonly Part[];
  readonly instances: readonly Instance[];
  readonly bought: readonly BoughtBody[];
  readonly joints: readonly JointDecl[];
  readonly connections: readonly Connection[];
  readonly assertions: readonly Assertion[];
  readonly metrics: readonly Metric[];
  readonly warnings: readonly BuildWarning[];
  /** sha256 over the RFC 8785 canonical BuildInputs (spec/ids.ts BuildHash, D-051); assigned only by core. */
  readonly buildHash: BuildHash;
}

/** A nested sheet, the target of SHT checks. */
export interface Sheet {
  readonly id: string;
  /** Sheet width and height, mm. */
  readonly size: readonly [Mm, Mm];
  /** Profile material id. */
  readonly material: string;
  /** Machine profile id. */
  readonly machine: string;
  readonly placements: readonly {
    readonly part: string;
    /** Placement origin, mm. */
    readonly at: readonly [Mm, Mm];
    /** Rotation, degrees. */
    readonly rotDeg: number;
  }[];
}
