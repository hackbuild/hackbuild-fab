// core/test/fixtures/sandbox/orphan/build.ts: says on stderr that it started,
// then waits 1500 ms before it returns, so the parent can close the IPC
// channel while the build is still running (a parent that died).

import { defineBuild } from "@hackbuild/spec";

import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  console.error("hbf-sandbox-started");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
