// Ratiometric read model (M05-T05 step 1, D-078).
//
// Pull-down rule for a three-wire pot read on one ADC pin, ported from GIB
// (lineage gib.shell/gib-4-pulldown, part3.js line 247, and
// gib.parts/gib-4-adc-source, part2.js line 544): any no-touch pull-down
// must be at least 20 times the source or it bends the reading, and never
// under 1 Mohm, floor = max(1 Mohm, 20 Rsrc). THINPOT's 100 kohm pull-down
// (the FEELER THINPOT hookup) is the same rule at a stiffer source.
// The ratio and the floor are profile constants read.ratiometric.pulldownRatio
// and read.ratiometric.pulldownMinOhm.
//
// Swapped drive pair (BAFFLE R1 README lines 103 to 108, lineage
// baffle.readme/r1-raster): drive A high and B low, read V1;
// swap, read V2. Position V1 / (V1 + V2) cancels the unknown series skin and
// V1 + V2 is the presence (pressure) test, the pair ReadModel ratiometric names.

import type { Ohm, ProfileLookup, Qualified, Qualifier, ReadModel, Tier, Volt } from "@hackbuild/spec";
import { qualify } from "@hackbuild/spec";
import { rowValue } from "./rows.js";

export type RatiometricRead = Extract<ReadModel, { model: "ratiometric" }>;

/** The smallest pull-down a source of sourceOhm tolerates, ohm: max(minOhm, ratio x sourceOhm). */
export function pulldownFloorOhm(sourceOhm: Ohm, rule: { readonly ratio: number; readonly minOhm: Ohm }): Ohm {
  return Math.max(rule.minOhm, sourceOhm * rule.ratio);
}

/** Position and presence from a swapped drive pair: V1 / (V1 + V2) and V1 + V2. */
export function swappedPair(v1: Volt, v2: Volt): { readonly position: number; readonly sumV: Volt } {
  const sumV = v1 + v2;
  return { position: v1 / sumV, sumV };
}

export interface RatiometricReadInput {
  readonly read: RatiometricRead;
  /** Wiper source impedance, ohm. */
  readonly sourceOhm: Ohm;
  readonly sourceTiers?: readonly (Tier | null)[];
  /** Pull-down fitted at the pin, ohm; absent when none is declared. */
  readonly pulldownOhm?: Ohm;
  readonly profile: ProfileLookup;
}

export interface RatiometricReadOutputs {
  readonly pair: readonly [string, string];
  readonly sourceOhm: Ohm;
  readonly ratio: Qualified;
  readonly minOhm: Qualified;
  /** max(minOhm, ratio x sourceOhm), ohm. */
  readonly floorOhm: Ohm;
  readonly pulldownOhm: Ohm | null;
  /** True when no pull-down is declared or the declared one is at least floorOhm. */
  readonly ok: boolean;
  readonly qualifier: Qualifier;
}

export function ratiometricRead(i: RatiometricReadInput): RatiometricReadOutputs {
  const ratio = rowValue(i.profile, "read.ratiometric.pulldownRatio", "ratio");
  const minOhm = rowValue(i.profile, "read.ratiometric.pulldownMinOhm", "ohm");
  const floorOhm = pulldownFloorOhm(i.sourceOhm, { ratio: ratio.value, minOhm: minOhm.value });
  const pulldownOhm = i.pulldownOhm ?? null;
  return {
    pair: i.read.pair,
    sourceOhm: i.sourceOhm,
    ratio,
    minOhm,
    floorOhm,
    pulldownOhm,
    ok: pulldownOhm === null || pulldownOhm >= floorOhm,
    qualifier: qualify([...(i.sourceTiers ?? []), ratio.basis, minOhm.basis]).qualifier,
  };
}
