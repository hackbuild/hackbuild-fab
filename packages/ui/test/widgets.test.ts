// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The Vue side of the widget registry (R1-engine-12): every kind ui-core
// registers has a component, drive.tilt draws with the drive pad overlay,
// a kind with no component refuses, and widgetsOf hands the bench's
// declared widgets to ui-core widgetRecords with the pad's contact.

import { describe, expect, it } from "vitest";
import type { Bench, Chase, ContactFn, WidgetDecl } from "@hackbuild/spec";
import { widgetKinds } from "@hackbuild/ui-core";
import DrivePad from "../src/stage/DrivePad.vue";
import { widgetComponent, widgetComponentKinds, widgetsOf } from "../src/widgets/registry.js";

describe("ui widget registry", () => {
  it("maps every registered kind to a component, drive.tilt to the drive pad", () => {
    expect(widgetComponentKinds()).toEqual(widgetKinds());
    expect(widgetComponent("drive.tilt")).toBe(DrivePad);
  });

  it("a kind with no component refuses", () => {
    expect(() => widgetComponent("view.none")).toThrow("widget kind view.none has no component");
  });

  it("widgetsOf reads the bench's widgets with the pad's contact", () => {
    const decl: WidgetDecl = { id: "stick", kind: "drive.tilt", fn: "contact", inputs: {}, outputs: ["targets"], tolerance: 0.01, region: "stage.overlay" };
    const drive = { targets: "metrics.keys", gesture: "tilt", contact: "contact", readout: [], pickInView: false } as const;
    const bench = { views: { overlays: ["drive"], drive, widgets: [decl] } } as unknown as Bench;
    const chase = { hookup: [] } as unknown as Chase;
    const contact: ContactFn = () => ({ closed: [] });
    const src = { part: null, report: {} };
    const [rec] = widgetsOf(chase, bench, contact, src);
    expect(rec?.problem).toBe("no drive targets in this build. build the design first.");
    const [none] = widgetsOf(chase, bench, null, src);
    expect(none?.problem).toBe("this bench carries no contact function; the pad cannot drive");
    expect(widgetsOf(chase, { views: { overlays: [] } } as unknown as Bench, contact, src)).toEqual([]);
  });
});
