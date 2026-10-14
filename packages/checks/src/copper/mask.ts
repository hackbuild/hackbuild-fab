// The vinyl over the copper of the capacitive boards (M05-T15). The board
// declares its mask mode (CHK-NET-24); in faceplate mode the vinyl is a
// dielectric piece inset from the outline with windows over the wiring
// zone, the departure COFFER and the capacitive boards take from the
// soldermask rules (knowledge/kernels/copper-routing.md "Vinyl mask
// rules"; benches-conductive-b.md Deltas conflict 7). Faceplate honoured
// means it clears the clip pads, overhangs every electrode and carries
// its accents (CHK-NET-24), covers live copper outside the wiring zone
// (CHK-NET-20), and is one piece inside the keepout (CHK-NET-09)
// (gen_vernier.py lines 270 to 282, and the same in QUADRANT to STAVE).
// Soldermask mode has no board in the family and no run body here yet.

import type { Section } from "@hackbuild/geom";
import type { GateStep, MaskDecl } from "@hackbuild/copper";
import { contains, islands, overlapArea } from "@hackbuild/copper";
import { commandError } from "@hackbuild/spec";
import { boolGate, f, fill, intervalGate, k, sheetTarget, type Gate, type GateCtx } from "./gate.js";

type Step<K extends GateStep["kind"]> = Extract<GateStep, { kind: K }>;

function faceplate(ctx: GateCtx): { decl: MaskDecl; mask: Section } {
  const m = ctx.board.draft.mask;
  if (m === undefined) throw commandError({ code: "E_SCHEMA", path: "/mask", got: null, expected: "a declared mask", record: "kernels/copper-routing", hint: "declare the mask mode and region before a mask gate reads it" });
  if (m.mode !== "faceplate") {
    throw commandError({ code: "E_SCHEMA", path: "/mask/mode", got: m.mode, expected: "faceplate", record: "kernels/copper-routing", hint: "soldermask mode has no run body yet; no board of the KEYWAY family declares it" });
  }
  return { decl: m, mask: ctx.board.shape(m.region) };
}

const target = (ctx: GateCtx) => sheetTarget(ctx, "mask");

export function bare(ctx: GateCtx, s: Step<"bare">): Gate[] {
  const { decl, mask } = faceplate(ctx);
  const v = ctx.v;
  const live = ctx.board.copper.difference(v.buffer(ctx.board.shape(decl.zone), k(ctx, "vinyl.wiringZoneGrow")));
  const shrunk = v.buffer(mask, -k(ctx, "vinyl.maskShrink"));
  const unc = live.isEmpty() ? 0 : (shrunk.isEmpty() ? live : live.difference(shrunk)).area();
  const max = k(ctx, "vinyl.bareMax");
  return [intervalGate("CHK-NET-20", unc < max, fill(s.msg, { bare: unc }), target(ctx), unc, 0, max, "mm2",
    `live copper more than ${f(k(ctx, "vinyl.wiringZoneGrow"), 1)} mm outside the wiring zone left bare under ${max} mm2`)];
}

export function padsClear(ctx: GateCtx, s: Step<"padsClear">): Gate[] {
  const { decl, mask } = faceplate(ctx);
  const a = overlapArea(mask, ctx.board.shape(decl.pads));
  const max = k(ctx, "vinyl.apartMax");
  return [intervalGate("CHK-NET-24", a < max, s.msg, target(ctx), a, 0, max, "mm2", "faceplate mode: the vinyl leaves every clip pad bare")];
}

export function overhang(ctx: GateCtx, s: Step<"overhang">): Gate[] {
  const { mask } = faceplate(ctx);
  const ok = contains(ctx.v.buffer(mask, -s.out), ctx.board.shape(s.electrode));
  return [boolGate("CHK-NET-24", ok, fill(s.msg, { out: s.out }), target(ctx), `faceplate mode: the vinyl overhangs the electrode by ${f(s.out, 1)} mm all round`)];
}

export function maskPiece(ctx: GateCtx, s: Step<"maskPiece">): Gate[] {
  const { mask } = faceplate(ctx);
  const n = islands(mask);
  return [boolGate("CHK-NET-09", n === 1, s.msg, target(ctx), "the mask is one continuous piece", { pieces: n })];
}

export function accents(ctx: GateCtx, s: Step<"accents">): Gate[] {
  const { decl, mask } = faceplate(ctx);
  const e = k(ctx, "vinyl.accentEdgeClear");
  const outer = s.inset ? ctx.v.buffer(mask, -e) : mask;
  const ok = contains(outer, ctx.board.shape(decl.accents));
  return [boolGate("CHK-NET-24", ok, s.msg, target(ctx), s.inset ? `faceplate mode: accents at least ${f(e, 1)} mm inside the faceplate edge` : "faceplate mode: accents land on the faceplate")];
}

export function maskKeepout(ctx: GateCtx, s: Step<"maskKeepout">): Gate[] {
  const { mask } = faceplate(ctx);
  const ok = contains(ctx.board.keepout, mask);
  return [boolGate("CHK-NET-09", ok, s.msg, target(ctx), `the mask stays inside the outline inset by the board's edge keep, ${f(ctx.board.draft.edgeKeep, 1)} mm`)];
}
