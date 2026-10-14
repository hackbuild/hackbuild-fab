// Owned Rapier worlds (D-055). A world exists only inside withWorld; it is
// freed in finally whatever fn does, and liveWorlds() counts the worlds not
// yet freed so every suite can assert zero. Gravity and timestep arrive as
// profile constants with provenance; the sim types in no physical number.

import type { World } from "@dimforge/rapier3d-deterministic-compat";
import { commandError, type Constant } from "@hackbuild/spec";
import { initRapier, type Rapier } from "./init.js";

export interface WorldParams {
  /** Gravity magnitude, unit "m/s2", applied along minus Y (Y up, PAWL core.mjs line 114). */
  readonly gravity: Constant;
  /** Fixed step, unit "s". */
  readonly timestep: Constant;
}

let live = 0;

/** Worlds created by withWorld and not yet freed, count. */
export function liveWorlds(): number {
  return live;
}

function positive(c: Constant, unit: string, path: string): number {
  if (c.unit !== unit) {
    throw commandError({ code: "E_SCHEMA", path: `${path}/unit`, got: c.unit, expected: unit, hint: `constant ${c.id} is in ${c.unit}; pass a row in ${unit}` });
  }
  if (!(Number.isFinite(c.value) && c.value > 0)) {
    throw commandError({ code: "E_SCHEMA", path: `${path}/value`, got: String(c.value), expected: "a finite number above 0", hint: `constant ${c.id} must be above 0` });
  }
  return c.value;
}

export async function withWorld<T>(params: WorldParams, fn: (world: World, rapier: Rapier) => T | Promise<T>): Promise<T> {
  const g = positive(params.gravity, "m/s2", "/gravity");
  const dt = positive(params.timestep, "s", "/timestep");
  const R = await initRapier();
  const world = new R.World({ x: 0, y: -g, z: 0 });
  live += 1;
  try {
    world.timestep = dt;
    return await fn(world, R);
  } finally {
    world.free();
    live -= 1;
  }
}
