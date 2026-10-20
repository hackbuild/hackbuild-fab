// The M07 commands (M07-T14). nest.pack and export.run take the CLI-only
// --scene until M10, as the M02 sim commands do; motion.run takes each
// program argument as its own flag, --k 3, gathered into args.

import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"motion.run"> = {
  name: "motion.run",
  group: "prove",
  description: [
    "Run a motion program by id and return each committed state, the end hash and, on a latch machine, the latched cells; a planner program returns the planned path, duration and the ceiling that binds.",
    "The commit is decided at the op by the kinematics, never by which frames render (CHK-MOT-06); program args are flags, for example --k 3 for slug.vend.",
    "expect declares the latched set (all, none, checker or cells i,j): verdict fail with exit 1 when measured differs; audit runs CHK-MOT-04, 05 and 06 on the machine.",
    "Do not use it for physics or trials; sim.run runs those.",
  ].join(" "),
  input: (host) => inputOf<"motion.run">(z.object({
    program: z.string().min(1).describe(`program id: ${host.programIds.join(", ")}`),
    args: z.record(z.string(), z.number()).exactOptional().describe("program arguments by name, for example {\"k\": 3}; on the cli each is its own flag, --k 3"),
    expect: z.string().min(1).exactOptional().describe("declared latched set: all, none, a pattern the program names, or cells i,j joined by spaces"),
    audit: z.boolean().exactOptional().describe("also run CHK-MOT-04, 05 and 06 on the program's machine"),
  }).strict()),
  output: outputOf<"motion.run">(),
  examples: [
    { input: { program: "ogee.checker", expect: "checker" }, note: "the ogee r16 checker latches its 8 cells" },
    { input: { program: "slug.vend", args: { k: 3 } }, note: "three slug vends with the residual carried, 12227 half steps" },
  ],
  writes: "nothing",
  cli: {
    target: "program",
    flags: {
      program: { field: "program", kind: "string" }, args: { field: "args", kind: "json" }, expect: { field: "expect", kind: "string" },
      audit: { field: "audit", kind: "switch" },
    },
    transport: [],
    targetOptional: true,
    rest: "args",
  },
};
