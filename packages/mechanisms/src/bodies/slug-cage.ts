// capsule-pocket-rotor's bodies: the SLUG drum cage, ported from the
// canonical original originals/slug/files/slug.scad (lineage
// slug.scad/slug-12), lines 171 to 213: gear2d, rotor_common,
// rotor_mortise, rotor_gear, rotor_ring, rotor_top and spacer. Each cut part
// is a set of plain loops in the scad's own 2D frame, outer first, then the
// cuts in the order rotor_common draws them.
//
// OpenSCAD semantics the port keeps: circle() with $fn 72 puts vertex i at
// 360 i / $fn degrees; rotate() and circle() use OpenSCAD's degree trig,
// exact at multiples of 30 and 45 degrees; tan, acos and cos take and give
// degrees. union() of the root disc and the teeth is drawn here as the
// radial maximum of the two, which is exact because both are star shaped
// about the gear centre and the teeth do not touch each other; difference()
// of rotor_common is drawn as separate hole loops, which is exact while the
// cuts are disjoint and inside the disc. A param set that breaks either
// condition is refused with E_SCHEMA rather than drawn wrong.

import { commandError, type ApplyIn, type BodyDraft, type MechanismApplyOut, type Vec2 } from "@hackbuild/spec";
import type { Values } from "../derive/common.js";
import { wind } from "../tumbler/generate.js";

/** The scad parameters the cage reads, by their scad names. */
export interface CageParams {
  /** $fn, line 20. */
  readonly fn: number;
  readonly t: number;
  readonly slop: number;
  readonly pockD: number;
  readonly pockRc: number;
  readonly nPock: number;
  readonly gm: number;
  readonly gzRot: number;
  readonly gpa: number;
  readonly rotH: number;
  readonly rotGearN: number;
  readonly rotRingZ: number;
  readonly spcR: number;
  readonly spcN: number;
  readonly spcW: number;
  readonly spcBody: number;
  readonly rotBore: number;
  readonly tieR: number;
  readonly tieR2: number;
  readonly tieD: number;
}

/** One cut part: its scad PART name, how many the drum takes, its loops (outer first). */
export interface CagePart {
  readonly name: string;
  readonly qty: number;
  readonly loops: readonly (readonly Vec2[])[];
}

const D2R = Math.PI / 180;

/** OpenSCAD sin_degrees: exact at 0, 30, 45, 60 and 90 in each quadrant. */
export function sinDeg(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  const oppose = x >= 180;
  if (oppose) x -= 180;
  if (x > 90) x = 180 - x;
  let s: number;
  if (x < 45) s = x === 30 ? 0.5 : Math.sin(x * D2R);
  else if (x === 45) s = Math.SQRT1_2;
  else if (x === 60) s = Math.sqrt(3) / 2;
  else s = Math.cos((90 - x) * D2R);
  return oppose ? -s : s;
}

/** OpenSCAD cos_degrees. */
export function cosDeg(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  let oppose = x >= 180;
  if (oppose) x -= 180;
  if (x > 90) {
    x = 180 - x;
    oppose = !oppose;
  }
  let c: number;
  if (x > 45) c = x === 60 ? 0.5 : Math.sin((90 - x) * D2R);
  else if (x === 45) c = Math.SQRT1_2;
  else if (x === 30) c = Math.sqrt(3) / 2;
  else c = Math.cos(x * D2R);
  return oppose ? -c : c;
}

const rot = (p: Vec2, a: number): Vec2 => {
  const c = cosDeg(a);
  const s = sinDeg(a);
  return [c * p[0] - s * p[1], s * p[0] + c * p[1]];
};
const tr = (p: Vec2, d: Vec2): Vec2 => [p[0] + d[0], p[1] + d[1]];

/** circle(r) at $fn, vertex i at 360 i / fn degrees. */
function circle(r: number, fn: number): Vec2[] {
  return Array.from({ length: fn }, (_, i): Vec2 => {
    const phi = (360 * i) / fn;
    return [r * cosDeg(phi), r * sinDeg(phi)];
  });
}

/** inv_a(br, r) in degrees (line 171). */
function invA(br: number, r: number): number {
  if (r <= br) return 0;
  const a = Math.acos(br / r) / D2R;
  return (Math.tan(a * D2R) * 180) / Math.PI - a;
}

/** Where the segment from the centre to p crosses the ring, nearest p. */
function rayHit(ring: readonly Vec2[], p: Vec2): Vec2 {
  let best: Vec2 | undefined;
  let bestT = -1;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = p[0] * ey - p[1] * ex;
    if (den === 0) continue;
    const t = (a[0] * ey - a[1] * ex) / den;
    const u = (a[0] * p[1] - a[1] * p[0]) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t > bestT) {
      bestT = t;
      best = [p[0] * t, p[1] * t];
    }
  }
  if (best === undefined) throw new Error("gear root disc misses a tooth root");
  return best;
}

const angleOf = (p: Vec2): number => {
  const a = Math.atan2(p[1], p[0]) / D2R;
  return a < 0 ? a + 360 : a;
};

/** Drop repeated and collinear vertices, as the boolean that made the outline does. */
function clean(ring: readonly Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (last !== undefined && Math.hypot(p[0] - last[0], p[1] - last[1]) < 1e-9) continue;
    out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0]![0] - out[out.length - 1]![0], out[0]![1] - out[out.length - 1]![1]) < 1e-9) out.pop();
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length]!;
      const b = out[i]!;
      const c = out[(i + 1) % out.length]!;
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cross) <= 1e-9 * Math.hypot(c[0] - a[0], c[1] - a[1])) {
        out.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/**
 * gear2d(m, z, pa, steps), lines 172 to 187: the outline of the root disc
 * circle(r = rr) unioned with z teeth, each the polygon from the centre
 * through the root, the mirrored flank, the flank and back to the root.
 */
export function gear2d(m: number, z: number, pa: number, fn: number, steps = 10): Vec2[] {
  const pr = (m * z) / 2;
  const br = pr * cosDeg(pa);
  const ar = pr + m;
  const rr = pr - 1.25 * m;
  const half = 90 / z + invA(br, pr);
  const base = Math.max(rr, br);
  const fl = Array.from({ length: steps + 1 }, (_, i): Vec2 => {
    const r = base + ((ar - base) * i) / steps;
    const a = half - invA(br, r);
    return [r * cosDeg(a), r * sinDeg(a)];
  });
  const hr = half - invA(br, base);
  // tooth without its centre vertex, which the root disc covers
  const tooth: Vec2[] = [
    [rr * cosDeg(-hr), rr * sinDeg(-hr)],
    ...fl.map((p): Vec2 => [p[0], -p[1]]),
    ...[...fl].reverse(),
    [rr * cosDeg(hr), rr * sinDeg(hr)],
  ];
  const pitch = 360 / z;
  const toothSpan = 2 * Math.max(hr, ...fl.map((p) => Math.abs(Math.atan2(p[1], p[0]) / D2R)));
  if (toothSpan >= pitch) {
    throw commandError({ code: "E_SCHEMA", path: "/params/gzRot", got: String(z), expected: "teeth that do not touch at the root", hint: "the port draws gear2d's union only while the teeth stand apart on the root disc; pick fewer teeth or a larger module" });
  }
  const disc = circle(rr, fn);
  const out: Vec2[] = [];
  for (let i = 0; i < z; i++) {
    const t = tooth.map((p) => rot(p, i * pitch));
    const next = rot(tooth[0]!, (i + 1) * pitch);
    out.push(...t);
    const last = t[t.length - 1]!;
    out.push(rayHit(disc, last));
    // disc vertices in the gap between this tooth and the next
    const a0 = angleOf(last);
    let a1 = angleOf(next);
    if (a1 <= a0) a1 += 360;
    const inGap = disc.filter((p) => {
      let a = angleOf(p);
      if (a <= a0) a += 360;
      return a > a0 + 1e-9 && a < a1 - 1e-9;
    }).sort((p, q) => {
      let a = angleOf(p);
      let b = angleOf(q);
      if (a <= a0) a += 360;
      if (b <= a0) b += 360;
      return a - b;
    });
    out.push(...inGap, rayHit(disc, next));
  }
  return clean(out);
}

/** Derived scad values: spc_gap1, spc_gap2 (lines 65 to 66), rot_top_z (line 49), the root radius. */
export function cageDerived(p: CageParams): { readonly rootR: number; readonly rotTopZ: number; readonly spcGap1: number; readonly spcGap2: number } {
  const rotTopZ = p.rotH - p.t;
  return { rootR: (p.gm * p.gzRot) / 2 - 1.25 * p.gm, rotTopZ, spcGap1: p.rotRingZ - p.rotGearN * p.t, spcGap2: rotTopZ - (p.rotRingZ + p.t) };
}

/** rotor_mortise(w, off), lines 192 to 195: tangential slots on spc_r. */
function rotorMortise(p: CageParams, w: number, off: number): Vec2[][] {
  const a = p.t + 2 * p.slop;
  const b = w + 2 * p.slop;
  const sq: Vec2[] = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
  return Array.from({ length: p.spcN }, (_, i) => sq.map((q) => rot(tr(q, [p.spcR, 0]), off + (i * 360) / p.spcN)));
}

/** rotor_common(mw, off, both), lines 196 to 202: bore, pockets, tie rod holes, mortises. */
function rotorCommon(p: CageParams, mw: number, off: number, both: boolean): Vec2[][] {
  const holes: Vec2[][] = [circle(p.rotBore / 2, p.fn)];
  for (let i = 0; i < p.nPock; i++) holes.push(circle(p.pockD / 2, p.fn).map((q) => rot(tr(q, [p.pockRc, 0]), (i * 360) / p.nPock)));
  for (let i = 0; i < 4; i++) {
    holes.push(circle(p.tieD / 2, p.fn).map((q) => rot(tr(q, [p.tieR, 0]), 45 + i * 90)));
    holes.push(circle(p.tieD / 2, p.fn).map((q) => rot(tr(q, [p.tieR2, 0]), 45 + i * 90)));
  }
  if (mw > 0) {
    holes.push(...rotorMortise(p, mw, off));
    if (both) holes.push(...rotorMortise(p, mw, off + 180 / p.spcN));
  }
  return holes;
}

/** spacer(gap), lines 207 to 212: the shoulder [spc_body, gap] and two tenons [spc_w, t], unioned. */
function spacer(p: CageParams, gap: number): Vec2[] {
  const b = p.spcBody / 2;
  const w = p.spcW / 2;
  const t = p.t;
  if (b > w) return [[-b, t], [-w, t], [-w, 0], [w, 0], [w, t], [b, t], [b, t + gap], [w, t + gap], [w, gap + 2 * t], [-w, gap + 2 * t], [-w, t + gap], [-b, t + gap]];
  if (b === w) return [[-w, 0], [w, 0], [w, gap + 2 * t], [-w, gap + 2 * t]];
  return [[-w, 0], [w, 0], [w, t], [b, t], [b, t + gap], [w, t + gap], [w, gap + 2 * t], [-w, gap + 2 * t], [-w, t + gap], [-b, t + gap], [-b, t], [-w, t]];
}

function segmentsCross(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const o = (p: Vec2, q: Vec2, r: Vec2): number => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) <= 0 && o(c, d, a) * o(c, d, b) <= 0;
}

function bbox(r: readonly Vec2[]): [number, number, number, number] {
  return [Math.min(...r.map((q) => q[0])), Math.min(...r.map((q) => q[1])), Math.max(...r.map((q) => q[0])), Math.max(...r.map((q) => q[1]))];
}

/** True when two loops touch or cross. */
function loopsMeet(a: readonly Vec2[], b: readonly Vec2[]): boolean {
  const A = bbox(a);
  const B = bbox(b);
  if (A[2] < B[0] || B[2] < A[0] || A[3] < B[1] || B[3] < A[1]) return false;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsCross(a[i]!, a[(i + 1) % a.length]!, b[j]!, b[(j + 1) % b.length]!)) return true;
    }
  }
  return false;
}

/** A disc's loops, refused when a cut meets another cut or the outline (the port draws difference() as separate loops). */
function disc(name: string, outer: Vec2[], holes: Vec2[][]): readonly Vec2[][] {
  const loops = [outer, ...holes];
  for (let i = 0; i < loops.length; i++) {
    for (let j = i + 1; j < loops.length; j++) {
      if (loopsMeet(loops[i]!, loops[j]!)) {
        throw commandError({ code: "E_SCHEMA", path: "/params", got: name, expected: "cuts that stay apart and inside the disc", hint: `${name}: cut ${j} meets ${i === 0 ? "the outline" : `cut ${i}`}; the scad would merge them and the port does not, so pick params that keep pockets, tie holes and mortises apart` });
      }
    }
  }
  return loops;
}

/**
 * The drum's cut parts in PART_QTY order (slug.html lines 1042 to 1050):
 * rotor_gear(0) once, rotor_gear() rot_gear_n - 1 times (the assembly,
 * lines 605 to 606), rotor_ring, rotor_top, spc_n spacer_a and spc_n
 * spacer_b (lines 607 to 614).
 */
export function cageParts(p: CageParams): readonly CagePart[] {
  const d = cageDerived(p);
  const gear = gear2d(p.gm, p.gzRot, p.gpa, p.fn);
  const root = circle(d.rootR, p.fn);
  return [
    { name: "rotor_gear_a", qty: 1, loops: disc("rotor_gear_a", gear, rotorCommon(p, 0, 0, false)) },
    { name: "rotor_gear_b", qty: p.rotGearN - 1, loops: disc("rotor_gear_b", gear, rotorCommon(p, p.spcW, 0, false)) },
    { name: "rotor_ring", qty: 1, loops: disc("rotor_ring", root, rotorCommon(p, p.spcW, 0, true)) },
    { name: "rotor_top", qty: 1, loops: disc("rotor_top", root, rotorCommon(p, p.spcW, 180 / p.spcN, false)) },
    { name: "spacer_a", qty: p.spcN, loops: [spacer(p, d.spcGap1)] },
    { name: "spacer_b", qty: p.spcN, loops: [spacer(p, d.spcGap2)] },
  ];
}

/** The scad parameters of the cage from the def's values, counts rounded as the scad's for loops step them. */
export function cageParams(p: Values): CageParams {
  return {
    fn: Math.round(p["fn"]!), t: p["t"]!, slop: p["slop"]!, pockD: p["pockD"]!, pockRc: p["pockRc"]!, nPock: Math.round(p["nPock"]!),
    gm: p["gm"]!, gzRot: Math.round(p["gzRot"]!), gpa: p["gpa"]!, rotH: p["rotH"]!, rotGearN: Math.round(p["rotGearN"]!), rotRingZ: p["rotRingZ"]!,
    spcR: p["spcR"]!, spcN: Math.round(p["spcN"]!), spcW: p["spcW"]!, spcBody: p["spcBody"]!, rotBore: p["rotBore"]!,
    tieR: p["tieR"]!, tieR2: p["tieR2"]!, tieD: p["tieD"]!,
  };
}

/** The page's part gap, mm (slug.html line 176, the nest field nGap). */
export const CAGE_PART_GAP = 4;

/**
 * apply(): every cut part of the drum, each as many times as the drum
 * takes it, as prism bodies of depth t laid in one row along x from the
 * face origin, CAGE_PART_GAP apart by bounding box, bottoms on the face
 * origin's y. The row is this port's layout; the original nests the same
 * parts across its cut sheets (slug.html lines 1037 to 1197), which
 * packages/nest ports.
 */
export function capsuleRotorApply(input: ApplyIn<Values>): MechanismApplyOut {
  const p = cageParams(input.params);
  const o = input.face.origin;
  const bodies: BodyDraft[] = [];
  let x = o[0];
  for (const part of cageParts(p)) {
    const xs = part.loops[0]!.map((q) => q[0]);
    const ys = part.loops[0]!.map((q) => q[1]);
    const [minX, maxX, minY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys)];
    const stem = part.name.replace(/_/g, "-");
    for (let i = 0; i < part.qty; i++) {
      const dx = x - minX;
      const dy = o[1] - minY;
      const move = (r: readonly Vec2[]): Vec2[] => r.map((q): Vec2 => [q[0] + dx, q[1] + dy]);
      bodies.push({
        id: part.qty === 1 ? stem : `${stem}-${i + 1}`, role: "body", slot: 1, material: "",
        base: { route: "prism", outline: [wind(move(part.loops[0]!), true), ...part.loops.slice(1).map((h) => wind(move(h), false))], z: [o[2], o[2] + p.t] },
      });
      x += maxX - minX + CAGE_PART_GAP;
    }
  }
  return { bodies, features: [], metrics: [], assertions: [], warnings: [] };
}
