// spec/motion.ts
/**
 * Status: draft until the M07 exit. MILESTONES.md 1.5, D-179.
 * M07 is the first milestone that runs this file (packages/motion).
 */
// Motion IR for packages/motion. Angles in degrees, lengths in mm, time in
// s. Added by M07-T02 (docs/plan/milestones/M07-motion-nest.md); D-046
// names no file for these types, so the PR lists this file as a spec change
// for the owner.
// Version 1, 2026-10-08. Carries D-051, D-056, D-139.

import type { Hash } from "./ids.js";

/** A named state variable of a machine, for example "zR[0]" or "rotorSteps". */
export type StateVar = string;

export type MotionOp =
  | {
      readonly op: "set";
      readonly target: StateVar;
      /** New value, in the unit of the state variable. */
      readonly value: number;
    }
  | {
      readonly op: "move";
      readonly target: StateVar;
      /** End value, in the unit of the state variable. */
      readonly to: number;
      readonly profile: "ease" | "trapezoid" | "verbatim";
      /**
       * Duration of the move, s; 0 when absent. The target reaches `to` at
       * the op whatever frames render (M07-T11).
       */
      readonly s?: number;
      /** True when this move starts with the move op before it; the group lasts its longest duration. */
      readonly join?: boolean;
    }
  | { readonly op: "commit" }
  | {
      readonly op: "dwell";
      /** Dwell time, s. */
      readonly s: number;
    }
  | {
      readonly op: "steps";
      readonly axis: string;
      /** Signed step count, half steps. */
      readonly halfSteps: number;
      /** Step rate, half steps/s. */
      readonly rate: number;
    };

export interface MotionProgram {
  readonly id: string;
  readonly machine: string;
  /** Program arguments; the program names each argument's unit, for example k (vend count) or row (index). */
  readonly args: Readonly<Record<string, number>>;
  readonly ops: readonly MotionOp[];
}

export interface MotionRule {
  /** Check id that owns the rule, for example "CHK-MOT-04". */
  readonly check: string;
  readonly enforcedIn: readonly ("sim" | "firmware")[];
}

export interface MotionViolation {
  readonly rule: string;
  /** Index of the op that broke the rule, count from 0. */
  readonly at: number;
  /** Measured value, in the unit of the rule's state variable. */
  readonly measured: number;
  /** Legal range, lower then upper, in the unit of the rule's state variable. */
  readonly legal: readonly [number, number];
}

export interface MotionRunResult {
  readonly program: string;
  /** State after each commit, keyed by state variable, each in its own unit. */
  readonly states: readonly Readonly<Record<StateVar, number>>[];
  readonly violations: readonly MotionViolation[];
  /** sha256 over canonical JSON of the end state (D-051, D-056). */
  readonly endHash: Hash;
}

/** One sample of a planned path. Units follow the planner space. */
export interface PlannedPoint {
  /** Position, steps in step space, mm in mm space. */
  readonly x: number;
  /** Position, steps in step space, mm in mm space. */
  readonly y: number;
  readonly on: boolean;
  /** Planned speed at this point, steps/s in step space, mm/s in mm space. */
  readonly v: number;
}

export interface PlanResult {
  readonly space: "steps" | "mm";
  readonly points: readonly PlannedPoint[];
  /** Planned duration of the whole path, s. */
  readonly durationS: number;
  /** Which ceiling binds the peak segment. */
  readonly binding: "feed" | "slew" | "accel" | "resolution" | "curvature" | "junction" | "floor";
}

/** One sample of a path to plan, in the planner space (steps or mm). */
export interface PathPoint {
  /** Position, steps in step space, mm in mm space. */
  readonly x: number;
  /** Position, steps in step space, mm in mm space. */
  readonly y: number;
  readonly on: boolean;
}

/** DETENT planSpeeds and WASHER planChainPen behind one interface (D-139). */
export interface Planner {
  readonly id: "detent-steps" | "washer-mm";
  plan(path: readonly PathPoint[]): PlanResult;
}

export interface CalibrationReadout {
  readonly kind: "projective" | "bilinear";
  /** Worst corner error after solving, mm. */
  readonly residualMm: number;
  /** Worst round trip over the field grid, mm. */
  readonly roundTripMm: number;
  /** Captured quad aspect over field aspect, ratio. */
  readonly quadAspect: number;
}

/**
 * The latch identity of a displacement coincidence latch (CHK-MOT-05),
 * every figure computed from the machine's kinematics. The half rise is
 * measured, never taken as stroke/2 (M07-T11 step 5).
 */
export interface LatchIdentityReadout {
  readonly machine: string;
  /** Plate top minus lug top at half select, mm. */
  readonly marginMm: number;
  /** Lug bottom minus plate top at full select, mm. */
  readonly overshootMm: number;
  /** Crown rise at full select, mm. */
  readonly fullRiseMm: number;
  /** Crown rise at half select, mm. */
  readonly halfRiseMm: number;
  /** Rise the pin gets climbing its own notch while cammed, mm. */
  readonly camLiftMm: number;
  /** Lug height, ramp included, mm. */
  readonly lugTotMm: number;
  /** Bar stroke, mm. */
  readonly strokeMm: number;
  /** margin + overshoot, mm. */
  readonly lhsMm: number;
  /** (fullRise - halfRise) - camLift - lugTot, mm. */
  readonly rhsMm: number;
}

/**
 * What the motion kernel measured on one machine for the CHK-MOT checks,
 * supplied to CheckCtx.motion the way SimHandle is (M07-T11). The handle
 * reports; the checks hold the verdicts.
 */
export interface MotionHandle {
  readonly machine: string;
  /** CHK-MOT-04: each row or column bar raised alone through a commit, and the cells it latched ("i,j"). */
  halfSelect(): readonly { readonly bar: string; readonly latched: readonly string[] }[];
  /** CHK-MOT-05: the identity's two sides from the kinematics. */
  latchIdentity(): LatchIdentityReadout;
  /** CHK-MOT-06: one program run under each frame schedule, with its end hash. */
  schedules(): readonly { readonly program: string; readonly schedule: string; readonly frames: number; readonly endHash: Hash }[];
}
