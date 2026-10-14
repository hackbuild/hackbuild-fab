// Collects the ConstraintDef entries kernels and canons export and
// registers them into the constraints solver at load (D-044, M01 package
// placement table). Each owning package exports `constraintDefs`, a
// readonly ConstraintDef[] typed against spec, from its index; a package
// that exports none yet contributes nothing. The registry refuses a
// malformed def with E_SCHEMA, so a bad export fails at load.

import type { ConstraintDef } from "@hackbuild/spec";
import * as circuit from "@hackbuild/circuit";
import * as constraints from "@hackbuild/constraints";
import * as mechanisms from "@hackbuild/mechanisms";
import * as mesh from "@hackbuild/mesh";
import * as profile from "@hackbuild/profile";
import * as sim from "@hackbuild/sim";
import { createRegistry, type ConstraintRegistry } from "@hackbuild/constraints";

/** Owning package of each def source; `constraints` holds the fixture defs until their canon or design package exists, `mechanisms` the canon's (M06). */
const SOURCES = { profile, mesh, circuit, sim, constraints, mechanisms } as const;

export type ConstraintSource = keyof typeof SOURCES;

/** One collected def with the package that exported it. */
export interface CollectedDef {
  readonly pkg: ConstraintSource;
  readonly def: ConstraintDef;
}

/** Every def each source package exports as `constraintDefs`, in source order. */
export function collectConstraintDefs(): readonly CollectedDef[] {
  const out: CollectedDef[] = [];
  for (const [pkg, ns] of Object.entries(SOURCES) as [ConstraintSource, object][]) {
    const defs = (ns as Readonly<Record<string, unknown>>)["constraintDefs"];
    if (defs === undefined) continue;
    if (!Array.isArray(defs)) throw new Error(`@hackbuild/${pkg} exports constraintDefs that is not an array`);
    for (const def of defs as readonly ConstraintDef[]) out.push({ pkg, def });
  }
  return out;
}

/** A registry holding every collected def. */
export function loadConstraints(): ConstraintRegistry {
  return createRegistry(collectConstraintDefs().map((c) => c.def));
}
