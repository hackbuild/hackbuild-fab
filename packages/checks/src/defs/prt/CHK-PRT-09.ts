// CHK-PRT-09, longest unsupported bridge under 9 mm (SLATE 2026-08: a
// 15.4 x 109 slot left over from a removed feature). SLATE walked both
// halves in print pose and reported, per solid, the longest continuous run
// of a first layer with nothing underneath; after its fixes the longest
// was 8.8 mm (sources/benches/benches-cases.md line 436). The audit script
// was never harvested (line 867), so this is new code written from that
// description and the title: every layer of the active preset, the longest
// span between two supports of any unsupported region (solid/layers.ts
// longestBridge), against 9 mm.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { longestBridge, presetMids } from "../../solid/layers.js";
import { fmt, intervalFinding, isReason, partTarget, presetOf, skip, sheetSkip } from "../common.js";
import { poseSlices, walkLayers } from "./layers.js";

/** The ceiling the title names, mm (SLATE's longest bridge after fixes was 8.8). */
export const BRIDGE_MAX_MM = 9;

export const check = defineCheck({
  id: "CHK-PRT-09",
  level: "part",
  run: (t, ctx): readonly Finding[] => {
    const at = partTarget(t.part);
    const sheet = sheetSkip(t.part, ctx);
    if (sheet !== undefined) return [sheet];
    const s = poseSlices(t.part, ctx);
    if (isReason(s)) return [skip(at, "not run", s.reason)];
    const p = presetOf(ctx, t.part.machine);
    let worst: { span: number; z: number; x: number; y: number } | null = null;
    walkLayers(s, presetMids(s.zTop, p.firstLayer, p.layer), (cur, prev, z) => {
      if (prev === null) return;
      const b = longestBridge(cur, prev, s.grid);
      if (b !== null && (worst === null || b.spanMm > worst.span)) worst = { span: b.spanMm, z, x: b.at[0], y: b.at[1] };
    });
    const w = worst as { span: number; z: number; x: number; y: number } | null;
    const span = w === null ? 0 : Number(w.span.toFixed(3));
    const target = w === null ? at : { level: "part" as const, part: t.part.id, at: [w.x, w.y, w.z] as const };
    return [intervalFinding(target, span, 0, BRIDGE_MAX_MM, "mm",
      `a layer bridging more than ${fmt(BRIDGE_MAX_MM)} mm between supports sags (SLATE); layers of preset ${p.id}, read on a ${fmt(s.grid.h)} mm grid`,
      { gridMm: s.grid.h, ...(w === null ? {} : { zMm: Number(w.z.toFixed(3)) }) })];
  },
});
