// Force-zone film and spacer windows (gen_keyway.py lines 268 to 276).
// The film over a zone, with every other net grown by vinyl.filmBridgeGrow,
// touches only the common net and the zone's own net, and covers more than
// vinyl.filmCoverMin of each comb (CHK-NET-18); the spacer window over the
// zone exposes more than vinyl.windowExposeMin of each comb (CHK-NET-34);
// the sliding film touches only its own two nets (CHK-NET-18).

import type { Section } from "@hackbuild/geom";
import { intersects, overlapArea } from "@hackbuild/copper";
import { boolGate, f, intervalGate, k, pyList, sheetTarget, type Gate, type GateCtx } from "./gate.js";

/** Nets other than the allowed ones that a film touches once each net is grown by vinyl.filmBridgeGrow, in net order. */
export function foreignNets(ctx: GateCtx, film: Section, allowed: readonly string[]): string[] {
  const grow = k(ctx, "vinyl.filmBridgeGrow");
  return [...ctx.board.nets].filter(([name, s]) => !allowed.includes(name) && intersects(ctx.v.buffer(s, grow), film)).map(([name]) => name);
}

export function zoneGates(ctx: GateCtx): Gate[] {
  const out: Gate[] = [];
  const film = ctx.board.draft.filmName ?? "film";
  const cover = k(ctx, "vinyl.filmCoverMin");
  const expose = k(ctx, "vinyl.windowExposeMin");
  for (const z of ctx.board.draft.zones) {
    const v = ctx.board.shape(z.film);
    const w = ctx.board.shape(z.window);
    const common = ctx.board.nets.get(z.common)!;
    const own = ctx.board.nets.get(z.net)!;
    const foreign = foreignNets(ctx, v, [z.common, z.net]);
    out.push(boolGate("CHK-NET-18", foreign.length === 0, `${film} ${z.net} bridges ${z.common}+${z.net} only (foreign ${pyList(foreign)})`,
      sheetTarget(ctx, `film-${z.net}`), `the ${film} over zone ${z.net} touches ${z.common} and ${z.net} only, every other net grown ${f(k(ctx, "vinyl.filmBridgeGrow"), 1)} mm`,
      foreign.length === 0 ? undefined : { foreign: foreign.join(" ") }));
    const a = overlapArea(common, v), b = overlapArea(own, v);
    out.push(boolGate("CHK-NET-18", Math.min(a, b) > cover, `${film} ${z.net} covers both combs (${f(a, 0)} / ${f(b, 0)} mm2)`,
      sheetTarget(ctx, `film-${z.net}`), `the ${film} covers more than ${f(cover, 0)} mm2 of each comb`,
      { commonMm2: Number(a.toFixed(3)), ownMm2: Number(b.toFixed(3)) }));
    const wa = overlapArea(common, w), wb = overlapArea(own, w);
    out.push(intervalGate("CHK-NET-34", Math.min(wa, wb) > expose, `spacer window ${z.net} exposes both combs (${f(wa, 0)} / ${f(wb, 0)} mm2)`,
      sheetTarget(ctx, `window-${z.net}`), Math.min(wa, wb), expose, null, "mm2", `the spacer window over zone ${z.net} exposes more than ${f(expose, 0)} mm2 of each comb`,
      { commonMm2: Number(wa.toFixed(3)), ownMm2: Number(wb.toFixed(3)) }));
  }
  return out;
}

/** The sliding film touches its own two nets only. */
export function slidingFilm(ctx: GateCtx): Gate[] {
  const w = ctx.board.draft.wiper;
  if (w === undefined) return [];
  const film = ctx.board.shape(w.film);
  const foreign = foreignNets(ctx, film, w.filmNets);
  const name = ctx.board.draft.filmName ?? "film";
  return [boolGate("CHK-NET-18", foreign.length === 0, `slider ${name} touches ${w.filmNets.join("+")} only (foreign ${pyList(foreign)})`,
    sheetTarget(ctx, "film-slider"), `the slider ${name} touches ${w.filmNets.join(" and ")} only`, foreign.length === 0 ? undefined : { foreign: foreign.join(" ") })];
}
