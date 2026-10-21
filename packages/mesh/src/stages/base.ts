// Stage 1 (D-047): a body's base shape through its route. The route table
// is the one place a mesh route is defined; MESH_ROUTE_DEFS projects it.

import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { BodyDraft, MeshRoute, MeshRouteDef, Mm, Ring, ShapeDecl, Vec2 } from "@hackbuild/spec";
import { type Geom, type Outline, insetCoincident, insetPinch } from "@hackbuild/geom";
import { type MeshData, snap } from "../hash.js";
import { unionReport } from "../union.js";
import type { Scope } from "../wasm.js";
import { type PrismMesh, type RouteWarning, cleanRing, meshError, outlineComponents, prismFromComponents, prismMesh } from "../routes/prism.js";
import { bandOverlap, checkBandOverlaps, stackMesh } from "../routes/stack.js";
import { type RasterVolume, raster } from "../routes/raster.js";
import { revolveShape } from "../routes/revolve.js";
import { loftMesh } from "../routes/loft.js";
import { sweepMesh } from "../routes/sweep.js";
import { IMPORTED_ROUTE, importStl } from "../routes/imported.js";
import { importGlb } from "../routes/imported-glb.js";
import type { StageInput } from "./types.js";
import { toManifold } from "./cut.js";

/** Context a route builder reads. */
export interface RouteCtx {
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
export interface BaseShape {
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

/**
 * Loft and sweep sections carry no outline the stage 6 inset can shrink
 * point for point, so an inserted body on either route is refused, as an
 * imported one is.
 */
function noInset(ctx: RouteCtx, route: string): void {
  if (ctx.inset.d === 0) return;
  throw meshError({ code: "E_KERNEL", path: ctx.path, got: ctx.inset.d, expected: `no stage 6 inset on a ${route} body`, hint: `give the ${route} body the body role, or build the insert as a prism or revolve`, record: "mesh-kernel" });
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
  {
    route: "loft", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false,
    build: (shape, _body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "loft" }>;
      noInset(ctx, "loft");
      return { shells: [loftMesh(s.sections, `${ctx.path}/sections`)], warnings: [] };
    },
  },
  {
    route: "sweep", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false,
    build: (shape, _body, ctx) => {
      const s = shape as Extract<ShapeDecl, { route: "sweep" }>;
      noInset(ctx, "sweep");
      return { shells: [sweepMesh(s.section, s.path)], warnings: [] };
    },
  },
  { route: "lathe", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false, lowersTo: "revolve", landsAt: "the milestone of the first lathe design" },
  { route: "trace", guarantees: { manifold: true, exactZ: true, perSlotDisjoint: false }, lazy: false, lowersTo: "prism", landsAt: "the milestone of the first trace design" },
  {
    route: "csg", guarantees: { manifold: true, exactZ: false, perSlotDisjoint: false }, lazy: false,
    // Operands go through their own routes; union batches then verifies (D-055); hull is
    // Manifold.hull over every operand. At stage 6 the inset reaches every operand of a union, an
    // intersection or a hull and the first operand of a difference; a subtracted operand keeps its
    // size, since shrinking it would grow the result.
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
      else if (s.op === "hull") solid = ctx.scope.own(ctx.wasm.Manifold.hull([first!, ...rest]));
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

export function baseShape(shape: ShapeDecl, body: BodyDraft, ctx: RouteCtx): BaseShape {
  const entry = ROUTE_BY_ID.get(shape.route);
  if (entry === undefined || entry.build === undefined) {
    throw meshError({
      code: "E_KERNEL", path: `${ctx.path}/route`, got: shape.route, expected: `one of ${ROUTES.filter((r) => r.build !== undefined).map((r) => r.route).join(", ")}`,
      hint: `route ${shape.route} is not available in this kernel build${entry?.landsAt === undefined ? "" : ` (it arrives with ${entry.landsAt})`}; use ${ROUTES.filter((r) => r.build !== undefined).map((r) => r.route).join(", ")}`, record: "mesh-kernel",
    });
  }
  return entry.build(shape, body, ctx);
}

/** A route's base as one Manifold owned by the run: the csg solid, or its shells joined. */
export function solidOfBase(ctx: RouteCtx, base: BaseShape, path: string): Manifold {
  if (base.solid !== undefined) return base.solid;
  const shells = base.shells.map((m, i) => toManifold(ctx.wasm, ctx.scope, m, `${path}/shells/${i}`));
  if (shells.length === 0) {
    throw meshError({ code: "E_KERNEL", path, got: 0, expected: "at least one closed shell", hint: "the route produced no solid; check the declaration", record: "mesh-kernel" });
  }
  return shells.length === 1 ? shells[0]! : ctx.scope.own(unionReport(shells).solid);
}

/** Every route a shape runs through, csg operands included. */
export function routesOf(shape: ShapeDecl, into: Set<MeshRoute>): void {
  into.add(shape.route);
  if (shape.route === "csg") for (const x of shape.of) routesOf(x, into);
}
