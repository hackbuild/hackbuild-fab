// command circuit.solve, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { McuPinSpec, Net, OperatingPoint, ReadOutputs } from "../circuit";
import type { CommandResult } from "../commands";

export interface CircuitSolveIO {
  input: {
    /** A chase path, a reference path (reference/<area>/<id>) or an hbf://build URI. */
    build: string;
    /** Stimulus per target: true for a held key, a number in the target's unit otherwise. */
    stimulus?: Readonly<Record<string, number | boolean>>;
    /** McuPinSpec id; the chase hookup entry's mcu for each port when absent. */
    mcu?: string;
    /** Solver; "analytic" when absent. "spice" loads eecircuit-engine lazily (D-086). */
    engine?: "analytic" | "spice";
    /** Which pullup range ends to classify at; "range" (both ends) when absent. */
    pullup?: "range" | "min" | "max";
  };
  /** Findings (CHK-NET-05, CHK-NET-06) travel in CommandResult.findings. */
  output: { nets: readonly Net[]; points: readonly OperatingPoint[]; reads: readonly ReadOutputs[] };
}
