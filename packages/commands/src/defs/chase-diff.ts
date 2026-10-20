import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"chase.diff"> = {
  name: "chase.diff",
  group: "author",
  description: [
    "Compare a design's chase with another chase.ts or a git ref (HEAD when against is absent): both are read as data and migrated, and each changed value is listed by JSON pointer as added, removed or changed with from and to, beside the migration lines of each side and defHash before and after.",
    "With build true both sides build at their defaults and verdictChanges lists each check whose verdict moved, with measured before and after; otherwise it is null.",
    "Do not use it to edit or to validate; chase.patch and chase.validate do that. It writes nothing.",
  ].join(" "),
  input: inputOf<"chase.diff">(z.object({
    chase,
    against: z.string().min(1).describe("a chase.ts path, the directory holding one, or a git ref such as HEAD~1").exactOptional(),
    build: z.boolean().describe("build both sides and list verdict changes").exactOptional(),
  }).strict()),
  output: outputOf<"chase.diff">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair", against: "HEAD" }, note: "the flex pair against the last commit; an unchanged chase lists no changes" },
    { input: { chase: "reference/keys/flex-pair", against: "HEAD~1", build: true }, note: "also build both and list the checks whose verdict moved" },
  ],
  writes: "nothing",
  cli: {
    target: "chase",
    flags: { chase: { field: "chase", kind: "string" }, against: { field: "against", kind: "string" }, build: { field: "build", kind: "switch" } },
    transport: [],
  },
};
