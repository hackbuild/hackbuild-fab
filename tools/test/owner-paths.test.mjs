// Owner path ratchet (R1-rails-public-18): no tracked text file names a home directory under
// the macOS users root. Zip and 3mf members are read by lint-voice, so archives are skipped here, as is any
// file holding a NUL byte. publish-paths.test.mjs keeps its narrower public Markdown check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const inGit = existsSync(join(root, ".git"));
const users = ["", "Users", ""].join("/");
const HOME = new RegExp(`${users}[A-Za-z0-9][A-Za-z0-9._-]*`, "g");

// File to the exact home path literals it keeps on purpose, with the reason.
const ALLOW = {
  ".github/scripts/owner-files.test.mjs": { literals: [`${users}someone`], reason: "fixture: a placeholder owner path the owner-files scanner must flag" },
  "tools/test-support/originals-root.test.ts": { literals: [`${users}someone`], reason: "fixture: localSource must refuse an absolute path" },
};

const homePaths = (text) => [...new Set(text.match(HOME) ?? [])];

function scan() {
  const files = execFileSync("git", ["ls-files", "--cached", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }).split("\0").filter(Boolean);
  const hits = {};
  for (const p of files) {
    if (/\.(zip|3mf)$/i.test(p) || !existsSync(join(root, p))) continue;
    const buf = readFileSync(join(root, p));
    if (buf.includes(0)) continue;
    const found = homePaths(buf.toString("utf8"));
    if (found.length) hits[p] = found;
  }
  return hits;
}

test("the matcher finds a home path and ignores the bare directory", () => {
  assert.deepEqual(homePaths(`a ${users}jo.doe/x b ${users}jo.doe c`), [`${users}jo.doe`]);
  assert.deepEqual(homePaths(`a ${users} literal, ${users}, end`), []);
});

test("no tracked text file carries a home path outside the allow list", { skip: !inGit && "no git index" }, () => {
  const hits = scan();
  const stray = Object.entries(hits)
    .map(([p, found]) => [p, found.filter((h) => !(ALLOW[p]?.literals ?? []).includes(h))])
    .filter(([, found]) => found.length);
  assert.deepEqual(Object.fromEntries(stray), {});
  const stale = Object.entries(ALLOW).flatMap(([p, a]) => a.literals.filter((l) => !(hits[p] ?? []).includes(l)).map((l) => `${p} ${l}`));
  assert.deepEqual(stale, [], "an allow list entry no longer needed");
  for (const a of Object.values(ALLOW)) assert.ok(a.reason.length > 0);
});
