// The clip field staggers (gen_keyway.py lines 250 to 252): adjacent pads
// in field order sit on alternate rows, so physically adjacent jaws are
// 2 x pitch less the pad size apart (14.0 mm at pitch 12 and pad 10).
// CHK-NET-21.

import { boolGate, f, sheetTarget, type Gate, type GateCtx } from "./gate.js";

export function clipStagger(ctx: GateCtx): Gate {
  const c = ctx.board.draft.clips;
  if (c === undefined) return boolGate("CHK-NET-21", false, "terminal field staggered: no clip field declared", sheetTarget(ctx, "copper"), "a stagger gate reads the draft's clip field");
  const t = [...c.terminals].sort((a, b) => a.idx - b.idx);
  const ok = t.every((x, i) => i === 0 || t[i - 1]!.row !== x.row);
  const jaws = 2 * c.pitch - c.size;
  return boolGate("CHK-NET-21", ok, `terminal field staggered: ${f(jaws, 1)} mm between physically adjacent clips`, sheetTarget(ctx, "copper"),
    `adjacent clip pads alternate rows, ${f(jaws, 1)} mm between adjacent jaws at pitch ${f(c.pitch, 1)} and pad ${f(c.size, 1)}`, { jawsMm: jaws });
}
