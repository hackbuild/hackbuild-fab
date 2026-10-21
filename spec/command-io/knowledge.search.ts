// command knowledge.search, group query.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { KnowledgeHit, KnowledgeKind } from "../commands";

export interface KnowledgeSearchIO {
  input: { query: string; kinds?: readonly KnowledgeKind[] };
  output: { hits: readonly KnowledgeHit[] };
}
