import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"fits.table"> = {
  name: "fits.table",
  group: "prove",
  description: [
    "Print the FITS rows of a build: each mating pair's drawn clearance in mm against its fit class band, with the band's reason, the legal hole for its shaft and the clearance left after loss.",
    "The build names its fit model; each band is a constraints.query bound from profile/fit-band, so the table and the query agree.",
    "Every row is a CHK-FIT-01 result: verdict fail and exit 1 when any row is out of band.",
    "Do not use it to change a fit; edit the param the row reads and rebuild.",
  ].join(" "),
  input: inputOf<"fits.table">(z.object({ build: z.string().min(1).describe("design or reference directory, or a chase id") }).strict()),
  output: outputOf<"fits.table">(),
  examples: [{ input: { build: "reference/fit/ogee16-r16p" }, note: "the ogee r16-p fits table, 18 rows" }],
  writes: "nothing",
  cli: { target: "build", flags: {}, transport: [] },
};
