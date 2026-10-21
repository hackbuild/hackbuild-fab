// Stage 7 (D-047): frame emit, the translation lifted off the vertices.

import type { Vec3 } from "@hackbuild/spec";
import { type MeshData, snap } from "../hash.js";

export function translateMesh(m: MeshData, d: Vec3): MeshData {
  const p = m.positions.slice();
  for (let i = 0; i < p.length; i += 3) {
    p[i] = snap(p[i]! - d[0]);
    p[i + 1] = snap(p[i + 1]! - d[1]);
    p[i + 2] = snap(p[i + 2]! - d[2]);
  }
  return { positions: p, triangles: m.triangles };
}
