// PAWL sim core, ported from designs/pawl/legacy/core.mjs (lineage
// pawl.core/final, sha256 d1869500a5a871ff). The arithmetic keeps the
// legacy operand order so a run matches core.mjs step for step on one Rapier
// build; every number the legacy file typed lives in a PawlModel row the
// scene supplies with provenance (packages/sim/scenes/pawl.ts). Not ported:
// meshVerts and the convex hull collider path, which only the page drives
// (final.mjs never passes meshes), and the AE envelope, which no sim line
// reads.

import type { ImpulseJoint, RigidBody, World } from "@dimforge/rapier3d-deterministic-compat";
import type { Provenance } from "@hackbuild/spec";
import type { Rapier } from "../../rapier/init.js";

export type PawlAxisKey = "ankRoll" | "ankPitch" | "knee" | "hipPitch" | "hipRoll";
/** A named length of the model, mm (core.mjs lines 4 to 6). */
export type PawlLengthName = PawlAxisKey | "seg" | "xLeg" | "shoX" | "shoY";
export type PawlActuatorId = "r150" | "r100" | "r50";
export type PawlLinkKey = "torso" | "hipY" | "thigh" | "shank" | "ankP" | "foot" | "shoY" | "arm";
export type PawlJointKey = "hipRoll" | "hipPitch" | "knee" | "ankPitch" | "ankRoll" | "shoPitch" | "shoRoll";
type V3 = readonly [number, number, number];

/** A length by name plus an offset, mm; resolves to lengths[ref] + plus. */
export interface PawlLengthRef { readonly ref: PawlLengthName; readonly plus?: number }

export interface PawlActuator {
  /** Torque ceiling, N m. */
  readonly tauNm: number;
  /** Slew ceiling, deg/s. */
  readonly wmaxDegS: number;
  /** Rotor inertia before the gear ratio squared, kg m2. */
  readonly rotorKgM2: number;
  /** Gear ratio, ratio; reflected inertia is rotorKgM2 x ratio x ratio. */
  readonly ratio: number;
}

/**
 * One joint of the per-side table (core.mjs lines 21 to 43). A component
 * listed in sideAxes is multiplied by the side (+1 left, -1 right); the
 * legacy table wrote those as `s`, so a zero component stays +0.
 */
export interface PawlJointRow {
  readonly k: PawlJointKey;
  readonly par: PawlLinkKey;
  readonly chi: PawlLinkKey;
  /** Joint x, by name, times side. */
  readonly atX: PawlLengthName;
  /** Joint y. */
  readonly atY: PawlLengthRef;
  readonly axis: V3;
  readonly axisSide: readonly (0 | 1 | 2)[];
  readonly act: PawlActuatorId;
  /** Limits, deg. */
  readonly limDeg: readonly [number, number];
  readonly carrier: PawlLinkKey;
  readonly can: V3;
  readonly mout: V3;
  readonly moutSide: readonly (0 | 1 | 2)[];
  /** Actuator offset along its axis, mm. */
  readonly along: number;
  readonly hint: string;
}

export interface PawlLink {
  /** Mass, g. */
  readonly massG: number;
  /** Collider box, mm. */
  readonly boxMm: V3;
  /** Link origin x by name (times side), or 0; y by name. */
  readonly orgX: PawlLengthName | 0;
  readonly orgY: PawlLengthName;
  /** Centre of mass in the link frame, mm. */
  readonly comMm: V3;
  /** Actuator whose reflected inertia the link carries, if driven. */
  readonly driven?: PawlActuatorId;
}

export interface PawlGroup {
  /** Membership bits, shifted 16 left in the Rapier group word. */
  readonly member: number;
  readonly filter: number;
}

/** Gait and control state, core.mjs defaults() line 180. Lengths in m, times in s. */
export interface PawlGait {
  mode: "stand" | "walk" | "squat" | "pose";
  hoist: boolean;
  paused: boolean;
  /** Gait period, s. */
  T: number;
  /** Step length, m. */
  S: number;
  /** Step height, m. */
  H: number;
  /** Sway amplitude, m. */
  A: number;
  /** Hip roll axis height above ground, m. */
  hgt: number;
  /** Swing fraction, ratio. */
  sf: number;
  /** Sway dwell, ratio. */
  dwell: number;
  imu: boolean;
  /** Servo bandwidth, Hz. */
  bw: number;
  /** Torque scale, ratio. */
  ts: number;
  /** Foot friction, ratio (page control; the world reads model.contact). */
  mu: number;
  /** Gait phase, ratio 0 to 1. */
  phase: number;
  /** Elapsed time, s. */
  t: number;
  /** IMU ankle gains: pitch rad/rad, pitch rate s, roll rad/rad, roll rate s. */
  kp: number;
  kd: number;
  kr: number;
  kdr: number;
}

export interface PawlModel {
  /** Provenance of the whole table; each group's comment names its core.mjs lines. */
  readonly provenance: Provenance;
  /** Metres per model length unit, m/mm (core.mjs MM). */
  readonly mPerMm: number;
  /** Named lengths, mm (core.mjs lines 5 and 6). */
  readonly lengths: Readonly<Record<PawlLengthName, number>>;
  readonly actuators: Readonly<Record<PawlActuatorId, PawlActuator>>;
  readonly joints: readonly PawlJointRow[];
  readonly links: Readonly<Record<PawlLinkKey, PawlLink>>;
  readonly foot: {
    /** Sole length and width, mm (FOOTSIZE). */
    readonly lenMm: number;
    readonly widMm: number;
    /** Sole plate thickness, mm; plate y in the foot frame, mm; heel behind the axis, mm. */
    readonly plateMm: number;
    readonly plateYMm: number;
    readonly heelMm: number;
    /** Ankle block half extents and y, mm. */
    readonly blockHalfMm: V3;
    readonly blockYMm: number;
  };
  readonly world: {
    /** Ground cuboid half extents and centre y, m. */
    readonly groundHalfM: V3;
    readonly groundYM: number;
    /** Spawn lift of every body, m. */
    readonly spawnM: number;
    /** Linear and angular body damping, 1/s. */
    readonly linearDamping: number;
    readonly angularDamping: number;
    readonly groups: Readonly<Record<"ground" | "legL" | "legR" | "body", PawlGroup>>;
  };
  readonly contact: {
    /** Friction of ground and sole, and of every other collider, ratio; restitution, ratio. */
    readonly soleFriction: number;
    readonly linkFriction: number;
    readonly restitution: number;
  };
  readonly ik: {
    /** Reach clamp of the 2R leg, ratio of the summed segments. */
    readonly reachLo: number;
    readonly reachHi: number;
  };
  readonly stance: {
    /** Hip roll axis height ceiling, m; the IK locked-knee singularity sits above it. */
    readonly maxM: number;
    /** Ankle pitch stop that sets the stance floor, deg. */
    readonly ankleStopDeg: number;
  };
  readonly squat: {
    /** Squat depth amplitude, m; squat period, s. */
    readonly ampM: number;
    readonly periodS: number;
  };
  readonly gaitShape: {
    /** Sway phase offset, ratio of a cycle; dwell below which sway is a plain sine, ratio. */
    readonly swayPhase: number;
    readonly dwellMin: number;
    /** Arm counter swing amplitude, rad; shoulder roll hold, rad. */
    readonly armSwingRad: number;
    readonly shoRollRad: number;
  };
  readonly servo: {
    /** Ankle bias clamp, rad. */
    readonly biasClampRad: number;
    /** Damping ratio of the PD servo, ratio. */
    readonly dampingRatio: number;
    /** Output-side inertia added to the reflected rotor, kg m2. */
    readonly outputKgM2: number;
  };
  readonly gait: Readonly<PawlGait>;
}

export interface PawlJoint {
  readonly id: string;
  readonly side: number;
  readonly k: PawlJointKey;
  readonly hint: string;
  readonly parent: RigidBody;
  readonly child: RigidBody;
  readonly spec: PawlJointRow;
  readonly axis: { readonly x: number; readonly y: number; readonly z: number };
  readonly act: { readonly tau: number; readonly wmax: number; readonly Jr: number };
  /** Limits, rad. */
  readonly lim: readonly [number, number];
  readonly Jeff: number;
  cmd: number;
  ang: number;
  rate: number;
  tau: number;
  sat: number;
  aw: { readonly x: number; readonly y: number; readonly z: number };
}

export interface PawlRig {
  readonly bodies: Readonly<Record<string, RigidBody>>;
  readonly J: readonly PawlJoint[];
  readonly joints: readonly ImpulseJoint[];
}

interface Q { readonly w: number; readonly x: number; readonly y: number; readonly z: number }
interface V { readonly x: number; readonly y: number; readonly z: number }

export const qMul = (a: Q, b: Q): Q => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z, x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});
export const qCon = (a: Q): Q => ({ w: a.w, x: -a.x, y: -a.y, z: -a.z });
export const qRot = (q: Q, v: V): V => {
  const t = { x: 2 * (q.y * v.z - q.z * v.y), y: 2 * (q.z * v.x - q.x * v.z), z: 2 * (q.x * v.y - q.y * v.x) };
  return { x: v.x + q.w * t.x + q.y * t.z - q.z * t.y, y: v.y + q.w * t.y + q.z * t.x - q.x * t.z, z: v.z + q.w * t.z + q.x * t.y - q.y * t.x };
};
export const cl = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

function len(m: PawlModel, r: PawlLengthRef): number {
  return m.lengths[r.ref] + (r.plus ?? 0);
}

function sided(v: V3, which: readonly (0 | 1 | 2)[], s: number): V3 {
  return [which.includes(0) ? v[0] * s : v[0], which.includes(1) ? v[1] * s : v[1], which.includes(2) ? v[2] * s : v[2]];
}

/** (hipRoll - hipPitch) + (ankPitch - ankRoll), mm: the offsets that cancel with the sole level (core.mjs OFF). */
export function offMm(m: PawlModel): number {
  const a = m.lengths;
  return (a.hipRoll - a.hipPitch) + (a.ankPitch - a.ankRoll);
}

/** Stance floor, m: hip height with the ankle pitch on its stop (core.mjs STANCE_MIN). */
export function stanceMinM(m: PawlModel): number {
  const a = m.lengths;
  return (a.ankRoll + offMm(m) + 2 * a.seg * Math.cos(m.stance.ankleStopDeg * Math.PI / 180)) * m.mPerMm;
}

/** Highest hip roll height the straight leg reaches, mm (core.mjs HIP_MAX). */
export function hipMaxMm(m: PawlModel): number {
  return m.lengths.ankRoll + offMm(m) + 2 * m.lengths.seg;
}

export interface LegAngles { hipRoll: number; hipPitch: number; knee: number; ankPitch: number; ankRoll: number }

/** Closed form leg IK; px, py, pz is the ankle roll axis from the hip roll axis, m. */
export function legIK(m: PawlModel, side: number, px: number, py: number, pz: number): LegAngles {
  const MM = m.mPerMm;
  const hipRoll = Math.atan2(px * side, -py);
  const wy = -Math.hypot(px, py);
  const r = -(wy + offMm(m) * MM);
  const a = m.lengths.seg * MM, b = m.lengths.seg * MM;
  const L = cl(Math.hypot(r, pz), m.ik.reachLo * (a + b), m.ik.reachHi * (a + b));
  const knee = Math.PI - Math.acos(cl((a * a + b * b - L * L) / (2 * a * b), -1, 1));
  const hipPitch = Math.atan2(pz, r) + Math.acos(cl((a * a + L * L - b * b) / (2 * a * L), -1, 1));
  return { hipRoll, hipPitch, knee, ankPitch: knee - hipPitch, ankRoll: -hipRoll };
}

export function defaults(m: PawlModel): PawlGait {
  return { ...m.gait };
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

export function swayAt(m: PawlModel, P: PawlGait, p: number): number {
  const s = Math.sin(2 * Math.PI * (p - m.gaitShape.swayPhase)), k = P.dwell;
  return P.A * (k > m.gaitShape.dwellMin ? Math.tanh(k * s) / Math.tanh(k) : s);
}

export interface Attitude { pitch: number; pitchRate: number; roll: number; rollRate: number }

export function attitude(bodies: PawlRig["bodies"]): Attitude {
  const torso = bodies.torso!;
  const q = torso.rotation(), w = torso.angvel();
  const f = qRot(q, { x: 0, y: 0, z: 1 }), u = qRot(q, { x: 0, y: 1, z: 0 });
  return { pitch: -Math.asin(cl(f.y, -1, 1)), pitchRate: w.x, roll: Math.asin(cl(-u.x, -1, 1)), rollRate: w.z };
}

export function footTgt(P: PawlGait, lp: number): { y: number; z: number } {
  const sf = P.sf;
  if (lp < sf) {
    const u = lp / sf;
    return { y: P.H * Math.sin(Math.PI * u), z: -P.S / 2 + P.S * smooth(u) };
  }
  const v = (lp - sf) / (1 - sf);
  return { y: 0, z: P.S / 2 - P.S * v };
}

export function read(j: PawlJoint): void {
  const qp = j.parent.rotation(), qc = j.child.rotation();
  let r = qMul(qCon(qp), qc);
  if (r.w < 0) r = { w: -r.w, x: -r.x, y: -r.y, z: -r.z };
  j.ang = 2 * Math.atan2(r.x * j.axis.x + r.y * j.axis.y + r.z * j.axis.z, r.w);
  const wp = j.parent.angvel(), wc = j.child.angvel();
  const aw = qRot(qp, j.axis);
  j.aw = aw;
  j.rate = (wc.x - wp.x) * aw.x + (wc.y - wp.y) * aw.y + (wc.z - wp.z) * aw.z;
}

/**
 * Joint targets, rad. The ankle strategy biases ankle torque from the IMU
 * attitude on planted feet: pitch the same on both legs, roll times side.
 */
export function targets(m: PawlModel, P: PawlGait, bodies: PawlRig["bodies"], poseT?: Readonly<Record<string, number>>): Record<string, number> {
  const MM = m.mPerMm;
  const o: Record<string, number> = {};
  if (P.mode === "pose") {
    for (const side of [1, -1]) {
      const pf = side > 0 ? "L" : "R";
      for (const js of m.joints) o[`${pf}.${js.k}`] = poseT?.[`${pf}.${js.k}`] || 0;
    }
    return o;
  }
  let hip = P.hgt;
  if (P.mode === "squat") hip -= m.squat.ampM * (1 - Math.cos(2 * Math.PI * P.t / m.squat.periodS));
  // clamp last, or the squat dives out of the stance band
  hip = cl(hip, stanceMinM(m), m.stance.maxM);
  const sway = P.mode === "walk" ? swayAt(m, P, P.phase) : 0;
  let bp = 0, br = 0;
  if (P.imu && !P.hoist) {
    const A = attitude(bodies), c = m.servo.biasClampRad;
    bp = cl(-(P.kp * A.pitch + P.kd * A.pitchRate), -c, c);
    br = cl(P.kr * A.roll + P.kdr * A.rollRate, -c, c);
  }
  for (const side of [1, -1]) {
    const pf = side > 0 ? "L" : "R";
    const ft = P.mode === "walk" ? footTgt(P, (P.phase + (side > 0 ? 0 : 0.5)) % 1) : { y: 0, z: 0 };
    const py = -(hip - m.lengths.ankRoll * MM) + ft.y;
    const q = legIK(m, side, -sway, py, ft.z);
    const planted = P.mode !== "walk" || ((P.phase + (side > 0 ? 0 : 0.5)) % 1) >= P.sf;
    o[`${pf}.hipRoll`] = q.hipRoll;
    o[`${pf}.hipPitch`] = q.hipPitch;
    o[`${pf}.knee`] = q.knee;
    o[`${pf}.ankPitch`] = q.ankPitch + (planted ? bp : 0);
    o[`${pf}.ankRoll`] = q.ankRoll + (planted ? side * br : 0);
    const other = (P.phase + (side > 0 ? 0.5 : 0)) % 1;
    o[`${pf}.shoPitch`] = P.mode === "walk" ? m.gaitShape.armSwingRad * Math.sin(2 * Math.PI * other) : 0;
    o[`${pf}.shoRoll`] = m.gaitShape.shoRollRad;
  }
  return o;
}

/** PD servo with slew and torque ceilings, applied as equal and opposite torque impulses. */
export function control(m: PawlModel, P: PawlGait, rig: PawlRig, dt: number, poseT?: Readonly<Record<string, number>>): void {
  const tg = targets(m, P, rig.bodies, poseT), wn = 2 * Math.PI * P.bw;
  for (const j of rig.J) {
    read(j);
    const want = cl(tg[j.id] ?? 0, j.lim[0], j.lim[1]);
    const ms = j.act.wmax * dt;
    j.cmd += cl(want - j.cmd, -ms, ms);
    const Kp = j.Jeff * wn * wn, Kd = 2 * m.servo.dampingRatio * wn * j.Jeff, tmax = j.act.tau * P.ts;
    const tau = cl(Kp * (j.cmd - j.ang) - Kd * j.rate, -tmax, tmax);
    j.tau = tau;
    j.sat = Math.abs(tau) / tmax;
    const i = tau * dt, a = j.aw;
    j.child.applyTorqueImpulse({ x: a.x * i, y: a.y * i, z: a.z * i }, true);
    j.parent.applyTorqueImpulse({ x: -a.x * i, y: -a.y * i, z: -a.z * i }, true);
  }
}

function actuator(a: PawlActuator): { tau: number; wmax: number; Jr: number } {
  return { tau: a.tauNm, wmax: a.wmaxDegS * Math.PI / 180, Jr: a.rotorKgM2 * a.ratio * a.ratio };
}

const group = (g: PawlGroup): number => (g.member << 16) | g.filter;

/**
 * Builds the robot into a world the caller owns (withWorld frees it): the
 * ground, fifteen links with box colliders and fourteen limited revolutes,
 * in the order core.mjs makeWorld creates them, since creation order is
 * part of the Rapier state.
 */
export function buildPawl(R: Rapier, world: World, m: PawlModel): PawlRig {
  const MM = m.mPerMm, w0 = m.world, c = m.contact;
  const GRP = { ground: group(w0.groups.ground), legL: group(w0.groups.legL), legR: group(w0.groups.legR), body: group(w0.groups.body) };
  const bodies: Record<string, RigidBody> = {}, J: PawlJoint[] = [], joints: ImpulseJoint[] = [];
  const SPAWN = w0.spawnM;
  const boxI = (mass: number, x: number, y: number, z: number): V => ({ x: mass * (y * y + z * z) / 12, y: mass * (x * x + z * z) / 12, z: mass * (x * x + y * y) / 12 });
  const gb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, w0.groundYM, 0));
  world.createCollider(R.ColliderDesc.cuboid(w0.groundHalfM[0], w0.groundHalfM[1], w0.groundHalfM[2])
    .setFriction(c.soleFriction).setRestitution(c.restitution).setCollisionGroups(GRP.ground), gb);

  const orgX = (L: PawlLink): number => (L.orgX === 0 ? 0 : m.lengths[L.orgX]);
  function mk(name: string, key: PawlLinkKey, side: number, grp: number): RigidBody {
    const L = m.links[key], mass = L.massG / 1000;
    const [bx, by, bz] = L.boxMm.map((v) => v * MM) as unknown as V3;
    const com = L.comMm.map((v) => v * MM) as unknown as V3;
    const I = boxI(mass, bx, by, bz), Jr = L.driven ? actuator(m.actuators[L.driven]).Jr : 0;
    const bd = R.RigidBodyDesc.dynamic()
      .setTranslation((key === "torso" ? 0 : orgX(L) * side) * MM, m.lengths[L.orgY] * MM + SPAWN, 0 * MM)
      .setLinearDamping(w0.linearDamping).setAngularDamping(w0.angularDamping)
      .setAdditionalMassProperties(mass, { x: com[0], y: com[1], z: com[2] }, { x: I.x + Jr, y: I.y + Jr, z: I.z + Jr }, { x: 0, y: 0, z: 0, w: 1 });
    const b = world.createRigidBody(bd);
    b.userData = { key, name, side };
    if (key === "foot") {
      const f = m.foot;
      world.createCollider(R.ColliderDesc.cuboid(f.widMm * MM / 2, f.plateMm * MM / 2, f.lenMm * MM / 2)
        .setTranslation(0, f.plateYMm * MM, (f.lenMm / 2 - f.heelMm) * MM).setDensity(0).setFriction(c.soleFriction)
        .setRestitution(c.restitution).setCollisionGroups(grp), b);
      world.createCollider(R.ColliderDesc.cuboid(f.blockHalfMm[0] * MM, f.blockHalfMm[1] * MM, f.blockHalfMm[2] * MM)
        .setTranslation(0, f.blockYMm * MM, 0).setDensity(0).setFriction(c.linkFriction)
        .setCollisionGroups(grp), b);
    } else {
      world.createCollider(R.ColliderDesc.cuboid(bx / 2, by / 2, bz / 2)
        .setTranslation(com[0], com[1], com[2]).setDensity(0).setFriction(c.linkFriction)
        .setRestitution(c.restitution).setCollisionGroups(grp), b);
    }
    bodies[name] = b;
    return b;
  }

  mk("torso", "torso", 1, GRP.body);
  for (const side of [1, -1]) {
    const P = side > 0 ? "L" : "R", grp = side > 0 ? GRP.legL : GRP.legR;
    for (const k of ["hipY", "thigh", "shank", "ankP", "foot"] as const) mk(`${P}.${k}`, k, side, grp);
    for (const k of ["shoY", "arm"] as const) mk(`${P}.${k}`, k, side, GRP.body);
    for (const js of m.joints) {
      const pb = bodies[js.par === "torso" ? "torso" : `${P}.${js.par}`]!, cb = bodies[`${P}.${js.chi}`]!;
      const pt = pb.translation(), ct = cb.translation();
      const axis = sided(js.axis, js.axisSide, side);
      const at: V3 = [m.lengths[js.atX] * side, len(m, js.atY), 0];
      const w = { x: at[0] * MM, y: at[1] * MM + SPAWN, z: at[2] * MM };
      const jd = R.JointData.revolute({ x: w.x - pt.x, y: w.y - pt.y, z: w.z - pt.z },
        { x: w.x - ct.x, y: w.y - ct.y, z: w.z - ct.z }, { x: axis[0], y: axis[1], z: axis[2] });
      jd.limitsEnabled = true;
      jd.limits = [js.limDeg[0] * Math.PI / 180, js.limDeg[1] * Math.PI / 180];
      const jj = world.createImpulseJoint(jd, pb, cb, true);
      jj.setContactsEnabled(false);
      joints.push(jj);
      const a = actuator(m.actuators[js.act]);
      J.push({
        id: `${P}.${js.k}`, side, k: js.k, hint: js.hint, parent: pb, child: cb, spec: js,
        axis: { x: axis[0], y: axis[1], z: axis[2] }, act: a,
        lim: [js.limDeg[0] * Math.PI / 180, js.limDeg[1] * Math.PI / 180],
        Jeff: a.Jr + m.servo.outputKgM2, cmd: 0, ang: 0, rate: 0, tau: 0, sat: 0, aw: { x: 0, y: 0, z: 0 },
      });
    }
  }
  return { bodies, J, joints };
}
