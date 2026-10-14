// core/test/fixtures/prt03-crossings/build.ts: the pad and the turned tower,
// corners on the 1/1024 mm grid.

import { defineBuild, type Vec2 } from "@hackbuild/spec";
import { chase } from "./chase";

const g = (v: number): number => Math.round(v * 1024) / 1024;
const turned: Vec2[] = [0, 1, 2, 3].map((k) => [g(10 + 12.5 * Math.cos(0.3 + (k * Math.PI) / 2)), g(10 + 12.5 * Math.sin(0.3 + (k * Math.PI) / 2))]);

export const build = defineBuild(chase, (p, k) => k.part({
  id: "body", name: "CROSSINGS", process: "fdm", machine: "ffc5p",
  frame: { originOnAxis: false, carriesOffset: true, pose: "print" },
  bodies: [
    k.body("pad", { role: "body", slot: 1, base: { route: "prism", outline: [[[0, 0], [20, 0], [20, 20], [0, 20]]], z: [0, 2] } }),
    k.body("tower", { role: "body", slot: 1, base: { route: "prism", outline: [turned], z: [2, p.H] } }),
  ],
  features: [],
}));
