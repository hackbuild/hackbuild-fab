import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { build, example, inputOf, outputOf, scene } from "../shared.js";

export const spec: CommandSpec<"sim.run"> = {
  name: "sim.run",
  group: "prove",
  description: [
    "Run a scene's trials, multi-trial by default, each from its own seed: returns runs, passes, the worst trial, per-trial rows and the Rapier snapshot hash or capsule end-state hash.",
    "A scene that declares an expectation gets verdict pass when measured equals declared and fail with exit 1 when not; one that declares nothing gets skip.",
    "Outcomes are computed when the command runs, never by a frame schedule.",
    "Do not use it to sweep a motion range; sim.sweep does.",
  ].join(" "),
  input: inputOf<"sim.run">(z.object({
    build: build.exactOptional(),
    scene: scene.exactOptional(),
    program: z.string().min(1).exactOptional().describe("a scene runs its own program; lands with chase sim declarations"),
    trials: z.number().int().min(1).exactOptional().describe("trials, count; the scene's default when absent"),
    seed: z.number().int().exactOptional().describe("first trial seed; trial i uses seed + i"),
  }).strict()),
  output: outputOf<"sim.run">(),
  examples: [
    { input: example<"sim.run">({ scene: "slug" }), note: "slug capsule machine, 8 trials of 16 vends against its declared 126 of 128" },
    { input: example<"sim.run">({ scene: "slug-vend1", trials: 2, seed: 5 }), note: "two single-vend trials from seed 5, nothing declared" },
  ],
  writes: "nothing",
  longRunning: true,
  cli: {
    target: "build",
    flags: { build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, program: { field: "program", kind: "string" }, trials: { field: "trials", kind: "json" }, seed: { field: "seed", kind: "json" } },
    transport: [],
    targetOptional: true,
  },
};
