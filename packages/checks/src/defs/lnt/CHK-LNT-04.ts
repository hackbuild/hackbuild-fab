// CHK-LNT-04, no two assignments on one line with a comment between (OGEE
// R15 2026-08: DRIVE_Y was commented out and four parts parked at -1.5).
// A line that assigns, opens a comment, and assigns again hides the second
// assignment inside the comment, so a reader sees a value the code never
// sets. Comment openers are // and /*, and # in the languages that use it
// (python, shell, yaml, toml); a quoted string does not open a comment.
//
// The hidden assignment is code shaped: a name, =, then one value before the
// line or the comment ends, or any value that ends with a semicolon, as
// DRIVE_Y = 126; did. A comment that explains the line in words ("world y =
// step z", "px = mm per cell, ...") is not code. A prose record is not read
// (proseSkip, CHECKS.md 7.8).

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, proseSkip } from "../common.js";

/** name = value, not ==, !=, <=, >= or =>. */
const ASSIGN = /\b[A-Za-z_][\w.]*(?:\[[^\]]*\])?\s*=(?![=>])/g;

/** An assignment statement inside a comment: one value before the line or the comment ends, or a value ending in a semicolon. */
const HIDDEN = /\b[A-Za-z_][\w.]*(?:\[[^\]]*\])?\s*=(?![=>])\s*(?:[^\s;]+\s*;?\s*(?:$|\*\/|\/\/|#)|[^;]*;)/;

const HASH_COMMENTS = /\.(?:py|sh|ya?ml|toml)$/i;

/** Index of the first comment opener outside quotes, or -1. */
function commentAt(line: string, hash: boolean): number {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quote !== null) {
      if (c === "\\") i += 1;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if ((hash && c === "#") || (c === "/" && (line[i + 1] === "/" || line[i + 1] === "*"))) return i;
  }
  return -1;
}

/** 1-based lines that assign, open a comment, then assign again. */
export function hiddenAssignments(path: string, text: string): number[] {
  const out: number[] = [];
  const hash = HASH_COMMENTS.test(path);
  text.split("\n").forEach((line, i) => {
    const c = commentAt(line, hash);
    if (c < 0) return;
    const before = [...line.slice(0, c).matchAll(ASSIGN)].length;
    if (before > 0 && HIDDEN.test(line.slice(c))) out.push(i + 1);
  });
  return out;
}

export const check = defineCheck({
  id: "CHK-LNT-04",
  level: "source",
  run: (t): readonly Finding[] => {
    const prose = proseSkip(t.source);
    if (prose !== undefined) return [prose];
    const lines = hiddenAssignments(t.source.path, t.source.text);
    return [boolFinding({ level: "source", path: t.source.path }, lines.length === 0,
      "an assignment after a comment opener on an assigning line is invisible code: DRIVE_Y commented out parked four parts at -1.5 (OGEE R15)",
      { lines: lines.length, ...(lines[0] === undefined ? {} : { firstLine: lines[0] }) })];
  },
});
