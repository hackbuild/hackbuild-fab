// The planner fixtures as paths (M07-T14): the squares the M07-T01 records
// planned, so motion.run can run a planner program by name. DETENT's is
// extract-plan.mjs squareFixture (designs/detent/legacy/tools/
// extract-plan.mjs lines 59 to 68): side half steps, a point every
// `sample` half steps, beam on, closed back at the origin. WASHER's is the
// square of designs/washer/legacy/tools/extract-plan.mjs lines 75 and 76:
// corners at plus and minus half the side, centred on the wall, densified
// by the page's densify(), beam on for every segment.

import type { PathPoint } from "@hackbuild/spec";
import { densify } from "../planners/washer-mm.js";

/** DETENT square in half steps: side, sampled every `sample`, closed. */
export function detentSquare(side: number, sample: number): PathPoint[] {
  const out: PathPoint[] = [];
  const c = [[0, 0], [side, 0], [side, side], [0, side], [0, 0]] as const;
  for (let k = 0; k < 4; k++) {
    const [x0, y0] = c[k]!, [x1, y1] = c[k + 1]!;
    for (let t = 0; t < side; t += sample) out.push({ x: x0 + ((x1 - x0) * t) / side, y: y0 + ((y1 - y0) * t) / side, on: true });
  }
  out.push({ x: 0, y: 0, on: true });
  return out;
}

/** WASHER square in target mm: side centred on the wall, densified every `dense` mm or finer. */
export function washerSquare(side: number, dense: number): PathPoint[] {
  const h = side / 2;
  const sq = [[-h, -h], [h, -h], [h, h], [-h, h], [-h, -h]] as const;
  return densify(sq, dense).map(([x, y]) => ({ x, y, on: true }));
}
