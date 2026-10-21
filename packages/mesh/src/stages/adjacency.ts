// Stage 8 (D-047): body pairs that share a coincident face after partition.

import type { Manifold } from "manifold-3d";
import type { BodyAdjacency, BuildWarning } from "@hackbuild/spec";
import { GRID } from "@hackbuild/geom";
import { type MeshData, bounds } from "../hash.js";
import { unionReport } from "../union.js";
import type { Scope } from "../wasm.js";

/** A shared area at most one grid cell squared is float noise of the snap, not a face (D-054). */
export const ADJACENCY_MIN_MM2 = GRID * GRID;

/**
 * Body pairs that share a coincident face after partition (M05-T20 step 1).
 * Stage 5 leaves the bodies disjoint, so the union of a touching pair loses
 * the shared face from both surfaces: area = (A + B - area of the union) / 2.
 * Only pairs whose bounds meet within one grid step are unioned. Rows are in
 * body order and rounded to 1e-6 mm2.
 */
export function bodyAdjacency(
  scope: Scope, solids: readonly Manifold[], meshes: readonly MeshData[], ids: readonly string[], warnings: BuildWarning[],
): BodyAdjacency[] {
  const box = meshes.map((m) => bounds(m));
  const area = solids.map((s) => s.surfaceArea());
  const out: BodyAdjacency[] = [];
  for (let i = 0; i < solids.length; i += 1) {
    for (let j = i + 1; j < solids.length; j += 1) {
      const [loA, hiA] = box[i]!, [loB, hiB] = box[j]!;
      if ([0, 1, 2].some((k) => loA[k]! > hiB[k]! + GRID || loB[k]! > hiA[k]! + GRID)) continue;
      // The one verified union (D-055); a pair it refuses gets no row and says so.
      let joined: Manifold;
      try {
        joined = scope.own(unionReport([solids[i]!, solids[j]!]).solid);
      } catch (e) {
        if ((e as { hbf?: unknown }).hbf === undefined) throw e;
        warnings.push({ code: "ADJACENCY", text: `${ids[i]!} and ${ids[j]!}: the pair union is refused, so no shared face area is recorded (computed)` });
        continue;
      }
      const shared = (area[i]! + area[j]! - joined.surfaceArea()) / 2;
      if (shared > ADJACENCY_MIN_MM2) out.push({ a: ids[i]!, b: ids[j]!, areaMm2: Math.round(shared * 1e6) / 1e6 });
    }
  }
  return out;
}
