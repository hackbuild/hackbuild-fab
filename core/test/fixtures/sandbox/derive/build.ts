// core/test/fixtures/sandbox/derive/build.ts: the plate thickness through k.derive; mode "undeclared" names an id the chase does not declare, mode "fit" asks for the dropped fit class PSLIDE.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  if (p.mode === "fit") k.fit("PSLIDE");
  const id = p.mode === "undeclared" ? "plateThicknes" : "plateThickness";
  const T = k.derive(id, 2 + p.w / 20, "two mm plus one twentieth of the width", ["/plate/w"]);
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, T] } })],
    features: [],
  });
});
