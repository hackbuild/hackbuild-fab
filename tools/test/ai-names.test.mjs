// tools/ai-names.json is the one list of AI tool names (D-001). packages/3mf
// keeps a copy of its tools and identityOnly entries so the package stands
// alone in the hackbuild-3mf split; this test holds the copy equal and shows
// the Designer refusal reads it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..", "..");
const names = JSON.parse(readFileSync(join(root, "tools", "ai-names.json"), "utf8"));
const meta = await import(pathToFileURL(join(root, "packages", "3mf", "dist", "metadata.js")).href);

test("packages/3mf AI_NAMES equals tools/ai-names.json tools then identityOnly", () => {
  assert.deepEqual([...meta.AI_NAMES], [...names.tools, ...names.identityOnly]);
});

test("the Designer refusal reads the list: every tool name is refused, a person and a file name pass", () => {
  for (const d of ["Claude", "Sonnet 4.5", "GPT-4o", "Codex", "an LLM", "Cursor"]) {
    assert.throws(() => meta.attribution(d, "MIT", 315532800), (e) => e.hbf?.code === "E_SCHEMA", d);
  }
  assert.equal(meta.attribution("Moheeb Zara", "MIT", 315532800).designer, "Moheeb Zara");
  assert.equal(meta.attribution("Claudette Opusnik", "MIT", 315532800).designer, "Claudette Opusnik");
});
