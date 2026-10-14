// The KEYWAY family's text and logo kernel, ported from svgpath.py
// (reference/copper/keyway/legacy/svgpath.py; identical in all seven
// boards, sha256 5d568680...7864). Path data flattens through geom's one
// SVG path parser with the family's curve counts (cubic 12, quadratic 10)
// and rings of three or more points; glyphs come from font.ts.

import { flattenSvgPath, type Affine, type Section } from "@hackbuild/geom";
import type { Mm, Ring } from "@hackbuild/spec";
import { glyphPath, type Font } from "./font.js";
import { area2, interiorPoint, pointIn, type Vinyl } from "./helpers.js";

/** svgpath.py flattening: cubic n 12 (line 16), quadratic n 10 (line 26). */
export const CURVE_POINTS = { cubic: 12, quad: 10 } as const;
/** Advance of a code point the font lacks, font units (svgpath.py line 210). */
export const MISSING_ADVANCE = 600;
/** Cap height used when OS/2 carries none, font units (svgpath.py line 201). */
export const FALLBACK_CAP = 698;

/** path_to_rings: closed subpaths of three or more points, mapped by m. */
export function pathRings(d: string, m: Affine = [1, 0, 0, 1, 0, 0]): Ring[] {
  return flattenSvgPath(d, m, { curves: CURVE_POINTS, minPoints: 3 });
}

/**
 * rings_to_geom (svgpath.py lines 128 to 143): each ring a polygon,
 * largest first; a ring whose interior point lies inside an earlier
 * polygon is cut from it, any other ring is kept; then the union.
 */
export function ringsToGeom(v: Vinyl, rings: readonly Ring[]): Section {
  const polys = rings
    .filter((r) => r.length > 2 && area2(r) !== 0)
    .map((r) => ({ ring: r, s: v.poly(r) }))
    .filter((p) => !p.s.isEmpty() && p.s.area() > 0)
    .sort((a, b) => b.s.area() - a.s.area());
  const out: Section[] = [];
  for (const p of polys) {
    const at = interiorPoint(p.ring);
    const j = out.findIndex((o) => pointIn(o, at));
    if (j >= 0) out[j] = out[j]!.difference(p.s);
    else out.push(p.s);
  }
  return v.union(out);
}

/** path_geom: the region of d under x' = scale x + dx, y' = (flip ? -scale : scale) y + dy. */
export function pathGeom(v: Vinyl, d: string, scale = 1, dx: Mm = 0, dy: Mm = 0, flipY = false): Section {
  return ringsToGeom(v, pathRings(d, [scale, 0, 0, flipY ? -scale : scale, dx, dy]));
}

export type Anchor = "l" | "c" | "r";

/**
 * text_geom (svgpath.py lines 196 to 230): s outlined at cap height capMm,
 * baseline y, anchored at x. Returns the region and the advance, mm.
 */
export function textGeom(v: Vinyl, font: Font, s: string, capMm: Mm, x: Mm, y: Mm, tracking: Mm = 0, anchor: Anchor = "l"): { readonly geom: Section; readonly advance: Mm } {
  const cap = font.capHeight !== 0 ? font.capHeight : FALLBACK_CAP;
  const scale = capMm / cap;
  let pen = 0;
  const parts: Section[] = [];
  for (const ch of s) {
    const id = font.glyphId(ch.codePointAt(0)!);
    if (id === undefined) {
      pen += MISSING_ADVANCE * scale + tracking;
      continue;
    }
    const g = font.glyph(id);
    const d = glyphPath(g);
    if (d.trim().length > 0) {
      const geom = pathGeom(v, d, scale, pen, 0);
      if (!geom.isEmpty()) parts.push(geom);
    }
    pen += g.advance * scale + tracking;
  }
  const total = pen - (s.length > 0 ? tracking : 0);
  const off = anchor === "c" ? -total / 2 : anchor === "r" ? -total : 0;
  return { geom: v.translate(v.union(parts), x + off, y), advance: total };
}

const LOGO_PATH = /<path transform="translate\((-?[\d.]+),(-?[\d.]+)\)"[^>]*d="([^"]+)"/g;

/**
 * The mark's paths in file order, each its own region in logo units
 * (gen_keyway.py line 170): path [0] the arc (ink), [1] the wrench (pink).
 */
export function logoPaths(v: Vinyl, svg: string): Section[] {
  return [...svg.matchAll(LOGO_PATH)].map((m) => pathGeom(v, m[3]!, 1, Number(m[1]), Number(m[2])));
}

const DOC_PATH = /<path\b[^>]*?\sd="([^"]+)"/g;

/** The d attribute of every path element of a sanitised document, in file order (one per net in a cut file). */
export function documentPaths(svg: string): string[] {
  return [...svg.matchAll(DOC_PATH)].map((m) => m[1]!);
}

/** Bounds of a list of regions, [minx, miny, maxx, maxy]. */
export function boundsOf(list: readonly Section[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of list) {
    const b = s.bounds();
    if (b === null) continue;
    x0 = Math.min(x0, b.min[0]);
    y0 = Math.min(y0, b.min[1]);
    x1 = Math.max(x1, b.max[0]);
    y1 = Math.max(y1, b.max[1]);
  }
  return [x0, y0, x1, y1];
}
