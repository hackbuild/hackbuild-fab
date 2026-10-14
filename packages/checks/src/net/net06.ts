// CHK-NET-06 run body (M05-T06 step 4, CHECKS.md 7, D-078): the source
// impedance an ADC pin sees stays under the 100 kohm line or is flagged
// (TANG R5 2026-08-17). Applies to every net that ends at a port whose
// hookup entry reads by adc. Measured is the net's series resistance,
// Net.totalOhm hi end; the line, the analog ceiling and the hold capacitor
// are the adc read model's profile rows (read.adc.lineOhm,
// read.adc.analogCeilOhm, read.adc.holdCapNf), read through circuit.solve's
// port pass (views.circuit). The seed severity is warn, so a source over
// the line reports warn and never blocks an export.

import type { Finding, HookupDecl, TargetOf } from "@hackbuild/spec";
import type { AdcPort } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { NO_CIRCUIT, viewsOf } from "../views.js";
import { fmt, intervalEvidence, skip } from "../defs/common.js";

const isAdc = (p: unknown): p is AdcPort => typeof p === "object" && p !== null && "read" in p && "pin" in p && !("op" in p);

export function runNet06(t: TargetOf<"net">, ctx: RegistryCtx): readonly Finding[] {
  const { part, net } = t;
  const target = { level: "net", part: part.id, net: net.id } as const;
  const adc = (ctx.hookup ?? []).filter((h: HookupDecl) => h.read.model === "adc" && net.terminals.includes(h.port));
  if (adc.length === 0) return [skip(target, "not run", `net ${net.id} has no port read by adc`)];
  return adc.map((h): Finding => {
    const solved = viewsOf(ctx).circuit?.(part.id, h.port);
    if (!isAdc(solved)) return skip(target, "not run", NO_CIRCUIT);
    const r = solved.read;
    const ev = intervalEvidence(r.sourceOhm, 0, r.lineOhm.value, "ohm");
    const band = r.band === "fine"
      ? "signal and adc fine"
      : r.band === "hold-cap"
        ? `adc needs a ${fmt(r.holdCapNf!.value)} nF hold capacitor at the pin`
        : `no analog read at or above ${fmt(r.analogCeilOhm.value, 0)} ohm, digital only`;
    return {
      verdict: ev.inside ? "pass" : "fail",
      target, measured: ev.measured, legal: ev.legal,
      constraint: `adc source on ${solved.mcu.id} pin ${h.pin} against the ${fmt(r.lineOhm.value, 0)} ohm line (read.adc.lineOhm, ${r.lineOhm.qualifier}): ${band}`,
      extra: {
        port: h.port, mcu: solved.mcu.id, pin: h.pin, band: r.band, lineOhm: r.lineOhm.value, analogCeilOhm: r.analogCeilOhm.value,
        ...(r.holdCapNf === null ? {} : { holdCapNf: r.holdCapNf.value }), tier: net.tier, qualifier: r.qualifier,
      },
    };
  });
}
