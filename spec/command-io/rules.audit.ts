// command rules.audit, group prove.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Hash } from "../ids.js";

export interface RulesAuditIO {
  /** chase absent audits the whole workspace. */
  input: { chase?: string; cursor?: string };
  output: { simHash: Hash; firmwareHash: Hash; equal: boolean };
}
