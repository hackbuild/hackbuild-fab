// The drive pad of the shell's current build (M09-T10): the chase hookup,
// the bench DriveDecl, the design's ContactFn and the last build's Part IR
// and check results, through ui-core padModel. The pad overlay and
// BENCH.drive both read it here, so they cannot disagree (G-20).

import type { Bench, Chase, ContactFn } from "@hackbuild/spec";
import { padModel, type PadModel, type ViewPart } from "@hackbuild/ui-core";
import type { BenchReport } from "../stores/shell.js";

export interface PadSource {
  readonly part: ViewPart | null;
  readonly report: BenchReport;
}

/** The pad model, or null when the bench declares no drive pad. */
export function padOf(chase: Chase, bench: Bench, contact: ContactFn | null, src: PadSource): PadModel | null {
  const decl = bench.views.drive;
  if (decl === undefined || !bench.views.overlays.includes("drive")) return null;
  return padModel({
    decl,
    hookup: chase.hookup ?? [],
    features: src.part?.part.features ?? [],
    metrics: src.report.metrics ?? [],
    results: src.report.results ?? [],
    contact,
  });
}
