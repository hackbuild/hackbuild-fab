// The Rapier scene manifest (M02-T04): every scene the determinism job
// records registers here, in run order. A scene module under scenes/ or
// src/scenes/ whose imports reach Rapier and whose basename is not a
// registered id fails packages/sim/test/determinism.test.ts. Scene modules
// under packages/sim/scenes/ sit outside rootDir and load at run time
// through the caller's load (the SceneDeps.load contract of src/scenes.ts).
//
// drop is the M02-T01 scene: one dynamic cuboid (half extents 0.01 m) from
// y 1 m for 1 s. Those three are scene inputs, not physical constants;
// gravity and timestep come from the world rows file with provenance. Its
// final hash is the committed golden test/goldens/rapier-drop.json.

import { pawlRapierScene, type PawlScene } from "../programs/pawl/suite.js";
import { granularFunnelScene } from "./granular.js";
import type { RapierScene } from "./scene.js";
import { snapshotHash } from "./snapshot.js";
import { withWorld } from "./world.js";

const DROP_HALF_M = 0.01;
const DROP_Y0_M = 1;
const DROP_SECONDS = 1;

export const dropScene: RapierScene = {
  id: "drop",
  worldRows: "test/fixtures/pawl-world.json",
  trials: [{ trial: "cuboid-1s", seed: 1 }],
  run: (params, _trial, observe) =>
    withWorld(params, (world, R) => {
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0, DROP_Y0_M, 0));
      world.createCollider(R.ColliderDesc.cuboid(DROP_HALF_M, DROP_HALF_M, DROP_HALF_M), body);
      const steps = Math.round(DROP_SECONDS / params.timestep.value);
      for (let i = 1; i <= steps; i += 1) {
        world.step();
        observe(world, i);
      }
      return { snapshotHash: snapshotHash(world), steps };
    }),
};

/** A Rapier scene whose data is a module under packages/sim/scenes/. */
export interface RapierSceneModule {
  /** File name under packages/sim/scenes/. */
  readonly file: string;
  scene(module: unknown): RapierScene;
}

/** Scenes defined in this package, in run order; the scene modules run after them. */
export const RAPIER_SCENES: readonly RapierScene[] = [dropScene, granularFunnelScene];

export const RAPIER_SCENE_MODULES: readonly RapierSceneModule[] = [
  { file: "pawl.ts", scene: (m) => pawlRapierScene((m as { readonly PAWL_SCENE: PawlScene }).PAWL_SCENE) },
];

/** Every Rapier scene in run order; load imports a scene module by file name under packages/sim/scenes/. */
export async function rapierScenes(load: (file: string) => Promise<unknown>): Promise<readonly RapierScene[]> {
  const out = [...RAPIER_SCENES];
  for (const m of RAPIER_SCENE_MODULES) out.push(m.scene(await load(m.file)));
  return out;
}
