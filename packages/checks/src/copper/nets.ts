// Net gates of the KEYWAY family (gen_keyway.py lines 201 to 230):
// single island per net (CHK-NET-01), the named netlist audit
// (CHK-NET-31), minimum clearance with the pair named (CHK-NET-02),
// copper inside the outline keepout (CHK-NET-08) and erode survival
// (CHK-NET-14). The later boards print the net name in a wider column and
// word and judge the erode gate their own way (gen_vernier.py lines 212
// to 229, gen_spline.py lines 227 to 242); the step carries which.

import type { Section } from "@hackbuild/geom";
import type { ErodeStyle } from "@hackbuild/copper";
import { contains, distance, intersects, islands, pointIn, tightestPairs } from "@hackbuild/copper";
import { boolGate, f, intervalGate, k, left, netTarget, sheetTarget, type Gate, type GateCtx } from "./gate.js";

/** One gate per net: the smoothed net is one polygon; pad is the name column width. */
export function singleIsland(ctx: GateCtx, pad = 4): Gate[] {
  return [...ctx.board.nets].map(([name, s]) => {
    const n = islands(s);
    return boolGate("CHK-NET-01", n === 1, `net ${left(name, pad)} single island (${n})`, netTarget(ctx, name),
      `net ${name} is one connected piece of copper`, { islands: n });
  });
}

/** Every declared connection is made: a probe region the net touches, or a point it holds. */
export function netlistAudit(ctx: GateCtx): Gate {
  const probes = ctx.board.draft.audit;
  const missed: string[] = [];
  let made = 0;
  for (const p of probes) {
    const net = ctx.board.nets.get(p.net);
    const ok = net !== undefined && (p.point !== undefined ? pointIn(net, p.point) : p.region !== undefined && intersects(net, ctx.board.shape(p.region)));
    if (ok) made++;
    else missed.push(`${p.net}:${p.what}`);
  }
  return intervalGate("CHK-NET-31", made === probes.length, `netlist audit by name (${made}/${probes.length} connections)`,
    { level: "part", part: ctx.board.draft.name.toLowerCase() }, made, probes.length, probes.length, "connections",
    `every declared connection made by name, ${probes.length} declared`, missed.length === 0 ? undefined : { missed: missed.join(" ") });
}

/** Pairwise distance over every net and the art, the tightest pair named and the tie listed. */
export function minClearance(ctx: GateCtx): Gate {
  // KEYWAY's least clearance is six pairs at 1.000 mm exactly (COM/ART, P1/P3,
  // P2/P4, P3/SA, P4/SC, SB/SC; computed with shapely 2.1.2, 2026-10-08); the
  // generator names whichever float rounding put lowest. The line names the
  // first tied pair in net order and extra.ties lists all (copper TIE_MM).
  const t = tightestPairs([...ctx.board.nets, ["ART", ctx.board.art]]);
  const worst = Math.min(99, t.least);
  const pair = t.pair;
  const ties = t.ties;
  const clr = ctx.board.draft.clr;
  const [a, b] = pair.split("/");
  return intervalGate("CHK-NET-02", worst >= clr, `min clearance ${f(worst, 3)} mm at ${pair} (gate ${f(clr, 2)})`,
    { level: "pair", a: netTarget(ctx, a ?? ""), b: netTarget(ctx, b ?? "") }, worst, clr, null, "mm",
    `copper to copper between nets, gate ${f(clr, 2)} set by the board's clr`, { pair, ties: ties.join(" ") });
}

/**
 * All copper inside the outline inset by edge keep. The verdict is the
 * generator's containment test; the measured value is the least distance
 * from the copper to the outline, read against a frame around it.
 */
export function outlineKeepout(ctx: GateCtx): Gate {
  const ok = contains(ctx.board.keepout, ctx.board.copper);
  const e = ctx.board.draft.edgeKeep;
  const d = ctx.board.draft;
  const frame = ctx.v.box(-1, -1, d.W + 1, d.H + 1).difference(ctx.board.outline);
  const least = distance(ctx.board.copper, frame);
  return intervalGate("CHK-NET-08", ok, `all copper >= ${f(e, 1)} mm from the shared outline`, sheetTarget(ctx, "copper"), least, e, null, "mm",
    `copper at least ${f(e, 1)} mm inside the cut outline, set by the board's edge keep`);
}

/**
 * Each net erodes by vinyl.erodeHalfMin. ratio (KEYWAY): every net and the
 * art keep their island count; count (VERNIER, QUADRANT): every net keeps
 * at least one island; plain (SPLINE to STAVE): no net vanishes.
 */
export function erodeSurvival(ctx: GateCtx, style: ErodeStyle = "ratio", pad = 4): Gate[] {
  const d = k(ctx, "vinyl.erodeHalfMin");
  const list: [string, Section][] = style === "ratio" ? [...ctx.board.nets, ["ART", ctx.board.art]] : [...ctx.board.nets];
  return list.map(([name, s]) => {
    const n0 = islands(s);
    const n1 = islands(ctx.v.buffer(s, -d));
    const w = f(2 * d, 2);
    const extra = { islandsBefore: n0, islandsAfter: n1 };
    if (style === "ratio") {
      return boolGate("CHK-NET-14", n1 >= n0, `${left(name, pad)} survives the ${w} mm erode test (${n1}/${n0} islands)`,
        netTarget(ctx, name), `every feature at least ${w} mm wide: eroding by ${f(d, 2)} mm keeps all ${n0} islands`, extra);
    }
    const msg = style === "count" ? `net ${left(name, pad)} survives the ${w} mm erode test (${n1} islands)` : `net ${left(name, pad)} survives the ${w} mm erode test`;
    return boolGate("CHK-NET-14", n1 >= 1, msg, netTarget(ctx, name), `net ${name} keeps copper after eroding by ${f(d, 2)} mm, so its features are at least ${w} mm wide`, extra);
  });
}
