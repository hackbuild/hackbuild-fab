// The window feature kind (M06 admission, D-177; mesh owns it, PACKAGES.md):
// an opening cut through the host along the face normal, across the whole
// host both ways, so it opens on both sides. The outline is in face
// coordinates (x along u, y along v = normal x u) and carries the roof shape
// CHK-SHP-03 grades. In a vertical face, an outline that is a rectangle with
// sides along u and v cuts as a box prism, so its floor and roof stay on the
// z the outline names (exactZ); any other outline or face cuts as a sweep of
// the outline along the normal. Cut after union (stage 4), as a pocket.
// Registered for BAIL's buried cord channels (bail.html 1720 to 1789).

import {
  commandError,
  type CheckId, type FeatureKindDef, type FeatureOf, type NonEmpty, type Ring, type SchemaLike, type ShapeDecl, type Vec2, type Vec3,
} from "@hackbuild/spec";
import { faceBasis } from "@hackbuild/geom";
import { rmfFrames } from "../routes/sweep.js";
import { fieldsSchema } from "./pocket.js";

export const WINDOW_KIND_VERSION = "1.0.0";
export const WINDOW_CHECK_IDS: NonEmpty<CheckId> = ["CHK-SHP-03"];
/** The reference this kind names; not built yet (build mode, D-667 defers a reference per new kind to the testing pass). */
export const WINDOW_REFERENCE = "fit/window-channel";
/** How far the cutter runs past the host on each side, mm: a sampling margin so no cut face is coplanar with a host face. */
const PAST_MM = 1;

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2]];

/** Every corner of the host's bounding box, part coordinates, mm. Prism, stack and csg hosts (a difference bounds by its first operand). */
function hostCorners(s: ShapeDecl, path: string): Vec3[] {
  const box = (pts: readonly Vec2[], z: readonly [number, number]): Vec3[] => pts.flatMap(([x, y]): Vec3[] => [[x, y, z[0]], [x, y, z[1]]]);
  switch (s.route) {
    case "prism": return box(s.outline.flat(), s.z);
    case "stack": return s.bands.flatMap((b) => box(b.outline.flat(), b.z));
    case "csg": return (s.op === "difference" ? s.of.slice(0, 1) : s.of).flatMap((o, i) => hostCorners(o, `${path}/of/${i}`));
    default:
      throw commandError({
        code: "E_KERNEL", path, got: s.route, expected: "a prism, stack or csg host",
        hint: "a window cuts through a prism, stack or csg body in this build; declare the host on one of those routes", record: "mesh-kernel",
      });
  }
}

/** The outline's corners when it is a rectangle with sides along x and y, else null. */
function rectOf(outline: Ring): { x0: number; x1: number; y0: number; y1: number } | null {
  if (outline.length !== 4) return null;
  const xs = [...new Set(outline.map((p) => p[0]))], ys = [...new Set(outline.map((p) => p[1]))];
  if (xs.length !== 2 || ys.length !== 2) return null;
  const corners = new Set(outline.map((p) => `${p[0]},${p[1]}`));
  if (corners.size !== 4) return null;
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** The cutter of a window through its host: a box prism for a rectangle in a vertical face, else a sweep along the normal. */
export function windowCutter(f: FeatureOf<"window">, host: ShapeDecl): ShapeDecl {
  const at = `/features/${f.id}`;
  if (f.outline.length < 3) {
    throw commandError({ code: "E_SCHEMA", path: `${at}/outline`, got: f.outline.length, expected: "3 or more points", hint: "give the window a closed outline in face coordinates", record: "mesh-kernel" });
  }
  const b = faceBasis(f.face, `${at}/face`);
  const o = f.face.origin, n = b.normal;
  const ts = hostCorners(host, `${at}/body`).map((c) => dot([c[0] - o[0], c[1] - o[1], c[2] - o[2]], n));
  const t0 = Math.min(...ts) - PAST_MM, t1 = Math.max(...ts) + PAST_MM;
  const rect = rectOf(f.outline);
  if (rect !== null && n[2] === 0 && b.u[2] === 0) {
    // v = normal x u is vertical here, so face y is part z up to its sign
    const zs = [o[2] + rect.y0 * b.v[2], o[2] + rect.y1 * b.v[2]];
    const plan = (x: number, t: number): Vec2 => [o[0] + x * b.u[0] + t * n[0], o[1] + x * b.u[1] + t * n[1]];
    return { route: "prism", outline: [[plan(rect.x0, t0), plan(rect.x1, t0), plan(rect.x1, t1), plan(rect.x0, t1)]], z: [Math.min(...zs), Math.max(...zs)] };
  }
  const path: Vec3[] = [add(o, n, t1), add(o, n, t0)];
  const fr = rmfFrames(path)[0]!;
  const section: Ring = f.outline.map(([x, y]): Vec2 => {
    const w: Vec3 = [x * b.u[0] + y * b.v[0], x * b.u[1] + y * b.v[1], x * b.u[2] + y * b.v[2]];
    return [dot(w, fr.r), dot(w, fr.s)];
  });
  return { route: "sweep", section, path };
}

export const windowKind: FeatureKindDef<"window"> = {
  kind: "window",
  version: WINDOW_KIND_VERSION,
  schema: fieldsSchema("window", ["outline", "face", "roof"]) as SchemaLike<unknown, FeatureOf<"window">>,
  generate(f, ctx) {
    return { preUnionCutters: [], positives: [], postUnionCutters: [windowCutter(f, ctx.body.base)], bodies: [], owns: { faces: [`${f.id}.wall`, `${f.id}.roof`] } };
  },
  checks: WINDOW_CHECK_IDS,
  fit: "none",
  reference: [WINDOW_REFERENCE],
  routes: ["prism", "stack", "csg"],
};
