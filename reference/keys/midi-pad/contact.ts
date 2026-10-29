// Pure drive-pad contact function. The bench entry imports this file alone so the
// kernel author surface stays out of the UI bundle; build.ts re-exports it.
import type { ContactFn } from "@hackbuild/spec";

export const KEY = "flex-cone-key";

// The drive pad's contact function: a held key closes its contact once it
// travels its gap. One function for the pad, the 3D pose, the readout and
// BENCH.drive (G-20). Target n is key n, archetype instance n - 1.
export const contact: ContactFn = (metrics, target, stimulus) => {
  const travel = metrics.find((m) => m.id === `keys.${target}.travel`);
  const held = stimulus === true;
  return {
    closed: held && travel ? [`${KEY}.${Number(target) - 1}.contact.key`] : [],
    pose: { travelMm: held && typeof travel?.value === "number" ? travel.value : 0 },
  };
};
