// The canon queries (M06-T11): offline reads of the mechanisms and
// archetypes registries. None writes; a refused entry is E_REF naming its
// status, its reason and its original.

import { z } from "zod";
import { PROCESSES } from "@hackbuild/spec";
import type { CommandSpec } from "../spec.js";
import { inputOf, outputOf } from "../shared.js";

export const spec: CommandSpec<"mech.find"> = {
  name: "mech.find",
  group: "query",
  description: [
    "Search the mechanisms registry by words matched against id, family and the rules each entry governs, before you design a mechanism from nothing.",
    "Each hit gives status, dof, processes, provenance, reference ids and the original file it ports from; typed entries come first, then stub, candidate and unproven ones with the reason they are refused.",
    "family and process narrow the hits.",
    "Do not use it for numbers; mech.derive returns the derived values of a typed entry.",
  ].join(" "),
  input: inputOf<"mech.find">(z.object({
    behaviour: z.string().min(1).describe("words matched against id, family and governs text, for example geneva or detent"),
    family: z.string().min(1).exactOptional().describe("mechanism family, for example intermittent or snap"),
    process: z.enum(PROCESSES).exactOptional().describe("keep entries made by this process"),
  }).strict()),
  output: outputOf<"mech.find">(),
  examples: [{ input: { behaviour: "geneva" }, note: "geneva-external first, with its status and original" }, { input: { behaviour: "detent", process: "fdm" }, note: "the printed detents" }],
  writes: "nothing",
  cli: { target: "behaviour", flags: { family: { field: "family", kind: "string" }, process: { field: "process", kind: "string" } }, transport: [] },
};
