// One path from an input object to a CommandResult, shared by every
// transport: validate against the CommandDef zod schema, run the CommandDef,
// set ok from resultOk. The CLI and the MCP server both call execute, so a
// command has one validator and one implementation (M12-T01 step 3).

import type { AnyCommandDef, CommandError, CommandResult, SchemaIssue } from "@hackbuild/spec";
import { cmdError, schemaError } from "./errors.js";
import { finish, type CommandOut } from "./result.js";
import type { CoreCtx } from "./ctx.js";

/** E_SCHEMA from schema issues; an unrecognized key names its own pointer. */
export function issuesError(input: unknown, issues: readonly SchemaIssue[], command: string): CommandError {
  const first = issues[0] as (SchemaIssue & { keys?: readonly string[] }) | undefined;
  if (first?.keys !== undefined && first.keys.length > 0) {
    const key = first.keys[0]!;
    return { code: "E_SCHEMA", path: `${(first.path ?? []).map((s) => `/${String(s)}`).join("")}/${key}`, got: key, expected: "a field the command declares", hint: `remove ${key}; ${command} takes no such input` };
  }
  return schemaError(input, issues, command);
}

/**
 * Validate input against def.input, build the context only after the input
 * passed, run the command and finish the result. A thrown CommandError
 * leaves here unchanged; each transport turns it into its error result.
 */
export async function execute(def: AnyCommandDef, input: unknown, ctxOf: () => CoreCtx): Promise<CommandResult<unknown>> {
  const checked = await def.input["~standard"].validate(input);
  if (checked.issues !== undefined) throw cmdError(issuesError(input, checked.issues, def.name));
  const run = def.run as unknown as (i: unknown, c: CoreCtx) => Promise<CommandOut<unknown>>;
  return finish(await run(checked.value, ctxOf()));
}
