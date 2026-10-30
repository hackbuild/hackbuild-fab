// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// BenchView draws a createBench controller inside a host app's own tree.
// The shell store it reads is the controller's Pinia: the host's when the
// host passed it, the controller's own otherwise. mount(el) is unchanged.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { createPinia } from "pinia";
import { BenchView, createBench, useShell, type BenchController } from "../src/index.js";
import { chase } from "../../../reference/keys/flex-pair/chase.js";
import { bench } from "../../../reference/keys/flex-pair/bench.js";

const settle = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
};

let els: HTMLElement[] = [];
let apps: App[] = [];
let made: BenchController[] = [];

const host = (): HTMLElement => {
  const el = document.createElement("div");
  document.body.append(el);
  els.push(el);
  return el;
};
const make = (pinia?: ReturnType<typeof createPinia>): BenchController => {
  const c = createBench({ chase, bench, stage: false, ...(pinia === undefined ? {} : { pinia }) });
  made.push(c);
  return c;
};
/** What a view's width field shows, read from the shell store the view resolved. */
const shownW = (el: Element): string => (el.querySelector('[data-field="W"] input[type="number"]') as HTMLInputElement).value;
const render = (app: App, el: HTMLElement): void => {
  apps.push(app);
  app.mount(el);
};

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // storage may be absent
  }
});

afterEach(() => {
  for (const a of apps) a.unmount();
  for (const c of made) c.unmount();
  for (const e of els) e.remove();
  apps = [];
  made = [];
  els = [];
});

describe("BenchView in a host app with its own Pinia", () => {
  it("renders the shell and the shell store mirrors the core", async () => {
    const hostPinia = createPinia();
    const controller = make(hostPinia);
    expect(controller.pinia).toBe(hostPinia);
    const el = host();
    const app = createApp({ render: () => h("main", { class: "host" }, [h(BenchView, { bench: controller })]) });
    app.use(hostPinia);
    render(app, el);
    await settle();

    expect(el.querySelector('[data-hb="bench"]')).not.toBeNull();
    const shell = useShell(hostPinia);
    expect(shell.values).toEqual(controller.core.state);

    controller.core.set("W", 72);
    controller.core.commit();
    await settle();
    expect(controller.core.get("W")).toBe(72);
    expect(shownW(el)).toBe("72");
    expect(shell.rev).toBe(controller.core.rev);
    expect(shell.values).toEqual(controller.core.state);
  });

  it("reads the controller's own store when the host installed a different Pinia", async () => {
    const hostPinia = createPinia();
    const controller = make();
    expect(controller.pinia).not.toBe(hostPinia);
    const el = host();
    const app = createApp({ render: () => h(BenchView, { bench: controller }) });
    app.use(hostPinia);
    render(app, el);
    await settle();

    controller.core.set("W", 66);
    controller.core.commit();
    await settle();
    expect(useShell(controller.pinia).rev).toBe(controller.core.rev);
    expect(useShell(controller.pinia).values).toEqual(controller.core.state);
    expect(shownW(el)).toBe("66");
    expect(hostPinia.state.value["hbf-shell"]).toBeUndefined();
  });

  it("removes the shell when the view unmounts and leaves the controller usable", async () => {
    const controller = make();
    const el = host();
    const app = createApp({ render: () => h(BenchView, { bench: controller }) });
    render(app, el);
    await settle();
    expect(el.children.length).toBeGreaterThan(0);
    app.unmount();
    apps = [];
    expect(el.children.length).toBe(0);
    controller.core.set("W", 58);
    expect(controller.core.get("W")).toBe(58);
  });
});

describe("mount(el) with a supplied Pinia", () => {
  it("mounts into the element and mirrors into the pinia it was given", async () => {
    const pinia = createPinia();
    const controller = make(pinia);
    const el = host();
    controller.mount(el);
    await settle();
    expect(el.querySelector('[data-hb="bench"]')).not.toBeNull();
    controller.core.set("W", 64);
    controller.core.commit();
    await settle();
    expect(useShell(pinia).rev).toBe(controller.core.rev);
    expect(() => controller.mount(el)).toThrow("already mounted");
  });
});

describe("two controllers on one page", () => {
  it("keep separate core and shell state when each mounts on its own element", async () => {
    const a = make();
    const b = make();
    expect(a.pinia).not.toBe(b.pinia);
    a.mount(host());
    b.mount(host());
    await settle();

    a.core.set("W", 80);
    a.core.commit();
    await settle();
    expect(a.core.get("W")).toBe(80);
    expect(b.core.get("W")).not.toBe(80);
    expect(useShell(a.pinia).values).toEqual(a.core.state);
    expect(useShell(b.pinia).values).toEqual(b.core.state);
    expect(useShell(b.pinia).rev).toBe(b.core.rev);
    expect(useShell(a.pinia).rev).not.toBe(useShell(b.pinia).rev);
  });

  it("keep separate shell state when two views sit in one host app", async () => {
    const hostPinia = createPinia();
    const a = make();
    const b = make();
    const el = host();
    const app = createApp({ render: () => h("div", [h(BenchView, { bench: a, key: "a" }), h(BenchView, { bench: b, key: "b" })]) });
    app.use(hostPinia);
    render(app, el);
    await settle();
    expect(el.querySelectorAll('[data-hb="bench"]').length).toBe(2);

    b.core.set("W", 44);
    b.core.commit();
    await settle();
    expect(useShell(b.pinia).values).toEqual(b.core.state);
    expect(useShell(a.pinia).values).toEqual(a.core.state);
    expect(useShell(a.pinia).values).not.toEqual(useShell(b.pinia).values);
    const [viewA, viewB] = [...el.querySelectorAll('[data-hb="bench"]')];
    expect(shownW(viewB as Element)).toBe("44");
    expect(shownW(viewA as Element)).not.toBe("44");
  });
});
