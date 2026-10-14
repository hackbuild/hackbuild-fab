// Mesh helpers the print and assembly checks share: pose transforms, the
// print pose with the bed at z 0, bounds and surface area. Triangles are
// counter-clockwise from outside (spec/ids.ts MeshHash, packages/mesh).

import type { Part, Pose, Quat, Vec3 } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";

export interface Box3 {
  readonly min: Vec3;
  readonly max: Vec3;
}

/** Rotate v by the unit quaternion q (x y z w). */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  const [vx, vy, vz] = v;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)];
}

export const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

/** The mesh placed by a pose: rotate, then translate. */
export function placed(m: MeshData, pose: Pick<Pose, "pos" | "rot">): MeshData {
  const p = m.positions;
  const out = new Float64Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const r = rotate(pose.rot, [p[i]!, p[i + 1]!, p[i + 2]!]);
    out[i] = r[0] + pose.pos[0];
    out[i + 1] = r[1] + pose.pos[1];
    out[i + 2] = r[2] + pose.pos[2];
  }
  return { positions: out, triangles: m.triangles };
}

export function boundsOf(meshes: readonly MeshData[]): Box3 {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const m of meshes) {
    const p = m.positions;
    for (let i = 0; i < p.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        const v = p[i + k]!;
        if (v < lo[k]!) lo[k] = v;
        if (v > hi[k]!) hi[k] = v;
      }
    }
  }
  return { min: [lo[0]!, lo[1]!, lo[2]!], max: [hi[0]!, hi[1]!, hi[2]!] };
}

const ID_ROT: Quat = [0, 0, 0, 1];

/**
 * Rotation from the mesh frame to the print pose. A part emitted in print
 * pose (FrameDecl.pose print) needs none; a part emitted in assembly pose
 * with a print Pose turns by that pose's rotation (D-063, F4).
 */
export function printRotation(part: Pick<Part, "frame" | "pose">): Quat {
  if (part.frame.pose === "print") return ID_ROT;
  if (part.pose?.frame === "print") return part.pose.rot;
  return ID_ROT;
}

/** Every mesh of the part in print pose, dropped so the lowest point sits on the bed at z 0, and the drop applied, mm. */
export function inPrintPose(part: Pick<Part, "frame" | "pose">, meshes: readonly MeshData[]): { readonly meshes: readonly MeshData[]; readonly rot: Quat; readonly dz: number } {
  const rot = printRotation(part);
  const turned = meshes.map((m) => placed(m, { pos: [0, 0, 0], rot }));
  const dz = -boundsOf(turned).min[2];
  return { meshes: turned.map((m) => placed(m, { pos: [0, 0, dz], rot: ID_ROT })), rot, dz };
}

/** Triangle normal (not normalised) and area, mm2. */
export function triNormal(m: MeshData, t: number): { readonly n: Vec3; readonly area: number } {
  const p = m.positions;
  const a = m.triangles[t * 3]! * 3, b = m.triangles[t * 3 + 1]! * 3, c = m.triangles[t * 3 + 2]! * 3;
  const ux = p[b]! - p[a]!, uy = p[b + 1]! - p[a + 1]!, uz = p[b + 2]! - p[a + 2]!;
  const vx = p[c]! - p[a]!, vy = p[c + 1]! - p[a + 1]!, vz = p[c + 2]! - p[a + 2]!;
  const n: Vec3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  return { n, area: Math.hypot(n[0], n[1], n[2]) / 2 };
}

export function surfaceArea(m: MeshData): number {
  let s = 0;
  for (let t = 0; t < m.triangles.length / 3; t++) s += triNormal(m, t).area;
  return s;
}

export const norm3 = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l === 0 ? [0, 0, 0] : [v[0] / l, v[1] / l, v[2] / l];
};

export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Two unit vectors perpendicular to d and to each other. */
export function basisPerp(d: Vec3): readonly [Vec3, Vec3] {
  const n = norm3(d);
  const ref: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = norm3(cross3(n, ref));
  return [u, cross3(n, u)];
}
