// CHK-NET-26 run body (M05-T19 step 2, CHECKS.md 9.4): apartExcept. Port of
// FEELER Ctx.apartExcept (STYLUS, feeler_thinpot.html lines 1071 and 1180
// to 1190, lineage feeler.bench/thinpot-16-apart): the named nets may share the
// cut part and no other path. For each `apartExcept {nets, cut}` assertion
// whose first net is this net, packages/circuit apartExcept presses every
// contact that declares its actuator, extracts the nets of the built
// conductive bodies, and requires the named nets in one piece; then it
// removes the cut body, extracts again and requires them apart.
//
// Joined without the cut fails naming the bodies that still join them.
// Apart with the cut in place fails as a vacuous assertion: the cut joins
// nothing, so removing it proves nothing.

import type { Assertion, Finding, TargetOf } from "@hackbuild/spec";
import { apartExcept } from "@hackbuild/circuit";
import type { RegistryCtx } from "../views.js";
import { NO_MESH, viewsOf } from "../views.js";
import { boolFinding, skip } from "../defs/common.js";

type ApartExceptAssertion = Extract<Assertion, { readonly type: "apartExcept" }>;

const pairs = (ps: readonly (readonly [string, string])[]): string => ps.map(([a, b]) => `${a} and ${b}`).join(", ");

export async function runNet26(t: TargetOf<"net">, ctx: RegistryCtx): Promise<readonly Finding[]> {
  const { part, net } = t;
  const target = { level: "net", part: part.id, net: net.id } as const;
  const mine = part.assertions.filter((a): a is ApartExceptAssertion => a.type === "apartExcept" && a.nets[0] === net.id);
  if (mine.length === 0) return [skip(target, "not run", `net ${net.id} heads no apartExcept assertion`)];
  const mesh = viewsOf(ctx).mesh;
  if (mesh === undefined) return mine.map(() => skip(target, "not run", NO_MESH));
  const out: Finding[] = [];
  for (const a of mine) {
    const r = await apartExcept({ part, mesh, profile: ctx.profile, nets: a.nets, cut: a.cut });
    const named = a.nets.join(" and ");
    const pressed = r.presses.length === 0 ? "no contact declares its actuator, so nothing is pressed" : `${r.presses.map((p) => `${p.body} pressed ${p.travelMm} mm`).join(", ")}`;
    const extra = {
      nets: a.nets.join(" "), cut: a.cut, pressed: r.presses.map((p) => p.contact).join(" "),
      unpressed: r.unpressed.map((u) => u.contact).join(" "),
      joinedActuated: r.joined ? "yes" : "no", apartWithoutCut: r.apart ? "yes" : "no",
      joiningBodies: r.withoutCut.joiningBodies.map((p) => p.join("+")).join(" "),
      touchMm: r.touch.mm,
    };
    if (!r.apart) {
      const by = r.withoutCut.joiningBodies.length > 0 ? pairs(r.withoutCut.joiningBodies) : r.withoutCut.pieceBodies.join(", ");
      out.push(boolFinding(target, false, `${named} stay joined with ${a.cut} removed (${pressed}): ${by} still join them; they may share only ${a.cut}, part the other path`, extra));
    } else if (!r.joined) {
      out.push(boolFinding(target, false, `${named} are apart while actuated with ${a.cut} in place (${pressed}): the assertion is vacuous, ${a.cut} joins nothing; check the press travel or the cut body`, extra));
    } else {
      out.push(boolFinding(target, true, `${named} join through ${a.cut} when actuated (${pressed}) and fall apart without it; touch at most ${r.touch.mm.toFixed(6)} mm (${r.touch.tier})`, extra));
    }
  }
  return out;
}
