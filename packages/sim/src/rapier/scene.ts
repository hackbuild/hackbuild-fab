// Rapier scenes and the snapshot record the determinism job compares
// (M02-T04, D-056). A scene runs one trial at a time inside withWorld and
// calls observe after every world.step(); the record keeps the final
// snapshotHash of each trial and a checkpoint hash every CHECKPOINT_STEPS
// steps, so a cross-architecture difference can be located to the first
// checkpoint that differs. Nothing here enters BuildInputs until
// admission.ts admits sim snapshots (D-051, D-134).

import type { World } from "@dimforge/rapier3d-deterministic-compat";
import { commandError, type Hash } from "@hackbuild/spec";
import { snapshotHash } from "./snapshot.js";
import type { WorldParams } from "./world.js";

/** Steps between checkpoint hashes, count (M02-T04 step 3). */
export const CHECKPOINT_STEPS = 480;

/** Called by a scene after each world.step(); step counts from 1. */
export type StepObserver = (world: World, step: number) => void;

export interface SceneTrial {
  readonly trial: string;
  /** Park-Miller seed the trial draws from (prng.ts). */
  readonly seed: number;
}

export interface TrialOutcome {
  readonly snapshotHash: Hash;
  /** world.step() calls made, count. */
  readonly steps: number;
}

export interface RapierScene {
  readonly id: string;
  /**
   * Package-relative path of the JSON file holding the scene's world rows
   * (WorldParams, profile Constant rows with provenance).
   */
  readonly worldRows: string;
  /** Trials in run order. */
  readonly trials: readonly SceneTrial[];
  run(world: WorldParams, trial: SceneTrial, observe: StepObserver): Promise<TrialOutcome>;
}

export interface TrialRecord {
  readonly snapshotHash: Hash;
  readonly steps: number;
  /** checkpoints[i] is the snapshot hash after step (i + 1) x CHECKPOINT_STEPS. */
  readonly checkpoints: readonly Hash[];
}

/** Record key: scene, trial and seed. */
export function trialKey(scene: string, t: SceneTrial): string {
  return `${scene}/${t.trial}#seed${t.seed}`;
}

/** Runs one trial and hashes the world every `every` steps. */
export async function traceTrial(scene: RapierScene, world: WorldParams, t: SceneTrial, every = CHECKPOINT_STEPS): Promise<TrialRecord> {
  const checkpoints: Hash[] = [];
  let seen = 0;
  const out = await scene.run(world, t, (w, step) => {
    seen += 1;
    if (step !== seen) {
      throw commandError({ code: "E_SCHEMA", path: `/${scene.id}/${t.trial}/step`, got: String(step), expected: String(seen), hint: "a scene calls observe once after every world.step(), counting from 1" });
    }
    if (step % every === 0) checkpoints.push(snapshotHash(w));
  });
  if (out.steps !== seen) {
    throw commandError({ code: "E_SCHEMA", path: `/${scene.id}/${t.trial}/steps`, got: String(seen), expected: String(out.steps), hint: "the scene stepped without calling observe; every step must be observed for the checkpoint trace" });
  }
  return { snapshotHash: out.snapshotHash, steps: out.steps, checkpoints };
}

/** Every trial of every scene, keyed by trialKey, in run order. */
export async function recordScenes(
  scenes: readonly RapierScene[],
  rows: (scene: RapierScene) => WorldParams,
  every = CHECKPOINT_STEPS,
): Promise<Record<string, TrialRecord>> {
  const out: Record<string, TrialRecord> = {};
  for (const s of scenes) {
    const world = rows(s);
    for (const t of s.trials) {
      const key = trialKey(s.id, t);
      if (key in out) {
        throw commandError({ code: "E_SCHEMA", path: `/${s.id}/trials`, got: key, expected: "unique scene, trial and seed", hint: "give each trial its own name or seed" });
      }
      out[key] = await traceTrial(s, world, t, every);
    }
  }
  return out;
}
