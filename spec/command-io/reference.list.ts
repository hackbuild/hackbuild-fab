// command reference.list, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { ReferenceEntry } from "../commands.js";

export interface ReferenceListIO {
  input: { covers?: string; area?: string };
  output: { references: readonly ReferenceEntry[] };
}
