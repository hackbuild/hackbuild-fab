// reference/seats/rp2040-zero-pressfit/build.ts
// One RP2040-Zero press seat from the archetype (Author.arch) on a PETG
// body with the PIP buried stack. The archetype sits on the stack floor
// face at the board centre and reports the cable edge (metric
// seat.cableEdge); the body's +y edge stands there and the body rises to
// the chosen top. Each bump stands on a routed terminal (post and two layer
// discs), so every used castellation is one net piece. Conditionals live
// here (D-178).

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "rp2040-zero-seat";

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const floor = c("stack.skin") + c("stack.trace") + c("stack.iso") + c("stack.trace") + c("stack.overL2");
  const out = k.arch(ID, { origin: [0, 0, floor], normal: [0, 0, 1], u: [1, 0, 0] }, { top: p.top });
  const edge = out.metrics?.find((m) => m.id === `${ID}.0.seat.cableEdge`)?.value;
  if (typeof edge !== "number") throw new Error("rp2040-zero-seat reported no seat.cableEdge");
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [[[-p.W / 2, edge - p.H], [p.W / 2, edge - p.H], [p.W / 2, edge], [-p.W / 2, edge]]], z: [0, p.top] } });
  return k.part({
    id: "body", name: "RP2040-ZERO PRESS SEAT", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...out.bodies],
    features: [...out.features],
    metrics: out.metrics ?? [],
    assertions: [],
  });
});
