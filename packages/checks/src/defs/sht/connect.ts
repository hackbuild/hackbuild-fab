// What CHK-SHT-01, 02 and 07 share (M07-T14): the run reads the findings
// nest's connectivity kernels returned for the parts on one sheet
// (KernelViews.sheetConnect; packages/nest/src/connect.ts computes them
// before anything is placed, M07-T04) and keeps those of its own check id.
// A part finding is reported on the sheet with the part named; a feature
// finding (a hub hole, CHK-SHT-07) keeps its feature target. A sheet the
// caller nested nothing for is reported not run (D-153).

import type { CheckCtx, Finding, ResultTarget } from "@hackbuild/spec";
import { NO_SHEET_CONNECT, viewsOf } from "../../views.js";
import { skip } from "../common.js";

export function sheetFindings(id: string, sheet: string, ctx: CheckCtx, none: string): readonly Finding[] {
  const target = { level: "sheet", sheet } as const;
  const got = viewsOf(ctx).sheetConnect?.(sheet);
  if (got === undefined) return [skip(target, "not run", NO_SHEET_CONNECT)];
  const mine = got.filter((f) => f.check === id).map((f): Finding => {
    const t = f.finding.target as ResultTarget;
    return t.level === "part" ? { ...f.finding, target: { level: "sheet", sheet, part: t.part } } : f.finding;
  });
  return mine.length > 0 ? mine : [skip(target, "not run", none)];
}
