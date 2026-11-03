import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"firmware.build"> = {
  name: "firmware.build",
  group: "make",
  description: [
    "Compile an Arduino sketch folder for a board with arduino-cli and return the status, the image hashes and the section sizes.",
    "The build lands in a temporary folder; nothing is uploaded or flashed, and the board core must already be installed (arduino-cli core install <vendor>:<arch>).",
    "Do not use it to flash a board; uploading firmware needs a person's confirm and is not part of this command.",
  ].join(" "),
  input: inputOf<"firmware.build">(z.object({
    sketch: z.string().min(1).describe("a sketch folder holding <folder name>.ino"),
    fqbn: z.string().regex(/^[\w.-]+:[\w.-]+:[\w.-]+(:.+)?$/).describe("fully qualified board name, for example rp2040:rp2040:rpipico"),
  }).strict()),
  output: outputOf<"firmware.build">(),
  examples: [{ input: { sketch: "tools/skeleton/flexpair_probe", fqbn: "rp2040:rp2040:rpipico" }, note: "the exit B probe for a Raspberry Pi Pico" }],
  writes: "nothing",
  longRunning: true,
  cli: { target: "sketch", flags: { fqbn: { field: "fqbn", kind: "string" } }, transport: [] },
};
