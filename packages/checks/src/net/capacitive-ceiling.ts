// CHK-NET-28 run body (M05-T12, CHECKS.md 9.4, D-021, C-12, C-13): a
// capacitive electrode's path stays at or under the Capricate ceiling.
// Applies to every net that ends at a port of interface "capacitive". The
// bound is circuit/capacitive-path-ceiling on net.ohm, the profile constant
// capacitive.pathCeilOhm; measured is the path circuit.solve computed:
// a declared series net's resistor plus its lead share (views.circuit,
// solveSeriesScene), else the extracted net's Net.totalOhm hi end. The
// ceiling is a capacitive-touch SNR rule and is never applied to a pullup
// read (verified-claims C3, C12).

import type { Finding, PortFeature, TargetOf } from "@hackbuild/spec";
import { createRegistry, solve, type ConstraintRegistry } from "@hackbuild/constraints";
import { CAPACITIVE_NET_DIM, capacitivePathCeiling, type SeriesPort } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { viewsOf } from "../views.js";
import { fmt, intervalEvidence, skip } from "../defs/common.js";

let reg: ConstraintRegistry | undefined;
const registry = (): ConstraintRegistry => (reg ??= createRegistry([capacitivePathCeiling]));

/** The port interface the ceiling applies to. */
export const CAPACITIVE_INTERFACE = "capacitive";

const isSeries = (p: unknown): p is SeriesPort => typeof p === "object" && p !== null && "resistorOhm" in p && "totalOhm" in p;

export function runNet28(t: TargetOf<"net">, ctx: RegistryCtx): readonly Finding[] {
  const { part, net } = t;
  const target = { level: "net", part: part.id, net: net.id } as const;
  const ports = part.features.filter((f): f is PortFeature => f.kind === "port" && f.net === net.id && f.interface === CAPACITIVE_INTERFACE);
  if (ports.length === 0) return [skip(target, "not run", `net ${net.id} has no port of interface ${CAPACITIVE_INTERFACE}`)];
  const q = solve(registry(), CAPACITIVE_NET_DIM, { profile: ctx.profile, machine: ctx.machine, material: "", part, facts: { capacitive: true } });
  const iv = q.interval;
  const ceiling = Math.min(...iv.hi.map((b) => b.value));
  const reason = iv.hi.map((b) => b.reason).join("; ");
  return ports.map((port): Finding => {
    const solved = viewsOf(ctx).circuit?.(part.id, port.id);
    const series = isSeries(solved) ? solved : undefined;
    const measured = series?.totalOhm ?? net.totalOhm[1];
    const ev = intervalEvidence(measured, null, ceiling, "ohm");
    const lowerBound = series === undefined && net.unpricedContacts.length > 0;
    const path = series === undefined
      ? `extracted path ${fmt(measured, 2)} ohm`
      : `path ${fmt(measured, 2)} ohm: resistor ${fmt(series.resistorOhm, 2)} ohm plus ${fmt(series.leadMm, 2)} mm of lead at ${fmt(series.conductorOhm, 2)} ohm`;
    const fix = `fix: bring the path to at most ${fmt(ceiling, 0)} ohm with a smaller resistor or a shorter or wider lead (conductor.pathLen)`;
    const extra = series === undefined
      ? { port: port.id, ceilingOhm: ceiling, tier: net.tier, qualifier: net.qualifier, unpricedContacts: net.unpricedContacts.length }
      : {
        port: port.id, ceilingOhm: ceiling, resistorOhm: series.resistorOhm, leadMm: series.leadMm, conductorOhm: series.conductorOhm,
        ...(series.electrode === null ? {} : { electrode: series.electrode }), tier: series.tier ?? "none", qualifier: series.q.qualifier,
      };
    return {
      verdict: !ev.inside ? "fail" : lowerBound ? "warn" : "pass",
      target, measured: ev.measured, legal: ev.legal,
      constraint: `circuit/capacitive-path-ceiling on ${port.id}, ${path}; ${reason}${lowerBound ? `; ${String(net.unpricedContacts.length)} contacts unpriced, path a lower bound` : ""}${ev.inside ? "" : `; ${fix}`}`,
      extra,
    };
  });
}
