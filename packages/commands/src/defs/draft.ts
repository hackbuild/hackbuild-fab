import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"draft"> = {
  name: "draft",
  group: "make",
  description: [
    "Write a draft at <cwd>/<name> or --dir and bake its DRAFT page in one turn, copied from the from reference or design, or from the reference the goal words match best (result.match names it and why; no match is E_REF naming the closest).",
    "The page carries its sources, shows checks as warnings and a draft banner, and marks every export DRAFT.",
    "export.run refuses a draft with E_DRAFT; hbf adopt lifts it into a design. Use it to get a first idea in front of a maker. Do not use it to start a design you will export; chase.scaffold does that. CLI only.",
  ].join(" "),
  input: inputOf<"draft">(z.object({
    goal: z.string().min(1).describe("what the draft is for, in words; names the draft when name is absent"),
    from: z.string().min(1).exactOptional().describe("a reference or design id, or reference:<area>/<id>, design:<id> or draft:<dir>"),
    name: z.string().min(1).exactOptional().describe("lowercase slug; becomes meta.id and the folder name"),
    dir: z.string().min(1).exactOptional().describe("the folder to write, relative to the cwd; absent, <cwd>/<name>"),
  }).strict()),
  output: outputOf<"draft">(),
  examples: [
    { input: { goal: "access switch", from: "click-spring-window" }, note: "a draft of the click spring window reference at <cwd>/access-switch" },
    { input: { goal: "big round switch on a 3.5 mm jack" }, note: "routed to reference/keys/access-switch by its readme; the draft lands at <cwd>/big-round-switch-on-a-3-5-mm-jack" },
  ],
  writes: "branch",
  longRunning: true,
  cli: {
    target: "goal",
    flags: { goal: { field: "goal", kind: "string" }, from: { field: "from", kind: "string" }, name: { field: "name", kind: "string" }, dir: { field: "dir", kind: "string" } },
    transport: ["out"],
  },
};
