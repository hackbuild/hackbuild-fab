import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"part.inspect"> = {
  name: "part.inspect",
  group: "build",
  description: [
    "Read a stored build: bodies with slot, material, role, volume in mm3, bounding box in mm and meshHash, plus features, frame, metrics and warnings.",
    "The part is an hbf://build/<buildHash> uri part.build printed, or a design directory, which builds first.",
    "An unknown or collected uri returns E_HANDLE naming the chase to rebuild.",
    "Do not use it to prove anything; part.build and check.run return the findings.",
  ].join(" "),
  input: inputOf<"part.inspect">(z.object({ part: z.string().min(1).describe("hbf://build/<buildHash> or a design directory") }).strict()),
  output: outputOf<"part.inspect">(),
  examples: [{ input: { part: "reference/keys/flex-pair" }, note: "build the flex pair and list its bodies" }],
  writes: "nothing",
  cli: { target: "part", flags: {}, transport: [] },
};
