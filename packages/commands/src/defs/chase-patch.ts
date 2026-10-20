import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

const edit = z.union([
  z.object({ anchor: z.string().min(1).describe("text that must match exactly once"), replace: z.string() }).strict(),
  z.object({ pointer: z.string().describe("json pointer into the chase value, /- appends to an array"), set: z.unknown() }).strict(),
  z.object({ replaceWhole: z.string(), ifDefHash: z.string().min(1).describe("the design's defHash when you read build.ts") }).strict(),
  z.object({
    param: z.string().min(1), set: z.union([z.number(), z.string(), z.boolean()]),
    in: z.union([z.literal("default"), z.object({ preset: z.string().min(1) }).strict()]).exactOptional(),
  }).strict(),
]);

export const spec: CommandSpec<"chase.patch"> = {
  name: "chase.patch",
  group: "author",
  description: [
    "Edit a design's chase.ts on branch hbf/<chase> and stage it: an anchor edit replaces text that must match exactly once (E_STALE naming the match count and lines), a pointer edit sets the literal a json pointer names (E_REF with the nearest pointers otherwise) and leaves every other byte unchanged.",
    "build.ts takes one replaceWhole edit guarded by ifDefHash. A patch that adds a chase.validate error writes nothing; each write appends its edits and inverse to .hbf/patches.jsonl.",
    "Do not use it on reference/ or to commit; it writes designs/<name> only and never commits. Param edits are E_SCHEMA for now; write them as pointers.",
  ].join(" "),
  input: inputOf<"chase.patch">(z.object({
    file: z.string().min(1).describe("designs/<name>/chase.ts, designs/<name>/build.ts, or the design directory"),
    edits: z.array(edit).min(1).describe("edits applied in order; one failing edit writes nothing"),
  }).strict()),
  output: outputOf<"chase.patch">(),
  examples: [
    { input: { file: "designs/keys-flex-pair/chase.ts", edits: [{ pointer: "/params/1/fields/0/item/3/default", set: 1.44 }] }, note: "set the flex-pair travel default to 1.44 mm on hbf/keys-flex-pair" },
  ],
  writes: "branch",
  cli: {
    target: "file",
    flags: {
      edits: { field: "edits", kind: "json" },
      anchor: { field: "edits", kind: "edit" }, replace: { field: "edits", kind: "edit" },
      pointer: { field: "edits", kind: "edit" }, set: { field: "edits", kind: "edit" },
    },
    transport: [],
  },
};
