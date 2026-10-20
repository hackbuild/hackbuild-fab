import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { example, inputOf, outputOf, scene } from "../shared.js";

export const spec: CommandSpec<"part.probe"> = {
  name: "part.probe",
  group: "build",
  description: [
    "Measure the closest approach in mm between two bodies of a scene at a named pose and return the point on each, the measure every proxy point of one body to every point of the other.",
    "When the two bodies are a declared pair it also returns their closest unmasked approach.",
    "It decides nothing: verdict skip and exit 0.",
    "Do not use it for a whole assembly; asm.solve reports every declared pair.",
  ].join(" "),
  input: inputOf<"part.probe">(z.object({
    part: z.string().min(1).exactOptional().describe("hbf://build/<buildHash>; no chase declares a sim scene before M10, so pass scene"),
    scene: scene.exactOptional(),
    a: z.string().min(1).exactOptional().describe("cli only until M10: a body name, or name@L for the left arm"),
    b: z.string().min(1).exactOptional().describe("cli only until M10: the second body"),
    pose: z.string().min(1).exactOptional().describe("cli only until M10: HANG, REACH, LIFT or TUCK; HANG when absent"),
  }).strict()),
  output: outputOf<"part.probe">(),
  examples: [{ input: example<"part.probe">({ scene: "davit-std-1in", a: "crank", b: "upper", pose: "HANG" }), note: "crank to upper arm at HANG, mm" }],
  writes: "nothing",
  cli: {
    target: "part",
    flags: { scene: { field: "scene", kind: "string" }, a: { field: "a", kind: "string" }, b: { field: "b", kind: "string" }, pose: { field: "pose", kind: "string" } },
    transport: [],
    targetOptional: true,
  },
};
