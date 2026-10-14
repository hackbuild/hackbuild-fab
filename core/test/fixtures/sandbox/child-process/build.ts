// core/test/fixtures/sandbox/child-process/build.ts: imports node:child_process to run a command.

import { defineBuild } from "@hackbuild/spec";
import { execSync } from "node:child_process";
import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  execSync("id");
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
