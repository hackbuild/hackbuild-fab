// SLUG vend (M07-T11 step 3). The page commits targetSteps = motorSteps +
// STEPS_VEND, a fractional 4075.7728 half steps (fab-knowledge:originals/slug/files/
// slug.html lines 224 to 226 and 965 to 969); a stepper takes whole steps,
// so a fixed 4076 per vend drifts 227.2 half steps per 1000 vends and a
// fixed 4075 drifts 772.8 (computed). Here the rotor axis target after vend
// k is round(k x halfStepsPerRev) and each vend commands the difference, so
// the residual carries and the error never reaches half a step. The pinion
// to drum ratio is slug.scad RATIO = gz_rot / gz_pin (lines 35 to 39), one
// motor revolution per vend (BUILD.md line 169).
//
// Firmware parity is not run: no SLUG firmware was harvested
// (benches-robots-b.md gaps), so nothing compares these commands with a
// device.

import { commandError, type MotionOp, type MotionProgram, type ProfileLookup, type StateVar } from "@hackbuild/spec";
import { readScadParams } from "../kinematics/ogee.js";
import type { MachineModel } from "../runner.js";

export interface SlugDrive {
  /** 28BYJ-48 half steps per output revolution, profile constant 28byj48.halfStepsPerRev. */
  readonly halfStepsPerRev: number;
  /** Step rate, half steps/s, profile constant slug.vendRate. */
  readonly rate: number;
  /** Motor turns per drum turn, slug.scad RATIO = gz_rot / gz_pin. */
  readonly ratio: number;
}

/** The drive from the profile (half steps per revolution, step rate) and the gear train of slug.scad (lines 34 to 39). */
export function slugDrive(profile: Pick<ProfileLookup, "constant">, slugScad: string): SlugDrive {
  const ratio = readScadParams(slugScad).get("RATIO");
  if (ratio === undefined) {
    throw commandError({ code: "E_REF", path: "/scad/RATIO", got: null, expected: "RATIO = gz_rot/gz_pin", hint: "slug.scad line 39 defines RATIO; check packages/motion/inputs/slug/slug.scad against its stored-inputs.json sha256", record: "motion-latch" });
  }
  return { halfStepsPerRev: profile.constant("28byj48.halfStepsPerRev").value, rate: profile.constant("slug.vendRate").value, ratio };
}

export const SLUG_NOT_RUN = ["firmware parity: no SLUG firmware was harvested (benches-robots-b.md gaps)"] as const;

/** The rotor axis target after vend k, half steps. */
export const vendTarget = (d: SlugDrive, k: number): number => Math.round(k * d.halfStepsPerRev);

/** Rotor degrees for an axis position in half steps: one motor turn is 360 / RATIO of drum. */
export const rotorDeg = (d: SlugDrive, steps: number): number => (steps * (360 / d.ratio)) / d.halfStepsPerRev;

/** slug.vend(k): vends 1 to k from rest, each the difference of two targets, with a commit after each. */
export function slugVendProgram(d: SlugDrive, k: number): MotionProgram {
  if (!Number.isInteger(k) || k < 0) {
    throw commandError({ code: "E_SCHEMA", path: "/args/k", got: String(k), expected: "a whole number of vends, 0 or more", hint: "pass --k as a count", record: "motion-latch" });
  }
  const ops: MotionOp[] = [];
  for (let v = 1; v <= k; v += 1) {
    ops.push({ op: "steps", axis: "rotor", halfSteps: vendTarget(d, v) - vendTarget(d, v - 1), rate: d.rate });
    ops.push({ op: "commit" });
  }
  return { id: "slug.vend", machine: "slug", args: { k }, ops };
}

/** The SLUG rotor as a runner machine: one axis in half steps; a commit records it. */
export const SLUG_MACHINE: MachineModel<{ readonly rotor: number }> = {
  machine: "slug",
  init: () => ({ rotor: 0 }),
  get(s, v: StateVar) {
    if (v !== "rotor") throw commandError({ code: "E_REF", path: "/ops/axis", got: v, expected: "rotor", hint: "the SLUG drive has one axis, rotor", record: "motion-latch" });
    return s.rotor;
  },
  put(s, v, value) {
    if (v !== "rotor") throw commandError({ code: "E_REF", path: "/ops/axis", got: v, expected: "rotor", hint: "the SLUG drive has one axis, rotor", record: "motion-latch" });
    return { ...s, rotor: value };
  },
  commit: (s) => s,
  view: (s) => ({ rotor: s.rotor }),
};
