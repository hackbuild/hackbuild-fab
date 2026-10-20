import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, commonFlags, inputOf, outputOf, params, preset } from "../shared.js";

export const spec: CommandSpec<"constraints.query"> = {
  name: "constraints.query",
  group: "query",
  description: [
    "Ask what a dimension may be before building: returns the legal interval, every floor and ceiling with its kernel, reason and qualifier, and which bounds bind.",
    "Give a dim with material and facts for the raw query, or a chase with no dim to get the legal range of every param that declares a constraintDim, read from the built part.",
    "An empty interval is the answer, verdict fail with E_UNSAT naming the fact that moves the binding floor and the value that fits.",
    "Do not use it to check a built part; part.build returns the findings.",
  ].join(" "),
  input: inputOf<"constraints.query">(z.object({
    dim: z.string().regex(/^[^.\s]+\.[^\s]+$/).exactOptional().describe("<kind or role>.<field>, for example conductor.width; absent queries the chase params"),
    pointers: z.array(z.string().regex(/^\//)).exactOptional().describe("param form: json pointers into the chase params, for example /w; absent answers every param with a constraintDim"),
    params: params.exactOptional(),
    preset: preset.exactOptional(),
    chase: chase.exactOptional(),
    feature: z.string().min(1).exactOptional().describe("feature id of the built chase the dim form reads"),
    material: z.string().min(1).exactOptional().describe("profile material id; absent takes the feature's body material from the chase"),
    machine: z.string().min(1).exactOptional().describe("profile machine id; absent takes the part's machine, else ffc5p"),
    facts: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).exactOptional()
      .describe("declared facts by key, for example {\"pathMm\": 62, \"flexes\": true}; they override facts the chase declares"),
  }).strict()),
  output: outputOf<"constraints.query">(),
  examples: [
    {
      input: { dim: "conductor.width", material: "cpla-protopasta", facts: { pathMm: 62, tMm: 0.72, netBudgetOhm: 8000, flexes: true, pitchMm: 8, pitchClrMm: 1 } },
      note: "trace width under an 8000 ohm budget, golden 1 of reference/electrical/trace-width-budget",
    },
    { input: { chase: "reference/keys/flex-pair" }, note: "every flex pair param with a constraintDim" },
  ],
  writes: "nothing",
  cli: {
    target: "dim",
    flags: {
      ...commonFlags, material: { field: "material", kind: "string" }, machine: { field: "machine", kind: "string" },
      facts: { field: "facts", kind: "facts" }, chase: { field: "chase", kind: "string" }, feature: { field: "feature", kind: "string" },
      param: { field: "pointers", kind: "list" },
    },
    transport: [],
    targetOptional: true,
    repeat: ["param"],
  },
};
