// CHK-PRT-06, no slab starts in mid air in print pose (STYLUS 2026-08:
// conductive TPU plug printed disconnected). Ported from PIP
// test/islands.py: union the part's bodies, slice at the layer mid heights
// of the active preset (first layer, then layer by layer), and report any
// component over 0.05 mm2 whose overlap with the slice below is empty. The
// first floating component found is the evidence.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { ISLAND_MIN_AREA_MM2, floating, presetMids } from "../../solid/layers.js";
import { boolFinding, fmt, isReason, partTarget, presetOf, skip, sheetSkip } from "../common.js";
import { poseSlices, walkLayers } from "./layers.js";

export const check = defineCheck({
  id: "CHK-PRT-06",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const sheet = sheetSkip(t.part, ctx);
    if (sheet !== undefined) return [sheet];
    const s = poseSlices(t.part, ctx);
    if (isReason(s)) return [skip(at, "not run", s.reason)];
    const p = presetOf(ctx, t.part.machine);
    const mids = presetMids(s.zTop, p.firstLayer, p.layer);
    let first: { z: number; area: number; x: number; y: number } | null = null;
    let count = 0;
    walkLayers(s, mids, (cur, prev, z) => {
      if (prev === null) return;
      for (const c of floating(cur, prev, s.grid)) {
        count += 1;
        if (first === null) first = { z, area: c.areaMm2, x: c.at[0], y: c.at[1] };
      }
    });
    const f = first as { z: number; area: number; x: number; y: number } | null;
    const target = f === null ? at : { level: "part" as const, part: t.part.id, at: [f.x, f.y, f.z] as const };
    return [boolFinding(target, count === 0,
      `a region with nothing under it prints in air; layers of preset ${p.id} (${fmt(p.firstLayer)} then ${fmt(p.layer)} mm), regions over ${ISLAND_MIN_AREA_MM2} mm2`,
      { layers: mids.length, floating: count, gridMm: s.grid.h, ...(f === null ? {} : { firstZMm: Number(f.z.toFixed(3)), firstAreaMm2: Number(f.area.toFixed(3)) }) })];
  },
});
