// WASHER pan/tilt servo laser: two hobby servos aim the diode at a flat
// target, wall mm centred on the target against servo degrees and pulse
// microseconds. Ported from laser-rig.html (canonical lineage row
// washer.app/laserriggg): usToDeg and degToUs (lines 2190 to 2191), vOff
// and ik (2198 to 2206), fkCalib and fk (2236 to 2279), calibMap and
// wallToAngles (3623 to 3644). The harvested copy the M07 golden came from
// (designs/washer/legacy/laser-rig.zip) holds
// the same functions byte for byte at lines 1941 to 2030 and 3251 to 3271.
//
// The page's CFG becomes WasherRig and its captured corners BilinearCorners;
// a corner map is active when one is passed (the page's calibActive()).
// RAD here is degrees per radian, as on the page.

/** The rig the map reads, from profile (washerRig in planners/washer-mm.ts). */
export interface WasherRig {
  /** Laser to target throw, mm (CFG.dist). */
  readonly dist: number;
  /** Target width, mm (CFG.wallW). */
  readonly wallW: number;
  /** Target height, mm (CFG.wallH). */
  readonly wallH: number;
  /** Laser height above the floor the target stands on, mm (CFG.mountH). */
  readonly mountH: number;
  /** Pulse window, us (CFG.minUs, CFG.maxUs; firmware RANGE). */
  readonly minUs: number;
  readonly maxUs: number;
  /** Servo angles the design origin maps to, deg (CFG.homePan, CFG.homeTilt; set by ZERO). */
  readonly homePan: number;
  readonly homeTilt: number;
  /** Wiring direction per axis (CFG.invPan, CFG.invTilt). */
  readonly invPan: boolean;
  readonly invTilt: boolean;
  /** Trim per axis, deg (CFG.trimPan, CFG.trimTilt). */
  readonly trimPan: number;
  readonly trimTilt: number;
}

/** A servo aim, deg. */
export interface ServoAim {
  readonly pan: number;
  readonly tilt: number;
}

/** The four captured corner aims, deg (the page's calib.tl, tr, bl, br). */
export interface BilinearCorners {
  readonly tl: ServoAim;
  readonly tr: ServoAim;
  readonly bl: ServoAim;
  readonly br: ServoAim;
}

/** A target point, mm from the target centre. */
export interface WallPoint {
  readonly wx: number;
  readonly wy: number;
}

const RAD = 180 / Math.PI;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

/** Pulse to angle, deg, line 2190. */
export function usToDeg(r: WasherRig, us: number): number {
  return ((us - r.minUs) / (r.maxUs - r.minUs)) * 180;
}

/** Angle to a whole pulse, us, line 2191. */
export function degToUs(r: WasherRig, d: number): number {
  return Math.round(r.minUs + (clamp(d, 0, 180) / 180) * (r.maxUs - r.minUs));
}

/** Angle to pulse unrounded, us (canonical degToUsF, line 5241): velocities need the slope, not the step. */
export function degToUsF(r: WasherRig, d: number): number {
  return r.minUs + (clamp(d, 0, 180) / 180) * (r.maxUs - r.minUs);
}

/** Height of the target centre above the laser, mm, line 2198. */
export function vOff(r: WasherRig): number {
  return r.wallH / 2 - r.mountH;
}

/** Target mm to servo angles, deg, ideal model, lines 2200 to 2206. */
export function ik(r: WasherRig, wx: number, wy: number): ServoAim {
  const D = Math.max(r.dist, 40);
  const ps = r.invPan ? -1 : 1, ts = r.invTilt ? -1 : 1;
  const p = 90 + ps * Math.atan2(wx, D) * RAD + r.trimPan;
  const t = 90 + ts * Math.atan2(wy + vOff(r), Math.hypot(wx, D)) * RAD + r.trimTilt;
  return { pan: clamp(p, 0, 180), tilt: clamp(t, 0, 180) };
}

/** The bilinear corner map, target mm to servo angles, lines 3623 to 3632. */
export function calibMap(r: WasherRig, c: BilinearCorners, wx: number, wy: number): ServoAim {
  const u = (wx + r.wallW / 2) / r.wallW;
  const v = (wy + r.wallH / 2) / r.wallH;
  const { bl, br, tl, tr } = c;
  const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
  return {
    pan: w00 * bl.pan + w10 * br.pan + w01 * tl.pan + w11 * tr.pan,
    tilt: w00 * bl.tilt + w10 * br.tilt + w01 * tl.tilt + w11 * tr.tilt,
  };
}

/** Target mm to servo angles through the corner map when one is passed, else ik with home referencing, lines 3633 to 3644. */
export function wallToAngles(r: WasherRig, wx: number, wy: number, c: BilinearCorners | null = null): ServoAim {
  if (c !== null) {
    const m = calibMap(r, c, wx, wy);
    return { pan: clamp(m.pan, 0, 180), tilt: clamp(m.tilt, 0, 180) };
  }
  const a = ik(r, wx, wy), a0 = ik(r, 0, 0);
  return {
    pan: clamp(r.homePan + (a.pan - a0.pan), 0, 180),
    tilt: clamp(r.homeTilt + (a.tilt - a0.tilt), 0, 180),
  };
}

/**
 * The bilinear map inverted by Newton with the analytic Jacobian, 6
 * iterations, u and v clamped to -1.5 to 2.5, lines 2236 to 2256. Null
 * when an iterate is not finite.
 */
export function fkCalib(r: WasherRig, c: BilinearCorners, panDeg: number, tiltDeg: number): WallPoint | null {
  const { bl, br, tl, tr } = c;
  let u = 0.5, v = 0.5;
  for (let i = 0; i < 6; i++) {
    const w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
    const fp = w00 * bl.pan + w10 * br.pan + w01 * tl.pan + w11 * tr.pan - panDeg;
    const ft = w00 * bl.tilt + w10 * br.tilt + w01 * tl.tilt + w11 * tr.tilt - tiltDeg;
    const dpu = (1 - v) * (br.pan - bl.pan) + v * (tr.pan - tl.pan);
    const dpv = (1 - u) * (tl.pan - bl.pan) + u * (tr.pan - br.pan);
    const dtu = (1 - v) * (br.tilt - bl.tilt) + v * (tr.tilt - tl.tilt);
    const dtv = (1 - u) * (tl.tilt - bl.tilt) + u * (tr.tilt - br.tilt);
    const det = dpu * dtv - dpv * dtu;
    if (Math.abs(det) < 1e-12) break;
    u -= (dtv * fp - dpv * ft) / det;
    v -= (-dtu * fp + dpu * ft) / det;
    if (!isFinite(u) || !isFinite(v)) return null;
    u = clamp(u, -1.5, 2.5);
    v = clamp(v, -1.5, 2.5);
    if (Math.abs(fp) < 1e-7 && Math.abs(ft) < 1e-7) break;
  }
  return { wx: (u - 0.5) * r.wallW, wy: (v - 0.5) * r.wallH };
}

/** Servo angles to target mm, the exact inverse of wallToAngles, lines 2258 to 2279. */
export function fk(r: WasherRig, panDeg: number, tiltDeg: number, c: BilinearCorners | null = null): WallPoint {
  if (c !== null) {
    const p = fkCalib(r, c, panDeg, tiltDeg);
    if (p) return p;
  }
  const D = Math.max(r.dist, 40);
  const ps = r.invPan ? -1 : 1, ts = r.invTilt ? -1 : 1;
  const a0 = ik(r, 0, 0);
  const panIk = panDeg - r.homePan + a0.pan;
  const tiltIk = tiltDeg - r.homeTilt + a0.tilt;
  const ap = (panIk - 90 - r.trimPan) / ps / RAD;
  const wx = D * Math.tan(clamp(ap, -1.35, 1.35));
  const at = (tiltIk - 90 - r.trimTilt) / ts / RAD;
  const wy = Math.hypot(wx, D) * Math.tan(clamp(at, -1.35, 1.35)) - vOff(r);
  return { wx, wy };
}
