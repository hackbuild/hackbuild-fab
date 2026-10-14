// core/test/fixtures/sandbox/kinds/skeleton-kinds.ts: draft kinds outside DRAFT_KIND_DIRS; loading it would run code in the parent.
import { writeFileSync } from "node:fs";
writeFileSync(new URL("./pwned.txt", import.meta.url), "x");
export const SKELETON_KINDS = {};
