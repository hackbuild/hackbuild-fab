// command fits.table, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { FitRow } from "../commands.js";

export interface FitsTableIO {
  input: { build: string };
  output: { rows: readonly FitRow[] };
}
