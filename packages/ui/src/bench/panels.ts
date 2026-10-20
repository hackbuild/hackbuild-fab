// The rail panel registry (spec/bench.ts PanelRef): one entry per panel id,
// each naming its component and how it reads the shell. `params.<group>`
// resolves to the ParamRail of that group. A panel id with no entry renders
// a row that names it, so a bench that declares a panel from a later card
// shows what is missing instead of an empty pane. `notes.<id>` is a notes
// panel (D-124): the note a build filled for that id, else the declared
// note of the group with that id, under the group's head. `plot.<id>` is
// the plot.curve panel of BenchDecl.plots[id], driven by the design's
// ContactFn (plan v9 section 3.2; the widget registry registers it later).

import type { Component } from "vue";
import type { CheckResult, ContactFn, DriveDecl, ExportDecl, Metric, ParamEnvelope, ParamGroup, PlotDecl } from "@hackbuild/spec";
import { panelRow, targetIds, type LocatePart } from "@hackbuild/ui-core";
import ChecksPanel from "../panels/ChecksPanel.vue";
import FitsPanel from "../panels/FitsPanel.vue";
import ExportsPanel from "../panels/ExportsPanel.vue";
import LogPanel from "../panels/LogPanel.vue";
import CurvePanel from "../panels/CurvePanel.vue";
import { CURVE_TOLERANCE, type CurveEntry } from "../panels/curve.js";

/** Everything a panel may read; each entry picks its props from it. */
export interface PanelCtx {
  readonly values: Record<string, unknown>;
  readonly results: readonly CheckResult[];
  readonly metrics: readonly Metric[];
  readonly envelope: ParamEnvelope | null;
  readonly part: LocatePart | null;
  readonly exports: readonly ExportDecl[];
  readonly writable: readonly string[];
  /** Export kinds gated as fabrication (ui-core FREE_EXPORTS). */
  readonly fabrication: readonly string[];
  readonly current: boolean;
  readonly valueAt: (pointer: string) => unknown;
  readonly log: readonly string[];
  /** Notes the last build filled, by notes panel id (PIP HOOKUP, part3.js line 442). */
  readonly notes: Readonly<Record<string, string>>;
  /** BenchDecl.plots, for `plot.<id>` panels. */
  readonly plots?: Readonly<Record<string, PlotDecl>>;
  /** The bench's drive pad, its contact function and its held targets. */
  readonly drive?: DriveDecl | null;
  readonly contact?: ContactFn | null;
  readonly held?: readonly string[];
}

export interface PanelEntry {
  readonly component: Component;
  readonly props: (c: PanelCtx) => Record<string, unknown>;
}

export const PANELS: Readonly<Record<string, PanelEntry>> = {
  checks: { component: ChecksPanel, props: (c) => ({ results: c.results, part: c.part, valueAt: c.valueAt }) },
  fits: { component: FitsPanel, props: (c) => ({ metrics: c.metrics, results: c.results, part: c.part }) },
  exports: { component: ExportsPanel, props: (c) => ({ exports: c.exports, current: c.current, writable: c.writable, fabrication: c.fabrication, results: c.results }) },
  log: { component: LogPanel, props: (c) => ({ log: c.log }) },
};

/** The plot.curve registry entry a `plot.<id>` panel binds (curve.ts CurveEntry). */
export function curveEntry(plotId: string, c: PanelCtx): CurveEntry {
  const ids = c.drive == null ? null : targetIds(c.drive, c.metrics);
  const target = ids?.[0] ?? null;
  return {
    kind: "plot.curve",
    fn: c.contact ?? null,
    inputs: { plotId, plot: c.plots?.[plotId] ?? null, metrics: c.metrics, target, held: target !== null && (c.held ?? []).includes(target) },
    outputs: (c.drive?.readout ?? []).filter((r) => r === "travel" || r === "force" || r === "logic"),
    tolerance: CURVE_TOLERANCE,
  };
}

export type Resolved =
  | { readonly kind: "params"; readonly group: ParamGroup }
  | { readonly kind: "panel"; readonly entry: PanelEntry }
  | { readonly kind: "notes"; readonly id: string; readonly heading: string; readonly note: (c: PanelCtx) => string | null }
  | { readonly kind: "materials" }
  | { readonly kind: "absent"; readonly id: string };

/** A rail panel id read by ui-core panelRow, the one reading the chase binding uses, with its component. */
export function resolvePanel(id: string, groups: readonly ParamGroup[]): Resolved {
  const row = panelRow(id, groups);
  switch (row.kind) {
    case "params": return { kind: "params", group: row.group };
    case "notes": return { kind: "notes", id: row.key, heading: row.heading, note: (c) => c.notes[row.key] ?? row.note };
    case "plot": return { kind: "panel", entry: { component: CurvePanel, props: (c) => ({ ...curveEntry(row.plot, c) }) } };
    case "materials": return { kind: "materials" };
    case "absent": return { kind: "absent", id };
    case "panel": {
      const entry = PANELS[id];
      return entry === undefined ? { kind: "absent", id } : { kind: "panel", entry };
    }
  }
}

export { EXPORT_STEPS, railEndError } from "@hackbuild/ui-core";
