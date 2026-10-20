import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"chase.bake"> = {
  name: "chase.bake",
  group: "make",
  description: [
    "Bake a design to one offline html page and return its file, bytes and sha256.",
    "It writes bake.json, bench.entry.ts and page-build.ts beside chase.ts where absent, generated from the chase, then runs tools/bake/bake.mjs; an existing bake.json is used as it stands.",
    "A page over 16777216 bytes or one that requests a file off the page fails with E_KERNEL; the same inputs give the same sha256.",
    "The page is no fabrication export and passes no gate. Do not use it to check a design; part.build and check.run do that. mode draft waits on hbf draft.",
  ].join(" "),
  input: inputOf<"chase.bake">(z.object({
    chase,
    mode: z.enum(["page", "draft"]).exactOptional().describe("page bakes the release page; draft is refused until hbf draft lands"),
  }).strict()),
  output: outputOf<"chase.bake">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair" }, note: "the flex pair page from its committed bake.json" },
  ],
  writes: "branch",
  longRunning: true,
  cli: { target: "chase", flags: { chase: { field: "chase", kind: "string" }, mode: { field: "mode", kind: "string" } }, transport: ["out"] },
};
