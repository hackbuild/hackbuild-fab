// @vitest-environment happy-dom
/// <reference path="../src/vue-shim.d.ts" />
// The draft page in the ui (plan v9 3.1, R1-engine-24): a draft page build
// names every download DRAFT_ and sets draft, which puts the DRAFT banner
// first in the status strip; a release page has neither. A draft's inline
// widget draws into the element beside the banner. The flex-pair chase and
// bench are the reference's own files.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { Part } from "@hackbuild/spec";
import { mountBench, pageBench, type DraftWidget, type MountedBench, type PageBuildLike } from "../src/bench/entry.js";
import { chase as flexChase } from "../../../reference/keys/flex-pair/chase.js";
import { bench as flexBench } from "../../../reference/keys/flex-pair/bench.js";

const page = (draft: boolean): PageBuildLike => ({
  facts: { name: "flex-pair" },
  ...(draft ? { draft: true } : {}),
  build: async () => ({ buildHash: "h1", part: { id: "p", bodies: [] } as unknown as Part, metrics: [], results: [], warnings: [], meshes: {} }),
  exportFile: async (kind) => ({ name: `flex-pair.${kind}`, media: "model/3mf", bytes: new Uint8Array([1]), results: [] }),
});

let el: HTMLElement;
let mounted: MountedBench | null = null;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  el = document.createElement("div");
  document.body.append(el);
});

afterEach(() => {
  mounted?.unmount();
  mounted = null;
  el.remove();
  vi.restoreAllMocks();
});

const settle = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
};

describe("draft page in the ui", () => {
  it("a draft page build names every download DRAFT_ and sets draft; a release page does neither", () => {
    const d = pageBench(page(true));
    expect(Object.values(d.writers ?? {}).map((w) => w.file).sort()).toEqual(["DRAFT_flex-pair-card.txt", "DRAFT_flex-pair-stl.zip", "DRAFT_flex-pair.3mf"]);
    expect(d.draft).toBe(true);
    const r = pageBench(page(false));
    expect(Object.values(r.writers ?? {}).map((w) => w.file).sort()).toEqual(["flex-pair-card.txt", "flex-pair-stl.zip", "flex-pair.3mf"]);
    expect("draft" in r).toBe(false);
  });

  it("the banner opens the status strip on a draft and is absent otherwise", async () => {
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false, draft: true });
    await settle();
    const banner = el.querySelector('[data-hb="status"] [data-hb="draft-banner"]');
    expect(banner?.textContent).toContain("run hbf adopt");
    mounted?.unmount();
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false });
    await settle();
    expect(el.querySelector('[data-hb="draft-banner"]')).toBeNull();
  });

  it("the inline widget draws its model beside the banner", async () => {
    const widget: DraftWidget = {
      id: "width",
      model: (state) => ({ w: Number(state["W"]) }),
      render: (host, m) => { host.textContent = `width ${String(m["w"])} mm`; },
    };
    mounted = mountBench({ chase: flexChase, bench: flexBench, el, kernel: false, hook: false, stage: false, draft: true, widget });
    await settle();
    const host = el.querySelector('[data-hb="draft-widget"]');
    expect(host?.getAttribute("data-widget")).toBe("width");
    expect(host?.textContent).toMatch(/^width \d+(\.\d+)? mm$/);
  });
});
