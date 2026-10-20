// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The drive.press and plot.curve components (R1-engine-13) on the toy
// press (fixtures/press-toy.ts): the press key drags down to a travel and
// springs back to zero on release, the plot draws the band, the contact
// line and the cursor of the ui-core plot.curve model, and both read the
// lines ui-core writes. Every expected number is the toy's, by hand.

import { describe, expect, it } from "vitest";
import { createApp, h, nextTick, type Component } from "vue";
import { plotLines, widgetModel, type PlotModel, type PressModel } from "@hackbuild/ui-core";
import DrivePress from "../src/widgets/DrivePress.vue";
import PlotCurve from "../src/widgets/PlotCurve.vue";
import { widgetComponent } from "../src/widgets/registry.js";
import { TOY_PLOT, TOY_PRESS, TOY_STOP_MM, toyBuild } from "./fixtures/press-toy.js";

function mount(c: Component, props: Record<string, unknown>): { el: HTMLElement; done: () => void } {
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp({ render: () => h(c, props) });
  app.mount(el);
  return { el, done: () => { app.unmount(); el.remove(); } };
}

const press = (t?: number): PressModel => widgetModel(TOY_PRESS, toyBuild(t)) as PressModel;
const plot = (t?: number): PlotModel => widgetModel(TOY_PLOT, toyBuild(t)) as PlotModel;

describe("drive.press component", () => {
  it("is the registry's component for drive.press, and plot.curve's is PlotCurve", () => {
    expect(widgetComponent("drive.press")).toBe(DrivePress);
    expect(widgetComponent("plot.curve")).toBe(PlotCurve);
  });

  it("drags the key down to a travel and springs back to zero on release", async () => {
    const sent: number[] = [];
    const { el, done } = mount(DrivePress, { model: press(0.7), onTravel: (mm: number) => sent.push(mm) });
    await nextTick();
    expect(el.querySelector('[data-hb="press-read"]')?.textContent?.trim()).toBe("travel 0.7 mm, force 1 N computed, closed");
    const key = el.querySelector<HTMLElement>('[data-hb="press-key"]')!;
    expect(key.getAttribute("aria-valuenow")).toBe("0.7");
    expect(key.classList.contains("is-on")).toBe(true);
    key.dispatchEvent(new PointerEvent("pointerdown", { clientY: 0, pointerId: 1 }));
    key.dispatchEvent(new PointerEvent("pointermove", { clientY: 0.5, pointerId: 1 }));
    key.dispatchEvent(new PointerEvent("pointermove", { clientY: 9, pointerId: 1 }));
    key.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    // happy-dom lays out nothing, so the key is 1 unit high: half a unit is half the stop, and the stop caps the drag.
    expect(sent).toEqual([TOY_STOP_MM / 2, TOY_STOP_MM, 0]);
    done();
  });

  it("steps from the keyboard and names a refusal in the readout", async () => {
    const sent: number[] = [];
    const { el, done } = mount(DrivePress, { model: press(0), onTravel: (mm: number) => sent.push(mm) });
    await nextTick();
    el.querySelector<HTMLElement>('[data-hb="press-key"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(sent).toEqual([TOY_STOP_MM / 20]);
    done();
    const bare = widgetModel(TOY_PRESS, { ...toyBuild(), claimFns: {} }) as PressModel;
    const r = mount(DrivePress, { model: bare });
    await nextTick();
    expect(r.el.querySelector('[data-hb="press-key"]')).toBeNull();
    expect(r.el.querySelector('[data-hb="press-read"]')?.textContent).toContain("carries no claim function toy.forceAt");
    r.done();
  });
});

describe("plot.curve component", () => {
  it("draws the band, the contact, the curve, the peak and the cursor of the widget model, with qualified lines", async () => {
    const m = plot(0.25);
    expect(m.view.band).toEqual({ lo: 0.8, hi: 1.2 });
    expect(m.view.cursor).toEqual({ travelMm: 0.25, forceN: 0.5, closed: false });
    const lines = plotLines(m);
    const sent: number[] = [];
    const { el, done } = mount(PlotCurve, { view: m.view, plotId: m.id, xUnit: m.units.x, yUnit: m.units.y, ...lines, onTravel: (mm: number) => sent.push(mm) });
    await nextTick();
    for (const id of ["plot-band", "plot-contact", "plot-line", "plot-peak", "plot-cursor"]) expect(el.querySelector(`[data-hb="${id}"]`), id).not.toBeNull();
    expect(el.querySelector('[data-hb="plot-readout"]')?.textContent).toBe("travel 0.25 mm, force 0.5 N computed, open");
    expect(el.querySelector('[data-hb="plot-band-line"]')?.textContent).toBe("claim press band 0.8 to 1.2 N, inferred until a coupon backs it");
    expect(el.querySelector('[data-hb="plot-svg"]')?.getAttribute("style")).toContain("width: 100%");
    const range = el.querySelector<HTMLInputElement>('[data-hb="plot-drive"] input[type="range"]')!;
    range.value = "0.7";
    range.dispatchEvent(new Event("input"));
    expect(sent).toEqual([0.7]);
    done();
  });
});
