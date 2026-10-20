import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"catalog.pins"> = {
  name: "catalog.pins",
  group: "query",
  description: [
    "Return every pin of a catalog part with role, strapping and boot activity, plus the per-MCU threshold row and the provenance of each field read.",
    "Strapping and boot activity come from the MCU row the part names; pad centres come from the part's own land pattern.",
    "An unknown part is E_REF with up to three ids by edit distance.",
    "Do not use it to search; catalog.find lists rows by name.",
  ].join(" "),
  input: inputOf<"catalog.pins">(z.object({ part: z.string().min(1).describe("catalog row id, for example esp32c3-supermini") }).strict()),
  output: outputOf<"catalog.pins">(),
  examples: [{ input: { part: "esp32c3-supermini" }, note: "16 pins, GPIO21 boot activity U0TXD, tier vendor" }, { input: { part: "esp32-c3" }, note: "the D-076 threshold row with strapping and boot provenance" }],
  writes: "nothing",
  cli: { target: "part", flags: {}, transport: [] },
};
