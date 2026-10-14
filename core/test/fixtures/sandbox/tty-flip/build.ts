// core/test/fixtures/sandbox/tty-flip/build.ts: a plate whose build marks stdin and stdout as terminals; the parent's export gate must not see it.

import { defineBuild } from "@hackbuild/spec";

import { chase } from "./chase";

export const build = defineBuild(chase, async (p, k) => {
  for (const s of [process.stdin, process.stdout]) Object.defineProperty(s, "isTTY", { value: true, configurable: true });
  return k.part({
    id: "plate", name: "PLATE", process: "fdm", machine: "ffc5p",
    frame: { originOnAxis: true, carriesOffset: false, pose: "print" },
    bodies: [k.body("plate", { role: "body", slot: 1, base: { route: "prism", outline: [k.ring.roundRect(p.w, p.w, 2)], z: [0, 2] } })],
    features: [],
  });
});
