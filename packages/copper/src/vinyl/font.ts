// The KEYWAY family's glyph pen over the workspace WOFF2 reader. The reader
// lives in packages/geom/src/text/woff2.ts, its one home, since inlay text
// outlines the same files; it is re-exported here so the vinyl route and
// its tests read it by the names they always used. The generators outline
// IBM Plex Mono from the @fontsource woff2 files through fontTools
// (reference/copper/keyway/legacy/svgpath.py lines 154 to 230).

import type { FontPoint, Glyph } from "@hackbuild/geom";

export { parseWoff2 } from "@hackbuild/geom";
export type { BrotliDecompress, Font, FontPoint, Glyph } from "@hackbuild/geom";

const f6 = (v: number): string => v.toFixed(6);

/**
 * The SVG path a glyph draws through svgpath.py's _Pen (lines 154 to 183).
 * A composite glyph draws nothing: fontTools hands its components to
 * pen.addComponent, which the family's pen ignores (svgpath.py line 183),
 * so every board outlines '"', ':' and ';' as blank space. The port keeps
 * that, so its type matches the generators' (M05-T14 card defects).
 *
 * Otherwise the path follows fontTools' TrueType draw order: each contour
 * rotated to end on its first on-curve point, which opens it; runs of
 * off-curve points become Q segments split at implied midpoints; a contour
 * with no on-curve point is one implied-closing run. Numbers print as
 * Python's %f does, 6 decimals.
 */
export function glyphPath(g: Glyph): string {
  if (g.composite) return "";
  const d: string[] = [];
  const q = (pts: readonly FontPoint[], implied: boolean): void => {
    if (implied) {
      const last = pts[pts.length - 1]!;
      const prev = pts[pts.length - 2];
      const impl = prev === undefined ? last : { x: (last.x + prev.x) / 2, y: (last.y + prev.y) / 2 };
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k]!, b = pts[k + 1]!;
        d.push(`Q ${f6(a.x)} ${f6(a.y)} ${f6((a.x + b.x) / 2)} ${f6((a.y + b.y) / 2)}`);
      }
      d.push(`Q ${f6(last.x)} ${f6(last.y)} ${f6(impl.x)} ${f6(impl.y)}`);
      return;
    }
    if (pts.length === 2) {
      d.push(`Q ${f6(pts[0]!.x)} ${f6(pts[0]!.y)} ${f6(pts[1]!.x)} ${f6(pts[1]!.y)}`);
      return;
    }
    for (let k = 0; k < pts.length - 2; k++) {
      const a = pts[k]!, b = pts[k + 1]!;
      d.push(`Q ${f6(a.x)} ${f6(a.y)} ${f6((a.x + b.x) / 2)} ${f6((a.y + b.y) / 2)}`);
    }
    const a = pts[pts.length - 2]!, b = pts[pts.length - 1]!;
    d.push(`Q ${f6(a.x)} ${f6(a.y)} ${f6(b.x)} ${f6(b.y)}`);
  };
  for (const contour of g.contours) {
    const first = contour.findIndex((p) => p.on);
    if (first < 0) {
      q(contour, true);
    } else {
      let c = [...contour.slice(first + 1), ...contour.slice(0, first + 1)];
      const start = c[c.length - 1]!;
      d.push(`M ${f6(start.x)} ${f6(start.y)}`);
      while (c.length > 0) {
        const next = c.findIndex((p) => p.on) + 1;
        if (next === 1) {
          if (c.length > 1) d.push(`L ${f6(c[0]!.x)} ${f6(c[0]!.y)}`);
        } else {
          q(c.slice(0, next), false);
        }
        c = c.slice(next);
      }
    }
    d.push("Z");
  }
  return d.join(" ");
}
