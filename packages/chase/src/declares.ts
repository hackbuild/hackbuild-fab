// Declarations only (standard rule 1, D-131, D-178; M10-T02 step 4). A
// chase.ts is data: the source reader (source.ts) parses the one
// `export const chase = defineChase({...})` literal and executes nothing.
// This module is the rule's verdict for chase.validate and the tests: a
// call, an arrow or function expression, a conditional, a binary or logical
// operator, a template with a substitution, a loop, a computed key, an
// identifier value or a spread is E_SCHEMA with the source line and the
// JSON pointer of the enclosing field.
//
// The card allowed identifiers and spreads that name imported registry
// constants; D-178 (decided after the card was written) refuses every
// identifier value and spread, and the source reader follows D-178. A
// shared field set reaches a chase as written-out literals.
//
// The reader is ours (M00, no dependency): TypeScript 7.0.2 exposes only
// the unstable IPC API under typescript/unstable/sync, which needs a
// native child process and cannot run in a bake, so no parser was added.

import type { ChaseSourceSpan, CommandError, Chase } from "@hackbuild/spec";
import { isThrownCommandError } from "@hackbuild/spec";
import { readChaseSource } from "./source.js";

export interface Declared {
  readonly ok: true;
  readonly chase: Chase;
  readonly spans: readonly ChaseSourceSpan[];
}

export interface Computes {
  readonly ok: false;
  readonly error: CommandError;
  /** 1-based source line of the refused construct. */
  readonly line: number;
  /** 1-based column. */
  readonly column: number;
  /** JSON pointer of the enclosing ParamField, when the construct sits inside one. */
  readonly field?: string;
}

export type DeclaresVerdict = Declared | Computes;

const FIELD = /^(.*\/(?:fields|item|readouts)\/\d+)/;

/** The pointer of the innermost ParamField holding `pointer`, or undefined. */
export function enclosingField(pointer: string): string | undefined {
  return FIELD.exec(pointer)?.[1];
}

/** Read the source and return the chase, or the first construct that computes. */
export function checkDeclares(source: string, file: string): DeclaresVerdict {
  try {
    const r = readChaseSource(source, file);
    return { ok: true, chase: r.chase, spans: r.spans };
  } catch (e) {
    if (!isThrownCommandError(e)) throw e;
    const error = e.hbf;
    // readChaseSource writes "<file>:<line>:<col> <hint>" (source.ts lineCol).
    const m = error.hint.startsWith(file) ? /^:(\d+):(\d+) /.exec(error.hint.slice(file.length)) : null;
    const line = m === null ? 0 : Number(m[1]);
    const column = m === null ? 0 : Number(m[2]);
    const field = enclosingField(error.path ?? "");
    return { ok: false, error, line, column, ...(field !== undefined ? { field } : {}) };
  }
}
