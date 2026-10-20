// The registry loader (PLAN.md 4, boundaries.md 2 problem 2): the one place
// that assembles what registryHash and a chase's ids resolve against.
// Constraint defs come from the packages that export `constraintDefs`
// (D-044), checks from the seed and the check modules, exporters from the
// caller's list plus the page kinds and the hook aliases. Tier 2 and
// headless, so `hbf part.build` and a baked bench page load the same
// registry and hash the same constraint versions.

import { CHECK_ID_ALIASES, CHECK_MODULES, claimFnIds, registerChecks, type RegisteredCheck } from "@hackbuild/checks";
import type { ChaseRegistries } from "@hackbuild/chase";
import { constraintDefs as circuit } from "@hackbuild/circuit";
import { constraintDefs as constraints, createRegistry, type ConstraintRegistry } from "@hackbuild/constraints";
import { constraintDefs as mechanisms } from "@hackbuild/mechanisms";
import { constraintDefs as mesh } from "@hackbuild/mesh";
import { PAGE_EXPORTS, type PageFacts } from "@hackbuild/pipeline";
import { constraintDefs as profile, loadProfile } from "@hackbuild/profile";
import { constraintDefs as sim } from "@hackbuild/sim";
import { EXPORT_ALIASES, type ConstraintDef } from "@hackbuild/spec";

// A host global in browsers and node; this tier carries no DOM or node lib.
declare const console: { warn(...args: unknown[]): void };

/**
 * The `constraintDefs` each owning package exports, by package; `constraints`
 * holds the fixture defs until their canon or design package exists,
 * `mechanisms` the canon's (M06). Named imports, so a page bundle keeps
 * only the defs and none of the rest of each package.
 */
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
  for (const [pkg, defs] of Object.entries(SOURCES) as [ConstraintSource, readonly ConstraintDef[]][]) {
    for (const def of defs) out.push({ pkg, def });
  }
  return out;
}

/** A registry holding every collected def; a malformed def is E_SCHEMA at load. */
export function loadConstraints(): ConstraintRegistry {
  return createRegistry(collectConstraintDefs().map((c) => c.def));
}

/** Every collected constraint def, id to version, for registryHash. */
export function constraintVersions(): Record<string, string> {
  return Object.fromEntries(collectConstraintDefs().map((c) => [c.def.id, c.def.version]));
}

/** A registry contribution from outside the workspace packages; none exist in release 1. */
export interface RegistryPlugin {
  readonly name: string;
  readonly constraintDefs?: readonly ConstraintDef[];
  /** Feature kind to version. */
  readonly kinds?: Readonly<Record<string, string>>;
}

export interface LoadRegistryInput {
  /** packages/checks/seed/checks.seed.json as parsed; absent loads no checks. */
  readonly checksSeed?: unknown;
  /** The host's exporter kinds (core: export.run's EXPORT_KINDS); the page kinds and hook aliases join them. */
  readonly exporters?: Iterable<string>;
  readonly plugins?: readonly RegistryPlugin[];
}

/** The ids and versions registryHash covers outside the design's own kinds and checks. */
export interface RegistryVersions {
  readonly constraints: Readonly<Record<string, string>>;
  readonly checks: Readonly<Record<string, string>>;
}

export interface LoadedRegistry {
  readonly constraints: ConstraintRegistry;
  readonly checks: readonly RegisteredCheck[];
  /** Feature kinds the plugins add, kind to version; empty with no plugin. */
  readonly kinds: Readonly<Record<string, string>>;
  /** Exporter kinds and aliases, sorted, unique. */
  readonly exporters: readonly string[];
  versions(): RegistryVersions;
}

const sorted = (xs: Iterable<string>): string[] => [...new Set(xs)].sort();

/** Loads constraints, checks, kinds and exporters once for a host. */
export function loadRegistry(input: LoadRegistryInput = {}): LoadedRegistry {
  const plugins = input.plugins ?? [];
  const defs = [...collectConstraintDefs().map((c) => c.def), ...plugins.flatMap((p) => p.constraintDefs ?? [])];
  const checks = input.checksSeed === undefined ? [] : registerChecks({ seed: input.checksSeed }, CHECK_MODULES);
  const kinds = Object.assign({}, ...plugins.map((p) => p.kinds ?? {})) as Record<string, string>;
  return {
    constraints: createRegistry(defs),
    checks,
    kinds,
    exporters: sorted([...(input.exporters ?? []), ...PAGE_EXPORTS, ...Object.values(EXPORT_ALIASES)]),
    versions: () => ({
      constraints: Object.fromEntries(defs.map((d) => [d.id, d.version])),
      checks: Object.fromEntries(checks.map((c) => [c.id, c.version])),
    }),
  };
}

/** Registries for packages/chase resolveRefs (D-132): the loaded registry plus machines and materials from the full profile and the claim function ids. */
export function chaseRegistries(reg: LoadedRegistry): ChaseRegistries {
  const prof = loadProfile();
  return {
    checks: reg.checks.map((c) => (c.precondition === true ? { id: c.id, precondition: true as const } : { id: c.id })),
    checkAliases: CHECK_ID_ALIASES,
    exporters: reg.exporters,
    constraintDims: [...reg.constraints.dims()],
    machines: sorted(prof.machines.map((m) => m.id)),
    materials: sorted(prof.materials.map((m) => m.id)),
    claimFns: claimFnIds(),
  };
}

/** Constraint ids whose version differs between two maps, sorted; an id on one side only counts. */
export function versionDrift(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): string[] {
  return sorted([...Object.keys(a), ...Object.keys(b)]).filter((id) => a[id] !== b[id]);
}

/**
 * PageFacts with the constraint versions the page loads itself. The baked
 * `constraints` fact stays one release as a cross-check: a drift is logged
 * and the loaded versions win.
 */
export function pageFacts(baked: PageFacts, reg: Pick<LoadedRegistry, "versions"> = loadRegistry()): PageFacts {
  const loaded = reg.versions().constraints;
  const drift = versionDrift(baked.constraints, loaded);
  if (drift.length > 0) console.warn(`registry: page constraint versions differ from the bake for ${drift.join(", ")}; rebake to clear this`);
  return { ...baked, constraints: loaded };
}
