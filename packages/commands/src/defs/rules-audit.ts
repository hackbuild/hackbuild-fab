import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"rules.audit"> = {
  name: "rules.audit",
  group: "prove",
  description: [
    "Run every registered project, source and artifact check over the workspace: the files git lists (legacy trees and check fixtures left out), the 3mf packages in the store and the project graph.",
    "Each finding carries measured, legal, constraint and origin; a check whose kernel or target lands later returns skip naming the milestone, as CHK-MOT-03 does until the motion kernel registers.",
    "chase narrows the sources to that design's directory and the artifacts to those that state it; the result lists the stale items of project.graph as information.",
    "Verdict fail with exit 1 on any block fail. Do not use it on one build; check.run and part.build run the part checks.",
  ].join(" "),
  input: inputOf<"rules.audit">(z.object({
    chase: z.string().min(1).exactOptional().describe("design directory or chase meta.id; absent audits the whole workspace"),
  }).strict()),
  // The spec output (simHash, firmwareHash, equal) is CHK-MOT-03's extra from M07 on (M04-T13 step 2); the result is the audit.
  output: outputOf<"rules.audit">(),
  examples: [
    { input: {}, note: "every project, source and artifact check over the workspace" },
    { input: { chase: "reference/keys/flex-pair" }, note: "the flex pair's sources and the stored 3mf packages that state its chase" },
  ],
  writes: "nothing",
  longRunning: true,
  cli: { target: "chase", flags: { chase: { field: "chase", kind: "string" } }, transport: [], targetOptional: true },
};
