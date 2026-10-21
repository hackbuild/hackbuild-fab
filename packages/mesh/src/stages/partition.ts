// Stage 5 (D-047): partition by role priority so no two bodies overlap.

import type { Manifold } from "manifold-3d";
import { type BodyRole, PARTITION_PRIORITY, type Vec3 } from "@hackbuild/spec";
import { GRID } from "@hackbuild/geom";
import { unionReport } from "../union.js";
import type { Scope } from "../wasm.js";
import type { Working } from "./cut.js";

export const priorityOf = (role: BodyRole): number => {
  const i = (PARTITION_PRIORITY as readonly BodyRole[]).indexOf(role);
  return i < 0 ? PARTITION_PRIORITY.length - 1 : i;
};

/** Volume below which a partition overlap is a touch, mm3 (computed: one grid step cubed). */
const TOUCH_VOLUME = GRID ** 3;

function boxesOverlap(a: readonly [Vec3, Vec3], b: readonly [Vec3, Vec3]): boolean {
  for (let k = 0; k < 3; k++) if (a[1][k]! <= b[0][k]! || b[1][k]! <= a[0][k]!) return false;
  return true;
}

function bboxOf(solid: Manifold): readonly [Vec3, Vec3] {
  const b = solid.boundingBox();
  return [[b.min[0]!, b.min[1]!, b.min[2]!], [b.max[0]!, b.max[1]!, b.max[2]!]];
}

/**
 * Stage 5: subtract every body ahead of this one that overlaps it. Bodies
 * are ordered by role priority, then by declaration order, so of two
 * overlapping bodies of one role the earlier keeps the shared volume and
 * no two exported parts overlap (ARCHITECTURE.md 4, CHK-PRT-03).
 */
export function partition(scope: Scope, work: Working[], higherOf: (w: Working) => Working[]): void {
  for (const w of work) {
    const above = higherOf(w).filter((h) => {
      if (!boxesOverlap(bboxOf(w.solid), bboxOf(h.solid))) return false;
      return scope.own(w.solid.intersect(h.solid)).volume() > TOUCH_VOLUME;
    });
    if (above.length === 0) continue;
    w.solid = scope.own(w.solid.subtract(scope.own(unionReport(above.map((h) => h.solid)).solid)));
    w.touched = true;
  }
}
