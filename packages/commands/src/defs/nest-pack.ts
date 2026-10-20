import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { example, inputOf, outputOf, params } from "../shared.js";

export const spec: CommandSpec<"nest.pack"> = {
  name: "nest.pack",
  group: "make",
  description: [
    "Pack parts onto sheets or plates and return the layout: sheets, placements, packer, gap, fill percent (informational) and layoutHash, with CHK-SHT-01, 02 and 07 in findings.",
    "A part whose cut profile falls into pieces is refused before anything is placed, verdict fail and exit 1; kerf mode outline on a machine with no kerf is E_PARAM_MISSING naming the profile row.",
    "Until M10 the parts come from a nest scene: scene nests it as declared, parts nests one copy of each named part.",
    "Do not use it to write a file; it writes nothing, and export.run writes the cut files after a person approves at a terminal.",
  ].join(" "),
  input: inputOf<"nest.pack">(z.object({
    build: z.string().min(1).exactOptional().describe("no chase declares sheet items before M10; pass scene or parts"),
    scene: z.string().min(1).exactOptional().describe("cli only until M10: a nest scene, for example slug-sheets"),
    params: params.exactOptional(),
    parts: z.array(z.string().min(1)).min(1).exactOptional().describe("part ids of one nest scene, one copy each"),
    sheet: z.tuple([z.number().positive(), z.number().positive()]).exactOptional().describe("sheet width and height, mm"),
    machine: z.string().min(1).exactOptional().describe("profile machine id; its kerf, and its sheet envelope when sheet is absent"),
    mode: z.enum(["fill", "assembly-order", "legacy-shelf"]).exactOptional(),
    gap: z.union([z.number().min(0), z.literal("auto")]).exactOptional().describe("gap between parts, mm, or auto"),
    margin: z.number().min(0).exactOptional().describe("edge margin, mm"),
    partInPart: z.boolean().exactOptional().describe("place small parts inside the holes of larger ones (fill mode)"),
    seed: z.number().int().exactOptional().describe("packer seed; equal seeds give equal layouts"),
    kerfMode: z.enum(["outline", "none"]).exactOptional().describe("outline grows outlines by kerf/2 from the machine row; none cuts at nominal"),
  }).strict()),
  output: outputOf<"nest.pack">(),
  examples: [
    { input: example<"nest.pack">({ scene: "slug-sheets", mode: "legacy-shelf" }), note: "slug's shipped layout, 9 ply and 1 acrylic sheets of 600 x 400, cli only until M10" },
    { input: example<"nest.pack">({ scene: "slug-sheets", mode: "fill", partInPart: true }), note: "the same parts in fill mode with part-in-part" },
  ],
  writes: "nothing",
  cli: {
    target: "build",
    flags: {
      build: { field: "build", kind: "string" }, scene: { field: "scene", kind: "string" }, params: { field: "params", kind: "json" },
      parts: { field: "parts", kind: "list" }, sheet: { field: "sheet", kind: "size" }, machine: { field: "machine", kind: "string" },
      mode: { field: "mode", kind: "string" }, gap: { field: "gap", kind: "gap" }, margin: { field: "margin", kind: "json" },
      "part-in-part": { field: "partInPart", kind: "switch" }, seed: { field: "seed", kind: "json" }, "kerf-mode": { field: "kerfMode", kind: "string" },
    },
    transport: [],
    targetOptional: true,
  },
};
