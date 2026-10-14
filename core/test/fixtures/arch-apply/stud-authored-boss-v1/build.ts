// core/test/fixtures/arch-apply/stud-authored-boss-v1/build.ts: the same prism
// with blocks-stud placed on body.top through Author.arch at standard boss-v1.

import { defineBuild } from "@hackbuild/spec";
import { chase } from "./chase";

export const build = defineBuild(chase, (p, k) => {
  const host = k.part({
    id: "body", name: "PRISM", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("body", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.W, p.D, 0)], z: [0, p.H] } })],
    features: [],
    faces: [k.face("body.top", { origin: [0, 0, p.H], normal: [0, 0, 1], u: [1, 0, 0] })],
  });
  const out = k.arch("blocks-stud", { ref: "body.top", uv: [0, 0], rotDeg: 0 }, { standard: "boss-v1" }, host);
  return { ...host, bodies: [...host.bodies, ...out.bodies], features: [...host.features, ...out.features], metrics: out.metrics ?? [] };
});
