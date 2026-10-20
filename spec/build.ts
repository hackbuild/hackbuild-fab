// spec/build.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// What build.ts returns: declarations the kernel turns into Part IR. Every
// conditional and loop lives in build.ts; the kernel runs the generators in
// the fixed stage order of D-047. build.ts is code, so it runs only
// inside the build sandbox (BUILD_SANDBOX, D-178); the chase beside it is
// read as data (spec/chase.ts CHASE_SOURCE_RULES).
// Version 4, 2026-10-04. Carries D-024, D-047, D-048, D-049, D-053, D-054,
// D-058, D-063, D-132, D-165, D-177, D-178.
// 2026-10-05: ContactFn for the drive pad (gold standard P-05, G-20).
// 2026-10-20: loft and sweep routes and the csg hull op (PLAN.md 3.3).

import type { Axis, FaceFrame, FaceRef, FitClassId, Mm, MeshRoute, Process, Ring, Tier, Vec2, Vec3 } from "./ids";
import type { Feature, FeatureAt, KindMilestone } from "./features";
import type { AppliedArchetype } from "./chase";
import type { ApplyOut, MechanismApplyOut } from "./canon";
import type {
  Assertion, BodyRole, BoughtBody, BuildWarning, Connection, FrameDecl, JointDecl, Metric, Pose, StackDecl,
} from "./part-ir";
import type { ProfileLookup } from "./profile";

/** Base shape of a body, one variant per mesh route (D-053). */
export type ShapeDecl =
  /** Constructive prism, no CSG. outline[0] is the outer ring, the rest holes; z is [bottom, top] in mm. */
  | { readonly route: "prism"; readonly outline: readonly Ring[]; readonly z: readonly [Mm, Mm] }
  /** Z bands, each a prism; the overlap between bands is held to profile constants stack.bandOverlap.lo to .hi (CHK-PRT-02). */
  | { readonly route: "stack"; readonly bands: readonly { readonly outline: readonly Ring[]; /** mm */ readonly z: readonly [Mm, Mm] }[] }
  /**
   * Revolve of an (r, z) profile in mm. `field` names a radial displacement
   * field f(theta, z) in the registry (TENON threads, bayonets, grooves).
   * r is measured from `axis` and z along it from `axis.origin`; absent
   * means origin [0, 0, 0] and direction [0, 0, 1] in part coordinates.
   */
  | {
      readonly route: "revolve";
      readonly profile: readonly Vec2[];
      /** Revolve axis in part coordinates; origin in mm. Places an off-centre button. */
      readonly axis?: Axis;
      /** Angular segments, count. */
      readonly segments?: number;
      readonly field?: { readonly id: string; readonly params: Readonly<Record<string, number>> };
    }
  /** Lathe mesher with an optional texture heightfield uri (TOGGLE). axis as for revolve. */
  | {
      readonly route: "lathe";
      readonly profile: readonly Vec2[];
      /** count */
      readonly segments: number;
      readonly heightfield?: string;
      /** Lathe axis in part coordinates; origin in mm. Absent means origin [0, 0, 0], direction [0, 0, 1]. */
      readonly axis?: Axis;
    }
  /**
   * XY raster with exact Z (COLLAR, INLAY, KNURL). Each layer's mask is an
   * hbf:// uri; res in mm per pixel. Each z bound is a layer top of the
   * active preset (MachineView.layerTop, first layer included). Layer tops
   * enter the mesh kernel as q(firstLayer + i x layerHeight), where q is the
   * D-054 1/1024 mm snap. exactZ means every z bound equals
   * q(MachineView.layerTop(i)) for some i exactly. It is proven against that
   * snapped grid, never against multiples of the layer height and never
   * against the unsnapped tops, which float32 storage does not preserve
   * (2.41 reads back as 2.4099999964). On ffc5p_20260819 the profile test
   * (M-S-T02) pins the unsnapped tops 0.73, 1.45, 2.41 (computed); the mesh
   * test (M-S-T03) pins the snapped tops 0.73046875, 1.4501953125,
   * 2.41015625 (computed) with no tolerance
   * (evidence/audit/m0/exec/logs/ms-t03-mesh.txt).
   */
  | { readonly route: "raster"; readonly layers: readonly { readonly mask: string; /** mm */ readonly z: readonly [Mm, Mm] }[]; /** mm per pixel */ readonly res: number }
  /** Trace raster, DP simplify, ear clip, then prism (SPRUE). tolerance in mm. */
  | { readonly route: "trace"; readonly source: string; /** mm */ readonly tolerance: Mm; /** mm */ readonly z: readonly [Mm, Mm] }
  /**
   * Loft of closed xy rings at rising heights z in mm (packages/mesh
   * routes/loft.ts). Every ring has the same point count; point i of one
   * ring joins point i of the next, and the first and last rings are capped
   * by earcut. Guarantees manifold, not exactZ (PLAN.md 3.3).
   */
  | { readonly route: "loft"; readonly sections: readonly { readonly ring: Ring; /** mm */ readonly z: Mm }[] }
  /**
   * Sweep of one closed section along an open polyline path in part
   * coordinates, mm (packages/mesh routes/sweep.ts). The section's u axis
   * follows the rotation minimizing frame normal and v the binormal; both
   * ends are capped. Guarantees manifold, not exactZ (PLAN.md 3.3).
   */
  | { readonly route: "sweep"; readonly section: Ring; readonly path: readonly Vec3[] }
  /**
   * Boolean via manifold. Union tries batch, verifies is_volume, then folds
   * (D-055). hull is the convex hull of every operand (Manifold.hull): two
   * cylinders give a slot (PLAN.md 3.3).
   */
  | { readonly route: "csg"; readonly op: "union" | "difference" | "intersection" | "hull"; readonly of: readonly ShapeDecl[] }
  /** Imported mesh; placeable and checkable, never parametrised; winding checked (D-102). */
  | { readonly route: "imported"; readonly uri: string; readonly format: "stl" | "glb" | "step" | "wrl" | "scad"; readonly tier: Tier }
  /** Opt-in replicad route, lazy, M14, never in the default bake (D-024). */
  | { readonly route: "brep"; readonly ops: readonly string[] };

/** What a mesh route promises (D-053). */
export interface MeshRouteDef {
  readonly route: MeshRoute;
  readonly guarantees: {
    readonly manifold: boolean;
    readonly exactZ: boolean;
    readonly perSlotDisjoint: boolean;
  };
  /** Loaded on first use, outside the default offline bake. */
  readonly lazy: boolean;
  /**
   * The route this one lowers to in mesh after its own preprocessing,
   * sharing that route's code: stack to prism (one per band), lathe to
   * revolve with a heightfield field, trace to prism. Absent on routes
   * with their own mesher.
   */
  readonly lowersTo?: "prism" | "revolve";
}

/**
 * Kernel stage order per body then per part (D-047).
 *
 * Before stage 1, part.build runs the applied merge (D-165): for every
 * chase.applied entry whose `part` equals a PartDraft id, in array order,
 * the kernel resolves the entry's FaceRef against the draft's `faces` (an
 * unknown ref is E_REF with didYouMean over the declared face ids; a uv
 * outside a declared extent is E_REF naming the face), resolves the
 * archetype, validates params, calls its apply() with the resolved frame
 * on the draft as build.ts returned it, maps local slots onto
 * chase.materials by material and role, prefixes local ids with
 * `<archetype id>.<applied index>.`, and appends the bodies and features
 * to the draft. An entry naming no PartDraft id is E_REF; a slot missing
 * from chase.materials is E_SCHEMA naming the slot arch.apply would add.
 * The merged draft, with applied entries in defHash, then enters stage 1.
 */
export const APPLIED_MERGE = "mergeApplied" as const;


export const BUILD_STAGES = [
  "base", "preUnionCutters", "unionPositives", "postUnionCutters", "partition", "insets", "frameEmit", "hash",
] as const;
export type BuildStage = (typeof BUILD_STAGES)[number];

export interface BodyDraft {
  readonly id: string;
  readonly role: BodyRole;
  /** Filament or sheet slot, 1-based. */
  readonly slot: number;
  /** Profile material id; defaults to the chase material slot's material. */
  readonly material: string;
  readonly base: ShapeDecl;
}

/**
 * A named face of a part, declared by build.ts on every build (D-165).
 * Placements in chase.applied address faces by id, so the frame here moves
 * with params and the placement moves with it. Ids are unique per part
 * (E_SCHEMA otherwise) and read "<body id>.<face>", for example "body.top".
 * Imported and BRep parts declare faces the same way.
 */
export interface FaceDecl {
  readonly id: string;
  /** Frame for this build: origin mm, outward normal, in-face u. */
  readonly frame: FaceFrame;
  /** Optional outline in the face frame, each vertex mm; a placement outside it is E_REF. */
  readonly extent?: Ring;
}

export interface PartDraft {
  readonly id: string;
  readonly name: string;
  readonly process: Process;
  /** Machine profile id, per part. */
  readonly machine: string;
  readonly frame: FrameDecl;
  readonly pose?: Pose;
  readonly bodies: readonly BodyDraft[];
  readonly features: readonly Feature[];
  /** Named faces chase.applied and arch.apply address (D-165). */
  readonly faces?: readonly FaceDecl[];
  readonly stack?: StackDecl;
  /** Sheet thickness, mm. Sheet parts only. */
  readonly thickness?: Mm;
  /** FITS rows, spring curves, drive readouts, print time; hashed with the build (D-049). */
  readonly metrics?: readonly Metric[];
  /** Clamps with reasons and unrouted nets. */
  readonly warnings?: readonly BuildWarning[];
  /**
   * Assertions that depend on params, such as apart over the nets this
   * preset builds. The kernel merges them with chase.assertions; a net or
   * feature named here that the build did not produce is E_REF.
   */
  readonly assertions?: readonly Assertion[];
}

/** An assembly whose parts carry only the kinds admitted at milestone M (D-058). */
export interface AssemblyDraft<M extends KindMilestone = "M16"> {
  readonly id: string;
  readonly name: string;
  readonly parts: readonly PartDraftAt<M>[];
  readonly instances: readonly { readonly id: string; readonly part: string; readonly pose: Pose }[];
  readonly bought: readonly BoughtBody[];
  readonly joints: readonly JointDecl[];
  readonly connections: readonly Connection[];
  readonly assertions: readonly Assertion[];
  readonly metrics?: readonly Metric[];
  readonly warnings?: readonly BuildWarning[];
}

/**
 * Machine helpers: layer and line snapping from the active preset.
 *
 * The layer grid is not uniform from the bed. Layer index 0 is the first
 * layer, top at firstLayer; layer i has its top at firstLayer + i x
 * layerHeight. On ffc5p_20260819 (first 0.25, then 0.24) the tops are
 * 0.25, 0.49, 0.73, ..., 1.69 (index 6). Every z here is absolute in the
 * print pose, measured from the bed face. Comparisons use a tolerance of
 * 1e-6 mm so float error never moves a value by a whole layer. The 1e-6 mm
 * tolerance applies to profile arithmetic only; mesh z comparisons use the
 * snapped tops q(layerTop(i)) (D-054) exactly.
 */
export interface MachineView {
  readonly id: string;
  /** Preset layer height above the first layer, mm. */
  readonly layerHeight: Mm;
  /** Preset first layer height, mm. */
  readonly firstLayer: Mm;
  /** Preset line width, mm. */
  readonly lineWidth: Mm;
  /**
   * Snap an absolute height up to the next layer top, mm:
   * firstLayer + ceil((z - firstLayer - 1e-6) / layerHeight) x layerHeight,
   * and firstLayer for any z at or below firstLayer. A thickness stacked
   * on another snaps through its top: band = layer(skinTop + 0.72) - skinTop.
   */
  layer(z: Mm): Mm;
  /** Top of layer index i (count from 0), mm: firstLayer + i x layerHeight. */
  layerTop(i: number): Mm;
  /**
   * Index of the layer whose top is at or above z (count from 0), so
   * layerTop(layerIndex(z)) === layer(z). layerIndex(1.69) is 6 on ffc5p_20260819.
   */
  layerIndex(z: Mm): number;
  /** n line widths, mm. */
  line(n: number): Mm;
}

/**
 * The authoring surface handed to a build function (@hackbuild/kernel/author),
 * typed at milestone M so part() admits only the kinds FeatureAt<M> allows.
 */
export interface Author<M extends KindMilestone = "M16"> {
  /** Read-only; every read is recorded for profileHash. */
  readonly profile: ProfileLookup;
  machine(id?: string): MachineView;
  readonly ring: {
    /** Rounded rectangle centred at `at`; w, h, r in mm. */
    roundRect(w: Mm, h: Mm, r: Mm, at?: Vec2): Ring;
    /**
     * Circle of radius r in mm; segments is a count. Points come from the
     * committed unit-circle table in packages/geom, never Math.sin or
     * Math.cos, then snap to the 1/1024 mm grid, so node, Chromium and
     * WebKit give one meshHash (D-175).
     */
    circle(r: Mm, at?: Vec2, segments?: number): Ring;
    /** Offset by d in mm through manifold CrossSection (D-163). */
    offset(rings: readonly Ring[], d: Mm, join?: "round" | "miter"): readonly Ring[];
  };
  body(id: string, o: { readonly role: BodyRole; readonly slot: number; readonly base: ShapeDecl; readonly material?: string }): BodyDraft;
  part(o: Omit<PartDraftAt<M>, "frame"> & { readonly frame?: Partial<FrameDecl> }): PartDraftAt<M>;
  /** Resolve a fit class id against profile; an unknown id throws a ThrownCommandError with code E_REF. */
  fit(id: string): FitClassId;
  /** A derived value with a reason: shows in the HUD, hashes, can carry a bound. Value in the caller's unit. */
  derive(id: string, value: number, note: string, drivenBy?: readonly string[]): number;
  /**
   * Return f with drivenBy set; keys are checked against T's fields, values
   * are JSON pointers into params. Unknown pointers are E_REF at build.
   */
  bind<T extends Feature>(f: T, map: Partial<Record<Exclude<keyof T, "kind" | "id" | "body" | "note" | "drivenBy"> & string, string>>): T;
  warn(code: string, text: string, extra?: Partial<BuildWarning>): void;
  /**
   * Declare a named face for this build (D-165), for example
   * k.face("body.top", { origin: [0, 0, p.brickH], normal: [0, 0, 1], u: [1, 0, 0] }).
   * build.ts puts the result in PartDraft.faces.
   */
  face(id: string, frame: FaceFrame, extent?: Ring): FaceDecl;
  /**
   * chase.applied entries for a part, read-only (D-165). The kernel merges
   * them before stage 1; build.ts reads them only to make room (a clearance
   * pocket, a thicker skin) and never re-applies them, since the merge
   * already does and a repeated id is E_SCHEMA.
   */
  applied(partId: string): readonly AppliedArchetype[];
  /**
   * Run an archetype's apply() from build.ts for placements the design
   * computes itself (STYLUS picks its sensor by param). `draft` defaults to
   * an empty draft on the active machine. Stub and unproven ids are E_REF;
   * a candidate builds and its status chip reads candidate (M10-T09),
   * while the arch.apply command still refuses candidates. build.ts spreads
   * the result into the PartDraft it returns; local slot numbers resolve
   * against chase.materials by material and role at merge. A FaceRef
   * resolves against `draft.faces`; a FaceFrame is used as given, since
   * build.ts computes it from params on every build.
   */
  arch(id: string, face: FaceFrame | FaceRef, params: Readonly<Record<string, unknown>>, draft?: PartDraft): ApplyOut;
  /**
   * Run a mechanism's apply() (D-177): primitive features, gated metrics
   * and assertions for a mechanism with a governing identity, for example
   * k.mech("displacement-coincidence-latch", "body.top", p.latch). Stub
   * ids and ids without apply() are E_REF. build.ts spreads the result
   * into the PartDraft it returns.
   */
  mech(id: string, face: FaceFrame | FaceRef, params: Readonly<Record<string, number>>, draft?: PartDraft): MechanismApplyOut;
}

/**
 * A PartDraft restricted to the kinds admitted at milestone M (D-058,
 * D-177). Author<M>.part, AssemblyDraft<M>.parts and BuildFn<P, M> are
 * typed against this, so a build.ts cannot declare a kind that no check
 * and reference prove yet. The default "M16" admits every kind, which keeps
 * M-S (typed against PartDraft) and the keys flex-pair fixture compiling.
 * spec/chase.ts defineBuild stays at the default milestone, since
 * TypeScript has no partial inference next to its inferred const C.
 * @hackbuild/kernel/author re-exports defineBuild as
 * <const C extends Chase>(chase: C, fn: BuildFn<ParamsOf<C>, KERNEL_MILESTONE>)
 * => BuildFn<ParamsOf<C>, KERNEL_MILESTONE>, so a build.ts loaded by an M03
 * kernel that passes a bore to k.part fails tsc at the call.
 */
export type PartDraftAt<M extends KindMilestone> = Omit<PartDraft, "features"> & {
  readonly features: readonly FeatureAt<M>[];
};

/** What a build returns at milestone M. */
export type BuildResultAt<M extends KindMilestone = "M16"> = PartDraftAt<M> | AssemblyDraft<M>;

export type BuildResult = BuildResultAt<"M16">;

/** What build.ts exports: params in, declarations out, typed at milestone M. */
export type BuildFn<P, M extends KindMilestone = "M16"> = (params: P, k: Author<M>) => BuildResultAt<M> | Promise<BuildResultAt<M>>;

/**
 * A drive stimulus: true or false for hold, a number in the target's unit
 * for slide (mm) or a one-axis tilt (degrees), tilt and azimuth for a
 * stick (TOGGLE setTilt(14.2, 180)).
 */
export type DriveStimulus = boolean | number | { readonly tiltDeg: number; readonly phiDeg: number };

/** What one stimulus does to the built contacts. */
export interface ContactState {
  /** Contact region ids closed by the stimulus, in pad order (TOGGLE pad W, PIP key A). */
  readonly closed: readonly string[];
  /** Direction word for a stick, "none" below contact (TOGGLE DIR). */
  readonly dir?: string;
  /** Pose of the driven body for the 3D view. */
  readonly pose?: {
    /** degrees */ readonly tiltDeg?: number;
    /** degrees */ readonly phiDeg?: number;
    /** mm */ readonly travelMm?: number;
  };
  /** Contact force at this stimulus, N, where the metrics carry a spring curve. */
  readonly forceN?: number;
}

/**
 * The one contact function a design with a drive pad exports from build.ts
 * (BenchDecl views.drive.contact, G-20). It reads only the metrics of the
 * current build, so the pad, the 3D pose, the readout and BenchHook.drive
 * get the same answer and a geometry change moves all four (G-19). Pure,
 * synchronous and deterministic: no Author, no profile reads, no clock. It
 * runs in the build sandbox for the hook and is inlined by the bake for
 * the pad, so it imports nothing beyond BUILD_IMPORTS.
 */
export type ContactFn = (metrics: readonly Metric[], target: string, stimulus: DriveStimulus) => ContactState;

// Build sandbox (D-178). Every transport that runs a build.ts (CLI, MCP
// server, the HTTP endpoint the FAB app calls) runs it in a child node
// process, never in the process holding the store, the gate key or the
// workspace. The policy below is the contract core/src/sandbox.ts (the
// parent) and core/src/sandbox-child.ts (the child) implement and
// core/test/build-sandbox.test.ts proves.

/** Module specifiers a build.ts and its relative imports may load. */
export const BUILD_IMPORTS = ["@hackbuild/kernel/author", "@hackbuild/spec"] as const;

/**
 * The sandbox policy.
 *
 * Node side: `node --permission --allow-fs-read=<design dir>,<resolved
 * @hackbuild/kernel dir>,<resolved runtime dependency dirs>` with no
 * --allow-fs-write, --allow-child-process, --allow-worker, --allow-addons
 * or --allow-wasi, and `--max-old-space-size=<heapMb>`. Node 22.18 strips
 * erasable TypeScript types without a flag (vendor, Node release notes;
 * confirmed at M00), so build.ts runs as written, provided the design
 * tsconfig sets erasableSyntaxOnly and relative imports carry ".ts".
 *
 * A preload installs a resolve hook that refuses every specifier outside
 * BUILD_IMPORTS and outside the design directory (node: builtins, URLs,
 * other packages, "../" escapes, dynamic import included), and deletes
 * fetch, WebSocket, EventSource, process.binding, process._linkedBinding
 * and process.dlopen before build.ts loads. Whether the Node floor offers a
 * network permission flag is unknown; if the pinned Node has one, the child
 * runs with network denied by it as well.
 *
 * The parent sends params, the profile snapshot and the machine presets
 * over IPC; the child returns the BuildResult and the profile read log. The
 * parent validates the result against the derived PartDraft and
 * AssemblyDraft schemas before kernel stage 1, so a hostile or broken build
 * can only produce a draft the schema refuses. A child is reused while the
 * hash of build.ts and its relative imports is unchanged and is killed with
 * SIGKILL at the wall budget; the next call starts a fresh one.
 *
 * Hardening in force (core/src/sandbox.ts, core/src/sandbox-child.ts,
 * 2026-10-08):
 * - CPU: on POSIX the child starts through /bin/sh with `ulimit -t` of
 *   wallMs plus 2 s and `env -u PWD -u SHLVL -u _`, so a child the parent
 *   can no longer SIGKILL still stops; the parent SIGKILLs every live child
 *   on its own exit and on SIGINT, SIGTERM and SIGHUP.
 * - IPC: the build cannot send; process.send and process._send are sealed
 *   and restored only around the one reply, a v8.serialize buffer the parent
 *   size-checks against maxResultBytes before it deserializes. The child
 *   exits when the channel disconnects.
 * - Imports: an allowlisted specifier must also resolve, by realpath, inside
 *   its workspace package root.
 * Residual risk: process.channel stays reachable, because Node's disconnect
 * path asserts it. A build that writes raw IPC frames to the pipe handle
 * still meets the buffer-only rule and the size cap, but could forge a small
 * reply's profile reads list. Windows keeps a plain fork with no rlimit.
 *
 * The bake runs no TypeScript: chase.bake reads the chase through the
 * source reader, embeds it as JSON, and bundles build.ts with the pinned
 * vite (D-040) under the same import allowlist, so the page carries only
 * JavaScript its baker built. Data that reaches a bake later (share link,
 * dropped design JSON) is data under D-166 and D-167, never code.
 */
export interface BuildSandboxPolicy {
  /** Wall-clock budget per build call, ms. */
  readonly wallMs: number;
  /** V8 old-space cap for the child, MB. */
  readonly heapMb: number;
  /** IPC result cap, bytes. */
  readonly maxResultBytes: number;
  readonly imports: typeof BUILD_IMPORTS;
  /** Read access: the design directory and the resolved kernel and dependency directories. */
  readonly fsRead: "design-and-kernel";
  readonly fsWrite: false;
  readonly network: false;
  readonly childProcess: false;
  readonly workers: false;
  readonly addons: false;
  /**
   * The child is spawned with env {} (no variable inherited, NODE_OPTIONS
   * included) and execArgv limited to the permission and heap flags, so a
   * build cannot read tokens from process.env (D-178).
   */
  readonly env: "empty";
}

/** Defaults in force; plan budgets (inferred), raised only by a new decision entry. */
export const BUILD_SANDBOX: BuildSandboxPolicy = {
  wallMs: 30000,
  heapMb: 2048,
  maxResultBytes: 67108864,
  imports: BUILD_IMPORTS,
  fsRead: "design-and-kernel",
  fsWrite: false,
  network: false,
  childProcess: false,
  workers: false,
  addons: false,
  env: "empty",
};

/**
 * Why the sandbox stopped a build. Each returns E_KERNEL with
 * CommandError.record "build-sandbox/<reason>" and the build.ts path; no
 * geometry, store entry or artifact is written.
 * - import: a specifier outside BUILD_IMPORTS or the design directory.
 * - fs-read: a read outside the allowed directories (ERR_ACCESS_DENIED).
 * - fs-write: any write (ERR_ACCESS_DENIED).
 * - network: a removed global or binding was called.
 * - child-process, worker, addon: the matching permission was refused.
 * - wall: the call exceeded wallMs and the child was killed.
 * - heap: the child ran out of heap.
 * - result-size: the IPC result exceeded maxResultBytes.
 * - result-schema: the result failed the PartDraft or AssemblyDraft schema
 *   (a NaN or infinite number included); CommandError.path points at it.
 * - generator: the confinement around a direct-backend board generator
 *   (gen.py, D-089) stopped it; on darwin that is sandbox-exec refusing a
 *   network call, a write outside its run folder or a program other than the
 *   tools/py interpreter. Reads stay unrestricted (R-25).
 */
export const BUILD_SANDBOX_REASONS = [
  "import", "fs-read", "fs-write", "network", "child-process", "worker", "addon", "wall", "heap", "result-size", "result-schema", "generator",
] as const;
export type BuildSandboxReason = (typeof BUILD_SANDBOX_REASONS)[number];
