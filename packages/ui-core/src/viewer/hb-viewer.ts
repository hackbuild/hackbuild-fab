/// <reference lib="dom" />
// `<hb-viewer>`: the one custom element of D-130. It draws Part IR bodies on
// the void stage with the cams and modes of the bench skeleton, renders on
// demand, frees what it allocates (D-055) and pauses during exports. The
// renderer settings are PIP's (bench/part3.js lines 10 to 12: antialias,
// alpha, preserveDrawingBuffer, pixel ratio at most 2, local clipping). The
// graph rule is the hackbuild-ui `.hb-graph` class on the element, 32 px at
// 10 percent pink (D-122 default), seen through the clear canvas; it is never
// drawn in WebGL. Overlays are the element's children, slotted above the
// canvas with an explicit z-index (bible 9: overlays vanished behind the
// canvas).
//
// The class is created inside defineHbViewer so importing ui-core under node
// (tests, the bake) never touches HTMLElement.

import { REVISION, WebGLRenderer } from "three";
import type { Vec3 } from "@hackbuild/spec";
import { featuresOfBody } from "../bench/locate.js";
import { bindControls, boundsMoved, CAMS, fit, eye, setCam, type CamName, type FitView, type Orbit } from "./controls.js";
import { createOwner } from "./dispose.js";
import { createStageScene, type Palette, type ViewModes, type ViewPart } from "./scene.js";

export const HB_VIEWER_TAG = "hb-viewer";

/** PIP's plate cam: theta, phi and distance per footprint extent (part3.js line 51). */
export const PLATE_CAM = { theta: -Math.PI / 2 + 0.25, phi: 1.05, distPerExtent: 2.1 } as const;
/** Pixel ratio cap (PIP part3.js line 11). */
export const MAX_PIXEL_RATIO = 2;

export interface ViewState {
  readonly focus: readonly string[];
  readonly sectionZ: number | null;
  readonly cam: { readonly name: CamName | null; readonly theta: number; readonly phi: number; readonly dist: number; readonly target: Vec3; readonly eye: Vec3 };
}

export interface ViewInspect {
  readonly bodies: readonly { readonly id: string; readonly role: string; readonly opacity: number }[];
  /** left, top, right, bottom in CSS px from the element's top left; null when nothing is drawn. */
  readonly screen: readonly [number, number, number, number] | null;
  readonly width: number;
  readonly height: number;
}

/** Detail of the `camchange` event: the preset the camera sits on, null once an orbit, pan, zoom or frame leaves it (G-17). */
export interface CamChangeDetail {
  readonly cam: CamName | null;
}

export interface PickDetail {
  readonly body: string;
  /** The body's own feature, or the first feature that resolves to it; null when none does. */
  readonly feature: string | null;
}

/**
 * The card's `part` and `focus` properties are `model` and `focusIds` here:
 * HTMLElement already owns `part` (shadow parts) and `focus()` (keyboard
 * focus). The `focus` attribute keeps its name.
 */
export interface HbViewer extends HTMLElement {
  model: ViewPart | null;
  /** Display colour per filament slot (chase materials preview); a slot without one takes a `--hb-part-*` token. */
  slots: Readonly<Record<number, string>>;
  cam: CamName;
  explode: boolean;
  /** The layer stack lifted apart by slot (UI.md 12.1 `layers`). */
  layers: boolean;
  xray: boolean;
  /** Section plane height, mm; null for none. */
  section: number | null;
  plate: boolean;
  focusIds: readonly string[];
  /** The one net lit, every other body ghosted (view.netlens); null is off. */
  lens: string | null;
  /** Key light position, mm (view.light lightAt); null is PIP's key light. */
  light: readonly [number, number, number] | null;
  paused: boolean;
  /** Frames a box, min then max, mm; sets the section when `sectionZ` is given. */
  frame(bbox: readonly [Vec3, Vec3], sectionZ?: number): void;
  /** Frames everything drawn. */
  fit(): void;
  viewState(): ViewState;
  /**
   * Test accessor for the gold suite: each drawn body's role and opacity
   * (G-16) and the drawn bounds projected for the current camera, in CSS px
   * relative to the element's box (G-15). Reads only.
   */
  inspect(): ViewInspect;
  requestRender(): void;
  /** Live three objects the viewer created and has not freed, count. */
  readonly live: number;
  /** renderer.info.memory: geometries and textures on the GPU, count. */
  readonly memory: { readonly geometries: number; readonly textures: number };
  /** Frames rendered since connect, count. */
  readonly renders: number;
  readonly revision: string;
}

/** Net colours in xray and the fallback slot colours, cycled; pink is kept for the focus outline (one focal pink). */
const NET_TOKENS = ["--hb-part-b", "--hb-part-c", "--hb-part-d", "--hb-part-e", "--hb-part-f"] as const;

/**
 * PIP SLOT_VIEW (part3.js line 3): white filament draws as paper and black as
 * a lifted ink so both read on the void. PIP's lifted ink was a raw hex;
 * `--hb-ink-border` is the token on that step.
 */
function slotView(el: HTMLElement, colour: string): string {
  const c = colour.trim().toUpperCase();
  const tok = (n: string): string => getComputedStyle(el).getPropertyValue(n).trim() || colour;
  if (c === "#FFFFFF") return tok("--hb-paper");
  if (c === "#1A1A1A" || c === "#000000") return tok("--hb-ink-border");
  return colour;
}

const BOOL_ATTRS = ["explode", "layers", "xray", "plate", "paused"] as const;

export function defineHbViewer(): void {
  if (customElements.get(HB_VIEWER_TAG) !== undefined) return;

  class Viewer extends HTMLElement implements HbViewer {
    static get observedAttributes(): string[] {
      return ["cam", "section", "focus", ...BOOL_ATTRS];
    }

    #part: ViewPart | null = null;
    #slots: Readonly<Record<number, string>> = {};
    #cam: CamName = "iso";
    #camMoved = false;
    #modes: { explode: boolean; layers: boolean; xray: boolean; section: number | null; plate: boolean; focus: readonly string[]; lens: string | null } = {
      explode: false, layers: false, xray: false, section: null, plate: false, focus: [], lens: null,
    };
    #light: readonly [number, number, number] | null = null;
    #paused = false;
    #dirty = false;
    #frame = 0;
    #renders = 0;
    #fitted = false;
    /** The drawn bounds at the last fit; a model whose bounds move past REFIT_FRACTION of it refits (G-15). */
    #fitBox: [Vec3, Vec3] | null = null;
    readonly #orbit: Orbit = { theta: CAMS.iso[0], phi: CAMS.iso[1], dist: 260, target: [0, 0, 6] };
    readonly #owner = createOwner();
    readonly #canvas: HTMLCanvasElement;
    #renderer: WebGLRenderer | null = null;
    #stage: ReturnType<typeof createStageScene> | null = null;
    #unbind: (() => void) | null = null;
    #ro: ResizeObserver | null = null;

    constructor() {
      super();
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = [
        ":host{display:block;position:relative;background-color:var(--hb-void);aspect-ratio:16/10;overflow:hidden}",
        "canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0;touch-action:none}",
        ".ov{position:absolute;inset:0;z-index:1;pointer-events:none}",
        "::slotted(*){pointer-events:auto}",
      ].join("");
      this.#canvas = document.createElement("canvas");
      const ov = document.createElement("div");
      ov.className = "ov";
      ov.append(document.createElement("slot"));
      root.append(style, this.#canvas, ov);
    }

    connectedCallback(): void {
      this.classList.add("hb-graph");
      if (this.#renderer !== null) return;
      const r = new WebGLRenderer({ canvas: this.#canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.localClippingEnabled = true;
      r.setClearColor(0x000000, 0);
      this.#renderer = r;
      this.#stage = createStageScene(this.#owner);
      this.#stage.keyLight(this.#light);
      this.#unbind = bindControls(this.#canvas, this.#orbit, {
        change: () => {
          this.#leavePreset();
          this.requestRender();
        },
        pick: (x, y) => this.#pick(x, y),
        refit: () => this.fit(),
      });
      this.#ro = new ResizeObserver(() => this.#resize());
      this.#ro.observe(this);
      this.#resize();
      this.#redraw();
    }

    disconnectedCallback(): void {
      if (this.#frame !== 0) cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.#unbind?.();
      this.#ro?.disconnect();
      this.#stage?.dispose();
      this.#renderer?.dispose();
      this.#unbind = null;
      this.#ro = null;
      this.#stage = null;
      this.#renderer = null;
      this.#fitted = false;
      this.#fitBox = null;
    }

    attributeChangedCallback(name: string, _old: string | null, v: string | null): void {
      if (name === "cam") {
        if (v !== null && v in CAMS) this.cam = v as CamName;
      } else if (name === "section") this.section = v === null || v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v);
      else if (name === "focus") this.focusIds = v === null ? [] : v.split(/\s+/).filter((s) => s !== "");
      else if ((BOOL_ATTRS as readonly string[]).includes(name)) (this as unknown as Record<string, boolean>)[name] = v !== null;
    }

    get model(): ViewPart | null {
      return this.#part;
    }
    set model(p: ViewPart | null) {
      this.#part = p;
      this.#redraw();
      if (p === null) return;
      const now = this.#box();
      if (!this.#fitted || (now !== null && this.#fitBox !== null && boundsMoved(this.#fitBox, now))) this.fit();
    }
    get slots(): Readonly<Record<number, string>> {
      return this.#slots;
    }
    set slots(s: Readonly<Record<number, string>>) {
      this.#slots = { ...s };
      this.#redraw();
    }
    get cam(): CamName {
      return this.#cam;
    }
    set cam(c: CamName) {
      this.#cam = c;
      this.#camMoved = false;
      setCam(this.#orbit, c);
      this.#camEvent(c);
      this.requestRender();
    }
    get explode(): boolean {
      return this.#modes.explode;
    }
    set explode(v: boolean) {
      this.#setMode({ explode: v });
    }
    get layers(): boolean {
      return this.#modes.layers;
    }
    set layers(v: boolean) {
      this.#setMode({ layers: v });
      this.fit();
    }
    get xray(): boolean {
      return this.#modes.xray;
    }
    set xray(v: boolean) {
      this.#setMode({ xray: v });
    }
    get section(): number | null {
      return this.#modes.section;
    }
    set section(z: number | null) {
      this.#setMode({ section: z });
    }
    get plate(): boolean {
      return this.#modes.plate;
    }
    set plate(v: boolean) {
      this.#setMode({ plate: v });
      this.fit();
    }
    get focusIds(): readonly string[] {
      return this.#modes.focus;
    }
    set focusIds(ids: readonly string[]) {
      this.#setMode({ focus: [...ids] });
    }
    get lens(): string | null {
      return this.#modes.lens;
    }
    set lens(net: string | null) {
      this.#setMode({ lens: net });
    }
    get light(): readonly [number, number, number] | null {
      return this.#light;
    }
    set light(at: readonly [number, number, number] | null) {
      this.#light = at === null ? null : [at[0], at[1], at[2]];
      this.#stage?.keyLight(this.#light);
      this.requestRender();
    }
    get paused(): boolean {
      return this.#paused;
    }
    set paused(v: boolean) {
      this.#paused = v;
      if (!v && this.#dirty) this.requestRender();
    }
    get live(): number {
      return this.#owner.live;
    }
    get memory(): { geometries: number; textures: number } {
      const m = this.#renderer?.info.memory;
      return { geometries: m?.geometries ?? 0, textures: m?.textures ?? 0 };
    }
    get renders(): number {
      return this.#renders;
    }
    get revision(): string {
      return REVISION;
    }

    frame(bbox: readonly [Vec3, Vec3], sectionZ?: number): void {
      fit(this.#orbit, bbox, this.#fitView());
      this.#leavePreset();
      if (sectionZ !== undefined) this.#setMode({ section: sectionZ });
      this.requestRender();
    }

    fit(): void {
      const bbox = this.#box();
      if (bbox === null) return;
      fit(this.#orbit, bbox, this.#fitView());
      this.#fitBox = bbox;
      if (this.#modes.plate) {
        this.#orbit.theta = PLATE_CAM.theta;
        this.#orbit.phi = PLATE_CAM.phi;
        this.#orbit.dist = Math.max(this.#orbit.dist, Math.max(bbox[1][0] - bbox[0][0], bbox[1][1] - bbox[0][1]) * PLATE_CAM.distPerExtent);
      }
      this.#fitted = true;
      this.requestRender();
    }

    viewState(): ViewState {
      const o = this.#orbit;
      return {
        focus: [...this.#modes.focus],
        sectionZ: this.#modes.section,
        cam: { name: this.#camMoved ? null : this.#cam, theta: o.theta, phi: o.phi, dist: o.dist, target: [...o.target] as unknown as Vec3, eye: eye(o) as unknown as Vec3 },
      };
    }

    inspect(): ViewInspect {
      const st = this.#stage;
      const w = this.clientWidth;
      const h = this.clientHeight;
      if (st === null) return { bodies: [], screen: null, width: w, height: h };
      const [x, y, z] = eye(this.#orbit);
      st.camera.position.set(x, y, z);
      st.camera.lookAt(...this.#orbit.target);
      const n = st.ndcBounds();
      const screen: [number, number, number, number] | null = n === null ? null
        : [((n[0] + 1) / 2) * w, ((1 - n[3]) / 2) * h, ((n[2] + 1) / 2) * w, ((1 - n[1]) / 2) * h];
      return { bodies: st.drawnBodies(), screen, width: w, height: h };
    }

    requestRender(): void {
      if (this.#paused || this.#renderer === null) {
        this.#dirty = true;
        return;
      }
      if (this.#frame !== 0) return;
      this.#frame = requestAnimationFrame(() => {
        this.#frame = 0;
        this.#render();
      });
    }

    #box(): [Vec3, Vec3] | null {
      const box = this.#stage?.bounds() ?? null;
      return box === null ? null : [[box.min.x, box.min.y, box.min.z], [box.max.x, box.max.y, box.max.z]];
    }

    /** The camera field the stage shows now; none before the element has a size. */
    #fitView(): FitView | undefined {
      const cam = this.#stage?.camera;
      const w = this.clientWidth;
      const h = this.clientHeight;
      return cam === undefined || w <= 0 || h <= 0 ? undefined : { fovDeg: cam.fov, aspect: w / h };
    }

    #leavePreset(): void {
      if (this.#camMoved) return;
      this.#camMoved = true;
      this.#camEvent(null);
    }

    #camEvent(cam: CamName | null): void {
      this.dispatchEvent(new CustomEvent<CamChangeDetail>("camchange", { detail: { cam }, bubbles: true, composed: true }));
    }

    #setMode(m: Partial<ViewModes>): void {
      this.#modes = { ...this.#modes, ...m };
      this.#redraw();
    }

    #palette(): Palette {
      const css = getComputedStyle(this);
      const tok = (n: string): string => css.getPropertyValue(n).trim();
      return {
        slot: (n) => {
          const c = this.#slots[n];
          return c !== undefined ? slotView(this, c) : tok(NET_TOKENS[(n - 1 + NET_TOKENS.length) % NET_TOKENS.length] as string);
        },
        net: (i) => tok(NET_TOKENS[i % NET_TOKENS.length] as string),
        focus: tok("--hb-pink"),
        bed: tok("--hb-ink"),
      };
    }

    #redraw(): void {
      if (this.#stage === null) return;
      this.#stage.draw(this.#part, this.#modes, this.#palette());
      this.requestRender();
    }

    #resize(): void {
      const r = this.#renderer;
      if (r === null) return;
      const w = Math.max(1, this.clientWidth);
      const h = Math.max(1, this.clientHeight);
      r.setPixelRatio(Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1));
      r.setSize(w, h, false);
      const cam = this.#stage?.camera;
      if (cam !== undefined) {
        cam.aspect = w / h;
        cam.updateProjectionMatrix();
      }
      // A stage that changes shape under a camera the person has not moved refits to the new field (G-15).
      if (this.#fitted && !this.#camMoved) this.fit();
      this.requestRender();
    }

    #render(): void {
      const r = this.#renderer;
      const st = this.#stage;
      if (r === null || st === null) return;
      if (this.#paused) {
        this.#dirty = true;
        return;
      }
      const [x, y, z] = eye(this.#orbit);
      st.camera.position.set(x, y, z);
      st.camera.lookAt(...this.#orbit.target);
      r.render(st.scene, st.camera);
      this.#dirty = false;
      this.#renders += 1;
    }

    #pick(clientX: number, clientY: number): void {
      const st = this.#stage;
      const p = this.#part;
      if (st === null || p === null) return;
      const rect = this.#canvas.getBoundingClientRect();
      const body = st.pick(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      if (body === null) return;
      const part = { id: p.part.id, bodies: p.part.bodies, features: p.part.features ?? [] };
      const detail: PickDetail = { body, feature: featuresOfBody(part, body)[0] ?? null };
      this.dispatchEvent(new CustomEvent<PickDetail>("pick", { detail, bubbles: true, composed: true }));
    }
  }

  customElements.define(HB_VIEWER_TAG, Viewer);
}
