// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The status strip's copy and the no-WebGL line in the log. The warnings chip
// counts the fail and warn findings the checks panel lists (G-36) and agrees
// with the count in number: "1 warning", "2 warnings", "no warnings".
// tools/smoke/gold/warnings.spec.ts reads the chip with /^(\d+)/ and "no
// warnings". The stage mounts here against happy-dom, whose canvas answers
// no WebGL context, so the shell meets the viewer's `glunavailable` event.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { mountBench, type BenchBuild, type MountedBench } from "../src/bench/entry.js";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench.js";

let el: HTMLElement;
let mounted: MountedBench | null = null;
let consoleErrors: string[] = [];

beforeEach(() => {
  consoleErrors = [];
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void consoleErrors.push(a.map(String).join(" ")));
  try {
    localStorage.clear();
  } catch {
    // storage may be absent; the shell boots without it
  }
  el = document.createElement("div");
  document.body.append(el);
});

afterEach(() => {
  mounted?.unmount();
  mounted = null;
  el.remove();
  vi.restoreAllMocks();
});

const settle = async (ms = 0): Promise<void> => {
  await new Promise((r) => setTimeout(r, ms));
  await nextTick();
};

const text = (sel: string): string => el.querySelector(sel)?.textContent?.trim() ?? "";

/** A build whose report holds `fails` failing and `warns` warning findings. */
const buildWith = (fails: number, warns: number): BenchBuild => (async () => ({
  part: { part: { id: "p", bodies: [], features: [] }, meshes: {} },
  report: {
    results: [
      ...Array.from({ length: fails }, (_, i) => ({ id: `CHK-A-${i}`, verdict: "fail", target: { level: "part", part: "p" } })),
      ...Array.from({ length: warns }, (_, i) => ({ id: `CHK-B-${i}`, verdict: "warn", target: { level: "part", part: "p" } })),
      { id: "CHK-C-0", verdict: "pass", target: { level: "part", part: "p" } },
    ],
    metrics: [],
    fitsBed: true,
  },
  buildHash: "h",
})) as unknown as BenchBuild;

describe("the warnings chip", () => {
  const chip = async (fails: number, warns: number): Promise<string> => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false, build: buildWith(fails, warns) });
    await settle(400);
    return text('[data-hb="chip-warn"]');
  };

  it("reads no warnings at zero, with the good class", async () => {
    expect(await chip(0, 0)).toBe("no warnings");
    expect(el.querySelector('[data-hb="chip-warn"]')?.classList.contains("is-good")).toBe(true);
  });

  it("reads 1 warning at one finding, a fail or a warn, with the bad class", async () => {
    expect(await chip(1, 0)).toBe("1 warning");
    expect(el.querySelector('[data-hb="chip-warn"]')?.classList.contains("is-bad")).toBe(true);
    mounted?.unmount();
    el.replaceChildren();
    expect(await chip(0, 1)).toBe("1 warning");
  });

  it("reads 2 warnings at two findings and 5 warnings at five", async () => {
    expect(await chip(1, 1)).toBe("2 warnings");
    mounted?.unmount();
    el.replaceChildren();
    expect(await chip(3, 2)).toBe("5 warnings");
  });

  it("the gold reader's count and word agree: /^(\\d+)/ gives the count, and 1 takes the singular", async () => {
    const t = await chip(1, 0);
    expect(Number(/^(\d+)/.exec(t)?.[1])).toBe(1);
    expect(t).not.toMatch(/warnings/);
  });
});

describe("a stage with no WebGL", () => {
  it("logs one line naming the failure and what still works, and the page raises no console error", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: true });
    await settle(20);
    const viewer = el.querySelector("hb-viewer");
    expect(viewer?.getAttribute("data-webgl")).toBe("none");
    expect(viewer?.shadowRoot?.querySelector('[data-hb="no-webgl"]')?.textContent).toMatch(/^no webgl in this browser/);
    const lines = (mounted?.core.log ?? []).filter((l) => l.startsWith("3d view off"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("3d view off, no webgl in this browser (webgl2 context is null). build, checks and exports still run.");
    expect(consoleErrors).toEqual([]);
  });
});
