// core/test/fixtures/arch-apply/authored/build.ts: the host build with flex-cone-key placed on body.floor through Author.arch.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const c = (id: string): number => k.profile.constant(id).value;
  const floor = c("stack.skin") + c("stack.trace") + c("stack.iso") + c("stack.trace") + c("stack.overL2");
  const face = k.face("body.floor", { origin: [0, 0, floor], normal: [0, 0, 1], u: [1, 0, 0] });
  const body = k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.W, p.W, 3)], z: [0, p.H] } });
  const host = k.part({
    id: "body", name: "HOST", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [body], features: [], faces: [face],
  });
  const out = k.arch("flex-cone-key", { ref: "body.floor", uv: [0, 0], rotDeg: 0 }, { top: p.H }, host);
  return { ...host, bodies: [...host.bodies, ...out.bodies], features: [...host.features, ...out.features], metrics: out.metrics ?? [] };
});
