// Compose one face into a slot grid: COLLAR buildFace up to the hygiene
// pass (collar.html:1126 to 1148, lineage collar.bench/inlay-face). Layers
// paint in list order and a later layer overwrites earlier cells; a muted
// layer is skipped; a cut layer goes into the holes mask, which removes
// material through the full thickness and is never clipped to the art
// radius. Hygiene and the art-radius clip are the recipes of M03-T05.

import { commandError } from "@hackbuild/spec";
import { renderCircuit, type CircuitLayer } from "./layers/circuit.js";
import { drawImageLayer, type ImageLayer } from "./layers/image.js";
import { renderLogo, type LogoLayer } from "./layers/logo.js";
import { renderPath, type PathLayer } from "./layers/path.js";
import { renderRing, type RingLayer } from "./layers/ring.js";
import { renderScope, type ScopeLayer } from "./layers/scope.js";
import { renderShape, type ShapeLayer } from "./layers/shapes.js";
import { renderText, type TextLayer } from "./layers/text.js";
import { quantize } from "./quantize.js";
import type { LabelGrid, LayerResult, RasterGrid, Surface } from "./surface.js";

/** COLLAR's four layer kinds, the set the art board manipulates (bench-core artboard/manip.ts). */
export type Layer = TextLayer | RingLayer | ImageLayer | PathLayer;
/** BAIL's four added kinds (lineage bail.bench/inlay-*). */
export type BailLayer = ShapeLayer | ScopeLayer | CircuitLayer | LogoLayer;
/** Every kind a face composes; the registry below holds one renderer for each. */
export type PaintLayer = Layer | BailLayer;

export interface FaceContext {
  readonly surface: Surface;
  readonly grid: RasterGrid;
  /** art radius, mm (layers/shape.ts artRadius) */
  readonly rArt: number;
  /** Slot colours and the body slot, for palette images (COLLAR ST.slots and ST.base). */
  readonly palette?: { readonly slots: readonly string[]; readonly body: number };
}

export interface ComposedFace {
  /** slot per cell, 0 where no layer painted */
  readonly art: LabelGrid;
  /** 1 where a cut layer removes material; null when no cell is cut */
  readonly holes: Uint8Array | null;
}

type Renderers = { readonly [K in PaintLayer["kind"]]: (L: Extract<PaintLayer, { kind: K }>, ctx: FaceContext) => LayerResult[] };

/** The layer kind registry: one renderer per kind. */
export const LAYER_RENDERERS: Renderers = {
  text: (L, ctx) => renderText(L, ctx.surface, ctx.grid),
  ring: (L, ctx) => renderRing(L, ctx.grid),
  path: (L, ctx) => renderPath(L, ctx.surface, ctx.grid),
  // Shape, scope and circuit paint at cell centres and never reach the surface, so they render alike in node and in the browser. A circuit's drills take the body label, FaceContext.palette.body, 0 (the host) when no palette is given.
  shape: (L, ctx) => renderShape(L, ctx.grid),
  scope: (L, ctx) => renderScope(L, ctx.grid),
  circuit: (L, ctx) => renderCircuit(L, ctx.grid, ctx.palette?.body ?? 0),
  logo: (L, ctx) => renderLogo(L, ctx.surface, ctx.grid),
  image: (L, ctx) => {
    const img = drawImageLayer(L, ctx.surface, ctx.grid, ctx.rArt);
    if (img === null) return [];
    const res = ctx.grid.res;
    if (L.mode === "palette") {
      if (ctx.palette === undefined) {
        throw commandError({ code: "E_SCHEMA", path: "/palette", got: null, expected: "slot colours and the body slot", hint: "a palette image needs FaceContext.palette" });
      }
      return [{ map: quantize(img, "palette", { res, ...ctx.palette }).labels }];
    }
    if (L.mode === "mono") {
      return [{ map: quantize(img, "mono", { res, slot: L.slot, ...(L.thr === undefined ? {} : { thr: L.thr }), ...(L.invert === undefined ? {} : { invert: L.invert }) }).labels }];
    }
    return [{ map: quantize(img, "alpha", { res, slot: L.slot }).labels }];
  },
};

export function renderLayer(L: PaintLayer, ctx: FaceContext): LayerResult[] {
  const render = LAYER_RENDERERS[L.kind] as (l: PaintLayer, c: FaceContext) => LayerResult[];
  return render(L, ctx);
}

export function composeFace(layers: readonly PaintLayer[], ctx: FaceContext): ComposedFace {
  const { w, h, res } = ctx.grid;
  const n = w * h;
  const out = new Uint8Array(n);
  const holes = new Uint8Array(n);
  for (const L of layers) {
    if (L.off) continue;
    const results = renderLayer(L, ctx);
    if (L.cut) {
      for (const r of results) {
        const m = "map" in r ? r.map : r.mask;
        for (let p = 0; p < n; p++) if (m[p]) holes[p] = 1;
      }
      continue;
    }
    for (const r of results) {
      if ("map" in r) {
        for (let p = 0; p < n; p++) if (r.map[p]) out[p] = r.map[p]!;
      } else {
        const sl = r.slot;
        for (let p = 0; p < n; p++) if (r.mask[p]) out[p] = sl;
      }
    }
  }
  return { art: { w, h, res, labels: out }, holes: holes.includes(1) ? holes : null };
}
