// The sample set of D-222: knowledge/designs plus fab-knowledge/originals. CLAUDE.md must name
// it, in the working tree and in the staged copy a fresh checkout gets, and must not point at
// the retired examples directory. The repo records must be tracked, complete against INDEX.md,
// and byte identical to the originals when the originals are on this host. Added by the
// implementation audit of 2026-10-05 (finding on CLAUDE.md and D-222). Since the publish
// audit of 2026-10-13 the repo copies are publishText(original): local paths become archive
// prefixes and private chat links are dropped (tools/publish-paths.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ORIGINALS_PREFIX, publishText } from "../publish-paths.mjs";

const root = join(import.meta.dirname, "..", "..");
const designs = join(root, "knowledge", "designs");
const originals = "/Users/obsidian/Projects/hackbuild/fab-knowledge/originals";
// Built from parts so this file does not match its own scan.
const retired = ["fab-knowledge", "examples"].join("/");
const shared = ["INDEX.md", "MECHANISMS.md", "IDEAS-FROM-MOCKUPS.md"];

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const inGit = existsSync(join(root, ".git"));
const records = readdirSync(designs).filter((f) => f.endsWith(".md") && !shared.includes(f));

/** The D-222 rules every copy of CLAUDE.md must state. */
function assertSampleSetRule(text, where) {
  assert.ok(!text.includes(retired), `${where} still points at ${retired}`);
  assert.ok(text.includes("`knowledge/designs/`"), `${where} names knowledge/designs/`);
  assert.ok(text.includes(`${ORIGINALS_PREFIX}/`), `${where} names the originals root`);
  assert.ok(!/\/Users\//.test(text), `${where} carries a local absolute path`);
  assert.ok(text.includes("MECHANISMS.md"), `${where} names MECHANISMS.md`);
  assert.ok(text.includes("originals/IDEAS-FROM-MOCKUPS.md"), `${where} names the mockup idea list`);
  assert.ok((text.match(/\(D-222\)/g) ?? []).length >= 2, `${where} cites D-222 for the sample set and the mockup rule`);
}

test("CLAUDE.md working copy names the D-222 sample set", () => {
  assertSampleSetRule(readFileSync(join(root, "CLAUDE.md"), "utf8"), "CLAUDE.md");
});

test("CLAUDE.md staged copy names the D-222 sample set", { skip: !inGit && "no git index" }, () => {
  assertSampleSetRule(git("show", ":CLAUDE.md"), "staged CLAUDE.md");
});

test("every knowledge/designs file is tracked", { skip: !inGit && "no git index" }, () => {
  const tracked = new Set(git("ls-files", "knowledge/designs").split("\n").filter(Boolean));
  const missing = readdirSync(designs).map((f) => `knowledge/designs/${f}`).filter((p) => !tracked.has(p));
  assert.deepEqual(missing, [], "untracked sample set files");
});

test("INDEX.md lists exactly the records in knowledge/designs", () => {
  const index = readFileSync(join(designs, "INDEX.md"), "utf8");
  const slugs = [...index.matchAll(/^\| \*\*([a-z0-9-]+)\*\* \|/gm)].map((m) => m[1]);
  assert.equal(new Set(slugs).size, slugs.length, "no slug listed twice");
  assert.deepEqual([...slugs].sort(), records.map((f) => f.slice(0, -3)).sort());
  const [, count] = index.match(/^Count: (\d+) designs/m) ?? [];
  assert.equal(Number(count), slugs.length, "INDEX.md Count line equals its rows");
});

test("the retired examples directory is named only in the D-222 entry", { skip: !inGit && "no git index" }, () => {
  const files = git("ls-files", "--cached", "--others", "--exclude-standard").split("\n");
  const hits = [];
  for (const p of files) {
    if (!/\.(md|mjs|ts|json|txt|yml)$/.test(p) || p.includes("node_modules/")) continue;
    if (!existsSync(join(root, p))) continue;
    const text = readFileSync(join(root, p), "utf8");
    if (!text.includes(retired)) continue;
    // The D-222 entry file, from which DECISIONS.md is generated (D-569).
    if (p === "docs/plan/decisions/D-222.md") continue;
    if (p === "docs/plan/DECISIONS.md") {
      const start = text.indexOf("\n### D-222 ");
      const end = text.indexOf("\n### ", start + 5);
      const outside = text.slice(0, start) + text.slice(end < 0 ? text.length : end);
      if (start >= 0 && !outside.includes(retired)) continue;
    }
    hits.push(p);
  }
  assert.deepEqual(hits, [], `files naming ${retired}`);
});

test("repo records equal the publish form of the originals", { skip: !existsSync(originals) && "originals not on this host" }, () => {
  const differ = [];
  for (const f of records) {
    const src = join(originals, f.slice(0, -3), "RECORD.md");
    if (!existsSync(src) || publishText(readFileSync(src, "utf8")) !== readFileSync(join(designs, f), "utf8")) differ.push(f);
  }
  for (const f of shared) {
    const src = join(originals, f);
    if (!existsSync(src) || publishText(readFileSync(src, "utf8")) !== readFileSync(join(designs, f), "utf8")) differ.push(f);
  }
  assert.deepEqual(differ, []);
});

// Every file under an original's files/ and shots/ is listed in its SHA256SUMS with its hash,
// so a stray file (bytecode a Python run left beside a source, a copy nobody recorded) fails
// here. Added by the audit fixer round of 2026-10-08 (two __pycache__ folders under originals).
test("every original file is listed in its SHA256SUMS with its hash", { skip: !existsSync(originals) && "originals not on this host" }, async () => {
  const { createHash } = await import("node:crypto");
  const { statSync } = await import("node:fs");
  const walk = (dir, out = []) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  };
  const problems = [];
  let checked = 0;
  for (const slug of readdirSync(originals).filter((d) => !d.startsWith("_") && statSync(join(originals, d)).isDirectory())) {
    const sums = join(originals, slug, "SHA256SUMS");
    if (!existsSync(sums)) continue;
    const listed = new Map(readFileSync(sums, "utf8").split("\n").filter(Boolean).map((l) => [l.slice(66), l.slice(0, 64)]));
    for (const sub of ["files", "shots"]) {
      const base = join(originals, slug, sub);
      if (!existsSync(base)) continue;
      for (const f of walk(base)) {
        const rel = f.slice(join(originals, slug).length + 1).split("\\").join("/");
        if (rel.endsWith(".DS_Store")) continue;
        const want = listed.get(rel);
        if (want === undefined) problems.push(`${slug}/${rel} is not in SHA256SUMS`);
        else if (createHash("sha256").update(readFileSync(f)).digest("hex") !== want) problems.push(`${slug}/${rel} differs from its SHA256SUMS hash`);
        checked++;
      }
    }
  }
  assert.ok(checked > 100, `files checked: ${checked}`);
  assert.deepEqual(problems, []);
});
