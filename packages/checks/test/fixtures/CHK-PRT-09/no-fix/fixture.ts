// CHK-PRT-09 no-fix fixture (M04-T04 step 5): ../fail.json's rail, a 1 mm
// slab over two 3 mm posts 9.5 mm apart (SLATE: the card's 9.5 against
// under 9), with the span driven by two params: /post, the post width,
// and /span, the gap between the posts. The bridge metric gates CHK-PRT-09
// and names both, so no single param resolves it.

import type { FixtureJson } from "../../../fixture-load";
import type { FixFixture } from "../../../fixture-load";

export const fixture: FixFixture = {
  check: "CHK-PRT-09",
  note: "bridge 9.5 mm between two posts, driven by /post and /span",
  params: [{ id: "rail", label: "RAIL", fields: [
    { id: "post", type: "mm", label: "post", range: [2, 6], step: 0.5, default: 3 },
    { id: "span", type: "mm", label: "span", range: [4, 12], step: 0.5, default: 9.5 },
  ] }],
  values: { post: 3, span: 9.5 },
  measuresParam: false,
  build(values): FixtureJson {
    const post = values["post"] as number;
    const span = values["span"] as number;
    const end = 2 * post + span;
    return {
      note: `posts ${post} mm, span ${span} mm`,
      meshes: { b: { solids: [{ box: [0, 0, 0, post, 5, 5] }, { box: [post + span, 0, 0, end, 5, 5] }, { box: [0, 0, 5, end, 5, 6] }] } },
      parts: [{
        id: "rail",
        bodies: [{ id: "b", mesh: "@b" }],
        metrics: [{ id: "rail.bridgeMm", value: span, unit: "mm", note: "slab span between the posts", drivenBy: ["/post", "/span"], gate: "CHK-PRT-09", qualifier: "computed", basis: null }],
      }],
    };
  },
};
