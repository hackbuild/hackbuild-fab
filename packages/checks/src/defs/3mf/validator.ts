// CHK-3MF-01, -02 and -03 run the M00 validator mirror on the exported
// bytes (packages/3mf validateEntries, the TypeScript mirror of
// tools/py/validate_3mf.py, M00-T09), so the dialect rules exist once. The
// mirror stamps its own results; the registry restamps from the seed, so
// only the finding fields cross over. An artifact here is bytes hbf wrote,
// so the mirror runs in export mode. The mirror sets no fix, so its
// results narrow to spec findings (src/3mf/contracts.ts).

import type { CheckId, Finding, TargetOf } from "@hackbuild/spec";
import { DEFAULT_TEMPLATE, validateEntries, type CheckResult, type FilamentTemplate } from "@hackbuild/3mf";
import { entriesOf } from "../../skeleton/threemf.js";

/** The validator's results for one check id, as findings. */
export async function validatorFindings(t: TargetOf<"artifact">, id: CheckId, template: FilamentTemplate | undefined): Promise<readonly Finding[]> {
  const entries = Object.fromEntries(await entriesOf(t.artifact));
  const report = validateEntries(entries, { mode: "export", target: "bbs", artifact: t.artifact.name, template: template ?? DEFAULT_TEMPLATE });
  return report.results.filter((r) => r.id === id).map((r: CheckResult) => {
    const { id: _id, version: _v, severity: _s, origin: _o, waived: _w, ...finding } = r;
    return finding as Finding;
  });
}
