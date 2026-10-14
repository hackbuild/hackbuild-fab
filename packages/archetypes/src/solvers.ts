// Solvers an archetype needs from a package it may not import (tier 1
// has no same-tier edges, M06 "Package placement"). The click spring's FE
// curve lives in packages/sim (SNAPFE, M01-T01); core registers it here at
// load, registration by inversion (D-044). An archetype that needs a
// solver nobody registered refuses with E_KERNEL naming the registrar.

import { commandError, type ProfileLookup } from "@hackbuild/spec";

/** The click spring as PIP declares it (layout.js line 36). */
export interface ClickSpringIn {
  readonly l: number;
  readonly t: number;
  readonly Q: number;
  readonly w: number;
  /** Young's modulus, MPa. */
  readonly E: number;
  readonly sw: number;
}

/** What the FE gives an archetype: the curve summary and the contact and stop readouts (layout.js lines 81 to 97). */
export interface ClickCurve {
  readonly peakN: number;
  readonly peakAtMm: number;
  readonly valleyN: number;
  readonly valleyAtMm: number;
  /** 1 - valley / peak, ratio. */
  readonly drop: number;
  /** Travel to contact cg, mm. */
  readonly contactMm: number;
  /** Largest element strain up to cg + overtravel, ratio. */
  readonly eStop: number;
  readonly snaps: boolean;
  readonly bistable: boolean;
  /** False when a load step did not converge. */
  readonly ok: boolean;
}

export type ClickSolver = (s: ClickSpringIn, profile: ProfileLookup) => ClickCurve;

let clickSolver: ClickSolver | undefined;

/** Core calls this once at load with the sim FE. A second call replaces the first. */
export function provideClickSolver(fn: ClickSolver): void {
  clickSolver = fn;
}

export function clickCurve(s: ClickSpringIn, profile: ProfileLookup): ClickCurve {
  if (clickSolver === undefined) {
    throw commandError({
      code: "E_KERNEL", path: "/solvers/click", got: "none", expected: "the sim click-spring FE",
      hint: "no click-spring solver is registered; core registers packages/sim at load, so call the archetype through core", record: "viewer-sim",
    });
  }
  return clickSolver(s, profile);
}
