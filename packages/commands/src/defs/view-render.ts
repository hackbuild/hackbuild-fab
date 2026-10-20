import { z } from "zod";
import type { ViewMode } from "@hackbuild/spec";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

/** Modes view.render draws; core maps each to the view it renders. */
export const VIEW_MODES = ["assembled", "iso", "section", "plate"] as const satisfies readonly ViewMode[];

export type ViewModeName = (typeof VIEW_MODES)[number];

export const spec: CommandSpec<"view.render"> = {
  name: "view.render",
  group: "look",
  description: [
    "Render a stored build to a png: orthographic top, front, iso and a section through the middle, flat shaded per slot colour, drawn by a software z-buffer with no browser.",
    `mode assembled gives the four views on one sheet; ${VIEW_MODES.filter((m) => m !== "assembled").join(", ")} give one view; size is width and height in px.`,
    "The bytes depend only on the build, so the png hash is evidence.",
    "Do not use it to judge print quality; a person looks at the render.",
  ].join(" "),
  input: inputOf<"view.render">(z.object({
    target: z.string().min(1).describe("hbf://build/<buildHash> or a design directory"),
    mode: z.string().min(1).describe(`view mode: ${VIEW_MODES.join(", ")}`),
    size: z.tuple([z.number().int().min(16).max(4096), z.number().int().min(16).max(4096)]).exactOptional().describe("width and height, px"),
  }).strict()),
  output: outputOf<"view.render">(),
  examples: [
    { input: { target: "reference/keys/flex-pair", mode: "assembled" }, note: "four views of the flex pair" },
    { input: { target: "reference/keys/flex-pair", mode: "section", size: [512, 512] }, note: "the mid section, 512 by 512 px" },
  ],
  writes: "nothing",
  cli: { target: "target", flags: { mode: { field: "mode", kind: "string" }, size: { field: "size", kind: "size" } }, transport: ["out"] },
};
