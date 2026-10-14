// snapshotHash: sha256 hex of world.takeSnapshot(), the deterministic Rapier
// state hash (api-library-ai-design.md hash table). It enters
// BuildInputs.engines only once admission.ts admits it (D-051, D-134).

import type { World } from "@dimforge/rapier3d-deterministic-compat";
import { sha256Hex, type Hash } from "@hackbuild/spec";

export function snapshotHash(world: World): Hash {
  return sha256Hex(world.takeSnapshot()) as Hash;
}
