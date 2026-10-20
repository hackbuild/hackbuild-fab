// The canon registries as core runs them (M06): the archetype registry and
// the solvers its tier-1 package may not import, registered here at load
// by inversion (D-044). The solvers live in packages/pipeline/src/solvers.ts
// so a baked bench page registers the same ones (createPageBuild).

import { archetypes } from "@hackbuild/archetypes";
import { registerSolvers, simClickCurve } from "@hackbuild/pipeline";

registerSolvers();

export { archetypes, simClickCurve };
