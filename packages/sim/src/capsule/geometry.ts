// SLUG capsule geometry (M02-T08 step 2): the funnel faces, the ceiling with
// its square mouth and hood, the rotor pockets, the deck exit and the
// delivery ramp, ported from designs/slug/legacy/slug.html lines 202 to 262
// and 677 to 809 (lineage slug.capsule-geometry/slug-12). Every expression
// keeps the page's order of operations, so a port step and a legacy step
// agree to the last bit; three.js Vector3 calls are written out as the
// arithmetic three.js r160 performs. Every number is a CapsuleModel field
// the scene supplies with provenance. Sine, cosine, tangent and atan2 come
// from ../trig.js, the fdlibm port, where the page calls Math: V8 gives
// those one ulp apart on x64 and arm64 and the trials would differ by
// machine (CI-03). Math.hypot and Math.sqrt stay: V8 builds them from IEEE
// double operations alone, and 994578 hypot and 361859 sqrt calls of one
// trial gave equal bits on both (computed 2026-10-14).

import { commandError, type Provenance } from "@hackbuild/spec";
import { atan2, cos, sin, tan } from "../trig.js";

/** A mutable point or velocity, mm or mm/s. */
export interface Vec {
  x: number;
  y: number;
  z: number;
}

/** One capsule: centre position, mm, and velocity, mm/s. */
export interface Capsule {
  readonly p: Vec;
  readonly v: Vec;
}

/**
 * The machine as the page's physics sees it. Lengths mm, angles deg. Field
 * names follow the page's `P` echo of slug.scad.
 */
export interface CapsuleGeometryRows {
  readonly t: number;
  readonly capD: number;
  readonly pockD: number;
  readonly pockRc: number;
  readonly nPock: number;
  readonly xl: number;
  readonly xr: number;
  readonly yb: number;
  readonly yf: number;
  readonly zBase: number;
  readonly zDeckB: number;
  readonly zRot: number;
  readonly rotH: number;
  readonly zCeil: number;
  readonly zFunTop: number;
  /** Throat centre (x, y). */
  readonly thr: readonly [number, number];
  /** Deck exit hole centre (x, y). */
  readonly exi: readonly [number, number];
  readonly exiD: number;
  /** Half the square funnel mouth. */
  readonly fb: number;
  /** Plane of the vertical funnel back face, y. */
  readonly yFback: number;
  /** Ramp ends, (y, z). */
  readonly rampA: readonly [number, number];
  readonly rampB: readonly [number, number];
  readonly rampW: number;
  /** Ramp plane normal before normalising, (x, y, z). */
  readonly rampNormal: readonly [number, number, number];
  readonly doorZ1: number;
  /** Hood over the exit side of the ceiling: angles deg, radius mm. */
  readonly hood: { readonly a0: number; readonly a1: number; readonly r: number };
  /** Leaning funnel faces (0 front, 2 left, 3 right) and their plan rotation, deg. */
  readonly funnelFaces: readonly { readonly face: 0 | 2 | 3; readonly rzDeg: number }[];
  /** Spawn lattice: pitch, edge gap, height above the funnel top. */
  readonly spawn: { readonly pitch: number; readonly edgeGap: number; readonly above: number };
  readonly provenance: Provenance;
}

/** One funnel face as a finite panel: inward normal, up-slope direction, inner face origin, slope length. */
export interface FunnelPlane {
  readonly n: Vec;
  readonly d: Vec;
  readonly o: Vec;
  readonly len: number;
}

/** Heights and derived shapes the solver reads every step, mm. */
export interface CapsuleGeometry {
  readonly rows: CapsuleGeometryRows;
  readonly capR: number;
  readonly wi: number;
  readonly di: number;
  /** Funnel floor, the ceiling top. */
  readonly zCeilTop: number;
  /** Rotor top face. */
  readonly zRotTop: number;
  /** Pocket floor, the deck top; a capsule centre below it has been delivered. */
  readonly zDeckTop: number;
  readonly funPlanes: readonly FunnelPlane[];
  /** Unit ramp normal and the ramp plane origin. */
  readonly rampN: Vec;
  readonly rampO: Vec;
}

const rad = (d: number): number => d * Math.PI / 180;
const deg = (r: number): number => r * 180 / Math.PI;

/** Vector3.applyAxisAngle about +z as three.js r160 computes it (quaternion, then the cross-product form). */
function rotZ(v: Vec, angle: number): Vec {
  const halfAngle = angle / 2, s = sin(halfAngle);
  const qx = 0 * s, qy = 0 * s, qz = 1 * s, qw = cos(halfAngle);
  const vx = v.x, vy = v.y, vz = v.z;
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);
  return { x: vx + qw * tx + qy * tz - qz * ty, y: vy + qw * ty + qz * tx - qx * tz, z: vz + qw * tz + qx * ty - qy * tx };
}

/** The rows one funnel face reads, mm. */
export type FunnelRows = Pick<CapsuleGeometryRows, "t" | "fb" | "xl" | "xr" | "yf" | "thr" | "zFunTop">;

/** One leaning funnel face before it is placed: plan run, lean from horizontal (rad), mid plane floor crossing, uncut and cut slope lengths, mm. */
export interface FunnelPanel {
  readonly run: number;
  readonly ang: number;
  readonly r0: number;
  readonly uw: number;
  readonly len: number;
}

/**
 * Funnel face p (0 front, 2 left, 3 right) as slug.html lines 236 to 244
 * compute it, in the page's order of operations. The one port of these
 * formulas: the capsule solver's funPlanes and the Rapier granular-funnel
 * panels both read it.
 */
export function funnelPanel(g: FunnelRows, p: 0 | 2 | 3, zCeilTop: number): FunnelPanel {
  const dz = g.zFunTop - zCeilTop;
  const run = p === 0 ? g.yf - (g.thr[1] + g.fb) : p === 2 ? (g.thr[0] - g.fb) - g.xl : g.xr - (g.thr[0] + g.fb);
  const ang = atan2(dz, run);
  const r0 = g.fb + (g.t / 2) / sin(ang);
  const uw = (run - (g.t / 2) / sin(ang)) / cos(ang);
  const len = uw - (g.t / 2) * tan(ang);
  return { run, ang, r0, uw, len };
}

/** Funnel faces as the page builds funPlanes (slug.html lines 236 to 244 and 713 to 719). */
function funnelPlanes(g: CapsuleGeometryRows, zCeilTop: number): FunnelPlane[] {
  return g.funnelFaces.map(({ face, rzDeg }) => {
    const { ang: a, r0, len } = funnelPanel(g, face, zCeilTop);
    const rz = rad(rzDeg);
    const n = rotZ({ x: 0, y: -sin(a), z: cos(a) }, rz);
    const d = rotZ({ x: 0, y: cos(a), z: sin(a) }, rz);
    const o = rotZ({ x: 0, y: r0, z: 0 }, rz);
    o.x += g.thr[0]; o.y += g.thr[1]; o.z += zCeilTop;
    const h = g.t / 2;
    o.x += n.x * h; o.y += n.y * h; o.z += n.z * h;
    return { n, d, o, len };
  });
}

/** Derives the solver's geometry from the rows; a non-finite or missing row is E_SCHEMA. */
export function capsuleGeometry(rows: CapsuleGeometryRows): CapsuleGeometry {
  for (const [k, v] of Object.entries(rows)) {
    if (k === "provenance" || typeof v !== "number") continue;
    if (!Number.isFinite(v)) throw commandError({ code: "E_SCHEMA", path: `/geometry/${k}`, got: String(v), expected: "a finite number, mm", hint: "copy the row from slug.html P (lines 202 to 221)" });
  }
  const zCeilTop = rows.zCeil + rows.t;
  const nx = rows.rampNormal[0], ny = rows.rampNormal[1], nz = rows.rampNormal[2];
  const inv = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
  return {
    rows,
    capR: rows.capD / 2,
    wi: rows.xr - rows.xl,
    di: rows.yf - rows.yb,
    zCeilTop,
    zRotTop: rows.zRot + rows.rotH,
    zDeckTop: rows.zDeckB + rows.t,
    funPlanes: funnelPlanes(rows, zCeilTop),
    rampN: { x: nx * inv, y: ny * inv, z: nz * inv },
    rampO: { x: 0, y: rows.rampA[0], z: rows.rampA[1] },
  };
}

/** The rows the spawn lattice reads, mm. */
export type LatticeRows = Pick<CapsuleGeometryRows, "capD" | "xl" | "xr" | "yb" | "yf" | "zFunTop" | "spawn">;

/**
 * Lattice spawn point of capsule i (slug.html lines 686 to 694). The one
 * port of the lattice: the capsule solver and the Rapier granular-funnel
 * scene both read it.
 */
export function spawnPos(g: LatticeRows, i: number): Vec {
  const { pitch, edgeGap, above } = g.spawn;
  const r = g.capD / 2;
  const cols = Math.floor((g.xr - g.xl - 2 * r) / pitch) + 1;
  const rows = Math.floor((g.yf - g.yb - 2 * r) / pitch) + 1;
  const per = cols * rows, layer = Math.floor(i / per), rem = i % per;
  return {
    x: g.xl + r + edgeGap + (rem % cols) * pitch + (layer % 2 ? pitch / 2 : 0),
    y: g.yb + r + edgeGap + Math.floor(rem / cols) * pitch,
    z: g.zFunTop + above + layer * pitch,
  };
}

/** Contact coefficients of the page, by the line that applies them. */
export interface ContactRows {
  /** Gravity, mm/s2 (line 814). */
  readonly gravity: number;
  /** Wall restitution, ratio: box, back face and ramp rails (lines 818 to 821, 826, 883 to 884). */
  readonly wallRestitution: number;
  /** Funnel face: normal reflect factor and damping, ratio (line 730). */
  readonly faceReflect: number;
  readonly faceDamp: number;
  /** Funnel bottom edge: reflect factor and damping, ratio (line 739). */
  readonly edgeReflect: number;
  readonly edgeDamp: number;
  /** Resting on a plate: vertical bounce and tangential keep, ratio (lines 750, 787, 833). */
  readonly restBounce: number;
  readonly restKeep: number;
  /** Perched on a hole rim: reflect factor and damping, ratio (lines 761 to 762, 797). */
  readonly rimReflect: number;
  readonly rimDamp: number;
  /** Pocket wall: velocity kept and wall velocity taken, ratio (line 852). */
  readonly pocketKeep: number;
  readonly pocketCarry: number;
  /** Relaxation toward the carried velocity inside a pocket and on the top face, 1/s (lines 855, 864). */
  readonly pocketRate: number;
  readonly faceRate: number;
  /** Ramp: reflect factor, x and y keep, ratio; along-ramp margin, mm (lines 874 to 880). */
  readonly rampReflect: number;
  readonly rampKeepX: number;
  readonly rampKeepY: number;
  readonly rampMargin: number;
  /** Base: bounce and tangential keep, ratio (line 885). */
  readonly baseBounce: number;
  readonly baseKeep: number;
  /** Capsule pair impulse factor, ratio (line 899). */
  readonly pairImpulse: number;
  /** Position-only relax passes per step, count (line 904). */
  readonly relaxIters: number;
  /** Speed cap, mm/s, and per-step velocity damping, ratio (lines 907 to 908). */
  readonly speedCap: number;
  readonly damping: number;
  /** Spawn lateral velocity span, mm/s: (r - 0.5) x span on x and y (line 701). */
  readonly spawnLateralSpan: number;
  readonly provenance: Provenance;
}

/** Numerical guards of the page, not physical numbers: squared and linear distances below which a direction is undefined, mm2 and mm. */
export const PAIR_D2_STEP = 1e-6;
export const PAIR_D2_RELAX = 1e-9;
export const LEN_EPS = 1e-6;

/** Finite funnel panel contact (slug.html lines 720 to 740). */
export function hitFunnel(c: Capsule, f: FunnelPlane, r: number, k: ContactRows): void {
  const vx = c.p.x - f.o.x, vy = c.p.y - f.o.y, vz = c.p.z - f.o.z;
  const dn = vx * f.n.x + vy * f.n.y + vz * f.n.z;
  const du = vx * f.d.x + vy * f.d.y + vz * f.d.z;
  if (du > f.len + r) return;
  if (du >= 0) {
    if (dn >= r) return;
    const push = r - dn;
    c.p.x += f.n.x * push; c.p.y += f.n.y * push; c.p.z += f.n.z * push;
    const vn = c.v.x * f.n.x + c.v.y * f.n.y + c.v.z * f.n.z;
    if (vn < 0) {
      const s = -vn * k.faceReflect;
      c.v.x += f.n.x * s; c.v.y += f.n.y * s; c.v.z += f.n.z * s;
      c.v.x *= k.faceDamp; c.v.y *= k.faceDamp; c.v.z *= k.faceDamp;
    }
    return;
  }
  const L = Math.hypot(dn, du);
  if (L >= r || L < LEN_EPS) return;
  const q = (r - L) / L;
  c.p.x += (f.n.x * dn + f.d.x * du) * q; c.p.y += (f.n.y * dn + f.d.y * du) * q; c.p.z += (f.n.z * dn + f.d.z * du) * q;
  const ex = (f.n.x * dn + f.d.x * du) / L, ey = (f.n.y * dn + f.d.y * du) / L, ez = (f.n.z * dn + f.d.z * du) / L;
  const dot = c.v.x * ex + c.v.y * ey + c.v.z * ez;
  if (dot < 0) {
    c.v.x -= ex * dot * k.edgeReflect; c.v.y -= ey * dot * k.edgeReflect; c.v.z -= ez * dot * k.edgeReflect;
    c.v.x *= k.edgeDamp; c.v.y *= k.edgeDamp; c.v.z *= k.edgeDamp;
  }
}

/** Resting on a flat face at zTop (the shared branch of plateTop and plateTopRect). */
function rest(c: Capsule, zTop: number, r: number, k: ContactRows): void {
  if (c.p.z < zTop + r) {
    c.p.z = zTop + r;
    if (c.v.z < 0) { c.v.z *= -k.restBounce; c.v.x *= k.restKeep; c.v.y *= k.restKeep; }
  }
}

/** Perched on the rim point (qx, qy, zTop) (the shared tail of plateTop and plateTopRect). */
function perch(c: Capsule, px: number, py: number, zTop: number, r: number, k: ContactRows): void {
  const vx = c.p.x - px, vy = c.p.y - py, vz = c.p.z - zTop;
  const L = Math.hypot(vx, vy, vz) || LEN_EPS;
  if (L < r) {
    const q = r - L;
    c.p.x += vx / L * q; c.p.y += vy / L * q; c.p.z += vz / L * q;
    const dot = (c.v.x * vx + c.v.y * vy + c.v.z * vz) / L;
    if (dot < 0) {
      c.v.x -= vx / L * dot * k.rimReflect; c.v.y -= vy / L * dot * k.rimReflect; c.v.z -= vz / L * dot * k.rimReflect;
      c.v.x *= k.rimDamp; c.v.y *= k.rimDamp; c.v.z *= k.rimDamp;
    }
  }
}

/** Plate with one round hole (slug.html lines 745 to 765); true when the capsule is in the plate's band and not clean through. */
export function plateTop(c: Capsule, zTop: number, hx: number, hy: number, hr: number, r: number, k: ContactRows): boolean {
  if (c.p.z > zTop + r || c.p.z < zTop - r) return false;
  const dx = c.p.x - hx, dy = c.p.y - hy, d = Math.hypot(dx, dy);
  if (d <= hr - r) return false;
  if (d >= hr + r) {
    rest(c, zTop, r, k);
    return true;
  }
  const ux = dx / (d || 1), uy = dy / (d || 1);
  perch(c, hx + hr * ux, hy + hr * uy, zTop, r, k);
  return true;
}

/** Inside the hood: plan radius at most hood.r and angle a0 to a1 deg (slug.html lines 766 to 771). */
export function inHood(g: CapsuleGeometry, x: number, y: number): boolean {
  const h = g.rows.hood;
  const r = Math.hypot(x, y);
  if (r > h.r) return false;
  let a = deg(atan2(y, x));
  if (a < 0) a += 360;
  return a >= h.a0 && a <= h.a1;
}

/** Plate with a square hole of half width hw (slug.html lines 773 to 802). */
export function plateTopRect(c: Capsule, zTop: number, cx: number, cy: number, hw: number, r: number, k: ContactRows): boolean {
  if (c.p.z > zTop + r || c.p.z < zTop - r) return false;
  const dx = c.p.x - cx, dy = c.p.y - cy;
  const inside = Math.abs(dx) <= hw && Math.abs(dy) <= hw;
  let qx: number, qy: number;
  if (inside) {
    const gap = Math.min(hw - Math.abs(dx), hw - Math.abs(dy));
    if (gap >= r) return false;
    if (hw - Math.abs(dx) < hw - Math.abs(dy)) { qx = Math.sign(dx) * hw; qy = dy; }
    else { qx = dx; qy = Math.sign(dy) * hw; }
  } else {
    qx = Math.max(-hw, Math.min(hw, dx)); qy = Math.max(-hw, Math.min(hw, dy));
    if (Math.hypot(dx - qx, dy - qy) >= r) {
      rest(c, zTop, r, k);
      return true;
    }
  }
  perch(c, cx + qx, cy + qy, zTop, r, k);
  return true;
}

/** Plan centre of pocket i at rotor angle rotorDeg (slug.html lines 803 to 806). */
export function pocketCentre(g: CapsuleGeometry, rotorDeg: number, i: number): [number, number] {
  const a = rad(rotorDeg + i * 360 / g.rows.nPock);
  return [g.rows.pockRc * cos(a), g.rows.pockRc * sin(a)];
}

/** Nearest pocket to (x, y), first index on a tie (slug.html lines 807 to 811). */
export function nearestPocket(g: CapsuleGeometry, rotorDeg: number, x: number, y: number): { i: number; cx: number; cy: number; d: number } {
  let best = 0, bd = 1e9;
  for (let i = 0; i < g.rows.nPock; i++) {
    const [cx, cy] = pocketCentre(g, rotorDeg, i);
    const d = Math.hypot(x - cx, y - cy);
    if (d < bd) { bd = d; best = i; }
  }
  const [cx, cy] = pocketCentre(g, rotorDeg, best);
  return { i: best, cx, cy, d: bd };
}
