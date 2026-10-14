// @hackbuild/sim/rapier: owned Rapier worlds and the snapshot hash. A subpath
// of its own, because the vendor declarations name WebAssembly and fetch
// types that tier 1 to 2 builds do not load; a consumer of this subpath sets
// skipLibCheck, as packages/sim/tsconfig.json does.

export { initRapier, type Rapier } from "./init.js";
export { liveWorlds, withWorld, type WorldParams } from "./world.js";
export { snapshotHash } from "./snapshot.js";
export {
  CHECKPOINT_STEPS, recordScenes, traceTrial, trialKey,
  type RapierScene, type SceneTrial, type StepObserver, type TrialOutcome, type TrialRecord,
} from "./scene.js";
export { RAPIER_SCENES, RAPIER_SCENE_MODULES, dropScene, rapierScenes, type RapierSceneModule } from "./scenes.js";
export {
  GRANULAR_TRIALS, funnelPanels, granularFunnelScene, granularRows, panelCorners, runGranularTrial, spawnLattice, spawnVelocities,
  type GranularOutcome, type GranularRows, type Panel,
} from "./granular.js";
