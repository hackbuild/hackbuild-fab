// What the TANG archetypes share: TANG R6's 2D primitives on its integer
// grid, its four slots, and an emitter that places local (u, v) rings and z
// bands through the face frame (src/pip/common.ts frameOf and place).
//
// Source of record: originals/tang-r6/files/src/02_kernel.js (r6_4, D-222).
// Regions there are Clipper paths in integer units, SC = 1000 per mm (line
// 10), so every vertex is rounded to the micron as it enters (P(), line 14).
// The rings here round the same way, so a declaration equals the original's
// polygon vertex for vertex: circle (lines 19 to 23) starts at angle 0 with
// n = clamp(ceil(6 r), 16, 96) points unless n is given, arcBand (lines 29
// to 35), rect and rectC (lines 15 to 16), rotate (lines 73 to 76) rounding
// after the turn. Booleans the original runs through Clipper are declared
// here as csg shapes for the mesh kernel.

import {
  commandError, qualify, type ProfileLookup,
  type ApplyOut, type BodyDraft, type BodyRole, type BuildWarning, type ConductorFeature, type Feature,
  type MaterialSlot, type Metric, type ShapeDecl, type Tier, type Vec2,
} from "@hackbuild/spec";
import { place, type Frame } from "../pip/common.js";

/** 02_kernel.js line 10: integer units per mm. */
export const TANG_SC = 1000;
/** 02_kernel.js line 11: the z overlap that welds two slabs of one part, mm. */
export const TANG_EZ = 0.02;
/** Round to the original's micron grid, as P() rounds (02_kernel.js line 14). */
export const um = (v: number): number => Math.round(v * TANG_SC) / TANG_SC;
const pt = (x: number, y: number): Vec2 => [um(x), um(y)];

/** Signed area times two of a ring. */
function area2(r: readonly Vec2[]): number {
  let a = 0;
  r.forEach((p, i) => {
    const q = r[(i + 1) % r.length] as Vec2;
    a += p[0] * q[1] - q[0] * p[1];
  });
  return a;
}
/** poly(), 02_kernel.js line 15: rounded points, wound counter-clockwise. */
export function poly(points: readonly Vec2[]): Vec2[] {
  const p = points.map(([x, y]) => pt(x, y));
  return area2(p) < 0 ? p.reverse() : p;
}
/** segsFor, 02_kernel.js line 18. */
export const segsFor = (r: number): number => Math.max(16, Math.min(96, Math.ceil(r * 6)));
/** circle, 02_kernel.js lines 19 to 23: n points from angle phase, rounded. */
export function circle(cx: number, cy: number, r: number, n = segsFor(r), phase = 0): Vec2[] {
  return poly(Array.from({ length: n }, (_, i): Vec2 => {
    const a = phase + (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }));
}
/** rect, 02_kernel.js line 15. */
export function rect(x0: number, y0: number, x1: number, y1: number): Vec2[] {
  const [a, b] = x0 > x1 ? [x1, x0] : [x0, x1];
  const [c, d] = y0 > y1 ? [y1, y0] : [y0, y1];
  return poly([[a, c], [b, c], [b, d], [a, d]]);
}
/** rectC, 02_kernel.js line 16. */
export const rectC = (cx: number, cy: number, w: number, h: number): Vec2[] => rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
/** arcBand, 02_kernel.js lines 29 to 35: annular sector r0 to r1 from a0 to a1 deg. */
export function arcBand(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number, n?: number): Vec2[] {
  const span = a1 - a0;
  const k = n ?? Math.max(4, Math.ceil((Math.abs(span) / 360) * segsFor(r1)));
  const pts: Vec2[] = [];
  for (let i = 0; i <= k; i++) { const a = ((a0 + (span * i) / k) * Math.PI) / 180; pts.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]); }
  for (let i = k; i >= 0; i--) { const a = ((a0 + (span * i) / k) * Math.PI) / 180; pts.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]); }
  return poly(pts);
}
/** rotate, 02_kernel.js lines 73 to 76: about (cx, cy) by deg, each integer point rounded after the turn. */
export function rotate(ring: readonly Vec2[], deg: number, cx = 0, cy = 0): Vec2[] {
  const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
  return ring.map(([x, y]): Vec2 => {
    const X = Math.round(x * TANG_SC) - cx * TANG_SC, Y = Math.round(y * TANG_SC) - cy * TANG_SC;
    return [Math.round(cx * TANG_SC + X * c - Y * s) / TANG_SC, Math.round(cy * TANG_SC + X * s + Y * c) / TANG_SC];
  });
}
/**
 * stroke(pts, w, 'square') of one straight segment, 02_kernel.js lines 41 to
 * 46: Clipper's open square end pushes each end w / 2 past the point, so the
 * region is the segment's rectangle grown by w / 2 on every side.
 */
export function strokeSquare(a0: Vec2, b0: Vec2, w: number): Vec2[] {
  // Clipper offsets the micron points and rounds half away from zero (ClipperLib.Clipper.Round).
  const a = pt(a0[0], a0[1]), b = pt(b0[0], b0[1]);
  const half = (v: number): number => (v < 0 ? -Math.round(-v * TANG_SC) : Math.round(v * TANG_SC)) / TANG_SC;
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
  const ux = dx / l, uy = dy / l, h = w / 2;
  const ring: Vec2[] = [
    [a[0] - ux * h + uy * h, a[1] - uy * h - ux * h], [b[0] + ux * h + uy * h, b[1] + uy * h - ux * h],
    [b[0] + ux * h - uy * h, b[1] + uy * h + ux * h], [a[0] - ux * h - uy * h, a[1] - uy * h + ux * h],
  ].map(([x, y]): Vec2 => [half(x as number), half(y as number)]);
  return area2(ring) < 0 ? ring.reverse() : ring;
}
/** plen, 02_kernel.js line 112. */
export const plen = (pts: readonly Vec2[]): number => pts.slice(1).reduce((l, p, i) => l + Math.hypot(p[0] - (pts[i] as Vec2)[0], p[1] - (pts[i] as Vec2)[1]), 0);

/** D.snap, 03_design.js line 33: to the layer, never below one layer. */
export const tangSnap = (v: number, layer: number): number => Math.max(layer, Math.round(v / layer) * layer);

/** TANG R6's four slots (03_design.js lines 7 to 13): PLA, conductive PLA (Proto-pasta, line 30), TPU 95A, conductive TPU. */
export const TANG_SLOTS: Readonly<Record<"pla" | "cpla" | "tpu" | "ctpu", MaterialSlot>> = {
  pla: { slot: 1, material: "pla", role: "body", label: "PLA", preview: "#F5F0E6" },
  cpla: { slot: 2, material: "cpla-protopasta", role: "conductor", label: "conductive PLA", preview: "#1A1A1A" },
  tpu: { slot: 3, material: "tpu95", role: "flex", label: "TPU 95A", preview: "#FE0386" },
  ctpu: { slot: 4, material: "ctpu", role: "flex-conductor", label: "conductive TPU", preview: "#3A3A3A" },
};
export type TangSlot = keyof typeof TANG_SLOTS;

/** Collects one TANG archetype's declarations in local (u, v, z above the face); ids are local, the caller prefixes. */
export class TangEmit {
  readonly bodies: BodyDraft[] = [];
  readonly features: Feature[] = [];
  readonly ports: string[] = [];
  readonly metrics: Metric[] = [];
  readonly warnings: BuildWarning[] = [];
  private readonly used = new Set<TangSlot>();

  constructor(readonly f: Frame) {}

  /** A prism of a local ring (holes after it) over z0 to z1 above the face. */
  prism(rings: readonly (readonly Vec2[])[], z0: number, z1: number): ShapeDecl {
    return { route: "prism", outline: rings.map((r) => place(this.f, r)), z: [this.f.z + z0, this.f.z + z1] };
  }

  body(id: string, slot: TangSlot, base: ShapeDecl, role?: BodyRole): void {
    const s = TANG_SLOTS[slot];
    this.used.add(slot);
    this.bodies.push({ id, role: role ?? s.role, slot: s.slot, material: s.material, base });
  }

  /** A conductor region in conductive PLA: one local ring over z0 to z1 above the face, on its net. */
  conductor(id: string, net: string, ring: readonly Vec2[], z0: number, z1: number, width: number): void {
    this.used.add("cpla");
    const z = this.f.z + z0;
    const c: ConductorFeature = {
      kind: "conductor", id, material: TANG_SLOTS.cpla.material, net,
      region: { path: place(this.f, ring), face: { origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] } }, width, t: z1 - z0,
    };
    this.features.push(c);
  }

  feature(f: Feature): void {
    this.features.push(f);
    if (f.kind === "port") this.ports.push(f.id);
  }

  metric(id: string, value: number | string, unit: string | undefined, note: string, tiers: readonly Tier[], group = "readouts"): void {
    this.metrics.push({ id, value, ...(unit === undefined ? {} : { unit }), ...qualify(tiers), note, gate: "informational", group });
  }

  out(): ApplyOut {
    const slots = (Object.keys(TANG_SLOTS) as TangSlot[]).filter((s) => this.used.has(s)).map((s) => TANG_SLOTS[s]);
    return { bodies: this.bodies, features: this.features, ports: this.ports, slots, metrics: this.metrics, warnings: this.warnings };
  }
}

/** A material's modulus from profile, MPa, with the row's tier; E_REF when the row carries none. */
export function modulusOf(profile: ProfileLookup, id: string): { readonly mpa: number; readonly tier: Tier } {
  const m = profile.material(id);
  if (m.modulusMPa === undefined) {
    throw commandError({ code: "E_REF", path: `/materials/${id}/modulusMPa`, got: id, expected: "a material with a modulus", hint: `give profile material ${id} a modulusMPa; the TANG readouts bend it` });
  }
  return { mpa: m.modulusMPa, tier: m.provenance.tier };
}

/** Clipper's Round (ClipperLib.Clipper.Round): to the micron, half away from zero. */
const roundUm = (v: number): number => (v < 0 ? -Math.round(-v * TANG_SC) : Math.round(v * TANG_SC)) / TANG_SC;

function inside(p: Vec2, ring: readonly Vec2[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Vec2, b = ring[j] as Vec2;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

/** Proper crossing of segments pq and rs: the parameters along each, or null. */
function cross(p: Vec2, q: Vec2, r: Vec2, s: Vec2): [number, number] | null {
  const d = (q[0] - p[0]) * (s[1] - r[1]) - (q[1] - p[1]) * (s[0] - r[0]);
  if (d === 0) return null;
  const t = ((r[0] - p[0]) * (s[1] - r[1]) - (r[1] - p[1]) * (s[0] - r[0])) / d;
  const u = ((r[0] - p[0]) * (q[1] - p[1]) - (r[1] - p[1]) * (q[0] - p[0])) / d;
  return t > 0 && t < 1 && u > 0 && u < 1 ? [t, u] : null;
}

/**
 * Union of two counter-clockwise rings whose boundaries cross transversally
 * (a hub and an arm, 05_design.js lines 105 to 108), traced along the outer
 * boundary. Each crossing is rounded to the micron as Clipper rounds an
 * intersection, so the ring equals the original's K.union vertex for vertex
 * up to Clipper's choice at a tie. A pair that does not cross, or whose
 * walk does not close, is E_SCHEMA: the construction is outside what the
 * port reproduces.
 */
export function unionRings(a: readonly Vec2[], b: readonly Vec2[]): Vec2[] {
  type Node = { p: Vec2; link?: { ring: 0 | 1; at: number } };
  const rings = [a, b];
  const hits: { ia: number; ta: number; ib: number; tb: number; p: Vec2 }[] = [];
  a.forEach((p, i) => {
    const q = a[(i + 1) % a.length] as Vec2;
    b.forEach((r, j) => {
      const s = b[(j + 1) % b.length] as Vec2;
      const c = cross(p, q, r, s);
      if (c !== null) hits.push({ ia: i, ta: c[0], ib: j, tb: c[1], p: [roundUm(p[0] + c[0] * (q[0] - p[0])), roundUm(p[1] + c[0] * (q[1] - p[1]))] });
    });
  });
  if (hits.length === 0 || hits.length % 2 !== 0) {
    throw commandError({ code: "E_SCHEMA", path: "/params", got: hits.length, expected: "two rings whose boundaries cross", hint: "the hub and arm rings do not cross; check the arm and hub sizes" });
  }
  const build = (k: 0 | 1): Node[] => {
    const ring = rings[k] as readonly Vec2[];
    const out: Node[] = [];
    ring.forEach((p, i) => {
      out.push({ p });
      const here = hits.map((h, n) => ({ h, n })).filter(({ h }) => (k === 0 ? h.ia : h.ib) === i).sort((x, y) => (k === 0 ? x.h.ta - y.h.ta : x.h.tb - y.h.tb));
      for (const { h, n } of here) out.push({ p: h.p, link: { ring: k === 0 ? 1 : 0, at: n } });
    });
    return out;
  };
  const lists = [build(0), build(1)] as const;
  const indexOf = (k: 0 | 1, n: number): number => lists[k].findIndex((x) => x.link !== undefined && x.link.at === n);
  const start = lists[0].findIndex((x) => x.link === undefined && !inside(x.p, b));
  if (start < 0) throw commandError({ code: "E_SCHEMA", path: "/params", got: "hub", expected: "a hub vertex outside the arm", hint: "the arm covers the hub; check the arm and hub sizes" });
  const out: Vec2[] = [];
  let k: 0 | 1 = 0, i = start;
  for (let guard = 0; guard < 4 * (a.length + b.length + hits.length); guard++) {
    const node = lists[k][i] as Node;
    if (k === 0 && i === start && out.length > 0) return out;
    out.push(node.p);
    if (node.link !== undefined && out.length > 1) {
      const n = node.link.at;
      k = node.link.ring;
      i = indexOf(k, n);
    }
    i = (i + 1) % lists[k].length;
  }
  throw commandError({ code: "E_KERNEL", path: "/params", got: "union", expected: "a closed union walk", hint: "the hub and arm union did not close", record: "mesh-kernel" });
}
