// core/test/fixtures/sandbox/fs-write/build.ts: imports node:fs statically to write a file.

import { defineBuild } from "@hackbuild/spec";
import { writeFileSync } from "node:fs";
import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  writeFileSync("pwned.txt", "x");
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
