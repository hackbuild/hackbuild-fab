// The one DXF writer (M07-T06, D-138, D-160). It passes CHK-SHT-03 by
// construction: an AC1024 header from the ezdxf skeleton in
// data/dxf-template.json (tools/py/make_dxf_template.py), millimetres
// ($INSUNITS 4), and every ring one closed LWPOLYLINE whose first vertex is
// repeated, or one CIRCLE.
//
// Ported from COTTER KIT.laserDXF (kit.js lines 29 to 36, lineage
// cotter.kit/r5): a skeleton written by ezdxf, entities poured into
// ENTITIES, hex handles from 0x100, owner the model space block record,
// coordinates to 1e-4 mm, holes before outlines. Two changes from it, both
// from the OGEE16 sheets page dxf() (sheet_template.html lines 236 to 262):
// the first vertex is repeated as well as flagged closed, because a reader
// that ignores the flag leaves a gap a cutter plunges through, and
// $HANDSEED is the next free handle (COTTER wrote handle + 16). Arcs come
// from SKETCH IO.sheetDXF (sketch.html lines 3046 to 3102, lineage
// sketch.bench/v3) through arcs.ts: bulge tan(sweep/4) on the vertex the
// arc starts at, whole circles as CIRCLE.
//
// Group order per LWPOLYLINE: 0, 5 handle, 330 owner, 100 AcDbEntity,
// 8 layer, 100 AcDbPolyline, 90 vertex count including the repeated first
// vertex, 70 1, 43 0, then 10, 20 and 42 per vertex. Order of entities on
// a sheet: LIGHT, ENGRAVE and SCORE first (they free nothing), then each
// part in cut order (part-in-part.ts cutOrder: a part inside a hole before
// its host), its holes before its outline. Same drawing, same bytes.

import { commandError, type NestItem, type NestResult, type Ring, type Vec2 } from "@hackbuild/spec";
import template from "../data/dxf-template.json" with { type: "json" };
import { bulgeOf, fitArcs, openRing, wholeCircle } from "./arcs.js";
import { placeRings } from "./box.js";
import { cutOrder } from "./part-in-part.js";
import { classifyRings } from "./profile.js";

/** The five layers of the template's LAYER table. */
export type CutLayer = "ENGRAVE" | "SCORE" | "CUT_INNER" | "CUT" | "LIGHT";
export const CUT_LAYERS: readonly CutLayer[] = template.layers as CutLayer[];

/** Decimals of a coordinate, mm: 1e-4 (D-054, COTTER kit.js num()). */
export const COORD_DECIMALS = 4;
/** Decimals of a bulge: 1e-6 (sketch.html line 3077). */
export const BULGE_DECIMALS = 6;

/** One copy of a part on a sheet, rings in sheet coordinates, mm. */
export interface SheetPart {
  readonly id: string;
  readonly copy: number;
  /** Through holes, cut first. */
  readonly holes: readonly Ring[];
  /** The outline and any island, cut last. */
  readonly outlines: readonly Ring[];
  readonly score?: readonly Ring[];
  readonly engrave?: readonly Ring[];
  readonly light?: readonly Ring[];
}

/** One sheet ready to write: parts in cut order. */
export interface SheetDrawing {
  /** Sheet width and height, mm. */
  readonly size: Vec2;
  readonly parts: readonly SheetPart[];
}

export interface WriteOptions {
  /** Fit arcs and whole circles (default true); false writes every ring vertex for vertex. */
  readonly arcs?: boolean;
}

/** A vertex and the bulge of the segment that starts at it. */
export interface Vertex {
  readonly p: Vec2;
  readonly bulge: number;
}

/** What the DXF writer and the SVG twin both draw, in emission order. */
export type CutEntity =
  | { readonly kind: "circle"; readonly layer: CutLayer; readonly part?: string; readonly c: Vec2; readonly r: number }
  | { readonly kind: "poly"; readonly layer: CutLayer; readonly part?: string; readonly verts: readonly Vertex[] };

/** A number to a fixed count of decimals: no exponent, trailing zeros and a negative zero dropped. */
export function fixed(v: number, decimals: number): string {
  const s = v.toFixed(decimals);
  const t = s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return t === "-0" ? "0" : t;
}

const round = (v: number, decimals: number): number => Number(fixed(v, decimals));
const roundPt = (p: Vec2): Vec2 => [round(p[0], COORD_DECIMALS), round(p[1], COORD_DECIMALS)];

/** A ring as one entity: CIRCLE, LWPOLYLINE with bulges, or vertex for vertex. */
function entityOf(ring: Ring, layer: CutLayer, part: string | undefined, arcs: boolean): CutEntity {
  const pts = openRing(ring);
  if (pts.length < 3) {
    throw commandError({ code: "E_SCHEMA", path: `/rings`, got: pts.length, expected: "a ring of 3 or more distinct vertices", hint: `a ${layer} ring of part ${part ?? "unknown"} collapses; drop it or fix the outline` });
  }
  const tag = part === undefined ? {} : { part };
  if (arcs) {
    const full = wholeCircle(pts);
    if (full) return { kind: "circle", layer, ...tag, c: roundPt(full.c), r: round(full.r, COORD_DECIMALS) };
    const verts: Vertex[] = [];
    for (const s of fitArcs(pts, true)) {
      const p = roundPt(s.a);
      const q = verts[verts.length - 1];
      if (q !== undefined && q.p[0] === p[0] && q.p[1] === p[1]) continue;
      verts.push({ p, bulge: round(bulgeOf(s), BULGE_DECIMALS) });
    }
    return { kind: "poly", layer, ...tag, verts: closeVerts(verts) };
  }
  const verts: Vertex[] = [];
  for (const v of pts) {
    const p = roundPt(v);
    const q = verts[verts.length - 1];
    if (q === undefined || q.p[0] !== p[0] || q.p[1] !== p[1]) verts.push({ p, bulge: 0 });
  }
  return { kind: "poly", layer, ...tag, verts: closeVerts(verts) };
}

/** Drops a last vertex equal to the first after rounding, then repeats the first with bulge 0. */
function closeVerts(verts: Vertex[]): Vertex[] {
  while (verts.length > 1 && verts[0]!.p[0] === verts[verts.length - 1]!.p[0] && verts[0]!.p[1] === verts[verts.length - 1]!.p[1]) verts.pop();
  return [...verts, { p: verts[0]!.p, bulge: 0 }];
}

/** Every entity of a sheet in emission order. */
export function sheetEntities(sheet: SheetDrawing, opts: WriteOptions = {}): CutEntity[] {
  const arcs = opts.arcs !== false;
  const out: CutEntity[] = [];
  const tag = (p: SheetPart): string => `${p.id}#${p.copy}`;
  for (const [layer, pick] of [["LIGHT", (p: SheetPart) => p.light], ["ENGRAVE", (p: SheetPart) => p.engrave], ["SCORE", (p: SheetPart) => p.score]] as const) {
    for (const p of sheet.parts) for (const r of pick(p) ?? []) out.push(entityOf(r, layer, tag(p), arcs));
  }
  for (const p of sheet.parts) {
    for (const r of p.holes) out.push(entityOf(r, "CUT_INNER", tag(p), arcs));
    for (const r of p.outlines) out.push(entityOf(r, "CUT", tag(p), arcs));
  }
  return out;
}

const pair = (code: number, value: string): string => `${String(code).padStart(3, " ")}\n${value}\n`;
const hex = (h: number): string => h.toString(16).toUpperCase();

/** The DXF text of one sheet, AC1024, millimetres. */
export function writeDxf(sheet: SheetDrawing, opts: WriteOptions = {}): string {
  let handle = template.first;
  let body = "";
  const xy = (p: Vec2): string => pair(10, fixed(p[0], COORD_DECIMALS)) + pair(20, fixed(p[1], COORD_DECIMALS));
  for (const e of sheetEntities(sheet, opts)) {
    const head = pair(5, hex(handle++)) + pair(330, template.owner) + pair(100, "AcDbEntity") + pair(8, e.layer);
    if (e.kind === "circle") {
      body += pair(0, "CIRCLE") + head + pair(100, "AcDbCircle") + xy(e.c) + pair(30, "0") + pair(40, fixed(e.r, COORD_DECIMALS));
      continue;
    }
    body += pair(0, "LWPOLYLINE") + head + pair(100, "AcDbPolyline") + pair(90, String(e.verts.length)) + pair(70, "1") + pair(43, "0");
    for (const v of e.verts) body += xy(v.p) + pair(42, fixed(v.bulge, BULGE_DECIMALS));
  }
  return template.tpl.replace("{{ENTITIES}}", body).replace("{{SEED}}", hex(handle));
}

/**
 * The sheets of a layout as drawings: each placement's rings placed on its
 * sheet, holes (rings at odd depth, profile.ts) apart from the outline and
 * islands, parts in cut order. `items` are the rings the layout packed
 * (the compensated rings when a beam was applied).
 */
export function drawSheets(items: readonly NestItem[], result: NestResult, size: Vec2): SheetDrawing[] {
  const byId = new Map(items.map((it) => {
    const cls = classifyRings(it.rings);
    // holes in input order; outlines deepest first, so an island is cut before the outline around it
    const outlines = cls.map((c, i) => ({ c, i })).filter(({ c }) => c.depth % 2 === 0).sort((a, b) => b.c.depth - a.c.depth || a.i - b.i);
    return [it.id, { rings: it.rings, holeIdx: cls.flatMap((c, i) => (c.depth % 2 === 1 ? [i] : [])), outIdx: outlines.map(({ i }) => i) }] as const;
  }));
  const sheets: SheetDrawing[] = [];
  for (let s = 0; s < result.sheets; s++) {
    const parts = cutOrder(result.placements.filter((p) => p.sheet === s)).map((p): SheetPart => {
      const it = byId.get(p.id);
      if (it === undefined) throw commandError({ code: "E_REF", path: `/placements/${p.id}`, got: p.id, hint: `placement ${p.id} names no item; pass the items the layout packed` });
      const placed = placeRings(it.rings, p.at, p.rot);
      return { id: p.id, copy: p.copy, holes: it.holeIdx.map((i) => placed[i]!), outlines: it.outIdx.map((i) => placed[i]!) };
    });
    sheets.push({ size, parts });
  }
  return sheets;
}
