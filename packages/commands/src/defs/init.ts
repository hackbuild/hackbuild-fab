import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"init"> = {
  name: "init",
  group: "author",
  description: [
    "Start a maker folder outside the repository, <cwd>/<name> by default: chase.ts, build.ts and bench.ts copied from a design or reference as chase.scaffold copies them, a package.json pinning @hackbuild/kernel to this workspace, and <name>.html baked by chase.bake.",
    "It refuses a folder that holds files with E_EXISTS and a source with open chase.validate errors, and writes nothing then.",
    "Use it to start your own copy of a bench, like hbf init stick --from collar. Do not use it for a design in this repository; chase.scaffold does that. CLI only.",
  ].join(" "),
  input: inputOf<"init">(z.object({
    name: z.string().min(1).describe("lowercase slug; becomes meta.id, the folder name and <name>.html"),
    from: z.string().min(1).exactOptional().describe("a design or reference id, or reference:<area>/<id> or design:<id>; absent, the minimal single chase"),
    dir: z.string().min(1).exactOptional().describe("the folder to write, relative to the cwd; absent, <cwd>/<name>"),
  }).strict()),
  output: outputOf<"init">(),
  examples: [
    { input: { name: "stick", from: "collar" }, note: "a maker folder ./stick holding a copy of the collar coin and stick.html" },
  ],
  writes: "branch",
  longRunning: true,
  cli: {
    target: "name",
    flags: { name: { field: "name", kind: "string" }, from: { field: "from", kind: "string" }, dir: { field: "dir", kind: "string" } },
    transport: [],
  },
};
