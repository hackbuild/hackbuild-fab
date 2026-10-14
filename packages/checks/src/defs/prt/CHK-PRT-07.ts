// CHK-PRT-07, islands at layer height, run at 0.24 and 0.20 (STYLUS
// 2026-08: islands.py). Ported from PIP test/islands.py: union the part's
// bodies, slice at (k + 0.5) x LAYER for LAYER 0.24 and again for 0.20
// (the two heights the title names; knowledge-tiers.md line 367), and count
// components over 0.05 mm2 whose overlap with the slice below is empty.
// Legal is zero islands across both runs.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { floating, uniformMids } from "../../solid/layers.js";
import { isReason, partTarget, skip } from "../common.js";
import { poseSlices, walkLayers } from "./layers.js";

/** The two layer heights the check title names, mm. */
export const ISLAND_LAYERS = [0.24, 0.2] as const;

export const check = defineCheck({
  id: "CHK-PRT-07",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const s = poseSlices(t.part, ctx);
    if (isReason(s)) return [skip(at, "not run", s.reason)];
    const per = ISLAND_LAYERS.map((layer) => {
      let n = 0;
      let firstZ: number | null = null;
      walkLayers(s, uniformMids(s.zTop, layer), (cur, prev, z) => {
        if (prev === null) return;
        const f = floating(cur, prev, s.grid).length;
        if (f > 0 && firstZ === null) firstZ = z;
        n += f;
      });
      return { layer, n, firstZ: firstZ as number | null };
    });
    const total = per.reduce((s2, x) => s2 + x.n, 0);
    const extra: Record<string, number> = { gridMm: s.grid.h };
    for (const x of per) {
      extra[`islandsAt${String(x.layer).replace(".", "p")}`] = x.n;
      if (x.firstZ !== null) extra[`firstZAt${String(x.layer).replace(".", "p")}Mm`] = Number(x.firstZ.toFixed(3));
    }
    return [{
      verdict: total === 0 ? "pass" : "fail", target: at, measured: total,
      legal: { kind: "interval", lo: 0, hi: 0, unit: "count", nearest: 0 },
      constraint: "islands.py at layer 0.24 and at 0.20: a region over 0.05 mm2 with nothing under it is an island",
      extra,
    }];
  },
});
