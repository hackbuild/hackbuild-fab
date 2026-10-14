// CHK-SHT-04, kerf lives in one place, from the coupon (OGEE R12 2026-08;
// no failure is on record, the OGEE16 notes state the rule: set KERF from
// the coupon, never change part geometry for kerf). Kerf is the machine
// profile's row (spec/profile.ts Machine.kerf, null until a coupon
// measures it, D-101). A source that binds a kerf name to a number keeps a
// second copy of it. A prose record is not read (proseSkip, CHECKS.md 7.8):
// a plan doc or a knowledge record quotes an origin's kerf as evidence for
// the coupon.

import type { Finding } from "@hackbuild/spec";
import { defineCheck } from "../../registry.js";
import { boolFinding, proseSkip } from "../common.js";

/**
 * A kerf name bound to a number, as an assignment, a keyword or an object
 * key: KERF = n, kerf: n, kerf_mm=n. A number that scales a named quantity
 * (kerf = 2 * burn, CHK-SHT-11) derives the kerf and is no second copy.
 */
const KERF_LITERAL = /\b(\w*kerf\w*)\b\s*[:=]\s*-?(?:\d+\.?\d*|\.\d+)(?![\w.])(?!\s*\*)/gi;

export function kerfLiterals(text: string): string[] {
  return [...text.matchAll(KERF_LITERAL)].map((m) => m[0].replace(/\s+/g, " "));
}

export const check = defineCheck({
  id: "CHK-SHT-04",
  level: "source",
  run: (t): readonly Finding[] => {
    const prose = proseSkip(t.source);
    if (prose !== undefined) return [prose];
    const found = kerfLiterals(t.source.text);
    return [boolFinding({ level: "source", path: t.source.path }, found.length === 0,
      "kerf is the machine profile row a coupon measured (D-101); a number typed beside the parts is a second copy",
      { literals: found.length, ...(found[0] === undefined ? {} : { first: found[0] }) })];
  },
});
