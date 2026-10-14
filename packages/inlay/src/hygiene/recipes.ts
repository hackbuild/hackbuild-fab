// Hygiene as three named recipes (M03-T05). Each reproduces one legacy
// bench cell for cell; none is merged with another, because their
// structuring elements and boundary rules differ (README "Hygiene recipes").
// Defaults come from the caller: COLLAR passes its own art settings, the
// inlay kind reads min feature from profile (M03-T08). The despeckle factor
// is profile constant despeckle.factor (despeckleFactor in despeckle.ts).
//
// collar-v5, collar.html:1149 to 1192 (lineage collar.bench/inlay-hygiene):
// per used slot, in scan order of first use, a box dilate by boost x k / 2
// when that is at least 1 px, then despeckle; then the colour gap against
// the union of the other slots when gap x k / 2 >= 1 and more than one slot
// is used; then the art clip, written in the same slot order.
//
// print-forge, INLAY part2.js:206 to 217 and rastermesh.js:293 to 362
// (lineage inlay.parts/inlay-hygiene-recipe): for each slot 1 to n but the
// host, in turn on the shared label grid, disc dilate over host cells, open,
// despeckle, gap; then the rim band re-stamped (part2.js:218 to 222).
//
// sprue, sprue.html:1107 to 1110 (lineage sprue.bench/inlay-hygiene): the
// zone AND compose applies, open by minF / 2 x ppm, close by minGap / 2 x
// ppm, then OR the coin ring.

import { commandError } from "@hackbuild/spec";
import type { LabelGrid } from "../surface.js";
import { boxDilate, gapLabels } from "./box.js";
import { despeckleCells, despeckleLabels, despeckleMask } from "./despeckle.js";
import { discDilateLabels, openLabels, spanDilate, spanErode } from "./disc.js";

/** Where art may stay. Coordinates are model mm, origin at the grid centre. */
export type ClipRegion =
  /** COLLAR: clear art outside a circle of radius r mm even on a non round blank (collar.html:1187). */
  | { readonly kind: "circle"; readonly r: number }
  /** Keep art only where mask is 1, for example the blank outline inset by keep. */
  | { readonly kind: "mask"; readonly mask: Uint8Array }
  | { readonly kind: "none" };

export interface CollarHygiene {
  /** stroke boost, mm (COLLAR 0.10) */
  readonly boost: number;
  /** colour gap, mm (COLLAR 0.45) */
  readonly gap: number;
  /** min feature, mm (COLLAR 0.90) */
  readonly minF: number;
  readonly despeck: boolean;
  /** fraction of a min-feature disc, from profile despeckle.factor */
  readonly despeckleFactor: number;
  readonly clip: ClipRegion;
}

export interface PrintForgeHygiene {
  /** stroke boost, mm (INLAY 0.15) */
  readonly boost: number;
  /** colour gap, mm (INLAY 0) */
  readonly gap: number;
  /** min feature, mm (INLAY 0.6) */
  readonly minF: number;
  readonly despeck: boolean;
  readonly despeckleFactor: number;
  /** the body or host slot art is carved from */
  readonly host: number;
  /** slots 1 to `slots` are processed, the host skipped */
  readonly slots: number;
  /** exact geometry hygiene must not eat, stamped back after it: the rim band */
  readonly restamp?: { readonly mask: Uint8Array; readonly slot: number };
}

export interface SprueHygiene {
  /** min black feature, mm (SPRUE 0.6) */
  readonly minF: number;
  /** min white gap, mm (SPRUE 0.35) */
  readonly minGap: number;
  /** the face zone compose ANDs before cleaning */
  readonly zone?: Uint8Array;
  /** the coin ring ORed after cleaning; omitted for a single layer (checkThin) */
  readonly ring?: Uint8Array;
}

export interface RecipeContexts {
  readonly "collar-v5": CollarHygiene;
  readonly "print-forge": PrintForgeHygiene;
  readonly sprue: SprueHygiene;
}

export type RecipeId = keyof RecipeContexts;

export interface RecipeDef<C> {
  /** canonical lineage.json row the recipe starts from (README "Hygiene recipes") */
  readonly lineage: string;
  /** the operations in the order they run */
  readonly steps: readonly string[];
  readonly run: (g: LabelGrid, ctx: C) => LabelGrid;
}

function needLength(path: string, a: Uint8Array, n: number): void {
  if (a.length !== n) throw commandError({ code: "E_SCHEMA", path, got: a.length, expected: `${n} cells`, hint: "a hygiene mask has one cell per grid cell" });
}

const CLIP: { readonly [K in ClipRegion["kind"]]: (c: Extract<ClipRegion, { kind: K }>, g: LabelGrid) => (i: number, j: number) => boolean } = {
  circle: (c, g) => (i, j) => {
    const x = (i + 0.5 - g.w / 2) / g.res, y = (j + 0.5 - g.h / 2) / g.res;
    return !(x * x + y * y > c.r * c.r);
  },
  mask: (c, g) => {
    needLength("/clip/mask", c.mask, g.w * g.h);
    return (i, j) => c.mask[j * g.w + i] === 1;
  },
  none: () => () => true,
};

function collarV5(g: LabelGrid, ctx: CollarHygiene): LabelGrid {
  const { w, h } = g, n = w * h, k = g.res, src = g.labels;
  const used: number[] = [];
  const seen = new Set<number>();
  for (let p = 0; p < n; p++) { const s = src[p]!; if (s && !seen.has(s)) { seen.add(s); used.push(s); } }
  const masks = new Map<number, Uint8Array>();
  for (const s of used) {
    const m = new Uint8Array(n);
    for (let p = 0; p < n; p++) if (src[p] === s) m[p] = 1;
    masks.set(s, m);
  }
  const boostPx = (ctx.boost * k) / 2;
  const minPx = Math.max(1, despeckleCells(ctx.minF, k, ctx.despeckleFactor));
  for (const [s, m] of masks) {
    let mm = boostPx >= 1 ? boxDilate(m, w, h, boostPx) : m;
    if (ctx.despeck) mm = despeckleMask(mm.slice(), w, h, minPx);
    masks.set(s, mm);
  }
  const gapPx = (ctx.gap * k) / 2;
  const finals = new Map<number, Uint8Array>();
  if (gapPx >= 1 && masks.size > 1) {
    for (const [s, m] of masks) {
      const other = new Uint8Array(n);
      for (const [s2, m2] of masks) if (s2 !== s) for (let p = 0; p < n; p++) if (m2[p]) other[p] = 1;
      const grown = boxDilate(other, w, h, gapPx);
      const f = new Uint8Array(n);
      for (let p = 0; p < n; p++) if (m[p] && !grown[p]) f[p] = 1;
      finals.set(s, f);
    }
  } else for (const [s, m] of masks) finals.set(s, m);
  const keep = (CLIP[ctx.clip.kind] as (c: ClipRegion, g: LabelGrid) => (i: number, j: number) => boolean)(ctx.clip, g);
  const out = new Uint8Array(n);
  for (const [s, m] of finals) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = j * w + i;
      if (m[p] && keep(i, j)) out[p] = s;
    }
  }
  return { w, h, res: g.res, labels: out };
}

function printForge(g: LabelGrid, ctx: PrintForgeHygiene): LabelGrid {
  const { w, h, res } = g, labels = g.labels.slice();
  const boost = Math.round((ctx.boost || 0) * res);
  const r = Math.max(0, Math.floor((ctx.minF / 2) * res));
  const minCells = despeckleCells(ctx.minF, res, ctx.despeckleFactor);
  const gap = Math.round(ctx.gap * res);
  for (let s = 1; s <= ctx.slots; s++) {
    if (s === ctx.host) continue;
    if (boost) discDilateLabels(labels, w, h, s, boost, ctx.host);
    openLabels(labels, w, h, s, r, ctx.host);
    if (ctx.despeck) despeckleLabels(labels, w, h, s, minCells, ctx.host);
    if (gap) gapLabels(labels, w, h, s, gap, ctx.host);
  }
  if (ctx.restamp !== undefined) {
    needLength("/restamp/mask", ctx.restamp.mask, w * h);
    for (let p = 0; p < w * h; p++) if (ctx.restamp.mask[p]) labels[p] = ctx.restamp.slot;
  }
  return { w, h, res, labels };
}

function sprue(g: LabelGrid, ctx: SprueHygiene): LabelGrid {
  const { w, h, res } = g, n = w * h;
  let m: Uint8Array = g.labels.map((v) => (v !== 0 ? 1 : 0));
  if (ctx.zone !== undefined) {
    const zone = ctx.zone;
    needLength("/zone", zone, n);
    m = m.map((v, p) => v & zone[p]!);
  }
  const a = (ctx.minF / 2) * res, b = (ctx.minGap / 2) * res;
  m = spanDilate(spanErode(m, w, h, a), w, h, a);
  m = spanErode(spanDilate(m, w, h, b), w, h, b);
  if (ctx.ring !== undefined) {
    const ring = ctx.ring;
    needLength("/ring", ring, n);
    m = m.map((v, p) => v | ring[p]!);
  }
  return { w, h, res, labels: m };
}

/** The recipe registry. */
export const RECIPES: { readonly [R in RecipeId]: RecipeDef<RecipeContexts[R]> } = {
  "collar-v5": { lineage: "collar.bench/collar-7", steps: ["split by slot", "box boost", "despeckle", "colour gap", "art clip"], run: collarV5 },
  "print-forge": { lineage: "inlay.hygiene-print-forge/mesh-seed", steps: ["per slot: disc boost, open, despeckle, gap", "restamp"], run: printForge },
  sprue: { lineage: "sprue.bench/sprue-html", steps: ["zone", "open", "close", "ring"], run: sprue },
};

/** Run a named hygiene recipe on a label grid; the input is never changed. */
export function hygiene<R extends RecipeId>(grid: LabelGrid, recipe: R, ctx: RecipeContexts[R]): LabelGrid {
  needLength("/labels", grid.labels, grid.w * grid.h);
  const def = RECIPES[recipe] as RecipeDef<RecipeContexts[R]> | undefined;
  if (def === undefined) {
    throw commandError({ code: "E_REF", path: "/recipe", got: recipe, expected: Object.keys(RECIPES).join(", "), hint: "name one of the three hygiene recipes" });
  }
  return def.run(grid, ctx);
}
