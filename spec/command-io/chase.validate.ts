// command chase.validate, group author.
// spec/commands.ts CommandIO takes this interface; npm run registries regenerates it.

import type { CommandResult, ValidateQuestion } from "../commands";
import type { CommandError } from "../errors";

export interface ChaseValidateIO {
  /** Also validates the bench.ts beside the chase when one exists. */
  input: { chase: string };
  /** Errors travel in CommandResult.errors as CommandError[] (D-133). */
  output: { questions: readonly ValidateQuestion[]; resolvedChecks: readonly string[] };
}
