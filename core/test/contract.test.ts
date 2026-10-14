// Contract tests, level 3 of TESTING.md 4.3 (M00-T13 step 14): every
// registered CommandDef has at least one example that validates against
// its input schema, and a description that meets the AGENT-SURFACE.md 5.4
// standard and passes lint-voice.

import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { COMMANDS } from "../src/registry.js";
import { ROOT } from "./hbf.js";

type Lint = (p: string, text: string, kind: string | null) => readonly { rule: string; text: string }[];
const { lintText } = (await import(pathToFileURL(path.join(ROOT, "tools", "lint-voice.mjs")).href)) as { lintText: Lint };

/** The 5.4 standard: at least 3 sentences, a "Do not use" or "not for" clause, at most 120 words, voice clean. */
function descriptionProblems(name: string, text: string): string[] {
  const problems: string[] = [];
  const sentences = text.split(/(?<=\.)\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length < 3) problems.push(`${name}: ${sentences.length} sentences, at least 3`);
  if (!/\bDo not use\b|\bnot for\b/.test(text)) problems.push(`${name}: no "Do not use" or "not for" clause`);
  const words = text.trim().split(/\s+/).length;
  if (words > 120) problems.push(`${name}: ${words} words, at most 120`);
  for (const hit of lintText(`${name}.description`, text, "text")) problems.push(`${name}: voice lint ${hit.rule}: ${hit.text}`);
  return problems;
}

describe("command contract", () => {
  for (const def of COMMANDS) {
    it(`${def.name}: every example validates against the input schema`, async () => {
      expect(def.examples.length).toBeGreaterThan(0);
      for (const ex of def.examples) {
        const r = await def.input["~standard"].validate(ex.input);
        expect(r.issues, `${def.name} example ${JSON.stringify(ex.input)}`).toBeUndefined();
        expect(ex.note.length).toBeGreaterThan(0);
      }
    });

    it(`${def.name}: the description meets the standard`, () => {
      expect(descriptionProblems(def.name, def.description)).toEqual([]);
    });
  }

  it("a two-sentence description fails the standard", () => {
    expect(descriptionProblems("x", "One sentence. Two sentences.").length).toBeGreaterThan(0);
  });
});
