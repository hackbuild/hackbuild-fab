import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { chase, inputOf, outputOf } from "../shared.js";

const vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const spec: CommandSpec<"arch.apply"> = {
  name: "arch.apply",
  group: "author",
  description: [
    "Place a proven archetype on a declared face of a part: returns the feature and port ids the next part.build merge produces, the chase.applied record and the material slots the chase lacks.",
    "face is a face ref the part declares, or a frame lying on one; a param the archetype needs with no default, such as the blocks stud standard, comes back as E_PARAM_MISSING listing the options, and a stub, candidate or unproven id is E_REF with its reason.",
    "Until chase.patch lands the result is returned with written false and nothing is written.",
    "Do not use it to build; part.build merges every chase.applied entry and runs the checks.",
  ].join(" "),
  input: inputOf<"arch.apply">(z.object({
    chase: chase.exactOptional(),
    part: z.string().min(1).describe("part id the chase's build returns, for example body"),
    face: z.union([
      z.object({ ref: z.string().min(1), uv: z.tuple([z.number(), z.number()]), rotDeg: z.number() }).strict(),
      z.object({ origin: vec3, normal: vec3, u: vec3 }).strict(),
    ]).describe("a declared face {ref, uv, rotDeg}, or a frame {origin, normal, u} in mm on one"),
    id: z.string().min(1).describe("archetype id or alias, for example flex-cone-key"),
    params: z.record(z.string(), z.unknown()).exactOptional().describe("archetype params by key, json or k=v pairs, for example standard=boss-v1"),
  }).strict()),
  output: outputOf<"arch.apply">(),
  examples: [
    {
      input: { chase: "reference/conductors/blocks-stud-applied", part: "body", face: { ref: "body.top", uv: [0, 0], rotDeg: 0 }, id: "flex-cone-key" },
      note: "a flex cone key at the top face centre of the plain 32 by 24 prism; the tpu and conductive slots come back in slotsAdded",
    },
  ],
  writes: "branch",
  cli: {
    target: "chase",
    flags: {
      chase: { field: "chase", kind: "string" }, part: { field: "part", kind: "string" }, face: { field: "face", kind: "json" },
      id: { field: "id", kind: "string" }, params: { field: "params", kind: "pairs" },
    },
    transport: [],
    targetOptional: true,
  },
};
