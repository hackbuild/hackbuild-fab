import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"draft"> = {
  name: "draft",
  group: "make",
  description: [
    "Write a draft at .hbf/drafts/<name> and bake its DRAFT page in one turn: chase.ts, build.ts and bench.ts copied from a reference or design, or the minimal single chase.",
    "The page carries its sources in an application/hbf-draft+json block, shows checks as warnings and a draft banner, and marks every export: DRAFT_ file names, 3MF metadata hbf:draft 1, a print card line.",
    "export.run refuses a draft with E_DRAFT; hbf adopt lifts it into a design. Use it to get a first idea in front of a maker. Do not use it to start a design you will export; chase.scaffold does that. CLI only.",
  ].join(" "),
  input: inputOf<"draft">(z.object({
    goal: z.string().min(1).describe("what the draft is for, in words; names the draft when name is absent"),
    from: z.string().min(1).exactOptional().describe("a reference or design id, or reference:<area>/<id>, design:<id> or draft:<dir>"),
    name: z.string().min(1).exactOptional().describe("lowercase slug; becomes meta.id and .hbf/drafts/<name>"),
  }).strict()),
  output: outputOf<"draft">(),
  examples: [
    { input: { goal: "access switch", from: "click-spring-window" }, note: "a draft of the click spring window reference at .hbf/drafts/access-switch" },
  ],
  writes: "branch",
  longRunning: true,
  cli: {
    target: "goal",
    flags: { goal: { field: "goal", kind: "string" }, from: { field: "from", kind: "string" }, name: { field: "name", kind: "string" } },
    transport: ["out"],
  },
};
