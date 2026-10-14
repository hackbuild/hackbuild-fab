// core binds packages/motion's kinematics module to sim's place(pose)
// interface (D-139, PACKAGES.md 5.8): sim may not import motion
// (tools/tiers.json), so the sim scenes read every placement through
// SceneDeps.kinematics, and this is the one place the two meet. The OGEE16
// dimensions are read from the legacy params.scad by motion's port of
// kin.load_params.

import { readFileSync } from "node:fs";
import path from "node:path";
import { davitPlacements, ogeeKinematics, readScadParams } from "@hackbuild/motion";
import type { SceneKinematics } from "@hackbuild/sim";

/** The params.scad the OGEE16 kinematics read, from the repository root. */
export const OGEE16_PARAMS = "designs/ogee16/legacy/source/params.scad";

const bound = new Map<string, SceneKinematics>();

/** sim's SceneKinematics over packages/motion, for the repository at workspace; built once per workspace. */
export function sceneKinematics(workspace: string): SceneKinematics {
  const hit = bound.get(workspace);
  if (hit !== undefined) return hit;
  const params = readScadParams(readFileSync(path.join(workspace, OGEE16_PARAMS), "utf8"));
  const ogee = ogeeKinematics(params);
  const k: SceneKinematics = {
    davit: { place: davitPlacements },
    ogee16: { params, place: ogee.place, crank: ogee.crank, crankPhi: ogee.crankPhi, lCrankPhi: ogee.lCrankPhi },
  };
  bound.set(workspace, k);
  return k;
}
