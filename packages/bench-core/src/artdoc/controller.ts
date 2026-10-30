// The art document controller: the headless state of the art board for the
// `art` param type. It holds no document of its own. The param value
// ({uri, kind: "layers", doc}, spec ArtValue) is the state: every edit
// clones the document, changes it, and writes a new value whose uri is the
// hash of the new document (artDocumentUri). The host's write is a core
// set and commit, so undo, redo, saved designs and shared links restore the
// art with the rest of the design and no second history exists. What the
// controller keeps is view state: the face, the selection, zoom and pan, and
// a working copy while a drag runs (written once, on pointer up).
//
// Geometry follows the ported editor: handles from the layer's own bounds,
// hit order, move snap to the centre lines and the 0.25 mm grid, scale by the
// pointer's distance ratio, rotate snaps (../artboard/hit.ts) and BAIL's editor on the art
// document (bail.html:2850 to 3111, lineage bail.bench/ui-art-state).
// The kinds are the art document's, not the inlay layer kinds the
// older board in ../artboard moves; the painters are the same. No DOM, no
// timers; surfaces for text and paths are injected.

import {
  ART_FACES, ART_LAYER_KINDS, artDocumentIssues, artDocumentUri, artLayer, canonicalize, emptyArtDocument,
  type ArtDocument, type ArtFace, type ArtLayer, type ArtLayerKind, type ArtValue,
} from "@hackbuild/spec";
import { composeFace, lowerArtLayer, renderLayer, type ComposedFace, type FaceContext, type RasterGrid, type Surface } from "@hackbuild/inlay";
import { BBoxCache, maskBounds } from "../artboard/bbox-cache.js";
import { hitTest, layerHandles, px2mm, snapMove, snapRotation, type BBox, type Handles, type Mods, type View } from "../artboard/hit.js";
import { keyAction, type BoardKey } from "../artboard/keys.js";
import type { BoardPointer, BoardWheel, DragMode, Raster } from "../artboard/controller.js";
import { readSvgPaths } from "./svg.js";

/** Quick raster for preview and bounds, cells per mm (the same as the older board). */
export const DOC_QUICK_RES = 4;
export const DOC_FIT = 0.84;
export const DOC_ZOOM_RANGE = [0.5, 8] as const;
export const DOC_FRAME: Frame = { w: 100, h: 64 };
/** Longest side a dropped svg takes on the board, mm. */
export const DROP_SPAN_MM = 24;
/** Text size floor on a scale drag, mm (the older board's TEXT_SIZE_MIN). */
export const TEXT_SIZE_FLOOR = 1.5;
const SCALE_D0_MIN = 0.5;
const SCALE_K_MIN = 0.15;
const DUP_OFFSET_MM = 2;

export const IMAGE_DROP_LINE = "png and other raster drops are not read yet: the art document has no image painter. drop an svg with path elements.";

export interface Frame {
  readonly w: number;
  readonly h: number;
}

type Ml = Record<string, string | number | boolean>;
interface MDoc { schema: ArtDocument["schema"]; version: ArtDocument["version"]; faces: { front: Ml[]; back: Ml[] } }

export interface ArtDocOptions {
  /** The current param value; anything that is not a layers value reads as an empty document. */
  readonly read: () => unknown;
  /** Writes a new value: the host sets the param and commits. */
  readonly write: (value: ArtValue) => void;
  readonly frame?: Frame;
  /** A surface for a grid, for text, logo and path layers. Without one those kinds draw nothing and have no handles. */
  readonly surface?: (grid: RasterGrid) => Surface;
  /** Slot colours as #rrggbb, slot 1 first. */
  readonly slots?: readonly string[];
  /** Palette for composing, FaceContext.palette. */
  readonly palette?: FaceContext["palette"];
  /** Alt is not needed to turn the snap off when this is false. Default true. */
  readonly snap?: boolean;
}

export type ArtDocEvent = "change" | "select" | "commit";

export interface ArtDocState {
  readonly uri: string | null;
  readonly face: ArtFace;
  readonly sel: string | null;
  readonly layers: readonly { readonly id: string; readonly kind: ArtLayerKind; readonly mute: boolean; readonly dx: number; readonly dy: number; readonly rot: number }[];
  readonly counts: { readonly front: number; readonly back: number };
  readonly view: { readonly zoom: number; readonly panX: number; readonly panY: number; readonly w: number; readonly h: number };
  readonly drag: DragMode | null;
  /** Handles of the selected layer in canvas css px: corners, the rotate dot and the centre; null with no selection. */
  readonly handles: { readonly corners: readonly (readonly [number, number])[]; readonly dot: readonly [number, number]; readonly centre: readonly [number, number] } | null;
  readonly notes: readonly string[];
}

export interface ArtDocController {
  /** The document on the board: the working copy during a drag, else the value's. */
  doc(): ArtDocument;
  value(): ArtValue;
  uri(): string;
  face(): ArtFace;
  setFace(face: ArtFace): void;
  layers(): readonly ArtLayer[];
  /** Face of the layer with this id, either face. */
  faceOf(id: string): ArtFace | null;
  selected(): ArtLayer | null;
  select(id: string | null): void;
  /** Adds a layer to the current face on top and selects it; returns its id. */
  add(kind: ArtLayerKind, over?: Record<string, string | number | boolean>): string;
  remove(id: string): boolean;
  /** Moves a layer by `by` places in paint order (1 raises). */
  reorder(id: string, by: number): boolean;
  duplicate(id: string): string | null;
  /** Copies a layer to the other face; returns the new id. */
  copyToOtherFace(id: string): string | null;
  /** Sets one field; returns null, or the line that says why the value was refused. */
  set(id: string, key: string, value: string | number | boolean): string | null;
  /** Moves by (ddx, ddy) mm with the move snap rules; alt in `mods` turns the snap off. */
  moveBy(id: string, ddx: number, ddy: number, mods?: Partial<Mods>): boolean;
  scaleBy(id: string, k: number, shift?: boolean): boolean;
  rotateTo(id: string, deg: number, mods?: Partial<Mods>): boolean;
  nudge(id: string, ax: number, ay: number, shift?: boolean): boolean;
  /** Reads a dropped file's text as svg paths and adds a path layer; returns the id, or null with the line in notes(). */
  dropSvg(text: string, at?: readonly [number, number]): string | null;
  /** Raster drops are refused with IMAGE_DROP_LINE and recorded in notes(). */
  dropRaster(name: string): null;
  /** Lines the last intake and render left for the person; cleared by the next edit. */
  notes(): readonly string[];

  pointerDown(e: BoardPointer): void;
  pointerMove(e: BoardPointer): void;
  pointerUp(): void;
  wheel(e: BoardWheel): void;
  dblclick(): void;
  key(e: BoardKey): boolean;
  resize(w: number, h: number): void;
  cursor(x: number, y: number): string;
  view(): View & { readonly zoom: number; readonly panX: number; readonly panY: number; readonly w: number; readonly h: number };
  frame(): Frame;
  handles(): Handles | null;
  bbox(L: ArtLayer): BBox | null;
  drag(): { readonly mode: DragMode; readonly snapped: { readonly x: boolean; readonly y: boolean } | null } | null;
  raster(): Raster;
  slots(): readonly string[];
  grids(): readonly RasterGrid[];
  /** Fonts arrived: drop cached bounds and the preview. */
  invalidate(): void;
  /** The value changed outside the controller (undo, a loaded design): drop the working copy and caches. */
  refresh(): void;
  state(): ArtDocState;
  on(type: ArtDocEvent, fn: () => void): () => void;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const r1 = (v: number): number => Math.round(v * 10) / 10;

function firstFree(taken: ReadonlySet<string>): string {
  let n = taken.size + 1;
  while (taken.has(`L${n}`)) n++;
  return `L${n}`;
}

/** The value a document points at, with the document carried. */
export function artValueOf(doc: ArtDocument): ArtValue {
  return { uri: artDocumentUri(doc), kind: "layers", doc };
}

/** Scale fields per kind: text takes size; shape, scope and circuit take w, h and t; the rest take w (bail.html:3057 to 3069, lineage bail.bench/ui-art-state). */
function scaleFields(L: Ml, s: Ml, k: number, shift: boolean): void {
  const n = (key: string): number => Number(s[key]);
  switch (L["kind"]) {
    case "text": L["size"] = Math.max(TEXT_SIZE_FLOOR, r1(n("size") * k)); break;
    case "shape": case "scope": case "circuit":
      L["w"] = Math.max(1, r1(n("w") * k));
      L["h"] = Math.max(1, r1(n("h") * k));
      if (L["kind"] !== "circuit" && !shift) L["t"] = Math.max(0.2, r1(n("t") * k));
      break;
    default: L["w"] = Math.max(1, r1(n("w") * k));
  }
}

export function createArtDoc(opts: ArtDocOptions): ArtDocController {
  const fr = opts.frame ?? DOC_FRAME;
  const bboxCache = new BBoxCache();
  const listeners: Record<ArtDocEvent, Set<() => void>> = { change: new Set(), select: new Set(), commit: new Set() };
  const emit = (t: ArtDocEvent): void => { for (const f of listeners[t]) f(); };
  const ext = 2 * Math.max(fr.w, fr.h) + 8;
  const bboxGrid: RasterGrid = { w: Math.ceil(ext * DOC_QUICK_RES), h: Math.ceil(ext * DOC_QUICK_RES), res: DOC_QUICK_RES };
  const previewGrid: RasterGrid = { w: Math.ceil(fr.w * DOC_QUICK_RES), h: Math.ceil(fr.h * DOC_QUICK_RES), res: DOC_QUICK_RES };
  const snapOn = opts.snap !== false;

  let face: ArtFace = "front";
  let sel: string | null = null;
  let cw = 400, ch = 400, zoom = 1, panX = 0, panY = 0;
  let work: ArtDocument | null = null;
  let notes: string[] = [];
  let preview: { key: string; face: ComposedFace } | null = null;
  let readSeen: unknown;
  let readDoc: ArtDocument = emptyArtDocument();
  let drag: { mode: DragMode; x0: number; y0: number; id: string; start: Ml | null; cx: number; cy: number; d0: number; a0: number; panX: number; panY: number; snapped: { x: boolean; y: boolean } | null; changed: boolean } | null = null;

  const fromValue = (): ArtDocument => {
    const v = opts.read();
    if (v !== readSeen) {
      readSeen = v;
      readDoc = isRecord(v) && v["kind"] === "layers" && isRecord(v["doc"]) && artDocumentIssues(v["doc"]).length === 0 ? (v["doc"] as unknown as ArtDocument) : emptyArtDocument();
    }
    return readDoc;
  };
  const doc = (): ArtDocument => work ?? fromValue();
  const clone = (): MDoc => structuredClone(doc()) as unknown as MDoc;
  const listOf = (d: ArtDocument | MDoc, f: ArtFace): readonly ArtLayer[] => d.faces[f] as unknown as readonly ArtLayer[];
  const layers = (): readonly ArtLayer[] => listOf(doc(), face);
  const find = (id: string | null): ArtLayer | null => (id === null ? null : layers().find((L) => L.id === id) ?? null);
  const taken = (d: MDoc): Set<string> => new Set([...d.faces.front, ...d.faces.back].map((L) => String(L["id"])));

  /** Writes a changed clone as the new value. */
  function save(d: MDoc): void {
    work = null;
    preview = null;
    const next = artValueOf(d as unknown as ArtDocument);
    opts.write(next);
    // Hosts that mirror state later read the same value back; the cache reads the new one at once.
    readSeen = undefined;
    emit("change");
    emit("commit");
  }
  /** Runs `fn` on a clone of the document; writes when it returns true. */
  function edit(fn: (d: MDoc) => boolean): boolean {
    const d = clone();
    notes = [];
    if (!fn(d)) return false;
    save(d);
    return true;
  }
  const layerIn = (d: MDoc, id: string): { list: Ml[]; i: number; f: ArtFace } | null => {
    for (const f of ART_FACES) {
      const i = d.faces[f].findIndex((L) => L["id"] === id);
      if (i >= 0) return { list: d.faces[f], i, f };
    }
    return null;
  };

  // ---- geometry

  /** `needs` is true when a layer of the face reads the surface (text, logo, path); the rest paint at cell centres and never make one. */
  const ctx = (grid: RasterGrid, needs: boolean): FaceContext => {
    return { surface: opts.surface === undefined || !needs ? (undefined as unknown as Surface) : opts.surface(grid), grid, rArt: Math.max(fr.w, fr.h) / 2, ...(opts.palette === undefined ? {} : { palette: opts.palette }) };
  };
  const NEEDS_SURFACE: ReadonlySet<string> = new Set(["text", "logo", "path"]);
  const paintable = (L: ArtLayer): boolean => L.kind !== "image" && L.kind !== "relief" && (opts.surface !== undefined || !NEEDS_SURFACE.has(L.kind));

  function bbox(L: ArtLayer): BBox | null {
    if (L.kind === "image" || L.kind === "relief") {
      const h = Number(L.w) / 2;
      return { x0: -h, x1: h, y0: -h, y1: h };
    }
    if (!paintable(L)) return null;
    const local = { ...L, dx: 0, dy: 0, rot: 0, mute: false, cut: "none" } as ArtLayer;
    return bboxCache.get(local, () => {
      try {
        return maskBounds(renderLayer(lowerArtLayer(local), ctx(bboxGrid, NEEDS_SURFACE.has(local.kind))), bboxGrid, "bottom");
      } catch (e) {
        notes = [`layer ${L.id} not drawn: ${e instanceof Error ? e.message : String(e)}`];
        return null;
      }
    });
  }
  const view = (): View & { zoom: number; panX: number; panY: number; w: number; h: number } => {
    const scale = Math.min(cw / fr.w, ch / fr.h) * DOC_FIT * zoom;
    return { scale, ox: cw / 2 + panX, oy: ch / 2 + panY, zoom, panX, panY, w: cw, h: ch };
  };
  function handlesOf(id: string): Handles | null {
    const L = find(id);
    if (L === null || L.mute) return null;
    const bb = bbox(L);
    return bb === null ? null : layerHandles(bb, { dx: L.dx, dy: L.dy, rot: L.rot }, view());
  }
  const hit = (x: number, y: number) => hitTest(layers().filter((L) => !L.mute).map((L) => L.id), sel, handlesOf, x, y);

  function raster(): Raster {
    const d = doc();
    const key = `${face}:${canonicalize(listOf(d, face))}`;
    if (preview === null || preview.key !== key) {
      const out = [];
      for (const L of listOf(d, face)) {
        if (!paintable(L) || (L.mute && (L.kind === "image" || L.kind === "relief"))) continue;
        try {
          out.push(lowerArtLayer(L));
        } catch (e) {
          notes = [`layer ${L.id} not drawn: ${e instanceof Error ? e.message : String(e)}`];
        }
      }
      let composed: ComposedFace;
      try {
        composed = composeFace(out, ctx(previewGrid, out.some((p) => NEEDS_SURFACE.has(p.kind))));
      } catch (e) {
        notes = [`face not drawn: ${e instanceof Error ? e.message : String(e)}`];
        composed = { art: { ...previewGrid, labels: new Uint8Array(previewGrid.w * previewGrid.h) } as unknown as ComposedFace["art"], holes: null };
      }
      preview = { key, face: composed };
    }
    return { mode: "preview", face: preview.face };
  }

  // ---- edits

  function setMl(d: MDoc, id: string): Ml | null {
    const at = layerIn(d, id);
    return at === null ? null : at.list[at.i]!;
  }
  const setSel = (id: string | null): void => {
    if (sel === id) return;
    sel = id;
    emit("select");
    emit("change");
  };

  const self: ArtDocController = {
    doc, value: () => artValueOf(doc()), uri: () => artDocumentUri(doc()),
    face: () => face,
    setFace(f) {
      if (f === face) return;
      face = f;
      if (find(sel) === null) sel = null;
      drag = null;
      emit("select");
      emit("change");
    },
    layers,
    faceOf: (id) => ART_FACES.find((f) => doc().faces[f].some((L) => L.id === id)) ?? null,
    selected: () => find(sel),
    select: setSel,
    add(kind, over = {}) {
      if (!(ART_LAYER_KINDS as readonly string[]).includes(kind)) throw new Error(`no layer kind ${kind}`);
      let id = "";
      edit((d) => {
        id = firstFree(taken(d));
        d.faces[face].push(artLayer(kind, id, over as never) as unknown as Ml);
        return true;
      });
      sel = id;
      emit("select");
      return id;
    },
    remove(id) {
      const had = edit((d) => {
        const at = layerIn(d, id);
        if (at === null) return false;
        at.list.splice(at.i, 1);
        return true;
      });
      if (had && sel === id) { sel = null; emit("select"); }
      return had;
    },
    reorder(id, by) {
      return edit((d) => {
        const at = layerIn(d, id);
        if (at === null) return false;
        const j = Math.max(0, Math.min(at.list.length - 1, at.i + by));
        if (j === at.i) return false;
        const [L] = at.list.splice(at.i, 1);
        at.list.splice(j, 0, L!);
        return true;
      });
    },
    duplicate(id) {
      let out: string | null = null;
      edit((d) => {
        const at = layerIn(d, id);
        if (at === null) return false;
        const c = structuredClone(at.list[at.i]!);
        out = firstFree(taken(d));
        c["id"] = out;
        c["dx"] = Number(c["dx"]) + DUP_OFFSET_MM;
        c["dy"] = Number(c["dy"]) - DUP_OFFSET_MM;
        at.list.splice(at.i + 1, 0, c);
        return true;
      });
      if (out !== null) setSel(out);
      return out;
    },
    copyToOtherFace(id) {
      let out: string | null = null;
      edit((d) => {
        const at = layerIn(d, id);
        if (at === null) return false;
        const c = structuredClone(at.list[at.i]!);
        out = firstFree(taken(d));
        c["id"] = out;
        d.faces[at.f === "front" ? "back" : "front"].push(c);
        return true;
      });
      return out;
    },
    set(id, key, value) {
      let refused: string | null = null;
      edit((d) => {
        const L = setMl(d, id);
        if (L === null) { refused = `no layer ${id}`; return false; }
        if (!(key in L) || key === "id" || key === "kind") { refused = `layer ${id} has no field ${key}`; return false; }
        const was = L[key]!;
        L[key] = value;
        const bad = artDocumentIssues(d).find((i) => (i.path ?? []).includes(key));
        if (bad !== undefined) { L[key] = was; refused = `${key} is ${JSON.stringify(value)}, ${bad.message.replace(/^[^,]*, /, "")}`; return false; }
        return was !== value;
      });
      return refused;
    },
    moveBy(id, ddx, ddy, mods = {}) {
      return edit((d) => {
        const L = setMl(d, id);
        if (L === null) return false;
        const r = snapMove(Number(L["dx"]), Number(L["dy"]), ddx, ddy, { shiftKey: mods.shiftKey === true, altKey: mods.altKey === true || !snapOn });
        const same = r.x === L["dx"] && r.y === L["dy"];
        L["dx"] = r.x;
        L["dy"] = r.y;
        return !same;
      });
    },
    scaleBy(id, k, shift = false) {
      return edit((d) => {
        const L = setMl(d, id);
        if (L === null) return false;
        scaleFields(L, structuredClone(L), Math.max(SCALE_K_MIN, k), shift);
        return true;
      });
    },
    rotateTo(id, deg, mods = {}) {
      return edit((d) => {
        const L = setMl(d, id);
        if (L === null) return false;
        const r = snapRotation(deg, { shiftKey: mods.shiftKey === true, altKey: mods.altKey === true || !snapOn });
        const same = r === L["rot"];
        L["rot"] = r;
        return !same;
      });
    },
    nudge(id, ax, ay, shift = false) {
      return self.moveBy(id, ax * (shift ? 5 : 0.25), ay * (shift ? 5 : 0.25), { altKey: true });
    },
    dropSvg(text, at = [0, 0]) {
      const got = readSvgPaths(text);
      if (!got.ok) { notes = [got.line]; emit("change"); return null; }
      const p = got.paths;
      let id: string | null = null;
      const w = Math.round(DROP_SPAN_MM * Math.min(1, p.bw / p.bh) * 10) / 10;
      edit((d) => {
        id = firstFree(taken(d));
        d.faces[face].push(artLayer("path", id, { d: p.d, bx: p.bx, by: p.by, bw: p.bw, bh: p.bh, w, dx: at[0], dy: at[1] }) as unknown as Ml);
        return true;
      });
      if (p.skipped > 0) notes = [`${p.skipped} svg element${p.skipped === 1 ? "" : "s"} skipped: only path data is read, not other shapes or transforms.`];
      if (id !== null) setSel(id);
      return id;
    },
    dropRaster(name) {
      notes = [`${name}: ${IMAGE_DROP_LINE}`];
      emit("change");
      return null;
    },
    notes: () => notes,

    pointerDown(e) {
      const v = view();
      if (e.button !== 0) {
        drag = { mode: "pan", x0: e.x, y0: e.y, id: "", start: null, cx: 0, cy: 0, d0: 1, a0: 0, panX, panY, snapped: null, changed: false };
        return;
      }
      const h = hit(e.x, e.y);
      if (h.mode === "none") { drag = null; setSel(null); return; }
      if (h.mode === "select") setSel(h.id);
      const L = find(h.id)!;
      const [mx, my] = px2mm(v, e.x, e.y);
      work = clone() as unknown as ArtDocument;
      drag = {
        mode: h.mode === "select" ? "move" : h.mode, x0: e.x, y0: e.y, id: L.id, start: structuredClone(L) as unknown as Ml,
        cx: L.dx, cy: L.dy, d0: Math.max(SCALE_D0_MIN, Math.hypot(mx - L.dx, my - L.dy)), a0: Math.atan2(my - L.dy, mx - L.dx),
        panX, panY, snapped: null, changed: false,
      };
    },
    pointerMove(e) {
      const D = drag;
      if (D === null) return;
      if (D.mode === "pan") { panX = D.panX + (e.x - D.x0); panY = D.panY + (e.y - D.y0); emit("change"); return; }
      const L = work === null ? null : setMl(work as unknown as MDoc, D.id);
      if (L === null || D.start === null) return;
      const v = view();
      const [mx, my] = px2mm(v, e.x, e.y);
      const mods: Mods = { shiftKey: e.shiftKey, altKey: e.altKey || !snapOn };
      if (D.mode === "move") {
        const r = snapMove(Number(D.start["dx"]), Number(D.start["dy"]), (e.x - D.x0) / v.scale, -(e.y - D.y0) / v.scale, mods);
        L["dx"] = r.x;
        L["dy"] = r.y;
        D.snapped = r.snapped;
      } else if (D.mode === "scale") {
        scaleFields(L, D.start, Math.max(SCALE_K_MIN, Math.hypot(mx - D.cx, my - D.cy) / D.d0), e.shiftKey);
      } else {
        L["rot"] = snapRotation(Number(D.start["rot"]) + (Math.atan2(my - D.cy, mx - D.cx) - D.a0) * 180 / Math.PI, mods);
      }
      D.changed = true;
      emit("change");
    },
    pointerUp() {
      const D = drag;
      drag = null;
      if (D === null || D.mode === "pan") return;
      const w = work;
      work = null;
      if (w !== null && D.changed && canonicalize(w) !== canonicalize(fromValue())) save(w as unknown as MDoc);
      else emit("change");
    },
    wheel(e) {
      const v = view();
      const [mx, my] = px2mm(v, e.x, e.y);
      zoom = Math.max(DOC_ZOOM_RANGE[0], Math.min(DOC_ZOOM_RANGE[1], zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      const s = view().scale;
      panX = e.x - cw / 2 - mx * s;
      panY = e.y - ch / 2 + my * s;
      emit("change");
    },
    dblclick() {
      zoom = 1;
      panX = 0;
      panY = 0;
      emit("change");
    },
    key(e) {
      const L = find(sel);
      if (L === null) return false;
      const a = keyAction(e);
      if (a === null) return false;
      if (a.kind === "nudge") self.nudge(L.id, a.ax, a.ay, a.shift);
      else if (a.kind === "delete") self.remove(L.id);
      else if (a.kind === "duplicate") self.duplicate(L.id);
      else self.reorder(L.id, a.by);
      return true;
    },
    resize(w, h) { cw = w; ch = h; },
    cursor(x, y) {
      const h = hit(x, y);
      return h.mode === "rotate" ? "crosshair" : h.mode === "scale" ? "nwse-resize" : h.mode === "move" ? "grab" : h.mode === "select" ? "pointer" : "default";
    },
    view, frame: () => fr,
    handles: () => (sel === null ? null : handlesOf(sel)),
    bbox,
    drag: () => (drag === null ? null : { mode: drag.mode, snapped: drag.snapped }),
    raster,
    slots: () => opts.slots ?? [],
    grids: () => [bboxGrid, previewGrid],
    invalidate() { bboxCache.clear(); preview = null; emit("change"); },
    refresh() {
      work = null;
      drag = null;
      readSeen = undefined;
      preview = null;
      if (find(sel) === null) sel = null;
      emit("change");
    },
    state() {
      const d = doc();
      const v = view();
      return {
        uri: artDocumentUri(d), face, sel,
        layers: layers().map((L) => ({ id: L.id, kind: L.kind, mute: L.mute, dx: L.dx, dy: L.dy, rot: L.rot })),
        counts: { front: d.faces.front.length, back: d.faces.back.length },
        view: { zoom: v.zoom, panX: v.panX, panY: v.panY, w: v.w, h: v.h },
        drag: drag === null ? null : drag.mode, notes,
        handles: (() => {
          const h = sel === null ? null : handlesOf(sel);
          return h === null ? null : { corners: h.corners, dot: h.dot, centre: h.centre };
        })(),
      };
    },
    on(type, fn) {
      listeners[type].add(fn);
      return () => { listeners[type].delete(fn); };
    },
  };
  return self;
}
