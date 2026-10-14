// M09-T03 step 10 (plan-deltas R35): the card's table, mm within 1e-9.

import { describe, expect, test } from "vitest";
import { parseLength } from "../../src/bench/parse-length.js";

const ok: readonly [string, number][] = [
  ["12", 12],
  ["12mm", 12],
  ["0.5in", 12.7],
  ["300um", 0.3],
  ["1.2cm", 12],
  ["1.2 CM", 12],
  ["1,200 um", 1.2],
  [" 4 MM ", 4],
  [".5", 0.5],
  ["0", 0],
];

const bad: readonly [string, RegExp][] = [
  ["12 ft", /unknown unit "ft"/],
  ["", /empty/],
  ["-3", /negative/],
  ["abc", /not a number/],
  ["1e999", /not a finite number/],
  ["12 mm mm", /not a number/],
  ["mm", /not a number/],
];

describe("parseLength", () => {
  for (const [text, mm] of ok) {
    test(`${JSON.stringify(text)} reads ${mm} mm`, () => {
      const r = parseLength(text);
      expect("mm" in r).toBe(true);
      if ("mm" in r) expect(Math.abs(r.mm - mm)).toBeLessThan(1e-9);
    });
  }
  for (const [text, hint] of bad) {
    test(`${JSON.stringify(text)} is E_SCHEMA`, () => {
      const r = parseLength(text);
      expect("code" in r && r.code).toBe("E_SCHEMA");
      if ("code" in r) {
        expect(r.hint).toMatch(hint);
        expect(r.got).toBe(text);
        expect(r.expected).toBe("a length in mm, or a number with mm, cm, um or in");
      }
    });
  }
});
