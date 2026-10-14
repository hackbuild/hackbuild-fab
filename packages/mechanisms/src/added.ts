// Entries registered without a seed row, each with the decision that adds
// it (M06-T01 step 3). load.test.ts fails on a def file that is neither a
// seed row nor listed here. snap-vee-finger-cage stays out until the owner
// widens the D-096 snap family (D-202).

import { ORIGINAL_MECHANISM_IDS } from "./defs/originals/index.js";

export interface AddedEntry {
  readonly id: string;
  readonly decision: "D-096" | "D-097" | "D-222";
  /** Where CANONS.md lists it. */
  readonly where: string;
}

export const ADDED_MECHANISMS: readonly AddedEntry[] = [
  { id: "snap-tongue-relief", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "snap-finger-collar", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "snap-c-socket-lip", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "snap-holster-tab", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "snap-press-plug-ribs", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "counterbalance-band", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "integer-metering-ratio", decision: "D-096", where: "CANONS.md 2.2" },
  { id: "crank-yoke", decision: "D-096", where: "CANONS.md 2.2" },
  // The originals canon additions (M06-T14).
  ...ORIGINAL_MECHANISM_IDS.map((id): AddedEntry => ({ id, decision: "D-222", where: "CANONS.md 11.3" })),
];
