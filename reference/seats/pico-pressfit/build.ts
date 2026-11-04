// reference/seats/pico-pressfit/build.ts
// One Pico press seat from the archetype (Author.arch) on a PETG body with
// the PIP buried stack. The archetype sits on the stack floor face at the
// board centre and reports the cable edge (seat.cableEdge) and the host top
// it used (host.top); the body's +y edge stands on the first and the body
// rises to the second. Each bump stands on a routed terminal, so every used
// castellation is one net piece. Author.arch passes the seat's warnings on.
// Conditionals live here (D-178).

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

const ID = "pico-seat";

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const floor = c("stack.skin") + c("stack.trace") + c("stack.iso") + c("stack.trace") + c("stack.overL2");
  const out = k.arch(ID, { origin: [0, 0, floor], normal: [0, 0, 1], u: [1, 0, 0] }, { top: p.top });
  const metric = (name: string): number => {
    const v = out.metrics?.find((m) => m.id === `${ID}.0.${name}`)?.value;
    if (typeof v !== "number") throw new Error(`pico-seat reported no ${name}`);
    return v;
  };
  const edge = metric("seat.cableEdge"), top = metric("host.top");
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [[[-p.W / 2, edge - p.H], [p.W / 2, edge - p.H], [p.W / 2, edge], [-p.W / 2, edge]]], z: [0, top] } });
  return k.part({
    id: "body", name: "PICO PRESS SEAT", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body, ...out.bodies],
    features: [...out.features],
    metrics: out.metrics ?? [],
    assertions: [],
  });
});
