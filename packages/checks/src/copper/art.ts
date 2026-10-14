// Art in the copper is weedable (gen_keyway.py lines 231 to 237): every
// art island at least vinyl.artGapMin from every other, and every counter
// (a hole in an art island) survives an erode of vinyl.counterErode.
// CHK-NET-32.

import { components, distance } from "@hackbuild/copper";
import { f, intervalGate, k, netTarget, type Gate, type GateCtx } from "./gate.js";

export function artGaps(ctx: GateCtx): Gate[] {
  const v = ctx.v;
  const parts = components(ctx.board.art).map((c) => v.rings([c.outer, ...c.holes]));
  let gmin = Number.POSITIVE_INFINITY;
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) gmin = Math.min(gmin, distance(parts[i]!, parts[j]!));
  const gapMin = k(ctx, "vinyl.artGapMin");
  const d = ctx.board.draft;
  const gaps = intervalGate("CHK-NET-32", gmin >= gapMin,
    `art island gaps ${f(gmin, 2)} mm (${parts.length} islands incl. ${d.ticks} slider ticks${d.brand ? "" : ", brand art off"})`,
    netTarget(ctx, "ART"), gmin, gapMin, null, "mm", `art islands at least ${f(gapMin, 2)} mm apart so each weeds on its own`);
  const e = k(ctx, "vinyl.counterErode");
  const holes = components(ctx.board.art).flatMap((c) => c.holes);
  const smallest = holes.length === 0 ? 1 : Math.min(...holes.map((h) => v.buffer(v.poly(h), -e).area()));
  const counters = intervalGate("CHK-NET-32", smallest > 0,
    `art counters weedable (${holes.length} holes, smallest survives ${f(2 * e, 1)} mm erode)`,
    netTarget(ctx, "ART"), smallest, 0, null, "mm2", `every counter keeps area after a ${f(e, 1)} mm erode, so it lifts as one piece`, { holes: holes.length });
  return [gaps, counters];
}
