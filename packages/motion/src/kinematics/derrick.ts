// DERRICK R3 forward kinematics and static holding torque (D-139), ported
// from arm_build.py (lineage derrick.build/r3, canonical): the frame
// helpers and mates (lines 17 to 55), hardware() and instances() (lines 68
// to 107) and torque_table() (lines 139 to 163). The viewer's computePose
// (derrick_viewer_tpl.html lines 209 to 238) is the JS twin of the same
// chain; the port follows the Python, which wrote arm_ref.json.
//
// The arm is a list of mating transforms, one per joint module:
//   F0 = I;  F(i+1) = F(i) Rz(q_i) MATES[i];  tool = F4 Rz(q4) T(0, 0, H)
// Every number comes in through DerrickModel, read from the design's own
// modules and meshes (packages/motion/scripts/derrick_fk_golden.py); this
// file types none. Lengths in mm, joint angles in radians, masses in g,
// torque in g mm and kg cm.

import { applyPoint, IDENTITY, mul, rotX, rotZ, trans, type Mat4 } from "./mat4.js";

/** Volume and centre of mass of one library mesh, as arm_build.py builds it. */
export interface DerrickMesh {
  /** mm3 (computed by trimesh from the canonical part generators). */
  readonly volMm3: number;
  /** Centre of mass in the mesh frame, mm. */
  readonly com: readonly number[];
}

/** The numbers arm_build.py reads from arm_parts, pintle_parts and its own globals. */
export interface DerrickModel {
  /** Module bottom face to output face, mm (arm_parts H = D['z_top']). */
  readonly H: number;
  /** Mating face of a hinge interface cheek, mm. */
  readonly IFACE_Y: number;
  /** Height of the interface pad centre on a hinge cheek, mm. */
  readonly ZI: number;
  /** Pad boss height above the plate, mm. */
  readonly PAD_Z: number;
  /** Material depth behind an interface mating face, mm. */
  readonly PAD_TH: number;
  /** Floor and web thickness, mm. */
  readonly FT: number;
  /** Upper arm and forearm reach, rotor face to next joint axis, mm. */
  readonly L1: number;
  readonly L2: number;
  /** Base foot extent, mm. */
  readonly BASE_X0: number;
  readonly BASE_X1: number;
  readonly BASE_Y: number;
  /** Horn screw head shoulder height, mm. */
  readonly hs_step: number;
  /** Cradle stop screw position in the module frame, mm. */
  readonly cradle_screw: readonly number[];
  /** Interface lock screw radius, mm, and angle, rad. */
  readonly lock_r: number;
  readonly lock_a: number;
  /** PETG density, g per mm3. */
  readonly RHO: number;
  /** Servo mass, g. */
  readonly SERVO_G: number;
  /** Servo centre of mass in the module frame, mm (torque_table line 145). */
  readonly servoCom: readonly number[];
  /** Hardware masses instances() carries, g: horn, M2 screws, horn screw, other hardware, the lock M2 x 12 and the base M3 x 12. */
  readonly mass: { readonly horn: number; readonly m2: number; readonly hornscrew: number; readonly hardware: number; readonly m2x12: number; readonly m3x12: number };
  /** Bracket of each joint, J1 to J5. */
  readonly BRACKET: readonly string[];
  /** Joint names, J1 to J5. */
  readonly JOINTS: readonly string[];
  /** Library meshes by key: stator, rotor, retainer, belly, horn, the five brackets, m2x12, m2x8, m3x12, hornscrew. */
  readonly lib: Readonly<Record<string, DerrickMesh>>;
}

/** One placed instance of instances(): name, library key, world matrix, mass in g. */
export interface DerrickInstance {
  readonly name: string;
  readonly key: string;
  readonly m: Mat4;
  readonly mass: number;
}

/** One torque_table row: the joint, the mass it carries (g) and the torque it holds about its axis. */
export interface DerrickTorque {
  readonly joint: string;
  readonly carriedG: number;
  readonly kgcm: number;
  readonly gmm: number;
}

export interface DerrickPose {
  /** World frame of each joint module, J1 to J5. */
  readonly frames: readonly Mat4[];
  readonly tool: Mat4;
  readonly instances: readonly DerrickInstance[];
}

export interface DerrickKinematics {
  readonly mates: readonly Mat4[];
  frames(q: readonly number[]): { readonly frames: readonly Mat4[]; readonly tool: Mat4 };
  pose(q: readonly number[]): DerrickPose;
  torque(q: readonly number[]): DerrickTorque[];
}

/** arm_build.py R(cols, t): the three columns given, then the translation. */
function R(cols: readonly (readonly number[])[], t: readonly number[] = [0, 0, 0]): Mat4 {
  const [a, b, c] = cols as [readonly number[], readonly number[], readonly number[]];
  return [a[0]!, b[0]!, c[0]!, t[0]!, a[1]!, b[1]!, c[1]!, t[1]!, a[2]!, b[2]!, c[2]!, t[2]!, 0, 0, 0, 1];
}

/** The rotation part of m applied to v. */
const rot3 = (m: Mat4, v: readonly number[]): number[] => [0, 1, 2].map((r) => m[r * 4]! * v[0]! + m[r * 4 + 1]! * v[1]! + m[r * 4 + 2]! * v[2]!);

// hinge mating: the new axis comes out perpendicular to the old one; spar
// mating: parallel, the beam reaching out in the plane of rotation.
const HINGE_R = [[0, -1, 0], [0, 0, -1], [1, 0, 0]] as const;
const SPAR_R = [[1, 0, 0], [0, -1, 0], [0, 0, -1]] as const;

/** DERRICK R3 kinematics over a model read from the design. */
export function derrickKinematics(md: DerrickModel): DerrickKinematics {
  const H = md.H;
  const M_hinge = (): Mat4 => {
    const off = rot3(R(HINGE_R), [0.0, md.IFACE_Y, md.ZI]);
    return R(HINGE_R, [0 - off[0]!, 0 - off[1]!, H - off[2]!]);
  };
  const M_spar = (L: number): Mat4 => {
    const off = rot3(R(SPAR_R), [-L, 0.0, md.PAD_Z]);
    return R(SPAR_R, [0 - off[0]!, 0 - off[1]!, H - off[2]!]);
  };
  const MATES = [M_hinge(), M_spar(md.L1), M_spar(md.L2), M_hinge()];

  function frames(q: readonly number[]): { frames: Mat4[]; tool: Mat4 } {
    const fs: Mat4[] = [];
    let f = IDENTITY;
    for (let i = 0; i < 5; i += 1) {
      fs.push(f);
      if (i < 4) f = mul(mul(f, rotZ(q[i]!)), MATES[i]!);
    }
    return { frames: fs, tool: mul(mul(fs[4]!, rotZ(q[4]!)), trans(0, 0, H)) };
  }

  const FLIP = rotX(Math.PI);
  const lock = (): Mat4 => trans(md.lock_r * Math.cos(md.lock_a), md.lock_r * Math.sin(md.lock_a), H + md.PAD_TH);
  const vol = (k: string): number => md.lib[k]!.volMm3;

  function pose(q: readonly number[]): DerrickPose {
    const { frames: fs, tool } = frames(q);
    const out: DerrickInstance[] = [];
    const add = (name: string, key: string, m: Mat4, mass: number): void => {
      out.push({ name, key, m, mass });
    };
    fs.forEach((f, i) => {
      const tag = `J${i + 1}`;
      for (const k of ["stator", "retainer", "belly"]) add(`${tag} ${k}`, k, f, vol(k) * md.RHO);
      add(`${tag} rotor`, "rotor", mul(f, rotZ(q[i]!)), vol("rotor") * md.RHO);
      add(`${tag} servo`, "servo", f, md.SERVO_G);
      add(`${tag} horn`, "horn", mul(f, rotZ(q[i]!)), md.mass.horn);
      const b = md.BRACKET[i]!;
      add(`${tag} ${b}`, b, f, vol(b) * md.RHO);
      // hardware(i): the horn screw spins with the rotor; the cradle stop screw is fixed and flipped.
      const hardware: [string, Mat4][] = [
        ["hornscrew", trans(0, 0, md.hs_step)],
        ["m2x8", mul(trans(md.cradle_screw[0]!, md.cradle_screw[1]!, -md.FT), FLIP)],
      ];
      for (const [hk, hm] of hardware) {
        const fr = hk === "hornscrew" ? mul(f, rotZ(q[i]!)) : f;
        add(`${tag} ${hk}`, hk, mul(fr, hm), hk.startsWith("m2") ? md.mass.m2 : hk === "hornscrew" ? md.mass.hornscrew : md.mass.hardware);
      }
      if (i > 0) add(`J${i} m2x12`, "m2x12", mul(mul(fs[i - 1]!, rotZ(q[i - 1]!)), lock()), md.mass.m2x12);
    });
    add("tool plate", "tool-plate", tool, vol("tool-plate") * md.RHO);
    add("J5 m2x12b", "m2x12", mul(mul(fs[4]!, rotZ(q[4]!)), lock()), md.mass.m2x12);
    for (const [fx, fy] of [
      [md.BASE_X0 + 7, md.BASE_Y - 7], [md.BASE_X0 + 7, -md.BASE_Y + 7],
      [md.BASE_X1 - 7, md.BASE_Y - 7], [md.BASE_X1 - 7, -md.BASE_Y + 7],
    ] as const) add("base m3x12", "m3x12", trans(fx, fy, -md.FT), md.mass.m3x12);
    return { frames: fs, tool, instances: out };
  }

  function torque(q: readonly number[]): DerrickTorque[] {
    const { frames: fs, instances } = pose(q);
    const coms = instances.map((it) => applyPoint(it.m, it.name.includes("servo") ? md.servoCom : md.lib[it.key]!.com));
    const owner = instances.map((it) => (it.name.startsWith("J") ? Number(it.name[1]) : it.name.startsWith("base") ? 0 : 6));
    const rows: DerrickTorque[] = [];
    for (let j = 0; j < 5; j += 1) {
      const f = fs[j]!;
      const axis = [f[2]!, f[6]!, f[10]!], origin = [f[3]!, f[7]!, f[11]!];
      // Everything the joint carries: its own rotor and every part after it.
      let carried = 0;
      const t: [number, number, number] = [0, 0, 0];
      instances.forEach((it, k) => {
        if (!(owner[k]! > j + 1 || (owner[k] === j + 1 && it.name.includes("rotor")))) return;
        carried += it.mass;
        const c = coms[k]!;
        const r: [number, number, number] = [c[0] - origin[0]!, c[1] - origin[1]!, c[2] - origin[2]!];
        // r x g with g = (0, 0, -mass), g mm
        const g: [number, number, number] = [0.0, 0.0, -1.0 * it.mass];
        t[0] += r[1] * g[2] - r[2] * g[1];
        t[1] += r[2] * g[0] - r[0] * g[2];
        t[2] += r[0] * g[1] - r[1] * g[0];
      });
      const tq = t[0] * axis[0]! + t[1] * axis[1]! + t[2] * axis[2]!;
      rows.push({ joint: md.JOINTS[j]!, carriedG: carried, kgcm: Math.abs(tq) / 10000.0, gmm: Math.abs(tq) });
    }
    return rows;
  }

  return { mates: MATES, frames, pose, torque };
}
