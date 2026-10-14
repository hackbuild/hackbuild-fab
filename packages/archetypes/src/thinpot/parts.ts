// The page's Ctx parts as declarations (thinpot.md 4.1, 4.2): every
// Mesh.prism, revolve and lathe call of an archetype ported from
// originals/thinpot/files/feeler_thinpot.html is kept here as a primitive
// in the page's own coordinates, with its part's role and print pose, then
// turned into kernel shapes: one body per part, the union of its
// primitives (the page's meshes are soups of closed primitives that the
// slicer unions), posed as posedMesh poses it (lines 7004 to 7015) and
// placed through the face frame.

import type { BodyDraft, MaterialSlot, ShapeDecl, Vec2 } from "@hackbuild/spec";
import { PIP_SLOTS } from "../pip/emit.js";
import { place, type Frame } from "../pip/common.js";
import { bbox, ccw, cleanLoop, cw, type Loop } from "./geom.js";

/** pointInPoly, pointInRing, segHit, ringsOverlap, slabsTouch (lines 939 to 970). */
function pointInPoly(pt: Vec2, poly: readonly Vec2[]): boolean {
  const [x, y] = pt; let inside = false; const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = poly[i] as Vec2, [xj, yj] = poly[j] as Vec2;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInRing(pt: Vec2, outer: readonly Vec2[], holes: readonly (readonly Vec2[])[] | null): boolean {
  if (!pointInPoly(pt, outer)) return false;
  if (holes !== null) for (const h of holes) if (pointInPoly(pt, h)) return false;
  return true;
}
function segHit(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2): number => { const v = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]); return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0; };
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
function ringsOverlap(A: Slab, B: Slab): boolean {
  const ab = bbox(A.o), bb = bbox(B.o);
  if (ab[2] < bb[0] - 1e-6 || bb[2] < ab[0] - 1e-6 || ab[3] < bb[1] - 1e-6 || bb[3] < ab[1] - 1e-6) return false;
  for (let i = 0; i < A.o.length; i++) {
    const i2 = (i + 1) % A.o.length;
    for (let j = 0; j < B.o.length; j++) { const j2 = (j + 1) % B.o.length; if (segHit(A.o[i] as Vec2, A.o[i2] as Vec2, B.o[j] as Vec2, B.o[j2] as Vec2)) return true; }
  }
  for (const p of A.o) if (pointInRing(p, B.o, B.h)) return true;
  for (const p of B.o) if (pointInRing(p, A.o, A.h)) return true;
  return false;
}
export function slabsTouch(a: Slab, b: Slab, tol = 0.02): boolean {
  if (a.z1 < b.z0 - tol || b.z1 < a.z0 - tol) return false;
  return ringsOverlap(a, b);
}

/** The page's slot roles (lines 1016 to 1021) on the four PIP slots. */
export type Role = "rigid" | "cond" | "flex" | "aux";
const MATERIAL: Readonly<Record<Role, keyof typeof PIP_SLOTS>> = { rigid: "petg", cond: "cpla", flex: "tpu95", aux: "ctpu" };

export type Prim =
  | { readonly k: "prism"; readonly loops: readonly Loop[]; readonly z0: number; readonly z1: number; readonly slab: Slab }
  | { readonly k: "revolve"; readonly profile: Loop; readonly cx: number; readonly cy: number; readonly seg: number };

/** The slab the page's net checker reads (mesh.slabs, line 780): the loops as passed, uncleaned. */
export interface Slab { readonly o: readonly Vec2[]; readonly h: readonly (readonly Vec2[])[] | null; readonly z0: number; readonly z1: number }

/** flipZ mirrors z inside [lo, hi], then dx, dy, dz move the part (Ctx.pose, line 1048). */
export interface Pose { readonly dx: number; readonly dy: number; readonly dz: number; readonly flipZ?: readonly [number, number] }

/**
 * One page part: its primitives become one body, the csg union of them all,
 * as the page hands a part's overlapping slabs to the slicer as one object
 * to fill. The page's 0.01 mm laps leave caps in that union where three
 * slabs share a face plane; packages/mesh flips them (union.ts, flipCaps).
 */
export class TpPart {
  readonly prims: Prim[] = [];
  pose: Pose | null = null;
  constructor(readonly name: string, readonly role: Role) {}

  /** Mesh.prism (line 778): skipped under 1e-6 tall; loops cleaned and wound as the page winds them. */
  prism(outer: readonly Vec2[], holes: readonly (readonly Vec2[])[] | null, z0: number, z1: number): void {
    if (z1 - z0 < 1e-6) return;
    const slab: Slab = { o: outer, h: holes, z0: Math.min(z0, z1), z1: Math.max(z0, z1) };
    this.prims.push({ k: "prism", loops: [ccw(cleanLoop(outer)), ...(holes ?? []).map((h) => cw(cleanLoop(h)))], z0, z1, slab });
  }

  /** Mesh.revolve (line 818): a closed (r, z) loop. */
  revolve(loop: readonly Vec2[], cx: number, cy: number, seg = 48): void {
    this.prims.push({ k: "revolve", profile: ccw(loop), cx, cy, seg });
  }

  /** Mesh.lathe (line 833): a half profile closed by the axis. */
  lathe(half: readonly Vec2[], cx: number, cy: number, seg = 48): void {
    this.prims.push({ k: "revolve", profile: ccw(half), cx, cy, seg });
  }
}

/** The page's ctx.get: one part per name, in first-use order. */
export class TpParts {
  readonly list: TpPart[] = [];
  get(name: string, role: Role): TpPart {
    const hit = this.list.find((p) => p.name === name);
    if (hit !== undefined) return hit;
    const p = new TpPart(name, role);
    this.list.push(p);
    return p;
  }
  /**
   * Ctx.absorbTerminals (lines 1112 to 1126): the shared terminals part
   * folds into the first conductive part one of whose slabs touches one of
   * its slabs, so a trace landing on a tab is one solid.
   */
  absorbTerminals(): void {
    const t = this.list.find((p) => p.name === "terminals");
    if (t === undefined) return;
    const ts = t.prims.flatMap((q) => (q.k === "prism" ? [q.slab] : []));
    if (ts.length === 0) return;
    const host = this.list.find((p) => p !== t && (p.role === "cond" || p.role === "aux") && p.prims.some((q) => q.k === "prism" && ts.some((x) => slabsTouch(q.slab, x))));
    if (host === undefined) return;
    host.prims.push(...t.prims);
    this.list.splice(this.list.indexOf(t), 1);
  }

  pose(name: string, pose: Pose): void {
    const p = this.list.find((q) => q.name === name);
    if (p !== undefined) p.pose = pose;
  }
}

/** One primitive as a kernel shape, posed and placed; z rises by the face height. */
export function shapeOf(q: Prim, pose: Pose | null, f: Frame): ShapeDecl {
  const dx = pose?.dx ?? 0, dy = pose?.dy ?? 0, dz = (pose?.dz ?? 0) + f.z;
  const fz = (z: number): number => (pose?.flipZ === undefined ? z : pose.flipZ[0] + pose.flipZ[1] - z) + dz;
  if (q.k === "prism") {
    const za = fz(q.z0), zb = fz(q.z1);
    return { route: "prism", outline: q.loops.map((l) => place(f, l.map(([x, y]): Vec2 => [x + dx, y + dy]))), z: [Math.min(za, zb), Math.max(za, zb)] };
  }
  const [ax, ay] = f.at([q.cx + dx, q.cy + dy]);
  return { route: "revolve", profile: ccw(q.profile.map(([r, z]): Vec2 => [r, fz(z)])), axis: { origin: [ax, ay, 0], dir: [0, 0, 1] }, segments: q.seg };
}

/** Every part with primitives as one body on its PIP slot: the union of its primitives. */
export function bodiesOf(parts: TpParts, f: Frame): { bodies: BodyDraft[]; slots: MaterialSlot[] } {
  const bodies: BodyDraft[] = [];
  const used = new Set<string>();
  for (const p of parts.list) {
    if (p.prims.length === 0) continue;
    const s = PIP_SLOTS[MATERIAL[p.role]] as MaterialSlot;
    used.add(s.material);
    const shapes = p.prims.map((q) => shapeOf(q, p.pose, f));
    const base: ShapeDecl = shapes.length === 1 ? (shapes[0] as ShapeDecl) : { route: "csg", op: "union", of: shapes };
    bodies.push({ id: p.name.replace(/[^a-z0-9]+/gi, "-"), role: s.role, slot: s.slot, material: s.material, base });
  }
  return { bodies, slots: Object.values(PIP_SLOTS).filter((s) => used.has(s.material)) };
}
