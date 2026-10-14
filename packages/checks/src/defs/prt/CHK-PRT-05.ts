// CHK-PRT-05, vertical dims are whole multiples of layer height (LOCKET
// rev C 2026-08: quantization audit against the 2-layer rule). Every
// horizontal face of the part in print pose, bed at z 0, must sit on a layer
// top of the active preset: the first layer, then whole layers above it
// (layer grid offset firstLayer, base layer, D-062 MachineView.layerTop).
// The worst face is reported with its two grid neighbours. A face within
// one 1/1024 mm mesh step (D-054) of a layer top passes.

import { MESH_GRID_PER_MM, type Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { inPrintPose, triNormal } from "../../solid/mesh.js";
import { bodyMeshes, fmt, isReason, partTarget, presetOf, skip, sheetSkip } from "../common.js";

const GRID_MM = 1 / MESH_GRID_PER_MM;

/** A face counts as horizontal when its unit normal has |z| at least this, unitless (within 0.08 deg of vertical). */
const HORIZONTAL_NZ = 1 - 1e-6;

export const check = defineCheck({
  id: "CHK-PRT-05",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const sheet = sheetSkip(t.part, ctx);
    if (sheet !== undefined) return [sheet];
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const p = presetOf(ctx, t.part.machine);
    const { meshes } = inPrintPose(t.part, got.meshes);
    const levels = new Set<number>();
    for (const m of meshes) {
      for (let k = 0; k < m.triangles.length / 3; k++) {
        const { n, area } = triNormal(m, k);
        if (area === 0 || Math.abs(n[2]) / (2 * area) < HORIZONTAL_NZ) continue;
        levels.add(Math.round(m.positions[m.triangles[k * 3]! * 3 + 2]! * MESH_GRID_PER_MM) / MESH_GRID_PER_MM);
      }
    }
    // The bed face at z 0 is the grid origin, not a layer top.
    const tops = [...levels].filter((z) => z > GRID_MM).sort((a, b) => a - b);
    if (tops.length === 0) return [skip(at, 0, `no horizontal face above the bed in part ${t.part.id}`)];
    const graded = tops.map((z) => {
      const below = z < p.firstLayer ? 0 : p.firstLayer + Math.floor((z - p.firstLayer) / p.layer + 1e-9) * p.layer;
      const above = z <= p.firstLayer ? p.firstLayer : p.firstLayer + Math.ceil((z - p.firstLayer) / p.layer - 1e-9) * p.layer;
      return { z, off: Math.min(z - below, above - z), below, above };
    });
    const worst = graded.reduce((m, g) => (g.off > m.off ? g : m));
    return [{
      verdict: worst.off <= GRID_MM ? "pass" : "fail", target: at, measured: Number(worst.z.toFixed(6)),
      legal: { kind: "multipleOf", base: p.layer, offset: p.firstLayer, unit: "mm", nearest: [Number(worst.below.toFixed(6)), Number(worst.above.toFixed(6))] },
      constraint: `layer ${fmt(p.layer)} mm over a first layer of ${fmt(p.firstLayer)} mm, preset ${p.id}; a face between layer tops prints at the nearer one`,
      extra: { faces: tops.length, offMm: Number(worst.off.toFixed(6)) },
    }];
  },
});
