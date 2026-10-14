// Path layers: SVG path data filled even-odd through Surface.fillPath (the
// hack.build mark, M03-T08 step 5). COLLAR draws the mark as one image of
// both paths (collar.html:605, 606 and 2831 to 2833, lineage
// collar.bench/inlay-path); a path layer paints one of them into one slot,
// so the arc and the wrench can take different slots. `transform` maps path
// units to model mm, y up, as the surface reads it.

import { readMask, type Affine, type LayerResult, type RasterGrid, type Surface } from "../surface.js";

export interface PathLayer {
  kind: "path";
  /** SVG path data; the commands geom flattens (M L H V Z, either case) */
  d: string;
  /** path units to model mm, SVG matrix order */
  transform: Affine;
  slot: number;
  cut?: boolean;
  off?: boolean;
}

export function renderPath(L: PathLayer, surface: Surface, grid: RasterGrid): LayerResult[] {
  surface.clear();
  surface.fillPath(L.d, L.transform);
  const mask = readMask(surface, grid);
  surface.clear();
  return [{ mask, slot: L.slot }];
}
