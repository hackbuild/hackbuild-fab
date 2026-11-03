import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"slice"> = {
  name: "slice",
  group: "make",
  description: [
    "Slice a 3mf or a design headless with an Orca-family slicer (Flash Studio by default) through tools/slice/slice.mjs and return the status, the G-code hash and the SLC profile check rows.",
    "A design target is built at its preset, checked and written in process; a build that fails a check is not sliced.",
    "The G-code is a virtual print in a temporary folder, computed, never sent to a printer; print summarizes it (layers, slicer time, grams per slot, tool changes, unsupported regions), and the command never opens the export gate; a missing slicer returns status not run.",
    "Do not use it to approve a print or to export a fabrication file; export.run does that behind the gate.",
  ].join(" "),
  input: inputOf<"slice">(z.object({
    target: z.string().min(1).describe("a .3mf file, or a design or reference directory"),
    preset: z.string().min(1).exactOptional().describe("preset of a design target; absent, the build defaults"),
    slicer: z.string().min(1).exactOptional().describe("flash-studio (default), orcaslicer, bambu-studio or snapmaker-orca"),
    timeLimitS: z.number().positive().max(3600).exactOptional().describe("kill the slicer after this many seconds; absent, 600"),
    analyze: z.boolean().exactOptional().describe("read layers, slicer time, grams per slot and unsupported regions from the G-code (computed); absent, true"),
  }).strict()),
  output: outputOf<"slice">(),
  examples: [{ input: { target: "reference/keys/flex-pair", preset: "two" }, note: "the flex pair at preset two, sliced headless" }],
  writes: "nothing",
  longRunning: true,
  cli: { target: "target", flags: { preset: { field: "preset", kind: "string" }, slicer: { field: "slicer", kind: "string" } }, transport: [] },
};
