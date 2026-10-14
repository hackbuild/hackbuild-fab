// CHK-NET-02 on built solids (M05-T10 step 4, D-085, C-06): the least
// distance between every pair of nets, in plane or between layers, against
// the net-to-net floor, profile stack.netToNetMin (0.60 mm, inferred). The
// distances are circuit.solve's extraction gaps: manifold minGap between
// the unions of each net's conductive bodies, out to route.gapSearch
// (packages/circuit/src/extract/nets.ts netGaps). A pair further apart than the
// search reads the search, the floor is far below it, and extra says the
// value is a bound.
//
// PIP warns only under 0.3 mm and its fits row fails under 0.4, so its
// gaps from 0.4 to 0.6 pass there; here each one fails naming both nets. Without an extraction the M-S footprint form
// runs instead (skeleton/net02.ts, declared conductor footprints).

import type { Finding, Mm, ResultTarget, TargetOf } from "@hackbuild/spec";
import type { NetGap } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { fmt, intervalEvidence, passOr } from "../defs/common.js";

/** Profile constant: the net-to-net floor of the buried stack, mm (PROFILE.md 6.1, D-085). */
export const NET_FLOOR = "stack.netToNetMin";

/** The floor from profile, mm, and its tier. */
export function netFloor(ctx: Pick<RegistryCtx, "profile">): { readonly mm: Mm; readonly tier: string } {
  const c = ctx.profile.constant(NET_FLOOR);
  return { mm: c.value, tier: c.provenance.tier };
}

/** One finding per pair whose first net is `from`, or per pair when from is undefined; a pair at the search reads as a bound. */
export function pairFindings(part: string, gaps: readonly NetGap[], floor: { readonly mm: Mm; readonly tier: string }, searchMm: Mm, from?: string): Finding[] {
  return gaps.filter((g) => from === undefined || g.a === from).map((g): Finding => {
    const ev = intervalEvidence(g.mm, floor.mm, null, "mm");
    const bound = g.mm >= searchMm;
    const target: ResultTarget = { level: "pair", a: { level: "net", part, net: g.a }, b: { level: "net", part, net: g.b } };
    return {
      verdict: passOr(ev.inside), target, measured: ev.measured, legal: ev.legal,
      constraint: ev.inside
        ? `nets ${g.a} and ${g.b} ${bound ? `at least ${fmt(g.mm, 3)} mm apart (search distance)` : `${fmt(g.mm, 3)} mm apart`}, net-to-net floor ${fmt(floor.mm, 2)} mm (stack.netToNetMin, ${floor.tier})`
        : `nets ${g.a} and ${g.b} ${fmt(g.mm, 3)} mm apart, under the net-to-net floor ${fmt(floor.mm, 2)} mm (stack.netToNetMin, ${floor.tier}); move the traces apart or reroute`,
      extra: { a: g.a, b: g.b, searchMm, bound: bound ? "search distance" : "measured" },
    };
  });
}

/** The registry run: the pairs this net opens, from the extraction gaps. */
export function runNet02Solid(t: TargetOf<"net">, ctx: RegistryCtx, ex: { readonly gaps: readonly NetGap[]; readonly gapSearch: { readonly mm: Mm } | null }): readonly Finding[] {
  if (ex.gapSearch === null) return [];
  return pairFindings(t.part.id, ex.gaps, netFloor(ctx), ex.gapSearch.mm, t.net.id);
}
