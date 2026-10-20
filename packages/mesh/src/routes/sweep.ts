// Sweep mesher (geometry-strategy.md section 6 item 4): one section placed
// at every vertex of an open path on rotation minimizing frames, skinned
// and capped by loft.ts skinRings. The frames are the double reflection
// method of Wang, Juttler, Zheng and Liu, "Computation of rotation
// minimizing frames", ACM TOG 27(1), 2008, algorithm in section 4, with the
// tangent at an interior vertex taken along the bisector of its two
// segments and at an end along its segment. A fixed up vector would turn
// the section about the path on a helix by the integral of torsion; the
// transported frame does not. Pure functions returning MeshData; no route
// registration here.

import type { Ring, Vec3 } from "@hackbuild/spec";
import type { MeshData } from "../hash.js";
import { meshError } from "./prism.js";
import { capTriangles, orientSections, skinRings } from "./loft.js";

/** A frame at a path vertex: unit tangent t, unit normal r and binormal s = t x r. */
export interface Frame {
  readonly t: Vec3;
  readonly r: Vec3;
  readonly s: Vec3;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** a reflected in the plane through the origin normal to v, given c = v . v. */
const reflect = (a: Vec3, v: Vec3, c: number): Vec3 => {
  const k = (2 / c) * dot(v, a);
  return [a[0] - k * v[0], a[1] - k * v[1], a[2] - k * v[2]];
};

/** Unit tangents: segment direction at the ends, the bisector of the two unit segment directions inside. */
function tangents(path: readonly Vec3[]): Vec3[] {
  const seg = path.slice(1).map((p, i) => unit(sub(p, path[i]!)));
  return path.map((_, i) => {
    if (i === 0) return seg[0]!;
    if (i === path.length - 1) return seg[i - 1]!;
    const a = seg[i - 1]!, b = seg[i]!;
    return unit([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  });
}

/**
 * Rotation minimizing frames along the path by double reflection. The first
 * normal is `normal` made perpendicular to the first tangent, or by default
 * the world axis least aligned with it crossed into the tangent plane.
 */
export function rmfFrames(path: readonly Vec3[], normal?: Vec3): Frame[] {
  const t = tangents(path);
  const t0 = t[0]!;
  let r0: Vec3;
  if (normal !== undefined) {
    r0 = sub(normal, scale(t0, dot(normal, t0)));
  } else {
    const ax = Math.abs(t0[0]), ay = Math.abs(t0[1]), az = Math.abs(t0[2]);
    const e: Vec3 = ax <= ay && ax <= az ? [1, 0, 0] : ay <= az ? [0, 1, 0] : [0, 0, 1];
    r0 = cross(cross(t0, e), t0);
  }
  if (!(Math.hypot(r0[0], r0[1], r0[2]) > 1e-9)) {
    throw meshError({ code: "E_SCHEMA", path: "/normal", got: normal, expected: "a vector not parallel to the first path segment", hint: "pick a normal across the path start" });
  }
  r0 = unit(r0);
  const frames: Frame[] = [{ t: t0, r: r0, s: cross(t0, r0) }];
  for (let i = 0; i < path.length - 1; i++) {
    const { t: ti, r: ri } = frames[i]!;
    const t1 = t[i + 1]!;
    const v1 = sub(path[i + 1]!, path[i]!);
    const c1 = dot(v1, v1);
    const rL = reflect(ri, v1, c1);
    const tL = reflect(ti, v1, c1);
    const v2 = sub(t1, tL);
    const c2 = dot(v2, v2);
    const r1 = unit(c2 > 1e-24 ? reflect(rL, v2, c2) : rL);
    frames.push({ t: t1, r: r1, s: cross(t1, r1) });
  }
  return frames;
}

function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/** Options for sweepMesh. */
export interface SweepOptions {
  /** Direction of the section's +u axis at the path start; projected across the first tangent. */
  readonly normal?: Vec3;
}

/**
 * Sweep a closed section (u, v in mm, u along the frame normal r and v along
 * the binormal s) along an open polyline path: the section is placed at
 * every path vertex in the plane normal to that vertex's tangent, joined
 * vertex to vertex, and capped at both ends by earcut. Every vertex is
 * snapped and welded (D-054).
 */
export function sweepMesh(section: Ring, path: readonly Vec3[], opts: SweepOptions = {}): MeshData {
  if (path.length < 2) {
    throw meshError({ code: "E_SCHEMA", path: "/path", got: path.length, expected: "2 or more points", hint: "give the sweep a start and an end point" });
  }
  path.forEach((p, i) => {
    if (i > 0 && !(Math.hypot(...sub(p, path[i - 1]!)) > 1e-9)) {
      throw meshError({ code: "E_SCHEMA", path: `/path/${i}`, got: p, expected: "a point apart from the one before it", hint: "remove the repeated path point" });
    }
  });
  const ring = orientSections([section], "/section")[0]!;
  const n = ring.length;
  const frames = rmfFrames(path, opts.normal);
  const positions = new Float64Array(path.length * n * 3);
  path.forEach((p, j) => {
    const { r, s } = frames[j]!;
    ring.forEach(([u, v], i) => {
      positions.set([p[0] + u * r[0] + v * s[0], p[1] + u * r[1] + v * s[1], p[2] + u * r[2] + v * s[2]], (j * n + i) * 3);
    });
  });
  const cap = capTriangles(ring, "/section");
  return skinRings(positions, n, cap, cap);
}
