// CHK-ASM-06, whitelisted pair gets a clearance-through-travel check (OGEE
// R16-P 2026-08: the pin never engaged its yoke and the clash audit was
// blind, since a pin in a slot is supposed to touch and its pair is
// whitelisted; knowledge/kernels/verification.md "the holes in each kind of
// check"). Selected by joint kind prismatic or planar with a contact
// assertion over range on the same pair (D-177). The sim's closest
// approach over the range must stay at 0 or above (no interference) and at
// or under the real-gap ceiling of the pair's declared fit class, so a pin
// that never reaches its slot fails as surely as one that jams.

import type { Feature, FitDecl, Finding, JointDecl } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { fmt, intervalFinding, missing, skip } from "../common.js";
import { isSim, simOr } from "./sim.js";

const fitOf = (f: Feature | undefined): FitDecl | undefined => (f !== undefined && "fit" in f ? (f.fit as FitDecl | undefined) : undefined);

export const check = defineCheck({
  id: "CHK-ASM-06",
  level: "assembly",
  run: (t, ctx): readonly Finding[] => {
    const a = t.assembly;
    const sim = simOr(ctx, a);
    if (!isSim(sim)) return [sim];
    const contact = (j: JointDecl): boolean =>
      a.assertions.some((x) => x.type === "contact" && x.over === "range" && ((x.a === j.a && x.b === j.b) || (x.a === j.b && x.b === j.a)));
    const joints = a.joints.filter((j) => (j.kind === "prismatic" || j.kind === "planar") && contact(j));
    if (joints.length === 0) return [skip({ level: "assembly", assembly: a.id }, "not run", "no prismatic or planar joint with a contact assertion over range")];
    return joints.map((j) => {
      if (j.via === undefined) throw missing(`/joints/${j.id}/via`, `joint ${j.id} names no feature pair; a pin in a slot declares via`);
      const partOf = (inst: string) => a.parts.find((p) => p.id === a.instances.find((i) => i.id === inst)?.part);
      const fa = partOf(j.a)?.features.find((f) => f.id === j.via!.featureA);
      const fb = partOf(j.b)?.features.find((f) => f.id === j.via!.featureB);
      const fit = fitOf(fb) ?? fitOf(fa);
      if (fit === undefined) throw missing(`/joints/${j.id}/via`, `neither ${j.via.featureA} nor ${j.via.featureB} declares a fit; the clearance ceiling comes from the pair's fit class`);
      const band = ctx.profile.fit(fit.class);
      const ca = sim.closestApproach(j.a, j.b, "range");
      return intervalFinding(
        { level: "pair", a: { level: "assembly", assembly: a.id, part: j.a }, b: { level: "assembly", assembly: a.id, part: j.b }, at: ca.at },
        Number(ca.mm.toFixed(4)), 0, band.realHiPerSide, "mm",
        `a pin in its slot stays engaged through travel: closest approach 0 to the ${fit.class} real ceiling ${fmt(band.realHiPerSide)} mm per side`,
        { joint: j.id, state: ca.state },
      );
    });
  },
});
