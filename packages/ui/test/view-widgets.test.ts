// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The drive.code, view.light and view.netlens components (R1-engine-15)
// on toy builds: a three wheel lock cut 1 2 0 with digits 0 to 2 whose
// gate opens only on the cut code, and two nets, A on one body and B on
// two. A wheel click emits the stepped code, a light range emits the aim,
// a net button emits the net; each draws the line ui-core writes.

import { describe, expect, it } from "vitest";
import { createApp, h, nextTick, type Component } from "vue";
import type { Feature, WidgetDecl } from "@hackbuild/spec";
import { widgetModel, type CodeModel, type LightAim, type LightModel, type NetlensModel, type WidgetBuild, type WidgetCodeGate } from "@hackbuild/ui-core";
import DriveCode from "../src/widgets/DriveCode.vue";
import ViewLight from "../src/widgets/ViewLight.vue";
import ViewNetlens from "../src/widgets/ViewNetlens.vue";
import { widgetComponent } from "../src/widgets/registry.js";

function mount(c: Component, props: Record<string, unknown>): { el: HTMLElement; done: () => void } {
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp({ render: () => h(c, props) });
  app.mount(el);
  return { el, done: () => { app.unmount(); el.remove(); } };
}

const gate: WidgetCodeGate = {
  cut: [1, 2, 0],
  max: 2,
  solve: (u) => ({ allOk: u.KEY > 0.85 && u.WRONG === 0, pins: [0, 1, 2].map(() => ({ ok: u.KEY > 0.85 && u.WRONG === 0 })) }),
};
const decl = (kind: WidgetDecl["kind"], fn: string): WidgetDecl => ({ id: kind, kind, fn, inputs: {}, outputs: [], tolerance: 0.01, region: "stage.overlay" });
const build = (over: Partial<WidgetBuild> = {}): WidgetBuild => ({ features: [], metrics: [], results: [], hookup: [], contacts: {}, ...over });

describe("view widget components", () => {
  it("are the registry's components for drive.code, view.light and view.netlens", () => {
    expect(widgetComponent("drive.code")).toBe(DriveCode);
    expect(widgetComponent("view.light")).toBe(ViewLight);
    expect(widgetComponent("view.netlens")).toBe(ViewNetlens);
  });

  it("drive.code steps a wheel and reads the gate's verdict", async () => {
    const sent: number[][] = [];
    const m = widgetModel(decl("drive.code", "toy"), build({ gates: { toy: gate }, codes: { "drive.code": [1, 2, 2] } })) as CodeModel;
    const r = mount(DriveCode, { model: m, onCode: (_: string, c: number[]) => sent.push(c) });
    await nextTick();
    const wheels = [...r.el.querySelectorAll<HTMLButtonElement>("[data-hb=code-wheel]")];
    expect(wheels.map((b) => b.textContent)).toEqual(["1", "2", "2"]);
    wheels[2]!.click();
    expect(sent).toEqual([[1, 2, 0]]);
    expect(r.el.querySelector("[data-hb=code-read]")?.textContent?.trim()).toBe("1 2 2 stays locked, 0 pins at the shear line (computed)");
    r.done();
    const open = widgetModel(decl("drive.code", "toy"), build({ gates: { toy: gate }, codes: { "drive.code": [1, 2, 0] } })) as CodeModel;
    const o = mount(DriveCode, { model: open });
    await nextTick();
    expect(o.el.querySelector("[data-hb=code-read]")?.textContent?.trim()).toBe("1 2 0 opens, every pin at the shear line (computed)");
    o.done();
  });

  it("view.light emits the aim with the moved axis", async () => {
    const sent: LightAim[] = [];
    const m = widgetModel(decl("view.light", "key"), build({ lights: { "view.light": { azDeg: 10, elDeg: 20 } } })) as LightModel;
    const r = mount(ViewLight, { model: m, onAim: (_: string, a: LightAim) => sent.push(a) });
    await nextTick();
    const up = r.el.querySelector<HTMLInputElement>("[data-hb=light-el] input")!;
    up.value = "45";
    up.dispatchEvent(new Event("input"));
    expect(sent).toEqual([{ azDeg: 10, elDeg: 45 }]);
    expect(r.el.querySelector("[data-hb=light-read]")?.textContent?.trim()).toBe("key light at 10 deg around, 20 deg up");
    r.done();
  });

  it("view.netlens marks the lit net and emits a picked one", async () => {
    const sent: string[] = [];
    const bodies = [{ id: "a1" }, { id: "b1" }, { id: "b2" }];
    const features = bodies.map((b) => ({ kind: "trace", id: b.id, net: b.id.startsWith("a") ? "A" : "B" })) as unknown as Feature[];
    const m = widgetModel(decl("view.netlens", "nets"), build({ bodies, features, lenses: { "view.netlens": "B" } })) as NetlensModel;
    const r = mount(ViewNetlens, { model: m, onLens: (_: string, n: string) => sent.push(n) });
    await nextTick();
    const nets = [...r.el.querySelectorAll<HTMLButtonElement>("[data-hb=netlens-net]")];
    expect(nets.map((b) => [b.dataset["net"], b.getAttribute("aria-pressed")])).toEqual([["A", "false"], ["B", "true"]]);
    nets[0]!.click();
    expect(sent).toEqual(["A"]);
    expect(r.el.querySelector("[data-hb=netlens-read]")?.textContent?.trim()).toBe("net B lights 2 bodies: b1, b2");
    r.done();
  });
});
