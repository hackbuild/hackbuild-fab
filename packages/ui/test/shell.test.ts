// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// M09-T07 acceptance: the bench shell mounts the single and composer kinds
// from hackbuild-ui parts, refuses a kind without a region map, logs a rail
// whose last step is not the export step, and holds exports until the mesh
// is current. The flex-pair chase and bench are the reference's own files.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { defineBench, type Bench, type Chase } from "@hackbuild/spec";
import { mountBench, NO_BUILD, type BenchBuild, type MountedBench } from "../src/bench/entry.js";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench.js";
import { PIP_LAYOUT } from "./fixtures/pip-layout.js";

let el: HTMLElement;
let mounted: MountedBench | null = null;
let errors: string[] = [];

beforeEach(() => {
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => void errors.push(a.map(String).join(" ")));
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

function deferredBuild(): { build: BenchBuild; calls: number; release(): void } {
  let open: (() => void) | null = null;
  const o = {
    calls: 0,
    build: (async () => {
      o.calls += 1;
      await new Promise<void>((r) => (open = r));
      return {
        part: { part: { id: "p", bodies: [], features: [] }, meshes: {} },
        report: { results: [], metrics: [], tris: 12, dims: [60, 30, 2.41], fitsBed: true },
        buildHash: "h",
      };
    }) as unknown as BenchBuild,
    release(): void {
      open?.();
    },
  };
  return o;
}

const text = (sel: string): string => el.querySelector(sel)?.textContent?.trim() ?? "";

describe("shell kinds", () => {
  it("an unknown kind refuses to mount and the error names it", () => {
    const chase = { ...flexChase, meta: { ...flexChase.meta, kind: "surface" } } as unknown as Chase;
    mounted = mountBench({ chase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    expect(mounted).toBeNull();
    expect(el.children.length).toBe(0);
    expect(errors.some((e) => e.includes("bench kind surface has no region map"))).toBe(true);
  });

  it("a rail ending in a step other than print or make logs the error", async () => {
    const bench = { ...flexBench, rail: flexBench.rail?.slice(0, 3) } as Bench;
    mounted = mountBench({ chase: flexChase, bench, el, kernel: false, hook: false, stage: false });
    await settle();
    expect(errors.filter((e) => e.startsWith("rail ends in wire;"))).toHaveLength(1);
  });

  it("a rail ending in print logs nothing", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    await settle();
    expect(errors).toEqual([]);
  });

  it("single kind: header, steps, guide, welcome and both rails from the flex-pair bench", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    await settle();
    expect(text(".hb-header h1")).toBe("FLEX PAIR.bench");
    expect([...el.querySelectorAll(".hb-steps .hb-tab")].map((t) => t.textContent?.replace(/\d/g, "").trim())).toEqual(["pad", "keys", "wire", "print"]);
    expect(text(".hb-guide-step")).toBe("step 1 pad");
    expect(text(".hb-guide-goal")).toBe(flexBench.rail?.[0]?.goal);
    expect(el.querySelector('[data-hb="welcome"]')).not.toBeNull();
    expect(el.querySelector('[data-hb="rail-left"] [data-group="pad"]')).not.toBeNull();
    // Step 1 declares no readout panel: no right rail, the stage takes its width, the log sits in the status drawer.
    expect(el.querySelector(".hb-rail")).toBeNull();
    expect(el.querySelector(".hbf-bench")?.classList.contains("is-no-readouts")).toBe(true);
    expect(el.querySelector("[data-hb='log']")).toBeNull();
    (el.querySelector('[data-hb="log-toggle"]') as HTMLElement).click();
    await settle();
    expect(el.querySelector("[data-hb='log-drawer'] [data-hb='log']")).not.toBeNull();
    (el.querySelectorAll(".hb-steps .hb-tab")[1] as HTMLElement).click();
    await settle();
    expect(el.querySelector(".hb-rail [data-hb='fits']")).not.toBeNull();
    expect(el.querySelector(".hbf-bench")?.classList.contains("is-no-readouts")).toBe(false);
    expect(el.querySelector('[data-hb="legend"]')).not.toBeNull();
    expect(el.querySelector('[data-hb="legend-chips"]')).not.toBeNull();
    expect(el.querySelector('[data-hb="guide"]')).not.toBeNull();
  });

  it("composer kind: params in the right rail, no left rail", async () => {
    const chase = { ...flexChase, meta: { ...flexChase.meta, id: "kit-composer", kind: "composer" }, params: PIP_LAYOUT } as unknown as Chase;
    const bench = defineBench(chase, { shell: "paper", views: { default: "assembled", modes: ["assembled"], render: ["solid"], overlays: ["welcome"] },
      rail: [{ step: "layout", goal: "shape the body", panels: ["params.body", "params.groups"] }, { step: "print", goal: "export", panels: ["exports"] }] });
    mounted = mountBench({ chase, bench, el, kernel: false, hook: false, stage: false });
    await settle();
    expect(el.querySelector('[data-hb="rail-left"]')).toBeNull();
    expect(el.querySelector('.hb-rail [data-group="body"]')).not.toBeNull();
    expect(el.querySelector('.hb-rail [data-group="groups"]')).not.toBeNull();
  });
});

describe("shell behaviour", () => {
  it("welcome dismiss is remembered and Guide reopens it", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    await settle();
    (el.querySelector('[data-hb="welcome-dismiss"]') as HTMLElement).click();
    await settle();
    expect(el.querySelector('[data-hb="welcome"]')).toBeNull();
    expect(localStorage.getItem("hbf.keys-flex-pair.welcome")).toBe("dismissed");
    (el.querySelector('[data-hb="guide"]') as HTMLElement).click();
    await settle();
    expect(el.querySelector('[data-hb="welcome"]')).not.toBeNull();
  });

  it("the export step runs the build; exports wait for mesh current with the reason", async () => {
    const b = deferredBuild();
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false, build: b.build });
    await settle();
    b.release();
    await settle(10);
    const before = b.calls;
    mounted?.core.set("W", 70);
    mounted?.core.commit();
    await settle();
    (el.querySelectorAll(".hb-steps .hb-tab")[3] as HTMLElement).click();
    await settle();
    expect(b.calls).toBe(before + 1);
    const why = [...el.querySelectorAll('[data-hb="export-why"]')].map((x) => x.textContent?.trim());
    expect(why.length).toBe(flexChase.exports.length);
    expect(new Set(why)).toEqual(new Set(["mesh stale, building"]));
    expect([...el.querySelectorAll<HTMLButtonElement>('[data-hb="export"]')].every((x) => x.disabled)).toBe(true);
    expect(text('[data-hb="chip-mesh"]')).toBe("mesh stale");
    b.release();
    await settle(10);
    expect(text('[data-hb="chip-mesh"]')).toBe("mesh current");
    expect(el.querySelector<HTMLButtonElement>('[data-hb="export"][data-kind="json"]')?.disabled).toBe(false);
    expect(el.querySelector<HTMLButtonElement>('[data-hb="export"][data-kind="3mf"]')?.disabled).toBe(true);
    expect(text('[data-hb="export-row"][data-kind="3mf"] [data-hb="export-why"]')).toBe("3mf export is not in this bake yet.");
    expect(text('[data-hb="dims"]')).toBe("60 x 30 x 2.41 mm");
  });

  it("done badges follow the step's checks, visited is its own mark, and the bed chip reads CHK-PRT-16", async () => {
    const fail = (id: string, param?: string) => ({ id, verdict: "fail", target: { level: "part", part: "p" },
      ...(param === undefined ? {} : { fix: { param, set: 1.6, paramLegal: [1.28, 1.6], predicts: { measured: 1.6, verdict: "pass" } } }) });
    const build = (async () => ({
      part: { part: { id: "p", bodies: [], features: [] }, meshes: {} },
      report: { results: [fail("CHK-KEY-01", "/keys/0/gap"), fail("CHK-PRT-16")], metrics: [], fitsBed: true },
      buildHash: "h",
    })) as unknown as BenchBuild;
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false, build });
    await settle(400);
    const tabs = (): HTMLElement[] => [...el.querySelectorAll<HTMLElement>(".hb-steps .hb-tab")];
    expect(tabs().map((t) => t.classList.contains("is-done"))).toEqual([true, false, true, false]);
    expect(tabs().map((t) => t.dataset["visited"])).toEqual(["true", "false", "false", "false"]);
    tabs()[2]?.click();
    await settle();
    expect(tabs().map((t) => t.dataset["visited"])).toEqual(["true", "false", "true", "false"]);
    expect(text('[data-hb="chip-bed"]')).toBe("over bed");
  });

  it("a rail edit reaches the core as one commit, and undo restores it", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    await settle();
    const rev = mounted?.core.rev ?? 0;
    const r = el.querySelector('[data-field="W"] input[type="range"]') as HTMLInputElement;
    r.value = "70";
    r.dispatchEvent(new Event("input", { bubbles: true }));
    r.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(mounted?.core.rev).toBe(rev + 1);
    expect(mounted?.core.state["W"]).toBe(70);
    await settle(500);
    mounted?.core.undo();
    await settle();
    expect(mounted?.core.state["W"]).toBe(60);
    expect((el.querySelector('[data-field="W"] input[type="number"]') as HTMLInputElement).value).toBe("60");
  });

  it("without a build the status names why and BENCH still reaches ready", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, stage: false });
    await settle(20);
    const hook = (globalThis as unknown as { BENCH: { ready: boolean; log: string[] } }).BENCH;
    expect(hook.ready).toBe(true);
    expect(text('[data-hb="status-error"]')).toBe(NO_BUILD);
    expect(errors).toEqual([]);
  });
});
