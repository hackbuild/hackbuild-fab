// Resistor ladder read model (M05-T05 step 1, D-078): one ADC pin reads a
// chain of step resistors through a pull-down; key k parks OUT at a level.
// Ported from FEELER's LADDER keypad (lineage feeler.bench/thinpot-16-ladder,
// feeler_thinpot.html lines 4504 to 4510 in the readout and 4951 to 4959 in
// SIM.ladder): for key k, Rup is the chain above the key, Rdn the chain
// below it, the read leg Rl = Rc + Rpd, Rpar = Rdn Rl / (Rdn + Rl) and the
// level is Rpar / (Rup + Rpar) of the supply; the no-key level is 0. The
// smallest step between neighbouring levels is reported in volts and in
// counts at the ADC's full scale, and under 25 counts the keys start to
// overlap inside a printed resistor's drift (line 4545). Rc (4000 ohm, the
// lead and contact) and the 25 count floor are profile constants
// read.ladder.leadOhm and read.ladder.minStepCounts. FEELER multiplies one
// mean step by k; stepsOhm here carries each step, so equal steps reproduce it.

import type { Ohm, ProfileLookup, Qualified, Qualifier, ReadModel, Tier } from "@hackbuild/spec";
import { qualify } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";
import { fullScaleCounts } from "./adc.js";
import { rowValue } from "./rows.js";

export type LadderRead = Extract<ReadModel, { model: "ladder" }>;

/** Levels as fractions of the supply, key 1 first, the no-key level 0 last. */
export function ladderLevels(stepsOhm: readonly Ohm[], pulldownOhm: Ohm, leadOhm: Ohm): number[] {
  const n = stepsOhm.length;
  const rl = leadOhm + pulldownOhm;
  const levels: number[] = [];
  for (let k = 0; k < n; k += 1) {
    let rUp = 0;
    let rDn = 0;
    for (let j = 0; j < n; j += 1) {
      if (j < k) rUp += stepsOhm[j] as number;
      else rDn += stepsOhm[j] as number;
    }
    const rPar = (rDn * rl) / (rDn + rl);
    levels.push(rPar / (rUp + rPar));
  }
  levels.push(0);
  return levels;
}

/** Smallest gap between neighbouring levels, fraction of the supply. */
export function smallestStep(levels: readonly number[]): number {
  let sep = Number.POSITIVE_INFINITY;
  for (let k = 0; k < levels.length - 1; k += 1) sep = Math.min(sep, Math.abs((levels[k] as number) - (levels[k + 1] as number)));
  return sep;
}

export interface LadderReadInput {
  readonly net: string;
  readonly read: LadderRead;
  readonly pulldownOhm: Ohm;
  /** Supply the ladder is fed from, V. */
  readonly vccV: number;
  readonly stepTiers?: readonly (Tier | null)[];
  readonly profile: ProfileLookup;
}

export interface LadderReadOutputs {
  readonly net: string;
  /** Fractions of the supply, key 1 first, no key last. */
  readonly levels: readonly number[];
  readonly leadOhm: Qualified;
  /** Smallest step, V and counts at full scale. */
  readonly minStepV: number;
  readonly minStepCounts: number;
  readonly minStepFloor: Qualified;
  /** Chain current at vccV with no key, A. */
  readonly chainAmps: number;
  /** True when the smallest step is at least the count floor. */
  readonly ok: boolean;
  readonly qualifier: Qualifier;
}

export function ladderRead(i: LadderReadInput): LadderReadOutputs {
  if (i.read.stepsOhm.length < 1) throw circuitError({ code: "E_SCHEMA", path: "/read/stepsOhm", got: i.read.stepsOhm.length, hint: "a ladder has at least one step resistor" });
  const leadOhm = rowValue(i.profile, "read.ladder.leadOhm", "ohm");
  const minStepFloor = rowValue(i.profile, "read.ladder.minStepCounts", "count");
  const levels = ladderLevels(i.read.stepsOhm, i.pulldownOhm, leadOhm.value);
  const sep = smallestStep(levels);
  const minStepCounts = sep * fullScaleCounts(i.read.bits);
  const chain = i.read.stepsOhm.reduce((s, r) => s + r, 0);
  return {
    net: i.net,
    levels,
    leadOhm,
    minStepV: sep * i.vccV,
    minStepCounts,
    minStepFloor,
    chainAmps: i.vccV / chain,
    ok: minStepCounts >= minStepFloor.value,
    qualifier: qualify([...(i.stepTiers ?? []), leadOhm.basis, minStepFloor.basis]).qualifier,
  };
}
