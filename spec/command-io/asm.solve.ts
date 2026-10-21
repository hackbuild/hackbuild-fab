// command asm.solve, group build.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { Assertion, Pose } from "../part-ir";

export interface AsmSolveIO {
  input: { build: string };
  output: { placements: Readonly<Record<string, Pose>>; unsatisfied: readonly Assertion[] };
}
