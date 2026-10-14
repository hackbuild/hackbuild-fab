// Face-frame placement, one home (D-165): a point (x, y) on a face lands at
// origin + x u + y v with v = normal x u. spec/ids.ts FaceFrame carries u and
// normal without a length rule, so a non-unit u would scale every placement
// by |u|; faceBasis refuses it instead of scaling or normalising, so a
// generator and the check that measures its output read one frame.
//
// Every sum runs origin + x u + y v in that order, so a caller moving an
// inline placement here keeps its floats bit for bit on a unit frame.

import type { ErrorCode, FaceFrame, Vec2, Vec3 } from "@hackbuild/spec";
import { geomError } from "./cs.js";

/** Tolerance on |normal| = 1, |u| = 1 and u . normal = 0, unitless. */
export const FACE_FRAME_TOL = 1e-9;

/** a x b. */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** A face frame proven orthonormal, with v = normal x u. */
export interface FaceBasis {
  readonly origin: Vec3;
  readonly normal: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
}

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

/** Throws E_SCHEMA unless normal and u are unit and u lies in the face; returns the basis with v = normal x u. */
export function faceBasis(face: FaceFrame, path: string): FaceBasis {
  const { origin, normal, u } = face;
  const finite = [...origin, ...normal, ...u].every(Number.isFinite);
  if (!finite || Math.abs(len(normal) - 1) > FACE_FRAME_TOL) {
    throw geomError({
      code: "E_SCHEMA", path: `${path}/normal`, got: normal, expected: `a unit normal, |normal| within ${FACE_FRAME_TOL} of 1`,
      hint: "give the face a unit normal; a face frame is never scaled or normalised on read", record: "kernels/mesh-kernel",
    });
  }
  if (Math.abs(len(u) - 1) > FACE_FRAME_TOL) {
    throw geomError({
      code: "E_SCHEMA", path: `${path}/u`, got: u, expected: `a unit u, |u| within ${FACE_FRAME_TOL} of 1`,
      hint: "give the face a unit u; a longer u would scale every point placed on it", record: "kernels/mesh-kernel",
    });
  }
  if (Math.abs(dot(u, normal)) > FACE_FRAME_TOL) {
    throw geomError({
      code: "E_SCHEMA", path: `${path}/u`, got: u, expected: `u in the face plane, |u . normal| within ${FACE_FRAME_TOL} of 0`,
      hint: "give the face a u perpendicular to its normal", record: "kernels/mesh-kernel",
    });
  }
  return { origin, normal, u, v: cross(normal, u) };
}

/** Face point (x, y) to part xyz: origin + x u + y v. */
export function placeOnFace(b: FaceBasis, [x, y]: Vec2): Vec3 {
  const { origin: o, u, v } = b;
  return [o[0] + x * u[0] + y * v[0], o[1] + x * u[1] + y * v[1], o[2] + x * u[2] + y * v[2]];
}

export interface HorizontalOptions {
  /** Accept normal [0, 0, -1] as well as [0, 0, 1]. Default false. */
  readonly allowDown?: boolean;
  /** Code for a tilted face; an unscaled frame failure is always E_SCHEMA. Default E_KERNEL. */
  readonly code?: ErrorCode;
  /** The caller's hint for a tilted face. */
  readonly hint?: string;
  readonly record?: string;
}

/** A horizontal face: its height and its face-to-plan mapper. */
export interface HorizontalFrame {
  readonly basis: FaceBasis;
  /** Face height, mm. */
  readonly z0: number;
  /** Face point (x, y) to part (x, y). */
  at(p: Vec2): Vec2;
}

/** Throws unless the face is an orthonormal frame with normal [0, 0, 1] (or [0, 0, -1] when allowed) and u in the xy plane. */
export function horizontalFrame(face: FaceFrame, path: string, opts: HorizontalOptions = {}): HorizontalFrame {
  const b = faceBasis(face, path);
  const [nx, ny, nz] = b.normal;
  const up = nz === 1 || (opts.allowDown === true && nz === -1);
  if (nx !== 0 || ny !== 0 || !up || b.u[2] !== 0) {
    throw geomError({
      code: opts.code ?? "E_KERNEL", path, got: b.normal,
      expected: opts.allowDown === true ? "normal [0, 0, 1] or [0, 0, -1] with u in the xy plane" : "normal [0, 0, 1] with u in the xy plane",
      hint: opts.hint ?? "this step reads horizontal faces only; give the region a face frame with normal [0, 0, 1]",
      record: opts.record ?? "kernels/mesh-kernel",
    });
  }
  const [ox, oy, oz] = b.origin;
  const [ux, uy] = b.u;
  const [vx, vy] = b.v;
  return { basis: b, z0: oz, at: ([x, y]) => [ox + x * ux + y * vx, oy + x * uy + y * vy] };
}
