// Zones that must stay apart, and the stock the board is cut from
// (M05-T15). TESSERA keeps every routing channel and its slider band clear
// of the tiles and its arc inside the band (gen_tessera.py lines 292 to
// 295 and 329 to 335); STAVE ends its wiring zone before the key slab
// (gen_stave.py lines 255 to 256) and fits its 4 inch tape (lines 201 to
// 203). Overlap counts as apart under vinyl.apartMax.

import type { GateStep } from "@hackbuild/copper";
import { contains, overlapArea } from "@hackbuild/copper";
import { boolGate, fill, intervalGate, k, sheetTarget, type Gate, type GateCtx } from "./gate.js";

type Step<K extends GateStep["kind"]> = Extract<GateStep, { kind: K }>;

export function inside(ctx: GateCtx, s: Step<"inside">): Gate[] {
  const ok = contains(ctx.board.shape(s.outer), ctx.board.shape(s.inner));
  return [boolGate("CHK-NET-42", ok, s.msg, sheetTarget(ctx, "copper"), "the region lies within its declared zone")];
}

export function apart(ctx: GateCtx, s: Step<"apart">): Gate[] {
  const max = k(ctx, "vinyl.apartMax");
  const b = ctx.board.shape(s.b);
  const overlaps = s.each ? s.a.map((r) => overlapArea(ctx.board.shape(r), b)) : [overlapArea(ctx.v.union(s.a.map((r) => ctx.board.shape(r))), b)];
  const worst = Math.max(...overlaps);
  return [intervalGate("CHK-NET-42", overlaps.every((x) => x < max), s.msg, sheetTarget(ctx, "copper"), worst, 0, max, "mm2",
    `the zones overlap by under ${max} mm2${s.each ? ", each region on its own" : ""}`)];
}

export function zoneGap(ctx: GateCtx, s: Step<"zoneGap">): Gate[] {
  const gap = s.start - s.end;
  const ok = s.end + s.clear < s.start - s.margin;
  return [intervalGate("CHK-NET-42", ok, fill(s.msg, { gap }), sheetTarget(ctx, "copper"), gap, s.clear + s.margin, null, "mm",
    `the wiring zone, grown by its ${s.clear} mm mask clearance, stops more than ${s.margin} mm before the keys`)];
}

export function stock(ctx: GateCtx, s: Step<"stock">): Gate[] {
  const W = ctx.board.draft.W;
  const side = (s.stock - W) / 2;
  return [intervalGate("CHK-NET-45", W <= s.stock - s.margin, fill(s.msg, { W, stock: s.stock, side }), sheetTarget(ctx, "copper"), W, null, s.stock - s.margin, "mm",
    `the board fits ${s.stock} mm stock with ${s.margin / 2} mm a side`)];
}
