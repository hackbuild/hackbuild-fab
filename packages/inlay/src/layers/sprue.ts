// SPRUE faces on the package (M03-T10): the blank, art zone, keyring hole
// and coin ring of SPRUE `geo` (sprue.html:999 to 1033), its text layers
// (`drawLayer`, sprue.html:1040 to 1095) and `compose` / `checkThin`
// (sprue.html:1097 to 1125), lineage sprue.bench/inlay-sprue-face. Text is
// laid out here and painted by an injected Surface (D-045); a canvas
// surface in its "px" text mode issues SPRUE's own canvas calls. Hygiene is
// the `sprue` recipe and the thin flags are thinFlags, both from
// hygiene/; the polygon fill is geom fillPolygonEvenOdd.
//
// Every mask here is SPRUE's: w x h cells, row 0 at the TOP (largest y),
// x_mm = (i + 0.5 - w / 2) / ppm and y_mm = (h / 2 - j - 0.5) / ppm at the
// cell centre. The inlay label grids elsewhere keep row 0 at the bottom.
// The blank outline belongs to the design (designs/sprue/build.ts) and
// arrives as a ring.

import { commandError, type Ring } from "@hackbuild/spec";
import { fillPolygonEvenOdd } from "@hackbuild/geom";
import { hygiene } from "../hygiene/recipes.js";
import { thinFlags, type ThinResult } from "../hygiene/thin.js";
import type { BuildWarning } from "@hackbuild/spec";
import type { LabelGrid, RasterGrid, Surface } from "../surface.js";
import { spanDilate, spanErode } from "../hygiene/disc.js";

/** A SPRUE text layer as the bench stores it (sprue.html textLayer, line 975). */
export interface SprueTextLayer {
  readonly type: "text";
  readonly text: string;
  /** CSS family */
  readonly font: string;
  /** CSS weight, "400" to "900" */
  readonly weight: string;
  /** em size, mm */
  readonly size: number;
  /** letter spacing, mm */
  readonly tracking: number;
  /** centre, mm */
  readonly x: number;
  readonly y: number;
  /** degrees counter-clockwise */
  readonly rot: number;
  /** arc radius, mm; 0 sets the text straight */
  readonly arc: number;
  /** arc text runs over the top */
  readonly arcTop: boolean;
  readonly mute?: boolean;
}

/** An image layer (sprue.html imageLayer, line 976). Composed in the browser by the bench only; the package refuses it. */
export interface SprueImageLayer {
  readonly type: "image";
  readonly mute?: boolean;
}

export type SprueLayer = SprueTextLayer | SprueImageLayer;

/** The blank fields `geo` reads (sprue.html ST, line 957, and holeSpec, line 1001). */
export interface SprueBlank {
  readonly kind: "pick" | "coin";
  readonly pickHole: boolean;
  /** mm */
  readonly holeD: number;
  /** keyring hole centre over the blank centre, mm, scale applied (holeSpec: 10.4 x pickScale) */
  readonly holeY: number;
  /** mm */
  readonly coinD: number;
  readonly ring: boolean;
  /** mm */
  readonly ringW: number;
  /** mm */
  readonly ringIn: number;
  /** art margin, mm */
  readonly margin: number;
  /** air kept round the hole and inside the coin ring, mm (sprue.html:1029 and 1031, 0.9) */
  readonly keep: number;
  /** cells per mm */
  readonly ppm: number;
}

/** What the hygiene reads (sprue.html ST): min black and min white gap, mm. */
export interface SprueClean {
  readonly minF: number;
  readonly minGap: number;
}

/** SPRUE's blank masks, row 0 at the top. */
export interface SprueGeo {
  readonly w: number;
  readonly h: number;
  readonly ppm: number;
  readonly blank: Uint8Array;
  readonly holes: Uint8Array;
  readonly ring: Uint8Array;
  readonly zone: Uint8Array;
  readonly poly: Ring;
}

/** Cells of air kept round the blank, mm (sprue.html:1020, `+ 4`). */
export const SPRUE_GRID_PAD = 4;
/** Grid sides are a whole number of these cells (sprue.html:1021). */
export const SPRUE_GRID_STEP = 8;
/** Alpha at or above which a cell is ink: SPRUE reads luminance under 128 over white (sprue.html:1103); black over white in Chromium crosses there at alpha 127 (measured, Chrome 150, by the M03-T10 parity run). */
export const SPRUE_INK_ALPHA = 127;
/** Arc text under the arc sits out by this fraction of the size (sprue.html:1077). */
export const SPRUE_ARC_DROP = 0.72;

/** Cells whose centre is within r cells of (cx, cy) cells (sprue.html S.disc, lines 326 to 334). */
export function discCells(w: number, h: number, cx: number, cy: number, r: number): Uint8Array {
  const o = new Uint8Array(w * h);
  const r2 = r * r;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    if (dx * dx + dy * dy <= r2) o[y * w + x] = 1;
  }
  return o;
}

const andNot = (a: Uint8Array, b: Uint8Array): Uint8Array => a.map((v, p) => v & (b[p]! ^ 1));

/**
 * SPRUE `geo` (sprue.html:1006 to 1033): blank, holes, ring and art zone,
 * row 0 at the top. `poly` is the blank outline in mm, y up, centred: the
 * design's own outline function (designs/sprue/build.ts blankOutline, the
 * port of S.pickOutline and S.circleOutline), so one copy of it exists.
 */
export function sprueGeo(b: SprueBlank, poly: Ring): SprueGeo {
  const ppm = b.ppm;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const span = Math.max(x1 - x0, y1 - y0) + SPRUE_GRID_PAD;
  const w = Math.ceil(span * ppm / SPRUE_GRID_STEP) * SPRUE_GRID_STEP, h = w;
  const blank = fillPolygonEvenOdd({ w, h, res: ppm }, [poly], "top");
  const cx = w / 2, cy = h / 2;
  const hole = b.kind === "pick" && b.pickHole;
  const holes = hole ? discCells(w, h, cx, cy - b.holeY * ppm, b.holeD / 2 * ppm) : new Uint8Array(w * h);
  let ring: Uint8Array = new Uint8Array(w * h), zone: Uint8Array;
  if (b.kind === "coin") {
    const R = b.coinD / 2;
    if (b.ring) {
      ring = andNot(discCells(w, h, cx, cy, (R - b.ringIn) * ppm), discCells(w, h, cx, cy, (R - b.ringIn - b.ringW) * ppm));
      zone = discCells(w, h, cx, cy, (R - b.ringIn - b.ringW - b.keep) * ppm);
    } else zone = discCells(w, h, cx, cy, (R - b.margin) * ppm);
  } else {
    zone = spanErode(blank, w, h, b.margin * ppm);
    if (hole) zone = andNot(zone, spanDilate(holes, w, h, b.keep * ppm));
  }
  return { w, h, ppm, blank, holes, ring, zone, poly };
}

/** The surface font of a layer: CSS weight then family. */
export const sprueFont = (L: SprueTextLayer): string => `${L.weight} ${L.font}`;

/** One fillText a SPRUE text layer issues. */
export interface SprueDraw {
  readonly text: string;
  /** mm, model frame */
  readonly x: number;
  readonly y: number;
  /** radians counter-clockwise */
  readonly rot: number;
  readonly baseline: "alphabetic" | "middle";
  /** letter spacing, mm */
  readonly spacing: number;
}

/**
 * Straight text: one run centred on (x, y), middle baseline, tracking as
 * letter spacing. Arc text: one glyph per character on an arc of radius
 * `arc` round (x, y), each advance its measured width plus tracking, over
 * the top at phi = pi / 2 + (total / 2 - centre) / r, under it at phi =
 * -pi / 2 + (centre - total / 2) / r out by 0.72 x size, glyphs rotated
 * to the tangent (sprue.html:1066 to 1086).
 */
export function layoutSprueText(L: SprueTextLayer, surface: Pick<Surface, "measure">): SprueDraw[] {
  const rot = L.rot * Math.PI / 180;
  if (!(L.arc > 0)) return [{ text: L.text, x: L.x, y: L.y, rot, baseline: "middle", spacing: L.tracking }];
  const font = sprueFont(L);
  const chars = Array.from(L.text);
  const widths = chars.map((c) => surface.measure(c, font, L.size) + L.tracking);
  const total = widths.reduce((a, b) => a + b, 0) - L.tracking;
  const r = L.arc, c = Math.cos(rot), s = Math.sin(rot);
  const out: SprueDraw[] = [];
  let pos = 0;
  chars.forEach((ch, i) => {
    const cw = widths[i]! - L.tracking;
    const centre = pos + cw / 2;
    const top = L.arcTop;
    const phi = top ? Math.PI / 2 + (total / 2 - centre) / r : -Math.PI / 2 + (centre - total / 2) / r;
    const turn = top ? phi - Math.PI / 2 : phi + Math.PI / 2;
    const rr = top ? r : r + L.size * SPRUE_ARC_DROP;
    const ox = rr * Math.cos(phi), oy = rr * Math.sin(phi);
    out.push({ text: ch, x: L.x + c * ox - s * oy, y: L.y + s * ox + c * oy, rot: rot + turn, baseline: "alphabetic", spacing: 0 });
    pos += widths[i]!;
  });
  return out;
}

function refuseImage(i: number): never {
  throw commandError({
    code: "E_KERNEL", path: `/layers/${i}`, got: "image", record: "kernels/art-inlay",
    hint: "sprue image layers (Otsu threshold, sprue.html:1045 to 1062) are not ported to the package; use text layers or the inlay image layer",
  });
}

/** Paint layers on a cleared surface in order, read once, threshold, flip to SPRUE rows and AND the zone (sprue.html compose to line 1106). */
export function sprueRaw(layers: readonly SprueLayer[], surface: Surface, g: SprueGeo): Uint8Array {
  surface.clear();
  layers.forEach((L, i) => {
    if (L.mute) return;
    if (L.type !== "text") refuseImage(i);
    const font = sprueFont(L);
    for (const d of layoutSprueText(L, surface)) {
      surface.fillText(d.text, font, L.size, d.x, d.y, d.rot, { align: "center", along: 0, baseline: d.baseline, spacing: d.spacing });
    }
  });
  const grid: RasterGrid = { w: g.w, h: g.h, res: g.ppm };
  const a = surface.readAlpha(grid);
  const m = new Uint8Array(g.w * g.h);
  for (let j = 0; j < g.h; j++) {
    const src = (g.h - 1 - j) * g.w, dst = j * g.w;
    for (let i = 0; i < g.w; i++) m[dst + i] = a[src + i]! >= SPRUE_INK_ALPHA ? g.zone[dst + i]! : 0;
  }
  return m;
}

const asGrid = (g: SprueGeo, labels: Uint8Array): LabelGrid => ({ w: g.w, h: g.h, res: g.ppm, labels });

/** One face as SPRUE composes it: raw ink in the zone, the `sprue` recipe, then the ring on a ringed coin (sprue.html:1097 to 1111). */
export function composeSprue(layers: readonly SprueLayer[], surface: Surface, g: SprueGeo, b: Pick<SprueBlank, "kind" | "ring">, clean: SprueClean): { readonly raw: Uint8Array; readonly clean: Uint8Array } {
  const raw = sprueRaw(layers, surface, g);
  const ring = b.kind === "coin" && b.ring ? { ring: g.ring } : {};
  const out = hygiene(asGrid(g, raw), "sprue", { minF: clean.minF, minGap: clean.minGap, zone: g.zone, ...ring });
  return { raw, clean: out.labels };
}

/** SPRUE checkThin (sprue.html:1112 to 1124): each unmuted layer alone, raw and cleaned, without the ring. */
export function sprueThin(layers: readonly SprueLayer[], side: string, surface: Surface, g: SprueGeo, clean: SprueClean): { readonly layers: readonly ThinResult[]; readonly warnings: readonly BuildWarning[] } {
  const each = layers.flatMap((L, i) => (L.mute ? [] : [{ param: `/faces/${side}/${i}`, raw: asGrid(g, sprueRaw([L], surface, g)) }]));
  return thinFlags(each, "sprue", { minF: clean.minF, minGap: clean.minGap, zone: g.zone });
}
