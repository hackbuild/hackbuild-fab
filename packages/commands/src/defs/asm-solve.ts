import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { build, example, inputOf, outputOf, scene } from "../shared.js";

export const spec: CommandSpec<"asm.solve"> = {
  name: "asm.solve",
  group: "build",
  description: [
    "Place a scene's bodies at one named pose and return each placement, the contacts outside the declared masks and the closest approach of every declared pair in mm with both points.",
    "For DAVIT, clamp joint=deg moves that joint on both arms toward deg and bisects 8 times on contact, as the bench slider did, and reports the clamped value.",
    "Verdict fail with exit 1 when any real fail remains.",
    "Do not use it to sweep poses; sim.sweep with mode pose does.",
  ].join(" "),
  input: inputOf<"asm.solve">(z.object({
    build: build.exactOptional(),
    scene: scene.exactOptional(),
    pose: z.string().min(1).exactOptional().describe("cli only until M10: HANG, REACH, LIFT or TUCK; HANG when absent"),
    clamp: z.string().regex(/^[a-z_]+=-?\d+(\.\d+)?$/).exactOptional().describe("cli only until M10: joint=deg, for example elbow=-110"),
  }).strict()),
  output: outputOf<"asm.solve">(),
  examples: [
    { input: example<"asm.solve">({ scene: "davit-std-1in", pose: "REACH" }), note: "both davit std arms at REACH on 1 in pipe" },
    { input: example<"asm.solve">({ scene: "davit-std-125in", pose: "HANG", clamp: "elbow=-110" }), note: "drive the elbow toward -110 deg and clamp on contact" },
  ],
  writes: "nothing",
  cli: {
    target: "build",
    flags: { build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, pose: { field: "pose", kind: "string" }, clamp: { field: "clamp", kind: "string" } },
    transport: [],
    targetOptional: true,
  },
};
