// The error contract on the core side (D-064, D-182): raising a
// CommandError, didYouMean by edit distance, the E_SCHEMA a schema issue
// becomes, and the one exit code a result maps to through spec/errors.ts.

import {
  ERROR_TRANSPORT, VERDICT_TRANSPORT, commandError, didYouMean,
  type CommandError, type CommandResult, type SchemaIssue,
} from "@hackbuild/spec";

/** A CommandError the transports catch and put in CommandResult.errors. */
export const cmdError = commandError;

export { didYouMean };

const escape = (seg: string): string => seg.replace(/~/g, "~0").replace(/\//g, "~1");

/** RFC 6901 pointer of a Standard Schema issue path. */
export function pointerOf(path: SchemaIssue["path"]): string {
  if (path === undefined || path.length === 0) return "";
  return path.map((seg) => `/${escape(String(typeof seg === "object" && seg !== null && "key" in seg ? seg.key : seg))}`).join("");
}

/** The value a pointer names in an input, or undefined. */
export function valueAt(root: unknown, pointer: string): unknown {
  let at: unknown = root;
  for (const raw of pointer.split("/").slice(1)) {
    const seg = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    at = typeof at === "object" && at !== null ? (at as Record<string, unknown>)[seg] : undefined;
  }
  return at;
}

/** E_SCHEMA from the first schema issue: pointer, got, expected and a one-line hint. */
export function schemaError(input: unknown, issues: readonly SchemaIssue[], command: string): CommandError {
  const first = issues[0];
  const path = pointerOf(first?.path);
  const got = valueAt(input, path);
  const field = path === "" ? "the input" : path.slice(1).replace(/\//g, ".");
  const message = (first?.message ?? "invalid input").toLowerCase().replace(/\.$/, "");
  return {
    code: "E_SCHEMA", path: path === "" ? "/" : path, ...(got === undefined ? {} : { got }),
    expected: message,
    hint: `fix ${field} for ${command}: ${message}`,
  };
}

/** The exit code of a finished result: the first error's row, else the verdict's row. */
export function exitOf(r: Pick<CommandResult<unknown>, "errors" | "verdict">): number {
  const e = r.errors[0];
  return e === undefined ? VERDICT_TRANSPORT[r.verdict].exit : ERROR_TRANSPORT[e.code].exit;
}

/** Exit code for a crash (EXIT_CODES.internal). */
export const EXIT_INTERNAL = 70;
