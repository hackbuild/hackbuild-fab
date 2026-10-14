// The D-047 stage runner, per body then per part: 1 base shape through its
// route; 2 pre-union cutters; 3 union positives; 4 post-union cutters; 5
// partition by role priority (flex-conductor, flex, conductor, art, body);
// 6 insets (coincidence, pinch); 7 frame emit; 8 hash. Stages 2 to 4 take
// the lists a caller passes per body id, and feature kind bodies (conductor,
// inlay) join the draft's bodies before stage 1. This is the only stage
// runner: core's part.build meshes every design here (ARCHITECTURE.md 4).
// Every wasm object a run makes is owned by one scope and freed before the
// run returns (D-055).

import type { Manifold, ManifoldToplevel } from "manifold-3d";
import {
  PARTITION_PRIORITY, type BodyAdjacency, type BodyDraft, type BodyRole, type BuildWarning, type MeshRoute, type MeshRouteDef, type Mm,
  type PartDraft, type ProfileLookup, type Ring, type ShapeDecl, type Vec2, type Vec3,
} from "@hackbuild/spec";
import { GRID, insetCoincident, insetPinch, loadGeom, type Geom, type Outline } from "@hackbuild/geom";
import { bounds, meshOf, signedVolume, snap, snapWeld, type MeshData } from "./hash.js";
import { audit } from "./audit.js";
import { unionReport } from "./union.js";
import { liveCount, loadManifold, withScope, type Scope } from "./wasm.js";
import {
  cleanRing, joinMeshes, meshError, outlineComponents, prismFromComponents, prismMesh, type PrismMesh, type RouteWarning,
} from "./routes/prism.js";
import { bandOverlap, checkBandOverlaps, stackMesh } from "./routes/stack.js";
import { raster, type RasterVolume } from "./routes/raster.js";
import { revolveShape } from "./routes/revolve.js";
import { IMPORTED_ROUTE, importStl, type ImportedBody } from "./routes/imported.js";
import { importGlb } from "./routes/imported-glb.js";

/** A raster layer mask as the store hands it back: labels row major, cell (0, 0) low corner at origin mm. */
export interface RasterMask {
  readonly width: number;
  readonly height: number;
  readonly labels: Uint8Array;
  readonly origin?: Vec2;
}

/** Shapes a feature kind adds to one body at stages 2 to 4, keyed by body id. */
export interface BodyCutters {
  readonly preUnionCutters?: readonly ShapeDecl[];
  readonly unionPositives?: readonly ShapeDecl[];
  readonly postUnionCutters?: readonly ShapeDecl[];
}

export interface StageInput {
  readonly draft: PartDraft;
  /**
   * Bodies feature kinds generate (GeneratedGeometry.bodies), appended to
   * draft.bodies before stage 1, so they take stages 1 and 5 to 8 like any
   * declared body. Ids are unique across both lists.
   */
  readonly bodies?: readonly BodyDraft[];
  /** Profile reads for the stage 6 inset distances and the stack band overlap. */
  readonly profile: Pick<ProfileLookup, "constant">;
  /** Resolves a raster mask uri; required when a body takes the raster route. */
  readonly mask?: (uri: string) => RasterMask;
  /** Resolves an imported mesh uri to its file bytes; required when a body takes the imported route. */
  readonly meshBytes?: (uri: string) => Uint8Array;
  /** Millimetres per file unit of an imported mesh uri (ImportSpec.units); absent reads 1. */
  readonly meshScale?: (uri: string) => number;
  /** Stage 2 to 4 shapes per body id; absent means empty lists. */
  readonly cutters?: Readonly<Record<string, BodyCutters>>;
  /** "sweep" turns a healer that did not converge into a failure (M00-T05 step 2). */
  readonly mode?: "build" | "sweep";
}

/** One body after stage 8. */
export interface StagedBody {
  readonly draft: BodyDraft;
  readonly mesh: MeshData;
  readonly volumeMm3: number;
}

export interface StageOutput {
  readonly bodies: readonly StagedBody[];
  /** Union of the bodies, snapped. */
  readonly solid: MeshData;
  /** Stage 7: the translation lifted off the vertices into the 3MF item transform, mm. */
  readonly itemTransform: Vec3;
  /** Route warnings (healer, prism retries) and stage notes; they hash with the build (D-049). */
  readonly warnings: readonly BuildWarning[];
  readonly routes: readonly MeshRoute[];
  /** Stages that ran, in order (D-047 names). */
  readonly stages: readonly string[];
  /** Stage 8: body pairs with a coincident face and its area (M05-T20); absent for an imported part. */
  readonly adjacency?: readonly BodyAdjacency[];
  /**
   * Stage 8: volume of the union of the emitted body meshes as the kernel
   * computed it, before meshOf snaps the union's own crossing vertices to
   * the D-054 grid, mm3 (computed). Absent when no union was taken.
   */
  readonly unionVolumeMm3?: number;
}

/** A shared area at most one grid cell squared is float noise of the snap, not a face (D-054). */
export const ADJACENCY_MIN_MM2 = GRID * GRID;

/**
 * Body pairs that share a coincident face after partition (M05-T20 step 1).
 * Stage 5 leaves the bodies disjoint, so the union of a touching pair loses
 * the shared face from both surfaces: area = (A + B - area of the union) / 2.
 * Only pairs whose bounds meet within one grid step are unioned. Rows are in
 * body order and rounded to 1e-6 mm2.
 */
function bodyAdjacency(
  scope: Scope, solids: readonly Manifold[], meshes: readonly MeshData[], ids: readonly string[], warnings: BuildWarning[],
): BodyAdjacency[] {
  const box = meshes.map((m) => bounds(m));
  const area = solids.map((s) => s.surfaceArea());
  const out: BodyAdjacency[] = [];
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      const [loA, hiA] = box[i]!, [loB, hiB] = box[j]!;
      if ([0, 1, 2].some((k) => loA[k]! > hiB[k]! + GRID || loB[k]! > hiA[k]! + GRID)) continue;
      // The one verified union (D-055); a pair it refuses gets no row and says so.
      let joined: Manifold;
      try {
        joined = scope.own(unionReport([solids[i]!, solids[j]!]).solid);
      } catch (e) {
        if ((e as { hbf?: unknown }).hbf === undefined) throw e;
        warnings.push({ code: "ADJACENCY", text: `${ids[i]!} and ${ids[j]!}: the pair union is refused, so no shared face area is recorded (computed)` });
        continue;
      }
      const shared = (area[i]! + area[j]! - joined.surfaceArea()) / 2;
      if (shared > ADJACENCY_MIN_MM2) out.push({ a: ids[i]!, b: ids[j]!, areaMm2: Math.round(shared * 1e6) / 1e6 });
    }
  }
  return out;
}

/** Context a route builder reads. */
interface RouteCtx {
  readonly wasm: ManifoldToplevel;
  readonly scope: Scope;
  readonly geom: Geom;
  readonly input: StageInput;
  readonly rasterCache: Map<string, Map<number, MeshData>>;
  readonly path: string;
  /** Stage 6 inset distance in mm, 0 at stage 1, and which inset produced it. */
  readonly inset: { readonly d: Mm; readonly kind: "none" | "coincidence" | "pinch" };
}

/**
 * What a route hands to stage 2: closed shells, each manifold, all in the
 * body's slot; or, for csg, the solid its boolean left, owned by the run.
 */
interface BaseShape {
  readonly shells: readonly MeshData[];
  readonly solid?: Manifold;
  readonly warnings: readonly RouteWarning[];
}

/** A mesh route as registered: its D-053 guarantees and its builder. */
interface RouteEntry extends MeshRouteDef {
  readonly build?: (shape: ShapeDecl, body: BodyDraft, ctx: RouteCtx) => BaseShape;
  /** Milestone that lands a route this kernel build does not run; the refusal hint names it. */
  readonly landsAt?: string;
}

function insetOutline(ctx: RouteCtx, outline: readonly Ring[], path: string): Outline[] {
  const comps = outlineComponents(ctx.geom, outline, path);
  if (ctx.inset.d === 0) return comps;
  const section = ctx.geom.union(comps.map((c) => ctx.geom.fromOutline(c.outer, c.holes)));
  const shrunk = ctx.inset.kind === "pinch" ? insetPinch(section, ctx.input.profile) : insetCoincident(section, ctx.input.profile);
  const out = shrunk.components().map((c) => ({ outer: cleanRing(c.outer), holes: c.holes.map(cleanRing).filter((h) => h.length >= 3) })).filter((c) => c.outer.length >= 3);
  if (out.length === 0) {
    throw meshError({ code: "E_KERNEL", path, got: ctx.inset.d, expected: "an outline that survives the inset", hint: "widen the insert; the stage 6 inset removes it", record: "mesh-kernel" });
  }
  return out;
}

/**
 * A revolve profile offset inward in the (r, z) plane by the stage 6 inset,
 * along each edge's normal (Miter), so an inner wall moves out and an outer
 * wall in. The profile is mirrored across the axis first and the result
 * clipped back to r at or above 0, so an edge lying on the axis stays on it.
 */
function insetProfile(ctx: RouteCtx, profile: readonly Vec2[], path: string): Vec2[] {
  const g = ctx.geom;
  const mirrored: Ring = [...profile].reverse().map(([r, z]) => [-r, z] as Vec2);
  const whole = g.union([g.fromOutline(profile, [], { snap: false }), g.fromOutline(mirrored, [], { snap: false })]);
  const shrunk = ctx.inset.kind === "pinch" ? insetPinch(whole, ctx.input.profile) : insetCoincident(whole, ctx.input.profile);
  const zs = profile.map(([, z]) => z);
  const lo = Math.min(...zs) - 1, hi = Math.max(...zs) + 1, far = Math.max(...profile.map(([r]) => r)) + 1;
  const half = g.fromOutline([[0, lo], [far, lo], [far, hi], [0, hi]], [], { snap: false });
  const comps = shrunk.intersection(half).components({ snap: false });
  const one = comps[0];
  if (comps.length !== 1 || one === undefined || one.holes.length > 0) {
    throw meshError({
      code: "E_KERNEL", path, got: comps.length, expected: "one profile loop after the stage 6 inset",
      hint: "the inset splits or removes the revolve profile; widen its thinnest part", record: "mesh-kernel",
    });
  }
  // the clip at r = 0 lands within float noise of the axis; put those rows on it
  return cleanRing(one.outer).map(([r, z]) => [Math.abs(r) < 1e-9 ? 0 : r, z] as Vec2);
}

function prismOf(ctx: RouteCtx, outline: readonly Ring[], z: readonly [Mm, Mm], path: string): PrismMesh {
  if (ctx.inset.d === 0) return prismMesh(ctx.geom, outline, z, path);
  return prismFromComponents(insetOutline(ctx, outline, path), z, path);
}

const ROUTES: readonly RouteEntry[] = [
  {
    route: "raster", guarantees: { manifold: true, exactZ: true, perSlotDisjoint: true }, lazy: false,
    build: (shape, body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "raster" }>;
      const key = JSON.stringify([s.layers, s.res]);
      let meshes = ctx.rasterCache.get(key);
      const warnings: RouteWarning[] = [];
      if (meshes === undefined) {
        const resolve = ctx.input.mask;
        if (resolve === undefined) {
          throw meshError({ code: "E_KERNEL", path: `${ctx.path}/layers`, got: "no mask resolver", expected: "a mask resolver for raster bodies", hint: "pass mask(uri) to the stage runner", record: "mesh-kernel" });
        }
        const masks = s.layers.map((l) => resolve(l.mask));
        const first = masks[0];
        if (first === undefined) throw meshError({ code: "E_SCHEMA", path: `${ctx.path}/layers`, got: 0, expected: "at least one layer", hint: "declare at least one raster layer" });
        const volume: RasterVolume = {
          width: first.width, height: first.height, px: s.res, x0: first.origin?.[0] ?? 0, y0: first.origin?.[1] ?? 0,
          // the healer edits labels in place, so each run gets its own copy of the store's bytes
          slabs: masks.map((m, k) => {
            if (m.width !== first.width || m.height !== first.height) {
              throw meshError({ code: "E_SCHEMA", path: `${ctx.path}/layers/${k}/mask`, got: [m.width, m.height], expected: `${first.width} x ${first.height} cells`, hint: "give every layer mask one size" });
            }
            return { labels: m.labels.slice(), z: s.layers[k]!.z };
          }),
        };
        const r = raster(volume, ctx.input.mode ?? "build");
        warnings.push(...r.warnings);
        meshes = r.meshes;
        ctx.rasterCache.set(key, meshes);
      }
      const mesh = meshes.get(body.slot);
      if (mesh === undefined) {
        throw meshError({ code: "E_REF", path: `${ctx.path}/layers`, got: body.slot, expected: `a slot the raster carries: ${[...meshes.keys()].join(", ")}`, hint: `no cell of the raster carries slot ${body.slot}; paint it or change the body slot` });
      }
      return { shells: [mesh], warnings };
    },
  },
  {
    route: "prism", guarantees: { manifold: true, exactZ: true, perSlotDisjoint: false }, lazy: false,
    build: (shape, _body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "prism" }>;
      const p = prismOf(ctx, s.outline, s.z, ctx.path);
      return { shells: p.shells, warnings: p.warnings };
    },
  },
  {
    route: "stack", guarantees: { manifold: true, exactZ: true, perSlotDisjoint: false }, lazy: false, lowersTo: "prism",
    build: (shape, _body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "stack" }>;
      if (ctx.inset.d === 0) {
        const m = stackMesh(ctx.geom, s.bands, bandOverlap(ctx.input.profile), ctx.path);
        return { shells: m.shells, warnings: m.warnings };
      }
      checkBandOverlaps(s.bands, bandOverlap(ctx.input.profile), ctx.path);
      const shells: MeshData[] = [];
      const warnings: RouteWarning[] = [];
      s.bands.forEach((b, i) => {
        const p = prismOf(ctx, b.outline, b.z, `${ctx.path}/bands/${i}`);
        shells.push(...p.shells);
        warnings.push(...p.warnings);
      });
      return { shells, warnings };
    },
  },
  {
    route: "revolve", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false,
    build: (shape, _body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "revolve" }>;
      const profile = ctx.inset.d === 0 ? s.profile : insetProfile(ctx, s.profile, `${ctx.path}/profile`);
      return { shells: [revolveShape({ ...s, profile }, ctx.path)], warnings: [] };
    },
  },
  { route: "lathe", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false, lowersTo: "revolve", landsAt: "the milestone of the first lathe design" },
  { route: "trace", guarantees: { manifold: true, exactZ: true, perSlotDisjoint: false }, lazy: false, lowersTo: "prism", landsAt: "the milestone of the first trace design" },
  {
    route: "csg", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false,
    // Operands go through their own routes; union batches then verifies (D-055). At stage 6 the
    // inset reaches every operand of a union or an intersection and the first operand of a
    // difference; a subtracted operand keeps its size, since shrinking it would grow the result.
    build: (shape, body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "csg" }>;
      if (s.of.length === 0) {
        throw meshError({ code: "E_SCHEMA", path: `${ctx.path}/of`, got: 0, expected: "at least one shape", hint: "give the csg shape its operands" });
      }
      const warnings: RouteWarning[] = [];
      const operand = (x: ShapeDecl, i: number, inset: RouteCtx["inset"]): Manifold => {
        const at = `${ctx.path}/of/${i}`;
        const base = baseShape(x, body, { ...ctx, path: at, inset });
        warnings.push(...base.warnings);
        return solidOfBase(ctx, base, at);
      };
      const none: RouteCtx["inset"] = { d: 0, kind: "none" };
      const [first, ...rest] = s.of.map((x, i) => operand(x, i, s.op === "difference" && i > 0 ? none : ctx.inset));
      let solid: Manifold;
      if (s.op === "union") solid = rest.length === 0 ? first! : ctx.scope.own(unionReport([first!, ...rest], { path: `${ctx.path}/of`, members: s.of.map((_, i) => `${body.id} of/${i}`) }).solid);
      else if (s.op === "intersection") solid = rest.reduce((a, b) => ctx.scope.own(a.intersect(b)), first!);
      else solid = rest.length === 0 ? first! : ctx.scope.own(first!.subtract(ctx.scope.own(unionReport(rest, { path: `${ctx.path}/of`, members: rest.map((_, i) => `${body.id} of/${i + 1}`) }).solid)));
      return { shells: [], solid, warnings };
    },
  },
  {
    ...IMPORTED_ROUTE,
    // A legacy mesh has no outline to shrink, so it takes no stage 6 inset; the shell must still be
    // one manifold solid (toManifold), since watertight is not assumed on read.
    build: (shape, _body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "imported" }>;
      const reader = s.format === "stl" ? importStl : s.format === "glb" ? importGlb : undefined;
      if (reader === undefined) {
        throw meshError({ code: "E_KERNEL", path: `${ctx.path}/format`, got: s.format, expected: "stl or glb", hint: `the imported route reads stl and glb in this kernel build (step and wrl arrive with M14-T02); export ${s.uri} as binary stl`, record: "mesh-kernel" });
      }
      const resolve = ctx.input.meshBytes;
      if (resolve === undefined) {
        throw meshError({ code: "E_KERNEL", path: `${ctx.path}/uri`, got: "no mesh resolver", expected: "a mesh resolver for imported bodies", hint: "pass meshBytes(uri) to the stage runner", record: "mesh-kernel" });
      }
      if (ctx.inset.d !== 0) {
        throw meshError({ code: "E_KERNEL", path: ctx.path, got: ctx.inset.d, expected: "no stage 6 inset on an imported body", hint: `move ${s.uri} off the coincident face or give it its own slot`, record: "mesh-kernel" });
      }
      return { shells: reader(resolve(s.uri), s.uri, ctx.input.meshScale?.(s.uri) ?? 1).parts.map((p) => p.mesh), warnings: [] };
    },
  },
  { route: "brep", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: true, landsAt: "M14 (D-024)" },
];

/** The route registry with each route's declared guarantees (D-053). */
export const MESH_ROUTE_DEFS: ReadonlyMap<MeshRoute, MeshRouteDef> = new Map(
  ROUTES.map(({ route, guarantees, lazy, lowersTo }) => [route, lowersTo === undefined ? { route, guarantees, lazy } : { route, guarantees, lazy, lowersTo }]),
);

const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.route, r]));

function baseShape(shape: ShapeDecl, body: BodyDraft, ctx: RouteCtx): BaseShape {
  const entry = ROUTE_BY_ID.get(shape.route);
  if (entry === undefined || entry.build === undefined) {
    throw meshError({
      code: "E_KERNEL", path: `${ctx.path}/route`, got: shape.route, expected: `one of ${ROUTES.filter((r) => r.build !== undefined).map((r) => r.route).join(", ")}`,
      hint: `route ${shape.route} is not available in this kernel build${entry?.landsAt === undefined ? "" : ` (it arrives with ${entry.landsAt})`}; use raster, prism, stack, revolve, csg or imported`, record: "mesh-kernel",
    });
  }
  return entry.build(shape, body, ctx);
}

/** A route's base as one Manifold owned by the run: the csg solid, or its shells joined. */
function solidOfBase(ctx: RouteCtx, base: BaseShape, path: string): Manifold {
  if (base.solid !== undefined) return base.solid;
  const shells = base.shells.map((m, i) => toManifold(ctx.wasm, ctx.scope, m, `${path}/shells/${i}`));
  if (shells.length === 0) {
    throw meshError({ code: "E_KERNEL", path, got: 0, expected: "at least one closed shell", hint: "the route produced no solid; check the declaration", record: "mesh-kernel" });
  }
  return shells.length === 1 ? shells[0]! : ctx.scope.own(unionReport(shells).solid);
}

/** Every route a shape runs through, csg operands included. */
function routesOf(shape: ShapeDecl, into: Set<MeshRoute>): void {
  into.add(shape.route);
  if (shape.route === "csg") for (const x of shape.of) routesOf(x, into);
}

/**
 * A closed mesh as a Manifold owned by scope; E_KERNEL when manifold refuses it.
 * Exported for packages/circuit net extraction (M05-T04), which decomposes
 * and gaps the built conductive bodies with the same kernel.
 */
export function toManifold(wasm: ManifoldToplevel, scope: Scope, m: MeshData, path: string): Manifold {
  const mesh = new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(m.positions), triVerts: Uint32Array.from(m.triangles) });
  mesh.merge();
  const solid = scope.own(new wasm.Manifold(mesh));
  const status = solid.status();
  if (status !== "NoError") {
    throw meshError({ code: "E_KERNEL", path, got: status, expected: "NoError", hint: "a route shell is not a closed manifold; check the declaration", record: "mesh-kernel" });
  }
  return solid;
}

const priorityOf = (role: BodyRole): number => {
  const i = (PARTITION_PRIORITY as readonly BodyRole[]).indexOf(role);
  return i < 0 ? PARTITION_PRIORITY.length - 1 : i;
};

/** Roles inset at stage 6: every non-structure insert (3MF dialect geometry rule 1). */
const INSET_ROLES: ReadonlySet<BodyRole> = new Set<BodyRole>(["flex-conductor", "flex", "conductor", "art"]);

/** True when two rings of the outline, or two components, share a vertex: a corner touch that needs the pinch inset. */
function cornerTouch(ctx: RouteCtx, outline: readonly Ring[], path: string): boolean {
  const comps = outlineComponents(ctx.geom, outline, path);
  const seen = new Map<string, number>();
  let ring = 0;
  for (const c of comps) {
    for (const r of [c.outer, ...(c.holes ?? [])]) {
      const mine = new Set(r.map(([x, y]) => `${x},${y}`));
      for (const k of mine) {
        const other = seen.get(k);
        if (other !== undefined && other !== ring) return true;
        seen.set(k, ring);
      }
      ring++;
    }
  }
  return false;
}

function insetKind(ctx: RouteCtx, shape: ShapeDecl): "coincidence" | "pinch" {
  if (shape.route === "prism") return cornerTouch(ctx, shape.outline, ctx.path) ? "pinch" : "coincidence";
  if (shape.route === "stack") return shape.bands.some((b, i) => cornerTouch(ctx, b.outline, `${ctx.path}/bands/${i}`)) ? "pinch" : "coincidence";
  if (shape.route === "csg") return shape.of.some((x, i) => insetKind({ ...ctx, path: `${ctx.path}/of/${i}` }, x) === "pinch") ? "pinch" : "coincidence";
  return "coincidence";
}

interface Working {
  readonly draft: BodyDraft;
  readonly index: number;
  /** Mesh straight from the route when no boolean touched it; keeps raster exact Z. */
  routeMesh: MeshData | undefined;
  solid: Manifold;
  touched: boolean;
}

/** Stages 2 to 4 on one body's base. */
function cutAndJoin(scope: Scope, base: BaseShape, extra: BodyCutters, ctx: RouteCtx, body: BodyDraft): { solid: Manifold; touched: boolean } {
  let solid = solidOfBase(ctx, base, ctx.path);
  let touched = base.solid !== undefined || base.shells.length > 1;
  const solidsOf = (list: readonly ShapeDecl[] | undefined, at: string): Manifold[] =>
    (list ?? []).map((s, i) => solidOfBase(ctx, baseShape(s, body, { ...ctx, path: `${at}/${i}`, inset: { d: 0, kind: "none" } }), `${at}/${i}`));
  const pre = solidsOf(extra.preUnionCutters, `/cutters/${body.id}/preUnionCutters`);
  if (pre.length > 0) {
    solid = scope.own(solid.subtract(scope.own(unionReport(pre, { path: `/cutters/${body.id}/preUnionCutters` }).solid)));
    touched = true;
  }
  const pos = solidsOf(extra.unionPositives, `/cutters/${body.id}/unionPositives`);
  if (pos.length > 0) {
    solid = scope.own(unionReport([solid, ...pos], { path: `/cutters/${body.id}/unionPositives`, members: [body.id, ...pos.map((_, i) => `unionPositives/${i}`)] }).solid);
    touched = true;
  }
  const post = solidsOf(extra.postUnionCutters, `/cutters/${body.id}/postUnionCutters`);
  if (post.length > 0) {
    solid = scope.own(solid.subtract(scope.own(unionReport(post, { path: `/cutters/${body.id}/postUnionCutters` }).solid)));
    touched = true;
  }
  return { solid, touched };
}

/** Volume below which a partition overlap is a touch, mm3 (computed: one grid step cubed). */
const TOUCH_VOLUME = GRID ** 3;

function boxesOverlap(a: readonly [Vec3, Vec3], b: readonly [Vec3, Vec3]): boolean {
  for (let k = 0; k < 3; k++) if (a[1][k]! <= b[0][k]! || b[1][k]! <= a[0][k]!) return false;
  return true;
}

function bboxOf(solid: Manifold): readonly [Vec3, Vec3] {
  const b = solid.boundingBox();
  return [[b.min[0]!, b.min[1]!, b.min[2]!], [b.max[0]!, b.max[1]!, b.max[2]!]];
}

/**
 * Stage 5: subtract every body ahead of this one that overlaps it. Bodies
 * are ordered by role priority, then by declaration order, so of two
 * overlapping bodies of one role the earlier keeps the shared volume and
 * no two exported parts overlap (ARCHITECTURE.md 4, CHK-PRT-03).
 */
function partition(scope: Scope, work: Working[], higherOf: (w: Working) => Working[]): void {
  for (const w of work) {
    const above = higherOf(w).filter((h) => {
      if (!boxesOverlap(bboxOf(w.solid), bboxOf(h.solid))) return false;
      return scope.own(w.solid.intersect(h.solid)).volume() > TOUCH_VOLUME;
    });
    if (above.length === 0) continue;
    w.solid = scope.own(w.solid.subtract(scope.own(unionReport(above.map((h) => h.solid)).solid)));
    w.touched = true;
  }
}

function translateMesh(m: MeshData, d: Vec3): MeshData {
  const p = m.positions.slice();
  for (let i = 0; i < p.length; i += 3) {
    p[i] = snap(p[i]! - d[0]);
    p[i + 1] = snap(p[i + 1]! - d[1]);
    p[i + 2] = snap(p[i + 2]! - d[2]);
  }
  return { positions: p, triangles: m.triangles };
}

/**
 * Run the eight stages for one part draft and return plain data: body
 * meshes, the solid, the item transform and the warnings. Throws a
 * CommandError (E_SCHEMA, E_REF, E_KERNEL) on a declaration the routes
 * refuse; a leaked wasm object is E_KERNEL.
 */
export async function runStages(input: StageInput): Promise<StageOutput> {
  const wasm = await loadManifold();
  const geom = await loadGeom();
  const before = liveCount();
  const draft = input.draft;
  if (draft.bodies.length === 0) {
    throw meshError({ code: "E_SCHEMA", path: "/bodies", got: 0, expected: "at least one body", hint: "declare at least one body" });
  }
  // Feature kind bodies join after the declared ones, so declaration order breaks partition ties.
  const declared = draft.bodies.length;
  const all: readonly BodyDraft[] = [...draft.bodies, ...(input.bodies ?? [])];
  const pathOf = (i: number): string => (i < declared ? `/bodies/${i}` : `/features/${all[i]!.id}/bodies`);
  const ids = new Set<string>();
  all.forEach((b, i) => {
    if (ids.has(b.id)) throw meshError({ code: "E_SCHEMA", path: pathOf(i), got: b.id, expected: "unique body ids", hint: `rename the second body ${b.id}; a feature body takes its feature id` });
    ids.add(b.id);
  });
  for (const id of Object.keys(input.cutters ?? {})) {
    if (!ids.has(id)) throw meshError({ code: "E_REF", path: `/cutters/${id}`, got: id, expected: `a body id: ${[...ids].join(", ")}`, hint: `stage 2 to 4 shapes name no body ${id}; host them on a declared body` });
  }
  const warnings: BuildWarning[] = [];
  const stages: string[] = ["base", "preUnionCutters", "unionPositives", "postUnionCutters", "partition", "insets", "frameEmit", "hash"];
  const rasterCache = new Map<string, Map<number, MeshData>>();
  const out = withScope((scope) => {
    const ctxOf = (_b: BodyDraft, i: number, inset: RouteCtx["inset"]): RouteCtx => ({ wasm, scope, geom, input, rasterCache, path: `${pathOf(i)}/base`, inset });
    const extraOf = (b: BodyDraft): BodyCutters => input.cutters?.[b.id] ?? {};

    // stages 1 to 4
    const work: Working[] = all.map((b, i) => {
      const ctx = ctxOf(b, i, { d: 0, kind: "none" });
      const base = baseShape(b.base, b, ctx);
      for (const w of base.warnings) warnings.push({ code: w.code, text: `${b.id}: ${w.text}` });
      const { solid, touched } = cutAndJoin(scope, base, extraOf(b), ctx, b);
      const routeMesh = base.solid !== undefined ? undefined : base.shells.length === 1 ? base.shells[0] : joinMeshes(base.shells);
      return { draft: b, index: i, routeMesh, solid, touched };
    });

    // stage 5: a total order, role priority then declaration order
    const ahead = (h: Working, w: Working): boolean => {
      const ph = priorityOf(h.draft.role), pw = priorityOf(w.draft.role);
      return ph < pw || (ph === pw && h.index < w.index);
    };
    const higherOf = (w: Working): Working[] => work.filter((h) => ahead(h, w));
    partition(scope, work, higherOf);

    // stage 6: an insert is rebuilt from its inset declaration and partitioned again against the full-size bodies above it
    for (const w of work) {
      const b = w.draft;
      if (!INSET_ROLES.has(b.role) || b.base.route === "raster") continue;
      const kind = insetKind(ctxOf(b, w.index, { d: 0, kind: "none" }), b.base);
      const d = input.profile.constant(kind === "pinch" ? "3mf.pinchInset" : "3mf.coincidenceInset");
      if (d.unit !== "mm" || !(d.value > 0)) {
        throw meshError({ code: "E_SCHEMA", path: `/constants/${d.id}`, got: `${d.value} ${d.unit}`, expected: "a positive length in mm", hint: `set profile constant ${d.id} to a positive length in mm` });
      }
      const ctx = ctxOf(b, w.index, { d: d.value, kind });
      const base = baseShape(b.base, b, ctx);
      const rebuilt: Working = { draft: b, index: w.index, routeMesh: undefined, ...cutAndJoin(scope, base, extraOf(b), ctx, b) };
      rebuilt.touched = true;
      partition(scope, [rebuilt], () => higherOf(w));
      w.solid = rebuilt.solid;
      w.touched = true;
      w.routeMesh = undefined;
      warnings.push({ code: "INSET", text: `${b.id}: ${kind} inset ${d.value} mm (${d.provenance.tier}) applied at stage 6` });
    }

    // stage 7 frame emit; a boolean's output is snapped to the grid and welded, so a triangle the
    // snap collapses leaves the mesh instead of staying as a degenerate sliver
    const meshes = work.map((w) => (!w.touched && w.routeMesh !== undefined ? w.routeMesh : snapWeld(meshOf(w.solid))));
    for (const [i, m] of meshes.entries()) {
      if (m.triangles.length === 0) {
        throw meshError({ code: "E_KERNEL", path: pathOf(i), got: 0, expected: "a body with volume after partition", hint: `body ${work[i]!.draft.id} is covered by bodies ahead of it in partition order; move it or change its role`, record: "mesh-kernel" });
      }
    }
    const [lo, hi] = bounds(joinMeshes(meshes));
    const frame = draft.frame;
    const lift: Vec3 = !frame.carriesOffset && !frame.originOnAxis ? [snap((lo[0] + hi[0]) / 2), snap((lo[1] + hi[1]) / 2), 0] : [0, 0, 0];
    const emitted = meshes.map((m) => (lift[0] === 0 && lift[1] === 0 ? m : translateMesh(m, lift)));

    // stage 8: body meshes are hashed by the caller through meshRef; the solid is their verified union
    const solids = emitted.map((m, i) => toManifold(wasm, scope, m, pathOf(i)));
    const united = solids.length === 1 ? solids[0]! : scope.own(unionReport(solids, { path: "/bodies", members: work.map((w) => w.draft.id) }).solid);
    // Where a face of one body crosses a face of another, the union holds vertices off the grid;
    // the snap below moves them and so the solid's volume, while the bodies are already on the
    // grid. The kernel's own volume is the measure of overlap CHK-PRT-03 reads.
    const unionVolumeMm3 = united.volume();
    const solid = meshOf(united);
    const adjacency = bodyAdjacency(scope, solids, emitted, work.map((w) => w.draft.id), warnings);
    const bodies: StagedBody[] = work.map((w, i) => ({ draft: w.draft, mesh: emitted[i]!, volumeMm3: signedVolume(emitted[i]!) }));
    for (const b of bodies) {
      const a = audit(b.mesh);
      if (!a.ok) {
        warnings.push({ code: "AUDIT", text: `${b.draft.id}: open edges ${a.openEdges}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices} (computed)` });
      }
    }
    return { bodies, solid, itemTransform: lift, adjacency, unionVolumeMm3 };
  });
  if (liveCount() !== before) {
    throw meshError({ code: "E_KERNEL", got: liveCount() - before, expected: "0 live wasm objects after a build", hint: "a stage leaked a wasm object; own it in the build scope", record: "mesh-kernel" });
  }
  const used = new Set<MeshRoute>();
  for (const b of all) routesOf(b.base, used);
  for (const c of Object.values(input.cutters ?? {})) {
    for (const s of [...(c.preUnionCutters ?? []), ...(c.unionPositives ?? []), ...(c.postUnionCutters ?? [])]) routesOf(s, used);
  }
  const routes = [...used].sort();
  return { ...out, warnings, routes, stages };
}


/** One body of an import-for-audit Part: its draft and what the imported route read. */
export interface ImportedStageBody {
  readonly draft: BodyDraft;
  readonly read: ImportedBody;
}

/** stageImported's result: the stage output, and why no union exists when none does. */
export interface ImportedStageOutput {
  readonly staged: StageOutput;
  /** null when the solid is the verified union of the parts; otherwise the reason, and the solid is the parts joined. */
  readonly noUnion: string | null;
}

/**
 * Stage output for a Part built from imported files (M04-T14, D-146,
 * D-160). No route builds a shape, so stages 2 to 6 have nothing to cut,
 * partition or inset, and stage 7 lifts nothing: the file's own frame is
 * what the audit reads. Bodies keep the imported route's welded meshes.
 * When every part of every body is closed and their union verifies (D-055),
 * the solid is that union, so CHK-PRT-03 compares the parts with a real
 * union. Otherwise no union exists: the solid is the parts joined, noUnion
 * says why, and an AUDIT or UNION warning carries the numbers, so the audit
 * reports instead of refusing.
 */
export async function stageImported(list: readonly ImportedStageBody[]): Promise<ImportedStageOutput> {
  const wasm = await loadManifold();
  const before = liveCount();
  if (list.length === 0) {
    throw meshError({ code: "E_SCHEMA", path: "/import", got: 0, expected: "at least one imported file", hint: "name at least one file to import" });
  }
  const warnings: BuildWarning[] = [];
  const parts = list.flatMap((b) => b.read.parts.map((p) => ({ body: b.draft.id, ...p, audit: audit(p.mesh) })));
  const open = parts.filter((p) => !p.audit.ok);
  for (const p of open) {
    const a = p.audit;
    warnings.push({ code: "AUDIT", text: `${p.body}/${p.name}: open edges ${a.openEdges}, winding errors ${a.windingErrors}, degenerate ${a.degenerate}, non-manifold vertices ${a.nonManifoldVertices} (computed)` });
  }
  let noUnion: string | null = open.length === 0 ? null : `${open.length} of ${parts.length} parts fail the audit, first ${open[0]!.body}/${open[0]!.name}`;
  let solid: MeshData | undefined;
  let unionVolumeMm3: number | undefined;
  if (noUnion === null) {
    try {
      [solid, unionVolumeMm3] = withScope((scope): [MeshData, number] => {
        const solids = parts.map((p, i) => toManifold(wasm, scope, p.mesh, `/import/parts/${i}`));
        const united = solids.length === 1 ? solids[0]! : scope.own(unionReport(solids).solid);
        return [snapWeld(meshOf(united)), united.volume()];
      });
    } catch (e) {
      const refused = (e as { hbf?: { got?: unknown; hint?: string } }).hbf;
      if (refused === undefined) throw e;
      noUnion = `the union of ${parts.length} parts is refused: ${refused.hint ?? ""} (${JSON.stringify(refused.got)})`;
      warnings.push({ code: "UNION", text: noUnion });
    }
  }
  if (liveCount() !== before) {
    throw meshError({ code: "E_KERNEL", got: liveCount() - before, expected: "0 live wasm objects after a build", hint: "the import union leaked a wasm object; own it in the build scope", record: "mesh-kernel" });
  }
  return {
    staged: {
      bodies: list.map((b) => ({ draft: b.draft, mesh: b.read.mesh, volumeMm3: b.read.volumeMm3 })),
      solid: solid ?? joinMeshes(list.map((b) => b.read.mesh)),
      itemTransform: [0, 0, 0], warnings, routes: ["imported"], stages: ["base", "hash"],
      ...(unionVolumeMm3 === undefined ? {} : { unionVolumeMm3 }),
    },
    noUnion,
  };
}
