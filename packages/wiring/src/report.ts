// The WiringReport (M08-T13 step 1): which pins are used and how each wire
// end finds its pad. An end's net resolves the way PIP's wiringSvg resolves
// a cup (bench/part2.js line 382): a rail by pin name, anything else by the
// used function.

import type { WiringInput, WiringReport } from "./input.js";

/** Rails an end may name directly, by pin name: GND and 3V3 as PIP part2.js line 382, and 5V, which the SuperMini also brings out as a pin. */
export const RAILS: readonly string[] = ["GND", "3V3", "5V"];

export function pinOfEnd(input: WiringInput, net: string): string | undefined {
  if (RAILS.includes(net) && input.pins.some((p) => p.name === net)) return net;
  return input.used.find((u) => u.function === net)?.pin;
}

/**
 * Why a WiringInput cannot be drawn. The two faults have different owners,
 * so a caller can tell them apart without parsing the message:
 * "unknown-pin" is the design's (used[index] names a pin the board lacks),
 * "no-centre" is the catalog row's (the board has the pin but its row gives
 * no pad position for it). The wiring package reads no core, so the caller
 * maps these to its own error codes.
 */
export class WiringError extends Error {
  constructor(
    readonly kind: "unknown-pin" | "no-centre",
    readonly board: string,
    readonly pin: string,
    /** Index into input.used for "unknown-pin" and for a used pin with no centre; undefined for an unused pin with no centre. */
    readonly index: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "WiringError";
  }
}

export const noCentre = (board: string, pin: string, index: number | undefined): WiringError =>
  new WiringError("no-centre", board, pin, index, `wiring: pin ${pin} of ${board} has no centre; the catalog row needs a pads or pins table with positions`);

export function wiringReport(input: WiringInput): WiringReport {
  const names = new Set(input.pins.map((p) => p.name));
  input.used.forEach((u, i) => {
    if (!names.has(u.pin)) throw new WiringError("unknown-pin", input.board.id, u.pin, i, `wiring: used pin ${u.pin} is not a pin of ${input.board.id}`);
  });
  const used = input.used.map((u, i) => {
    const at = input.pins.find((p) => p.name === u.pin)!.at;
    if (at === undefined) throw noCentre(input.board.id, u.pin, i);
    return { pin: u.pin, function: u.function, at: [at[0], at[1]] as const };
  });
  const usedPins = new Set(input.used.map((u) => u.pin));
  const ends: WiringReport["ends"][number][] = [];
  const unmatched: WiringReport["unmatched"][number][] = [];
  for (const e of input.ends) {
    const pin = pinOfEnd(input, e.net);
    if (pin === undefined) unmatched.push({ id: e.id, net: e.net });
    else ends.push({ id: e.id, net: e.net, pin });
  }
  return { used, unused: input.pins.map((p) => p.name).filter((n) => !usedPins.has(n)), ends, unmatched };
}
