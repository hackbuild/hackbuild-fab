// The flex key cap bridge and the RC crossing time, one implementation each.
//
// flexCapBridgeOhm ports PIP's flex switch resistance (pip-controller
// src/model.js line 404, lineage pip.model/pip-controller-b137deb-flex-switch;
// the canonical haft (9) model.js carries the same line at 469):
// current spreads across the split through the cap, over a length of the
// column gap plus one column radius and a cross section of cap thickness by
// one column diameter, then passes twice through the cap thickness over a
// half disc of the column radius. The operand order is model.js's, in SI, so
// a value equals PIP's double for the same inputs.
//
// rcCrossingUs is the time a node floated from vDrive takes to reach
// vThreshold while it decays toward vRet with tau = R C, the charge-release
// read (pip-controller firmware/pip_stick/pip_stick.ino:54 to 59). C is the
// whole node capacitance the caller sums (pin, trace and lead); release.ts
// passes the pin capacitance alone while trace capacitance waits for M05.

import type { Micros, Mm, Ohm, Volt } from "@hackbuild/spec";

export interface FlexCapBridgeInput {
  /** Bulk resistivity of the cap filament, ohm cm (profile resistivity row). */
  readonly ohmCm: number;
  /** Full gap between the two column halves, mm (model.js F.colGap). */
  readonly colGapMm: Mm;
  /** Column radius, mm (model.js fd.colR). */
  readonly colRMm: Mm;
  /** Cap thickness over the column, mm (model.js F.cap). */
  readonly capTMm: Mm;
}

/** PIP's flex switch resistance through the cap between the two column halves, ohm (model.js:404). */
export function flexCapBridgeOhm(i: FlexCapBridgeInput): Ohm {
  const rho = i.ohmCm * 1e-2;
  return (rho * (i.colGapMm + i.colRMm) * 1e-3) / (i.capTMm * 1e-3 * i.colRMm * 2e-3)
    + (2 * rho * i.capTMm * 1e-3) / ((Math.PI * (i.colRMm * 1e-3) ** 2) / 2);
}

export interface RcCrossingInput {
  readonly ohm: Ohm;
  /** Total node capacitance, pF. */
  readonly capPf: number;
  readonly vDrive: Volt;
  readonly vRet: Volt;
  readonly vThreshold: Volt;
}

/** RC time constant, us: ohm x pF = 1e-12 s = 1e-6 us. */
export const rcTauUs = (ohm: Ohm, capPf: number): Micros => ohm * capPf * 1e-6;

/** Time for the floated node to cross vThreshold, us: tau x ln(drive swing / threshold swing). */
export function rcCrossingUs(i: RcCrossingInput): Micros {
  return rcTauUs(i.ohm, i.capPf) * Math.log(Math.abs(i.vDrive - i.vRet) / Math.abs(i.vThreshold - i.vRet));
}
