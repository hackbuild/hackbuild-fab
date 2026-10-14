// The SVG cut twin of the DXF writer (exporter svg-cut, M07-T06 step 3).
// It draws the entity list dxf.ts writes, in the same order, so the two
// files of a sheet cannot disagree on a ring: width and height in mm, the
// viewBox in mm, one y flip at the root so the model stays y up (SKETCH
// IO.sheetSVG, sketch.html lines 3003 to 3043, lineage sketch.bench/v3),
// whole circles as two half arcs, bulges as A commands. Colours are COTTER's
// (kit.js lines 17 to 27, lineage cotter.kit/r5) and GUSSET's: cut red
// #ff0000 hairline 0.1, score green #00aa00 0.1, engrave black filled
// evenodd, light blue #0000ff filled. Groups: LIGHT, ENGRAVE, SCORE, then
// CUT holding one group per part in cut order, its CUT_INNER paths before
// its CUT paths.

import type { Vec2 } from "@hackbuild/spec";
import { COORD_DECIMALS, fixed, sheetEntities, type CutEntity, type CutLayer, type SheetDrawing, type Vertex, type WriteOptions } from "./dxf.js";

const STYLE: Record<CutLayer, string> = {
  LIGHT: 'fill="#0000ff" fill-rule="evenodd" stroke="none"',
  ENGRAVE: 'fill="#000000" fill-rule="evenodd" stroke="none"',
  SCORE: 'fill="none" stroke="#00aa00" stroke-width="0.1"',
  CUT_INNER: 'fill="none" stroke="#ff0000" stroke-width="0.1"',
  CUT: 'fill="none" stroke="#ff0000" stroke-width="0.1"',
};

const n = (v: number): string => fixed(v, COORD_DECIMALS);
const pt = (p: Vec2): string => `${n(p[0])} ${n(p[1])}`;

/** The A command from a to b for a bulge: radius from the chord, large arc past a half turn, sweep flag 1 counter-clockwise. */
function arcTo(a: Vertex, b: Vec2): string {
  const theta = 4 * Math.atan(a.bulge);
  const chord = Math.hypot(b[0] - a.p[0], b[1] - a.p[1]);
  const r = chord / (2 * Math.sin(Math.abs(theta) / 2));
  return ` A ${n(r)} ${n(r)} 0 ${Math.abs(theta) > Math.PI ? 1 : 0} ${theta > 0 ? 1 : 0} ${pt(b)}`;
}

/** Path data of one entity in model coordinates. */
export function pathOf(e: CutEntity): string {
  if (e.kind === "circle") {
    const [cx, cy] = e.c;
    const r = n(e.r);
    return `M ${pt([cx - e.r, cy])} A ${r} ${r} 0 1 1 ${pt([cx + e.r, cy])} A ${r} ${r} 0 1 1 ${pt([cx - e.r, cy])} Z`;
  }
  const v = e.verts;
  let d = `M ${pt(v[0]!.p)}`;
  for (let i = 0; i + 1 < v.length; i++) d += v[i]!.bulge === 0 ? ` L ${pt(v[i + 1]!.p)}` : arcTo(v[i]!, v[i + 1]!.p);
  return `${d} Z`;
}

const esc = (s: string): string => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** The SVG cut file of one sheet. */
export function writeSvgCut(sheet: SheetDrawing, title: string, opts: WriteOptions = {}): string {
  const [W, H] = sheet.size;
  const ents = sheetEntities(sheet, opts);
  const group = (id: string, style: string, list: readonly CutEntity[]): string =>
    list.length === 0 ? "" : `<g id="${id}" ${style}>\n${list.map((e) => `<path d="${pathOf(e)}"/>\n`).join("")}</g>\n`;
  let cut = "";
  const parts: string[] = [];
  const byPart = new Map<string, CutEntity[]>();
  for (const e of ents) {
    if (e.layer !== "CUT_INNER" && e.layer !== "CUT") continue;
    const k = e.part ?? "";
    if (!byPart.has(k)) {
      byPart.set(k, []);
      parts.push(k);
    }
    byPart.get(k)!.push(e);
  }
  for (const k of parts) {
    cut += `<g id="part-${k.replace(/[^A-Za-z0-9_.-]/g, "-")}">\n${byPart.get(k)!.map((e) => `<path data-layer="${e.layer}" d="${pathOf(e)}"/>\n`).join("")}</g>\n`;
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + `<svg xmlns="http://www.w3.org/2000/svg" width="${n(W)}mm" height="${n(H)}mm" viewBox="0 0 ${n(W)} ${n(H)}">\n`
    + `<title>${esc(title)}</title>\n`
    + `<g transform="translate(0,${n(H)}) scale(1,-1)">\n`
    + group("LIGHT", STYLE.LIGHT, ents.filter((e) => e.layer === "LIGHT"))
    + group("ENGRAVE", STYLE.ENGRAVE, ents.filter((e) => e.layer === "ENGRAVE"))
    + group("SCORE", STYLE.SCORE, ents.filter((e) => e.layer === "SCORE"))
    + (cut === "" ? "" : `<g id="CUT" ${STYLE.CUT}>\n${cut}</g>\n`)
    + "</g>\n</svg>\n";
}
