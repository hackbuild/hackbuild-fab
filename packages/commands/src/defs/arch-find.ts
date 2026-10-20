import { z } from "zod";
import { PROCESSES } from "@hackbuild/spec";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"arch.find"> = {
  name: "arch.find",
  group: "query",
  description: [
    "Search the archetypes registry for a printed, copper or board circuit by what it senses, its family and the feature kinds it emits.",
    "Each hit gives status, read channels, senses, emits, read model, tier, the resistances computed at load from the profile rows with each row's tier, provenance, reference ids and original; proven entries come first.",
    "process keeps archetypes made by that process and channels keeps those that fit the read channels available.",
    "Do not use it to place one; arch.apply writes the placement on a branch.",
  ].join(" "),
  input: inputOf<"arch.find">(z.object({
    behaviour: z.string().min(1).describe("what it senses or emits, for example press, slide or touch"),
    process: z.enum(PROCESSES).exactOptional().describe("fdm keeps printed archetypes, vinyl and laser copper ones, pcb boards"),
    channels: z.number().int().nonnegative().exactOptional().describe("read channels available, count"),
  }).strict()),
  output: outputOf<"arch.find">(),
  examples: [{ input: { behaviour: "press", process: "fdm" }, note: "the printed keys and buttons" }],
  writes: "nothing",
  cli: {
    target: "behaviour",
    flags: { behaviour: { field: "behaviour", kind: "string" }, process: { field: "process", kind: "string" }, channels: { field: "channels", kind: "json" } },
    transport: [],
    targetOptional: true,
  },
};
