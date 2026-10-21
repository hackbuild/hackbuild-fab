import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"adopt"> = {
  name: "adopt",
  group: "make",
  description: [
    "Lift an hbf draft, a DRAFT page or its directory, into designs/<name> on branch hbf/<name>.",
    "chase.validate runs first and an error refuses with nothing written; then chase.scaffold from draft:, chase.patch to the state the page opens with, widget.ts to widgets/.",
    "part.build, check.run and chase.bake run as on any design, so a failing check still blocks its export at the gate.",
    "The draft's export is stored as expected/draft-export.3mf with its sha256; a geometry diff against the adopted build is listed for a person.",
    "slice runs tools/slice/slice.mjs when the slicer is present, else not run. Files are staged, never committed. CLI only.",
    "Do not use it on an old bench; the designs area ports those.",
  ].join(" "),
  input: inputOf<"adopt">(z.object({
    draft: z.string().min(1).describe("a DRAFT page .html or a draft directory holding draft.json"),
    name: z.string().min(1).exactOptional().describe("lowercase slug; becomes meta.id, designs/<name> and hbf/<name>; absent, the draft's meta.id"),
    export: z.string().min(1).exactOptional().describe("a DRAFT_ 3mf the page wrote, stored as the golden; absent, the page's export is computed from the draft"),
    slice: z.boolean().exactOptional().describe("slice the adopted 3mf through tools/slice/slice.mjs; absent, the slice is not run"),
  }).strict()),
  output: outputOf<"adopt">(),
  examples: [
    { input: { draft: ".hbf/drafts/access-switch/access-switch.html" }, note: "the access switch draft lifted into designs/access-switch on hbf/access-switch" },
  ],
  writes: "branch",
  longRunning: true,
  cli: {
    target: "draft",
    flags: { draft: { field: "draft", kind: "string" }, name: { field: "name", kind: "string" }, export: { field: "export", kind: "string" }, slice: { field: "slice", kind: "switch" } },
    transport: ["out"],
  },
};
