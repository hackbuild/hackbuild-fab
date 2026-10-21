// Stage 6 (D-047): which bodies take an inset and which inset (coincidence
// or pinch) their outline needs.

import type { BodyRole, Ring, ShapeDecl } from "@hackbuild/spec";
import { outlineComponents } from "../routes/prism.js";
import type { RouteCtx } from "./base.js";

/** Roles inset at stage 6: every non-structure insert (3MF dialect geometry rule 1). */
export const INSET_ROLES: ReadonlySet<BodyRole> = new Set<BodyRole>(["flex-conductor", "flex", "conductor", "art"]);

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

export function insetKind(ctx: RouteCtx, shape: ShapeDecl): "coincidence" | "pinch" {
  if (shape.route === "prism") return cornerTouch(ctx, shape.outline, ctx.path) ? "pinch" : "coincidence";
  if (shape.route === "stack") return shape.bands.some((b, i) => cornerTouch(ctx, b.outline, `${ctx.path}/bands/${i}`)) ? "pinch" : "coincidence";
  if (shape.route === "csg") return shape.of.some((x, i) => insetKind({ ...ctx, path: `${ctx.path}/of/${i}` }, x) === "pinch") ? "pinch" : "coincidence";
  return "coincidence";
}
