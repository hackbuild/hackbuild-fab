// CHK-FIT-04, checker constants are derived from params, never copied
// (OGEE R16-P 2026-08: fits.py reported 0.55 after FIT_SLIDE went to 0.75;
// three times, fits.py twice and check_drive.py once). The rule from the
// origin's own comment (fits.py lines 41 to 44, originals/ogee16): an audit
// that keeps its own copy of the numbers it is auditing is not an audit. A
// source that reads a params source and still binds an upper-case name to a
// bare number, as an assignment or a dict keyword, holds a copy. The shipped
// fits.py does both (FIT_SLIDE_ = 0.75 beside `from kin import P`).
//
// A params source is a params file, load_params, an imported P or a PARAMS
// table, as the origin reads one. A lowercase `params` identifier is not
// one: in TypeScript it names a chase's parameter object or a call argument,
// which holds no copy of a params file. A prose record is not read
// (proseSkip, CHECKS.md 7.8).

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, proseSkip } from "../common.js";

/** The source reads a params source: a params file, kin.load_params, an imported P, or a PARAMS table. */
const READS_PARAMS = /\bparams\.(?:scad|py|json|ya?ml|toml)\b|\bload_params\b|\bimport\s+P\b|\bPARAMS\b/;

/** True when the text reads a params source, as READS_PARAMS defines one. */
export const readsParams = (text: string): boolean => READS_PARAMS.test(text);

/** NAME = number at the start of a statement: python, scad, js const and let. */
const ASSIGN = /^[ \t]*(?:(?:export\s+)?(?:const|let|var)\s+)?([A-Z][A-Z0-9_]*[A-Z0-9_])\s*=\s*-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?\s*;?\s*(?:#.*|\/\/.*)?$/gm;

/** NAME=number as a keyword inside dict(...) or an object literal NAME: number. */
const KEYWORD = /[(,{]\s*([A-Z][A-Z0-9_]*[A-Z0-9_])\s*[=:]\s*-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?\s*(?=[,)}])/g;

/** Upper-case names a source binds to bare numbers. */
export function copiedConstants(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(ASSIGN)) out.add(m[1]!);
  for (const m of text.matchAll(KEYWORD)) out.add(m[1]!);
  return [...out];
}

export const check = defineCheck({
  id: "CHK-FIT-04",
  level: "source",
  run: (t): readonly Finding[] => {
    const prose = proseSkip(t.source);
    if (prose !== undefined) return [prose];
    const at = { level: "source" as const, path: t.source.path };
    const reads = readsParams(t.source.text);
    const copied = reads ? copiedConstants(t.source.text) : [];
    return [boolFinding(at, copied.length === 0,
      reads
        ? "a checker that reads params derives every constant from them; a copy goes stale when the param moves"
        : "the source reads no params, so it holds no copy of one",
      { readsParams: reads ? "yes" : "no", copied: copied.length, ...(copied.length > 0 ? { first: copied.slice(0, 5).join(", ") } : {}) })];
  },
});
