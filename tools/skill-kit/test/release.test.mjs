// release.mjs in a throwaway repo: the tag commit has HEAD as parent, holds
// the tracked tree plus the force-added built files, leaves the branch, the
// main index and the working tree alone, and refuses a second run and a dirty tree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PACKAGES } from "../../lib/outputs.mjs";
import { releaseFiles, REFERENCE_PATH } from "../family.mjs";
import { release } from "../release.mjs";

const git = (cwd, ...a) => { const r = spawnSync("git", a, { cwd, encoding: "utf8" }); assert.equal(r.status, 0, `git ${a.join(" ")}: ${r.stderr}`); return r.stdout.trim(); };
const put = (root, path, text) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "hbf-rel-test-"));
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.name", "Test");
  git(root, "config", "user.email", "test@example.invalid");
  for (const p of PACKAGES) put(root, `${p.dir}/package.json`, JSON.stringify({ name: p.name, version: "0.1.0" }));
  put(root, ".gitignore", "dist/\ntools/vendor/three/dist/\nnode_modules/\n");
  put(root, "README.md", "tracked\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "seed");
  for (const f of releaseFiles()) put(root, f.from, `built ${f.from}\n`);
  return root;
}

test("release makes an off-branch tag commit and leaves the branch and index alone", async () => {
  const root = fixture();
  try {
    const head = git(root, "rev-parse", "HEAD");
    const lines = [];
    const r = await release({ root, build: false, referenceText: "reference\n", log: (s) => lines.push(s) });
    assert.equal(r.tag, "lib-v0.1.0");
    assert.equal(git(root, "rev-parse", "lib-v0.1.0"), r.commit);
    assert.equal(git(root, "rev-parse", `${r.commit}^`), head, "parent is HEAD");
    assert.equal(git(root, "rev-parse", "HEAD"), head, "the branch stays");
    assert.equal(git(root, "rev-parse", "--abbrev-ref", "HEAD"), "main");
    assert.equal(git(root, "status", "--porcelain"), "", "main index and working tree are untouched");
    const held = git(root, "ls-tree", "-r", "--name-only", r.commit).split("\n");
    for (const f of releaseFiles()) assert.ok(held.includes(f.path), f.path);
    assert.ok(held.includes(REFERENCE_PATH));
    assert.ok(held.includes("README.md"));
    assert.equal(held.length, 2 + PACKAGES.length + releaseFiles().length + 1, "tracked files, built files, reference");
    assert.ok(lines.some((l) => l.includes("git push origin lib-v0.1.0")), "prints the push command");
    await assert.rejects(release({ root, build: false, referenceText: "reference\n", log() {} }), /tag lib-v0.1.0 exists/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("release refuses a dirty tree", async () => {
  const root = fixture();
  try {
    writeFileSync(join(root, "README.md"), "changed\n");
    await assert.rejects(release({ root, build: false, referenceText: "r\n", log() {} }), /tree is dirty/);
    assert.equal(spawnSync("git", ["tag", "--list"], { cwd: root, encoding: "utf8" }).stdout.trim(), "");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
