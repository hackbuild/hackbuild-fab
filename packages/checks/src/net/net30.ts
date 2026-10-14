// CHK-NET-30 run body (M05-T19 step 8, CHECKS.md 9.4): printed track swing.
// Port of BAFFLE R3's own check (originals/baffle-r3/files/src/model.js
// lines 1005 to 1012, lineage baffle.model/r3-36-collet): the wiper swings
// track / (track + drive traces) of Vcc end to end, and the model warns
// under 30 percent. TANG R6's cPLA arc read 6.9 percent against cTPU 78.7
// (r6_out.json); GUDGEON's finger slider 11 percent.
//
// Applies to a net with a conductor of role "element" (spec ConductorFeature
// role): the element's resistance over the element plus every other
// conductor on the net, the leads, each priced by the circuit kernel's one
// leg rule (legOf over the profile resistivity rows). Drive resistance at
// the pin has no declared field and no profile row, so it counts 0 and the
// swing is an upper bound; extra says so. The line is profile constant
// read.swing.minPercent. Seed severity warn.

import type { ConductorFeature, Finding, TargetOf } from "@hackbuild/spec";
import { legOf } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { fmt, intervalEvidence, skip } from "../defs/common.js";

/** Profile constant holding the least swing, percent. */
export const SWING_ROW = "read.swing.minPercent";

export function runNet30(t: TargetOf<"net">, ctx: RegistryCtx): readonly Finding[] {
  const { part, net } = t;
  const target = { level: "net", part: part.id, net: net.id } as const;
  const conductors = part.features.filter((f): f is ConductorFeature => f.kind === "conductor" && f.net === net.id);
  const element = conductors.filter((f) => f.role === "element");
  if (element.length === 0) return [skip(target, "not run", `net ${net.id} declares no element conductor (role element); swing reads a slider or pot track`)];
  const leads = conductors.filter((f) => f.role !== "element");
  const ohm = (fs: readonly ConductorFeature[]): number => fs.reduce((s, f) => s + legOf(f, ctx.profile).ohm, 0);
  const elementOhm = ohm(element);
  const leadOhm = ohm(leads);
  const swing = (100 * elementOhm) / (elementOhm + leadOhm);
  const line = ctx.profile.constant(SWING_ROW);
  const ev = intervalEvidence(swing, line.value, 100, line.unit);
  return [{
    verdict: ev.inside ? "pass" : "fail",
    target, measured: ev.measured, legal: ev.legal,
    constraint: `track swing ${fmt(swing, 1)} percent, legal ${fmt(line.value)} to 100, set by ${SWING_ROW} (${line.provenance.tier}): element ${fmt(elementOhm, 0)} ohm over element plus leads ${fmt(leadOhm, 0)} ohm, drive 0 (none declared, swing an upper bound)${ev.inside ? "" : "; shorten or widen the leads, or print the element in a more resistive material"}`,
    extra: {
      elementOhm, leadOhm, driveOhm: 0, driveDeclared: "no",
      element: element.map((f) => f.id).join(" "), leads: leads.map((f) => f.id).join(" "), row: SWING_ROW,
    },
  }];
}
