// CHK-PRT-16, every print fits the machine's build volume in print pose,
// listed before export (COTTER 2026-09: platePlan() lists oversize prints
// apart and the BOM warns on parts too big for the bed,
// sources/latest/cotter-sparger.md lines 267 and 271; KNUCKLE 2026-09 warns
// on bed fit and suggests side tabs). Block and never a precondition: an
// oversize print is correct Part IR that this machine cannot print
// (CHECKS.md 9.2). Measured per axis is the part's extent in print pose;
// legal is 0 to the machine row's envelope on that axis. No single param
// fixes an overshoot, so the finding carries no fix and names the axis,
// the overshoot and the machine.

import type { Finding, Vec3 } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boundsOf, inPrintPose } from "../../solid/mesh.js";
import { bodyMeshes, fmt, intervalFinding, isReason, partTarget, skip } from "../common.js";

const AXES = ["x", "y", "z"] as const;

export const check = defineCheck({
  id: "CHK-PRT-16",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const got = bodyMeshes(t.part, ctx);
    if (isReason(got)) return [skip(at, "not run", got.reason)];
    const machine = ctx.profile.machine(t.part.machine);
    if (!Array.isArray(machine.envelope)) return [skip(at, "not run", `machine ${machine.id} states a sheet, not a build volume`)];
    const env = machine.envelope as Vec3;
    const tier = machine.provenance.tier;
    const box = boundsOf(inPrintPose(t.part, got.meshes).meshes);
    return AXES.map((axis, i) => {
      const extent = Number((box.max[i]! - box.min[i]!).toFixed(3));
      const over = extent - env[i]!;
      return intervalFinding(at, extent, 0, env[i]!, "mm",
        over > 0
          ? `print extent on ${axis} ${fmt(extent)} mm (computed) passes the ${machine.id} build volume ${fmt(env[i]!)} mm (${tier}) by ${fmt(over)} mm; split the part or add side tabs`
          : `print extent on ${axis} fits the ${machine.id} build volume ${fmt(env[i]!)} mm (${tier})`,
        { axis, machine: machine.id, overMm: Number(Math.max(0, over).toFixed(3)) });
    });
  },
});
