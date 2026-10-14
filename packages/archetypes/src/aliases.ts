// The alias table (M06-T01 step 4, D-014, D-096). Each alias resolves to
// exactly one id; the new ids are working ids listed for the owner beside
// the D-015 slug questions.

import type { CommandName } from "@hackbuild/spec";

export interface ArchetypeAlias {
  readonly alias: string;
  readonly to: string;
  readonly decision: string;
  readonly why: string;
}

/** Seed ids that resolve to a registered id. */
export const ARCHETYPE_ALIASES: readonly ArchetypeAlias[] = [
  { alias: "printed-membrane-slider", to: "membrane-slider-wall", decision: "D-096", why: "split three ways: wall (TANG R6), thinpot (STYLUS THINPOT), gib (GIB)" },
  { alias: "astable-blinky", to: "astable-blinky-tack", decision: "D-096", why: "split: tack (TACK), shim (SHIM)" },
];

/** The package name of the handoff. */
export const PACKAGE_ALIASES = { circuits: "archetypes" } as const;

/** Handoff command names; tsc checks each target is a registered command. */
export const COMMAND_ALIASES = {
  "archetype.apply": "arch.apply",
  "circuit.find": "arch.find",
} as const satisfies Readonly<Record<string, CommandName>>;
