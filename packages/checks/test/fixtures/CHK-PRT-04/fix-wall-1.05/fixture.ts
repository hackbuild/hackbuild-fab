// CHK-PRT-04 fix fixture (M04-T04 step 5): a square pocket in a 10 x 10 x
// 5 mm block whose wall to the block outline is /wall on every side,
// ../fail.json's shape with the wall as a param. The ffc5p preset line
// width is 0.42 mm (vendor, profile machines.json ffc5p_20260819), so the
// tie case sits at 1.05 = 2.5 x 0.42: neighbours 0.84 and 1.26, 0.21 each
// side (computed). The wall metric gates CHK-PRT-04 and names /wall, the
// drivenBy source for a part-level check (api-library-ai-design.md 8.7).

import type { FixtureJson } from "../../../fixture-load";
import type { FixFixture } from "../../../fixture-load";

const SIDE = 10;

export const fixture: FixFixture = {
  check: "CHK-PRT-04",
  note: "pocket wall 1.05 mm on a 0.42 mm line, a tie between 0.84 and 1.26",
  params: [{ id: "wall", label: "WALL", fields: [{ id: "wall", type: "mm", label: "wall", range: [0.4, 1.6], step: 0.01, default: 1.05 }] }],
  values: { wall: 1.05 },
  measuresParam: true,
  build(values): FixtureJson {
    const w = values["wall"] as number;
    const lo = w, hi = SIDE - w;
    return {
      note: `pocket wall ${w}`,
      meshes: { b: { solids: [{ box: [0, 0, 0, SIDE, SIDE, 5] }] } },
      parts: [{
        id: "stylus",
        bodies: [{ id: "b", mesh: "@b", outline: [[[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE]]] }],
        features: [{
          kind: "pocket", id: "pocket.well", body: "b", outline: [[lo, lo], [hi, lo], [hi, hi], [lo, hi]],
          face: { origin: [0, 0, 5], normal: [0, 0, 1], u: [1, 0, 0] }, depth: 3, floor: "flat",
          fit: { class: "LOCATE", drawnPerSide: 0.1, basis: "perSide" },
        }],
        metrics: [{ id: "stylus.wallMm", value: w, unit: "mm", note: "pocket wall to the outline", drivenBy: ["/wall"], gate: "CHK-PRT-04", qualifier: "computed", basis: null }],
      }],
    };
  },
};
