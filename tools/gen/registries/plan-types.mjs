// Regenerates tools/reports/plan-types.txt (R1-fix-11): the spec type
// declarations copied into the plan docs, and the spec export count in its
// header, which moves whenever spec gains or loses an export. Rule: never
// edit the report; change spec or the plan doc, then run npm run registries.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { formatReport, lint } from "../../lint-plan-types.mjs";

export const name = "plan-types";

export function outputs(root) {
  const specDir = join(root, "spec");
  if (!existsSync(specDir)) return [];
  const paths = [join(root, "docs/plan"), join(root, "docs/plan/milestones")].filter((p) => existsSync(p));
  return [{ path: "tools/reports/plan-types.txt", text: formatReport(lint({ specDir, paths })) }];
}
