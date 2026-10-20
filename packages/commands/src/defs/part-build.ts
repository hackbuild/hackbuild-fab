import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, commonFlags, inputOf, outputOf, params, preset } from "../shared.js";

export const spec: CommandSpec<"part.build"> = {
  name: "part.build",
  group: "build",
  description: [
    "Build a design from its chase and build.ts, run every registered check on the result, and store the build under hbf://build/<buildHash>.",
    "Pass params as a json object over the defaults or a preset; a key starting with / sets one value by pointer, and a group id may wrap its fields.",
    "Returns the parts, metrics, warnings, the inferred profile rows that moved a verdict, and findings fail first.",
    "Pass import in place of chase to audit files another tool made: one part, one body per file, winding and signed volume checked, mesh checks run, feature checks skip.",
    "Do not use it to write a file; export.run writes the 3mf after a person approves at a terminal.",
  ].join(" "),
  input: inputOf<"part.build">(z.object({
    chase: chase.exactOptional(),
    import: z.array(z.object({
      path: z.string().min(1).describe("file relative to the workspace, or hbf://source/<sha256>"),
      format: z.enum(["stl", "glb", "step", "wrl", "scad"]),
      units: z.enum(["mm", "cm", "m", "in"]).exactOptional().describe("file length unit; absent is m for glb, mm for the rest"),
      as: z.enum(["body", "bought"]),
      material: z.string().min(1).exactOptional().describe("profile material id; absent imports geometry for audit only"),
    }).strict()).exactOptional()
      .describe("files to build as the bodies of one part for audit, in place of chase; stl, glb and scad (where openscad is on PATH)"),
    params: params.exactOptional(),
    preset: preset.exactOptional(),
    detail: z.enum(["summary", "full"]).exactOptional().describe("summary leaves ir null; full returns the part ir"),
    cursor: z.string().exactOptional().describe("continues a truncated findings page"),
  }).strict()),
  output: outputOf<"part.build">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair" }, note: "the m-s flex key pair at its defaults" },
    { input: { chase: "reference/keys/flex-pair", params: { "/keys/0/gap": 1.36 } }, note: "one pointer edit: the first key's cap gap, mm" },
    { input: { chase: "reference/exports/orca-3mf-roundtrip", detail: "full" }, note: "the collar coin reference with its part ir" },
    { input: { import: [{ path: "tools/corpus/import/lug.glb", format: "glb", units: "mm", as: "body" }] }, note: "audit the lug hat glb, authored in mm" },
  ],
  writes: "nothing",
  cli: {
    target: "chase",
    flags: { ...commonFlags, import: { field: "import", kind: "import" }, detail: { field: "detail", kind: "string" }, cursor: { field: "cursor", kind: "string" } },
    transport: [],
    targetOptional: true,
    repeat: ["import"],
  },
};
