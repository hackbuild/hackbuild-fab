// CHK-3MF-05, holed bands overlap full bands, never the reverse (COLLAR
// 2026-08; no failure is on record: knowledge/02-ordering-rules.md states
// the band order). Where two stack bands overlap in z, the band that runs
// into the other is the upper band's bottom; a holed band (an outline with
// holes) may run down into a full band, and a full band must never run
// down into a holed one, which would fill the holes over the overlap. The
// bands come through the kernel views (views.ts).

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { viewsOf } from "../../views.js";
import { boolFinding, partTarget, skip } from "../common.js";

export const check = defineCheck({
  id: "CHK-3MF-05",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const shape = viewsOf(ctx).shape;
    if (shape === undefined) return [skip(at, "not run", "stack band declarations not supplied to the registry: the caller reads them from the build's body drafts")];
    let joints = 0;
    const reversed: string[] = [];
    for (const b of t.part.bodies) {
      const s = shape(t.part.id, b.id);
      if (s?.route !== "stack") continue;
      s.bands.forEach((band, i) => {
        const below = s.bands[i - 1];
        if (below === undefined || !(below.z[1] > band.z[0])) return;
        joints += 1;
        if (below.outline.length > 1 && band.outline.length === 1) reversed.push(`${b.id}/bands/${i}`);
      });
    }
    if (joints === 0) return [skip(at, "not run", `no overlapping stack bands in part ${t.part.id}`)];
    return [boolFinding(at, reversed.length === 0,
      "a holed band runs into a full band, never the reverse, or the full band fills the holes over the overlap",
      { joints, reversed: reversed.length, ...(reversed[0] === undefined ? {} : { first: reversed[0] }) })];
  },
});
