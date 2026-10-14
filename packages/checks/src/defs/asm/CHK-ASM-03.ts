// CHK-ASM-03, servo pockets are provably insertable to an open face (PAWL
// mk2, STANCHION 2026-07: a servo pocket sealed on four faces; STANCHION's
// pockets are swept to +Z "so the servo drops in", cad.py yaw_plate). The
// horn feature names its servo but no placement (spec/features.ts
// HornFeature), so the check proves the body that holds it: voxelized, no
// air in it may be sealed off from the outside, since a sealed pocket can
// take no servo. Each cavity is reported with its volume.

import type { Finding, HornFeature } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boundsOf } from "../../solid/mesh.js";
import { occupancy, sealedAir, voxelGrid } from "../../solid/voxel.js";
import { bodyOf, boolFinding, cellFor, featureTarget, skip } from "../common.js";
import { NO_MESH, viewsOf } from "../../views.js";

export const check = defineCheck<"feature", "horn">({
  id: "CHK-ASM-03",
  level: "feature",
  run: (t, ctx): readonly Finding[] => {
    const f: HornFeature = t.feature;
    const at = featureTarget(t.part, f);
    const body = bodyOf(t.part, f);
    const mesh = viewsOf(ctx).mesh?.(body.mesh);
    if (mesh === undefined) return [skip(at, "not run", NO_MESH)];
    const box = boundsOf([mesh]);
    const v = voxelGrid(box, cellFor(Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2])));
    const cavities = sealedAir(occupancy([mesh], v), v);
    const largest = cavities.reduce((m, c) => Math.max(m, c.volumeMm3), 0);
    return [boolFinding(at, cavities.length === 0,
      `the ${f.servo} pocket in body ${body.id} must open to a face; air sealed inside the body takes no servo`,
      { cavities: cavities.length, largestCavityMm3: Number(largest.toFixed(3)), gridMm: v.g.h })];
  },
});
