// One read of a profile constant for the read models: the row's value as a
// Qualified with qualifyRow(tier) and the row's own source, or E_SCHEMA when
// the row's unit differs from the one the formula is written in.

import type { ProfileLookup, Qualified } from "@hackbuild/spec";
import { qualifyRow } from "@hackbuild/spec";
import { circuitError } from "../path1d.js";

export function rowValue(profile: ProfileLookup, id: string, unit: string): Qualified {
  const row = profile.constant(id);
  if (row.unit !== unit) {
    throw circuitError({ code: "E_SCHEMA", path: `/constants/${id}/unit`, got: row.unit, hint: `profile constant ${id} must be in ${unit}` });
  }
  return { value: row.value, unit, source: `profile ${id}: ${row.provenance.source}`, ...qualifyRow(row.provenance.tier) };
}
