// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The drive.touch, drive.fader and readout.signal components (R1-engine-14)
// on toy builds: one touch pad of 1 Mohm path and 9 Mohm skin at 10 pF, and
// one finger pot of 100 kohm track, 10 kohm return and 20 kohm dead legs on
// a 12 bit rp2040 pin. The pad holds while pressed and the slider emits a
// position for its pot; each draws the lines bench-core writes. Every expected
// number is the toy's, by hand: tau 10 Mohm x 10 pF = 100 us, settle 3 tau
// = 300 us; at the middle both legs are 60 kohm, 1.65 V of 3.3 V, 2048 of
// 4095 counts, swing 100 over 120 = 83.33 percent.

import { describe, expect, it } from "vitest";
import { createApp, h, nextTick, type Component } from "vue";
import type { CheckResult, HookupDecl, Metric, WidgetDecl } from "@hackbuild/spec";
import { widgetModel, type FaderModel, type SignalModel, type TouchModel, type WidgetBuild } from "@hackbuild/bench-core";
import DriveTouch from "../src/widgets/DriveTouch.vue";
import DriveFader from "../src/widgets/DriveFader.vue";
import ReadoutSignal from "../src/widgets/ReadoutSignal.vue";
import { widgetComponent } from "../src/widgets/registry.js";

function mount(c: Component, props: Record<string, unknown>): { el: HTMLElement; done: () => void } {
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp({ render: () => h(c, props) });
  app.mount(el);
  return { el, done: () => { app.unmount(); el.remove(); } };
}

const PAD: HookupDecl = { port: "port.T", mcu: "rp2040", pin: "GP1", read: { model: "charge-release", drive: "low", driveUs: 30, waitUs: 1000, waitSource: "default" } };
const WIPER: HookupDecl = { port: "port.W", mcu: "rp2040", pin: "GP26", read: { model: "adc", bits: 12, samples: 1, refV: 3.3 } };
const READ = {
  id: "CHK-NET-29", verdict: "warn", measured: 1e7, legal: { kind: "interval", lo: 0, hi: 1e8, unit: "ohm" }, constraint: "toy", origin: "hbf://check/CHK-NET-29",
  extra: { port: "port.T", pin: "GP1", mcu: "rp2040", pathOhm: 1e6, skinOhm: 9e6, cPf: 10, settleTaus: 3, waitUs: 1000, rejectOhm: 3.3e7, qualifier: "computed", waitQualifier: "inferred" },
} as unknown as CheckResult;
const rows: Metric[] = ([["Rtrack", 100e3], ["Rret", 10e3], ["Rdead", 20e3]] as const).map(([k, v]) => ({ id: `toy.gib.${k}`, value: v, qualifier: "computed", basis: "inferred" }) as Metric);
const build = (over: Partial<WidgetBuild> = {}): WidgetBuild => ({ features: [], metrics: rows, results: [READ], hookup: [PAD, WIPER], contacts: {}, ...over });
const decl = (kind: WidgetDecl["kind"], fn: string): WidgetDecl => ({ id: kind, kind, fn, inputs: {}, outputs: [], tolerance: 0.01, region: "stage.overlay" });

describe("drive.touch component", () => {
  it("is the registry's component for drive.touch, drive.fader and readout.signal", () => {
    expect(widgetComponent("drive.touch")).toBe(DriveTouch);
    expect(widgetComponent("drive.fader")).toBe(DriveFader);
    expect(widgetComponent("readout.signal")).toBe(ReadoutSignal);
  });

  it("holds a pad while pressed and reads the toy's path and timing", async () => {
    const sent: [string, boolean][] = [];
    const idle = widgetModel(decl("drive.touch", "CHK-NET-29"), build()) as TouchModel;
    const r = mount(DriveTouch, { model: idle, onTouch: (p: string, v: boolean) => sent.push([p, v]) });
    await nextTick();
    const pad = r.el.querySelector<HTMLElement>('[data-hb="touch-pad"]')!;
    expect(pad.textContent).toBe("T");
    expect(r.el.querySelector('[data-hb="touch-read"]')?.textContent?.trim()).toBe("GP1 idle: LOW at 0.1 V computed, open, leakage droop only, wait 1000 us inferred");
    pad.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1 }));
    expect(sent).toEqual([["port.T", true]]);
    r.done();
    const held = widgetModel(decl("drive.touch", "CHK-NET-29"), build({ closed: ["port.T"] })) as TouchModel;
    const t = mount(DriveTouch, { model: held, onTouch: (p: string, v: boolean) => sent.push([p, v]) });
    await nextTick();
    expect(t.el.querySelector('[data-hb="touch-read"]')?.textContent?.trim()).toBe("GP1 touched: HIGH at 3.3 V computed, path 10 Mohm with skin computed, tau 100 us, settle 300 us computed, wait 1000 us inferred");
    t.el.querySelector<HTMLElement>('[data-hb="touch-pad"]')!.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }));
    expect(sent).toEqual([["port.T", true], ["port.T", false]]);
    t.done();
  });
});

describe("drive.fader component", () => {
  it("emits the finger position for its pot and reads the toy's divider", async () => {
    const sent: [string, number][] = [];
    const m = widgetModel(decl("drive.fader", "toy"), build()) as FaderModel;
    const { el, done } = mount(DriveFader, { model: m, pot: "toy", onPosition: (p: string, v: number) => sent.push([p, v]) });
    await nextTick();
    expect(el.querySelector('[data-hb="fader-read"]')?.textContent?.trim()).toBe("finger at 50 percent, A leg 60 kohm, B leg 60 kohm computed, GP26 reads 1.65 V, 2048 counts computed, swing 83.33 percent");
    const range = el.querySelector<HTMLInputElement>('[data-hb="fader-drive"] input[type="range"]')!;
    range.value = "0.3";
    range.dispatchEvent(new Event("input"));
    expect(sent).toEqual([["toy", 0.3]]);
    done();
  });
});

describe("readout.signal component", () => {
  it("shows the wiper pin's counts and the touch pin's level", async () => {
    const w = mount(ReadoutSignal, { model: widgetModel(decl("readout.signal", "port.W"), build()) as SignalModel });
    await nextTick();
    expect(w.el.querySelector('[data-hb="signal-pin"]')?.textContent).toBe("GP26 2048 counts");
    expect(w.el.querySelector('[data-hb="signal-read"]')?.textContent?.trim()).toBe("GP26 reads 2048 counts, 1.65 V computed");
    w.done();
    const t = mount(ReadoutSignal, { model: widgetModel(decl("readout.signal", "port.T"), build({ closed: ["port.T"] })) as SignalModel });
    await nextTick();
    expect(t.el.querySelector('[data-hb="signal-pin"]')?.textContent).toBe("GP1 high");
    t.done();
  });
});
