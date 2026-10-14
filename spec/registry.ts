// spec/registry.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the parts that table names, and
 * the rest stays draft until the milestone it names.
 */
// Eleven registries, one entry format. Every extension is a registry
// entry. Also BuildInputs, the fingerprint of every input to a build.
// Version 4, 2026-10-04. Carries D-036, D-041, D-044, D-051, D-052, D-056,
// D-057, D-095, D-109, D-126, D-134, D-159, D-161, D-174.

import type { Hash, KernelId, Process, Spdx } from "./ids";
import type { AnyFeatureKindDef, FeatureKindDef } from "./feature-kinds";
import type { FeatureKind } from "./features";
import type { AnyCheckDef, ArtifactBytes, CheckDef, CheckId, CheckLevel } from "./checks";
import type { ConstraintDef } from "./constraints";
import type { SimModelDef } from "./sim";
import type { MechanismDef, ArchetypeDef } from "./canon";
import type { Capability } from "./capabilities";
import type { Assembly, Part } from "./part-ir";
import type { Provenance } from "./profile";
import type { Material, Machine, FitBand, LossRow, BleedRow, Constant } from "./profile";
import type { SchemaLike } from "./schema";

export const REGISTRY_KINDS = [
  "featureKinds", "checks", "constraints", "exporters", "simModels", "panels",
  "adapters", "profiles", "motion", "mechanisms", "archetypes",
] as const;
export type RegistryKind = (typeof REGISTRY_KINDS)[number];

/**
 * An exporter. fabrication true means the export runs build and checks
 * first, is refused on a fail verdict, and passes the host gate (D-109);
 * png and json are free, 3mf, cut and gerbers are gated everywhere.
 */
export interface ExporterDef {
  /** Exporter id used by ExportDecl.kind, for example "3mf", "dxf", "card". */
  readonly id: string;
  readonly version: string;
  readonly fabrication: boolean;
  readonly processes: readonly Process[];
  readonly mediaType: string;
  /** File extension without the dot. */
  readonly ext: string;
  /** Adapter registry id for the dialect, for example "3mf/bbs-01.10.01.50" (D-159). */
  readonly adapter?: string;
  /**
   * Pure given inputs and sourceDateEpoch: fixed CreationDate and
   * ModificationDate, fixed UTC zip mtimes, no directory entries, sorted
   * entries, fixed deflate level for 3MF (D-052).
   */
  write(input: { readonly ir: Part | Assembly; readonly machine: string; readonly sourceDateEpoch: number }): Promise<ArtifactBytes>;
}

/** A slicer or machine dialect adapter (3MF targets bbs, prusa, core; D-159). */
export interface AdapterDef {
  /** Adapter id, for example "3mf/bbs-01.10.01.50". */
  readonly id: string;
  readonly version: string;
  readonly target: string;
  readonly exporter: string;
}

/** A rail panel. Panels declare the capabilities they require (D-161). */
export interface PanelDef {
  /** Panel id used in RailStep.panels (spec/bench.ts), for example "fits", "nets", "notes". */
  readonly id: string;
  readonly version: string;
  readonly requires: readonly Capability[];
  /** Vue component name in ui; the registry entry holds the name only, below tier 3. */
  readonly component: string;
}

/** A profile data pack: committed rows with provenance. */
export interface ProfilePackDef {
  readonly id: string;
  readonly version: string;
  readonly materials: readonly Material[];
  readonly machines: readonly Machine[];
  readonly fits: readonly FitBand[];
  readonly loss: readonly LossRow[];
  readonly bleed: readonly BleedRow[];
  readonly constants: readonly Constant[];
}

/** A motion program or planner (D-139). */
export interface MotionDef<P = unknown> {
  readonly id: string;
  readonly version: string;
  readonly space: "step" | "mm";
  readonly params: SchemaLike<unknown, P>;
}

/** Definition type per registry kind. */
export interface RegistryDefs {
  readonly featureKinds: AnyFeatureKindDef;
  readonly checks: AnyCheckDef;
  readonly constraints: ConstraintDef;
  readonly exporters: ExporterDef;
  readonly simModels: SimModelDef;
  readonly panels: PanelDef;
  readonly adapters: AdapterDef;
  readonly profiles: ProfilePackDef;
  readonly motion: MotionDef;
  readonly mechanisms: MechanismDef;
  readonly archetypes: ArchetypeDef;
}

export type DefFor<K extends RegistryKind> = RegistryDefs[K];

/**
 * The manifest of a package that registers entries. Generated from the
 * package's registrations at build time, never written by hand (D-010).
 */
export interface Manifest {
  /** Package name, for example "@hackbuild/checks". */
  readonly name: string;
  readonly registry: RegistryKind;
  /**
   * Semver; equals the @hackbuild/kernel version, since every workspace
   * package is private and versions with the kernel (D-036).
   */
  readonly version: string;
  /** Ids this package registers. */
  readonly provides: readonly string[];
  readonly requires?: Partial<Readonly<Record<RegistryKind, readonly string[]>>>;
  readonly kernels?: readonly KernelId[];
  readonly license: Spdx;
  readonly provenance?: Provenance;
}

/** One registered entry. */
export interface RegistryEntry<K extends RegistryKind> {
  readonly kind: K;
  readonly id: string;
  /**
   * Semver per entry, read outside the repo through CheckResult.version,
   * exported reports and reference goldens (D-064). Major when a verdict
   * can flip on the same Part IR. The CI parity job fails when a golden
   * report changes and this version did not.
   */
  readonly version: string;
  readonly def: DefFor<K>;
  readonly manifest: Manifest;
}

/**
 * Read access to all registries. A switch on kind outside a registry is a bug.
 * Kernels and check runners dispatch through featureKind, checksFor and check,
 * never get("featureKinds") or get("checks"): those return the unions
 * AnyFeatureKindDef and AnyCheckDef, whose generate() and run() parameters
 * reduce to never. get and list stay for hash(), manifests and tooling.
 */
export interface Registry {
  get<K extends RegistryKind>(kind: K, id: string): RegistryEntry<K> | undefined;
  list<K extends RegistryKind>(kind: K): readonly RegistryEntry<K>[];
  /** Typed lookup; K correlates the key with the def, so generate(f) needs no cast at the call site. The one correlated cast lives in core/src/registry.ts. */
  featureKind<K extends FeatureKind>(kind: K): FeatureKindDef<K> | undefined;
  /** Checks whose appliesTo.level is L, in registration order. */
  checksFor<L extends CheckLevel>(level: L): readonly CheckDef<L>[];
  /** Lookup by id for FeatureKindDef.checks; the runner compares appliesTo.level with target.level before run(). */
  check(id: CheckId): CheckDef | undefined;
  /**
   * sha256 over resolved (kind, id, version) triples, sorted. A git tree
   * hash is not used: the file:// bake has no git, and a tree hash would
   * move every build hash on an unrelated edit.
   */
  hash(): Hash;
}

/**
 * Build hash inputs (D-051), hashed as RFC 8785 canonical JSON. Two builds
 * with one hash are the same build. sim snapshot hashes join only after
 * D-134 measures Rapier speed.
 */
export interface BuildInputs {
  /**
   * Canonical chase (meta, materials, params, presets, build, checks,
   * expect, exports, assertions, applied, stack, motion, items) plus the
   * source bytes of build.ts and its relative imports, each named by its
   * forward-slash path relative to the design directory and sorted by it,
   * so moving or renaming a design keeps its defHash (ARCHITECTURE.md 8,
   * D-178). bench.ts is outside it, so a layout edit moves no build hash,
   * export approval or E_REPEAT key (D-174).
   */
  readonly defHash: Hash;
  /** Canonical params after deep normalise against defaults. */
  readonly paramsHash: Hash;
  /** Canonical profile rows the build read (ProfileLookup.reads). */
  readonly profileHash: Hash;
  /** Resolved versions of feature kinds, checks, constraints, exporters. */
  readonly registryHash: Hash;
  /** @hackbuild/kernel version, semver. */
  readonly kernelVersion: string;
  /** Engine versions; manifold-3d 3.5.0 is the first with cross-platform determinism (D-056). */
  readonly engines: { readonly manifold: string; readonly rapier?: string; readonly ngspice?: string };
  /** Exporter dialect, for example "3mf/bbs-01.10.01.50". */
  readonly adapter: string;
  /** Seed for stochastic steps (nesting, trials), integer. */
  readonly seed: number;
  /** Seconds since the Unix epoch, injected into every writer; never Date.now(). */
  readonly sourceDateEpoch: number;
  /** SPDX licence per kernel and dependency the build used (D-041). */
  readonly licences: Readonly<Record<string, Spdx>>;
}
