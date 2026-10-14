// CHK-PRT-11, print pose is a reorientation: volume matches assembly twin
// (OGEE R16-P 2026-08: the latch pull print export never cut its mortise;
// four parts shrunk in one pose only). Frame rule F4 (spec/part-ir.ts
// FrameDecl, D-047): a part with a print pose names its assembly twin by
// mesh hash, and the two solids enclose the same volume. A part built in
// one pose only names no twin and the rule does not apply. A rotation moves every
// vertex onto the 1/1024 mm grid by at most sqrt 3 / 2048 mm (D-054), so
// the legal difference is the twin's surface area times that bound
// (computed); a shrink of 0.05 mm all round is orders over it.

import { MESH_GRID_PER_MM, type Finding } from "@hackbuild/spec";
import { signedVolume } from "@hackbuild/mesh";
import { defineCheck } from "../../registry.js";
import { surfaceArea } from "../../solid/mesh.js";
import { viewsOf } from "../../views.js";
import { fmt, intervalFinding, isReason, missing, partTarget, skip, solidMesh } from "../common.js";

/** Largest vertex move of a snap to the mesh grid, mm. */
const SNAP_MOVE_MM = Math.sqrt(3) / (2 * MESH_GRID_PER_MM);

export const check = defineCheck({
  id: "CHK-PRT-11",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const twinHash = t.part.frame.assemblyTwin;
    // A declared print Pose adds the volume parity assertion (spec Pose, D-063); a part built only in its print pose has no twin.
    if (twinHash === undefined) {
      if (t.part.pose?.frame === "print") throw missing(`/parts/${t.part.id}/frame/assemblyTwin`, `part ${t.part.id} declares a print pose and names no assembly twin; declare frame.assemblyTwin (F4)`);
      return [skip(at, "not run", `part ${t.part.id} names no assembly twin: it is built in one pose (${t.part.frame.pose})`)];
    }
    const solid = solidMesh(t.part, ctx);
    if (isReason(solid)) return [skip(at, "not run", solid.reason)];
    const twin = viewsOf(ctx).meshByHash?.(twinHash);
    if (twin === undefined) return [skip(at, "not run", `assembly twin hbf://mesh/${twinHash} not supplied to the registry`)];
    const diff = Math.abs(signedVolume(solid) - signedVolume(twin));
    const tol = surfaceArea(twin) * SNAP_MOVE_MM;
    return [intervalFinding(at, Number(diff.toFixed(6)), 0, Number(tol.toFixed(6)), "mm3",
      `a print pose is a rotation of the assembly twin; volumes agree within its area x the ${fmt(SNAP_MOVE_MM, 6)} mm grid snap bound`,
      { printVolumeMm3: Number(signedVolume(solid).toFixed(3)), twinVolumeMm3: Number(signedVolume(twin).toFixed(3)) })];
  },
});
