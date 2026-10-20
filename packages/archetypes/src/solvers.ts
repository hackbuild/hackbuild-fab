// Solvers an archetype needs from a package it may not import (tier 1
// has no same-tier edges, M06 "Package placement"). The click spring's FE
// curve lives in packages/sim (SNAPFE, M01-T01); registerSolvers in
// packages/pipeline/src/solvers.ts registers it here, called by core at
// load and by a page build, registration by inversion (D-044). An
// archetype that needs a solver nobody registered refuses with E_KERNEL
// naming the registrar.

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
  /** The load steps behind the summary, travel 0 first: centre travel d, mm, and force F, N (SNAPFE summarize). */
  readonly pts?: readonly { readonly d: number; readonly F: number }[];
}

export type ClickSolver = (s: ClickSpringIn, profile: ProfileLookup) => ClickCurve;

let clickSolver: ClickSolver | undefined;

/** registerSolvers calls this once with the sim FE. A second call replaces the first. */
export function provideClickSolver(fn: ClickSolver): void {
  clickSolver = fn;
}

export function clickCurve(s: ClickSpringIn, profile: ProfileLookup): ClickCurve {
  if (clickSolver === undefined) {
    throw commandError({
      code: "E_KERNEL", path: "/solvers/click", got: "none", expected: "the sim click-spring FE",
      hint: "no click-spring solver is registered; call registerSolvers from @hackbuild/pipeline (core and createPageBuild call it) before the archetype", record: "viewer-sim",
    });
  }
  return clickSolver(s, profile);
}
