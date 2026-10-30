// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// createBench returns a controller whose page effects are all opt-in: no
// BENCH on globalThis, no data-kernel, no location.hash read unless the
// option is set. mountBench is createBench with every effect on.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { Chase } from "@hackbuild/spec";
import { BenchRefusal, createBench, mountBench, type BenchController, type MountedBench } from "../src/bench/entry.js";
import * as surface from "../src/index.js";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench.js";

let el: HTMLElement;
let made: BenchController | null = null;
let mounted: MountedBench | null = null;

const settle = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
};

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    // storage may be absent
  }
  delete (globalThis as Record<string, unknown>)["BENCH"];
  delete document.documentElement.dataset["kernel"];
  el = document.createElement("div");
  document.body.append(el);
});

afterEach(() => {
  made?.unmount();
  mounted?.unmount();
  made = null;
  mounted = null;
  el.remove();
  delete (globalThis as Record<string, unknown>)["BENCH"];
  vi.restoreAllMocks();
});

describe("createBench", () => {
  it("is exported from the package index with its controller types", () => {
    expect(surface.createBench).toBe(createBench);
    expect(surface.mountBench).toBe(mountBench);
  });

  it("returns core, binding, mount and unmount, and leaves the page alone by default", async () => {
    made = createBench({ chase: flexChase, bench: flexBench, stage: false });
    await settle();
    expect(made.core).toBe(made.binding.core);
    expect(typeof made.mount).toBe("function");
    expect(typeof made.unmount).toBe("function");
    expect((globalThis as Record<string, unknown>)["BENCH"]).toBeUndefined();
    expect(document.documentElement.dataset["kernel"]).toBeUndefined();
    expect(el.children.length).toBe(0);
  });

  it("mounts the shell into the element it is given and unmounts it", async () => {
    made = createBench({ chase: flexChase, bench: flexBench, stage: false });
    made.mount(el);
    await settle();
    expect(el.children.length).toBeGreaterThan(0);
    expect(() => made?.mount(el)).toThrow("already mounted");
    made.unmount();
    expect(el.children.length).toBe(0);
    made = null;
  });

  it("answers BENCH only when hook is set", async () => {
    made = createBench({ chase: flexChase, bench: flexBench, stage: false, hook: true });
    await settle();
    expect((globalThis as Record<string, unknown>)["BENCH"]).toBeDefined();
  });

  it("reads location.hash only when hash is set", async () => {
    const seen = vi.spyOn(window, "location", "get");
    made = createBench({ chase: flexChase, bench: flexBench, stage: false });
    await settle();
    const without = seen.mock.calls.length;
    made.unmount();
    made = createBench({ chase: flexChase, bench: flexBench, stage: false, hash: true });
    await settle();
    expect(seen.mock.calls.length).toBeGreaterThan(without);
  });

  it("boots the manifold from page globals only when globals is set, and writes data-kernel only with dataset", async () => {
    made = createBench({ chase: flexChase, bench: flexBench, stage: false, globals: true });
    await settle();
    expect(document.documentElement.dataset["kernel"]).toBeUndefined();
    expect(made.core.log.some((l: string) => l.startsWith("kernel failed: jszip missing from the page"))).toBe(true);
    made.unmount();
    made = createBench({ chase: flexChase, bench: flexBench, stage: false, globals: true, dataset: true });
    await settle();
    expect(document.documentElement.dataset["kernel"]).toBe("failed");
  });

  it("refuses a kind without a region map by throwing a BenchRefusal", () => {
    const chase = { ...flexChase, meta: { ...flexChase.meta, kind: "surface" } } as unknown as Chase;
    expect(() => createBench({ chase, bench: flexBench })).toThrow(BenchRefusal);
  });
});

describe("mountBench", () => {
  it("turns the effects on: BENCH, data-kernel and the mount", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, stage: false });
    await settle();
    expect(mounted).not.toBeNull();
    expect((globalThis as Record<string, unknown>)["BENCH"]).toBeDefined();
    expect(document.documentElement.dataset["kernel"]).toBe("failed");
    expect(el.children.length).toBeGreaterThan(0);
  });

  it("keeps kernel false and hook false as before", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, stage: false, kernel: false, hook: false });
    await settle();
    expect((globalThis as Record<string, unknown>)["BENCH"]).toBeUndefined();
    expect(document.documentElement.dataset["kernel"]).toBeUndefined();
  });
});
