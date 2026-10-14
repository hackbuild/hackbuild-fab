// Entries registered without a seed row of their own, each with the
// decision that adds it (M06-T01 step 3). The two seed rows D-096 splits
// resolve through src/aliases.ts; load.test.ts fails on a def file that is
// neither a seed row nor listed here.

import { FEELER_TABLE } from "./defs/feeler/index.js";
import { ORIGINAL_ARCHETYPE_IDS } from "./defs/originals/index.js";

export interface AddedEntry {
  readonly id: string;
  readonly decision: "D-096" | "D-097" | "D-222";
  /** The seed row this entry splits from, or null for a new entry. */
  readonly splitFrom: string | null;
}

export const ADDED_ARCHETYPES: readonly AddedEntry[] = [
  { id: "membrane-slider-wall", decision: "D-096", splitFrom: "printed-membrane-slider" },
  { id: "membrane-slider-thinpot", decision: "D-096", splitFrom: "printed-membrane-slider" },
  { id: "membrane-slider-gib", decision: "D-096", splitFrom: "printed-membrane-slider" },
  { id: "astable-blinky-tack", decision: "D-096", splitFrom: "astable-blinky" },
  { id: "astable-blinky-shim", decision: "D-096", splitFrom: "astable-blinky" },
  { id: "sao-port", decision: "D-096", splitFrom: null },
  { id: "pi-hat-carrier", decision: "D-096", splitFrom: null },
  // The 22 STYLUS THINPOT candidates (M06-T10).
  ...FEELER_TABLE.map((t): AddedEntry => ({ id: t.id, decision: "D-097", splitFrom: null })),
  // The originals canon additions (M06-T14).
  ...ORIGINAL_ARCHETYPE_IDS.map((id): AddedEntry => ({ id, decision: "D-222", splitFrom: null })),
];
