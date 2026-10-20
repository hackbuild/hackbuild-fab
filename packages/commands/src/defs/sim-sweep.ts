import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { build, example, inputOf, outputOf, scene } from "../shared.js";

export const spec: CommandSpec<"sim.sweep"> = {
  name: "sim.sweep",
  group: "prove",
  description: [
    "Sweep a scene through its motion in mode pose, rotate, prismatic or insert and return clashes, sweptHash and the closest approach of every moving body in mm with where it occurs.",
    "Pose mode adds the real fails outside the declared masks; insert mode adds each hook case with INSERTS or TRAPPED.",
    "Verdict fail with exit 1 when measured differs from what the scene declares.",
    "Do not use it for trials over seeds; sim.run runs those.",
  ].join(" "),
  input: inputOf<"sim.sweep">(z.object({
    build: build.exactOptional(),
    scene: scene.exactOptional(),
    joint: z.string().min(1).exactOptional().describe("lands with chase sim declarations; a scene names its own motion"),
    mode: z.enum(["pose", "rotate", "prismatic", "insert"]).exactOptional().describe("cli only until M10: the scene's sweep mode"),
    steps: z.number().int().min(2).exactOptional().describe("rotate only: placements over the motion, count; profile ogee16.sweepSteps when absent"),
  }).strict()),
  output: outputOf<"sim.sweep">(),
  examples: [
    { input: example<"sim.sweep">({ scene: "ogee16-cranks", mode: "rotate" }), note: "the nine ogee16 cranks against the servos and rest parts" },
    { input: example<"sim.sweep">({ scene: "cotter-hook", mode: "insert" }), note: "the cotter hook insertion search over eight boards" },
  ],
  writes: "nothing",
  longRunning: true,
  cli: {
    target: "build",
    flags: { build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, joint: { field: "joint", kind: "string" }, mode: { field: "mode", kind: "string" }, steps: { field: "steps", kind: "json" } },
    transport: [],
    targetOptional: true,
  },
};
