// The revolve route (D-053): a closed (r, z) profile revolved about an axis,
// with a radial displacement field f(theta, z) per row. A port of TENON
// part2.js (tenon-src.zip member src/part2.js: thetaList line 208, revolve
// line 220, the feature fields lines 110 to 205), with the profile checks
// of TENON sweep.js simple() (lines 15 to 33). One strictly manifold closed
// surface per part; no CSG.
//
// Cosines come from Math.cos over arbitrary feature-edge angles, so this
// route does not use the committed unit-circle table of D-175; the snap to
// the 1/1024 mm grid absorbs engine differences below half a grid step.

import type { Axis, Mm, ShapeDecl } from "@hackbuild/spec";
import { snap, snapWeld, signedVolume, type MeshData } from "../hash.js";
import { meshError } from "./prism.js";

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Radial displacement in mm at angle theta (radians) and axial position z (mm). */
export type RadialField = (theta: number, z: Mm) => Mm;

/** One profile row: radius and height in mm, and the field that displaces it, if any. A row with r 0 and no field is a pole. */
export interface RevolveRow {
  readonly r: Mm;
  readonly z: Mm;
  readonly f: RadialField | null;
}

/** Half width of the column pair placed at each feature edge, radians: 0.02 deg (TENON thetaList). */
export const EDGE_COLUMN_HALF = 0.02 * DEG;

/**
 * Column angles: n regular columns plus a pair at every feature edge plus
 * and minus 0.02 deg, so a field step falls between two close columns. A
 * regular column within 1e-4 rad of an edge column is dropped (it would
 * make a sliver); the list is sorted, deduplicated at 1e-7 rad and wrapped
 * into [0, 2 pi).
 */
export function thetaList(n: number, edges: readonly number[] = []): number[] {
  const eps = EDGE_COLUMN_HALF;
  const out: number[] = [];
  const ed: number[] = [];
  for (const a of edges) {
    const b = ((a % TAU) + TAU) % TAU;
    ed.push(b - eps, b + eps);
  }
  const nearEdge = (t: number): boolean => ed.some((e) => Math.abs(((((t - e + Math.PI) % TAU) + TAU) % TAU) - Math.PI) < 1e-4);
  for (let i = 0; i < n; i++) {
    const t = (i * TAU) / n;
    if (!nearEdge(t)) out.push(t);
  }
  out.push(...ed);
  out.sort((a, b) => a - b);
  const dd: number[] = [];
  for (const a of out) {
    const b = ((a % TAU) + TAU) % TAU;
    if (dd.length === 0 || b - dd[dd.length - 1]! > 1e-7) dd.push(b);
  }
  if (dd.length > 1 && TAU - dd[dd.length - 1]! < 1e-7) dd.pop();
  return dd;
}

/** Profile shape audit after TENON sweep.js simple(). */
export interface ProfileReport {
  /** Signed area of the (r, z) loop, mm2; positive when counter-clockwise. */
  readonly area: number;
  /** Segment pairs that cross, count. */
  readonly cross: number;
  /** Rows with r below 0, count. */
  readonly neg: number;
  /** Consecutive segments that reverse along one line (a zero-thickness fin), count. */
  readonly back: number;
}

/** Rows with consecutive duplicate (r, z) removed, as sweep.js audits them. */
function distinctRows(rows: readonly RevolveRow[]): RevolveRow[] {
  return rows.filter((r, i, a) => i === 0 || Math.abs(r.r - a[i - 1]!.r) > 1e-9 || Math.abs(r.z - a[i - 1]!.z) > 1e-9);
}

/** The four profile checks of TENON sweep.js simple(), fields ignored. */
export function profileReport(rowsIn: readonly RevolveRow[]): ProfileReport {
  const rows = distinctRows(rowsIn);
  const n = rows.length;
  let area = 0;
  let cross = 0;
  let neg = 0;
  for (let i = 0; i < n; i++) {
    const a = rows[i]!;
    const b = rows[(i + 1) % n]!;
    area += a.r * b.z - b.r * a.z;
    if (a.r < -1e-9) neg++;
  }
  const segs = rows.map((a, i) => {
    const b = rows[(i + 1) % n]!;
    return [a.r, a.z, b.r, b.z] as const;
  });
  for (let i = 0; i < n; i++) {
    const [ax, ay, bx, by] = segs[i]!;
    for (let k = i + 2; k < n; k++) {
      if (i === 0 && k === n - 1) continue;
      const [cx, cy, dx, dy] = segs[k]!;
      if (Math.max(ax, bx) < Math.min(cx, dx) || Math.max(cx, dx) < Math.min(ax, bx) || Math.max(ay, by) < Math.min(cy, dy) || Math.max(cy, dy) < Math.min(ay, by)) continue;
      const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
      const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
      const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
      if (d1 * d2 < -1e-12 && d3 * d4 < -1e-12) cross++;
    }
  }
  let back = 0;
  for (let i = 0; i < n; i++) {
    const [ax, ay, bx, by] = segs[i]!;
    const [cx, cy, dx, dy] = segs[(i + 1) % n]!;
    const ux = bx - ax, uy = by - ay, vx = dx - cx, vy = dy - cy;
    if (Math.abs(ux * vy - uy * vx) < 1e-9 && ux * vx + uy * vy < -1e-9) back++;
  }
  return { area: area / 2, cross, neg, back };
}

/** Throws E_SCHEMA when the profile fails any of the four checks. */
export function checkProfile(rows: readonly RevolveRow[], path = "/profile"): ProfileReport {
  const p = profileReport(rows);
  const failed: string[] = [];
  if (p.cross > 0) failed.push(`${p.cross} self intersections`);
  if (!(p.area > 0)) failed.push(`area ${p.area} mm2 (computed), legal above 0`);
  if (p.neg > 0) failed.push(`${p.neg} rows with negative r`);
  if (p.back > 0) failed.push(`${p.back} zero-thickness back-tracking fins`);
  if (failed.length > 0) {
    throw meshError({
      code: "E_SCHEMA", path, got: p, expected: "a simple counter-clockwise (r, z) loop with r at or above 0",
      hint: `fix the revolve profile: ${failed.join(", ")}`,
    });
  }
  return p;
}

/**
 * Revolve rows about the z axis over the given column angles (TENON
 * revolve). Consecutive duplicate rows and a closing duplicate are dropped;
 * a pole row is one vertex; the surface is flipped when its volume comes
 * out negative. Positions are float64; TENON stored them as float32.
 */
export function revolveRows(rowsIn: readonly RevolveRow[], thetas: readonly number[]): MeshData {
  const rows: RevolveRow[] = [];
  for (const r of rowsIn) {
    const p = rows[rows.length - 1];
    if (p !== undefined && Math.abs(p.r - r.r) < 1e-9 && Math.abs(p.z - r.z) < 1e-9 && p.f === r.f) continue;
    rows.push(r);
  }
  if (rows.length > 1) {
    const a = rows[0]!;
    const b = rows[rows.length - 1]!;
    if (Math.abs(a.r - b.r) < 1e-9 && Math.abs(a.z - b.z) < 1e-9) rows.pop();
  }
  const N = thetas.length;
  const M = rows.length;
  const cs = new Float64Array(N);
  const sn = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    cs[j] = Math.cos(thetas[j]!);
    sn[j] = Math.sin(thetas[j]!);
  }
  const start = new Int32Array(M);
  const pole = new Uint8Array(M);
  let nv = 0;
  for (let i = 0; i < M; i++) {
    start[i] = nv;
    pole[i] = rows[i]!.r === 0 && rows[i]!.f === null ? 1 : 0;
    nv += pole[i] ? 1 : N;
  }
  const pos = new Float64Array(nv * 3);
  for (let i = 0; i < M; i++) {
    const row = rows[i]!;
    if (pole[i]) {
      pos[start[i]! * 3 + 2] = row.z;
      continue;
    }
    for (let j = 0; j < N; j++) {
      const R = row.r + (row.f !== null ? row.f(thetas[j]!, row.z) : 0);
      const o = (start[i]! + j) * 3;
      pos[o] = R * cs[j]!;
      pos[o + 1] = R * sn[j]!;
      pos[o + 2] = row.z;
    }
  }
  let ntri = 0;
  for (let i = 0; i < M; i++) {
    const k = (i + 1) % M;
    ntri += pole[i] && pole[k] ? 0 : pole[i] || pole[k] ? N : 2 * N;
  }
  const idx = new Uint32Array(ntri * 3);
  let t = 0;
  for (let i = 0; i < M; i++) {
    const k = (i + 1) % M;
    const a = start[i]!;
    const b = start[k]!;
    if (pole[i] && pole[k]) continue;
    for (let j = 0; j < N; j++) {
      const j1 = (j + 1) % N;
      if (pole[i]) {
        idx[t++] = a; idx[t++] = b + j; idx[t++] = b + j1;
      } else if (pole[k]) {
        idx[t++] = a + j; idx[t++] = b; idx[t++] = a + j1;
      } else {
        idx[t++] = a + j; idx[t++] = b + j; idx[t++] = b + j1;
        idx[t++] = a + j; idx[t++] = b + j1; idx[t++] = a + j1;
      }
    }
  }
  const mesh = { positions: pos, triangles: idx };
  if (signedVolume(mesh) < 0) {
    for (let i = 0; i < idx.length; i += 3) {
      const x = idx[i + 1]!;
      idx[i + 1] = idx[i + 2]!;
      idx[i + 2] = x;
    }
  }
  return mesh;
}

// ---- radial fields (TENON part2.js lines 110 to 205) ----

/** Field params are numbers only (spec/build.ts ShapeDecl revolve field). */
export type FieldParams = Readonly<Record<string, number>>;

/** A registered radial field: its maker and the feature edges that get column pairs. */
export interface FieldDef {
  readonly id: string;
  readonly make: (p: FieldParams) => RadialField;
  readonly edges: (p: FieldParams) => number[];
}

const frac = (x: number): number => x - Math.floor(x);
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

function wrapPi(a0: number): number {
  let a = a0 % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}

function need(p: FieldParams, id: string, keys: readonly string[]): void {
  for (const k of keys) {
    if (typeof p[k] !== "number" || !Number.isFinite(p[k])) {
      throw meshError({ code: "E_SCHEMA", path: `/field/params/${k}`, got: p[k], expected: "a finite number", hint: `give field ${id} a numeric ${k}` });
    }
  }
}

/** Root, flank up, crest, flank down, root over one pitch; 0 to 1. */
function threadProfile(ph0: number, ff: number, cf: number): number {
  let ph = ph0;
  const a = (1 - 2 * ff - cf) / 2;
  if (ph < a) return 0;
  ph -= a;
  if (ph < ff) return ph / ff;
  ph -= ff;
  if (ph < cf) return 1;
  ph -= cf;
  if (ph < ff) return 1 - ph / ff;
  return 0;
}

/** The axial coordinate a field reads: zSign x (z - zOrigin), identity when both are absent. */
function axial(p: FieldParams, f: RadialField): RadialField {
  const zOrigin = p["zOrigin"];
  const zSign = p["zSign"];
  if (zOrigin === undefined && zSign === undefined) return f;
  const o = zOrigin ?? 0;
  if (zSign === -1) return (th, z) => f(th, o - z);
  return (th, z) => f(th, z - o);
}

const extThread: FieldDef = {
  id: "tenon.thread.external",
  make: (p) => {
    need(p, "tenon.thread.external", ["z0", "z1", "pitch", "starts", "depth"]);
    const o = { z0: p["z0"]!, z1: p["z1"]!, pitch: p["pitch"]!, starts: p["starts"]!, depth: p["depth"]!, hand: p["hand"] || 1 };
    const chamferLo = !!p["chamferLo"], chamferHi = !!p["chamferHi"], fillLo = !!p["fillLo"], fillHi = !!p["fillHi"];
    const ff = o.depth / o.pitch;
    const cf = Math.max(0.05, (1 - 2 * ff) * 0.4);
    return axial(p, (th, z) => {
      if (z < o.z0) return fillLo ? o.depth : 0;
      if (z > o.z1) return fillHi ? o.depth : 0;
      const ph = frac((z - o.z0) / o.pitch - (o.hand * o.starts * th) / TAU);
      let d = o.depth * threadProfile(ph, ff, cf);
      if (chamferLo) d = Math.min(d, z - o.z0);
      if (chamferHi) d = Math.min(d, o.z1 - z);
      if (fillLo) d = Math.max(d, o.depth - (z - o.z0));
      if (fillHi) d = Math.max(d, o.depth - (o.z1 - z));
      return clamp(d, 0, o.depth);
    });
  },
  edges: () => [],
};

const intThread: FieldDef = {
  id: "tenon.thread.internal",
  make: (p) => {
    need(p, "tenon.thread.internal", ["z0", "z1", "pitch", "starts", "depth"]);
    const o = { z0: p["z0"]!, z1: p["z1"]!, pitch: p["pitch"]!, starts: p["starts"]!, depth: p["depth"]!, hand: p["hand"] || 1 };
    const mouthHi = !!p["mouthHi"];
    const ff = o.depth / o.pitch;
    const cf = Math.max(0.05, (1 - 2 * ff) * 0.4);
    return axial(p, (th, z) => {
      if (z < o.z0 || z > o.z1) return 0;
      const ph = frac((z - o.z0) / o.pitch - (o.hand * o.starts * th) / TAU);
      let d = o.depth * (1 - threadProfile(ph, ff, cf));
      const dm = mouthHi ? o.z1 - z : z - o.z0;
      d = Math.min(d, dm);
      return -clamp(d, 0, o.depth);
    });
  },
  edges: () => [],
};

const LUG_KEYS = ["lugs", "lugW", "lugH", "lugT", "lugGap", "radius"] as const;

const bayonetLug: FieldDef = {
  id: "tenon.bayonet.lug",
  make: (p) => {
    need(p, "tenon.bayonet.lug", LUG_KEYS);
    const n = p["lugs"]!, half = p["lugW"]! / 2 / p["radius"]!, s0 = p["lugGap"]!, s1 = p["lugGap"]! + p["lugT"]!, lugH = p["lugH"]!;
    return axial(p, (th, s) => {
      if (s < s0 || s > s1) return 0;
      const k = Math.round(th / (TAU / n));
      const dth = wrapPi(th - (k * TAU) / n);
      if (Math.abs(dth) > half) return 0;
      return Math.min(lugH, s - s0);
    });
  },
  edges: (p) => {
    need(p, "tenon.bayonet.lug", LUG_KEYS);
    const n = p["lugs"]!, half = p["lugW"]! / 2 / p["radius"]!;
    const e: number[] = [];
    for (let k = 0; k < n; k++) {
      const c = (k * TAU) / n;
      e.push(c - half, c + half);
    }
    return e;
  },
};

const GROOVE_KEYS = ["lugs", "lugW", "lugH", "lugT", "lugGap", "clear", "sweep", "preload", "clearZ", "bite", "dir", "radius"] as const;

function grooveGeom(p: FieldParams): { D: number; halfN: number; sweep: number; gateW: number; gateC: number; run: number; ramp: number; sA0: number; sB: number } {
  const Rsock = p["radius"]!;
  const D = p["lugH"]! + p["clear"]! + 0.1;
  const halfN = (p["lugW"]! / 2 + 0.3) / Rsock;
  const sweep = p["sweep"]! * DEG;
  const pocket = p["lugW"]! / Rsock + 2 * DEG;
  const gateW = 4 * DEG;
  const run = Math.max(1e-3, sweep - pocket);
  const gateC = run - gateW / 2 - 1.5 * DEG;
  const ramp = p["clearZ"]! + p["preload"]!;
  const sA0 = p["lugGap"]! - p["clearZ"]!;
  const sB = p["lugGap"]! + p["lugT"]! + p["clearZ"]!;
  return { D, halfN, sweep, gateW, gateC, run, ramp, sA0, sB };
}

const bayonetGroove: FieldDef = {
  id: "tenon.bayonet.groove",
  make: (p) => {
    need(p, "tenon.bayonet.groove", GROOVE_KEYS);
    const g = grooveGeom(p);
    const n = p["lugs"]!;
    const dir = p["dir"]! >= 0 ? 1 : -1;
    const tipD = p["lugH"]! - p["clear"]! - p["bite"]!;
    return axial(p, (th, s) => {
      if (s < 0 || s > g.sB + 1e-6) return 0;
      const k = Math.round(th / (TAU / n));
      const u0 = wrapPi(th - (k * TAU) / n);
      // the channel of lug k runs from its notch in the +dir direction; the next lug's notch is 2 pi / n away
      let u = dir * u0;
      if (u < -g.halfN) u += TAU / n;
      if (Math.abs(u) <= g.halfN) return g.D;
      if (u > g.halfN && u <= g.halfN + g.sweep) {
        const v = u - g.halfN;
        const t = Math.min(1, v / g.run);
        const sA = g.sA0 + g.ramp * t;
        if (s < sA || s > g.sB) return 0;
        let d = Math.min(g.D, s - sA);
        const gb = 1 - Math.abs(v - g.gateC) / (g.gateW / 2);
        if (gb > 0) d = Math.min(d, g.D - (g.D - tipD) * gb);
        return Math.max(0, d);
      }
      return 0;
    });
  },
  edges: (p) => {
    need(p, "tenon.bayonet.groove", GROOVE_KEYS);
    const g = grooveGeom(p);
    const n = p["lugs"]!;
    const dir = p["dir"]! >= 0 ? 1 : -1;
    const e: number[] = [];
    for (let k = 0; k < n; k++) {
      const c = (k * TAU) / n;
      e.push(c - g.halfN, c + g.halfN, c + dir * (g.halfN + g.sweep), c + dir * (g.halfN + g.run));
      e.push(c + dir * (g.halfN + g.gateC - g.gateW / 2), c + dir * (g.halfN + g.gateC), c + dir * (g.halfN + g.gateC + g.gateW / 2));
    }
    return e;
  },
};

const AXIAL_KEYS = ["n", "half", "depth"] as const;

/** n axial channels of angular half width `half` (radians) and depth mm, down a bore (TENON part2.js line 582). */
const axialGroove: FieldDef = {
  id: "tenon.groove.axial",
  make: (p) => {
    need(p, "tenon.groove.axial", AXIAL_KEYS);
    const n = p["n"]!, half = p["half"]!, dep = p["depth"]!;
    return axial(p, (th) => {
      const k = Math.round(th / (TAU / n));
      return Math.abs(wrapPi(th - (k * TAU) / n)) <= half ? dep : 0;
    });
  },
  edges: (p) => {
    need(p, "tenon.groove.axial", AXIAL_KEYS);
    const n = p["n"]!, half = p["half"]!;
    const e: number[] = [];
    for (let k = 0; k < n; k++) e.push((k * TAU) / n - half, (k * TAU) / n + half);
    return e;
  },
};

/** The radial field registry; ShapeDecl revolve names a field by id. */
export const RADIAL_FIELDS: ReadonlyMap<string, FieldDef> = new Map(
  [extThread, intThread, bayonetLug, bayonetGroove, axialGroove].map((f) => [f.id, f]),
);

/** Look up a field by id; an unknown id is E_REF. */
export function radialField(id: string): FieldDef {
  const f = RADIAL_FIELDS.get(id);
  if (f === undefined) {
    throw meshError({ code: "E_REF", path: "/field/id", got: id, expected: `one of ${[...RADIAL_FIELDS.keys()].join(", ")}`, hint: "name a registered radial field" });
  }
  return f;
}

/** Columns per revolution when a shape does not say, count (TENON RES.standard n). */
export const DEFAULT_SEGMENTS = 200;

type RevolveShape = Extract<ShapeDecl, { route: "revolve" }>;

/** Map z-axis coordinates onto an axis: rotate (0, 0, 1) onto dir, then translate by origin. */
function placeOnAxis(mesh: MeshData, axis: Axis | undefined): MeshData {
  const p = mesh.positions;
  if (axis === undefined) return mesh;
  const [dx0, dy0, dz0] = axis.dir;
  const len = Math.hypot(dx0, dy0, dz0);
  if (!(len > 0)) throw meshError({ code: "E_SCHEMA", path: "/axis/dir", got: axis.dir, expected: "a nonzero direction", hint: "give the revolve axis a direction" });
  const [ux, uy, uz] = [dx0 / len, dy0 / len, dz0 / len];
  // Rodrigues rotation taking (0, 0, 1) to (ux, uy, uz); the antiparallel case is a half turn about x.
  const out = new Float64Array(p.length);
  const [ox, oy, oz] = axis.origin;
  const c = uz;
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!, y = p[i + 1]!, z = p[i + 2]!;
    let rx: number, ry: number, rz: number;
    if (c > 1 - 1e-15) [rx, ry, rz] = [x, y, z];
    else if (c < -1 + 1e-15) [rx, ry, rz] = [x, -y, -z];
    else {
      // k = z x u normalised = (-uy, ux, 0) / s, s = sin(angle)
      const s = Math.hypot(ux, uy);
      const kx = -uy / s, ky = ux / s;
      const dot = kx * x + ky * y;
      const crx = ky * z, cry = -kx * z, crz = kx * y - ky * x;
      rx = x * c + crx * s + kx * dot * (1 - c);
      ry = y * c + cry * s + ky * dot * (1 - c);
      rz = z * c + crz * s;
    }
    out[i] = rx + ox;
    out[i + 1] = ry + oy;
    out[i + 2] = rz + oz;
  }
  return { positions: out, triangles: mesh.triangles };
}

/** A revolve ShapeDecl: one field over every non-pole row, its edges as column pairs, then the axis and the D-054 snap with its weld. */
export function revolveShape(shape: RevolveShape, path = ""): MeshData {
  if (shape.profile.length < 3) {
    throw meshError({ code: "E_SCHEMA", path: `${path}/profile`, got: shape.profile.length, expected: "at least 3 (r, z) rows", hint: "give the revolve profile three or more rows" });
  }
  const def = shape.field === undefined ? undefined : radialField(shape.field.id);
  const f = def === undefined || shape.field === undefined ? null : def.make(shape.field.params);
  const rows: RevolveRow[] = shape.profile.map(([r, z]) => ({ r, z, f: r === 0 ? null : f }));
  checkProfile(rows, `${path}/profile`);
  const segments = shape.segments ?? DEFAULT_SEGMENTS;
  if (!(Number.isInteger(segments) && segments >= 3)) {
    throw meshError({ code: "E_SCHEMA", path: `${path}/segments`, got: segments, expected: "an integer of 3 or more", hint: "set segments to 3 or more columns" });
  }
  const thetas = thetaList(segments, def === undefined || shape.field === undefined ? [] : def.edges(shape.field.params));
  return snapWeld(placeOnAxis(revolveRows(rows, thetas), shape.axis));
}
