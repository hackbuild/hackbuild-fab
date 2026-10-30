// spec/sim.ts
/**
 * Status: draft until the M01 exit. MILESTONES.md 1.5, D-179.
 * M01 is the first milestone that runs this file.
 * The M01 exit freezes SnapCurve; the rest stays draft until M02.
 */
// What a check may ask the sim for. The sim reports measurements and the
// checks hold the verdicts. Rapier is
// @dimforge/rapier3d-deterministic-compat 0.21.0; sim snapshot hashes enter
// BuildInputs only after M02 measures the 30-trial granular runtime (D-134).
// Multi-trial by default.
// Version 4, 2026-10-04. Carries D-055, D-056, D-071, D-134, D-135, D-136.

import type { Hash, Mm, Vec3 } from "./ids.js";
import type { SchemaLike } from "./schema.js";

/** Closest approach between two bodies over a motion range. */
export interface ClosestApproach {
  /** Smallest gap found, mm; negative means interference depth. */
  readonly mm: Mm;
  /** World point of the closest pair, mm. */
  readonly at: Vec3;
  /** Pose or step label where it occurred. */
  readonly state: string;
}

/**
 * What a sweep reports. V is the clash volume type: SimHandle.sweep is the
 * joint sweep the checks read and always measures a volume, so it keeps
 * the default number; the sim.sweep command also runs pose and prismatic
 * modes, which measure no volume, so its output is SweepResult<number | null>.
 */
export interface SweepResult<V extends number | null = number> {
  readonly sweptHash: Hash;
  /** Poses evaluated, count. */
  readonly poses: number;
  readonly clashes: readonly {
    readonly with: string;
    /** Interference volume, mm3; null means no volume measured (pose and prismatic modes). */
    readonly mm3: V;
    /** True when a calibration mask keyed by mesh hash and pose set excuses it (D-135). */
    readonly masked: boolean;
  }[];
}

export interface TrialResult {
  /** Trials run, count. */
  readonly runs: number;
  /** Trials that met the program's goal, count. */
  readonly passes: number;
  /** Label of the worst trial. */
  readonly worst: string;
  /** Seed of the first trial; trial i uses seed + i (D-136: no unseeded Math.random). */
  readonly seed: number;
  /** Deterministic Rapier state hash after the last trial. */
  readonly snapshotHash: Hash;
  /** Wall time for all trials, ms; one machine's measurement. */
  readonly wallMs: number;
}

/** Click-spring FE curve summary (SNAPFE, pip-controller src/snapfe.js). */
export interface SnapCurve {
  /** Peak force, N. PIP defaults: 2.527 N (computed). */
  readonly peakN: number;
  /** Displacement at peak, mm. PIP defaults: 0.629 mm (computed). */
  readonly peakAtMm: Mm;
  /** Fractional force drop after snap-through, ratio 0 to 1. PIP defaults: 0.765 (computed). */
  readonly drop: number;
  /** Displacement at contact, mm. PIP defaults: 1.369 mm (computed). */
  readonly contactMm: Mm;
  /** Strain at the stop, percent. PIP defaults: 2.31 (computed). */
  readonly eStopPct: number;
  readonly snaps: boolean;
  readonly bistable: boolean;
}

export interface SimHandle {
  closestApproach(a: string, b: string, over: "rest" | "range" | "cycle"): ClosestApproach;
  sweep(part: string, joint: string, steps: number): SweepResult;
  trials(program: string, n: number, seed: number): TrialResult;
  /** FE click-spring curve; inputs in mm and MPa. */
  snap(beam: { /** mm */ readonly l: Mm; /** mm */ readonly t: Mm; /** mm */ readonly w: Mm; /** ratio */ readonly riseQ: number; /** MPa */ readonly modulusMPa: number }): SnapCurve;
}

/** A sim model registry entry (RegistryKind simModels). */
export interface SimModelDef<P = unknown> {
  readonly id: string;
  readonly version: string;
  readonly params: SchemaLike<unknown, P>;
  /** Engine the model runs on. */
  readonly engine: "rapier" | "fe" | "analytic";
  /** Trials run when a command does not say, count. Multi-trial by default. */
  readonly defaultTrials: number;
}
