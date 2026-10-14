// CHK-LNT-03, no hand-maintained list another file determines (OGEE R16-P
// 2026-08: a NEED list silently dropped seven servo meshes; OGEE build-it
// 2026-08-18: PARTS_TBL gives 99 pieces while the scene places 124, the
// blurb says 124 and a check row says 115, computed in
// ogee_buildit_run.json). A source target is one file, so the check reads
// the drift a hand-kept count leaves inside it: the same bill total
// written more than once with different numbers. A count tools/counts.mjs
// writes sits between its counts markers and is left out (D-010).
// The rule reads code and bench pages, the origin's kind (the build-it page
// is ogee16.html). A prose record is not read (proseSkip, CHECKS.md 7.8): a
// plan doc or a knowledge record quotes the counts of many designs and
// sub-assemblies side by side.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, proseSkip } from "../common.js";

/** Bill nouns the origins count: pieces and parts on the build-it page, meshes in the NEED list, plates on the plate page. */
const TOTAL = /(?<![\w.,-])(\d+)\s+(piece|part|mesh|plate)(?:s|es)?\b/gi;
const BEGIN = "<!-- counts:begin -->";
const END = "<!-- counts:end -->";

/** Stated totals per noun, outside generated count blocks. */
export function statedTotals(text: string): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>();
  let generated = false;
  for (const line of text.split("\n")) {
    if (line.includes(BEGIN)) generated = true;
    if (line.includes(END)) {
      generated = false;
      continue;
    }
    if (generated) continue;
    for (const m of line.matchAll(TOTAL)) {
      const noun = m[2]!.toLowerCase();
      const set = out.get(noun) ?? new Set<number>();
      set.add(Number(m[1]));
      out.set(noun, set);
    }
  }
  return out;
}

export const check = defineCheck({
  id: "CHK-LNT-03",
  level: "source",
  run: (t): readonly Finding[] => {
    const prose = proseSkip(t.source);
    if (prose !== undefined) return [prose];
    const drift = [...statedTotals(t.source.text)].filter(([, v]) => v.size > 1);
    const first = drift[0];
    return [boolFinding({ level: "source", path: t.source.path }, drift.length === 0,
      "a count another file determines is generated, never typed; two different totals for one bill noun is a hand count that drifted",
      { drifting: drift.length, ...(first === undefined ? {} : { noun: first[0], values: [...first[1]].sort((a, b) => a - b).join(" ") }) })];
  },
});
