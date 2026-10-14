// core/test/fixtures/sandbox/orphan-deaf/build.ts: as orphan/build.ts, but
// first removes the child's disconnect listeners, so only the reply guard
// stands between a closed channel and a send that errors on every retry.

import { defineBuild } from "@hackbuild/spec";

import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  process.removeAllListeners("disconnect");
  console.error("hbf-sandbox-started");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
