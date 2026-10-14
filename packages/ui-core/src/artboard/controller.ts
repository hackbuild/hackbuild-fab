// The art board controller (M03-T12): one face editor with the full handle
// set, ported from the KNUCKLE face editor (part6.js lines 402 to 560,
// lineage inlay.face-editor/knuckle-part6), with COLLAR's arc text and ring
// drags (collar.html:2001 to 2142 and 2604 to 2690, lineage
// collar.bench/ui-core-artboard). It owns pointer, wheel and key input, hit
// testing and handle geometry, and holds no DOM and no timers: input
// arrives as plain events (dom.ts binds a canvas), and debounce, undo and
// rebuild scheduling belong to the host (the M09 interaction contract).
//
// Events: `select` on a board click, `touch` on every move of a drag,
// `commit` on pointer up after a change, on a nudge, delete, duplicate,
// reorder and drop, `focusText` on a double click with text selected.

import { canonicalize } from "@hackbuild/spec";
import { composeFace, renderLayer, type ComposedFace, type FaceContext, type ImageInput, type RasterGrid, type Surface } from "@hackbuild/inlay";
import { BBoxCache, maskBounds } from "./bbox-cache.js";
import { hitTest, layerHandles, px2mm, type BBox, type Handles, type Hit, type Mods, type View } from "./hit.js";
import { keyAction, type BoardKey } from "./keys.js";
import { copyLayer, manipulator, plain, type ArtLayer, type BoardFrame } from "./manip.js";

/** Quick raster for the preview and the bbox render, cells per mm (part6.js:465, composeZone at 4). */
export const QUICK_RES = 4;
/** The board fills this share of the canvas at zoom 1 (part6.js:466). */
export const FIT = 0.84;
/** Wheel zoom per notch out and in, and the zoom range (part6.js:547). */
export const ZOOM_STEP = [0.9, 1.1] as const;
export const ZOOM_RANGE = [0.5, 8] as const;
/** Least pointer distance from the centre a scale drag measures from, mm (part6.js:513). */
export const SCALE_D0_MIN = 0.5;
/** Scale ratio floor (part6.js:532). */
export const SCALE_K_MIN = 0.15;

export interface BoardPointer {
  /** canvas css px, y down */
  readonly x: number;
  readonly y: number;
  /** 0 primary, 1 middle, 2 right */
  readonly button: number;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

export interface BoardWheel {
  readonly x: number;
  readonly y: number;
  readonly deltaY: number;
}

export type CommitReason = "drag" | "nudge" | "delete" | "duplicate" | "reorder" | "drop";

export interface ArtBoardEvents {
  select: string | null;
  touch: readonly ArtLayer[];
  commit: { readonly reason: CommitReason; readonly layers: readonly ArtLayer[] };
  focusText: string;
}

export interface ArtBoardOptions {
  readonly frame: BoardFrame;
  /** Paint order: the last layer is on top. The board edits these objects in place. */
  readonly layers: ArtLayer[];
  /** A surface for a grid; the board asks for the grids `grids()` lists. */
  readonly surface: (grid: RasterGrid) => Surface;
  readonly palette?: FaceContext["palette"];
  /** A fresh id for a duplicate or a dropped image. Default: the first free "L<n>". */
  readonly newId?: (taken: ReadonlySet<string>) => string;
  /** The layer a dropped image becomes, placed at (x, y) mm. */
  readonly dropLayer: (img: ImageInput, x: number, y: number, id: string) => ArtLayer;
}

export type DragMode = "move" | "scale" | "rotate" | "pan";

export interface Raster {
  /** "exact" is the host's print raster after a build; "preview" the quick raster */
  readonly mode: "exact" | "preview";
  readonly face: ComposedFace;
}

export interface ArtBoardState {
  readonly layers: readonly Record<string, unknown>[];
  readonly sel: string | null;
  readonly view: { readonly zoom: number; readonly panX: number; readonly panY: number; readonly scale: number; readonly ox: number; readonly oy: number; readonly w: number; readonly h: number };
  readonly drag: { readonly mode: DragMode; readonly snapped: { readonly x: boolean; readonly y: boolean } | null } | null;
  readonly raster: { readonly mode: "exact" | "preview"; readonly res: number } | null;
}

interface Drag {
  readonly mode: DragMode;
  readonly x0: number;
  readonly y0: number;
  readonly id: string;
  /** the layer as it was at pointer down; null for a pan */
  readonly start: ArtLayer | null;
  readonly sig: string;
  readonly cx: number;
  readonly cy: number;
  readonly d0: number;
  readonly a0: number;
  readonly panX: number;
  readonly panY: number;
  snapped: { x: boolean; y: boolean } | null;
}

type Listener<K extends keyof ArtBoardEvents> = (v: ArtBoardEvents[K]) => void;

export interface ArtBoard {
  pointerDown(e: BoardPointer): void;
  pointerMove(e: BoardPointer): void;
  pointerUp(): void;
  wheel(e: BoardWheel): void;
  dblclick(): void;
  /** true when the board acted on the key and the host should prevent its default */
  key(e: BoardKey): boolean;
  drop(x: number, y: number, img: ImageInput): void;
  /** The canvas size in css px. */
  resize(w: number, h: number): void;
  /** Select from outside the board (the layer list); emits nothing. */
  select(id: string | null): void;
  /** The host's print raster after a build; any layer change drops it. */
  setExact(face: ComposedFace | null): void;
  /** Fonts arrived: drop cached bounds and the preview. */
  invalidate(): void;
  /** The host changed a layer outside the board (a typed field): drop the preview and the exact raster. */
  edited(): void;
  layers(): readonly ArtLayer[];
  selected(): ArtLayer | null;
  view(): View & { readonly zoom: number; readonly panX: number; readonly panY: number; readonly w: number; readonly h: number };
  frame(): BoardFrame;
  handles(): Handles | null;
  bbox(L: ArtLayer): BBox | null;
  drag(): { readonly mode: DragMode; readonly snapped: { readonly x: boolean; readonly y: boolean } | null } | null;
  raster(): Raster;
  /** The cursor for the pointer at (x, y) with no drag (part6.js:518). */
  cursor(x: number, y: number): string;
  /** Every grid the board renders on, so a host can make each surface ready (fonts) up front. */
  grids(): readonly RasterGrid[];
  state(): ArtBoardState;
  on<K extends keyof ArtBoardEvents>(type: K, fn: Listener<K>): () => void;
}

function firstFreeId(taken: ReadonlySet<string>): string {
  let n = taken.size + 1;
  while (taken.has(`L${n}`)) n++;
  return `L${n}`;
}

export function createArtBoard(opts: ArtBoardOptions): ArtBoard {
  const frame = opts.frame;
  const list = opts.layers;
  const cache = new BBoxCache();
  const listeners: { [K in keyof ArtBoardEvents]: Listener<K>[] } = { select: [], touch: [], commit: [], focusText: [] };
  const emit = <K extends keyof ArtBoardEvents>(type: K, v: ArtBoardEvents[K]): void => {
    for (const fn of listeners[type]) fn(v);
  };
  const ext = 2 * Math.max(frame.w, frame.h) + 8;
  const bboxGrid: RasterGrid = { w: Math.ceil(ext * QUICK_RES), h: Math.ceil(ext * QUICK_RES), res: QUICK_RES };
  const previewGrid: RasterGrid = { w: Math.ceil(frame.w * QUICK_RES), h: Math.ceil(frame.h * QUICK_RES), res: QUICK_RES };

  let sel: string | null = null;
  let cw = 400, ch = 400, zoom = 1, panX = 0, panY = 0;
  let drag: Drag | null = null;
  let exact: ComposedFace | null = null;
  let preview: ComposedFace | null = null;

  const ctx = (grid: RasterGrid): FaceContext => ({ surface: opts.surface(grid), grid, rArt: frame.rArt, ...(opts.palette === undefined ? {} : { palette: opts.palette }) });
  const find = (id: string | null): ArtLayer | null => (id === null ? null : list.find((L) => L.id === id) ?? null);
  const view = () => {
    const base = Math.min(cw / frame.w, ch / frame.h) * FIT;
    const scale = base * zoom;
    return { scale, ox: cw / 2 + panX, oy: ch / 2 + panY, zoom, panX, panY, w: cw, h: ch };
  };
  const sig = (L: ArtLayer): string => canonicalize(plain(L));
  const changed = (): void => {
    exact = null;
    preview = null;
  };

  function bbox(L: ArtLayer): BBox | null {
    const m = manipulator(L);
    const local = m.unplaced(L);
    return cache.get(plain(local), () => maskBounds(renderLayer(local, ctx(bboxGrid)), bboxGrid, m.rows));
  }

  function handlesOf(id: string): Handles | null {
    const L = find(id);
    if (L === null || L.off) return null;
    const bb = bbox(L);
    return bb === null ? null : layerHandles(bb, manipulator(L).placement(L), view());
  }

  const visible = (): string[] => list.filter((L) => !L.off).map((L) => L.id);
  const hit = (x: number, y: number): Hit<string> => hitTest(visible(), find(sel) === null ? null : sel, handlesOf, x, y);

  function commit(reason: CommitReason): void {
    changed();
    emit("commit", { reason, layers: list });
  }

  const board: ArtBoard = {
    pointerDown(e) {
      const v = view();
      if (e.button !== 0) {
        drag = { mode: "pan", x0: e.x, y0: e.y, id: "", start: null, sig: "", cx: 0, cy: 0, d0: 1, a0: 0, panX, panY, snapped: null };
        return;
      }
      const h = hit(e.x, e.y);
      if (h.mode === "none") {
        drag = null;
        if (sel !== null) {
          sel = null;
          emit("select", null);
        }
        return;
      }
      if (h.mode === "select") {
        sel = h.id;
        emit("select", h.id);
      }
      const L = find(h.id)!;
      const at = manipulator(L).placement(L);
      const [mx, my] = px2mm(v, e.x, e.y);
      drag = {
        mode: h.mode === "select" ? "move" : h.mode,
        x0: e.x, y0: e.y, id: L.id, start: copyLayer(L), sig: sig(L),
        cx: at.dx, cy: at.dy,
        d0: Math.max(SCALE_D0_MIN, Math.hypot(mx - at.dx, my - at.dy)),
        a0: Math.atan2(my - at.dy, mx - at.dx),
        panX, panY, snapped: null,
      };
    },

    pointerMove(e) {
      const D = drag;
      if (D === null) return;
      if (D.mode === "pan") {
        panX = D.panX + (e.x - D.x0);
        panY = D.panY + (e.y - D.y0);
        return;
      }
      const L = find(D.id);
      if (L === null || D.start === null) return;
      const v = view();
      const [mx, my] = px2mm(v, e.x, e.y);
      const mods: Mods = { shiftKey: e.shiftKey, altKey: e.altKey };
      const m = { ddx: (e.x - D.x0) / v.scale, ddy: -(e.y - D.y0) / v.scale, mx, my, mods, frame };
      const k = manipulator(L);
      if (D.mode === "move") D.snapped = { ...k.move(L, D.start, m) };
      else if (D.mode === "scale") k.scale(L, D.start, Math.max(SCALE_K_MIN, Math.hypot(mx - D.cx, my - D.cy) / D.d0), m);
      else k.rotate(L, D.start, (Math.atan2(my - D.cy, mx - D.cx) - D.a0) * 180 / Math.PI, mods);
      changed();
      emit("touch", list);
    },

    pointerUp() {
      const D = drag;
      drag = null;
      if (D === null || D.mode === "pan") return;
      const L = find(D.id);
      if (L !== null && sig(L) !== D.sig) commit("drag");
      else preview = null;
    },

    wheel(e) {
      const v = view();
      const [mx, my] = px2mm(v, e.x, e.y);
      zoom = Math.max(ZOOM_RANGE[0], Math.min(ZOOM_RANGE[1], zoom * (e.deltaY > 0 ? ZOOM_STEP[0] : ZOOM_STEP[1])));
      const s = view().scale;
      panX = e.x - cw / 2 - mx * s;
      panY = e.y - ch / 2 + my * s;
    },

    dblclick() {
      const L = find(sel);
      if (L !== null && L.kind === "text") {
        emit("focusText", L.id);
        return;
      }
      zoom = 1;
      panX = 0;
      panY = 0;
    },

    key(e) {
      const L = find(sel);
      if (L === null) return false;
      const a = keyAction(e);
      if (a === null) return false;
      const i = list.indexOf(L);
      if (a.kind === "nudge") {
        manipulator(L).nudge(L, a.ax, a.ay, a.step, a.shift, frame);
        commit("nudge");
      } else if (a.kind === "delete") {
        list.splice(i, 1);
        sel = null;
        emit("select", null);
        commit("delete");
      } else if (a.kind === "duplicate") {
        const c = copyLayer(L);
        c.id = (opts.newId ?? firstFreeId)(new Set(list.map((x) => x.id)));
        manipulator(c).offset(c);
        list.splice(i + 1, 0, c);
        sel = c.id;
        emit("select", c.id);
        commit("duplicate");
      } else {
        const j = i + a.by;
        if (j < 0 || j >= list.length) return true;
        list.splice(i, 1);
        list.splice(j, 0, L);
        commit("reorder");
      }
      return true;
    },

    drop(x, y, img) {
      const [mx, my] = px2mm(view(), x, y);
      const id = (opts.newId ?? firstFreeId)(new Set(list.map((L) => L.id)));
      list.push(opts.dropLayer(img, mx, my, id));
      sel = id;
      emit("select", id);
      commit("drop");
    },

    resize(w, h) {
      cw = w;
      ch = h;
    },
    select(id) {
      sel = find(id) === null ? null : id;
    },
    setExact(face) {
      exact = face;
    },
    invalidate() {
      cache.clear();
      preview = null;
    },
    edited: changed,
    layers: () => list,
    selected: () => find(sel),
    view,
    frame: () => frame,
    handles: () => (sel === null ? null : handlesOf(sel)),
    bbox,
    drag: () => (drag === null ? null : { mode: drag.mode, snapped: drag.snapped }),
    raster() {
      if (exact !== null && drag === null) return { mode: "exact", face: exact };
      preview ??= composeFace(list, ctx(previewGrid));
      return { mode: "preview", face: preview };
    },
    cursor(x, y) {
      const h = hit(x, y);
      return h.mode === "rotate" ? "crosshair" : h.mode === "scale" ? "nwse-resize" : h.mode === "move" ? "grab" : h.mode === "select" ? "pointer" : "default";
    },
    grids: () => [bboxGrid, previewGrid],
    state() {
      const v = view();
      const r = exact !== null && drag === null ? exact : preview;
      return {
        layers: list.map((L) => plain(L)),
        sel,
        view: { zoom, panX, panY, scale: v.scale, ox: v.ox, oy: v.oy, w: cw, h: ch },
        drag: board.drag(),
        raster: r === null ? null : { mode: r === exact ? "exact" : "preview", res: r.art.res },
      };
    },
    on(type, fn) {
      const arr = listeners[type] as Listener<typeof type>[];
      arr.push(fn);
      return () => {
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
      };
    },
  };
  return board;
}
