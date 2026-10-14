// CHK-ASM-02, every part can reach its position past parts installed
// before it (OGEE R16-P 2026-08: a fused rod and cap made the face
// unassemblable; BUCK 2026-10-06 sweeps each pocket along its insertion
// path and checks intersection volume at sampled travel, engine.js lines
// 352 to 364 and 824 to 856). Instances install in the order the assembly
// lists them. For each one after the first, the check voxelizes it and
// every instance before it in world pose and asks whether it slides in
// from infinity along one of the six axes without entering an installed
// cell. Straight-line insertion only: a part that needs a turn or a path
// reports no free axis, which BUCK's swept path would settle (card defect
// M04-T01).

import type { Assembly, CheckCtx, Finding } from "@hackbuild/spec";
import type { MeshData } from "@hackbuild/mesh";
import { defineCheck } from "../../registry.js";
import { boundsOf, placed } from "../../solid/mesh.js";
import { freeDirections, occupancy, voxelGrid } from "../../solid/voxel.js";
import { bodyMeshes, boolFinding, cellFor, isReason, skip } from "../common.js";

function placedInstances(a: Assembly, ctx: CheckCtx): { readonly id: string; readonly meshes: readonly MeshData[] }[] | { readonly reason: string } {
  const out: { id: string; meshes: readonly MeshData[] }[] = [];
  for (const inst of a.instances) {
    const part = a.parts.find((p) => p.id === inst.part);
    if (part === undefined) return { reason: `instance ${inst.id} names part ${inst.part}, which the assembly does not hold` };
    const got = bodyMeshes(part, ctx);
    if (isReason(got)) return got;
    out.push({ id: inst.id, meshes: got.meshes.map((m) => placed(m, inst.pose)) });
  }
  return out;
}

export const check = defineCheck({
  id: "CHK-ASM-02",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const at = { level: "assembly" as const, assembly: t.assembly.id };
    const placedAll = placedInstances(t.assembly, ctx);
    if (isReason(placedAll)) return [skip(at, "not run", placedAll.reason)];
    if (placedAll.length < 2) return [skip(at, "not run", `assembly ${t.assembly.id} has fewer than two instances; nothing installs past another`)];
    const box = boundsOf(placedAll.flatMap((p) => p.meshes));
    const v = voxelGrid(box, cellFor(Math.max(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2])));
    const occ = placedAll.map((p) => occupancy(p.meshes, v));
    const installed = occ[0]!.slice();
    const out: Finding[] = [];
    placedAll.forEach((p, n) => {
      if (n === 0) return;
      const free = freeDirections(occ[n]!, installed, v);
      out.push(boolFinding({ level: "assembly", assembly: t.assembly.id, part: p.id }, free.length > 0,
        `instance ${p.id} installs after ${n} instance${n === 1 ? "" : "s"}; it must slide in from outside along a free axis`,
        { freeAxes: free.length > 0 ? free.join(" ") : "none", order: n, gridMm: v.g.h }));
      const cur = occ[n]!;
      for (let c = 0; c < installed.length; c++) if (cur[c] === 1) installed[c] = 1;
    });
    return out;
  },
});
