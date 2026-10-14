// CHK-BRD-01 run body (M08-T07 step 7): every gerbers zip is read back by
// two independent parsers, gerbonara for the vector compare, the record
// assertions and the silk vertex sets, pygerber for the raster
// (tools/py/board/reparse.py). Core runs the script through uv and hands
// the report in through views.board.reparse, since this package compiles
// without Node. The seed declares the legal kind boolean: the zip reads
// back to its source and record or it does not; the worst layer symmetric
// difference, gated at 1e-3 mm2 inside the script, rides in extra.

import type { CheckCtx, Finding, TargetOf } from "@hackbuild/spec";
import { boolFinding, skip } from "../defs/common.js";
import { NO_BOARD_VIEW, viewsOf } from "../views.js";

/** The worst layer symmetric difference the reparse allows, mm2 (M08-T07 step 2). */
export const REPARSE_SYMDIFF_MM2 = 1e-3;

export async function runBrd01(t: TargetOf<"artifact">, ctx: CheckCtx): Promise<readonly Finding[]> {
  const at = { level: "artifact" as const, artifact: t.artifact.name };
  if (t.artifact.exporter !== "gerbers") return [skip(at, "not run", `artifact ${t.artifact.name} is a ${t.artifact.exporter} export; CHK-BRD-01 reads gerbers zips`)];
  const record = t.artifact.part?.board;
  if (record === undefined) return [skip(at, "not run", `no BoardRecord beside ${t.artifact.name}: name the board design or its build so the reparse has a record`)];
  const reparse = viewsOf(ctx).board?.reparse;
  if (reparse === undefined) return [skip(at, "not run", NO_BOARD_VIEW)];
  const r = await reparse(t.artifact.bytes, record);
  if (r === undefined) return [skip(at, "not run", `${t.artifact.name} holds no gerber layers`)];
  const constraint = r.ok
    ? `${t.artifact.name} reads back to its source and record by gerbonara and pygerber; worst layer symmetric difference ${r.worstSymdiff.toFixed(6)} mm2, legal 0 to ${REPARSE_SYMDIFF_MM2}`
    : `${t.artifact.name} fails its reparse: ${r.fails[0] ?? "no reason printed"}${r.fails.length > 1 ? `, and ${r.fails.length - 1} more` : ""}`;
  return [boolFinding(at, r.ok, constraint, { failed: r.fails.length, fails: r.fails.join("; "), worstSymdiffMm2: r.worstSymdiff })];
}
