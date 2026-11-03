// @vitest-environment happy-dom
// A host with no WebGL 2 context never gets a renderer: the element marks
// `data-webgl="none"`, fires `glunavailable`, shows one line on the stage and
// logs nothing to the console. The browser half, with no context removed from
// a real Chrome, is tools/smoke/no-webgl.spec.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const three = vi.hoisted(() => ({ made: [] as unknown[], failConstructor: false }));

vi.mock("three", async (importOriginal) => {
  const real = await importOriginal<typeof import("three")>();
  class FakeRenderer {
    localClippingEnabled = false;
    readonly info = { memory: { geometries: 0, textures: 0 } };
    constructor(options: unknown) {
      three.made.push(options);
      if (three.failConstructor) throw new Error("THREE.WebGLRenderer: Error creating WebGL context.");
    }
    setClearColor(): void {}
    setPixelRatio(): void {}
    setSize(): void {}
    render(): void {}
    dispose(): void {}
  }
  return { ...real, WebGLRenderer: FakeRenderer };
});

import { defineHbViewer, HB_VIEWER_TAG, NO_WEBGL_LINE, webglUnavailable, type GlUnavailableDetail, type HbViewer } from "../src/hb-viewer.js";

let getContext: ReturnType<typeof vi.spyOn>;
let consoleLines: string[] = [];
let host: HTMLElement;

beforeEach(() => {
  three.made.length = 0;
  three.failConstructor = false;
  consoleLines = [];
  for (const m of ["error", "warn", "log"] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void consoleLines.push(a.map(String).join(" ")));
  getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
  host = document.createElement("div");
  document.body.append(host);
  defineHbViewer();
});

afterEach(() => {
  host.remove();
  vi.restoreAllMocks();
});

/** Mounts a viewer and returns it with the `glunavailable` details seen while it connected. */
function mount(): { viewer: HbViewer; events: GlUnavailableDetail[] } {
  const events: GlUnavailableDetail[] = [];
  host.addEventListener("glunavailable", (e) => events.push((e as CustomEvent<GlUnavailableDetail>).detail));
  const viewer = document.createElement(HB_VIEWER_TAG) as HbViewer;
  host.append(viewer);
  return { viewer, events };
}

const line = (v: HTMLElement): HTMLElement | null => v.shadowRoot?.querySelector<HTMLElement>('[data-hb="no-webgl"]') ?? null;

describe("no WebGL 2 context", () => {
  it("constructs no renderer, marks the element, fires the event once and shows the line", () => {
    getContext.mockReturnValue(null);
    const { viewer, events } = mount();
    expect(three.made).toEqual([]);
    expect(viewer.dataset["webgl"]).toBe("none");
    expect(viewer.webgl).toBe(false);
    expect(events).toEqual([{ reason: "webgl2 context is null" }]);
    expect(line(viewer)?.hidden).toBe(false);
    expect(line(viewer)?.textContent).toBe(NO_WEBGL_LINE);
    expect(consoleLines).toEqual([]);
  });

  it("the line names the failure and what still works, lowercase, with no dash", () => {
    expect(NO_WEBGL_LINE).toBe(NO_WEBGL_LINE.toLowerCase());
    expect(NO_WEBGL_LINE).toMatch(/^no webgl/);
    expect(NO_WEBGL_LINE).toMatch(/build, checks and exports still run\.$/);
    const dashes = Array.from(NO_WEBGL_LINE).filter((c) => (c.codePointAt(0) as number) >= 0x2012 && (c.codePointAt(0) as number) <= 0x2015);
    expect(dashes).toEqual([]);
    expect(NO_WEBGL_LINE).not.toMatch(/--|!/);
  });

  it("a getContext that throws is the same no-context case, with the message as the reason", () => {
    getContext.mockImplementation(() => {
      throw new Error("context creation disabled");
    });
    const { viewer, events } = mount();
    expect(three.made).toEqual([]);
    expect(viewer.dataset["webgl"]).toBe("none");
    expect(events[0]?.reason).toBe("webgl2 context threw context creation disabled");
  });

  it("every accessor and call the shell uses still answers and nothing throws or logs", () => {
    getContext.mockReturnValue(null);
    const { viewer } = mount();
    viewer.model = null;
    viewer.slots = { 1: "#ffffff" };
    viewer.cam = "top";
    viewer.plate = true;
    viewer.xray = true;
    viewer.section = 1;
    viewer.focusIds = ["a"];
    viewer.fit();
    viewer.frame([[0, 0, 0], [1, 1, 1]], 0.5);
    viewer.requestRender();
    viewer.paused = true;
    viewer.paused = false;
    expect(viewer.inspect()).toEqual({ bodies: [], screen: null, width: 0, height: 0 });
    expect(viewer.viewState().cam.name).toBeNull();
    expect(viewer.renders).toBe(0);
    expect(viewer.live).toBe(0);
    expect(viewer.memory).toEqual({ geometries: 0, textures: 0 });
    viewer.remove();
    expect(consoleLines).toEqual([]);
  });

  it("a renderer that throws after a good probe lands in the same state instead of an uncaught error", () => {
    const lose = vi.fn();
    getContext.mockReturnValue({ getExtension: () => ({ loseContext: lose }) } as unknown as RenderingContext);
    three.failConstructor = true;
    const { viewer, events } = mount();
    expect(three.made).toHaveLength(1);
    expect(viewer.dataset["webgl"]).toBe("none");
    expect(events[0]?.reason).toBe("renderer failed THREE.WebGLRenderer: Error creating WebGL context.");
    expect(line(viewer)?.hidden).toBe(false);
    expect(consoleLines).toEqual([]);
  });
});

describe("a WebGL 2 context", () => {
  it("builds the renderer once, hides the line, frees the probe context and fires no event", () => {
    const lose = vi.fn();
    getContext.mockReturnValue({ getExtension: (n: string) => (n === "WEBGL_lose_context" ? { loseContext: lose } : null) } as unknown as RenderingContext);
    const { viewer, events } = mount();
    expect(three.made).toHaveLength(1);
    expect(viewer.dataset["webgl"]).toBe("ready");
    expect(viewer.webgl).toBe(true);
    expect(events).toEqual([]);
    expect(line(viewer)?.hidden).toBe(true);
    expect(lose).toHaveBeenCalledTimes(1);
  });
});

describe("webglUnavailable", () => {
  const docWith = (getContext: (t: string) => unknown): Document =>
    ({ createElement: () => ({ getContext }) }) as unknown as Document;

  it("asks for webgl2 only, since three 0.186 needs it, and answers null for a context", () => {
    const asked: string[] = [];
    const out = webglUnavailable(docWith((t) => (asked.push(t), { getExtension: () => null })));
    expect(out).toBeNull();
    expect(asked).toEqual(["webgl2"]);
  });

  it("a host with webgl but no webgl2 counts as none", () => {
    expect(webglUnavailable(docWith((t) => (t === "webgl" ? {} : null)))).toBe("webgl2 context is null");
  });

  it("a non-error throw still names a reason", () => {
    expect(webglUnavailable(docWith(() => {
      throw "denied";
    }))).toBe("webgl2 context threw denied");
  });
});
