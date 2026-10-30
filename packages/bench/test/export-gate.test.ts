// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// M09-T11 step 3 in the shell: BENCH answers from mountBench with the
// chase's exports, a fabrication kind with a blocking failed check is
// refused before anything is written, and the exports panel keeps that
// kind disabled and names the check. The refusal wording is typed here
// from the card, never read from the module under test.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, type App } from "vue";
import type { BenchHook, CheckResult } from "@hackbuild/spec";
import { mountBench, type BenchBuild, type MountedBench } from "../src/bench/entry.js";
import ExportsPanel from "../src/panels/ExportsPanel.vue";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench.js";

const BLOCK = { id: "CHK-KEY-01", verdict: "fail", severity: "block" } as unknown as CheckResult;
const WARN = { id: "CHK-KEY-02", verdict: "fail", severity: "warn" } as unknown as CheckResult;

let el: HTMLElement;
let mounted: MountedBench | null = null;
let app: App | null = null;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  el = document.createElement("div");
  document.body.append(el);
});

afterEach(() => {
  mounted?.unmount();
  mounted = null;
  app?.unmount();
  app = null;
  el.remove();
  delete (globalThis as Record<string, unknown>)["BENCH"];
  vi.restoreAllMocks();
});

const buildWith = (results: CheckResult[]): BenchBuild =>
  (async () => ({
    part: { part: { id: "p", bodies: [], features: [] }, meshes: {} },
    report: { results, metrics: [{ id: "m", value: 1 }], tris: 12, dims: [60, 30, 2.41], fitsBed: true },
    buildHash: "h1",
  })) as unknown as BenchBuild;

const hookOf = (): BenchHook => (globalThis as unknown as { BENCH: BenchHook }).BENCH;

describe("BENCH from mountBench", () => {
  it("is ready after the first build, settles, and its model carries the build's metrics", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, stage: false, build: buildWith([]) });
    const B = hookOf();
    await vi.waitFor(() => expect(B.ready).toBe(true));
    await B.settled(5000);
    expect(B.buildHash).toBe("h1");
    expect((B.model as { metrics: unknown[] }).metrics).toEqual([{ id: "m", value: 1 }]);
    expect(Buffer.from(await B.exportBytes("design"), "base64").toString("utf8")).toBe(B.designJson());
  });

  it("refuses a fabrication kind with a blocking fail and names the check; a warn fail does not refuse", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, stage: false, build: buildWith([BLOCK, WARN]) });
    const B = hookOf();
    await vi.waitFor(() => expect(B.ready).toBe(true));
    await expect(B.exportBytes("3mf")).rejects.toThrow("3mf export refused: CHK-KEY-01 failed. fix the finding, then export.");
    await expect(B.exportBytes("json")).resolves.toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("a declared kind with no writer in this bake says so after the gate passes", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, stage: false, build: buildWith([WARN]) });
    const B = hookOf();
    await vi.waitFor(() => expect(B.ready).toBe(true));
    await expect(B.exportBytes("stlzip")).rejects.toThrow("stl export is not in this bake yet");
    await expect(B.exportBytes("no-such-kind")).rejects.toThrow("unknown export kind: no-such-kind");
  });

  it("hook false leaves globalThis without BENCH", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, stage: false, hook: false, build: buildWith([]) });
    await nextTick();
    expect((globalThis as Record<string, unknown>)["BENCH"]).toBeUndefined();
  });
});

describe("exports panel gate", () => {
  it("a fabrication kind with a blocking fail stays disabled and names the check; free kinds stay enabled", async () => {
    app = createApp(ExportsPanel, {
      exports: [{ kind: "3mf" }, { kind: "json" }],
      current: true,
      writable: ["3mf", "json"],
      fabrication: ["3mf"],
      results: [BLOCK, WARN],
    });
    app.mount(el);
    await nextTick();
    const btn = (k: string): HTMLButtonElement | null => el.querySelector(`[data-hb="export"][data-kind="${k}"]`);
    expect(btn("3mf")?.disabled).toBe(true);
    expect(el.querySelector('[data-hb="export-row"][data-kind="3mf"] [data-hb="export-why"]')?.textContent?.trim())
      .toBe("3mf export refused: CHK-KEY-01 failed. fix the finding, then export.");
    expect(btn("json")?.disabled).toBe(false);
    expect(el.querySelector('[data-hb="export-row"][data-kind="json"] [data-hb="export-why"]')).toBeNull();
  });

  it("with only warn fails every writable kind is enabled", async () => {
    app = createApp(ExportsPanel, { exports: [{ kind: "3mf" }], current: true, writable: ["3mf"], fabrication: ["3mf"], results: [WARN] });
    app.mount(el);
    await nextTick();
    expect(el.querySelector<HTMLButtonElement>('[data-hb="export"][data-kind="3mf"]')?.disabled).toBe(false);
  });
});
