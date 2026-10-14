// CHK-LNT-01 and -02 run the lint-voice rules on the source target (D-004,
// CHECKS.md section 5: their run bodies are lint-voice), so the dash, emoji
// and sparkle rules exist once. The rules live in this package at
// voice/rules.mjs, plain ESM outside the tsc build, and are read through
// the package's own subpath @hackbuild/checks/voice, the specifier
// tools/lint-voice.mjs and the git hooks read them by.

import type { Finding, SourceFile } from "@hackbuild/spec";
import { lintText } from "@hackbuild/checks/voice";
import { boolFinding } from "../common.js";

/** One boolean finding: no lint-voice hit of the given rules in the source. */
export function voiceFinding(source: SourceFile, rules: readonly string[], constraint: string): Finding {
  const hits = lintText(source.path, source.text).filter((h) => rules.includes(h.rule));
  const first = hits[0];
  return boolFinding({ level: "source", path: source.path }, hits.length === 0, constraint,
    { hits: hits.length, ...(first === undefined ? {} : { firstLine: first.line, firstCol: first.col, rule: first.rule }) });
}
