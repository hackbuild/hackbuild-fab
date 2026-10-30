// The surfaces the art document controller draws text, marks and paths on in
// a page: one canvas surface per grid, made once, with the five faces the
// art document names loaded before any text is measured (a face the page does
// not carry makes text refuse, and the controller then says so per layer).
// The font keys and their css weights are spec ART_FONTS through the inlay
// lowering table.

import { ART_FONT_FACES, type RasterGrid, type Surface } from "@hackbuild/inlay";
import { canvasSurface } from "../surface/canvas-surface.js";

/** CSS weight and family of every art font, the strings fontsReady takes. */
export const ART_FONT_SPECS: readonly string[] = [...new Set(Object.values(ART_FONT_FACES).map((f) => `${f.bold ? 700 : 400} ${f.family}`))];

/** A surface factory for createArtDoc; `ready` runs once the fonts settle, so the host can drop cached bounds and repaint. */
export function artSurfaces(ready: () => void): (grid: RasterGrid) => Surface {
  const made = new WeakMap<RasterGrid, Surface>();
  return (grid) => {
    let s = made.get(grid);
    if (s === undefined) {
      const c = canvasSurface(grid);
      c.fontsReady(ART_FONT_SPECS).then(ready, ready);
      made.set(grid, c);
      s = c;
    }
    return s;
  };
}
