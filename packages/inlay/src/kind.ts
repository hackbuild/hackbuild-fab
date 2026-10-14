// The `inlay` feature kind (M03-T08, D-058, D-059): a generator, the four
// CHK-INL checks, fit class none and the reference cosmetic/coin-inlay.
//
// One inlay feature is one art slot of a part. Its declaration carries the
// part's whole art (both faces, the hygiene recipe, the slot colours), so
// the generator composes both faces, cleans them and splits them into one
// body per slot exactly as COLLAR does (collar.html:1126 to 1192 and 1368 to
// 1517, through face.ts, hygiene/recipes.ts and split.ts), then keeps the
// body of its own slot. Every slot of one art shares one label volume, so
// neighbouring slots share their boundary exactly. `art` is the content
// address of that declaration, hbf://art/<sha256 of its canonical JSON>, so
// two features naming one uri declare one art and a feature whose fields
// moved without its uri is refused.
//
// The bed face is declared as read in hand and mirrored only at extrude, in
// splitBodies (D-063 mirrorOnFlip). Fields beyond the spec InlayFeature
// (layers, recipe, grid, boost, gap, palette, material) are this kind's
// declaration; spec field names win where both exist.

import {
  canonicalize, commandError, sha256Hex,
  type CheckId, type FeatureKindDef, type FeatureOf, type GeneratedGeometry, type KernelCtx, type Mm,
  type NonEmpty, type SchemaIssue, type SchemaLike, type SchemaResult,
} from "@hackbuild/spec";
import { fillPolygonEvenOdd, vectorSurface } from "@hackbuild/geom";
import type { RasterMask } from "@hackbuild/mesh";
import { composeFace, type ComposedFace, type Layer } from "./face.js";
import { hygiene } from "./hygiene/recipes.js";
import { splitBodies, type SplitBodies } from "./split.js";
import type { RasterGrid } from "./surface.js";

/** Semver of the kind (spec/registry.ts RegistryEntry.version): major when the same declaration can build differently or be refused. */
export const INLAY_KIND_VERSION = "2.0.0";
/** The reference the kind is proved by (D-105). */
export const INLAY_REFERENCE = "cosmetic/coin-inlay";
export const INLAY_CHECK_IDS = ["CHK-INL-01", "CHK-INL-02", "CHK-INL-03", "CHK-INL-04"] as const satisfies NonEmpty<CheckId>;

/** Hygiene recipes a slot label grid can run. sprue collapses every slot to one mask, so it serves SPRUE's single layer (M03-T10), never this kind. */
export const INLAY_RECIPES = ["collar-v5", "print-forge"] as const;
export type InlayRecipe = (typeof INLAY_RECIPES)[number];

/** Everything that decides the art grids; its canonical JSON hashes into the `art` uri. */
export interface InlayArt {
  /** Cell grid centred on the part origin: w by h cells at res cells per mm. */
  readonly grid: RasterGrid;
  /** Layers per face in paint order; the bed face as read in hand. */
  readonly layers: { readonly top: readonly Layer[]; readonly bed: readonly Layer[] };
  readonly recipe: InlayRecipe;
  /** Stroke boost, mm. */
  readonly boost: Mm;
  /** Colour gap, mm. */
  readonly gap: Mm;
  /** Slot colour per slot, index slot - 1, "#rrggbb" (the chase slot previews). */
  readonly palette: readonly string[];
  /** Minimum printable feature, mm (spec InlayFeature.minFeature). */
  readonly minFeature: Mm;
  /** Despeckle threshold, fraction of a min-feature disc area (spec InlayFeature.despeckle); 0 turns despeckle off. */
  readonly despeckle: number;
}

/** The inlay declaration a build.ts writes: the spec feature plus the art and this slot's material. */
export type InlayDecl = FeatureOf<"inlay"> & Omit<InlayArt, "minFeature" | "despeckle"> & {
  /** Profile material id of this slot's filament. */
  readonly material: string;
};

/** The art fields of a declaration, the input of artUri. */
export function artOf(f: InlayDecl): InlayArt {
  return {
    grid: { w: f.grid.w, h: f.grid.h, res: f.grid.res },
    layers: f.layers, recipe: f.recipe, boost: f.boost, gap: f.gap, palette: f.palette,
    minFeature: f.minFeature, despeckle: f.despeckle,
  };
}

/** hbf://art/<sha256 of the canonical JSON of the art>; a build.ts computes the same uri with spec canonicalize and sha256Hex. */
export function artUri(art: InlayArt): string {
  return `hbf://art/${sha256Hex(canonicalize(art))}`;
}

/** The two faces after hygiene, as read in hand. */
export interface ArtFaces {
  readonly top: ComposedFace;
  readonly bed: ComposedFace;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function hasCut(layers: readonly Layer[]): boolean {
  return layers.some((L) => L.cut === true && L.off !== true);
}

function cleaned(face: ComposedFace, art: InlayArt): ComposedFace {
  const g = face.art;
  const despeck = art.despeckle > 0;
  const factor = despeck ? art.despeckle : 1;
  const labels = art.recipe === "print-forge"
    ? hygiene(g, "print-forge", {
      boost: art.boost, gap: art.gap, minF: art.minFeature, despeck, despeckleFactor: factor,
      // 0 is the cell no layer painted, the host the art is carved from.
      host: 0, slots: art.palette.length,
    })
    : hygiene(g, "collar-v5", {
      boost: art.boost, gap: art.gap, minF: art.minFeature, despeck, despeckleFactor: factor, clip: { kind: "none" },
    });
  return { art: labels, holes: face.holes };
}

const faceCache = new Map<string, ArtFaces>();
const CACHE_MAX = 16;

function remember<V>(cache: Map<string, V>, key: string, make: () => V): V {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const v = make();
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, v);
  return v;
}

/**
 * Both faces composed on the vector surface and cleaned by the recipe. Pure
 * in the art: the result is cached by its uri. Through cuts are refused:
 * carving them from the host lands with COLLAR on the package (M03-T09).
 */
export function artFaces(art: InlayArt): ArtFaces {
  return remember(faceCache, artUri(art), () => {
    for (const side of ["top", "bed"] as const) {
      if (hasCut(art.layers[side])) {
        throw commandError({
          code: "E_KERNEL", path: `/layers/${side}`, got: "cut layer", record: "kernels/art-inlay",
          hint: "the inlay kind does not carve through cuts from the host yet; remove the cut layer (M03-T09 carries cuts)",
        });
      }
    }
    const { w, h, res } = art.grid;
    const surface = vectorSurface({ w, h, res });
    // rArt only scales image layers, which the node surface refuses; half the grid span keeps them on the grid.
    const ctx = { surface, grid: { w, h, res }, rArt: Math.min(w, h) / (2 * res), palette: { slots: art.palette, body: 0 } };
    return { top: cleaned(composeFace(art.layers.top, ctx), art), bed: cleaned(composeFace(art.layers.bed, ctx), art) };
  });
}

/** What the split needs from the host body and the preset. */
export interface InlayHost {
  readonly id: string;
  readonly slot: number;
  /** Part thickness, mm: the top face height over the bed. */
  readonly thk: Mm;
  /** Preset id and layer height, mm. */
  readonly machine: { readonly id: string; readonly layerHeight: Mm };
}

/** Inlay depth, mm: depthLayers x the preset layer height. */
export function depthOf(f: Pick<InlayDecl, "depthLayers">, layerHeight: Mm): Mm {
  return Number((f.depthLayers * layerHeight).toFixed(9));
}

const splitCache = new Map<string, SplitBodies>();

/** The label volume and one body per art slot, as the generator emits them. */
export function inlaySplit(f: InlayDecl, host: InlayHost): SplitBodies {
  const art = artOf(f);
  const depth = depthOf(f, host.machine.layerHeight);
  const key = canonicalize({ art: f.art, depth, host: { id: host.id, slot: host.slot, thk: host.thk, machine: host.machine } });
  return remember(splitCache, key, () => {
    const faces = artFaces(art);
    return splitBodies(faces.top, faces.bed, depth, {
      id: host.id, thk: host.thk, slot: host.slot, machine: host.machine,
      materials: art.palette.map(() => f.material),
    });
  });
}

/** The host body and preset from a kernel context; the host must be a prism standing on the bed under the top face. */
function hostOf(f: InlayDecl, ctx: KernelCtx): InlayHost {
  const base = ctx.body.base;
  if (base.route !== "prism" || base.z[0] !== 0) {
    throw commandError({
      code: "E_KERNEL", path: `/features/${f.id}/body`, got: base.route === "prism" ? `prism from z ${base.z[0]}` : base.route,
      expected: "a prism host standing on the bed (z from 0)", record: "kernels/art-inlay",
      hint: `inlay ${f.id} carves its host by the stage 5 partition, which needs a prism host from z 0; declare the blank as a prism`,
    });
  }
  const top = base.z[1];
  const [nx, ny, nz] = f.face.normal;
  if (nx !== 0 || ny !== 0 || nz !== 1 || Math.abs(f.face.origin[2] - top) > 1e-9) {
    throw commandError({
      code: "E_SCHEMA", path: `/features/${f.id}/face`, got: { origin: f.face.origin, normal: f.face.normal },
      expected: `the host top face, origin z ${top} and normal [0, 0, 1]`,
      hint: `set face to the top face of ${ctx.body.id}; the bed-face art goes in layers.bed as read in hand`,
    });
  }
  return { id: ctx.body.id, slot: ctx.body.slot, thk: top, machine: { id: ctx.machineView.id, layerHeight: ctx.machineView.layerHeight } };
}

function checkArt(f: InlayDecl): void {
  const want = artUri(artOf(f));
  if (f.art !== want) {
    throw commandError({
      code: "E_SCHEMA", path: `/features/${f.id}/art`, got: f.art, expected: want,
      hint: `art must be the content address of the declared art; set it to ${want} (sha256 of canonicalize of the art fields)`,
    });
  }
}

/**
 * Art cells must sit over the host. The label grid is square, so a text
 * run or a path wider than the blank paints cells past its edge, and the
 * split would stand them beside the part as a loose body. The bed face is
 * read in hand, so it is held against the outline mirrored in x, as the
 * extrude mirrors it.
 */
function checkInsideHost(f: InlayDecl, ctx: KernelCtx): void {
  const base = ctx.body.base;
  if (base.route !== "prism") return;
  const faces = artFaces(artOf(f));
  for (const side of ["top", "bed"] as const) {
    const g = faces[side].art;
    const rings = side === "top" ? base.outline : base.outline.map((r) => r.map(([x, y]): [number, number] => [-x, y]));
    const inside = fillPolygonEvenOdd({ w: g.w, h: g.h, res: g.res }, rings, "bottom");
    let n = 0;
    for (let p = 0; p < g.labels.length; p++) if (g.labels[p] !== 0 && g.labels[p] !== ctx.body.slot && inside[p] === 0) n++;
    if (n > 0) {
      const area = n / (g.res * g.res);
      throw commandError({
        code: "E_SCHEMA", path: `/features/${f.id}/layers/${side}`, got: `${n} art cells, ${area.toFixed(3)} mm2 (computed), outside the blank`,
        expected: `art inside the outline of ${ctx.body.id}`, record: "kernels/art-inlay",
        hint: `the ${side} art runs past the edge of ${ctx.body.id}; make the text or path smaller or move it toward the centre`,
      });
    }
  }
}

function generateInlay(f: InlayDecl, ctx: KernelCtx): GeneratedGeometry {
  checkArt(f);
  const host = hostOf(f, ctx);
  checkInsideHost(f, ctx);
  if (f.slot === host.slot) {
    throw commandError({ code: "E_SCHEMA", path: `/features/${f.id}/slot`, got: f.slot, expected: `a slot other than the host slot ${host.slot}`, hint: `art in the host slot is host material; pick another slot for ${f.id}` });
  }
  const split = inlaySplit(f, host);
  const body = split.bodies.find((b) => b.slot === f.slot);
  if (body === undefined) {
    throw commandError({
      code: "E_SCHEMA", path: `/features/${f.id}/slot`, got: f.slot, expected: `a slot the art paints: ${split.bodies.map((b) => b.slot).join(", ") || "none"}`,
      hint: `no cell of slot ${f.slot} survives hygiene on either face; paint it or remove ${f.id}`,
    });
  }
  return {
    preUnionCutters: [], positives: [], postUnionCutters: [],
    bodies: [{ role: "art", shape: body.base, slot: f.slot, material: f.material }],
    owns: { volume: f.id },
  };
}

/** Every raster mask the generator's shape names, by uri, for the stage runner's mask lookup. */
export function inlayMasks(f: FeatureOf<"inlay">, ctx: KernelCtx): ReadonlyMap<string, RasterMask> {
  const d = f as InlayDecl;
  checkArt(d);
  return inlaySplit(d, hostOf(d, ctx)).masks;
}

// ---- schema ----

const HEX = /^#[0-9a-fA-F]{6}$/;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function issuesOf(v: Record<string, unknown>): SchemaIssue[] {
  const out: SchemaIssue[] = [];
  const need = (ok: boolean, key: string, message: string): void => {
    if (!ok) out.push({ message, path: [key] });
  };
  need(v["kind"] === "inlay", "kind", `kind ${String(v["kind"])}, expected inlay`);
  need(typeof v["id"] === "string", "id", "inlay needs an id");
  need(typeof v["art"] === "string" && String(v["art"]).startsWith("hbf://art/"), "art", "art is the hbf://art/<sha256> of the declared art");
  const face = v["face"];
  need(isRecord(face) && Array.isArray(face["origin"]) && Array.isArray(face["normal"]) && Array.isArray(face["u"]), "face", "face is a FaceFrame: origin, normal, u");
  need(Number.isInteger(v["slot"]) && (v["slot"] as number) >= 1, "slot", "slot is a whole number from 1");
  need(Number.isInteger(v["depthLayers"]) && (v["depthLayers"] as number) >= 1, "depthLayers", "depthLayers is a whole number of layers from 1");
  need(num(v["minFeature"]) && v["minFeature"] > 0, "minFeature", "minFeature is a length above 0 mm");
  need(num(v["despeckle"]) && v["despeckle"] >= 0 && v["despeckle"] <= 1, "despeckle", "despeckle is a fraction of a min-feature disc from 0 to 1");
  const grid = v["grid"];
  need(isRecord(grid) && Number.isInteger(grid["w"]) && Number.isInteger(grid["h"]) && (grid["w"] as number) > 0 && (grid["h"] as number) > 0 && num(grid["res"]) && grid["res"] > 0,
    "grid", "grid is w and h whole cells above 0 at res cells per mm above 0");
  const layers = v["layers"];
  need(isRecord(layers) && Array.isArray(layers["top"]) && Array.isArray(layers["bed"]), "layers", "layers holds top and bed lists");
  need((INLAY_RECIPES as readonly unknown[]).includes(v["recipe"]), "recipe", `recipe is one of ${INLAY_RECIPES.join(", ")}`);
  need(num(v["boost"]) && v["boost"] >= 0, "boost", "boost is a length from 0 mm");
  need(num(v["gap"]) && v["gap"] >= 0, "gap", "gap is a length from 0 mm");
  const palette = v["palette"];
  need(Array.isArray(palette) && palette.length > 0 && palette.every((c) => typeof c === "string" && HEX.test(c)), "palette", "palette lists one #rrggbb colour per slot");
  need(typeof v["material"] === "string" && String(v["material"]).length > 0, "material", "material is a profile material id");
  if (out.length === 0 && Array.isArray(palette) && (v["slot"] as number) > palette.length) out.push({ message: `slot ${String(v["slot"])} has no palette colour`, path: ["slot"] });
  return out;
}

/** A Standard Schema v1 validator over the fields the generator and the checks read. */
export const inlaySchema: SchemaLike<unknown, FeatureOf<"inlay">> = {
  "~standard": {
    version: 1, vendor: "hackbuild-inlay",
    validate: (value: unknown): SchemaResult<FeatureOf<"inlay">> => {
      if (!isRecord(value)) return { issues: [{ message: "expected an inlay feature object" }] };
      const issues = issuesOf(value);
      return issues.length > 0 ? { issues } : { value: value as unknown as FeatureOf<"inlay"> };
    },
  },
};

export const inlayKind: FeatureKindDef<"inlay"> = {
  kind: "inlay",
  version: INLAY_KIND_VERSION,
  schema: inlaySchema,
  generate: (f, ctx) => generateInlay(f as InlayDecl, ctx),
  checks: INLAY_CHECK_IDS,
  fit: "none",
  reference: [INLAY_REFERENCE],
  routes: ["raster"],
};
