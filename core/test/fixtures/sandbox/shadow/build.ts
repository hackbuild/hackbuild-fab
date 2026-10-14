// core/test/fixtures/sandbox/shadow/build.ts: imports @hackbuild/spec, which
// the test shadows with a node_modules/@hackbuild/spec symlink in this
// directory pointing at another package of the workspace node_modules. The
// allowlisted name must resolve inside its own workspace package.

import { defineBuild } from "@hackbuild/spec";

import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => k.part({
  id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
  frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
  bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
  features: [],
}));
