import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"chase.validate"> = {
  name: "chase.validate",
  group: "author",
  description: [
    "Read a chase.ts and the bench.ts beside it as data and validate them: migration, the derived schema, the param rules, registry references with didYouMean, the build function and the kind rules.",
    "Each error carries code, JSON pointer and record and exits 2; the result lists typed questions, each a rule id such as Q-TIER or Q-STACK, a pointer and the default in force, which never fail validation.",
    "resolvedChecks lists the registered check ids the chase names.",
    "Do not use it to build or to check geometry; part.build and check.run do that.",
  ].join(" "),
  input: inputOf<"chase.validate">(z.object({ chase }).strict()),
  output: outputOf<"chase.validate">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair" }, note: "the flex pair, with one Q-TIER question per conducting slot" },
  ],
  writes: "nothing",
  cli: { target: "chase", flags: { chase: { field: "chase", kind: "string" } }, transport: [] },
};
