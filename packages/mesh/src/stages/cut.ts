// Stages 2 to 4 (D-047): pre-union cutters, union positives, post-union
// cutters on one body's base, and the mesh to Manifold bridge they share.

import type { Manifold, ManifoldToplevel } from "manifold-3d";
import type { BodyDraft, ShapeDecl } from "@hackbuild/spec";
import type { MeshData } from "../hash.js";
import { unionReport } from "../union.js";
import type { Scope } from "../wasm.js";
import { meshError } from "../routes/prism.js";
import type { BodyCutters } from "./types.js";
import { type BaseShape, type RouteCtx, baseShape, solidOfBase } from "./base.js";

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

export interface Working {
  readonly draft: BodyDraft;
  readonly index: number;
  /** Mesh straight from the route when no boolean touched it; keeps raster exact Z. */
  routeMesh: MeshData | undefined;
  solid: Manifold;
  touched: boolean;
}

/** Stages 2 to 4 on one body's base. */
export function cutAndJoin(scope: Scope, base: BaseShape, extra: BodyCutters, ctx: RouteCtx, body: BodyDraft): { solid: Manifold; touched: boolean } {
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
