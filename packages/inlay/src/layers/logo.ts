// Logo layers: a registered mark painted as its parts, each part into the
// layer's slot or slot2 (bail.html:1445 to 1456, paintLayer logo branch,
// slotFor at 1289 to 1295, lineage bail.bench/inlay-logo). The marks are in
// marks.ts, copied verbatim. A part is an SVG path through Surface.fillPath
// (even-odd), mapped from path units to layer mm as s * (p + at - centre)
// with y flipped, s = w / span, then moved dx, dy mm and turned rot degrees.

import { MARKS, type MarkId, type MarkPart } from "../marks.js";
import { readMask, type Affine, type LayerResult, type RasterGrid, type Surface } from "../surface.js";

export interface LogoLayer {
  kind: "logo";
  brand: MarkId;
  /** mm, the mark's span across */
  w: number;
  /** mm */
  dx: number;
  /** mm */
  dy: number;
  /** degrees counter-clockwise */
  rot: number;
  /** hb arc, hsl flames */
  slot: number;
  /** hb wrench, hsl sun disc */
  slot2: number;
  cut?: boolean;
  off?: boolean;
}

/** The SVG matrix taking one mark part's path units to model mm (y up). */
export function logoTransform(L: Pick<LogoLayer, "brand" | "w" | "dx" | "dy" | "rot">, part: MarkPart): Affine {
  const M = MARKS[L.brand], s = L.w / M.span;
  const r = ((L.rot || 0) * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
  // local = (s (x + ax - cx), -s (y + ay - cy)); model = d + R(rot) local
  const ex = s * (part.at[0] - M.centre[0]), ey = -s * (part.at[1] - M.centre[1]);
  return [c * s, sn * s, sn * s, -c * s, (L.dx || 0) + c * ex - sn * ey, (L.dy || 0) + sn * ex + c * ey];
}

/** The slot a mark part paints in. */
export const partSlot = (L: Pick<LogoLayer, "slot" | "slot2">, part: MarkPart): number => (part.slot === "slot" ? L.slot : L.slot2);

export function renderLogo(L: LogoLayer, surface: Surface, grid: RasterGrid): LayerResult[] {
  const out: LayerResult[] = [];
  for (const part of MARKS[L.brand].parts) {
    surface.clear();
    surface.fillPath(part.d, logoTransform(L, part));
    out.push({ mask: readMask(surface, grid), slot: partSlot(L, part) });
  }
  surface.clear();
  return out;
}
