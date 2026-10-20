// The registries a chase's ids resolve against (D-132), from the tier 2
// registry loader; core adds only export.run's exporter list.

import type { ChaseRegistries } from "@hackbuild/chase";
import { chaseRegistries as registriesOf, loadRegistry } from "@hackbuild/registry-loader";
import { EXPORT_KINDS } from "../commands/export-run.js";

/** Registries for packages/chase resolveRefs, from the workspace's check seed. */
export function chaseRegistries(checksSeed: unknown): ChaseRegistries {
  return registriesOf(loadRegistry({ checksSeed, exporters: EXPORT_KINDS }));
}
