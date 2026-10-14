// reference/electrical/trace-width-budget/build.ts
// One printed trace on a PETG skin, on the M00 prism route. The build reads
// no constraint: the width it builds is the param, and constraints.query
// answers whether it is legal.
//
// A conductor is a region partitioned out of a host body at stage 5 (D-058),
// so the trace needs a host with volume left over (D-248): the skin, one
// body pathMm long and w wide from the bed to the trace top, as the PIP
// buried stack lays trace layer 1 on its skin (profile stack.skin,
// pip-controller layout.js line 168). The conductor is the top tMm of it,
// bound to /w, and names its own material, which constraints.query reads
// (featureMaterial, D-248).

import { defineBuild, type FaceFrame } from "@hackbuild/spec";
import { chase } from "./chase";

const top = (z: number): FaceFrame => ({ origin: [0, 0, z], normal: [0, 0, 1], u: [1, 0, 0] });

export const build = defineBuild(chase, (p, k) => {
  const skin = k.profile.constant("stack.skin").value;
  const outline = k.ring.roundRect(p.pathMm, p.w, 0);
  const host = k.body("skin", { role: "body", slot: 2, base: { route: "prism", outline: [outline], z: [0, skin + p.tMm] } });
  const trace = k.bind(
    { kind: "conductor" as const, id: "trace", body: "skin", material: "cpla-protopasta", net: "TRACE",
      region: { path: outline, face: top(skin) }, width: p.w, t: p.tMm },
    { width: "/w" },
  );
  return k.part({
    id: "trace", name: "TRACE WIDTH BUDGET", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: false, carriesOffset: false, pose: "print" },
    bodies: [host],
    features: [trace], metrics: [], assertions: [],
  });
});
