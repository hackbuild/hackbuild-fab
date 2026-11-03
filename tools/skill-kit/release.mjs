#!/usr/bin/env node
// release.mjs: a local, unpushed release commit and tag for the library
// family (plan v11.1 3.6, D-037 keeps the packages private, so the CDN route
// is a jsDelivr gh url at a tag).
//
//   node tools/skill-kit/release.mjs [--allow-dirty] [--dry-run]
//
// 1. refuses when the tag lib-v<version> exists or tracked files are changed
// 2. runs npm run build:lib, then generates docs/skill/LIBRARIES.md
// 3. builds a tree in a temporary GIT_INDEX_FILE from nothing: the built
//    files the CDN needs, force-added past .gitignore, the reference, LICENSE
//    and a README naming the source commit. The sources stay out: jsDelivr
//    refuses a gh ref whose tree passes its package size limit (lib-v0.2.0
//    held all of HEAD, 105,557,149 bytes, and cold files answered 403
//    "Package size exceeded the configured limit of 50 MB", measured
//    2026-11-02), so the tree is refused above RELEASE_MAX_BYTES.
// 4. writes a commit of that tree whose parent is HEAD and tags it
// The branch, the main index and the working tree are not touched. Nothing is
// pushed; the push command is printed. The owner approves each release tag.
//
// --dry-run writes the tree and commit objects and reports their size, and
// makes no tag. --allow-dirty builds from uncommitted sources; the tag is then
// not reproducible from its parent commit, so delete it (git tag -d) and
// release again from a clean tree.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "../lib/outputs.mjs";
import { familyVersion, REFERENCE_PATH, releaseFiles, REPO_SLUG, tagOf } from "./family.mjs";

/** The live jsDelivr refusal named 50 MB (measured 2026-11-02); its README states 150 MB per gh package (vendor). The lower one holds. */
export const RELEASE_MAX_BYTES = 50 * 1024 * 1024;

function git(root, args, { env = {}, input, allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd: root, env: { ...process.env, ...env }, input, encoding: "utf8" });
  if (r.status !== 0 && !allowFail) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || r.stdout).trim()}`);
  return r;
}

/** The README a release tree carries in place of the sources. */
export function releaseReadme(version, head) {
  return [
    `# hackbuild-fab library release ${version}`,
    "",
    `Built files of the @hackbuild library family at version ${version}, for jsDelivr. The sources are the parent commit ${head}:`,
    `https://github.com/${REPO_SLUG}/tree/${head}`,
    "",
    `The page reference is ${REFERENCE_PATH}. Licence: LICENSE (MIT).`,
    "",
  ].join("\n");
}

/**
 * @param {{ root?: string, build?: boolean, referenceText?: string, allowDirty?: boolean, dryRun?: boolean, log?: (s: string) => void }} o
 * @returns {{ tag: string | null, version: string, commit: string, files: string[], bytes: number }}
 */
export async function release({ root = ROOT, build = true, referenceText, allowDirty = false, dryRun = false, log = console.log } = {}) {
  const version = familyVersion(root);
  const tag = tagOf(version);
  if (git(root, ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], { allowFail: true }).status === 0) throw new Error(`tag ${tag} exists. bump the family version or delete the tag first.`);
  const dirty = git(root, ["status", "--porcelain", "--untracked-files=no"]).stdout.trim();
  if (dirty !== "" && !allowDirty) throw new Error(`the tree is dirty, so the tag would not match a commit:\n${dirty}\ncommit or stash first.`);
  if (dirty !== "") log(`warning: --allow-dirty, the built files come from uncommitted sources`);

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
  const addBlob = (path, sha) => {
    git(root, ["update-index", "--add", "--cacheinfo", `100644,${sha},${path}`], { env });
    added.push(path);
  };
  try {
    git(root, ["read-tree", "--empty"], { env });
    for (const f of releaseFiles()) {
      if (!existsSync(join(root, f.from))) throw new Error(`${f.from} is missing. run npm run build:lib first.`);
      addBlob(f.path, git(root, ["hash-object", "-w", join(root, f.from)]).stdout.trim());
    }
    addBlob(REFERENCE_PATH, git(root, ["hash-object", "-w", "--stdin"], { input: reference }).stdout.trim());
    if (existsSync(join(root, "LICENSE"))) addBlob("LICENSE", git(root, ["hash-object", "-w", join(root, "LICENSE")]).stdout.trim());
    addBlob("README.md", git(root, ["hash-object", "-w", "--stdin"], { input: releaseReadme(version, head) }).stdout.trim());
    const tree = git(root, ["write-tree"], { env }).stdout.trim();
    const bytes = git(root, ["ls-tree", "-r", "-l", tree]).stdout.trim().split("\n")
      .reduce((n, line) => n + Number(line.split(/\s+/)[3] ?? 0), 0);
    if (bytes > RELEASE_MAX_BYTES) throw new Error(`the release tree is ${bytes} bytes, over the ${RELEASE_MAX_BYTES} jsDelivr allows a gh ref; trim the built files`);
    const commit = git(root, ["commit-tree", tree, "-p", head, "-m", `lib: release ${version} builds`]).stdout.trim();
    log(`release tree ${added.length} files, ${bytes} bytes (counted), parent ${head}`);
    for (const p of added) log(`  ${p}`);
    if (dryRun) {
      log(`dry run: commit ${commit} written, no tag made`);
      return { tag: null, version, commit, files: added, bytes };
    }
    git(root, ["tag", tag, commit]);
    log(`tag ${tag} -> ${commit}`);
    log(`not pushed. to publish: git push origin ${tag}   (jsDelivr then serves https://cdn.jsdelivr.net/gh/${REPO_SLUG}@${tag}/)`);
    return { tag, version, commit, files: added, bytes };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await release({ allowDirty: process.argv.includes("--allow-dirty"), dryRun: process.argv.includes("--dry-run") });
  } catch (e) {
    console.error(`release refused: ${e.message}`);
    process.exit(1);
  }
}
