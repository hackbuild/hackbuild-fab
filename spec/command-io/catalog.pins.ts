// command catalog.pins, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { PinDef } from "../catalog.js";
import type { McuPinSpec } from "../circuit.js";
import type { Tier } from "../ids.js";
import type { Provenance } from "../profile.js";

export interface CatalogPinsIO {
  input: { part: string };
  /** provenance: every field the answer read, by field name (M08-T04 step 4). */
  output: { pins: readonly PinDef[]; mcu: McuPinSpec | null; tier: Tier; provenance: Readonly<Record<string, Provenance>> };
}
