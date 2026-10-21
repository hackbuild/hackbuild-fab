// Chase waivers (D-173, spec/chase.ts WaiverDecl) on the results of one
// build. runAllChecks applies them, so part.build, check.run, export.run and
// a baked bench gate on one copy. A matched fail becomes a warn carrying
// `waived`; measured, legal, constraint, origin and fix stay as computed.
// chase.validate refuses an unknown check id, an empty reason and a
// precondition check before a build runs (packages/chase resolve.ts).

import type { BuildWarning, CheckResult, IsoDate, ResultTarget, SingleTarget, WaiverDecl } from "@hackbuild/spec";
import { CHECK_ID_ALIASES } from "@hackbuild/checks";

/** The id a waiver's target names for one result target; a pair is its two ids joined by "|". */
function singleId(t: SingleTarget): string {
  switch (t.level) {
    case "part": return t.part;
    case "body": return t.body;
    case "feature": return t.feature;
    case "assembly": return t.assembly;
    case "sheet": return t.sheet;
    case "net": return t.net;
    case "artifact": return t.artifact;
    case "source": case "page": return t.path;
    case "project": return t.path ?? "";
  }
}

export function targetId(t: ResultTarget): string {
  return t.level === "pair" ? `${singleId(t.a)}|${singleId(t.b)}` : singleId(t);
}

/** The build day a lapse is read against: SOURCE_DATE_EPOCH as a UTC date, so the report stays reproducible. */
export const buildDay = (sourceDateEpoch: number): IsoDate => new Date(sourceDateEpoch * 1000).toISOString().slice(0, 10);

export interface Waived {
  readonly results: CheckResult[];
  readonly warnings: BuildWarning[];
}

/**
 * Apply the chase's waivers to one build's results. A lapsed waiver (day
 * past `until`) leaves its fail standing and warns WAIVER_LAPSED. With
 * `reportUnused`, a waiver that matched no fail warns WAIVER_UNUSED; a
 * narrowed run (`only`) passes false, since the check may not have run.
 */
export function applyWaivers(results: readonly CheckResult[], waive: readonly WaiverDecl[], day: IsoDate, reportUnused: boolean): Waived {
  const canon = (id: string): string => (CHECK_ID_ALIASES as Readonly<Record<string, string>>)[id] ?? id;
  const used = new Set<number>();
  const lapsed = new Set<number>();
  const out = results.map((r) => {
    if (r.verdict !== "fail" || r.waived !== undefined) return r;
    const i = waive.findIndex((w) => canon(w.check) === r.id && w.target === targetId(r.target));
    const w = waive[i];
    if (w === undefined) return r;
    if (w.until !== undefined && day > w.until) {
      lapsed.add(i);
      return r;
    }
    used.add(i);
    return { ...r, verdict: "warn", waived: { reason: w.reason, ...(w.until === undefined ? {} : { until: w.until }) } } as CheckResult;
  });
  const warnings: BuildWarning[] = [];
  waive.forEach((w, i) => {
    if (lapsed.has(i)) warnings.push({ code: "WAIVER_LAPSED", text: `waiver on ${w.check} at ${w.target} lapsed on ${w.until}; the fail stands. renew it or fix the part` });
    else if (reportUnused && !used.has(i)) warnings.push({ code: "WAIVER_UNUSED", text: `waiver on ${w.check} at ${w.target} matched no fail; remove it from chase.waive` });
  });
  return { results: out, warnings };
}
