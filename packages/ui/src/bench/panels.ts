// The rail panel registry (spec/bench.ts PanelRef): one entry per panel id,
// each naming its component and how it reads the shell. `params.<group>`
// resolves to the ParamRail of that group. A panel id with no entry renders
// a row that names it, so a bench that declares a panel from a later card
// shows what is missing instead of an empty pane. `notes.<id>` is a notes
// panel (D-124): the note a build filled for that id, else the declared
// note of the group with that id, under the group's head.

import type { Component } from "vue";
import type { CheckResult, ExportDecl, Metric, ParamEnvelope, ParamGroup } from "@hackbuild/spec";
import type { LocatePart } from "@hackbuild/ui-core";
import ChecksPanel from "../panels/ChecksPanel.vue";
import FitsPanel from "../panels/FitsPanel.vue";
import ExportsPanel from "../panels/ExportsPanel.vue";
import LogPanel from "../panels/LogPanel.vue";

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

export type Resolved =
  | { readonly kind: "params"; readonly group: ParamGroup }
  | { readonly kind: "panel"; readonly entry: PanelEntry }
  | { readonly kind: "notes"; readonly id: string; readonly heading: string; readonly note: (c: PanelCtx) => string | null }
  | { readonly kind: "materials" }
  | { readonly kind: "absent"; readonly id: string };

const PARAMS = "params.";
const NOTES = "notes.";

export function resolvePanel(id: string, groups: readonly ParamGroup[]): Resolved {
  if (id.startsWith(PARAMS)) {
    const group = groups.find((g) => g.id === id.slice(PARAMS.length));
    return group === undefined ? { kind: "absent", id } : { kind: "params", group };
  }
  if (id.startsWith(NOTES)) {
    const key = id.slice(NOTES.length);
    const group = groups.find((g) => g.id === key);
    return { kind: "notes", id: key, heading: group?.label ?? key.toUpperCase(), note: (c) => c.notes[key] ?? group?.note ?? null };
  }
  if (id === "materials") return { kind: "materials" };
  const entry = PANELS[id];
  return entry === undefined ? { kind: "absent", id } : { kind: "panel", entry };
}

/** The export step's names (D-125): print for one process, make for a kit. */
export const EXPORT_STEPS: readonly string[] = ["print", "make"];

/** Error line when a rail's last step is not an export step; null when it is. */
export function railEndError(steps: readonly { readonly step: string }[]): string | null {
  const last = steps.at(-1)?.step;
  if (last !== undefined && EXPORT_STEPS.includes(last.toLowerCase())) return null;
  return `rail ends in ${last ?? "no step"}; the last step is the export step, print or make (D-125)`;
}
