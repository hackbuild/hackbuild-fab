// SVG intake for the art board: the path elements of a dropped file become
// one path layer (spec ArtPathLayer). The file is read as text with no DOM,
// so the same code runs in a test and in a page. Only `d` attributes of
// path elements are read; transforms, strokes, groups and other shapes are
// not, and the line says how many elements were skipped so a person knows
// what the layer leaves out. Arcs (A, a) are refused by the flattener the
// bounds come from.

import { flattenSvgPath } from "@hackbuild/geom";

export interface SvgPaths {
  /** the d attributes joined, one subpath run after another */
  readonly d: string;
  readonly bx: number;
  readonly by: number;
  readonly bw: number;
  readonly bh: number;
  /** elements the layer leaves out: shapes other than path, and transform attributes on paths */
  readonly skipped: number;
}

export type SvgRead = { readonly ok: true; readonly paths: SvgPaths } | { readonly ok: false; readonly line: string };

const PATH_TAG = /<path\b[^>]*>/gi;
const OTHER_SHAPE = /<(rect|circle|ellipse|line|polyline|polygon|text|image)\b/gi;
const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  return m === null ? null : (m[2] ?? m[3] ?? null);
};

/** The path layer fields of an SVG text, or the line that says why not. */
export function readSvgPaths(text: string): SvgRead {
  if (!/<svg\b/i.test(text)) return { ok: false, line: "not an svg file. drop an .svg with path elements." };
  const tags = text.match(PATH_TAG) ?? [];
  const ds = tags.map((t) => attr(t, "d")).filter((d): d is string => d !== null && d.trim() !== "");
  if (ds.length === 0) return { ok: false, line: "no path elements in this svg. convert shapes and text to paths, then drop it again." };
  const d = ds.join(" ");
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  try {
    for (const ring of flattenSvgPath(d, undefined, { curves: { cubic: 12, quad: 8 }, minPoints: 2 })) {
      for (const [x, y] of ring) {
        lo = [Math.min(lo[0]!, x), Math.min(lo[1]!, y)];
        hi = [Math.max(hi[0]!, x), Math.max(hi[1]!, y)];
      }
    }
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    return { ok: false, line: `svg path data not read: ${hint}. arcs are not supported; convert them to curves and drop it again.` };
  }
  const bw = hi[0]! - lo[0]!, bh = hi[1]! - lo[1]!;
  if (!(bw > 0) || !(bh > 0)) return { ok: false, line: "the svg paths have no area. a path layer needs a filled shape." };
  const skipped = (text.match(OTHER_SHAPE)?.length ?? 0) + tags.filter((t) => attr(t, "transform") !== null).length;
  return { ok: true, paths: { d, bx: lo[0]!, by: lo[1]!, bw, bh, skipped } };
}
