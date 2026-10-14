// CHK-BRD-21 run body (M08-T12 step 7): one island per net across layers,
// and no copper joining two nets unless the record declares the bridge.
// Connectivity is packages/board connect.ts, the kernel the KiCad readback
// shares: pads, tracks as capsules, vias as discs, pours joining their
// net's items inside them. Origin: SPINDLE R1 as shipped, whose 5V bottom
// trace at y 20.00 (pcb.py lines 184 to 185) runs through four GND vias at
// x 9.80, 16.00, 30.60 and 36.20 (lines 197 to 200); the legacy DRC unioned
// the uncleared pour and never read bottom copper between nets.
//
// The measured short set is every net pair joined by copper plus every
// declared bridge, as pair ids (expect.ts pairId; a net shorted to itself
// through a part is the net alone). With a chase expect entry on the board
// (D-074, SHUNT G7) the finding compares that set with the declared one
// exactly. Without one, a short that is not a declared bridge fails, and so
// does a net in more than one island.

import type { BoardRecord, CheckCtx, Finding, ResultTarget } from "@hackbuild/spec";
import { connectivity, recordCopper, type CopperShort } from "@hackbuild/board";
import { boolFinding } from "../defs/common.js";
import { expectFinding, expectsFor, idSet, pairId } from "../expect.js";

export interface IslandAudit {
  /** Copper shorts not covered by a declared bridge, one per net pair. */
  readonly shorts: readonly CopperShort[];
  /** Pair ids of every copper short and every declared bridge. */
  readonly shortIds: readonly string[];
  /** Nets in more than one island, with the count. */
  readonly split: readonly { readonly net: string; readonly islands: number }[];
}

export function islandAudit(record: BoardRecord): IslandAudit {
  const { items, pours, keepouts } = recordCopper(record);
  const conn = connectivity(items, pours, keepouts);
  const declared = new Set(record.bridges.map((b) => pairId(b.nets[0], b.nets[1])));
  const byPair = new Map<string, CopperShort>();
  for (const s of conn.shorts) {
    const id = pairId(s.nets[0], s.nets[1]);
    if (!declared.has(id) && !byPair.has(id)) byPair.set(id, s);
  }
  const shortIds = idSet([...conn.shorts.map((s) => pairId(s.nets[0], s.nets[1])), ...declared]);
  const split = [...conn.islands].filter(([, n]) => n > 1).map(([net, islands]) => ({ net, islands })).sort((a, b) => (a.net < b.net ? -1 : 1));
  return { shorts: [...byPair.values()], shortIds, split };
}

export function brd21(record: BoardRecord, partId: string, ctx: Pick<CheckCtx, "expect">): readonly Finding[] {
  const at: ResultTarget = { level: "part", part: partId };
  const audit = islandAudit(record);
  const expects = expectsFor(ctx, partId);
  if (expects.length > 0) {
    return expects.map((e) => expectFinding(at, e, audit.shortIds,
      `net pairs joined by copper or a declared bridge on ${partId}: ${audit.shortIds.length} measured`));
  }
  const ok = audit.shorts.length === 0 && audit.split.length === 0;
  const first = audit.shorts[0];
  const constraint = ok
    ? `${record.nets.length} nets one island each; no copper joins two nets (${record.bridges.length} declared bridges)`
    : first !== undefined
      ? `${first.nets.join(" and ")} shorted on ${first.layer}: ${first.between[0]} touches ${first.between[1]}, gap ${first.gap.toFixed(3)} mm, legal above 0${audit.shorts.length > 1 ? `, and ${audit.shorts.length - 1} more net pairs` : ""}; route one net around the other or declare the bridge`
      : `${audit.split.map((s) => `${s.net} in ${s.islands} islands`).join(", ")}; route each net as one piece of copper`;
  return [boolFinding(at, ok, constraint, {
    shorts: audit.shorts.length,
    pairs: audit.shorts.map((s) => pairId(s.nets[0], s.nets[1])).join(", "),
    split: audit.split.map((s) => `${s.net}:${s.islands}`).join(", "),
  })];
}
