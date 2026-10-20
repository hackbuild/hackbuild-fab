// fits.table (M01-T09 step 6, D-106 group prove, AGENT-SURFACE.md 5.3):
// build a chase, read its FITS rows from the Part IR metrics (D-049), and
// bound each row through the solver on fit.drawn and fit.hole, so the band
// comes from profile/fit-band and its reason from the fit model. A row is
// in band when its drawn clearance lies in the legal interval within the
// model's edge tolerance. Each row is also a CHK-FIT-01 CheckResult, so
// the verdict, counts and exit code follow the result contract (exit 0
// when every row is in band, 1 otherwise).
//
// The D-100 loss table runs beside the legacy model: real is the legacy
// "after loss" column, unifiedReal is realGap on the same drawn clearance
// over the class's loss row (per side, doubled to the joint), and their
// difference is informational (D-075).

import type { CheckResult, CommandInput, CommandOutput, FitRow } from "@hackbuild/spec";
import { fitRowsOf, hasFitsRows } from "@hackbuild/checks";
import { createProfileLookup } from "@hackbuild/profile";
import { seedRows, stamp } from "../checks.js";
import { cmdError } from "../errors.js";
import { fullProfile } from "../load-build.js";
import { countsOf, findingsOf, worst, type CommandOut } from "../result.js";
import { decimalsOf, fixed } from "../text/fmt.js";
import type { CoreCtx } from "../ctx.js";
import { constraintRegistry } from "./constraints-query.js";
import { buildTarget } from "./part-build.js";

const CHECK = "CHK-FIT-01";

/** One FITS row as fits.table returns it: the spec FitRow plus the legacy and hole fields. */
export interface FitsTableRow extends FitRow {
  /** Metric stem, for example "fits.01". */
  readonly id: string;
  /** The class name the legacy model printed (PSLIDE for PSLIP). */
  readonly legacyClass: string;
  /** Fit model id the band came from. */
  readonly model: string;
  readonly hole: number;
  readonly shaft: number;
  /** Legal hole for this shaft, mm: shaft plus the band. */
  readonly holeBand: readonly [number, number];
  /** Real gap across the joint from the D-100 loss table, mm; null when no loss row prices the pair. */
  readonly unifiedReal: number | null;
  /** real minus unifiedReal, mm, informational (D-075); null with unifiedReal. */
  readonly lossDelta: number | null;
}

export async function runFitsTable(input: CommandInput<"fits.table">, ctx: CoreCtx): Promise<CommandOut<CommandOutput<"fits.table">>> {
  const built = await buildTarget(input.build, ctx, undefined, undefined, "/build");
  const part = built.part;
  const profile = createProfileLookup(fullProfile());
  const seed = seedRows(built.design.ws.checksSeed).get(CHECK);
  if (seed === undefined) throw cmdError({ code: "E_REF", path: `/checks/${CHECK}`, got: CHECK, hint: `the check seed lacks ${CHECK}; restore packages/checks/seed/checks.seed.json` });

  // One loop for the rows and their CHK-FIT-01 findings: the registry module's (packages/checks fitRowsOf).
  const rows: FitsTableRow[] = [];
  const results: CheckResult[] = [];
  for (const r of hasFitsRows(part) ? fitRowsOf(part, profile, constraintRegistry()) : []) {
    rows.push({
      id: r.id, group: "fits", label: r.name, measured: `drawn ${fixed(r.drawn, decimalsOf("mm"))} mm`, verdict: r.ok ? "pass" : "fail",
      note: `${r.name}: ${r.reason}`, class: r.cls, legacyClass: r.legacyClass, model: r.model,
      drawn: r.drawn, real: r.real, band: r.band, hole: r.hole, shaft: r.shaft, holeBand: r.holeBand,
      unifiedReal: r.unifiedReal, lossDelta: r.unifiedReal === null ? null : r.real - r.unifiedReal,
    });
    results.push(stamp(seed, r.finding));
  }
  if (rows.length === 0) throw cmdError({ code: "E_SCHEMA", path: "/metrics", expected: "fits.<nn>.drawn metrics", hint: "the build emits no FITS rows; emit fits.<nn>.hole, shaft, drawn and class metrics" });

  return {
    verdict: worst(results), stage: "done", buildHash: part.buildHash, inputsHash: ctx.inputsHash,
    findings: findingsOf(results), counts: countsOf(results), errors: [], artifacts: [], next: [],
    result: { rows },
  };
}
