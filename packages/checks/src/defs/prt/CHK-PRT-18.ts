// CHK-PRT-18, each imported file has the declared number of pieces (hbf
// image eval 2026-10-20: an img2threejs cap floated 2 mm above its stem and
// part.build --import passed it, fab-knowledge:plan-v5/image-eval.md).
// Method: the PIP net pass, as packages/circuit/src/extract/nets.ts lines
// 3 to 5 cite it: union the file's shells, decompose, count the pieces. A
// file declares its pieces on the import (default 1); measured is the count
// the import path took from the union, legal is the interval declared to
// declared.
// The rule runs where the import is read (part.build --import): Part IR
// carries no pieces, so the registered run skips on every part and core
// calls prt18Finding with the counts it measured (import-path.ts).

import type { Finding, ResultTarget } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { partTarget, skip } from "../common.js";
import { IMPORT_PATH_CONSTRAINT } from "./import-path.js";

/** Pieces a file holds when its import declares none. */
export const DEFAULT_PIECES = 1;

export const PRT18_CONSTRAINT = "an imported file holds the pieces it declares; an undeclared extra piece is a part the design never placed";

/**
 * The CHK-PRT-18 finding: measured pieces against the declared count.
 * declared undefined is the default, one piece.
 */
export function prt18Finding(target: ResultTarget, measuredPieces: number, declared: number | undefined = DEFAULT_PIECES, extra?: Finding["extra"]): Finding {
  const want = declared ?? DEFAULT_PIECES;
  const ok = measuredPieces === want;
  return {
    verdict: ok ? "pass" : "fail", target, measured: measuredPieces,
    legal: { kind: "interval", lo: want, hi: want, unit: "count", nearest: want },
    constraint: ok ? PRT18_CONSTRAINT : `${PRT18_CONSTRAINT}; the file holds ${measuredPieces} pieces, declared ${want}`,
    extra: { declared: want, ...(extra ?? {}) },
  };
}

export const check = defineCheck({
  id: "CHK-PRT-18",
  level: "part",
  run: (t) => [skip(partTarget(t.part), "not run", IMPORT_PATH_CONSTRAINT)],
});
