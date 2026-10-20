// Schema pieces more than one command spec reads, and the casts that type a
// zod 4 schema as the spec input of a command (D-106, D-107).

import { z } from "zod";
import type { CommandDef, CommandInput, CommandName, CommandOutput, SchemaLike } from "@hackbuild/spec";

export const params = z.record(z.string(), z.unknown())
  .describe("param values by field id or group id, merged over the preset; a key starting with / is a json pointer, for example {\"/keys/0/gap\": 1.6}");
export const chase = z.string().min(1).describe("design or reference directory, or a chase id");
export const preset = z.string().min(1).describe("preset id the chase declares");

// The M02 sim commands (M02-T11). Until M10 a legacy design has no chase,
// so each takes the CLI-only --scene <id> beside the spec's --build; the
// transitional fields widen the spec input, and an example states the call
// a person types today.
export const build = z.string().min(1).describe("hbf://build/<buildHash>; no chase declares a sim scene before M10, so pass scene");
export const scene = z.string().min(1).describe("cli only until M10: a registered sim scene id, for example ogee16-cranks");

/** CLI flags every chase command with params and a preset reads. */
export const commonFlags = {
  params: { field: "params", kind: "json" },
  preset: { field: "preset", kind: "string" },
} as const;

export const outputOf = <N extends CommandName>(): SchemaLike<unknown, CommandOutput<N>> =>
  z.custom<CommandOutput<N>>((v) => typeof v === "object" && v !== null) as unknown as SchemaLike<unknown, CommandOutput<N>>;

/** Narrow a zod schema to the spec input type; the examples are typed by CommandInput<N>, so tsc checks the pair. */
export const inputOf = <N extends CommandName>(s: z.ZodType): CommandDef<N>["input"] => s as unknown as CommandDef<N>["input"];

// The CLI input layer (D-107): a command whose CLI form widens the spec
// input (--scene and the M10 fields) runs on that widened input. example
// and core's cliRun are the one place the widened input meets CommandDef;
// the layer comes out at M10, when the chase declares scenes and spec
// carries the fields. The widened input types live with the run bodies in
// core, so tsc does not check these examples; the contract test validates
// each against the input schema at load.

/** A transitional example input over the widened CLI input. */
export const example = <N extends CommandName>(input: Readonly<Record<string, unknown>>): CommandInput<N> => input as unknown as CommandInput<N>;
