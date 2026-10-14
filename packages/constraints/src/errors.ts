// The command errors the solver raises, each built through spec
// commandError, the one ThrownCommandError constructor (D-064, D-206).
// E_UNSAT is returned as evidence beside the interval, never thrown
// (spec/errors.ts ERROR_TRANSPORT).

import { commandError, didYouMean, type CommandError, type ThrownCommandError } from "@hackbuild/spec";

// The fact readers live in spec/constraints.ts so the canon packages share them (M06-T02).
export { factMissingError, factPointer, pointerToken } from "@hackbuild/spec";

/** A ConstraintDef refused at registration. path points into the def. */
export function defSchemaError(defId: unknown, path: string, got: unknown, expected: string, hint: string): ThrownCommandError {
  return commandError({
    code: "E_SCHEMA",
    path,
    got,
    expected,
    hint,
    ...(typeof defId === "string" && defId !== "" ? { record: defId } : {}),
  });
}

/** A dim no registered def names, with up to three registered dims by edit distance. */
export function unknownDimError(dim: string, registered: readonly string[]): ThrownCommandError {
  return commandError({
    code: "E_REF",
    path: "/dim",
    got: dim,
    expected: "a dim a registered constraint names",
    didYouMean: didYouMean(dim, registered),
    hint: "unknown dim; query one of the registered dims",
  });
}

/** A measured value nearest() cannot clamp. */
export function measuredMissingError(got: number): ThrownCommandError {
  return commandError({
    code: "E_PARAM_MISSING",
    path: "/measured",
    got: String(got),
    expected: "a finite number",
    hint: "measured value is not a finite number; measure it again",
  });
}

/**
 * The E_UNSAT entry an empty interval carries. path, got and expected
 * come from the def that owns the binding floor; when it names no fact,
 * expected states the ceiling the floor must meet.
 */
export function unsatError(fields: Omit<CommandError, "code" | "hint">): CommandError {
  return {
    code: "E_UNSAT",
    ...fields,
    hint: "floors exceed ceilings; move the binding floor below the ceiling or raise the ceiling",
  };
}
