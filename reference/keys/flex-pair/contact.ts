// Pure drive-pad contact function. The bench entry imports this file alone so the
// kernel author surface stays out of the UI bundle; build.ts re-exports it.
import type { ContactFn } from "@hackbuild/spec";

// The drive pad's contact function: a held key closes its contact. One
// function for the pad, the 3D pose, the readout and BENCH.drive (G-20).
export const contact: ContactFn = (metrics, target, stimulus) => {
  const travel = metrics.find((m) => m.id === `keys.${target}.travel`);
  const held = stimulus === true;
  return {
    closed: held && travel ? [`contact.key${target}`] : [],
    pose: { travelMm: held && typeof travel?.value === "number" ? travel.value : 0 },
  };
};
