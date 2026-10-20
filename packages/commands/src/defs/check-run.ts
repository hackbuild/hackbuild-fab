import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { example, inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"check.run"> = {
  name: "check.run",
  group: "prove",
  description: [
    "Run checks on a build: CHK-PRT-01, CHK-PRT-03 and CHK-3MF-04 on the part ir plus the registered checks, or on an exported 3mf given with --artifact.",
    "only narrows the run to listed check ids; each finding carries measured, legal, constraint, origin and a one-param fix where one exists.",
    "The report is stored under hbf://report/<reportHash>.",
    "Do not use it after part.build to see the same findings again; part.build already returns them.",
  ].join(" "),
  input: inputOf<"check.run">(z.object({
    build: z.string().min(1).exactOptional().describe("hbf://build/<buildHash> or a design directory; absent with scene"),
    scene: z.string().min(1).exactOptional().describe("cli only until M10: a registered audit scene, for example ogee16-printed (M04-T11)"),
    only: z.array(z.string().min(1)).exactOptional().describe("check ids to run, for example CHK-PRT-01"),
    cursor: z.string().exactOptional().describe("continues a truncated report page"),
  }).strict()),
  output: outputOf<"check.run">(),
  examples: [
    { input: { build: "reference/keys/flex-pair" }, note: "every check on the flex pair and its in-memory 3mf" },
    { input: { build: "reference/keys/flex-pair", only: ["CHK-PRT-01", "CHK-PRT-03"] }, note: "topology and overlap only" },
    { input: example<"check.run">({ scene: "ogee16-printed", only: ["CHK-ASM-11"] }), note: "the ogee r16-p printed interference audit at its 4 poses, cli only until M10" },
  ],
  writes: "nothing",
  cli: { target: "build", flags: { only: { field: "only", kind: "list" }, cursor: { field: "cursor", kind: "string" }, scene: { field: "scene", kind: "string" } }, transport: ["artifact"], targetOptional: true },
};
