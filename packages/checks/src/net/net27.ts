// CHK-NET-27 run body (M05-T19 step 3, CHECKS.md 9.4): makesContact,
// executed. FEELER recorded a contact as a gap that closes when actuated
// and never tested it on geometry (makesContact, feeler_thinpot.html line
// 1102); the source note's idea 2 (benches-conductive-a.md line 665) moves
// the moving part to its actuated state and runs the touch test against the
// targets. packages/circuit contactTouch moves the contact's declared
// actuator body along its declared axis by the contact's gap (a rigid move,
// no physics step) and measures its closest approach to the body of each
// terminal conductor; the contact closes when both are within the
// extraction touch distance. A fail names the closest approach left open.

import type { ContactFeature, Finding, TargetOf } from "@hackbuild/spec";
import { contactTouch } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { NO_MESH, viewsOf } from "../views.js";
import { boolFinding, featureTarget, fmt, skip } from "../defs/common.js";

export async function runNet27(t: TargetOf<"feature", "contact">, ctx: RegistryCtx): Promise<readonly Finding[]> {
  const c = t.feature as ContactFeature;
  const target = featureTarget(t.part, c);
  const mesh = viewsOf(ctx).mesh;
  if (mesh === undefined) return [skip(target, "not run", NO_MESH)];
  const r = await contactTouch({ part: t.part, mesh, profile: ctx.profile, contact: c });
  if ("reason" in r) return [skip(target, "not run", `${r.reason}; CHK-NET-27 moves the declared actuator by the gap`)];
  const [a, b] = r.terminals;
  const closest = Math.max(a.mm, b.mm);
  const axis = r.press.axis.map((x) => fmt(x)).join(", ");
  const move = `${r.press.body} moved ${fmt(r.press.travelMm)} mm along [${axis}]`;
  const extra = {
    actuator: r.press.body, travelMm: r.press.travelMm, a: a.conductor, b: b.conductor,
    approachAMm: a.mm, approachBMm: b.mm, closestMm: closest, touchMm: r.touch.mm,
    axisX: r.press.axis[0], axisY: r.press.axis[1], axisZ: r.press.axis[2],
  };
  if (r.closes) {
    return [boolFinding(target, true, `${move} touches ${a.conductor} and ${b.conductor} (within ${r.touch.mm.toFixed(6)} mm, ${r.touch.tier})`, extra)];
  }
  const open = [a, b].filter((x) => x.mm > r.touch.mm).map((x) => `${x.conductor} by ${fmt(x.mm)} mm`).join(" and ");
  return [boolFinding(target, false, `${move} stops short of ${open}; closest approach ${fmt(closest)} mm left open; set the gap to the built travel or move the terminals up to the actuator`, extra)];
}
