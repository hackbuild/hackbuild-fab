// The BLOCKS kernel's polygon constructors (originals/blocks/files/
// src-extracted/kernel.js lines 68 to 106), as local rings for the hbf
// prism and csg routes. Circles are common.ts circle(), which places the
// same half step rotated points kernel.js circle() places (lines 68 to 73).
// Booleans the original does in 2D with polygon-clipping are done by the
// csg route in 3D on the same outlines, which bounds the same volume.

import type { ShapeDecl, Vec2 } from "@hackbuild/spec";
import { circle, place, turn, type Frame } from "../pip/common.js";

/** blocks.js line 39 and kernel.js line 28: every z and vertex of the standard is exact to the micron. */
export const rrect6 = (v: number): number => Math.round(v * 1e6) / 1e6;

/**
 * kernel.js rrect (lines 79 to 86): a w x h rectangle centred at c with
 * corner radius r and n + 1 points per corner, corners from +x +y counter
 * clockwise.
 */
export function rrect(c: Vec2, w: number, h: number, r: number, n: number): Vec2[] {
  const rr = Math.min(r, w / 2, h / 2);
  const corners: [number, number][] = [[c[0] + w / 2 - rr, c[1] + h / 2 - rr], [c[0] - w / 2 + rr, c[1] + h / 2 - rr], [c[0] - w / 2 + rr, c[1] - h / 2 + rr], [c[0] + w / 2 - rr, c[1] - h / 2 + rr]];
  const out: Vec2[] = [];
  corners.forEach(([px, py], k) => {
    for (let i = 0; i <= n; i++) {
      const [cs, sn] = turn(k * n + i, 4 * n);
      out.push([px + rr * cs, py + rr * sn]);
    }
  });
  return out;
}

/**
 * kernel.js stroke (lines 93 to 106) as its pieces: one quad per segment,
 * a joint circle of radius w / 2 + 0.03 at every inner point (so the
 * circle crosses the quad edges and the union has no pinch vertex), and
 * the same circle at both ends for round caps. Their union is the stroke.
 */
export function strokePieces(pts: readonly Vec2[], w: number, n: number): Vec2[][] {
  const hw = w / 2, out: Vec2[][] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Vec2, b = pts[i + 1] as Vec2;
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    if (l < 1e-6) continue;
    const nx = (-dy / l) * hw, ny = (dx / l) * hw;
    out.push([[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]]);
    if (i > 0) out.push(circle(hw + 0.03, a, n));
  }
  out.push(circle(hw + 0.03, pts[0] as Vec2, n), circle(hw + 0.03, pts[pts.length - 1] as Vec2, n));
  return out;
}

/** A ring wound counter-clockwise (the prism route reads outer rings CCW). */
export function ccwRing(ring: readonly Vec2[]): Vec2[] {
  let a = 0;
  ring.forEach((p, i) => { const q = ring[(i + 1) % ring.length] as Vec2; a += p[0] * q[1] - q[0] * p[1]; });
  return a < 0 ? [...ring].reverse() : [...ring];
}

/** A prism of one local ring over z0 to z1, placed through the frame. */
export function prismOf(f: Frame, ring: readonly Vec2[], z0: number, z1: number): ShapeDecl {
  return { route: "prism", outline: [place(f, ccwRing(ring))], z: [z0, z1] };
}

/** A prism of an outer ring and its holes: outer counter-clockwise, holes clockwise. */
export function prismWithHoles(f: Frame, rings: readonly (readonly Vec2[])[], z0: number, z1: number): ShapeDecl {
  return { route: "prism", outline: rings.map((r, k) => place(f, k === 0 ? ccwRing(r) : ccwRing(r).reverse())), z: [z0, z1] };
}

/** The union of local rings extruded over z0 to z1; one ring stays a prism. */
export function unionOf(f: Frame, rings: readonly (readonly Vec2[])[], z0: number, z1: number): ShapeDecl {
  const of = rings.map((r) => prismOf(f, r, z0, z1));
  return of.length === 1 ? (of[0] as ShapeDecl) : { route: "csg", op: "union", of };
}

/** a minus every cutter; the cutters stand 0.01 mm past each end so no cut face is coplanar with a cap. */
export function minus(f: Frame, a: ShapeDecl, cutters: readonly (readonly Vec2[])[], z0: number, z1: number): ShapeDecl {
  if (cutters.length === 0) return a;
  return { route: "csg", op: "difference", of: [a, ...cutters.map((r) => prismOf(f, r, z0 - 0.01, z1 + 0.01))] };
}
