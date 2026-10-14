// A FaceRef resolved against the faces a draft declares (D-165): the face
// frame's origin moved by uv along u and v (v = normal x u), and u turned
// by rotDeg about the normal. One home for Author.mech and Author.arch
// (spec/build.ts); a FaceFrame passes through unchanged. Trigonometry stays
// out of author.ts, whose ring helpers read the D-175 table only.

import type { FaceDecl, FaceFrame, FaceRef, Vec3 } from "@hackbuild/spec";
import { cross } from "@hackbuild/geom";
import { commandError as cmdError, didYouMean } from "@hackbuild/spec";

export function resolveFace(face: FaceFrame | FaceRef, faces: readonly FaceDecl[], at: string): FaceFrame {
  if (!("ref" in face)) return face;
  const decl = faces.find((f) => f.id === face.ref);
  if (decl === undefined) {
    throw cmdError({
      code: "E_REF", path: at, got: face.ref, expected: "a face id the draft declares", didYouMean: didYouMean(face.ref, faces.map((f) => f.id)),
      hint: "declare the face with k.face and pass the draft, or pass a face frame",
    });
  }
  const { origin: o, normal: n, u } = decl.frame;
  const v: Vec3 = cross(n, u);
  const a = (face.rotDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const [du, dv] = face.uv;
  return {
    origin: [o[0] + du * u[0] + dv * v[0], o[1] + du * u[1] + dv * v[1], o[2] + du * u[2] + dv * v[2]],
    normal: n,
    u: [c * u[0] + s * v[0], c * u[1] + s * v[1], c * u[2] + s * v[2]],
  };
}
