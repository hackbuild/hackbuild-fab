/// <reference lib="dom" />
// The art board fixture (M03-T12 step 4): the ui-core controller on the
// canvas surface with the inlay package, four layers on a 40 mm coin face
// (straight text with a pipe split, an image, a ring, arc text), and a
// layer list kept in sync both ways. Bundled as one IIFE by tsdown and
// loaded at file://. The SASH harness reads `UI.FE.handles`; the art board
// harness reads `ARTBOARD.state()` and `ARTBOARD.events()`.
//
// A commit runs this fixture's stand-in build: the face composed at
// EXACT_RES on the canvas surface and handed to the board as its exact
// raster. Hygiene and the mesh are the host's build (M09), out of scope here.

import { composeFace, type ComposedFace, type RasterGrid, type RgbaImage } from "@hackbuild/inlay";
import { createArtBoard, type ArtBoardEvents } from "../../src/artboard/controller.js";
import { attachArtBoard, cssToken } from "../../src/artboard/dom.js";
import type { ArtLayer } from "../../src/artboard/manip.js";
import { canvasSurface, type CanvasSurface } from "../../src/surface/canvas-surface.js";

const FONT = "Fixture Sans";
/** cells per mm of the stand-in build */
const EXACT_RES = 10;
const FRAME = { w: 40, h: 40, rArt: 18 };

/** A 64 px five-point star, opaque inside, as RGBA (outer radius 0.95, inner 0.4 of the half side). */
function star(n: number): RgbaImage {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.4 : 0.95;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const inside = (x: number, y: number): boolean => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]!, [xj, yj] = pts[j]!;
      if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const data = new Uint8ClampedArray(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (inside((i + 0.5) / n * 2 - 1, 1 - (j + 0.5) / n * 2)) data[(j * n + i) * 4 + 3] = 255;
  }
  return { width: n, height: n, data };
}

const layers: ArtLayer[] = [
  { id: "ring", kind: "ring", slot: 2, r0: 17.2, r1: 18.6 },
  { id: "image", kind: "image", img: star(64), mode: "alpha", slot: 1, scale: 0.3, dx: -8, dy: -7, rot: 0 },
  { id: "text", kind: "text", text: "hack|.build", slot: 1, accent: 2, font: FONT, size: 5, runGap: 0.4, mode: "straight", dx: 0, dy: 5, rot: 0 },
  { id: "arc", kind: "text", text: "MAKE THINGS", slot: 1, font: FONT, size: 2.6, runGap: 0, mode: "arc", arcR: 14, arcDeg: -90, flip: true, dx: 0, dy: 0, rot: 0 },
];

const surfaces = new Map<string, CanvasSurface>();
let board: ReturnType<typeof createArtBoard> | null = null;
const surface = (g: RasterGrid): CanvasSurface => {
  const key = `${g.w}x${g.h}@${g.res}`;
  let s = surfaces.get(key);
  if (s === undefined) {
    s = canvasSurface(g, { onFontsLoaded: () => board?.invalidate() });
    surfaces.set(key, s);
  }
  return s;
};

const events: { type: keyof ArtBoardEvents; v: unknown }[] = [];
const $ = <T extends Element>(q: string): T => document.querySelector(q) as T;

async function boot(): Promise<void> {
  const canvas = $<HTMLCanvasElement>("#board");
  const root = document.documentElement;
  board = createArtBoard({
    frame: FRAME,
    layers,
    surface,
    dropLayer: (img, x, y, id) => ({ id, kind: "image", img, mode: "alpha", slot: 1, scale: 0.3, dx: x, dy: y, rot: 0 }),
  });
  const b = board;
  const exactGrid: RasterGrid = { w: FRAME.w * EXACT_RES, h: FRAME.h * EXACT_RES, res: EXACT_RES };
  for (const g of [...b.grids(), exactGrid]) await surface(g).fontsReady([FONT]);
  const build = (): ComposedFace => composeFace(layers, { surface: surface(exactGrid), grid: exactGrid, rArt: FRAME.rArt });

  const list = $<HTMLOListElement>("#layers");
  const renderList = (): void => {
    list.replaceChildren(...[...layers].reverse().map((L) => {
      const li = document.createElement("li");
      li.dataset["layer"] = L.id;
      li.className = L.id === b.selected()?.id ? "on" : "";
      const pick = document.createElement("button");
      pick.type = "button";
      pick.dataset["pick"] = L.id;
      pick.textContent = `${L.kind} ${L.id}`;
      pick.onclick = () => {
        b.select(L.id);
        renderList();
        ui.paint();
      };
      li.append(pick);
      if (L.kind === "text") {
        const t = document.createElement("input");
        t.type = "text";
        t.value = L.text;
        t.dataset["text"] = L.id;
        t.setAttribute("aria-label", `text of ${L.id}`);
        t.oninput = () => {
          L.text = t.value;
          b.edited();
          ui.paint();
        };
        t.onchange = () => {
          b.setExact(build());
          ui.paint();
        };
        li.append(t);
      }
      return li;
    }));
  };
  b.on("select", (id) => {
    events.push({ type: "select", v: id });
    renderList();
  });
  b.on("touch", () => events.push({ type: "touch", v: null }));
  b.on("commit", (c) => {
    events.push({ type: "commit", v: c.reason });
    b.setExact(build());
    renderList();
  });
  b.on("focusText", (id) => {
    events.push({ type: "focusText", v: id });
    const t = document.querySelector<HTMLInputElement>(`input[data-text="${id}"]`);
    t?.focus();
    t?.select();
  });
  const tok = (n: string): string => cssToken(root, n);
  const ui = attachArtBoard(canvas, b, {
    theme: {
      void: tok("--hb-void"), blank: tok("--hb-paper"), pink: tok("--hb-pink"),
      guide: tok("--fx-guide"), readout: tok("--fx-readout"), numberFont: tok("--fx-number-font"),
      slots: [tok("--hb-ink"), tok("--hb-pink")],
    },
  });
  b.setExact(build());
  renderList();
  ui.paint();

  Object.defineProperty(globalThis, "UI", { value: Object.freeze({ FE: Object.freeze({ get handles() { return b.handles(); } }) }) });
  Object.defineProperty(globalThis, "ARTBOARD", {
    value: Object.freeze({
      ready: true,
      state: () => JSON.parse(JSON.stringify(b.state())) as unknown,
      events: () => events.map((e) => ({ ...e })),
    }),
  });
}

boot().catch((e: unknown) => {
  console.error(`art board fixture failed to boot: ${e instanceof Error ? e.message : String(e)}`);
});
