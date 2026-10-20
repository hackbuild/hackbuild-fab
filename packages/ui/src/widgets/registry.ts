// The Vue side of the widget registry (plan v9 section 3.2, R1-engine-12):
// one component per widget kind ui-core registers, and the widget records
// of the shell's current build that BENCH.widgets() returns. The model of
// each kind lives in packages/ui-core/src/widgets; a component here only
// draws it.

import type { Component } from "vue";
import type { Bench, Chase, ContactFn, WidgetRecord } from "@hackbuild/spec";
import { widgetsModel, type WidgetView } from "@hackbuild/ui-core";
import type { BenchReport } from "../stores/shell.js";
import DrivePad from "../stage/DrivePad.vue";
import DrivePress from "./DrivePress.vue";
import PlotCurve from "./PlotCurve.vue";

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

/** The shell's build as the widgets read it (ui-core WidgetView). */
export interface WidgetSource extends WidgetView {
  readonly report: BenchReport;
}

/** The records BENCH.widgets() returns for the bench's declared widgets on the current build (ui-core widgetsModel). */
export function widgetsOf(chase: Chase, bench: Bench, contact: ContactFn | null, src: WidgetSource): WidgetRecord[] {
  return widgetsModel(chase, bench, contact, src);
}

// The mapped kinds, one line each.
registerWidgetComponent("drive.tilt", DrivePad);
registerWidgetComponent("drive.press", DrivePress);
registerWidgetComponent("plot.curve", PlotCurve);
