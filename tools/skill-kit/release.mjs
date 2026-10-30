#!/usr/bin/env node
// release.mjs: a local, unpushed release commit and tag for the library
// family (plan v11.1 3.6, D-037 keeps the packages private, so the CDN route
// is a jsDelivr gh url at a tag).
//
//   node tools/skill-kit/release.mjs [--allow-dirty]
//
// 1. refuses when the tag lib-v<version> exists or tracked files are changed
// 2. runs npm run build:lib, then generates docs/skill/LIBRARIES.md
// 3. builds a tree in a temporary GIT_INDEX_FILE: HEAD, plus the built files
//    the CDN needs, force-added past .gitignore, plus the reference
// 4. writes a commit of that tree whose parent is HEAD and tags it
// The branch, the main index and the working tree are not touched. Nothing is
// pushed; the push command is printed. The owner approves each release tag.
//
// --allow-dirty takes the tree from a copy of the staged index plus the
// working tree of tracked files (git add -u in the temporary index) so a release can be proven
// before its sources are committed. The tag is then not reproducible from a
// commit of the branch; delete it (git tag -d) and release again from a clean tree.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../lib/outputs.mjs";
import { familyVersion, REFERENCE_PATH, releaseFiles, REPO_SLUG, tagOf } from "./family.mjs";

function git(root, args, { env = {}, input, allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd: root, env: { ...process.env, ...env }, input, encoding: "utf8" });
  if (r.status !== 0 && !allowFail) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || r.stdout).trim()}`);
  return r;
}

/**
 * @param {{ root?: string, build?: boolean, referenceText?: string, allowDirty?: boolean, log?: (s: string) => void }} o
 * @returns {{ tag: string, version: string, commit: string, files: string[] }}
 */
export async function release({ root = ROOT, build = true, referenceText, allowDirty = false, log = console.log } = {}) {
  const version = familyVersion(root);
  const tag = tagOf(version);
  if (git(root, ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true }).status === 0) throw new Error(`tag ${tag} exists. bump the family version or delete the tag first.`);
  const dirty = git(root, ["status", "--porcelain", "--untracked-files=no"]).stdout.trim();
  if (dirty !== "" && !allowDirty) throw new Error(`the tree is dirty, so the tag would not match a commit:\n${dirty}\ncommit or stash first.`);
  if (dirty !== "") log(`warning: --allow-dirty, tracked files are taken from the working tree`);

  if (build) {
    const r = spawnSync("npm", ["run", "build:lib"], { cwd: root, stdio: ["ignore", "inherit", "inherit"] });
    if (r.status !== 0) throw new Error("npm run build:lib failed");
  }
  let reference = referenceText;
  if (reference === undefined) reference = await (await import("./reference.mjs")).generate(root);
  const head = git(root, ["rev-parse", "HEAD"]).stdout.trim();
  const tracked = git(root, ["show", `HEAD:${REFERENCE_PATH}`], { allowFail: true });
  if (tracked.status === 0 && tracked.stdout !== reference && !allowDirty) throw new Error(`${REFERENCE_PATH} in HEAD differs from a fresh generation. run npm run skill:reference and commit it.`);

  const dir = mkdtempSync(join(tmpdir(), "hbf-release-"));
  const env = { GIT_INDEX_FILE: join(dir, "index") };
  const added = [];
  try {
    if (allowDirty) {
      // the staged index plus the working tree of tracked files; the main index file itself is only read
      copyFileSync(join(root, git(root, ["rev-parse", "--git-path", "index"]).stdout.trim()), env.GIT_INDEX_FILE);
      git(root, ["add", "-u"], { env });
    } else git(root, ["read-tree", "HEAD"], { env });
    for (const f of releaseFiles()) {
      if (!existsSync(join(root, f.from))) throw new Error(`${f.from} is missing. run npm run build:lib first.`);
      const sha = git(root, ["hash-object", "-w", join(root, f.from)]).stdout.trim();
      git(root, ["update-index", "--add", "--cacheinfo", `100644,${sha},${f.path}`], { env });
      added.push(f.path);
    }
    const ref = git(root, ["hash-object", "-w", "--stdin"], { input: reference }).stdout.trim();
    git(root, ["update-index", "--add", "--cacheinfo", `100644,${ref},${REFERENCE_PATH}`], { env });
    added.push(REFERENCE_PATH);
    const tree = git(root, ["write-tree"], { env }).stdout.trim();
    const commit = git(root, ["commit-tree", tree, "-p", head, "-m", `lib: release ${version} builds`]).stdout.trim();
    git(root, ["tag", tag, commit]);
    log(`tag ${tag} -> ${commit} (parent ${head}), ${added.length} built files added`);
    for (const p of added) log(`  ${p}`);
    log(`not pushed. to publish: git push origin ${tag}   (jsDelivr then serves https://cdn.jsdelivr.net/gh/${REPO_SLUG}@${tag}/)`);
    return { tag, version, commit, files: added };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await release({ allowDirty: process.argv.includes("--allow-dirty") });
  } catch (e) {
    console.error(`release refused: ${e.message}`);
    process.exit(1);
  }
}
