// The top copper wiper and what holds it (gen_keyway.py lines 277 to 284).
// Its reach is the wiper less the sliding film and the holding spacer's
// outer box, cut to the copper: outside the collector pad grown by
// vinyl.wiperPadGrow it must touch under vinyl.wiperStrayMax (CHK-NET-19).
// The film clears the collector by vinyl.filmCollectorClear, the tail
// lands over vinyl.wiperLandMin on the collector, and the spacer slot lies
// over the film for more than vinyl.slotOverFilmMin of its area
// (CHK-NET-35).

import { distance, overlapArea } from "@hackbuild/copper";
import { f, intervalGate, k, netTarget, sheetTarget, type Gate, type GateCtx } from "./gate.js";

export function wiperGates(ctx: GateCtx): Gate[] {
  const w = ctx.board.draft.wiper;
  if (w === undefined) return [];
  const v = ctx.v;
  const film = ctx.board.shape(w.film);
  const wiper = ctx.board.shape(w.wiper);
  const collector = ctx.board.nets.get(w.collector)!;
  const name = ctx.board.draft.filmName ?? "film";
  const clear = k(ctx, "vinyl.filmCollectorClear");
  const d = distance(film, collector);
  const out: Gate[] = [];
  out.push(intervalGate("CHK-NET-35", d >= clear, `slider ${name} clears the ${w.collector} collector by ${f(d, 2)} mm`,
    { level: "pair", a: sheetTarget(ctx, "film-slider"), b: netTarget(ctx, w.collector) }, d, clear, null, "mm",
    `the sliding film stays ${f(clear, 1)} mm off the collector the wiper lands on`));
  const reach = wiper.difference(film, ctx.board.shape(w.spacerOuter)).intersection(ctx.board.copper);
  const g = k(ctx, "vinyl.wiperPadGrow");
  const [x0, y0, x1, y1] = w.landing;
  const stray = reach.isEmpty() ? 0 : reach.difference(v.box(x0 - g, y0 - g, x1 + g, y1 + g)).area();
  const strayMax = k(ctx, "vinyl.wiperStrayMax");
  out.push(intervalGate("CHK-NET-19", stray < strayMax, `wiper reaches base copper at the ${w.collector} pad only (stray ${f(stray, 3)} mm2)`,
    sheetTarget(ctx, "wiper"), stray, 0, strayMax, "mm2", `wiper copper reaching the base copper outside the ${w.collector} pad stays under ${f(strayMax, 2)} mm2`));
  const land = reach.isEmpty() ? 0 : reach.area();
  const landMin = k(ctx, "vinyl.wiperLandMin");
  out.push(intervalGate("CHK-NET-35", land > landMin, `wiper tail lands ${f(land, 1)} mm2 on ${w.collector}`,
    sheetTarget(ctx, "wiper"), land, landMin, null, "mm2", `the wiper tail lands more than ${f(landMin, 0)} mm2 on the ${w.collector} pad`));
  const slot = ctx.board.shape(w.slot);
  const frac = overlapArea(slot, film) / slot.area();
  const fracMin = k(ctx, "vinyl.slotOverFilmMin");
  out.push(intervalGate("CHK-NET-35", frac > fracMin, `spacer slot sits fully over the slider ${name}`,
    sheetTarget(ctx, "spacer-upper"), frac, fracMin, 1, "ratio", `the holding spacer's slot lies over the sliding film for more than ${f(fracMin * 100, 1)} percent of its area`));
  return out;
}
