// The registries a chase's ids resolve against (D-132, M10-T02 step 5),
// assembled where they live: checks from the seed and the check modules,
// exporters from export.run's list, the bench page kinds and the hook
// aliases, constraint dims from the collected defs, machines and
// materials from the full profile. packages/chase receives this object
// and never reads a file or a registry of its own.

import { CHECK_ID_ALIASES, CHECK_MODULES, registerChecks } from "@hackbuild/checks";
import type { ChaseRegistries } from "@hackbuild/chase";
import { PAGE_EXPORTS } from "@hackbuild/pipeline";
import { loadProfile } from "@hackbuild/profile";
import { EXPORT_ALIASES } from "@hackbuild/spec";
import { EXPORT_KINDS } from "../commands/export-run.js";
import { loadConstraints } from "../load/constraints.js";

const sorted = (xs: Iterable<string>): string[] => [...new Set(xs)].sort();

/** Registries for packages/chase resolveRefs, from the workspace's check seed. */
export function chaseRegistries(checksSeed: unknown): ChaseRegistries {
  const checks = registerChecks({ seed: checksSeed }, CHECK_MODULES).map((c) => (c.precondition === true ? { id: c.id, precondition: true as const } : { id: c.id }));
  const profile = loadProfile();
  return {
    checks,
    checkAliases: CHECK_ID_ALIASES,
    exporters: sorted([...EXPORT_KINDS, ...PAGE_EXPORTS, ...Object.values(EXPORT_ALIASES)]),
    constraintDims: [...loadConstraints().dims()],
    machines: sorted(profile.machines.map((m) => m.id)),
    materials: sorted(profile.materials.map((m) => m.id)),
  };
}
