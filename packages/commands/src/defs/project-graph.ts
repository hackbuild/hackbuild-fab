import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { example, inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"project.graph"> = {
  name: "project.graph",
  group: "look",
  description: [
    "List the project's items (chase, build.ts, params, profile rows, check versions, feature kinds, builds, meshes, reports, legacy files, oracle records, goldens) and the links each was made from, with the hash its source had at the time.",
    "An item is stale when a source hash it linked has moved, or an item it was made from is stale; because is the path of links to what changed.",
    "stale lists only stale items and from lists only the items downstream of one item id; staleness is information, exit 0.",
    "Do not use it to rebuild; part.build and check.run rebuild an item, and the graph then shows it fresh.",
  ].join(" "),
  input: inputOf<"project.graph">(z.object({
    project: z.string().min(1).exactOptional().describe("workspace directory; absent is the workspace hbf runs in"),
    stale: z.boolean().exactOptional().describe("cli only: list only stale items"),
    from: z.string().min(1).exactOptional().describe("cli only: list only the items downstream of this item id, for example profileRow:fit/SLIDE"),
  }).strict()),
  output: outputOf<"project.graph">(),
  examples: [
    { input: example<"project.graph">({ stale: true }), note: "every stale item with the path of links to what changed" },
    { input: example<"project.graph">({ from: "profileRow:fit/SLIDE" }), note: "every item made from the SLIDE fit band row" },
  ],
  writes: "nothing",
  cli: {
    target: "project",
    flags: { stale: { field: "stale", kind: "switch" }, from: { field: "from", kind: "string" } },
    transport: [],
    targetOptional: true,
  },
};
