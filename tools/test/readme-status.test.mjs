// The README Status section must match the repository it describes. Added
// for BR-01 (2026-10-13): after CI run 38499440880 the README still said CI
// had never run, and once reference/keys/flex-pair/page-build.ts landed it
// still said the flex-pair bench could not build a part in the page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

/** The text of one level-two section, heading excluded. */
const section = (md, name) => {
  const start = md.indexOf(`\n## ${name}\n`);
  assert.notEqual(start, -1, `README has no "## ${name}" section`);
  const rest = md.slice(start + name.length + 5);
  const end = rest.search(/\n## /);
  return end === -1 ? rest : rest.slice(0, end);
};

test("the README does not say CI has never run, and Status names a CI run id", () => {
  assert.doesNotMatch(readme, /CI has never run/i);
  assert.match(section(readme, "Status"), /\brun \d{8,}\b/);
});

test("the README does not say the flex-pair bench cannot build in the page once its page build exists", () => {
  if (!existsSync(join(root, "reference", "keys", "flex-pair", "page-build.ts"))) return;
  assert.doesNotMatch(readme, /cannot build a part in the page/i);
  assert.match(section(readme, "Status"), /flex-pair bench\s+builds, checks and exports/);
});
