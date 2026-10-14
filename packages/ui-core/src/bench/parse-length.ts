// Typed length entry (plan-deltas R35), on the model of hackbuild-bench
// parseFrequency (src/core/dsp/spectrumMath.ts lines 65 to 76): commas
// stripped, optional space before a case-insensitive suffix. A bare number
// is mm. Pure, so the CLI can read length arguments with it.

import type { CommandError } from "@hackbuild/spec";

/** mm per unit, exact by definition (1 in = 25.4 mm). */
export const LENGTH_UNITS: Readonly<Record<string, number>> = { mm: 1, cm: 10, um: 0.001, in: 25.4 };

const ACCEPTED = "a length in mm, or a number with mm, cm, um or in";

function schema(got: string, hint: string): CommandError {
  return { code: "E_SCHEMA", got, expected: ACCEPTED, hint };
}

export function parseLength(text: string): { mm: number } | CommandError {
  const t = text.replace(/,/g, "").trim();
  if (t === "") return schema(text, "length is empty. type a length such as 12 or 0.5in");
  const m = /^([+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:e[+-]?[0-9]+)?)\s*([a-z]*)$/i.exec(t);
  if (m === null) return schema(text, `"${text}" is not a number. type a length such as 12 or 0.5in`);
  const v = Number(m[1]);
  const suffix = (m[2] ?? "").toLowerCase();
  const per = suffix === "" ? 1 : LENGTH_UNITS[suffix];
  if (per === undefined) return schema(text, `unknown unit "${m[2]}" in "${text}". use mm, cm, um or in`);
  if (!Number.isFinite(v)) return schema(text, `"${text}" is not a finite number`);
  if (v < 0) return schema(text, `length ${v} is negative. type a length of 0 or more`);
  return { mm: v * per };
}
