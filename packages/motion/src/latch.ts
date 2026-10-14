// The displacement coincidence latch as one interface over its machines
// (OGEE16 R16, STIPPLE R17 and R17b), so the commit rule, the programs and
// the CHK-MOT-05 identity are written once. Each machine's kinematics file
// builds its CoincidenceLatch from its own formulas; nothing here places a
// part. Lengths in mm.

import type { LatchIdentityReadout } from "@hackbuild/spec";

/**
 * Plate pull past CAM at which every latched pin drops, mm; OGEE also
 * catches only while the plate is within it of rest. Both pages type it
 * inline: OGEE viewer_template.html lines 395, 417 and 421, STIPPLE
 * stipple-r17b.html line 154 (test/latch-margin.test.ts reads them).
 */
export const LATCH_RELEASE_MARGIN_MM = 0.05;

export interface CoincidenceLatch {
  /** Machine id, the design slug and revision. */
  readonly machine: string;
  /** Cells per side, count. */
  readonly N: number;
  /** Bar stroke, mm. */
  readonly STROKE: number;
  /** Latch plate pull travel, mm. */
  readonly LP_SLIDE: number;
  /** Lateral travel the lug needs to pass the plate edge, mm. */
  readonly CAM: number;
  /** Rise the pin gets climbing its own notch while cammed, mm. */
  readonly CAMLIFT: number;
  /** Lug height, ramp included, mm. */
  readonly LUG_TOT: number;
  /** Latch plate top, mm. */
  readonly plateTop: number;
  /** Crown rise of cell i,j over rest with the bars at zR and zC, mm. */
  crownRise(i: number, j: number, zR: readonly number[], zC: readonly number[]): number;
  /** Lug bottom of the free (unlatched) pin of cell i,j with the plate at lp, mm. */
  lugBot(i: number, j: number, zR: readonly number[], zC: readonly number[], lp: number): number;
  /** The machine's own latch test for cell i,j at a commit, with the plate at lp. */
  latches(i: number, j: number, zR: readonly number[], zC: readonly number[], lp: number): boolean;
  /** True while the plate is close enough to rest that a rising lug can catch it. */
  catching(lp: number): boolean;
  /** True once the plate has pulled far enough to drop every latched pin. */
  released(lp: number): boolean;
}

/**
 * CHK-MOT-05: margin + overshoot against (full rise - half rise) - cam
 * lift - LUG_TOT, the general form (CHECKS.md CHK-MOT-05, origin OGEE R17b).
 * Full select is every bar at STROKE and half select row bars at STROKE
 * with column bars at rest, as kin.py's readout takes them (kin.py lines
 * 168 to 190); cell 0,0 is read. The half rise is the kinematics' crown
 * rise, never STROKE/2: on R16 it is 4.249 of 9.000 (computed).
 */
export function latchIdentity(l: CoincidenceLatch): LatchIdentityReadout {
  const zero = Array.from({ length: l.N }, () => 0);
  const full = Array.from({ length: l.N }, () => l.STROKE);
  const fullRise = l.crownRise(0, 0, full, full), halfRise = l.crownRise(0, 0, full, zero);
  const margin = l.plateTop - (l.lugBot(0, 0, full, zero, 0) + l.LUG_TOT);
  const overshoot = l.lugBot(0, 0, full, full, 0) - l.plateTop;
  return {
    machine: l.machine, marginMm: margin, overshootMm: overshoot, fullRiseMm: fullRise, halfRiseMm: halfRise,
    camLiftMm: l.CAMLIFT, lugTotMm: l.LUG_TOT, strokeMm: l.STROKE,
    lhsMm: margin + overshoot, rhsMm: (fullRise - halfRise) - l.CAMLIFT - l.LUG_TOT,
  };
}
