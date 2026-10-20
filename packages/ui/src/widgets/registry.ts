// The Vue side of the widget registry (plan v9 section 3.2, R1-engine-12):
// one component per widget kind ui-core registers, and the widget records
// of the shell's current build that BENCH.widgets() returns. The model of
// each kind lives in packages/ui-core/src/widgets; a component here only
// draws it.

import type { Component } from "vue";
import type { Bench, Chase, ContactFn, WidgetRecord } from "@hackbuild/spec";
import { widgetRecords, type ViewPart } from "@hackbuild/ui-core";
import type { BenchReport } from "../stores/shell.js";
import DrivePad from "../stage/DrivePad.vue";

const components = new Map<string, Component>();

/** Maps a kind to the component that draws it; a second mapping of one kind throws. */
export function registerWidgetComponent(kind: string, component: Component): void {
  if (components.has(kind)) throw new Error(`widget kind ${kind} has a component already`);
  components.set(kind, component);
}

/** The component of a kind; a kind with none throws. */
export function widgetComponent(kind: string): Component {
  const c = components.get(kind);
  if (c === undefined) throw new Error(`widget kind ${kind} has no component. mapped: ${[...components.keys()].sort().join(", ")}`);
  return c;
}

/** Kinds that have a component, sorted. */
export function widgetComponentKinds(): string[] {
  return [...components.keys()].sort();
}

export interface WidgetSource {
  readonly part: ViewPart | null;
  readonly report: BenchReport;
}

/** The records BENCH.widgets() returns for the bench's declared widgets on the current build. */
export function widgetsOf(chase: Chase, bench: Bench, contact: ContactFn | null, src: WidgetSource): WidgetRecord[] {
  const decls = bench.views.widgets ?? [];
  if (decls.length === 0) return [];
  const drive = bench.views.drive;
  return widgetRecords(decls, {
    features: src.part?.part.features ?? [],
    metrics: src.report.metrics ?? [],
    results: src.report.results ?? [],
    hookup: chase.hookup ?? [],
    contacts: drive !== undefined && contact !== null ? { [drive.contact]: contact } : {},
    ...(drive === undefined ? {} : { drive }),
  });
}

// The mapped kinds, one line each.
registerWidgetComponent("drive.tilt", DrivePad);
