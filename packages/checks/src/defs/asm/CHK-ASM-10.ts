// CHK-ASM-10, insertion proven by motion search (COTTER 2026-09: hook_fit.py
// search() proves each hook goes into its pegboard hole by a best-first
// search over tilt and translation; verify_all passes 7 hole and board
// pairs, and a hook with a bend far under the closed form traps;
// designs/cotter/legacy/tools/hook_fit.py, lineage cotter.hook-fit/r5).
//
// The search is the M02-T09 port (packages/sim sweep/insert.ts, run by
// sim.sweep --mode insert); the caller hands its measurement in through the
// insert view and the check holds the verdict (D-055). One finding per
// insertable assertion, on the pair: legal is true, measured is whether a
// clearing pose was reached, and extra carries why the search stopped, the
// poses it popped and the largest tilt.

import type { Finding, ResultTarget } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { viewsOf, type InsertableAssertion } from "../../views.js";
import { boolFinding, skip } from "../common.js";

export const NO_INSERT = "no insertion search supplied to the registry: the caller runs sim.sweep --mode insert on the assembly's scene";

export const check = defineCheck({
  id: "CHK-ASM-10",
  level: "assembly",
  run: async (t, ctx): Promise<readonly Finding[]> => {
    const a = t.assembly;
    const at: ResultTarget = { level: "assembly", assembly: a.id };
    const asked = a.assertions.filter((x): x is InsertableAssertion => x.type === "insertable");
    if (asked.length === 0) return [skip(at, "not run", `assembly ${a.id} declares no insertable assertion`)];
    const search = viewsOf(ctx).insert;
    if (search === undefined) return [skip(at, "not run", NO_INSERT)];
    const out: Finding[] = [];
    for (const x of asked) {
      const pair: ResultTarget = { level: "pair", a: { level: "assembly", assembly: a.id, part: x.part }, b: { level: "assembly", assembly: a.id, part: x.into } };
      const r = await search(a.id, x);
      if (r === undefined) {
        out.push(skip(pair, "not run", `the insertion scene has no case for ${x.part} into ${x.into}`));
        continue;
      }
      const ok = r.verdict === "INSERTS";
      out.push(boolFinding(pair, ok,
        ok
          ? `${x.part} reaches a clearing pose out of ${x.into} after ${r.poses} poses, max tilt ${r.maxTiltDeg} deg (computed; hook_fit.py search)`
          : `${x.part} is trapped in ${x.into}: the search stopped on ${r.stop} after ${r.poses} poses, max tilt ${r.maxTiltDeg} deg (computed; hook_fit.py search)`,
        {
          stop: r.stop, poses: r.poses, maxTiltDeg: r.maxTiltDeg,
          ...(r.clearing === null ? {} : { clearTiltDeg: r.clearing.tiltDeg, clearXMm: r.clearing.xMm, clearYMm: r.clearing.yMm }),
        }));
    }
    return out;
  },
});
