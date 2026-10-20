import { z } from "zod";
import { CHASE_KINDS } from "@hackbuild/spec";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"chase.scaffold"> = {
  name: "chase.scaffold",
  group: "author",
  description: [
    "Start a design at designs/<name> on branch hbf/<name> and stage its chase.ts, build.ts and bench.ts.",
    "Without from it writes the kind's minimal chase (single and composer: one PETG slot, one param group, a rail ending in print, 3mf for ffc5p) that validates with 0 errors.",
    "With from it copies that reference, design or draft, sets meta.id to the name and meta.derivedFrom to the source's golden buildHash, and moves a constraint-backed default inside the solver interval.",
    "Start from a reference when one covers the kind. Do not use it to edit a design; chase.patch does that. It never commits.",
  ].join(" "),
  input: inputOf<"chase.scaffold">(z.object({
    kind: z.enum(CHASE_KINDS).describe("single: one part or several printed together; composer: an assembly of parts with poses; surface, board, machine and catalog scaffold only from a source"),
    name: z.string().min(1).describe("lowercase slug; becomes meta.id, designs/<name> and branch hbf/<name>"),
    from: z.string().min(1).exactOptional().describe("reference:<area>/<id>, reference:<meta.id>, design:<id> or draft:<dir>"),
  }).strict()),
  output: outputOf<"chase.scaffold">(),
  examples: [
    { input: { kind: "single", name: "pair-copy", from: "reference:keys/flex-pair" }, note: "copy the flex pair; derivedFrom carries its golden buildHash" },
    { input: { kind: "composer", name: "scratch-pad" }, note: "the minimal composer chase" },
  ],
  writes: "branch",
  cli: {
    target: "name",
    flags: { kind: { field: "kind", kind: "string" }, name: { field: "name", kind: "string" }, from: { field: "from", kind: "string" } },
    transport: [],
  },
};
