// Pullup read model (M05-T05 step 1, D-076, D-078). A press joins the pin to
// the return rail through the printed path R, so the pin settles at the
// divider of the pull and the path. With the pull to VDD and the return at
// 0 V that is VDD R / (R + Rpu), the BOSS sim's operating point
// (designs/blocks/legacy/boss-src/src/sim.js line 91, the PULLUP element;
// lineage blocks.sim/blocks-1) evaluated at each end of the receiving row's
// pullup range rather than at BOSS's one 50 kohm. The state is classified
// against that row's VIL and VIH, never the BOSS 0.5 VIO line (D-076).
//
// dividerV is the one divider every read model in this folder and
// release.ts's pull sweep evaluate.

import type { McuPinSpec, Micros, Ohm, OperatingPoint, PinReading, PinState, Tier, Volt } from "@hackbuild/spec";
import { qualify } from "@hackbuild/spec";
import { rcTauUs } from "../flex-switch.js";
import { circuitError } from "../path1d.js";

/** Classify a pin voltage against one MCU's thresholds (D-076). */
export function classify(v: Volt, mcu: Pick<McuPinSpec, "vilMaxV" | "vihMinV">): PinState {
  if (v <= mcu.vilMaxV) return "LOW";
  if (v >= mcu.vihMinV) return "HIGH";
  return "UNDEFINED";
}

/** Both ends of a pullup range, or the one typical value. */
export function pullupEnds(mcu: Pick<McuPinSpec, "pullup">): readonly Ohm[] {
  return mcu.pullup.kind === "range" ? [mcu.pullup.minOhm, mcu.pullup.maxOhm] : [mcu.pullup.typOhm];
}

/**
 * The node between vTop through rTop and vBottom through rBottom, V. A
 * pressed pullup read is dividerV(VDD, Rpu, 0, R) = VDD R / (R + Rpu).
 */
export function dividerV(vTop: Volt, rTop: Ohm, vBottom: Volt, rBottom: Ohm): Volt {
  return (vTop * rBottom + vBottom * rTop) / (rTop + rBottom);
}


/** Two sets of readings are told apart when each lands in one defined state and the states differ. */
export function distinguishable(pressed: readonly PinReading[], released: readonly PinReading[]): boolean {
  const p = new Set(pressed.map((r) => r.state));
  const r = new Set(released.map((x) => x.state));
  const [ps] = [...p];
  const [rs] = [...r];
  return p.size === 1 && r.size === 1 && ps !== "UNDEFINED" && rs !== "UNDEFINED" && ps !== rs;
}

export interface PullupReadInput {
  readonly net: string;
  /** Pressed path from the pin to the return rail, ohm. */
  readonly pathOhm: Ohm;
  /** Tiers of the rows the path was priced from; null marks a row it needed and did not find. */
  readonly pathTiers?: readonly (Tier | null)[];
  /** The receiving pin row (catalog mcuPinRow, M05-T02). */
  readonly mcu: McuPinSpec;
  /** ReadModel pullup.active. Only "low" (a press pulls the pin to GND) has a model in M05. */
  readonly active: "low" | "high";
  /** External pullup, ohm; absent means the row's internal pullup range. */
  readonly externalOhm?: Ohm;
  /** Node capacitance for tau, pF; absent means the row's inputCap. */
  readonly nodePf?: number;
  /**
   * Pressed pin voltage at a pullup end from another engine, V (circuit.solve
   * --engine spice, M05-T06); dividerV over the same pull and path when
   * absent. Classification stays here, so both engines share it.
   */
  readonly solvedV?: (pullupOhm: Ohm) => Volt;
}

export interface PullupReadOutputs {
  readonly net: string;
  /** One operating point: pressed and released readings at each pullup end. */
  readonly op: OperatingPoint;
  /** Rising edge after release, tau = Rpu C at each pullup end, us. */
  readonly tauUs: readonly { readonly pullupOhm: Ohm; readonly tauUs: Micros }[];
  /** Where the pull came from. */
  readonly pull: "internal" | "external";
}

/**
 * Pullup read of one net at one receiving pin. The released pin sits at
 * VDD: leakage through the pull (1 nA x 80 kohm, 80 uV on rp2040, inferred
 * row) is under the precision of any threshold here and is not modelled;
 * charge-release carries leakage as idleDroopV instead.
 */
export function pullupRead(i: PullupReadInput): PullupReadOutputs {
  if (i.active !== "low") {
    throw circuitError({
      code: "E_SCHEMA", path: "/read/active", got: i.active,
      hint: "a pullup read with active high needs a pulldown; no pulldown row exists in M05, declare active low",
    });
  }
  if (!(i.pathOhm >= 0)) throw circuitError({ code: "E_SCHEMA", path: "/pathOhm", got: i.pathOhm, hint: "a pressed path is a resistance of at least 0 ohm" });
  const ends = i.externalOhm === undefined ? pullupEnds(i.mcu) : [i.externalOhm];
  const pf = i.nodePf ?? i.mcu.inputCap.value;
  const vdd = i.mcu.vddV;
  const pressed = ends.map((rpu): PinReading => {
    const volts = i.solvedV === undefined ? dividerV(vdd, rpu, 0, i.pathOhm) : i.solvedV(rpu);
    return { pullupOhm: rpu, volts, state: classify(volts, i.mcu) };
  });
  const released = ends.map((rpu): PinReading => ({ pullupOhm: rpu, volts: vdd, state: classify(vdd, i.mcu) }));
  const tiers: (Tier | null)[] = [...(i.pathTiers ?? []), i.mcu.tier];
  const op: OperatingPoint = {
    net: i.net, mcu: i.mcu.id, pathOhm: i.pathOhm, pressed, released,
    distinguishable: distinguishable(pressed, released),
    qualifier: qualify(tiers).qualifier,
  };
  return {
    net: i.net,
    op,
    tauUs: ends.map((rpu) => ({ pullupOhm: rpu, tauUs: rcTauUs(rpu, pf) })),
    pull: i.externalOhm === undefined ? "internal" : "external",
  };
}
