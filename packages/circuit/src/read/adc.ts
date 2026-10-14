// ADC read model (M05-T05 step 1, D-078). A printed source feeds an ADC pin
// through its path resistance. The bands are the BLOCKS wire verdict, ported
// from the canonical BLOCKS parts.js line 702 (lineage
// blocks.parts/blocks-1-wire-verdict; BOSS parts.js line 426 holds the same line):
//   R < 1e5   signal and ADC fine
//   R < 1e6   digital fine, ADC needs a 100 nF at the pin
//   else      digital only (slow edges), no analog
// The 100 kohm line is CHK-NET-06's (TANG R5, CHECKS.md 7); GIB part2.js
// line 544 states the same 100 kohm and 100 nF. Every threshold is a profile
// constant: read.adc.lineOhm, read.adc.analogCeilOhm, read.adc.holdCapNf.

import type { Ohm, ProfileLookup, Qualified, Qualifier, ReadModel, Tier, Volt } from "@hackbuild/spec";
import { qualify } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";
import { rowValue } from "./rows.js";

export type AdcRead = Extract<ReadModel, { model: "adc" }>;

/** fine: under the line; hold-cap: needs the hold capacitor; digital-only: no analog read. */
export type AdcBand = "fine" | "hold-cap" | "digital-only";

/** Full scale of an ADC, counts: 2^bits - 1 (FEELER reads 1023 at 10 bits, feeler_thinpot.html:4518). */
export function fullScaleCounts(bits: number): number {
  if (!Number.isInteger(bits) || bits < 1) throw circuitError({ code: "E_SCHEMA", path: "/read/bits", got: bits, hint: "ADC resolution is a whole number of bits, at least 1" });
  return 2 ** bits - 1;
}

export interface AdcReadInput {
  readonly net: string;
  /** Source impedance the pin sees, ohm. */
  readonly sourceOhm: Ohm;
  /** Tiers of the rows the source was priced from; null for a row needed and not found. */
  readonly sourceTiers?: readonly (Tier | null)[];
  readonly read: AdcRead;
  readonly profile: ProfileLookup;
}

export interface AdcReadOutputs {
  readonly net: string;
  readonly sourceOhm: Ohm;
  /** CHK-NET-06 line, ohm. */
  readonly lineOhm: Qualified;
  /** Above this no analog read, ohm. */
  readonly analogCeilOhm: Qualified;
  readonly band: AdcBand;
  /** The hold capacitor the hold-cap band asks for, nF; null in the other bands. */
  readonly holdCapNf: Qualified | null;
  /** One count at refV, V. */
  readonly lsbV: Volt;
  /** True in band fine: under the CHK-NET-06 line. */
  readonly ok: boolean;
  readonly qualifier: Qualifier;
}

export function adcRead(i: AdcReadInput): AdcReadOutputs {
  const lineOhm = rowValue(i.profile, "read.adc.lineOhm", "ohm");
  const analogCeilOhm = rowValue(i.profile, "read.adc.analogCeilOhm", "ohm");
  const holdCap = rowValue(i.profile, "read.adc.holdCapNf", "nF");
  const band: AdcBand = i.sourceOhm < lineOhm.value ? "fine" : i.sourceOhm < analogCeilOhm.value ? "hold-cap" : "digital-only";
  const tiers: (Tier | null)[] = [...(i.sourceTiers ?? []), lineOhm.basis, analogCeilOhm.basis];
  return {
    net: i.net,
    sourceOhm: i.sourceOhm,
    lineOhm,
    analogCeilOhm,
    band,
    holdCapNf: band === "hold-cap" ? holdCap : null,
    lsbV: i.read.refV / fullScaleCounts(i.read.bits),
    ok: band === "fine",
    qualifier: qualify(tiers).qualifier,
  };
}
