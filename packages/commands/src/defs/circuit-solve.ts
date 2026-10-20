import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"circuit.solve"> = {
  name: "circuit.solve",
  group: "prove",
  description: [
    "Extract the nets of a build from its conductive bodies, solve every chase hookup entry by its read model, and classify each receiving pin LOW, UNDEFINED or HIGH against its catalog pin row at both ends of the pullup range.",
    "Returns nets, operating points and read outputs (tau, settle, wait, reject); CHK-NET-05 and CHK-NET-06 travel in findings, and a pullup read that does not read LOW fails with exit 1.",
    "mcu replaces every entry's mcu, engine spice solves the pressed dividers with ngspice loaded on demand, pullup min or max classifies one end.",
    "Do not use it to check geometry; check.run and part.build run those checks.",
  ].join(" "),
  input: inputOf<"circuit.solve">(z.object({
    build: z.string().min(1).describe("design or reference directory, chase id, or hbf://build/<buildHash>"),
    stimulus: z.record(z.string(), z.union([z.boolean(), z.number()])).exactOptional()
      .describe("ports to solve, each true for a held key; absent solves every hookup entry"),
    mcu: z.string().min(1).exactOptional().describe("catalog pin row id for every entry, for example rp2040; the entry's own mcu when absent"),
    engine: z.enum(["analytic", "spice"]).exactOptional().describe("analytic when absent; spice loads eecircuit-engine on demand"),
    pullup: z.enum(["range", "min", "max"]).exactOptional().describe("pullup ends to classify at; both ends of the range when absent"),
  }).strict()),
  output: outputOf<"circuit.solve">(),
  examples: [
    { input: { build: "reference/keys/flex-pair" }, note: "the flex pair's nets and the charge-release read of each key" },
    { input: { build: "reference/keys/flex-pair", mcu: "esp32-c3", engine: "analytic" }, note: "the same pins classified against the esp32-c3 row" },
  ],
  writes: "nothing",
  cli: {
    target: "build",
    flags: {
      engine: { field: "engine", kind: "string" }, mcu: { field: "mcu", kind: "string" }, pullup: { field: "pullup", kind: "string" },
      stimulus: { field: "stimulus", kind: "json" },
    },
    transport: [],
  },
};
