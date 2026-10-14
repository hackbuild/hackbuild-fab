// CHK-NET-01 run body (M05-T10 step 4, CHECKS.md 7, D-085): every declared
// net is one piece of conductor in the built part, and no piece carries two
// nets (STYLUS 2026-08: most archetypes electrically broken). The pieces
// come from circuit.solve's extraction (packages/circuit/src/extract/nets.ts,
// M05-T04): connected components of the conductive bodies joined by touch.
// A split names its pieces; a short names the other nets in the piece.

import type { Finding, TargetOf } from "@hackbuild/spec";
import type { RegistryCtx } from "../views.js";
import { NO_EXTRACTION, viewsOf } from "../views.js";
import { boolFinding, skip } from "../defs/common.js";

/** Components a piece is named by in the constraint; extra lists every one. */
const NAMED = 4;

export function runNet01(t: TargetOf<"net">, ctx: RegistryCtx): readonly Finding[] {
  const { part, net } = t;
  const target = { level: "net", part: part.id, net: net.id } as const;
  const ex = viewsOf(ctx).extraction?.(part.id);
  if (ex === undefined) return [skip(target, "not run", NO_EXTRACTION)];
  const split = ex.splits.find((s) => s.net === net.id);
  const shorts = ex.shorts.filter((s) => s.nets.includes(net.id));
  const pieces = ex.pieces.flatMap((p, i) => (p.nets.includes(net.id) ? [i] : []));
  const ok = split === undefined && shorts.length === 0 && pieces.length === 1;
  const named = (i: number): string => {
    const c = ex.pieces[i]!.components;
    return c.length <= NAMED ? c.join(" + ") : `${c.slice(0, NAMED).join(" + ")} and ${c.length - NAMED} more`;
  };
  const constraint = ok
    ? `net ${net.id} is one piece of conductor (${ex.pieces[pieces[0]!]!.components.length} components joined by touch, at most ${ex.touch.mm.toFixed(6)} mm apart)`
    : pieces.length === 0
      ? `net ${net.id} has no conductor in the built part`
      : split !== undefined
        ? `net ${net.id} is in ${split.pieces.length} pieces: ${split.pieces.map(named).join(", ")}; route the missing connection or join the pieces`
        : `net ${net.id} shares a piece with ${[...new Set(shorts.flatMap((s) => s.nets))].filter((n) => n !== net.id).join(", ")}: ${shorts.map((s) => named(s.piece)).join(", ")}; part the nets`;
  return [boolFinding(target, ok, constraint, {
    pieces: pieces.length,
    components: pieces.map((i) => ex.pieces[i]!.components.join(" ")).join(", "),
    shortWith: [...new Set(shorts.flatMap((s) => s.nets))].filter((n) => n !== net.id).join(" "),
  })];
}
