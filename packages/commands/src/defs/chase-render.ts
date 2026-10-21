import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"chase.render"> = {
  name: "chase.render",
  group: "look",
  description: [
    "Bake a design's page from its bake.json, open it headless offline in system Chrome, and return one png per rail step at 1280 and 390 px with the smoke measures of each view.",
    "Each view gives its scroll width (over the width is horizontal overflow) and its focal pink count (budget 1); the run gives console errors and requests off the file. A breach fails with E_KERNEL and a render/ record.",
    "The page and the pngs go to the store as hbf://artifact/ uris; it writes nothing to the repo. A design with no bake.json is refused; chase.bake writes one.",
    "Do not use it as the person look (D-154): it feeds the review, it never ticks it.",
  ].join(" "),
  input: inputOf<"chase.render">(z.object({
    chase,
    screenshots: z.boolean().exactOptional().describe("false measures every view and stores no png; default true"),
  }).strict()),
  output: outputOf<"chase.render">(),
  examples: [
    { input: { chase: "reference/keys/flex-pair" }, note: "the flex pair page: 4 steps at 2 widths, 8 pngs" },
    { input: { chase: "reference/keys/flex-pair", screenshots: false }, note: "measures only" },
  ],
  writes: "nothing",
  longRunning: true,
  cli: { target: "chase", flags: { chase: { field: "chase", kind: "string" }, screenshots: { field: "screenshots", kind: "json" } }, transport: [] },
};
