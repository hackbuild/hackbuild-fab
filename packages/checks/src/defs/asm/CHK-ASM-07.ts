// CHK-ASM-07, closest approach reported with numbers, flag under 3 mm
// (OGEE R16-P 2026-08: 2.40 mm read as contact in a render). OGEE16
// reports closest approach per servo and per swept crank with a "looks
// like contact" flag under 3.0 mm (sources notes, plan-deltas R54 fold).
// Every pair of instances and bought bodies that no joint links is asked
// for its closest approach over the motion cycle; each pair under 3.0 mm
// is a finding on the pair, and with none the closest pair is reported.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { fmt, intervalFinding, skip } from "../common.js";
import { isSim, simOr } from "./sim.js";

/** The reads-as-contact threshold the title names, mm. */
export const READS_AS_CONTACT_MM = 3.0;

export const check = defineCheck({
  id: "CHK-ASM-07",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const a = t.assembly;
    const sim = simOr(ctx, a);
    if (!isSim(sim)) return [sim];
    const ids = [...a.instances.map((i) => i.id), ...a.bought.map((b) => b.id)];
    const linked = (x: string, y: string): boolean => a.joints.some((j) => (j.a === x && j.b === y) || (j.a === y && j.b === x));
    const rows: { x: string; y: string; mm: number; at: readonly [number, number, number]; state: string }[] = [];
    ids.forEach((x, i) => {
      for (const y of ids.slice(i + 1)) {
        if (linked(x, y)) continue;
        const ca = sim.closestApproach(x, y, "cycle");
        rows.push({ x, y, mm: ca.mm, at: ca.at, state: ca.state });
      }
    });
    if (rows.length === 0) return [skip({ level: "assembly", assembly: a.id }, "not run", `assembly ${a.id} has no unlinked pair`)];
    const pairTarget = (r: (typeof rows)[number]): Finding["target"] =>
      ({ level: "pair", a: { level: "assembly", assembly: a.id, part: r.x }, b: { level: "assembly", assembly: a.id, part: r.y }, at: r.at });
    const why = `under ${fmt(READS_AS_CONTACT_MM)} mm reads as contact in a render; report the number`;
    const close = rows.filter((r) => r.mm < READS_AS_CONTACT_MM);
    const shown = close.length > 0 ? close : [rows.reduce((m, r) => (r.mm < m.mm ? r : m))];
    return shown.map((r) => intervalFinding(pairTarget(r), Number(r.mm.toFixed(3)), READS_AS_CONTACT_MM, null, "mm", why, { state: r.state, pairs: rows.length }));
  },
});
