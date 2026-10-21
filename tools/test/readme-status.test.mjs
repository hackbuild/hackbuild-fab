// The README Status section must match the repository it describes. Added
// for BR-01 (2026-10-13): after CI run 38499440880 the README still said CI
// had never run, and once reference/keys/flex-pair/page-build.ts landed it
// still said the flex-pair bench could not build a part in the page.
// R1-rails-public-16 (2026-10-21) made the README a maker front page: the
// CI history moved to docs/explanation/ci-history.md, and the sections a
// maker reads first are held here, with the links PLAN.md 5 asks for.
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

test("the README carries the maker sections in order", () => {
  const order = ["Status", "Install", "Make your first part", "The export gate", "Use policy"];
  const at = order.map((name) => readme.indexOf(`\n## ${name}\n`));
  for (const [i, name] of order.entries()) assert.notEqual(at[i], -1, `README has no "## ${name}" section`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, "README maker sections are out of order");
});

test("Status says no exported part has been printed and stays short", () => {
  const status = section(readme, "Status");
  assert.match(status, /no part this code\s+exported has been printed/);
  assert.ok(status.split("\n").length <= 16, "README Status grew past 16 lines; move history to docs/explanation/ci-history.md");
  assert.ok(existsSync(join(root, "docs", "explanation", "ci-history.md")), "docs/explanation/ci-history.md is missing");
});

/** The markdown link targets in a text, anchors dropped. */
const links = (md) => [...md.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)].map((m) => m[1].replace(/^\.\//, ""));

test("the README links USE.md, SECURITY.md, CHANGELOG.md and the quick start, and each target exists", () => {
  const targets = links(readme);
  for (const want of ["USE.md", "SECURITY.md", "CHANGELOG.md", "docs/how-to/quick-start.md"]) {
    assert.ok(targets.includes(want), `README does not link ${want}`);
  }
  for (const t of targets) {
    if (/^[a-z]+:/.test(t)) continue;
    assert.ok(existsSync(join(root, t)), `README links ${t}, which does not exist`);
  }
});

test("the quick start stops at the export gate and links back to the policy files", () => {
  const qs = readFileSync(join(root, "docs", "how-to", "quick-start.md"), "utf8");
  assert.match(qs, /## \d+\. Stop at the export gate/);
  for (const want of ["../../USE.md", "../../SECURITY.md"]) assert.ok(links(qs).includes(want), `quick-start.md does not link ${want}`);
});
