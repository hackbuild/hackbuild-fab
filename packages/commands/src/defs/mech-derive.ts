import { z } from "zod";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"mech.derive"> = {
  name: "mech.derive",
  group: "query",
  description: [
    "Compute a typed mechanism's governing numbers from its derive(): every output with unit, equation and qualifier, the default-filled inputs it ran on, and origin hbf://mechanism/<id>.",
    "Pass params as json or as k=v pairs in the units the mechanism declares; a missing or NaN value is E_PARAM_MISSING naming it, an unknown key is E_SCHEMA, an unknown id is E_REF with up to three near ids.",
    "A stub, candidate or unproven entry is refused with E_REF naming its status, the reason and the original it ports from.",
    "Do not use it to place a mechanism on a part; build.ts calls k.mech for that.",
  ].join(" "),
  input: inputOf<"mech.derive">(z.object({
    id: z.string().min(1).describe("mechanism id, for example geneva-external"),
    params: z.record(z.string(), z.unknown()).exactOptional().describe("values by param key in the units the schema states, for example {\"n\": 3, \"d\": 25}; absent takes every default"),
  }).strict()),
  output: outputOf<"mech.derive">(),
  examples: [{ input: { id: "living-hinge" }, note: "the tumbler living hinge at its bench defaults, 12.86 deg per row" }, { input: { id: "finger-joint", params: { k: 0.2 } }, note: "one kerf step moves tab and slot 0.02 mm" }],
  writes: "nothing",
  cli: { target: "id", flags: { params: { field: "params", kind: "pairs" } }, transport: [] },
};
